/**
 * SasyaVahini — Marketplace Controller (Phase 3)
 *
 * Provides comprehensive endpoints for buyers to discover verified farm and FPO produce listings,
 * explore categories, perform server-side filtered search with pagination, inspect quality & origin
 * details, and view authorized supplier profiles.
 *
 * SIH 2026 Problem Statement 26033 (DoCA)
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const prisma = require('../lib/prisma');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Agmarknet APMC mandi benchmark reference rates for Maharashtra agricultural corridors
const MANDI_BENCHMARKS = {
  tomato: 28,
  onion: 26,
  potato: 24,
  wheat: 40,
  rice: 48,
  'green chili': 55,
  chili: 55,
  pomegranate: 115,
  mango: 150,
  'tur dal': 135,
  turmeric: 110,
};

/**
 * Helper to compute mandi benchmark price and savings percentage
 */
function computeMandiMetrics(cropName, askingPricePerKg) {
  const normalized = (cropName || '').toLowerCase().trim();
  let benchmark = MANDI_BENCHMARKS[normalized];

  if (!benchmark) {
    // Partial substring match fallback
    const match = Object.keys(MANDI_BENCHMARKS).find((k) => normalized.includes(k));
    benchmark = match ? MANDI_BENCHMARKS[match] : Math.round(askingPricePerKg * 1.15);
  }

  const savingsPercent = benchmark > askingPricePerKg
    ? Math.round(((benchmark - askingPricePerKg) / benchmark) * 1000) / 10
    : 0;

  return { mandiBenchmark: benchmark, savingsPercent };
}

/**
 * Format a raw Prisma listing into the public marketplace contract
 */
