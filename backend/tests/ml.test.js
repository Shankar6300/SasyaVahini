/**
 * SasyaVahini — ML & Mandi Advisory Backend Tests
 *
 * Tests the ML routes, validation logic, error handling, and health endpoints.
 * Run: npm test (in backend/)
 *
 * Owner: Member 5 (ML Analytics & Mandi Advisor)
 */

const request = require('supertest');
const app = require('../src/app');

// Ensure test environment
process.env.NODE_ENV = 'test';

describe('ML & Mandi Advisory API (/api/ml)', () => {
  // ─── Health Check ──────────────────────────────────────────────────────────
  describe('GET /api/ml/health', () => {
    it('returns 200 with health status object even if python service is offline', async () => {
      const res = await request(app).get('/api/ml/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
    });
  });

  // ─── Validation: Demand Forecast (GET) ─────────────────────────────────────
  describe('GET /api/ml/demand-forecast', () => {
    it('returns 400 when required query params (crop, district) are missing', async () => {
      const res = await request(app).get('/api/ml/demand-forecast');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when month is outside 1-12 range', async () => {
      const res = await request(app)
        .get('/api/ml/demand-forecast')
        .query({ crop: 'Tomato', district: 'Pune', month: 15 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── Validation: Demand Forecast (POST) ────────────────────────────────────
  describe('POST /api/ml/demand-forecast', () => {
    it('returns 400 when body lacks required fields', async () => {
      const res = await request(app)
        .post('/api/ml/demand-forecast')
        .send({ crop: 'T' }); // crop must be at least 2 chars

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── Validation: Price Recommendation (POST) ──────────────────────────────
  describe('POST /api/ml/price-recommend', () => {
    it('returns 400 when quantityKg is missing or not positive', async () => {
      const res = await request(app)
        .post('/api/ml/price-recommend')
        .send({ crop: 'Tomato', district: 'Pune', quantityKg: -50 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── Forecast History (GET) ───────────────────────────────────────────────
  describe('GET /api/ml/forecast/history', () => {
    it('validates limit and page query bounds', async () => {
      const res = await request(app)
        .get('/api/ml/forecast/history')
        .query({ limit: 500 }); // Max allowed is 100

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
