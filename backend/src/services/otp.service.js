/**
 * SasyaVahini — Secure OTP Service
 *
 * Implements cryptographically secure OTP generation, SHA-256 hash storage,
 * 5-minute expiry, 60-second resend cooldown, and rate limiting (max 5 attempts).
 */

const crypto = require('crypto');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const emailService = require('./email.service');
const smsService = require('./sms.service');

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

class OtpService {
  /**
   * Hash OTP using SHA-256
   */
  hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
  }

  /**
   * Normalize identifier (email or phone)
   */
  normalizeIdentifier(identifier) {
    if (!identifier) return '';
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return trimmed.toLowerCase();
    }
    // Phone normalization: keep digits and leading +
    return trimmed.replace(/[^\d+]/g, '');
  }

  /**
   * Generate and send an OTP
   */
  async sendOtp({ identifier, purpose = 'LOGIN', userId = null, userName = null }) {
    const cleanId = this.normalizeIdentifier(identifier);
    if (!cleanId) {
      throw new Error('Valid email or phone number is required');
    }

    const now = new Date();

    // 1. Check Resend Cooldown (60 seconds)
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        identifier: cleanId,
        purpose,
        createdAt: {
          gte: new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentOtp) {
      const elapsedSec = Math.floor((now.getTime() - new Date(recentOtp.createdAt).getTime()) / 1000);
      const remainingSec = RESEND_COOLDOWN_SECONDS - elapsedSec;
      const err = new Error(`Please wait ${remainingSec > 0 ? remainingSec : 1}s before requesting a new OTP.`);
      err.statusCode = 429;
      err.retryAfterSeconds = remainingSec;
      throw err;
    }

    // 2. Invalidate any existing active OTPs for this identifier & purpose
    await prisma.otpCode.updateMany({
      where: {
        identifier: cleanId,
        purpose,
        usedAt: null
      },
      data: {
        usedAt: now
      }
    });

    // 3. Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = this.hashOtp(rawOtp);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 4. Store in database
    await prisma.otpCode.create({
      data: {
        identifier: cleanId,
        userId: userId || undefined,
        code: hashedOtp,
        purpose,
        expiresAt,
        attempts: 0
      }
    });

    // 5. Dispatch via real channel
    const isEmail = cleanId.includes('@');
    let dispatchResult = { sent: true };
    if (isEmail) {
      dispatchResult = await emailService.sendOtpEmail({
        toEmail: cleanId,
        otp: rawOtp,
        purpose,
        userName: userName || cleanId.split('@')[0]
      });
    } else {
      dispatchResult = await smsService.sendOtpSms(cleanId, rawOtp, purpose);
    }

    logger.info('OTP generated and dispatched', {
      identifier: isEmail ? cleanId.replace(/(.{2})(.*)(@.*)/, '$1***$3') : cleanId.slice(-4),
      purpose,
      isEmail,
      delivered: Boolean(dispatchResult?.sent),
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });

    return {
      success: true,
      identifier: cleanId,
      expiresAt,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      channel: isEmail ? 'EMAIL' : 'SMS',
      delivered: Boolean(dispatchResult?.sent),
      deliveryStatus: dispatchResult?.sent ? 'DELIVERED' : (dispatchResult?.reason || 'SMS_PROVIDER_NOT_CONFIGURED'),
      message: dispatchResult?.sent
        ? (isEmail ? 'Verification code sent to your email address.' : 'Verification code sent to your mobile phone.')
        : (isEmail
            ? 'Failed to send OTP email via SMTP.'
            : 'SMS provider is not configured. Mobile OTP delivery is temporarily disabled.')
    };
  }

  /**
   * Verify an OTP
   */
  async verifyOtp({ identifier, otp, purpose = 'LOGIN' }) {
    const cleanId = this.normalizeIdentifier(identifier);
    const rawOtp = String(otp || '').trim();

    if (!cleanId || !rawOtp) {
      return { success: false, message: 'Identifier and OTP code are required.' };
    }

    const now = new Date();

    // Find the latest active OTP for this identifier & purpose
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        identifier: cleanId,
        purpose,
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      return {
        success: false,
        message: 'No active OTP found. Please request a new verification code.'
      };
    }

    // Check expiry
    if (new Date(otpRecord.expiresAt) < now) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { usedAt: now }
      });
      return {
        success: false,
        message: 'This OTP has expired. Please request a new code.'
      };
    }

    // Check rate limit attempts (max 5)
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { usedAt: now }
      });
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      };
    }

    // Validate hash
    const inputHash = this.hashOtp(rawOtp);
    if (inputHash !== otpRecord.code) {
      const updatedAttempts = otpRecord.attempts + 1;
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: updatedAttempts }
      });

      const remaining = MAX_ATTEMPTS - updatedAttempts;
      return {
        success: false,
        message: remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Invalid code. Maximum attempts exceeded. Please request a new code.'
      };
    }

    // Success: Mark as consumed
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: {
        usedAt: now
      }
    });

    // Update user verification status if linked
    if (otpRecord.userId || cleanId) {
      try {
        const updateData = {};
        if (cleanId.includes('@')) {
          updateData.isEmailVerified = true;
        } else {
          updateData.isPhoneVerified = true;
        }

        if (otpRecord.userId) {
          await prisma.user.update({
            where: { id: otpRecord.userId },
            data: updateData
          });
        } else {
          const matchingUser = await prisma.user.findFirst({
            where: cleanId.includes('@') ? { email: cleanId } : { phone: cleanId }
          });
          if (matchingUser) {
            await prisma.user.update({
              where: { id: matchingUser.id },
              data: updateData
            });
          }
        }
      } catch (userUpdErr) {
        logger.warn('Could not update user verification flag:', userUpdErr.message);
      }
    }

    return {
      success: true,
      message: 'OTP verified successfully.',
      userId: otpRecord.userId,
      identifier: cleanId
    };
  }
}

module.exports = new OtpService();
