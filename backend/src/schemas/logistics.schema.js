/**
 * SasyaVahini — Zod Validation Schemas for Logistics Endpoints
 * Produces 422 VALIDATION_ERROR on validation failure.
 *
 * Owner: Member 4
 */

const { z } = require('zod');

const planOrderSchema = z.object({
  crop: z.string().min(1, 'Crop name is required'),
  qtyKg: z.number().positive('Quantity must be greater than 0'),
  maxBudget: z.number().positive('Max budget must be greater than 0').optional().default(Infinity),
  minGrade: z.enum(['GRADE_C', 'GRADE_B', 'GRADE_A', 'ORGANIC_PREMIUM']).optional().default('GRADE_B'),
  minReliability: z.number().min(0).max(1).optional().default(0.70),
  priority: z.number().min(0).max(1).optional().default(0.50),
  buyerLat: z.number().min(-90).max(90, 'Invalid latitude'),
  buyerLng: z.number().min(-180).max(180, 'Invalid longitude'),
  buyerAddress: z.string().optional(),
});

const acceptShipmentSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverNotes: z.string().optional(),
});

const updateMilestoneSchema = z.object({
  milestone: z.enum(['ASSIGNED', 'PICKUP', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'], {
    errorMap: () => ({ message: 'Milestone must be ASSIGNED, PICKUP, TRANSIT, OUT_FOR_DELIVERY, or DELIVERED' }),
  }),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  stopId: z.string().optional(),
  temperatureC: z.number().optional(),
  notes: z.string().optional(),
  deliveryOtp: z.string().length(6, 'Delivery OTP must be exactly 6 digits').optional(),
  geofenceOverrideReason: z.enum(['GPS_INACCURATE', 'ACCESS_ROAD_BLOCKED', 'SECURITY_GATE_DELIVERY', 'OTHER']).optional(),
});

const createShipmentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  quoteId: z.string().optional(),
  planId: z.string().optional(),
  planData: z.record(z.any()).optional(),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).optional().default(0),
  temperatureC: z.number().optional(),
});

const createVehicleSchema = z.object({
  vehicleNumber: z.string().min(3),
  vehicleType: z.string().min(2),
  capacityKg: z.number().positive(),
  driverName: z.string().min(2),
  driverPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  currentLatitude: z.number().optional(),
  currentLongitude: z.number().optional(),
});

const patchVehicleSchema = z.object({
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'MAINTENANCE']).optional(),
  driverName: z.string().min(2).optional(),
  driverPhone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  currentLatitude: z.number().optional(),
  currentLongitude: z.number().optional(),
});

const listShipmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.string().optional(),
});

const recordHandoverSchema = z.object({
  shipmentId: z.string().min(1, 'Shipment ID is required'),
  feederDriverId: z.string().min(1, 'Feeder driver ID is required'),
  linehaulDriverId: z.string().min(1, 'Linehaul driver ID is required'),
  feederKg: z.number().positive('Feeder weight in kg must be positive'),
  linehaulKg: z.number().positive('Linehaul weight in kg must be positive'),
  feederOtp: z.string().length(6, 'Feeder OTP must be 6 digits'),
  linehaulOtp: z.string().length(6, 'Linehaul OTP must be 6 digits'),
});

const selectRouteSchema = z.object({
  selectedRouteIndex: z.number().int().min(0).max(2, 'Route index must be 0, 1, or 2'),
  deviationReason: z.enum(['ROAD_CLOSED', 'FLOOD', 'ACCIDENT', 'WEIGHT_LIMIT', 'OTHER']).optional(),
});

module.exports = {
  planOrderSchema,
  acceptShipmentSchema,
  updateMilestoneSchema,
  createShipmentSchema,
  updateLocationSchema,
  createVehicleSchema,
  patchVehicleSchema,
  listShipmentsQuerySchema,
  recordHandoverSchema,
  selectRouteSchema,
};
