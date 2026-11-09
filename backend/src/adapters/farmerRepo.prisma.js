/**
 * SasyaVahini — Prisma Farmer Repository
 * Reads farmer profile and computes reliability from verification and allocations.
 *
 * Owner: Member 4
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

class PrismaFarmerRepo {
  async getFarmerProfile(farmerId) {
    try {
      const farmer = await prisma.farmerProfile.findUnique({
        where: { id: farmerId },
        include: {
          user: true,
          allocations: true,
        },
      });
      if (!farmer) {
        return {
          id: farmerId,
          name: 'Registered Farmer',
          village: 'Pune Rural',
          district: 'Pune',
          latitude: 18.7606,
          longitude: 73.8636,
          reliabilityScore: 0.85,
        };
      }

      // Compute reliability based on KYC verification & accepted allocations
      let score = 0.80;
      if (farmer.aadhaarVerified) score += 0.08;
      if (farmer.bankAccountVerified) score += 0.07;
      if (farmer.allocations && farmer.allocations.length > 0) {
        const accepted = farmer.allocations.filter((a) => a.status === 'ACCEPTED').length;
        const ratio = accepted / farmer.allocations.length;
        score = Math.min(0.99, score * 0.7 + ratio * 0.3);
      }

      return {
        id: farmer.id,
        name: farmer.user?.name || 'Registered Farmer',
        village: farmer.village || 'Pune Rural',
        district: farmer.district || 'Pune',
        latitude: farmer.latitude || 18.7606,
        longitude: farmer.longitude || 73.8636,
        reliabilityScore: Math.round(score * 100) / 100,
      };
    } catch (err) {
      logger.error('PrismaFarmerRepo error', { error: err.message, farmerId });
      throw err;
    }
  }

  async getFarmerReliability(farmerId) {
    const profile = await this.getFarmerProfile(farmerId);
    return profile.reliabilityScore;
  }
}

module.exports = new PrismaFarmerRepo();
