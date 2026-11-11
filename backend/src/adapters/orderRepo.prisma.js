/**
 * SasyaVahini — Prisma Order Repository
 * Reads orders and related buyer profile details using existing models.
 *
 * Owner: Member 4
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

class PrismaOrderRepo {
  async findById(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: { include: { user: true } },
          requirement: true,
        },
      });
      if (!order) return null;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        buyerId: order.buyerId,
        buyerName: order.buyer?.organizationName || order.buyer?.user?.name || 'Institutional Buyer',
        cropName: order.requirement?.cropName || 'Fresh Produce',
        totalQuantityKg: order.totalQuantityKg,
        agreedPriceTotal: order.agreedPriceTotal,
        status: order.status,
        deliveryAddress: order.deliveryAddress,
        // TODO: Member 1 (Buyer Lead) - buyer delivery coordinates must be populated via BuyerAddress model geocoding rather than logistics fallback
        deliveryLatitude: order.deliveryLatitude != null ? order.deliveryLatitude : null,
        deliveryLongitude: order.deliveryLongitude != null ? order.deliveryLongitude : null,
        scheduledDelivery: order.scheduledDelivery ? order.scheduledDelivery.toISOString() : null,
        createdAt: order.createdAt.toISOString(),
      };
    } catch (err) {
      logger.error('PrismaOrderRepo error', { error: err.message, orderId });
      throw err;
    }
  }

  async listConfirmedOrders() {
    try {
      const orders = await prisma.order.findMany({
        where: { status: 'CONFIRMED' },
        include: {
          buyer: { include: { user: true } },
          requirement: true,
        },
      });

      return orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        buyerId: o.buyerId,
        buyerName: o.buyer?.organizationName || o.buyer?.user?.name || 'Institutional Buyer',
        cropName: o.requirement?.cropName || 'Fresh Produce',
        totalQuantityKg: o.totalQuantityKg,
        agreedPriceTotal: o.agreedPriceTotal,
        status: o.status,
        deliveryAddress: o.deliveryAddress,
        // TODO: Member 1 (Buyer Lead) - buyer delivery coordinates must be populated via BuyerAddress model geocoding rather than logistics fallback
        deliveryLatitude: o.deliveryLatitude != null ? o.deliveryLatitude : null,
        deliveryLongitude: o.deliveryLongitude != null ? o.deliveryLongitude : null,
        scheduledDelivery: o.scheduledDelivery ? o.scheduledDelivery.toISOString() : null,
        createdAt: o.createdAt.toISOString(),
      }));
    } catch (err) {
      logger.error('PrismaOrderRepo error listing confirmed orders', { error: err.message });
      throw err;
    }
  }
}

module.exports = new PrismaOrderRepo();
