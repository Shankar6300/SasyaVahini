/**
 * SasyaVahini — Buyer Shopping Cart & Checkout Controller (Phase 5)
 *
 * Implements authoritative server-side cart operations, inventory & MOQ validation,
 * supplier-wise grouping, delivery calculation, and checkout preparation.
 *
 * SIH 2026 Problem Statement 26033 (DoCA)
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

const prisma = require('../lib/prisma');
const { estimatedRoadKm } = require('../utils/geo');
const logisticsConfig = require('../config/logistics.config');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// District centroid coordinates for accurate logistics calculation
const DISTRICT_CENTROIDS = {
  pune: { lat: 18.5204, lng: 73.8567 },
  solapur: { lat: 17.6599, lng: 75.9064 },
  ratnagiri: { lat: 16.9902, lng: 73.312 },
  latur: { lat: 18.4088, lng: 76.5604 },
  sangli: { lat: 16.8524, lng: 74.5815 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  satara: { lat: 17.6805, lng: 74.0183 },
  ahmednagar: { lat: 19.0952, lng: 74.7496 },
};

function getMoqKg(listing, buyerType = 'INDIVIDUAL') {
  if (buyerType === 'BUSINESS') {
    return listing.totalQuantityKg >= 1000 ? 100 : 50;
  }
  const cat = (listing.category || '').toLowerCase();
  if (cat.includes('grain') || cat.includes('pulse')) return 10;
  return 5;
}

function getListingCoordinates(listing) {
  if (listing.latitude && listing.longitude) {
    return { lat: listing.latitude, lng: listing.longitude };
  }
  const dist = (listing.district || '').toLowerCase().trim();
  if (DISTRICT_CENTROIDS[dist]) {
    return DISTRICT_CENTROIDS[dist];
  }
  return DISTRICT_CENTROIDS.pune;
}

function calculateEstimatedDelivery(listing, quantityKg = 100, destLat, destLng) {
  const origin = getListingCoordinates(listing);
  const destination = {
    lat: destLat !== undefined && destLat !== null && !isNaN(Number(destLat))
      ? Number(destLat)
      : DISTRICT_CENTROIDS.pune.lat,
    lng: destLng !== undefined && destLng !== null && !isNaN(Number(destLng))
      ? Number(destLng)
      : DISTRICT_CENTROIDS.pune.lng,
  };

  const roadKm = estimatedRoadKm(origin.lat, origin.lng, destination.lat, destination.lng);

  let vehicle = logisticsConfig.vehicleTypes.TEMPO;
  if (quantityKg > 3000) {
    vehicle = logisticsConfig.vehicleTypes.TRUCK;
  } else if (quantityKg > 1500) {
    vehicle = logisticsConfig.vehicleTypes.MINI_TRUCK;
  }

  let cost = roadKm <= 10
    ? Math.round(vehicle.baseFare * 0.5)
    : Math.round(vehicle.baseFare + roadKm * vehicle.perKmRate);

  if (cost < 150) cost = 150;

  const transitHours = Math.max(1, Math.round(roadKm / 40));
  let estimatedTimeWindow = 'Same Day Delivery';
  if (roadKm > 200) {
    estimatedTimeWindow = 'Within 48 Hours';
  } else if (roadKm > 60) {
    estimatedTimeWindow = 'Next Day Morning';
  }

  return {
    roadKm: Math.round(roadKm),
    deliveryCost: cost,
    transitHours,
    estimatedTimeWindow,
    vehicleType: vehicle.label || 'Standard Ag-Tempo',
    isReliableData: true,
  };
}

/**
 * Format raw cart into rich supplier-grouped response
 */
