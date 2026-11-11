const { AuthorizationError, NotFoundError } = require('../utils/errors');
const prisma = require('../lib/prisma');
const { checkShipmentAccess, checkOrderAccess } = require('../utils/logisticsAuth');
const { shipmentRepo, orderRepo } = require('../adapters');
const {
  toBuyerView,
  toDriverView,
  toAdminView,
  toVehicleView,
  toProfileView,
} = require('../utils/responseMappers');

const checkLogisticsVerified = async (user) => {
  if (!user || user.role !== 'LOGISTICS') return;
  if (!prisma.logisticsProfile) return;
  const profile = await prisma.logisticsProfile.findUnique({
    where: { userId: user.id },
  });
  if (profile) {
    if (profile.verificationStatus !== 'VERIFIED') {
      throw new AuthorizationError(
        'Verification required: Your account is currently pending statutory compliance verification by DoCA. Please submit your required documents in your profile and await approval before accepting farmer shipments.'
      );
    }
    if (profile.licenceExpiry && new Date(profile.licenceExpiry) < new Date()) {
      throw new AuthorizationError(
        `Commercial Driving Licence expired on ${new Date(profile.licenceExpiry).toLocaleDateString()}. Motor Vehicles Act requires valid DL credentials. Please re-upload your renewed Driving Licence in your profile before accepting shipments.`
      );
    }
  }
};

const checkVehicleAllocationEligibility = async (vehicleId) => {
  if (!vehicleId || !prisma.vehicle) return;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { documents: true },
  });
  if (!vehicle) return;

  const now = new Date();
  const expiredDocs = (vehicle.documents || []).filter(
    (d) => d.expiryDate && new Date(d.expiryDate) < now
  );

  if (expiredDocs.length > 0) {
    const expiredList = expiredDocs
      .map((d) => `${d.docType} (expired on ${new Date(d.expiryDate).toLocaleDateString()})`)
      .join(', ');
    throw new AuthorizationError(
      `Cannot allocate vehicle ${vehicle.vehicleNumber}: Statutory document(s) expired [${expiredList}]. Motor Vehicles Act requires renewed certificates. Please re-upload renewed document(s) in the portal before this vehicle can be allocated.`
    );
  }

  if (vehicle.verificationStatus === 'REJECTED') {
    throw new AuthorizationError(
      `Cannot allocate vehicle ${vehicle.vehicleNumber}: Vehicle was REJECTED during DoCA compliance audit. Remarks: ${vehicle.adminRemarks || vehicle.rejectionReason || 'Compliance action required'}. Please re-upload required documents to reactivate.`
    );
  }
};

/**
 * SasyaVahini — Logistics Controller
 *
 * Implements all contract endpoints and extended logistics operations.
 * Uses sendSuccess, sendError, and buildPaginationMeta helpers.
 *
 * Owner: Member 4
 */

const logisticsService = require('../services/logistics.service');
const vehicleService = require('../services/vehicle.service');
const { sendSuccess, buildPaginationMeta } = require('../utils/apiResponse');

// ─── Contract Endpoints ────────────────────────────────────────────────────────

const getAvailableShipments = async (req, res, next) => {
  try {
    const shipments = await logisticsService.listAvailableShipments(req.query);
    return sendSuccess(res, shipments);
  } catch (err) {
    next(err);
  }
};

