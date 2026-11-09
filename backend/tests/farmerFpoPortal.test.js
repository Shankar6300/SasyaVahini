/**
 * SasyaVahini — Farmer & FPO End-to-End API Integration Tests
 * 
 * Tests real authentication, authorization, Farmer features,
 * FPO features, and ACID inventory business rules against Neon PostgreSQL.
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';

describe('Farmer and FPO End-to-End Test Suite', () => {
  let farmerToken = null;
  let farmerUser = null;
  let fpoToken = null;
  let fpoUser = null;
  let createdListingId = null;

  beforeAll(async () => {
    // Authenticate with seeded Farmer
    const farmerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farmer@demo.sasyavahini.in', password: 'DemoPass1' });
    
    expect(farmerRes.status).toBe(200);
    expect(farmerRes.body.success).toBe(true);
    farmerToken = farmerRes.body.data.accessToken;
    farmerUser = farmerRes.body.data.user;

    // Authenticate with seeded FPO
    const fpoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fpo@demo.sasyavahini.in', password: 'DemoPass1' });

    expect(fpoRes.status).toBe(200);
    expect(fpoRes.body.success).toBe(true);
    fpoToken = fpoRes.body.data.accessToken;
    fpoUser = fpoRes.body.data.user;
  });

  afterAll(async () => {
    // Clean up test-created listing
    if (createdListingId) {
      await prisma.produceListing.deleteMany({ where: { id: createdListingId } });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. AUTHENTICATION & RBAC
  // =========================================================================
  describe('1. Authentication & Role-Based Authorization', () => {
    it('AUTH-01: Farmer login returns valid JWT tokens and user payload', () => {
      expect(farmerToken).toBeDefined();
      expect(farmerUser.role).toBe('FARMER');
      expect(farmerUser.email).toBe('farmer@demo.sasyavahini.in');
    });

    it('AUTH-02: FPO login returns valid JWT tokens and user payload', () => {
      expect(fpoToken).toBeDefined();
      expect(fpoUser.role).toBe('FPO');
      expect(fpoUser.email).toBe('fpo@demo.sasyavahini.in');
    });

    it('AUTH-03: Invalid credentials return 401 with structured error envelope', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'farmer@demo.sasyavahini.in', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('AUTH-04: Farmer token cannot access FPO-only routes (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/fpo/dashboard')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('AUTH-05: FPO token cannot access Farmer produce creation route (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/farmers/produce')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({ cropName: 'Wheat', quantityKg: 100, askingPricePerKg: 30 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('AUTH-06: Unauthenticated request returns 401 Unauthorized', async () => {
      const res = await request(app).get('/api/farmers/produce');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. FARMER PORTAL
  // =========================================================================
  describe('2. Farmer Portal Features', () => {
    it('FARM-01: GET /api/farmers/produce retrieves listings from Neon PostgreSQL', async () => {
      const res = await request(app)
        .get('/api/farmers/produce')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const tomato = res.body.data.find(l => l.cropName === 'Tomato');
      expect(tomato).toBeDefined();
      expect(tomato.totalQuantityKg).toBe(2000);
      expect(tomato.freeQtyKg).toBe(2000);
      expect(tomato.status).toBe('AVAILABLE');
    });

    it('FARM-02: POST /api/farmers/produce creates a new listing and persists in Neon', async () => {
      const res = await request(app)
        .post('/api/farmers/produce')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          cropName: 'Shimla Mirch (Capsicum)',
          category: 'Vegetables',
          qualityGrade: 'GRADE_A',
          quantityKg: 850,
          askingPricePerKg: 42,
          minPricePerKg: 38,
          isOrganic: true,
          harvestDate: '2026-11-15',
          village: 'Manchar',
          district: 'Pune',
          state: 'Maharashtra',
          description: 'Export quality green capsicum'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cropName).toBe('Shimla Mirch (Capsicum)');
      expect(res.body.data.totalQuantityKg).toBe(850);
      expect(res.body.data.askingPricePerKg).toBe(42);
      expect(res.body.data.status).toBe('AVAILABLE');

      createdListingId = res.body.data.id;

      // Verify direct database persistence
      const dbRecord = await prisma.produceListing.findUnique({
        where: { id: createdListingId }
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord.totalQuantityKg).toBe(850);
    });

    it('FARM-03: Rejects listing creation when minPrice > askingPrice (400/422)', async () => {
      const res = await request(app)
        .post('/api/farmers/produce')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          cropName: 'Chilli',
          quantityKg: 500,
          askingPricePerKg: 30,
          minPricePerKg: 35 // Invalid: min exceeds asking price
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('FARM-04: PUT /api/farmers/produce/:id updates an available listing', async () => {
      const res = await request(app)
        .put(`/api/farmers/produce/${createdListingId}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          askingPricePerKg: 45,
          quantityKg: 900
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.askingPricePerKg).toBe(45);
      expect(res.body.data.totalQuantityKg).toBe(900);
    });

    it('FARM-05: PUT /api/farmers/profile updates farmer profile and persists in Neon', async () => {
      const res = await request(app)
        .put('/api/farmers/profile')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          village: 'Manchar North',
          landSizeAcres: 4.0,
          produceTypes: ['Tomato', 'Capsicum', 'Onion']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.village).toBe('Manchar North');
      expect(res.body.data.landSizeAcres).toBe(4.0);

      const dbProfile = await prisma.farmerProfile.findUnique({
        where: { userId: farmerUser.id }
      });
      expect(dbProfile.village).toBe('Manchar North');
      expect(dbProfile.landSizeAcres).toBe(4.0);
    });

    it('FARM-06: GET /api/farmers/earnings calculates real settled vs escrow funds', async () => {
      const res = await request(app)
        .get('/api/farmers/earnings')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalCompletedEarnings');
      expect(res.body.data).toHaveProperty('pendingEscrow');
      expect(res.body.data).toHaveProperty('settlements');
      expect(Array.isArray(res.body.data.settlements)).toBe(true);
    });

    it('FARM-07: GET /api/notifications retrieves farmer notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // 3. INVENTORY & CONSENT INVARIANTS
  // =========================================================================
  describe('3. Inventory Integrity & ACID Consent Invariants', () => {
    it('CONS-01: Accept proposal atomically reserves inventory and changes status', async () => {
      const res = await request(app)
        .post(`/api/farmers/proposals/prop-${createdListingId}-sim/accept`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          listingId: createdListingId,
          requestedQtyKg: 400
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reservedKg).toBe(400);
      expect(res.body.data.listing.reservedQty).toBe(400);
      expect(res.body.data.listing.status).toBe('PARTIALLY_RESERVED');

      // Verify in DB
      const dbListing = await prisma.produceListing.findUnique({
        where: { id: createdListingId }
      });
      expect(dbListing.reservedQty).toBe(400);
      expect(dbListing.status).toBe('PARTIALLY_RESERVED');
    });

    it('CONS-02: Overselling rejected when requested quantity exceeds uncommitted inventory', async () => {
      // Current lot has 900 total, 400 reserved -> 500 free
      // Requesting 600 kg should be rejected
      const res = await request(app)
        .post(`/api/farmers/proposals/prop-${createdListingId}-sim2/accept`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          listingId: createdListingId,
          requestedQtyKg: 600 // 600 > 500 free
        });

      expect(res.status).toBe(409); // ConflictError
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/exceeds available uncommitted inventory/i);
    });

    it('CONS-03: Rejecting proposal releases hold and keeps produce available for rematching', async () => {
      const res = await request(app)
        .post(`/api/farmers/proposals/prop-${createdListingId}-sim3/reject`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          reason: 'Offered rate too low for Grade A produce'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/Produce remains available/i);
    });
  });

  // =========================================================================
  // 4. FPO PORTAL & AGGREGATION
  // =========================================================================
  describe('4. FPO Portal, Collective Inventory & Aggregation', () => {
    it('FPO-01: GET /api/fpo/dashboard returns un-shadowed database stats', async () => {
      const res = await request(app)
        .get('/api/fpo/dashboard')
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('fpoProfile');
      expect(res.body.data).toHaveProperty('collectiveInventory');
      expect(res.body.data).toHaveProperty('fpoListings');
      expect(res.body.data).toHaveProperty('memberFarmers');
      expect(Array.isArray(res.body.data.collectiveInventory)).toBe(true);
    });

    it('FPO-02: GET /api/fpo/members retrieves affiliated member farmers with lot traceability', async () => {
      const res = await request(app)
        .get('/api/fpo/members')
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const member = res.body.data[0];
      expect(member).toHaveProperty('user');
      expect(member).toHaveProperty('listings');
    });

    it('FPO-03: Weighted Asking Rate formula verification: 100 kg @ ₹20 + 200 kg @ ₹25 = ₹23.33/kg', async () => {
      // Find the two seeded onion lots
      const onionLots = await prisma.produceListing.findMany({
        where: {
          cropName: 'Onion',
          id: { in: ['seed-listing-onion-001', 'seed-listing-onion-002'] }
        }
      });

      expect(onionLots.length).toBe(2);

      const res = await request(app)
        .post('/api/fpo/aggregate')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          cropName: 'Onion Collective Pool',
          listingIds: onionLots.map(l => l.id)
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAggregatedQty).toBe(300); // 100 + 200 = 300 kg
      // Formula: (100 * 20 + 200 * 25) / 300 = (2000 + 5000) / 300 = 7000 / 300 = 23.333... => rounded to 23.3
      expect(res.body.data.weightedAvgPricePerKg).toBe(23.3);
      expect(res.body.data.farmersBreakdown.length).toBe(2);
    });

    it('FPO-04: PUT /api/fpo/profile updates FPO profile and persists in Neon', async () => {
      const res = await request(app)
        .put('/api/fpo/profile')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          address: 'APMC Market Yard Gate 2, Pune',
          district: 'Pune'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.address).toBe('APMC Market Yard Gate 2, Pune');

      const dbFpo = await prisma.fPOProfile.findUnique({
        where: { userId: fpoUser.id }
      });
      expect(dbFpo.address).toBe('APMC Market Yard Gate 2, Pune');
    });
  });
});