function formatCartResponse(cart, buyerType = 'INDIVIDUAL') {
  const items = cart.items || [];
  const supplierMap = new Map();

  let totalQuantityKg = 0;
  let productSubtotal = 0;
  let allValid = true;
  const validationIssues = [];

  for (const item of items) {
    const l = item.listing;
    const availableQtyKg = Math.max(0, l.totalQuantityKg - (l.reservedQty || 0) - (l.soldQty || 0));
    const moqKg = getMoqKg(l, buyerType);
    const itemSubtotal = Math.round(l.askingPricePerKg * item.quantityKg * 100) / 100;

    const isActive = l.status === 'AVAILABLE' || l.status === 'PARTIALLY_RESERVED';
    const isStockSufficient = item.quantityKg <= availableQtyKg;
    const meetsMoq = item.quantityKg >= moqKg;

    const itemValid = isActive && isStockSufficient && meetsMoq;
    if (!itemValid) allValid = false;

    if (!isActive) {
      validationIssues.push({
        itemId: item.id,
        listingId: l.id,
        cropName: l.cropName,
        issue: 'LISTING_INACTIVE',
        message: `"${l.cropName}" is no longer active in the marketplace.`,
      });
    } else if (!isStockSufficient) {
      validationIssues.push({
        itemId: item.id,
        listingId: l.id,
        cropName: l.cropName,
        issue: 'INSUFFICIENT_STOCK',
        message: `Only ${availableQtyKg} kg of "${l.cropName}" are currently available. Please adjust your quantity.`,
        availableQtyKg,
      });
    } else if (!meetsMoq) {
      validationIssues.push({
        itemId: item.id,
        listingId: l.id,
        cropName: l.cropName,
        issue: 'BELOW_MOQ',
        message: `Minimum order quantity for "${l.cropName}" is ${moqKg} kg for your buyer account type.`,
        moqKg,
      });
    }

    totalQuantityKg += item.quantityKg;
    productSubtotal += itemSubtotal;

    // Determine supplier attribution
    const supplierId = l.fpoId || l.farmerId;
    const supplierName = l.fpo?.name || l.farmer?.user?.name || 'Verified Supplier';
    const supplierType = l.fpoId ? 'FPO_PRODUCER_CO' : 'DIRECT_FARMER';
    const location = `${l.village ? l.village + ', ' : ''}${l.district}, ${l.state}`;

    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, {
        supplierId,
        supplierName,
        supplierType,
        location,
        registrationNo: l.fpo?.registrationNo || null,
        items: [],
        supplierSubtotal: 0,
        supplierQuantityKg: 0,
      });
    }

    const group = supplierMap.get(supplierId);
    group.items.push({
      id: item.id,
      listingId: l.id,
      cropName: l.cropName,
      category: l.category,
      qualityGrade: l.qualityGrade,
      isOrganic: l.isOrganic,
      imageUrl: l.imageUrl,
      unitPrice: l.askingPricePerKg,
      quantityKg: item.quantityKg,
      itemSubtotal,
      availableQtyKg,
      moqKg,
      status: l.status,
      isValid: itemValid,
      harvestDate: l.harvestDate,
    });
    group.supplierSubtotal = Math.round((group.supplierSubtotal + itemSubtotal) * 100) / 100;
    group.supplierQuantityKg = Math.round((group.supplierQuantityKg + item.quantityKg) * 100) / 100;
  }

  return {
    cartId: cart.id,
    buyerId: cart.buyerId,
    totalItems: items.length,
    totalQuantityKg: Math.round(totalQuantityKg * 100) / 100,
    productSubtotal: Math.round(productSubtotal * 100) / 100,
    allValid,
    validationIssues,
    supplierGroups: Array.from(supplierMap.values()),
    updatedAt: cart.updatedAt,
  };
}

/**
 * Ensure the authenticated user has an active buyer profile and cart
 */
