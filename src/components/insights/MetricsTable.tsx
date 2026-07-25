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
        // Map colors to numbers for sorting: good = 3, warning = 2, bad = 1, none = 0
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
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 ml-1.5 text-text-primary dark:text-white" /> 
      : <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-text-primary dark:text-white" />;
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-lg w-full" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-50 dark:bg-white/[0.02] rounded-lg w-full flex items-center px-6 justify-between">
            <div className="h-4 bg-slate-150 dark:bg-white/10 rounded w-1/4" />
            <div className="h-4 bg-slate-150 dark:bg-white/10 rounded w-12" />
            <div className="h-4 bg-slate-150 dark:bg-white/10 rounded w-16" />
            <div className="h-4 bg-slate-150 dark:bg-white/10 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!hasLinkedBank) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] backdrop-blur-md text-center max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Plaid Connection Required</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Some metrics require transactional bank sync data to generate live results. Link your bank account to unlock the full 33-KPI Insights suite.
        </p>
        <button
          onClick={onConnectBank}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all duration-200 shadow-md hover:shadow-emerald-900/10 active:scale-98"
        >
          <LinkIcon className="w-4 h-4" />
          Connect Bank Account
        </button>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 dark:text-slate-400">
        No metrics available for this category.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#121014]/98 backdrop-blur-2xl shadow-xl transition-all duration-300">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 dark:bg-white/[0.02] bg-slate-50">
              <th 
                onClick={() => handleSort('name')}
                className="group cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center">
                  Metric Name {renderSortIcon('name')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('value')}
                className="group cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center">
                  Value {renderSortIcon('value')}
                </div>
              </th>
              <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Unit
              </th>
              <th 
                onClick={() => handleSort('benchmark')}
                className="group cursor-pointer p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center">
                  Benchmark {renderSortIcon('benchmark')}
                </div>
              </th>
              <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {sortedMetrics.map((metric) => {
              const isNA = metric.value === null || isNaN(metric.value);
              return (
                <tr 
                  key={metric.id} 
                  className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all duration-150"
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-white group-hover:translate-x-0.5 transition-transform duration-200">
                        {metric.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md line-clamp-1 group-hover:line-clamp-none transition-all duration-200">
                        {metric.formula}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    {isNA ? (
                      <div className="group/tooltip relative inline-flex items-center gap-1.5 cursor-help">
                        <span className="text-slate-400 dark:text-slate-500">N/A</span>
                        <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 scale-90 opacity-0 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 transition-all duration-150 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] leading-normal font-normal p-2 rounded-lg shadow-xl z-50 text-center">
                          Add {metric.missingData || 'required inputs'} to calculate this metric
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
                        </div>
                      </div>
                    ) : (
                      formatValue(metric.value, metric.unit)
                    )}
                  </td>
                  <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-xs">
                      {metric.unit}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {metric.benchmark === 'good' && (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/20" />
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Optimal</span>
                        </>
                      )}
                      {metric.benchmark === 'warning' && (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/20" />
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Warning</span>
                        </>
                      )}
                      {metric.benchmark === 'bad' && (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/20" />
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Underperforming</span>
                        </>
                      )}
                      {metric.benchmark === 'none' && (
                        <>
                          <span className="w-4 h-0.5 bg-slate-300 dark:bg-slate-700" />
                          <span className="text-xs text-slate-400 dark:text-slate-500">No benchmark</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {metric.trend === 'up' && (
                        <div className="flex items-center text-emerald-500 font-semibold text-sm">
                          <ArrowUpRight className="w-4 h-4 mr-0.5" />
                          <span>Improving</span>
                        </div>
                      )}
                      {metric.trend === 'down' && (
                        <div className="flex items-center text-rose-500 font-semibold text-sm">
                          <ArrowDownRight className="w-4 h-4 mr-0.5" />
                          <span>Declining</span>
                        </div>
                      )}
                      {metric.trend === 'flat' && (
                        <div className="flex items-center text-slate-400 dark:text-slate-500 font-semibold text-sm">
                          <Minus className="w-4 h-4 mr-0.5" />
                          <span>Stable</span>
                        </div>
                      )}
                      {(!metric.trend || isNA) && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
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
