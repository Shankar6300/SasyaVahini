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
const { orderRepo } = require('../adapters');
const vehicleService = require('./vehicle.service');
const sourcingService = require('./sourcing.service');
const twoTierLogisticsService = require('./twoTierLogistics.service');
const routingService = require('./routing.service');
const logisticsEvents = require('../events/logisticsEvents');
const { NotFoundError, ConflictError, BusinessRuleError } = require('../utils/errors');
const logger = require('../utils/logger');
const prisma = require('../lib/prisma');

// In-memory shipment store (for Standalone / Mock mode and unit/integration tests)
const inMemoryShipments = new Map();
const quoteCache = new Map();

// Seed initial mock shipment for immediate testing
const initMockShipment = () => {
  const mockId = 'shp_demo_101';
  inMemoryShipments.set(mockId, {
    id: mockId,
    trackingNumber: 'SV-SHP-2026-0001',
    orderId: 'ord_demo_101',
    vehicleId: 'veh_mh12_qx_4012',
    vehicleNumber: 'MH-12-QX-4012',
    driverName: 'Shivaji Mane',
    driverPhone: '+919822014012',
    status: 'TRANSIT',
    deliveryOtp: '492810',
    totalWeightKg: 2500,
    totalDistanceKm: 78.5,
    baselineDistanceKm: 142.0,
    savedDistanceKm: 63.5,
    estimatedFuelSavedRs: 1508.13,
    utilizationPercent: 83.3,
    estimatedMinutes: 110,
    currentLocation: {
      latitude: 18.7230,
      longitude: 73.8910,
      speedKmh: 44.0,
      lastPingAt: new Date().toISOString(),
    },
    coldChain: {
      currentTempC: 13.8,
      status: 'OPTIMAL',
      minTempC: 10.0,
      maxTempC: 16.0,
    },
    stops: [
      {
        id: 'stop_1',
        sequence: 1,
        stopName: 'Farmer Ramesh Kulkarni (Manchar)',
        farmerId: 'farmer_manchar_01',
        latitude: 18.9880,
        longitude: 73.9400,
        quantityKg: 1500,
        pricePerKg: 22.0,
        grade: 'GRADE_A',
        status: 'COMPLETED',
        stopType: 'PICKUP',
      },
      {
        id: 'stop_2',
        sequence: 2,
        stopName: 'Farmer Suresh Bhor (Khed)',
        farmerId: 'farmer_khed_01',
        latitude: 18.8470,
        longitude: 73.9100,
        quantityKg: 1000,
        pricePerKg: 23.5,
        grade: 'GRADE_A',
        status: 'COMPLETED',
        stopType: 'PICKUP',
      },
      {
        id: 'stop_3',
        sequence: 3,
        stopName: 'FreshBasket Destination (Hadapsar)',
        latitude: 18.5089,
        longitude: 73.9260,
        quantityKg: 2500,
        status: 'PENDING',
        stopType: 'DELIVERY',
      },
    ],
    routeGeometry: {
      type: 'LineString',
      coordinates: [
        [73.9400, 18.9880],
        [73.9100, 18.8470],
        [73.8636, 18.7606],
        [73.9260, 18.5089],
      ],
    },
    costBreakdown: {
      productCost: 56500.0,
      transportCost: 2840.0,
      handlingCost: 1250.0,
      platformFee: 1130.0,
      aggregationFee: 350.0,
      riskCost: 1130.0,
      gst: 0.0,
      totalCost: 63200.0,
    },
    milestoneHistory: [
      { status: 'ASSIGNED', recordedAt: new Date(Date.now() - 3600000).toISOString(), notes: 'Assigned to Shivaji Mane' },
      { status: 'PICKUP', recordedAt: new Date(Date.now() - 1800000).toISOString(), notes: 'Loaded at Manchar and Khed' },
      { status: 'TRANSIT', recordedAt: new Date(Date.now() - 600000).toISOString(), notes: 'En route to Hadapsar' },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  });
};
if (config.dataSource === 'mock') {
  initMockShipment();
}

class LogisticsService {
  /**
   * Cross-module integration for Member 3
   * Generates sourcing/logistics plans for an order requirement
   */
  async planOrder(params) {
    const result = await twoTierLogisticsService.planOrder({
      ...params,
      maxBudget: params.maxBudget ?? Infinity,
    });
    quoteCache.set(result.quoteId, {
      params: { ...params, maxBudget: params.maxBudget ?? Infinity },
      quote: result,
      expiresAt: new Date(result.expiresAt),
    });
    return result;
  }

  async confirmPlan(quoteId) {
    const cached = quoteCache.get(quoteId);
    if (!cached || cached.expiresAt <= new Date()) {
      throw new ConflictError('Quote has expired; request a new plan before confirmation');
    }
    const refreshed = await twoTierLogisticsService.planOrder(cached.params);
    const plan = refreshed.plans[0];
    if (!plan) {
      throw new BusinessRuleError('The quoted stock is no longer available');
    }
    if (plan.totalCost > cached.params.maxBudget) {
      throw new BusinessRuleError(
        `Current fulfillment cost ₹${plan.totalCost.toLocaleString('en-IN')} exceeds the buyer budget by ₹${(plan.totalCost - cached.params.maxBudget).toLocaleString('en-IN')}`,
      );
    }
    const confirmed = {
      ...plan,
      quoteId,
      confirmedAt: new Date().toISOString(),
      priceLocked: true,
    };
    if (prisma.planQuote) {
      if (confirmed.transferPoint) {
        await prisma.transferPoint.upsert({
          where: { id: confirmed.transferPoint.id },
          update: {
            name: confirmed.transferPoint.name,
            latitude: confirmed.transferPoint.lat,
            longitude: confirmed.transferPoint.lng,
            roadAccess: confirmed.transferPoint.roadAccess || 'MAIN',
            capacityKg: confirmed.transferPoint.capacityKg || confirmed.totalWeightKg,
            handlingFeePerKg: confirmed.transferPoint.feePerKg || 0,
            openHours: confirmed.transferPoint.openHours,
            zone: confirmed.transferPoint.zone,
          },
          create: {
            id: confirmed.transferPoint.id,
            name: confirmed.transferPoint.name,
            latitude: confirmed.transferPoint.lat,
            longitude: confirmed.transferPoint.lng,
            roadAccess: confirmed.transferPoint.roadAccess || 'MAIN',
            capacityKg: confirmed.transferPoint.capacityKg || confirmed.totalWeightKg,
            handlingFeePerKg: confirmed.transferPoint.feePerKg || 0,
            openHours: confirmed.transferPoint.openHours,
            zone: confirmed.transferPoint.zone,
          },
        });
      }
      await prisma.planQuote.upsert({
        where: { quoteId },
        update: {
          payload: confirmed,
          explanation: confirmed.explanation,
          expiresAt: new Date(cached.quote.expiresAt),
          confirmedAt: new Date(),
          priceLocked: true,
          radiusUsedKm: confirmed.radiusUsedKm,
          ringsTried: cached.quote.ringsTried,
        },
        create: {
          quoteId,
          crop: cached.params.crop,
          requestedQtyKg: cached.params.qtyKg,
          maxBudget: cached.params.maxBudget,
          radiusUsedKm: confirmed.radiusUsedKm,
          ringsTried: cached.quote.ringsTried,
          payload: confirmed,
          explanation: confirmed.explanation,
          expiresAt: new Date(cached.quote.expiresAt),
          confirmedAt: new Date(),
          priceLocked: true,
          legs: {
            create: confirmed.legs.map((leg, index) => ({
              sequence: index + 1,
              type: leg.type,
              vehicleClass: leg.vehicleClass,
              fromJson: leg.from,
              toJson: leg.to,
              km: leg.km,
              etaMin: leg.etaMin,
              cost: leg.cost,
              kg: leg.kg,
              transferPointId: leg.to?.transferPointId || leg.from?.transferPointId,
            })),
          },
        },
      });
    }
    quoteCache.delete(quoteId);
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
    const existing = [...inMemoryShipments.values()].find((s) => s.orderId === orderId);
    if (existing) {
      return existing;
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

    // Generate random 6-digit delivery OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Assign vehicle based on first pickup and load
    const firstFarmer = plan.farmers[0];
    const vehicle = await vehicleService.selectBestVehicle({
      requiredCapacityKg: order.totalQuantityKg,
      firstPickupLat: firstFarmer.lat,
      firstPickupLng: firstFarmer.lng,
    });

    const shipmentId = `shp_${uuidv4().slice(0, 8)}`;
    const trackingNumber = `SV-SHP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const stops = plan.farmers.map((f, idx) => ({
      id: `stop_${idx + 1}`,
      sequence: idx + 1,
      stopName: `Pickup: ${f.name} (${f.village})`,
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
      stopName: `Delivery: ${order.buyerName}`,
      latitude: order.deliveryLatitude || 18.5089,
      longitude: order.deliveryLongitude || 73.9260,
      quantityKg: order.totalQuantityKg,
      status: 'PENDING',
      stopType: 'DELIVERY',
    });

    const newShipment = {
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
      currentLocation: vehicle
        ? {
            latitude: vehicle.currentLatitude,
            longitude: vehicle.currentLongitude,
            speedKmh: 0,
            lastPingAt: new Date().toISOString(),
          }
        : null,
      coldChain: {
        currentTempC: 14.0,
        status: 'OPTIMAL',
        minTempC: 10.0,
        maxTempC: 16.0,
      },
      stops,
      milestoneHistory: [
        {
          status: vehicle ? 'ASSIGNED' : 'UNASSIGNED',
          recordedAt: new Date().toISOString(),
          notes: vehicle ? `Assigned to ${vehicle.vehicleNumber}` : 'Awaiting transporter assignment',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryShipments.set(shipmentId, newShipment);

    // Emit event for Member 1 & 2
    logisticsEvents.emit('shipment.created', {
      shipmentId,
      orderId: order.id,
      trackingNumber,
      vehicleId: vehicle?.id,
      totalWeightKg: order.totalQuantityKg,
    });

    return newShipment;
  }

  /**
   * List available shipments for transporter bidding / assignment
   */
  async listAvailableShipments(query = {}) {
    const list = [...inMemoryShipments.values()].filter(
      (s) => s.status === 'UNASSIGNED' || !s.vehicleId,
    );
    return list;
  }

  /**
   * List all shipments with pagination
   */
  async listShipments({ page = 1, limit = 20, status = null } = {}) {
    if (config.dataSource === 'prisma') {
      const where = status ? { status: status.toUpperCase() } : undefined;
      const [shipments, total] = await Promise.all([
        prisma.shipment.findMany({
          where,
          include: {
            stops: { orderBy: { sequence: 'asc' } },
            locationPings: { orderBy: { recordedAt: 'desc' }, take: 1 },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.shipment.count({ where }),
      ]);

      const items = await Promise.all(shipments.map((shipment) => this.toApiShipment(shipment)));
      return { items, total, page, limit };
    }

    let list = [...inMemoryShipments.values()];
    if (status) {
      list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Get single shipment detail by ID
   */
  async getShipmentById(shipmentId) {
    if (config.dataSource === 'prisma') {
      const shipment = await prisma.shipment.findFirst({
        where: {
          OR: [{ id: shipmentId }, { trackingNumber: shipmentId }, { orderId: shipmentId }],
        },
        include: {
          stops: { orderBy: { sequence: 'asc' } },
          milestoneHistory: { orderBy: { recordedAt: 'asc' } },
          locationPings: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
      });
      if (!shipment) throw new NotFoundError(`Shipment with ID ${shipmentId}`);
      return this.toApiShipment(shipment);
    }

    const shipment = inMemoryShipments.get(shipmentId) ||
      [...inMemoryShipments.values()].find((s) => s.trackingNumber === shipmentId || s.orderId === shipmentId);

    if (!shipment) {
      throw new NotFoundError(`Shipment with ID ${shipmentId}`);
    }
    return shipment;
  }

  async toApiShipment(shipment) {
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
    const shipment = await this.getShipmentById(shipmentId);

    if (shipment.status !== 'UNASSIGNED' && shipment.vehicleId) {
      throw new ConflictError('Shipment is already assigned to a vehicle');
    }

    const vehicle = await vehicleService.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle ${vehicleId}`);
    }

    shipment.vehicleId = vehicle.id;
    shipment.vehicleNumber = vehicle.vehicleNumber;
    shipment.driverName = vehicle.driverName;
    shipment.driverPhone = vehicle.driverPhone;
    shipment.status = 'ASSIGNED';
    shipment.updatedAt = new Date().toISOString();

    shipment.milestoneHistory.push({
      status: 'ASSIGNED',
      recordedAt: new Date().toISOString(),
      notes: driverNotes || `Vehicle ${vehicle.vehicleNumber} assigned by driver ${vehicle.driverName}`,
      recordedBy: userId,
    });

    await vehicleService.updateStatus(vehicle.id, 'ASSIGNED');

    logisticsEvents.emit('shipment.milestone', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      milestone: 'ASSIGNED',
      timestamp: new Date().toISOString(),
    });

    return {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      driverName: vehicle.driverName,
      assignedAt: shipment.updatedAt,
    };
  }

  /**
   * Advance milestone along Finite State Machine:
   * ASSIGNED -> PICKUP -> TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
   */
  async updateMilestone(shipmentId, milestoneData, userId = 'driver') {
    const shipment = await this.getShipmentById(shipmentId);
    const nextMilestone = milestoneData.milestone;

    // Validate legal transitions
    const validNextStates = config.milestones.VALID_TRANSITIONS[shipment.status] || [];
    if (!validNextStates.includes(nextMilestone)) {
      throw new BusinessRuleError(
        `Illegal milestone transition from '${shipment.status}' to '${nextMilestone}'. Valid transitions: [${validNextStates.join(', ')}]`,
      );
    }

    // If transitioning to DELIVERED, verify delivery OTP
    if (nextMilestone === 'DELIVERED') {
      if (!milestoneData.deliveryOtp) {
        throw new BusinessRuleError('deliveryOtp is required to mark shipment as DELIVERED');
      }
      if (milestoneData.deliveryOtp !== shipment.deliveryOtp) {
        throw new BusinessRuleError('Invalid delivery OTP. Verification failed.');
      }
      shipment.deliveredAt = new Date().toISOString();
      if (shipment.vehicleId) {
        await vehicleService.updateStatus(shipment.vehicleId, 'AVAILABLE');
      }
    }

    // Update coordinates if provided
    if (milestoneData.latitude && milestoneData.longitude) {
      shipment.currentLocation = {
        latitude: milestoneData.latitude,
        longitude: milestoneData.longitude,
        speedKmh: nextMilestone === 'TRANSIT' ? 45 : 0,
        lastPingAt: new Date().toISOString(),
      };
      if (shipment.vehicleId) {
        await vehicleService.recordLocation(shipment.vehicleId, {
          latitude: milestoneData.latitude,
          longitude: milestoneData.longitude,
          speedKmh: shipment.currentLocation.speedKmh,
          temperatureC: milestoneData.temperatureC,
        });
      }
    }

    // If milestone is PICKUP and stopId provided, mark stop completed
    if (nextMilestone === 'PICKUP') {
      if (milestoneData.stopId) {
        const stop = shipment.stops.find((s) => s.id === milestoneData.stopId);
        if (stop) stop.status = 'COMPLETED';
      } else {
        // Mark all pickup stops as completed
        shipment.stops.forEach((s) => {
          if (s.stopType === 'PICKUP') s.status = 'COMPLETED';
        });
      }
    }

    if (nextMilestone === 'DELIVERED') {
      const deliveryStop = shipment.stops.find((s) => s.stopType === 'DELIVERY');
      if (deliveryStop) deliveryStop.status = 'COMPLETED';
    }

    shipment.status = nextMilestone;
    shipment.updatedAt = new Date().toISOString();

    const historyEntry = {
      status: nextMilestone,
      milestone: nextMilestone,
      recordedAt: new Date().toISOString(),
      latitude: milestoneData.latitude || null,
      longitude: milestoneData.longitude || null,
      temperatureC: milestoneData.temperatureC || null,
      notes: milestoneData.notes || `Milestone reached: ${nextMilestone}`,
      recordedBy: userId,
    };
    shipment.milestoneHistory.push(historyEntry);

    // Emit milestone event
    logisticsEvents.emit('shipment.milestone', {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      milestone: nextMilestone,
      timestamp: historyEntry.recordedAt,
      latitude: historyEntry.latitude,
      longitude: historyEntry.longitude,
    });

    // If DELIVERED, emit delivered event to release payment escrow
    if (nextMilestone === 'DELIVERED') {
      logisticsEvents.emit('shipment.delivered', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        deliveredAt: shipment.deliveredAt,
        verifiedOtp: milestoneData.deliveryOtp,
      });
    }

    return {
      shipmentId: shipment.id,
      currentStatus: shipment.status,
      milestone: nextMilestone,
      recordedAt: historyEntry.recordedAt,
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
      },
      stops: shipment.stops,
      milestonesHistory: shipment.milestoneHistory,
    };
  }

  /**
   * Map pins and polyline for an active order
   */
  async getOrderMap(orderId) {
    const shipment = [...inMemoryShipments.values()].find((s) => s.orderId === orderId);
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

    const allShipments = [...inMemoryShipments.values()];

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
