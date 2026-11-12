/**
 * SasyaVahini — Marketplace Frontend API Service (Phase 3)
 *
 * Handles API calls to fetch verified farmer produce listings,
 * dynamic categories, product details with APMC mandi benchmarks,
 * search suggestions, and FPO/Farmer supplier profiles.
 *
 * Owner: Member 3 (Buyer & Marketplace Module)
 */

import api from './api';

export const marketplaceApi = {
  /**
   * Fetch dynamic categories with product counts and minimum price
   */
  async getCategories() {
    const res = await api.get('/marketplace/categories');
    return res.data?.data || [];
  },

  /**
   * Fetch agricultural produce catalog with multi-parameter filtering,
   * search, and sorting.
   *
   * @param {Object} params
   * @param {string} [params.search]
   * @param {string} [params.category]
   * @param {string} [params.qualityGrade]
   * @param {number} [params.minPrice]
   * @param {number} [params.maxPrice]
   * @param {boolean} [params.isOrganic]
   * @param {string} [params.state]
   * @param {string} [params.district]
   * @param {string} [params.availability] - 'IN_STOCK' | 'LOW_STOCK' | 'ALL'
   * @param {string} [params.sortBy] - 'price_asc' | 'price_desc' | 'qty_desc' | 'harvest_recent' | 'recent'
   * @param {number} [params.page]
   * @param {number} [params.limit]
   */
  async getProducts(params = {}) {
    const res = await api.get('/marketplace/products', { params });
    return res.data?.data || { products: [], pagination: {} };
  },

  /**
   * Fetch single product detail by ID with supplier metadata,
   * freshness index, and related produce lots.
   */
  async getProductById(id) {
    const res = await api.get(`/marketplace/products/${id}`);
    return res.data?.data;
  },

  /**
   * Fetch typeahead autocomplete suggestions across crops, categories, and districts.
   * @param {string} query
   */
  async getSearchSuggestions(query) {
    if (!query || query.trim().length < 2) return [];
    const res = await api.get('/marketplace/search/suggestions', { params: { q: query } });
    return res.data?.data || [];
  },

  /**
   * Fetch public supplier profile (FPO or Farmer) with verified badges
   * and trust metrics. Excludes private personally identifiable information.
   * @param {string} supplierId
   */
  async getSupplierProfile(supplierId) {
    const res = await api.get(`/marketplace/suppliers/${supplierId}`);
    return res.data?.data;
  },

  /**
   * Fetch active produce listings for a specific supplier
   * @param {string} supplierId
   * @param {Object} [params]
   */
  async getSupplierProducts(supplierId, params = {}) {
    const res = await api.get(`/marketplace/suppliers/${supplierId}/products`, { params });
    return res.data?.data || { products: [], pagination: {} };
  },

  /**
   * Fetch marketplace summary stats (active listings, total volume, direct farm savings)
   */
  async getMarketplaceStats() {
    const res = await api.get('/marketplace/stats');
    return res.data?.data || {};
  },

  
  /**
   * Phase 4: Fetch side-by-side comparison data for 2 to 4 selected produce listings.
   * @param {string[]|string} ids - Array of listing IDs or comma-separated string
   * @param {Object} [params] - Optional parameters: sampleQuantityKg, buyerType, destLat, destLng
   */
  async getComparisonData(ids, params = {}) {
    const idString = Array.isArray(ids) ? ids.join(',') : ids;
    const res = await api.get('/marketplace/compare', {
      params: { ids: idString, ...params },
    });
    return res.data?.data;
  },

  /**
   * Phase 4: Calculate auditable Total Landed Cost based on buyer procurement quantity.
   * @param {Object} payload
   * @param {string[]} payload.listingIds
   * @param {number} payload.quantityKg
   * @param {number} [payload.destLat]
   * @param {number} [payload.destLng]
   * @param {string} [payload.buyerType]
   */
  async calculateLandedCost(payload) {
    const res = await api.post('/marketplace/compare/calculate', payload);
    return res.data?.data;
  },

  /**
   * Phase 4: Fetch real Agmarknet historical price data for a crop corridor.
   * @param {string} crop
   */
  async getPriceHistory(crop) {
    const res = await api.get('/marketplace/compare/price-history', {
      params: { crop },
    });
    return res.data?.data;
  },

  /* ── Backward Compatibility Aliases for Phase 2 components ──────────── */
  async getProduceListings(params = {}) {
    const data = await this.getProducts(params);
    return data.products || [];
  },

  async getProduceListingById(id) {
    return this.getProductById(id);
  },
};

export default marketplaceApi;
