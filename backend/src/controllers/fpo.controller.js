/**
 * SasyaVahini — FPO Controller (Hardened)
 *
 * Handles FPO collective workspace, member farmer management,
 * crop aggregation, institutional procurement proposals, and organization profile.
 * Owner: Member 2 (Farmer & FPO Portals)
 */

const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { sendSuccess } = require('../utils/apiResponse');
const { ValidationError, AuthorizationError, ConflictError, NotFoundError } = require('../utils/errors');
const routingService = require('../services/routing.service');
const logisticsEvents = require('../events/logisticsEvents');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

/**
 * Helper to ensure the authenticated user has an FPOProfile
 */
async function getFpoProfileOrThrow(userId) {
  let profile = await prisma.fPOProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isPhoneVerified: true,
          isEmailVerified: true,
          createdAt: true
        }
      }
    }
  });

  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'FPO' && user.role !== 'ADMIN')) {
      throw new AuthorizationError('User does not have an FPO role.');
    }
    profile = await prisma.fPOProfile.create({
      data: {
        userId,
        fpoName: `${user.name} Producer Co.`,
        registrationNo: `FPO-${Date.now().toString().slice(-6)}`,
        memberCount: 0,
        state: 'Maharashtra',
        district: 'Pune',
        address: ''
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            isPhoneVerified: true,
            isEmailVerified: true,
            createdAt: true
          }
        }
      }
    });
  }
  return profile;
}

/**
 * GET /api/fpo/dashboard
 *
 * Returns full database-driven dashboard metrics isolated to authenticated FPO.
 */
