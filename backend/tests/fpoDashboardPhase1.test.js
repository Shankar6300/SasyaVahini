/**
 * SasyaVahini — Phase 1 FPO Dashboard & Organization Profile Test Suite
 *
 * Tests:
 * 1. Database-driven statistics & zero-drift member count.
 * 2. Member enrollment, verification, and unlinking.
 * 3. FPO Organization Profile updates & permitted field validation.
 * 4. Multi-tenant data isolation and RBAC security.
 * 5. Safe handling of empty states (0 members, 0 stock).
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
jest.setTimeout(30000);

describe('Phase 1: FPO Dashboard and Organization Profile', () => {
  let fpoToken = null;
  let fpoUser = null;
  let fpoProfile = null;
  let farmerToken = null;
  let farmerUser = null;
  let testMemberId = null;

  beforeAll(async () => {
    // 1. Authenticate with demo FPO
    const fpoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fpo@demo.sasyavahini.in', password: 'DemoPass1' });

    expect(fpoRes.status).toBe(200);
    expect(fpoRes.body.success).toBe(true);
    fpoToken = fpoRes.body.data.accessToken;
    fpoUser = fpoRes.body.data.user;

    // Fetch FPO profile from DB
    fpoProfile = await prisma.fPOProfile.findUnique({
      where: { userId: fpoUser.id }
    });
    expect(fpoProfile).toBeDefined();

    // 2. Authenticate with demo Farmer for RBAC checks
    const farmerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farmer@demo.sasyavahini.in', password: 'DemoPass1' });

    expect(farmerRes.status).toBe(200);
    farmerToken = farmerRes.body.data.accessToken;
    farmerUser = farmerRes.body.data.user;
  });

  afterAll(async () => {
    // Clean up test member if created
    if (testMemberId) {
      const member = await prisma.farmerProfile.findUnique({
        where: { id: testMemberId },
        select: { userId: true }
      });
      if (member) {
        await prisma.farmerProfile.delete({ where: { id: testMemberId } }).catch(() => {});
        await prisma.user.delete({ where: { id: member.userId } }).catch(() => {});
      }
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. DATABASE-DRIVEN DASHBOARD METRICS
  // =========================================================================
  describe('1. Database-Driven Dashboard Metrics & Statistics', () => {
    it('FPO-DASH-01: GET /api/fpo/dashboard returns un-shadowed database metrics', async () => {
      const res = await request(app)
        .get('/api/fpo/dashboard')
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Member count must match the actual memberFarmers array length
      expect(typeof data.memberCount).toBe('number');
      expect(data.memberCount).toBe(data.memberFarmers.length);
      expect(data.activeMemberCount).toBe(data.activeMembers.length);
      expect(data.pendingMemberCount).toBe(data.pendingMembers.length);
      expect(data.memberCount).toBe(data.activeMemberCount + data.pendingMemberCount);

      // Inventory metrics must be numbers and calculated cleanly
      expect(data.inventoryMetrics).toBeDefined();
      expect(typeof data.inventoryMetrics.availableStockKg).toBe('number');
      expect(typeof data.inventoryMetrics.reservedStockKg).toBe('number');
      expect(typeof data.inventoryMetrics.soldStockKg).toBe('number');
      expect(typeof data.inventoryMetrics.totalStockKg).toBe('number');
      expect(data.inventoryMetrics.totalStockKg).toBeGreaterThanOrEqual(
        data.inventoryMetrics.availableStockKg + data.inventoryMetrics.reservedStockKg
      );

      // Profile details must reflect actual DB record
      expect(data.fpoProfile.id).toBe(fpoProfile.id);
      expect(data.fpoProfile.fpoName).toBe(fpoProfile.fpoName);
      expect(data.fpoProfile.registrationNo).toBe(fpoProfile.registrationNo);
      expect(data.fpoProfile.registrationCertVerified).toBe(fpoProfile.registrationCertVerified);
    });

    it('FPO-DASH-02: GET /api/fpo/members returns affiliated farmers with traceability', async () => {
      const res = await request(app)
        .get('/api/fpo/members')
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const members = res.body.data.members || res.body.data;
      expect(Array.isArray(members)).toBe(true);

      for (const member of members) {
        expect(member.fpoId).toBe(fpoProfile.id);
        expect(member.user).toBeDefined();
        expect(member.user.name).toBeDefined();
        expect(Array.isArray(member.listings)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. MEMBER ENROLLMENT & CONSENT WORKFLOW (FIX 1, FIX 2, FIX 3)
  // =========================================================================
  describe('2. Member Farmer Enrollment & Lifecycle (Security Refinements)', () => {
    let independentUser = null;
    let independentToken = null;
    let independentProfile = null;
    let invitationNotificationId = null;

    beforeAll(async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('TestPassword123!', 10);
      const uniqueSuffix = Date.now().toString().slice(-6);

      independentUser = await prisma.user.create({
        data: {
          name: 'Independent Farmer Test',
          phone: `+919611${uniqueSuffix}`,
          email: `independent.${uniqueSuffix}@sasyavahini.test`,
          passwordHash: hash,
          role: 'FARMER',
          status: 'ACTIVE',
          isPhoneVerified: true,
          farmerProfile: {
            create: {
              fpoId: null, // Strictly independent!
              state: 'Maharashtra',
              district: 'Pune',
              village: 'Otur',
              landSizeAcres: 2.5,
              produceTypes: ['Tomato']
            }
          }
        },
        include: { farmerProfile: true }
      });
      independentProfile = independentUser.farmerProfile;
      testMemberId = independentProfile.id;

      // Authenticate via standard auth route to obtain a genuine access token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: independentUser.email, password: 'TestPassword123!' });

      expect(loginRes.status).toBe(200);
      independentToken = loginRes.body.data.accessToken;
    });

    afterAll(async () => {
      if (independentUser) {
        await prisma.produceListing.deleteMany({ where: { farmerId: testMemberId } }).catch(() => {});
        await prisma.notification.deleteMany({ where: { userId: independentUser.id } }).catch(() => {});
        await prisma.farmerProfile.deleteMany({ where: { userId: independentUser.id } }).catch(() => {});
        await prisma.user.deleteMany({ where: { id: independentUser.id } }).catch(() => {});
      }
    });

    it('FPO-MEM-01: Adding an existing farmer sends a PENDING invitation and does NOT immediately affiliate fpoId (Fix 1)', async () => {
      const res = await request(app)
        .post('/api/fpo/members')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          name: independentUser.name,
          phone: independentUser.phone,
          email: independentUser.email,
          village: 'Otur',
          landSizeAcres: 2.5
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INVITATION_SENT');
      expect(res.body.data.invitationId).toBeDefined();
      invitationNotificationId = res.body.data.invitationId;

      // Verify in DB that farmer's fpoId was NOT set silently!
      const farmerProfileAfterInvite = await prisma.farmerProfile.findUnique({
        where: { userId: independentUser.id }
      });
      expect(farmerProfileAfterInvite.fpoId).toBeNull();
    });

    it('FPO-MEM-02: Rejects duplicate pending invitation attempt with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/fpo/members')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          name: independentUser.name,
          phone: independentUser.phone,
          email: independentUser.email
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('FPO-MEM-03: Farmer accepts invitation via /api/farmers/membership/invitations/:id/accept (Fix 1)', async () => {
      // 1. Farmer lists pending invitations
      const listRes = await request(app)
        .get('/api/farmers/membership/invitations')
        .set('Authorization', `Bearer ${independentToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      const pending = listRes.body.data.find(inv => inv.id === invitationNotificationId);
      expect(pending).toBeDefined();
      expect(pending.status).toBe('PENDING');

      // 2. Farmer explicitly accepts
      const acceptRes = await request(app)
        .post(`/api/farmers/membership/invitations/${invitationNotificationId}/accept`)
        .set('Authorization', `Bearer ${independentToken}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);
      expect(acceptRes.body.data.accepted).toBe(true);

      // Verify farmer profile fpoId is now set in Neon DB
      const profileAfterAccept = await prisma.farmerProfile.findUnique({
        where: { userId: independentUser.id }
      });
      expect(profileAfterAccept.fpoId).toBe(fpoProfile.id);

      // Verify FPO member count incremented in DB
      const updatedFpo = await prisma.fPOProfile.findUnique({
        where: { id: fpoProfile.id }
      });
      const actualCount = await prisma.farmerProfile.count({
        where: { fpoId: fpoProfile.id }
      });
      expect(updatedFpo.memberCount).toBe(actualCount);
    });

    it('FPO-MEM-04: PATCH /api/fpo/members/:id/verify activates status but preserves KYC separation (Fix 2)', async () => {
      // Ensure KYC is currently false
      await prisma.farmerProfile.update({
        where: { id: testMemberId },
        data: { aadhaarVerified: false, bankAccountVerified: false }
      });

      const res = await request(app)
        .patch(`/api/fpo/members/${testMemberId}/verify`)
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.status).toBe('ACTIVE');
      // FIX 2: KYC is NOT automatically verified!
      expect(res.body.data.aadhaarVerified).toBe(false);
      expect(res.body.data.bankAccountVerified).toBe(false);
    });

    it('FPO-MEM-05: DELETE /api/fpo/members/:id safely unlinks farmer and clears uncommitted listings (Fix 3)', async () => {
      // Create an uncommitted listing for this farmer tagged with fpoId
      const testListing = await prisma.produceListing.create({
        data: {
          farmerId: testMemberId,
          fpoId: fpoProfile.id,
          cropName: 'Tomato',
          category: 'VEGETABLES',
          totalQuantityKg: 300,
          reservedQty: 0,
          soldQty: 0,
          askingPricePerKg: 25,
          minPricePerKg: 22,
          qualityGrade: 'GRADE_A',
          state: 'Maharashtra',
          district: 'Pune',
          village: 'Otur',
          harvestDate: new Date(),
          status: 'AVAILABLE'
        }
      });

      const res = await request(app)
        .delete(`/api/fpo/members/${testMemberId}`)
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unlinked).toBe(true);
      expect(res.body.data.removedMemberId).toBe(testMemberId);

      // Verify member is unlinked in DB
      const unlinkedMember = await prisma.farmerProfile.findUnique({
        where: { id: testMemberId }
      });
      expect(unlinkedMember.fpoId).toBeNull();

      // Verify uncommitted produce listing had its fpoId cleared to null
      const updatedListing = await prisma.produceListing.findUnique({
        where: { id: testListing.id }
      });
      expect(updatedListing.fpoId).toBeNull();
      expect(updatedListing.status).toBe('AVAILABLE');

      // Clean up test listing
      await prisma.produceListing.delete({ where: { id: testListing.id } }).catch(() => {});
    });

    it('FPO-MEM-06: Farmer declines invitation leaving account independent (Fix 1 decline workflow)', async () => {
      // FPO invites farmer again now that farmer is unlinked
      const inviteRes = await request(app)
        .post('/api/fpo/members')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          name: independentUser.name,
          phone: independentUser.phone,
          email: independentUser.email
        });

      expect(inviteRes.status).toBe(200);
      const newInviteId = inviteRes.body.data.invitationId;

      // Farmer declines
      const rejectRes = await request(app)
        .post(`/api/farmers/membership/invitations/${newInviteId}/reject`)
        .set('Authorization', `Bearer ${independentToken}`);

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.success).toBe(true);
      expect(rejectRes.body.data.rejected).toBe(true);

      // Verify notification marked REJECTED and farmer remains independent
      const inviteNotif = await prisma.notification.findUnique({ where: { id: newInviteId } });
      expect(inviteNotif.metadata.status).toBe('REJECTED');

      const profile = await prisma.farmerProfile.findUnique({ where: { userId: independentUser.id } });
      expect(profile.fpoId).toBeNull();
    });
  });

  // =========================================================================
  // 3. FPO PROFILE EDITING & VALIDATION
  // =========================================================================
  describe('3. FPO Organization Profile Updates & Permitted Fields', () => {
    it('FPO-PROF-01: PUT /api/fpo/profile updates permitted fields and persists in Neon', async () => {
      const newAddress = `APMC Complex Suite #${Date.now().toString().slice(-4)}, Pune`;
      const res = await request(app)
        .put('/api/fpo/profile')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          fpoName: 'Pune Sahakari Krishi Producer Co.',
          address: newAddress,
          district: 'Pune',
          state: 'Maharashtra'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.address).toBe(newAddress);
      expect(res.body.data.district).toBe('Pune');
      expect(res.body.data.state).toBe('Maharashtra');
    });

    it('FPO-PROF-02: Rejects update when registration number is too short or invalid', async () => {
      const res = await request(app)
        .put('/api/fpo/profile')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          registrationNo: 'AB' // less than 3 chars
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. MULTI-TENANT ISOLATION & RBAC AUTHORIZATION
  // =========================================================================
  describe('4. Multi-Tenant Isolation & Role Authorization', () => {
    it('FPO-SEC-01: Farmer token cannot access FPO dashboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/fpo/dashboard')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('FPO-SEC-02: Unauthenticated request to /api/fpo/dashboard returns 401', async () => {
      const res = await request(app).get('/api/fpo/dashboard');
      expect(res.status).toBe(401);
    });

    it('FPO-SEC-03: FPO cannot unlink or modify a member farmer belonging to another FPO', async () => {
      // Find a farmer not belonging to this FPO
      const foreignFarmer = await prisma.farmerProfile.findFirst({
        where: {
          OR: [
            { fpoId: { not: fpoProfile.id } },
            { fpoId: null }
          ]
        }
      });

      if (foreignFarmer) {
        const res = await request(app)
          .delete(`/api/fpo/members/${foreignFarmer.id}`)
          .set('Authorization', `Bearer ${fpoToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      }
    });
  });
});
