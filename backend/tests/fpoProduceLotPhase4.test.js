/**
 * SasyaVahini — Phase 4: FPO Produce Aggregation and Produce Lot Management Test Suite
 *
 * Verifies:
 * 1. Confirmed contributions query: returns only confirmed quantities with remaining available balance.
 * 2. Incompatible crops validation: rejects combining different crops into a single consolidated lot.
 * 3. Over-allocation prevention: rejects requesting more quantity than confirmed by the member farmer.
 * 4. Core aggregation scenario:
 *    - Farmer A: 800 kg Tomato
 *    - Farmer B: 1,200 kg Tomato
 *    - Farmer C: 1,000 kg Tomato
 *    - Farmer D: 2,000 kg Tomato
 *    Creates 1 consolidated 5,000 kg Tomato lot with unique ID, exact weighted average price, and itemized traceability.
 * 5. Anti-double-counting: prevents reusing already committed contributions beyond confirmed amounts.
 * 6. Partial quantity aggregation: supports taking a partial quantity from a confirmed batch.
 * 7. Produce lots query & filtering: supports status, crop, search filters, and itemized lot breakdown.
 * 8. State machine transitions: validates permitted status transitions and rejects illegal transitions.
 * 9. Lot contract allocation: supports partial allocation towards buyer orders.
 * 10. Lot cancellation & stock reconciliation: safely releases confirmed quantities back to available pool.
 * 11. Tenant isolation & RBAC: ensures FPO 2 cannot access or mutate FPO 1's lots or contributions.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
jest.setTimeout(120000);

describe('Phase 4: FPO Produce Aggregation & Produce Lot Management', () => {
  let fpoToken = null;
  let fpoUser = null;
  let fpoProfile = null;

  let fpo2Token = null;
  let fpo2User = null;
  let fpo2Profile = null;

  // 4 Member Farmers for Core Scenario
  let farmerA = null, tokenA = null, listingA = null, notifA = null;
  let farmerB = null, tokenB = null, listingB = null, notifB = null;
  let farmerC = null, tokenC = null, listingC = null, notifC = null;
  let farmerD = null, tokenD = null, listingD = null, notifD = null;

  // 1 Farmer with different crop (Onion) for incompatibility test
  let farmerIncompatible = null, tokenIncompatible = null, listingIncompatible = null, notifIncompatible = null;

  // 1 Farmer for partial allocation test
  let farmerE = null, tokenE = null, listingE = null, notifE = null;

  let createdUserIds = [];
  let createdListingIds = [];
  let createdNotificationIds = [];
  let createdLotIds = [];

  beforeAll(async () => {
    const hash = await bcrypt.hash('DemoPass1', 10);

    // 1. Primary Demo FPO
    const fpoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fpo@demo.sasyavahini.in', password: 'DemoPass1' });
    expect(fpoRes.status).toBe(200);
    fpoToken = fpoRes.body.data.accessToken;
    fpoUser = fpoRes.body.data.user;

    fpoProfile = await prisma.fPOProfile.findUnique({
      where: { userId: fpoUser.id }
    });
    expect(fpoProfile).toBeDefined();

    // 2. Secondary FPO for Tenant Isolation
    const existingFpo2 = await prisma.user.findUnique({
      where: { email: 'fpo2_phase4@test.sasyavahini.in' }
    });
    if (!existingFpo2) {
      fpo2User = await prisma.user.create({
        data: {
          name: 'Sahyadri Farmers Producer Co',
          email: 'fpo2_phase4@test.sasyavahini.in',
          phone: '+919876543177',
          role: 'FPO',
          passwordHash: hash,
          status: 'ACTIVE',
          isPhoneVerified: true,
          isEmailVerified: true,
          fpoProfile: {
            create: {
              fpoName: 'Sahyadri Farmers Co',
              registrationNo: 'CIN-FPO-P4-7766',
              district: 'Nashik',
              state: 'Maharashtra',
              registrationCertVerified: true,
              memberCount: 0
            }
          }
        },
        include: { fpoProfile: true }
      });
      createdUserIds.push(fpo2User.id);
      fpo2Profile = fpo2User.fpoProfile;
    } else {
      fpo2User = existingFpo2;
      fpo2Profile = await prisma.fPOProfile.findUnique({ where: { userId: fpo2User.id } });
    }

    const fpo2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fpo2_phase4@test.sasyavahini.in', password: 'DemoPass1' });
    expect(fpo2Login.status).toBe(200);
    fpo2Token = fpo2Login.body.data.accessToken;

    // Helper to create and authenticate a member farmer with a listing and confirmed contribution
    async function createConfirmedMemberContribution({ name, phone, cropName, quantityKg, askingPrice, offeredPrice }) {
      const email = `farmer_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.sasyavahini.in`;
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          role: 'FARMER',
          passwordHash: hash,
          status: 'ACTIVE',
          isPhoneVerified: true,
          isEmailVerified: true,
          farmerProfile: {
            create: {
              village: 'Manchar',
              district: 'Pune',
              state: 'Maharashtra',
              landSizeAcres: 5.0,
              produceTypes: [cropName],
              fpoId: fpoProfile.id
            }
          }
        },
        include: { farmerProfile: true }
      });
      createdUserIds.push(user.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'DemoPass1' });
      const token = loginRes.body.data.accessToken;

      // Create listing
      const listing = await prisma.produceListing.create({
        data: {
          farmerId: user.farmerProfile.id,
          cropName,
          category: 'Vegetables',
          qualityGrade: 'GRADE_A',
          totalQuantityKg: quantityKg,
          reservedQty: 0,
          soldQty: 0,
          askingPricePerKg: askingPrice,
          minPricePerKg: askingPrice - 2,
          harvestDate: new Date(),
          state: 'Maharashtra',
          district: 'Pune',
          village: 'Manchar',
          status: 'AVAILABLE'
        }
      });
      createdListingIds.push(listing.id);

      // FPO requests contribution
      const reqRes = await request(app)
        .post('/api/fpo/contributions/request')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          purpose: 'Phase 4 Consolidation',
          requests: [
            {
              listingId: listing.id,
              requestedQtyKg: quantityKg,
              offeredPricePerKg: offeredPrice
            }
          ]
        });
      expect([200, 201]).toContain(reqRes.status);
      const notifId = reqRes.body.data.requests[0].id || reqRes.body.data.requests[0].notificationId;
      createdNotificationIds.push(notifId);

      // Farmer accepts contribution
      const acceptRes = await request(app)
        .post(`/api/farmers/contributions/${notifId}/accept`)
        .set('Authorization', `Bearer ${token}`);
      expect(acceptRes.status).toBe(200);

      return { user, token, listing, notifId };
    }

    // 3. Create the 4 core scenario farmers:
    // Farmer A: 800 kg @ ₹24/kg
    const resA = await createConfirmedMemberContribution({
      name: 'Farmer A (Ramesh)',
      phone: '+919811' + Math.floor(100000 + Math.random() * 900000),
      cropName: 'Tomato',
      quantityKg: 800,
      askingPrice: 24.0,
      offeredPrice: 24.0
    });
    farmerA = resA.user; tokenA = resA.token; listingA = resA.listing; notifA = resA.notifId;

    // Farmer B: 1,200 kg @ ₹26/kg
    const resB = await createConfirmedMemberContribution({
      name: 'Farmer B (Suresh)',
      phone: '+919812' + Math.floor(100000 + Math.random() * 900000),
      cropName: 'Tomato',
      quantityKg: 1200,
      askingPrice: 26.0,
      offeredPrice: 26.0
    });
    farmerB = resB.user; tokenB = resB.token; listingB = resB.listing; notifB = resB.notifId;

    // Farmer C: 1,000 kg @ ₹25/kg
    const resC = await createConfirmedMemberContribution({
      name: 'Farmer C (Ganesh)',
      phone: '+919813' + Math.floor(100000 + Math.random() * 900000),
      cropName: 'Tomato',
      quantityKg: 1000,
      askingPrice: 25.0,
      offeredPrice: 25.0
    });
    farmerC = resC.user; tokenC = resC.token; listingC = resC.listing; notifC = resC.notifId;

    // Farmer D: 2,000 kg @ ₹25.50/kg
    const resD = await createConfirmedMemberContribution({
      name: 'Farmer D (Dinesh)',
      phone: '+919814' + Math.floor(100000 + Math.random() * 900000),
      cropName: 'Tomato',
      quantityKg: 2000,
      askingPrice: 25.5,
      offeredPrice: 25.5
    });
    farmerD = resD.user; tokenD = resD.token; listingD = resD.listing; notifD = resD.notifId;

    // Incompatible Crop: 500 kg Onion
    const resIncompat = await createConfirmedMemberContribution({
      name: 'Farmer Incompat (Onion)',
      phone: '+919815' + Math.floor(100000 + Math.random() * 900000),
      cropName: 'Onion',
      quantityKg: 500,
      askingPrice: 30.0,
      offeredPrice: 30.0
    });
    farmerIncompatible = resIncompat.user; tokenIncompatible = resIncompat.token;
    listingIncompatible = resIncompat.listing; notifIncompatible = resIncompat.notifId;

    // Farmer E: 1,500 kg Tomato for partial quantity tests
    const resE = await createConfirmedMemberContribution({
      name: 'Farmer E (Partial)',
      phone: '+919816' + Math.floor(100000 + Math.random() * 900000),
      cropName: 'Tomato',
      quantityKg: 1500,
      askingPrice: 25.0,
      offeredPrice: 25.0
    });
    farmerE = resE.user; tokenE = resE.token; listingE = resE.listing; notifE = resE.notifId;
  }, 180000);

  afterAll(async () => {
    // Clean up lots and contributions
    if (createdLotIds.length > 0) {
      await prisma.produceLotContribution.deleteMany({
        where: { lotId: { in: createdLotIds } }
      }).catch(() => {});
      await prisma.produceLot.deleteMany({
        where: { id: { in: createdLotIds } }
      }).catch(() => {});
    }

    // Clean up notifications
    if (createdNotificationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: createdNotificationIds } }
      }).catch(() => {});
    }

    // Clean up listings
    if (createdListingIds.length > 0) {
      await prisma.produceListing.deleteMany({
        where: { id: { in: createdListingIds } }
      }).catch(() => {});
    }

    // Clean up test users
    for (const uid of createdUserIds) {
      await prisma.auditLog.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.farmerProfile.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.fPOProfile.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: uid } }).catch(() => {});
    }
  }, 60000);

  // ── TEST 1: GET Confirmed Contributions ──────────────────────────────────
  test('1. GET /api/fpo/contributions/confirmed returns all confirmed contributions with available quantities', async () => {
    const res = await request(app)
      .get('/api/fpo/contributions/confirmed')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toHaveProperty('contributions');
    expect(data).toHaveProperty('summary');

    const contribA = data.contributions.find(c => c.id === notifA);
    expect(contribA).toBeDefined();
    expect(contribA.cropName).toBe('Tomato');
    expect(contribA.confirmedQtyKg).toBe(800);
    expect(contribA.availableForLotKg).toBe(800);
    expect(contribA.usedInLotQtyKg).toBe(0);

    const contribB = data.contributions.find(c => c.id === notifB);
    expect(contribB).toBeDefined();
    expect(contribB.confirmedQtyKg).toBe(1200);

    const contribC = data.contributions.find(c => c.id === notifC);
    expect(contribC).toBeDefined();
    expect(contribC.confirmedQtyKg).toBe(1000);

    const contribD = data.contributions.find(c => c.id === notifD);
    expect(contribD).toBeDefined();
    expect(contribD.confirmedQtyKg).toBe(2000);
  });

  // ── TEST 2: Incompatible Crop Rejection ───────────────────────────────────
  test('2. POST /api/fpo/lots rejects consolidating incompatible crops (Tomato + Onion) with 400', async () => {
    const res = await request(app)
      .post('/api/fpo/lots')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        cropName: 'Tomato',
        contributions: [
          { contributionId: notifA, quantityKg: 800 },
          { contributionId: notifIncompatible, quantityKg: 500 } // Onion! Incompatible!
        ]
      });

    expect([400, 422]).toContain(res.status);
    expect(res.body.error?.message || res.body.message || res.body.error).toContain('Incompatible crop');
  });

  // ── TEST 3: Over-allocation Rejection ─────────────────────────────────────
  test('3. POST /api/fpo/lots rejects allocating more than confirmed quantity with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/fpo/lots')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        cropName: 'Tomato',
        contributions: [
          { contributionId: notifA, quantityKg: 1500 } // Farmer A only confirmed 800 kg!
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.message || res.body.message || res.body.error).toContain('exceeds available confirmed quantity');
  });

  // ── TEST 4: Core Scenario — 5,000 kg Tomato Consolidated Lot ─────────────
  let createdCoreLot = null;

  test('4. POST /api/fpo/lots creates 5,000 kg consolidated lot from Farmer A (800kg), B (1200kg), C (1000kg), D (2000kg)', async () => {
    // Expected volume-weighted price:
    // (800 * 24 + 1200 * 26 + 1000 * 25 + 2000 * 25.50) / 5000
    // = (19,200 + 31,200 + 25,000 + 51,000) / 5000 = 126,400 / 5000 = 25.28
    const expectedWeightedRate = 25.28;

    const res = await request(app)
      .post('/api/fpo/lots')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        cropName: 'Tomato',
        variety: 'Vaishali',
        qualityGrade: 'GRADE_A',
        storageLocation: 'Central Warehouse Depot A, Pune',
        notes: 'Institutional Wholesale Consignment',
        contributions: [
          { contributionId: notifA, quantityKg: 800 },
          { contributionId: notifB, quantityKg: 1200 },
          { contributionId: notifC, quantityKg: 1000 },
          { contributionId: notifD, quantityKg: 2000 }
        ]
      });

    expect(res.status).toBe(200);
    const lot = res.body.data.lot;
    expect(lot).toBeDefined();
    expect(lot.id).toBeDefined();
    expect(lot.lotNumber).toMatch(/^LOT-TOM-\d{6}-\d{4}$/);
    expect(lot.cropName).toBe('Tomato');
    expect(lot.totalQuantityKg).toBe(5000);
    expect(lot.availableQuantityKg).toBe(5000);
    expect(lot.allocatedQuantityKg).toBe(0);
    expect(lot.weightedAvgPricePerKg).toBe(expectedWeightedRate);
    expect(lot.status).toBe('AGGREGATED');
    expect(lot.contributions.length).toBe(4);

    createdCoreLot = lot;
    createdLotIds.push(lot.id);

    // Verify database record
    const dbLot = await prisma.produceLot.findUnique({
      where: { id: lot.id },
      include: { contributions: true }
    });
    expect(dbLot).toBeDefined();
    expect(dbLot.totalQuantityKg).toBe(5000);
    expect(dbLot.contributions.length).toBe(4);

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'ProduceLot',
        entityId: lot.id,
        action: 'LOT_CREATED'
      }
    });
    expect(audit).toBeDefined();
  });

  // ── TEST 5: Anti-Double-Counting / Contribution Reuse Prevention ───────────
  test('5. POST /api/fpo/lots prevents reusing already committed contributions beyond confirmed balance', async () => {
    // Farmers A, B, C, D have 0 kg remaining available
    const res = await request(app)
      .post('/api/fpo/lots')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        cropName: 'Tomato',
        contributions: [
          { contributionId: notifA, quantityKg: 100 } // 0 kg available!
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.message || res.body.message || res.body.error).toContain('exceeds available confirmed quantity');
  });

  // ── TEST 6: Partial Quantity Consolidation ────────────────────────────────
  let partialLot = null;

  test('6. POST /api/fpo/lots allows committing partial quantity from confirmed contribution', async () => {
    // Farmer E confirmed 1,500 kg. We allocate only 900 kg into a new lot.
    const res = await request(app)
      .post('/api/fpo/lots')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        cropName: 'Tomato',
        variety: 'Vaishali',
        contributions: [
          { contributionId: notifE, quantityKg: 900 }
        ]
      });

    expect(res.status).toBe(200);
    partialLot = res.body.data.lot;
    expect(partialLot.totalQuantityKg).toBe(900);
    createdLotIds.push(partialLot.id);

    // Remaining available from Farmer E must now be exactly 600 kg (1500 - 900)
    const checkRes = await request(app)
      .get('/api/fpo/contributions/confirmed')
      .set('Authorization', `Bearer ${fpoToken}`);

    const contribE = checkRes.body.data.contributions.find(c => c.id === notifE);
    expect(contribE).toBeDefined();
    expect(contribE.confirmedQtyKg).toBe(1500);
    expect(contribE.usedInLotQtyKg).toBe(900);
    expect(contribE.availableForLotKg).toBe(600);
  });

  // ── TEST 7: Query Lots and Lot Details with Traceability ───────────────────
  test('7. GET /api/fpo/lots and GET /api/fpo/lots/:id returns full itemized traceability breakdown', async () => {
    // List query
    const listRes = await request(app)
      .get('/api/fpo/lots?crop=Tomato')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.lots.length).toBeGreaterThanOrEqual(2);
    expect(listRes.body.data.summary.totalAggregatedKg).toBeGreaterThanOrEqual(5900);

    // Details query
    const detailRes = await request(app)
      .get(`/api/fpo/lots/${createdCoreLot.id}`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(detailRes.status).toBe(200);
    const lot = detailRes.body.data.lot;
    expect(lot.id).toBe(createdCoreLot.id);
    expect(lot.contributions.length).toBe(4);

    // Verify itemized share percentages sum to 100%
    const totalSharePct = lot.contributions.reduce((s, c) => s + c.sharePercentage, 0);
    expect(Math.round(totalSharePct)).toBe(100);

    // Farmer A: 800 / 5000 = 16%
    const farmerAShare = lot.contributions.find(c => c.allocatedQtyKg === 800);
    expect(farmerAShare.sharePercentage).toBe(16);
    expect(farmerAShare.payoutAmount).toBe(800 * 24);

    // Farmer D: 2000 / 5000 = 40%
    const farmerDShare = lot.contributions.find(c => c.allocatedQtyKg === 2000);
    expect(farmerDShare.sharePercentage).toBe(40);
  });

  // ── TEST 8: State Machine Transitions ─────────────────────────────────────
  test('8. PATCH /api/fpo/lots/:id/status validates state transitions and rejects illegal moves', async () => {
    // Valid: AGGREGATED -> TESTED
    const step1 = await request(app)
      .patch(`/api/fpo/lots/${createdCoreLot.id}/status`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ status: 'TESTED', notes: 'Agmark Lab Passed' });
    expect(step1.status).toBe(200);
    expect(step1.body.data.lot.status).toBe('TESTED');

    // Valid: TESTED -> READY_FOR_SALE
    const step2 = await request(app)
      .patch(`/api/fpo/lots/${createdCoreLot.id}/status`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ status: 'READY_FOR_SALE' });
    expect(step2.status).toBe(200);
    expect(step2.body.data.lot.status).toBe('READY_FOR_SALE');

    // Illegal: READY_FOR_SALE -> AGGREGATED (backwards not permitted directly)
    const illegal = await request(app)
      .patch(`/api/fpo/lots/${createdCoreLot.id}/status`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ status: 'AGGREGATED' });
    expect([400, 422]).toContain(illegal.status);
    expect(illegal.body.error?.message || illegal.body.message || illegal.body.error).toContain('Invalid status transition');
  });

  // ── TEST 9: Partial Allocation to Contract ─────────────────────────────────
  test('9. POST /api/fpo/lots/:id/allocate allocates partial quantity towards buyer contract', async () => {
    // Allocate 2,000 kg out of 5,000 kg
    const res = await request(app)
      .post(`/api/fpo/lots/${createdCoreLot.id}/allocate`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        allocatedQtyKg: 2000,
        buyerName: 'BigBasket Wholesale Hub',
        notes: 'Institutional Order #BB-PUN-099'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.allocatedQuantityKg).toBe(2000);
    expect(res.body.data.remainingAvailableQuantityKg).toBe(3000);

    // Verify DB
    const dbLot = await prisma.produceLot.findUnique({
      where: { id: createdCoreLot.id }
    });
    expect(dbLot.availableQuantityKg).toBe(3000);
    expect(dbLot.allocatedQuantityKg).toBe(2000);
    expect(dbLot.status).toBe('READY_FOR_SALE'); // Partial allocation retains active status
  });

  // ── TEST 10: Lot Cancellation & Stock Reconciliation ──────────────────────
  test('10. POST /api/fpo/lots/:id/cancel cancels lot and safely restores confirmed quantities', async () => {
    // Cancel partialLot (900 kg from Farmer E)
    const cancelRes = await request(app)
      .post(`/api/fpo/lots/${partialLot.id}/cancel`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.lot.status).toBe('CANCELLED');

    // Verify contributions are marked RELEASED
    const contribs = await prisma.produceLotContribution.findMany({
      where: { lotId: partialLot.id }
    });
    expect(contribs.every(c => c.status === 'RELEASED')).toBe(true);

    // Verify Farmer E's available quantity for new lots is fully restored to 1,500 kg!
    const checkRes = await request(app)
      .get('/api/fpo/contributions/confirmed')
      .set('Authorization', `Bearer ${fpoToken}`);

    const contribE = checkRes.body.data.contributions.find(c => c.id === notifE);
    expect(contribE).toBeDefined();
    expect(contribE.availableForLotKg).toBe(1500);
    expect(contribE.usedInLotQtyKg).toBe(0);
  });

  // ── TEST 11: Tenant Isolation & RBAC ───────────────────────────────────────
  test('11. FPO 2 cannot view, mutate, or cancel FPO 1 produce lots', async () => {
    // FPO 2 attempts to view FPO 1's lot
    const viewRes = await request(app)
      .get(`/api/fpo/lots/${createdCoreLot.id}`)
      .set('Authorization', `Bearer ${fpo2Token}`);
    expect([403, 404]).toContain(viewRes.status);

    // FPO 2 attempts to change status of FPO 1's lot
    const statusRes = await request(app)
      .patch(`/api/fpo/lots/${createdCoreLot.id}/status`)
      .set('Authorization', `Bearer ${fpo2Token}`)
      .send({ status: 'READY_FOR_SALE' });
    expect([403, 404]).toContain(statusRes.status);

    // FPO 2 attempts to cancel FPO 1's lot
    const cancelRes = await request(app)
      .post(`/api/fpo/lots/${createdCoreLot.id}/cancel`)
      .set('Authorization', `Bearer ${fpo2Token}`);
    expect([403, 404]).toContain(cancelRes.status);

    // FPO 2 attempts to build a lot using FPO 1's farmer contribution
    const crossLotRes = await request(app)
      .post('/api/fpo/lots')
      .set('Authorization', `Bearer ${fpo2Token}`)
      .send({
        cropName: 'Tomato',
        contributions: [
          { contributionId: notifA, quantityKg: 500 }
        ]
      });
    expect([403, 404]).toContain(crossLotRes.status);
  });

  // ── TEST 12: Stock Reconciliation Invariant ────────────────────────────────
  test('12. Invariant holds for all active lots: totalQuantityKg === available + allocated', async () => {
    const res = await request(app)
      .get('/api/fpo/lots')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    const activeLots = res.body.data.lots.filter(l => l.status !== 'CANCELLED');

    for (const lot of activeLots) {
      expect(lot.totalQuantityKg).toBe(lot.availableQuantityKg + lot.allocatedQuantityKg);
      expect(lot.availableQuantityKg).toBeGreaterThanOrEqual(0);
      expect(lot.allocatedQuantityKg).toBeGreaterThanOrEqual(0);
    }
  });
});
