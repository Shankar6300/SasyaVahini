const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Buyer Marketplace API (/api/marketplace)', () => {
  describe('GET /api/marketplace/produce', () => {
    it('returns 200 and an array of produce listings', async () => {
      const res = await request(app).get('/api/marketplace/produce');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('supports category and search query filters without throwing errors', async () => {
      const res = await request(app)
        .get('/api/marketplace/produce')
        .query({ category: 'VEGETABLES', search: 'Tomato' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/marketplace/stats', () => {
    it('returns marketplace summary metrics', async () => {
      const res = await request(app).get('/api/marketplace/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('activeListings');
      expect(res.body.data).toHaveProperty('totalVolumeKg');
      expect(res.body.data).toHaveProperty('avgAskingPricePerKg');
      expect(res.body.data).toHaveProperty('directSavingsPercent');
    });
  });
});
