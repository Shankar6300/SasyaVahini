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
});

const createShipmentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
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

module.exports = {
  planOrderSchema,
  acceptShipmentSchema,
  updateMilestoneSchema,
  createShipmentSchema,
  updateLocationSchema,
  createVehicleSchema,
  patchVehicleSchema,
  listShipmentsQuerySchema,
};
