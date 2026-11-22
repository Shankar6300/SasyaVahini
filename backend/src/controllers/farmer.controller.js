/**
 * SasyaVahini — Farmer Controller (Hardened)
 *
 * Handles produce listing lifecycle, inventory status,
 * ACID transactional allocation consent, and farmer profile management.
 * Owner: Member 2 (Farmer & FPO Portals)
 */

const prisma = require('../lib/prisma');
const { sendSuccess } = require('../utils/apiResponse');
const { ValidationError, NotFoundError, AuthorizationError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const proposalExpiryService = require('../services/proposalExpiry.service');
const notificationService = require('../services/notification.service');

/**
 * Helper to ensure the authenticated user has a FarmerProfile
 */
async function getFarmerProfileOrThrow(userId) {
  let profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    include: { user: true, fpo: true }
  });

  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'FARMER') {
      throw new AuthorizationError('User does not have a farmer role.');
    }
    profile = await prisma.farmerProfile.create({
      data: {
        userId,
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Manchar',
        landSizeAcres: 2.5,
        produceTypes: ['Tomato', 'Onion']
      },
      include: { user: true, fpo: true }
    });
  }
  return profile;
}

/**
 * GET /api/farmers/produce OR /api/farmers/batches
 */
const getMyProduce = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const listings = await prisma.produceListing.findMany({
      where: { farmerId: farmer.id },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = listings.map(l => ({
      ...l,
      quantityKg: l.totalQuantityKg,
      freeQtyKg: Math.max(0, l.totalQuantityKg - l.reservedQty - l.soldQty),
      harvestDate: l.harvestDate ? l.harvestDate.toISOString().split('T')[0] : null,
      location: l.village ? `${l.village}, ${l.district}` : l.district
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/farmers/batches/:id OR /api/farmers/produce/:id
 */
const getBatchById = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;

    const listing = await prisma.produceListing.findUnique({
      where: { id },
      include: {
        allocationItems: {
          include: {
            proposal: {
              include: {
                requirement: {
                  include: { buyer: { include: { user: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!listing) throw new NotFoundError('Produce lot not found');
    if (listing.farmerId !== farmer.id && req.user.role !== 'ADMIN') {
      throw new AuthorizationError('You do not own this produce lot');
    }

    const formatted = {
      ...listing,
      quantityKg: listing.totalQuantityKg,
      freeQtyKg: Math.max(0, listing.totalQuantityKg - listing.reservedQty - listing.soldQty),
      harvestDate: listing.harvestDate ? listing.harvestDate.toISOString().split('T')[0] : null,
      location: listing.village ? `${listing.village}, ${listing.district}` : listing.district
    };

    return sendSuccess(res, formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/produce OR /api/farmers/batches
 */
const addProduce = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const {
      cropName, category, quantityKg, totalQuantityKg, askingPricePerKg, minPricePerKg,
      harvestDate, qualityGrade, isOrganic, location, village, district, state, imageUrl, description,
      latitude, longitude, pickupAddress, pincode, locationAccuracy
    } = req.body;

    const rawQty = quantityKg !== undefined ? quantityKg : totalQuantityKg;
    if (!cropName || !rawQty || !askingPricePerKg) {
      throw new ValidationError('Crop name, quantity (kg), and asking price are required');
    }

    const qty = parseFloat(rawQty);
    const askingPrice = parseFloat(askingPricePerKg);
    const minPrice = minPricePerKg ? parseFloat(minPricePerKg) : askingPrice * 0.9;

    if (isNaN(qty) || qty <= 0) throw new ValidationError('Quantity must be a positive number greater than 0');
    if (qty > 100000) throw new ValidationError('Quantity exceeds single lot limit of 100,000 kg');
    if (isNaN(askingPrice) || askingPrice <= 0) throw new ValidationError('Asking price must be greater than 0');
    if (minPrice > askingPrice) throw new ValidationError('Minimum price cannot exceed asking price');

    const harvest = harvestDate ? new Date(harvestDate) : new Date();

    const parsedLat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
    const parsedLng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null;

    const listing = await prisma.produceListing.create({
      data: {
        farmerId: farmer.id,
        fpoId: farmer.fpoId || null,
        cropName,
        category: category || 'Vegetables',
        qualityGrade: qualityGrade || 'GRADE_A',
        isOrganic: isOrganic === true || isOrganic === 'true',
        totalQuantityKg: qty,
        reservedQty: 0,
        soldQty: 0,
        askingPricePerKg: askingPrice,
        minPricePerKg: minPrice,
        harvestDate: harvest,
        state: state || farmer.state || 'Maharashtra',
        district: district || farmer.district || 'Pune',
        village: village || location || farmer.village || 'Manchar',
        pickupAddress: pickupAddress || null,
        pincode: pincode || null,
        latitude: parsedLat,
        longitude: parsedLng,
        locationAccuracy: locationAccuracy || 'GPS_PIN',
        imageUrl: imageUrl || null,
        description: description || null,
        status: 'AVAILABLE'
      }
    });

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        type: 'INFO',
        title: 'Produce Lot Listed',
        body: `${qty} kg of ${cropName} listed at ₹${askingPrice}/kg. Open for allocation proposals.`
      }
    }).catch(e => logger.warn('Notification create error', { error: e.message }));

    const formatted = {
      ...listing,
      quantityKg: listing.totalQuantityKg,
      freeQtyKg: listing.totalQuantityKg,
      harvestDate: listing.harvestDate.toISOString().split('T')[0],
      location: listing.village ? `${listing.village}, ${listing.district}` : listing.district
    };

    return sendSuccess(res, formatted, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/farmers/produce/:id OR /api/farmers/batches/:id
 */
const updateProduce = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;

    const listing = await prisma.produceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundError('Produce listing not found');

    if (listing.farmerId !== farmer.id && req.user.role !== 'ADMIN') {
      throw new AuthorizationError('You can only edit your own produce listings');
    }

    if (listing.status === 'RESERVED' || listing.status === 'SOLD') {
      throw new ConflictError(`Cannot modify a listing that is already ${listing.status}`);
    }

    const updateData = {};
    if (req.body.quantityKg !== undefined || req.body.totalQuantityKg !== undefined) {
      const q = parseFloat(req.body.quantityKg !== undefined ? req.body.quantityKg : req.body.totalQuantityKg);
      if (isNaN(q) || q <= 0 || q > 100000) throw new ValidationError('Invalid quantity');
      if (q < (listing.reservedQty + listing.soldQty)) {
        throw new ConflictError(`Quantity cannot be reduced below already committed quantity (${listing.reservedQty + listing.soldQty} kg)`);
      }
      updateData.totalQuantityKg = q;
    }
    if (req.body.askingPricePerKg !== undefined) {
      const p = parseFloat(req.body.askingPricePerKg);
      if (isNaN(p) || p <= 0) throw new ValidationError('Invalid asking price');
      updateData.askingPricePerKg = p;
    }
    if (req.body.minPricePerKg !== undefined) {
      const mp = parseFloat(req.body.minPricePerKg);
      updateData.minPricePerKg = mp;
    }
    if (req.body.qualityGrade !== undefined) updateData.qualityGrade = req.body.qualityGrade;
    if (req.body.isOrganic !== undefined) updateData.isOrganic = Boolean(req.body.isOrganic);
    if (req.body.harvestDate !== undefined) updateData.harvestDate = new Date(req.body.harvestDate);
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
    if (req.body.village !== undefined) updateData.village = req.body.village;
    if (req.body.district !== undefined) updateData.district = req.body.district;
    if (req.body.state !== undefined) updateData.state = req.body.state;
    if (req.body.pickupAddress !== undefined) updateData.pickupAddress = req.body.pickupAddress;
    if (req.body.pincode !== undefined) updateData.pincode = req.body.pincode;
    if (req.body.latitude !== undefined) updateData.latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
    if (req.body.longitude !== undefined) updateData.longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;
    if (req.body.locationAccuracy !== undefined) updateData.locationAccuracy = req.body.locationAccuracy;

    const updated = await prisma.produceListing.update({
      where: { id },
      data: updateData
    });

    const formatted = {
      ...updated,
      quantityKg: updated.totalQuantityKg,
      freeQtyKg: Math.max(0, updated.totalQuantityKg - updated.reservedQty - updated.soldQty),
      harvestDate: updated.harvestDate ? updated.harvestDate.toISOString().split('T')[0] : null,
      location: updated.village ? `${updated.village}, ${updated.district}` : updated.district
    };

    return sendSuccess(res, formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/farmers/produce/:id OR /api/farmers/batches/:id
 */
const deleteProduce = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;

    const listing = await prisma.produceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundError('Produce listing not found');

    if (listing.farmerId !== farmer.id && req.user.role !== 'ADMIN') {
      throw new AuthorizationError('You can only delete your own produce listings');
    }

    if (listing.status === 'RESERVED' || listing.status === 'SOLD') {
      throw new ConflictError(`Cannot delete a listing that has already been ${listing.status}`);
    }

    await prisma.produceListing.delete({ where: { id } });
    return sendSuccess(res, { message: 'Produce lot removed successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/farmers/proposals
 */
const getFarmerProposals = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);

    const allocationItems = await prisma.allocationItem.findMany({
      where: { listing: { farmerId: farmer.id } },
      include: {
        listing: true,
        proposal: {
          include: {
            requirement: {
              include: { buyer: { include: { user: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    let formatted = allocationItems.map(item => {
      const deadlineInfo = proposalExpiryService.getDeadlineInfo(item.createdAt, item.proposal?.consentDeadline);
      let status = item.listing.status === 'RESERVED' ? 'RESERVED' : (item.listing.status === 'SOLD' ? 'SOLD' : item.status);

      // Auto-expire if deadline passed and still proposed
      if ((status === 'PROPOSED' || status === 'PENDING') && deadlineInfo.isExpired) {
        status = 'EXPIRED';
        proposalExpiryService.expireProposal(item.proposalId).catch(e => logger.warn('Lazy proposal expiry failed:', e.message));
      }

      return {
        id: item.id,
        proposalId: item.proposalId,
        requirementId: item.proposal.requirementId,
        buyerName: item.proposal.requirement.buyer?.organizationName || item.proposal.requirement.buyer?.user?.name || 'Verified Institutional Buyer',
        buyerType: item.proposal.requirement.buyer?.buyerType || 'Wholesaler',
        cropName: item.listing.cropName,
        proposedQuantityKg: item.allocatedQtyKg !== undefined ? item.allocatedQtyKg : item.allocatedKg,
        offeredPricePerKg: item.proposedPricePerKg !== undefined ? item.proposedPricePerKg : item.agreedPricePerKg,
        farmerAskingPrice: item.listing.askingPricePerKg,
        requiredByDate: item.proposal.requirement.requiredByDate ? item.proposal.requirement.requiredByDate.toISOString().split('T')[0] : null,
        deliveryLocation: `${item.proposal.requirement.deliveryDistrict}, ${item.proposal.requirement.deliveryState}`,
        matchScore: item.proposal.matchScore,
        distanceKm: item.pickupDistanceKm || 18.4,
        status,
        listingId: item.listingId,
        listingStatus: item.listing.status,
        qualityGrade: item.listing.qualityGrade,
        isOrganic: item.listing.isOrganic,
        createdAt: item.createdAt,
        consentDeadline: deadlineInfo.consentDeadline,
        expiresInSeconds: deadlineInfo.expiresInSeconds,
        isExpired: deadlineInfo.isExpired || status === 'EXPIRED',
        totalDurationMinutes: deadlineInfo.totalDurationMinutes
      };
    });

    // If no direct DB allocation records exist yet, pair open BuyerRequirements with the farmer's AVAILABLE listings for testing
    if (formatted.length === 0) {
      const myListings = await prisma.produceListing.findMany({
        where: { farmerId: farmer.id, status: 'AVAILABLE' }
      });

      for (const listing of myListings) {
        const matchingReqs = await prisma.buyerRequirement.findMany({
          where: {
            cropName: { contains: listing.cropName, mode: 'insensitive' },
            status: 'OPEN'
          },
          include: { buyer: { include: { user: true } } },
          take: 3
        });

        for (const reqItem of matchingReqs) {
          const deadlineInfo = proposalExpiryService.getDeadlineInfo(reqItem.createdAt);
          formatted.push({
            id: `prop-${listing.id}-${reqItem.id}`,
            proposalId: `prop-${listing.id}-${reqItem.id}`,
            requirementId: reqItem.id,
            buyerName: reqItem.buyer?.organizationName || reqItem.buyer?.user?.name || 'FreshRetail Supermarket Hub',
            buyerType: reqItem.buyer?.buyerType || 'Institutional Buyer',
            cropName: reqItem.cropName,
            proposedQuantityKg: Math.min(listing.totalQuantityKg, reqItem.quantityKg),
            offeredPricePerKg: reqItem.maxPricePerKg,
            farmerAskingPrice: listing.askingPricePerKg,
            requiredByDate: reqItem.requiredByDate ? reqItem.requiredByDate.toISOString().split('T')[0] : null,
            deliveryLocation: `${reqItem.deliveryDistrict}, ${reqItem.deliveryState}`,
            matchScore: 94,
            distanceKm: 14.2,
            status: listing.status === 'RESERVED' ? 'RESERVED' : (deadlineInfo.isExpired ? 'EXPIRED' : 'PROPOSED'),
            listingId: listing.id,
            listingStatus: listing.status,
            qualityGrade: listing.qualityGrade,
            isOrganic: listing.isOrganic,
            createdAt: reqItem.createdAt,
            consentDeadline: deadlineInfo.consentDeadline,
            expiresInSeconds: deadlineInfo.expiresInSeconds,
            isExpired: deadlineInfo.isExpired,
            totalDurationMinutes: deadlineInfo.totalDurationMinutes
          });
        }
      }
    }

    return sendSuccess(res, formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/proposals/:id/accept
 *
 * ACID Transactional Reservation:
 * 1. Checks farmer ownership.
 * 2. Checks inventory status is AVAILABLE or PARTIALLY_RESERVED.
 * 3. Verifies free inventory >= requested allocated quantity to prevent overselling.
 * 4. Atomically updates reservedQty and status.
 * 5. Updates AllocationItem and writes audit notification within the transaction.
 */
const acceptProposal = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { listingId, requestedQtyKg } = req.body;

    let targetListingId = listingId;
    if (!targetListingId && id.startsWith('prop-')) {
      const parts = id.split('-');
      if (parts.length >= 2) targetListingId = parts[1];
    }

    if (!targetListingId) {
      const item = await prisma.allocationItem.findUnique({ where: { id } });
      if (item) targetListingId = item.listingId;
    }

    if (!targetListingId) {
      throw new ValidationError('Could not resolve produce listing for proposal.');
    }

    // Interactive ACID Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.produceListing.findUnique({ where: { id: targetListingId } });
      if (!listing) throw new NotFoundError('Produce listing not found');

      if (listing.farmerId !== farmer.id && req.user.role !== 'ADMIN') {
        throw new AuthorizationError('You can only consent to allocations of your own produce.');
      }

      // Enforce strict 30-minute expiry check
      if (!id.startsWith('prop-')) {
        const itemRecord = await tx.allocationItem.findUnique({
          where: { id },
          include: {
            proposal: {
              include: {
                requirement: { include: { buyer: { include: { user: true } } } }
              }
            }
          }
        });

        if (itemRecord) {
          const deadline = itemRecord.proposal?.consentDeadline || new Date(new Date(itemRecord.createdAt).getTime() + 30 * 60 * 1000);
          if (new Date(deadline) < new Date() || itemRecord.status === 'EXPIRED') {
            await tx.allocationItem.updateMany({ where: { id }, data: { status: 'EXPIRED' } });
            throw new ConflictError('Cannot accept proposal: The 30-minute response window has elapsed. This produce request has expired.');
          }
        }
      }

      if (listing.status !== 'AVAILABLE' && listing.status !== 'PARTIALLY_RESERVED') {
        throw new ConflictError(`Cannot accept proposal: Lot is currently ${listing.status}. Only available inventory can be reserved.`);
      }

      // Check available quantity to strictly prevent overselling
      const freeQty = listing.totalQuantityKg - listing.reservedQty - listing.soldQty;
      if (freeQty <= 0) {
        throw new ConflictError('Cannot accept proposal: No uncommitted inventory remains on this produce lot.');
      }

      if (requestedQtyKg && parseFloat(requestedQtyKg) > freeQty) {
        throw new ConflictError(`Cannot accept proposal: Requested allocation of ${requestedQtyKg} kg exceeds available uncommitted inventory of ${freeQty} kg.`);
      }

      const qtyToReserve = (requestedQtyKg && parseFloat(requestedQtyKg) > 0)
        ? parseFloat(requestedQtyKg)
        : freeQty;

      const newReservedQty = listing.reservedQty + qtyToReserve;
      const newStatus = (newReservedQty >= (listing.totalQuantityKg - listing.soldQty)) ? 'RESERVED' : 'PARTIALLY_RESERVED';

      const updated = await tx.produceListing.update({
        where: { id: targetListingId },
        data: {
          reservedQty: newReservedQty,
          status: newStatus
        }
      });

      if (!id.startsWith('prop-')) {
        await tx.allocationItem.updateMany({
          where: { id },
          data: { status: 'ACCEPTED' }
        });

        const propRecord = await tx.allocationProposal.findUnique({ where: { id } });
        if (propRecord) {
          await tx.allocationProposal.update({
            where: { id },
            data: { status: 'ACCEPTED' }
          });
          await tx.reservation.upsert({
            where: { proposalId: id },
            create: {
              proposalId: id,
              totalReservedKg: qtyToReserve,
              expiresAt: new Date(Date.now() + 48 * 3600 * 1000)
            },
            update: {
              totalReservedKg: qtyToReserve,
              releasedAt: null
            }
          });
        }
      }

      await tx.notification.create({
        data: {
          userId: req.user.id,
          type: 'ORDER_UPDATE',
          title: 'Consent Confirmed & Inventory Reserved',
          body: `Consent verified. ${qtyToReserve} kg of ${listing.cropName} is authoritatively reserved in escrow.`
        }
      });

      return { updated, reservedQty: qtyToReserve };
    });

    // Notify farmer and buyer via email/SMS asynchronously
    setImmediate(async () => {
      try {
        const farmerUser = await prisma.user.findUnique({ where: { id: req.user.id } });
        await notificationService.notifyProposalAccepted({
          farmerUser,
          proposal: { id },
          items: [{ cropName: result.updated.cropName, quantityKg: result.reservedQty, pricePerKg: result.updated.askingPricePerKg }]
        });
      } catch (notifErr) {
        logger.warn('Failed to dispatch proposal accepted notification:', notifErr.message);
      }
    });

    return sendSuccess(res, {
      message: 'Proposal accepted and inventory authoritatively reserved',
      listing: result.updated,
      reservedKg: result.reservedQty
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/proposals/:id/reject
 *
 * ACID Transactional Rejection:
 * Releases any pending allocation items and ensures produce remains AVAILABLE.
 */
const rejectProposal = async (req, res, next) => {
  try {
    await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.$transaction(async (tx) => {
      if (!id.startsWith('prop-')) {
        await tx.allocationItem.updateMany({
          where: { id },
          data: { status: 'REJECTED' }
        });

        const propRecord = await tx.allocationProposal.findUnique({ where: { id } });
        if (propRecord) {
          await tx.allocationProposal.update({
            where: { id },
            data: { status: 'REJECTED' }
          });
          await tx.reservation.updateMany({
            where: { proposalId: id },
            data: { releasedAt: new Date() }
          });
        }
      }
    });

    return sendSuccess(res, {
      message: 'Proposal declined. Produce remains available for other institutional matching.',
      proposalId: id,
      reason: reason || 'Farmer declined offered rate or schedule'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/farmers/profile
 */
const updateFarmerProfile = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { name, village, district, state, landSizeAcres, produceTypes } = req.body;

    if (name) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name }
      });
    }

    const updateData = {};
    if (village !== undefined) updateData.village = village;
    if (district !== undefined) updateData.district = district;
    if (state !== undefined) updateData.state = state;
    if (landSizeAcres !== undefined) updateData.landSizeAcres = parseFloat(landSizeAcres) || 1.0;
    if (produceTypes !== undefined) updateData.produceTypes = Array.isArray(produceTypes) ? produceTypes : [produceTypes];

    const updatedProfile = await prisma.farmerProfile.update({
      where: { id: farmer.id },
      data: updateData,
      include: { user: true, fpo: true }
    });

    return sendSuccess(res, updatedProfile);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/farmers/earnings
 *
 * Transparent Financial Ledger:
 * Only counts real DB settled records as fulfilled earnings.
 * Escrow amounts represent committed orders awaiting buyer OTP verification.
 * Does NOT fabricate fake platform fees or fictitious sales.
 */
const getEarnings = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);

    const [soldListings, reservedListings, bulkSettlements] = await Promise.all([
      prisma.produceListing.findMany({
        where: { farmerId: farmer.id, status: 'SOLD' },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.produceListing.findMany({
        where: { farmerId: farmer.id, status: 'RESERVED' },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.farmerSettlement.findMany({
        where: { farmerId: farmer.id },
        include: {
          order: {
            select: { orderNumber: true, status: true }
          },
          fpo: {
            select: { fpoName: true }
          },
          payments: {
            orderBy: { paymentDate: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const directCompletedEarnings = soldListings.reduce((sum, l) => sum + (l.totalQuantityKg * l.askingPricePerKg), 0);
    const directPendingEscrow = reservedListings.reduce((sum, l) => sum + (l.totalQuantityKg * l.askingPricePerKg), 0);

    const bulkPaidEarnings = bulkSettlements.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const bulkOutstandingEscrow = bulkSettlements.reduce((sum, s) => sum + (s.outstandingAmount || 0), 0);

    const totalCompletedEarnings = Math.round((directCompletedEarnings + bulkPaidEarnings) * 100) / 100;
    const pendingEscrow = Math.round((directPendingEscrow + bulkOutstandingEscrow) * 100) / 100;

    const completedOrdersCount = soldListings.length + bulkSettlements.filter(s => s.status === 'PAID').length;
    const pendingOrdersCount = reservedListings.length + bulkSettlements.filter(s => s.status !== 'PAID').length;

    const formattedBulkSettlements = bulkSettlements.map(s => ({
      id: s.id,
      settlementNumber: s.settlementNumber,
      orderNumber: s.order?.orderNumber || 'SV-ORD',
      fpoName: s.fpo?.fpoName || 'Cooperative FPO',
      cropName: s.cropName,
      variety: s.variety,
      quantityKg: s.quantityKg,
      ratePerKg: s.agreedPricePerKg,
      grossAmount: s.grossAmount,
      commissionAmount: s.commissionAmount,
      netPayout: s.netPayable,
      paidAmount: s.paidAmount,
      outstandingAmount: s.outstandingAmount,
      status: s.status === 'PAID' ? 'SETTLED' : (s.status === 'PARTIALLY_PAID' ? 'PARTIALLY_SETTLED' : 'ESCROW_HELD'),
      settledDate: s.settledAt ? s.settledAt.toISOString().split('T')[0] : (s.status === 'PAID' ? 'Settled' : 'Awaiting Delivery Verification'),
      payments: s.payments
    }));

    return sendSuccess(res, {
      totalCompletedEarnings,
      pendingEscrow,
      completedOrdersCount,
      pendingOrdersCount,
      settlements: [
        ...formattedBulkSettlements,
        ...soldListings.map(l => ({
          id: `set-${l.id}`,
          orderNumber: `ORD-${l.id.slice(0, 8).toUpperCase()}`,
          cropName: l.cropName,
          quantityKg: l.totalQuantityKg,
          ratePerKg: l.askingPricePerKg,
          grossAmount: l.totalQuantityKg * l.askingPricePerKg,
          platformFee: 0,
          netPayout: l.totalQuantityKg * l.askingPricePerKg,
          status: 'SETTLED',
          settledDate: l.updatedAt.toISOString().split('T')[0]
        })),
        ...reservedListings.map(l => ({
          id: `esc-${l.id}`,
          orderNumber: `ORD-${l.id.slice(0, 8).toUpperCase()}`,
          cropName: l.cropName,
          quantityKg: l.totalQuantityKg,
          ratePerKg: l.askingPricePerKg,
          grossAmount: l.totalQuantityKg * l.askingPricePerKg,
          platformFee: 0,
          netPayout: l.totalQuantityKg * l.askingPricePerKg,
          status: 'ESCROW_HELD',
          settledDate: 'Awaiting Delivery Verification'
        }))
      ]
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// FIX 1 — FPO MEMBERSHIP INVITATION ENDPOINTS
// =============================================================================

/**
 * GET /api/farmers/membership/invitations
 *
 * Returns all pending FPO membership invitations for the authenticated farmer.
 */
const getMembershipInvitations = async (req, res, next) => {
  try {
    const invitations = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        type: 'PROPOSAL',
        metadata: {
          path: ['inviteType'],
          equals: 'FPO_MEMBERSHIP_INVITE'
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter and annotate with expiry status
    const now = new Date();
    const annotated = invitations.map((inv) => {
      const meta = inv.metadata || {};
      const expired = meta.expiresAt ? new Date(meta.expiresAt) < now : false;
      return {
        id: inv.id,
        fpoId: meta.fpoId,
        fpoName: meta.fpoName,
        registrationNo: meta.registrationNo,
        status: expired && meta.status === 'PENDING' ? 'EXPIRED' : meta.status,
        invitedAt: meta.invitedAt,
        expiresAt: meta.expiresAt,
        isRead: inv.isRead,
        createdAt: inv.createdAt
      };
    });

    return sendSuccess(res, annotated);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/membership/invitations/:id/accept
 *
 * Farmer explicitly accepts an FPO membership invitation.
 * Sets FarmerProfile.fpoId, marks notification ACCEPTED, notifies FPO, updates memberCount.
 */
const acceptMembershipInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Retrieve and validate the invitation belongs to this farmer
    const invite = await prisma.notification.findUnique({ where: { id } });

    if (!invite || invite.userId !== req.user.id) {
      throw new NotFoundError('Invitation not found.');
    }

    const meta = invite.metadata || {};

    if (meta.inviteType !== 'FPO_MEMBERSHIP_INVITE') {
      throw new ValidationError('This notification is not a membership invitation.');
    }
    if (meta.status !== 'PENDING') {
      throw new ConflictError(`Invitation is already ${meta.status}. It can no longer be accepted.`);
    }
    if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
      // Mark expired in metadata
      await prisma.notification.update({
        where: { id },
        data: { metadata: { ...meta, status: 'EXPIRED' } }
      });
      throw new ConflictError('This membership invitation has expired. Please ask the FPO to resend.');
    }

    const { fpoId } = meta;

    // Verify FPO still exists
    const fpo = await prisma.fPOProfile.findUnique({ where: { id: fpoId } });
    if (!fpo) throw new NotFoundError('The inviting FPO no longer exists.');

    // Retrieve farmer profile
    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!farmerProfile) throw new NotFoundError('Farmer profile not found.');

    if (farmerProfile.fpoId && farmerProfile.fpoId !== fpoId) {
      throw new ConflictError(
        'You are already a member of another FPO. Please unlink before accepting a new invitation.'
      );
    }

    // Apply profile patch supplied by FPO at invite time
    const patch = meta.profilePatch || {};
    const profileUpdate = {};
    if (patch.village) profileUpdate.village = patch.village;
    if (patch.district) profileUpdate.district = patch.district;
    if (patch.state) profileUpdate.state = patch.state;
    if (patch.landSizeAcres) profileUpdate.landSizeAcres = Number(patch.landSizeAcres);
    if (Array.isArray(patch.produceTypes) && patch.produceTypes.length)
      profileUpdate.produceTypes = patch.produceTypes;

    await prisma.$transaction(async (tx) => {
      // Set fpoId on the farmer's profile
      await tx.farmerProfile.update({
        where: { userId: req.user.id },
        data: { fpoId, ...profileUpdate }
      });

      // Mark invitation as ACCEPTED
      await tx.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: { ...meta, status: 'ACCEPTED', acceptedAt: new Date().toISOString() }
        }
      });

      // Update FPO member count
      const totalMembers = await tx.farmerProfile.count({ where: { fpoId } });
      await tx.fPOProfile.update({
        where: { id: fpoId },
        data: { memberCount: totalMembers }
      });

      // Notify FPO
      await tx.notification.create({
        data: {
          userId: fpo.userId,
          type: 'INFO',
          title: 'Membership Invitation Accepted',
          body: `${req.user.name || 'A farmer'} has accepted your FPO membership invitation and joined ${fpo.fpoName}.`,
          metadata: {
            eventType: 'FPO_INVITE_ACCEPTED',
            farmerId: farmerProfile.id,
            farmerUserId: req.user.id
          }
        }
      });
    });

    return sendSuccess(res, {
      accepted: true,
      fpoId,
      fpoName: fpo.fpoName,
      message: `You have successfully joined ${fpo.fpoName} as a member farmer.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/membership/invitations/:id/reject
 *
 * Farmer declines an FPO membership invitation.
 * Marks the notification as REJECTED and notifies the FPO.
 */
const rejectMembershipInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invite = await prisma.notification.findUnique({ where: { id } });

    if (!invite || invite.userId !== req.user.id) {
      throw new NotFoundError('Invitation not found.');
    }

    const meta = invite.metadata || {};

    if (meta.inviteType !== 'FPO_MEMBERSHIP_INVITE') {
      throw new ValidationError('This notification is not a membership invitation.');
    }
    if (meta.status !== 'PENDING') {
      throw new ConflictError(`Invitation is already ${meta.status}.`);
    }

    const { fpoId } = meta;
    const fpo = await prisma.fPOProfile.findUnique({ where: { id: fpoId } });

    await prisma.$transaction(async (tx) => {
      // Mark REJECTED
      await tx.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: { ...meta, status: 'REJECTED', rejectedAt: new Date().toISOString() }
        }
      });

      // Notify FPO (only if FPO still exists)
      if (fpo) {
        await tx.notification.create({
          data: {
            userId: fpo.userId,
            type: 'INFO',
            title: 'Membership Invitation Declined',
            body: `${req.user.name || 'A farmer'} has declined the membership invitation to ${fpo.fpoName}.`,
            metadata: {
              eventType: 'FPO_INVITE_REJECTED',
              farmerUserId: req.user.id
            }
          }
        });
      }
    });

    return sendSuccess(res, {
      rejected: true,
      message: 'Membership invitation declined. Your account remains independent.'
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PHASE 2 — FPO DIRECTORY & FARMER-INITIATED JOIN REQUESTS (WORKFLOW B)
// =============================================================================

/**
 * GET /api/farmers/fpos
 *
 * Browses regional and national FPOs with permitted organization details.
 * Also computes the current farmer's status relative to each FPO:
 * CURRENT_MEMBER | REQUEST_PENDING | INVITATION_RECEIVED | CAN_JOIN
 */
const getFpoDirectory = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const search = (req.query.search || req.query.q || '').trim();
    const districtFilter = (req.query.district || '').trim();
    const stateFilter = (req.query.state || '').trim();

    const where = {};
    if (search) {
      where.OR = [
        { fpoName: { contains: search, mode: 'insensitive' } },
        { registrationNo: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (districtFilter) where.district = { equals: districtFilter, mode: 'insensitive' };
    if (stateFilter) where.state = { equals: stateFilter, mode: 'insensitive' };

    const fpos = await prisma.fPOProfile.findMany({
      where,
      select: {
        id: true,
        fpoName: true,
        registrationNo: true,
        memberCount: true,
        state: true,
        district: true,
        address: true,
        registrationCertVerified: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: [{ registrationCertVerified: 'desc' }, { memberCount: 'desc' }, { fpoName: 'asc' }]
    });

    // 1. Pending join requests sent by this farmer
    const mySentRequests = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FARMER_MEMBERSHIP_REQUEST'
        }
      },
      select: { id: true, userId: true, metadata: true }
    });

    const pendingRequestFpoMap = new Map();
    mySentRequests.forEach((n) => {
      if (n.metadata?.farmerUserId === req.user.id && n.metadata?.status === 'PENDING') {
        // target FPO ID from notification user
        pendingRequestFpoMap.set(n.userId, n.id);
      }
    });

    // 2. Pending invitations received by this farmer from FPOs
    const myInvitations = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        type: 'PROPOSAL',
        metadata: {
          path: ['inviteType'],
          equals: 'FPO_MEMBERSHIP_INVITE'
        }
      },
      select: { id: true, metadata: true }
    });

    const pendingInviteFpoMap = new Map();
    const now = new Date();
    myInvitations.forEach((inv) => {
      const m = inv.metadata || {};
      if (m.status === 'PENDING' && (!m.expiresAt || new Date(m.expiresAt) > now)) {
        pendingInviteFpoMap.set(m.fpoId, inv.id);
      }
    });

    const enriched = fpos.map((f) => {
      let membershipStatus = 'CAN_JOIN';
      let pendingRequestId = null;
      let pendingInviteId = null;

      if (farmer.fpoId === f.id) {
        membershipStatus = 'CURRENT_MEMBER';
      } else if (f.user?.id && pendingRequestFpoMap.has(f.user.id)) {
        membershipStatus = 'REQUEST_PENDING';
        pendingRequestId = pendingRequestFpoMap.get(f.user.id);
      } else if (pendingInviteFpoMap.has(f.id)) {
        membershipStatus = 'INVITATION_RECEIVED';
        pendingInviteId = pendingInviteFpoMap.get(f.id);
      }

      return {
        id: f.id,
        fpoName: f.fpoName,
        registrationNo: f.registrationNo,
        memberCount: f.memberCount,
        state: f.state,
        district: f.district,
        address: f.address,
        registrationCertVerified: f.registrationCertVerified,
        managerName: f.user?.name,
        contactPhone: f.user?.phone,
        membershipStatus,
        affiliationStatus: membershipStatus,
        pendingRequestId,
        pendingInviteId,
        createdAt: f.createdAt
      };
    });

    return sendSuccess(res, enriched);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/fpos/:fpoId/request-join
 *
 * Farmer initiates a membership join request to an FPO (Workflow B).
 */
const requestJoinFpo = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { fpoId } = req.params;
    const { remarks } = req.body || {};

    const fpo = await prisma.fPOProfile.findUnique({
      where: { id: fpoId },
      include: { user: true }
    });

    if (!fpo) {
      throw new NotFoundError('FPO organization not found.');
    }

    if (farmer.fpoId === fpo.id) {
      throw new ConflictError('You are already an active member of this FPO.');
    }

    if (farmer.fpoId && farmer.fpoId !== fpo.id) {
      throw new ConflictError('You are currently affiliated with another FPO. Please unlink from your current FPO before requesting to join a new one.');
    }

    // Check for duplicate pending request
    const existingReq = await prisma.notification.findFirst({
      where: {
        userId: fpo.userId,
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FARMER_MEMBERSHIP_REQUEST'
        }
      }
    });

    if (
      existingReq &&
      existingReq.metadata?.farmerUserId === req.user.id &&
      existingReq.metadata?.status === 'PENDING'
    ) {
      throw new ConflictError('You already have a pending membership request submitted to this FPO.');
    }

    // Dispatch request notification to FPO manager
    const notification = await prisma.notification.create({
      data: {
        userId: fpo.userId,
        type: 'PROPOSAL',
        title: `Farmer Membership Request — ${farmer.user?.name || req.user.name || 'Member Farmer'}`,
        body: `${farmer.user?.name || req.user.name || 'A farmer'} (${farmer.village || farmer.district}, ${farmer.landSizeAcres || 1} acres) has submitted a request to join ${fpo.fpoName}.`,
        metadata: {
          requestType: 'FARMER_MEMBERSHIP_REQUEST',
          fpoId: fpo.id,
          fpoName: fpo.fpoName,
          farmerId: farmer.id,
          farmerUserId: req.user.id,
          farmerName: farmer.user?.name || req.user.name || 'Member Farmer',
          farmerPhone: farmer.user?.phone || req.user.phone,
          farmerEmail: farmer.user?.email || req.user.email,
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          landSizeAcres: farmer.landSizeAcres,
          produceTypes: farmer.produceTypes || [],
          remarks: remarks || '',
          status: 'PENDING',
          requestedAt: new Date().toISOString()
        }
      }
    });

    return sendSuccess(res, {
      requested: true,
      requestId: notification.id,
      fpoName: fpo.fpoName,
      message: `Membership request submitted successfully to ${fpo.fpoName}. The manager will review your application.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/farmers/fpos/requests
 *
 * Lists all outgoing join requests submitted by this farmer (Workflow B).
 */
const getMyFpoRequests = async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FARMER_MEMBERSHIP_REQUEST'
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const myRequests = notifs
      .filter((n) => n.metadata?.farmerUserId === req.user.id)
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          fpoId: meta.fpoId,
          fpoName: meta.fpoName,
          status: meta.status || 'PENDING',
          requestedAt: meta.requestedAt || n.createdAt,
          remarks: meta.remarks,
          rejectionReason: meta.rejectionReason,
          createdAt: n.createdAt
        };
      });

    return sendSuccess(res, myRequests);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/farmers/fpos/requests/:id
 *
 * Farmer cancels a pending join request.
 */
const cancelJoinRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif) {
      throw new NotFoundError('Join request not found.');
    }

    const meta = notif.metadata || {};

    if (meta.requestType !== 'FARMER_MEMBERSHIP_REQUEST' || meta.farmerUserId !== req.user.id) {
      throw new AuthorizationError('You are not authorized to cancel this join request.');
    }

    if (meta.status !== 'PENDING') {
      throw new ConflictError(`This join request has already been ${meta.status} and cannot be cancelled.`);
    }

    await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        metadata: {
          ...meta,
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString()
        }
      }
    });

    return sendSuccess(res, {
      cancelled: true,
      message: 'Membership request cancelled successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 3: FARMER CONTRIBUTION ACTIONS & RESERVATION MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/farmers/contributions
 *
 * Lists all incoming and historical FPO contribution requests for this farmer.
 */
const getIncomingContributions = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const statusFilter = (req.query.status || 'ALL').trim().toUpperCase();

    const notifs = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FPO_CONTRIBUTION_REQUEST'
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch fresh listing status for each request so farmer sees up-to-date availability
    const listingIds = notifs.map((n) => n.metadata?.listingId).filter(Boolean);
    const listings = await prisma.produceListing.findMany({
      where: { id: { in: listingIds } },
      select: {
        id: true,
        cropName: true,
        qualityGrade: true,
        totalQuantityKg: true,
        reservedQty: true,
        soldQty: true,
        askingPricePerKg: true,
        status: true
      }
    });
    const listingsMap = new Map(listings.map((l) => [l.id, l]));

    const now = new Date();
    let requests = notifs.map((n) => {
      const meta = n.metadata || {};
      const listing = listingsMap.get(meta.listingId);
      const isExpired = meta.expiresAt ? new Date(meta.expiresAt) < now : false;
      let currentStatus = meta.status || 'PENDING';
      if (currentStatus === 'PENDING' && isExpired) {
        currentStatus = 'EXPIRED';
      }

      const availableStockKg = listing
        ? Math.max(0, listing.totalQuantityKg - listing.reservedQty - listing.soldQty)
        : 0;

      return {
        id: n.id,
        notificationId: n.id,
        fpoId: meta.fpoId,
        fpoName: meta.fpoName,
        fpoRegistrationNo: meta.fpoRegistrationNo,
        listingId: meta.listingId,
        cropName: meta.cropName,
        qualityGrade: meta.qualityGrade,
        variety: meta.variety || 'Standard',
        requestedQtyKg: meta.requestedQtyKg,
        confirmedQtyKg: meta.confirmedQtyKg,
        offeredPricePerKg: meta.offeredPricePerKg,
        askingPricePerKg: meta.askingPricePerKg,
        totalOfferedValue: (meta.confirmedQtyKg || meta.requestedQtyKg) * meta.offeredPricePerKg,
        currentListingAvailableQty: availableStockKg,
        listingAvailableQtyKg: availableStockKg,
        notes: meta.notes,
        status: currentStatus,
        rejectionReason: meta.rejectionReason,
        requestedAt: meta.requestedAt || n.createdAt,
        expiresAt: meta.expiresAt,
        respondedAt: meta.respondedAt,
        createdAt: n.createdAt
      };
    });

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE_PENDING') {
        requests = requests.filter((r) => r.status === 'PENDING');
      } else {
        requests = requests.filter((r) => r.status === statusFilter);
      }
    }

    const incomingRequests = requests.filter((r) => r.status === 'PENDING');
    const contributionHistory = requests.filter((r) => r.status !== 'PENDING');

    return sendSuccess(res, {
      incomingRequests,
      contributionHistory,
      requests
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/contributions/:id/accept
 *
 * Farmer accepts the FULL requested quantity from FPO.
 * Atomic, concurrency-safe reservation update within a transaction.
 */
const acceptContribution = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif || notif.userId !== req.user.id) {
      throw new NotFoundError('Contribution request not found.');
    }

    const meta = notif.metadata || {};

    if (meta.requestType !== 'FPO_CONTRIBUTION_REQUEST') {
      throw new ValidationError('This record is not an FPO contribution request.');
    }

    if (meta.status !== 'PENDING') {
      throw new ConflictError(`This contribution request has already been ${meta.status}.`);
    }

    if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
      await prisma.notification.update({
        where: { id },
        data: { metadata: { ...meta, status: 'EXPIRED' } }
      });
      throw new ConflictError('This contribution request has expired.');
    }

    const requestedQty = meta.requestedQtyKg;

    // Concurrency-safe atomic reservation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch fresh listing with locking / fresh data
      const listing = await tx.produceListing.findUnique({
        where: { id: meta.listingId }
      });

      if (!listing) {
        throw new NotFoundError('Produce listing no longer exists.');
      }

      const availableQty = Math.max(0, listing.totalQuantityKg - listing.reservedQty - listing.soldQty);

      if (requestedQty > availableQty) {
        throw new ConflictError(
          `Insufficient available stock. You only have ${availableQty} kg available for this listing. You may accept a smaller quantity instead.`
        );
      }

      // 2. Reserve full requested quantity
      const newReserved = listing.reservedQty + requestedQty;
      const newStatus =
        newReserved + listing.soldQty >= listing.totalQuantityKg ? 'RESERVED' : 'PARTIALLY_RESERVED';

      const updatedListing = await tx.produceListing.update({
        where: { id: listing.id },
        data: {
          reservedQty: newReserved,
          status: newStatus,
          fpoId: meta.fpoId // Tag aggregation context while preserving farmer ownership
        }
      });

      // 3. Update notification state
      const updatedNotif = await tx.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: {
            ...meta,
            status: 'ACCEPTED',
            confirmedQtyKg: requestedQty,
            respondedAt: new Date().toISOString()
          }
        }
      });

      // 4. Notify FPO manager
      if (meta.fpoUserId) {
        await tx.notification.create({
          data: {
            userId: meta.fpoUserId,
            type: 'INFO',
            title: `Contribution Accepted — ${listing.cropName}`,
            body: `${farmer.user?.name || 'Farmer'} has accepted your contribution request for ${requestedQty} kg of ${listing.cropName}. Stock is now safely reserved.`,
            metadata: {
              eventType: 'FPO_CONTRIBUTION_ACCEPTED',
              contributionId: id,
              farmerId: farmer.id,
              listingId: listing.id,
              confirmedQtyKg: requestedQty,
              offeredPricePerKg: meta.offeredPricePerKg
            }
          }
        });
      }

      return {
        confirmedQtyKg: requestedQty,
        reservedQty: updatedListing.reservedQty,
        availableQty: Math.max(0, updatedListing.totalQuantityKg - updatedListing.reservedQty - updatedListing.soldQty),
        status: 'ACCEPTED'
      };
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      ...result,
      contribution: result,
      message: `Successfully contributed and reserved ${result.confirmedQtyKg} kg for ${meta.fpoName}.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/contributions/:id/accept-partial
 *
 * Farmer accepts a SMALLER quantity than requested.
 * Concurrency-safe atomic partial reservation.
 */
const acceptPartialContribution = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { acceptedQtyKg } = req.body;

    if (!acceptedQtyKg || acceptedQtyKg <= 0) {
      throw new ValidationError('Accepted quantity must be greater than 0.');
    }

    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif || notif.userId !== req.user.id) {
      throw new NotFoundError('Contribution request not found.');
    }

    const meta = notif.metadata || {};

    if (meta.requestType !== 'FPO_CONTRIBUTION_REQUEST') {
      throw new ValidationError('This record is not an FPO contribution request.');
    }

    if (meta.status !== 'PENDING') {
      throw new ConflictError(`This contribution request has already been ${meta.status}.`);
    }

    if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
      await prisma.notification.update({
        where: { id },
        data: { metadata: { ...meta, status: 'EXPIRED' } }
      });
      throw new ConflictError('This contribution request has expired.');
    }

    if (acceptedQtyKg > meta.requestedQtyKg) {
      throw new ValidationError(
        `Accepted quantity (${acceptedQtyKg} kg) cannot exceed requested quantity (${meta.requestedQtyKg} kg).`
      );
    }

    // Atomic partial reservation
    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.produceListing.findUnique({
        where: { id: meta.listingId }
      });

      if (!listing) {
        throw new NotFoundError('Produce listing no longer exists.');
      }

      const availableQty = Math.max(0, listing.totalQuantityKg - listing.reservedQty - listing.soldQty);

      if (acceptedQtyKg > availableQty) {
        throw new ConflictError(
          `Insufficient available stock. You only have ${availableQty} kg available for this listing.`
        );
      }

      const newReserved = listing.reservedQty + acceptedQtyKg;
      const newStatus =
        newReserved + listing.soldQty >= listing.totalQuantityKg ? 'RESERVED' : 'PARTIALLY_RESERVED';

      const updatedListing = await tx.produceListing.update({
        where: { id: listing.id },
        data: {
          reservedQty: newReserved,
          status: newStatus,
          fpoId: meta.fpoId
        }
      });

      const updatedStatus = acceptedQtyKg === meta.requestedQtyKg ? 'ACCEPTED' : 'PARTIALLY_ACCEPTED';

      await tx.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: {
            ...meta,
            status: updatedStatus,
            confirmedQtyKg: acceptedQtyKg,
            respondedAt: new Date().toISOString()
          }
        }
      });

      // Notify FPO manager of partial contribution
      if (meta.fpoUserId) {
        await tx.notification.create({
          data: {
            userId: meta.fpoUserId,
            type: 'INFO',
            title: `Partial Contribution Accepted — ${listing.cropName}`,
            body: `${farmer.user?.name || 'Farmer'} has confirmed a partial contribution of ${acceptedQtyKg} kg (requested: ${meta.requestedQtyKg} kg) of ${listing.cropName}.`,
            metadata: {
              eventType: 'FPO_CONTRIBUTION_PARTIALLY_ACCEPTED',
              contributionId: id,
              farmerId: farmer.id,
              listingId: listing.id,
              confirmedQtyKg: acceptedQtyKg,
              requestedQtyKg: meta.requestedQtyKg,
              offeredPricePerKg: meta.offeredPricePerKg
            }
          }
        });
      }

      return {
        confirmedQtyKg: acceptedQtyKg,
        reservedQty: updatedListing.reservedQty,
        availableQty: Math.max(0, updatedListing.totalQuantityKg - updatedListing.reservedQty - updatedListing.soldQty),
        status: updatedStatus
      };
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      ...result,
      contribution: result,
      message: `Successfully confirmed partial contribution of ${result.confirmedQtyKg} kg for ${meta.fpoName}.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/farmers/contributions/:id/reject
 *
 * Farmer declines the FPO contribution request.
 * Does not touch reserved stock.
 */
const rejectContribution = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { reason } = req.body || {};

    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif || notif.userId !== req.user.id) {
      throw new NotFoundError('Contribution request not found.');
    }

    const meta = notif.metadata || {};

    if (meta.requestType !== 'FPO_CONTRIBUTION_REQUEST') {
      throw new ValidationError('This record is not an FPO contribution request.');
    }

    if (meta.status !== 'PENDING') {
      throw new ConflictError(`This contribution request has already been ${meta.status}.`);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark notification as REJECTED
      await tx.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: {
            ...meta,
            status: 'REJECTED',
            rejectionReason: reason || 'Farmer unavailable to contribute at this time',
            respondedAt: new Date().toISOString()
          }
        }
      });

      // 2. Notify FPO manager
      if (meta.fpoUserId) {
        await tx.notification.create({
          data: {
            userId: meta.fpoUserId,
            type: 'INFO',
            title: `Contribution Request Declined — ${meta.cropName}`,
            body: `${farmer.user?.name || 'Farmer'} declined the contribution request for ${meta.cropName}.${
              reason ? ` Reason: "${reason}"` : ''
            }`,
            metadata: {
              eventType: 'FPO_CONTRIBUTION_REJECTED',
              contributionId: id,
              farmerId: farmer.id,
              listingId: meta.listingId,
              rejectionReason: reason
            }
          }
        });
      }
    });

    return sendSuccess(res, {
      rejected: true,
      status: 'REJECTED',
      message: 'Contribution request declined.'
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PHASE 6: MULTI-FARMER PICKUPS (FARMER VIEW)
// =============================================================================

/**
 * GET /api/farmers/pickups
 * Returns scheduled multi-farmer pickup stops for the authenticated farmer.
 * Strictly respects farmer access permissions and protects other farmers' data.
 */
const getMyPickups = async (req, res, next) => {
  try {
    const farmer = await prisma.farmerProfile.findUnique({
      where: { userId: req.user.id }
    });

    const stops = await prisma.shipmentStop.findMany({
      where: {
        OR: [
          { farmerId: req.user.id },
          ...(farmer ? [{ farmerId: farmer.id }] : [])
        ]
      },
      include: {
        shipment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const pickups = await Promise.all(stops.map(async (stop) => {
      const order = await prisma.order.findUnique({
        where: { id: stop.shipment.orderId },
        include: {
          requirement: true,
          fpoQuotation: { include: { fpo: true } }
        }
      });

      const isAssigned = stop.shipment.status !== 'UNASSIGNED';
      let vehicle = null;
      if (stop.shipment.vehicleId) {
        try {
          vehicle = await prisma.vehicle.findUnique({ where: { id: stop.shipment.vehicleId } });
        } catch { /* non-fatal */ }
      }

      return {
        stopId: stop.id,
        sequence: stop.sequence,
        stopName: stop.stopName,
        address: stop.address,
        expectedQuantityKg: stop.quantityKg,
        collectedQuantityKg: stop.status === 'COMPLETED' ? stop.quantityKg : 0,
        status: stop.status,
        arrivedAt: stop.arrivedAt,
        completedAt: stop.completedAt,
        shipment: {
          id: stop.shipment.id,
          trackingNumber: stop.shipment.trackingNumber,
          status: stop.shipment.status,
          orderNumber: order?.orderNumber || 'SV-ORD',
          cropName: order?.requirement?.cropName || 'Fresh Produce',
          fpoName: order?.fpoQuotation?.fpo?.fpoName || 'Cooperative FPO',
          transporter: isAssigned && vehicle ? {
            vehicleNumber: vehicle.vehicleNumber,
            driverName: vehicle.driverName,
            driverPhone: vehicle.driverPhone
          } : null,
          coordinatesProtected: !isAssigned
        }
      };
    }));

    return sendSuccess(res, pickups);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/farmers/settlements
 * Returns all bulk order settlements and payouts for the authenticated farmer.
 * Strict tenant isolation: returns ONLY the authenticated farmer's records.
 */
const getMySettlements = async (req, res, next) => {
  try {
    const farmer = await getFarmerProfileOrThrow(req.user.id);
    const { status, search } = req.query;

    const where = { farmerId: farmer.id };
    if (status && status !== 'ALL') where.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { settlementNumber: { contains: q, mode: 'insensitive' } },
        { cropName: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { fpo: { fpoName: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const settlements = await prisma.farmerSettlement.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            deliveryAddress: true,
            scheduledDelivery: true
          }
        },
        fpo: {
          select: {
            id: true,
            fpoName: true,
            district: true,
            state: true,
            registrationNo: true
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const summary = {
      totalSettlements: settlements.length,
      totalGrossEarnings: Math.round(settlements.reduce((s, x) => s + x.grossAmount, 0) * 100) / 100,
      totalCommissionDeductions: Math.round(settlements.reduce((s, x) => s + x.commissionAmount, 0) * 100) / 100,
      totalLogisticsDeductions: Math.round(settlements.reduce((s, x) => s + x.logisticsFeeShare, 0) * 100) / 100,
      totalNetPayable: Math.round(settlements.reduce((s, x) => s + x.netPayable, 0) * 100) / 100,
      totalSettledProceeds: Math.round(settlements.reduce((s, x) => s + x.paidAmount, 0) * 100) / 100,
      totalPendingProceeds: Math.round(settlements.reduce((s, x) => s + x.outstandingAmount, 0) * 100) / 100,
      paidCount: settlements.filter(s => s.status === 'PAID').length,
      partiallyPaidCount: settlements.filter(s => s.status === 'PARTIALLY_PAID').length,
      pendingCount: settlements.filter(s => s.status === 'PENDING').length
    };

    return sendSuccess(res, { summary, settlements });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProduce,
  getBatchById,
  addProduce,
  updateProduce,
  deleteProduce,
  getFarmerProposals,
  acceptProposal,
  rejectProposal,
  updateFarmerProfile,
  getEarnings,
  getMembershipInvitations,
  acceptMembershipInvitation,
  rejectMembershipInvitation,
  getFpoDirectory,
  requestJoinFpo,
  getMyFpoRequests,
  cancelJoinRequest,
  getIncomingContributions,
  acceptContribution,
  acceptPartialContribution,
  rejectContribution,
  getMyPickups,
  getMySettlements
};