function formatListing(l) {
  const availableQtyKg = Math.max(0, l.totalQuantityKg - (l.reservedQty || 0) - (l.soldQty || 0));
  const { mandiBenchmark, savingsPercent } = computeMandiMetrics(l.cropName, l.askingPricePerKg);

  // Freshness calculation (days since harvest)
  let daysSinceHarvest = null;
  if (l.harvestDate) {
    const diffTime = Math.abs(new Date() - new Date(l.harvestDate));
    daysSinceHarvest = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Stock status
  let stockStatus = 'IN_STOCK';
  if (availableQtyKg <= 0) stockStatus = 'OUT_OF_STOCK';
  else if (availableQtyKg < 200) stockStatus = 'LOW_STOCK';

  return {
    id: l.id,
    cropName: l.cropName,
    category: l.category,
    qualityGrade: l.qualityGrade,
    isOrganic: !!l.isOrganic,
    totalQuantityKg: l.totalQuantityKg,
    reservedQty: l.reservedQty || 0,
    soldQty: l.soldQty || 0,
    availableQtyKg,
    stockStatus,
    askingPricePerKg: l.askingPricePerKg,
    minPricePerKg: l.minPricePerKg,
    mandiBenchmark,
    savingsPercent,
    harvestDate: l.harvestDate ? l.harvestDate.toISOString().split('T')[0] : null,
    expiryDate: l.expiryDate ? l.expiryDate.toISOString().split('T')[0] : null,
    daysSinceHarvest,
    state: l.state,
    district: l.district,
    village: l.village || null,
    latitude: l.latitude || null,
    longitude: l.longitude || null,
    imageUrl: l.imageUrl || null,
    description: l.description || '',
    status: l.status,
    createdAt: l.createdAt,
    farmer: l.farmer ? {
      id: l.farmer.id,
      name: l.farmer.user?.name || 'Verified Farmer',
      state: l.farmer.state,
      district: l.farmer.district,
      aadhaarVerified: !!l.farmer.aadhaarVerified,
      bankAccountVerified: !!l.farmer.bankAccountVerified,
    } : null,
    fpo: l.fpo ? {
      id: l.fpo.id,
      name: l.fpo.fpoName,
      registrationNo: l.fpo.registrationNo,
      district: l.fpo.district,
      state: l.fpo.state,
      memberCount: l.fpo.memberCount || 0,
      registrationCertVerified: !!l.fpo.registrationCertVerified,
    } : null,
  };
}

/**
 * GET /api/marketplace/categories & /api/buyer/marketplace/categories
 * Returns active agricultural categories with product counts, minPrice, and representative metadata.
 */
const getCategories = async (req, res, next) => {
  try {
    const rawCategories = await prisma.produceListing.groupBy({
      by: ['category'],
      where: {
        status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
      },
      _count: { id: true },
      _min: { askingPricePerKg: true },
    });

    const CATEGORY_META = {
      Vegetables: { icon: 'Carrot', desc: 'Fresh farm-gate tomatoes, onions, potatoes and leafy greens.' },
      Fruits: { icon: 'Apple', desc: 'Naturally ripened orchards, mangoes, pomegranates and citrus.' },
      Grains: { icon: 'Wheat', desc: 'Staple golden wheat, organic rice, and traditional grains.' },
      Pulses: { icon: 'Bean', desc: 'Protein-rich lentils, chickpeas, tur dal and legumes.' },
      Spices: { icon: 'Flame', desc: 'High-potency turmeric, ginger, and aromatic spices.' },
      Oilseeds: { icon: 'Droplets', desc: 'Soybean, groundnut, and organic oilseeds.' },
      Millets: { icon: 'Sparkles', desc: 'Nutrient-dense ragi, jowar, and bajra millets.' },
    };

    const categories = rawCategories.map((c) => {
      const name = c.category;
      const meta = CATEGORY_META[name] || { icon: 'Leaf', desc: 'Quality farm produce directly from FPO clusters.' };
      return {
        id: name,
        name,
        slug: name.toLowerCase(),
        count: c._count.id,
        minPrice: c._min.askingPricePerKg || 0,
        icon: meta.icon,
        description: meta.desc,
      };
    });

    // If no listings in DB yet, return the default agricultural categories
    if (categories.length === 0) {
      const defaults = Object.keys(CATEGORY_META).map((name) => ({
        id: name,
        name,
        slug: name.toLowerCase(),
        count: 0,
        minPrice: 0,
        icon: CATEGORY_META[name].icon,
        description: CATEGORY_META[name].desc,
      }));
      return sendSuccess(res, defaults, 200);
    }

    return sendSuccess(res, categories, 200);
  } catch (err) {
    logger.error('Error fetching marketplace categories:', err);
    next(err);
  }
};

/**
 * GET /api/marketplace/products & /api/buyer/marketplace/products (and /produce)
 * Server-side search, filtering, sorting, and pagination.
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      q,
      crop,
      category,
      grade,
      qualityGrade,
      minPrice,
      maxPrice,
      district,
      state,
      supplierId,
      fpoId,
      isOrganic,
      minQuantity,
      availability,
      sort,
      sortBy,
      page = 1,
      limit = 12,
    } = req.query;

    const querySearch = (search || q || '').trim();
    const activeGrade = qualityGrade || grade;
    const activeSort = sortBy || sort || 'recent';
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (currentPage - 1) * pageLimit;

    const where = {
      status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
    };

    // Text search across crop name, category, district, village, description, and supplier name
    if (querySearch) {
      where.OR = [
        { cropName: { contains: querySearch, mode: 'insensitive' } },
        { category: { contains: querySearch, mode: 'insensitive' } },
        { district: { contains: querySearch, mode: 'insensitive' } },
        { village: { contains: querySearch, mode: 'insensitive' } },
        { description: { contains: querySearch, mode: 'insensitive' } },
        { farmer: { user: { name: { contains: querySearch, mode: 'insensitive' } } } },
        { fpo: { fpoName: { contains: querySearch, mode: 'insensitive' } } },
      ];
    }

    if (crop) {
      where.cropName = { equals: crop, mode: 'insensitive' };
    }

    if (category && category.toUpperCase() !== 'ALL') {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (activeGrade && activeGrade.toUpperCase() !== 'ALL') {
      where.qualityGrade = activeGrade;
    }

    if (isOrganic === 'true' || isOrganic === true) {
      where.isOrganic = true;
    }

    if (district && district.toUpperCase() !== 'ALL') {
      where.district = { contains: district, mode: 'insensitive' };
    }

    if (state && state.toUpperCase() !== 'ALL') {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (supplierId) {
      where.OR = [
        { farmerId: supplierId },
        { fpoId: supplierId },
      ];
    } else if (fpoId) {
      where.fpoId = fpoId;
    }

    // Price range filters
    if (minPrice || maxPrice) {
      where.askingPricePerKg = {};
      if (minPrice && !isNaN(minPrice)) where.askingPricePerKg.gte = parseFloat(minPrice);
      if (maxPrice && !isNaN(maxPrice)) where.askingPricePerKg.lte = parseFloat(maxPrice);
    }

    // Minimum quantity filter
    if (minQuantity && !isNaN(minQuantity)) {
      where.totalQuantityKg = { gte: parseFloat(minQuantity) };
    }

    // Sorting
    let orderBy = { createdAt: 'desc' };
    if (activeSort === 'price_asc') orderBy = { askingPricePerKg: 'asc' };
    else if (activeSort === 'price_desc') orderBy = { askingPricePerKg: 'desc' };
    else if (activeSort === 'qty_desc') orderBy = { totalQuantityKg: 'desc' };
    else if (activeSort === 'harvest_recent') orderBy = { harvestDate: 'desc' };
    else if (activeSort === 'recent') orderBy = { createdAt: 'desc' };

    const [total, listings] = await Promise.all([
      prisma.produceListing.count({ where }),
      prisma.produceListing.findMany({
        where,
        orderBy,
        skip,
        take: pageLimit,
        include: {
          farmer: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          fpo: {
            select: {
              id: true,
              fpoName: true,
              registrationNo: true,
              district: true,
              state: true,
              memberCount: true,
              registrationCertVerified: true,
            },
          },
        },
      }),
    ]);

    let formatted = listings.map(formatListing);

    // Filter by availability in memory if specified
    if (availability === 'IN_STOCK') {
      formatted = formatted.filter((p) => p.stockStatus === 'IN_STOCK');
    } else if (availability === 'LOW_STOCK') {
      formatted = formatted.filter((p) => p.stockStatus === 'LOW_STOCK');
    }

    const totalPages = Math.ceil(total / pageLimit) || 1;

    // Distinct locations for filter sidebar dropdown
    const districts = await prisma.produceListing.findMany({
      where: { status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] } },
      select: { district: true },
      distinct: ['district'],
    });

    // Backward compatibility: If accessed via /api/marketplace/produce, return direct array
    if (req.path === '/produce' || req.originalUrl?.includes('/marketplace/produce')) {
      return sendSuccess(res, formatted, 200);
    }

    return sendSuccess(res, {
      products: formatted,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
      availableDistricts: districts.map((d) => d.district).filter(Boolean),
    }, 200);
  } catch (err) {
    logger.error('Error fetching marketplace products:', err);
    next(err);
  }
};

/**
 * GET /api/marketplace/products/:id & /api/buyer/marketplace/products/:id (and /produce/:id)
 * Detailed product view with related batches, harvest info, and supplier metadata.
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await prisma.produceListing.findUnique({
      where: { id },
      include: {
        farmer: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        fpo: {
          select: {
            id: true,
            fpoName: true,
            registrationNo: true,
            district: true,
            state: true,
            memberCount: true,
            registrationCertVerified: true,
          },
        },
      },
    });

    if (!listing) {
      return sendError(res, 'NOT_FOUND', 'Agricultural produce listing not found', 404);
    }

    const formatted = formatListing(listing);

    // Fetch related products (same category or same district, excluding self)
    const related = await prisma.produceListing.findMany({
      where: {
        id: { not: listing.id },
        status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
        OR: [
          { category: listing.category },
          { district: listing.district },
        ],
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        fpo: {
          select: {
            id: true,
            fpoName: true,
            district: true,
            state: true,
          },
        },
      },
    });

    const relatedFormatted = related.map(formatListing);

    return sendSuccess(res, {
      ...formatted,
      relatedProducts: relatedFormatted,
      relatedProduce: relatedFormatted,
    }, 200);
  } catch (err) {
    logger.error('Error fetching product by ID:', err);
    next(err);
  }
};

/**
 * GET /api/marketplace/search/suggestions & /api/buyer/marketplace/search/suggestions
 * Returns fast typeahead suggestions matching query string.
 */
const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const query = q.trim();

    if (!query || query.length < 2) {
      return sendSuccess(res, [], 200);
    }

    const [crops, districts] = await Promise.all([
      prisma.produceListing.findMany({
        where: {
          cropName: { contains: query, mode: 'insensitive' },
          status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
        },
        select: { cropName: true, category: true },
        distinct: ['cropName'],
        take: 6,
      }),
      prisma.produceListing.findMany({
        where: {
          district: { contains: query, mode: 'insensitive' },
          status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
        },
        select: { district: true, state: true },
        distinct: ['district'],
        take: 4,
      }),
    ]);

    const suggestions = [
      ...crops.map((c) => ({ type: 'crop', text: c.cropName, title: c.cropName, subtitle: c.category })),
      ...districts.map((d) => ({ type: 'district', text: d.district, title: d.district, subtitle: `${d.state} Mandi Hub` })),
    ];

    return sendSuccess(res, suggestions, 200);
  } catch (err) {
    logger.error('Error fetching search suggestions:', err);
    next(err);
  }
};

