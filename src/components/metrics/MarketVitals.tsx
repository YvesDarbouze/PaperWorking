'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, MapPin } from 'lucide-react';
import MarketVitalsCard from './MarketVitalsCard';
import ZoningScanPanel from './ZoningScanPanel';
import type { ZipDemographics } from '@/types/marketVitals';

// ── ZIP extraction ────────────────────────────────────────────

function extractZip(address: string): string {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? '';
}

// ── Main ──────────────────────────────────────────────────────

export interface MarketVitalsProps {
  /** Full property address — ZIP is extracted automatically. */
  address: string;
  /** Firestore project ID — passed to ZoningScanPanel for context. */
  projectId?: string;
  className?: string;
}

export default function MarketVitals({ address, projectId, className = '' }: MarketVitalsProps) {
  const zip = extractZip(address);

  const [demographics, setDemographics] = useState<ZipDemographics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchDemographics = useCallback(async () => {
    if (!zip) {
      setFetchError('No ZIP code found in property address. Ensure the address includes a 5-digit ZIP.');
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    setDemographics(null);

    try {
      const res = await fetch(`/api/market-vitals?zip=${zip}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error || 'Failed to load market vitals.');
        return;
      }
      setDemographics(json.demographics as ZipDemographics);
    } catch {
      setFetchError('Network error loading market vitals. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, [zip]);

  // Auto-fetch on mount when ZIP is present
  useEffect(() => {
    if (zip) fetchDemographics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip]);

  return (
    <section className={`space-y-4 ${className}`} aria-label="Market Vitals">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--pw-subtle)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-primary)' }}>
            Market Vitals
          </h3>
          {zip && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest"
              style={{ background: 'var(--bg-canvas)', color: 'var(--pw-subtle)' }}
            >
              ZIP {zip}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={fetchDemographics}
          disabled={isLoading || !zip}
          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-opacity disabled:opacity-40 hover:opacity-70"
          style={{ color: 'var(--pw-subtle)' }}
          aria-label="Refresh market vitals"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* No ZIP state */}
      {!zip && !isLoading && (
        <div
          className="rounded-lg border p-5 text-center"
          style={{ borderColor: 'var(--pw-border)', background: 'var(--pw-surface)' }}
        >
          <MapPin className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--pw-border)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--pw-muted)' }}>
            ZIP code not found in property address
          </p>
          <p className="text-[9px] mt-1" style={{ color: 'var(--pw-border)' }}>
            Current address: <span className="font-mono">{address || '—'}</span>
          </p>
          <p className="text-[9px] mt-1" style={{ color: 'var(--pw-border)' }}>
            Ensure the address includes a valid 5-digit ZIP code to load market demographics.
          </p>
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div
          className="rounded p-3 text-xs"
          style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
          }}
        >
          {fetchError}
        </div>
      )}

      {/* Two-column layout: Demographics + Zoning */}
      {(zip || isLoading) && !fetchError && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <MarketVitalsCard
            demographics={demographics}
            isLoading={isLoading}
          />
          <ZoningScanPanel
            zip={zip}
            address={address}
            projectId={projectId}
          />
        </div>
      )}
    </section>
  );
}
