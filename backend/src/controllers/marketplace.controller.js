/**
 * SasyaVahini — Marketplace Controller
 *
 * Provides endpoints for buyers to browse verified farm and FPO produce listings,
 * compare with mandi benchmarks, and view available aggregation lots.
 *
 * Owner: Member 3 (Buyer & Marketplace Module)
 */

const prisma = require('../lib/prisma');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * GET /api/marketplace/produce
 * Fetch all available and partially reserved produce listings with farmer and FPO details.
 */
const getProduceListings = async (req, res, next) => {
  try {
    const { crop, category, grade, district, search, sort } = req.query;

    const where = {
      status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
    };

    if (crop) {
      where.cropName = { equals: crop, mode: 'insensitive' };
    }

    if (category && category !== 'ALL') {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (grade && grade !== 'ALL') {
      where.qualityGrade = grade;
    }

    if (district) {
      where.district = { contains: district, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { cropName: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
        { village: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { askingPricePerKg: 'asc' };
    if (sort === 'price_desc') orderBy = { askingPricePerKg: 'desc' };
    if (sort === 'qty_desc') orderBy = { totalQuantityKg: 'desc' };

    const listings = await prisma.produceListing.findMany({
      where,
      orderBy,
      include: {
        farmer: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        fpo: {
          select: {
            id: true,
            fpoName: true,
            registrationNo: true,
            district: true,
            state: true,
          },
        },
      },
    });

    const formatted = listings.map((l) => {
      const availableQtyKg = Math.max(0, l.totalQuantityKg - l.reservedQty - l.soldQty);
      return {
        id: l.id,
        cropName: l.cropName,
        category: l.category,
        qualityGrade: l.qualityGrade,
        isOrganic: l.isOrganic,
        totalQuantityKg: l.totalQuantityKg,
        reservedQty: l.reservedQty,
        availableQtyKg,
        askingPricePerKg: l.askingPricePerKg,
        minPricePerKg: l.minPricePerKg,
        harvestDate: l.harvestDate ? l.harvestDate.toISOString().split('T')[0] : null,
        expiryDate: l.expiryDate ? l.expiryDate.toISOString().split('T')[0] : null,
        state: l.state,
        district: l.district,
        village: l.village,
        latitude: l.latitude,
        longitude: l.longitude,
        imageUrl: l.imageUrl,
        description: l.description,
        status: l.status,
        farmer: l.farmer ? {
          id: l.farmer.id,
          name: l.farmer.user?.name || 'Verified Farmer',
          state: l.farmer.state,
          district: l.farmer.district,
          aadhaarVerified: l.farmer.aadhaarVerified,
          bankAccountVerified: l.farmer.bankAccountVerified,
        } : null,
        fpo: l.fpo ? {
          id: l.fpo.id,
          name: l.fpo.fpoName,
          district: l.fpo.district,
          state: l.fpo.state,
        } : null,
      };
    });

    return sendSuccess(res, formatted, 200);
  } catch (err) {
    logger.error('Error fetching produce listings:', err);
    next(err);
  }
};

/**
 * GET /api/marketplace/produce/:id
 */
const getProduceListingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await prisma.produceListing.findUnique({
      where: { id },
      include: {
        farmer: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        fpo: true,
      },
    });

    if (!listing) {
      return sendError(res, 'NOT_FOUND', 'Produce listing not found', 404);
    }

    const availableQtyKg = Math.max(0, listing.totalQuantityKg - listing.reservedQty - listing.soldQty);

    return sendSuccess(res, {
      ...listing,
      availableQtyKg,
      harvestDate: listing.harvestDate ? listing.harvestDate.toISOString().split('T')[0] : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/marketplace/stats
 */
const getMarketplaceStats = async (req, res, next) => {
  try {
    const totalListings = await prisma.produceListing.count({
      where: { status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] } },
    });

    const aggregates = await prisma.produceListing.aggregate({
      where: { status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] } },
      _sum: { totalQuantityKg: true },
      _avg: { askingPricePerKg: true },
    });

    return sendSuccess(res, {
      activeListings: totalListings,
      totalVolumeKg: aggregates._sum.totalQuantityKg || 0,
      avgAskingPricePerKg: Math.round((aggregates._avg.askingPricePerKg || 0) * 100) / 100,
      directSavingsPercent: 14.5,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProduceListings,
  getProduceListingById,
  getMarketplaceStats,
};
