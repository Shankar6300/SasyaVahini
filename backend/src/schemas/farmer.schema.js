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

const updateFpoProfileSchema = z.object({
  fpoName: z.string().trim().min(3, 'FPO organization name must be at least 3 characters').max(100).optional(),
  registrationNo: z.string().trim().min(3, 'Registration number must be at least 3 characters').max(50).optional(),
  address: z.string().trim().max(300).optional().nullable(),
  district: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  contactName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Phone number must be 10-15 digits').optional()
});

const addFpoMemberSchema = z.object({
  name: z.string().trim().min(2, 'Farmer name must be at least 2 characters').max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Phone number must be 10-15 digits'),
  email: z.string().trim().email().optional().or(z.literal('')),
  village: z.string().trim().optional(),
  district: z.string().trim().optional(),
  state: z.string().trim().optional(),
  landSizeAcres: z.coerce.number().positive().max(1000).optional().default(1.0),
  produceTypes: z.array(z.string()).optional().default([])
});

const requestContributionSchema = z.object({
  requests: z.array(z.object({
    listingId: z.string().min(1, 'Listing ID is required'),
    requestedQtyKg: z.coerce.number().positive('Requested quantity must be greater than 0').max(100000),
    offeredPricePerKg: z.coerce.number().positive().optional(),
    notes: z.string().max(500).optional()
  })).min(1, 'Please select at least 1 produce listing to request contribution'),
  purpose: z.string().max(200).optional(),
  expiryHours: z.coerce.number().int().positive().max(720).optional().default(48)
});

const acceptPartialContributionSchema = z.object({
  acceptedQtyKg: z.coerce.number().positive('Accepted quantity must be greater than 0').max(100000)
});

const rejectContributionSchema = z.object({
  reason: z.string().trim().max(500).optional()
});

const createProduceLotSchema = z.object({
  cropName: z.string().trim().min(2, 'Crop name must be at least 2 characters'),
  variety: z.string().trim().optional().nullable(),
  qualityGrade: z.enum(['GRADE_A', 'GRADE_B', 'GRADE_C', 'ORGANIC_PREMIUM']).optional().default('GRADE_A'),
  unit: z.string().optional().default('kg'),
  notes: z.string().max(500).optional().nullable(),
  storageLocation: z.string().max(200).optional().nullable(),
  contributions: z.array(z.object({
    contributionId: z.string().min(1, 'Contribution ID is required'),
    quantityKg: z.coerce.number().positive('Contribution quantity must be greater than 0')
  })).min(1, 'Please select at least 1 farmer contribution to aggregate into the lot')
});

const updateLotStatusSchema = z.object({
  status: z.enum(['DRAFT', 'AGGREGATED', 'TESTED', 'READY_FOR_SALE', 'ALLOCATED', 'FULFILLED', 'CANCELLED']),
  notes: z.string().max(500).optional()
});

const allocateLotSchema = z.object({
  allocatedQtyKg: z.coerce.number().positive('Allocated quantity must be greater than 0'),
  requirementId: z.string().optional().nullable(),
  buyerName: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

const createQuotationSchema = z.object({
  requirementId: z.string().min(1, 'Buyer requirement ID is required'),
  produceLotId: z.string().optional().nullable(),
  offeredQuantityKg: z.coerce.number().positive('Offered quantity must be greater than 0 kg'),
  offeredPricePerKg: z.coerce.number().positive('Offered price per kg must be greater than 0'),
  estimatedDeliveryDate: z.string().min(1, 'Estimated delivery date is required'),
  validityDate: z.string().optional().nullable(),
  validityHours: z.coerce.number().positive().max(720).optional().default(48),
  notes: z.string().max(1000).optional().nullable()
});

const rejectQuotationSchema = z.object({
  reason: z.string().max(500).optional().nullable()
});

const createDeliverySchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
  scheduledPickupAt: z.string().optional().nullable()
});

const updateStopStatusSchema = z.object({
  status: z.enum(['PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED']),
  collectedQuantityKg: z.coerce.number().positive().optional().nullable(),
  proofNotes: z.string().max(500).optional().nullable()
});

const generateSettlementSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  commissionRatePercent: z.coerce.number().min(0).max(100).optional().nullable()
});

const recordSettlementPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentMode: z.enum(['BANK_TRANSFER', 'NEFT', 'RTGS', 'UPI', 'CHEQUE', 'CASH']).default('BANK_TRANSFER'),
  transactionRef: z.string().trim().min(2, 'Valid transaction reference / UTR / Cheque number is required').max(100),
  paymentDate: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

module.exports = {
  createProduceSchema,
  updateProduceSchema,
  aggregateProduceSchema,
  updateFpoProfileSchema,
  addFpoMemberSchema,
  requestContributionSchema,
  acceptPartialContributionSchema,
  rejectContributionSchema,
  createProduceLotSchema,
  updateLotStatusSchema,
  allocateLotSchema,
  createQuotationSchema,
  rejectQuotationSchema,
  createDeliverySchema,
  updateStopStatusSchema,
  generateSettlementSchema,
  recordSettlementPaymentSchema
};