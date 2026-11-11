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
  setPreviewSession,
  getPreviewPersona,
  setPreviewPersona,
} from '../services/auth.storage';

// ─── State & Actions ──────────────────────────────────────────────────────
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true while restoring session on app start
  error: null,
};

const PERSONA_USERS = {
  VEHICLE_OWNER: {
    id: 'dev-logistics-owner',
    name: 'Ramesh Patil',
    email: 'owner_7434@logistics.in',
    role: 'LOGISTICS',
    partnerType: 'VEHICLE_OWNER',
  },
  INDIVIDUAL_DRIVER: {
    id: 'dev-logistics-driver',
    name: 'Santosh Gaikwad',
    email: 'driver_5029@logistics.in',
    role: 'LOGISTICS',
    partnerType: 'INDIVIDUAL_DRIVER',
  },
  FLEET_OPERATOR: {
    id: 'dev-logistics-org',
    name: 'Sahyadri Agro Logistics Pvt Ltd',
    email: 'dispatch@sahyadrifleet.in',
    role: 'LOGISTICS',
    partnerType: 'FLEET_OPERATOR',
  },
};

const DEV_PREVIEW_USER = PERSONA_USERS.VEHICLE_OWNER;

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

  const previewLogin = useCallback((input = 'transporter@sasyavahini.in', customName = null) => {
    if (!import.meta.env.DEV) {
      throw new Error('Logistics preview is only available in development.');
    }
    let personaUser;
    if (typeof input === 'string' && input.includes('@')) {
      const emailPrefix = input.split('@')[0].replace(/[._-]/g, ' ');
      const cleanName = customName || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
      personaUser = {
        id: `usr_preview_${input.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: cleanName,
        email: input,
        role: 'LOGISTICS',
        partnerType: 'VEHICLE_OWNER',
      };
      setPreviewSession('VEHICLE_OWNER');
    } else {
      const persona = input || 'VEHICLE_OWNER';
      personaUser = PERSONA_USERS[persona] || PERSONA_USERS.VEHICLE_OWNER;
      setPreviewSession(persona);
    }
    setTokens('preview_access_token_dev', 'preview_refresh_token_dev');
    setStoredUser(personaUser);
    dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: personaUser });
    return personaUser;
  }, []);

  const switchPreviewPersona = useCallback((persona) => {
    const personaUser = PERSONA_USERS[persona] || PERSONA_USERS.VEHICLE_OWNER;
    setPreviewPersona(persona);
    dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: personaUser });
    return personaUser;
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
        previewLogin,
        switchPreviewPersona,
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
