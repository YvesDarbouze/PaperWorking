'use client';

import React from 'react';
import { TrendingUp, DollarSign, Percent, BarChart3 } from 'lucide-react';
import type { DealMetrics } from '@/lib/finance/metrics';

interface DealMetricsCardProps {
  metrics: DealMetrics;
  variant?: 'compact' | 'full';
  className?: string;
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function formatMultiple(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}x`;
}

const METRIC_CONFIGS = [
  { key: 'askingPrice', label: 'Asking Price', format: formatCurrency, icon: DollarSign },
  { key: 'purchasePrice', label: 'Purchase Price', format: formatCurrency, icon: DollarSign },
  { key: 'capRate', label: 'Cap Rate', format: formatPercent, icon: Percent },
  { key: 'cashOnCash', label: 'Cash-on-Cash', format: formatPercent, icon: TrendingUp },
  { key: 'noi', label: 'NOI', format: formatCurrency, icon: BarChart3 },
  { key: 'estimatedYield', label: 'Est. Yield', format: formatPercent, icon: TrendingUp },
  { key: 'dscr', label: 'DSCR', format: formatMultiple, icon: BarChart3 },
  { key: 'pricePerUnit', label: 'Price / Unit', format: formatCurrency, icon: DollarSign },
  { key: 'grm', label: 'GRM', format: formatMultiple, icon: BarChart3 },
  { key: 'irr', label: 'Levered IRR', format: formatPercent, icon: TrendingUp },
  { key: 'equityMultiple', label: 'Equity Multiple', format: formatMultiple, icon: BarChart3 },
] as const;

export function DealMetricsCard({ metrics, variant = 'full', className = '' }: DealMetricsCardProps) {
  const visibleMetrics = METRIC_CONFIGS.filter(
    m => metrics[m.key as keyof DealMetrics] !== undefined
  );

  if (visibleMetrics.length === 0) {
    return (
      <div data-testid="deal-metrics-card" className={`p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-center ${className}`}>
        <p className="text-xs text-slate-400 dark:text-slate-500">No metrics available</p>
      </div>
    );
  }

  const gridCols = variant === 'compact' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div data-testid="deal-metrics-card" className={`p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md ${className}`}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Deal Metrics</h3>
      <div className={`grid ${gridCols} gap-4`}>
        {visibleMetrics.map(({ key, label, format, icon: Icon }) => {
          const value = metrics[key as keyof DealMetrics];
          return (
            <div key={key} className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{format(value)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
