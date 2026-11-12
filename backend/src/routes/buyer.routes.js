/**
 * SasyaVahini — Buyer Profile & Account Management Routes (Phase 2)
 *
 * All routes require authentication and BUYER role authorization.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  updateBuyerProfileSchema,
  addressSchema,
  updateAddressSchema,
  updateSettingsSchema,
  changePasswordSchema,
} = require('../schemas/buyer.schema');
const controller = require('../controllers/buyer.controller');
const marketplaceController = require('../controllers/marketplace.controller');

const router = Router();

// Strictly require authenticated BUYER role
router.use(authenticate);
router.use(requireRole('BUYER'));

// ── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', controller.getProfile);
router.patch('/profile', validate(updateBuyerProfileSchema), controller.updateProfile);

// ── Addresses ────────────────────────────────────────────────────────────────
router.get('/addresses', controller.getAddresses);
router.post('/addresses', validate(addressSchema), controller.createAddress);
router.patch('/addresses/:addressId', validate(updateAddressSchema), controller.updateAddress);
router.delete('/addresses/:addressId', controller.deleteAddress);
router.patch('/addresses/:addressId/default', controller.setDefaultAddress);

// ── Account Settings & Preferences ───────────────────────────────────────────
router.get('/settings', controller.getSettings);
router.patch('/settings', validate(updateSettingsSchema), controller.updateSettings);

// ── Phase 4: Supplier Comparison & Total Landed Cost ────────────────────────
router.get('/compare', marketplaceController.getComparisonData);
router.post('/compare/calculate', marketplaceController.calculateLandedCost);
router.get('/compare/price-history', marketplaceController.getPriceHistory);

// ── Security & Password ──────────────────────────────────────────────────────
router.post('/change-password', validate(changePasswordSchema), controller.changePassword);

module.exports = router;
