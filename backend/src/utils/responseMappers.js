/**
 * SasyaVahini — Response Mappers & Sensitive Data Scrubbing
 *
 * Prevents data leaks by producing strictly tailored response envelopes
 * based on the caller's role (BUYER, DRIVER/LOGISTICS, ADMIN).
 *
 * Enforces:
 * - Redaction of bank account numbers, IFSC, PAN, Aadhaar, and DL credentials from public/buyer views
 * - Hiding delivery OTP from drivers and public viewers (accessible ONLY by buyer)
 * - Restricting statutory compliance documents to admins and owning transport partners
 *
 * Owner: Member 4
 */

/**
 * Mask sensitive string leaving only last N characters visible.
 * e.g., "123456789012" -> "********9012"
 */
function maskString(str, visibleChars = 4) {
  if (!str || typeof str !== 'string') return '';
  const clean = str.trim();
  if (clean.length <= visibleChars) return clean;
  return '*'.repeat(clean.length - visibleChars) + clean.slice(-visibleChars);
}

/**
 * Buyer view of a shipment:
 * Detailed operational and tracking view, including deliveryOtp ONLY if buyer owns the order.
 * Sensitive transporter KYC, statutory vehicle documents, and commercial margins are stripped.
 */
function toBuyerView(shipment, isOwner = false) {
  if (!shipment) return null;

  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    orderId: shipment.orderId,
    status: shipment.status,
    totalWeightKg: shipment.totalWeightKg,
    totalDistanceKm: shipment.totalDistanceKm,
    estimatedMinutes: shipment.estimatedMinutes,
    currentLocation: shipment.currentLocation || null,
    coldChain: shipment.coldChain || null,
    routeGeometry: shipment.routeGeometry || shipment.routeGeometryJson || null,
    stops: (shipment.stops || []).map((s) => ({
      id: s.id,
      sequence: s.sequence,
      stopName: s.stopName,
      stopType: s.stopType,
      quantityKg: s.quantityKg,
      grade: s.grade,
      status: s.status,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    vehicle: {
      vehicleNumber: shipment.vehicleNumber || shipment.vehicle?.vehicleNumber || null,
      driverName: shipment.driverName || shipment.vehicle?.driverName || null,
      driverPhone: shipment.driverPhone || shipment.vehicle?.driverPhone || null,
    },
    savings: {
      baselineKm: shipment.baselineDistanceKm,
      optimizedKm: shipment.totalDistanceKm,
      savedKm: shipment.savedDistanceKm,
      fuelSavedRs: shipment.estimatedFuelSavedRs,
    },
    // Delivery OTP returned ONLY to authenticated buyer owning the order
    ...(isOwner && shipment.deliveryOtp ? { deliveryOtp: shipment.deliveryOtp } : {}),
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
  };
}

/**
 * Driver / Logistics partner view of a shipment:
 * Route waypoints, pickup coordinates, contact phone numbers, navigation, and driver net payout.
 * Delivery OTP and buyer/farmer financial margins are strictly redacted.
 */
function toDriverView(shipment) {
  if (!shipment) return null;

  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    orderId: shipment.orderId,
    status: shipment.status,
    totalWeightKg: shipment.totalWeightKg,
    totalDistanceKm: shipment.totalDistanceKm,
    estimatedMinutes: shipment.estimatedMinutes,
    currentLocation: shipment.currentLocation || null,
    coldChain: shipment.coldChain || null,
    routeGeometry: shipment.routeGeometry || shipment.routeGeometryJson || null,
    stops: (shipment.stops || []).map((s) => ({
      id: s.id,
      sequence: s.sequence,
      stopName: s.stopName,
      stopType: s.stopType,
      quantityKg: s.quantityKg,
      grade: s.grade,
      status: s.status,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      farmerPhone: s.farmerPhone || s.phone || null,
    })),
    vehicle: {
      vehicleId: shipment.vehicleId,
      vehicleNumber: shipment.vehicleNumber,
      driverName: shipment.driverName,
      driverPhone: shipment.driverPhone,
    },
    payout: {
      legPayoutRs: shipment.legPayoutRs || null,
      plannedFuelLitres: shipment.plannedFuelLitres || null,
      fuelCostRs: shipment.plannedCostRs || null,
    },
    // Note: deliveryOtp is NEVER exposed to driver
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
  };
}

/**
 * Administrator view: full audit envelope with all fields intact.
 */
function toAdminView(shipment) {
  if (!shipment) return null;
  return { ...shipment };
}

/**
 * Public/Operational view of a commercial vehicle.
 * Redacts statutory compliance docs, chassis, PAN, and bank details for non-admin/non-owner callers.
 */
function toVehicleView(vehicle, user = null) {
  if (!vehicle) return null;

  const isAdmin = user?.role === 'ADMIN';
  const isOwner = user?.role === 'LOGISTICS' && (vehicle.logisticsId === user.id || vehicle.logistics?.userId === user.id);

  if (isAdmin || isOwner) {
    return { ...vehicle };
  }

  // Public/Buyer/Farmer sanitized view
  return {
    id: vehicle.id,
    vehicleNumber: vehicle.vehicleNumber,
    vehicleType: vehicle.vehicleType,
    capacityKg: vehicle.capacityKg,
    driverName: vehicle.driverName,
    driverPhone: vehicle.driverPhone,
    status: vehicle.status,
    verificationStatus: vehicle.verificationStatus,
    currentLatitude: vehicle.currentLatitude,
    currentLongitude: vehicle.currentLongitude,
    lastLocationAt: vehicle.lastLocationAt,
  };
}

/**
 * Sanitized Logistics Profile view.
 * Masks bank account number and PAN unless viewer is admin or owner.
 */
function toProfileView(profile, user = null) {
  if (!profile) return null;

  const isAdmin = user?.role === 'ADMIN';
  const isOwner = profile.userId === user?.id;

  if (isAdmin || isOwner) {
    return { ...profile };
  }

  return {
    id: profile.id,
    organizationName: profile.organizationName,
    businessType: profile.businessType,
    city: profile.city,
    state: profile.state,
    verificationStatus: profile.verificationStatus,
  };
}

module.exports = {
  maskString,
  toBuyerView,
  toDriverView,
  toAdminView,
  toVehicleView,
  toProfileView,
};
