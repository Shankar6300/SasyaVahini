/**
 * SasyaVahini — Buyer Payments & Invoices Routes (Phase 6)
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const paymentController = require('../controllers/payment.controller');

const router = Router();

// Public webhook endpoint (signature verified internally)
router.post('/payments/webhook', paymentController.handleWebhook);

// Protected routes (strictly require authenticated BUYER)
router.use(authenticate);
router.use(requireRole('BUYER'));

// ── Payment Processing ───────────────────────────────────────────────────────
router.post('/payments/initiate', paymentController.initiatePayment);
router.post('/payments/verify', paymentController.verifyPayment);

// ── Transaction History ──────────────────────────────────────────────────────
router.get('/transactions', paymentController.getBuyerTransactions);
router.get('/transactions/:transactionId', paymentController.getTransactionDetails);

// ── Invoice Management ───────────────────────────────────────────────────────
router.get('/invoices', paymentController.getBuyerInvoices);
router.get('/invoices/:invoiceId', paymentController.getInvoiceDetails);
router.get('/invoices/:invoiceId/download', paymentController.downloadInvoicePdf);

module.exports = router;
