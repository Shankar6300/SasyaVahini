/**
 * SasyaVahini — Admin & Governance Routes
 * Role-protected administrative interface endpoints.
 *
 * Owner: Member 1
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

const router = Router();

// All admin routes strictly require valid JWT and role === 'ADMIN'
router.use(authenticate, requireRole('ADMIN'));

// Platform Overview & KPIs
router.get('/overview', adminController.getOverview);

// User Governance & KYC
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);

// Dispute Arbitration & Escrow Resolution
router.get('/disputes', adminController.getDisputes);
router.post('/disputes/:id/resolve', adminController.resolveDispute);

// System Audit Logs & Financial Governance
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
