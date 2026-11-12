/**
 * SasyaVahini — Buyer Profile & Address Controller (Phase 2)
 *
 * Implements authenticated profile management, address management,
 * account settings, and password updates for buyers.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} = require('../utils/errors');

const BCRYPT_ROUNDS = 12;

/**
 * Helper to compute actual profile completion percentage and checklist
 */
function calculateProfileCompletion(user, buyerProfile) {
  let score = 0;
  const checklist = {
    basicInfo: false,
    addressAdded: false,
    contactVerified: false,
    businessInfo: false,
  };

  // 1. Basic Information (name, email, phone) — 30%
  if (user.name && user.email && user.phone) {
    score += 30;
    checklist.basicInfo = true;
  }

  // 2. Delivery Address Added — 30%
  const hasSavedAddress =
    (buyerProfile?.addresses && buyerProfile.addresses.length > 0) ||
    Boolean(buyerProfile?.deliveryAddress);
  if (hasSavedAddress) {
    score += 30;
    checklist.addressAdded = true;
  }

  // 3. Contact Verified (Email or Phone) — 20%
  if (user.isEmailVerified || user.isPhoneVerified) {
    score += 20;
    checklist.contactVerified = true;
  }

  // 4. Role-specific completion — 20%
  const isBusiness =
    buyerProfile?.buyerType &&
    buyerProfile.buyerType.toUpperCase() !== 'CONSUMER' &&
    buyerProfile.buyerType.toUpperCase() !== 'INDIVIDUAL';

  if (isBusiness) {
    if (buyerProfile?.organizationName && (buyerProfile?.gstNumber || buyerProfile?.businessCategory)) {
      score += 20;
      checklist.businessInfo = true;
    }
  } else {
    // Individual consumer completed preferences
    if (buyerProfile?.notificationPreferences || user.preferredLocale) {
      score += 20;
      checklist.businessInfo = true;
    }
  }

  return {
    completionPercentage: Math.min(100, score),
    checklist,
    isComplete: score >= 80,
  };
}

/**
 * Ensure buyer profile exists for user
 */