async function getOrCreateBuyerCart(userId) {
  let buyerProfile = await prisma.buyerProfile.findUnique({
    where: { userId },
    include: {
      addresses: true,
      cart: {
        include: {
          items: {
            include: {
              listing: {
                include: {
                  farmer: { include: { user: true } },
                  fpo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!buyerProfile) {
    // Auto-create buyer profile if missing
    const user = await prisma.user.findUnique({ where: { id: userId } });
    buyerProfile = await prisma.buyerProfile.create({
      data: {
        userId,
        organizationName: user?.name || 'Individual Buyer',
        buyerType: 'Individual',
      },
      include: {
        addresses: true,
        cart: {
          include: {
            items: {
              include: {
                listing: {
                  include: {
                    farmer: { include: { user: true } },
                    fpo: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  if (!buyerProfile.cart) {
    const newCart = await prisma.cart.create({
      data: { buyerId: buyerProfile.id },
      include: {
        items: {
          include: {
            listing: {
              include: {
                farmer: { include: { user: true } },
                fpo: true,
              },
            },
          },
        },
      },
    });
    buyerProfile.cart = newCart;
  }

  return buyerProfile;
}

// ── 1. GET /api/buyer/cart ───────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const buyerProfile = await getOrCreateBuyerCart(req.user.id);
    const cart = buyerProfile.cart;
    const formatted = formatCartResponse(cart, buyerProfile.buyerType);
    return sendSuccess(res, formatted);
  } catch (err) {
    logger.error('Error fetching buyer cart:', err);
    next(err);
  }
};

// ── 2. POST /api/buyer/cart/items ───────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const { listingId, quantityKg } = req.body;

    if (!listingId) {
      return sendError(res, 'VALIDATION_ERROR', 'listingId is required.', 422);
    }

    const qty = parseFloat(quantityKg);
    if (isNaN(qty) || qty <= 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Quantity must be a positive number greater than 0 kg.', 422);
    }

    const buyerProfile = await getOrCreateBuyerCart(req.user.id);
    const cart = buyerProfile.cart;

    // Verify listing
    const listing = await prisma.produceListing.findUnique({
      where: { id: listingId },
      include: { farmer: { include: { user: true } }, fpo: true },
    });

    if (!listing) {
      return sendError(res, 'NOT_FOUND', 'Agricultural produce listing not found.', 404);
    }

    if (listing.status !== 'AVAILABLE' && listing.status !== 'PARTIALLY_RESERVED') {
      return sendError(res, 'LISTING_UNAVAILABLE', `Listing "${listing.cropName}" is currently ${listing.status.toLowerCase()} and cannot be added.`, 400);
    }

    const availableQtyKg = Math.max(0, listing.totalQuantityKg - (listing.reservedQty || 0) - (listing.soldQty || 0));
    const moqKg = getMoqKg(listing, buyerProfile.buyerType);

    // Check existing item in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_listingId: { cartId: cart.id, listingId },
      },
    });

    const targetQty = existingItem ? Math.round((existingItem.quantityKg + qty) * 100) / 100 : qty;

    if (targetQty < moqKg) {
      return sendError(res, 'BELOW_MOQ', `Minimum order quantity is ${moqKg} kg for ${listing.cropName}.`, 422);
    }

    if (targetQty > availableQtyKg) {
      return sendError(res, 'INSUFFICIENT_STOCK', `Requested quantity (${targetQty} kg) exceeds available stock (${availableQtyKg} kg).`, 422);
    }

    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantityKg: targetQty },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          listingId,
          quantityKg: qty,
        },
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            listing: {
              include: { farmer: { include: { user: true } }, fpo: true },
            },
          },
        },
      },
    });

    const formatted = formatCartResponse(updatedCart, buyerProfile.buyerType);
    return sendSuccess(res, {
      message: `Added ${qty} kg of ${listing.cropName} to your cart.`,
      item: cartItem,
      cart: formatted,
    }, 201);
  } catch (err) {
    logger.error('Error adding to cart:', err);
    next(err);
  }
};

// ── 3. PATCH /api/buyer/cart/items/:itemId ──────────────────────────────────
const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantityKg } = req.body;

    const qty = parseFloat(quantityKg);
    if (isNaN(qty) || qty <= 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Quantity must be a positive number greater than 0 kg.', 422);
    }

    const buyerProfile = await getOrCreateBuyerCart(req.user.id);
    const cart = buyerProfile.cart;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { listing: true },
    });

    if (!item || item.cartId !== cart.id) {
      return sendError(res, 'NOT_FOUND', 'Cart item not found in your cart.', 404);
    }

    const listing = item.listing;
    const availableQtyKg = Math.max(0, listing.totalQuantityKg - (listing.reservedQty || 0) - (listing.soldQty || 0));
    const moqKg = getMoqKg(listing, buyerProfile.buyerType);

    if (qty < moqKg) {
      return sendError(res, 'BELOW_MOQ', `Minimum order quantity is ${moqKg} kg for ${listing.cropName}.`, 422);
    }

    if (qty > availableQtyKg) {
      return sendError(res, 'INSUFFICIENT_STOCK', `Only ${availableQtyKg} kg of ${listing.cropName} are currently available.`, 422);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantityKg: qty },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            listing: {
              include: { farmer: { include: { user: true } }, fpo: true },
            },
          },
        },
      },
    });

    const formatted = formatCartResponse(updatedCart, buyerProfile.buyerType);
    return sendSuccess(res, {
      message: `Updated ${listing.cropName} quantity to ${qty} kg.`,
      cart: formatted,
    });
  } catch (err) {
    logger.error('Error updating cart item:', err);
    next(err);
  }
};

