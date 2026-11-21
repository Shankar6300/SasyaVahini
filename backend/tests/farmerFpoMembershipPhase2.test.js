/**
 * SasyaVahini — Phase 2: Farmer–FPO Membership Management Test Suite
 *
 * Tests both full lifecycle workflows:
 * Workflow A: FPO invites independent farmer (Search -> Invite -> Notify -> Consent/Accept/Reject)
 * Workflow B: Farmer requests to join FPO (Directory -> Request -> FPO Review/Approve/Reject)
 * Lifecycle: Suspend -> Reactivate -> Safe Unlink
 * Security: RBAC, Tenant Isolation & Duplicate Prevention
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';
jest.setTimeout(35000);

describe('Phase 2: Farmer–FPO Membership Management', () => {
  let fpoToken = null;
  let fpoUser = null;
  let fpoProfile = null;

  let fpo2Token = null;
  let fpo2User = null;
  let fpo2Profile = null;

  let farmerToken = null;
  let farmerUser = null;
  let farmerProfile = null;

  let createdNotificationIds = [];
  let createdUserIds = [];

  beforeAll(async () => {
    // 1. Authenticate with Primary Demo FPO
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

    // 2. Create or authenticate Secondary FPO for Tenant Isolation checks
    const hash = await bcrypt.hash('DemoPass1', 10);
    const existingFpo2 = await prisma.user.findUnique({
      where: { email: 'fpo2_phase2@test.sasyavahini.in' }
    });

    if (!existingFpo2) {
      fpo2User = await prisma.user.create({
        data: {
          name: 'Greenfield Farmers FPO',
          email: 'fpo2_phase2@test.sasyavahini.in',
          phone: '+919876543299',
          role: 'FPO',
          passwordHash: hash,
          status: 'ACTIVE',
          isPhoneVerified: true,
          isEmailVerified: true,
          fpoProfile: {
            create: {
              fpoName: 'Greenfield Farmers Producer Co',
              registrationNo: 'CIN-FPO-P2-9988',
              district: 'Nashik',
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
      .send({ email: 'fpo2_phase2@test.sasyavahini.in', password: 'DemoPass1' });
    expect(fpo2Login.status).toBe(200);
    fpo2Token = fpo2Login.body.data.accessToken;

    // 3. Create independent test farmer for Phase 2 membership workflows
    const uniquePhone = '+9199' + Math.floor(10000000 + Math.random() * 90000000);
    const uniqueEmail = `farmer_phase2_${Date.now()}@test.sasyavahini.in`;

    farmerUser = await prisma.user.create({
      data: {
        name: 'Ramesh Phase2 Farmer',
        email: uniqueEmail,
        phone: uniquePhone,
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
            landSizeAcres: 3.5,
            produceTypes: ['Tomato', 'Onion'],
            fpoId: null // Independent!
          }
        }
      },
      include: { farmerProfile: true }
    });
    createdUserIds.push(farmerUser.id);
    farmerProfile = farmerUser.farmerProfile;

    const farmerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail, password: 'DemoPass1' });
    expect(farmerLogin.status).toBe(200);
    farmerToken = farmerLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up notifications created during test
    if (createdNotificationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: createdNotificationIds } }
      }).catch(() => {});
    }

    // Clean up created test users
    for (const uid of createdUserIds) {
      await prisma.farmerProfile.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.fPOProfile.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW A: FPO INVITES INDEPENDENT FARMER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Workflow A: FPO Manager Invites Farmer', () => {
    let invitationId = null;

    it('A1: FPO searches for independent farmer with phone or name', async () => {
      const res = await request(app)
        .get('/api/fpo/farmers/search')
        .query({ q: 'Ramesh' })
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find(
        (f) => f.farmerId === farmerProfile.id || f.userId === farmerUser.id
      );
      expect(found).toBeDefined();
      expect(found.affiliationStatus).toBe('AVAILABLE');
      expect(found.maskedPhone).toContain('****'); // Privacy masking verified
      expect(found.landSizeAcres).toBe(3.5);
    });

    it('A2: FPO sends membership invitation to the independent farmer', async () => {
      const res = await request(app)
        .post('/api/fpo/members')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          phone: farmerUser.phone,
          name: 'Ramesh Phase2 Farmer',
          village: 'Manchar Village',
          landSizeAcres: 3.5
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INVITATION_SENT');

      // Verify farmer profile fpoId is NOT silently modified
      const currentProfile = await prisma.farmerProfile.findUnique({
        where: { id: farmerProfile.id }
      });
      expect(currentProfile.fpoId).toBeNull();
    });

    it('A3: Duplicate invite prevention returns 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/fpo/members')
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({
          phone: farmerUser.phone,
          name: 'Ramesh Phase2 Farmer'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/membership invitation.*pending/i);
    });

    it('A4: FPO lists sent invitations via GET /api/fpo/invitations', async () => {
      const res = await request(app)
        .get('/api/fpo/invitations')
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const sent = res.body.data.find((i) => i.userId === farmerUser.id);
      expect(sent).toBeDefined();
      expect(sent.status).toBe('PENDING');
      invitationId = sent.id;
      createdNotificationIds.push(invitationId);
    });

    it('A5: Farmer receives and views membership invitation in Farmer Portal', async () => {
      const res = await request(app)
        .get('/api/farmers/membership/invitations')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const invite = res.body.data.find((i) => i.fpoId === fpoProfile.id);
      expect(invite).toBeDefined();
      expect(invite.status).toBe('PENDING');
      expect(invite.fpoName).toBe(fpoProfile.fpoName);
    });

    it('A6: Farmer explicitly accepts invitation and becomes active FPO member', async () => {
      const res = await request(app)
        .post(`/api/farmers/membership/invitations/${invitationId}/accept`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accepted).toBe(true);

      // Database verification
      const updatedProfile = await prisma.farmerProfile.findUnique({
        where: { id: farmerProfile.id }
      });
      expect(updatedProfile.fpoId).toBe(fpoProfile.id);

      // Verify dashboard member count reflects active member
      const dashRes = await request(app)
        .get('/api/fpo/dashboard')
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(dashRes.status).toBe(200);
      const enrolled = dashRes.body.data.memberFarmers.find((m) => m.id === farmerProfile.id);
      expect(enrolled).toBeDefined();
    });

    it('A7: FPO suspends active member account', async () => {
      const res = await request(app)
        .patch(`/api/fpo/members/${farmerProfile.id}/suspend`)
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.status).toBe('SUSPENDED');

      // Verify User record updated
      const user = await prisma.user.findUnique({ where: { id: farmerUser.id } });
      expect(user.status).toBe('SUSPENDED');
    });

    it('A8: FPO reactivates suspended member account', async () => {
      const res = await request(app)
        .patch(`/api/fpo/members/${farmerProfile.id}/reactivate`)
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.status).toBe('ACTIVE');

      const user = await prisma.user.findUnique({ where: { id: farmerUser.id } });
      expect(user.status).toBe('ACTIVE');
    });

    it('A9: FPO safely unlinks member, preserving account & resetting fpoId', async () => {
      const res = await request(app)
        .delete(`/api/fpo/members/${farmerProfile.id}`)
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Account preserved, fpoId reset to null
      const checkFarmer = await prisma.farmerProfile.findUnique({
        where: { id: farmerProfile.id }
      });
      expect(checkFarmer).toBeDefined();
      expect(checkFarmer.fpoId).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW B: FARMER REQUESTS TO JOIN FPO
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Workflow B: Farmer Requests to Join FPO', () => {
    let requestId = null;

    it('B1: Independent farmer browses FPO directory with affiliation status CAN_JOIN', async () => {
      const res = await request(app)
        .get('/api/farmers/fpos')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const targetFpo = res.body.data.find((f) => f.id === fpoProfile.id);
      expect(targetFpo).toBeDefined();
      expect(targetFpo.fpoName).toBe(fpoProfile.fpoName);
      expect(targetFpo.registrationNo).toBe(fpoProfile.registrationNo);
      expect(targetFpo.affiliationStatus).toBe('CAN_JOIN');
    });

    it('B2: Farmer submits membership request to FPO with remarks', async () => {
      const res = await request(app)
        .post(`/api/farmers/fpos/${fpoProfile.id}/request-join`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          remarks: 'I cultivate 3.5 acres of tomatoes in Manchar cluster.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requested).toBe(true);
      requestId = res.body.data.requestId;
      createdNotificationIds.push(requestId);
    });

    it('B3: Duplicate join request returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/farmers/fpos/${fpoProfile.id}/request-join`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ remarks: 'Second request attempt' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/pending membership request/i);
    });

    it('B4: Farmer views outgoing join requests via GET /api/farmers/fpos/requests', async () => {
      const res = await request(app)
        .get('/api/farmers/fpos/requests')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const myReq = res.body.data.find((r) => r.fpoId === fpoProfile.id);
      expect(myReq).toBeDefined();
      expect(myReq.status).toBe('PENDING');
      expect(myReq.remarks).toContain('3.5 acres');
    });

    it('B5: FPO manager receives and reviews incoming join request via GET /api/fpo/join-requests', async () => {
      const res = await request(app)
        .get('/api/fpo/join-requests')
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const incoming = res.body.data.find((r) => r.id === requestId);
      expect(incoming).toBeDefined();
      expect(incoming.farmerName).toBe('Ramesh Phase2 Farmer');
      expect(incoming.landSizeAcres).toBe(3.5);
      expect(incoming.produceTypes).toContain('Tomato');
    });

    it('B6: Tenant Isolation: Secondary FPO cannot approve request addressed to Primary FPO', async () => {
      const res = await request(app)
        .post(`/api/fpo/join-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${fpo2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/not authorized/i);
    });

    it('B7: FPO manager approves join request, activating farmer membership', async () => {
      const res = await request(app)
        .post(`/api/fpo/join-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${fpoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approved).toBe(true);

      // Verify FarmerProfile.fpoId is updated
      const profile = await prisma.farmerProfile.findUnique({
        where: { id: farmerProfile.id }
      });
      expect(profile.fpoId).toBe(fpoProfile.id);

      // Verify farmer directory now reports CURRENT_MEMBER
      const dirRes = await request(app)
        .get('/api/farmers/fpos')
        .set('Authorization', `Bearer ${farmerToken}`);

      const myFpo = dirRes.body.data.find((f) => f.id === fpoProfile.id);
      expect(myFpo.affiliationStatus).toBe('CURRENT_MEMBER');
    });

    it('B8: FPO rejection workflow correctly notifies farmer with reason', async () => {
      // Create a second temporary farmer for rejection test
      const rejectFarmerUser = await prisma.user.create({
        data: {
          name: 'Decline Test Farmer',
          email: `reject_${Date.now()}@test.sasyavahini.in`,
          phone: '+9199' + Math.floor(10000000 + Math.random() * 90000000),
          role: 'FARMER',
          passwordHash: await bcrypt.hash('DemoPass1', 10),
          status: 'ACTIVE',
          isPhoneVerified: true,
          isEmailVerified: true,
          farmerProfile: {
            create: { village: 'Shirur', district: 'Pune', state: 'Maharashtra', landSizeAcres: 1.0, fpoId: null }
          }
        }
      });
      createdUserIds.push(rejectFarmerUser.id);

      const rejectLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: rejectFarmerUser.email, password: 'DemoPass1' });

      // Submit join request
      const reqRes = await request(app)
        .post(`/api/farmers/fpos/${fpoProfile.id}/request-join`)
        .set('Authorization', `Bearer ${rejectLogin.body.data.accessToken}`)
        .send({ remarks: 'Application to be declined for test' });

      const reqIdToReject = reqRes.body.data.requestId;
      createdNotificationIds.push(reqIdToReject);

      // FPO rejects request with reason
      const rejRes = await request(app)
        .post(`/api/fpo/join-requests/${reqIdToReject}/reject`)
        .set('Authorization', `Bearer ${fpoToken}`)
        .send({ reason: 'Outside operating cluster boundary.' });

      expect(rejRes.status).toBe(200);
      expect(rejRes.body.success).toBe(true);

      // Notification is marked REJECTED
      const notif = await prisma.notification.findUnique({ where: { id: reqIdToReject } });
      expect(notif.metadata.status).toBe('REJECTED');
      expect(notif.metadata.rejectionReason).toContain('operating cluster boundary');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY & RBAC ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Security and Access Control', () => {
    it('S1: Unauthenticated request to /api/fpo/join-requests returns 401', async () => {
      const res = await request(app).get('/api/fpo/join-requests');
      expect(res.status).toBe(401);
    });

    it('S2: Farmer role cannot access FPO management routes', async () => {
      const res = await request(app)
        .get('/api/fpo/join-requests')
        .set('Authorization', `Bearer ${farmerToken}`);
      expect(res.status).toBe(403);
    });

    it('S3: FPO role cannot submit join requests to other FPOs', async () => {
      const res = await request(app)
        .post(`/api/farmers/fpos/${fpo2Profile.id}/request-join`)
        .set('Authorization', `Bearer ${fpoToken}`);
      expect(res.status).toBe(403);
    });
  });
});