const acceptShipment = async (req, res, next) => {
  try {
    await checkLogisticsVerified(req.user);
    if (req.body?.vehicleId) {
      await checkVehicleAllocationEligibility(req.body.vehicleId);
    }
    const result = await logisticsService.acceptShipment(req.params.id, req.body, req.user?.id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const updateMilestone = async (req, res, next) => {
  try {
    const shipment = await logisticsService.getShipmentById(req.params.id);
    await checkShipmentAccess(req.user, shipment, { requireTransporter: true });
    const result = await logisticsService.updateMilestone(req.params.id, req.body, req.user?.id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const getShipmentTracking = async (req, res, next) => {
  try {
    const shipment = await logisticsService.getShipmentById(req.params.id);
    await checkShipmentAccess(req.user, shipment);
    const tracking = await logisticsService.getShipmentTracking(req.params.id);
    return sendSuccess(res, tracking);
  } catch (err) {
    next(err);
  }
};

// ─── Extended Member 4 Endpoints ──────────────────────────────────────────────

const planOrder = async (req, res, next) => {
  try {
    const planResult = await logisticsService.planOrder(req.body);
    return sendSuccess(res, planResult);
  } catch (err) {
    next(err);
  }
};

const createShipment = async (req, res, next) => {
  try {
    const { orderId, quoteId, planId } = req.body;
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId}`);
    }
    await checkOrderAccess(req.user, order);

    // Retrieve server-side quote payload if quoteId provided; never trust unverified client pricing
    let verifiedPlan = null;
    if (quoteId) {
      const quote = await shipmentRepo.findPlanQuote(quoteId);
      if (quote && quote.payload) {
        const payload = quote.payload;
        if (planId && Array.isArray(payload.plans)) {
          verifiedPlan = payload.plans.find((p) => p.planId === planId);
        } else if (Array.isArray(payload.plans) && payload.plans.length > 0) {
          verifiedPlan = payload.plans[0];
        } else if (payload.farmers) {
          verifiedPlan = payload;
        }
      }
    }

    const shipment = await logisticsService.createShipmentForOrder(
      orderId,
      verifiedPlan,
    );
    return sendSuccess(res, shipment, 201);
  } catch (err) {
    next(err);
  }
};

const confirmPlan = async (req, res, next) => {
  try {
    const plan = await logisticsService.confirmPlan(req.params.quoteId);
    return sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
};

const dispatchPlan = async (req, res, next) => {
  try {
    await checkLogisticsVerified(req.user);
    return sendSuccess(res, await logisticsService.dispatchPlan(req.params.quoteId));
  } catch (err) {
    next(err);
  }
};

const acceptOffer = async (req, res, next) => {
  try {
    await checkLogisticsVerified(req.user);
    if (req.body?.vehicleId) {
      await checkVehicleAllocationEligibility(req.body.vehicleId);
    }
    return sendSuccess(res, await logisticsService.acceptOffer(req.params.offerId, req.body.vehicleId));
  } catch (err) {
    next(err);
  }
};

const recordHandover = async (req, res, next) => {
  try {
    return sendSuccess(res, await logisticsService.recordHandover({
      ...req.body,
      transferPointId: req.params.transferPointId,
    }));
  } catch (err) {
    next(err);
  }
};

const listShipments = async (req, res, next) => {
  try {
    const { items, total, page, limit } = await logisticsService.listShipments(req.query);
    const meta = buildPaginationMeta(total, page, limit);
    return sendSuccess(res, items, 200, meta);
  } catch (err) {
    next(err);
  }
};

const getShipmentById = async (req, res, next) => {
  try {
    const shipment = await logisticsService.getShipmentById(req.params.id);
    await checkShipmentAccess(req.user, shipment);

    if (req.user?.role === 'ADMIN') {
      return sendSuccess(res, toAdminView(shipment));
    }
    if (req.user?.role === 'LOGISTICS') {
      return sendSuccess(res, toDriverView(shipment));
    }
    return sendSuccess(res, toBuyerView(shipment, req.user?.role === 'BUYER'));
  } catch (err) {
    next(err);
  }
};

const listVehicles = async (req, res, next) => {
  try {
    const vehicles = await vehicleService.listVehicles(req.query, req.user);
    const sanitized = vehicles.map((v) => toVehicleView(v, req.user));
    return sendSuccess(res, sanitized);
  } catch (err) {
    next(err);
  }
};

const updateVehicleLocation = async (req, res, next) => {
  try {
    const result = await vehicleService.recordLocation(req.params.id, req.body);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const getOrderMap = async (req, res, next) => {
  try {
    const order = await orderRepo.findById(req.params.orderId);
    if (order) {
      await checkOrderAccess(req.user, order);
    }
    const mapData = await logisticsService.getOrderMap(req.params.orderId);
    return sendSuccess(res, mapData);
  } catch (err) {
    next(err);
  }
};

const getSavingsAnalytics = async (req, res, next) => {
  try {
    const analytics = await logisticsService.getAnalyticsSavings();
    return sendSuccess(res, analytics);
  } catch (err) {
    next(err);
  }
};

/**
 * Server-Sent Events (SSE) live tracking stream
 */
const streamTracking = async (req, res, next) => {
  try {
    const shipmentId = req.params.id;
    const shipment = await logisticsService.getShipmentById(shipmentId);
    await checkShipmentAccess(req.user, shipment);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial payload
    const initial = await logisticsService.getShipmentTracking(shipmentId);
    res.write(`data: ${JSON.stringify(initial)}\n\n`);

    // Stream updates every 3 seconds
    const interval = setInterval(async () => {
      try {
        const update = await logisticsService.getShipmentTracking(shipmentId);
        res.write(`data: ${JSON.stringify(update)}\n\n`);
      } catch {
        clearInterval(interval);
      }
    }, 3000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } catch (err) {
    next(err);
  }
};


const uploadVehicleDocument = async (req, res, next) => {
  try {
    const updatedVehicle = await vehicleService.uploadVehicleDocument(
      req.params.id,
      req.body,
      req.user
    );
    return sendSuccess(res, updatedVehicle);
  } catch (err) {
    next(err);
  }
};

const createVehicle = async (req, res, next) => {
  try {
    let logisticsId;
    // Client-provided logisticsId is strictly ignored unless user is ADMIN
    if (req.user?.role === 'ADMIN' && req.body?.logisticsId) {
      logisticsId = req.body.logisticsId;
    } else {
      if (prisma.logisticsProfile) {
        const profile = await prisma.logisticsProfile.findUnique({
          where: { userId: req.user.id },
        });
        if (profile) {
          logisticsId = profile.id;
        }
      }
      if (!logisticsId) {
        if (process.env.NODE_ENV === 'test' || !prisma.logisticsProfile) {
          logisticsId = req.user?.id || 'mock_logistics_id';
        } else if (req.user?.role === 'ADMIN') {
          const anyLogistics = await prisma.logisticsProfile.findFirst();
          logisticsId = anyLogistics ? anyLogistics.id : req.user.id;
        } else {
          throw new AuthorizationError(
            'No logistics profile associated with this account. Please register as a transport partner first.'
          );
        }
      }
    }
    const vehicle = await vehicleService.createVehicle(logisticsId, req.body);
    return sendSuccess(res, vehicle, 201);
  } catch (err) {
    next(err);
  }
};

const getVehicleDetail = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.findById(req.params.id, req.user);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    return sendSuccess(res, toVehicleView(vehicle, req.user));
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const profile = await vehicleService.getProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Logistics profile not found. Please register as a transport partner first.',
      });
    }
    return sendSuccess(res, toProfileView(profile, req.user));
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await vehicleService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

const getAdminVerificationQueue = async (req, res, next) => {
  try {
    const queue = await vehicleService.getAdminVerificationQueue();
    return sendSuccess(res, queue);
  } catch (err) {
    next(err);
  }
};

const verifyVehicle = async (req, res, next) => {
  try {
    const { status = 'VERIFIED', adminRemarks = '', rejectionReason = '' } = req.body;
    const result = await vehicleService.verifyVehicle(req.params.id, {
      status,
      adminRemarks,
      rejectionReason,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const verifyDriver = async (req, res, next) => {
  try {
    const { status = 'VERIFIED', adminRemarks = '', rejectionReason = '' } = req.body;
    const result = await vehicleService.verifyDriver(req.params.id, {
      status,
      adminRemarks,
      rejectionReason,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const verifyDocument = async (req, res, next) => {
  try {
    const { status = 'VERIFIED', adminRemarks = '', rejectionReason = '' } = req.body;
    const result = await vehicleService.verifyDocument(req.params.id, {
      status,
      adminRemarks,
      rejectionReason,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getAvailableShipments,
  acceptShipment,
  updateMilestone,
  getShipmentTracking,
  planOrder,
  createShipment,
  confirmPlan,
  dispatchPlan,
  acceptOffer,
  recordHandover,
  listShipments,
  getShipmentById,
  listVehicles,
  createVehicle,
  uploadVehicleDocument,
  getVehicleDetail,
  getAdminVerificationQueue,
  verifyVehicle,
  verifyDriver,
  verifyDocument,
  updateVehicleLocation,
  getOrderMap,
  getSavingsAnalytics,
  streamTracking,
  getProfile,
  updateProfile,
};
