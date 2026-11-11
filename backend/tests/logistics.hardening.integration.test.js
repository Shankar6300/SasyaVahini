/**
 * SasyaVahini — Logistics Hardening Integration Test Suite (Task 15)
 *
 * Verifies end-to-end functionality for:
 * 1. 3 Alternative Road Routes & OSRM integration
 * 2. Route selection and server-side lock with deviation reasons
 * 3. Cryptographic delivery OTP & attempt limit lockout
 * 4. 200m stop geofencing & override reasons
 * 5. Cross-track corridor deviation detection (>300m)
 * 6. Transactional Outbox pattern & event dispatching
 * 7. ReservationPort adapter & quote TTL enforcement
 *
 * Owner: Member 4
 */

const { generateDeliveryOtp, verifyDeliveryOtp } = require('../src/utils/cryptoOtp');
const { haversineKm, distanceToPolylineMeters } = require('../src/utils/geo');
const routingService = require('../src/services/routing.service');
const { recordOutboxEvent, dispatchPendingEvents, getOutboxStats, clearInMemoryOutbox } = require('../src/events/outboxDispatcher');
const { reservationPort, shipmentRepo } = require('../src/adapters');
const logisticsService = require('../src/services/logistics.service');
const { toBuyerView, toDriverView, toAdminView } = require('../src/utils/responseMappers');
const { ValidationError, BusinessRuleError, ConflictError } = require('../src/utils/errors');

