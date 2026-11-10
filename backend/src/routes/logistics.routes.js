/**
 * SasyaVahini — Logistics Express Routes
 *
 * Full implementation of contract endpoints and extended logistics operations.
 * Protected with Bearer JWT auth and RBAC roles:
 * - LOGISTICS, ADMIN, BUYER, FPO, FARMER
 *
 * Owner: Member 4
 */

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  planOrderSchema,
  acceptShipmentSchema,
  updateMilestoneSchema,
  createShipmentSchema,
  updateLocationSchema,
  listShipmentsQuerySchema,
} = require('../schemas/logistics.schema');
const controller = require('../controllers/logistics.controller');

const router = Router();

// ─── 1. Contract Endpoints ───────────────────────────────────────────────────

// GET /api/logistics/available-shipments
router.get(
  '/available-shipments',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.getAvailableShipments,
);

// POST /api/logistics/shipments/:id/accept
router.post(
  '/shipments/:id/accept',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  validate(acceptShipmentSchema),
  controller.acceptShipment,
);

// POST /api/logistics/shipments/:id/milestones
router.post(
  '/shipments/:id/milestones',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  validate(updateMilestoneSchema),
  controller.updateMilestone,
);

// GET /api/logistics/shipments/:id/tracking
router.get(
  '/shipments/:id/tracking',
  authenticate,
  controller.getShipmentTracking,
);

// GET /api/logistics/shipments/:id/stream (SSE real-time stream)
router.get(
  '/shipments/:id/stream',
  authenticate,
  controller.streamTracking,
);

// ─── 2. Extended Member 4 Endpoints ──────────────────────────────────────────

// POST /api/logistics/plan (Sourcing & Logistics optimization)
router.post(
  '/plan',
  authenticate,
  requireRole(['BUYER', 'FPO', 'ADMIN', 'LOGISTICS']),
  validate(planOrderSchema),
  controller.planOrder,
);

router.post(
  '/plans/:quoteId/confirm',
  authenticate,
  requireRole(['BUYER', 'FPO', 'ADMIN', 'LOGISTICS']),
  controller.confirmPlan,
);

router.post(
  '/plans/:quoteId/dispatch',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.dispatchPlan,
);

router.post(
  '/offers/:offerId/accept',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.acceptOffer,
);

router.post(
  '/transfers/:transferPointId/handover',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.recordHandover,
);

// POST /api/logistics/shipments (Create shipment from confirmed order)
router.post(
  '/shipments',
  authenticate,
  requireRole(['BUYER', 'ADMIN', 'LOGISTICS']),
  validate(createShipmentSchema),
  controller.createShipment,
);

// GET /api/logistics/shipments (Paginated list)
router.get(
  '/shipments',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  validate(listShipmentsQuerySchema, 'query'),
  controller.listShipments,
);

// GET /api/logistics/shipments/:id (Detail)
router.get(
  '/shipments/:id',
  authenticate,
  controller.getShipmentById,
);

// GET /api/logistics/vehicles (Fleet list)
// POST /api/logistics/vehicles (Register new commercial vehicle & documents)
router.post(
  '/vehicles',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.createVehicle,
);

// GET /api/logistics/vehicles/:id (Vehicle specs & verification docs)
router.get(
  '/vehicles/:id',
  authenticate,
  controller.getVehicleDetail,
);

// GET /api/logistics/admin/verification-queue (DoCA Admin Verification Queue)
router.get(
  '/admin/verification-queue',
  authenticate,
  requireRole(['ADMIN', 'LOGISTICS']),
  controller.getAdminVerificationQueue,
);

// PATCH /api/logistics/admin/vehicles/:id/verify (Verify / Reject vehicle)
router.patch(
  '/admin/vehicles/:id/verify',
  authenticate,
  requireRole(['ADMIN']),
  controller.verifyVehicle,
);

// PATCH /api/logistics/admin/drivers/:id/verify (Verify / Reject driver profile)
router.patch(
  '/admin/drivers/:id/verify',
  authenticate,
  requireRole(['ADMIN']),
  controller.verifyDriver,
);

// PATCH /api/logistics/admin/documents/:id/verify (Verify / Reject vehicle document)
router.patch(
  '/admin/documents/:id/verify',
  authenticate,
  requireRole(['ADMIN']),
  controller.verifyDocument,
);

router.get(
  '/vehicles',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.listVehicles,
);

// POST /api/logistics/vehicles/:id/location (GPS Telemetry ping)
router.post(
  '/vehicles/:id/location',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  validate(updateLocationSchema),
  controller.updateVehicleLocation,
);

// GET /api/logistics/map/:orderId (Map pins and route polyline)
router.get(
  '/map/:orderId',
  authenticate,
  controller.getOrderMap,
);

// GET /api/logistics/analytics/savings (CVRP impact metrics)
router.get(
  '/analytics/savings',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.getSavingsAnalytics,
);

module.exports = router;
