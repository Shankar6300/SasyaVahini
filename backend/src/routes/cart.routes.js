/**
 * SasyaVahini — Buyer Shopping Cart & Checkout Routes (Phase 5)
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const cartController = require('../controllers/cart.controller');

const router = Router();

// Protected: All cart and checkout endpoints require authenticated BUYER role
router.use(authenticate);
router.use(requireRole('BUYER'));

// ── Cart Operations ──────────────────────────────────────────────────────────
router.get('/cart', cartController.getCart);
router.post('/cart/items', cartController.addToCart);
router.patch('/cart/items/:itemId', cartController.updateCartItem);
router.delete('/cart/items/:itemId', cartController.removeCartItem);
router.delete('/cart', cartController.clearCart);
router.post('/cart/validate', cartController.validateCart);

// ── Checkout Preparation Operations ──────────────────────────────────────────
router.post('/checkout/summary', cartController.getCheckoutSummary);

module.exports = router;
