/**
 * SasyaVahini — Logistics Fleet Seed Data
 *
 * Seeds 10 Pune Agricultural Zone fleet vehicles and hubs.
 * Exports: seedLogistics(prisma)
 *
 * Owner: Member 4
 */

const PUNE_FLEET = [
  {
    vehicleNumber: 'MH-12-QX-4012',
    vehicleType: 'Mini-Truck',
    capacityKg: 2500,
    driverName: 'Shivaji Mane',
    driverPhone: '+919822014012',
    currentLatitude: 18.7606,
    currentLongitude: 73.8636,
    hubName: 'Chakan Hub',
  },
  {
    vehicleNumber: 'MH-12-VT-8819',
    vehicleType: 'Mini-Truck',
    capacityKg: 3500,
    driverName: 'Deepak Shinde',
    driverPhone: '+919822018819',
    currentLatitude: 19.1170,
    currentLongitude: 73.9780,
    hubName: 'Narayangaon Hub',
  },
  {
    vehicleNumber: 'MH-14-GH-1290',
    vehicleType: 'Tempo',
    capacityKg: 1500,
    driverName: 'Amol Borade',
    driverPhone: '+919822011290',
    currentLatitude: 18.5089,
    currentLongitude: 73.9260,
    hubName: 'Hadapsar Hub',
  },
  {
    vehicleNumber: 'MH-12-RT-6712',
    vehicleType: 'Truck',
    capacityKg: 5000,
    driverName: 'Sunil Jadhav',
    driverPhone: '+919822016712',
    currentLatitude: 18.9880,
    currentLongitude: 73.9400,
    hubName: 'Manchar Hub',
  },
  {
    vehicleNumber: 'MH-12-PL-3310',
    vehicleType: 'Tempo',
    capacityKg: 2000,
    driverName: 'Ganesh Shelke',
    driverPhone: '+919822013310',
    currentLatitude: 19.2064,
    currentLongitude: 73.8765,
    hubName: 'Junnar Hub',
  },
  {
    vehicleNumber: 'MH-14-ZX-5541',
    vehicleType: 'Refrigerated',
    capacityKg: 4000,
    driverName: 'Rahul Sawant',
    driverPhone: '+919822015541',
    currentLatitude: 18.1517,
    currentLongitude: 74.5775,
    hubName: 'Baramati Hub',
  },
  {
    vehicleNumber: 'MH-12-KP-9901',
    vehicleType: 'Tempo',
    capacityKg: 1800,
    driverName: 'Pandurang Kale',
    driverPhone: '+919822019901',
    currentLatitude: 18.8470,
    currentLongitude: 73.9100,
    hubName: 'Khed Hub',
  },
  {
    vehicleNumber: 'MH-12-BN-2234',
    vehicleType: 'Mini-Truck',
    capacityKg: 3000,
    driverName: 'Vikas Kadam',
    driverPhone: '+919822012234',
    currentLatitude: 18.7650,
    currentLongitude: 73.8550,
    hubName: 'Chakan Depot',
  },
  {
    vehicleNumber: 'MH-14-EE-7712',
    vehicleType: 'Truck',
    capacityKg: 6000,
    driverName: 'Sanjay Thorat',
    driverPhone: '+919822017712',
    currentLatitude: 18.6270,
    currentLongitude: 73.8470,
    hubName: 'Bhosari Fleet Hub',
  },
  {
    vehicleNumber: 'MH-12-LL-1092',
    vehicleType: 'Mini-Truck',
    capacityKg: 2500,
    driverName: 'Sachin Patil',
    driverPhone: '+919822011092',
    currentLatitude: 18.8270,
    currentLongitude: 74.3780,
    hubName: 'Shirur Depot',
  },
];

/**
 * Seed 10 Pune Agricultural Zone fleet vehicles
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function seedLogistics(prisma) {
  console.log('🚚 Seeding Logistics Fleet (Pune Agricultural Zone)...');

  // Find or create logistics provider profile
  let logisticsProfile = await prisma.logisticsProfile.findFirst();

  if (!logisticsProfile) {
    const defaultUser = await prisma.user.findFirst({ where: { role: 'LOGISTICS' } });
    if (defaultUser) {
      logisticsProfile = await prisma.logisticsProfile.create({
        data: {
          userId: defaultUser.id,
          companyName: 'SasyaVahini Express Fleet Pune',
          licenseNo: 'MH-TRP-2026-PUNE01',
          serviceStates: ['Maharashtra'],
          serviceDistricts: ['Pune', 'Satara', 'Ahmednagar', 'Nashik'],
          licenseVerified: true,
        },
      });
    }
  }

  if (!logisticsProfile) {
    console.warn('⚠️ No logistics profile found. Skipping DB vehicle insert.');
    return;
  }

  for (const veh of PUNE_FLEET) {
    await prisma.vehicle.upsert({
      where: { vehicleNumber: veh.vehicleNumber },
      update: {
        capacityKg: veh.capacityKg,
        driverName: veh.driverName,
        driverPhone: veh.driverPhone,
        currentLatitude: veh.currentLatitude,
        currentLongitude: veh.currentLongitude,
        status: 'AVAILABLE',
      },
      create: {
        logisticsId: logisticsProfile.id,
        vehicleNumber: veh.vehicleNumber,
        vehicleType: veh.vehicleType,
        capacityKg: veh.capacityKg,
        driverName: veh.driverName,
        driverPhone: veh.driverPhone,
        status: 'AVAILABLE',
        currentLatitude: veh.currentLatitude,
        currentLongitude: veh.currentLongitude,
        lastLocationAt: new Date(),
        rcVerified: true,
        insuranceVerified: true,
      },
    });
  }

  console.log(`✅ Seeded ${PUNE_FLEET.length} vehicles across Pune hubs (Chakan, Manchar, Junnar, etc.).\n`);
}

module.exports = {
  seedLogistics,
  PUNE_FLEET,
};