async function getOrCreateBuyerProfile(userId, userName) {
  let profile = await prisma.buyerProfile.findUnique({
    where: { userId },
    include: {
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!profile) {
    profile = await prisma.buyerProfile.create({
      data: {
        userId,
        organizationName: `${userName} (Buyer)`,
        buyerType: 'Individual',
        verificationStatus: 'NOT_SUBMITTED',
      },
      include: {
        addresses: true,
      },
    });
  }

  return profile;
}

/**
 * GET /api/buyer/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        preferredLocale: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundError('User profile not found');

    const buyerProfile = await getOrCreateBuyerProfile(req.user.id, user.name);
    const { completionPercentage, checklist, isComplete } = calculateProfileCompletion(
      user,
      buyerProfile
    );

    return sendSuccess(res, {
      user,
      profile: buyerProfile,
      completionPercentage,
      checklist,
      isComplete,
      addresses: buyerProfile.addresses || [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/buyer/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      name,
      preferredLocale,
      organizationName,
      businessCategory,
      contactPerson,
      gstNumber,
      deliveryAddress,
      deliveryDistrict,
      deliveryState,
      billingAddress,
      billingState,
      billingDistrict,
      billingPincode,
      billingGstin,
      requestVerification,
    } = req.body;

    // 1. Update user fields
    const userUpdates = {};
    if (name) userUpdates.name = name;
    if (preferredLocale) userUpdates.preferredLocale = preferredLocale;

    let updatedUser = null;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: userUpdates,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          preferredLocale: true,
        },
      });
    } else {
      updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          status: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          preferredLocale: true,
        },
      });
    }

    // 2. Prepare BuyerProfile updates
    const currentProfile = await getOrCreateBuyerProfile(userId, updatedUser.name);
    const profileUpdates = {};

    if (organizationName !== undefined) profileUpdates.organizationName = organizationName;
    if (businessCategory !== undefined) profileUpdates.businessCategory = businessCategory;
    if (contactPerson !== undefined) profileUpdates.contactPerson = contactPerson;
    if (gstNumber !== undefined) profileUpdates.gstNumber = gstNumber;
    if (deliveryAddress !== undefined) profileUpdates.deliveryAddress = deliveryAddress;
    if (deliveryDistrict !== undefined) profileUpdates.deliveryDistrict = deliveryDistrict;
    if (deliveryState !== undefined) profileUpdates.deliveryState = deliveryState;
    if (billingAddress !== undefined) profileUpdates.billingAddress = billingAddress;
    if (billingState !== undefined) profileUpdates.billingState = billingState;
    if (billingDistrict !== undefined) profileUpdates.billingDistrict = billingDistrict;
    if (billingPincode !== undefined) profileUpdates.billingPincode = billingPincode;
    if (billingGstin !== undefined) profileUpdates.billingGstin = billingGstin;

    // Transition verification to PENDING if requested and not already VERIFIED
    if (requestVerification) {
      if (currentProfile.verificationStatus !== 'VERIFIED') {
        profileUpdates.verificationStatus = 'PENDING';
        profileUpdates.verificationNotes = 'Verification documents and details submitted by buyer.';
      }
    }

    const updatedProfile = await prisma.buyerProfile.update({
      where: { id: currentProfile.id },
      data: profileUpdates,
      include: {
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    const { completionPercentage, checklist, isComplete } = calculateProfileCompletion(
      updatedUser,
      updatedProfile
    );

    logger.info('Buyer profile updated', { userId });

    return sendSuccess(res, {
      user: updatedUser,
      profile: updatedProfile,
      completionPercentage,
      checklist,
      isComplete,
      addresses: updatedProfile.addresses || [],
      message: 'Profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/buyer/addresses
 */
const getAddresses = async (req, res, next) => {
  try {
    const buyerProfile = await getOrCreateBuyerProfile(req.user.id, req.user.name || 'Buyer');
    const addresses = await prisma.buyerAddress.findMany({
      where: { buyerId: buyerProfile.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return sendSuccess(res, addresses);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/buyer/addresses
 */
const createAddress = async (req, res, next) => {
  try {
    const buyerProfile = await getOrCreateBuyerProfile(req.user.id, req.user.name || 'Buyer');
    const existingCount = await prisma.buyerAddress.count({
      where: { buyerId: buyerProfile.id },
    });

    // If first address or requested default, set as default
    const shouldBeDefault = req.body.isDefault === true || existingCount === 0;

    const result = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.buyerAddress.updateMany({
          where: { buyerId: buyerProfile.id },
          data: { isDefault: false },
        });
      }

      const created = await tx.buyerAddress.create({
        data: {
          buyerId: buyerProfile.id,
          recipientName: req.body.recipientName,
          contactNumber: req.body.contactNumber,
          addressType: req.body.addressType || 'HOME',
          addressLine1: req.body.addressLine1,
          addressLine2: req.body.addressLine2 || null,
          locality: req.body.locality || null,
          city: req.body.city,
          state: req.body.state,
          postalCode: req.body.postalCode,
          country: req.body.country || 'India',
          deliveryInstructions: req.body.deliveryInstructions || null,
          isDefault: shouldBeDefault,
        },
      });

      // Synchronize primary address on BuyerProfile for logistics & fulfillment compatibility
      if (shouldBeDefault) {
        await tx.buyerProfile.update({
          where: { id: buyerProfile.id },
          data: {
            deliveryAddress: `${created.addressLine1}, ${created.locality ? created.locality + ', ' : ''}${created.city} - ${created.postalCode}`,
            deliveryDistrict: created.city,
            deliveryState: created.state,
          },
        });
      }

      return created;
    });

    logger.info('Buyer address created', { buyerId: buyerProfile.id, addressId: result.id });
    return sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/buyer/addresses/:addressId
 */
const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const buyerProfile = await getOrCreateBuyerProfile(req.user.id, req.user.name || 'Buyer');

    const existing = await prisma.buyerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing || existing.buyerId !== buyerProfile.id) {
      throw new NotFoundError('Address not found or unauthorized');
    }

    const shouldBeDefault = req.body.isDefault === true;

    const updated = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault && !existing.isDefault) {
        await tx.buyerAddress.updateMany({
          where: { buyerId: buyerProfile.id },
          data: { isDefault: false },
        });
      }

      const resAddress = await tx.buyerAddress.update({
        where: { id: addressId },
        data: {
          recipientName: req.body.recipientName,
          contactNumber: req.body.contactNumber,
          addressType: req.body.addressType,
          addressLine1: req.body.addressLine1,
          addressLine2: req.body.addressLine2,
          locality: req.body.locality,
          city: req.body.city,
          state: req.body.state,
          postalCode: req.body.postalCode,
          country: req.body.country,
          deliveryInstructions: req.body.deliveryInstructions,
          isDefault: shouldBeDefault !== undefined ? shouldBeDefault : existing.isDefault,
        },
      });

      if (shouldBeDefault) {
        await tx.buyerProfile.update({
          where: { id: buyerProfile.id },
          data: {
            deliveryAddress: `${resAddress.addressLine1}, ${resAddress.locality ? resAddress.locality + ', ' : ''}${resAddress.city} - ${resAddress.postalCode}`,
            deliveryDistrict: resAddress.city,
            deliveryState: resAddress.state,
          },
        });
      }

      return resAddress;
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/buyer/addresses/:addressId
 */
const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const buyerProfile = await getOrCreateBuyerProfile(req.user.id, req.user.name || 'Buyer');

    const existing = await prisma.buyerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing || existing.buyerId !== buyerProfile.id) {
      throw new NotFoundError('Address not found or unauthorized');
    }

    await prisma.$transaction(async (tx) => {
      await tx.buyerAddress.delete({
        where: { id: addressId },
      });

      // If the deleted address was default, promote the newest remaining address
      if (existing.isDefault) {
        const remaining = await tx.buyerAddress.findFirst({
          where: { buyerId: buyerProfile.id },
          orderBy: { createdAt: 'desc' },
        });

        if (remaining) {
          await tx.buyerAddress.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
          await tx.buyerProfile.update({
            where: { id: buyerProfile.id },
            data: {
              deliveryAddress: `${remaining.addressLine1}, ${remaining.city} - ${remaining.postalCode}`,
              deliveryDistrict: remaining.city,
              deliveryState: remaining.state,
            },
          });
        }
      }
    });

    return sendSuccess(res, { message: 'Address deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/buyer/addresses/:addressId/default
 */
const setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const buyerProfile = await getOrCreateBuyerProfile(req.user.id, req.user.name || 'Buyer');

    const existing = await prisma.buyerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing || existing.buyerId !== buyerProfile.id) {
      throw new NotFoundError('Address not found or unauthorized');
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.buyerAddress.updateMany({
        where: { buyerId: buyerProfile.id },
        data: { isDefault: false },
      });

      const target = await tx.buyerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      await tx.buyerProfile.update({
        where: { id: buyerProfile.id },
        data: {
          deliveryAddress: `${target.addressLine1}, ${target.city} - ${target.postalCode}`,
          deliveryDistrict: target.city,
          deliveryState: target.state,
        },
      });

      return target;
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/buyer/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        preferredLocale: true,
        status: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
      },
    });

    const buyerProfile = await getOrCreateBuyerProfile(req.user.id, req.user.name || 'Buyer');

    // Default notification preferences
    const defaultNotificationPreferences = {
      orderUpdates: true,
      deliveryAlerts: true,
      priceDrops: false,
      securityAlerts: true,
      smsEnabled: true,
      emailEnabled: true,
    };

    const notificationPreferences = {
      ...defaultNotificationPreferences,
      ...(buyerProfile.notificationPreferences || {}),
    };

    return sendSuccess(res, {
      account: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        buyerType: buyerProfile.buyerType,
        verificationStatus: buyerProfile.verificationStatus,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
      },
      preferences: {
        preferredLocale: user.preferredLocale || 'en',
        notificationPreferences,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/buyer/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const { preferredLocale, notificationPreferences } = req.body;
    const userId = req.user.id;

    if (preferredLocale) {
      await prisma.user.update({
        where: { id: userId },
        data: { preferredLocale },
      });
    }

    const buyerProfile = await getOrCreateBuyerProfile(userId, req.user.name || 'Buyer');

    let updatedPreferences = buyerProfile.notificationPreferences || {};
    if (notificationPreferences) {
      updatedPreferences = {
        ...updatedPreferences,
        ...notificationPreferences,
      };

      await prisma.buyerProfile.update({
        where: { id: buyerProfile.id },
        data: { notificationPreferences: updatedPreferences },
      });
    }

    logger.info('Buyer settings updated', { userId });

    return sendSuccess(res, {
      preferredLocale: preferredLocale || req.user.preferredLocale,
      notificationPreferences: updatedPreferences,
      message: 'Settings updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/buyer/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Current password entered is incorrect');
    }

    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      throw new ValidationError('New password cannot be identical to your current password');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Revoke all existing refresh tokens for security
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info('Password successfully changed for buyer', { userId });

    return sendSuccess(res, {
      message: 'Password changed successfully. Active sessions updated for security.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getSettings,
  updateSettings,
  changePassword,
};
