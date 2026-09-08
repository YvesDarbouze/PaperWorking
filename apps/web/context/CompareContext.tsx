'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { DealCardData } from '@/components/marketplace/DealCard';

const COMPARE_STORAGE_KEY = 'paperworking_compare_deals';
const MAX_COMPARE_DEALS = 3;

interface CompareContextValue {
  comparedDeals: DealCardData[];
  addToCompare: (deal: DealCardData) => boolean;
  removeFromCompare: (dealId: string) => void;
  clearCompare: () => void;
  isComparing: (dealId: string) => boolean;
  isCompareModalOpen: boolean;
  openCompareModal: () => void;
  closeCompareModal: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [comparedDeals, setComparedDeals] = useState<DealCardData[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (stored) {
        setComparedDeals(JSON.parse(stored).slice(0, MAX_COMPARE_DEALS));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save to localStorage
  const saveDeals = (deals: DealCardData[]) => {
    setComparedDeals(deals);
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(deals));
    } catch {
      // Ignore
    }
  };

  const addToCompare = useCallback(
    (deal: DealCardData): boolean => {
      if (comparedDeals.some((d) => d.id === deal.id || d.slug === deal.slug)) {
        return false;
      }
      if (comparedDeals.length >= MAX_COMPARE_DEALS) {
        // Exceeded max
        return false;
      }
      const updated = [...comparedDeals, deal];
      saveDeals(updated);
      return true;
    },
    [comparedDeals],
  );

  const removeFromCompare = useCallback(
    (dealId: string) => {
      const updated = comparedDeals.filter((d) => d.id !== dealId && d.slug !== dealId);
      saveDeals(updated);
    },
    [comparedDeals],
  );

  const clearCompare = useCallback(() => {
    saveDeals([]);
    setIsCompareModalOpen(false);
  }, []);

  const isComparing = useCallback(
    (dealId: string) => {
      return comparedDeals.some((d) => d.id === dealId || d.slug === dealId);
    },
    [comparedDeals],
  );

  const openCompareModal = useCallback(() => {
    if (comparedDeals.length > 0) {
      setIsCompareModalOpen(true);
    }
  }, [comparedDeals]);

  const closeCompareModal = useCallback(() => {
    setIsCompareModalOpen(false);
  }, []);

  return (
    <CompareContext.Provider
      value={{
        comparedDeals,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isComparing,
        isCompareModalOpen,
        openCompareModal,
        closeCompareModal,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    // Return a safe fallback context if rendered outside provider
    return {
      comparedDeals: [],
      addToCompare: () => false,
      removeFromCompare: () => {},
      clearCompare: () => {},
      isComparing: () => false,
      isCompareModalOpen: false,
      openCompareModal: () => {},
      closeCompareModal: () => {},
    };
  }
  return context;
}
