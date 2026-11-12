/**
 * SasyaVahini — Zod Validation Schemas for Buyer Profile & Address Endpoints
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */
const { z } = require('zod');

// GSTIN format regex: 2 digits (state code), 5 chars (PAN), 4 digits, 1 char, 1 digit/char, 1 'Z', 1 digit/char
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

const updateBuyerProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  preferredLocale: z.enum(['en', 'hi', 'te', 'mr']).optional(),

  // Business profile fields
  organizationName: z.string().min(2).max(150).optional(),
  businessCategory: z.string().max(80).optional(),
  contactPerson: z.string().max(100).optional(),
  gstNumber: z
    .string()
    .trim()
    .refine((val) => !val || GSTIN_REGEX.test(val), {
      message: 'Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)',
    })
    .optional()
    .nullable(),

  // Delivery defaults
  deliveryAddress: z.string().max(250).optional(),
  deliveryDistrict: z.string().max(80).optional(),
  deliveryState: z.string().max(80).optional(),

  // Billing address fields
  billingAddress: z.string().max(250).optional().nullable(),
  billingState: z.string().max(80).optional().nullable(),
  billingDistrict: z.string().max(80).optional().nullable(),
  billingPincode: z
    .string()
    .trim()
    .refine((val) => !val || PINCODE_REGEX.test(val), {
      message: 'Invalid 6-digit postal code',
    })
    .optional()
    .nullable(),
  billingGstin: z
    .string()
    .trim()
    .refine((val) => !val || GSTIN_REGEX.test(val), {
      message: 'Invalid billing GSTIN format',
    })
    .optional()
    .nullable(),

  // Request verification
  requestVerification: z.boolean().optional(),
});

const addressSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name is required').max(100),
  contactNumber: z.string().regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  addressType: z.enum(['HOME', 'BUSINESS', 'BILLING', 'OTHER']).default('HOME'),
  addressLine1: z.string().min(5, 'Address line 1 is required').max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  locality: z.string().max(100).optional().nullable(),
  city: z.string().min(2, 'City/District is required').max(80),
  state: z.string().min(2, 'State is required').max(80),
  postalCode: z.string().regex(PINCODE_REGEX, 'Enter a valid 6-digit postal code'),
  country: z.string().default('India'),
  deliveryInstructions: z.string().max(300).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

const updateAddressSchema = addressSchema.partial();

const updateSettingsSchema = z.object({
  preferredLocale: z.enum(['en', 'hi', 'te', 'mr']).optional(),
  notificationPreferences: z
    .object({
      orderUpdates: z.boolean().optional(),
      deliveryAlerts: z.boolean().optional(),
      priceDrops: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      smsEnabled: z.boolean().optional(),
      emailEnabled: z.boolean().optional(),
    })
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

module.exports = {
  updateBuyerProfileSchema,
  addressSchema,
  updateAddressSchema,
  updateSettingsSchema,
  changePasswordSchema,
};
