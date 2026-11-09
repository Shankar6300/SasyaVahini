/**
 * Imports the supplied synthetic logistics dataset into PostgreSQL.
 *
 * Source: ./logistics-mock-data.json
 * The records are temporary demo data and can be replaced by the farmer and
 * buyer modules without changing the logistics relationships.
 */

require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
  override: true,
});

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'logistics-mock-data.json'), 'utf8'));
const passwordHash = bcrypt.hashSync('DemoPass1', 12);
const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

const gradeMap = { A: 'GRADE_A', B: 'GRADE_B', C: 'GRADE_C' };
const cropCategory = (crop) => (crop === 'Potato' || crop === 'Onion' || crop === 'Tomato' || crop === 'Green Chilli'
  ? 'Vegetables'
  : 'Other');
const safeEmail = (id, role) => `${id}.${role.toLowerCase()}@dataset.sasyavahini.in`;

async function importFarmers() {
  const profiles = new Map();

  for (const farmer of data.farmers) {
    const user = await prisma.user.upsert({
      where: { email: safeEmail(farmer.id, 'farmer') },
      update: {
        name: farmer.name,
        phone: farmer.phone,
        status: 'ACTIVE',
        isEmailVerified: true,
        isPhoneVerified: farmer.kycVerified,
      },
      create: {
        email: safeEmail(farmer.id, 'farmer'),
        phone: farmer.phone,
        passwordHash,
        name: farmer.name,
        role: 'FARMER',
        status: 'ACTIVE',
        isEmailVerified: true,
        isPhoneVerified: farmer.kycVerified,
      },
    });

    const listing = data.listings.find((item) => item.farmerId === farmer.id);
    const profile = await prisma.farmerProfile.upsert({
      where: { userId: user.id },
      update: {
        village: farmer.village,
        latitude: listing?.latitude,
        longitude: listing?.longitude,
        produceTypes: listing ? [listing.crop] : [],
      },
      create: {
        userId: user.id,
        landSizeAcres: 2,
        produceTypes: listing ? [listing.crop] : [],
        state: 'Maharashtra',
        district: 'Pune',
        village: farmer.village,
        latitude: listing?.latitude,
        longitude: listing?.longitude,
        aadhaarVerified: farmer.kycVerified,
        bankAccountVerified: farmer.kycVerified,
      },
    });

    profiles.set(farmer.id, profile);
  }

  return profiles;
}

async function importListings(profiles) {
  for (const listing of data.listings) {
    const farmer = profiles.get(listing.farmerId);
    if (!farmer) throw new Error(`Missing farmer for listing ${listing.id}`);

    await prisma.produceListing.upsert({
      where: { id: `dataset-${listing.id}` },
      update: {
        farmerId: farmer.id,
        cropName: listing.crop,
        qualityGrade: gradeMap[listing.grade] || 'GRADE_B',
        totalQuantityKg: listing.totalKg,
        reservedQty: listing.reservedKg || 0,
        soldQty: listing.soldKg || 0,
        askingPricePerKg: listing.askingPricePerKg,
        minPricePerKg: listing.minPricePerKg,
        latitude: listing.latitude,
        longitude: listing.longitude,
        village: listing.locationName,
        status: listing.status === 'ACTIVE' ? 'AVAILABLE' : 'EXPIRED',
      },
      create: {
        id: `dataset-${listing.id}`,
        farmerId: farmer.id,
        cropName: listing.crop,
        category: cropCategory(listing.crop),
        qualityGrade: gradeMap[listing.grade] || 'GRADE_B',
        totalQuantityKg: listing.totalKg,
        reservedQty: listing.reservedKg || 0,
        soldQty: listing.soldKg || 0,
        askingPricePerKg: listing.askingPricePerKg,
        minPricePerKg: listing.minPricePerKg,
        harvestDate: new Date(listing.harvestDate),
        state: 'Maharashtra',
        district: 'Pune',
        village: listing.locationName,
        latitude: listing.latitude,
        longitude: listing.longitude,
        description: `[DATASET] ${listing.tag || 'Synthetic logistics listing'}`,
        status: listing.status === 'ACTIVE' ? 'AVAILABLE' : 'EXPIRED',
      },
    });
  }
}

