'use client';

import React from 'react';
import { MetricValue } from '@/lib/metrics/types';
import { MetricSparkline } from '../Charts/MetricSparkline';
import Link from 'next/link';

interface ScorecardCardProps {
  title: string;
  metric: MetricValue;
  format?: 'currency' | 'percent' | 'ratio';
  projectId?: string;
  sparklineData?: { month: string; value: number }[];
  thresholdType?: 'noi' | 'capRate' | 'dscr' | 'cashFlow' | 'expenseRatio' | 'default';
}

export function ScorecardCard({
  title,
  metric,
  format = 'currency',
  projectId = 'demo',
  sparklineData,
  thresholdType = 'default',
}: ScorecardCardProps) {
  const { value, projected, missingInputs, sourceCardId } = metric || {};

  // Color thresholding logic
  const getColorClass = () => {
    if (value === null || value === undefined) return 'text-slate-400';

    if (thresholdType === 'noi' || thresholdType === 'cashFlow') {
      return value >= 0 ? 'text-emerald-400' : 'text-rose-400';
    }
    if (thresholdType === 'capRate') {
      return value >= 6.0 ? 'text-emerald-400' : value >= 4.0 ? 'text-amber-400' : 'text-rose-400';
    }
    if (thresholdType === 'dscr') {
      return value >= 1.25 ? 'text-emerald-400' : value >= 1.0 ? 'text-amber-400' : 'text-rose-400';
    }
    if (thresholdType === 'expenseRatio') {
      return value <= 40 ? 'text-emerald-400' : value <= 50 ? 'text-amber-400' : 'text-rose-400';
    }

    return 'text-emerald-400';
  };

  const formattedValue = () => {
    if (value === null || value === undefined) return '—';
    if (format === 'currency') return `$${Math.round(value).toLocaleString()}`;
    if (format === 'percent') return `${value.toFixed(1)}%`;
    if (format === 'ratio') return `${value.toFixed(2)}`;
    return String(value);
  };

  const isProjected = Boolean(projected);

  return (
    <div
      data-testid={`scorecard-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`relative p-4 rounded-xl transition-all duration-300 ${
        isProjected
          ? 'border-2 border-dashed border-amber-500/50 bg-amber-950/10'
          : 'border-2 border-solid border-slate-800 bg-slate-900/60'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h4>
        {isProjected && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Projected
          </span>
        )}
      </div>

      {value !== null && value !== undefined ? (
        <div className="mb-3">
          <span className={`text-2xl font-extrabold tracking-tight ${getColorClass()}`}>
            {formattedValue()}
          </span>
        </div>
      ) : (
        <div className="my-3 flex items-center justify-between">
          <span className="text-2xl font-bold text-slate-500">—</span>
          <Link
            href={`/project/${projectId}?card=${sourceCardId || 'card_general'}`}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors border border-amber-500/40"
          >
            Collect Data
          </Link>
        </div>
      )}

      <MetricSparkline data={sparklineData} isProjected={isProjected} />
    </div>
  );
}
