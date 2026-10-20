/**
 * SasyaVahini — Auth Service
 *
 * Business logic for registration, login, token refresh, and OTP.
 * No HTTP objects here — pure functions that throw AppError subclasses.
 *
 * Owner: Member 1
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  ConflictError,
  AuthenticationError,
  NotFoundError,
  BusinessRuleError,
} = require('../utils/errors');

const BCRYPT_ROUNDS = 12;

// ─── Token helpers ────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, status: user.status },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
  );
}

function calcRefreshExpiry() {
  const days = parseInt((process.env.JWT_REFRESH_EXPIRES_IN || '7d').replace('d', ''), 10);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Registration ─────────────────────────────────────────────────────────────

async function register(data) {
  const { name, email, phone, password, role, preferredLocale } = data;

  // Unique checks
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true, phone: true },
  });

  if (existing) {
    if (existing.email === email) throw new ConflictError('Email is already registered');
    throw new ConflictError('Phone number is already registered');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role,
      preferredLocale: preferredLocale || 'en',
      status: 'PENDING_VERIFICATION',
      // Create role profile in same transaction
      farmerProfile: role === 'FARMER' ? { create: { state: '', district: '', produceTypes: [] } } : undefined,
      fpoProfile: role === 'FPO' ? { create: { fpoName: '', registrationNo: '', state: '', district: '' } } : undefined,
      buyerProfile: role === 'BUYER' ? { create: { organizationName: '', buyerType: 'Retailer' } } : undefined,
      logisticsProfile: role === 'LOGISTICS' ? { create: { companyName: '', serviceStates: [], serviceDistricts: [] } } : undefined,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
  });

  logger.info('User registered', { userId: user.id, role });
  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(email, password, meta = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, passwordHash: true },
  });

  if (!user) throw new AuthenticationError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthenticationError('Invalid email or password');

  if (user.status === 'SUSPENDED') {
    throw new AuthenticationError('Your account has been suspended. Contact support.');
  }

  // Issue tokens
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: calcRefreshExpiry(),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  logger.info('User logged in', { userId: user.id, role: user.role });

  const { passwordHash: _ph, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

async function refreshAccessToken(rawRefreshToken) {
  let payload;
  try {
    payload = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  // Find all active tokens for this user and check hashes
  const dbTokens = await prisma.refreshToken.findMany({
    where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  let matchedToken = null;
  for (const t of dbTokens) {
    const match = await bcrypt.compare(rawRefreshToken, t.tokenHash);
    if (match) { matchedToken = t; break; }
  }

  if (!matchedToken) {
    // Possible token reuse — revoke ALL tokens for this user (security measure)
    await prisma.refreshToken.updateMany({
      where: { userId: payload.sub },
      data: { revokedAt: new Date() },
    });
    logger.warn('Refresh token reuse detected — all tokens revoked', { userId: payload.sub });
    throw new AuthenticationError('Refresh token is invalid or already used');
  }

  // Revoke old token (rotation)
  await prisma.refreshToken.update({
    where: { id: matchedToken.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user || user.status === 'SUSPENDED') {
    throw new AuthenticationError('Account is not active');
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  const newHash = await bcrypt.hash(newRefreshToken, 10);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newHash,
      expiresAt: calcRefreshExpiry(),
    },
  });

  logger.info('Token refreshed', { userId: user.id });
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ─── OTP ──────────────────────────────────────────────────────────────────────

/**
 * Development-only OTP stub.
 * When ENABLE_REAL_OTP=false, OTP is logged (never sent via SMS/email).
 * The code is returned in the response only in development — NOT in production.
 *
 * In production, integrate Twilio or another provider and set ENABLE_REAL_OTP=true.
 */
async function requestOtp(phone, purpose) {
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (!user) throw new NotFoundError('User with this phone number');

  // Invalidate existing OTPs for this user/purpose
  await prisma.otpCode.updateMany({
    where: { userId: user.id, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expirySeconds = parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  await prisma.otpCode.create({
    data: { userId: user.id, code, purpose, expiresAt },
  });

  const enableReal = process.env.ENABLE_REAL_OTP === 'true';
  if (enableReal) {
    // TODO: Integrate Twilio / SMS provider (Member 3)
    throw new BusinessRuleError('Real OTP delivery not yet configured. Set ENABLE_REAL_OTP=false for development.');
  }

  logger.info('[DEV-OTP] OTP generated (not sent via SMS)', { phone, purpose, code });

  // Return code only in development — never in production
  return {
    message: 'OTP generated (development mode — check server logs)',
    expiresIn: expirySeconds,
    ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}

async function verifyOtp(phone, code, purpose) {
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (!user) throw new AuthenticationError('Invalid OTP');

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp || otp.code !== code) {
    throw new AuthenticationError('Invalid or expired OTP');
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  if (purpose === 'PHONE_VERIFY') {
    await prisma.user.update({ where: { id: user.id }, data: { isPhoneVerified: true } });
  }

  logger.info('OTP verified', { userId: user.id, purpose });
  return { verified: true };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logout(userId, rawRefreshToken) {
  if (!rawRefreshToken) return;
  const dbTokens = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null },
  });
  for (const t of dbTokens) {
    const match = await bcrypt.compare(rawRefreshToken, t.tokenHash);
    if (match) {
      await prisma.refreshToken.update({ where: { id: t.id }, data: { revokedAt: new Date() } });
      break;
    }
  }
  logger.info('User logged out', { userId });
}

module.exports = { register, login, refreshAccessToken, requestOtp, verifyOtp, logout };
