/**
 * SasyaVahini — Mock Order Repository
 *
 * Owner: Member 4
 */

const MOCK_ORDERS = [
  {
    id: 'ord_demo_101',
    orderNumber: 'SV-2026-00101',
    buyerId: 'buyer_freshbasket_01',
    buyerName: 'FreshBasket Supermarkets India',
    cropName: 'Tomato',
    totalQuantityKg: 2500,
    agreedPriceTotal: 62500,
    status: 'CONFIRMED',
    deliveryAddress: 'Hadapsar Wholesale Market Yard, Pune, Maharashtra 411028',
    deliveryLatitude: 18.5089,
    deliveryLongitude: 73.9260,
    scheduledDelivery: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord_demo_102',
    orderNumber: 'SV-2026-00102',
    buyerId: 'buyer_hotel_pune',
    buyerName: 'Grand Hyatt Pune',
    cropName: 'Onion',
    totalQuantityKg: 1500,
    agreedPriceTotal: 42000,
    status: 'CONFIRMED',
    deliveryAddress: 'Nagar Road, Kalyani Nagar, Pune 411006',
    deliveryLatitude: 18.5529,
    deliveryLongitude: 73.9015,
    scheduledDelivery: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

class MockOrderRepo {
  async findById(orderId) {
    return MOCK_ORDERS.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
  }

  async listConfirmedOrders() {
    return MOCK_ORDERS.filter((o) => o.status === 'CONFIRMED');
  }
}

module.exports = new MockOrderRepo();
