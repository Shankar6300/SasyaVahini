/**
 * SasyaVahini — Auth Routes
 *
 * POST /api/auth/register    — Public
 * POST /api/auth/login       — Public
 * POST /api/auth/refresh     — Public (requires valid refresh token)
 * POST /api/auth/logout      — Protected (requires valid access token)
 * GET  /api/auth/me          — Protected
 * POST /api/auth/otp/request — Public
 * POST /api/auth/otp/verify  — Public
 */

const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  otpRequestSchema,
  otpVerifySchema,
} = require('../schemas/auth.schema');
const controller = require('../controllers/auth.controller');

const router = Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/otp/request', validate(otpRequestSchema), controller.requestOtp);
router.post('/otp/verify', validate(otpVerifySchema), controller.verifyOtp);

module.exports = router;
