/**
 * SasyaVahini — FPO Controller (Hardened)
 * 
 * Handles FPO collective workspace, member farmer management,
 * crop aggregation, and bulk procurement proposals.
 * Owner: Member 2 (Farmer & FPO Portals)
 */

const prisma = require('../lib/prisma');
const { sendSuccess } = require('../utils/apiResponse');
const { ValidationError, AuthorizationError, ConflictError } = require('../utils/errors');

/**
 * Helper to ensure the authenticated user has an FPOProfile
 */
async function getFpoProfileOrThrow(userId) {
  let profile = await prisma.fPOProfile.findUnique({
    where: { userId },
    include: { user: true }
  });

  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'FPO' && user.role !== 'ADMIN')) {
      throw new AuthorizationError('User does not have an FPO role.');
    }
    profile = await prisma.fPOProfile.create({
      data: {
        userId,
        fpoName: 'Pune Sahakari Krishi Producer Co.',
        registrationNo: 'FPO-MH-PUN-2023-089',
        memberCount: 0,
        state: 'Maharashtra',
        district: 'Pune',
        address: 'APMC Market Yard, Gultekdi, Pune'
      },
      include: { user: true }
    });
  }
  return profile;
}

/**
 * GET /api/fpo/dashboard
 */
const getFPODashboard = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);

    // Fetch members affiliated with this FPO
    let memberFarmers = await prisma.farmerProfile.findMany({
      where: { fpoId: fpo.id },
      include: {
        user: true,
        listings: true
      }
    });

    if (fpo.memberCount !== memberFarmers.length) {
      await prisma.fPOProfile.update({
        where: { id: fpo.id },
        data: { memberCount: memberFarmers.length }
      }).catch(() => {});
      fpo.memberCount = memberFarmers.length;
    }

    const memberFarmerIds = memberFarmers.map(m => m.id);
    const fpoListings = await prisma.produceListing.findMany({
      where: {
        OR: [
          { fpoId: fpo.id },
          { farmerId: { in: memberFarmerIds } }
        ]
      },
      include: { farmer: { include: { user: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Compute collective inventory grouped by crop (no double counting)
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
      collectiveMap[crop].totalQuantityKg += item.totalQuantityKg;
      if (item.status === 'AVAILABLE') collectiveMap[crop].availableQuantityKg += item.totalQuantityKg;
      else if (item.status === 'RESERVED' || item.status === 'PARTIALLY_RESERVED') collectiveMap[crop].reservedQuantityKg += (item.reservedQty || item.totalQuantityKg);
      else if (item.status === 'SOLD') collectiveMap[crop].soldQuantityKg += item.totalQuantityKg;

      collectiveMap[crop].weightedValueSum += (item.askingPricePerKg * item.totalQuantityKg);
      collectiveMap[crop].farmerIds.add(item.farmerId);
      collectiveMap[crop].listingsCount += 1;
    }

    const collectiveInventory = Object.values(collectiveMap).map(inv => ({
      cropName: inv.cropName,
      category: inv.category,
      totalQuantityKg: inv.totalQuantityKg,
      availableQuantityKg: inv.availableQuantityKg,
      reservedQuantityKg: inv.reservedQuantityKg,
      soldQuantityKg: inv.soldQuantityKg,
      avgAskingPrice: inv.totalQuantityKg > 0 ? Math.round((inv.weightedValueSum / inv.totalQuantityKg) * 10) / 10 : 0,
      farmerCount: inv.farmerIds.size,
      listingsCount: inv.listingsCount
    }));

    const activeRequirements = await prisma.buyerRequirement.findMany({
      where: { status: 'OPEN' },
      include: { buyer: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    return sendSuccess(res, {
      fpoProfile: fpo,
      memberCount: memberFarmers.length,
      memberFarmers,
      fpoListings: fpoListings.map(l => ({
        ...l,
        quantityKg: l.totalQuantityKg,
        location: l.village ? `${l.village}, ${l.district}` : l.district
      })),
      collectiveInventory,
      activeRequirements
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
    const members = await prisma.farmerProfile.findMany({
      where: { fpoId: fpo.id },
      include: {
        user: true,
        listings: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, members);
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
          { listing: { farmerId: { in: memberIds } } }
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
      buyerName: item.proposal.requirement.buyer?.organizationName || 'Institutional Buyer',
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
 */
const updateFpoProfile = async (req, res, next) => {
  try {
    const fpo = await getFpoProfileOrThrow(req.user.id);
    const { fpoName, registrationNo, address, district, state } = req.body;

    const updateData = {};
    if (fpoName !== undefined) updateData.fpoName = fpoName;
    if (registrationNo !== undefined) updateData.registrationNo = registrationNo;
    if (address !== undefined) updateData.address = address;
    if (district !== undefined) updateData.district = district;
    if (state !== undefined) updateData.state = state;

    const updated = await prisma.fPOProfile.update({
      where: { id: fpo.id },
      data: updateData,
      include: { user: true }
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFPODashboard,
  getMembers,
  aggregateProduce,
  getFpoProposals,
  updateFpoProfile
};