/**
 * SasyaVahini — Buyer Profile & Account Management Tests (Phase 2)
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';

let buyerUser = null;
let buyerToken = null;
let nonBuyerUser = null;
let nonBuyerToken = null;
let createdAddressId = null;

beforeAll(async () => {
  // Register a test buyer
  const buyerEmail = `test_buyer_${Date.now()}@sasyavahini.test`;
  const buyerPass = 'SecurePassword123!';
  const buyerRes = await request(app).post('/api/auth/register').send({
    name: 'Rajesh Sharma',
    email: buyerEmail,
    phone: `+9198${Math.floor(10000000 + Math.random() * 89999999)}`,
    password: buyerPass,
    role: 'BUYER',
    organizationName: 'Sharma Foods Pvt Ltd',
    buyerType: 'Restaurant',
  });
  buyerUser = buyerRes.body.data.user;

  // Log in as buyer
  const buyerLoginRes = await request(app).post('/api/auth/login').send({
    email: buyerEmail,
    password: buyerPass,
  });
  buyerToken = buyerLoginRes.body.data.accessToken;

  // Register a non-buyer (FARMER) to test role isolation
  const farmerEmail = `test_farmer_rbac_${Date.now()}@sasyavahini.test`;
  const farmerPass = 'SecurePassword123!';
  const farmerRes = await request(app).post('/api/auth/register').send({
    name: 'Suresh Patil',
    email: farmerEmail,
    phone: `+9197${Math.floor(10000000 + Math.random() * 89999999)}`,
    password: farmerPass,
    role: 'FARMER',
    landSizeAcres: 5,
    state: 'Maharashtra',
    district: 'Pune',
  });
  nonBuyerUser = farmerRes.body.data.user;

  // Log in as farmer
  const farmerLoginRes = await request(app).post('/api/auth/login').send({
    email: farmerEmail,
    password: farmerPass,
  });
  nonBuyerToken = farmerLoginRes.body.data.accessToken;
});

afterAll(async () => {
  // Cleanup test users
  if (buyerUser?.id) {
    await prisma.user.delete({ where: { id: buyerUser.id } }).catch(() => {});
  }
  if (nonBuyerUser?.id) {
    await prisma.user.delete({ where: { id: nonBuyerUser.id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('Buyer Phase 2: Profile & Account Management API', () => {
  // ── Authorization checks ──────────────────────────────────────────────────
  describe('RBAC & Authentication Checks', () => {
    it('rejects unauthenticated requests to /api/buyer/profile with 401', async () => {
      const res = await request(app).get('/api/buyer/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-BUYER roles from /api/buyer/profile with 403', async () => {
      const res = await request(app)
        .get('/api/buyer/profile')
        .set('Authorization', `Bearer ${nonBuyerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Profile Endpoints ─────────────────────────────────────────────────────
  describe('GET /api/buyer/profile', () => {
    it('returns buyer profile with completion score and checklist', async () => {
      const res = await request(app)
        .get('/api/buyer/profile')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('profile');
      expect(res.body.data).toHaveProperty('completionPercentage');
      expect(typeof res.body.data.completionPercentage).toBe('number');
      expect(res.body.data.profile.buyerType).toBe('Restaurant');
    });
  });

  describe('PATCH /api/buyer/profile', () => {
    it('updates permitted profile fields and recalculates completion', async () => {
      const res = await request(app)
        .patch('/api/buyer/profile')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          name: 'Rajesh V. Sharma',
          contactPerson: 'Vikram Sharma',
          deliveryState: 'Maharashtra',
          deliveryDistrict: 'Pune',
          deliveryAddress: 'Plot 45, MIDC Bhosari',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Rajesh V. Sharma');
      expect(res.body.data.profile.contactPerson).toBe('Vikram Sharma');
      expect(res.body.data.profile.deliveryAddress).toBe('Plot 45, MIDC Bhosari');
    });

    it('validates GSTIN format when provided', async () => {
      const res = await request(app)
        .patch('/api/buyer/profile')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          gstNumber: 'INVALID_GSTIN_123',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Address Endpoints ────────────────────────────────────────────────────
  describe('Address Management (/api/buyer/addresses)', () => {
    it('creates a new delivery address and makes first address default', async () => {
      const res = await request(app)
        .post('/api/buyer/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          recipientName: 'Rajesh Sharma',
          contactNumber: '+919876543210',
          addressType: 'BUSINESS',
          addressLine1: 'Warehouse 12, Agro Logistics Park',
          addressLine2: 'Phase 2 Industrial Area',
          locality: 'Hadapsar',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411028',
          deliveryInstructions: 'Enter through Gate 3, call security on arrival.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.isDefault).toBe(true);
      expect(res.body.data.city).toBe('Pune');

      createdAddressId = res.body.data.id;
    });

    it('retrieves all saved addresses for the authenticated buyer', async () => {
      const res = await request(app)
        .get('/api/buyer/addresses')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('adds a second address and respects default toggle', async () => {
      const res = await request(app)
        .post('/api/buyer/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          recipientName: 'Vikram Sharma',
          contactNumber: '+919812345678',
          addressType: 'BILLING',
          addressLine1: 'Head Office, Commercial Tower A',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isDefault).toBe(true);

      // Verify the previous address is no longer default
      const prevCheck = await request(app)
        .get('/api/buyer/addresses')
        .set('Authorization', `Bearer ${buyerToken}`);

      const firstAddr = prevCheck.body.data.find((a) => a.id === createdAddressId);
      expect(firstAddr.isDefault).toBe(false);
    });

    it('sets an address back to default via /:id/default', async () => {
      const res = await request(app)
        .patch(`/api/buyer/addresses/${createdAddressId}/default`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDefault).toBe(true);
    });
  });

  // ── Account Settings & Preferences ────────────────────────────────────────
  describe('Account Settings (/api/buyer/settings)', () => {
    it('retrieves account status and notification preferences', async () => {
      const res = await request(app)
        .get('/api/buyer/settings')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('account');
      expect(res.body.data).toHaveProperty('preferences');
      expect(res.body.data.preferences.notificationPreferences).toHaveProperty('orderUpdates');
    });

    it('updates preferred locale and notification toggles', async () => {
      const res = await request(app)
        .patch('/api/buyer/settings')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          preferredLocale: 'hi',
          notificationPreferences: {
            priceDrops: true,
            smsEnabled: false,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preferredLocale).toBe('hi');
      expect(res.body.data.notificationPreferences.priceDrops).toBe(true);
      expect(res.body.data.notificationPreferences.smsEnabled).toBe(false);
    });
  });

  // ── Password Change ───────────────────────────────────────────────────────
  describe('Security & Password Change (/api/buyer/change-password)', () => {
    it('rejects incorrect current password with 401', async () => {
      const res = await request(app)
        .post('/api/buyer/change-password')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'BrandNewPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects new password if it is identical to current password', async () => {
      const res = await request(app)
        .post('/api/buyer/change-password')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'SecurePassword123!',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('successfully changes password with valid current password', async () => {
      const res = await request(app)
        .post('/api/buyer/change-password')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'BrandNewSecurePass456#',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login with new password works
      const loginCheck = await request(app).post('/api/auth/login').send({
        email: buyerUser.email,
        password: 'BrandNewSecurePass456#',
      });
      expect(loginCheck.status).toBe(200);
      expect(loginCheck.body.success).toBe(true);
    });
  });
});
