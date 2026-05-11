'use client';

import { useState, useCallback, useEffect } from 'react';
import type { BridgeOpenHouseResult } from '@/types/bridge';

interface OpenHouseCalendarState {
  openHouses: BridgeOpenHouseResult[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for the Open House Calendar — fetches upcoming open houses.
 * Auto-fetches on mount; can be refreshed manually.
 */
export function useOpenHouseCalendar(autoFetch = true) {
  const [state, setState] = useState<OpenHouseCalendarState>({
    openHouses: [],
    loading: false,
    error: null,
  });

  const fetchOpenHouses = useCallback(async (listingKey?: string, top = 30) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      if (listingKey) params.set('listingKey', listingKey);
      params.set('top', String(top));

      const res = await fetch(`/api/bridge/openhouses?${params.toString()}`);
      if (!res.ok) throw new Error('Fetch failed');

      const data = await res.json();

      if (data.unavailable) {
        setState({
          openHouses: [],
          loading: false,
          error: 'Open house calendar is temporarily unavailable.',
        });
        return;
      }

      setState({
        openHouses: data.results ?? [],
        loading: false,
        error: null,
      });
    } catch {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load open houses.',
      }));
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchOpenHouses();
    }
  }, [autoFetch, fetchOpenHouses]);

  return {
    ...state,
    fetchOpenHouses,
  };
}
