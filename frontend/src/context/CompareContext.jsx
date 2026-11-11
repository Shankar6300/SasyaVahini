/**
 * SasyaVahini — Agricultural Produce Comparison Context (Phase 4)
 *
 * Manages the state of buyer comparison tray across marketplace cards,
 * product detail pages, and the dedicated comparison dashboard.
 *
 * Rules:
 * - 2 to 4 listings can be actively compared.
 * - Prevents duplicates.
 * - Synchronizes with browser sessionStorage.
 * - Alerts on commodity differences transparently.
 *
 * Owner: Member 3 (Ganga Satish — Buyer & Marketplace Module)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CompareContext = createContext(null);
const STORAGE_KEY = 'sasyavahini_buyer_compare_v1';
const MAX_COMPARISON_LIMIT = 4;

export function CompareProvider({ children }) {
  const [selectedListings, setSelectedListings] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const saved = window.sessionStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      }
    } catch {
      // sessionStorage unavailable or corrupt
    }
    return [];
  });

  // Persist to sessionStorage on state changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedListings));
      }
    } catch {
      // ignore storage quota issues
    }
  }, [selectedListings]);

  const isInCompare = useCallback(
    (id) => selectedListings.some((item) => item.id === id),
    [selectedListings]
  );

  const addToCompare = useCallback(
    (product) => {
      if (!product || !product.id) return { success: false, reason: 'INVALID_PRODUCT' };

      if (isInCompare(product.id)) {
        return { success: false, reason: 'ALREADY_EXISTS', message: 'Item is already in comparison list.' };
      }

      if (selectedListings.length >= MAX_COMPARISON_LIMIT) {
        return {
          success: false,
          reason: 'LIMIT_REACHED',
          message: `Comparison limit of ${MAX_COMPARISON_LIMIT} produce lots reached. Remove an item to add another.`,
        };
      }

      const minimalItem = {
        id: product.id,
        cropName: product.cropName || 'Produce Lot',
        category: product.category || 'Vegetables',
        qualityGrade: product.qualityGrade || 'GRADE_A',
        isOrganic: !!product.isOrganic,
        askingPricePerKg: product.askingPricePerKg || 0,
        availableQtyKg: product.availableQtyKg || product.totalQuantityKg || 0,
        village: product.village || product.location || '',
        district: product.district || '',
        state: product.state || 'Maharashtra',
        supplierName: product.fpo?.name || product.farmer?.name || 'Verified FPO Collective',
        imageUrl: product.imageUrl || null,
      };

      // Check commodity variation warning
      let notice = null;
      if (selectedListings.length > 0) {
        const firstCrop = selectedListings[0].cropName.toLowerCase().replace(/\([^)]*\)/g, '').trim();
        const newCrop = minimalItem.cropName.toLowerCase().replace(/\([^)]*\)/g, '').trim();
        if (firstCrop !== newCrop) {
          notice = `Notice: "${minimalItem.cropName}" differs from "${selectedListings[0].cropName}". Prices and grades will reflect commodity differences.`;
        }
      }

      setSelectedListings((prev) => [...prev, minimalItem]);
      return { success: true, message: `Added ${minimalItem.cropName} to comparison.`, notice };
    },
    [selectedListings, isInCompare]
  );

  const removeFromCompare = useCallback((id) => {
    setSelectedListings((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleCompare = useCallback(
    (product) => {
      if (!product || !product.id) return { success: false };
      if (isInCompare(product.id)) {
        removeFromCompare(product.id);
        return { success: true, action: 'REMOVED', message: `Removed from comparison.` };
      } else {
        const res = addToCompare(product);
        return { ...res, action: 'ADDED' };
      }
    },
    [isInCompare, removeFromCompare, addToCompare]
  );

  const clearCompare = useCallback(() => {
    setSelectedListings([]);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const selectedIds = selectedListings.map((l) => l.id);
  const count = selectedListings.length;
  const canCompare = count >= 2;

  const value = {
    selectedListings,
    selectedIds,
    count,
    canCompare,
    maxLimit: MAX_COMPARISON_LIMIT,
    isInCompare,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    clearCompare,
  };

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    return {
      selectedProducts: [],
      selectedIds: [],
      count: 0,
      canCompare: false,
      maxLimit: MAX_COMPARISON_LIMIT,
      isInCompare: () => false,
      addToCompare: () => ({ success: false }),
      removeFromCompare: () => ({ success: false }),
      toggleCompare: () => ({ action: 'NONE' }),
      clearCompare: () => {},
    };
  }
  return context;
}

export default CompareContext;
