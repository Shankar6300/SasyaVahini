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
const prisma = require('../lib/prisma');
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
    const result = await logisticsService.acceptShipment(req.params.id, req.body, req.user?.id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const updateMilestone = async (req, res, next) => {
  try {
    const result = await logisticsService.updateMilestone(req.params.id, req.body, req.user?.id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const getShipmentTracking = async (req, res, next) => {
  try {
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
    const shipment = await logisticsService.createShipmentForOrder(
      req.body.orderId,
      req.body.planData,
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
    return sendSuccess(res, await logisticsService.dispatchPlan(req.params.quoteId));
  } catch (err) {
    next(err);
  }
};

const acceptOffer = async (req, res, next) => {
  try {
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
    return sendSuccess(res, shipment);
  } catch (err) {
    next(err);
  }
};

const listVehicles = async (req, res, next) => {
  try {
    const vehicles = await vehicleService.listVehicles(req.query);
    return sendSuccess(res, vehicles);
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


const createVehicle = async (req, res, next) => {
  try {
    let logisticsId = req.body.logisticsId;
    if (!logisticsId) {
      const profile = await prisma.logisticsProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (profile) {
        logisticsId = profile.id;
      } else if (req.user.role === 'ADMIN') {
        const anyLogistics = await prisma.logisticsProfile.findFirst();
        logisticsId = anyLogistics ? anyLogistics.id : req.user.id;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No logistics profile associated with this account. Please register as a transport partner first.',
        });
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
    const vehicle = await vehicleService.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    return sendSuccess(res, vehicle);
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
  getVehicleDetail,
  getAdminVerificationQueue,
  verifyVehicle,
  verifyDriver,
  verifyDocument,
  updateVehicleLocation,
  getOrderMap,
  getSavingsAnalytics,
  streamTracking,
};
