/**
 * SasyaVahini — Auth Controller
 *
 * HTTP layer for authentication. Calls auth.service.js.
 * Owner: Member 1
 */

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/apiResponse');

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    return sendSuccess(res, { user }, 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);
    return sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.user.id, refreshToken);
    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const requestOtp = async (req, res, next) => {
  try {
    const { phone, purpose } = req.body;
    const result = await authService.requestOtp(phone, purpose);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { phone, code, purpose } = req.body;
    const result = await authService.verifyOtp(phone, code, purpose);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const { id, email, role, status } = req.user;
    return sendSuccess(res, { id, email, role, status });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, requestOtp, verifyOtp, me };
