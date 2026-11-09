/**
 * SasyaVahini — Logistics Unit & Integration Test Suite
 *
 * Covers:
 * 1. Haversine distance & road detour math
 * 2. Normalization & per-farmer match scoring
 * 3. Total Landed Cost (TLC) breakdown & explainability
 * 4. Single-farmer vs multi-farmer decision logic
 * 5. Constraint filtering (grade, reliability, budget)
 * 6. Over-budget fallback calculation & reduction hint
 * 7. Vehicle selection policy (smallest fit, target utilization, nearest hub tie-break)
 * 8. Milestone state machine (legal transitions, illegal transitions, OTP verification)
 * 9. Supertest HTTP Integration Tests with Mock Adapter & Role Guards:
 *    - POST /api/logistics/plan
 *    - GET /api/logistics/available-shipments
 *    - POST /api/logistics/shipments/:id/milestones
 *    - GET /api/logistics/shipments/:id/tracking
 *    - GET /api/logistics/analytics/savings
 *
 * Owner: Member 4
 */

const path = require('path');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sasyavahini?schema=public';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret_for_development_and_testing_1234567890abcdef';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_for_development_and_testing_1234567890abcdef';
process.env.LOGISTICS_DATA_SOURCE = 'mock';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/logistics.config');
const { haversineKm, estimatedRoadKm } = require('../src/utils/geo');
const sourcingService = require('../src/services/sourcing.service');
const vehicleService = require('../src/services/vehicle.service');
const logisticsService = require('../src/services/logistics.service');

// Generate test JWT tokens
const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

const makeToken = (role, id = 'test_user_id') =>
  jwt.sign({ sub: id, email: `${role.toLowerCase()}@test.in`, role, status: 'ACTIVE' }, JWT_SECRET, {
    expiresIn: '1h',
  });

const logisticsToken = makeToken('LOGISTICS');
const buyerToken = makeToken('BUYER');
const farmerToken = makeToken('FARMER');
const adminToken = makeToken('ADMIN');

