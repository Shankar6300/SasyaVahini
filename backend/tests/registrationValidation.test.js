/**
 * SasyaVahini — Farmer and FPO Registration Validation Audit Tests
 */

const { registerSchema } = require('../src/schemas/auth.schema');

describe('AUDIT 3: Registration Validation Audit', () => {
  const validBaseUser = {
    name: 'Dev Farmer',
    email: 'valid.farmer@sasyavahini.in',
    phone: '+919876543210',
    password: 'SecurePassword123',
    role: 'FARMER',
    district: 'Pune',
    preferredLocale: 'en'
  };

  describe('1. Universal Field Validations', () => {
    test('rejects empty or whitespace-only name', () => {
      const res = registerSchema.safeParse({ ...validBaseUser, name: '   ' });
      expect(res.success).toBe(false);
      expect(res.error.issues[0].path).toContain('name');
    });

    test('rejects invalid email formats', () => {
      const invalidEmails = ['plainaddress', 'missing@domain', '@missinguser.com', 'farmer@.com'];
      for (const email of invalidEmails) {
        const res = registerSchema.safeParse({ ...validBaseUser, email });
        expect(res.success).toBe(false);
        expect(res.error.issues[0].path).toContain('email');
      }
    });

    test('rejects invalid phone numbers (non-numeric, less than 10 digits)', () => {
      const invalidPhones = ['9876', 'not-a-number', '123456789'];
      for (const phone of invalidPhones) {
        const res = registerSchema.safeParse({ ...validBaseUser, phone });
        expect(res.success).toBe(false);
        expect(res.error.issues[0].path).toContain('phone');
      }
    });

    test('enforces password complexity (min 8 chars, 1 uppercase, 1 number)', () => {
      // Missing uppercase
      expect(registerSchema.safeParse({ ...validBaseUser, password: 'password123' }).success).toBe(false);
      // Missing number
      expect(registerSchema.safeParse({ ...validBaseUser, password: 'PasswordUppercase' }).success).toBe(false);
      // Less than 8 chars
      expect(registerSchema.safeParse({ ...validBaseUser, password: 'Pass1' }).success).toBe(false);
      // Valid password
      expect(registerSchema.safeParse({ ...validBaseUser, password: 'ValidPassword123' }).success).toBe(true);
    });
  });

  describe('2. Farmer-Specific Mandatory Validation', () => {
    test('requires district for FARMER role', () => {
      const withoutDistrict = {
        ...validBaseUser,
        role: 'FARMER',
        district: '' // Empty district
      };
      const res = registerSchema.safeParse(withoutDistrict);
      expect(res.success).toBe(false);
      const districtIssue = res.error.issues.find(i => i.path.includes('district'));
      expect(districtIssue).toBeDefined();
      expect(districtIssue.message).toMatch(/District is required for farmer/i);
    });

    test('accepts valid farmer data with district', () => {
      const withDistrict = {
        ...validBaseUser,
        role: 'FARMER',
        district: 'Pune',
        village: 'Manchar',
        landSizeAcres: 2.5
      };
      const res = registerSchema.safeParse(withDistrict);
      expect(res.success).toBe(true);
    });
  });

  describe('3. FPO-Specific Mandatory Validation', () => {
    const validFpoBase = {
      name: 'FPO Coordinator',
      email: 'fpo.coordinator@sasyavahini.in',
      phone: '+919876543211',
      password: 'FpoPassword2026',
      role: 'FPO',
      fpoName: 'Sahyadri Farmers Producer Co.',
      registrationNo: 'FPO-MH-2024-8842',
      memberCount: 45
    };

    test('rejects FPO registration when fpoName is missing or empty', () => {
      const missingName = { ...validFpoBase, fpoName: '   ' };
      const res = registerSchema.safeParse(missingName);
      expect(res.success).toBe(false);
      const issue = res.error.issues.find(i => i.path.includes('fpoName'));
      expect(issue).toBeDefined();
      expect(issue.message).toMatch(/FPO organization name is required/i);
    });

    test('rejects FPO registration when registrationNo is missing or empty', () => {
      const missingReg = { ...validFpoBase, registrationNo: '' };
      const res = registerSchema.safeParse(missingReg);
      expect(res.success).toBe(false);
      const issue = res.error.issues.find(i => i.path.includes('registrationNo'));
      expect(issue).toBeDefined();
      expect(issue.message).toMatch(/Registration number is required/i);
    });

    test('accepts completely specified FPO registration', () => {
      const res = registerSchema.safeParse(validFpoBase);
      expect(res.success).toBe(true);
    });
  });
});
