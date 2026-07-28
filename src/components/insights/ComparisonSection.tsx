'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { PortfolioComparisonChart } from '@/components/Charts/PortfolioComparisonChart';
import { ChevronDown, ArrowUpDown } from 'lucide-react';
import { insightsTokens, panelStyle } from './insightsTheme';

const COMPARE_METRICS = [
  { id: 'cap_rate', name: 'Cap Rate' },
  { id: 'cash_on_cash', name: 'Cash-on-Cash Return' },
  { id: 'dscr', name: 'Debt Service Coverage (DSCR)' },
  { id: 'ltv', name: 'Loan-to-Value (LTV)' },
  { id: 'oer', name: 'Operating Expense Ratio (OER)' },
  { id: 'grm', name: 'Gross Rent Multiplier (GRM)' }
] as const;

type MetricId = typeof COMPARE_METRICS[number]['id'];

export function ComparisonSection() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const t = insightsTokens(theme === 'dark');
  const [selectedMetric, setSelectedMetric] = useState<MetricId>('cap_rate');
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  const { data, isLoading, error } = useQuery({
    queryKey: ['insightsComparison', 'financial'],
    queryFn: async () => {
      if (!user) return null;
      const token = await user.getIdToken();
      const url = new URL('/api/insights/metrics', window.location.origin);
      url.searchParams.set('category', 'financial');
      url.searchParams.set('portfolio', 'true');
      url.searchParams.set('breakdown', 'true');

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch comparison metrics');
      }
      return res.json() as Promise<{
        hasLinkedBank: boolean;
        metrics: any[];
        projectBreakdowns: {
          projectId: string;
          projectName: string;
          metrics: Record<string, number | null>;
        }[];
      }>;
    },
    enabled: !!user,
  });

  const averageValue = useMemo(() => {
    if (!data?.metrics) return null;
    const m = data.metrics.find(item => item.id === selectedMetric);
    return m?.value ?? null;
  }, [data, selectedMetric]);

  const chartPoints = useMemo(() => {
    if (!data?.projectBreakdowns) return [];

    const points = data.projectBreakdowns
      .map(p => {
        const val = p.metrics[selectedMetric];
        return {
          projectId: p.projectId,
          projectName: p.projectName,
          value: val !== undefined && val !== null ? val : null
        };
      })
      .filter((p): p is { projectId: string; projectName: string; value: number } => p.value !== null);

    if (sortOrder === 'asc') {
      return [...points].sort((a, b) => a.value - b.value);
    } else if (sortOrder === 'desc') {
      return [...points].sort((a, b) => b.value - a.value);
    }
    return points;
  }, [data, selectedMetric, sortOrder]);

  const toggleSort = () => {
    if (sortOrder === 'none') {
      setSortOrder('desc');
    } else if (sortOrder === 'desc') {
      setSortOrder('asc');
    } else {
      setSortOrder('none');
    }
  };

  return (
    <section className="p-5 space-y-5" style={panelStyle(t)}>
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: `1px solid ${t.divider}` }}
      >
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-0.5" style={{ color: t.accent }}>
            Portfolio
          </p>
          <h2 className="text-[1.1rem] font-semibold tracking-tight" style={{ color: t.heading }}>
            Project comparison
          </h2>
          <p className="text-xs mt-1" style={{ color: t.muted }}>
            Compare deals side by side. Top performers and laggards use status color.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="pw-interactive-custom flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            onClick={toggleSort}
            title="Sort projects by value"
            style={{
              background: sortOrder !== 'none' ? t.accentMuted : 'transparent',
              color: sortOrder !== 'none' ? t.accent : t.muted,
              border: `1px solid ${t.border}`,
              borderRadius: 2,
              padding: '6px 12px',
            }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort: {sortOrder === 'none' ? 'Default' : sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
          </button>

          <div className="relative">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as MetricId)}
              className="appearance-none py-1.5 pl-3 pr-8 text-xs font-semibold outline-none cursor-pointer"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.border}`,
                color: t.heading,
                borderRadius: 2,
              }}
            >
              {COMPARE_METRICS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.muted }} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          className="h-[320px] w-full flex flex-col justify-end space-y-2 animate-pulse p-4"
          style={{ border: `1px dashed ${t.border}`, borderRadius: 2, background: t.hover }}
        >
          <div className="flex justify-between items-end h-full w-full gap-4 px-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-t w-full"
                style={{ height: `${30 + Math.cos(i * 1.5) * 40}%`, background: t.divider }}
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div
          className="h-[320px] w-full flex items-center justify-center text-xs font-medium px-4 text-center"
          style={{ border: `1px dashed ${t.alert}`, background: t.alertMuted, color: t.alert, borderRadius: 2 }}
        >
          Failed to load portfolio comparison data. Please check your network.
        </div>
      ) : chartPoints.length === 0 ? (
        <div
          className="h-[320px] w-full flex flex-col items-center justify-center text-xs font-medium p-4 text-center"
          style={{ border: `1px dashed ${t.border}`, color: t.muted, borderRadius: 2 }}
        >
          No comparison points available. Ensure projects have valid financial records.
        </div>
      ) : (
        <PortfolioComparisonChart
          data={chartPoints}
          metricId={selectedMetric}
          averageValue={averageValue}
          height={320}
        />
      )}
    </section>
  );
}
