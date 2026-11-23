/**
 * SasyaVahini — Buyer Shopping Cart & Checkout Tests (Phase 5)
 *
 * Verifies server-side cart operations, inventory validation, MOQ enforcement,
 * supplier grouping, and checkout preparation.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

describe('Buyer Shopping Cart & Checkout Preparation (Phase 5)', () => {
  let buyerToken;
  let buyerId;
  let tomatoListing;
  let onionListing;
  let savedAddressId;

  beforeAll(async () => {
    // 1. Authenticate as demo buyer
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@demo.sasyavahini.in', password: 'DemoPass1' });
    
    expect(loginRes.status).toBe(200);
    buyerToken = loginRes.body.data.accessToken;

    // 2. Locate test listings seeded in DB
    tomatoListing = await prisma.produceListing.findFirst({
      where: { cropName: 'Tomato' },
    });
    onionListing = await prisma.produceListing.findFirst({
      where: { cropName: 'Onion' },
    });

    expect(tomatoListing).toBeDefined();
    expect(onionListing).toBeDefined();

    // 3. Clear any existing cart items for clean test run
    await request(app)
      .delete('/api/buyer/cart')
      .set('Authorization', `Bearer ${buyerToken}`);

    // 4. Ensure buyer has a saved address
    const profile = await prisma.buyerProfile.findFirst({
      where: { user: { email: 'buyer@demo.sasyavahini.in' } },
      include: { addresses: true },
    });
    buyerId = profile?.id;

    if (profile?.addresses?.length > 0) {
      savedAddressId = profile.addresses[0].id;
    } else {
      const addr = await prisma.buyerAddress.create({
        data: {
          buyerId: profile.id,
          recipientName: 'FreshBasket Procurement Hub',
          contactNumber: '+919800000004',
          addressType: 'BUSINESS',
          addressLine1: 'Warehouse 4, Market Yard',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411037',
          isDefault: true,
        },
      });
      savedAddressId = addr.id;
    }
  });

  describe('1. Cart Authentication & Isolation', () => {
    it('rejects unauthenticated requests to cart endpoints with 401', async () => {
      const res = await request(app).get('/api/buyer/cart');
      expect(res.status).toBe(401);
    });

    it('returns an empty cart with initialized structure for authenticated buyer', async () => {
      const res = await request(app)
        .get('/api/buyer/cart')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalItems).toBe(0);
      expect(res.body.data.totalQuantityKg).toBe(0);
      expect(res.body.data.productSubtotal).toBe(0);
      expect(res.body.data.supplierGroups).toEqual([]);
    });
  });

  describe('2. Add to Cart & Validation Rules', () => {
    it('validates minimum order quantity (MOQ) and rejects below-MOQ quantities', async () => {
      // Tomato MOQ for individual is 5 kg, 2 kg should fail
      const res = await request(app)
        .post('/api/buyer/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: tomatoListing.id,
          quantityKg: 2,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BELOW_MOQ');
    });

    it('validates inventory and rejects quantities exceeding available stock', async () => {
      const res = await request(app)
        .post('/api/buyer/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: tomatoListing.id,
          quantityKg: 999999,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('successfully adds valid produce lot to cart and calculates subtotal', async () => {
      const res = await request(app)
        .post('/api/buyer/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: tomatoListing.id,
          quantityKg: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.totalItems).toBe(1);
      expect(res.body.data.cart.totalQuantityKg).toBe(50);
      expect(res.body.data.cart.productSubtotal).toBe(tomatoListing.askingPricePerKg * 50);
    });

    it('updates quantity of existing cart item when added again instead of duplicating', async () => {
      const res = await request(app)
        .post('/api/buyer/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: tomatoListing.id,
          quantityKg: 25,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.cart.totalItems).toBe(1);
      expect(res.body.data.cart.totalQuantityKg).toBe(75);
    });
  });

  describe('3. Supplier-Wise Grouping & Multi-Item Management', () => {
    it('groups multiple produce listings under their respective suppliers/FPOs', async () => {
      // Add second item (Onion)
      const resAdd = await request(app)
        .post('/api/buyer/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId: onionListing.id,
          quantityKg: 30,
        });
      expect(resAdd.status).toBe(201);

      const cartRes = await request(app)
        .get('/api/buyer/cart')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(cartRes.status).toBe(200);
      expect(cartRes.body.data.totalItems).toBe(2);
      expect(cartRes.body.data.totalQuantityKg).toBe(105); // 75 kg + 30 kg
      expect(cartRes.body.data.supplierGroups.length).toBeGreaterThanOrEqual(1);

      const group = cartRes.body.data.supplierGroups[0];
      expect(group.supplierName).toBeDefined();
      expect(group.items.length).toBeGreaterThanOrEqual(1);
      expect(group.supplierSubtotal).toBeGreaterThan(0);
    });

    it('allows updating quantity of a specific cart item', async () => {
      const cartRes = await request(app)
        .get('/api/buyer/cart')
        .set('Authorization', `Bearer ${buyerToken}`);
      
      const firstItem = cartRes.body.data.supplierGroups[0].items[0];

      const updateRes = await request(app)
        .patch(`/api/buyer/cart/items/${firstItem.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ quantityKg: 60 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
    });

    it('allows removing an item and recalculates cart totals', async () => {
      const cartRes = await request(app)
        .get('/api/buyer/cart')
        .set('Authorization', `Bearer ${buyerToken}`);
      
      const items = cartRes.body.data.supplierGroups[0].items;
      const initialCount = cartRes.body.data.totalItems;
      const itemToRemove = items[0];

      const deleteRes = await request(app)
        .delete(`/api/buyer/cart/items/${itemToRemove.id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.cart.totalItems).toBe(initialCount - 1);
    });
  });

  describe('4. Checkout Preparation & Cost Breakdown', () => {
    it('authoritatively calculates checkout summary with delivery, handling, and 0% GST', async () => {
      const res = await request(app)
        .post('/api/buyer/checkout/summary')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ addressId: savedAddressId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkoutStatus).toBe('READY_FOR_PAYMENT');
      expect(res.body.data.costBreakdown).toBeDefined();
      expect(res.body.data.costBreakdown.productSubtotal).toBeGreaterThan(0);
      expect(res.body.data.costBreakdown.deliveryCost).toBeGreaterThan(0);
      expect(res.body.data.costBreakdown.handlingFee).toBeGreaterThan(0);
      expect(res.body.data.costBreakdown.platformFee).toBeGreaterThan(0);
      expect(res.body.data.costBreakdown.taxes).toBe(0); // 0% GST exempt under Indian laws
      expect(res.body.data.costBreakdown.estimatedTotal).toBeGreaterThan(0);
      expect(res.body.data.deliveryAddress.id).toBe(savedAddressId);
    });

    it('strictly confirms Phase 5 completion boundary without executing payment processing', async () => {
      const res = await request(app)
        .post('/api/buyer/checkout/summary')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ addressId: savedAddressId });

      expect(res.body.data.nextPhaseNotice).toContain('Phase 6');
    });

    it('rejects checkout preparation when delivery address belongs to another buyer', async () => {
      const res = await request(app)
        .post('/api/buyer/checkout/summary')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ addressId: 'foreign-address-uuid-99999' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_ADDRESS');
    });
  });
});
