/**
 * SasyaVahini — Geodesic & Coordinate Utilities
 * Haversine formula for distance estimation with Indian road curvature factor.
 *
 * Owner: Member 4
 */

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two GPS coordinates in kilometers.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

/**
 * Estimates actual road distance by applying detour factor (default 1.3x)
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @param {number} [detourFactor=1.3]
 * @returns {number} Estimated road km
 */
const estimatedRoadKm = (lat1, lon1, lat2, lon2, detourFactor = 1.3) => {
  const direct = haversineKm(lat1, lon1, lat2, lon2);
  return Math.round(direct * detourFactor * 100) / 100;
};

module.exports = {
  haversineKm,
  estimatedRoadKm,
};
