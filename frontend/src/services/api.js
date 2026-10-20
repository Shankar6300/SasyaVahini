/**
 * SasyaVahini — Centralized Axios API Client
 *
 * Handles:
 *   - Base URL from VITE_API_BASE_URL env var
 *   - Authorization header injection on every request
 *   - Automatic token refresh on 401 (single retry)
 *   - Consistent error shape normalization
 *
 * Owner: Member 1 (shared infrastructure)
 * Usage: import api from '@/services/api'
 */

import axios from 'axios';
import { getAccessToken, setTokens, clearSession } from './auth.storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach access token ────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle 401, normalize errors ──────────────────
let isRefreshing = false;
let pendingRequests = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until token refresh completes
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('sv_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;

        setTokens(accessToken, newRefresh);

        // Resolve all pending requests
        pendingRequests.forEach(({ resolve }) => resolve(accessToken));
        pendingRequests = [];

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear session and redirect
        pendingRequests.forEach(({ reject }) => reject(new Error('Session expired')));
        pendingRequests = [];
        clearSession();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalize error shape
    const normalizedError = normalizeError(error);
    return Promise.reject(normalizedError);
  },
);

/**
 * Normalize API errors to a consistent shape:
 *   { message, code, status, details }
 */
function normalizeError(error) {
  if (error.response?.data?.error) {
    const { code, message, details } = error.response.data.error;
    const normalized = new Error(message || 'An error occurred');
    normalized.code = code;
    normalized.status = error.response.status;
    normalized.details = details;
    return normalized;
  }
  if (error.request) {
    const netError = new Error('Network error — check your connection');
    netError.code = 'NETWORK_ERROR';
    return netError;
  }
  return error;
}

export default api;
