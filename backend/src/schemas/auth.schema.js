/**
 * SasyaVahini — Zod Schemas for Auth Endpoints
 *
 * Owner: Member 1
 */
const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  role: z.enum(['FARMER', 'FPO', 'BUYER', 'LOGISTICS']), // ADMIN created separately
  preferredLocale: z.enum(['en', 'hi', 'mr']).optional().default('en'),

  // Role-specific profile attributes (optional on base schema)
  // Farmer attributes
  landSizeAcres: z.number().positive().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  village: z.string().optional(),
  produceTypes: z.union([z.array(z.string()), z.string()]).optional(),

  // Buyer attributes
  organizationName: z.string().optional(),
  buyerType: z.string().optional(),
  gstNumber: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryDistrict: z.string().optional(),
  deliveryAddress: z.string().optional(),

  // Logistics attributes
  companyName: z.string().optional(),
  licenseNo: z.string().optional(),
  serviceStates: z.union([z.array(z.string()), z.string()]).optional(),
  serviceDistricts: z.union([z.array(z.string()), z.string()]).optional(),

  // FPO attributes
  fpoName: z.string().optional(),
  registrationNo: z.string().optional(),
  memberCount: z.number().int().nonnegative().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
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
