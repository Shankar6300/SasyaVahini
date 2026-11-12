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
import { getAccessToken, setTokens, clearSession, isPreviewSession } from './auth.storage';

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

    if (error.response?.status === 401 && isPreviewSession()) {
      return Promise.reject(normalizeError(error));
    }

    // Do not attempt token refresh for authentication requests
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                           originalRequest?.url?.includes('/auth/register') ||
                           originalRequest?.url?.includes('/auth/refresh');

    const errCode = error.response?.data?.error?.code;
    const errMsg = String(error.response?.data?.error?.message || '');
    const hasRefreshToken = Boolean(localStorage.getItem('sv_refresh_token'));

    // Strictly detect if the HTTP 401 was caused by token expiration
    const isTokenExpired =
      errCode === 'TOKEN_EXPIRED' ||
      errMsg.toLowerCase().includes('token expired') ||
      errMsg.toLowerCase().includes('jwt expired') ||
      errMsg.toLowerCase().includes('access token expired');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint && hasRefreshToken && isTokenExpired) {
      if (isRefreshing) {
        // Queue this request until the ongoing token refresh completes (prevent concurrent refresh requests)
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then((token) => {
          originalRequest._retry = true;
          if (originalRequest.headers?.set) {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
          } else {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('sv_refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;

        setTokens(accessToken, newRefresh);

        // Resolve all pending concurrent requests with the new access token
        pendingRequests.forEach(({ resolve }) => resolve(accessToken));
        pendingRequests = [];

        if (originalRequest.headers?.set) {
          originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
        } else {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed — clear session and redirect only if on a protected route
        pendingRequests.forEach(({ reject }) => reject(new Error('Session expired. Please log in again.')));
        pendingRequests = [];
        clearSession();

        const isAuthMe = originalRequest?.url?.includes('/auth/me');
        const pathname = window.location.pathname;
        const isPublicPath = pathname === '/' ||
                             pathname.includes('/login') ||
                             pathname.includes('/register') ||
                             pathname.includes('/forgot-password') ||
                             pathname.includes('/reset-password');

        if (!isAuthMe && !isPublicPath) {
          if (pathname.startsWith('/buyer')) {
            window.location.href = '/buyer/login';
          } else if (pathname.startsWith('/logistics')) {
            window.location.href = '/logistics/login';
          } else {
            window.location.href = '/login';
          }
        }
        return Promise.reject(normalizeError(refreshErr || error));
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
