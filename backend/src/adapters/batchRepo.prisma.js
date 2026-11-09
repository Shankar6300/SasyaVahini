/**
 * SasyaVahini — Prisma Produce Batch Repository
 * Real DB queries using the existing ProduceListing & FarmerProfile schema models.
 *
 * Owner: Member 4
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

class PrismaBatchRepo {
  /**
   * Find candidate produce listings by crop name
   * @param {string} crop
   * @returns {Promise<Array>}
   */
  async findCandidatesByCrop(crop) {
    try {
      const listings = await prisma.produceListing.findMany({
        where: {
          cropName: { equals: crop, mode: 'insensitive' },
          status: { in: ['AVAILABLE', 'PARTIALLY_RESERVED'] },
        },
        include: {
          farmer: {
            include: { user: true },
          },
        },
      });

      return listings
        .map((l) => {
          const availableQuantityKg = Math.max(0, l.totalQuantityKg - l.reservedQty - l.soldQty);
          // Derivation/fallback for coordinates
          const latitude = l.latitude || l.farmer?.latitude || 18.7606; // Fallback to Chakan centroid
          const longitude = l.longitude || l.farmer?.longitude || 73.8636;
          // Derived reliability: Aadhaar + Bank verified gives 0.92, else 0.85
          const verified = l.farmer?.aadhaarVerified && l.farmer?.bankAccountVerified;
          const farmerReliability = verified ? 0.92 : 0.85;

          return {
            id: l.id,
            farmerId: l.farmerId,
            farmerName: l.farmer?.user?.name || 'Local Farmer',
            cropName: l.cropName,
            category: l.category,
            qualityGrade: l.qualityGrade,
            totalQuantityKg: l.totalQuantityKg,
            availableQuantityKg,
            pricePerKg: l.askingPricePerKg,
            harvestDate: l.harvestDate ? l.harvestDate.toISOString() : new Date().toISOString(),
            state: l.state,
            district: l.district,
            village: l.village || l.farmer?.village || 'Pune Rural',
            latitude,
            longitude,
            farmerReliability,
            fpoId: l.fpoId,
          };
        })
        .filter((item) => item.availableQuantityKg > 0);
    } catch (err) {
      logger.error('PrismaBatchRepo error querying produce listings', { error: err.message });
      throw err;
    }
  }

  /**
   * Find single batch by ID
   * @param {string} batchId
   */
  async findById(batchId) {
    const l = await prisma.produceListing.findUnique({
      where: { id: batchId },
      include: { farmer: { include: { user: true } } },
    });
    if (!l) return null;

    const availableQuantityKg = Math.max(0, l.totalQuantityKg - l.reservedQty - l.soldQty);
    const latitude = l.latitude || l.farmer?.latitude || 18.7606;
    const longitude = l.longitude || l.farmer?.longitude || 73.8636;
    const verified = l.farmer?.aadhaarVerified && l.farmer?.bankAccountVerified;

    return {
      id: l.id,
      farmerId: l.farmerId,
      farmerName: l.farmer?.user?.name || 'Local Farmer',
      cropName: l.cropName,
      category: l.category,
      qualityGrade: l.qualityGrade,
      totalQuantityKg: l.totalQuantityKg,
      availableQuantityKg,
      pricePerKg: l.askingPricePerKg,
      harvestDate: l.harvestDate ? l.harvestDate.toISOString() : new Date().toISOString(),
      state: l.state,
      district: l.district,
      village: l.village || 'Pune Rural',
      latitude,
      longitude,
      farmerReliability: verified ? 0.92 : 0.85,
      fpoId: l.fpoId,
    };
  }
}

module.exports = new PrismaBatchRepo();
