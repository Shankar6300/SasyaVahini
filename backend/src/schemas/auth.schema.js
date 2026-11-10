/**
 * SasyaVahini — Zod Schemas for Auth Endpoints
 *
 * Owner: Member 1
 */
const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  role: z.enum(['FARMER', 'FPO', 'BUYER', 'LOGISTICS']), // ADMIN created separately
  preferredLocale: z.enum(['en', 'hi', 'mr', 'te']).optional().default('en'),

  // Role-specific profile attributes (optional on base schema)
  // Farmer attributes
  landSizeAcres: z.number().positive().nullable().optional(),
  state: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  village: z.string().nullable().optional(),
  produceTypes: z.union([z.array(z.string()), z.string()]).nullable().optional(),

  // Buyer attributes
  organizationName: z.string().nullable().optional(),
  buyerType: z.string().nullable().optional(),
  gstNumber: z.string().nullable().optional(),
  deliveryState: z.string().nullable().optional(),
  deliveryDistrict: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),

  // Logistics attributes
  companyName: z.string().nullable().optional(),
  licenseNo: z.string().nullable().optional(),
  serviceStates: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  serviceDistricts: z.union([z.array(z.string()), z.string()]).nullable().optional(),

  // FPO attributes
  fpoName: z.string().nullable().optional(),
  registrationNo: z.string().nullable().optional(),
  memberCount: z.number().int().nonnegative().nullable().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const otpRequestSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  purpose: z.enum(['LOGIN', 'PHONE_VERIFY', 'PASSWORD_RESET']),
});

const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  code: z.string().length(6),
  purpose: z.enum(['LOGIN', 'PHONE_VERIFY', 'PASSWORD_RESET']),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  otpRequestSchema,
  otpVerifySchema,
};
