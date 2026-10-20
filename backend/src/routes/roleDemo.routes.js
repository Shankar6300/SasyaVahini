/**
 * SasyaVahini — Protected Role-Demo Routes
 *
 * These are baseline demonstration endpoints that prove RBAC is working.
 * Each member's real module logic will be implemented in their feature branch.
 *
 * GET /api/farmer/dashboard    — FARMER only
 * GET /api/fpo/dashboard       — FPO only
 * GET /api/buyer/dashboard     — BUYER only
 * GET /api/logistics/dashboard — LOGISTICS only
 * GET /api/admin/dashboard     — ADMIN only
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendSuccess } = require('../utils/apiResponse');

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/farmer/dashboard', requireRole('FARMER'), (req, res) => {
  res.json(
    sendSuccess(res, {
      message: 'Farmer dashboard — PLANNED. See docs/TEAM_MODULES.md (Member 2)',
      userId: req.user.id,
      role: req.user.role,
    }),
  );
});

router.get('/fpo/dashboard', requireRole('FPO'), (req, res) => {
  sendSuccess(res, {
    message: 'FPO dashboard — PLANNED. See docs/TEAM_MODULES.md (Member 2)',
    userId: req.user.id,
    role: req.user.role,
  });
});

router.get('/buyer/dashboard', requireRole('BUYER'), (req, res) => {
  sendSuccess(res, {
    message: 'Buyer dashboard — PLANNED. See docs/TEAM_MODULES.md (Member 3)',
    userId: req.user.id,
    role: req.user.role,
  });
});

router.get('/logistics/dashboard', requireRole('LOGISTICS'), (req, res) => {
  sendSuccess(res, {
    message: 'Logistics dashboard — PLANNED. See docs/TEAM_MODULES.md (Member 4)',
    userId: req.user.id,
    role: req.user.role,
  });
});

router.get('/admin/dashboard', requireRole('ADMIN'), (req, res) => {
  sendSuccess(res, {
    message: 'Admin dashboard — PLANNED. See docs/TEAM_MODULES.md (Members 1 & 2)',
    userId: req.user.id,
    role: req.user.role,
  });
});

module.exports = router;