/**
 * GET /api/marketplace/suppliers/:supplierId & /api/buyer/marketplace/suppliers/:supplierId
 * Returns authorized public profile of an FPO or Farmer supplier.
 */
const getSupplierProfile = async (req, res, next) => {
  try {
    const { supplierId } = req.params;

    // Check if supplierId is an FPO
    const fpo = await prisma.fPOProfile.findFirst({
      where: {
        OR: [{ id: supplierId }, { userId: supplierId }],
      },
      select: {
        id: true,
        fpoName: true,
        registrationNo: true,
        memberCount: true,
        state: true,
        district: true,
        registrationCertVerified: true,
        createdAt: true,
      },
    });

    if (fpo) {
      const activeListingsCount = await prisma.produceListing.count({
        where: { fpoId: fpo.id, status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] } },
      });

      const commodities = await prisma.produceListing.findMany({
        where: { fpoId: fpo.id },
        select: { cropName: true },
        distinct: ['cropName'],
      });

      return sendSuccess(res, {
        id: fpo.id,
        supplierType: 'FPO',
        type: 'FPO',
        name: fpo.fpoName,
        registrationNo: fpo.registrationNo,
        registrationNumber: fpo.registrationNo,
        memberCount: fpo.memberCount || 0,
        district: fpo.district,
        state: fpo.state,
        verified: !!fpo.registrationCertVerified,
        isVerified: !!fpo.registrationCertVerified,
        verificationStatus: fpo.registrationCertVerified ? 'VERIFIED' : 'PENDING_AUDIT',
        supportedCrops: commodities.map((c) => c.cropName),
        activeListingsCount,
        description: `Farmer Producer Organization aggregating high-grade produce across ${fpo.district} agricultural clusters.`,
      }, 200);
    }

    // Check if supplierId is a Farmer
    const farmer = await prisma.farmerProfile.findFirst({
      where: {
        OR: [{ id: supplierId }, { userId: supplierId }],
      },
      select: {
        id: true,
        state: true,
        district: true,
        village: true,
        landSizeAcres: true,
        produceTypes: true,
        aadhaarVerified: true,
        bankAccountVerified: true,
        createdAt: true,
        user: { select: { name: true } },
        fpo: { select: { id: true, fpoName: true } },
      },
    });

    if (farmer) {
      const activeListingsCount = await prisma.produceListing.count({
        where: { farmerId: farmer.id, status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] } },
      });

      return sendSuccess(res, {
        id: farmer.id,
        supplierType: 'FARMER',
        type: 'FARMER',
        name: farmer.user?.name || 'Verified Farmer',
        district: farmer.district,
        state: farmer.state,
        village: farmer.village || null,
        landSizeAcres: farmer.landSizeAcres,
        acreage: farmer.landSizeAcres,
        supportedCrops: farmer.produceTypes || [],
        verified: !!farmer.aadhaarVerified,
        isVerified: !!farmer.aadhaarVerified,
        verificationStatus: farmer.aadhaarVerified ? 'VERIFIED' : 'PENDING_AUDIT',
        fpo: farmer.fpo ? { id: farmer.fpo.id, name: farmer.fpo.fpoName } : null,
        activeListingsCount,
        description: `Direct farm gate producer operating in ${farmer.district}. Verified through anti-exploitation direct sourcing.`,
      }, 200);
    }

    return sendError(res, 'NOT_FOUND', 'Supplier profile not found', 404);
  } catch (err) {
    logger.error('Error fetching supplier profile:', err);
    next(err);
  }
};

