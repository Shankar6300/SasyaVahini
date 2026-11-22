/**
 * SasyaVahini — Phase 5: FPO Bulk Procurement Requests, Matching and Quotations Test Suite
 *
 * Verifies:
 * 1. Manual FPO Directory Search (GET /api/fpo/directory) with zero PII leakage.
 * 2. Bulk Requirements Inbox (GET /api/fpo/requirements) with automated match scoring.
 * 3. Strict separation of Indicative Member Supply from Confirmed FPO Stock.
 * 4. Deep Requirement Details (GET /api/fpo/requirements/:id) with feasibility breakdown.
 * 5. FPO Quotation Submission (POST /api/fpo/quotations) with lot linking and pricing.
 * 6. Anti-Over-Allocation: Rejects quoting quantity exceeding produce lot available stock.
 * 7. Crop Incompatibility: Rejects quoting a produce lot with a mismatching crop.
 * 8. Duplicate Quotation Prevention: Rejects second active quotation for same requirement.
 * 9. Quotation Withdrawal (POST /api/fpo/quotations/:id/withdraw) with audit trail.
 * 10. Server-Side Expiry Sweeper: Automatically marks past-deadline quotations as EXPIRED.
 * 11. Quotation Acceptance (POST /api/fpo/quotations/:id/accept): Atomic stock deduction, order generation, and dual notifications.
 * 12. Quotation Rejection (POST /api/fpo/quotations/:id/reject): Rejection with reason and audit log.
 * 13. Multi-Tenant Isolation: FPO 2 cannot access, mutate, or quote against FPO 1's lots or quotations.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
jest.setTimeout(120000);

describe('Phase 5: FPO Bulk Procurement, Matching & Quotations', () => {
  let fpoToken = null;
  let fpoUser = null;
  let fpoProfile = null;

  let fpo2Token = null;
  let fpo2User = null;
  let fpo2Profile = null;

  let buyerToken = null;
  let buyerUser = null;
  let buyerProfile = null;

  let buyer2Token = null;
  let buyer2User = null;
  let buyer2Profile = null;

  // Inventory records
  let confirmedTomatoLot = null;
  let confirmedPotatoLot = null;
  let memberFarmerUser = null;
  let memberFarmerListing = null;

  // Buyer requirements
  let reqTomatoBulk = null;
  let reqChilliIndicativeOnly = null;
  let reqPotatoPartial = null;

  let createdUserIds = [];
  let createdRequirementIds = [];
  let createdLotIds = [];
  let createdListingIds = [];
  let createdQuotationIds = [];
  let createdOrderIds = [];

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
    const fpo2Email = `fpo2_p5_${Date.now()}@test.sasyavahini.in`;
    fpo2User = await prisma.user.create({
      data: {
        name: 'Godavari Agri Producers Co',
        email: fpo2Email,
        phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'FPO',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        fpoProfile: {
          create: {
            fpoName: 'Godavari Agri Producers Co',
            registrationNo: `FPO-GODAVARI-${Date.now().toString().slice(-4)}`,
            district: 'Nashik',
            state: 'Maharashtra',
            registrationCertVerified: true,
            memberCount: 2
          }
        }
      },
      include: { fpoProfile: true }
    });
    createdUserIds.push(fpo2User.id);
    fpo2Profile = fpo2User.fpoProfile;

    const fpo2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: fpo2Email, password: 'DemoPass1' });
    fpo2Token = fpo2Login.body.data.accessToken;

    // 3. Primary Institutional Buyer
    const buyerEmail = `buyer_p5_${Date.now()}@test.sasyavahini.in`;
    buyerUser = await prisma.user.create({
      data: {
        name: 'Reliance Fresh Procurement Hub',
        email: buyerEmail,
        phone: `+91986${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'BUYER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        buyerProfile: {
          create: {
            organizationName: 'Reliance Fresh Ltd',
            buyerType: 'Supermarket',
            deliveryState: 'Maharashtra',
            deliveryDistrict: 'Pune',
            verificationStatus: 'VERIFIED'
          }
        }
      },
      include: { buyerProfile: true }
    });
    createdUserIds.push(buyerUser.id);
    buyerProfile = buyerUser.buyerProfile;

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: 'DemoPass1' });
    buyerToken = buyerLogin.body.data.accessToken;

    // 4. Secondary Buyer for Cross-Buyer Acceptance Prevention
    const buyer2Email = `buyer2_p5_${Date.now()}@test.sasyavahini.in`;
    buyer2User = await prisma.user.create({
      data: {
        name: 'BigBasket Wholesale Hub',
        email: buyer2Email,
        phone: `+91985${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'BUYER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        buyerProfile: {
          create: {
            organizationName: 'BigBasket Wholesale',
            buyerType: 'Wholesaler',
            deliveryState: 'Maharashtra',
            deliveryDistrict: 'Pune',
            verificationStatus: 'VERIFIED'
          }
        }
      },
      include: { buyerProfile: true }
    });
    createdUserIds.push(buyer2User.id);
    buyer2Profile = buyer2User.buyerProfile;

    const buyer2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: buyer2Email, password: 'DemoPass1' });
    buyer2Token = buyer2Login.body.data.accessToken;

    // 5. Seed Confirmed Produce Lots for Primary FPO
    confirmedTomatoLot = await prisma.produceLot.create({
      data: {
        lotNumber: `LOT-TOM-${Date.now().toString().slice(-6)}`,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        variety: 'Vaishnavi Hybrid',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 5000,
        availableQuantityKg: 5000,
        weightedAvgPricePerKg: 28.5,
        status: 'READY_FOR_SALE',
        storageLocation: 'FPO Hadapsar Cold Storage'
      }
    });
    createdLotIds.push(confirmedTomatoLot.id);

    confirmedPotatoLot = await prisma.produceLot.create({
      data: {
        lotNumber: `LOT-POT-${Date.now().toString().slice(-6)}`,
        fpoId: fpoProfile.id,
        cropName: 'Potato',
        variety: 'Kufri Jyoti',
        qualityGrade: 'GRADE_B',
        totalQuantityKg: 1500,
        availableQuantityKg: 1500,
        weightedAvgPricePerKg: 18.0,
        status: 'AGGREGATED',
        storageLocation: 'FPO Junnar Depot'
      }
    });
    createdLotIds.push(confirmedPotatoLot.id);

    // 6. Seed Member Farmer with direct Produce Listing (Indicative Supply)
    const memberEmail = `member_p5_${Date.now()}@test.sasyavahini.in`;
    memberFarmerUser = await prisma.user.create({
      data: {
        name: 'Ramesh Balasaheb Patil',
        email: memberEmail,
        phone: `+91984${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'FARMER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            village: 'Manchar',
            district: 'Pune',
            state: 'Maharashtra',
            landSizeAcres: 4.5,
            produceTypes: ['Green Chilli', 'Capsicum']
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(memberFarmerUser.id);

    // Indicative listing for Green Chilli (no consolidated lot created yet)
    memberFarmerListing = await prisma.produceListing.create({
      data: {
        farmerId: memberFarmerUser.farmerProfile.id,
        fpoId: fpoProfile.id,
        cropName: 'Green Chilli',
        category: 'Vegetables',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 800,
        reservedQty: 0,
        soldQty: 0,
        askingPricePerKg: 42.0,
        minPricePerKg: 38.0,
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Manchar'
      }
    });
    createdListingIds.push(memberFarmerListing.id);

    // 7. Seed Buyer Requirements
    // Requirement 1: Full match against Tomato Lot (needs 3000 kg, lot has 5000 kg)
    reqTomatoBulk = await prisma.buyerRequirement.create({
      data: {
        buyerId: buyerProfile.id,
        cropName: 'Tomato',
        quantityKg: 3000,
        maxPricePerKg: 32.0,
        requiredByDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days out
        qualityGrade: 'GRADE_A',
        deliveryState: 'Maharashtra',
        deliveryDistrict: 'Pune',
        deliveryAddress: 'Reliance Distribution Centre, Chakan MIDC, Pune',
        notes: 'Strict Grade A red ripe tomatoes required for retail packaging.',
        status: 'OPEN'
      }
    });
    createdRequirementIds.push(reqTomatoBulk.id);

    // Requirement 2: Indicative only match against Green Chilli (FPO has 800 kg member listing, 0 lots)
    reqChilliIndicativeOnly = await prisma.buyerRequirement.create({
      data: {
        buyerId: buyerProfile.id,
        cropName: 'Green Chilli',
        quantityKg: 600,
        maxPricePerKg: 45.0,
        requiredByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        qualityGrade: 'GRADE_A',
        deliveryState: 'Maharashtra',
        deliveryDistrict: 'Pune',
        deliveryAddress: 'Reliance Distribution Centre, Chakan, Pune',
        notes: 'Pungent export grade G4 green chillies.',
        status: 'OPEN'
      }
    });
    createdRequirementIds.push(reqChilliIndicativeOnly.id);

    // Requirement 3: Partial match for Potato (needs 4000 kg, lot only has 1500 kg)
    reqPotatoPartial = await prisma.buyerRequirement.create({
      data: {
        buyerId: buyerProfile.id,
        cropName: 'Potato',
        quantityKg: 4000,
        maxPricePerKg: 20.0,
        requiredByDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        qualityGrade: 'GRADE_B',
        deliveryState: 'Maharashtra',
        deliveryDistrict: 'Pune',
        deliveryAddress: 'Reliance Food Park, Hadapsar, Pune',
        status: 'OPEN'
      }
    });
    createdRequirementIds.push(reqPotatoPartial.id);
  });

  afterAll(async () => {
    try {
      // Clean up in reverse dependency order
      if (createdOrderIds.length > 0) {
        await prisma.orderStatusEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdQuotationIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { entityType: 'FpoQuotation', entityId: { in: createdQuotationIds } } });
        await prisma.fpoQuotation.deleteMany({ where: { id: { in: createdQuotationIds } } });
      }
      if (createdRequirementIds.length > 0) {
        await prisma.buyerRequirement.deleteMany({ where: { id: { in: createdRequirementIds } } });
      }
      if (createdLotIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { entityType: 'ProduceLot', entityId: { in: createdLotIds } } });
        await prisma.produceLot.deleteMany({ where: { id: { in: createdLotIds } } });
      }
      if (createdListingIds.length > 0) {
        await prisma.produceListing.deleteMany({ where: { id: { in: createdListingIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.buyerProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.fPOProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.farmerProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (err) {
      console.warn('Phase 5 afterAll cleanup warning:', err.message);
    }
  });

  // ── TEST 1: Manual FPO Directory Search ────────────────────────────────────
  test('1. Manual FPO Directory (GET /api/fpo/directory) returns verified FPOs without leaking member PII', async () => {
    const res = await request(app)
      .get('/api/fpo/directory')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.fpos)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);

    const targetFpo = res.body.data.fpos.find((f) => f.id === fpoProfile.id);
    expect(targetFpo).toBeDefined();
    expect(targetFpo.fpoName).toBe(fpoProfile.fpoName);
    expect(targetFpo.totalActiveMembers).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(targetFpo.availableCrops)).toBe(true);

    // Strict PII verification: zero farmer records or member lists exposed
    expect(targetFpo.members).toBeUndefined();
    expect(targetFpo.farmers).toBeUndefined();
    expect(targetFpo.memberList).toBeUndefined();
  });

  // ── TEST 2: Bulk Requirements Inbox Query & Auto-Matching Engine ───────────
  test('2. FPO Requirements Inbox (GET /api/fpo/requirements) calculates match badges and scores', async () => {
    const res = await request(app)
      .get('/api/fpo/requirements')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requirements.length).toBeGreaterThanOrEqual(3);

    const tomatoReq = res.body.data.requirements.find((r) => r.id === reqTomatoBulk.id);
    expect(tomatoReq).toBeDefined();
    expect(tomatoReq.matching.confirmedStockKg).toBe(5000);
    expect(tomatoReq.matching.matchBadge).toBe('FULL_MATCH');
    expect(tomatoReq.matching.matchScore).toBeGreaterThanOrEqual(80);
    expect(tomatoReq.matching.priceFeasibility).toBe('COMPATIBLE');
    expect(tomatoReq.hasQuoted).toBe(false);

    // Check summary metrics
    const metrics = res.body.data.metrics;
    expect(metrics.totalOpenRequirements).toBeGreaterThanOrEqual(3);
    expect(metrics.fullMatchCount).toBeGreaterThanOrEqual(1);
  });

  // ── TEST 3: Separation of Indicative Supply from Confirmed Stock ───────────
  test('3. Separates Indicative Member Supply from Confirmed FPO Stock correctly', async () => {
    const res = await request(app)
      .get('/api/fpo/requirements')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);

    // Green Chilli: FPO has 800 kg member listing, but ZERO confirmed produce lots
    const chilliReq = res.body.data.requirements.find((r) => r.id === reqChilliIndicativeOnly.id);
    expect(chilliReq).toBeDefined();
    expect(chilliReq.matching.confirmedStockKg).toBe(0);
    expect(chilliReq.matching.indicativeMemberSupplyKg).toBe(800);
    expect(chilliReq.matching.matchBadge).toBe('INDICATIVE_ONLY');

    // Potato: FPO has 1500 kg confirmed lot, but requirement asks for 4000 kg -> PARTIAL_MATCH
    const potatoReq = res.body.data.requirements.find((r) => r.id === reqPotatoPartial.id);
    expect(potatoReq).toBeDefined();
    expect(potatoReq.matching.confirmedStockKg).toBe(1500);
    expect(potatoReq.matching.matchBadge).toBe('PARTIAL_MATCH');
  });

  // ── TEST 4: Deep Requirement Assessment ───────────────────────────────────
  test('4. Requirement Details (GET /api/fpo/requirements/:id) itemizes compatible lots and member listings', async () => {
    const res = await request(app)
      .get(`/api/fpo/requirements/${reqTomatoBulk.id}`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { requirement, feasibility, confirmedLots, indicativeMemberListings } = res.body.data;
    expect(requirement.id).toBe(reqTomatoBulk.id);
    expect(requirement.buyer.organizationName).toBe('Reliance Fresh Ltd');
    expect(feasibility.confirmedStockKg).toBe(5000);
    expect(feasibility.confirmedCoveragePct).toBe(100);
    expect(feasibility.matchBadge).toBe('FULL_MATCH');

    expect(confirmedLots.length).toBeGreaterThanOrEqual(1);
    expect(confirmedLots[0].lotNumber).toBe(confirmedTomatoLot.lotNumber);
    expect(confirmedLots[0].availableQuantityKg).toBe(5000);
    expect(confirmedLots[0].basePricePerKg).toBe(28.5);
  });

  // ── TEST 5: Create Official FPO Quotation with Valid Produce Lot ───────────
  let createdQuotation = null;
  test('5. FPO creates official Quotation (POST /api/fpo/quotations) with lot allocation and pricing', async () => {
    const quotePayload = {
      requirementId: reqTomatoBulk.id,
      produceLotId: confirmedTomatoLot.id,
      offeredQuantityKg: 3000,
      offeredPricePerKg: 30.0,
      estimatedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      validityHours: 48,
      notes: 'Freshly harvested Vaishnavi hybrid tomatoes packed in 20kg crates.'
    };

    const res = await request(app)
      .post('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send(quotePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    createdQuotation = res.body.data.quotation;
    createdQuotationIds.push(createdQuotation.id);

    expect(createdQuotation.quotationNumber).toMatch(/^QUO-TOM-\d{6}-\d{4}$/);
    expect(createdQuotation.offeredQuantityKg).toBe(3000);
    expect(createdQuotation.offeredPricePerKg).toBe(30.0);
    expect(createdQuotation.totalAmount).toBe(90000.0);
    expect(createdQuotation.status).toBe('PENDING');

    // Verify AuditLog record
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'FpoQuotation', entityId: createdQuotation.id, action: 'QUOTATION_CREATED' }
    });
    expect(audit).toBeDefined();

    // Verify Buyer received notification
    const notif = await prisma.notification.findFirst({
      where: { userId: buyerUser.id, metadata: { path: ['quotationId'], equals: createdQuotation.id } }
    });
    expect(notif).toBeDefined();
    expect(notif.title).toContain(createdQuotation.quotationNumber);
  });

  // ── TEST 6: Anti-Over-Allocation Prevention ────────────────────────────────
  test('6. Rejects quotation when offeredQuantityKg exceeds produceLot availableQuantityKg', async () => {
    const overAllocPayload = {
      requirementId: reqPotatoPartial.id,
      produceLotId: confirmedPotatoLot.id, // Only 1500 kg available
      offeredQuantityKg: 3000,             // Requesting 3000 kg -> Must FAIL
      offeredPricePerKg: 19.0,
      estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    };

    const res = await request(app)
      .post('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send(overAllocPayload);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('exceeds lot available balance');
  });

  // ── TEST 7: Crop Incompatibility Validation ────────────────────────────────
  test('7. Rejects quotation when produce lot crop does not match requirement crop', async () => {
    const mismatchPayload = {
      requirementId: reqPotatoPartial.id,   // Potato requirement
      produceLotId: confirmedTomatoLot.id,  // Tomato lot -> Mismatch!
      offeredQuantityKg: 1000,
      offeredPricePerKg: 18.0,
      estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    };

    const res = await request(app)
      .post('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send(mismatchPayload);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('does not match requirement crop');
  });

  // ── TEST 8: Duplicate Quotation Prevention ────────────────────────────────
  test('8. Rejects second active quotation for the same requirement', async () => {
    const duplicatePayload = {
      requirementId: reqTomatoBulk.id,
      produceLotId: confirmedTomatoLot.id,
      offeredQuantityKg: 2000,
      offeredPricePerKg: 29.0,
      estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    };

    const res = await request(app)
      .post('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send(duplicatePayload);

    expect(res.status).toBe(409); // Conflict
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already has an active quotation');
  });

  // ── TEST 9: Quotation Withdrawal Workflow ─────────────────────────────────
  test('9. FPO can withdraw a pending quotation (POST /api/fpo/quotations/:id/withdraw)', async () => {
    // Submit a quotation for Potato to test withdrawal
    const potatoQuoteRes = await request(app)
      .post('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        requirementId: reqPotatoPartial.id,
        produceLotId: confirmedPotatoLot.id,
        offeredQuantityKg: 1000,
        offeredPricePerKg: 19.5,
        estimatedDeliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        validityHours: 24
      });

    expect(potatoQuoteRes.status).toBe(201);
    const quoteToWithdraw = potatoQuoteRes.body.data.quotation;
    createdQuotationIds.push(quoteToWithdraw.id);

    // Withdraw the quotation
    const withdrawRes = await request(app)
      .post(`/api/fpo/quotations/${quoteToWithdraw.id}/withdraw`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ reason: 'Stock allocated to alternative local mandi order.' });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.success).toBe(true);
    expect(withdrawRes.body.data.quotation.status).toBe('WITHDRAWN');

    // Verify AuditLog
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: quoteToWithdraw.id, action: 'QUOTATION_WITHDRAWN' }
    });
    expect(audit).toBeDefined();

    // Verify Buyer notified of withdrawal
    const notif = await prisma.notification.findFirst({
      where: { userId: buyerUser.id, metadata: { path: ['quotationId'], equals: quoteToWithdraw.id } },
      orderBy: { createdAt: 'desc' }
    });
    expect(notif).toBeDefined();
    expect(notif.title).toContain('Withdrawn');
  });

  // ── TEST 10: Server-Side Expiry Sweeper Enforcement ───────────────────────
  test('10. Sweeps expired quotations automatically when validity deadline has passed', async () => {
    // Create an artificial past-due quotation directly
    const expiredQuote = await prisma.fpoQuotation.create({
      data: {
        quotationNumber: `QUO-POT-PAST-${Date.now().toString().slice(-4)}`,
        requirementId: reqPotatoPartial.id,
        fpoId: fpoProfile.id,
        produceLotId: confirmedPotatoLot.id,
        offeredQuantityKg: 500,
        offeredPricePerKg: 18.0,
        totalAmount: 9000.0,
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        validityDate: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        status: 'PENDING'
      }
    });
    createdQuotationIds.push(expiredQuote.id);

    // Query quotations list -> triggers auto-sweeper
    const res = await request(app)
      .get('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);

    const refreshed = await prisma.fpoQuotation.findUnique({
      where: { id: expiredQuote.id }
    });
    expect(refreshed.status).toBe('EXPIRED');

    // Attempting to accept an expired quotation fails
    const acceptRes = await request(app)
      .post(`/api/fpo/quotations/${expiredQuote.id}/accept`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect([400, 422]).toContain(acceptRes.status);
    expect(acceptRes.body.error.message.toLowerCase()).toContain('expired');
  });

  // ── TEST 11: Quotation Acceptance, Stock Deduction & Order Creation ────────
  test('11. Buyer accepts quotation (POST /api/fpo/quotations/:id/accept): stock decremented, order created', async () => {
    const initialLot = await prisma.produceLot.findUnique({
      where: { id: confirmedTomatoLot.id }
    });
    expect(initialLot.availableQuantityKg).toBe(5000);

    const acceptRes = await request(app)
      .post(`/api/fpo/quotations/${createdQuotation.id}/accept`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);

    const { quotation: acceptedQuote, order } = acceptRes.body.data;
    expect(acceptedQuote.status).toBe('ACCEPTED');
    expect(acceptedQuote.orderId).toBeDefined();

    createdOrderIds.push(order.id);
    expect(order.orderNumber).toMatch(/^ORD-SV-/);
    expect(order.totalQuantityKg).toBe(3000);
    expect(order.agreedPriceTotal).toBe(90000.0);
    expect(order.status).toBe('CONFIRMED');

    // Produce Lot available stock must be decremented by exactly 3000 kg (from 5000 to 2000 kg)
    const updatedLot = await prisma.produceLot.findUnique({
      where: { id: confirmedTomatoLot.id }
    });
    expect(updatedLot.availableQuantityKg).toBe(2000);

    // Buyer Requirement must be marked FULFILLED
    const updatedReq = await prisma.buyerRequirement.findUnique({
      where: { id: reqTomatoBulk.id }
    });
    expect(updatedReq.status).toBe('FULFILLED');

    // Verify OrderStatusEvent created
    const statusEvent = await prisma.orderStatusEvent.findFirst({
      where: { orderId: order.id, toStatus: 'CONFIRMED' }
    });
    expect(statusEvent).toBeDefined();

    // Verify dual notifications dispatched
    const fpoNotif = await prisma.notification.findFirst({
      where: { userId: fpoUser.id, orderId: order.id }
    });
    expect(fpoNotif).toBeDefined();
    expect(fpoNotif.title).toContain('Quotation Accepted');

    const buyerNotif = await prisma.notification.findFirst({
      where: { userId: buyerUser.id, orderId: order.id }
    });
    expect(buyerNotif).toBeDefined();
    expect(buyerNotif.title).toContain('Order Confirmed');
  });

  // ── TEST 12: Multi-Tenant Isolation & Role Authorization ───────────────────
  test('12. Enforces multi-tenant isolation and role authorization', async () => {
    // FPO 2 attempts to view FPO 1's accepted quotation
    const viewRes = await request(app)
      .get(`/api/fpo/quotations/${createdQuotation.id}`)
      .set('Authorization', `Bearer ${fpo2Token}`);

    expect([403, 404]).toContain(viewRes.status);

    // FPO 2 attempts to quote against FPO 1's tomato lot
    const crossLotRes = await request(app)
      .post('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpo2Token}`)
      .send({
        requirementId: reqPotatoPartial.id,
        produceLotId: confirmedTomatoLot.id, // FPO 1's lot!
        offeredQuantityKg: 500,
        offeredPricePerKg: 25.0,
        estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      });

    expect([403, 404]).toContain(crossLotRes.status);

    // Buyer 2 attempts to accept a quotation belonging to Buyer 1's requirement
    const crossBuyerRes = await request(app)
      .post(`/api/fpo/quotations/${createdQuotation.id}/accept`)
      .set('Authorization', `Bearer ${buyer2Token}`);

    expect([400, 403, 422]).toContain(crossBuyerRes.status);
  });

  // ── TEST 13: Quotation Rejection Workflow ─────────────────────────────────
  test('13. Buyer rejects quotation (POST /api/fpo/quotations/:id/reject) with reason', async () => {
    // Create another requirement & quotation to test rejection
    const rejectTestReq = await prisma.buyerRequirement.create({
      data: {
        buyerId: buyerProfile.id,
        cropName: 'Tomato',
        quantityKg: 1000,
        maxPricePerKg: 25.0,
        requiredByDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        qualityGrade: 'GRADE_A',
        deliveryState: 'Maharashtra',
        deliveryDistrict: 'Pune',
        status: 'OPEN'
      }
    });
    createdRequirementIds.push(rejectTestReq.id);

    const quoteRes = await request(app)
      .post('/api/fpo/quotations')
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        requirementId: rejectTestReq.id,
        produceLotId: confirmedTomatoLot.id,
        offeredQuantityKg: 1000,
        offeredPricePerKg: 31.0, // Higher than buyer's target price of 25.0
        estimatedDeliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
      });

    expect(quoteRes.status).toBe(201);
    const quoteToReject = quoteRes.body.data.quotation;
    createdQuotationIds.push(quoteToReject.id);

    // Buyer rejects quotation
    const rejectRes = await request(app)
      .post(`/api/fpo/quotations/${quoteToReject.id}/reject`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'Offered price (₹31/kg) exceeds budget threshold (₹25/kg).' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);
    expect(rejectRes.body.data.quotation.status).toBe('REJECTED');

    // Verify rejection audit log
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: quoteToReject.id, action: 'QUOTATION_REJECTED' }
    });
    expect(audit).toBeDefined();

    // Verify FPO received decline notification
    const notif = await prisma.notification.findFirst({
      where: { userId: fpoUser.id, metadata: { path: ['quotationId'], equals: quoteToReject.id } }
    });
    expect(notif).toBeDefined();
    expect(notif.title).toContain('Declined');
  });
});
