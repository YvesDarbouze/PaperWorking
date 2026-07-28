'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { MarketOverlayChart } from '@/components/Charts/MarketOverlayChart';
import { ChevronDown, Info } from 'lucide-react';
import { insightsTokens, panelStyle } from './insightsTheme';

interface MarketOverlaySectionProps {
  projectId: string;
}

const MARKET_METRICS = [
  { id: 'cap_rate', name: 'Cap Rate' },
  { id: 'rent', name: 'Average Rent' },
  { id: 'dom', name: 'Days on Market' }
] as const;

type MetricId = typeof MARKET_METRICS[number]['id'];

export function MarketOverlaySection({ projectId }: MarketOverlaySectionProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const t = insightsTokens(theme === 'dark');
  const [metricId, setMetricId] = useState<MetricId>('cap_rate');

  const { data, isLoading, error } = useQuery({
    queryKey: ['insightsMarketOverlay', metricId, projectId],
    queryFn: async () => {
      if (!user) return null;
      const token = await user.getIdToken();
      const url = new URL('/api/insights/market', window.location.origin);
      url.searchParams.set('projectId', projectId);
      url.searchParams.set('metric', metricId);

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch market data');
      }
      return res.json() as Promise<{
        quarters: string[];
        projectSeries: (number | null)[];
        marketSeries: (number | null)[];
      }>;
    },
    enabled: !!user && !!projectId,
  });

  return (
    <section className="p-5 space-y-5" style={panelStyle(t)}>
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: `1px solid ${t.divider}` }}
      >
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-0.5" style={{ color: t.accent }}>
            Market
          </p>
          <h2 className="flex items-center gap-1.5 text-[1.1rem] font-semibold tracking-tight" style={{ color: t.heading }}>
            Local market comparison
            <span
              className="inline-flex items-center justify-center p-0.5"
              style={{ color: t.accent }}
              title="Sourced from RentCast live data"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </h2>
          <p className="text-xs mt-1" style={{ color: t.muted }}>
            Compare this property against local ZIP code quarterly statistics.
          </p>
        </div>

        <div className="relative">
          <select
            value={metricId}
            onChange={(e) => setMetricId(e.target.value as MetricId)}
            className="appearance-none py-1.5 pl-3 pr-8 text-xs font-semibold outline-none cursor-pointer"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.border}`,
              color: t.heading,
              borderRadius: 2,
            }}
          >
            {MARKET_METRICS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.muted }} />
        </div>
      </div>

      {isLoading ? (
        <div
          className="h-[300px] w-full flex flex-col justify-end space-y-2 animate-pulse p-4"
          style={{ border: `1px dashed ${t.border}`, borderRadius: 2, background: t.hover }}
        >
          <div className="flex justify-between items-end h-full w-full gap-2 px-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-t w-full"
                style={{ height: `${20 + Math.sin(i) * 50}%`, background: t.divider }}
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div
          className="h-[300px] w-full flex items-center justify-center text-xs font-medium px-4 text-center"
          style={{ border: `1px dashed ${t.alert}`, background: t.alertMuted, color: t.alert, borderRadius: 2 }}
        >
          Failed to load local market stats. Ensure the property has a valid ZIP code and try again.
        </div>
      ) : (
        <MarketOverlayChart
          quarters={data?.quarters ?? []}
          projectSeries={data?.projectSeries ?? []}
          marketSeries={data?.marketSeries ?? []}
          metricId={metricId}
          height={300}
        />
      )}
    </section>
  );
}
