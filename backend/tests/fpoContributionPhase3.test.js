/**
 * SasyaVahini — Phase 3: FPO Member Produce Management and Contribution Requests Test Suite
 *
 * Verifies:
 * 1. Member produce query: Active member listings only, calculates available, reserved, and committed quantities.
 * 2. Excludes independent and non-member farmer produce from FPO view.
 * 3. Consent-gated reservation: Sending contribution request does NOT prematurely reserve farmer stock.
 * 4. Insufficient quantity rejection: Requesting more than available stock returns 409 Conflict.
 * 5. Farmer incoming contributions query: Displays request details, FPO info, and remaining listing stock.
 * 6. Farmer full acceptance: Atomically reserves stock via Prisma transaction, updates listing status, notifies FPO.
 * 7. Farmer partial acceptance: Atomically reserves smaller confirmed quantity, leaves remainder available.
 * 8. Farmer decline: Marks proposal rejected, leaves stock completely untouched.
 * 9. FPO cancellation / reservation release: Restores reserved quantity back to available stock safely.
 * 10. Tenant isolation & RBAC: Unaffiliated FPO cannot request member produce of another FPO or cancel requests.
 * 11. Stock reconciliation invariant: totalQuantityKg === availableQuantityKg + reservedQuantityKg + committedQuantityKg.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
jest.setTimeout(40000);

describe('Phase 3: FPO Member Produce Management & Contribution Requests', () => {
  let fpoToken = null;
  let fpoUser = null;
  let fpoProfile = null;

  let fpo2Token = null;
  let fpo2User = null;
  let fpo2Profile = null;

  let memberFarmerToken = null;
  let memberFarmerUser = null;
  let memberFarmerProfile = null;

  let independentFarmerToken = null;
  let independentFarmerUser = null;

  let testListing1 = null;
  let testListing2 = null;
  let independentListing = null;

  let createdUserIds = [];
  let createdListingIds = [];
  let createdNotificationIds = [];

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
      where: { email: 'fpo2_phase3@test.sasyavahini.in' }
    });
    if (!existingFpo2) {
      fpo2User = await prisma.user.create({
        data: {
          name: 'Konkan Sahakari FPO',
          email: 'fpo2_phase3@test.sasyavahini.in',
          phone: '+919876543188',
          role: 'FPO',
          passwordHash: hash,
          status: 'ACTIVE',
          isPhoneVerified: true,
          isEmailVerified: true,
          fpoProfile: {
            create: {
              fpoName: 'Konkan Sahakari Producer Co',
              registrationNo: 'CIN-FPO-P3-1122',
              district: 'Ratnagiri',
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
      .send({ email: 'fpo2_phase3@test.sasyavahini.in', password: 'DemoPass1' });
    expect(fpo2Login.status).toBe(200);
    fpo2Token = fpo2Login.body.data.accessToken;

    // 3. Create Member Farmer affiliated with Primary FPO
    const memberPhone = '+9197' + Math.floor(10000000 + Math.random() * 90000000);
    memberFarmerUser = await prisma.user.create({
      data: {
        name: 'Kisan Member Phase3',
        email: `member_phase3_${Date.now()}@test.sasyavahini.in`,
        phone: memberPhone,
        role: 'FARMER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        farmerProfile: {
          create: {
            village: 'Manchar Village',
            district: 'Pune',
            state: 'Maharashtra',
            landSizeAcres: 4.5,
            produceTypes: ['Tomato', 'Soybean'],
            fpoId: fpoProfile.id // affiliated with Primary FPO
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(memberFarmerUser.id);
    memberFarmerProfile = memberFarmerUser.farmerProfile;

    const memberLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: memberFarmerUser.email, password: 'DemoPass1' });
    expect(memberLogin.status).toBe(200);
    memberFarmerToken = memberLogin.body.data.accessToken;

    // 4. Create Independent Farmer (fpoId: null)
    const indPhone = '+9196' + Math.floor(10000000 + Math.random() * 90000000);
    independentFarmerUser = await prisma.user.create({
      data: {
        name: 'Independent Kisan Phase3',
        email: `ind_phase3_${Date.now()}@test.sasyavahini.in`,
        phone: indPhone,
        role: 'FARMER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        farmerProfile: {
          create: {
            village: 'Junnar',
            district: 'Pune',
            state: 'Maharashtra',
            landSizeAcres: 5.0,
            produceTypes: ['Wheat'],
            fpoId: null // Independent!
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(independentFarmerUser.id);

    const indLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: independentFarmerUser.email, password: 'DemoPass1' });
    expect(indLogin.status).toBe(200);
    independentFarmerToken = indLogin.body.data.accessToken;

    // 5. Create Listings for Member Farmer
    testListing1 = await prisma.produceListing.create({
      data: {
        farmerId: memberFarmerProfile.id,
        cropName: 'Tomato Phase3',
        category: 'Vegetables',
        totalQuantityKg: 1000,
        reservedQty: 0,
        soldQty: 0,
        askingPricePerKg: 25.0,
        minPricePerKg: 22.0,
        qualityGrade: 'GRADE_A',
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Manchar',
        status: 'AVAILABLE'
      }
    });
    createdListingIds.push(testListing1.id);

    testListing2 = await prisma.produceListing.create({
      data: {
        farmerId: memberFarmerProfile.id,
        cropName: 'Soybean Phase3',
        category: 'Grains',
        totalQuantityKg: 2500,
        reservedQty: 0,
        soldQty: 0,
        askingPricePerKg: 48.0,
        minPricePerKg: 45.0,
        qualityGrade: 'GRADE_A',
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Manchar',
        status: 'AVAILABLE'
      }
    });
    createdListingIds.push(testListing2.id);

    // 6. Create Listing for Independent Farmer
    independentListing = await prisma.produceListing.create({
      data: {
        farmerId: independentFarmerUser.farmerProfile.id,
        cropName: 'Wheat Independent P3',
        category: 'Grains',
        totalQuantityKg: 3000,
        reservedQty: 0,
        soldQty: 0,
        askingPricePerKg: 32.0,
        minPricePerKg: 30.0,
        qualityGrade: 'GRADE_A',
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Junnar',
        status: 'AVAILABLE'
      }
    });
    createdListingIds.push(independentListing.id);
  });

  afterAll(async () => {
    // Clean up notifications created during test
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

    // Clean up test users and profiles
    for (const uid of createdUserIds) {
      await prisma.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.farmerProfile.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.fPOProfile.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: uid } }).catch(() => {});
    }
  });

  // ── TEST 1: Member Produce Query ───────────────────────────────────────────
  test('1. GET /api/fpo/member-produce returns only affiliated member listings with separate quantity fields', async () => {
    const res = await request(app)
      .get('/api/fpo/member-produce')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toHaveProperty('listings');
    expect(data).toHaveProperty('metrics');
    expect(Array.isArray(data.listings)).toBe(true);

    // Check that testListing1 is present
    const found1 = data.listings.find(l => l.id === testListing1.id);
    expect(found1).toBeDefined();
    expect(found1.cropName).toBe('Tomato Phase3');
    expect(found1.totalQuantityKg).toBe(1000);
    expect(found1.availableQuantityKg).toBe(1000);
    expect(found1.reservedQuantityKg).toBe(0);
    expect(found1.committedQuantityKg).toBe(0);
    expect(found1.farmer.name).toBe(memberFarmerUser.name);

    // Check that independent farmer's listing is STRICTLY EXCLUDED
    const foundInd = data.listings.find(l => l.id === independentListing.id);
    expect(foundInd).toBeUndefined();
  });

  // ── TEST 2: Filter and Search in Member Produce ─────────────────────────────
  test('2. GET /api/fpo/member-produce filters by crop and farmer search term', async () => {
    const res = await request(app)
      .get(`/api/fpo/member-produce?crop=Tomato Phase3&search=Kisan Member`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    const listings = res.body.data.listings;
    expect(listings.length).toBeGreaterThanOrEqual(1);
    expect(listings.every(l => l.cropName.includes('Tomato Phase3'))).toBe(true);
  });

  // ── TEST 3: Consent-Gated Contribution Request ─────────────────────────────
  let contributionId1 = null;

  test('3. POST /api/fpo/contributions/request creates request WITHOUT prematurely reserving stock', async () => {
    const res = await request(app)
      .post('/api/fpo/contributions/request')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        purpose: 'Institutional Wholesale Contract — Reliance Fresh',
        expiryHours: 48,
        requests: [
          {
            listingId: testListing1.id,
            requestedQtyKg: 400,
            offeredPricePerKg: 26.0,
            notes: 'Requires Grade A sorting'
          }
        ]
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.data.dispatchedCount).toBe(1);
    const createdReq = res.body.data.requests[0];
    expect(createdReq).toBeDefined();
    expect(createdReq.status).toBe('PENDING');
    expect(createdReq.requestedQtyKg).toBe(400);
    expect(createdReq.offeredPricePerKg).toBe(26.0);
    contributionId1 = createdReq.id;
    createdNotificationIds.push(contributionId1);

    // CRITICAL INVARIANT: The farmer's listing stock must NOT be reserved yet!
    const listingCheck = await prisma.produceListing.findUnique({
      where: { id: testListing1.id }
    });
    expect(listingCheck.reservedQty).toBe(0);
    expect(listingCheck.status).toBe('AVAILABLE');
  });

  // ── TEST 4: Insufficient Quantity Rejection ────────────────────────────────
  test('4. POST /api/fpo/contributions/request rejects request exceeding available stock with 409', async () => {
    const res = await request(app)
      .post('/api/fpo/contributions/request')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        purpose: 'Bulk request',
        requests: [
          {
            listingId: testListing1.id,
            requestedQtyKg: 5000, // exceeds 1000 kg available!
            offeredPricePerKg: 25.0
          }
        ]
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.message || res.body.message || res.body.error).toContain('exceeds available stock');
  });

  // ── TEST 5: Farmer Views Incoming Proposals ─────────────────────────────────
  test('5. GET /api/farmers/contributions returns incoming requests to the member farmer', async () => {
    const res = await request(app)
      .get('/api/farmers/contributions')
      .set('Authorization', `Bearer ${memberFarmerToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toHaveProperty('incomingRequests');
    expect(Array.isArray(data.incomingRequests)).toBe(true);

    const foundReq = data.incomingRequests.find(r => r.id === contributionId1);
    expect(foundReq).toBeDefined();
    expect(foundReq.cropName).toBe('Tomato Phase3');
    expect(foundReq.requestedQtyKg).toBe(400);
    expect(foundReq.offeredPricePerKg).toBe(26.0);
    expect(foundReq.listingAvailableQtyKg).toBe(1000);
  });

  // ── TEST 6: Farmer Accepts Full Quantity (Atomic Reservation) ──────────────
  test('6. POST /api/farmers/contributions/:id/accept reserves full quantity atomically in transaction', async () => {
    const res = await request(app)
      .post(`/api/farmers/contributions/${contributionId1}/accept`)
      .set('Authorization', `Bearer ${memberFarmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.contribution.status).toBe('ACCEPTED');
    expect(res.body.data.contribution.confirmedQtyKg).toBe(400);

    // Verify stock is atomically reserved on the database record
    const updatedListing = await prisma.produceListing.findUnique({
      where: { id: testListing1.id }
    });
    expect(updatedListing.reservedQty).toBe(400);
    // Since 400 < 1000, status should be PARTIALLY_RESERVED or RESERVED
    expect(['PARTIALLY_RESERVED', 'RESERVED']).toContain(updatedListing.status);

    // Notification dispatched to FPO
    const fpoNotif = await prisma.notification.findFirst({
      where: {
        userId: fpoUser.id,
        type: 'INFO',
        metadata: {
          path: ['eventType'],
          equals: 'FPO_CONTRIBUTION_ACCEPTED'
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(fpoNotif).toBeDefined();
    if (fpoNotif) createdNotificationIds.push(fpoNotif.id);
  });

  // ── TEST 7: Farmer Accepts Partial Quantity ────────────────────────────────
  let contributionId2 = null;

  test('7. POST /api/farmers/contributions/:id/accept-partial reserves smaller quantity accurately', async () => {
    // FPO requests 1000 kg of Soybean from testListing2 (2500 kg total)
    const reqRes = await request(app)
      .post('/api/fpo/contributions/request')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        purpose: 'Oil Extraction Processing Contract',
        requests: [
          {
            listingId: testListing2.id,
            requestedQtyKg: 1000,
            offeredPricePerKg: 49.0
          }
        ]
      });

    expect([200, 201]).toContain(reqRes.status);
    contributionId2 = reqRes.body.data.requests[0].id;
    createdNotificationIds.push(contributionId2);

    // Farmer partially accepts 600 kg instead of 1000 kg
    const partialRes = await request(app)
      .post(`/api/farmers/contributions/${contributionId2}/accept-partial`)
      .set('Authorization', `Bearer ${memberFarmerToken}`)
      .send({ acceptedQtyKg: 600 });

    expect(partialRes.status).toBe(200);
    expect(partialRes.body.data.contribution.status).toBe('PARTIALLY_ACCEPTED');
    expect(partialRes.body.data.contribution.confirmedQtyKg).toBe(600);

    // Verify exact reservation in database
    const updatedListing2 = await prisma.produceListing.findUnique({
      where: { id: testListing2.id }
    });
    expect(updatedListing2.reservedQty).toBe(600);
    expect(updatedListing2.status).toBe('PARTIALLY_RESERVED');
  });

  // ── TEST 8: Farmer Declines Request (Stock Untouched) ──────────────────────
  let contributionId3 = null;

  test('8. POST /api/farmers/contributions/:id/reject declines request without reserving any stock', async () => {
    // FPO requests remaining soybean
    const reqRes = await request(app)
      .post('/api/fpo/contributions/request')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        purpose: 'Second Batch',
        requests: [
          {
            listingId: testListing2.id,
            requestedQtyKg: 500,
            offeredPricePerKg: 47.0
          }
        ]
      });

    expect([200, 201]).toContain(reqRes.status);
    contributionId3 = reqRes.body.data.requests[0].id;
    createdNotificationIds.push(contributionId3);

    // Farmer declines request with reason
    const declineRes = await request(app)
      .post(`/api/farmers/contributions/${contributionId3}/reject`)
      .set('Authorization', `Bearer ${memberFarmerToken}`)
      .send({ reason: 'Committed to local mandi at higher spot rate' });

    expect(declineRes.status).toBe(200);
    expect(declineRes.body.data.status).toBe('REJECTED');

    // Reserved quantity on testListing2 should remain unchanged at 600 kg
    const listingCheck = await prisma.produceListing.findUnique({
      where: { id: testListing2.id }
    });
    expect(listingCheck.reservedQty).toBe(600);
  });

  // ── TEST 9: Reservation Release on Cancellation ────────────────────────────
  test('9. DELETE /api/fpo/contributions/:id cancels request and safely releases reserved stock back to available', async () => {
    // Before cancellation, testListing1 had 400 kg reserved
    const listingBefore = await prisma.produceListing.findUnique({
      where: { id: testListing1.id }
    });
    expect(listingBefore.reservedQty).toBe(400);

    // FPO cancels the accepted contribution
    const cancelRes = await request(app)
      .delete(`/api/fpo/contributions/${contributionId1}`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // Reserved quantity on testListing1 must be safely decremented back to 0
    const listingAfter = await prisma.produceListing.findUnique({
      where: { id: testListing1.id }
    });
    expect(listingAfter.reservedQty).toBe(0);
    expect(listingAfter.status).toBe('AVAILABLE');
  });

  // ── TEST 10: Tenant Isolation & RBAC ───────────────────────────────────────
  test('10. FPO 2 cannot request produce or cancel contributions belonging to FPO 1', async () => {
    // FPO 2 tries to request testListing1 (belongs to FPO 1 member)
    const crossReq = await request(app)
      .post('/api/fpo/contributions/request')
      .set('Authorization', `Bearer ${fpo2Token}`)
      .send({
        purpose: 'Illegal cross-tenant request',
        requests: [
          {
            listingId: testListing1.id,
            requestedQtyKg: 100,
            offeredPricePerKg: 30.0
          }
        ]
      });

    // Should be rejected with 403 or 404 (listing not belonging to FPO 2 active members)
    expect([403, 404]).toContain(crossReq.status);

    // FPO 2 tries to cancel contributionId2 belonging to FPO 1
    const crossCancel = await request(app)
      .delete(`/api/fpo/contributions/${contributionId2}`)
      .set('Authorization', `Bearer ${fpo2Token}`);

    expect([403, 404]).toContain(crossCancel.status);
  });

  // ── TEST 11: Stock Invariant Reconciliation ────────────────────────────────
  test('11. Stock invariant holds: totalQuantityKg === available + reserved + committed', async () => {
    const res = await request(app)
      .get('/api/fpo/member-produce')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    const listings = res.body.data.listings;

    for (const listing of listings) {
      const sum = listing.availableQuantityKg + listing.reservedQuantityKg + listing.committedQuantityKg;
      expect(sum).toBe(listing.totalQuantityKg);
      expect(listing.availableQuantityKg).toBeGreaterThanOrEqual(0);
      expect(listing.reservedQuantityKg).toBeGreaterThanOrEqual(0);
      expect(listing.committedQuantityKg).toBeGreaterThanOrEqual(0);
    }
  });
});
