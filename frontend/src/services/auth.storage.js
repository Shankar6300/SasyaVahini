/**
 * SasyaVahini — Auth Token Storage
 *
 * Access token: sessionStorage (cleared on tab close — more secure).
 * Refresh token: localStorage (persists across tabs/reloads for silent refresh).
 *
 * Do NOT store access tokens in localStorage — they persist after window close
 * and are accessible to XSS. sessionStorage is the preferred compromise.
 */

const ACCESS_KEY  = 'sv_access_token';
const REFRESH_KEY = 'sv_refresh_token';
const USER_KEY    = 'sv_user';
const PREVIEW_KEY = 'sv_logistics_preview';

export const getAccessToken  = () => sessionStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const getStoredUser   = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};

export const setTokens = (accessToken, refreshToken) => {
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const setStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const setPreviewSession = () => {
  sessionStorage.setItem(PREVIEW_KEY, 'true');
};

export const isPreviewSession = () => sessionStorage.getItem(PREVIEW_KEY) === 'true';

export const clearSession = () => {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(PREVIEW_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};
