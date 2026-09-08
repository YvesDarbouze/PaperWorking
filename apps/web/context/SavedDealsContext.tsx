'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';

export const SAVED_DEALS_STORAGE_KEY = 'paperworking_saved_deals';

interface SavedDealsContextType {
  savedDealIds: string[];
  isSaved: (dealIdOrSlug: string) => boolean;
  toggleSave: (dealIdOrSlug: string) => Promise<boolean>;
  refreshSavedDeals: () => Promise<void>;
  isLoaded: boolean;
}

const SavedDealsContext = createContext<SavedDealsContextType | null>(null);

function readLocalStorageSaves(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_DEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalStorageSaves(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_DEALS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export function SavedDealsProvider({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();
  const [savedDealIds, setSavedDealIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronize with server profile
  const syncWithServer = useCallback(async (localSaves: string[]) => {
    try {
      const res = await bffFetch('/api/marketplace/saved-deals');
      if (res.ok) {
        const data = (await res.json()) as { authenticated?: boolean; savedDealIds?: string[] };
        if (data.authenticated && Array.isArray(data.savedDealIds)) {
          // If we had local anonymous saves, merge them to profile
          const serverSet = new Set(data.savedDealIds);
          const unmergedLocal = localSaves.filter((id) => !serverSet.has(id));

          if (unmergedLocal.length > 0) {
            const mergeRes = await bffFetch('/api/marketplace/saved-deals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mergeAnonymous: unmergedLocal }),
            });
            if (mergeRes.ok) {
              const mergeData = (await mergeRes.json()) as { savedDealIds?: string[] };
              if (Array.isArray(mergeData.savedDealIds)) {
                writeLocalStorageSaves(mergeData.savedDealIds);
                setSavedDealIds(mergeData.savedDealIds);
                return;
              }
            }
          }

          // Server state is source of truth
          writeLocalStorageSaves(data.savedDealIds);
          setSavedDealIds(data.savedDealIds);
        }
      }
    } catch {
      // Fall back to optimistic local cache
    }
  }, []);

  // Initial load: optimistic read from localStorage first, then sync with server profile
  useEffect(() => {
    const initialLocal = readLocalStorageSaves();
    setSavedDealIds(initialLocal);
    setIsLoaded(true);

    syncWithServer(initialLocal);
  }, [syncWithServer, auth?.authenticated]);

  const isSaved = useCallback(
    (dealIdOrSlug: string): boolean => {
      if (!dealIdOrSlug) return false;
      return savedDealIds.includes(dealIdOrSlug);
    },
    [savedDealIds],
  );

  const toggleSave = useCallback(
    async (dealIdOrSlug: string): Promise<boolean> => {
      if (!dealIdOrSlug) return false;

      const currentlySaved = savedDealIds.includes(dealIdOrSlug);
      const nextSaved = !currentlySaved;

      const updated = nextSaved
        ? [...savedDealIds, dealIdOrSlug]
        : savedDealIds.filter((id) => id !== dealIdOrSlug);

      // 1. Optimistic write-through to React state & localStorage
      setSavedDealIds(updated);
      writeLocalStorageSaves(updated);

      // 2. Persist to server profile asynchronously
      try {
        await bffFetch('/api/marketplace/saved-deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dealId: dealIdOrSlug,
            action: nextSaved ? 'save' : 'unsave',
          }),
        });
      } catch {
        // Silently preserve optimistic state
      }

      return nextSaved;
    },
    [savedDealIds],
  );

  const refreshSavedDeals = useCallback(async () => {
    const currentLocal = readLocalStorageSaves();
    await syncWithServer(currentLocal);
  }, [syncWithServer]);

  const value = useMemo(
    () => ({
      savedDealIds,
      isSaved,
      toggleSave,
      refreshSavedDeals,
      isLoaded,
    }),
    [savedDealIds, isSaved, toggleSave, refreshSavedDeals, isLoaded],
  );

  return <SavedDealsContext.Provider value={value}>{children}</SavedDealsContext.Provider>;
}

export function useSavedDeals() {
  const context = useContext(SavedDealsContext);
  if (!context) {
    // Fallback safe dummy for unit tests or SSR without provider
    return {
      savedDealIds: [],
      isSaved: () => false,
      toggleSave: async () => false,
      refreshSavedDeals: async () => {},
      isLoaded: true,
    };
  }
  return context;
}
