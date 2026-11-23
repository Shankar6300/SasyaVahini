/**
 * SasyaVahini — Buyer Payment Processing & Invoice Generation Tests (Phase 6)
 *
 * Verifies cryptographic payment verification, authoritative price recalculation,
 * sandbox & live gateway adapter integrity, invoice creation, and PDF downloads.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const paymentGateway = require('../src/services/paymentGateway.service');
const invoiceService = require('../src/services/invoice.service');

describe('Buyer Payments & Invoices (Phase 6)', () => {
  let buyerToken;
  let buyerProfile;
  let testListing;
  let savedAddressId;
  let createdTxId;
  let createdOrderId;
  let generatedInvoiceId;

  beforeAll(async () => {
    // 1. Authenticate as demo buyer
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@demo.sasyavahini.in', password: 'DemoPass1' });

    expect(loginRes.status).toBe(200);
    buyerToken = loginRes.body.data.accessToken;

    buyerProfile = await prisma.buyerProfile.findFirst({
      where: { user: { email: 'buyer@demo.sasyavahini.in' } },
      include: { addresses: true },
    });

    expect(buyerProfile).toBeDefined();

    // 2. Ensure address exists
    if (buyerProfile.addresses?.length > 0) {
      savedAddressId = buyerProfile.addresses[0].id;
    } else {
      const addr = await prisma.buyerAddress.create({
        data: {
          buyerId: buyerProfile.id,
          recipientName: 'Phase 6 Test Warehouse',
          contactNumber: '+919800000004',
          addressType: 'BUSINESS',
          addressLine1: 'APMC Yard Gate 2',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411037',
          isDefault: true,
        },
      });
      savedAddressId = addr.id;
    }

    // 3. Find test listing
    testListing = await prisma.produceListing.findFirst({
      where: { status: 'AVAILABLE' },
    });
    expect(testListing).toBeDefined();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Payment Gateway & Cryptographic Verification Services', () => {
    it('creates an authoritative payment order via paymentGateway.createPaymentOrder', async () => {
      const order = await paymentGateway.createPaymentOrder({
        amount: 5000,
        currency: 'INR',
        receipt: 'TEST-RCPT-001',
        notes: { buyerId: buyerProfile.id },
      });

      expect(order).toBeDefined();
      expect(order.gatewayOrderId).toMatch(/^(order_|sbox_ord_)/);
      expect(order.amount).toBe(5000);
      expect(order.currency).toBe('INR');
    });

    it('generates and verifies authentic HMAC-SHA256 signature', () => {
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_789012';
      const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_sasyavahini_sandbox_2026';

      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const isValid = paymentGateway.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSignature,
      });

      expect(isValid).toBe(true);
    });

    it('strictly rejects tampered or fraudulent HMAC signatures', () => {
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_789012';
      const tamperedSignature = 'deadbeef00000000000000000000000000000000000000000000000000000000';

      const isValid = paymentGateway.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: tamperedSignature,
      });

      expect(isValid).toBe(false);
    });
  });

  describe('2. Agricultural Invoice & PDF Document Services', () => {
    it('generates standard unique invoice numbers matching INV-YYYY-XXXXXX format', async () => {
      const num1 = await invoiceService.generateUniqueInvoiceNumber();
      const num2 = await invoiceService.generateUniqueInvoiceNumber();

      expect(num1).toMatch(/^INV-\d{4}-[A-Z0-9]+$/);
      expect(num2).toMatch(/^INV-\d{4}-[A-Z0-9]+$/);
      expect(num1).not.toBe(num2);
    });

    it('generates a valid binary PDF buffer starting with standard %PDF header', () => {
      const pdfBuffer = invoiceService.buildPdfBuffer({
        invoiceNumber: 'INV-2026-TEST01',
        paidAt: new Date(),
        buyerName: 'Ganga Satish Wholesale',
        buyerType: 'BUSINESS',
        buyerGstin: '27AAAAA0000A1Z5',
        billingAddress: 'Warehouse 4, Pune, Maharashtra 411037',
        paymentRef: 'CHK-TEST-001',
        paymentMethod: 'UPI',
        totalAmount: 17790,
        breakdown: { productSubtotal: 17000, deliveryCost: 450, handlingFee: 340, platformFee: 0, taxes: 0 },
        items: [
          { cropName: 'Sharbati Wheat', quantityKg: 500, unitPrice: 34, subtotal: 17000, supplierName: 'Narmada Valley FPO' }
        ],
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(100);
      expect(pdfBuffer.toString('latin1', 0, 5)).toBe('%PDF-');
    });
  });

  describe('3. Payment API End-to-End Workflow', () => {
    it('rejects initiation if shopping cart is empty', async () => {
      // Clear cart
      await request(app)
        .delete('/api/buyer/cart')
        .set('Authorization', `Bearer ${buyerToken}`);

      const res = await request(app)
        .post('/api/buyer/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ addressId: savedAddressId, paymentMethod: 'UPI' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMPTY_CART');
    });

    it('successfully initiates payment with authoritative backend amount calculation', async () => {
      // Add item to cart
      await request(app)
        .post('/api/buyer/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: testListing.id, quantityKg: 100 });

      const res = await request(app)
        .post('/api/buyer/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ addressId: savedAddressId, paymentMethod: 'UPI' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactionId).toBeDefined();
      expect(res.body.data.gatewayOrderId).toBeDefined();
      expect(res.body.data.amount).toBeGreaterThan(0);
      expect(res.body.data.checkoutRef).toMatch(/^(ORD|CHK)-/);

      createdTxId = res.body.data.transactionId;
      createdOrderId = res.body.data.gatewayOrderId;
    });

    it('rejects payment verification when signature is invalid or forged', async () => {
      const res = await request(app)
        .post('/api/buyer/payments/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId: createdTxId,
          gatewayOrderId: createdOrderId,
          gatewayPaymentId: 'pay_fraud_123',
          gatewaySignature: 'invalid_fraudulent_hmac_hash',
          paymentMethod: 'UPI',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SIGNATURE_VERIFICATION_FAILED');
    });

    it('verifies payment with authentic HMAC signature, marks SUCCESS, and generates invoice', async () => {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_sasyavahini_sandbox_2026';
      const gatewayPaymentId = `pay_valid_${Date.now()}`;
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${createdOrderId}|${gatewayPaymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/buyer/payments/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId: createdTxId,
          gatewayOrderId: createdOrderId,
          gatewayPaymentId,
          gatewaySignature: validSignature,
          paymentMethod: 'UPI',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.transaction.status).toBe('SUCCESS');
      expect(res.body.data.invoice).toBeDefined();
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV-/);

      generatedInvoiceId = res.body.data.invoice.id;

      // Verify cart was cleared after purchase
      const cartRes = await request(app)
        .get('/api/buyer/cart')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(cartRes.body.data.totalItems).toBe(0);
    });

    it('prevents double payment verification on already successful transactions (Idempotency)', async () => {
      const res = await request(app)
        .post('/api/buyer/payments/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId: createdTxId,
          gatewayOrderId: createdOrderId,
          gatewayPaymentId: 'pay_duplicate_attempt',
          paymentMethod: 'UPI',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.message).toMatch(/already verified/i);
    });

    it('lists buyer payment transactions with correct status and checkout reference', async () => {
      const res = await request(app)
        .get('/api/buyer/payments/transactions')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const foundTx = res.body.data.find((t) => t.id === createdTxId);
      expect(foundTx).toBeDefined();
      expect(foundTx.status).toBe('SUCCESS');
    });

    it('lists buyer invoices and includes generated tax invoice', async () => {
      const res = await request(app)
        .get('/api/buyer/payments/invoices')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const foundInv = res.body.data.find((inv) => inv.id === generatedInvoiceId);
      expect(foundInv).toBeDefined();
      expect(foundInv.totalAmount).toBeGreaterThan(0);
      expect(foundInv.invoiceNumber).toMatch(/^INV-/);
    });

    it('downloads binary PDF invoice stream with application/pdf Content-Type', async () => {
      const res = await request(app)
        .get(`/api/buyer/payments/invoices/${generatedInvoiceId}/download`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="INV-/);
      expect(res.body).toBeDefined();
    });
  });
});
