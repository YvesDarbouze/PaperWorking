'use client';

import { useState, useEffect } from 'react';
import { ATTORNEY_CLOSE_STATES_SEED } from '@/lib/config/attorneyStates';

/**
 * Client-side hook that fetches the attorney-close state list from
 * the config API. Falls back to the built-in seed if the fetch fails.
 *
 * The list is cached for the lifetime of the component.
 */
export function useAttorneyStates(): {
  states: readonly string[];
  loading: boolean;
} {
  const [states, setStates] = useState<readonly string[]>(ATTORNEY_CLOSE_STATES_SEED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/config/attorney-states');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.states)) {
            setStates(data.states);
          }
        }
      } catch {
        // silently fall back to seed
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { states, loading };
}
