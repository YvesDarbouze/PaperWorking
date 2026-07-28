'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { TimeSeriesChart } from '@/components/Charts/TimeSeriesChart';
import { ChevronDown } from 'lucide-react';
import { insightsTokens, panelStyle } from './insightsTheme';

interface TimeSeriesSectionProps {
  projectId: string | null;
}

const METRIC_OPTIONS = [
  { id: 'noi', name: 'Net Operating Income', color: '#4F6F78', unit: 'currency' },
  { id: 'cash_flow', name: 'Net Cash Flow', color: '#8A734F', unit: 'currency' },
  { id: 'occupancy', name: 'Occupancy Rate', color: '#C4843A', unit: 'percent' },
  { id: 'revenue', name: 'Gross Revenue', color: '#7A9EAA', unit: 'currency' },
  { id: 'expenses', name: 'Operating Expenses', color: '#C45C3E', unit: 'currency' },
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
  const { theme } = useTheme();
  const t = insightsTokens(theme === 'dark');
  const [metricId, setMetricId] = useState<MetricId>(initialMetric);

  const selectedOption = METRIC_OPTIONS.find(o => o.id === metricId)!;

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
    <div className="p-4 space-y-4" style={panelStyle(t)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: t.muted }}>
          {selectedOption.name}
        </h3>

        <div className="relative">
          <select
            value={metricId}
            onChange={(e) => setMetricId(e.target.value as MetricId)}
            className="appearance-none py-1 px-2.5 pr-7 text-xs font-semibold outline-none cursor-pointer"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.border}`,
              color: t.heading,
              borderRadius: 2,
            }}
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.muted }} />
        </div>
      </div>

      {isLoading ? (
        <div
          className="h-[280px] w-full flex flex-col justify-end space-y-2 animate-pulse p-4"
          style={{ border: `1px dashed ${t.border}`, borderRadius: 2, background: t.hover }}
        >
          <div className="flex justify-between items-end h-full w-full gap-2 px-2">
            {[...Array(12)].map((_, i) => (
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
          className="h-[280px] w-full flex items-center justify-center text-xs font-medium px-4 text-center"
          style={{ border: `1px dashed ${t.alert}`, background: t.alertMuted, color: t.alert, borderRadius: 2 }}
        >
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
  const { theme } = useTheme();
  const t = insightsTokens(theme === 'dark');

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-0.5" style={{ color: t.accent }}>
            Performance
          </p>
          <h2 className="text-[1.1rem] font-semibold tracking-tight" style={{ color: t.heading }}>
            Trends
          </h2>
        </div>
        <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: t.muted }}>
          Last 24 months
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TrendCard initialMetric="noi" projectId={projectId} />
        <TrendCard initialMetric="cash_flow" projectId={projectId} />
        <TrendCard initialMetric="occupancy" projectId={projectId} />
      </div>
    </section>
  );
}
