/**
 * SasyaVahini — OTP Security, Rate-Limiting & Expiry Audit Tests
 */

const crypto = require('crypto');
const otpService = require('../src/services/otp.service');
const prisma = require('../src/lib/prisma');
const emailService = require('../src/services/email.service');
const smsService = require('../src/services/sms.service');

describe('AUDIT 2: Email and SMS OTP Security Flow', () => {
  const testEmail = 'audit.otp.farmer@example.com';
  const testPhone = '+919988776655';

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('1. Cryptographic Generation & SHA-256 Storage', () => {
    test('hashes raw OTP with SHA-256 before database storage', () => {
      const rawCode = '492810';
      const hash = otpService.hashOtp(rawCode);
      const expected = crypto.createHash('sha256').update(rawCode).digest('hex');

      expect(hash).toBe(expected);
      expect(hash).toHaveLength(64); // Standard SHA-256 hex string
      expect(hash).not.toBe(rawCode);
    });

    test('normalizes email and phone identifiers cleanly', () => {
      expect(otpService.normalizeIdentifier('  Farmer@Example.COM ')).toBe('farmer@example.com');
      expect(otpService.normalizeIdentifier('+91 98765-43210')).toBe('+919876543210');
    });
  });

  describe('2. Delivery Routing & Provider Integration', () => {
    test('routes email identifiers to emailService.sendOtpEmail', async () => {
      const emailSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue({ sent: true });

      // Mock prisma create and lookups
      jest.spyOn(prisma.otpCode, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.otpCode, 'updateMany').mockResolvedValue({ count: 0 });
      jest.spyOn(prisma.otpCode, 'create').mockResolvedValue({ id: 'otp-uuid-1' });

      const res = await otpService.sendOtp({
        identifier: testEmail,
        purpose: 'EMAIL_VERIFY',
        userName: 'Audit Farmer'
      });

      expect(res.success).toBe(true);
      expect(res.channel).toBe('EMAIL');
      expect(emailSpy).toHaveBeenCalledTimes(1);
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: testEmail,
          purpose: 'EMAIL_VERIFY'
        })
      );
    });

    test('routes phone identifiers to smsService.sendOtpSms', async () => {
      const smsSpy = jest.spyOn(smsService, 'sendOtpSms').mockResolvedValue({ sent: true });

      jest.spyOn(prisma.otpCode, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.otpCode, 'updateMany').mockResolvedValue({ count: 0 });
      jest.spyOn(prisma.otpCode, 'create').mockResolvedValue({ id: 'otp-uuid-2' });

      const res = await otpService.sendOtp({
        identifier: testPhone,
        purpose: 'PHONE_VERIFY'
      });

      expect(res.success).toBe(true);
      expect(res.channel).toBe('SMS');
      expect(smsSpy).toHaveBeenCalledTimes(1);
      expect(smsSpy).toHaveBeenCalledWith(testPhone, expect.any(String), 'PHONE_VERIFY');
    });
  });

  describe('3. Rate Limiting, Cooldown & 5-Attempt Restrictions', () => {
    test('enforces 60-second resend cooldown (rejects rapid consecutive requests)', async () => {
      // Mock an existing recent OTP created 20 seconds ago
      const recentDate = new Date(Date.now() - 20 * 1000);
      jest.spyOn(prisma.otpCode, 'findFirst').mockResolvedValueOnce({
        id: 'recent-otp',
        identifier: testEmail,
        createdAt: recentDate
      });

      await expect(
        otpService.sendOtp({ identifier: testEmail, purpose: 'LOGIN' })
      ).rejects.toThrow(/Please wait \d+s before requesting a new OTP/);
    });

    test('rejects expired OTP (expiresAt < now)', async () => {
      const expiredDate = new Date(Date.now() - 1000); // Expired 1 second ago
      jest.spyOn(prisma.otpCode, 'findFirst').mockResolvedValueOnce({
        id: 'expired-otp',
        identifier: testEmail,
        code: otpService.hashOtp('123456'),
        expiresAt: expiredDate,
        attempts: 0
      });
      jest.spyOn(prisma.otpCode, 'update').mockResolvedValue({});

      const res = await otpService.verifyOtp({
        identifier: testEmail,
        otp: '123456',
        purpose: 'LOGIN'
      });

      expect(res.success).toBe(false);
      expect(res.message).toMatch(/expired/i);
    });

    test('increments attempts on invalid OTP and displays remaining attempts', async () => {
      const validHash = otpService.hashOtp('654321');
      jest.spyOn(prisma.otpCode, 'findFirst').mockResolvedValueOnce({
        id: 'active-otp',
        identifier: testEmail,
        code: validHash,
        expiresAt: new Date(Date.now() + 240000),
        attempts: 2 // 2 prior failed attempts
      });

      const updateSpy = jest.spyOn(prisma.otpCode, 'update').mockResolvedValue({});

      const res = await otpService.verifyOtp({
        identifier: testEmail,
        otp: '000000', // Incorrect code
        purpose: 'LOGIN'
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('2 attempts remaining');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { attempts: 3 }
        })
      );
    });

    test('locks out and invalidates OTP after 5 failed attempts', async () => {
      const validHash = otpService.hashOtp('654321');
      jest.spyOn(prisma.otpCode, 'findFirst').mockResolvedValueOnce({
        id: 'active-otp-exhausted',
        identifier: testEmail,
        code: validHash,
        expiresAt: new Date(Date.now() + 240000),
        attempts: 5 // Max reached
      });

      const updateSpy = jest.spyOn(prisma.otpCode, 'update').mockResolvedValue({});

      const res = await otpService.verifyOtp({
        identifier: testEmail,
        otp: '654321', // Even if correct now, already locked out
        purpose: 'LOGIN'
      });

      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Maximum verification attempts exceeded/i);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { usedAt: expect.any(Date) }
        })
      );
    });

    test('marks OTP as consumed upon successful verification and prevents reuse', async () => {
      const rawCode = '789123';
      const validHash = otpService.hashOtp(rawCode);

      jest.spyOn(prisma.otpCode, 'findFirst').mockResolvedValueOnce({
        id: 'valid-otp-token',
        identifier: testEmail,
        code: validHash,
        expiresAt: new Date(Date.now() + 240000),
        attempts: 0
      });

      const updateSpy = jest.spyOn(prisma.otpCode, 'update').mockResolvedValue({});
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      const res = await otpService.verifyOtp({
        identifier: testEmail,
        otp: rawCode,
        purpose: 'EMAIL_VERIFY'
      });

      expect(res.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'valid-otp-token' },
          data: { usedAt: expect.any(Date) }
        })
      );
    });
  });
});