// ── 4. DELETE /api/buyer/cart/items/:itemId ─────────────────────────────────
const removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const buyerProfile = await getOrCreateBuyerCart(req.user.id);
    const cart = buyerProfile.cart;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      return sendError(res, 'NOT_FOUND', 'Cart item not found in your cart.', 404);
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            listing: {
              include: { farmer: { include: { user: true } }, fpo: true },
            },
          },
        },
      },
    });

    const formatted = formatCartResponse(updatedCart, buyerProfile.buyerType);
    return sendSuccess(res, {
      message: 'Item removed from cart.',
      cart: formatted,
    });
  } catch (err) {
    logger.error('Error removing cart item:', err);
    next(err);
  }
};

// ── 5. DELETE /api/buyer/cart ───────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    const buyerProfile = await getOrCreateBuyerCart(req.user.id);
    const cart = buyerProfile.cart;

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return sendSuccess(res, {
      message: 'Shopping cart cleared.',
      cart: {
        cartId: cart.id,
        buyerId: cart.buyerId,
        totalItems: 0,
        totalQuantityKg: 0,
        productSubtotal: 0,
        allValid: true,
        validationIssues: [],
        supplierGroups: [],
      },
    });
  } catch (err) {
    logger.error('Error clearing cart:', err);
    next(err);
  }
};

// ── 6. POST /api/buyer/cart/validate ────────────────────────────────────────
const validateCart = async (req, res, next) => {
  try {
    const buyerProfile = await getOrCreateBuyerCart(req.user.id);
    const cart = buyerProfile.cart;
    const formatted = formatCartResponse(cart, buyerProfile.buyerType);

    return sendSuccess(res, {
      valid: formatted.allValid,
      issues: formatted.validationIssues,
      summary: {
        totalItems: formatted.totalItems,
        totalQuantityKg: formatted.totalQuantityKg,
        productSubtotal: formatted.productSubtotal,
      },
    });
  } catch (err) {
    logger.error('Error validating cart:', err);
    next(err);
  }
};

