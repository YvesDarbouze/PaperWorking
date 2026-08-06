'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { PortfolioComparisonChart } from '@/components/Charts/PortfolioComparisonChart';
import { ChevronDown, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

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
  const [selectedMetric, setSelectedMetric] = useState<MetricId>('cap_rate');
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  // Query financial metrics with project breakdown
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

  // Calculate portfolio average value for the selected metric
  const averageValue = useMemo(() => {
    if (!data?.metrics) return null;
    const m = data.metrics.find(item => item.id === selectedMetric);
    return m?.value ?? null;
  }, [data, selectedMetric]);

  // Extract and sort comparison data points
  const chartPoints = useMemo(() => {
    if (!data?.projectBreakdowns) return [];
    
    // Map breakdown to points
    const points = data.projectBreakdowns
      .map(p => {
        const val = p.metrics[selectedMetric];
        return {
          projectId: p.projectId,
          projectName: p.projectName,
          value: val !== undefined && val !== null ? val : null
        };
      })
      // Filter out projects with missing values
      .filter((p): p is { projectId: string; projectName: string; value: number } => p.value !== null);

    // Apply sort if requested
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
    <div className="bg-white dark:bg-[#121014]/50 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-6">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-outfit tracking-tight">
            Project Comparison
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare active real estate projects. Highlighting top 3 in green, bottom 3 in red.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Button */}
          <button
            onClick={toggleSort}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all duration-200 active:scale-98 cursor-pointer ${
              sortOrder !== 'none'
                ? 'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'
            }`}
            title="Sort projects by value"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort: {sortOrder === 'none' ? 'Default' : sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
          </button>

          {/* Metric Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as MetricId)}
              className="appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-700 cursor-pointer"
            >
              {COMPARE_METRICS.map((opt) => (
                <option key={opt.id} value={opt.id} className="dark:bg-slate-950">
                  {opt.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Comparison Chart Container */}
      {isLoading ? (
        <div className="h-[320px] w-full flex flex-col justify-end space-y-2 animate-pulse bg-slate-50/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-end h-full w-full gap-4 px-4">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="bg-slate-200 dark:bg-white/10 rounded-t w-full" 
                style={{ height: `${30 + Math.cos(i * 1.5) * 40}%` }}
              />
            ))}
          </div>
          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/4 mx-auto" />
        </div>
      ) : error ? (
        <div className="h-[320px] w-full flex items-center justify-center border border-dashed border-rose-200 dark:border-rose-500/20 bg-rose-500/5 rounded-2xl text-rose-500 text-xs font-medium px-4 text-center">
          Failed to load portfolio comparison data. Please check your network.
        </div>
      ) : chartPoints.length === 0 ? (
        <div className="h-[320px] w-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 dark:text-slate-500 text-xs font-medium p-4 text-center">
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
    </div>
  );
}
