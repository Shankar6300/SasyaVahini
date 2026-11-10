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
  const {
    name,
    email,
    phone,
    password,
    role,
    preferredLocale,
    // Farmer-specific fields
    landSizeAcres,
    state,
    district,
    village,
    produceTypes,
    // Buyer-specific fields
    organizationName,
    buyerType,
    gstNumber,
    deliveryState,
    deliveryDistrict,
    deliveryAddress,
    // FPO-specific fields
    fpoName,
    registrationNo,
    memberCount,
    // Logistics & Transport Partner enriched fields
    companyName,
    licenseNo,
    serviceStates,
    serviceDistricts,
    partnerType,
    ownerName,
    dob,
    emergencyContact,
    profilePhotoUrl,
    drivingLicenceNo,
    licenceExpiry,
    permittedClasses,
    licenceFrontUrl,
    licenceBackUrl,
    panNumber,
    gstin,
    businessRegNo,
    businessCertUrl,
    ownershipType,
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    // Primary vehicle inputs
    vehicleNumber,
    vehicleType,
    capacityKg,
    driverName,
    driverPhone,
    make,
    model,
    manufacturingYear,
    category,
    fuelType,
    gvwKg,
    mileageKmpl,
    dimensions,
    isRefrigerated,
    minTempC,
    maxTempC,
    baseHub,
    photoUrls,
    // Document uploads
    rcNumber,
    rcDocUrl,
    rcExpiry,
    insuranceNumber,
    insuranceDocUrl,
    insuranceExpiry,
    fitnessNumber,
    fitnessDocUrl,
    fitnessExpiry,
    permitNumber,
    permitDocUrl,
    permitExpiry,
    pucNumber,
    pucDocUrl,
    pucExpiry,
    taxNumber,
    taxDocUrl,
    taxExpiry,
    documents,
  } = data;

  // Unique checks
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedPhone = (phone || '').trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: normalizedEmail, mode: 'insensitive' } },
        { phone: normalizedPhone },
      ],
    },
    select: { email: true, phone: true },
  });

  if (existing) {
    if (existing.email.toLowerCase() === normalizedEmail) throw new ConflictError('Email is already registered');
    throw new ConflictError('Phone number is already registered');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Normalize array fields
  const parsedProduce = Array.isArray(produceTypes)
    ? produceTypes
    : typeof produceTypes === 'string' && produceTypes.trim()
    ? produceTypes.split(',').map((s) => s.trim())
    : [];

  const parsedStates = Array.isArray(serviceStates)
    ? serviceStates
    : typeof serviceStates === 'string' && serviceStates.trim()
    ? serviceStates.split(',').map((s) => s.trim())
    : state ? [state] : [];

  const parsedDistricts = Array.isArray(serviceDistricts)
    ? serviceDistricts
    : typeof serviceDistricts === 'string' && serviceDistricts.trim()
    ? serviceDistricts.split(',').map((s) => s.trim())
    : district ? [district] : [];

  const parsedPermittedClasses = Array.isArray(permittedClasses)
    ? permittedClasses
    : typeof permittedClasses === 'string' && permittedClasses.trim()
    ? permittedClasses.split(',').map((s) => s.trim())
    : ['LMV'];

  // Construct vehicle documents list if documents or individual uploads provided
  const vehicleDocs = [];
  if (Array.isArray(documents) && documents.length > 0) {
    for (const d of documents) {
      if (d.docType && (d.fileUrl || d.frontUrl)) {
        vehicleDocs.push({
          docType: d.docType,
          docNumber: d.docNumber || null,
          fileUrl: d.fileUrl || d.frontUrl || '',
          frontUrl: d.frontUrl || null,
          backUrl: d.backUrl || null,
          issueDate: d.issueDate ? new Date(d.issueDate) : null,
          expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
          verificationStatus: 'PENDING',
        });
      }
    }
  } else {
    if (rcDocUrl || rcNumber) {
      vehicleDocs.push({
        docType: 'RC',
        docNumber: rcNumber || null,
        fileUrl: rcDocUrl || 'https://storage.sasyavahini.gov.in/docs/rc_sample.pdf',
        expiryDate: rcExpiry ? new Date(rcExpiry) : null,
        verificationStatus: 'PENDING',
      });
    }
    if (insuranceDocUrl || insuranceNumber) {
      vehicleDocs.push({
        docType: 'INSURANCE',
        docNumber: insuranceNumber || null,
        fileUrl: insuranceDocUrl || 'https://storage.sasyavahini.gov.in/docs/insurance_sample.pdf',
        expiryDate: insuranceExpiry ? new Date(insuranceExpiry) : null,
        verificationStatus: 'PENDING',
      });
    }
    if (fitnessDocUrl || fitnessNumber) {
      vehicleDocs.push({
        docType: 'FITNESS',
        docNumber: fitnessNumber || null,
        fileUrl: fitnessDocUrl || 'https://storage.sasyavahini.gov.in/docs/fitness_sample.pdf',
        expiryDate: fitnessExpiry ? new Date(fitnessExpiry) : null,
        verificationStatus: 'PENDING',
      });
    }
    if (permitDocUrl || permitNumber) {
      vehicleDocs.push({
        docType: 'PERMIT',
        docNumber: permitNumber || null,
        fileUrl: permitDocUrl || 'https://storage.sasyavahini.gov.in/docs/permit_sample.pdf',
        expiryDate: permitExpiry ? new Date(permitExpiry) : null,
        verificationStatus: 'PENDING',
      });
    }
    if (pucDocUrl || pucNumber) {
      vehicleDocs.push({
        docType: 'PUC',
        docNumber: pucNumber || null,
        fileUrl: pucDocUrl || 'https://storage.sasyavahini.gov.in/docs/puc_sample.pdf',
        expiryDate: pucExpiry ? new Date(pucExpiry) : null,
        verificationStatus: 'PENDING',
      });
    }
    if (taxDocUrl || taxNumber) {
      vehicleDocs.push({
        docType: 'ROAD_TAX',
        docNumber: taxNumber || null,
        fileUrl: taxDocUrl || 'https://storage.sasyavahini.gov.in/docs/tax_sample.pdf',
        expiryDate: taxExpiry ? new Date(taxExpiry) : null,
        verificationStatus: 'PENDING',
      });
    }
  }

  const user = await prisma.user.create({
    data: {
      name: (name || '').trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role,
      preferredLocale: preferredLocale || 'en',
      status: 'PENDING_VERIFICATION',
      // Create role profile with provided attributes
      farmerProfile:
        role === 'FARMER'
          ? {
              create: {
                state: state || 'Maharashtra',
                district: district || 'Pune',
                village: village || '',
                landSizeAcres: landSizeAcres ? Number(landSizeAcres) : 1.0,
                produceTypes: parsedProduce,
              },
            }
          : undefined,
      fpoProfile:
        role === 'FPO'
          ? {
              create: {
                fpoName: fpoName || `${name} Producer Co.`,
                registrationNo: registrationNo || `FPO-${Date.now().toString().slice(-6)}`,
                memberCount: memberCount ? Number(memberCount) : 10,
                state: state || 'Maharashtra',
                district: district || 'Pune',
                address: village || district || '',
              },
            }
          : undefined,
      buyerProfile:
        role === 'BUYER'
          ? {
              create: {
                organizationName: organizationName || `${name} Enterprise`,
                buyerType: buyerType || 'Wholesaler',
                gstNumber: gstNumber || null,
                deliveryState: deliveryState || state || 'Maharashtra',
                deliveryDistrict: deliveryDistrict || district || 'Pune',
                deliveryAddress: deliveryAddress || '',
              },
            }
          : undefined,
      logisticsProfile:
        role === 'LOGISTICS'
          ? {
              create: {
                partnerType: partnerType || 'VEHICLE_OWNER',
                companyName: companyName || (partnerType === 'DRIVER' ? `${name} (Driver)` : `${name} Transport & Logistics`),
                licenseNo: licenseNo || drivingLicenceNo || `LOG-${Date.now().toString().slice(-6)}`,
                serviceStates: parsedStates.length ? parsedStates : ['Maharashtra'],
                serviceDistricts: parsedDistricts.length ? parsedDistricts : ['Pune', 'Nashik'],
                ownerName: ownerName || name,
                dob: dob ? new Date(dob) : null,
                emergencyContact: emergencyContact || null,
                profilePhotoUrl: profilePhotoUrl || null,
                drivingLicenceNo: drivingLicenceNo || null,
                licenceExpiry: licenceExpiry ? new Date(licenceExpiry) : null,
                permittedClasses: parsedPermittedClasses,
                licenceFrontUrl: licenceFrontUrl || null,
                licenceBackUrl: licenceBackUrl || null,
                driverVerified: false,
                panNumber: panNumber || null,
                gstin: gstin || null,
                businessRegNo: businessRegNo || null,
                businessCertUrl: businessCertUrl || null,
                ownershipType: ownershipType || 'Individual',
                accountHolderName: accountHolderName || name,
                bankName: bankName || null,
                accountNumber: accountNumber || null,
                ifscCode: ifscCode || null,
                verificationStatus: 'PENDING',
                vehicles: vehicleNumber
                  ? {
                      create: {
                        vehicleNumber: vehicleNumber.trim().toUpperCase(),
                        vehicleType:
                          vehicleType ||
                          (category === 'HCV' ? 'Truck' : category === 'SCV' ? 'Tempo' : 'Mini-Truck'),
                        capacityKg: capacityKg ? Number(capacityKg) : 2500,
                        driverName: driverName || ownerName || name,
                        driverPhone: driverPhone || phone,
                        make: make || 'Tata',
                        model: model || 'Intra V30',
                        manufacturingYear: manufacturingYear ? Number(manufacturingYear) : 2023,
                        category: category || 'MCV',
                        fuelType: fuelType || 'DIESEL',
                        gvwKg: gvwKg ? Number(gvwKg) : null,
                        mileageKmpl: mileageKmpl ? Number(mileageKmpl) : 14.5,
                        dimensions: dimensions || '10ft x 5.5ft x 5ft',
                        isRefrigerated: !!isRefrigerated,
                        minTempC: minTempC !== undefined && minTempC !== '' ? Number(minTempC) : null,
                        maxTempC: maxTempC !== undefined && maxTempC !== '' ? Number(maxTempC) : null,
                        baseHub: baseHub || 'Pune Agri Hub',
                        operatingDistricts: parsedDistricts.length ? parsedDistricts : ['Pune', 'Nashik'],
                        photoUrls: photoUrls ? (Array.isArray(photoUrls) ? photoUrls : [photoUrls]) : [],
                        documents: vehicleDocs.length > 0 ? { create: vehicleDocs } : undefined,
                      },
                    }
                  : undefined,
              },
            }
          : undefined,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
  });

  logger.info('User registered with enriched profile', { userId: user.id, role });
  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(email, password, meta = {}) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
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
