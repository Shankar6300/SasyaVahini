/**
 * SasyaVahini — Buyer Shopping Cart & Checkout API Service (Phase 5)
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import api from './api';

export const cartApi = {
  /**
   * Fetch authenticated buyer's active cart with supplier-wise grouping
   */
  async getCart() {
    const res = await api.get('/buyer/cart');
    return res.data?.data;
  },

  /**
   * Add a produce listing to cart with requested quantity (kg)
   */
  async addToCart(listingId, quantityKg) {
    const res = await api.post('/buyer/cart/items', { listingId, quantityKg });
    return res.data?.data;
  },

  /**
   * Update quantity of a specific cart item
   */
  async updateQuantity(itemId, quantityKg) {
    const res = await api.patch(`/buyer/cart/items/${itemId}`, { quantityKg });
    return res.data?.data;
  },

  /**
   * Remove a single item from the cart
   */
  async removeItem(itemId) {
    const res = await api.delete(`/buyer/cart/items/${itemId}`);
    return res.data?.data;
  },

  /**
   * Clear all items in the cart
   */
  async clearCart() {
    const res = await api.delete('/buyer/cart');
    return res.data?.data;
  },

  /**
   * Authoritatively re-validate cart against current live inventory and prices
   */
  async validateCart() {
    const res = await api.post('/buyer/cart/validate');
    return res.data?.data;
  },

  /**
   * Retrieve authoritative checkout cost breakdown and review information
   * @param {string|null} addressId - Specific buyer saved address ID
   */
  async getCheckoutSummary(addressId = null) {
    const res = await api.post('/buyer/checkout/summary', { addressId });
    return res.data?.data;
  },
};

export default cartApi;
