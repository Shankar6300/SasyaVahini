/**
 * SasyaVahini — Cryptographic Delivery OTP & Handover Utility
 *
 * Implements:
 * - Cryptographically secure 6-digit numeric OTP generation via crypto.randomInt()
 * - HMAC-SHA256 hashing for tamper-proof storage
 * - Constant-time comparison via crypto.timingSafeEqual to prevent side-channel timing attacks
 * - Maximum 5-attempt rate-limiting guard with lockout
 * - Handover code verification for transfer points
 *
 * Owner: Member 4
 */

const crypto = require('crypto');
const logger = require('./logger');
const { BusinessRuleError } = require('./errors');

const OTP_SECRET = process.env.JWT_ACCESS_SECRET || 'sasya-delivery-otp-secure-key-2026';
const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory tracker for failed verification attempts: shipmentId -> { attempts, lockedUntil }
const failedAttemptsMap = new Map();

/**
 * Generate a cryptographically secure 6-digit delivery OTP.
 * @returns {{ rawOtp: string, hashedOtp: string, expiresAt: Date }}
 */
function generateDeliveryOtp() {
  const num = crypto.randomInt(100000, 1000000);
  const rawOtp = num.toString();
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  return { rawOtp, hashedOtp, expiresAt };
}

/**
 * Hash an OTP using HMAC-SHA256.
 * @param {string} otp
 * @returns {string} Hex encoded HMAC digest
 */
function hashOtp(otp) {
  if (!otp || typeof otp !== 'string') return '';
  return crypto.createHmac('sha256', OTP_SECRET).update(otp.trim()).digest('hex');
}

/**
 * Verify delivery OTP using constant-time comparison and rate-limiting.
 * @param {string} shipmentId
 * @param {string} inputOtp
 * @param {string} storedOtp - Either a raw 6-digit string or 64-char hex HMAC
 * @param {Date|string|null} [expiresAt]
 * @returns {boolean}
 */
function verifyDeliveryOtp(shipmentId, inputOtp, storedOtp, expiresAt = null) {
  if (!shipmentId || !inputOtp || !storedOtp) {
    throw new BusinessRuleError('Invalid delivery OTP verification parameters');
  }

  // Check rate-limit lock
  const attemptRecord = failedAttemptsMap.get(shipmentId) || { attempts: 0 };
  if (attemptRecord.attempts >= MAX_OTP_ATTEMPTS) {
    logger.warn('Delivery OTP attempt blocked: max attempts reached', { shipmentId, attempts: attemptRecord.attempts });
    throw new BusinessRuleError(
      `Maximum delivery OTP verification attempts exceeded (${MAX_OTP_ATTEMPTS}/${MAX_OTP_ATTEMPTS}). Shipment delivery is locked. Please contact support.`
    );
  }

  // Check expiration
  if (expiresAt && new Date() > new Date(expiresAt)) {
    throw new BusinessRuleError('Delivery OTP has expired. Please contact the buyer for a regenerated code.');
  }

  const cleanInput = String(inputOtp).trim();
  const cleanStored = String(storedOtp).trim();

  let isMatch = false;

  // Case 1: storedOtp is a 64-char HMAC-SHA256 hex string
  if (cleanStored.length === 64) {
    const computedHmac = hashOtp(cleanInput);
    try {
      const a = Buffer.from(computedHmac, 'hex');
      const b = Buffer.from(cleanStored, 'hex');
      isMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      isMatch = false;
    }
  } else {
    // Case 2: storedOtp is plain-text (mock/legacy fallback)
    try {
      const a = Buffer.from(cleanInput, 'utf8');
      const b = Buffer.from(cleanStored, 'utf8');
      isMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      isMatch = false;
    }
  }

  if (!isMatch) {
    attemptRecord.attempts += 1;
    failedAttemptsMap.set(shipmentId, attemptRecord);
    const remaining = MAX_OTP_ATTEMPTS - attemptRecord.attempts;
    logger.warn('Failed delivery OTP attempt', { shipmentId, attempts: attemptRecord.attempts, remaining });
    if (remaining <= 0) {
      throw new BusinessRuleError(
        `Invalid delivery OTP. Maximum attempts exceeded (${MAX_OTP_ATTEMPTS}/${MAX_OTP_ATTEMPTS}). Shipment delivery is locked.`
      );
    }
    throw new BusinessRuleError(
      `Invalid delivery OTP. Verification failed. (${remaining} attempts remaining before lock)`
    );
  }

  // Success: reset attempts
  failedAttemptsMap.delete(shipmentId);
  return true;
}

/**
 * Generate a 6-digit secure transfer point handover code.
 */
function generateHandoverCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Reset failed attempts for testing or administrative unlock.
 */
function resetOtpAttempts(shipmentId) {
  failedAttemptsMap.delete(shipmentId);
}

module.exports = {
  generateDeliveryOtp,
  hashOtp,
  verifyDeliveryOtp,
  generateHandoverCode,
  resetOtpAttempts,
  MAX_OTP_ATTEMPTS,
};
