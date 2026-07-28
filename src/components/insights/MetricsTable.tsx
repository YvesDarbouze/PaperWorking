'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { insightsTokens, panelStyle } from './insightsTheme';

export interface CalculatedMetric {
  id: string;
  name: string;
  category: string;
  formula: string;
  unit: 'currency' | 'percent' | 'ratio' | 'days' | 'count';
  value: number | null;
  benchmark: 'good' | 'warning' | 'bad' | 'none';
  trend: 'up' | 'down' | 'flat' | null;
  missingData?: string | null;
}

interface MetricsTableProps {
  metrics: CalculatedMetric[];
  isLoading: boolean;
  hasLinkedBank: boolean;
  onConnectBank?: () => void;
}

export function MetricsTable({
  metrics,
  isLoading,
  hasLinkedBank,
  onConnectBank
}: MetricsTableProps) {
  const { theme } = useTheme();
  const t = insightsTokens(theme === 'dark');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'benchmark' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'value' | 'benchmark') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedMetrics = useMemo(() => {
    if (!sortBy) return metrics;
    return [...metrics].sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === 'value') {
        valA = a.value ?? -999999999;
        valB = b.value ?? -999999999;
      } else if (sortBy === 'benchmark') {
        const orderMap = { good: 3, warning: 2, bad: 1, none: 0 };
        valA = orderMap[a.benchmark] ?? 0;
        valB = orderMap[b.benchmark] ?? 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [metrics, sortBy, sortOrder]);

  const formatValue = (value: number | null, unit: string) => {
    if (value === null || isNaN(value)) return 'N/A';
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'ratio':
        return `${value.toFixed(2)}`;
      case 'days':
        return `${Math.round(value)} days`;
      case 'count':
        return `${value.toFixed(1)}`;
      default:
        return `${value}`;
    }
  };

  const renderSortIcon = (field: 'name' | 'value' | 'benchmark') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 opacity-40" />;
    }
    return sortOrder === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 ml-1.5" style={{ color: t.heading }} />
      : <ChevronDown className="w-3.5 h-3.5 ml-1.5" style={{ color: t.heading }} />;
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-2 animate-pulse" style={panelStyle(t)}>
        <div className="h-10 w-full" style={{ background: t.hover }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 w-full flex items-center px-4 justify-between" style={{ borderTop: `1px solid ${t.divider}` }}>
            <div className="h-3 rounded w-1/4" style={{ background: t.hover }} />
            <div className="h-3 rounded w-12" style={{ background: t.hover }} />
            <div className="h-3 rounded w-16" style={{ background: t.hover }} />
            <div className="h-3 rounded w-12" style={{ background: t.hover }} />
          </div>
        ))}
      </div>
    );
  }

  if (!hasLinkedBank) {
    return (
      <div
        className="flex flex-col items-center justify-center p-10 text-center max-w-lg mx-auto"
        style={{ ...panelStyle(t), borderStyle: 'dashed' }}
      >
        <div
          className="w-12 h-12 flex items-center justify-center mb-4"
          style={{ background: t.warnMuted, color: t.warn, borderRadius: 2 }}
        >
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: t.heading }}>
          Bank connection required
        </h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: t.muted }}>
          Some metrics need transactional bank data. Link your account to unlock the full insights suite.
        </p>
        <button
          type="button"
          className="pw-interactive-custom inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
          onClick={onConnectBank}
          style={{
            background: t.ctaBg,
            color: t.ctaFg,
            border: 'none',
            borderRadius: 2,
            padding: '10px 16px',
          }}
        >
          <LinkIcon className="w-4 h-4" />
          Connect bank account
        </button>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center p-8 text-sm" style={{ color: t.muted, ...panelStyle(t) }}>
        No metrics available for this category.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden" style={panelStyle(t)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.divider}`, background: t.surfaceMuted }}>
              {([
                { field: 'name' as const, label: 'Metric', sortable: true },
                { field: 'value' as const, label: 'Value', sortable: true },
                { field: null, label: 'Unit', sortable: false },
                { field: 'benchmark' as const, label: 'Benchmark', sortable: true },
                { field: null, label: 'Trend', sortable: false },
              ]).map((col) => (
                <th
                  key={col.label}
                  onClick={col.sortable && col.field ? () => handleSort(col.field!) : undefined}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${col.sortable ? 'cursor-pointer' : ''}`}
                  style={{ color: t.muted }}
                >
                  <div className="flex items-center">
                    {col.label}
                    {col.sortable && col.field ? renderSortIcon(col.field) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMetrics.map((metric) => {
              const isNA = metric.value === null || isNaN(metric.value);
              return (
                <tr
                  key={metric.id}
                  style={{ borderBottom: `1px solid ${t.divider}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm" style={{ color: t.heading }}>
                        {metric.name}
                      </span>
                      <span className="text-[11px] mt-0.5 max-w-md line-clamp-1" style={{ color: t.muted }}>
                        {metric.formula}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-sm tabular-nums" style={{ color: t.heading }}>
                    {isNA ? (
                      <div className="group/tooltip relative inline-flex items-center gap-1.5 cursor-help">
                        <span style={{ color: t.muted }}>N/A</span>
                        <Info className="w-3.5 h-3.5" style={{ color: t.muted }} />
                        <div
                          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 scale-90 opacity-0 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 transition-all duration-150 text-[10px] leading-normal font-normal p-2 z-50 text-center"
                          style={{
                            background: t.heading,
                            color: t.ctaFg,
                            borderRadius: 2,
                            boxShadow: t.shadow,
                          }}
                        >
                          Add {metric.missingData || 'required inputs'} to calculate this metric
                        </div>
                      </div>
                    ) : (
                      formatValue(metric.value, metric.unit)
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className="px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ background: t.hover, color: t.muted, borderRadius: 2 }}
                    >
                      {metric.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {metric.benchmark === 'good' && (
                        <>
                          <span className="w-2 h-2 rounded-full" style={{ background: t.success }} />
                          <span className="text-xs font-medium" style={{ color: t.success }}>Optimal</span>
                        </>
                      )}
                      {metric.benchmark === 'warning' && (
                        <>
                          <span className="w-2 h-2 rounded-full" style={{ background: t.warn }} />
                          <span className="text-xs font-medium" style={{ color: t.warn }}>Warning</span>
                        </>
                      )}
                      {metric.benchmark === 'bad' && (
                        <>
                          <span className="w-2 h-2 rounded-full" style={{ background: t.alert }} />
                          <span className="text-xs font-medium" style={{ color: t.alert }}>Underperforming</span>
                        </>
                      )}
                      {metric.benchmark === 'none' && (
                        <span className="text-xs" style={{ color: t.muted }}>No benchmark</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      {metric.trend === 'up' && (
                        <span className="inline-flex items-center" style={{ color: t.success }}>
                          <ArrowUpRight className="w-4 h-4 mr-0.5" />
                          Improving
                        </span>
                      )}
                      {metric.trend === 'down' && (
                        <span className="inline-flex items-center" style={{ color: t.alert }}>
                          <ArrowDownRight className="w-4 h-4 mr-0.5" />
                          Declining
                        </span>
                      )}
                      {metric.trend === 'flat' && (
                        <span className="inline-flex items-center" style={{ color: t.muted }}>
                          <Minus className="w-4 h-4 mr-0.5" />
                          Stable
                        </span>
                      )}
                      {(!metric.trend || isNA) && (
                        <span className="text-xs" style={{ color: t.muted }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
