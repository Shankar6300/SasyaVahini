/**
 * SasyaVahini — Marketplace Frontend API Service
 *
 * Handles API calls to fetch verified farmer produce listings,
 * batch details, and market benchmarks.
 *
 * Owner: Member 3 (Buyer & Marketplace Module)
 */

import api from './api';

export const marketplaceApi = {
  /**
   * Fetch produce listings with optional filtering and sorting
   */
  async getProduceListings(params = {}) {
    const res = await api.get('/marketplace/produce', { params });
    return res.data?.data || [];
  },

  /**
   * Fetch single produce listing by ID
   */
  async getProduceListingById(id) {
    const res = await api.get(`/marketplace/produce/${id}`);
    return res.data?.data;
  },

  /**
   * Fetch marketplace summary stats
   */
  async getMarketplaceStats() {
    const res = await api.get('/marketplace/stats');
    return res.data?.data || {};
  },
};

export default marketplaceApi;
