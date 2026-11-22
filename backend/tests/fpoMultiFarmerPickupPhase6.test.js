/**
 * SasyaVahini — Phase 6: Multi-Farmer Pickup Logistics Integration Test Suite
 *
 * Verifies:
 * 1. FPO Order Retrieval (GET /api/fpo/orders) with contributing farmers and delivery readiness.
 * 2. Pre-Dispatch Delivery Plan (GET /api/fpo/orders/:id/delivery-plan) with multi-farmer pickup stops.
 * 3. Multi-Farmer Delivery Generation (POST /api/fpo/orders/:id/deliveries) from confirmed bulk orders.
 * 4. Coordinates Protection: Shields exact farmer coordinates (null) while shipment is UNASSIGNED.
 * 5. Stock Validation: Rejects delivery creation for orders backed by unconfirmed stock (422/400).
 * 6. Duplicate Delivery Prevention: Rejects second delivery creation for the same order (409 Conflict).
 * 7. Tenant Isolation & Authorization: FPO 2 cannot generate or view deliveries for FPO 1's orders (403).
 * 8. FPO Deliveries Dashboard (GET /api/fpo/deliveries) with expected vs collected kg metrics.
 * 9. Deep Delivery Details (GET /api/fpo/deliveries/:id) with stop-by-stop progress tracking.
 * 10. Pickup Stop Progress (PATCH /api/fpo/deliveries/:id/stops/:stopId): Mark stop ARRIVED and COMPLETED.
 * 11. Multi-Stop State Machine: Automatically transitions shipment to TRANSIT when all pickup stops complete.
 * 12. Final Buyer Delivery: Transitions shipment and order to DELIVERED upon destination completion.
 * 13. Farmer Pickups Endpoint (GET /api/farmers/pickups): Farmer views scheduled pickups for their own harvest.
 * 14. Farmer Privacy: Farmer cannot see other farmers' stops or unassigned provider details.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
jest.setTimeout(120000);

describe('Phase 6: Multi-Farmer Pickup Logistics Integration for FPO Bulk Orders', () => {
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
  let farmerBUser = null;
  let farmerCUser = null;
  let unconfirmedFarmerUser = null;

  // Harvest lots & contributions
  let confirmedTomatoLot = null;
  let unconfirmedLot = null;

  // Orders
  let confirmedOrder = null;
  let unconfirmedOrder = null;

  let createdUserIds = [];
  let createdRequirementIds = [];
  let createdLotIds = [];
  let createdQuotationIds = [];
  let createdOrderIds = [];
  let createdShipmentIds = [];
  let createdListingIds = [];

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
    const fpo2Email = `fpo2_p6_${Date.now()}@test.sasyavahini.in`;
    fpo2User = await prisma.user.create({
      data: {
        name: 'Godavari Valley Producers',
        email: fpo2Email,
        phone: `+91981${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'FPO',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        fpoProfile: {
          create: {
            fpoName: 'Godavari Valley Producers',
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

    // 3. Institutional Buyer
    const buyerEmail = `buyer_p6_${Date.now()}@test.sasyavahini.in`;
    buyerUser = await prisma.user.create({
      data: {
        name: 'Star Fresh Mega Mart Hub',
        email: buyerEmail,
        phone: `+91982${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'BUYER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        buyerProfile: {
          create: {
            organizationName: 'Star Fresh Retail India',
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

    // 4. Contributing Member Farmers
    // Farmer A (Manchar)
    const farmerAEmail = `farmer_a_p6_${Date.now()}@test.sasyavahini.in`;
    farmerAUser = await prisma.user.create({
      data: {
        name: 'Kisan Ramesh Patil',
        email: farmerAEmail,
        phone: `+91971${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'FARMER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            state: 'Maharashtra',
            district: 'Pune',
            village: 'Manchar',
            latitude: 18.9880,
            longitude: 73.9400,
            landSizeAcres: 4.5
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(farmerAUser.id);

    // Farmer B (Khed)
    const farmerBEmail = `farmer_b_p6_${Date.now()}@test.sasyavahini.in`;
    farmerBUser = await prisma.user.create({
      data: {
        name: 'Kisan Suresh Bhor',
        email: farmerBEmail,
        phone: `+91972${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'FARMER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            state: 'Maharashtra',
            district: 'Pune',
            village: 'Khed',
            latitude: 18.8470,
            longitude: 73.9100,
            landSizeAcres: 3.2
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(farmerBUser.id);

    // Farmer C (Junnar)
    const farmerCEmail = `farmer_c_p6_${Date.now()}@test.sasyavahini.in`;
    farmerCUser = await prisma.user.create({
      data: {
        name: 'Kisan Dattatray Shinde',
        email: farmerCEmail,
        phone: `+91973${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'FARMER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            state: 'Maharashtra',
            district: 'Pune',
            village: 'Junnar',
            latitude: 19.2083,
            longitude: 73.8767,
            landSizeAcres: 6.0
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(farmerCUser.id);

    // Unconfirmed Farmer for Validation Test
    const unconfirmedEmail = `unconf_farmer_p6_${Date.now()}@test.sasyavahini.in`;
    unconfirmedFarmerUser = await prisma.user.create({
      data: {
        name: 'Kisan Unconfirmed Member',
        email: unconfirmedEmail,
        phone: `+91974${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'FARMER',
        passwordHash: hash,
        status: 'ACTIVE',
        isPhoneVerified: true,
        isEmailVerified: true,
        farmerProfile: {
          create: {
            fpoId: fpoProfile.id,
            state: 'Maharashtra',
            district: 'Pune',
            village: 'Ambegaon',
            latitude: 19.0123,
            longitude: 73.8901,
            landSizeAcres: 2.0
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(unconfirmedFarmerUser.id);

    // 4b. Seed Produce Listings for Contributing Farmers
    const listingA = await prisma.produceListing.create({
      data: {
        farmerId: farmerAUser.farmerProfile.id,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        category: 'Vegetables',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 1500,
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
        totalQuantityKg: 1200,
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
        totalQuantityKg: 1000,
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

    const listingUnconf = await prisma.produceListing.create({
      data: {
        farmerId: unconfirmedFarmerUser.farmerProfile.id,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        category: 'Vegetables',
        qualityGrade: 'GRADE_B',
        totalQuantityKg: 500,
        reservedQty: 0,
        soldQty: 0,
        askingPricePerKg: 18.0,
        minPricePerKg: 16.0,
        harvestDate: new Date(),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Ambegaon'
      }
    });
    createdListingIds.push(listingUnconf.id);

    // 5. Seed Confirmed Consolidated Produce Lot (Tomato, 3,700 kg across Farmers A, B, C)
    confirmedTomatoLot = await prisma.produceLot.create({
      data: {
        lotNumber: `LOT-P6-TOM-${Date.now().toString().slice(-6)}`,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        variety: 'Vaishali Hybrid',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 3700,
        availableQuantityKg: 3700,
        allocatedQuantityKg: 0,
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

    // 6. Seed Unconfirmed Lot (Status DRAFT with unconfirmed contribution)
    unconfirmedLot = await prisma.produceLot.create({
      data: {
        lotNumber: `LOT-P6-UNCONF-${Date.now().toString().slice(-6)}`,
        fpoId: fpoProfile.id,
        cropName: 'Tomato',
        variety: 'Vaishali',
        qualityGrade: 'GRADE_B',
        totalQuantityKg: 500,
        availableQuantityKg: 500,
        allocatedQuantityKg: 0,
        weightedAvgPricePerKg: 18.0,
        status: 'DRAFT',
        contributions: {
          create: [
            {
              farmerId: unconfirmedFarmerUser.farmerProfile.id,
              listingId: listingUnconf.id,
              allocatedQtyKg: 500,
              agreedPricePerKg: 18.0,
              status: 'PENDING'
            }
          ]
        }
      }
    });
    createdLotIds.push(unconfirmedLot.id);

    // 7. Seed Buyer Requirements
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
        deliveryAddress: 'Star Fresh Central Depot, Hadapsar Industrial Area, Pune 411028',
        latitude: 18.5089,
        longitude: 73.9260,
        status: 'OPEN'
      }
    });
    createdRequirementIds.push(reqBulk.id);

    const reqUnconf = await prisma.buyerRequirement.create({
      data: {
        buyerId: buyerProfile.id,
        cropName: 'Tomato',
        quantityKg: 500,
        maxPricePerKg: 20.0,
        requiredByDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        qualityGrade: 'GRADE_B',
        deliveryState: 'Maharashtra',
        deliveryDistrict: 'Pune',
        deliveryAddress: 'Star Fresh Hadapsar Depot, Pune',
        status: 'OPEN'
      }
    });
    createdRequirementIds.push(reqUnconf.id);

    // 8. Seed Confirmed Bulk Order linked to FpoQuotation & Confirmed Lot
    const quotation = await prisma.fpoQuotation.create({
      data: {
        quotationNumber: `QUO-P6-${Date.now().toString().slice(-6)}`,
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
        orderNumber: `ORD-P6-${Date.now().toString().slice(-6)}`,
        buyerId: buyerProfile.id,
        requirementId: reqBulk.id,
        totalQuantityKg: 3700,
        agreedPriceTotal: 96200,
        status: 'CONFIRMED',
        deliveryAddress: 'Star Fresh Central Depot, Hadapsar Industrial Area, Pune 411028',
        deliveryLatitude: 18.5089,
        deliveryLongitude: 73.9260,
        scheduledDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }
    });
    createdOrderIds.push(confirmedOrder.id);

    // Link quotation to order
    await prisma.fpoQuotation.update({
      where: { id: quotation.id },
      data: { orderId: confirmedOrder.id }
    });

    // 9. Seed Order for Unconfirmed Lot Validation
    const unconfQuotation = await prisma.fpoQuotation.create({
      data: {
        quotationNumber: `QUO-P6-UNC-${Date.now().toString().slice(-6)}`,
        fpoId: fpoProfile.id,
        requirementId: reqUnconf.id,
        produceLotId: unconfirmedLot.id,
        offeredQuantityKg: 500,
        offeredPricePerKg: 19.0,
        totalAmount: 9500,
        estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        validityDate: new Date(Date.now() + 48 * 3600000),
        status: 'ACCEPTED'
      }
    });
    createdQuotationIds.push(unconfQuotation.id);

    unconfirmedOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-P6-UNC-${Date.now().toString().slice(-6)}`,
        buyerId: buyerProfile.id,
        requirementId: reqUnconf.id,
        totalQuantityKg: 500,
        agreedPriceTotal: 9500,
        status: 'CONFIRMED',
        deliveryAddress: 'Star Fresh Hadapsar Depot, Pune',
        scheduledDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    });
    createdOrderIds.push(unconfirmedOrder.id);

    await prisma.fpoQuotation.update({
      where: { id: unconfQuotation.id },
      data: { orderId: unconfirmedOrder.id }
    });
  });

  afterAll(async () => {
    try {
      if (createdShipmentIds.length > 0) {
        await prisma.shipmentStop.deleteMany({ where: { shipmentId: { in: createdShipmentIds } } });
        await prisma.shipment.deleteMany({ where: { id: { in: createdShipmentIds } } });
      }
      if (createdOrderIds.length > 0) {
        await prisma.deliveryRecord.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.orderStatusEvent.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.fpoQuotation.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdLotIds.length > 0) {
        await prisma.produceLotContribution.deleteMany({ where: { lotId: { in: createdLotIds } } });
        await prisma.produceLot.deleteMany({ where: { id: { in: createdLotIds } } });
      }
      if (createdRequirementIds.length > 0) {
        await prisma.buyerRequirement.deleteMany({ where: { id: { in: createdRequirementIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.farmerProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.fPOProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.buyerProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (cleanupErr) {
      console.warn('Phase 6 cleanup notice:', cleanupErr.message);
    }
  });

  // ─── TEST 1: FPO Orders Listing ─────────────────────────────────────────────
  test('1. GET /api/fpo/orders: Lists bulk orders with contributing farmers count and delivery status', async () => {
    const res = await request(app)
      .get('/api/fpo/orders')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const targetOrder = res.body.data.find(o => o.id === confirmedOrder.id);
    expect(targetOrder).toBeDefined();
    expect(targetOrder.orderNumber).toBe(confirmedOrder.orderNumber);
    expect(targetOrder.totalQuantityKg).toBe(3700);
    expect(targetOrder.contributingFarmersCount).toBe(3);
    expect(targetOrder.isStockConfirmed).toBe(true);
    expect(targetOrder.hasDelivery).toBe(false);
  });

  // ─── TEST 2: Pre-Dispatch Delivery Plan ──────────────────────────────────────
  test('2. GET /api/fpo/orders/:id/delivery-plan: Prepares multi-farmer pickup stops and route metrics', async () => {
    const res = await request(app)
      .get(`/api/fpo/orders/${confirmedOrder.id}/delivery-plan`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const plan = res.body.data;
    expect(plan.orderId).toBe(confirmedOrder.id);
    expect(plan.isStockConfirmed).toBe(true);
    expect(plan.canDispatch).toBe(true);

    // Stops: 3 Pickups + 1 Buyer Destination = 4 Stops
    expect(plan.stops).toHaveLength(4);

    const pickupStops = plan.stops.filter(s => s.stopType === 'PICKUP');
    expect(pickupStops).toHaveLength(3);

    // Verify contributing farmers in pickup stops
    const farmerNames = pickupStops.map(s => s.stopName);
    expect(farmerNames.some(n => n.includes('Ramesh Patil'))).toBe(true);
    expect(farmerNames.some(n => n.includes('Suresh Bhor'))).toBe(true);
    expect(farmerNames.some(n => n.includes('Dattatray Shinde'))).toBe(true);

    const totalPickupKg = pickupStops.reduce((sum, s) => sum + s.quantityKg, 0);
    expect(totalPickupKg).toBe(3700);

    // Final stop must be Buyer delivery destination
    const destStop = plan.stops[plan.stops.length - 1];
    expect(destStop.stopType).toBe('DELIVERY');
    expect(destStop.address).toContain('Hadapsar Industrial Area');
    expect(destStop.quantityKg).toBe(3700);

    // Route summary check
    expect(plan.routeSummary.totalDistanceKm).toBeGreaterThan(0);
    expect(plan.routeSummary.estimatedMinutes).toBeGreaterThan(0);
  });

  // ─── TEST 3: Generate Multi-Farmer Delivery Request ──────────────────────────
  let generatedShipment = null;

  test('3. POST /api/fpo/orders/:id/deliveries: Successfully creates consolidated multi-farmer delivery job', async () => {
    const res = await request(app)
      .post(`/api/fpo/orders/${confirmedOrder.id}/deliveries`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        notes: 'Priority morning collection for institutional retail packaging.',
        scheduledPickupAt: new Date(Date.now() + 24 * 3600000).toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    generatedShipment = res.body.data.shipment;
    expect(generatedShipment).toBeDefined();
    expect(generatedShipment.trackingNumber).toMatch(/^SV-SHP-2026-\d{4}$/);
    expect(generatedShipment.status).toBe('UNASSIGNED');
    expect(generatedShipment.totalWeightKg).toBe(3700);

    createdShipmentIds.push(generatedShipment.id);

    // Verify stops created
    expect(generatedShipment.stops).toHaveLength(4);
    const pickups = generatedShipment.stops.filter(s => s.stopType === 'PICKUP');
    expect(pickups).toHaveLength(3);

    // In-app notifications to contributing farmers
    const farmerANotifs = await prisma.notification.findMany({
      where: { userId: farmerAUser.id }
    });
    expect(farmerANotifs.length).toBeGreaterThan(0);
    expect(farmerANotifs.some(n => n.title.includes('Produce Pickup Scheduled'))).toBe(true);
  });

  // ─── TEST 4: Coordinates Protection When Unassigned ──────────────────────────
  test('4. Coordinates Protection: Shields exact coordinates (null) while shipment is UNASSIGNED', async () => {
    const res = await request(app)
      .get(`/api/fpo/deliveries/${generatedShipment.id}`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    const shipment = res.body.data;

    expect(shipment.status).toBe('UNASSIGNED');
    expect(shipment.coordinatesProtected).toBe(true);
    expect(shipment.transporter).toBeNull(); // Carrier safely hidden when unassigned

    // All pickup stops must mask exact latitude and longitude
    const pickups = shipment.stops.filter(s => s.stopType === 'PICKUP');
    pickups.forEach((stop) => {
      expect(stop.latitude).toBeNull();
      expect(stop.longitude).toBeNull();
      expect(stop.coordinatesProtected).toBe(true);
      expect(stop.approxLatitude).toBeDefined();
      expect(stop.address).toBeDefined();
    });
  });

  // ─── TEST 5: Stock Validation Rejects Unconfirmed Stock ─────────────────────
  test('5. Stock Validation: Rejects delivery creation for orders with unconfirmed stock', async () => {
    const res = await request(app)
      .post(`/api/fpo/orders/${unconfirmedOrder.id}/deliveries`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ notes: 'Should fail due to unconfirmed lot' });

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message?.toLowerCase()).toContain('unconfirmed');
  });

  // ─── TEST 6: Duplicate Delivery Prevention ───────────────────────────────────
  test('6. Anti-Duplicate: Rejects creating a second delivery job for the same order', async () => {
    const res = await request(app)
      .post(`/api/fpo/orders/${confirmedOrder.id}/deliveries`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ notes: 'Duplicate delivery request attempt' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message?.toLowerCase()).toContain('already exists');
  });

  // ─── TEST 7: Tenant Isolation & Authorization ───────────────────────────────
  test('7. Tenant Isolation: FPO 2 cannot generate or view deliveries for FPO 1 orders', async () => {
    // Attempt to view delivery plan with FPO 2
    const planRes = await request(app)
      .get(`/api/fpo/orders/${confirmedOrder.id}/delivery-plan`)
      .set('Authorization', `Bearer ${fpo2Token}`);
    expect(planRes.status).toBe(403);

    // Attempt to view delivery tracking with FPO 2
    const delivRes = await request(app)
      .get(`/api/fpo/deliveries/${generatedShipment.id}`)
      .set('Authorization', `Bearer ${fpo2Token}`);
    expect(delivRes.status).toBe(403);
  });

  // ─── TEST 8: FPO Deliveries Dashboard & Metrics ──────────────────────────────
  test('8. GET /api/fpo/deliveries: Returns active deliveries and aggregated expected vs collected kg metrics', async () => {
    const res = await request(app)
      .get('/api/fpo/deliveries')
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBeGreaterThanOrEqual(1);
    expect(data.summary.unassigned).toBeGreaterThanOrEqual(1);
    expect(data.summary.totalExpectedKg).toBeGreaterThanOrEqual(3700);

    const deliveryItem = data.deliveries.find(d => d.id === generatedShipment.id);
    expect(deliveryItem).toBeDefined();
    expect(deliveryItem.status).toBe('UNASSIGNED');
    expect(deliveryItem.pickupStopsCount).toBe(3);
    expect(deliveryItem.progressPercent).toBe(0);
  });

  // ─── TEST 9: Deep Delivery Details ───────────────────────────────────────────
  test('9. GET /api/fpo/deliveries/:id: Returns detailed multi-stop delivery tracking', async () => {
    const res = await request(app)
      .get(`/api/fpo/deliveries/${generatedShipment.trackingNumber}`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const delivery = res.body.data;
    expect(delivery.id).toBe(generatedShipment.id);
    expect(delivery.trackingNumber).toBe(generatedShipment.trackingNumber);
    expect(delivery.expectedQuantityKg).toBe(3700);
    expect(delivery.collectedQuantityKg).toBe(0);
    expect(delivery.stops).toHaveLength(4);
    expect(delivery.buyer.organizationName).toContain('Star Fresh');
  });

  // ─── TEST 10: Pickup Stop Progress (Mark ARRIVED and COMPLETED) ──────────────
  let firstStopId = null;

  test('10. PATCH /api/fpo/deliveries/:id/stops/:stopId: Updates farmer pickup stop to ARRIVED and COMPLETED', async () => {
    firstStopId = generatedShipment.stops[0].id;

    // 1. Mark Arrived
    const arrivedRes = await request(app)
      .patch(`/api/fpo/deliveries/${generatedShipment.id}/stops/${firstStopId}`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ status: 'ARRIVED' });

    expect(arrivedRes.status).toBe(200);
    expect(arrivedRes.body.data.stop.status).toBe('ARRIVED');
    expect(arrivedRes.body.data.stop.arrivedAt).toBeDefined();

    // 2. Mark Completed with collected quantity
    const completedRes = await request(app)
      .patch(`/api/fpo/deliveries/${generatedShipment.id}/stops/${firstStopId}`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        status: 'COMPLETED',
        collectedQuantityKg: 1500,
        proofNotes: '1500 kg Grade A crates inspected and loaded'
      });

    expect(completedRes.status).toBe(200);
    expect(completedRes.body.data.stop.status).toBe('COMPLETED');
    expect(completedRes.body.data.stop.completedAt).toBeDefined();

    // Verify notification was sent to Farmer A upon completion
    const farmerANotifs = await prisma.notification.findMany({
      where: { userId: farmerAUser.id }
    });
    expect(farmerANotifs.some(n => n.title.includes('Produce Collected'))).toBe(true);
  });

  // ─── TEST 11: Multi-Stop State Machine Auto-Advances to TRANSIT ──────────────
  test('11. Multi-Stop State Machine: Automatically transitions shipment to TRANSIT when all pickup stops complete', async () => {
    // Complete stop 2 (Farmer B)
    const stop2Id = generatedShipment.stops[1].id;
    await request(app)
      .patch(`/api/fpo/deliveries/${generatedShipment.id}/stops/${stop2Id}`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ status: 'COMPLETED', collectedQuantityKg: 1200 });

    // Complete stop 3 (Farmer C)
    const stop3Id = generatedShipment.stops[2].id;
    await request(app)
      .patch(`/api/fpo/deliveries/${generatedShipment.id}/stops/${stop3Id}`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({ status: 'COMPLETED', collectedQuantityKg: 1000 });

    // Verify all 3 farmer pickups are completed and shipment advanced to TRANSIT
    const res = await request(app)
      .get(`/api/fpo/deliveries/${generatedShipment.id}`)
      .set('Authorization', `Bearer ${fpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('TRANSIT');
    expect(res.body.data.collectedQuantityKg).toBe(3700);
    expect(res.body.data.progressPercent).toBe(75); // 3 of 4 stops complete
  });

  // ─── TEST 12: Final Destination Delivery Completion ─────────────────────────
  test('12. Final Buyer Delivery: Transitions shipment and order to DELIVERED upon destination completion', async () => {
    const destStopId = generatedShipment.stops[3].id;

    const res = await request(app)
      .patch(`/api/fpo/deliveries/${generatedShipment.id}/stops/${destStopId}`)
      .set('Authorization', `Bearer ${fpoToken}`)
      .send({
        status: 'COMPLETED',
        proofNotes: 'Delivered to Star Fresh Hadapsar Depot. Crates received.'
      });

    expect(res.status).toBe(200);

    // Verify order and shipment are both DELIVERED
    const updatedOrder = await prisma.order.findUnique({
      where: { id: confirmedOrder.id }
    });
    expect(updatedOrder.status).toBe('DELIVERED');

    const updatedShipment = await prisma.shipment.findUnique({
      where: { id: generatedShipment.id }
    });
    expect(updatedShipment.status).toBe('DELIVERED');
    expect(updatedShipment.deliveredAt).toBeDefined();
  });

  // ─── TEST 13: Farmer Pickups Endpoint ────────────────────────────────────────
  test('13. GET /api/farmers/pickups: Farmer A views only their scheduled pickup stop', async () => {
    // Login Farmer A
    const farmerALogin = await request(app)
      .post('/api/auth/login')
      .send({ email: farmerAUser.email, password: 'DemoPass1' });
    const farmerAToken = farmerALogin.body.data.accessToken;

    const res = await request(app)
      .get('/api/farmers/pickups')
      .set('Authorization', `Bearer ${farmerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const farmerAPickup = res.body.data.find(p => p.stopId === firstStopId);
    expect(farmerAPickup).toBeDefined();
    expect(farmerAPickup.expectedQuantityKg).toBe(1500);
    expect(farmerAPickup.status).toBe('COMPLETED');
    expect(farmerAPickup.shipment.cropName).toBe('Tomato');
    expect(farmerAPickup.shipment.trackingNumber).toBe(generatedShipment.trackingNumber);
  });

  // ─── TEST 14: Farmer Privacy ────────────────────────────────────────────────
  test('14. Farmer Privacy: Farmer B cannot see Farmer A or Farmer C stops', async () => {
    // Login Farmer B
    const farmerBLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: farmerBUser.email, password: 'DemoPass1' });
    const farmerBToken = farmerBLogin.body.data.accessToken;

    const res = await request(app)
      .get('/api/farmers/pickups')
      .set('Authorization', `Bearer ${farmerBToken}`);

    expect(res.status).toBe(200);
    const pickups = res.body.data;

    // Must NOT contain Farmer A's stop
    expect(pickups.some(p => p.stopId === firstStopId)).toBe(false);

    // Must contain Farmer B's own stop (1200 kg)
    const myPickup = pickups.find(p => p.expectedQuantityKg === 1200);
    expect(myPickup).toBeDefined();
    expect(myPickup.stopName).toContain('Suresh Bhor');
  });
});