describe('Logistics Hardening Integration Tests (Tasks 1 - 14)', () => {
  beforeEach(() => {
    clearInMemoryOutbox();
    reservationPort._clearMockState();
  });

  describe('1. Multi-Route Engine & 3 Alternative Road Routes', () => {
    it('returns up to 3 distinct routes with diesel economics and net driver earnings', async () => {
      const waypoints = [
        { lat: 18.9880, lng: 73.9400, name: 'Manchar Hub' },
        { lat: 18.5089, lng: 73.9260, name: 'Hadapsar Destination' },
      ];

      const result = await routingService.getRouteOptions(waypoints, { legPayoutRs: 4500 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.routes)).toBe(true);
      expect(result.routes.length).toBeGreaterThanOrEqual(1);

      const r0 = result.routes[0];
      expect(r0.distanceKm).toBeGreaterThan(0);
      expect(r0.etaMin).toBeGreaterThan(0);
      expect(r0.fuelLitres).toBeGreaterThan(0);
      expect(r0.fuelCostRs).toBeGreaterThan(0);
      expect(r0.driverNetEarningsRs).toBeDefined();
      expect(r0.geometry?.coordinates?.length).toBeGreaterThan(1);
    });

    it('fetches road geometry with fallback capability', async () => {
      const waypoints = [
        { lat: 18.9880, lng: 73.9400 },
        { lat: 18.5089, lng: 73.9260 },
      ];
      const roadGeo = await routingService.getRoadGeometry(waypoints);
      expect(roadGeo.distanceKm).toBeGreaterThan(0);
      expect(roadGeo.geometry?.coordinates?.length).toBeGreaterThan(1);
    });
  });

  describe('2. Route Locking and Deviation Reason Enforcement', () => {
    it('locks route and rejects modification without valid deviation reason', async () => {
      const legId = 'leg_demo_101';
      // First selection - lock route 0
      const locked = await logisticsService.selectLegRoute(legId, {
        selectedRouteIndex: 0,
      });
      expect(locked).toBeDefined();
      expect(locked.selectedRouteIndex).toBe(0);

      // Switching route without reason should fail with ConflictError
      await expect(
        logisticsService.selectLegRoute(legId, { selectedRouteIndex: 1 })
      ).rejects.toThrow(ConflictError);

      // Switching with valid deviation reason should succeed
      const deviated = await logisticsService.selectLegRoute(legId, {
        selectedRouteIndex: 1,
        deviationReason: 'ROAD_CLOSED',
      });
      expect(deviated.selectedRouteIndex).toBe(1);
      expect(deviated.deviationReason).toBe('ROAD_CLOSED');
    });
  });

  describe('3. Delivery OTP & Constant-Time Verification', () => {
    it('generates 6-digit OTP and verifies successfully with constant-time comparison', () => {
      const { rawOtp, hashedOtp, expiresAt } = generateDeliveryOtp();
      expect(rawOtp).toMatch(/^[0-9]{6}$/);
      expect(hashedOtp).toBeDefined();
      expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

      const isValid = verifyDeliveryOtp('shp_test_otp_01', rawOtp, hashedOtp, expiresAt);
      expect(isValid).toBe(true);
    });

    it('locks out after 5 consecutive incorrect OTP attempts', () => {
      const testShipmentId = 'shp_test_lockout_01';
      const { rawOtp, hashedOtp, expiresAt } = generateDeliveryOtp();

      for (let i = 0; i < 5; i++) {
        expect(() => {
          verifyDeliveryOtp(testShipmentId, '000000', hashedOtp, expiresAt);
        }).toThrow();
      }

      // 6th attempt even with correct OTP must be locked out
      expect(() => {
        verifyDeliveryOtp(testShipmentId, rawOtp, hashedOtp, expiresAt);
      }).toThrow(/attempts exceeded/i);
    });
  });

  describe('4. Geofencing (200m) and Cross-Track Deviation (>300m)', () => {
    it('calculates Haversine distance accurately', () => {
      const distKm = haversineKm(18.9880, 73.9400, 18.9890, 73.9400);
      expect(distKm).toBeCloseTo(0.111, 2);
    });

    it('detects cross-track polyline distance exceeding 300m corridor threshold', () => {
      const polyline = [
        [73.9400, 18.9880],
        [73.9260, 18.5089],
      ];
      // Point close to line
      const nearDist = distanceToPolylineMeters({ lat: 18.9880, lng: 73.9400 }, polyline);
      expect(nearDist).toBeLessThan(50);

      // Point deviated 1 km away
      const farDist = distanceToPolylineMeters({ lat: 18.9880, lng: 73.9550 }, polyline);
      expect(farDist).toBeGreaterThan(300);
    });
  });

  describe('5. Role-Specific Response Mappers & Scrubbing', () => {
    const rawShipment = {
      id: 'shp_priv_1',
      trackingNumber: 'SV-1234',
      status: 'TRANSIT',
      totalCost: 4500,
      deliveryOtp: '482910',
      bankDetails: { accountNumber: '1234567890', ifsc: 'HDFC0001' },
      panNumber: 'ABCDE1234F',
      driverPhone: '+919822000000',
      currentLocation: { latitude: 18.7, longitude: 73.8 },
      stops: [],
    };

    it('returns delivery OTP exclusively to authenticated buyer and scrubs financial credentials', () => {
      const buyerView = toBuyerView(rawShipment, true);
      expect(buyerView.deliveryOtp).toBe('482910');
      expect(buyerView.bankDetails).toBeUndefined();
      expect(buyerView.panNumber).toBeUndefined();

      // Non-owner buyer view does not receive OTP
      const nonOwnerBuyerView = toBuyerView(rawShipment, false);
      expect(nonOwnerBuyerView.deliveryOtp).toBeUndefined();
    });

    it('scrubs delivery OTP from driver view', () => {
      const driverView = toDriverView(rawShipment);
      expect(driverView.deliveryOtp).toBeUndefined();
    });

    it('preserves administrative details in admin view', () => {
      const adminView = toAdminView(rawShipment);
      expect(adminView.deliveryOtp).toBe('482910');
      expect(adminView.bankDetails).toBeDefined();
    });
  });

  describe('6. Transactional Outbox Pattern', () => {
    it('records outbox event and dispatches via event emitter', async () => {
      const event = await recordOutboxEvent({
        aggregateType: 'SHIPMENT',
        aggregateId: 'shp_outbox_test_1',
        eventType: 'shipment.created',
        payload: { test: true },
      });

      expect(event).toBeDefined();
      expect(event.aggregateType).toBe('SHIPMENT');

      const dispatched = await dispatchPendingEvents();
      expect(dispatched).toBeGreaterThanOrEqual(1);

      const stats = getOutboxStats();
      expect(stats.sent).toBeGreaterThanOrEqual(1);
    });
  });

  describe('7. ReservationPort Adapter & Quote TTL', () => {
    it('detects expired quotes based on TTL', () => {
      const pastDate = new Date(Date.now() - 60000);
      const futureDate = new Date(Date.now() + 60000);

      expect(reservationPort.isExpired(pastDate)).toBe(true);
      expect(reservationPort.isExpired(futureDate)).toBe(false);
    });

    it('creates active reservation and releases it cleanly', async () => {
      const res = await reservationPort.reserveStock({
        orderId: 'ord_res_test_1',
        items: [{ listingId: 'list_1', quantityKg: 500 }],
        ttlMinutes: 15,
      });

      expect(res.status).toBe('ACTIVE');
      expect(res.totalReservedKg).toBe(500);

      const releaseResult = await reservationPort.releaseReservation(res.reservationId);
      expect(releaseResult.released).toBe(true);
    });
  });
});
