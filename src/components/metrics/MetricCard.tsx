'use client';

import React from 'react';
import { MetricValue } from '@/lib/metrics/types';
import Link from 'next/link';

interface MetricCardProps {
  title: string;
  metric: MetricValue;
  format?: 'currency' | 'percent' | 'ratio' | 'number';
  unitLabel?: string;
  projectId?: string;
}

export function MetricCard({
  title,
  metric,
  format = 'number',
  unitLabel,
  projectId = 'demo',
}: MetricCardProps) {
  const { value, projected, sourceCardId } = metric || {};

  const formattedValue = () => {
    if (value === null || value === undefined) return '—';
    if (format === 'currency') return `$${Math.round(value).toLocaleString()}`;
    if (format === 'percent') return `${value.toFixed(1)}%`;
    if (format === 'ratio') return `${value.toFixed(2)}x`;
    return `${value.toLocaleString()} ${unitLabel || ''}`.trim();
  };

  const isProjected = Boolean(projected);

  return (
    <div
      data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`p-3.5 rounded-xl transition-all duration-300 ${
        isProjected
          ? 'border-2 border-dashed border-amber-500/50 bg-amber-950/10'
          : 'border border-slate-800 bg-slate-900/60'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {isProjected && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Projected
          </span>
        )}
      </div>

      {value !== null && value !== undefined ? (
        <span className="text-xl font-bold text-white tracking-tight">{formattedValue()}</span>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-slate-500">—</span>
          <Link
            href={`/project/${projectId}?card=${sourceCardId || 'card_general'}`}
            className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
          >
            Collect Data
          </Link>
        </div>
      )}
    </div>
  );
}
