/**
 * SasyaVahini — Mock Shipment Repository
 * In-memory persistence for unit tests and standalone mock mode.
 *
 * Owner: Member 4
 */

const { ConflictError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class MockShipmentRepo {
  constructor() {
    this.shipments = new Map();
    this.quotes = new Map();
    this.locationPings = [];
    this.initDefaultMock();
  }

  initDefaultMock() {
    const mockId = 'shp_demo_101';
    this.shipments.set(mockId, {
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
      legs: [],
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
      locationPings: [],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async createShipmentWithStopsAndLegs({ shipment, stops = [], legs = [] }) {
    if (this.shipments.has(shipment.id)) {
      throw new ConflictError(`Shipment with ID ${shipment.id} already exists`);
    }

    const createdShipment = {
      ...shipment,
      stops: stops.map((s, idx) => ({
        id: s.id || `stop_${idx + 1}`,
        shipmentId: shipment.id,
        sequence: s.sequence || idx + 1,
        stopType: s.stopType || 'PICKUP',
        farmerId: s.farmerId || null,
        listingId: s.listingId || null,
        stopName: s.stopName || `Stop ${idx + 1}`,
        address: s.address || null,
        latitude: s.latitude,
        longitude: s.longitude,
        quantityKg: s.quantityKg,
        pricePerKg: s.pricePerKg,
        grade: s.grade,
        status: s.status || 'PENDING',
        arrivalEta: s.arrivalEta || null,
        createdAt: new Date().toISOString(),
      })),
      legs: legs.map((leg, idx) => ({
        id: leg.id || `leg_${idx + 1}`,
        shipmentId: shipment.id,
        sequence: leg.sequence || idx + 1,
        type: leg.type || 'DIRECT',
        vehicleClass: leg.vehicleClass || 'SCV',
        fromJson: leg.fromJson || leg.from,
        toJson: leg.toJson || leg.to,
        km: leg.km || 0,
        etaMin: leg.etaMin || 0,
        cost: leg.cost || 0,
        kg: leg.kg || shipment.totalWeightKg,
        status: leg.status || 'PLANNED',
        createdAt: new Date().toISOString(),
      })),
      milestoneHistory: shipment.milestoneHistory || [
        {
          status: shipment.status || 'UNASSIGNED',
          milestone: shipment.status || 'UNASSIGNED',
          recordedAt: new Date().toISOString(),
          notes: 'Shipment created and scheduled',
        },
      ],
      locationPings: [],
      createdAt: shipment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.shipments.set(shipment.id, createdShipment);
    logger.info('MockShipmentRepo: created shipment', { shipmentId: shipment.id, trackingNumber: shipment.trackingNumber });
    return createdShipment;
  }

  async findById(id) {
    if (!id) return null;
    return (
      this.shipments.get(id) ||
      [...this.shipments.values()].find((s) => s.trackingNumber === id || s.orderId === id) ||
      null
    );
  }

  async findByOrderId(orderId) {
    if (!orderId) return null;
    return [...this.shipments.values()].find((s) => s.orderId === orderId) || null;
  }

  async findByTrackingNumber(trackingNumber) {
    if (!trackingNumber) return null;
    return [...this.shipments.values()].find((s) => s.trackingNumber === trackingNumber) || null;
  }

  async listAvailableShipments(query = {}) {
    return [...this.shipments.values()].filter(
      (s) => s.status === 'UNASSIGNED' || !s.vehicleId,
    );
  }

  async listShipments({ page = 1, limit = 20, status = null, where = {} } = {}) {
    let list = [...this.shipments.values()];
    if (status) {
      list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }
    if (where.vehicleId) {
      list = list.filter((s) => s.vehicleId === where.vehicleId);
    }
    if (where.logisticsId) {
      list = list.filter((s) => s.logisticsId === where.logisticsId);
    }
    const total = list.length;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);
    return { items, total, page, limit };
  }

  async assignVehicle(shipmentId, vehicleId, { vehicleDetails = {}, driverNotes = '', recordedBy = 'logistics_operator' } = {}) {
    const shipment = await this.findById(shipmentId);
    if (!shipment) throw new NotFoundError(`Shipment with ID ${shipmentId}`);

    if (shipment.status !== 'UNASSIGNED' && shipment.vehicleId) {
      throw new ConflictError('Shipment is already assigned to a vehicle');
    }

    shipment.vehicleId = vehicleId;
    shipment.vehicleNumber = vehicleDetails.vehicleNumber || shipment.vehicleNumber;
    shipment.driverName = vehicleDetails.driverName || shipment.driverName;
    shipment.driverPhone = vehicleDetails.driverPhone || shipment.driverPhone;
    shipment.status = 'ASSIGNED';
    shipment.updatedAt = new Date().toISOString();

    shipment.milestoneHistory.push({
      status: 'ASSIGNED',
      milestone: 'ASSIGNED',
      recordedAt: new Date().toISOString(),
      notes: driverNotes || `Vehicle ${vehicleDetails.vehicleNumber || vehicleId} assigned`,
      recordedBy,
    });

    return shipment;
  }

  async updateMilestoneWithOptimisticLock({
    shipmentId,
    currentStatus,
    nextStatus,
    milestoneData = {},
    recordedBy = 'driver',
    deliveredAt = null,
  }) {
    const shipment = await this.findById(shipmentId);
    if (!shipment) throw new NotFoundError(`Shipment ${shipmentId}`);

    // Enforce optimistic concurrency lock: current status must match
    if (shipment.status !== currentStatus) {
      throw new ConflictError(
        `Optimistic concurrency conflict: shipment '${shipmentId}' is currently '${shipment.status}', expected '${currentStatus}'`,
      );
    }

    shipment.status = nextStatus;
    shipment.updatedAt = new Date().toISOString();
    if (deliveredAt || nextStatus === 'DELIVERED') {
      shipment.deliveredAt = deliveredAt || new Date().toISOString();
    }

    if (milestoneData.latitude && milestoneData.longitude) {
      shipment.currentLocation = {
        latitude: milestoneData.latitude,
        longitude: milestoneData.longitude,
        speedKmh: nextStatus === 'TRANSIT' ? 45 : 0,
        lastPingAt: new Date().toISOString(),
      };
    }

    // Update stop status if provided
    if (nextStatus === 'PICKUP') {
      if (milestoneData.stopId) {
        const stop = shipment.stops.find((s) => s.id === milestoneData.stopId);
        if (stop) stop.status = 'COMPLETED';
      } else {
        shipment.stops.forEach((s) => {
          if (s.stopType === 'PICKUP') s.status = 'COMPLETED';
        });
      }
    } else if (nextStatus === 'DELIVERED') {
      shipment.stops.forEach((s) => {
        if (s.stopType === 'DELIVERY') s.status = 'COMPLETED';
      });
    }

    shipment.milestoneHistory.push({
      status: nextStatus,
      milestone: nextStatus,
      latitude: milestoneData.latitude || null,
      longitude: milestoneData.longitude || null,
      temperatureC: milestoneData.temperatureC || null,
      notes: milestoneData.notes || null,
      recordedBy,
      recordedAt: new Date().toISOString(),
    });

    return shipment;
  }

  async recordLocationPing({ shipmentId, vehicleId, latitude, longitude, speedKmh = null, temperatureC = null }) {
    const ping = {
      id: `ping_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      shipmentId,
      vehicleId,
      latitude,
      longitude,
      speedKmh,
      temperatureC,
      recordedAt: new Date().toISOString(),
    };
    this.locationPings.push(ping);

    if (shipmentId) {
      const shipment = await this.findById(shipmentId);
      if (shipment) {
        shipment.currentLocation = {
          latitude,
          longitude,
          speedKmh: speedKmh || 0,
          lastPingAt: ping.recordedAt,
        };
        if (!shipment.locationPings) shipment.locationPings = [];
        shipment.locationPings.unshift(ping);
      }
    }

    return ping;
  }

  async savePlanQuote(quote) {
    const quoteRecord = {
      id: quote.id || `quote_rec_${Date.now()}`,
      quoteId: quote.quoteId,
      crop: quote.crop,
      requestedQtyKg: quote.requestedQtyKg || quote.qtyKg,
      maxBudget: quote.maxBudget === Infinity || quote.maxBudget === undefined ? null : quote.maxBudget,
      radiusUsedKm: quote.radiusUsedKm || null,
      ringsTried: quote.ringsTried || [],
      payload: quote.payload || quote,
      explanation: quote.explanation || '',
      expiresAt: new Date(quote.expiresAt).toISOString(),
      confirmedAt: quote.confirmedAt ? new Date(quote.confirmedAt).toISOString() : null,
      priceLocked: quote.priceLocked || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.quotes.set(quote.quoteId, quoteRecord);
    return quoteRecord;
  }

  async findPlanQuote(quoteId) {
    return this.quotes.get(quoteId) || null;
  }

  async confirmPlanQuote(quoteId, confirmedData = {}) {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new NotFoundError(`Plan quote ${quoteId}`);
    if (new Date(quote.expiresAt) <= new Date()) {
      throw new ConflictError('Quote has expired; request a new plan before confirmation');
    }
    quote.confirmedAt = new Date().toISOString();
    quote.priceLocked = true;
    quote.payload = { ...quote.payload, ...confirmedData, confirmedAt: quote.confirmedAt, priceLocked: true };
    quote.updatedAt = new Date().toISOString();
    return quote;
  }
}

module.exports = new MockShipmentRepo();
module.exports.MockShipmentRepo = MockShipmentRepo;