// ── 7. POST /api/buyer/checkout/summary ──────────────────────────────────────
const getCheckoutSummary = async (req, res, next) => {
  try {
    const { addressId } = req.body;
    const buyerProfile = await getOrCreateBuyerCart(req.user.id);
    const cart = buyerProfile.cart;

    if (!cart.items || cart.items.length === 0) {
      return sendError(res, 'EMPTY_CART', 'Your cart is empty. Please add agricultural produce before checkout.', 400);
    }

    const formattedCart = formatCartResponse(cart, buyerProfile.buyerType);
    if (!formattedCart.allValid) {
      return sendError(res, 'CART_VALIDATION_FAILED', 'Some items in your cart cannot be fulfilled. Please review stock and MOQ requirements.', 422, {
        issues: formattedCart.validationIssues,
      });
    }

    // Verify or find delivery address
    let selectedAddress = null;
    if (addressId) {
      selectedAddress = await prisma.buyerAddress.findFirst({
        where: { id: addressId, buyerId: buyerProfile.id },
      });
      if (!selectedAddress) {
        return sendError(res, 'INVALID_ADDRESS', 'The selected delivery address does not exist or does not belong to your account.', 404);
      }
    } else {
      // Find default address
      selectedAddress = await prisma.buyerAddress.findFirst({
        where: { buyerId: buyerProfile.id, isDefault: true },
      }) || await prisma.buyerAddress.findFirst({
        where: { buyerId: buyerProfile.id },
      });
    }

    // Calculate delivery and landed cost per supplier group
    let totalDeliveryCost = 0;
    let totalHandlingFee = 0;
    let totalPlatformFee = 0;
    const destLat = selectedAddress ? DISTRICT_CENTROIDS[(selectedAddress.city || selectedAddress.state || '').toLowerCase()]?.lat : null;
    const destLng = selectedAddress ? DISTRICT_CENTROIDS[(selectedAddress.city || selectedAddress.state || '').toLowerCase()]?.lng : null;

    const supplierCheckouts = [];

    for (const group of formattedCart.supplierGroups) {
      // Find representative listing from this group for logistics origin
      const firstItem = cart.items.find((i) => i.listing.fpoId === group.supplierId || i.listing.farmerId === group.supplierId);
      const repListing = firstItem ? firstItem.listing : cart.items[0].listing;

      const delivery = calculateEstimatedDelivery(repListing, group.supplierQuantityKg, destLat, destLng);
      const handlingFee = Math.round(group.supplierQuantityKg * (logisticsConfig.costing?.handlingFeePerKg || 0.50) * 100) / 100;
      const platformFee = Math.round(group.supplierSubtotal * (logisticsConfig.costing?.platformFeePct || 0.02) * 100) / 100;

      totalDeliveryCost += delivery.deliveryCost;
      totalHandlingFee += handlingFee;
      totalPlatformFee += platformFee;

      supplierCheckouts.push({
        ...group,
        delivery: {
          ...delivery,
          originLocation: `${repListing.village ? repListing.village + ', ' : ''}${repListing.district}`,
          destinationDistrict: selectedAddress ? `${selectedAddress.city}, ${selectedAddress.state}` : 'Pune Hub (Standard)',
        },
        handlingFee,
        platformFee,
        groupTotal: Math.round((group.supplierSubtotal + delivery.deliveryCost + handlingFee + platformFee) * 100) / 100,
      });
    }

    // 0% GST: Raw agricultural produce is exempt under Indian GST laws
    const taxes = 0;

    // Bulk discount incentive (3% for total batch >= 1,000 kg)
    const bulkDiscount = formattedCart.totalQuantityKg >= 1000
      ? Math.round(formattedCart.productSubtotal * 0.03 * 100) / 100
      : 0;

    const estimatedTotal = Math.round(
      (formattedCart.productSubtotal + totalDeliveryCost + totalHandlingFee + totalPlatformFee - bulkDiscount) * 100
    ) / 100;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    return sendSuccess(res, {
      checkoutStatus: 'READY_FOR_PAYMENT',
      nextPhaseNotice: 'Checkout preparation complete. Payment processing and escrow will be available in Phase 6.',
      buyer: {
        id: buyerProfile.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        buyerType: buyerProfile.buyerType,
        organizationName: buyerProfile.organizationName,
      },
      deliveryAddress: selectedAddress ? {
        id: selectedAddress.id,
        recipientName: selectedAddress.recipientName,
        contactNumber: selectedAddress.contactNumber,
        addressType: selectedAddress.addressType,
        addressLine1: selectedAddress.addressLine1,
        addressLine2: selectedAddress.addressLine2,
        city: selectedAddress.city,
        state: selectedAddress.state,
        postalCode: selectedAddress.postalCode,
        deliveryInstructions: selectedAddress.deliveryInstructions,
      } : null,
      savedAddressesCount: buyerProfile.addresses?.length || 0,
      itemsCount: formattedCart.totalItems,
      totalQuantityKg: formattedCart.totalQuantityKg,
      costBreakdown: {
        productSubtotal: formattedCart.productSubtotal,
        deliveryCost: Math.round(totalDeliveryCost * 100) / 100,
        handlingFee: Math.round(totalHandlingFee * 100) / 100,
        platformFee: Math.round(totalPlatformFee * 100) / 100,
        taxes,
        taxNotes: '0% GST — Raw agricultural produce is exempt under Indian GST schedules.',
        bulkDiscount,
        bulkDiscountApplied: bulkDiscount > 0,
        estimatedTotal,
      },
      supplierGroups: supplierCheckouts,
    });
  } catch (err) {
    logger.error('Error generating checkout summary:', err);
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateCart,
  getCheckoutSummary,
};
