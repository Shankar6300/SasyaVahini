/**
 * SasyaVahini — Buyer Shopping Cart Context (Phase 5)
 *
 * Manages active cart items, supplier grouping, quantity updates,
 * server synchronization, and checkout preparation state.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';
import cartApi from '../services/cartApi';

const CartContext = createContext(null);

const STORAGE_KEY = 'sasyavahini_buyer_cart_cache_v1';

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast() || {};

  const [cart, setCart] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const cached = window.sessionStorage.getItem(STORAGE_KEY);
        return cached ? JSON.parse(cached) : null;
      }
    } catch {
      // ignore storage error
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state to sessionStorage for fast client navigation
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (cart) {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore
    }
  }, [cart]);

  // Load server-side cart when buyer is authenticated
  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'BUYER') return null;
    try {
      setIsLoading(true);
      setError(null);
      const data = await cartApi.getCart();
      setCart(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to sync cart with server.';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'BUYER') {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated, user?.role, refreshCart]);

  // Add produce to cart
  const addToCart = useCallback(
    async (productOrId, quantityKg = null) => {
      const listingId = typeof productOrId === 'string' ? productOrId : productOrId?.id;
      if (!listingId) return { success: false, message: 'Invalid produce listing.' };

      // Determine default MOQ if quantity not explicitly provided
      let qty = Number(quantityKg);
      if (!qty || qty <= 0) {
        const isBusiness = user?.buyerType === 'BUSINESS' || user?.buyerType === 'Wholesaler' || user?.buyerType === 'Supermarket';
        if (typeof productOrId === 'object' && productOrId) {
          const cat = (productOrId.category || '').toLowerCase();
          qty = isBusiness ? (productOrId.totalQuantityKg >= 1000 ? 100 : 50) : (cat.includes('grain') || cat.includes('pulse') ? 10 : 5);
        } else {
          qty = isBusiness ? 50 : 10;
        }
      }

      try {
        setIsLoading(true);
        const res = await cartApi.addToCart(listingId, qty);
        if (res?.cart) {
          setCart(res.cart);
        } else {
          await refreshCart();
        }
        const successMsg = res?.message || `Added ${qty} kg to your procurement cart.`;
        if (addToast) addToast(successMsg, 'success');
        return { success: true, message: successMsg, cart: res?.cart };
      } catch (err) {
        const errorData = err.response?.data?.error;
        const msg = errorData?.message || 'Could not add produce to cart. Please check available stock.';
        if (addToast) addToast(msg, 'error');
        return { success: false, message: msg, error: errorData };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshCart, addToast, user?.buyerType]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (itemId, quantityKg) => {
      const qty = Number(quantityKg);
      if (!itemId || isNaN(qty) || qty <= 0) {
        return { success: false, message: 'Invalid quantity.' };
      }

      try {
        setIsLoading(true);
        const res = await cartApi.updateQuantity(itemId, qty);
        if (res?.cart) {
          setCart(res.cart);
        } else {
          await refreshCart();
        }
        if (addToast) addToast(res?.message || `Quantity updated to ${qty} kg.`, 'info');
        return { success: true, message: res?.message, cart: res?.cart };
      } catch (err) {
        const msg = err.response?.data?.error?.message || 'Failed to update quantity.';
        if (addToast) addToast(msg, 'error');
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshCart, addToast]
  );

  // Remove item
  const removeFromCart = useCallback(
    async (itemId) => {
      if (!itemId) return { success: false };
      try {
        setIsLoading(true);
        const res = await cartApi.removeItem(itemId);
        if (res?.cart) {
          setCart(res.cart);
        } else {
          await refreshCart();
        }
        if (addToast) addToast('Item removed from cart.', 'info');
        return { success: true };
      } catch (err) {
        const msg = err.response?.data?.error?.message || 'Failed to remove item.';
        if (addToast) addToast(msg, 'error');
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshCart, addToast]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    try {
      setIsLoading(true);
      await cartApi.clearCart();
      setCart({
        totalItems: 0,
        totalQuantityKg: 0,
        productSubtotal: 0,
        supplierGroups: [],
        allValid: true,
        validationIssues: [],
      });
      if (addToast) addToast('Procurement cart cleared.', 'info');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to clear cart.';
      if (addToast) addToast(msg, 'error');
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Revalidate cart
  const validateCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await cartApi.validateCart();
      return res;
    } catch (err) {
      return { valid: false, issues: [{ message: 'Validation request failed.' }] };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cartCount = useMemo(() => cart?.totalItems || 0, [cart?.totalItems]);

  const value = useMemo(
    () => ({
      cart,
      cartCount,
      isLoading,
      error,
      refreshCart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      validateCart,
    }),
    [cart, cartCount, isLoading, error, refreshCart, addToCart, updateQuantity, removeFromCart, clearCart, validateCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Resilient hook to access cart context.
 * Falls back to a safe no-op object if rendered outside CartProvider (e.g., in unit tests).
 */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      cart: null,
      cartCount: 0,
      isLoading: false,
      error: null,
      refreshCart: async () => null,
      addToCart: async () => ({ success: false, message: 'Cart unavailable' }),
      updateQuantity: async () => ({ success: false }),
      removeFromCart: async () => ({ success: false }),
      clearCart: async () => ({ success: false }),
      validateCart: async () => ({ valid: true, issues: [] }),
    };
  }
  return ctx;
}

export default CartContext;
