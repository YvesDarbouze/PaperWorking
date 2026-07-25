'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { TimeSeriesChart } from '@/components/Charts/TimeSeriesChart';
import { ChevronDown } from 'lucide-react';

interface TimeSeriesSectionProps {
  projectId: string | null;
}

const METRIC_OPTIONS = [
  { id: 'noi', name: 'Net Operating Income', color: '#10b981', unit: 'currency' },
  { id: 'cash_flow', name: 'Net Cash Flow', color: '#6366f1', unit: 'currency' },
  { id: 'occupancy', name: 'Occupancy Rate', color: '#f59e0b', unit: 'percent' },
  { id: 'revenue', name: 'Gross Revenue', color: '#8b5cf6', unit: 'currency' },
  { id: 'expenses', name: 'Operating Expenses', color: '#f43f5e', unit: 'currency' },
] as const;

type MetricId = typeof METRIC_OPTIONS[number]['id'];

function TrendCard({ 
  initialMetric, 
  projectId 
}: { 
  initialMetric: MetricId; 
  projectId: string | null;
}) {
  const { user } = useAuth();
  const [metricId, setMetricId] = useState<MetricId>(initialMetric);

  const selectedOption = METRIC_OPTIONS.find(o => o.id === metricId)!;

  // Query trend data
  const { data, isLoading, error } = useQuery({
    queryKey: ['insightsTrends', metricId, projectId],
    queryFn: async () => {
      if (!user) return [];
      const token = await user.getIdToken();
      const url = new URL('/api/insights/trends', window.location.origin);
      url.searchParams.set('metric', metricId);
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch trend data');
      }
      return res.json() as Promise<{ date: string; value: number }[]>;
    },
    enabled: !!user,
  });

  const chartData = data ?? [];

  return (
    <div className="bg-white dark:bg-[#121014]/50 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase font-outfit">
          {selectedOption.name}
        </h3>
        
        {/* Metric Dropdown Selector */}
        <div className="relative">
          <select
            value={metricId}
            onChange={(e) => setMetricId(e.target.value as MetricId)}
            className="appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1 px-3 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="dark:bg-slate-950">
                {opt.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {isLoading ? (
        <div className="h-[280px] w-full flex flex-col justify-end space-y-2 animate-pulse bg-slate-50/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-end h-full w-full gap-2 px-2">
            {[...Array(12)].map((_, i) => (
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
        <div className="h-[280px] w-full flex items-center justify-center border border-dashed border-rose-200 dark:border-rose-500/20 bg-rose-500/5 rounded-2xl text-rose-500 text-xs font-medium px-4 text-center">
          Failed to load trend statistics. Please check your network.
        </div>
      ) : (
        <TimeSeriesChart
          data={chartData}
          title={selectedOption.name}
          color={selectedOption.color}
          unit={selectedOption.unit}
          height={280}
        />
      )}
    </div>
  );
}

export function TimeSeriesSection({ projectId }: TimeSeriesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-outfit tracking-tight">
          Trends
        </h2>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
          Last 24 Months
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrendCard initialMetric="noi" projectId={projectId} />
        <TrendCard initialMetric="cash_flow" projectId={projectId} />
        <TrendCard initialMetric="occupancy" projectId={projectId} />
      </div>
    </div>
  );
}
