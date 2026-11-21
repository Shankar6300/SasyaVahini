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
const rateLimit = require('express-rate-limit');
const { authenticate, requireRole } = require('../middleware/auth');
const { requireVerifiedLogistics } = require('../middleware/requireVerifiedLogistics');
const { validate } = require('../middleware/validate');
const {
  planOrderSchema,
  acceptShipmentSchema,
  updateMilestoneSchema,
  createShipmentSchema,
  updateLocationSchema,
  createVehicleSchema,
  listShipmentsQuerySchema,
  recordHandoverSchema,
  selectRouteSchema,
  verifyDeliveryOtpSchema,
  uploadDocumentSchema,
  adminVerifySchema,
} = require('../schemas/logistics.schema');
const controller = require('../controllers/logistics.controller');

// Logistics endpoint rate limiters
const gpsTelemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many GPS telemetry pings. Limit: 120 pings/min.' },
  },
});

const routeCalculationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many route optimization requests. Limit: 60/min.' },
  },
});

const deliveryOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many OTP verification attempts. Please wait.' },
  },
});

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
  requireVerifiedLogistics,
  validate(acceptShipmentSchema),
  controller.acceptShipment,
);

// POST /api/logistics/shipments/:id/milestones
router.post(
  '/shipments/:id/milestones',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  requireVerifiedLogistics,
  validate(updateMilestoneSchema),
  controller.updateMilestone,
);

// POST /api/logistics/shipments/:id/verify-delivery-otp
router.post(
  '/shipments/:id/verify-delivery-otp',
  deliveryOtpLimiter,
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  requireVerifiedLogistics,
  validate(verifyDeliveryOtpSchema),
  controller.verifyDeliveryOtp,
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
  routeCalculationLimiter,
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
  requireVerifiedLogistics,
  controller.dispatchPlan,
);

router.post(
  '/offers/:offerId/accept',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  requireVerifiedLogistics,
  controller.acceptOffer,
);

router.post(
  '/transfers/:transferPointId/handover',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  validate(recordHandoverSchema),
  controller.recordHandover,
);

// GET /api/logistics/legs/:id/route-options
router.get(
  '/legs/:id/route-options',
  routeCalculationLimiter,
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN', 'BUYER']),
  controller.getLegRouteOptions,
);

// POST /api/logistics/legs/:id/select-route
router.post(
  '/legs/:id/select-route',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  requireVerifiedLogistics,
  validate(selectRouteSchema),
  controller.selectLegRoute,
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
  validate(createVehicleSchema),
  controller.createVehicle,
);

// POST /api/logistics/vehicles/:id/documents (Upload or replace statutory vehicle document)
router.post(
  '/vehicles/:id/documents',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  validate(uploadDocumentSchema),
  controller.uploadVehicleDocument,
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
  requireRole(['ADMIN']),
  controller.getAdminVerificationQueue,
);

// PATCH /api/logistics/admin/vehicles/:id/verify (Verify / Reject vehicle)
router.patch(
  '/admin/vehicles/:id/verify',
  authenticate,
  requireRole(['ADMIN']),
  validate(adminVerifySchema),
  controller.verifyVehicle,
);

// PATCH /api/logistics/admin/drivers/:id/verify (Verify / Reject driver profile)
router.patch(
  '/admin/drivers/:id/verify',
  authenticate,
  requireRole(['ADMIN']),
  validate(adminVerifySchema),
  controller.verifyDriver,
);

// PATCH /api/logistics/admin/documents/:id/verify (Verify / Reject vehicle document)
router.patch(
  '/admin/documents/:id/verify',
  authenticate,
  requireRole(['ADMIN']),
  validate(adminVerifySchema),
  controller.verifyDocument,
);

// GET /api/logistics/profile (Partner KYC profile, organization credentials & documents)
router.get(
  '/profile',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.getProfile,
);

// PUT /api/logistics/profile (Update partner profile / credentials)
router.put(
  '/profile',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.updateProfile,
);

router.patch(
  '/profile',
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  controller.updateProfile,
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
  gpsTelemetryLimiter,
  authenticate,
  requireRole(['LOGISTICS', 'ADMIN']),
  requireVerifiedLogistics,
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
