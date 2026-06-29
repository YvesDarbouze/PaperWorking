'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, TrendingUp, ArrowUpRight, BarChart3, AlertCircle, Loader2 } from 'lucide-react';

interface ZipMarketStats {
  zipCode: string;
  city?: string;
  state?: string;
  saleData?: {
    medianPrice?: number;
    medianDaysOnMarket?: number;
    totalListings?: number;
    newListings?: number;
    history?: Record<string, { medianPrice?: number; medianDaysOnMarket?: number }>;
  };
  rentalData?: {
    medianPrice?: number;
    medianDaysOnMarket?: number;
    totalListings?: number;
  };
  sourceProvider: string;
  fetchedAt: string;
}

function domToHeat(dom?: number): number {
  if (!dom) return 5;
  if (dom <= 14) return 10;
  if (dom <= 21) return 9;
  if (dom <= 30) return 7;
  if (dom <= 45) return 5;
  if (dom <= 60) return 3;
  return 2;
}

function computeYoY(history?: Record<string, { medianPrice?: number }>): number | null {
  if (!history) return null;
  const entries = Object.entries(history)
    .filter(([, v]) => v.medianPrice)
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length < 2) return null;
  const oldest = entries[0][1].medianPrice!;
  const newest = entries[entries.length - 1][1].medianPrice!;
  return Math.round(((newest - oldest) / oldest) * 1000) / 10;
}

function HeatBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 w-2 rounded-sm transition-colors"
          style={{
            backgroundColor: i < score
              ? score >= 8 ? '#3f7d20' : score >= 5 ? '#f59e0b' : '#F06543'
              : '#e5e7eb',
          }}
        />
      ))}
    </div>
  );
}

interface MarketAnalysisProps {
  zipCode?: string;
}

export default function MarketAnalysis({ zipCode }: MarketAnalysisProps = {}) {
  const [stats, setStats] = useState<ZipMarketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noCoverage, setNoCoverage] = useState(false);

  useEffect(() => {
    if (!zipCode || zipCode.trim().length !== 5) {
      setStats(null);
      setNoCoverage(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNoCoverage(false);
    setStats(null);

    fetch(`/api/reil/market-stats?zipCode=${encodeURIComponent(zipCode.trim())}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) { setNoCoverage(true); setLoading(false); return; }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to load market data');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Network error — unable to load market data');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [zipCode]);

  const heatScore = domToHeat(stats?.saleData?.medianDaysOnMarket);
  const yoy = computeYoY(stats?.saleData?.history as Record<string, { medianPrice?: number }> | undefined);
  const asOf = stats
    ? new Date(stats.fetchedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-text-primary" />
          <h3 className="text-lg font-medium tracking-tight text-text-primary">Market Analysis</h3>
        </div>
        {stats && (
          <span className="text-xs text-text-secondary">
            {stats.sourceProvider} · {asOf}
          </span>
        )}
        {!stats && !loading && !noCoverage && (
          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            ZIP Market Data
          </span>
        )}
      </div>

      {/* No zip provided */}
      {!zipCode && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <MapPin className="w-8 h-8 text-text-secondary opacity-40" />
          <p className="text-sm text-text-secondary">
            Enter a property address to load live market data for that ZIP code.
          </p>
        </div>
      )}

      {/* Loading */}
      {zipCode && loading && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
          <p className="text-sm text-text-secondary">Loading market data for {zipCode}…</p>
        </div>
      )}

      {/* Error */}
      {zipCode && !loading && error && (
        <div className="flex items-start gap-3 rounded-lg p-4 bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* No coverage */}
      {zipCode && !loading && noCoverage && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-text-secondary opacity-40" />
          <p className="text-sm font-medium text-text-primary">No market data available</p>
          <p className="text-xs text-text-secondary">
            Market statistics for ZIP {zipCode} are not available from this provider.
          </p>
        </div>
      )}

      {/* Real data */}
      {stats && !loading && (
        <>
          {/* Summary card */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-4 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                  {stats.city ? `${stats.city}, ${stats.state}` : `ZIP ${stats.zipCode}`}
                </p>
                {stats.saleData?.medianPrice && (
                  <p className="text-lg font-semibold text-white">
                    ${stats.saleData.medianPrice.toLocaleString()}{' '}
                    <span className="text-sm font-normal text-gray-400">median sale</span>
                  </p>
                )}
                {stats.saleData?.medianDaysOnMarket != null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {stats.saleData.medianDaysOnMarket} median days on market
                  </p>
                )}
              </div>
              <div className="text-right">
                {yoy != null && (
                  <div className={`flex items-center text-sm font-medium ${yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    {yoy > 0 ? '+' : ''}{yoy}% YoY
                  </div>
                )}
                <div className="mt-1">
                  <HeatBar score={heatScore} />
                </div>
              </div>
            </div>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.saleData?.totalListings != null && (
              <div className="rounded-lg border border-border-accent p-3">
                <p className="text-xs text-text-secondary mb-1">Sale Listings</p>
                <p className="text-lg font-semibold text-text-primary">
                  {stats.saleData.totalListings.toLocaleString()}
                </p>
              </div>
            )}
            {stats.saleData?.newListings != null && (
              <div className="rounded-lg border border-border-accent p-3">
                <p className="text-xs text-text-secondary mb-1">New This Month</p>
                <p className="text-lg font-semibold text-text-primary">
                  {stats.saleData.newListings.toLocaleString()}
                </p>
              </div>
            )}
            {stats.rentalData?.medianPrice != null && (
              <div className="rounded-lg border border-border-accent p-3">
                <p className="text-xs text-text-secondary mb-1">Median Rent</p>
                <p className="text-lg font-semibold text-text-primary">
                  ${stats.rentalData.medianPrice.toLocaleString()}/mo
                </p>
              </div>
            )}
            {stats.rentalData?.medianDaysOnMarket != null && (
              <div className="rounded-lg border border-border-accent p-3">
                <p className="text-xs text-text-secondary mb-1">Rental DOM</p>
                <p className="text-lg font-semibold text-text-primary">
                  {stats.rentalData.medianDaysOnMarket} days
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