/**
 * GET /api/marketplace/suppliers/:supplierId/products
 * Returns active produce listings belonging to a specific supplier.
 */
const getSupplierProducts = async (req, res, next) => {
  try {
    const { supplierId } = req.params;

    const where = {
      status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
      OR: [
        { fpoId: supplierId },
        { farmerId: supplierId },
      ],
    };

    const listings = await prisma.produceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        fpo: {
          select: {
            id: true,
            fpoName: true,
            district: true,
            state: true,
          },
        },
      },
    });

    return sendSuccess(res, listings.map(formatListing), 200);
  } catch (err) {
    logger.error('Error fetching supplier products:', err);
    next(err);
  }
};

/**
 * GET /api/marketplace/stats
 * Quick summary stats for the marketplace header ticker.
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
      totalAvailableKg: aggregates._sum.totalQuantityKg || 0,
      avgAskingPricePerKg: Math.round((aggregates._avg.askingPricePerKg || 0) * 100) / 100,
      directSavingsPercent: 14.5,
      avgMandiSavingsPercent: 14.5,
    }, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  getProducts,
  getProductById,
  getSearchSuggestions,
  getSupplierProfile,
  getSupplierProducts,
  getMarketplaceStats,
  // Backward compatibility aliases
  getProduceListings: getProducts,
  getProduceListingById: getProductById,
};
