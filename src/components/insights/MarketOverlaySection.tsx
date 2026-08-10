'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { MarketOverlayChart } from '@/components/Charts/MarketOverlayChart';
import { ChevronDown, Info } from 'lucide-react';

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
  const [metricId, setMetricId] = useState<MetricId>('cap_rate');

  const selectedOption = MARKET_METRICS.find(o => o.id === metricId)!;

  // Query market overlay data
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
    <div className="bg-white dark:bg-[#121014]/50 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white font-outfit tracking-tight">
            Local Market Comparison
            <span className="inline-flex items-center justify-center rounded-full bg-slate-800/10 text-slate-300 p-0.5" title="Sourced from RentCast live data">
              <Info className="w-3.5 h-3.5" />
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare your property performance against local ZIP code quarterly statistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Metric Selector Dropdown */}
          <div className="relative">
            <select
              value={metricId}
              onChange={(e) => setMetricId(e.target.value as MetricId)}
              className="appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-700 cursor-pointer"
            >
              {MARKET_METRICS.map((opt) => (
                <option key={opt.id} value={opt.id} className="dark:bg-slate-950">
                  {opt.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Chart Container */}
      {isLoading ? (
        <div className="h-[300px] w-full flex flex-col justify-end space-y-2 animate-pulse bg-slate-50/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-end h-full w-full gap-2 px-2">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="bg-slate-200 dark:bg-white/10 rounded-t w-full" 
                style={{ height: `${20 + Math.sin(i) * 50}%` }}
              />
            ))}
          </div>
          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/3 mx-auto" />
        </div>
      ) : error ? (
        <div className="h-[300px] w-full flex items-center justify-center border border-dashed border-rose-200 dark:border-rose-500/20 bg-rose-500/5 rounded-2xl text-rose-500 text-xs font-medium px-4 text-center">
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
    </div>
  );
}
