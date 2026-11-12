/**
 * SasyaVahini — Agricultural Marketplace & Product Discovery Tests (Phase 3)
 *
 * Problem Statement ID 26033 (DoCA)
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

process.env.NODE_ENV = 'test';

let sampleProductId = null;
let sampleSupplierId = null;

beforeAll(async () => {
  // Check if we have produce listings from seed; if not, query an active listing
  const listing = await prisma.produceListing.findFirst({
    where: { status: 'AVAILABLE' },
    include: { farmer: true, fpo: true },
  });

  if (listing) {
    sampleProductId = listing.id;
    sampleSupplierId = listing.fpoId || listing.farmerId;
  }
});

describe('Phase 3: Agricultural Marketplace & Discovery API', () => {
  describe('GET /api/marketplace/categories', () => {
    it('returns dynamic categories with product counts and minimum price', async () => {
      const res = await request(app).get('/api/marketplace/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        const cat = res.body.data[0];
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('count');
        expect(cat).toHaveProperty('minPrice');
        expect(cat).toHaveProperty('icon');
      }
    });
  });

  describe('GET /api/marketplace/products', () => {
    it('returns paginated agricultural produce listings with computed Mandi benchmark savings', async () => {
      const res = await request(app).get('/api/marketplace/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('products');
      expect(res.body.data).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data.products)).toBe(true);

      if (res.body.data.products.length > 0) {
        const prod = res.body.data.products[0];
        expect(prod).toHaveProperty('id');
        expect(prod).toHaveProperty('cropName');
        expect(prod).toHaveProperty('askingPricePerKg');
        expect(prod).toHaveProperty('availableQtyKg');
        expect(prod).toHaveProperty('mandiBenchmark');
        expect(prod).toHaveProperty('savingsPercent');
        expect(prod.availableQtyKg).toBeGreaterThanOrEqual(0);
      }
    });

    it('filters products by category correctly', async () => {
      const res = await request(app).get('/api/marketplace/products?category=Vegetables');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.products.forEach((p) => {
        expect(p.category.toLowerCase()).toBe('vegetables');
      });
    });

    it('filters products by quality grade', async () => {
      const res = await request(app).get('/api/marketplace/products?qualityGrade=GRADE_A');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.products.forEach((p) => {
        expect(p.qualityGrade).toBe('GRADE_A');
      });
    });

    it('filters products by search keyword across crop, district, and village', async () => {
      const res = await request(app).get('/api/marketplace/products?search=Tomato');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.products.forEach((p) => {
        const match =
          p.cropName.toLowerCase().includes('tomato') ||
          p.category.toLowerCase().includes('tomato') ||
          (p.district && p.district.toLowerCase().includes('tomato'));
        expect(match).toBe(true);
      });
    });

    it('sorts products by price low to high', async () => {
      const res = await request(app).get('/api/marketplace/products?sortBy=price_asc');

      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p) => p.askingPricePerKg);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });
  });

  describe('GET /api/marketplace/products/:id', () => {
    it('returns full product detail with freshness index and related produce', async () => {
      if (!sampleProductId) return;

      const res = await request(app).get(`/api/marketplace/products/${sampleProductId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', sampleProductId);
      expect(res.body.data).toHaveProperty('availableQtyKg');
      expect(res.body.data).toHaveProperty('daysSinceHarvest');
      expect(res.body.data).toHaveProperty('relatedProduce');
      expect(Array.isArray(res.body.data.relatedProduce)).toBe(true);
    });

    it('returns 404 for non-existent product ID', async () => {
      const res = await request(app).get('/api/marketplace/products/non-existent-id-000');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/marketplace/search/suggestions', () => {
    it('returns typeahead search suggestions for query >= 2 chars', async () => {
      const res = await request(app).get('/api/marketplace/search/suggestions?q=to');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('text');
        expect(res.body.data[0]).toHaveProperty('type');
      }
    });

    it('returns empty array when query is less than 2 chars', async () => {
      const res = await request(app).get('/api/marketplace/search/suggestions?q=t');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/marketplace/suppliers/:supplierId', () => {
    it('returns public supplier profile without leaking sensitive information', async () => {
      if (!sampleSupplierId) return;

      const res = await request(app).get(`/api/marketplace/suppliers/${sampleSupplierId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const supplier = res.body.data;
      expect(supplier).toHaveProperty('name');
      expect(supplier).toHaveProperty('type');
      expect(supplier).toHaveProperty('isVerified');

      // STRICT PRIVACY: Personal phone numbers, bank accounts, or passwords must never be exposed
      expect(supplier.phone).toBeUndefined();
      expect(supplier.passwordHash).toBeUndefined();
      expect(supplier.bankAccount).toBeUndefined();
      expect(supplier.aadhaarNumber).toBeUndefined();
    });
  });

  describe('GET /api/marketplace/stats', () => {
    it('returns summary statistics for the marketplace hero banner', async () => {
      const res = await request(app).get('/api/marketplace/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('activeListings');
      expect(res.body.data).toHaveProperty('totalAvailableKg');
      expect(res.body.data).toHaveProperty('avgMandiSavingsPercent');
    });
  });
});
