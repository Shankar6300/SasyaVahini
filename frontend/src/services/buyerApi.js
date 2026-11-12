/**
 * SasyaVahini — Buyer Profile & Address API Client (Phase 2)
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import api from './api';

export const buyerApi = {
  // ── Profile ────────────────────────────────────────────────────────────────
  async getProfile() {
    const res = await api.get('/buyer/profile');
    return res.data.data;
  },

  async updateProfile(payload) {
    const res = await api.patch('/buyer/profile', payload);
    return res.data.data;
  },

  // ── Addresses ──────────────────────────────────────────────────────────────
  async getAddresses() {
    const res = await api.get('/buyer/addresses');
    return res.data.data;
  },

  async createAddress(addressData) {
    const res = await api.post('/buyer/addresses', addressData);
    return res.data.data;
  },

  async updateAddress(addressId, addressData) {
    const res = await api.patch(`/buyer/addresses/${addressId}`, addressData);
    return res.data.data;
  },

  async deleteAddress(addressId) {
    const res = await api.delete(`/buyer/addresses/${addressId}`);
    return res.data.data;
  },

  async setDefaultAddress(addressId) {
    const res = await api.patch(`/buyer/addresses/${addressId}/default`);
    return res.data.data;
  },

  // ── Account Settings & Preferences ─────────────────────────────────────────
  async getSettings() {
    const res = await api.get('/buyer/settings');
    return res.data.data;
  },

  async updateSettings(settingsData) {
    const res = await api.patch('/buyer/settings', settingsData);
    return res.data.data;
  },

  // ── Password Change ────────────────────────────────────────────────────────
  async changePassword(passwordData) {
    const res = await api.post('/buyer/change-password', passwordData);
    return res.data.data;
  },
};

export default buyerApi;