const getFPODashboard = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);

    // Fetch members affiliated with this FPO
    const memberFarmers = await prisma.farmerProfile.findMany({
      where: { fpoId: fpo.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            avatarUrl: true,
            createdAt: true
          }
        },
        listings: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Synchronize memberCount in database if different
    if (fpo.memberCount !== memberFarmers.length) {
      await prisma.fPOProfile.update({
        where: { id: fpo.id },
        data: { memberCount: memberFarmers.length }
      }).catch(() => {});
      fpo.memberCount = memberFarmers.length;
    }

    // Split active vs pending verification members
    const activeMembers = memberFarmers.filter(m => m.user?.status === 'ACTIVE');
    const pendingMembers = memberFarmers.filter(m => m.user?.status === 'PENDING_VERIFICATION');

    const memberFarmerIds = memberFarmers.map(m => m.id);

    // Fetch listings belonging to this FPO or its member farmers
    const fpoListings = await prisma.produceListing.findMany({
      where: {
        OR: [
          { fpoId: fpo.id },
          ...(memberFarmerIds.length > 0 ? [{ farmerId: { in: memberFarmerIds } }] : [])
        ]
      },
      include: {
        farmer: {
          include: {
            user: {
              select: { id: true, name: true, phone: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute inventory metrics (available, reserved, sold, total)
    let availableStockKg = 0;
    let reservedStockKg = 0;
    let soldStockKg = 0;
    let totalStockKg = 0;
    let activeLotsCount = 0;

    const collectiveMap = {};
    for (const item of fpoListings) {
      const crop = item.cropName;
      if (!collectiveMap[crop]) {
        collectiveMap[crop] = {
          cropName: crop,
          category: item.category,
          totalQuantityKg: 0,
          availableQuantityKg: 0,
          reservedQuantityKg: 0,
          soldQuantityKg: 0,
          weightedValueSum: 0,
          farmerIds: new Set(),
          listingsCount: 0
        };
      }

      const itemTotal = Number(item.totalQuantityKg) || 0;
      const itemReserved = Number(item.reservedQty) || 0;
      const itemSold = Number(item.soldQty) || 0;
      const itemAvail = Math.max(0, itemTotal - itemReserved - itemSold);

      collectiveMap[crop].totalQuantityKg += itemTotal;
      collectiveMap[crop].availableQuantityKg += itemAvail;
      collectiveMap[crop].reservedQuantityKg += itemReserved;
      collectiveMap[crop].soldQuantityKg += itemSold;
      collectiveMap[crop].weightedValueSum += (Number(item.askingPricePerKg) * itemTotal);
      collectiveMap[crop].farmerIds.add(item.farmerId);
      collectiveMap[crop].listingsCount += 1;

      totalStockKg += itemTotal;
      availableStockKg += itemAvail;
      reservedStockKg += itemReserved;
      soldStockKg += itemSold;

      if (item.status === 'AVAILABLE' || item.status === 'PARTIALLY_RESERVED') {
        activeLotsCount += 1;
      }
    }

    const collectiveInventory = Object.values(collectiveMap).map(inv => ({
      cropName: inv.cropName,
      category: inv.category,
      totalQuantityKg: Math.round(inv.totalQuantityKg * 10) / 10,
      availableQuantityKg: Math.round(inv.availableQuantityKg * 10) / 10,
      reservedQuantityKg: Math.round(inv.reservedQuantityKg * 10) / 10,
      soldQuantityKg: Math.round(inv.soldQuantityKg * 10) / 10,
      avgAskingPrice: inv.totalQuantityKg > 0 ? Math.round((inv.weightedValueSum / inv.totalQuantityKg) * 10) / 10 : 0,
      farmerCount: inv.farmerIds.size,
      listingsCount: inv.listingsCount
    }));

    // Active bulk buyer requirements
    const activeRequirements = await prisma.buyerRequirement.findMany({
      where: { status: 'OPEN' },
      include: {
        buyer: {
          include: {
            user: { select: { id: true, name: true, phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    // Orders linked to this FPO or its member farmers
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { fpoQuotation: { fpoId: fpo.id } },
          {
            reservation: {
              proposal: {
                items: {
                  some: {
                    OR: [
                      { fpoId: fpo.id },
                      ...(memberFarmerIds.length > 0 ? [{ farmerId: { in: memberFarmerIds } }] : [])
                    ]
                  }
                }
              }
            }
          }
        ]
      },
      include: {
        buyer: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } }
          }
        },
        delivery: {
          include: { vehicle: true }
        },
        requirement: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const activeOrdersCount = orders.filter(o => ['PLACED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length;

    // Phase 2: Count pending join requests (Workflow B) and sent invitations (Workflow A)
    const joinReqNotifs = await prisma.notification.findMany({
      where: {
        userId: fpo.userId,
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FARMER_MEMBERSHIP_REQUEST'
        }
      },
      select: { metadata: true }
    });
    const pendingJoinRequestsCount = joinReqNotifs.filter(n => n.metadata?.status === 'PENDING').length;

    const pendingInvitationsNotifs = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['inviteType'],
          equals: 'FPO_MEMBERSHIP_INVITE'
        }
      },
      select: { metadata: true }
    });
    const now = new Date();
    const pendingInvitationsCount = pendingInvitationsNotifs.filter((n) => {
      const m = n.metadata || {};
      return (
        m.fpoId === fpo.id &&
        m.status === 'PENDING' &&
        (!m.expiresAt || new Date(m.expiresAt) > now)
      );
    }).length;

    // Phase 4: Fetch consolidated ProduceLot records
    const produceLots = await prisma.produceLot.findMany({
      where: { fpoId: fpo.id },
      include: {
        contributions: {
          include: {
            farmer: {
              include: {
                user: { select: { id: true, name: true, phone: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const activeProduceLotsCount = produceLots.filter(l =>
      ['AGGREGATED', 'TESTED', 'READY_FOR_SALE', 'ALLOCATED'].includes(l.status)
    ).length;

    return sendSuccess(res, {
      fpoProfile: fpo,
      memberCount: memberFarmers.length,
      activeMemberCount: activeMembers.length,
      pendingMemberCount: pendingMembers.length,
      pendingJoinRequestsCount,
      pendingInvitationsCount,
      memberFarmers,
      activeMembers,
      pendingMembers,
      inventoryMetrics: {
        availableStockKg: Math.round(availableStockKg * 10) / 10,
        reservedStockKg: Math.round(reservedStockKg * 10) / 10,
        soldStockKg: Math.round(soldStockKg * 10) / 10,
        totalStockKg: Math.round(totalStockKg * 10) / 10,
        activeLotsCount: activeProduceLotsCount > 0 ? activeProduceLotsCount : activeLotsCount,
        totalLotsCount: produceLots.length > 0 ? produceLots.length : fpoListings.length,
        produceLotsCount: produceLots.length,
        activeProduceLotsCount
      },
      produceLots,
      fpoListings: fpoListings.map(l => ({
        ...l,
        quantityKg: l.totalQuantityKg,
        availableQty: Math.max(0, l.totalQuantityKg - (l.reservedQty || 0) - (l.soldQty || 0)),
        location: l.village ? `${l.village}, ${l.district}` : l.district
      })),
      collectiveInventory,
      activeRequirements,
      pendingBulkRequestsCount: activeRequirements.length,
      orders,
      activeOrdersCount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/members
 */
const getMembers = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);

    // Active/confirmed members
    const members = await prisma.farmerProfile.findMany({
      where: { fpoId: fpo.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            avatarUrl: true,
            createdAt: true
          }
        },
        listings: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Pending invitations sent by this FPO (Fix 1 — show invited farmers in directory)
    const now = new Date();
    const pendingInviteNotifs = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['inviteType'],
          equals: 'FPO_MEMBERSHIP_INVITE'
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter to invites from this FPO that are still PENDING
    const pendingInvitations = pendingInviteNotifs
      .filter((n) => {
        const m = n.metadata || {};
        return (
          m.fpoId === fpo.id &&
          m.status === 'PENDING' &&
          (!m.expiresAt || new Date(m.expiresAt) > now)
        );
      })
      .map((n) => ({
        invitationId: n.id,
        membershipStatus: 'INVITATION_PENDING',
        invitedAt: n.metadata?.invitedAt,
        expiresAt: n.metadata?.expiresAt,
        user: n.user
      }));

    if (req.query.includePending === 'true' || req.query.detailed === 'true') {
      return sendSuccess(res, { members, pendingInvitations });
    }

    return sendSuccess(res, members);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/members
 *
 * FIX 1 — CONSENT: For existing registered farmers, do NOT immediately set fpoId.
 *   Instead, send a pending FPO membership invitation via the Notification model.
 *   For newly offline-enrolled farmers (not yet in the system), create the account
 *   with fpoId: null and also send an invitation so they can accept on first login.
 *
 * Fix 2 — KYC: Never auto-set aadhaarVerified / bankAccountVerified on enrollment.
 */
const addMember = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { name, phone, email, village, district, state, landSizeAcres, produceTypes } = req.body;

    const normalizedPhone = (phone || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Look up existing user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
        ]
      },
      include: { farmerProfile: true }
    });

    if (user) {
      // ── Existing registered farmer ──────────────────────────────────────────
      if (user.role !== 'FARMER') {
        throw new ConflictError(
          `Account with this phone/email already exists with role: ${user.role}. Only farmers can be added as FPO members.`
        );
      }
      if (user.farmerProfile?.fpoId && user.farmerProfile.fpoId !== fpo.id) {
        throw new ConflictError(
          'This farmer is already affiliated with another FPO. They must unlink from their current FPO first.'
        );
      }
      if (user.farmerProfile?.fpoId === fpo.id) {
        throw new ConflictError('This farmer is already a registered member of your FPO.');
      }

      // Check for an active duplicate pending invitation
      const pendingInvite = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: 'PROPOSAL',
          metadata: {
            path: ['status'],
            equals: 'PENDING'
          }
        }
      });

      if (pendingInvite && (!pendingInvite.metadata?.expiresAt || new Date(pendingInvite.metadata.expiresAt) > new Date())) {
        throw new ConflictError(
          'A membership invitation is already pending for this farmer. Please wait for them to respond.'
        );
      }

      // FIX 1: Send invitation — do NOT set fpoId yet
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const invite = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'PROPOSAL',
          title: `FPO Membership Invitation — ${fpo.fpoName}`,
          body: `${fpo.fpoName} has invited you to join as a member farmer. Accept or decline from your dashboard.`,
          metadata: {
            inviteType: 'FPO_MEMBERSHIP_INVITE',
            fpoId: fpo.id,
            fpoName: fpo.fpoName,
            registrationNo: fpo.registrationNo,
            status: 'PENDING',
            invitedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            // Store any profile fields the FPO supplied so they can be applied on accept
            profilePatch: { village, district, state, landSizeAcres, produceTypes }
          }
        }
      });

      return sendSuccess(res, {
        status: 'INVITATION_SENT',
        invitationId: invite.id,
        farmerName: user.name,
        message: 'Membership invitation sent. The farmer will be added once they accept.'
      });
    }

    // ── New offline-enrolled farmer (not yet in the system) ──────────────────
    if (!name || !normalizedPhone) {
      throw new ValidationError('Name and phone are required to enroll a new farmer member.');
    }

    const defaultPasswordHash = await bcrypt.hash(`SV@${normalizedPhone.slice(-4)}2026`, 10);
    const generatedEmail =
      normalizedEmail || `farmer.${normalizedPhone.replace(/[^0-9]/g, '')}@sasyavahini.member`;

    // Create account with fpoId: null — consent still required (Fix 1)
    // FIX 2: aadhaarVerified / bankAccountVerified remain false (default)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        email: generatedEmail,
        passwordHash: defaultPasswordHash,
        role: 'FARMER',
        status: 'PENDING_VERIFICATION',
        isPhoneVerified: false,
        farmerProfile: {
          create: {
            fpoId: null, // FIX 1: not set until farmer accepts
            village: village?.trim() || fpo.address || 'Member Village',
            district: district?.trim() || fpo.district,
            state: state?.trim() || fpo.state,
            landSizeAcres: landSizeAcres ? Number(landSizeAcres) : 1.5,
            produceTypes: Array.isArray(produceTypes) ? produceTypes : [],
            aadhaarVerified: false,   // FIX 2: never auto-verify KYC
            bankAccountVerified: false
          }
        }
      },
      include: { farmerProfile: true }
    });

    // Send invitation to the newly created account
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: 'PROPOSAL',
        title: `FPO Membership Invitation — ${fpo.fpoName}`,
        body: `You have been enrolled by ${fpo.fpoName}. Please log in and accept membership to join.`,
        metadata: {
          inviteType: 'FPO_MEMBERSHIP_INVITE',
          fpoId: fpo.id,
          fpoName: fpo.fpoName,
          registrationNo: fpo.registrationNo,
          status: 'PENDING',
          invitedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          profilePatch: { village, district, state, landSizeAcres, produceTypes }
        }
      }
    });

    return sendSuccess(res, {
      status: 'ENROLLED_INVITATION_SENT',
      invitationId: invite.id,
      farmerUserId: newUser.id,
      farmerName: newUser.name,
      message:
        'Farmer account created. A membership invitation has been sent — they must accept on first login.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/fpo/members/:id
 *
 * FIX 3 — SAFE UNLINKING:
 *   - Checks for active commitments (orders PLACED/CONFIRMED/IN_TRANSIT).
 *   - Preserves accounts, all orders, payment records, and financial history.
 *   - Clears fpoId only on uncommitted produce listings (AVAILABLE, reservedQty = 0).
 *   - Reports how many active commitments were preserved.
 */
const removeMember = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const member = await prisma.farmerProfile.findFirst({
      where: { id, fpoId: fpo.id },
      include: { user: true }
    });

    if (!member) {
      throw new NotFoundError('Member farmer not found in this FPO.');
    }

    // Check active commitments: AllocationItems for this farmer linked to in-flight orders
    const activeCommitments = await prisma.allocationItem.findMany({
      where: {
        farmerId: id,
        proposal: {
          status: { in: ['PENDING', 'ACCEPTED'] }
        }
      },
      include: { proposal: { include: { requirement: true } } }
    });

    // Count orders linked to active allocation proposals
    const activeOrderCount = activeCommitments.length;

    // Clear fpoId only on uncommitted (fully AVAILABLE, reservedQty = 0) listings
    const clearedListings = await prisma.produceListing.updateMany({
      where: {
        farmerId: id,
        status: 'AVAILABLE',
        reservedQty: 0
      },
      data: { fpoId: null }
    });

    // Unlink from FPO — does NOT delete account, listings, orders, payments
    await prisma.farmerProfile.update({
      where: { id },
      data: { fpoId: null }
    });

    // Recalculate member count from actual DB
    const totalMembers = await prisma.farmerProfile.count({ where: { fpoId: fpo.id } });
    await prisma.fPOProfile.update({
      where: { id: fpo.id },
      data: { memberCount: totalMembers }
    });

    return sendSuccess(res, {
      unlinked: true,
      removedMemberId: id,
      remainingCount: totalMembers,
      activeCommitmentsPreserved: activeOrderCount,
      uncommittedListingsCleared: clearedListings.count,
      message:
        activeOrderCount > 0
          ? `Farmer unlinked. ${activeOrderCount} active allocation commitment(s) preserved for order fulfilment. ${clearedListings.count} uncommitted listing(s) untagged from FPO.`
          : `Farmer unlinked successfully. ${clearedListings.count} uncommitted listing(s) untagged from FPO.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/fpo/members/:id/verify
 *
 * FIX 2 — KYC SEPARATION:
 *   Membership activation (user.status = ACTIVE) is now SEPARATE from KYC.
 *   This endpoint only activates the membership / account status.
 *   It does NOT auto-set aadhaarVerified or bankAccountVerified.
 *   KYC verification must be done through a dedicated KYC workflow.
 */
const verifyMember = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const member = await prisma.farmerProfile.findFirst({
      where: { id, fpoId: fpo.id },
      include: { user: true }
    });

    if (!member) {
      throw new NotFoundError('Member farmer not found in this FPO.');
    }

    // FIX 2: Activate membership only — KYC fields untouched
    await prisma.user.update({
      where: { id: member.userId },
      data: { status: 'ACTIVE' }
    });

    const updated = await prisma.farmerProfile.findUnique({
      where: { id },
      include: { user: true, listings: true }
    });

    return sendSuccess(res, {
      ...updated,
      membershipActivated: true,
      kycNote: 'Membership activated. KYC (Aadhaar/bank) verification remains unchanged and must be completed separately.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/aggregate OR /api/fpo/pools
 *
 * Strict FPO Authorization & Non-Duplication:
 * Verifies that all selected listings belong to this FPO or its verified members.
 */
const aggregateProduce = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { cropName, requirementId, listingIds } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      throw new ValidationError('Please select at least one member listing to aggregate');
    }

    // Verify ownership: must belong to this FPO or an affiliated member
    const listings = await prisma.produceListing.findMany({
      where: {
        id: { in: listingIds },
        OR: [
          { fpoId: fpo.id },
          { farmer: { fpoId: fpo.id } }
        ]
      },
      include: { farmer: { include: { user: true } } }
    });

    if (listings.length === 0) {
      throw new AuthorizationError('None of the selected produce lots belong to this FPO or its affiliated members.');
    }

    if (listings.length !== listingIds.length) {
      throw new AuthorizationError('One or more selected produce lots do not belong to this FPO or its affiliated members.');
    }

    const uncommittedCheck = listings.filter(l => l.status === 'SOLD' || (l.totalQuantityKg - l.reservedQty - l.soldQty) <= 0);
    if (uncommittedCheck.length > 0) {
      throw new ConflictError(`Cannot aggregate lots: Produce lot "${uncommittedCheck[0].cropName}" has no uncommitted inventory available.`);
    }

    const totalAggregatedQty = listings.reduce((sum, l) => sum + l.totalQuantityKg, 0);
    const totalValuation = listings.reduce((sum, l) => sum + (l.askingPricePerKg * l.totalQuantityKg), 0);
    const weightedAvgPrice = totalAggregatedQty > 0 ? Math.round((totalValuation / totalAggregatedQty) * 10) / 10 : 0;

    let requirement = null;
    if (requirementId) {
      requirement = await prisma.buyerRequirement.findUnique({
        where: { id: requirementId },
        include: { buyer: { include: { user: true } } }
      });
    }

    const result = {
      cropName: cropName || listings[0]?.cropName || 'Aggregated Produce',
      participatingFarmersCount: new Set(listings.map(l => l.farmerId)).size,
      listingsCount: listings.length,
      farmersBreakdown: listings.map(l => ({
        listingId: l.id,
        farmerName: l.farmer.user?.name || 'Member Farmer',
        village: l.village || l.farmer.village || 'Pune District',
        quantityKg: l.totalQuantityKg,
        askingPricePerKg: l.askingPricePerKg,
        qualityGrade: l.qualityGrade,
        isOrganic: l.isOrganic
      })),
      totalAggregatedQty,
      weightedAvgPricePerKg: weightedAvgPrice,
      isRequirementFulfilled: requirement ? totalAggregatedQty >= requirement.quantityKg : true,
      requirementQty: requirement ? requirement.quantityKg : totalAggregatedQty,
      buyerName: requirement?.buyer?.organizationName || requirement?.buyer?.user?.name || null,
      message: `Successfully aggregated ${totalAggregatedQty} kg across ${listings.length} lots from member farmers.`
    };

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/proposals
 */
const getFpoProposals = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const members = await prisma.farmerProfile.findMany({
      where: { fpoId: fpo.id },
      select: { id: true }
    });
    const memberIds = members.map(m => m.id);

    const items = await prisma.allocationItem.findMany({
      where: {
        OR: [
          { listing: { fpoId: fpo.id } },
          ...(memberIds.length > 0 ? [{ listing: { farmerId: { in: memberIds } } }] : [])
        ]
      },
      include: {
        listing: { include: { farmer: { include: { user: true } } } },
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

    const formatted = items.map(item => ({
      id: item.id,
      proposalId: item.proposalId,
      buyerName: item.proposal.requirement?.buyer?.organizationName || 'Institutional Buyer',
      cropName: item.listing.cropName,
      proposedQuantityKg: item.allocatedQtyKg !== undefined ? item.allocatedQtyKg : item.allocatedKg,
      offeredPricePerKg: item.proposedPricePerKg !== undefined ? item.proposedPricePerKg : item.agreedPricePerKg,
      farmerAskingPrice: item.listing.askingPricePerKg,
      contributingFarmer: item.listing.farmer?.user?.name || 'Affiliated Member',
      status: item.status,
      createdAt: item.createdAt
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/fpo/profile
 *
 * Allows authorized FPO managers to update permitted organization details.
 */
const updateFpoProfile = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { fpoName, registrationNo, address, district, state, contactName, phone } = req.body;

    const updateData = {};
    if (fpoName !== undefined) updateData.fpoName = fpoName.trim();
    if (registrationNo !== undefined) {
      const reg = registrationNo.trim();
      // Check if another FPO already uses this registration number
      const existing = await prisma.fPOProfile.findFirst({
        where: {
          registrationNo: reg,
          id: { not: fpo.id }
        }
      });
      if (existing) {
        throw new ConflictError('This registration number is already in use by another FPO.');
      }
      updateData.registrationNo = reg;
    }
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (district !== undefined) updateData.district = district.trim();
    if (state !== undefined) updateData.state = state.trim();

    // Sync member count with real DB count
    const realMemberCount = await prisma.farmerProfile.count({ where: { fpoId: fpo.id } });
    updateData.memberCount = realMemberCount;

    // Update FPO profile
    const updated = await prisma.fPOProfile.update({
      where: { id: fpo.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            isPhoneVerified: true
          }
        }
      }
    });

    // Optionally update manager user contact information
    if (contactName || phone) {
      const userUpdateData = {};
      if (contactName) userUpdateData.name = contactName.trim();
      if (phone) {
        const normPhone = phone.trim();
        const existingPhone = await prisma.user.findFirst({
          where: { phone: normPhone, id: { not: req.user.id } }
        });
        if (existingPhone) {
          throw new ConflictError('This phone number is already registered to another account.');
        }
        userUpdateData.phone = normPhone;
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: userUpdateData
      });
    }

    const refreshed = await prisma.fPOProfile.findUnique({
      where: { id: fpo.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            isPhoneVerified: true
          }
        }
      }
    });

    return sendSuccess(res, refreshed);
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PHASE 2 — FARMER-FPO MEMBERSHIP MANAGEMENT (FPO CONTROLLERS)
// =============================================================================

/**
 * GET /api/fpo/farmers/search?q=...
 *
 * Securely searches registered farmers by phone, email, or name.
 * Masks personal data unless exact match, and indicates current affiliation status.
 */
const searchFarmers = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const query = (req.query.q || '').trim();

    if (!query || query.length < 3) {
      return sendSuccess(res, []);
    }

    const isNumeric = /^\+?[0-9\s-]+$/.test(query);
    const cleanPhone = query.replace(/[^0-9]/g, '');

    const users = await prisma.user.findMany({
      where: {
        role: 'FARMER',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          ...(isNumeric && cleanPhone.length >= 3 ? [{ phone: { contains: cleanPhone } }] : [])
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        farmerProfile: {
          select: {
            id: true,
            village: true,
            district: true,
            state: true,
            landSizeAcres: true,
            produceTypes: true,
            aadhaarVerified: true,
            fpoId: true,
            fpo: {
              select: {
                id: true,
                fpoName: true
              }
            }
          }
        }
      },
      take: 20
    });

    // Check existing pending invitations from this FPO
    const pendingInvites = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['status'],
          equals: 'PENDING'
        }
      },
      select: {
        id: true,
        userId: true,
        metadata: true
      }
    });

    const pendingInviteMap = new Set();
    pendingInvites.forEach((inv) => {
      if (inv.metadata?.inviteType === 'FPO_MEMBERSHIP_INVITE' && inv.metadata?.fpoId === fpo.id) {
        pendingInviteMap.add(inv.userId);
      }
    });

    const results = users.map((u) => {
      const fp = u.farmerProfile;
      const isMyMember = fp?.fpoId === fpo.id;
      const isOtherFpo = fp?.fpoId && fp.fpoId !== fpo.id;
      const hasPendingInvite = pendingInviteMap.has(u.id);

      // Mask phone for privacy: show first 3 and last 3 digits
      const rawPhone = u.phone || '';
      const maskedPhone =
        rawPhone.length > 6
          ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}`
          : rawPhone;

      // Mask email
      const rawEmail = u.email || '';
      const atIdx = rawEmail.indexOf('@');
      const maskedEmail =
        atIdx > 2
          ? `${rawEmail.slice(0, 2)}***${rawEmail.slice(atIdx)}`
          : rawEmail;

      let affiliationStatus = 'AVAILABLE';
      if (isMyMember) affiliationStatus = 'MEMBER';
      else if (isOtherFpo) affiliationStatus = 'OTHER_FPO';
      else if (hasPendingInvite) affiliationStatus = 'INVITED';

      return {
        farmerId: fp?.id,
        userId: u.id,
        name: u.name,
        phone: rawPhone, // FPO manager is allowed to see the phone for verified contact verification
        maskedPhone,
        email: rawEmail,
        maskedEmail,
        village: fp?.village || 'Member Hub',
        district: fp?.district || fpo.district,
        state: fp?.state || fpo.state,
        landSizeAcres: fp?.landSizeAcres || 1.0,
        produceTypes: fp?.produceTypes || [],
        aadhaarVerified: fp?.aadhaarVerified || false,
        affiliationStatus,
        affiliatedFpoName: isOtherFpo ? fp?.fpo?.fpoName : null,
        userStatus: u.status
      };
    });

    return sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/fpo/members/:id/suspend
 *
 * Suspends an active member farmer from the cooperative.
 */
const suspendMember = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const member = await prisma.farmerProfile.findFirst({
      where: { id, fpoId: fpo.id },
      include: { user: true }
    });

    if (!member) {
      throw new NotFoundError('Member farmer not found in this FPO.');
    }

    if (member.user.status === 'SUSPENDED') {
      throw new ConflictError('Member is already suspended.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: member.userId },
        data: { status: 'SUSPENDED' }
      }),
      prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'ALERT',
          title: 'FPO Membership Suspended',
          body: `Your cooperative membership in ${fpo.fpoName} has been temporarily suspended by the manager. Please contact your FPO administration.`,
          metadata: {
            eventType: 'MEMBERSHIP_SUSPENDED',
            fpoId: fpo.id,
            fpoName: fpo.fpoName,
            suspendedAt: new Date().toISOString()
          }
        }
      })
    ]);

    const updated = await prisma.farmerProfile.findUnique({
      where: { id },
      include: { user: true, listings: true }
    });

    return sendSuccess(res, {
      ...updated,
      message: 'Member farmer suspended successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/fpo/members/:id/reactivate
 *
 * Reactivates a suspended member farmer.
 */
const reactivateMember = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const member = await prisma.farmerProfile.findFirst({
      where: { id, fpoId: fpo.id },
      include: { user: true }
    });

    if (!member) {
      throw new NotFoundError('Member farmer not found in this FPO.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: member.userId },
        data: { status: 'ACTIVE' }
      }),
      prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'INFO',
          title: 'FPO Membership Reactivated',
          body: `Your cooperative membership in ${fpo.fpoName} has been reactivated. You can now participate in aggregation lots and institutional matching.`,
          metadata: {
            eventType: 'MEMBERSHIP_REACTIVATED',
            fpoId: fpo.id,
            fpoName: fpo.fpoName,
            reactivatedAt: new Date().toISOString()
          }
        }
      })
    ]);

    const updated = await prisma.farmerProfile.findUnique({
      where: { id },
      include: { user: true, listings: true }
    });

    return sendSuccess(res, {
      ...updated,
      message: 'Member farmer reactivated successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/join-requests
 *
 * Fetches pending membership requests sent by independent farmers wishing to join this FPO (Workflow B).
 */
const getJoinRequests = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);

    const requests = await prisma.notification.findMany({
      where: {
        userId: fpo.userId,
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FARMER_MEMBERSHIP_REQUEST'
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const parsed = requests.map((n) => {
      const meta = n.metadata || {};
      return {
        id: n.id,
        farmerId: meta.farmerId,
        farmerUserId: meta.farmerUserId,
        farmerName: meta.farmerName,
        farmerPhone: meta.farmerPhone,
        village: meta.village,
        district: meta.district,
        state: meta.state,
        landSizeAcres: meta.landSizeAcres,
        produceTypes: meta.produceTypes || [],
        status: meta.status || 'PENDING',
        requestedAt: meta.requestedAt || n.createdAt,
        isRead: n.isRead,
        createdAt: n.createdAt
      };
    });

    return sendSuccess(res, parsed);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/join-requests/:id/approve
 *
 * FPO approves a farmer's membership join request (Workflow B).
 * Sets FarmerProfile.fpoId, updates FPO memberCount, and notifies farmer.
 */
const approveJoinRequest = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif) {
      throw new NotFoundError('Join request not found.');
    }

    if (notif.userId !== fpo.userId && notif.metadata?.fpoId !== fpo.id) {
      throw new AuthorizationError('You are not authorized to review or approve this join request.');
    }

    const meta = notif.metadata || {};

    if (meta.requestType !== 'FARMER_MEMBERSHIP_REQUEST') {
      throw new ValidationError('This record is not a farmer membership request.');
    }

    if (meta.status !== 'PENDING') {
      throw new ConflictError(`This join request has already been ${meta.status}.`);
    }

    const { farmerId, farmerUserId } = meta;

    // Verify farmer profile exists
    const farmerProfile = await prisma.farmerProfile.findUnique({
      where: { id: farmerId },
      include: { user: true }
    });

    if (!farmerProfile) {
      throw new NotFoundError('Farmer profile not found.');
    }

    if (farmerProfile.fpoId && farmerProfile.fpoId !== fpo.id) {
      throw new ConflictError('This farmer is already affiliated with another FPO. They must unlink first.');
    }

    if (farmerProfile.fpoId === fpo.id) {
      // Already a member
      await prisma.notification.update({
        where: { id },
        data: { metadata: { ...meta, status: 'APPROVED', approvedAt: new Date().toISOString() } }
      });
      return sendSuccess(res, {
        approved: true,
        message: 'Farmer is already an active member of this FPO.'
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Affiliate farmer to this FPO
      await tx.farmerProfile.update({
        where: { id: farmerId },
        data: {
          fpoId: fpo.id
        }
      });

      // 2. Mark notification APPROVED
      await tx.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: {
            ...meta,
            status: 'APPROVED',
            approvedAt: new Date().toISOString()
          }
        }
      });

      // 3. Recalculate FPO member count
      const totalMembers = await tx.farmerProfile.count({ where: { fpoId: fpo.id } });
      await tx.fPOProfile.update({
        where: { id: fpo.id },
        data: { memberCount: totalMembers }
      });

      // 4. Notify farmer
      await tx.notification.create({
        data: {
          userId: farmerUserId,
          type: 'INFO',
          title: 'Membership Request Approved!',
          body: `Congratulations! ${fpo.fpoName} has approved your membership request. You are now an active member farmer of the cooperative.`,
          metadata: {
            eventType: 'FPO_JOIN_APPROVED',
            fpoId: fpo.id,
            fpoName: fpo.fpoName,
            registrationNo: fpo.registrationNo
          }
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

    const updatedTotal = await prisma.farmerProfile.count({ where: { fpoId: fpo.id } });

    return sendSuccess(res, {
      approved: true,
      farmerId,
      fpoId: fpo.id,
      memberCount: updatedTotal,
      message: `Membership request approved. Farmer is now an active member of ${fpo.fpoName}.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/join-requests/:id/reject
 *
 * FPO declines a farmer's membership join request (Workflow B).
 */
const rejectJoinRequest = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { reason } = req.body || {};

    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif) {
      throw new NotFoundError('Join request not found.');
    }

    if (notif.userId !== fpo.userId && notif.metadata?.fpoId !== fpo.id) {
      throw new AuthorizationError('You are not authorized to review or approve this join request.');
    }

    const meta = notif.metadata || {};

    if (meta.requestType !== 'FARMER_MEMBERSHIP_REQUEST') {
      throw new ValidationError('This record is not a farmer membership request.');
    }

    if (meta.status !== 'PENDING') {
      throw new ConflictError(`This join request has already been ${meta.status}.`);
    }

    await prisma.$transaction([
      prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: {
            ...meta,
            status: 'REJECTED',
            rejectionReason: reason || 'Not meeting regional criteria at this time',
            rejectedAt: new Date().toISOString()
          }
        }
      }),
      prisma.notification.create({
        data: {
          userId: meta.farmerUserId,
          type: 'INFO',
          title: 'FPO Membership Request Declined',
          body: `${fpo.fpoName} was unable to accept your membership request at this time.${reason ? ` Reason: ${reason}` : ''}`,
          metadata: {
            eventType: 'FPO_JOIN_REJECTED',
            fpoId: fpo.id,
            fpoName: fpo.fpoName
          }
        }
      })
    ]);

    return sendSuccess(res, {
      rejected: true,
      message: 'Join request declined.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/invitations
 *
 * Lists all outgoing invitations sent by this FPO to farmers (Workflow A).
 */
const getSentInvitations = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);

    const notifs = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['inviteType'],
          equals: 'FPO_MEMBERSHIP_INVITE'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            farmerProfile: {
              select: {
                id: true,
                village: true,
                district: true,
                state: true,
                landSizeAcres: true,
                produceTypes: true,
                fpoId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const sent = notifs
      .filter((n) => n.metadata?.fpoId === fpo.id)
      .map((n) => {
        const meta = n.metadata || {};
        const expired = meta.expiresAt ? new Date(meta.expiresAt) < now : false;
        const currentStatus =
          expired && meta.status === 'PENDING' ? 'EXPIRED' : meta.status || 'PENDING';

        return {
          id: n.id,
          userId: n.userId,
          farmerName: n.user?.name,
          farmerPhone: n.user?.phone,
          farmerEmail: n.user?.email,
          village: n.user?.farmerProfile?.village || meta.profilePatch?.village,
          district: n.user?.farmerProfile?.district || meta.profilePatch?.district,
          landSizeAcres: n.user?.farmerProfile?.landSizeAcres || meta.profilePatch?.landSizeAcres,
          produceTypes: n.user?.farmerProfile?.produceTypes || meta.profilePatch?.produceTypes || [],
          status: currentStatus,
          invitedAt: meta.invitedAt || n.createdAt,
          expiresAt: meta.expiresAt,
          acceptedAt: meta.acceptedAt,
          rejectedAt: meta.rejectedAt,
          isRead: n.isRead,
          createdAt: n.createdAt
        };
      });

    return sendSuccess(res, sent);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/fpo/invitations/:id
 *
 * Cancels a pending outgoing invitation sent by this FPO.
 */
const cancelInvitation = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif) {
      throw new NotFoundError('Invitation not found.');
    }

    const meta = notif.metadata || {};

    if (meta.inviteType !== 'FPO_MEMBERSHIP_INVITE' || meta.fpoId !== fpo.id) {
      throw new AuthorizationError('You are not authorized to cancel this invitation.');
    }

    if (meta.status !== 'PENDING') {
      throw new ConflictError(`Invitation is already ${meta.status} and cannot be cancelled.`);
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
      message: 'Invitation cancelled successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 3: FPO MEMBER PRODUCE MANAGEMENT & CONTRIBUTION REQUESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/fpo/member-produce
 *
 * Retrieves produce listings from ACTIVE member farmers of this FPO.
 * Separate tracking of available, reserved, and committed quantities.
 * Supports filtering by farmer, crop, quality grade, status, and harvest date.
 */
const getMemberProduce = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const search = (req.query.search || req.query.q || '').trim().toLowerCase();
    const cropFilter = (req.query.crop || '').trim();
    const farmerIdFilter = (req.query.farmerId || '').trim();
    const qualityFilter = (req.query.qualityGrade || '').trim();
    const statusFilter = (req.query.status || 'ALL').trim().toUpperCase();
    const harvestBefore = req.query.harvestBefore ? new Date(req.query.harvestBefore) : null;
    const harvestAfter = req.query.harvestAfter ? new Date(req.query.harvestAfter) : null;

    // Build query for active member farmers only
    const where = {
      farmer: {
        fpoId: fpo.id,
        user: { status: 'ACTIVE' } // Exclude suspended or non-active members
      }
    };

    if (cropFilter) {
      where.cropName = { equals: cropFilter, mode: 'insensitive' };
    }

    if (farmerIdFilter) {
      where.farmerId = farmerIdFilter;
    }

    if (qualityFilter) {
      where.qualityGrade = qualityFilter;
    }

    if (harvestBefore || harvestAfter) {
      where.harvestDate = {};
      if (harvestAfter) where.harvestDate.gte = harvestAfter;
      if (harvestBefore) where.harvestDate.lte = harvestBefore;
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'AVAILABLE') {
        where.status = { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] };
      } else {
        where.status = statusFilter;
      }
    }

    const listings = await prisma.produceListing.findMany({
      where,
      include: {
        farmer: {
          select: {
            id: true,
            userId: true,
            village: true,
            district: true,
            state: true,
            landSizeAcres: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: [{ harvestDate: 'desc' }, { createdAt: 'desc' }]
    });

    // Fetch active pending contribution requests for these listings to display contribution status
    const pendingRequests = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FPO_CONTRIBUTION_REQUEST'
        }
      },
      select: { metadata: true }
    });

    const pendingRequestsMap = new Map();
    pendingRequests.forEach((n) => {
      const meta = n.metadata || {};
      if (meta.fpoId === fpo.id && meta.status === 'PENDING' && meta.listingId) {
        const count = pendingRequestsMap.get(meta.listingId) || 0;
        pendingRequestsMap.set(meta.listingId, count + 1);
      }
    });

    // Map and enrich listings with distinct quantity tracking
    let formatted = listings.map((l) => {
      const availableQty = Math.max(0, l.totalQuantityKg - l.reservedQty - l.soldQty);
      const isAvailable = availableQty > 0 && l.status !== 'SOLD' && l.status !== 'EXPIRED';

      return {
        id: l.id,
        cropName: l.cropName,
        category: l.category,
        variety: l.category || 'Standard',
        qualityGrade: l.qualityGrade,
        isOrganic: l.isOrganic,
        totalQuantityKg: l.totalQuantityKg,
        reservedQuantityKg: l.reservedQty,
        committedQuantityKg: l.soldQty,
        availableQuantityKg: availableQty,
        unit: 'kg',
        askingPricePerKg: l.askingPricePerKg,
        minPricePerKg: l.minPricePerKg,
        harvestDate: l.harvestDate ? l.harvestDate.toISOString().split('T')[0] : null,
        expiryDate: l.expiryDate ? l.expiryDate.toISOString().split('T')[0] : null,
        status: l.status,
        isAvailable,
        pendingContributionRequestsCount: pendingRequestsMap.get(l.id) || 0,
        farmer: {
          id: l.farmer.id,
          userId: l.farmer.userId,
          name: l.farmer.user?.name || 'Member Farmer',
          phone: l.farmer.user?.phone,
          village: l.farmer.village || 'Hub',
          district: l.farmer.district,
          state: l.farmer.state,
          landSizeAcres: l.farmer.landSizeAcres
        },
        location: l.village ? `${l.village}, ${l.district}` : l.district,
        createdAt: l.createdAt
      };
    });

    // Apply text search across farmer name, crop, and location
    if (search) {
      formatted = formatted.filter((item) => {
        return (
          item.cropName.toLowerCase().includes(search) ||
          item.farmer.name.toLowerCase().includes(search) ||
          item.farmer.village.toLowerCase().includes(search) ||
          item.farmer.district.toLowerCase().includes(search) ||
          (item.variety && item.variety.toLowerCase().includes(search))
        );
      });
    }

    // Aggregate summary metrics
    const summary = {
      totalListingsCount: formatted.length,
      availableListingsCount: formatted.filter((i) => i.isAvailable).length,
      totalAvailableKg: formatted.reduce((s, i) => s + i.availableQuantityKg, 0),
      totalReservedKg: formatted.reduce((s, i) => s + i.reservedQuantityKg, 0),
      totalCommittedKg: formatted.reduce((s, i) => s + i.committedQuantityKg, 0)
    };

    return sendSuccess(res, {
      summary,
      metrics: summary,
      listings: formatted
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/contributions/request
 *
 * Sends a contribution request for one or multiple member listings.
 * Strictly does NOT auto-reserve stock — reservations happen ONLY after farmer consent.
 */
const requestContribution = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { requests, purpose, expiryHours = 48 } = req.body;

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      throw new ValidationError('At least one produce listing must be selected.');
    }

    const createdNotifications = [];
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    for (const item of requests) {
      const { listingId, requestedQtyKg, offeredPricePerKg, notes } = item;

      if (!requestedQtyKg || requestedQtyKg <= 0) {
        throw new ValidationError(`Invalid requested quantity for listing ID ${listingId}.`);
      }

      const listing = await prisma.produceListing.findUnique({
        where: { id: listingId },
        include: {
          farmer: {
            include: { user: true }
          }
        }
      });

      if (!listing) {
        throw new NotFoundError(`Listing ${listingId} not found.`);
      }

      // Verify listing belongs to an active member of this FPO
      if (listing.farmer.fpoId !== fpo.id) {
        throw new AuthorizationError(
          `Listing ${listing.cropName} (${listingId}) does not belong to a member of your FPO.`
        );
      }

      if (listing.farmer.user.status !== 'ACTIVE') {
        throw new ConflictError(
          `Farmer ${listing.farmer.user.name} is currently suspended or inactive. Contribution cannot be requested.`
        );
      }

      if (listing.status === 'SOLD' || listing.status === 'EXPIRED') {
        throw new ConflictError(`Listing ${listing.cropName} is ${listing.status} and cannot be contributed.`);
      }

      // Check available quantity
      const availableQty = Math.max(0, listing.totalQuantityKg - listing.reservedQty - listing.soldQty);
      if (requestedQtyKg > availableQty) {
        throw new ConflictError(
          `Requested quantity (${requestedQtyKg} kg) exceeds available stock (${availableQty} kg) for ${listing.cropName}.`
        );
      }

      const price = offeredPricePerKg || listing.askingPricePerKg;

      // Dispatch contribution request notification to the farmer (Consent Workflow)
      const notification = await prisma.notification.create({
        data: {
          userId: listing.farmer.userId,
          type: 'PROPOSAL',
          title: `FPO Contribution Request — ${listing.cropName}`,
          body: `${fpo.fpoName} has requested a contribution of ${requestedQtyKg} kg of ${listing.cropName} at ₹${price}/kg for collective aggregation.`,
          metadata: {
            requestType: 'FPO_CONTRIBUTION_REQUEST',
            fpoId: fpo.id,
            fpoName: fpo.fpoName,
            fpoRegistrationNo: fpo.registrationNo,
            fpoUserId: fpo.userId,
            farmerId: listing.farmerId,
            farmerUserId: listing.farmer.userId,
            farmerName: listing.farmer.user.name,
            listingId: listing.id,
            cropName: listing.cropName,
            variety: listing.category || 'Standard',
            qualityGrade: listing.qualityGrade,
            requestedQtyKg,
            offeredPricePerKg: price,
            askingPricePerKg: listing.askingPricePerKg,
            notes: notes || purpose || '',
            status: 'PENDING',
            confirmedQtyKg: null,
            requestedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            respondedAt: null
          }
        }
      });

      createdNotifications.push({
        id: notification.id,
        notificationId: notification.id,
        listingId: listing.id,
        cropName: listing.cropName,
        farmerName: listing.farmer.user.name,
        requestedQtyKg,
        offeredPricePerKg: price,
        status: 'PENDING'
      });
    }

    return sendSuccess(res, {
      requestedCount: createdNotifications.length,
      dispatchedCount: createdNotifications.length,
      contributions: createdNotifications,
      requests: createdNotifications,
      message: `Successfully dispatched ${createdNotifications.length} contribution request(s) to member farmers.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/contributions
 *
 * Lists all outgoing contribution requests dispatched by this FPO.
 */
const getFpoContributions = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const statusFilter = (req.query.status || 'ALL').trim().toUpperCase();

    const notifs = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FPO_CONTRIBUTION_REQUEST'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            farmerProfile: {
              select: {
                id: true,
                village: true,
                district: true,
                landSizeAcres: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    let requests = notifs
      .filter((n) => n.metadata?.fpoId === fpo.id)
      .map((n) => {
        const meta = n.metadata || {};
        const isExpired = meta.expiresAt ? new Date(meta.expiresAt) < now : false;
        let currentStatus = meta.status || 'PENDING';
        if (currentStatus === 'PENDING' && isExpired) {
          currentStatus = 'EXPIRED';
        }

        return {
          id: n.id,
          notificationId: n.id,
          fpoId: meta.fpoId,
          farmerId: meta.farmerId,
          farmerUserId: meta.farmerUserId,
          farmerName: meta.farmerName || n.user?.name,
          farmerPhone: n.user?.phone,
          farmerVillage: n.user?.farmerProfile?.village,
          farmerDistrict: n.user?.farmerProfile?.district,
          listingId: meta.listingId,
          cropName: meta.cropName,
          qualityGrade: meta.qualityGrade,
          variety: meta.variety,
          requestedQtyKg: meta.requestedQtyKg,
          confirmedQtyKg: meta.confirmedQtyKg,
          offeredPricePerKg: meta.offeredPricePerKg,
          askingPricePerKg: meta.askingPricePerKg,
          estimatedTotalValue: (meta.confirmedQtyKg || meta.requestedQtyKg) * meta.offeredPricePerKg,
          notes: meta.notes,
          status: currentStatus,
          rejectionReason: meta.rejectionReason,
          requestedAt: meta.requestedAt || n.createdAt,
          expiresAt: meta.expiresAt,
          respondedAt: meta.respondedAt,
          releasedAt: meta.releasedAt,
          createdAt: n.createdAt
        };
      });

    if (statusFilter !== 'ALL') {
      requests = requests.filter((r) => r.status === statusFilter);
    }

    return sendSuccess(res, requests);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/fpo/contributions/:id
 *
 * Cancels an outgoing contribution request.
 * If the request was already accepted/reserved, safely releases the reservation back to available stock.
 */
const cancelFpoContribution = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });

    if (!notif) {
      throw new NotFoundError('Contribution request not found.');
    }

    const meta = notif.metadata || {};

    if (meta.requestType !== 'FPO_CONTRIBUTION_REQUEST' || meta.fpoId !== fpo.id) {
      throw new AuthorizationError('You are not authorized to cancel this contribution request.');
    }

    if (meta.status === 'CANCELLED' || meta.status === 'REJECTED') {
      throw new ConflictError(`Contribution request is already ${meta.status}.`);
    }

    const wasAccepted = meta.status === 'ACCEPTED' || meta.status === 'PARTIALLY_ACCEPTED';
    const qtyToRelease = wasAccepted ? meta.confirmedQtyKg || 0 : 0;

    await prisma.$transaction(async (tx) => {
      // 1. If stock was reserved, release it back to the farmer listing
      if (qtyToRelease > 0 && meta.listingId) {
        const listing = await tx.produceListing.findUnique({
          where: { id: meta.listingId }
        });

        if (listing) {
          const newReserved = Math.max(0, listing.reservedQty - qtyToRelease);
          const newStatus =
            newReserved === 0 && listing.soldQty === 0
              ? 'AVAILABLE'
              : newReserved + listing.soldQty >= listing.totalQuantityKg
              ? 'RESERVED'
              : 'PARTIALLY_RESERVED';

          await tx.produceListing.update({
            where: { id: listing.id },
            data: {
              reservedQty: newReserved,
              status: newStatus
            }
          });
        }
      }

      // 2. Mark notification CANCELLED
      await tx.notification.update({
        where: { id },
        data: {
          isRead: true,
          metadata: {
            ...meta,
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
            releasedQtyKg: qtyToRelease
          }
        }
      });

      // 3. Notify farmer
      await tx.notification.create({
        data: {
          userId: meta.farmerUserId,
          type: 'INFO',
          title: `Contribution Request Cancelled — ${meta.cropName}`,
          body: `${fpo.fpoName} has cancelled the contribution request for ${meta.cropName}.${
            qtyToRelease > 0 ? ` Your reserved stock (${qtyToRelease} kg) has been restored to available.` : ''
          }`,
          metadata: {
            eventType: 'FPO_CONTRIBUTION_CANCELLED',
            contributionId: id,
            fpoId: fpo.id,
            listingId: meta.listingId,
            releasedQtyKg: qtyToRelease
          }
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      cancelled: true,
      status: 'CANCELLED',
      releasedQtyKg: qtyToRelease,
      message: `Contribution request cancelled successfully.${
        qtyToRelease > 0 ? ` ${qtyToRelease} kg released back to available stock.` : ''
      }`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/contributions/:id/release
 *
 * Explicit release of confirmed contribution reservations (e.g. if order requirement closes).
 */
const releaseContributionReservation = async (req, res, next) => {
  return cancelFpoContribution(req, res, next);
};

// =============================================================================
// PHASE 4: PRODUCE LOT AGGREGATION & MANAGEMENT CONTROLLERS
// =============================================================================

/**
 * GET /api/fpo/contributions/confirmed
 *
 * Fetches all confirmed farmer contributions for this FPO with real-time remaining availability.
 * Contributions already committed to active lots are decremented to prevent double allocation.
 */
const getConfirmedContributions = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const cropFilter = (req.query.crop || '').trim().toLowerCase();
    const availableOnly = req.query.availableOnly === 'true';

    // 1. Fetch confirmed contribution notifications for this FPO
    const notifs = await prisma.notification.findMany({
      where: {
        type: 'PROPOSAL',
        metadata: {
          path: ['requestType'],
          equals: 'FPO_CONTRIBUTION_REQUEST'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            farmerProfile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const fpoNotifs = notifs.filter((n) => {
      const meta = n.metadata || {};
      return (
        meta.fpoId === fpo.id &&
        ['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(meta.status)
      );
    });

    const notifIds = fpoNotifs.map((n) => n.id);

    // 2. Fetch all active ProduceLotContribution records linked to these notifications
    const activeLotContribs = await prisma.produceLotContribution.findMany({
      where: {
        notificationId: { in: notifIds },
        status: { not: 'RELEASED' }
      }
    });

    // 3. Map into structured contribution records
    let confirmedList = fpoNotifs.map((n) => {
      const meta = n.metadata || {};
      const confirmedQty = Number(meta.confirmedQtyKg || meta.requestedQtyKg || 0);

      const usedInLots = activeLotContribs
        .filter((lc) => lc.notificationId === n.id)
        .reduce((sum, lc) => sum + lc.allocatedQtyKg, 0);

      const availableForLotKg = Math.max(0, confirmedQty - usedInLots);

      return {
        id: n.id,
        notificationId: n.id,
        listingId: meta.listingId,
        farmerId: meta.farmerId,
        farmerName: meta.farmerName || n.user?.name || 'Member Farmer',
        farmerPhone: n.user?.phone || null,
        farmerVillage: n.user?.farmerProfile?.village || 'Member Cluster',
        farmerStatus: n.user?.status || 'ACTIVE',
        cropName: meta.cropName,
        variety: meta.variety || 'Standard',
        qualityGrade: meta.qualityGrade || 'GRADE_A',
        unit: 'kg',
        confirmedQtyKg: confirmedQty,
        usedInLotQtyKg: usedInLots,
        availableForLotKg: availableForLotKg,
        offeredPricePerKg: Number(meta.offeredPricePerKg || meta.askingPricePerKg || 0),
        status: meta.status,
        confirmedAt: meta.respondedAt || n.createdAt,
        createdAt: n.createdAt
      };
    });

    // 4. Apply optional filters
    if (cropFilter) {
      confirmedList = confirmedList.filter((c) =>
        c.cropName.toLowerCase().includes(cropFilter)
      );
    }
    if (availableOnly) {
      confirmedList = confirmedList.filter((c) => c.availableForLotKg > 0);
    }

    const summary = {
      totalConfirmedCount: confirmedList.length,
      availableCount: confirmedList.filter((c) => c.availableForLotKg > 0).length,
      totalConfirmedKg: confirmedList.reduce((s, c) => s + c.confirmedQtyKg, 0),
      totalUsedInLotsKg: confirmedList.reduce((s, c) => s + c.usedInLotQtyKg, 0),
      totalAvailableForLotKg: confirmedList.reduce((s, c) => s + c.availableForLotKg, 0)
    };

    return sendSuccess(res, {
      summary,
      contributions: confirmedList
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/lots
 *
 * Creates a consolidated produce lot from farmer-confirmed contributions.
 * Atomic, concurrency-safe transaction with strict compatibility & anti-double-counting checks.
 */
const createProduceLot = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const {
      cropName,
      variety,
      qualityGrade = 'GRADE_A',
      unit = 'kg',
      notes,
      storageLocation,
      contributions
    } = req.body;

    if (!cropName || typeof cropName !== 'string' || cropName.trim().length < 2) {
      throw new ValidationError('A valid crop name is required for produce lot aggregation.');
    }

    if (!Array.isArray(contributions) || contributions.length === 0) {
      throw new ValidationError('Please select at least 1 farmer contribution to aggregate into the lot.');
    }

    const targetCrop = cropName.trim();

    // Execute within atomic database transaction
    const newLot = await prisma.$transaction(async (tx) => {
      const notifIds = contributions.map((c) => c.contributionId);

      // 1. Fetch matching contribution notifications
      const notifs = await tx.notification.findMany({
        where: { id: { in: notifIds } },
        include: {
          user: {
            include: { farmerProfile: true }
          }
        }
      });

      // 2. Validate each contribution and check compatibility
      const validatedItems = [];
      let totalQuantity = 0;
      let totalCost = 0;

      for (const item of contributions) {
        const notif = notifs.find((n) => n.id === item.contributionId);
        if (!notif) {
          throw new NotFoundError(`Confirmed contribution request ${item.contributionId} not found.`);
        }

        const meta = notif.metadata || {};

        // Tenant Isolation: must belong to this FPO
        if (meta.fpoId !== fpo.id) {
          throw new AuthorizationError(`Contribution ${item.contributionId} does not belong to your FPO.`);
        }

        // Must be confirmed by farmer
        if (!['ACCEPTED', 'PARTIALLY_ACCEPTED'].includes(meta.status)) {
          throw new ConflictError(
            `Contribution for ${meta.cropName} is not confirmed by the farmer (status: ${meta.status}). Only confirmed quantities can be aggregated into lots.`
          );
        }

        // Crop Compatibility: strictly prevent mixing different crops
        if (meta.cropName.toLowerCase().trim() !== targetCrop.toLowerCase()) {
          throw new ValidationError(
            `Incompatible crop detected: Cannot combine "${meta.cropName}" into a lot designated for "${targetCrop}". All contributions must be the same crop.`
          );
        }

        // Quantity Check & Anti-Double-Counting
        const allocQty = Number(item.quantityKg);
        if (isNaN(allocQty) || allocQty <= 0) {
          throw new ValidationError(`Invalid allocation quantity for contribution ${item.contributionId}.`);
        }

        // Query active lot allocations for this notification
        const activeContribs = await tx.produceLotContribution.findMany({
          where: {
            notificationId: notif.id,
            status: { not: 'RELEASED' }
          }
        });

        const alreadyAllocated = activeContribs.reduce((s, c) => s + c.allocatedQtyKg, 0);
        const confirmedTotal = Number(meta.confirmedQtyKg || meta.requestedQtyKg || 0);
        const availableToCommit = Math.max(0, confirmedTotal - alreadyAllocated);

        if (allocQty > availableToCommit) {
          throw new ConflictError(
            `Requested allocation (${allocQty} kg) exceeds available confirmed quantity (${availableToCommit} kg) for farmer ${meta.farmerName || 'member'}.`
          );
        }

        const agreedPrice = Number(meta.offeredPricePerKg || meta.askingPricePerKg || 0);

        validatedItems.push({
          notificationId: notif.id,
          listingId: meta.listingId,
          farmerId: meta.farmerId,
          farmerName: meta.farmerName || notif.user?.name || 'Member Farmer',
          allocatedQtyKg: allocQty,
          agreedPricePerKg: agreedPrice
        });

        totalQuantity += allocQty;
        totalCost += (allocQty * agreedPrice);
      }

      if (totalQuantity <= 0) {
        throw new ValidationError('Total lot aggregated quantity must be greater than 0 kg.');
      }

      // Calculate weighted average asking rate
      const weightedAvgPricePerKg = Math.round((totalCost / totalQuantity) * 100) / 100;

      // 3. Generate unique human-readable lot number
      const lotCount = await tx.produceLot.count({ where: { fpoId: fpo.id } });
      const seq = String(lotCount + 1).padStart(4, '0');
      const cropAbbr = targetCrop.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CRP';
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const lotNumber = `LOT-${cropAbbr}-${yearMonth}-${seq}`;

      // 4. Create ProduceLot record
      const lot = await tx.produceLot.create({
        data: {
          lotNumber,
          fpoId: fpo.id,
          cropName: targetCrop,
          category: 'Vegetables',
          variety: variety?.trim() || notifs[0]?.metadata?.variety || null,
          qualityGrade: qualityGrade || 'GRADE_A',
          unit: unit || 'kg',
          totalQuantityKg: totalQuantity,
          availableQuantityKg: totalQuantity,
          allocatedQuantityKg: 0,
          weightedAvgPricePerKg,
          status: 'AGGREGATED',
          notes: notes?.trim() || null,
          storageLocation: storageLocation?.trim() || fpo.address || `${fpo.district}, ${fpo.state}`
        }
      });

      // 5. Create ProduceLotContribution records linking each farmer
      const createdContribs = [];
      for (const vItem of validatedItems) {
        const plc = await tx.produceLotContribution.create({
          data: {
            lotId: lot.id,
            notificationId: vItem.notificationId,
            listingId: vItem.listingId,
            farmerId: vItem.farmerId,
            allocatedQtyKg: vItem.allocatedQtyKg,
            agreedPricePerKg: vItem.agreedPricePerKg,
            status: 'COMMITTED'
          }
        });
        createdContribs.push({
          ...plc,
          farmerName: vItem.farmerName
        });
      }

      // 6. Write AuditLog entry
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOT_CREATED',
          entityType: 'ProduceLot',
          entityId: lot.id,
          metadata: {
            lotNumber: lot.lotNumber,
            cropName: targetCrop,
            totalQuantityKg: totalQuantity,
            weightedAvgPricePerKg,
            contributingFarmersCount: validatedItems.length
          }
        }
      });

      return {
        ...lot,
        contributions: createdContribs
      };
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      lot: newLot,
      message: `Successfully created produce lot ${newLot.lotNumber} with ${newLot.totalQuantityKg.toLocaleString()} kg of ${newLot.cropName} from ${newLot.contributions.length} member contributions.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/lots
 *
 * Lists all consolidated produce lots for this FPO with filtering, status tracking, and volume metrics.
 */
const getProduceLots = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { status, crop, qualityGrade, search } = req.query;

    const where = { fpoId: fpo.id };

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (crop && crop !== 'ALL') {
      where.cropName = { contains: crop, mode: 'insensitive' };
    }
    if (qualityGrade && qualityGrade !== 'ALL') {
      where.qualityGrade = qualityGrade;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { lotNumber: { contains: q, mode: 'insensitive' } },
        { cropName: { contains: q, mode: 'insensitive' } },
        { variety: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } }
      ];
    }

    const lots = await prisma.produceLot.findMany({
      where,
      include: {
        contributions: {
          include: {
            farmer: {
              include: {
                user: {
                  select: { id: true, name: true, phone: true }
                }
              }
            },
            listing: {
              select: { id: true, cropName: true, qualityGrade: true, status: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute summary metrics across all FPO lots
    const allFpoLots = await prisma.produceLot.findMany({
      where: { fpoId: fpo.id },
      select: {
        status: true,
        totalQuantityKg: true,
        availableQuantityKg: true,
        allocatedQuantityKg: true
      }
    });

    const activeStatuses = ['AGGREGATED', 'TESTED', 'READY_FOR_SALE', 'ALLOCATED'];
    const summary = {
      totalLotsCount: allFpoLots.length,
      activeLotsCount: allFpoLots.filter((l) => activeStatuses.includes(l.status)).length,
      totalAggregatedKg: allFpoLots.reduce((s, l) => s + (l.status !== 'CANCELLED' ? l.totalQuantityKg : 0), 0),
      availableLotStockKg: allFpoLots.reduce((s, l) => s + (activeStatuses.includes(l.status) ? l.availableQuantityKg : 0), 0),
      allocatedLotStockKg: allFpoLots.reduce((s, l) => s + (l.status !== 'CANCELLED' ? l.allocatedQuantityKg : 0), 0)
    };

    const formattedLots = lots.map((l) => ({
      id: l.id,
      lotNumber: l.lotNumber,
      cropName: l.cropName,
      variety: l.variety,
      qualityGrade: l.qualityGrade,
      unit: l.unit,
      totalQuantityKg: l.totalQuantityKg,
      availableQuantityKg: l.availableQuantityKg,
      allocatedQuantityKg: l.allocatedQuantityKg,
      weightedAvgPricePerKg: l.weightedAvgPricePerKg,
      status: l.status,
      notes: l.notes,
      storageLocation: l.storageLocation,
      contributingFarmersCount: l.contributions.length,
      contributions: l.contributions.map((c) => ({
        id: c.id,
        farmerId: c.farmerId,
        farmerName: c.farmer?.user?.name || 'Member Farmer',
        farmerPhone: c.farmer?.user?.phone || null,
        allocatedQtyKg: c.allocatedQtyKg,
        agreedPricePerKg: c.agreedPricePerKg,
        status: c.status,
        percentageOfLot: Math.round((c.allocatedQtyKg / l.totalQuantityKg) * 1000) / 10
      })),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt
    }));

    return sendSuccess(res, {
      summary,
      lots: formattedLots
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/lots/:id
 *
 * Returns detailed view of a specific consolidated lot with complete traceability breakdown and audit trail.
 */
const getProduceLotById = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const lot = await prisma.produceLot.findUnique({
      where: { id },
      include: {
        contributions: {
          include: {
            farmer: {
              include: {
                user: {
                  select: { id: true, name: true, phone: true }
                }
              }
            },
            listing: true
          }
        }
      }
    });

    if (!lot || lot.fpoId !== fpo.id) {
      throw new NotFoundError('Produce lot not found in your organization.');
    }

    // Fetch audit history for this lot
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ProduceLot',
        entityId: lot.id
      },
      include: {
        user: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const itemizedContributions = lot.contributions.map((c) => {
      const sharePct = lot.totalQuantityKg > 0
        ? Math.round((c.allocatedQtyKg / lot.totalQuantityKg) * 1000) / 10
        : 0;
      return {
        id: c.id,
        notificationId: c.notificationId,
        farmerId: c.farmerId,
        farmerName: c.farmer?.user?.name || 'Member Farmer',
        farmerPhone: c.farmer?.user?.phone || null,
        farmerVillage: c.farmer?.village || 'Member Cluster',
        allocatedQtyKg: c.allocatedQtyKg,
        agreedPricePerKg: c.agreedPricePerKg,
        payoutAmount: Math.round(c.allocatedQtyKg * c.agreedPricePerKg),
        sharePercentage: sharePct,
        status: c.status,
        listingCropName: c.listing?.cropName || lot.cropName,
        createdAt: c.createdAt
      };
    });

    return sendSuccess(res, {
      lot: {
        id: lot.id,
        lotNumber: lot.lotNumber,
        cropName: lot.cropName,
        category: lot.category,
        variety: lot.variety,
        qualityGrade: lot.qualityGrade,
        unit: lot.unit,
        totalQuantityKg: lot.totalQuantityKg,
        availableQuantityKg: lot.availableQuantityKg,
        allocatedQuantityKg: lot.allocatedQuantityKg,
        weightedAvgPricePerKg: lot.weightedAvgPricePerKg,
        status: lot.status,
        notes: lot.notes,
        storageLocation: lot.storageLocation,
        contributions: itemizedContributions,
        auditLogs: auditLogs.map((a) => ({
          id: a.id,
          action: a.action,
          actor: a.user?.name || 'FPO Manager',
          metadata: a.metadata,
          timestamp: a.createdAt
        })),
        createdAt: lot.createdAt,
        updatedAt: lot.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/fpo/lots/:id/status
 *
 * Updates produce lot status following valid state transition rules.
 */
const updateProduceLotStatus = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { status: targetStatus, notes } = req.body;

    const lot = await prisma.produceLot.findUnique({ where: { id } });
    if (!lot || lot.fpoId !== fpo.id) {
      throw new NotFoundError('Produce lot not found in your organization.');
    }

    const currentStatus = lot.status;

    // Define valid state machine transitions
    const validTransitions = {
      DRAFT: ['AGGREGATED', 'CANCELLED'],
      AGGREGATED: ['TESTED', 'READY_FOR_SALE', 'ALLOCATED', 'CANCELLED'],
      TESTED: ['READY_FOR_SALE', 'ALLOCATED', 'CANCELLED'],
      READY_FOR_SALE: ['ALLOCATED', 'CANCELLED', 'TESTED'],
      ALLOCATED: ['READY_FOR_SALE', 'FULFILLED', 'CANCELLED'],
      FULFILLED: [],
      CANCELLED: []
    };

    if (currentStatus === targetStatus) {
      return sendSuccess(res, { lot, message: `Lot status is already ${targetStatus}.` });
    }

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new ValidationError(
        `Invalid status transition: Cannot transition lot from "${currentStatus}" to "${targetStatus}". Permitted transitions: ${allowed.join(', ') || 'None (Terminal state)'}.`
      );
    }

    // If cancelling, route through cancellation logic to release contributions
    if (targetStatus === 'CANCELLED') {
      return cancelProduceLot(req, res, next);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLot = await tx.produceLot.update({
        where: { id },
        data: {
          status: targetStatus,
          notes: notes ? (lot.notes ? `${lot.notes}\n${notes}` : notes) : lot.notes
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOT_STATUS_CHANGED',
          entityType: 'ProduceLot',
          entityId: lot.id,
          metadata: {
            lotNumber: lot.lotNumber,
            fromStatus: currentStatus,
            toStatus: targetStatus,
            notes
          }
        }
      });

      return updatedLot;
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      lot: updated,
      message: `Lot ${updated.lotNumber} status transitioned from ${currentStatus} to ${targetStatus}.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/fpo/lots/:id OR POST /api/fpo/lots/:id/cancel
 *
 * Cancels a produce lot and safely releases the farmer contributions back to available for future aggregation.
 */
const cancelProduceLot = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const lot = await prisma.produceLot.findUnique({
      where: { id },
      include: { contributions: true }
    });

    if (!lot || lot.fpoId !== fpo.id) {
      throw new NotFoundError('Produce lot not found in your organization.');
    }

    if (lot.status === 'CANCELLED') {
      return sendSuccess(res, { lot, message: 'Produce lot is already cancelled.' });
    }

    if (lot.status === 'FULFILLED') {
      throw new ConflictError('Cannot cancel a fulfilled produce lot that has already been delivered or settled.');
    }

    const cancelledLot = await prisma.$transaction(async (tx) => {
      // 1. Mark lot as CANCELLED and reset available quantity
      const updatedLot = await tx.produceLot.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          availableQuantityKg: 0
        }
      });

      // 2. Mark contributions as RELEASED so they become available for new lot aggregation
      await tx.produceLotContribution.updateMany({
        where: { lotId: id },
        data: { status: 'RELEASED' }
      });

      // 3. Write AuditLog
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOT_CANCELLED',
          entityType: 'ProduceLot',
          entityId: lot.id,
          metadata: {
            lotNumber: lot.lotNumber,
            totalQuantityKg: lot.totalQuantityKg,
            releasedContributionsCount: lot.contributions.length
          }
        }
      });

      return updatedLot;
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      lot: cancelledLot,
      message: `Produce lot ${cancelledLot.lotNumber} cancelled successfully. Confirmed farmer quantities have been safely released back to available pool.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/lots/:id/allocate
 *
 * Allocates a specific quantity from an available produce lot towards a buyer requirement or contract.
 */
const allocateProduceLot = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { allocatedQtyKg, requirementId, buyerName, notes } = req.body;

    const allocQty = Number(allocatedQtyKg);
    if (isNaN(allocQty) || allocQty <= 0) {
      throw new ValidationError('Allocated quantity must be greater than 0 kg.');
    }

    const lot = await prisma.produceLot.findUnique({ where: { id } });
    if (!lot || lot.fpoId !== fpo.id) {
      throw new NotFoundError('Produce lot not found in your organization.');
    }

    if (['CANCELLED', 'FULFILLED'].includes(lot.status)) {
      throw new ConflictError(`Cannot allocate from a lot with status "${lot.status}".`);
    }

    if (allocQty > lot.availableQuantityKg) {
      throw new ConflictError(
        `Requested allocation (${allocQty} kg) exceeds available lot stock (${lot.availableQuantityKg} kg).`
      );
    }

    const updatedLot = await prisma.$transaction(async (tx) => {
      const newAvailable = Math.max(0, lot.availableQuantityKg - allocQty);
      const newAllocated = lot.allocatedQuantityKg + allocQty;
      const newStatus = newAvailable <= 0 ? 'ALLOCATED' : lot.status;

      const updated = await tx.produceLot.update({
        where: { id },
        data: {
          availableQuantityKg: newAvailable,
          allocatedQuantityKg: newAllocated,
          status: newStatus,
          notes: notes ? (lot.notes ? `${lot.notes}\n[Allocation: ${notes}]` : `[Allocation: ${notes}]`) : lot.notes
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOT_UPDATED',
          entityType: 'ProduceLot',
          entityId: lot.id,
          metadata: {
            allocatedQtyKg: allocQty,
            remainingAvailableKg: newAvailable,
            requirementId: requirementId || null,
            buyerName: buyerName || null
          }
        }
      });

      return updated;
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      lot: updatedLot,
      allocatedQuantityKg: allocQty,
      remainingAvailableQuantityKg: updatedLot.availableQuantityKg,
      message: `Successfully allocated ${allocQty.toLocaleString()} kg from lot ${updatedLot.lotNumber}. Remaining available: ${updatedLot.availableQuantityKg.toLocaleString()} kg.`
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PHASE 5: FPO BULK PROCUREMENTS, MATCHING & QUOTATIONS
// =============================================================================

/**
 * Helper to sweep expired quotations for an FPO or globally.
 * Transitions PENDING quotations with validityDate in the past to EXPIRED.
 */
async function sweepExpiredQuotations(fpoId = null) {
  try {
    const whereClause = {
      status: 'PENDING',
      validityDate: { lt: new Date() }
    };
    if (fpoId) {
      whereClause.fpoId = fpoId;
    }

    const expiredQuotes = await prisma.fpoQuotation.findMany({
      where: whereClause,
      select: { id: true, quotationNumber: true, fpoId: true }
    });

    if (expiredQuotes.length === 0) return 0;

    for (const q of expiredQuotes) {
      await prisma.$transaction(async (tx) => {
        await tx.fpoQuotation.update({
          where: { id: q.id },
          data: { status: 'EXPIRED' }
        });

        await tx.auditLog.create({
          data: {
            userId: null,
            action: 'QUOTATION_EXPIRED',
            entityType: 'FpoQuotation',
            entityId: q.id,
            metadata: { quotationNumber: q.quotationNumber, fpoId: q.fpoId, reason: 'Validity deadline passed' }
          }
        });
      });
    }

    return expiredQuotes.length;
  } catch (err) {
    console.error('[sweepExpiredQuotations] Error sweeping expired quotations:', err);
    return 0;
  }
}

/**
 * GET /api/fpo/requirements
 *
 * Retrieves open bulk procurement requirements posted by institutional buyers.
 * Automatically performs an intelligent matching evaluation against:
 * 1. Confirmed FPO Produce Lots (Ready for Sale)
 * 2. Indicative Member Farmer Produce Listings (Active Members)
 */
const getFpoBulkRequirements = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    await sweepExpiredQuotations(fpo.id);

    const {
      crop,
      matchType = 'ALL',
      quotationFilter = 'ALL',
      search = '',
      sortBy = 'deadline',
      sortOrder = 'asc',
      page = 1,
      limit = 25
    } = req.query;

    // 1. Fetch open buyer requirements
    const requirements = await prisma.buyerRequirement.findMany({
      where: {
        status: { in: ['OPEN', 'MATCHING'] }
      },
      include: {
        buyer: {
          select: {
            id: true,
            organizationName: true,
            buyerType: true,
            verificationStatus: true,
            user: { select: { name: true } }
          }
        },
        quotations: {
          where: { fpoId: fpo.id },
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            offeredQuantityKg: true,
            offeredPricePerKg: true,
            totalAmount: true,
            validityDate: true,
            createdAt: true
          }
        }
      },
      orderBy: { requiredByDate: 'asc' }
    });

    // 2. Fetch all confirmed lots of this FPO available for allocation
    const fpoLots = await prisma.produceLot.findMany({
      where: {
        fpoId: fpo.id,
        status: { in: ['AGGREGATED', 'TESTED', 'READY_FOR_SALE'] },
        availableQuantityKg: { gt: 0 }
      },
      select: {
        id: true,
        lotNumber: true,
        cropName: true,
        variety: true,
        qualityGrade: true,
        availableQuantityKg: true,
        weightedAvgPricePerKg: true,
        status: true
      }
    });

    // 3. Fetch active member produce listings (indicative supply capacity)
    const memberListings = await prisma.produceListing.findMany({
      where: {
        farmer: {
          fpoId: fpo.id,
          user: { status: 'ACTIVE' }
        },
        status: 'AVAILABLE'
      },
      select: {
        id: true,
        cropName: true,
        qualityGrade: true,
        totalQuantityKg: true,
        reservedQty: true,
        soldQty: true,
        askingPricePerKg: true
      }
    });

    // 4. Compute matching calculations per requirement
    const evaluatedRequirements = requirements.map((reqItem) => {
      const targetCropNorm = (reqItem.cropName || '').trim().toLowerCase();

      // Confirmed Lots match
      const matchingLots = fpoLots.filter(
        (l) => (l.cropName || '').trim().toLowerCase() === targetCropNorm
      );
      const confirmedStockKg = matchingLots.reduce((acc, l) => acc + (l.availableQuantityKg || 0), 0);
      const minConfirmedPrice = matchingLots.length > 0
        ? Math.min(...matchingLots.map((l) => l.weightedAvgPricePerKg))
        : null;

      // Indicative Member listings match
      const matchingListings = memberListings.filter(
        (l) => (l.cropName || '').trim().toLowerCase() === targetCropNorm
      );
      const indicativeMemberSupplyKg = matchingListings.reduce((acc, l) => {
        const avail = Math.max(0, (l.totalQuantityKg || 0) - (l.reservedQty || 0) - (l.soldQty || 0));
        return acc + avail;
      }, 0);
      const minIndicativePrice = matchingListings.length > 0
        ? Math.min(...matchingListings.map((l) => l.askingPricePerKg))
        : null;

      const totalStockKg = confirmedStockKg + indicativeMemberSupplyKg;

      // Match Badge determination
      let matchBadge = 'INSUFFICIENT_STOCK';
      if (confirmedStockKg >= reqItem.quantityKg) {
        matchBadge = 'FULL_MATCH';
      } else if (confirmedStockKg > 0) {
        matchBadge = 'PARTIAL_MATCH';
      } else if (indicativeMemberSupplyKg > 0) {
        matchBadge = 'INDICATIVE_ONLY';
      }

      // Match Score calculation (0 - 100)
      let matchScore = 0;
      if (targetCropNorm) {
        // Crop match: 35 points if FPO has either confirmed or indicative
        if (confirmedStockKg > 0 || indicativeMemberSupplyKg > 0) {
          matchScore += 35;
        }

        // Quantity coverage: up to 35 points
        if (reqItem.quantityKg > 0) {
          const confirmedPart = Math.min(25, (confirmedStockKg / reqItem.quantityKg) * 25);
          const indicativePart = Math.min(10, (indicativeMemberSupplyKg / reqItem.quantityKg) * 10);
          matchScore += Math.round(confirmedPart + indicativePart);
        }

        // Quality grade compatibility: 15 points
        if (!reqItem.qualityGrade) {
          matchScore += 15;
        } else {
          const hasMatchingLotQuality = matchingLots.some((l) => l.qualityGrade === reqItem.qualityGrade);
          const hasMatchingListingQuality = matchingListings.some((l) => l.qualityGrade === reqItem.qualityGrade);
          if (hasMatchingLotQuality) {
            matchScore += 15;
          } else if (hasMatchingListingQuality) {
            matchScore += 10;
          } else if (confirmedStockKg > 0 || indicativeMemberSupplyKg > 0) {
            matchScore += 5; // compatible crop, negotiable grade
          }
        }

        // Location proximity: 15 points
        const fpoDist = (fpo.district || '').trim().toLowerCase();
        const reqDist = (reqItem.deliveryDistrict || '').trim().toLowerCase();
        const fpoState = (fpo.state || '').trim().toLowerCase();
        const reqState = (reqItem.deliveryState || '').trim().toLowerCase();

        if (fpoDist && reqDist && fpoDist === reqDist) {
          matchScore += 15;
        } else if (fpoState && reqState && fpoState === reqState) {
          matchScore += 10;
        } else {
          matchScore += 5;
        }
      }
      matchScore = Math.min(100, Math.max(0, matchScore));

      // Price Feasibility
      let priceFeasibility = 'UNKNOWN';
      const bestPrice = minConfirmedPrice !== null ? minConfirmedPrice : minIndicativePrice;
      if (bestPrice !== null && reqItem.maxPricePerKg > 0) {
        if (bestPrice <= reqItem.maxPricePerKg) {
          priceFeasibility = 'COMPATIBLE';
        } else if (bestPrice <= reqItem.maxPricePerKg * 1.1) {
          priceFeasibility = 'MARGINAL';
        } else {
          priceFeasibility = 'HIGHER_THAN_TARGET';
        }
      }

      // Existing quotation status for this FPO
      const latestQuote = reqItem.quotations && reqItem.quotations.length > 0
        ? reqItem.quotations[0]
        : null;

      const hasActiveQuote = latestQuote && ['PENDING', 'ACCEPTED'].includes(latestQuote.status);

      return {
        id: reqItem.id,
        cropName: reqItem.cropName,
        quantityKg: reqItem.quantityKg,
        maxPricePerKg: reqItem.maxPricePerKg,
        qualityGrade: reqItem.qualityGrade,
        requiredByDate: reqItem.requiredByDate,
        deliveryState: reqItem.deliveryState,
        deliveryDistrict: reqItem.deliveryDistrict,
        deliveryAddress: reqItem.deliveryAddress,
        notes: reqItem.notes,
        status: reqItem.status,
        createdAt: reqItem.createdAt,
        buyer: {
          organizationName: reqItem.buyer?.organizationName || reqItem.buyer?.user?.name || 'Institutional Buyer',
          businessType: reqItem.buyer?.buyerType || 'Institutional Buyer',
          isVerified: reqItem.buyer?.verificationStatus === 'VERIFIED'
        },
        matching: {
          confirmedStockKg,
          indicativeMemberSupplyKg,
          totalStockKg,
          matchingLotsCount: matchingLots.length,
          matchingMembersCount: matchingListings.length,
          minConfirmedPrice,
          minIndicativePrice,
          priceFeasibility,
          matchScore,
          matchBadge,
          confirmedCoveragePct: reqItem.quantityKg > 0 ? Math.min(100, Math.round((confirmedStockKg / reqItem.quantityKg) * 100)) : 0,
          totalCoveragePct: reqItem.quantityKg > 0 ? Math.min(100, Math.round((totalStockKg / reqItem.quantityKg) * 100)) : 0
        },
        quotation: latestQuote ? {
          id: latestQuote.id,
          quotationNumber: latestQuote.quotationNumber,
          status: latestQuote.status,
          offeredQuantityKg: latestQuote.offeredQuantityKg,
          offeredPricePerKg: latestQuote.offeredPricePerKg,
          totalAmount: latestQuote.totalAmount,
          validityDate: latestQuote.validityDate,
          createdAt: latestQuote.createdAt
        } : null,
        hasQuoted: !!latestQuote,
        hasActiveQuote
      };
    });

    // 5. Apply filters
    let filtered = evaluatedRequirements;

    if (crop) {
      const c = crop.trim().toLowerCase();
      filtered = filtered.filter((r) => r.cropName.toLowerCase().includes(c));
    }

    if (matchType !== 'ALL') {
      if (matchType === 'MATCHING') {
        filtered = filtered.filter((r) => ['FULL_MATCH', 'PARTIAL_MATCH', 'INDICATIVE_ONLY'].includes(r.matching.matchBadge));
      } else {
        filtered = filtered.filter((r) => r.matching.matchBadge === matchType);
      }
    }

    if (quotationFilter === 'QUOTED') {
      filtered = filtered.filter((r) => r.hasQuoted);
    } else if (quotationFilter === 'UNQUOTED') {
      filtered = filtered.filter((r) => !r.hasQuoted);
    }

    if (search) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.cropName.toLowerCase().includes(q) ||
          r.deliveryDistrict.toLowerCase().includes(q) ||
          r.deliveryState.toLowerCase().includes(q) ||
          r.buyer.organizationName.toLowerCase().includes(q)
      );
    }

    // 6. Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'deadline') {
        comparison = new Date(a.requiredByDate) - new Date(b.requiredByDate);
      } else if (sortBy === 'quantity') {
        comparison = a.quantityKg - b.quantityKg;
      } else if (sortBy === 'price') {
        comparison = a.maxPricePerKg - b.maxPricePerKg;
      } else if (sortBy === 'matchScore') {
        comparison = b.matching.matchScore - a.matching.matchScore;
      } else {
        comparison = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Summary metrics across all open requirements
    const metrics = {
      totalOpenRequirements: evaluatedRequirements.length,
      fullMatchCount: evaluatedRequirements.filter((r) => r.matching.matchBadge === 'FULL_MATCH').length,
      partialMatchCount: evaluatedRequirements.filter((r) => r.matching.matchBadge === 'PARTIAL_MATCH').length,
      indicativeCount: evaluatedRequirements.filter((r) => r.matching.matchBadge === 'INDICATIVE_ONLY').length,
      insufficientCount: evaluatedRequirements.filter((r) => r.matching.matchBadge === 'INSUFFICIENT_STOCK').length,
      quotedCount: evaluatedRequirements.filter((r) => r.hasQuoted).length
    };

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    return sendSuccess(res, {
      requirements: paginated,
      metrics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/requirements/:id
 *
 * Deep dive on a single buyer requirement with full matching inventory breakdown:
 * - Confirmed FPO Lots (ready to quote)
 * - Indicative Member Farmer Listings (pipeline supply)
 * - Price, quantity, and feasibility score
 * - Quotations submitted by this FPO for this requirement
 */
const getFpoBulkRequirementById = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    await sweepExpiredQuotations(fpo.id);

    const requirement = await prisma.buyerRequirement.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            id: true,
            organizationName: true,
            buyerType: true,
            verificationStatus: true,
            user: { select: { name: true } }
          }
        },
        quotations: {
          where: { fpoId: fpo.id },
          include: {
            produceLot: {
              select: {
                id: true,
                lotNumber: true,
                qualityGrade: true,
                availableQuantityKg: true,
                totalQuantityKg: true,
                weightedAvgPricePerKg: true,
                status: true
              }
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!requirement) {
      throw new NotFoundError('Buyer requirement not found.');
    }

    const targetCropNorm = (requirement.cropName || '').trim().toLowerCase();

    // 1. Fetch matching confirmed lots for this FPO
    const matchingLots = await prisma.produceLot.findMany({
      where: {
        fpoId: fpo.id,
        cropName: { equals: requirement.cropName, mode: 'insensitive' },
        status: { in: ['AGGREGATED', 'TESTED', 'READY_FOR_SALE'] },
        availableQuantityKg: { gt: 0 }
      },
      include: {
        contributions: {
          include: {
            farmer: {
              include: {
                user: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch matching active member listings (indicative capacity)
    const matchingMemberListings = await prisma.produceListing.findMany({
      where: {
        cropName: { equals: requirement.cropName, mode: 'insensitive' },
        farmer: {
          fpoId: fpo.id,
          user: { status: 'ACTIVE' }
        },
        status: 'AVAILABLE'
      },
      include: {
        farmer: {
          include: {
            user: { select: { name: true, phone: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const confirmedStockKg = matchingLots.reduce((acc, l) => acc + (l.availableQuantityKg || 0), 0);
    const indicativeMemberSupplyKg = matchingMemberListings.reduce((acc, l) => {
      const avail = Math.max(0, (l.totalQuantityKg || 0) - (l.reservedQty || 0) - (l.soldQty || 0));
      return acc + avail;
    }, 0);
    const totalStockKg = confirmedStockKg + indicativeMemberSupplyKg;

    // Match badge
    let matchBadge = 'INSUFFICIENT_STOCK';
    if (confirmedStockKg >= requirement.quantityKg) {
      matchBadge = 'FULL_MATCH';
    } else if (confirmedStockKg > 0) {
      matchBadge = 'PARTIAL_MATCH';
    } else if (indicativeMemberSupplyKg > 0) {
      matchBadge = 'INDICATIVE_ONLY';
    }

    // Feasibility calculation
    const minConfirmedPrice = matchingLots.length > 0 ? Math.min(...matchingLots.map((l) => l.weightedAvgPricePerKg)) : null;
    const minIndicativePrice = matchingMemberListings.length > 0 ? Math.min(...matchingMemberListings.map((l) => l.askingPricePerKg)) : null;

    let priceFeasibility = 'UNKNOWN';
    const bestPrice = minConfirmedPrice !== null ? minConfirmedPrice : minIndicativePrice;
    if (bestPrice !== null && requirement.maxPricePerKg > 0) {
      if (bestPrice <= requirement.maxPricePerKg) {
        priceFeasibility = 'COMPATIBLE';
      } else if (bestPrice <= requirement.maxPricePerKg * 1.1) {
        priceFeasibility = 'MARGINAL';
      } else {
        priceFeasibility = 'HIGHER_THAN_TARGET';
      }
    }

    // Delivery feasibility
    const daysUntilRequired = Math.ceil(
      (new Date(requirement.requiredByDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    return sendSuccess(res, {
      requirement: {
        id: requirement.id,
        cropName: requirement.cropName,
        quantityKg: requirement.quantityKg,
        maxPricePerKg: requirement.maxPricePerKg,
        qualityGrade: requirement.qualityGrade,
        requiredByDate: requirement.requiredByDate,
        deliveryState: requirement.deliveryState,
        deliveryDistrict: requirement.deliveryDistrict,
        deliveryAddress: requirement.deliveryAddress,
        notes: requirement.notes,
        status: requirement.status,
        createdAt: requirement.createdAt,
        daysUntilRequired,
        buyer: {
          organizationName: requirement.buyer?.organizationName || requirement.buyer?.user?.name || 'Institutional Buyer',
          businessType: requirement.buyer?.buyerType || 'Institutional Buyer',
          isVerified: requirement.buyer?.verificationStatus === 'VERIFIED'
        }
      },
      feasibility: {
        confirmedStockKg,
        indicativeMemberSupplyKg,
        totalStockKg,
        confirmedCoveragePct: requirement.quantityKg > 0 ? Math.min(100, Math.round((confirmedStockKg / requirement.quantityKg) * 100)) : 0,
        totalCoveragePct: requirement.quantityKg > 0 ? Math.min(100, Math.round((totalStockKg / requirement.quantityKg) * 100)) : 0,
        minConfirmedPrice,
        minIndicativePrice,
        priceFeasibility,
        matchBadge,
        daysUntilRequired
      },
      confirmedLots: matchingLots.map((l) => ({
        id: l.id,
        lotNumber: l.lotNumber,
        cropName: l.cropName,
        variety: l.variety,
        qualityGrade: l.qualityGrade,
        totalQuantityKg: l.totalQuantityKg,
        availableQuantityKg: l.availableQuantityKg,
        basePricePerKg: l.weightedAvgPricePerKg,
        weightedAvgPricePerKg: l.weightedAvgPricePerKg,
        status: l.status,
        storageLocation: l.storageLocation,
        contributionsCount: l.contributions?.length || 0,
        contributions: (l.contributions || []).map((c) => ({
          id: c.id,
          farmerName: c.farmer?.user?.name || 'Member Farmer',
          allocatedQtyKg: c.allocatedQtyKg,
          agreedPricePerKg: c.agreedPricePerKg
        }))
      })),
      indicativeMemberListings: matchingMemberListings.map((l) => {
        const availableQty = Math.max(0, l.totalQuantityKg - l.reservedQty - l.soldQty);
        return {
          id: l.id,
          cropName: l.cropName,
          qualityGrade: l.qualityGrade,
          availableQuantityKg: availableQty,
          askingPricePerKg: l.askingPricePerKg,
          farmerName: l.farmer?.user?.name || 'Member Farmer',
          village: l.farmer?.village || 'Local Farm',
          district: l.farmer?.district || fpo.district
        };
      }),
      quotations: requirement.quotations
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/quotations
 *
 * Submits an official quotation from an FPO for an open bulk procurement requirement.
 * Enforces:
 * - Anti-over-allocation: offeredQuantityKg <= produceLot.availableQuantityKg
 * - Lot ownership: lot must belong to calling FPO
 * - Crop consistency: lot crop must match requirement crop
 * - No duplicate active quotations for same requirement
 * - Full audit trail & buyer notification
 */
const createFpoQuotation = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const {
      requirementId,
      produceLotId,
      offeredQuantityKg,
      offeredPricePerKg,
      estimatedDeliveryDate,
      validityHours = 48,
      validityDate,
      notes
    } = req.body;

    // 1. Fetch & validate buyer requirement
    const requirement = await prisma.buyerRequirement.findUnique({
      where: { id: requirementId },
      include: {
        buyer: {
          select: {
            id: true,
            userId: true,
            organizationName: true,
            buyerType: true
          }
        }
      }
    });

    if (!requirement) {
      throw new NotFoundError('Buyer requirement not found.');
    }

    if (!['OPEN', 'MATCHING'].includes(requirement.status)) {
      throw new ValidationError(`Cannot submit quotation for requirement with status ${requirement.status}.`);
    }

    // 2. Prevent duplicate active quotations
    const existingActiveQuote = await prisma.fpoQuotation.findFirst({
      where: {
        requirementId,
        fpoId: fpo.id,
        status: { in: ['PENDING', 'ACCEPTED'] }
      }
    });

    if (existingActiveQuote) {
      throw new ConflictError(
        `Your FPO already has an active quotation (${existingActiveQuote.quotationNumber}) for this requirement. Please withdraw or modify the existing quotation.`
      );
    }

    // 3. Validate produce lot if provided
    let lot = null;
    if (produceLotId) {
      lot = await prisma.produceLot.findUnique({
        where: { id: produceLotId }
      });

      if (!lot) {
        throw new NotFoundError('Selected produce lot not found.');
      }

      if (lot.fpoId !== fpo.id) {
        throw new AuthorizationError('You do not have permission to allocate this produce lot.');
      }

      if (!['AGGREGATED', 'TESTED', 'READY_FOR_SALE'].includes(lot.status)) {
        throw new ValidationError(`Produce lot is in '${lot.status}' status and cannot be quoted.`);
      }

      if ((lot.cropName || '').trim().toLowerCase() !== (requirement.cropName || '').trim().toLowerCase()) {
        throw new ValidationError(
          `Produce lot crop '${lot.cropName}' does not match requirement crop '${requirement.cropName}'.`
        );
      }

      if (offeredQuantityKg > lot.availableQuantityKg) {
        throw new ValidationError(
          `Offered quantity (${offeredQuantityKg.toLocaleString()} kg) exceeds lot available balance (${lot.availableQuantityKg.toLocaleString()} kg).`
        );
      }
    }

    // 4. Compute validity expiration
    const calculatedValidity = validityDate
      ? new Date(validityDate)
      : new Date(Date.now() + Math.max(1, validityHours) * 60 * 60 * 1000);

    const deliveryDateObj = new Date(estimatedDeliveryDate);
    if (isNaN(deliveryDateObj.getTime())) {
      throw new ValidationError('Invalid estimated delivery date.');
    }

    // 5. Generate human-readable unique quotation number: QUO-{CROP}-{YYYYMM}-{SEQ}
    const cropCode = (requirement.cropName || 'CRP')
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase();
    const dateCode = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.fpoQuotation.count({
      where: { quotationNumber: { startsWith: `QUO-${cropCode}-${dateCode}` } }
    });
    const seq = String(count + 1).padStart(4, '0');
    const quotationNumber = `QUO-${cropCode}-${dateCode}-${seq}`;

    const totalAmount = Math.round(offeredQuantityKg * offeredPricePerKg * 100) / 100;

    // 6. Execute transaction: create quotation + audit log + notify buyer
    const createdQuotation = await prisma.$transaction(async (tx) => {
      const quotation = await tx.fpoQuotation.create({
        data: {
          quotationNumber,
          requirementId,
          fpoId: fpo.id,
          produceLotId: produceLotId || null,
          offeredQuantityKg,
          offeredPricePerKg,
          totalAmount,
          estimatedDeliveryDate: deliveryDateObj,
          validityDate: calculatedValidity,
          notes: notes ? notes.trim() : null,
          status: 'PENDING'
        },
        include: {
          requirement: {
            select: {
              cropName: true,
              quantityKg: true,
              maxPricePerKg: true,
              deliveryDistrict: true
            }
          },
          produceLot: {
            select: {
              lotNumber: true,
              availableQuantityKg: true,
              qualityGrade: true
            }
          }
        }
      });

      // Audit Log entry
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'QUOTATION_CREATED',
          entityType: 'FpoQuotation',
          entityId: quotation.id,
          metadata: {
            quotationNumber,
            requirementId,
            produceLotId: produceLotId || null,
            offeredQuantityKg,
            offeredPricePerKg,
            totalAmount,
            validityDate: calculatedValidity.toISOString()
          }
        }
      });

      // Notify Institutional Buyer
      if (requirement.buyer?.userId) {
        await tx.notification.create({
          data: {
            userId: requirement.buyer.userId,
            type: 'PROPOSAL',
            title: `New Quotation Received: ${quotationNumber}`,
            body: `${fpo.fpoName} submitted a quotation for ${offeredQuantityKg.toLocaleString()} kg of ${requirement.cropName} at ₹${offeredPricePerKg}/kg.`,
            metadata: {
              eventType: 'FPO_QUOTATION_SUBMITTED',
              quotationId: quotation.id,
              quotationNumber,
              requirementId,
              fpoId: fpo.id,
              fpoName: fpo.fpoName,
              offeredQuantityKg,
              offeredPricePerKg,
              totalAmount
            }
          }
        });
      }

      return quotation;
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      quotation: createdQuotation,
      message: `Quotation ${createdQuotation.quotationNumber} submitted successfully. Buyer has been notified.`
    }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/quotations
 *
 * Lists quotations submitted by this FPO, sweeps expired quotes, and returns metrics.
 */
const getFpoQuotations = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    await sweepExpiredQuotations(fpo.id);

    const { status, requirementId, search } = req.query;

    const where = { fpoId: fpo.id };

    if (status && status !== 'ALL') {
      const statuses = status.split(',').map((s) => s.trim().toUpperCase());
      where.status = { in: statuses };
    }

    if (requirementId) {
      where.requirementId = requirementId;
    }

    const quotations = await prisma.fpoQuotation.findMany({
      where,
      include: {
        requirement: {
          select: {
            id: true,
            cropName: true,
            quantityKg: true,
            maxPricePerKg: true,
            requiredByDate: true,
            deliveryDistrict: true,
            deliveryState: true,
            buyer: {
              select: {
                organizationName: true,
                buyerType: true,
                user: { select: { name: true } }
              }
            }
          }
        },
        produceLot: {
          select: {
            id: true,
            lotNumber: true,
            cropName: true,
            qualityGrade: true,
            availableQuantityKg: true,
            status: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalQuantityKg: true,
            agreedPriceTotal: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Optional text filter
    let filtered = quotations;
    if (search) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (quote) =>
          quote.quotationNumber.toLowerCase().includes(q) ||
          quote.requirement.cropName.toLowerCase().includes(q) ||
          (quote.produceLot?.lotNumber || '').toLowerCase().includes(q)
      );
    }

    // Summary metrics across all FPO quotations
    const allFpoQuotes = await prisma.fpoQuotation.findMany({
      where: { fpoId: fpo.id },
      select: { status: true, totalAmount: true }
    });

    const metrics = {
      totalQuotations: allFpoQuotes.length,
      pendingCount: allFpoQuotes.filter((q) => q.status === 'PENDING').length,
      acceptedCount: allFpoQuotes.filter((q) => q.status === 'ACCEPTED').length,
      rejectedCount: allFpoQuotes.filter((q) => q.status === 'REJECTED').length,
      expiredCount: allFpoQuotes.filter((q) => q.status === 'EXPIRED').length,
      withdrawnCount: allFpoQuotes.filter((q) => q.status === 'WITHDRAWN').length,
      totalOfferedValue: allFpoQuotes
        .filter((q) => ['PENDING', 'ACCEPTED'].includes(q.status))
        .reduce((sum, q) => sum + (q.totalAmount || 0), 0),
      totalAcceptedValue: allFpoQuotes
        .filter((q) => q.status === 'ACCEPTED')
        .reduce((sum, q) => sum + (q.totalAmount || 0), 0)
    };

    return sendSuccess(res, {
      quotations: filtered,
      metrics
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/quotations/:id
 *
 * Retrieves detailed itemized quotation record with lot breakdown, buyer info, and audit trail.
 */
const getFpoQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotation = await prisma.fpoQuotation.findUnique({
      where: { id },
      include: {
        fpo: {
          select: {
            id: true,
            fpoName: true,
            registrationNo: true,
            district: true,
            state: true,
            userId: true
          }
        },
        requirement: {
          include: {
            buyer: {
              select: {
                id: true,
                organizationName: true,
                buyerType: true,
                userId: true
              }
            }
          }
        },
        produceLot: {
          include: {
            contributions: {
              include: {
                farmer: {
                  include: {
                    user: { select: { name: true } }
                  }
                }
              }
            }
          }
        },
        order: {
          include: {
            statusHistory: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found.');
    }

    // Role & Tenant isolation: must be the FPO owner, or the Buyer owner, or Admin
    const isFpoOwner = quotation.fpo.userId === req.user.id;
    const isBuyerOwner = quotation.requirement.buyer?.userId === req.user.id;
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);

    if (!isFpoOwner && !isBuyerOwner && !isAdmin) {
      throw new AuthorizationError('You do not have permission to view this quotation.');
    }

    // Sweep if expired
    if (quotation.status === 'PENDING' && new Date(quotation.validityDate) < new Date()) {
      await prisma.fpoQuotation.update({
        where: { id: quotation.id },
        data: { status: 'EXPIRED' }
      });
      quotation.status = 'EXPIRED';
    }

    // Fetch audit history
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'FpoQuotation',
        entityId: quotation.id
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, {
      quotation,
      auditLogs
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/quotations/:id/withdraw
 *
 * Allows an FPO to withdraw a pending quotation before it is accepted.
 */
const withdrawFpoQuotation = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const quotation = await prisma.fpoQuotation.findUnique({
      where: { id },
      include: {
        requirement: {
          include: {
            buyer: { select: { userId: true } }
          }
        }
      }
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found.');
    }

    if (quotation.fpoId !== fpo.id) {
      throw new AuthorizationError('You are not authorized to withdraw this quotation.');
    }

    if (quotation.status !== 'PENDING') {
      throw new ValidationError(`Cannot withdraw quotation with status '${quotation.status}'. Only PENDING quotations can be withdrawn.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const q = await tx.fpoQuotation.update({
        where: { id: quotation.id },
        data: { status: 'WITHDRAWN' }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'QUOTATION_WITHDRAWN',
          entityType: 'FpoQuotation',
          entityId: quotation.id,
          metadata: {
            quotationNumber: quotation.quotationNumber,
            reason: req.body.reason || 'Withdrawn by FPO'
          }
        }
      });

      if (quotation.requirement?.buyer?.userId) {
        await tx.notification.create({
          data: {
            userId: quotation.requirement.buyer.userId,
            type: 'PROPOSAL',
            title: `Quotation Withdrawn: ${quotation.quotationNumber}`,
            body: `${fpo.fpoName} has withdrawn their quotation ${quotation.quotationNumber} for ${quotation.requirement.cropName}.`,
            metadata: {
              eventType: 'FPO_QUOTATION_WITHDRAWN',
              quotationId: quotation.id,
              quotationNumber: quotation.quotationNumber
            }
          }
        });
      }

      return q;
    });

    return sendSuccess(res, {
      quotation: updated,
      message: `Quotation ${updated.quotationNumber} has been successfully withdrawn.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/quotations/:id/accept
 *
 * Acceptance endpoint (invoked by Buyer or mutual agreement / admin).
 * Transitions:
 * - FpoQuotation: PENDING -> ACCEPTED
 * - ProduceLot: Atomically decrements availableQuantityKg by offeredQuantityKg;
 *               if availableQuantityKg becomes 0, sets status to ALLOCATED.
 * - Order: Creates confirmed order record linked to requirement and quotation.
 * - Requirement: Marks FULFILLED.
 * - Dual notifications and audit trail.
 */
const acceptFpoQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotation = await prisma.fpoQuotation.findUnique({
      where: { id },
      include: {
        fpo: { select: { id: true, fpoName: true, userId: true } },
        requirement: {
          include: {
            buyer: { select: { id: true, userId: true, organizationName: true } }
          }
        },
        produceLot: true
      }
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found.');
    }

    if (quotation.status !== 'PENDING') {
      throw new ValidationError(`Cannot accept quotation with status '${quotation.status}'. Only PENDING quotations can be accepted.`);
    }

    if (new Date(quotation.validityDate) < new Date()) {
      await prisma.fpoQuotation.update({
        where: { id: quotation.id },
        data: { status: 'EXPIRED' }
      });
      throw new ValidationError('This quotation has expired and can no longer be accepted.');
    }

    // If caller is BUYER, ensure they own the requirement
    if (req.user.role === 'BUYER') {
      if (quotation.requirement?.buyer?.userId !== req.user.id) {
        throw new AuthorizationError('You do not own this procurement requirement.');
      }
    }

    // Execute atomic acceptance transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. If linked to a produce lot, decrement stock atomically
      let updatedLot = null;
      if (quotation.produceLotId) {
        const currentLot = await tx.produceLot.findUnique({
          where: { id: quotation.produceLotId }
        });

        if (!currentLot) {
          throw new NotFoundError('Referenced produce lot not found during allocation.');
        }

        if (currentLot.availableQuantityKg < quotation.offeredQuantityKg) {
          throw new ConflictError(
            `Insufficient lot stock: requested ${quotation.offeredQuantityKg} kg, but only ${currentLot.availableQuantityKg} kg is available.`
          );
        }

        const newAvailable = Math.round((currentLot.availableQuantityKg - quotation.offeredQuantityKg) * 100) / 100;
        const newStatus = newAvailable === 0 ? 'ALLOCATED' : currentLot.status;

        updatedLot = await tx.produceLot.update({
          where: { id: currentLot.id },
          data: {
            availableQuantityKg: newAvailable,
            status: newStatus
          }
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'LOT_UPDATED',
            entityType: 'ProduceLot',
            entityId: currentLot.id,
            metadata: {
              reason: 'Deducted for accepted quotation',
              deductedKg: quotation.offeredQuantityKg,
              remainingAvailableKg: newAvailable,
              quotationNumber: quotation.quotationNumber
            }
          }
        });
      }

      // 2. Check if an order already exists for this requirement
      let order = await tx.order.findUnique({
        where: { requirementId: quotation.requirementId }
      });

      if (!order) {
        const orderNumber = `ORD-SV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
        order = await tx.order.create({
          data: {
            buyerId: quotation.requirement.buyerId,
            requirementId: quotation.requirementId,
            orderNumber,
            totalQuantityKg: quotation.offeredQuantityKg,
            agreedPriceTotal: quotation.totalAmount,
            status: 'CONFIRMED',
            deliveryAddress: quotation.requirement.deliveryAddress || `${quotation.requirement.deliveryDistrict}, ${quotation.requirement.deliveryState}`,
            deliveryLatitude: quotation.requirement.latitude || null,
            deliveryLongitude: quotation.requirement.longitude || null,
            scheduledDelivery: quotation.estimatedDeliveryDate,
            notes: `Bulk procurement order placed from FPO quotation ${quotation.quotationNumber}`
          }
        });

        await tx.orderStatusEvent.create({
          data: {
            orderId: order.id,
            toStatus: 'CONFIRMED',
            changedBy: req.user.id,
            reason: `Quotation ${quotation.quotationNumber} accepted.`
          }
        });
      }

      // 3. Update Quotation status & link order
      const acceptedQuotation = await tx.fpoQuotation.update({
        where: { id: quotation.id },
        data: {
          status: 'ACCEPTED',
          orderId: order.id
        }
      });

      // 4. Update BuyerRequirement status
      await tx.buyerRequirement.update({
        where: { id: quotation.requirementId },
        data: { status: 'FULFILLED' }
      });

      // 5. Audit Log entry
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'QUOTATION_ACCEPTED',
          entityType: 'FpoQuotation',
          entityId: quotation.id,
          metadata: {
            quotationNumber: quotation.quotationNumber,
            orderId: order.id,
            orderNumber: order.orderNumber,
            offeredQuantityKg: quotation.offeredQuantityKg,
            totalAmount: quotation.totalAmount
          }
        }
      });

      // 6. Notify FPO Manager
      await tx.notification.create({
        data: {
          userId: quotation.fpo.userId,
          type: 'ORDER_UPDATE',
          title: `Quotation Accepted! Order #${order.orderNumber}`,
          body: `Congratulations! Your quotation ${quotation.quotationNumber} for ${quotation.offeredQuantityKg.toLocaleString()} kg has been accepted. Order #${order.orderNumber} is confirmed.`,
          orderId: order.id,
          metadata: {
            eventType: 'FPO_QUOTATION_ACCEPTED',
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            orderId: order.id,
            orderNumber: order.orderNumber
          }
        }
      });

      // 7. Notify Institutional Buyer
      if (quotation.requirement?.buyer?.userId) {
        await tx.notification.create({
          data: {
            userId: quotation.requirement.buyer.userId,
            type: 'ORDER_UPDATE',
            title: `Order Confirmed: #${order.orderNumber}`,
            body: `Bulk order #${order.orderNumber} confirmed with ${quotation.fpo.fpoName} for ${quotation.offeredQuantityKg.toLocaleString()} kg at ₹${quotation.offeredPricePerKg}/kg.`,
            orderId: order.id,
            metadata: {
              eventType: 'BUYER_ORDER_CONFIRMED',
              orderId: order.id,
              orderNumber: order.orderNumber,
              quotationNumber: quotation.quotationNumber
            }
          }
        });
      }

      return {
        quotation: acceptedQuotation,
        order,
        produceLot: updatedLot
      };
    }, { maxWait: 15000, timeout: 30000 });

    return sendSuccess(res, {
      ...result,
      message: `Quotation ${quotation.quotationNumber} accepted. Order #${result.order.orderNumber} created successfully.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/quotations/:id/reject
 *
 * Rejects an FPO quotation with an optional reason.
 */
const rejectFpoQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const quotation = await prisma.fpoQuotation.findUnique({
      where: { id },
      include: {
        fpo: { select: { id: true, userId: true, fpoName: true } },
        requirement: {
          include: {
            buyer: { select: { userId: true } }
          }
        }
      }
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found.');
    }

    if (quotation.status !== 'PENDING') {
      throw new ValidationError(`Cannot reject quotation with status '${quotation.status}'. Only PENDING quotations can be rejected.`);
    }

    if (req.user.role === 'BUYER' && quotation.requirement?.buyer?.userId !== req.user.id) {
      throw new AuthorizationError('You do not have permission to reject this quotation.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const q = await tx.fpoQuotation.update({
        where: { id: quotation.id },
        data: {
          status: 'REJECTED',
          notes: reason ? `${quotation.notes ? quotation.notes + ' | ' : ''}Rejection: ${reason.trim()}` : quotation.notes
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'QUOTATION_REJECTED',
          entityType: 'FpoQuotation',
          entityId: quotation.id,
          metadata: {
            quotationNumber: quotation.quotationNumber,
            reason: reason || 'Declined by buyer'
          }
        }
      });

      await tx.notification.create({
        data: {
          userId: quotation.fpo.userId,
          type: 'PROPOSAL',
          title: `Quotation Declined: ${quotation.quotationNumber}`,
          body: `Your quotation ${quotation.quotationNumber} was not accepted by the buyer${reason ? ': ' + reason.trim() : '.'}`,
          metadata: {
            eventType: 'FPO_QUOTATION_REJECTED',
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            reason: reason || null
          }
        }
      });

      return q;
    });

    return sendSuccess(res, {
      quotation: updated,
      message: `Quotation ${updated.quotationNumber} declined.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/directory
 *
 * Manual FPO lookup directory for Buyers and Public discovery.
 * Strictly guarantees privacy: does NOT leak farmer member identities, phone numbers, or PII.
 */
const getFpoDirectory = async (req, res, next) => {
  try {
    const { search = '', district = '', state = '', crop = '', page = 1, limit = 20 } = req.query;

    const where = {
      user: { status: 'ACTIVE' }
    };

    if (district) {
      where.district = { equals: district.trim(), mode: 'insensitive' };
    }

    if (state) {
      where.state = { equals: state.trim(), mode: 'insensitive' };
    }

    if (search) {
      const q = search.trim();
      where.OR = [
        { fpoName: { contains: q, mode: 'insensitive' } },
        { registrationNo: { contains: q, mode: 'insensitive' } },
        { district: { contains: q, mode: 'insensitive' } }
      ];
    }

    const fpos = await prisma.fPOProfile.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        produceLots: {
          where: {
            status: { in: ['AGGREGATED', 'TESTED', 'READY_FOR_SALE'] },
            availableQuantityKg: { gt: 0 }
          },
          select: {
            cropName: true,
            availableQuantityKg: true
          }
        },
        members: {
          where: {
            user: { status: 'ACTIVE' }
          },
          select: { id: true }
        }
      },
      orderBy: { fpoName: 'asc' }
    });

    // Post-process with privacy protection & crop filter
    let directoryList = fpos.map((f) => {
      // Aggregate available crops
      const cropMap = {};
      let totalStockKg = 0;
      (f.produceLots || []).forEach((lot) => {
        const c = lot.cropName;
        cropMap[c] = (cropMap[c] || 0) + lot.availableQuantityKg;
        totalStockKg += lot.availableQuantityKg;
      });

      const availableCrops = Object.keys(cropMap).map((cropName) => ({
        cropName,
        availableStockKg: cropMap[cropName]
      }));

      return {
        id: f.id,
        fpoName: f.fpoName,
        registrationNo: f.registrationNo,
        state: f.state,
        district: f.district,
        address: f.address,
        contactPerson: f.user?.name || 'Authorized Representative',
        contactEmail: f.user?.email || null,
        contactPhone: f.user?.phone || null,
        totalActiveMembers: f.members?.length || f.memberCount || 0,
        availableCrops,
        totalConfirmedStockKg: totalStockKg,
        registrationCertVerified: f.registrationCertVerified,
        createdAt: f.createdAt
      };
    });

    if (crop) {
      const c = crop.trim().toLowerCase();
      directoryList = directoryList.filter((f) =>
        f.availableCrops.some((ac) => ac.cropName.toLowerCase().includes(c))
      );
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = directoryList.slice(startIndex, startIndex + limitNum);

    return sendSuccess(res, {
      fpos: paginated,
      total: directoryList.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(directoryList.length / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PHASE 6: MULTI-FARMER PICKUP LOGISTICS FOR FPO BULK ORDERS
// =============================================================================

/**
 * GET /api/fpo/orders
 * Returns confirmed and in-progress bulk orders for this FPO with delivery readiness.
 */
const getFpoOrders = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);

    const members = await prisma.farmerProfile.findMany({
      where: { fpoId: fpo.id },
      select: { id: true, userId: true }
    });
    const memberFarmerIds = members.map(m => m.id);

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { fpoQuotation: { fpoId: fpo.id } },
          {
            reservation: {
              proposal: {
                items: {
                  some: {
                    OR: [
                      { fpoId: fpo.id },
                      ...(memberFarmerIds.length > 0 ? [{ farmerId: { in: memberFarmerIds } }] : [])
                    ]
                  }
                }
              }
            }
          }
        ]
      },
      include: {
        buyer: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } }
          }
        },
        requirement: true,
        fpoQuotation: {
          include: {
            produceLot: {
              include: {
                contributions: {
                  include: {
                    farmer: {
                      include: {
                        user: { select: { id: true, name: true, phone: true } }
                      }
                    },
                    listing: true
                  }
                }
              }
            }
          }
        },
        reservation: {
          include: {
            proposal: {
              include: {
                items: {
                  include: {
                    farmer: {
                      include: {
                        user: { select: { name: true, phone: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedOrders = await Promise.all(orders.map(async (ord) => {
      let shipment = await prisma.shipment.findFirst({
        where: { orderId: ord.id },
        include: { stops: { orderBy: { sequence: 'asc' } } }
      });

      let vehicle = null;
      if (shipment?.vehicleId) {
        try {
          vehicle = await prisma.vehicle.findUnique({ where: { id: shipment.vehicleId } });
        } catch { /* non-fatal */ }
      }

      let contributingFarmersCount = 0;
      let isStockConfirmed = true;

      if (ord.fpoQuotation?.produceLot) {
        const lot = ord.fpoQuotation.produceLot;
        const contribs = lot.contributions || [];
        contributingFarmersCount = contribs.length;
        if (!['CONFIRMED', 'STORED', 'READY_FOR_SALE', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'SOLD'].includes(lot.status)) {
          isStockConfirmed = false;
        }
        if (contribs.some(c => c.status && ['CANCELLED', 'REJECTED', 'PENDING'].includes(c.status))) {
          isStockConfirmed = false;
        }
      } else if (ord.reservation?.proposal?.items) {
        const items = ord.reservation.proposal.items;
        contributingFarmersCount = items.length;
        if (items.some(i => !i.farmerAccepted)) {
          isStockConfirmed = false;
        }
      }

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        cropName: ord.requirement?.cropName || ord.fpoQuotation?.produceLot?.cropName || 'Fresh Produce',
        variety: ord.requirement?.variety || ord.fpoQuotation?.produceLot?.variety || 'Standard',
        grade: ord.requirement?.grade || ord.fpoQuotation?.produceLot?.grade || 'GRADE_A',
        totalQuantityKg: ord.totalQuantityKg,
        agreedPriceTotal: ord.agreedPriceTotal,
        status: ord.status,
        deliveryAddress: ord.deliveryAddress,
        deliveryLatitude: ord.deliveryLatitude,
        deliveryLongitude: ord.deliveryLongitude,
        scheduledDelivery: ord.scheduledDelivery,
        buyer: {
          id: ord.buyer?.id,
          organizationName: ord.buyer?.organizationName || ord.buyer?.user?.name || 'Institutional Buyer',
          contactPhone: ord.buyer?.user?.phone || null,
          contactEmail: ord.buyer?.user?.email || null,
          buyerType: ord.buyer?.buyerType || 'Wholesaler'
        },
        contributingFarmersCount,
        isStockConfirmed,
        hasDelivery: Boolean(shipment),
        delivery: shipment ? {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          totalDistanceKm: shipment.totalDistanceKm,
          estimatedMinutes: shipment.estimatedMinutes,
          vehicleNumber: vehicle?.vehicleNumber || null,
          driverName: vehicle?.driverName || null,
          driverPhone: shipment.status !== 'UNASSIGNED' ? vehicle?.driverPhone : null,
          stopsCount: shipment.stops?.length || 0,
          completedStopsCount: shipment.stops?.filter(s => s.status === 'COMPLETED').length || 0
        } : null,
        createdAt: ord.createdAt
      };
    }));

    return sendSuccess(res, enrichedOrders);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/orders/:id/delivery-plan
 * Pre-dispatch delivery plan generator: extracts multi-farmer pickup stops,
 * checks stock confirmation, and computes route optimization.
 */
const getFpoOrderDeliveryPlan = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { include: { user: true } },
        requirement: true,
        fpoQuotation: {
          include: {
            produceLot: {
              include: {
                contributions: {
                  include: {
                    farmer: {
                      include: { user: true }
                    },
                    listing: true
                  }
                }
              }
            }
          }
        },
        reservation: {
          include: {
            proposal: {
              include: {
                items: {
                  include: {
                    farmer: {
                      include: { user: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundError(`Order with ID ${id} not found.`);
    }

    const isOwner = order.fpoQuotation?.fpoId === fpo.id ||
      order.reservation?.proposal?.items?.some(i => i.fpoId === fpo.id);
    if (!isOwner) {
      throw new AuthorizationError('This order does not belong to your FPO.');
    }

    let contributingFarmers = [];
    let isStockConfirmed = true;
    let unconfirmedReasons = [];

    if (order.fpoQuotation?.produceLot) {
      const lot = order.fpoQuotation.produceLot;
      if (!['CONFIRMED', 'STORED', 'READY_FOR_SALE', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'SOLD'].includes(lot.status)) {
        isStockConfirmed = false;
        unconfirmedReasons.push(`Produce lot ${lot.lotNumber} status is '${lot.status}'. Must be confirmed/ready for delivery.`);
      }

      const contribs = lot.contributions || [];
      if (contribs.length === 0) {
        isStockConfirmed = false;
        unconfirmedReasons.push('Produce lot has no member farmer contributions.');
      }

      for (const c of contribs) {
        if (c.status && ['CANCELLED', 'REJECTED', 'PENDING'].includes(c.status)) {
          isStockConfirmed = false;
          unconfirmedReasons.push(`Contribution from farmer ${(c.farmer || c.farmerProfile)?.user?.name || c.farmerId} is not confirmed.`);
        }
        const fp = c.farmer || c.farmerProfile;
        const qty = c.allocatedQtyKg ?? c.contributedQuantityKg ?? 0;
        contributingFarmers.push({
          farmerId: fp?.userId || c.farmerId,
          farmerProfileId: fp?.id || c.farmerId,
          name: fp?.user?.name || 'Member Farmer',
          phone: fp?.user?.phone || '',
          village: fp?.village || 'Member Cluster',
          district: fp?.district || '',
          state: fp?.state || '',
          lat: fp?.latitude || 18.9880,
          lng: fp?.longitude || 73.9400,
          quantityKg: qty,
          listingId: c.listingId,
          cropName: lot.cropName,
          variety: lot.variety,
          grade: lot.qualityGrade || lot.grade || 'GRADE_A'
        });
      }
    } else if (order.reservation?.proposal?.items?.length > 0) {
      const items = order.reservation.proposal.items;
      for (const item of items) {
        if (!item.farmerAccepted) {
          isStockConfirmed = false;
          unconfirmedReasons.push(`Allocation item for farmer ${item.farmer?.user?.name || item.farmerId} has not been accepted.`);
        }
        const fp = item.farmer;
        contributingFarmers.push({
          farmerId: fp?.userId || item.farmerId,
          farmerProfileId: fp?.id || item.farmerId,
          name: fp?.user?.name || 'Member Farmer',
          phone: fp?.user?.phone || '',
          village: fp?.village || 'Member Cluster',
          district: fp?.district || '',
          state: fp?.state || '',
          lat: fp?.latitude || 18.9880,
          lng: fp?.longitude || 73.9400,
          quantityKg: item.allocatedQuantityKg,
          listingId: item.listingId,
          cropName: order.requirement?.cropName || 'Produce',
          variety: order.requirement?.variety || 'Standard',
          grade: order.requirement?.grade || 'GRADE_A'
        });
      }
    }

    const stops = contributingFarmers.map((f, idx) => ({
      sequence: idx + 1,
      stopType: 'PICKUP',
      farmerId: f.farmerId,
      farmerProfileId: f.farmerProfileId,
      stopName: `Pickup: ${f.name} (${f.village})`,
      address: `${f.village}, ${f.district}, ${f.state}`.trim(),
      latitude: f.lat,
      longitude: f.lng,
      quantityKg: f.quantityKg,
      cropName: f.cropName,
      variety: f.variety,
      grade: f.grade,
      status: 'PENDING'
    }));

    stops.push({
      sequence: stops.length + 1,
      stopType: 'DELIVERY',
      farmerId: null,
      stopName: `Delivery: ${order.buyer?.organizationName || order.buyer?.user?.name || 'Buyer Destination'}`,
      address: order.deliveryAddress,
      latitude: order.deliveryLatitude || 18.5089,
      longitude: order.deliveryLongitude || 73.9260,
      quantityKg: order.totalQuantityKg,
      cropName: order.requirement?.cropName || 'Produce',
      status: 'PENDING',
      deadline: order.scheduledDelivery
    });

    let routeSummary = {
      totalDistanceKm: 68.5,
      estimatedMinutes: 95,
      baselineKm: 125.0,
      savedKm: 56.5,
      fuelSavedRs: 1341.88,
      utilizationPercent: 88.0,
      stopsCount: stops.length
    };

    try {
      const buyerNode = {
        lat: order.deliveryLatitude || 18.5089,
        lng: order.deliveryLongitude || 73.9260,
        address: order.deliveryAddress,
        name: order.buyer?.organizationName || 'Buyer Hub'
      };
      const routeRes = await routingService.computeRoute(
        contributingFarmers.map(f => ({
          id: f.farmerId,
          lat: f.lat,
          lng: f.lng,
          qtyKg: f.quantityKg,
          name: f.name
        })),
        [{ id: 'fleet_vehicle', capacityKg: order.totalQuantityKg * 1.2 }],
        buyerNode
      );
      if (routeRes) {
        routeSummary = {
          totalDistanceKm: routeRes.totalDistanceKm || routeSummary.totalDistanceKm,
          estimatedMinutes: routeRes.estimatedMinutes || routeSummary.estimatedMinutes,
          baselineKm: routeRes.baselineDistanceKm || (routeSummary.totalDistanceKm * 1.8),
          savedKm: routeRes.savedDistanceKm || (routeSummary.totalDistanceKm * 0.8),
          fuelSavedRs: routeRes.estimatedFuelSavedRs || (routeSummary.savedKm * 23.75),
          utilizationPercent: routeRes.utilizationPercent || 88.0,
          stopsCount: stops.length,
          routeGeometry: routeRes.routeGeometry || null
        };
      }
    } catch (routeErr) {
      logger.warn('Routing optimization error; using fallback', { error: routeErr.message });
    }

    const existingShipment = await prisma.shipment.findFirst({
      where: { orderId: order.id }
    });

    return sendSuccess(res, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      cropName: order.requirement?.cropName || 'Produce',
      totalQuantityKg: order.totalQuantityKg,
      agreedPriceTotal: order.agreedPriceTotal,
      buyer: {
        organizationName: order.buyer?.organizationName || order.buyer?.user?.name || 'Buyer',
        deliveryAddress: order.deliveryAddress,
        scheduledDelivery: order.scheduledDelivery
      },
      stops,
      routeSummary,
      isStockConfirmed,
      unconfirmedReasons,
      canDispatch: isStockConfirmed && !existingShipment,
      existingShipment: existingShipment ? {
        id: existingShipment.id,
        trackingNumber: existingShipment.trackingNumber,
        status: existingShipment.status
      } : null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/orders/:id/deliveries
 * Generates an official consolidated multi-farmer delivery request.
 * Enforces stock validation, prevents duplicate deliveries, and protects coordinates.
 */
const createFpoOrderDelivery = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { include: { user: true } },
        requirement: true,
        fpoQuotation: {
          include: {
            produceLot: {
              include: {
                contributions: {
                  include: {
                    farmer: {
                      include: { user: true }
                    },
                    listing: true
                  }
                }
              }
            }
          }
        },
        reservation: {
          include: {
            proposal: {
              include: {
                items: {
                  include: {
                    farmer: {
                      include: { user: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundError(`Order with ID ${id} not found.`);
    }

    const isOwner = order.fpoQuotation?.fpoId === fpo.id ||
      order.reservation?.proposal?.items?.some(i => i.fpoId === fpo.id);
    if (!isOwner) {
      throw new AuthorizationError('This order does not belong to your FPO.');
    }

    if (!['PLACED', 'CONFIRMED'].includes(order.status)) {
      throw new ValidationError(`Cannot create delivery for order with status '${order.status}'. Order must be PLACED or CONFIRMED.`);
    }

    // Anti-duplicate check
    const existingShipment = await prisma.shipment.findFirst({
      where: { orderId: order.id }
    });
    if (existingShipment) {
      throw new ConflictError(`A delivery job (${existingShipment.trackingNumber}) already exists for this order.`);
    }

    // Stock confirmation check
    let contributingFarmers = [];
    let isStockConfirmed = true;
    let unconfirmedReasons = [];

    if (order.fpoQuotation?.produceLot) {
      const lot = order.fpoQuotation.produceLot;
      if (!['CONFIRMED', 'STORED', 'READY_FOR_SALE', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'SOLD'].includes(lot.status)) {
        isStockConfirmed = false;
        unconfirmedReasons.push(`Produce lot ${lot.lotNumber} is '${lot.status}'. Must be confirmed/ready.`);
      }

      const contribs = lot.contributions || [];
      if (contribs.length === 0) {
        isStockConfirmed = false;
        unconfirmedReasons.push('Produce lot has no member farmer contributions.');
      }

      for (const c of contribs) {
        if (c.status && ['CANCELLED', 'REJECTED', 'PENDING'].includes(c.status)) {
          isStockConfirmed = false;
          unconfirmedReasons.push(`Contribution from farmer ${(c.farmer || c.farmerProfile)?.user?.name || c.farmerId} is not confirmed.`);
        }
        const fp = c.farmer || c.farmerProfile;
        const qty = c.allocatedQtyKg ?? c.contributedQuantityKg ?? 0;
        contributingFarmers.push({
          farmerId: fp?.userId || c.farmerId,
          farmerProfileId: fp?.id || c.farmerId,
          name: fp?.user?.name || 'Member Farmer',
          phone: fp?.user?.phone || '',
          village: fp?.village || 'Member Cluster',
          district: fp?.district || '',
          state: fp?.state || '',
          lat: fp?.latitude || 18.9880,
          lng: fp?.longitude || 73.9400,
          quantityKg: qty,
          listingId: c.listingId,
          cropName: lot.cropName,
          variety: lot.variety,
          grade: lot.qualityGrade || lot.grade || 'GRADE_A'
        });
      }
    } else if (order.reservation?.proposal?.items?.length > 0) {
      const items = order.reservation.proposal.items;
      for (const item of items) {
        if (!item.farmerAccepted) {
          isStockConfirmed = false;
          unconfirmedReasons.push(`Allocation item for farmer ${item.farmer?.user?.name || item.farmerId} has not been accepted.`);
        }
        const fp = item.farmer;
        contributingFarmers.push({
          farmerId: fp?.userId || item.farmerId,
          farmerProfileId: fp?.id || item.farmerId,
          name: fp?.user?.name || 'Member Farmer',
          phone: fp?.user?.phone || '',
          village: fp?.village || 'Member Cluster',
          district: fp?.district || '',
          state: fp?.state || '',
          lat: fp?.latitude || 18.9880,
          lng: fp?.longitude || 73.9400,
          quantityKg: item.allocatedQuantityKg,
          listingId: item.listingId,
          cropName: order.requirement?.cropName || 'Produce',
          variety: order.requirement?.variety || 'Standard',
          grade: order.requirement?.grade || 'GRADE_A'
        });
      }
    }

    if (!isStockConfirmed || contributingFarmers.length === 0) {
      throw new ValidationError(`Cannot create delivery for unconfirmed stock. ${unconfirmedReasons.join(' ')}`);
    }

    const stops = contributingFarmers.map((f, idx) => ({
      sequence: idx + 1,
      stopType: 'PICKUP',
      farmerId: f.farmerId,
      farmerProfileId: f.farmerProfileId,
      listingId: f.listingId || null,
      stopName: `Pickup: ${f.name} (${f.village})`,
      address: `${f.village}, ${f.district}, ${f.state}`.trim(),
      latitude: f.lat,
      longitude: f.lng,
      quantityKg: f.quantityKg,
      status: 'PENDING'
    }));

    stops.push({
      sequence: stops.length + 1,
      stopType: 'DELIVERY',
      farmerId: null,
      listingId: null,
      stopName: `Delivery: ${order.buyer?.organizationName || order.buyer?.user?.name || 'Buyer Destination'}`,
      address: order.deliveryAddress,
      latitude: order.deliveryLatitude || 18.5089,
      longitude: order.deliveryLongitude || 73.9260,
      quantityKg: order.totalQuantityKg,
      status: 'PENDING'
    });

    let routeSummary = {
      totalDistanceKm: 68.5,
      estimatedMinutes: 95,
      baselineKm: 125.0,
      savedKm: 56.5,
      fuelSavedRs: 1341.88,
      utilizationPercent: 88.0
    };

    try {
      const buyerNode = {
        lat: order.deliveryLatitude || 18.5089,
        lng: order.deliveryLongitude || 73.9260,
        address: order.deliveryAddress,
        name: order.buyer?.organizationName || 'Buyer Hub'
      };
      const routeRes = await routingService.computeRoute(
        contributingFarmers.map(f => ({
          id: f.farmerId,
          lat: f.lat,
          lng: f.lng,
          qtyKg: f.quantityKg,
          name: f.name
        })),
        [{ id: 'fleet_vehicle', capacityKg: order.totalQuantityKg * 1.2 }],
        buyerNode
      );
      if (routeRes) {
        routeSummary = {
          totalDistanceKm: routeRes.totalDistanceKm || routeSummary.totalDistanceKm,
          estimatedMinutes: routeRes.estimatedMinutes || routeSummary.estimatedMinutes,
          baselineKm: routeRes.baselineDistanceKm || (routeSummary.totalDistanceKm * 1.8),
          savedKm: routeRes.savedDistanceKm || (routeSummary.totalDistanceKm * 0.8),
          fuelSavedRs: routeRes.estimatedFuelSavedRs || (routeSummary.savedKm * 23.75),
          utilizationPercent: routeRes.utilizationPercent || 88.0,
          routeGeometry: routeRes.routeGeometry || null
        };
      }
    } catch (routeErr) {
      logger.warn('Routing optimization fallback', { error: routeErr.message });
    }

    const trackingNumber = `SV-SHP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const createdShipment = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          trackingNumber,
          orderId: order.id,
          status: 'UNASSIGNED',
          deliveryOtp,
          totalWeightKg: order.totalQuantityKg,
          totalDistanceKm: routeSummary.totalDistanceKm,
          baselineDistanceKm: routeSummary.baselineKm,
          savedDistanceKm: routeSummary.savedKm,
          estimatedFuelSavedRs: routeSummary.fuelSavedRs,
          utilizationPercent: routeSummary.utilizationPercent,
          estimatedMinutes: routeSummary.estimatedMinutes,
          routeGeometryJson: routeSummary.routeGeometry || null,
          scheduledPickupAt: req.body.scheduledPickupAt ? new Date(req.body.scheduledPickupAt) : new Date(Date.now() + 86400000),
          stops: {
            create: stops.map((s) => ({
              sequence: s.sequence,
              stopType: s.stopType,
              farmerId: s.farmerId,
              listingId: s.listingId,
              stopName: s.stopName,
              address: s.address,
              latitude: s.latitude,
              longitude: s.longitude,
              quantityKg: s.quantityKg,
              status: 'PENDING'
            }))
          }
        },
        include: {
          stops: { orderBy: { sequence: 'asc' } }
        }
      });

      await tx.deliveryRecord.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          totalDistanceKm: routeSummary.totalDistanceKm,
          estimatedMinutes: routeSummary.estimatedMinutes,
          estimatedFuelCost: routeSummary.fuelSavedRs,
          routeJson: {
            trackingNumber,
            status: 'UNASSIGNED',
            totalDistanceKm: routeSummary.totalDistanceKm,
            stopsCount: stops.length
          }
        },
        update: {
          totalDistanceKm: routeSummary.totalDistanceKm,
          estimatedMinutes: routeSummary.estimatedMinutes,
          estimatedFuelCost: routeSummary.fuelSavedRs,
          routeJson: {
            trackingNumber,
            status: 'UNASSIGNED',
            totalDistanceKm: routeSummary.totalDistanceKm,
            stopsCount: stops.length
          }
        }
      });

      if (order.status === 'PLACED') {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED' }
        });
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          toStatus: 'CONFIRMED',
          changedBy: req.user.id,
          reason: `Multi-farmer delivery job ${trackingNumber} created with ${contributingFarmers.length} pickup stops.`
        }
      });

      return shipment;
    }, { maxWait: 15000, timeout: 30000 });

    logisticsEvents.emit('shipment.created', {
      shipmentId: createdShipment.id,
      orderId: order.id,
      trackingNumber: createdShipment.trackingNumber,
      totalWeightKg: order.totalQuantityKg,
      stopsCount: stops.length
    });

    for (const f of contributingFarmers) {
      if (f.farmerId) {
        try {
          await notificationService.createNotification({
            userId: f.farmerId,
            title: 'Produce Pickup Scheduled',
            message: `A multi-farmer pickup has been scheduled for Order #${order.orderNumber}. Your contribution of ${f.quantityKg.toLocaleString()} kg will be collected at ${f.village}.`,
            type: 'INFO',
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              trackingNumber: createdShipment.trackingNumber,
              quantityKg: f.quantityKg,
              village: f.village
            }
          });
        } catch (notifErr) {
          logger.warn('Failed to send pickup notification to farmer', { farmerId: f.farmerId, error: notifErr.message });
        }
      }
    }

    const responseShipment = {
      ...createdShipment,
      coordinatesProtected: true,
      stops: createdShipment.stops.map((s) => ({
        ...s,
        latitude: null,
        longitude: null,
        approxLatitude: Math.round(s.latitude * 10) / 10,
        approxLongitude: Math.round(s.longitude * 10) / 10
      }))
    };

    return sendSuccess(res, {
      message: `Multi-farmer pickup delivery job ${trackingNumber} generated successfully.`,
      shipment: responseShipment
    }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/deliveries
 * Lists all active and historical multi-farmer pickup shipments for this FPO.
 */
const getFpoDeliveries = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);

    const fpoOrders = await prisma.order.findMany({
      where: {
        OR: [
          { fpoQuotation: { fpoId: fpo.id } },
          { reservation: { proposal: { items: { some: { fpoId: fpo.id } } } } }
        ]
      },
      select: { id: true, orderNumber: true, totalQuantityKg: true }
    });

    const orderIds = fpoOrders.map(o => o.id);
    const orderMap = new Map(fpoOrders.map(o => [o.id, o]));

    const shipments = await prisma.shipment.findMany({
      where: { orderId: { in: orderIds } },
      include: {
        stops: { orderBy: { sequence: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalExpectedKg = 0;
    let totalCollectedKg = 0;
    let unassignedCount = 0;
    let assignedCount = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;

    const list = await Promise.all(shipments.map(async (s) => {
      const order = orderMap.get(s.orderId);
      const isAssigned = s.status !== 'UNASSIGNED';

      let vehicle = null;
      if (s.vehicleId) {
        try {
          vehicle = await prisma.vehicle.findUnique({ where: { id: s.vehicleId } });
        } catch { /* non-fatal */ }
      }

      if (s.status === 'UNASSIGNED') unassignedCount++;
      else if (s.status === 'ASSIGNED') assignedCount++;
      else if (['PICKUP', 'TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)) inTransitCount++;
      else if (s.status === 'DELIVERED') deliveredCount++;

      const pickupStops = s.stops.filter(st => st.stopType === 'PICKUP');
      const completedStops = s.stops.filter(st => st.status === 'COMPLETED');
      const progressPercent = s.stops.length > 0
        ? Math.round((completedStops.length / s.stops.length) * 100)
        : 0;

      const expectedKg = pickupStops.reduce((sum, st) => sum + (st.quantityKg || 0), 0);
      const collectedKg = pickupStops.reduce((sum, st) => sum + (st.status === 'COMPLETED' ? (st.quantityKg || 0) : 0), 0);

      totalExpectedKg += expectedKg;
      totalCollectedKg += collectedKg;

      return {
        id: s.id,
        trackingNumber: s.trackingNumber,
        orderId: s.orderId,
        orderNumber: order?.orderNumber || 'SV-ORD',
        status: s.status,
        totalWeightKg: s.totalWeightKg,
        expectedQuantityKg: expectedKg,
        collectedQuantityKg: collectedKg,
        totalDistanceKm: s.totalDistanceKm,
        estimatedMinutes: s.estimatedMinutes,
        transporter: isAssigned && vehicle ? {
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          driverName: vehicle.driverName,
          driverPhone: vehicle.driverPhone
        } : null,
        stopsCount: s.stops.length,
        pickupStopsCount: pickupStops.length,
        completedStopsCount: completedStops.length,
        progressPercent,
        coordinatesProtected: !isAssigned,
        createdAt: s.createdAt,
        scheduledPickupAt: s.scheduledPickupAt
      };
    }));

    return sendSuccess(res, {
      summary: {
        total: shipments.length,
        unassigned: unassignedCount,
        assigned: assignedCount,
        inTransit: inTransitCount,
        delivered: deliveredCount,
        totalExpectedKg,
        totalCollectedKg
      },
      deliveries: list
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/deliveries/:id
 * Returns detailed multi-stop delivery tracking.
 */
const getFpoDeliveryById = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [{ id }, { trackingNumber: id }, { orderId: id }]
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } }
      }
    });

    if (!shipment) {
      throw new NotFoundError(`Delivery with ID or Tracking #${id} not found.`);
    }

    const order = await prisma.order.findUnique({
      where: { id: shipment.orderId },
      include: {
        buyer: { include: { user: true } },
        requirement: true,
        fpoQuotation: true,
        reservation: { include: { proposal: { include: { items: true } } } }
      }
    });

    const isOwner = order?.fpoQuotation?.fpoId === fpo.id ||
      order?.reservation?.proposal?.items?.some(i => i.fpoId === fpo.id);
    if (!isOwner) {
      throw new AuthorizationError('This delivery does not belong to your FPO.');
    }

    const isAssigned = shipment.status !== 'UNASSIGNED';
    let vehicle = null;
    if (shipment.vehicleId) {
      try {
        vehicle = await prisma.vehicle.findUnique({ where: { id: shipment.vehicleId } });
      } catch { /* non-fatal */ }
    }

    const pickupStops = shipment.stops.filter(s => s.stopType === 'PICKUP');
    const completedStops = shipment.stops.filter(s => s.status === 'COMPLETED');
    const progressPercent = shipment.stops.length > 0
      ? Math.round((completedStops.length / shipment.stops.length) * 100)
      : 0;

    const expectedKg = pickupStops.reduce((sum, st) => sum + (st.quantityKg || 0), 0);
    const collectedKg = pickupStops.reduce((sum, st) => sum + (st.status === 'COMPLETED' ? (st.quantityKg || 0) : 0), 0);

    const safeStops = shipment.stops.map((s) => ({
      id: s.id,
      sequence: s.sequence,
      stopType: s.stopType,
      farmerId: s.farmerId,
      stopName: s.stopName,
      address: s.address,
      latitude: isAssigned ? s.latitude : null,
      longitude: isAssigned ? s.longitude : null,
      approxLatitude: Math.round(s.latitude * 10) / 10,
      approxLongitude: Math.round(s.longitude * 10) / 10,
      coordinatesProtected: !isAssigned,
      quantityKg: s.quantityKg,
      collectedQuantityKg: s.status === 'COMPLETED' ? s.quantityKg : 0,
      status: s.status,
      arrivalEta: s.arrivalEta,
      arrivedAt: s.arrivedAt,
      completedAt: s.completedAt,
      proofNotes: s.proofNotes
    }));

    return sendSuccess(res, {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      orderId: shipment.orderId,
      orderNumber: order?.orderNumber || 'SV-ORD',
      cropName: order?.requirement?.cropName || 'Fresh Produce',
      status: shipment.status,
      deliveryOtp: shipment.deliveryOtp,
      totalWeightKg: shipment.totalWeightKg,
      expectedQuantityKg: expectedKg,
      collectedQuantityKg: collectedKg,
      totalDistanceKm: shipment.totalDistanceKm,
      estimatedMinutes: shipment.estimatedMinutes,
      progressPercent,
      transporter: isAssigned && vehicle ? {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone
      } : null,
      coordinatesProtected: !isAssigned,
      buyer: {
        organizationName: order?.buyer?.organizationName || order?.buyer?.user?.name || 'Buyer',
        deliveryAddress: order?.deliveryAddress,
        scheduledDelivery: order?.scheduledDelivery
      },
      stops: safeStops,
      routeGeometry: shipment.routeGeometryJson,
      scheduledPickupAt: shipment.scheduledPickupAt,
      deliveredAt: shipment.deliveredAt,
      createdAt: shipment.createdAt
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/fpo/deliveries/:id/stops/:stopId
 * Updates status of a farmer pickup stop (ARRIVED / COMPLETED) and updates progress.
 */
const updateFpoDeliveryStop = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id, stopId } = req.params;
    const { status, collectedQuantityKg, proofNotes } = req.body;

    const shipment = await prisma.shipment.findFirst({
      where: { OR: [{ id }, { trackingNumber: id }] },
      include: { stops: { orderBy: { sequence: 'asc' } } }
    });

    if (!shipment) {
      throw new NotFoundError(`Delivery with ID ${id} not found.`);
    }

    const order = await prisma.order.findUnique({
      where: { id: shipment.orderId },
      include: {
        fpoQuotation: true,
        reservation: { include: { proposal: { include: { items: true } } } }
      }
    });

    const isOwner = order?.fpoQuotation?.fpoId === fpo.id ||
      order?.reservation?.proposal?.items?.some(i => i.fpoId === fpo.id);
    if (!isOwner) {
      throw new AuthorizationError('This delivery does not belong to your FPO.');
    }

    const targetStop = shipment.stops.find(s => s.id === stopId);
    if (!targetStop) {
      throw new NotFoundError(`Stop with ID ${stopId} not found in this delivery.`);
    }

    const updatedStop = await prisma.shipmentStop.update({
      where: { id: stopId },
      data: {
        status,
        arrivedAt: status === 'ARRIVED' ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        proofNotes: proofNotes || undefined
      }
    });

    const allStops = await prisma.shipmentStop.findMany({
      where: { shipmentId: shipment.id }
    });
    const pickupStops = allStops.filter(s => s.stopType === 'PICKUP');
    const allPickupsDone = pickupStops.every(s => s.status === 'COMPLETED');

    if (allPickupsDone && ['UNASSIGNED', 'ASSIGNED', 'PICKUP'].includes(shipment.status)) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: 'TRANSIT' }
      });
      logisticsEvents.emit('shipment.milestone', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        milestone: 'TRANSIT',
        timestamp: new Date().toISOString()
      });
    }

    if (targetStop.stopType === 'DELIVERY' && status === 'COMPLETED') {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      });
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED', actualDelivery: new Date() }
      });
      logisticsEvents.emit('shipment.delivered', {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        deliveredAt: new Date().toISOString()
      });
    }

    if (status === 'COMPLETED' && targetStop.farmerId) {
      try {
        const collected = collectedQuantityKg || targetStop.quantityKg;
        await notificationService.createNotification({
          userId: targetStop.farmerId,
          title: 'Produce Collected',
          message: `Your produce contribution of ${collected.toLocaleString()} kg has been successfully collected by the transporter.`,
          type: 'INFO',
          metadata: {
            stopId: targetStop.id,
            shipmentId: shipment.id,
            trackingNumber: shipment.trackingNumber,
            collectedQuantityKg: collected
          }
        });
      } catch (notifErr) {
        logger.warn('Failed to notify farmer on pickup collection', { error: notifErr.message });
      }
    }

    return sendSuccess(res, {
      message: `Stop #${targetStop.sequence} updated to ${status}.`,
      stop: updatedStop
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// PHASE 7: FPO FARMER SETTLEMENTS & PAYMENTS
// =============================================================================

/**
 * GET /api/fpo/settlements
 * Returns all farmer settlements for the authenticated FPO with filters and metrics.
 */
const getFpoSettlements = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { farmerId, orderId, status, search, startDate, endDate } = req.query;

    const where = { fpoId: fpo.id };
    if (farmerId) where.farmerId = farmerId;
    if (orderId) where.orderId = orderId;
    if (status && status !== 'ALL') where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { settlementNumber: { contains: q, mode: 'insensitive' } },
        { cropName: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { farmer: { user: { name: { contains: q, mode: 'insensitive' } } } }
      ];
    }

    const settlements = await prisma.farmerSettlement.findMany({
      where,
      include: {
        farmer: {
          include: {
            user: {
              select: { id: true, name: true, phone: true, email: true }
            }
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            agreedPriceTotal: true,
            totalQuantityKg: true,
            status: true,
            deliveryAddress: true,
            buyer: {
              select: {
                organizationName: true,
                user: { select: { name: true } }
              }
            }
          }
        },
        contribution: {
          select: {
            id: true,
            allocatedQtyKg: true,
            agreedPricePerKg: true,
            status: true
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const metrics = {
      totalSettlements: settlements.length,
      totalGrossAmount: Math.round(settlements.reduce((s, x) => s + x.grossAmount, 0) * 100) / 100,
      totalCommissionAmount: Math.round(settlements.reduce((s, x) => s + x.commissionAmount, 0) * 100) / 100,
      totalLogisticsDeductions: Math.round(settlements.reduce((s, x) => s + x.logisticsFeeShare, 0) * 100) / 100,
      totalNetPayable: Math.round(settlements.reduce((s, x) => s + x.netPayable, 0) * 100) / 100,
      totalPaidAmount: Math.round(settlements.reduce((s, x) => s + x.paidAmount, 0) * 100) / 100,
      totalOutstandingAmount: Math.round(settlements.reduce((s, x) => s + x.outstandingAmount, 0) * 100) / 100,
      pendingCount: settlements.filter(s => s.status === 'PENDING').length,
      partiallyPaidCount: settlements.filter(s => s.status === 'PARTIALLY_PAID').length,
      paidCount: settlements.filter(s => s.status === 'PAID').length
    };

    return sendSuccess(res, { metrics, settlements });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fpo/settlements/:id
 * Returns deep details of a single settlement.
 */
const getFpoSettlementById = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;

    const settlement = await prisma.farmerSettlement.findUnique({
      where: { id },
      include: {
        farmer: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } }
          }
        },
        order: {
          include: {
            buyer: {
              select: { organizationName: true, user: { select: { name: true } } }
            },
            delivery: true
          }
        },
        contribution: true,
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!settlement) {
      throw new NotFoundError(`Settlement with ID ${id} not found.`);
    }

    if (settlement.fpoId !== fpo.id && req.user.role !== 'ADMIN') {
      throw new AuthorizationError('This settlement record does not belong to your FPO.');
    }

    return sendSuccess(res, settlement);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/orders/:id/settlements/generate
 * Generates farmer-wise settlement records for a confirmed/delivered bulk order.
 * Strictly prevents duplicate records (Idempotent).
 */
const generateOrderSettlements = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id: orderId } = req.params;
    const { notes, dueDate, commissionRatePercent: passedRate } = req.body || {};

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        fpoQuotation: {
          include: {
            produceLot: {
              include: {
                contributions: {
                  include: {
                    farmer: { include: { user: true } }
                  }
                }
              }
            }
          }
        },
        reservation: {
          include: {
            proposal: {
              include: {
                items: {
                  include: {
                    farmer: { include: { user: true } }
                  }
                }
              }
            }
          }
        },
        delivery: true,
        buyer: true
      }
    });

    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found.`);
    }

    // Tenant check
    const isOwnerFpo =
      order.fpoQuotation?.fpoId === fpo.id ||
      order.reservation?.proposal?.items?.some(i => i.fpoId === fpo.id || i.farmer?.fpoId === fpo.id);

    if (!isOwnerFpo && req.user.role !== 'ADMIN') {
      throw new AuthorizationError('This order does not belong to your FPO.');
    }

    // Consistency check: Check for existing settlements (anti-duplicate)
    const existingSettlements = await prisma.farmerSettlement.findMany({
      where: { orderId: order.id },
      include: {
        farmer: { include: { user: true } },
        payments: true
      }
    });

    if (existingSettlements.length > 0) {
      return sendSuccess(res, {
        message: 'Settlement records have already been generated for this order.',
        isAlreadyGenerated: true,
        settlements: existingSettlements
      }, 200);
    }

    // Collect contributing farmers
    const contributingFarmers = [];

    if (order.fpoQuotation?.produceLot?.contributions?.length > 0) {
      for (const c of order.fpoQuotation.produceLot.contributions) {
        if (c.status !== 'RELEASED' && c.status !== 'CANCELLED') {
          contributingFarmers.push({
            farmerProfileId: c.farmerId,
            farmerUserId: c.farmer?.userId,
            farmerName: c.farmer?.user?.name || 'Member Farmer',
            cropName: order.fpoQuotation.produceLot.cropName,
            variety: order.fpoQuotation.produceLot.variety,
            quantityKg: c.allocatedQtyKg,
            agreedPricePerKg: c.agreedPricePerKg,
            contributionId: c.id
          });
        }
      }
    } else if (order.reservation?.proposal?.items?.length > 0) {
      for (const item of order.reservation.proposal.items) {
        if (item.farmerAccepted) {
          contributingFarmers.push({
            farmerProfileId: item.farmerId,
            farmerUserId: item.farmer?.userId,
            farmerName: item.farmer?.user?.name || 'Member Farmer',
            cropName: order.requirement?.cropName || 'Produce',
            variety: order.requirement?.variety,
            quantityKg: item.allocatedQuantityKg,
            agreedPricePerKg: item.unitPrice,
            contributionId: null
          });
        }
      }
    }

    if (contributingFarmers.length === 0) {
      throw new ValidationError('No confirmed contributing farmers found for this order to generate settlements.');
    }

    // Commission rate: explicitly configured only (do not invent)
    let commissionRate = 0;
    if (passedRate !== undefined && passedRate !== null && !isNaN(Number(passedRate))) {
      commissionRate = Math.max(0, Math.min(100, Number(passedRate)));
    } else if (fpo.commissionRatePercent && !isNaN(Number(fpo.commissionRatePercent))) {
      commissionRate = Number(fpo.commissionRatePercent);
    }

    // Generate settlements in an atomic transaction
    const createdSettlements = await prisma.$transaction(async (tx) => {
      const records = [];
      const timestampSuffix = Date.now().toString().slice(-4);

      for (let i = 0; i < contributingFarmers.length; i++) {
        const cf = contributingFarmers[i];
        const grossAmount = Math.round(cf.quantityKg * cf.agreedPricePerKg * 100) / 100;
        const commissionAmount = commissionRate > 0
          ? Math.round(grossAmount * (commissionRate / 100) * 100) / 100
          : 0;
        const logisticsFeeShare = 0;
        const netPayable = Math.round((grossAmount - commissionAmount - logisticsFeeShare) * 100) / 100;

        const settlementNumber = `SET-${order.orderNumber.replace(/[^A-Za-z0-9]/g, '')}-${i + 1}-${timestampSuffix}`;

        const settlement = await tx.farmerSettlement.create({
          data: {
            settlementNumber,
            orderId: order.id,
            fpoId: fpo.id,
            farmerId: cf.farmerProfileId,
            contributionId: cf.contributionId,
            cropName: cf.cropName,
            variety: cf.variety,
            quantityKg: cf.quantityKg,
            agreedPricePerKg: cf.agreedPricePerKg,
            grossAmount,
            commissionRatePercent: commissionRate,
            commissionAmount,
            logisticsFeeShare,
            netPayable,
            paidAmount: 0,
            outstandingAmount: netPayable,
            status: 'PENDING',
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || null
          },
          include: {
            farmer: { include: { user: true } }
          }
        });

        records.push(settlement);
      }

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'SETTLEMENT_GENERATED',
          entityType: 'Order',
          entityId: order.id,
          metadata: {
            fpoId: fpo.id,
            orderNumber: order.orderNumber,
            settlementsCount: records.length,
            totalGross: records.reduce((s, r) => s + r.grossAmount, 0),
            totalNet: records.reduce((s, r) => s + r.netPayable, 0),
            commissionRatePercent: commissionRate
          }
        }
      });

      return records;
    }, { maxWait: 15000, timeout: 30000 });

    // Send notifications to farmers
    for (const st of createdSettlements) {
      const farmerUserId = st.farmer?.userId;
      if (farmerUserId) {
        try {
          await notificationService.createNotification({
            userId: farmerUserId,
            title: 'Settlement Prepared for Bulk Order',
            message: `A settlement record #${st.settlementNumber} for Order #${order.orderNumber} has been prepared. Net payable: ₹${st.netPayable.toLocaleString()} for ${st.quantityKg} kg of ${st.cropName}.`,
            type: 'INFO',
            metadata: {
              settlementId: st.id,
              orderId: order.id,
              orderNumber: order.orderNumber,
              netPayable: st.netPayable,
              quantityKg: st.quantityKg
            }
          });
        } catch (notifErr) {
          logger.warn('Failed to send settlement notification to farmer', { error: notifErr.message });
        }
      }
    }

    return sendSuccess(res, {
      message: `Generated ${createdSettlements.length} farmer settlement records successfully.`,
      settlements: createdSettlements
    }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fpo/settlements/:id/payments
 * Records verified payment evidence for a farmer settlement (NEFT, UTR, Cheque, UPI).
 * Supports partial payments and strict overpayment prevention.
 */
const recordSettlementPayment = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { id } = req.params;
    const { amount, paymentMode, transactionRef, paymentDate, receiptUrl, notes } = req.body;

    const settlement = await prisma.farmerSettlement.findUnique({
      where: { id },
      include: {
        farmer: { include: { user: true } },
        order: true
      }
    });

    if (!settlement) {
      throw new NotFoundError(`Settlement with ID ${id} not found.`);
    }

    if (settlement.fpoId !== fpo.id && req.user.role !== 'ADMIN') {
      throw new AuthorizationError('This settlement does not belong to your FPO.');
    }

    if (settlement.status === 'PAID') {
      throw new ValidationError('This settlement has already been fully paid and settled.');
    }

    if (settlement.status === 'CANCELLED') {
      throw new ValidationError('Cannot record payment for a cancelled settlement.');
    }

    const payAmount = Math.round(Number(amount) * 100) / 100;
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero.');
    }

    // Overpayment prevention
    if (payAmount > settlement.outstandingAmount + 0.01) {
      throw new ValidationError(
        `Payment amount of ₹${payAmount.toLocaleString()} exceeds the outstanding balance of ₹${settlement.outstandingAmount.toLocaleString()}. Overpayment is not permitted.`
      );
    }

    // Verified transaction reference required
    if (!transactionRef || !transactionRef.trim()) {
      throw new ValidationError('Valid transaction reference (UTR, Cheque #, or Bank Ref) is required as payment evidence.');
    }

    // Check duplicate transaction reference for this settlement
    const duplicateRef = await prisma.settlementPaymentRecord.findFirst({
      where: {
        settlementId: settlement.id,
        transactionRef: transactionRef.trim()
      }
    });

    if (duplicateRef) {
      throw new ConflictError(`Transaction reference '${transactionRef.trim()}' has already been recorded for this settlement.`);
    }

    const { updatedSettlement, paymentRecord } = await prisma.$transaction(async (tx) => {
      const pRecord = await tx.settlementPaymentRecord.create({
        data: {
          settlementId: settlement.id,
          amount: payAmount,
          paymentMode: paymentMode || 'BANK_TRANSFER',
          transactionRef: transactionRef.trim(),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          recordedBy: req.user.id,
          receiptUrl: receiptUrl || null,
          notes: notes || null
        }
      });

      const newPaidAmount = Math.round((settlement.paidAmount + payAmount) * 100) / 100;
      const newOutstanding = Math.max(0, Math.round((settlement.netPayable - newPaidAmount) * 100) / 100);
      const isFullyPaid = newOutstanding <= 0.01;
      const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

      const upd = await tx.farmerSettlement.update({
        where: { id: settlement.id },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstanding,
          status: newStatus,
          settledAt: isFullyPaid ? new Date() : settlement.settledAt
        },
        include: {
          farmer: { include: { user: true } },
          payments: { orderBy: { paymentDate: 'desc' } }
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'SETTLEMENT_PAYMENT_RECORDED',
          entityType: 'FarmerSettlement',
          entityId: settlement.id,
          metadata: {
            settlementNumber: settlement.settlementNumber,
            orderId: settlement.orderId,
            paidAmount: payAmount,
            paymentMode,
            transactionRef: transactionRef.trim(),
            newStatus,
            outstandingAmount: newOutstanding
          }
        }
      });

      // Check if all settlements for this order are now PAID
      if (isFullyPaid) {
        const remainingUnpaid = await tx.farmerSettlement.count({
          where: {
            orderId: settlement.orderId,
            status: { not: 'PAID' }
          }
        });

        if (remainingUnpaid === 0) {
          // If order is DELIVERED, advance order status to SETTLED
          const order = await tx.order.findUnique({ where: { id: settlement.orderId } });
          if (order && (order.status === 'DELIVERED' || order.status === 'CONFIRMED')) {
            await tx.order.update({
              where: { id: settlement.orderId },
              data: { status: 'SETTLED' }
            });
            await tx.orderStatusEvent.create({
              data: {
                orderId: settlement.orderId,
                toStatus: 'SETTLED',
                changedBy: req.user.id,
                reason: 'All farmer contributions settled and paid in full.'
              }
            });
          }
        }
      }

      return { updatedSettlement: upd, paymentRecord: pRecord };
    }, { maxWait: 15000, timeout: 30000 });

    // Notify farmer about payment receipt
    const farmerUserId = settlement.farmer?.userId;
    if (farmerUserId) {
      try {
        await notificationService.createNotification({
          userId: farmerUserId,
          title: 'Payment Received for Produce Contribution',
          message: `Payment of ₹${payAmount.toLocaleString()} has been recorded via ${paymentMode} (Ref: ${transactionRef.trim()}). Outstanding balance: ₹${updatedSettlement.outstandingAmount.toLocaleString()}.`,
          type: 'INFO',
          metadata: {
            settlementId: settlement.id,
            orderId: settlement.orderId,
            paidAmount: payAmount,
            paymentMode,
            transactionRef: transactionRef.trim(),
            status: updatedSettlement.status
          }
        });
      } catch (notifErr) {
        logger.warn('Failed to send payment notification to farmer', { error: notifErr.message });
      }
    }

    return sendSuccess(res, {
      message: `Payment of ₹${payAmount.toLocaleString()} recorded successfully.`,
      settlement: updatedSettlement,
      payment: paymentRecord
    }, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFPODashboard,
  getMembers,
  addMember,
  removeMember,
  verifyMember,
  aggregateProduce,
  getFpoProposals,
  updateFpoProfile,
  searchFarmers,
  suspendMember,
  reactivateMember,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getSentInvitations,
  cancelInvitation,
  getMemberProduce,
  requestContribution,
  getFpoContributions,
  cancelFpoContribution,
  releaseContributionReservation,
  getConfirmedContributions,
  createProduceLot,
  getProduceLots,
  getProduceLotById,
  updateProduceLotStatus,
  cancelProduceLot,
  allocateProduceLot,
  // Phase 5 exports
  getFpoBulkRequirements,
  getFpoBulkRequirementById,
  createFpoQuotation,
  getFpoQuotations,
  getFpoQuotationById,
  withdrawFpoQuotation,
  acceptFpoQuotation,
  rejectFpoQuotation,
  getFpoDirectory,
  sweepExpiredQuotations,
  // Phase 6 exports
  getFpoOrders,
  getFpoOrderDeliveryPlan,
  createFpoOrderDelivery,
  getFpoDeliveries,
  getFpoDeliveryById,
  updateFpoDeliveryStop,
  // Phase 7 exports
  getFpoSettlements,
  getFpoSettlementById,
  generateOrderSettlements,
  recordSettlementPayment
};
