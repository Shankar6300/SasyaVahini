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

  // Transport Partner Sub-Roles & Personal Details
  partnerType: z.string().optional(),
  ownerName: z.string().optional(),
  dob: z.string().optional(),
  emergencyContact: z.string().optional(),
  profilePhotoUrl: z.string().optional(),

  // Driving Licence Verification
  drivingLicenceNo: z.string().optional(),
  licenceExpiry: z.string().optional(),
  permittedClasses: z.union([z.array(z.string()), z.string()]).optional(),
  licenceFrontUrl: z.string().optional(),
  licenceBackUrl: z.string().optional(),

  // Fleet Operator Business Credentials
  panNumber: z.string().optional(),
  gstin: z.string().optional(),
  businessRegNo: z.string().optional(),
  businessCertUrl: z.string().optional(),
  ownershipType: z.string().optional(),

  // Payout & Banking Credentials
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),

  // Commercial Vehicle Specifications
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  capacityKg: z.number().positive().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  manufacturingYear: z.number().optional(),
  category: z.string().optional(),
  fuelType: z.string().optional(),
  gvwKg: z.number().optional(),
  mileageKmpl: z.number().positive().optional(),
  dimensions: z.string().optional(),
  isRefrigerated: z.boolean().optional(),
  minTempC: z.number().optional(),
  maxTempC: z.number().optional(),
  baseHub: z.string().optional(),
  photoUrls: z.union([z.array(z.string()), z.string()]).optional(),
  documents: z.array(z.any()).optional(),

  // Statutory Document Uploads
  rcNumber: z.string().optional(),
  rcDocUrl: z.string().optional(),
  rcExpiry: z.string().optional(),
  insuranceNumber: z.string().optional(),
  insuranceDocUrl: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  fitnessNumber: z.string().optional(),
  fitnessDocUrl: z.string().optional(),
  fitnessExpiry: z.string().optional(),
  permitNumber: z.string().optional(),
  permitDocUrl: z.string().optional(),
  permitExpiry: z.string().optional(),
  pucNumber: z.string().optional(),
  pucDocUrl: z.string().optional(),
  pucExpiry: z.string().optional(),
  taxNumber: z.string().optional(),
  taxDocUrl: z.string().optional(),
  taxExpiry: z.string().optional(),
}).passthrough();

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
