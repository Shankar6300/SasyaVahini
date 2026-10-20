/**
 * SasyaVahini — Backend Integration Tests: Auth & Health
 *
 * Run: npm test (in backend/)
 *
 * These tests require a running PostgreSQL database pointed to by DATABASE_URL.
 * In CI, use a real test database (not the development one).
 * Set NODE_ENV=test and DATABASE_URL to a test DB before running.
 *
 * Owner: Member 6 (QA) — with Member 1 owning the routes under test.
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

// Ensure test environment
process.env.NODE_ENV = 'test';

let testUser = null;
let accessToken = null;
let refreshToken = null;

afterAll(async () => {
  // Clean up test user
  if (testUser) {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

// ─── Health check ──────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with status ok when DB is reachable', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });
});

// ─── Registration ──────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const validPayload = {
    name: 'Test Farmer',
    email: `testfarmer_${Date.now()}@sasyavahini.test`,
    phone: `+919${Math.floor(100000000 + Math.random() * 899999999)}`,
    password: 'SecurePass1',
    role: 'FARMER',
  };

  it('registers a new user successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.role).toBe('FARMER');
    testUser = res.body.data.user;
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'other@test.com', phone: '+919000000001', password: 'weak' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'other2@test.com', phone: '+919000000002', role: 'SUPERUSER' });
    expect(res.status).toBe(422);
  });
});

// ─── Login ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    if (!testUser) return;
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'SecurePass1',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('rejects wrong password', async () => {
    if (!testUser) return;
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword1',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

// ─── Protected routes ──────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns current user with valid token', async () => {
    if (!accessToken) return;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('role', 'FARMER');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});

// ─── Role authorization ────────────────────────────────────────────────────────
describe('RBAC — role-protected endpoints', () => {
  it('FARMER can access /api/farmer/dashboard', async () => {
    if (!accessToken) return;
    const res = await request(app)
      .get('/api/farmer/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('FARMER is denied /api/admin/dashboard', async () => {
    if (!accessToken) return;
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('FARMER is denied /api/buyer/dashboard', async () => {
    if (!accessToken) return;
    const res = await request(app)
      .get('/api/buyer/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Token refresh ─────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  it('issues new tokens with valid refresh token', async () => {
    if (!refreshToken) return;
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('rejects invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalid.token' });
    expect(res.status).toBe(401);
  });
});
