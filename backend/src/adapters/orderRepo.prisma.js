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
        deliveryLatitude: order.deliveryLatitude || 18.5089, // Hadapsar fallback
        deliveryLongitude: order.deliveryLongitude || 73.9260,
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
        deliveryLatitude: o.deliveryLatitude || 18.5089,
        deliveryLongitude: o.deliveryLongitude || 73.9260,
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