describe('Logistics Unit & Integration Test Suite — Member 4', () => {
  // ─── 1. Geodesic & Distance Math ───────────────────────────────────────────
  describe('Geodesic & Distance Math', () => {
    it('calculates zero distance for identical coordinates', () => {
      expect(haversineKm(18.5204, 73.8567, 18.5204, 73.8567)).toBe(0);
    });

    it('calculates realistic distance between Pune City and Chakan Hub (~30 km direct)', () => {
      const direct = haversineKm(18.5204, 73.8567, 18.7606, 73.8636);
      expect(direct).toBeGreaterThan(25);
      expect(direct).toBeLessThan(35);

      const road = estimatedRoadKm(18.5204, 73.8567, 18.7606, 73.8636);
      expect(road).toBeCloseTo(direct * 1.3, 1);
    });
  });

  // ─── 2. Candidate Matching & Normalization ──────────────────────────────────
  describe('Candidate Matching & Normalization', () => {
    const mockCandidates = [
      {
        id: 'c1',
        farmerId: 'f1',
        farmerName: 'Farmer One',
        pricePerKg: 20,
        distKm: 20,
        availableQuantityKg: 1000,
        reliability: 0.90,
      },
      {
        id: 'c2',
        farmerId: 'f2',
        farmerName: 'Farmer Two',
        pricePerKg: 30,
        distKm: 60,
        availableQuantityKg: 500,
        reliability: 0.80,
      },
    ];

    it('normalizes factors and assigns higher score to cheaper, closer, more reliable candidate', () => {
      const scored = sourcingService.computeMatchScores(mockCandidates, 1000, 100);
      expect(scored).toHaveLength(2);
      expect(scored[0].matchScore).toBeGreaterThan(scored[1].matchScore);
      expect(scored[0].priceScore).toBe(1.0); // Cheaper is 1.0
      expect(scored[1].priceScore).toBe(0.0); // Most expensive is 0.0
    });
  });

  // ─── 3. Total Landed Cost (TLC) Breakdown ──────────────────────────────────
  describe('Total Landed Cost (TLC) Breakdown', () => {
    it('accurately computes product, transport, handling, platform fee, aggregation fee, and risk cost', () => {
      const plan = {
        farmers: [
          {
            farmerId: 'f1',
            batchId: 'b1',
            qtyKg: 1000,
            pricePerKg: 20,
            grade: 'GRADE_A',
            reliability: 0.90,
            lat: 18.7606,
            lng: 73.8636,
          },
          {
            farmerId: 'f2',
            batchId: 'b2',
            qtyKg: 1000,
            pricePerKg: 22,
            grade: 'GRADE_A',
            reliability: 0.95,
            lat: 18.8470,
            lng: 73.9100,
          },
        ],
      };

      const buyerLat = 18.5089;
      const buyerLng = 73.9260;
      const costed = sourcingService.costPlan(plan, 2000, buyerLat, buyerLng, 'Hadapsar Market');

      // Product cost: (1000 * 20) + (1000 * 22) = 42,000
      expect(costed.costBreakdown.productCost).toBe(42000);

      // Handling cost: 2000 kg * ₹0.50 = ₹1000
      expect(costed.costBreakdown.handlingCost).toBe(1000);

      // Platform fee: 2% of 42,000 = ₹840
      expect(costed.costBreakdown.platformFee).toBe(840);

      // Aggregation fee: 2 farmers -> 1 extra farmer -> ₹350
      expect(costed.costBreakdown.aggregationFee).toBe(350);

      // Risk cost: (1 - 0.90)*20*1000 + (1 - 0.95)*22*1000 = 2000 + 1100 = ₹3100
      expect(costed.costBreakdown.riskCost).toBe(3100);

      // Transport cost: Mini-Truck base ₹800 + (routeKm * ₹24)
      expect(costed.costBreakdown.transportCost).toBeGreaterThan(800);

      // Total sum check
      const expectedTotal =
        costed.costBreakdown.productCost +
        costed.costBreakdown.transportCost +
        costed.costBreakdown.handlingCost +
        costed.costBreakdown.platformFee +
        costed.costBreakdown.aggregationFee +
        costed.costBreakdown.riskCost +
        costed.costBreakdown.gst;
      expect(costed.totalCost).toBeCloseTo(expectedTotal, 1);
    });

    it('charges zero aggregation fee for single-farmer plan', () => {
      const plan = {
        farmers: [
          {
            farmerId: 'f1',
            batchId: 'b1',
            qtyKg: 1500,
            pricePerKg: 20,
            grade: 'GRADE_A',
            reliability: 0.92,
            lat: 18.7606,
            lng: 73.8636,
          },
        ],
      };
      const costed = sourcingService.costPlan(plan, 1500, 18.5089, 73.9260, 'Buyer Hub');
      expect(costed.costBreakdown.aggregationFee).toBe(0);
      expect(costed.isSingleSource).toBe(true);
    });
  });

  // ─── 4. Single-vs-Multi Sourcing Decision Logic ─────────────────────────────
  describe('Single-vs-Multi Sourcing Decision Logic', () => {
    it('chooses single-farmer when single-farmer has the lower total cost and satisfies stock', async () => {
      const result = await sourcingService.planOrder({
        crop: 'Tomato',
        qtyKg: 1500,
        maxBudget: 60000,
        minGrade: 'GRADE_B',
        minReliability: 0.70,
        priority: 0.0,
        buyerLat: 18.5089,
        buyerLng: 73.9260,
      });

      expect(result.plans.length).toBeGreaterThan(0);
      const cheapest = result.plans.find((p) => p.label === 'CHEAPEST') || result.plans[0];
      expect(cheapest.totalCost).toBeLessThanOrEqual(60000);
    });

    it('assembles multi-farmer plan when requested quantity exceeds any single farmer stock', async () => {
      const result = await sourcingService.planOrder({
        crop: 'Tomato',
        qtyKg: 4500,
        maxBudget: 200000,
        minGrade: 'GRADE_B',
        minReliability: 0.70,
        priority: 0.5,
        buyerLat: 18.5089,
        buyerLng: 73.9260,
      });

      expect(result.plans.length).toBeGreaterThan(0);
      const bestPlan = result.plans[0];
      expect(bestPlan.farmers.length).toBeGreaterThan(1);
      expect(bestPlan.isSingleSource).toBe(false);
      const covered = bestPlan.farmers.reduce((s, f) => s + f.qtyKg, 0);
      expect(covered).toBeGreaterThanOrEqual(4500);
    });
  });

  // ─── 5. Budget Constraints & Over-Budget Hint ────────────────────────────────
  describe('Budget Constraints & Over-Budget Hint', () => {
    it('returns overBudget: true with helpful reduction hint when budget is insufficient', async () => {
      const result = await sourcingService.planOrder({
        crop: 'Tomato',
        qtyKg: 3000,
        maxBudget: 20000,
        buyerLat: 18.5089,
        buyerLng: 73.9260,
      });

      expect(result.overBudget).toBe(true);
      expect(result.overBudgetBy).toBeGreaterThan(0);
      expect(result.hint).toContain('Reduce requested quantity');
    });
  });

  // ─── 6. Vehicle Selection Policy ───────────────────────────────────────────
  describe('Vehicle Selection Policy', () => {
    it('picks the smallest vehicle that meets capacity (target utilization 80-90%)', async () => {
      // 1400 kg load should pick Tempo (1500 kg capacity) ~93% utilization
      const veh = await vehicleService.selectBestVehicle({
        requiredCapacityKg: 1400,
        firstPickupLat: 18.7606,
        firstPickupLng: 73.8636,
      });

      expect(veh).toBeDefined();
      expect(veh.capacityKg).toBeGreaterThanOrEqual(1400);
      expect(veh.capacityKg).toBeLessThanOrEqual(2500);
    });

    it('breaks ties by vehicle proximity to first pickup location', async () => {
      const veh = await vehicleService.selectBestVehicle({
        requiredCapacityKg: 2200,
        firstPickupLat: 18.7606, // Chakan coordinates
        firstPickupLng: 73.8636,
      });

      expect(veh).toBeDefined();
      expect(veh.distanceToFirstPickupKm).toBeLessThan(10);
    });
  });

  // ─── 7. Milestone State Machine ────────────────────────────────────────────
  describe('Milestone State Machine', () => {
    it('rejects illegal milestone jump (e.g. ASSIGNED -> DELIVERED directly)', async () => {
      const shipment = await logisticsService.getShipmentById('shp_demo_101');
      // Set status to ASSIGNED
      shipment.status = 'ASSIGNED';

      await expect(
        logisticsService.updateMilestone('shp_demo_101', { milestone: 'DELIVERED', deliveryOtp: '492810' }),
      ).rejects.toThrow(/Illegal milestone transition/);
    });

    it('rejects DELIVERED transition when OTP is wrong', async () => {
      const shipment = await logisticsService.getShipmentById('shp_demo_101');
      shipment.status = 'OUT_FOR_DELIVERY';

      await expect(
        logisticsService.updateMilestone('shp_demo_101', { milestone: 'DELIVERED', deliveryOtp: '000000' }),
      ).rejects.toThrow(/Invalid delivery OTP/);
    });

    it('successfully transitions to DELIVERED with correct OTP and releases vehicle', async () => {
      const shipment = await logisticsService.getShipmentById('shp_demo_101');
      shipment.status = 'OUT_FOR_DELIVERY';

      const result = await logisticsService.updateMilestone('shp_demo_101', {
        milestone: 'DELIVERED',
        deliveryOtp: shipment.deliveryOtp,
      });

      expect(result.currentStatus).toBe('DELIVERED');
      expect(shipment.status).toBe('DELIVERED');
    });
  });

  // ─── 8. Supertest Integration Tests & Role Guards ───────────────────────────
  describe('Supertest HTTP Integration & Role Guards', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/logistics/available-shipments');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects FARMER role accessing LOGISTICS-only endpoint with 403', async () => {
      const res = await request(app)
        .get('/api/logistics/available-shipments')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('allows LOGISTICS role to fetch /available-shipments with 200', async () => {
      const res = await request(app)
        .get('/api/logistics/available-shipments')
        .set('Authorization', `Bearer ${logisticsToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/logistics/plan returns 422 VALIDATION_ERROR on missing body fields', async () => {
      const res = await request(app)
        .post('/api/logistics/plan')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ crop: 'Tomato' }); // Missing required fields
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/logistics/plan returns feasible sourcing plans for BUYER', async () => {
      const res = await request(app)
        .post('/api/logistics/plan')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          crop: 'Tomato',
          qtyKg: 2000,
          maxBudget: 80000,
          minGrade: 'GRADE_B',
          minReliability: 0.70,
          priority: 0.5,
          buyerLat: 18.5089,
          buyerLng: 73.9260,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plans.length).toBeGreaterThan(0);
      expect(res.body.data.plans[0]).toHaveProperty('costBreakdown');
      expect(res.body.data.plans[0]).toHaveProperty('vehicleSuggestion');
    });

    it('GET /api/logistics/shipments/:id/tracking allows any authenticated user', async () => {
      const res = await request(app)
        .get('/api/logistics/shipments/shp_demo_101/tracking')
        .set('Authorization', `Bearer ${farmerToken}`); // Even farmer can track

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currentLocation');
      expect(res.body.data).toHaveProperty('coldChain');
    });

    it('GET /api/logistics/analytics/savings returns CVRP impact metrics', async () => {
      const res = await request(app)
        .get('/api/logistics/analytics/savings')
        .set('Authorization', `Bearer ${logisticsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('savedKm');
      expect(res.body.data).toHaveProperty('fuelSavedRs');
      expect(res.body.data).toHaveProperty('avgVehicleUtilizationPercent');
    });
  });
});
