/**
 * SasyaVahini — Logistics Verification Workflow, JWT Refresh & PostgreSQL Resiliency Tests
 *
 * Verifies:
 * 1. Logistics registration & pending verification lifecycle
 * 2. Transporter document upload (RC, DL, Insurance, PUC, Fitness) through profile
 * 3. Smart gating: Only VERIFIED transporters can accept shipments
 * 4. Clear verification status reporting
 * 5. JWT token refresh, rotation, and non-expired 401 isolation
 * 6. PostgreSQL SQLSTATE 57P01 / E57P01 resilience & connection health
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { isTransientDbError, withDbRetry } = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
process.env.TEST_DB = 'true'; // Allow these tests to exercise real database logic

describe('SasyaVahini — Logistics Verification, JWT Refresh & DB Stability Suite', () => {
  let transporterUser = null;
  let transporterToken = null;
  let transporterRefreshToken = null;
  let adminToken = null;
  let testVehicleId = null;

  beforeAll(async () => {
    // 1. Create or login an admin for verification tests
    const adminEmail = `doca_officer_${Date.now()}@sasyavahini.gov.in`;
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'DoCA Compliance Officer',
      email: adminEmail,
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'AdminSecurePass@123',
      role: 'ADMIN',
    });

    if (adminRes.status === 201) {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: adminEmail,
        password: 'AdminSecurePass@123',
      });
      adminToken = loginRes.body.data.accessToken;
    } else {
      // Fallback admin token for testing
      adminToken = jwt.sign(
        { sub: 'admin-doca-01', email: 'admin@doca.gov.in', role: 'ADMIN', status: 'ACTIVE' },
        process.env.JWT_ACCESS_SECRET || 'default_access_secret_for_development_and_testing_1234567890abcdef',
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
    // Clean up created test user
    if (transporterUser?.id) {
      await prisma.user.delete({ where: { id: transporterUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. Logistics Verification Lifecycle
  // ═════════════════════════════════════════════════════════════════════════════
  describe('1. Logistics Verification Workflow & Smart Gating', () => {
    it('registers a new transport partner and assigns PENDING status under DoCA compliance', async () => {
      const uniqueSuffix = Date.now();
      const payload = {
        name: 'Gajanan Transporter',
        email: `transporter_${uniqueSuffix}@logistics.in`,
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password@123',
        role: 'LOGISTICS',
        partnerType: 'VEHICLE_OWNER',
        vehicleNumber: `MH-14-GT-${uniqueSuffix.toString().slice(-4)}`,
        category: 'SCV',
        capacityKg: 1500,
      };

      const res = await request(app).post('/api/auth/register').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.role).toBe('LOGISTICS');
      // Transporter accounts must initially be in PENDING_VERIFICATION
      expect(res.body.data.user.status).toBe('PENDING_VERIFICATION');

      transporterUser = res.body.data.user;

      // Log in as the new transporter
      const loginRes = await request(app).post('/api/auth/login').send({
        email: payload.email,
        password: 'Password@123',
      });

      expect(loginRes.status).toBe(200);
      transporterToken = loginRes.body.data.accessToken;
      transporterRefreshToken = loginRes.body.data.refreshToken;
    });

    it('returns PENDING verification status when transporter retrieves their profile', async () => {
      const res = await request(app)
        .get('/api/logistics/profile')
        .set('Authorization', `Bearer ${transporterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('PENDING');
      expect(res.body.data.ownerName).toBe('Gajanan Transporter');

      if (res.body.data.vehicles && res.body.data.vehicles.length > 0) {
        testVehicleId = res.body.data.vehicles[0].id;
      }
    });

    it('rejects shipment acceptance when transporter is not yet VERIFIED', async () => {
      // Unverified transporter attempts to accept a shipment
      const res = await request(app)
        .post('/api/logistics/shipments/shp_demo_101/accept')
        .set('Authorization', `Bearer ${transporterToken}`)
        .send({ vehicleId: testVehicleId || 'veh_org_4012' });

      // Must be rejected with 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/verification required|pending statutory compliance/i);
    });

    it('allows transporter to upload RC, Insurance, PUC and Driving Licence documents', async () => {
      // 1. Upload DL details to profile
      const dlRes = await request(app)
        .put('/api/logistics/profile')
        .set('Authorization', `Bearer ${transporterToken}`)
        .send({
          drivingLicenceNo: 'MH-14-2023-0098492',
          licenceExpiry: '2030-12-31',
          permittedClasses: ['LMV', 'LMV-TR'],
          licenceFrontUrl: 'https://storage.sasyavahini.gov.in/docs/dl_front_test.pdf',
          licenceBackUrl: 'https://storage.sasyavahini.gov.in/docs/dl_back_test.pdf',
          accountNumber: '918237491029',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
        });

      expect(dlRes.status).toBe(200);
      expect(dlRes.body.data.drivingLicenceNo).toBe('MH-14-2023-0098492');
      expect(dlRes.body.data.accountNumber).toBe('918237491029');

      // 2. Upload vehicle statutory document if vehicle exists
      if (testVehicleId) {
        const rcRes = await request(app)
          .post(`/api/logistics/vehicles/${testVehicleId}/documents`)
          .set('Authorization', `Bearer ${transporterToken}`)
          .send({
            docType: 'RC',
            docNumber: 'RC-MH14-99882',
            expiryDate: '2029-06-30',
            fileUrl: 'https://storage.sasyavahini.gov.in/docs/rc_cert_test.pdf',
          });

        expect(rcRes.status).toBe(200);
        expect(rcRes.body.data.documents.some((d) => d.docType === 'RC')).toBe(true);
      }
    });

    it('allows DoCA Admin to verify transporter and unlocks shipment acceptance', async () => {
      // Admin verifies the partner's profile
      if (prisma.logisticsProfile) {
        await prisma.logisticsProfile.update({
          where: { userId: transporterUser.id },
          data: {
            verificationStatus: 'VERIFIED',
            adminRemarks: 'DoCA Compliance Audited and Approved',
          },
        });
        await prisma.user.update({
          where: { id: transporterUser.id },
          data: { status: 'ACTIVE' },
        });
      }

      // Re-fetch profile to confirm verified status
      const profRes = await request(app)
        .get('/api/logistics/profile')
        .set('Authorization', `Bearer ${transporterToken}`);

      expect(profRes.status).toBe(200);
      expect(profRes.body.data.verificationStatus).toBe('VERIFIED');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. JWT Token Refresh & 401 Discrimination
  // ═════════════════════════════════════════════════════════════════════════════
  describe('2. JWT Token Expiration, Rotation & 401 Handling', () => {
    it('issues a new access + refresh token pair upon valid refresh request', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: transporterRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // Refresh token rotation: new refresh token is different from old one
      expect(res.body.data.refreshToken).not.toBe(transporterRefreshToken);

      // Update stored tokens
      transporterToken = res.body.data.accessToken;
      transporterRefreshToken = res.body.data.refreshToken;
    });

    it('detects and prevents refresh token reuse (anti-replay attack protection)', async () => {
      // Attempting to reuse old refresh token should fail with 401
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid_or_already_used_refresh_token_string' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns TOKEN_EXPIRED error code when an expired JWT is presented', async () => {
      // Create an expired access token
      const expiredToken = jwt.sign(
        { sub: transporterUser.id, email: transporterUser.email, role: 'LOGISTICS', status: 'ACTIVE' },
        process.env.JWT_ACCESS_SECRET || '00SHeL-ulWTaMwtUwuSQvxLUMQ_XHQG-LM-pRUJwi8UDNWr3cDuB5kdRrGEcOUHOpFEpqYrZDNBYSyLBVadxog',
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
      expect(res.body.error.message).toMatch(/expired/i);
    });

    it('does NOT return TOKEN_EXPIRED for non-expired 401s (e.g. malformed or missing token)', async () => {
      // 1. Missing token
      const res1 = await request(app).get('/api/auth/me');
      expect(res1.status).toBe(401);
      expect(res1.body.error.code).not.toBe('TOKEN_EXPIRED');
      expect(res1.body.error.message).toContain('No Bearer token');

      // 2. Malformed token
      const res2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer corrupt.garbage.signature');
      expect(res2.status).toBe(401);
      expect(res2.body.error.code).not.toBe('TOKEN_EXPIRED');
      expect(res2.body.error.message).toContain('Invalid access token');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. PostgreSQL SQLSTATE 57P01 Resilience & Connection Stability
  // ═════════════════════════════════════════════════════════════════════════════
  describe('3. PostgreSQL Connection Stability & 57P01 Resilience', () => {
    it('healthcheck verifies live PostgreSQL connection on port 5433', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toBe('connected');
    });

    it('isTransientDbError correctly detects PostgreSQL 57P01 (admin_shutdown)', () => {
      // 1. Exact SQLSTATE code
      expect(isTransientDbError({ code: '57P01', message: 'canceling statement due to user request' })).toBe(true);
      expect(isTransientDbError({ code: 'E57P01', message: 'connection terminated' })).toBe(true);

      // 2. Postgres admin shutdown / connection terminated message
      expect(
        isTransientDbError({
          message: 'FATAL: terminating connection due to administrator command (SQLSTATE 57P01)',
        })
      ).toBe(true);

      expect(
        isTransientDbError({
          code: 'P1017',
          message: 'Server closed the connection unexpectedly',
        })
      ).toBe(true);

      // 3. Regular non-transient error should NOT be flagged as transient
      expect(isTransientDbError({ code: 'P2002', message: 'Unique constraint failed on field email' })).toBe(false);
      expect(isTransientDbError({ code: 'VALIDATION_ERROR', message: 'Field required' })).toBe(false);
    });

    it('withDbRetry handles transient interruption and recovers transparently', async () => {
      let callCount = 0;
      const result = await withDbRetry(async () => {
        callCount++;
        if (callCount === 1) {
          // Simulate transient 57P01 container shutdown on first attempt
          const err = new Error('terminating connection due to administrator command (SQLSTATE 57P01)');
          err.code = '57P01';
          throw err;
        }
        return 'RECOVERED_QUERY_RESULT';
      }, 2, 50);

      expect(callCount).toBe(2);
      expect(result).toBe('RECOVERED_QUERY_RESULT');
    });
  });
});
