/**
 * SasyaVahini — Farmer & FPO Zod Validation Schemas
 * Owner: Member 2 (Farmer & FPO Portals)
 */

const { z } = require('zod');

const createProduceSchema = z.object({
  cropName: z.string().trim().min(2, 'Crop name must be at least 2 characters').max(50),
  category: z.string().optional().default('Vegetables'),
  quantityKg: z.coerce.number().positive('Quantity must be greater than 0').max(100000, 'Quantity cannot exceed 100,000 kg'),
  askingPricePerKg: z.coerce.number().positive('Asking price must be greater than 0').max(10000),
  minPricePerKg: z.coerce.number().positive().optional(),
  qualityGrade: z.enum(['GRADE_A', 'GRADE_B', 'GRADE_C', 'ORGANIC_PREMIUM']).optional().default('GRADE_A'),
  isOrganic: z.coerce.boolean().optional().default(false),
  harvestDate: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pickupAddress: z.string().max(300).optional().nullable(),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits').optional().or(z.literal('')).nullable(),
  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90').optional().nullable(),
  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180').optional().nullable(),
  locationAccuracy: z.string().optional().default('GPS_PIN'),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal(''))
}).refine(data => {
  if (data.minPricePerKg !== undefined && data.minPricePerKg > data.askingPricePerKg) {
    return false;
  }
  return true;
}, {
  message: 'Minimum acceptable price cannot exceed the asking price',
  path: ['minPricePerKg']
});

const updateProduceSchema = z.object({
  cropName: z.string().trim().min(2).max(50).optional(),
  quantityKg: z.coerce.number().positive().max(100000).optional(),
  askingPricePerKg: z.coerce.number().positive().max(10000).optional(),
  minPricePerKg: z.coerce.number().positive().optional(),
  qualityGrade: z.enum(['GRADE_A', 'GRADE_B', 'GRADE_C', 'ORGANIC_PREMIUM']).optional(),
  isOrganic: z.coerce.boolean().optional(),
  harvestDate: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pickupAddress: z.string().max(300).optional().nullable(),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits').optional().or(z.literal('')).nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  locationAccuracy: z.string().optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal(''))
});

const aggregateProduceSchema = z.object({
  cropName: z.string().optional(),
  requirementId: z.string().min(1).optional().or(z.literal('')),
  listingIds: z.array(z.string().min(1, 'Invalid listing ID')).min(1, 'Please select at least 1 listing to aggregate')
});

module.exports = {
  createProduceSchema,
  updateProduceSchema,
  aggregateProduceSchema
};