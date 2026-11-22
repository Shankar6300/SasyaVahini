/**
 * SasyaVahini — Automated Test Suite for Phase 7
 * Feature: FPO Farmer Payment and Settlement Management
 * Owner: Member 2 (Farmer & FPO Portals)
 *
 * Requirements Covered:
 * 1. FPO settlements generation from confirmed/delivered bulk orders
 * 2. Accurate farmer-wise contribution quantity, agreed price, gross, commission, and net payable calculations
 * 3. Idempotent generation preventing duplicate settlement records
 * 4. Tenant isolation: FPO 2 cannot generate or view settlements for FPO 1
 * 5. FPO settlements listing with aggregated financial metrics and filters
 * 6. Detailed single settlement inspection
 * 7. Verified partial payment recording with transaction reference and status update (PARTIALLY_PAID)
 * 8. Overpayment prevention (rejects payment exceeding outstanding balance)
 * 9. Missing payment evidence validation (transactionRef required)
 * 10. Duplicate transaction reference prevention on same settlement
 * 11. Final settlement completion (status transitions to PAID upon zero balance)
 * 12. Farmer portal view: Farmer A views their own settlement records and payment history
 * 13. Farmer tenant isolation: Farmer B cannot view Farmer A settlements
 * 14. Integrated farmer earnings: reflections in GET /api/farmers/earnings
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
jest.setTimeout(120000);

describe('Phase 7: FPO Farmer Payment and Settlement Management', () => {
  let fpoToken = null;
  let fpoUser = null;
  let fpoProfile = null;

  let fpo2Token = null;
  let fpo2User = null;
  let fpo2Profile = null;

  let buyerToken = null;
  let buyerUser = null;
  let buyerProfile = null;

  // Contributing farmers
  let farmerAUser = null;
  let farmerAToken = null;
  let farmerBUser = null;
  let farmerBToken = null;
  let farmerCUser = null;
  let farmerCToken = null;

  // Lots, Quotations & Orders
  let confirmedTomatoLot = null;
  let confirmedOrder = null;
  let generatedSettlements = [];

  let createdUserIds = [];
  let createdRequirementIds = [];
  let createdLotIds = [];
  let createdQuotationIds = [];
  let createdOrderIds = [];
  let createdListingIds = [];
  let createdSettlementIds = [];

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

    // Configure 2% explicit commission rate for test validation (clean config, not invented)
    await prisma.fPOProfile.update({
      where: { id: fpoProfile.id },
      data: { commissionRatePercent: 2.0 }
    });

    // 2. Secondary FPO for Tenant Isolation
    const fpo2Email = `fpo2.p7.${Date.now()}@test.sasyavahini.in`;
    fpo2User = await prisma.user.create({
      data: {
        email: fpo2Email,
        passwordHash: hash,
        name: 'Sahyadri Kisan Union FPO',
        role: 'FPO',
        phone: `9876${Date.now().toString().slice(-6)}`,
        status: 'ACTIVE',
        fpoProfile: {
          create: {
            fpoName: 'Sahyadri Kisan Union FPO',
            registrationNo: `REG-P7-FPO2-${Date.now().toString().slice(-6)}`,
            state: 'Maharashtra',
            district: 'Nashik',
            commissionRatePercent: 1.5
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

    // 3. Buyer Account
    const buyerEmail = `buyer.p7.${Date.now()}@test.sasyavahini.in`;
    buyerUser = await prisma.user.create({
      data: {
        email: buyerEmail,
        passwordHash: hash,
        name: 'Reliance Fresh Institutional Sourcing',
        role: 'BUYER',
        phone: `9822${Date.now().toString().slice(-6)}`,
        status: 'ACTIVE',
        buyerProfile: {
          create: {
            organizationName: 'Reliance Retail Wholesale Central',
            buyerType: 'WHOLESALER',
            deliveryState: 'Maharashtra',
            deliveryDistrict: 'Pune'
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

    // 4. Contributing Member Farmers
    // Farmer A: 1,500 kg Tomato @ ₹24/kg
    const emailA = `farmer.a.p7.${Date.now()}@test.sasyavahini.in`;
    farmerAUser = await prisma.user.create({
      data: {
        email: emailA,
        passwordHash: hash,
        name: 'Kisan Ramesh Patil',
        role: 'FARMER',
        phone: `9890${Date.now().toString().slice(-6)}`,
        status: 'ACTIVE',
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            state: 'Maharashtra',
            district: 'Pune',
            village: 'Manchar',
            bankAccountVerified: true
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(farmerAUser.id);

    const fALogin = await request(app)
      .post('/api/auth/login')
      .send({ email: emailA, password: 'DemoPass1' });
    farmerAToken = fALogin.body.data.accessToken;

    // Farmer B: 1,200 kg Tomato @ ₹25/kg
    const emailB = `farmer.b.p7.${Date.now()}@test.sasyavahini.in`;
    farmerBUser = await prisma.user.create({
      data: {
        email: emailB,
        passwordHash: hash,
        name: 'Kisan Suresh Jadhav',
        role: 'FARMER',
        phone: `9891${Date.now().toString().slice(-6)}`,
        status: 'ACTIVE',
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            state: 'Maharashtra',
            district: 'Pune',
            village: 'Khed',
            bankAccountVerified: true
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(farmerBUser.id);

    const fBLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: emailB, password: 'DemoPass1' });
    farmerBToken = fBLogin.body.data.accessToken;

    // Farmer C: 1,000 kg Tomato @ ₹24.5/kg
    const emailC = `farmer.c.p7.${Date.now()}@test.sasyavahini.in`;
    farmerCUser = await prisma.user.create({
      data: {
        email: emailC,
        passwordHash: hash,
        name: 'Kisan Anand Shinde',
        role: 'FARMER',
        phone: `9892${Date.now().toString().slice(-6)}`,
        status: 'ACTIVE',
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            state: 'Maharashtra',
            district: 'Pune',
            village: 'Junnar',
            bankAccountVerified: true
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(farmerCUser.id);

    const fCLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: emailC, password: 'DemoPass1' });
    farmerCToken = fCLogin.body.data.accessToken;

    // Listings
    const listingA = await prisma.produceListing.create({
      data: {
        farmerId: farmerAUser.farmerProfile.id,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        category: 'Vegetables',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 2000,
        reservedQty: 1500,
        soldQty: 0,
        askingPricePerKg: 24.0,
        minPricePerKg: 22.0,
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Manchar'
      }
    });
    createdListingIds.push(listingA.id);

    const listingB = await prisma.produceListing.create({
      data: {
        farmerId: farmerBUser.farmerProfile.id,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        category: 'Vegetables',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 1500,
        reservedQty: 1200,
        soldQty: 0,
        askingPricePerKg: 25.0,
        minPricePerKg: 23.0,
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Khed'
      }
    });
    createdListingIds.push(listingB.id);

    const listingC = await prisma.produceListing.create({
      data: {
        farmerId: farmerCUser.farmerProfile.id,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        category: 'Vegetables',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 1200,
        reservedQty: 1000,
        soldQty: 0,
        askingPricePerKg: 24.5,
        minPricePerKg: 22.5,
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Junnar'
      }
    });
    createdListingIds.push(listingC.id);

    // 5. Seed Consolidated Produce Lot (Tomato, 3,700 kg across Farmers A, B, C)
    confirmedTomatoLot = await prisma.produceLot.create({
      data: {
        lotNumber: `LOT-P7-TOM-${Date.now().toString().slice(-6)}`,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        variety: 'Vaishali Hybrid',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 3700,
        availableQuantityKg: 0,
        allocatedQuantityKg: 3700,
        weightedAvgPricePerKg: 24.5,
        status: 'READY_FOR_SALE',
        contributions: {
          create: [
            {
              farmerId: farmerAUser.farmerProfile.id,
              listingId: listingA.id,
              allocatedQtyKg: 1500,
              agreedPricePerKg: 24.0,
              status: 'COMMITTED'
            },
            {
              farmerId: farmerBUser.farmerProfile.id,
              listingId: listingB.id,
              allocatedQtyKg: 1200,
              agreedPricePerKg: 25.0,
              status: 'COMMITTED'
            },
            {
              farmerId: farmerCUser.farmerProfile.id,
              listingId: listingC.id,
              allocatedQtyKg: 1000,
              agreedPricePerKg: 24.5,
              status: 'COMMITTED'
            }
          ]
        }
      }
    });
    createdLotIds.push(confirmedTomatoLot.id);

    // 6. Buyer Requirement & Confirmed Bulk Order
    const reqBulk = await prisma.buyerRequirement.create({
      data: {
        buyerId: buyerProfile.id,
        cropName: 'Tomato',
        quantityKg: 3700,
        maxPricePerKg: 28.0,
        requiredByDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        qualityGrade: 'GRADE_A',
        deliveryState: 'Maharashtra',
        deliveryDistrict: 'Pune',
        deliveryAddress: 'Reliance Fresh Distribution Center, Hadapsar, Pune',
        latitude: 18.5089,
        longitude: 73.9260,
        status: 'OPEN'
      }
    });
    createdRequirementIds.push(reqBulk.id);

    const quotation = await prisma.fpoQuotation.create({
      data: {
        quotationNumber: `QUO-P7-${Date.now().toString().slice(-6)}`,
        fpoId: fpoProfile.id,
        requirementId: reqBulk.id,
        produceLotId: confirmedTomatoLot.id,
        offeredQuantityKg: 3700,
        offeredPricePerKg: 26.0,
        totalAmount: 96200,
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        validityDate: new Date(Date.now() + 48 * 3600000),
        status: 'ACCEPTED'
      }
    });
    createdQuotationIds.push(quotation.id);

    confirmedOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-P7-${Date.now().toString().slice(-6)}`,
        buyerId: buyerProfile.id,
        requirementId: reqBulk.id,
        totalQuantityKg: 3700,
        agreedPriceTotal: 96200,
        status: 'DELIVERED', // Order fulfilled and ready for final settlement
        deliveryAddress: 'Reliance Fresh Distribution Center, Hadapsar, Pune',
        deliveryLatitude: 18.5089,
        deliveryLongitude: 73.9260,
        actualDelivery: new Date()
      }
    });
    createdOrderIds.push(confirmedOrder.id);

    await prisma.fpoQuotation.update({
      where: { id: quotation.id },
      data: { orderId: confirmedOrder.id }
    });
  });

  afterAll(async () => {
    try {
      if (createdSettlementIds.length > 0) {
        await prisma.settlementPaymentRecord.deleteMany({
          where: { settlementId: { in: createdSettlementIds } }
        });
        await prisma.farmerSettlement.deleteMany({
          where: { id: { in: createdSettlementIds } }
        });
      }
      if (createdOrderIds.length > 0) {
        await prisma.orderStatusEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.notification.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdQuotationIds.length > 0) {
        await prisma.fpoQuotation.deleteMany({ where: { id: { in: createdQuotationIds } } });
      }
      if (createdRequirementIds.length > 0) {
        await prisma.buyerRequirement.deleteMany({ where: { id: { in: createdRequirementIds } } });
      }
      if (createdLotIds.length > 0) {
        await prisma.produceLotContribution.deleteMany({ where: { lotId: { in: createdLotIds } } });
        await prisma.produceLot.deleteMany({ where: { id: { in: createdLotIds } } });
      }
      if (createdListingIds.length > 0) {
        await prisma.produceListing.deleteMany({ where: { id: { in: createdListingIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch { /* non-fatal cleanup */ }
  });

  // ─── TEST 1: Inspect Bulk Orders for Settlement Readiness ──────────────────
  test('1. GET /api/fpo/orders: Lists delivered bulk orders ready for settlement generation', async () => {
    const res = await request(app)
      .get('/api/fpo/orders')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const target = res.body.data.find(o => o.id === confirmedOrder.id);
    expect(target).toBeDefined();
    expect(target.contributingFarmersCount).toBe(3);
    expect(target.totalQuantityKg).toBe(3700);
    expect(target.status).toBe('DELIVERED');
  });

  // ─── TEST 2: Generate Farmer Settlement Breakdown ─────────────────────────
  test('2. POST /api/fpo/orders/:id/settlements/generate: Computes accurate farmer-wise breakdown, commissions, and payable net', async () => {
    const res = await request(app)
      .post(`/api/fpo/orders/${confirmedOrder.id}/settlements/generate`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        notes: 'Final settlement for Tomato bulk consignment to Reliance Fresh',
        commissionRatePercent: 2.0 // Configured 2% service fee
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.settlements.length).toBe(3);

    generatedSettlements = res.body.data.settlements;
    generatedSettlements.forEach(s => createdSettlementIds.push(s.id));

    // Verify Farmer A: 1,500 kg @ ₹24.0/kg
    // Gross = ₹36,000.00, Commission (2%) = ₹720.00, Net = ₹35,280.00
    const setA = generatedSettlements.find(s => s.farmerId === farmerAUser.farmerProfile.id);
    expect(setA).toBeDefined();
    expect(setA.quantityKg).toBe(1500);
    expect(setA.agreedPricePerKg).toBe(24.0);
    expect(setA.grossAmount).toBe(36000.0);
    expect(setA.commissionRatePercent).toBe(2.0);
    expect(setA.commissionAmount).toBe(720.0);
    expect(setA.netPayable).toBe(35280.0);
    expect(setA.paidAmount).toBe(0.0);
    expect(setA.outstandingAmount).toBe(35280.0);
    expect(setA.status).toBe('PENDING');

    // Verify Farmer B: 1,200 kg @ ₹25.0/kg
    // Gross = ₹30,000.00, Commission (2%) = ₹600.00, Net = ₹29,400.00
    const setB = generatedSettlements.find(s => s.farmerId === farmerBUser.farmerProfile.id);
    expect(setB).toBeDefined();
    expect(setB.grossAmount).toBe(30000.0);
    expect(setB.commissionAmount).toBe(600.0);
    expect(setB.netPayable).toBe(29400.0);
    expect(setB.status).toBe('PENDING');

    // Verify Farmer C: 1,000 kg @ ₹24.5/kg
    // Gross = ₹24,500.00, Commission (2%) = ₹490.00, Net = ₹24,010.00
    const setC = generatedSettlements.find(s => s.farmerId === farmerCUser.farmerProfile.id);
    expect(setC).toBeDefined();
    expect(setC.grossAmount).toBe(24500.0);
    expect(setC.commissionAmount).toBe(490.0);
    expect(setC.netPayable).toBe(24010.0);
    expect(setC.status).toBe('PENDING');

    // Verify notifications were dispatched to Farmer A
    const farmerANotifs = await prisma.notification.findMany({
      where: { userId: farmerAUser.id }
    });
    expect(farmerANotifs.some(n => n.title.includes('Settlement Prepared'))).toBe(true);

    // Verify Audit Log
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: confirmedOrder.id, action: 'SETTLEMENT_GENERATED' }
    });
    expect(audit).toBeDefined();
    expect(audit.metadata.settlementsCount).toBe(3);
  });

  // ─── TEST 3: Consistency & Anti-Duplicate Idempotency ─────────────────────
  test('3. Consistency & Anti-Duplicate: Calling generation a second time is idempotent and prevents duplicates', async () => {
    const res = await request(app)
      .post(`/api/fpo/orders/${confirmedOrder.id}/settlements/generate`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ commissionRatePercent: 2.0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isAlreadyGenerated).toBe(true);
    expect(res.body.data.settlements.length).toBe(3);

    // Total records in DB must still strictly be 3
    const totalInDb = await prisma.farmerSettlement.count({
      where: { orderId: confirmedOrder.id }
    });
    expect(totalInDb).toBe(3);
  });

  // ─── TEST 4: Tenant Isolation ─────────────────────────────────────────────
  test('4. Tenant Isolation: FPO 2 cannot generate or view settlements for FPO 1 orders', async () => {
    // Generate attempt by FPO 2
    const resGen = await request(app)
      .post(`/api/fpo/orders/${confirmedOrder.id}/settlements/generate`)
      .set('Authorization', `Bearer ${fpo2Token}`)
      .send({ commissionRatePercent: 1.5 });
    expect(resGen.status).toBe(403);

    // View single settlement attempt by FPO 2
    const setAId = generatedSettlements[0].id;
    const resView = await request(app)
      .get(`/api/fpo/settlements/${setAId}`)
      .set('Authorization', `Bearer ${fpo2Token}`);
    expect(resView.status).toBe(403);
  });

  // ─── TEST 5: GET Settlements Listing & Metrics ────────────────────────────
  test('5. GET /api/fpo/settlements: Returns settlements with aggregated metrics and search filters', async () => {
    const res = await request(app)
      .get('/api/fpo/settlements')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { metrics, settlements } = res.body.data;
    expect(metrics.totalSettlements).toBeGreaterThanOrEqual(3);
    // Total Gross = 36000 + 30000 + 24500 = 90,500
    // Total Comm  = 720 + 600 + 490 = 1,810
    // Total Net   = 35280 + 29400 + 24010 = 88,690
    expect(metrics.totalGrossAmount).toBe(90500.0);
    expect(metrics.totalCommissionAmount).toBe(1810.0);
    expect(metrics.totalNetPayable).toBe(88690.0);
    expect(metrics.totalPaidAmount).toBe(0.0);
    expect(metrics.totalOutstandingAmount).toBe(88690.0);
    expect(metrics.pendingCount).toBeGreaterThanOrEqual(3);

    // Test search filter by farmer name
    const searchRes = await request(app)
      .get('/api/fpo/settlements?search=Ramesh')
      .set('Authorization', `Bearer ${fpoToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.settlements.some(s => s.farmer.user.name.includes('Ramesh'))).toBe(true);
  });

  // ─── TEST 6: GET Single Settlement Details ─────────────────────────────────
  test('6. GET /api/fpo/settlements/:id: Inspects single settlement details with farmer profile', async () => {
    const setAId = generatedSettlements[0].id;
    const res = await request(app)
      .get(`/api/fpo/settlements/${setAId}`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(setAId);
    expect(res.body.data.farmer.user.name).toBe('Kisan Ramesh Patil');
    expect(res.body.data.order.orderNumber).toBe(confirmedOrder.orderNumber);
    expect(res.body.data.payments).toEqual([]);
  });

  // ─── TEST 7: Record Partial Payment Installment ────────────────────────────
  test('7. POST /api/fpo/settlements/:id/payments: Records partial payment, advances status to PARTIALLY_PAID', async () => {
    const setA = generatedSettlements.find(s => s.farmerId === farmerAUser.farmerProfile.id);

    // Net payable is ₹35,280. Pay first installment of ₹20,000 via RTGS
    const res = await request(app)
      .post(`/api/fpo/settlements/${setA.id}/payments`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        amount: 20000.0,
        paymentMode: 'RTGS',
        transactionRef: 'RTGS-P7-UTR-9081234567',
        paymentDate: new Date().toISOString(),
        notes: 'Initial 50%+ dispatch advance payment to farmer bank account'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = res.body.data.settlement;
    expect(updated.paidAmount).toBe(20000.0);
    expect(updated.outstandingAmount).toBe(15280.0);
    expect(updated.status).toBe('PARTIALLY_PAID');

    expect(res.body.data.payment.transactionRef).toBe('RTGS-P7-UTR-9081234567');
    expect(res.body.data.payment.paymentMode).toBe('RTGS');

    // Verify farmer received payment notification
    const farmerANotifs = await prisma.notification.findMany({
      where: { userId: farmerAUser.id }
    });
    expect(farmerANotifs.some(n => n.title.includes('Payment Received'))).toBe(true);

    // Verify Audit Log
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: setA.id, action: 'SETTLEMENT_PAYMENT_RECORDED' }
    });
    expect(audit).toBeDefined();
    expect(audit.metadata.paidAmount).toBe(20000.0);
  });

  // ─── TEST 8: Overpayment Prevention ───────────────────────────────────────
  test('8. Overpayment Prevention: Rejects payment exceeding outstanding balance with 422', async () => {
    const setA = generatedSettlements.find(s => s.farmerId === farmerAUser.farmerProfile.id);

    // Outstanding balance is now ₹15,280. Trying to pay ₹25,000 must fail
    const res = await request(app)
      .post(`/api/fpo/settlements/${setA.id}/payments`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        amount: 25000.0,
        paymentMode: 'NEFT',
        transactionRef: 'NEFT-OVERPAY-123'
      });

    expect(res.status).toBe(422);
    const errText = JSON.stringify(res.body.error || res.body.message || '');
    expect(errText).toContain('exceeds the outstanding balance');
  });

  // ─── TEST 9: Payment Evidence Validation ───────────────────────────────────
  test('9. Payment Evidence Validation: Rejects recording payment without transaction reference', async () => {
    const setB = generatedSettlements.find(s => s.farmerId === farmerBUser.farmerProfile.id);

    const res = await request(app)
      .post(`/api/fpo/settlements/${setB.id}/payments`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        amount: 10000.0,
        paymentMode: 'BANK_TRANSFER',
        transactionRef: '' // Invalid / empty
      });

    expect([400, 422]).toContain(res.status); // Schema validation error
  });

  // ─── TEST 10: Duplicate Transaction Reference Prevention ───────────────────
  test('10. Duplicate Transaction Reference: Rejects using same transaction reference on same settlement', async () => {
    const setA = generatedSettlements.find(s => s.farmerId === farmerAUser.farmerProfile.id);

    // Re-submit the exact same UTR 'RTGS-P7-UTR-9081234567'
    const res = await request(app)
      .post(`/api/fpo/settlements/${setA.id}/payments`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        amount: 5000.0,
        paymentMode: 'RTGS',
        transactionRef: 'RTGS-P7-UTR-9081234567'
      });

    expect(res.status).toBe(409);
    const errText = JSON.stringify(res.body.error || res.body.message || '');
    expect(errText).toContain('already been recorded for this settlement');
  });

  // ─── TEST 11: Final Payment & Full Settlement ─────────────────────────────
  test('11. Final Settlement: Records remaining balance, marks settlement PAID with zero outstanding', async () => {
    const setA = generatedSettlements.find(s => s.farmerId === farmerAUser.farmerProfile.id);

    // Remaining balance is ₹15,280
    const res = await request(app)
      .post(`/api/fpo/settlements/${setA.id}/payments`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        amount: 15280.0,
        paymentMode: 'NEFT',
        transactionRef: 'NEFT-P7-FINAL-998877',
        notes: 'Final settlement cleared in full'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = res.body.data.settlement;
    expect(updated.paidAmount).toBe(35280.0);
    expect(updated.outstandingAmount).toBe(0.0);
    expect(updated.status).toBe('PAID');
    expect(updated.settledAt).toBeDefined();

    // Verify attempting further payment on PAID settlement is rejected
    const afterRes = await request(app)
      .post(`/api/fpo/settlements/${setA.id}/payments`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        amount: 100.0,
        paymentMode: 'UPI',
        transactionRef: 'UPI-EXTRA-123'
      });
    expect(afterRes.status).toBe(422);
    const errText = JSON.stringify(afterRes.body.error || afterRes.body.message || '');
    expect(errText).toContain('already been fully paid');
  });

  // ─── TEST 12: Farmer Portal My Settlements View ────────────────────────────
  test('12. GET /api/farmers/settlements: Farmer A views their own settlement records and payment history', async () => {
    const res = await request(app)
      .get('/api/farmers/settlements')
      .set('Authorization', `Bearer ${farmerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary, settlements } = res.body.data;
    expect(summary.totalSettledProceeds).toBe(35280.0);
    expect(summary.totalPendingProceeds).toBe(0.0);
    expect(summary.paidCount).toBe(1);

    expect(settlements.length).toBe(1);
    const mySet = settlements[0];
    expect(mySet.cropName).toBe('Tomato');
    expect(mySet.quantityKg).toBe(1500);
    expect(mySet.grossAmount).toBe(36000.0);
    expect(mySet.commissionAmount).toBe(720.0);
    expect(mySet.netPayable).toBe(35280.0);
    expect(mySet.paidAmount).toBe(35280.0);
    expect(mySet.status).toBe('PAID');
    expect(mySet.payments.length).toBe(2); // 2 payment installments (20k + 15.28k)
  });

  // ─── TEST 13: Farmer Privacy & Tenant Isolation ────────────────────────────
  test('13. Farmer Privacy: Farmer B sees only Farmer B pending settlements and cannot see Farmer A records', async () => {
    const res = await request(app)
      .get('/api/farmers/settlements')
      .set('Authorization', `Bearer ${farmerBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary, settlements } = res.body.data;
    expect(settlements.length).toBe(1);
    expect(settlements[0].quantityKg).toBe(1200);
    expect(settlements[0].netPayable).toBe(29400.0);
    expect(settlements[0].status).toBe('PENDING');

    // Ensure Farmer B summary does NOT include Farmer A's ₹35,280
    expect(summary.totalSettledProceeds).toBe(0.0);
    expect(summary.totalPendingProceeds).toBe(29400.0);
  });

  // ─── TEST 14: Integrated Farmer Earnings Verification ──────────────────────
  test('14. GET /api/farmers/earnings: Accurately reflects bulk order settlements in financial overview', async () => {
    const res = await request(app)
      .get('/api/farmers/earnings')
      .set('Authorization', `Bearer ${farmerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Farmer A has ₹35,280 completed from bulk order settlement
    expect(res.body.data.totalCompletedEarnings).toBeGreaterThanOrEqual(35280.0);
    expect(res.body.data.completedOrdersCount).toBeGreaterThanOrEqual(1);

    const setRecord = res.body.data.settlements.find(s => s.netPayout === 35280.0);
    expect(setRecord).toBeDefined();
    expect(setRecord.status).toBe('SETTLED');
  });
});
