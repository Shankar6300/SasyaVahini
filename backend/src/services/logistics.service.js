/**
 * SasyaVahini — Logistics Core Service
 *
 * Coordinates:
 * - Shipment creation from confirmed orders & plans
 * - Finite State Machine milestone progression & OTP verification
 * - Vehicle dispatch & tracking data assembly
 * - Cross-module interfaces for Member 3 (orders) and Members 1 & 2 (escrow events)
 *
 * Owner: Member 4
 */

const { v4: uuidv4 } = require('uuid');
const config = require('../config/logistics.config');
const { orderRepo, shipmentRepo } = require('../adapters');
const vehicleService = require('./vehicle.service');
const sourcingService = require('./sourcing.service');
const twoTierLogisticsService = require('./twoTierLogistics.service');
const routingService = require('./routing.service');
const logisticsEvents = require('../events/logisticsEvents');
const { NotFoundError, ConflictError, BusinessRuleError } = require('../utils/errors');
const { generateDeliveryOtp, verifyDeliveryOtp } = require('../utils/cryptoOtp');
const logger = require('../utils/logger');
const prisma = require('../lib/prisma');

// In-memory & Prisma persistence are unified through shipmentRepo
// Mock initial state is managed by MockShipmentRepo

class LogisticsService {
  /**
   * Cross-module integration for Member 3
   * Generates sourcing/logistics plans for an order requirement
   */
  async planOrder(params) {
    const maxBudget = params.maxBudget === Infinity || params.maxBudget === undefined ? null : params.maxBudget;
    const result = await twoTierLogisticsService.planOrder({
      ...params,
      maxBudget: maxBudget ?? Infinity,
    });
    // Persist plan quote at creation time (not just upon confirmation)
    await shipmentRepo.savePlanQuote({
      quoteId: result.quoteId,
      crop: params.crop,
      requestedQtyKg: params.qtyKg,
      maxBudget,
      radiusUsedKm: result.radiusUsedKm,
      ringsTried: result.ringsTried,
      payload: result,
      explanation: result.explanation,
      expiresAt: result.expiresAt,
    });
    return result;
  }

  async confirmPlan(quoteId, planId = null) {
    const quote = await shipmentRepo.findPlanQuote(quoteId);
    if (!quote) {
      throw new NotFoundError(`Plan quote with ID ${quoteId}`);
    }
    if (new Date(quote.expiresAt) <= new Date()) {
      throw new ConflictError('Quote has expired; request a new plan before confirmation');
    }

    if (quote.confirmedAt && quote.priceLocked) {
      return quote.payload;
    }

    // Extract exact quoted plan by id, or first plan in quote without re-planning
    const quotePayload = quote.payload || {};
    const plans = quotePayload.plans || [];
    const plan = (planId ? plans.find((p) => p.id === planId) : plans[0]) || plans[0];

    if (!plan) {
      throw new BusinessRuleError('The quoted stock is no longer available');
    }

    if (quote.maxBudget !== null && quote.maxBudget !== undefined && plan.totalCost > quote.maxBudget) {
      throw new BusinessRuleError(
        `Current fulfillment cost ₹${plan.totalCost.toLocaleString('en-IN')} exceeds the buyer budget by ₹${(plan.totalCost - quote.maxBudget).toLocaleString('en-IN')}`,
      );
    }

    const confirmed = {
      ...plan,
      quoteId,
      confirmedAt: new Date().toISOString(),
      priceLocked: true,
    };

    await shipmentRepo.confirmPlanQuote(quoteId, confirmed);
    return confirmed;
  }

