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
