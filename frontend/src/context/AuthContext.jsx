/**
 * SasyaVahini — Auth Context & Provider
 *
 * Provides authentication state and actions to the entire React tree.
 * 
 * Usage:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  getStoredUser,
  getAccessToken,
  setTokens,
  setStoredUser,
  clearSession,
  getRefreshToken,
} from '../services/auth.storage';

// ─── State & Actions ──────────────────────────────────────────────────────
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true while restoring session on app start
  error: null,
};

const AUTH_ACTIONS = {
  RESTORE_START:  'RESTORE_START',
  RESTORE_DONE:   'RESTORE_DONE',
  LOGIN_SUCCESS:  'LOGIN_SUCCESS',
  LOGOUT:         'LOGOUT',
  SET_ERROR:      'SET_ERROR',
  CLEAR_ERROR:    'CLEAR_ERROR',
};

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.RESTORE_START:
      return { ...state, isLoading: true };
    case AUTH_ACTIONS.RESTORE_DONE:
      return { ...state, isLoading: false, user: action.payload, isAuthenticated: !!action.payload };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return { ...state, user: action.payload, isAuthenticated: true, error: null, isLoading: false };
    case AUTH_ACTIONS.LOGOUT:
      return { ...initialState, isLoading: false };
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session from stored tokens on app load
  useEffect(() => {
    const restoreSession = async () => {
      dispatch({ type: AUTH_ACTIONS.RESTORE_START });
      const storedUser = getStoredUser();
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (storedUser && (accessToken || refreshToken)) {
        // If access token exists, validate it with /me
        try {
          const { data } = await api.get('/auth/me');
          dispatch({ type: AUTH_ACTIONS.RESTORE_DONE, payload: data.data });
        } catch {
          // Access token invalid — clearSession is handled by api interceptor
          dispatch({ type: AUTH_ACTIONS.RESTORE_DONE, payload: null });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.RESTORE_DONE, payload: null });
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = data.data;
      setTokens(accessToken, refreshToken);
      setStoredUser(user);
      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: user });
      return user;
    } catch (err) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: err.message });
      throw err;
    }
  }, []);

  const register = useCallback(async (formData) => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    try {
      const { data } = await api.post('/auth/register', formData);
      return data.data.user;
    } catch (err) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: err.message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore logout API errors — clear locally regardless
    } finally {
      clearSession();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