async function importBuyers() {
  const profiles = new Map();

  for (const buyer of data.buyers) {
    const user = await prisma.user.upsert({
      where: { email: safeEmail(buyer.id, 'buyer') },
      update: { name: buyer.name, phone: buyer.phone, status: 'ACTIVE' },
      create: {
        email: safeEmail(buyer.id, 'buyer'),
        phone: buyer.phone,
        passwordHash,
        name: buyer.name,
        role: 'BUYER',
        status: 'ACTIVE',
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    const profile = await prisma.buyerProfile.upsert({
      where: { userId: user.id },
      update: {
        organizationName: buyer.name,
        buyerType: buyer.type,
        deliveryAddress: buyer.address,
        latitude: buyer.latitude,
        longitude: buyer.longitude,
      },
      create: {
        userId: user.id,
        organizationName: buyer.name,
        buyerType: buyer.type,
        deliveryState: 'Maharashtra',
        deliveryDistrict: buyer.id === 'buyer_005' ? 'Mumbai' : 'Pune',
        deliveryAddress: buyer.address,
        latitude: buyer.latitude,
        longitude: buyer.longitude,
      },
    });

    profiles.set(buyer.id, profile);
  }

  return profiles;
}

async function createScenarioRoute(profiles, farmerProfiles, logistics) {
  const scenario = data.scenarios.find((item) => item.id === 'S2');
  const buyer = profiles.get(scenario.buyerId);
  const candidates = data.listings
    .filter((listing) => listing.crop === scenario.crop && listing.status === 'ACTIVE')
    .filter((listing) => listing.grade === 'A' || listing.grade === scenario.minGrade)
    .filter((listing) => {
      const farmer = data.farmers.find((item) => item.id === listing.farmerId);
      return farmer && farmer.reliability >= scenario.minReliability;
    });

  let remaining = scenario.qtyKg;
  const selected = [];
  for (const listing of candidates) {
    if (remaining <= 0) break;
    const quantityKg = Math.min(remaining, listing.availableKg);
    selected.push({ ...listing, quantityKg });
    remaining -= quantityKg;
  }
  if (remaining > 0) throw new Error(`Scenario ${scenario.id} does not have enough stock`);

  const vehicle = await prisma.vehicle.findFirst({
    where: { logisticsId: logistics.id, capacityKg: { gte: scenario.qtyKg } },
    orderBy: { capacityKg: 'asc' },
  });
  if (!vehicle) throw new Error('No seeded vehicle can carry the scenario quantity');

  const requirement = await prisma.buyerRequirement.upsert({
    where: { id: 'dataset-scenario-S2-requirement' },
    update: { buyerId: buyer.id, quantityKg: scenario.qtyKg, status: 'FULLY_MATCHED' },
    create: {
      id: 'dataset-scenario-S2-requirement',
      buyerId: buyer.id,
      cropName: scenario.crop,
      quantityKg: scenario.qtyKg,
      maxPricePerKg: scenario.maxBudget / scenario.qtyKg,
      requiredByDate: tomorrow,
      qualityGrade: gradeMap[scenario.minGrade],
      deliveryState: 'Maharashtra',
      deliveryDistrict: 'Pune',
      deliveryAddress: data.buyers.find((item) => item.id === scenario.buyerId).address,
      latitude: buyer.latitude,
      longitude: buyer.longitude,
      notes: `[DATASET SCENARIO ${scenario.id}] ${scenario.name}`,
      status: 'FULLY_MATCHED',
    },
  });

  const order = await prisma.order.upsert({
    where: { orderNumber: 'SV-DATASET-S2-001' },
    update: { buyerId: buyer.id, requirementId: requirement.id, status: 'IN_TRANSIT' },
    create: {
      id: 'dataset-scenario-S2-order',
      buyerId: buyer.id,
      requirementId: requirement.id,
      orderNumber: 'SV-DATASET-S2-001',
      totalQuantityKg: scenario.qtyKg,
      agreedPriceTotal: selected.reduce((sum, item) => sum + item.quantityKg * item.askingPricePerKg, 0),
      status: 'IN_TRANSIT',
      deliveryAddress: data.buyers.find((item) => item.id === scenario.buyerId).address,
      deliveryLatitude: buyer.latitude,
      deliveryLongitude: buyer.longitude,
      scheduledDelivery: tomorrow,
      notes: `[DATASET SCENARIO ${scenario.id}] ${scenario.name}`,
    },
  });

  const routeGeometry = {
    type: 'LineString',
    coordinates: selected.map((item) => [item.longitude, item.latitude]).concat([[buyer.longitude, buyer.latitude]]),
  };

  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { status: 'IN_TRANSIT', currentLatitude: selected[0].latitude, currentLongitude: selected[0].longitude, lastLocationAt: now },
  });

  await prisma.shipment.upsert({
    where: { trackingNumber: 'SV-DATASET-S2-001' },
    update: {
      orderId: order.id,
      vehicleId: vehicle.id,
      logisticsId: logistics.id,
      status: 'TRANSIT',
      totalWeightKg: scenario.qtyKg,
      totalDistanceKm: 96,
      baselineDistanceKm: 165,
      savedDistanceKm: 69,
      estimatedFuelSavedRs: 1638.75,
      utilizationPercent: Math.round((scenario.qtyKg / vehicle.capacityKg) * 1000) / 10,
      estimatedMinutes: 135,
      routeGeometryJson: routeGeometry,
      stops: {
        deleteMany: {},
        create: selected.map((item, index) => ({
          stopType: 'PICKUP',
          sequence: index + 1,
          farmerId: farmerProfiles.get(item.farmerId).id,
          listingId: `dataset-${item.id}`,
          stopName: `${data.farmers.find((farmer) => farmer.id === item.farmerId).name} (${item.locationName})`,
          address: `${item.locationName}, Pune, Maharashtra`,
          latitude: item.latitude,
          longitude: item.longitude,
          quantityKg: item.quantityKg,
          status: 'COMPLETED',
          completedAt: new Date(now.getTime() - (selected.length - index) * 30 * 60 * 1000),
        })).concat([{
          stopType: 'DELIVERY',
          sequence: selected.length + 1,
          stopName: data.buyers.find((item) => item.id === scenario.buyerId).name,
          address: data.buyers.find((item) => item.id === scenario.buyerId).address,
          latitude: buyer.latitude,
          longitude: buyer.longitude,
          quantityKg: scenario.qtyKg,
          status: 'PENDING',
        }]),
      },
    },
    create: {
      id: 'dataset-scenario-S2-shipment',
      trackingNumber: 'SV-DATASET-S2-001',
      orderId: order.id,
      vehicleId: vehicle.id,
      logisticsId: logistics.id,
      status: 'TRANSIT',
      deliveryOtp: '492810',
      totalWeightKg: scenario.qtyKg,
      totalDistanceKm: 96,
      baselineDistanceKm: 165,
      savedDistanceKm: 69,
      estimatedFuelSavedRs: 1638.75,
      utilizationPercent: Math.round((scenario.qtyKg / vehicle.capacityKg) * 1000) / 10,
      estimatedMinutes: 135,
      routeGeometryJson: routeGeometry,
      scheduledPickupAt: now,
      stops: {
        create: selected.map((item, index) => ({
          stopType: 'PICKUP',
          sequence: index + 1,
          farmerId: farmerProfiles.get(item.farmerId).id,
          listingId: `dataset-${item.id}`,
          stopName: `${data.farmers.find((farmer) => farmer.id === item.farmerId).name} (${item.locationName})`,
          address: `${item.locationName}, Pune, Maharashtra`,
          latitude: item.latitude,
          longitude: item.longitude,
          quantityKg: item.quantityKg,
          status: 'COMPLETED',
        })).concat([{
          stopType: 'DELIVERY',
          sequence: selected.length + 1,
          stopName: data.buyers.find((item) => item.id === scenario.buyerId).name,
          address: data.buyers.find((item) => item.id === scenario.buyerId).address,
          latitude: buyer.latitude,
          longitude: buyer.longitude,
          quantityKg: scenario.qtyKg,
          status: 'PENDING',
        }]),
      },
    },
  });

  return { scenario, selected, trackingNumber: 'SV-DATASET-S2-001' };
}

async function main() {
  const oldShipment = await prisma.shipment.findUnique({ where: { trackingNumber: 'SV-DEMO-ROUTE-001' } });
  if (oldShipment) {
    await prisma.shipment.delete({ where: { id: oldShipment.id } });
  }
  await prisma.order.deleteMany({ where: { orderNumber: 'SV-DEMO-ROUTE-001' } });
  await prisma.buyerRequirement.deleteMany({ where: { id: 'demo-logistics-requirement-001' } });
  await prisma.produceListing.deleteMany({ where: { id: { startsWith: 'demo-logistics-listing-' } } });

  const farmerProfiles = await importFarmers();
  await importListings(farmerProfiles);
  const buyers = await importBuyers();
  const logistics = await prisma.logisticsProfile.findFirstOrThrow();
  const route = await createScenarioRoute(buyers, farmerProfiles, logistics);

  console.log(`Imported ${data.farmers.length} farmers, ${data.listings.length} listings, ${data.buyers.length} buyers.`);
  console.log(`Active dataset route: ${route.trackingNumber} (${route.scenario.crop}, ${route.scenario.qtyKg} kg, ${route.selected.length} pickup stops).`);
}

main()
  .catch((error) => {
    console.error('Dataset import failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