  async dispatchPlan(quoteId) {
    const quote = await prisma.planQuote.findUnique({ where: { quoteId }, include: { legs: true } });
    if (!quote || quote.expiresAt <= new Date()) {
      throw new ConflictError('Confirmed quote is missing or expired');
    }
    const vehicles = await prisma.vehicle.findMany({ where: { status: 'AVAILABLE' } });
    if (vehicles.length === 0) {
      logisticsEvents.emit('logistics.admin_alert', { quoteId, reason: 'NO_AVAILABLE_VEHICLE' });
      throw new BusinessRuleError('No available vehicle; radius widening and hub fallback exhausted. ADMIN alerted.');
    }
    const expiresAt = new Date(Date.now() + 10 * 60000);
    const offers = [];
    for (const leg of quote.legs) {
      for (const vehicle of vehicles) {
        offers.push({ planQuoteId: quote.id, shipmentLegId: leg.id, vehicleId: vehicle.id, expiresAt });
      }
    }
    await prisma.logisticsOffer.createMany({ data: offers });
    logisticsEvents.emit('logistics.offers.created', { quoteId, count: offers.length, expiresAt });
    return { quoteId, offerCount: offers.length, expiresAt };
  }

  async acceptOffer(offerId, vehicleId) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.logisticsOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.vehicleId !== vehicleId) throw new NotFoundError(`Offer ${offerId}`);
      if (offer.expiresAt <= new Date()) throw new ConflictError('Offer has expired');
      const claimed = await tx.logisticsOffer.updateMany({
        where: { id: offerId, status: 'PENDING', expiresAt: { gt: new Date() } },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      if (claimed.count !== 1) throw new ConflictError('Offer was already accepted by another vehicle');
      await tx.logisticsOffer.updateMany({
        where: { shipmentLegId: offer.shipmentLegId, id: { not: offerId }, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      await tx.shipmentLeg.update({ where: { id: offer.shipmentLegId }, data: { status: 'ASSIGNED' } });
      logisticsEvents.emit('logistics.offer.accepted', { offerId, vehicleId, shipmentLegId: offer.shipmentLegId });
      return { offerId, vehicleId, shipmentLegId: offer.shipmentLegId, status: 'ACCEPTED' };
    });
  }

  async recordHandover({ transferPointId, shipmentId, feederDriverId, linehaulDriverId, feederKg, linehaulKg, feederOtp, linehaulOtp }) {
    const toleranceKg = Math.max(feederKg, linehaulKg) * config.twoTier.kgTolerancePct;
    const mismatchKg = Math.abs(feederKg - linehaulKg);
    const status = mismatchKg <= toleranceKg && feederOtp && linehaulOtp ? 'COMPLETED' : 'DISPUTED';
    const event = await prisma.transferEvent.create({
      data: {
        transferPointId,
        shipmentId,
        feederDriverId,
        linehaulDriverId,
        feederKg,
        linehaulKg,
        toleranceKg,
        status,
        disputeReason: status === 'DISPUTED' ? 'Driver confirmation or kilogram tolerance failed' : null,
        feederConfirmedAt: feederOtp ? new Date() : null,
        linehaulConfirmedAt: linehaulOtp ? new Date() : null,
      },
    });
    logisticsEvents.emit(status === 'DISPUTED' ? 'logistics.transfer.dispute' : 'logistics.transfer.completed', {
      transferEventId: event.id,
      shipmentId,
      transferPointId,
      mismatchKg,
    });
    return { ...event, mismatchKg };
  }

  /**
   * Cross-module integration for Member 3:
   * Create shipment from confirmed order + chosen plan
   * @param {string} orderId
   * @param {Object} [chosenPlan]
   */
  async createShipmentForOrder(orderId, chosenPlan = null) {
    logger.info('Creating shipment for order', { orderId });

    // Look up confirmed order details
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId}`);
    }

    // Check if shipment already exists for this order
    const existing = await shipmentRepo.findByOrderId(orderId);
    if (existing) {
      return this.toApiShipment(existing);
    }

    // If no plan provided, run auto-plan with order details
    let plan = chosenPlan;
    if (!plan) {
      const planResult = await sourcingService.planOrder({
        crop: order.cropName || 'Produce',
        qtyKg: order.totalQuantityKg,
        buyerLat: order.deliveryLatitude || 18.5089,
        buyerLng: order.deliveryLongitude || 73.9260,
        buyerAddress: order.deliveryAddress,
      });

      if (!planResult.plans || planResult.plans.length === 0) {
        throw new BusinessRuleError('Could not generate feasible fulfillment plan for order');
      }
      plan = planResult.plans[0];
    }

    // Generate cryptographically secure 6-digit delivery OTP
    const { rawOtp, hashedOtp, expiresAt } = generateDeliveryOtp();
    const deliveryOtp = config.dataSource === 'mock' ? rawOtp : hashedOtp;

    // Assign vehicle based on first pickup and load
    const firstFarmer = plan.farmers?.[0];
    const vehicle = firstFarmer
      ? await vehicleService.selectBestVehicle({
          requiredCapacityKg: order.totalQuantityKg,
          firstPickupLat: firstFarmer.lat,
          firstPickupLng: firstFarmer.lng,
        })
      : null;

    const shipmentId = `shp_${uuidv4().slice(0, 8)}`;
    const trackingNumber = `SV-SHP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const stops = (plan.farmers || []).map((f, idx) => ({
      id: `stop_${idx + 1}`,
      sequence: idx + 1,
      stopName: `Pickup: ${f.name} (${f.village || ''})`,
      farmerId: f.farmerId,
      listingId: f.batchId,
      latitude: f.lat,
      longitude: f.lng,
      quantityKg: f.qtyKg,
      pricePerKg: f.pricePerKg,
      grade: f.grade,
      status: 'PENDING',
      stopType: 'PICKUP',
    }));

    // Append buyer destination stop
    stops.push({
      id: `stop_${stops.length + 1}`,
      sequence: stops.length + 1,
      stopName: `Delivery: ${order.buyerName || 'Buyer Hub'}`,
      latitude: order.deliveryLatitude || 18.5089,
      longitude: order.deliveryLongitude || 73.9260,
      quantityKg: order.totalQuantityKg,
      status: 'PENDING',
      stopType: 'DELIVERY',
    });

    const legs = (plan.legs || []).map((l, idx) => ({
      id: `leg_${idx + 1}`,
      sequence: idx + 1,
      type: l.type || 'DIRECT',
      vehicleClass: l.vehicleClass || 'SCV',
      fromJson: l.from,
      toJson: l.to,
      km: l.km,
      etaMin: l.etaMin,
      cost: l.cost,
      kg: l.kg,
      transferPointId: l.to?.transferPointId || l.from?.transferPointId || null,
      status: 'PLANNED',
    }));

    const shipmentData = {
      id: shipmentId,
      trackingNumber,
      orderId: order.id,
      vehicleId: vehicle ? vehicle.id : null,
      vehicleNumber: vehicle ? vehicle.vehicleNumber : null,
      driverName: vehicle ? vehicle.driverName : null,
      driverPhone: vehicle ? vehicle.driverPhone : null,
      status: vehicle ? 'ASSIGNED' : 'UNASSIGNED',
      deliveryOtp,
      totalWeightKg: order.totalQuantityKg,
      totalDistanceKm: plan.routeKm,
      baselineDistanceKm: plan.savings?.baselineKm || plan.routeKm * 1.8,
      savedDistanceKm: plan.savings?.savedKm || 0,
      estimatedFuelSavedRs: plan.savings?.fuelSavedRs || 0,
      utilizationPercent: plan.savings?.utilizationPercent || 85.0,
      estimatedMinutes: plan.etaMinutes || 90,
      routeGeometry: plan.routeGeometry || { type: 'LineString', coordinates: [] },
      costBreakdown: plan.costBreakdown || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Atomic persistence of Shipment + ShipmentStop + ShipmentLeg
    const created = await shipmentRepo.createShipmentWithStopsAndLegs({
      shipment: shipmentData,
      stops,
      legs,
    });

    // Emit event for Member 1 & 2
    logisticsEvents.emit('shipment.created', {
      shipmentId: created.id,
      orderId: order.id,
      trackingNumber: created.trackingNumber,
      vehicleId: vehicle?.id,
      totalWeightKg: order.totalQuantityKg,
    });

    return this.toApiShipment(created);
  }

  /**
   * List available shipments for transporter bidding / assignment
   */
  async listAvailableShipments(query = {}) {
    const list = await shipmentRepo.listAvailableShipments(query);
    return Promise.all(list.map((s) => this.toApiShipment(s)));
  }

  /**
   * List all shipments with pagination
   */
  async listShipments({ page = 1, limit = 20, status = null, where = {} } = {}) {
    const res = await shipmentRepo.listShipments({ page, limit, status, where });
    const items = await Promise.all(res.items.map((s) => this.toApiShipment(s)));
    return { ...res, items };
  }

  /**
   * Get single shipment detail by ID
   */
  async getShipmentById(shipmentId) {
    const shipment = await shipmentRepo.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError(`Shipment with ID ${shipmentId}`);
    }
    return this.toApiShipment(shipment);
  }

  async toApiShipment(shipment) {
    if (config.dataSource === 'mock') {
      return shipment;
    }
    const vehicle = shipment.vehicleId ? await vehicleService.findById(shipment.vehicleId) : null;
    const latestPing = shipment.locationPings?.[0];
    return {
      ...shipment,
      vehicleNumber: vehicle?.vehicleNumber || null,
      driverName: vehicle?.driverName || null,
      driverPhone: vehicle?.driverPhone || null,
      routeGeometry: shipment.routeGeometryJson,
      costBreakdown: shipment.costBreakdownJson,
      currentLocation: latestPing
        ? {
            latitude: latestPing.latitude,
            longitude: latestPing.longitude,
            speedKmh: latestPing.speedKmh || 0,
            lastPingAt: latestPing.recordedAt,
          }
        : null,
      stops: shipment.stops || [],
      milestoneHistory: shipment.milestoneHistory || [],
    };
  }

  /**
   * Accept shipment and assign vehicle
   */
  async acceptShipment(shipmentId, { vehicleId, driverNotes = '' }, userId = 'logistics_operator') {
    const shipment = await shipmentRepo.findById(shipmentId);
    if (!shipment) throw new NotFoundError(`Shipment ${shipmentId}`);

    if (shipment.status !== 'UNASSIGNED' && shipment.vehicleId) {
      throw new ConflictError('Shipment is already assigned to a vehicle');
    }

    const vehicle = await vehicleService.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle ${vehicleId}`);
    }

    const assigned = await shipmentRepo.assignVehicle(shipment.id, vehicle.id, {
      vehicleDetails: vehicle,
      driverNotes,
      recordedBy: userId,
    });

    logisticsEvents.emit('shipment.milestone', {
      shipmentId: assigned.id,
      orderId: assigned.orderId,
      milestone: 'ASSIGNED',
      timestamp: new Date().toISOString(),
    });

    return {
      id: assigned.id,
      trackingNumber: assigned.trackingNumber,
      status: assigned.status,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      driverName: vehicle.driverName,
      assignedAt: assigned.updatedAt,
    };
  }

  /**
   * Advance milestone along Finite State Machine:
   * ASSIGNED -> PICKUP -> TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
   */
  async updateMilestone(shipmentId, milestoneData, userId = 'driver') {
    const shipment = await shipmentRepo.findById(shipmentId);
    if (!shipment) throw new NotFoundError(`Shipment with ID ${shipmentId}`);
    const nextMilestone = milestoneData.milestone;

    // Validate legal transitions
    const validNextStates = config.milestones.VALID_TRANSITIONS[shipment.status] || [];
    if (!validNextStates.includes(nextMilestone)) {
      throw new BusinessRuleError(
        `Illegal milestone transition from '${shipment.status}' to '${nextMilestone}'. Valid transitions: [${validNextStates.join(', ')}]`,
      );
    }

    // If transitioning to DELIVERED, verify delivery OTP using constant-time check & attempt limits
    if (nextMilestone === 'DELIVERED') {
      if (!milestoneData.deliveryOtp) {
        throw new BusinessRuleError('deliveryOtp is required to mark shipment as DELIVERED');
      }
      verifyDeliveryOtp(
        shipment.id,
        milestoneData.deliveryOtp,
        shipment.deliveryOtp,
        shipment.deliveryOtpExpiresAt
      );
    }

    // Optimistic concurrency locking via updateMany
    const updated = await shipmentRepo.updateMilestoneWithOptimisticLock({
      shipmentId: shipment.id,
      currentStatus: shipment.status,
      nextStatus: nextMilestone,
      milestoneData,
      recordedBy: userId,
      deliveredAt: nextMilestone === 'DELIVERED' ? new Date().toISOString() : null,
      vehicleIdToRelease: nextMilestone === 'DELIVERED' ? shipment.vehicleId : null,
    });

    // Update location ping if provided
    if (milestoneData.latitude && milestoneData.longitude) {
      await shipmentRepo.recordLocationPing({
        shipmentId: shipment.id,
        vehicleId: shipment.vehicleId,
        latitude: milestoneData.latitude,
        longitude: milestoneData.longitude,
        speedKmh: nextMilestone === 'TRANSIT' ? 45 : 0,
        temperatureC: milestoneData.temperatureC,
      });

      if (shipment.vehicleId) {
        await vehicleService.recordLocation(shipment.vehicleId, {
          latitude: milestoneData.latitude,
          longitude: milestoneData.longitude,
          speedKmh: nextMilestone === 'TRANSIT' ? 45 : 0,
          temperatureC: milestoneData.temperatureC,
        });
      }
    }

    // Emit milestone event
    logisticsEvents.emit('shipment.milestone', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      milestone: nextMilestone,
      status: nextMilestone,
      timestamp: new Date().toISOString(),
      location: milestoneData.latitude
        ? { latitude: milestoneData.latitude, longitude: milestoneData.longitude }
        : null,
    });

    if (nextMilestone === 'DELIVERED') {
      logisticsEvents.emit('shipment.delivered', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        deliveredAt: updated.deliveredAt || new Date().toISOString(),
        verifiedOtp: milestoneData.deliveryOtp,
      });
    }

    return {
      shipmentId: shipment.id,
      currentStatus: nextMilestone,
      milestone: nextMilestone,
      recordedAt: new Date().toISOString(),
      temperatureC: milestoneData.temperatureC || null,
    };
  }

  /**
   * Real-time tracking data for buyer, farmer, and fleet operators
   */
  async getShipmentTracking(shipmentId) {
    const shipment = await this.getShipmentById(shipmentId);

    // Calculate remaining distance estimation
    const remainingStops = shipment.stops.filter((s) => s.status !== 'COMPLETED');
    const remainingKm =
      remainingStops.length === 0
        ? 0
        : Math.round(
            (remainingStops.length / shipment.stops.length) * (shipment.totalDistanceKm || 50) * 10,
          ) / 10;

    return {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      orderId: shipment.orderId,
      status: shipment.status,
      vehicle: {
        vehicleNumber: shipment.vehicleNumber || 'Unassigned',
        driverName: shipment.driverName || 'Pending Assignment',
        driverPhone: shipment.driverPhone || '',
      },
      currentLocation: shipment.currentLocation || {
        latitude: 18.7606,
        longitude: 73.8636,
        speedKmh: 0,
        lastPingAt: shipment.updatedAt,
      },
      coldChain: shipment.coldChain || {
        currentTempC: 14.2,
        status: 'OPTIMAL',
        minTempC: 10.0,
        maxTempC: 16.0,
      },
      route: {
        totalDistanceKm: shipment.totalDistanceKm,
        remainingDistanceKm: remainingKm,
        etaMinutes: shipment.estimatedMinutes,
        geometry: shipment.routeGeometry,
        primaryRoute: {
          label: 'Primary Highway Corridor (NH-60 Commercial Bypass)',
          distanceKm: shipment.totalDistanceKm,
          etaMinutes: shipment.estimatedMinutes,
          fuelLitres: Math.round(((shipment.totalDistanceKm / 4.2) + 0.45) * 10) / 10,
          fuelCostRs: Math.round((((shipment.totalDistanceKm / 4.2) + 0.45) * 95) * 100) / 100,
          roadBreakdown: { highwayKm: Math.round(shipment.totalDistanceKm * 0.75), stateHighwayKm: Math.round(shipment.totalDistanceKm * 0.18), ruralKm: Math.round(shipment.totalDistanceKm * 0.07) },
          spoilageRisk: 'LOW',
          isRecommended: true,
          geometry: shipment.routeGeometry,
        },
        alternativeRoute: {
          label: 'Alternative Rural Short Route (SH-54 Direct)',
          distanceKm: Math.round(shipment.totalDistanceKm * 0.86 * 10) / 10,
          etaMinutes: Math.round((shipment.totalDistanceKm * 0.86 / 26) * 60) + 60,
          fuelLitres: Math.round(((shipment.totalDistanceKm * 0.86 / 2.9) + 1.1) * 10) / 10,
          fuelCostRs: Math.round((((shipment.totalDistanceKm * 0.86 / 2.9) + 1.1) * 95) * 100) / 100,
          roadBreakdown: { highwayKm: Math.round(shipment.totalDistanceKm * 0.86 * 0.12), stateHighwayKm: Math.round(shipment.totalDistanceKm * 0.86 * 0.38), ruralKm: Math.round(shipment.totalDistanceKm * 0.86 * 0.50) },
          spoilageRisk: 'ELEVATED',
          isRecommended: false,
          geometry: {
            type: 'LineString',
            coordinates: shipment.routeGeometry?.coordinates
              ? shipment.routeGeometry.coordinates.map(([lng, lat], i) => (i > 0 && i < shipment.routeGeometry.coordinates.length - 1 ? [lng + 0.012, lat - 0.010] : [lng, lat]))
              : [],
          },
        },
        routeComparison: {
          recommendedMode: 'HIGHWAY',
          timeSavedMinutes: Math.round(((shipment.totalDistanceKm * 0.86 / 26) * 60 + 60) - shipment.estimatedMinutes),
          fuelCostDeltaRs: Math.round((((shipment.totalDistanceKm * 0.86 / 2.9) + 1.1) * 95 - ((shipment.totalDistanceKm / 4.2) + 0.45) * 95) * 100) / 100,
          verdict: 'Highway corridor saves transit time and engine wear despite 14 km longer distance.',
        },
      },
      stops: shipment.stops,
      milestonesHistory: shipment.milestoneHistory,
    };
  }

  /**
   * Map pins and polyline for an active order
   */
  async getOrderMap(orderId) {
    const rawShipment = await shipmentRepo.findByOrderId(orderId);
    if (!rawShipment) {
      throw new NotFoundError(`No active shipment found for order ${orderId}`);
    }
    const shipment = await this.toApiShipment(rawShipment);
    if (!shipment) {
      throw new NotFoundError(`No active shipment found for order ${orderId}`);
    }

    const farmerPins = shipment.stops
      .filter((s) => s.stopType === 'PICKUP')
      .map((s) => ({
        stopId: s.id,
        name: s.stopName,
        farmerId: s.farmerId,
        pickupSeq: s.sequence,
        lat: s.latitude,
        lng: s.longitude,
        qtyKg: s.quantityKg,
        pricePerKg: s.pricePerKg,
        grade: s.grade,
        status: s.status,
        type: 'FARMER',
      }));

    const destinationStop = shipment.stops.find((s) => s.stopType === 'DELIVERY');
    const buyerPin = destinationStop
      ? {
          name: destinationStop.stopName,
          lat: destinationStop.latitude,
          lng: destinationStop.longitude,
          status: destinationStop.status,
          type: 'BUYER',
        }
      : null;

    const vehiclePin = shipment.currentLocation
      ? {
          vehicleNumber: shipment.vehicleNumber,
          lat: shipment.currentLocation.latitude,
          lng: shipment.currentLocation.longitude,
          speedKmh: shipment.currentLocation.speedKmh,
          type: 'VEHICLE',
        }
      : null;

    return {
      orderId,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      farmers: farmerPins,
      buyer: buyerPin,
      vehicle: vehiclePin,
      routeGeometry: shipment.routeGeometry,
      savings: {
        baselineKm: shipment.baselineDistanceKm,
        optimizedKm: shipment.totalDistanceKm,
        savedKm: shipment.savedDistanceKm,
        fuelSavedRs: shipment.estimatedFuelSavedRs,
        utilizationPercent: shipment.utilizationPercent,
      },
    };
  }

  /**
   * CVRP Optimization Impact and Fleet Analytics
   */
  async getAnalyticsSavings() {
    if (config.dataSource === 'prisma') {
      const allShipments = await prisma.shipment.findMany({
        select: {
          totalDistanceKm: true,
          baselineDistanceKm: true,
          savedDistanceKm: true,
          estimatedFuelSavedRs: true,
          utilizationPercent: true,
          status: true,
        },
      });

      const totalOptimizedKm = Math.round(
        allShipments.reduce((sum, shipment) => sum + (shipment.totalDistanceKm || 0), 0) * 10,
      ) / 10;
      const totalBaselineKm = Math.round(
        allShipments.reduce(
          (sum, shipment) => sum + (shipment.baselineDistanceKm || (shipment.totalDistanceKm || 0) * 1.6),
          0,
        ) * 10,
      ) / 10;
      const totalSavedKm = Math.max(0, Math.round((totalBaselineKm - totalOptimizedKm) * 10) / 10);
      const activeFleet = await vehicleService.listVehicles();
      const assignedCount = activeFleet.filter(
        (vehicle) => vehicle.status === 'ASSIGNED' || vehicle.status === 'IN_TRANSIT',
      ).length;
      const avgUtilization = allShipments.length > 0
        ? Math.round(
            (allShipments.reduce((sum, shipment) => sum + (shipment.utilizationPercent || 0), 0) /
              allShipments.length) * 10,
          ) / 10
        : 0;

      return {
        totalShipments: allShipments.length,
        baselineKm: totalBaselineKm,
        optimizedKm: totalOptimizedKm,
        savedKm: totalSavedKm,
        fuelSavedRs: Math.round(
          allShipments.reduce((sum, shipment) => sum + (shipment.estimatedFuelSavedRs || 0), 0) * 100,
        ) / 100,
        utilizationPercent: avgUtilization,
        avgVehicleUtilizationPercent: avgUtilization,
        fleetSummary: {
          totalVehicles: activeFleet.length,
          availableVehicles: activeFleet.length - assignedCount,
          activeOnRoute: assignedCount,
        },
      };
    }

    const { items: allShipments } = await shipmentRepo.listShipments({ limit: 1000 });

    const totalOptimizedKm = Math.round(
      allShipments.reduce((sum, s) => sum + (s.totalDistanceKm || 0), 0) * 10,
    ) / 10;
    const totalBaselineKm = Math.round(
      allShipments.reduce((sum, s) => sum + (s.baselineDistanceKm || (s.totalDistanceKm || 0) * 1.6), 0) * 10,
    ) / 10;
    const totalSavedKm = Math.max(0, Math.round((totalBaselineKm - totalOptimizedKm) * 10) / 10);
    const totalFuelSavedRs = Math.round(
      totalSavedKm * config.costing.estimatedFuelCostPerKm * 100,
    ) / 100;

    const activeFleet = await vehicleService.listVehicles();
    const assignedCount = activeFleet.filter((v) => v.status === 'ASSIGNED' || v.status === 'IN_TRANSIT').length;
    const avgUtilization =
      allShipments.length > 0
        ? Math.round(
            (allShipments.reduce((sum, s) => sum + (s.utilizationPercent || 80), 0) / allShipments.length) *
              10,
          ) / 10
        : 83.5;

    return {
      totalShipments: allShipments.length,
      baselineKm: totalBaselineKm,
      optimizedKm: totalOptimizedKm,
      savedKm: totalSavedKm,
      fuelSavedRs: totalFuelSavedRs,
      avgVehicleUtilizationPercent: avgUtilization,
      fleetSummary: {
        totalVehicles: activeFleet.length,
        availableVehicles: activeFleet.length - assignedCount,
        activeOnRoute: assignedCount,
      },
    };
  }
}

module.exports = new LogisticsService();
