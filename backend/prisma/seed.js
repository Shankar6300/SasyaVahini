/**
 * SasyaVahini — Database Seed Script
 *
 * Creates clearly labeled DEMO data for development and testing.
 * All data is marked as simulation — do not use as real market data.
 *
 * Run: npm run db:seed (inside backend/)
 *
 * Owner: Member 1
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'DemoPass1'; // All demo accounts share this password

async function hashPw(pw) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log('🌱 SasyaVahini Seed — DEMO data only. Not real market data.\n');

  // ─── Admin ────────────────────────────────────────────────────────────────
  const adminPw = await hashPw(DEMO_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.sasyavahini.in' },
    update: {},
    create: {
      name: 'Dr. Priya Sharma',
      email: 'admin@demo.sasyavahini.in',
      phone: '+919800000001',
      passwordHash: adminPw,
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      adminProfile: {
        create: { department: 'DoCA', designation: 'Senior Officer' },
      },
    },
  });

  // ─── Farmer ───────────────────────────────────────────────────────────────
  const farmerPw = await hashPw(DEMO_PASSWORD);
  const farmer = await prisma.user.upsert({
    where: { email: 'farmer@demo.sasyavahini.in' },
    update: {},
    create: {
      name: 'Ramesh Kulkarni',
      email: 'farmer@demo.sasyavahini.in',
      phone: '+919800000002',
      passwordHash: farmerPw,
      role: 'FARMER',
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      farmerProfile: {
        create: {
          state: 'Maharashtra',
          district: 'Pune',
          village: 'Manchar',
          latitude: 18.8226,
          longitude: 73.9233,
          landSizeAcres: 3.5,
          produceTypes: ['Tomato', 'Onion', 'Potato'],
          aadhaarVerified: true,
          bankAccountVerified: true,
        },
      },
    },
  });

  // ─── FPO ──────────────────────────────────────────────────────────────────
  const fpoPw = await hashPw(DEMO_PASSWORD);
  const fpo = await prisma.user.upsert({
    where: { email: 'fpo@demo.sasyavahini.in' },
    update: {},
    create: {
      name: 'Pune Sahakari Krishi FPO',
      email: 'fpo@demo.sasyavahini.in',
      phone: '+919800000003',
      passwordHash: fpoPw,
      role: 'FPO',
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      fpoProfile: {
        create: {
          fpoName: 'Pune Sahakari Krishi Producer Company',
          registrationNo: 'MH-FPC-2023-001',
          memberCount: 35,
          state: 'Maharashtra',
          district: 'Pune',
          registrationCertVerified: true,
        },
      },
    },
  });

  // ─── Buyer ────────────────────────────────────────────────────────────────
  const buyerPw = await hashPw(DEMO_PASSWORD);
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@demo.sasyavahini.in' },
    update: {},
    create: {
      name: 'FreshBasket Supermarkets',
      email: 'buyer@demo.sasyavahini.in',
      phone: '+919800000004',
      passwordHash: buyerPw,
      role: 'BUYER',
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      buyerProfile: {
        create: {
          organizationName: 'FreshBasket Supermarkets India Pvt. Ltd.',
          buyerType: 'Supermarket',
          gstNumber: '27AABCF1234G1Z5',
          deliveryState: 'Maharashtra',
          deliveryDistrict: 'Pune',
        },
      },
    },
  });

  // ─── Logistics ────────────────────────────────────────────────────────────
  const logisticsPw = await hashPw(DEMO_PASSWORD);
  const logistics = await prisma.user.upsert({
    where: { email: 'logistics@demo.sasyavahini.in' },
    update: {},
    create: {
      name: 'SasyaVahini Express Fleet',
      email: 'logistics@demo.sasyavahini.in',
      phone: '+919800000005',
      passwordHash: logisticsPw,
      role: 'LOGISTICS',
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      logisticsProfile: {
        create: {
          companyName: 'SasyaVahini Express Logistics',
          licenseNo: 'MH-TRP-2023-0042',
          serviceStates: ['Maharashtra'],
          serviceDistricts: ['Pune', 'Nashik', 'Satara'],
          licenseVerified: true,
        },
      },
    },
  });

  // ─── Demo produce listing ────────────────────────────────────────────────
  const farmerProfile = await prisma.farmerProfile.findUnique({ where: { userId: farmer.id } });
  if (farmerProfile) {
    await prisma.produceListing.upsert({
      where: { id: 'seed-listing-tomato-001' },
      update: {},
      create: {
        id: 'seed-listing-tomato-001',
        farmerId: farmerProfile.id,
        cropName: 'Tomato',
        category: 'Vegetables',
        qualityGrade: 'GRADE_A',
        totalQuantityKg: 2000,
        askingPricePerKg: 24,
        minPricePerKg: 18,
        harvestDate: new Date('2026-11-01'),
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Manchar',
        latitude: 18.8226,
        longitude: 73.9233,
        description: '[DEMO DATA] Fresh Grade A tomatoes. Not a real listing.',
      },
    });
  }

  console.log('\n✅ Demo seed complete. All data is clearly labeled simulation data.\n');
  console.log('Demo credentials (password for all: DemoPass1)');
  console.log('  Admin:     admin@demo.sasyavahini.in');
  console.log('  Farmer:    farmer@demo.sasyavahini.in');
  console.log('  FPO:       fpo@demo.sasyavahini.in');
  console.log('  Buyer:     buyer@demo.sasyavahini.in');
  console.log('  Logistics: logistics@demo.sasyavahini.in');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
