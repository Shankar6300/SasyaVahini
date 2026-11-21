/**
 * SasyaVahini — Google OAuth Security & Account Linking Audit Tests
 */

const googleAuthService = require('../src/services/googleAuth.service');
const authService = require('../src/services/auth.service');
const prisma = require('../src/lib/prisma');
const { AuthenticationError, ConflictError } = require('../src/utils/errors');

describe('AUDIT 1: Google Authentication Security', () => {
  const originalEnv = process.env.GOOGLE_CLIENT_ID;

  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id-12345.apps.googleusercontent.com';
  });

  afterAll(() => {
    process.env.GOOGLE_CLIENT_ID = originalEnv;
  });

  describe('1. Google Token Verification & Issuer Validation', () => {
    test('rejects missing or empty ID token', async () => {
      await expect(googleAuthService.verifyIdToken('')).rejects.toThrow('Google ID token is required');
    });

    test('rejects token when GOOGLE_CLIENT_ID is not configured in env', async () => {
      const prev = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;
      await expect(googleAuthService.verifyIdToken('sample-token')).rejects.toThrow(/Google OAuth is not configured/);
      process.env.GOOGLE_CLIENT_ID = prev;
    });

    test('rejects expired Google token or invalid signature', async () => {
      await expect(googleAuthService.verifyIdToken('invalid.jwt.token')).rejects.toThrow(/Google authentication failed/);
    });
  });

  describe('2. Account Takeover Protection & Unverified Email Rejection', () => {
    test('strictly rejects Google login if email is unverified (emailVerified = false)', async () => {
      // Mock verifyIdToken returning unverified email
      jest.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
        googleId: 'google-attacker-999',
        email: 'victim@demo.sasyavahini.in',
        name: 'Attacker Account',
        picture: 'https://example.com/pic.png',
        emailVerified: false // Unverified!
      });

      await expect(
        authService.googleLogin('mock-unverified-token')
      ).rejects.toThrow(/Google account email is not verified/);
    });

    test('prevents Google account linking on administrative accounts (role = ADMIN)', async () => {
      jest.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
        googleId: 'google-admin-takeover-id',
        email: 'admin@demo.sasyavahini.in',
        name: 'Admin Google',
        picture: null,
        emailVerified: true
      });

      // Mock user lookup finding an ADMIN user
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce({
        id: 'admin-user-uuid',
        email: 'admin@demo.sasyavahini.in',
        role: 'ADMIN',
        googleId: null
      });

      await expect(
        authService.googleLogin('mock-admin-token')
      ).rejects.toThrow(/Administrator accounts cannot be accessed via Google sign-in/);
    });

    test('prevents re-linking if account is already linked to a different googleId', async () => {
      jest.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
        googleId: 'new-different-google-id',
        email: 'farmer@demo.sasyavahini.in',
        name: 'Farmer User',
        picture: null,
        emailVerified: true
      });

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce({
        id: 'farmer-user-uuid',
        email: 'farmer@demo.sasyavahini.in',
        role: 'FARMER',
        googleId: 'original-existing-google-id' // Already linked to another ID!
      });

      await expect(
        authService.googleLogin('mock-relink-token')
      ).rejects.toThrow(/already linked to a different Google profile/);
    });
  });

  describe('3. Guided Registration & Mobile OTP Safeguards', () => {
    test('returns requiresRegistration without generating JWT for unknown Google users', async () => {
      jest.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
        googleId: 'new-farmer-google-101',
        email: 'newfarmer@example.com',
        name: 'New Farmer User',
        picture: 'https://example.com/avatar.jpg',
        emailVerified: true
      });

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce(null);

      const result = await authService.googleLogin('mock-new-user-token', 'FARMER');

      expect(result.requiresRegistration).toBe(true);
      expect(result.googleId).toBe('new-farmer-google-101');
      expect(result.email).toBe('newfarmer@example.com');
      expect(result.name).toBe('New Farmer User');
      expect(result.role).toBe('FARMER');
      // Must NOT return session tokens
      expect(result.accessToken).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
    });

    test('prohibits Google user from claiming ADMIN role during guided registration', async () => {
      jest.spyOn(googleAuthService, 'verifyIdToken').mockResolvedValueOnce({
        googleId: 'rogue-google-admin-attempt',
        email: 'rogue@example.com',
        name: 'Rogue User',
        picture: null,
        emailVerified: true
      });

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce(null);

      const result = await authService.googleLogin('mock-token', 'ADMIN');
      // Prohibits ADMIN, defaults to safe FARMER role
      expect(result.role).toBe('FARMER');
      expect(result.requiresRegistration).toBe(true);
    });
  });
});
