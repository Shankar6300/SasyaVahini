/**
 * SasyaVahini — Prisma Shipment Repository
 * Production implementation using PostgreSQL via Prisma ORM.
 *
 * Implements:
 * - Single-transaction Shipment + ShipmentStop + ShipmentLeg creation
 * - Optimistic locking (updateMany count === 1 or 409 ConflictError)
 * - Persistent LocationPing recording
 * - Persistent PlanQuote storage and confirmation
 *
 * Owner: Member 4
 */

const prisma = require('../lib/prisma');
const { ConflictError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class PrismaShipmentRepo {
  /**
   * Create Shipment, ShipmentStops, and optional ShipmentLegs in a single atomic transaction
   */
  async createShipmentWithStopsAndLegs({ shipment, stops = [], legs = [] }) {
    return prisma.$transaction(async (tx) => {
      // 1. Create Shipment
      const createdShipment = await tx.shipment.create({
        data: {
          id: shipment.id,
          trackingNumber: shipment.trackingNumber,
          orderId: shipment.orderId,
          vehicleId: shipment.vehicleId || null,
          logisticsId: shipment.logisticsId || null,
          status: shipment.status || 'UNASSIGNED',
          deliveryOtp: shipment.deliveryOtp || null,
          totalWeightKg: shipment.totalWeightKg,
          totalDistanceKm: shipment.totalDistanceKm || null,
          baselineDistanceKm: shipment.baselineDistanceKm || null,
          savedDistanceKm: shipment.savedDistanceKm || null,
          estimatedFuelSavedRs: shipment.estimatedFuelSavedRs || null,
          utilizationPercent: shipment.utilizationPercent || null,
          estimatedMinutes: shipment.estimatedMinutes || null,
          routeGeometryJson: shipment.routeGeometryJson || shipment.routeGeometry || null,
          costBreakdownJson: shipment.costBreakdownJson || shipment.costBreakdown || null,
          scheduledPickupAt: shipment.scheduledPickupAt ? new Date(shipment.scheduledPickupAt) : null,
          deliveredAt: shipment.deliveredAt ? new Date(shipment.deliveredAt) : null,
        },
      });

      // 2. Create Stops
      if (stops.length > 0) {
        await tx.shipmentStop.createMany({
          data: stops.map((s, idx) => ({
            id: s.id,
            shipmentId: createdShipment.id,
            sequence: s.sequence || idx + 1,
            stopType: s.stopType || 'PICKUP',
            farmerId: s.farmerId || null,
            listingId: s.listingId || null,
            stopName: s.stopName || `Stop ${idx + 1}`,
            address: s.address || null,
            latitude: s.latitude,
            longitude: s.longitude,
            quantityKg: s.quantityKg,
            status: s.status || 'PENDING',
            arrivalEta: s.arrivalEta ? new Date(s.arrivalEta) : null,
          })),
        });
      }

      // 3. Create Legs if provided
      if (legs.length > 0) {
        await tx.shipmentLeg.createMany({
          data: legs.map((leg, idx) => ({
            id: leg.id,
            shipmentId: createdShipment.id,
            sequence: leg.sequence || idx + 1,
            type: leg.type || 'DIRECT',
            vehicleClass: leg.vehicleClass || 'SCV',
            fromJson: leg.fromJson || leg.from,
            toJson: leg.toJson || leg.to,
            km: leg.km || 0,
            etaMin: leg.etaMin || 0,
            cost: leg.cost || 0,
            kg: leg.kg || createdShipment.totalWeightKg,
            status: leg.status || 'PLANNED',
            transferPointId: leg.transferPointId || null,
          })),
        });
      }

      // 4. Record Initial Milestone Event
      await tx.shipmentMilestoneEvent.create({
        data: {
          shipmentId: createdShipment.id,
          status: createdShipment.status,
          milestone: createdShipment.status,
          notes: shipment.vehicleId ? `Assigned to vehicle ${shipment.vehicleNumber || shipment.vehicleId}` : 'Shipment created and scheduled',
          recordedBy: shipment.createdBy || 'system',
        },
      });

      // 5. If assigned a vehicle, mark vehicle ASSIGNED
      if (shipment.vehicleId) {
        await tx.vehicle.updateMany({
          where: { id: shipment.vehicleId },
          data: { status: 'ASSIGNED' },
        });
      }

      // 6. Return fully populated record
      return tx.shipment.findUnique({
        where: { id: createdShipment.id },
        include: {
          stops: { orderBy: { sequence: 'asc' } },
          legs: { orderBy: { sequence: 'asc' } },
          milestoneHistory: { orderBy: { recordedAt: 'asc' } },
        },
      });
    });
  }

  async findById(id) {
    if (!id) return null;
    return prisma.shipment.findFirst({
      where: {
        OR: [{ id }, { trackingNumber: id }, { orderId: id }],
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        legs: { orderBy: { sequence: 'asc' } },
        milestoneHistory: { orderBy: { recordedAt: 'asc' } },
        locationPings: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });
  }

  async findByOrderId(orderId) {
    if (!orderId) return null;
    return prisma.shipment.findFirst({
      where: { orderId },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        legs: { orderBy: { sequence: 'asc' } },
        milestoneHistory: { orderBy: { recordedAt: 'asc' } },
        locationPings: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });
  }

  async findByTrackingNumber(trackingNumber) {
    if (!trackingNumber) return null;
    return prisma.shipment.findFirst({
      where: { trackingNumber },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        legs: { orderBy: { sequence: 'asc' } },
        milestoneHistory: { orderBy: { recordedAt: 'asc' } },
        locationPings: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });
  }

  async listAvailableShipments(query = {}) {
    return prisma.shipment.findMany({
      where: {
        status: 'UNASSIGNED',
        vehicleId: null,
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listShipments({ page = 1, limit = 20, status = null, where = {} } = {}) {
    const filter = { ...where };
    if (status) {
      filter.status = status.toUpperCase();
    }

    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where: filter,
        include: {
          stops: { orderBy: { sequence: 'asc' } },
          locationPings: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shipment.count({ where: filter }),
    ]);

    return { items, total, page, limit };
  }

  async assignVehicle(shipmentId, vehicleId, { vehicleDetails = {}, driverNotes = '', recordedBy = 'logistics_operator' } = {}) {
    return prisma.$transaction(async (tx) => {
      // Optimistic lock: only assign if UNASSIGNED and vehicleId is null
      const updated = await tx.shipment.updateMany({
        where: {
          id: shipmentId,
          status: 'UNASSIGNED',
          vehicleId: null,
        },
        data: {
          vehicleId,
          status: 'ASSIGNED',
        },
      });

      if (updated.count !== 1) {
        throw new ConflictError('Shipment is already assigned to a vehicle or state changed');
      }

      await tx.shipmentMilestoneEvent.create({
        data: {
          shipmentId,
          status: 'ASSIGNED',
          milestone: 'ASSIGNED',
          notes: driverNotes || `Vehicle ${vehicleDetails.vehicleNumber || vehicleId} assigned`,
          recordedBy,
        },
      });

      await tx.vehicle.updateMany({
        where: { id: vehicleId },
        data: { status: 'ASSIGNED' },
      });

      return tx.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          stops: { orderBy: { sequence: 'asc' } },
          milestoneHistory: { orderBy: { recordedAt: 'asc' } },
        },
      });
    });
  }

  /**
   * Update milestone with mandatory optimistic locking:
   * Uses updateMany({ where: { id: shipmentId, status: currentStatus } })
   * Fails with 409 ConflictError if count !== 1.
   */
  async updateMilestoneWithOptimisticLock({
    shipmentId,
    currentStatus,
    nextStatus,
    milestoneData = {},
    recordedBy = 'driver',
    deliveredAt = null,
    vehicleIdToRelease = null,
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Optimistic locking check via updateMany
      const updatePayload = {
        status: nextStatus,
      };
      if (nextStatus === 'DELIVERED') {
        updatePayload.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
      }

      const lockResult = await tx.shipment.updateMany({
        where: {
          id: shipmentId,
          status: currentStatus,
        },
        data: updatePayload,
      });

      if (lockResult.count !== 1) {
        throw new ConflictError(
          `Optimistic concurrency conflict: shipment '${shipmentId}' status is no longer '${currentStatus}'. State may have been updated concurrently.`,
        );
      }

      // 2. Append milestone event
      await tx.shipmentMilestoneEvent.create({
        data: {
          shipmentId,
          status: nextStatus,
          milestone: nextStatus,
          latitude: milestoneData.latitude || null,
          longitude: milestoneData.longitude || null,
          temperatureC: milestoneData.temperatureC || null,
          notes: milestoneData.notes || null,
          recordedBy,
        },
      });

      // 3. Update Stop status
      if (nextStatus === 'PICKUP') {
        if (milestoneData.stopId) {
          await tx.shipmentStop.updateMany({
            where: { id: milestoneData.stopId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        } else {
          await tx.shipmentStop.updateMany({
            where: { shipmentId, stopType: 'PICKUP' },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        }
      } else if (nextStatus === 'DELIVERED') {
        await tx.shipmentStop.updateMany({
          where: { shipmentId, stopType: 'DELIVERY' },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        if (vehicleIdToRelease) {
          await tx.vehicle.updateMany({
            where: { id: vehicleIdToRelease },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      // 4. Return updated shipment
      return tx.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          stops: { orderBy: { sequence: 'asc' } },
          milestoneHistory: { orderBy: { recordedAt: 'asc' } },
          locationPings: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
      });
    });
  }

  /**
   * Persist LocationPing in database
   */
  async recordLocationPing({ shipmentId = null, vehicleId = null, latitude, longitude, speedKmh = null, temperatureC = null }) {
    const ping = await prisma.locationPing.create({
      data: {
        shipmentId,
        vehicleId,
        latitude,
        longitude,
        speedKmh,
        temperatureC,
      },
    });

    if (vehicleId) {
      await prisma.vehicle.updateMany({
        where: { id: vehicleId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationAt: new Date(),
        },
      });
    }

    return ping;
  }

  /**
   * Persist PlanQuote at creation time (not just upon confirmation)
   * Converts Infinity budget to null per schema contract
   */
  async savePlanQuote(quote) {
    const maxBudget = quote.maxBudget === Infinity || quote.maxBudget === undefined ? null : quote.maxBudget;

    return prisma.planQuote.upsert({
      where: { quoteId: quote.quoteId },
      update: {
        crop: quote.crop,
        requestedQtyKg: quote.requestedQtyKg || quote.qtyKg,
        maxBudget,
        radiusUsedKm: quote.radiusUsedKm || null,
        ringsTried: quote.ringsTried || [],
        payload: quote.payload || quote,
        explanation: quote.explanation || '',
        expiresAt: new Date(quote.expiresAt),
      },
      create: {
        quoteId: quote.quoteId,
        crop: quote.crop,
        requestedQtyKg: quote.requestedQtyKg || quote.qtyKg,
        maxBudget,
        radiusUsedKm: quote.radiusUsedKm || null,
        ringsTried: quote.ringsTried || [],
        payload: quote.payload || quote,
        explanation: quote.explanation || '',
        expiresAt: new Date(quote.expiresAt),
        priceLocked: false,
      },
    });
  }

  async findPlanQuote(quoteId) {
    if (!quoteId) return null;
    return prisma.planQuote.findUnique({
      where: { quoteId },
      include: { legs: true },
    });
  }

  async confirmPlanQuote(quoteId, confirmedData = {}) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.planQuote.findUnique({ where: { quoteId } });
      if (!quote) throw new NotFoundError(`Plan quote ${quoteId}`);
      if (quote.expiresAt <= new Date()) {
        throw new ConflictError('Quote has expired; request a new plan before confirmation');
      }

      const confirmedPayload = {
        ...quote.payload,
        ...confirmedData,
        quoteId,
        confirmedAt: new Date().toISOString(),
        priceLocked: true,
      };

      if (confirmedData.transferPoint) {
        await tx.transferPoint.upsert({
          where: { id: confirmedData.transferPoint.id },
          update: {
            name: confirmedData.transferPoint.name,
            latitude: confirmedData.transferPoint.lat,
            longitude: confirmedData.transferPoint.lng,
            roadAccess: confirmedData.transferPoint.roadAccess || 'MAIN',
            capacityKg: confirmedData.transferPoint.capacityKg || confirmedData.totalWeightKg || 3000,
            handlingFeePerKg: confirmedData.transferPoint.feePerKg || 0,
            openHours: confirmedData.transferPoint.openHours,
            zone: confirmedData.transferPoint.zone,
          },
          create: {
            id: confirmedData.transferPoint.id,
            name: confirmedData.transferPoint.name,
            latitude: confirmedData.transferPoint.lat,
            longitude: confirmedData.transferPoint.lng,
            roadAccess: confirmedData.transferPoint.roadAccess || 'MAIN',
            capacityKg: confirmedData.transferPoint.capacityKg || confirmedData.totalWeightKg || 3000,
            handlingFeePerKg: confirmedData.transferPoint.feePerKg || 0,
            openHours: confirmedData.transferPoint.openHours,
            zone: confirmedData.transferPoint.zone,
          },
        });
      }

      return tx.planQuote.update({
        where: { quoteId },
        data: {
          confirmedAt: new Date(),
          priceLocked: true,
          payload: confirmedPayload,
        },
      });
    });
  }

  async findLegById(id) {
    if (!id) return null;
    return prisma.shipmentLeg.findUnique({
      where: { id },
      include: {
        shipment: true,
        transferPoint: true,
      },
    });
  }

  async lockLegRoute(legId, { selectedRouteIndex, routeData = {}, deviationReason = null, lockedBy = 'driver' }) {
    return prisma.$transaction(async (tx) => {
      const leg = await tx.shipmentLeg.findUnique({ where: { id: legId } });
      if (!leg) throw new NotFoundError(`Shipment leg ${legId}`);

      if (leg.routeLockedAt != null) {
        if (!deviationReason) {
          throw new ConflictError(
            'Route is already locked. Route change requires a verified deviationReason (ROAD_CLOSED, FLOOD, ACCIDENT, WEIGHT_LIMIT, OTHER).'
          );
        }
        const validReasons = ['ROAD_CLOSED', 'FLOOD', 'ACCIDENT', 'WEIGHT_LIMIT', 'OTHER'];
        if (!validReasons.includes(deviationReason)) {
          throw new ConflictError(`Invalid deviation reason '${deviationReason}'. Allowed: ${validReasons.join(', ')}`);
        }
      }

      const updateData = {
        selectedRouteIndex,
        routeLockedAt: new Date(),
        status: 'LOCKED',
      };
      if (routeData.fuelCostRs != null) updateData.plannedCostRs = routeData.fuelCostRs;
      if (routeData.fuelLitres != null) updateData.plannedFuelLitres = routeData.fuelLitres;
      if (routeData.etaMin != null) updateData.plannedEtaMin = routeData.etaMin;
      if (routeData.routeOptions) updateData.routeOptionsJson = routeData.routeOptions;
      if (deviationReason) updateData.deviationReason = deviationReason;

      return tx.shipmentLeg.update({
        where: { id: legId },
        data: updateData,
      });
    });
  }
}

module.exports = new PrismaShipmentRepo();
module.exports.PrismaShipmentRepo = PrismaShipmentRepo;
