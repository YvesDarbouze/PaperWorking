'use client';

import React from 'react';
import { METRIC_TAXONOMY, CATEGORY_ORDER, type MetricCategory, type MetricTaxonomyEntry } from '@/lib/metrics/metricTaxonomy';
import { DataFreshnessPill } from '@/components/kpi/DataFreshnessPill';
import { TrendingUp, BarChart2, ShieldCheck, Activity, Layers, Users, ArrowUpRight } from 'lucide-react';

export interface InsightsDatapointGridProps {
  onSelectKPI: (kpiId: string) => void;
  computedValues?: Record<string, number | null>;
  lastComputedAt?: string | Date;
}

const CATEGORY_ICONS: Record<MetricCategory, React.ElementType> = {
  'Financial Performance': BarChart2,
  'Operational Efficiency': Activity,
  'Asset & Portfolio Management': Layers,
  'Marketing & Sales': Users,
  'Risk Management & Compliance': ShieldCheck,
};

function MiniSparkline({ value }: { value: number | null }) {
  if (value === null || isNaN(value)) {
    return <div className="h-6 w-16 border-b border-dashed border-slate-600/40 opacity-40" />;
  }
  // Subtle SVG sparkline based on value
  const height = 24;
  const width = 60;
  const pts = [
    [0, height * 0.7],
    [15, height * 0.5],
    [30, height * 0.6],
    [45, height * 0.3],
    [60, height * 0.2],
  ];
  const pathD = `M ${pts.map((p) => p.join(',')).join(' L ')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={pathD} fill="none" stroke="var(--color-primary, #10b981)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function InsightsDatapointGrid({
  onSelectKPI,
  computedValues = {},
  lastComputedAt,
}: InsightsDatapointGridProps) {

  const formatValue = (kpi: MetricTaxonomyEntry, rawVal: number | null) => {
    if (rawVal === null || isNaN(rawVal)) return '—';
    if (kpi.benchmark.includes('%') || kpi.name.toLowerCase().includes('rate') || kpi.name.toLowerCase().includes('yield') || kpi.name.toLowerCase().includes('return') || kpi.name.toLowerCase().includes('occupancy') || kpi.name.toLowerCase().includes('variance') || kpi.name.toLowerCase().includes('growth') || kpi.id === 'COC' || kpi.id === 'OER') {
      return `${rawVal.toFixed(1)}%`;
    }
    if (kpi.benchmark.includes('$') || kpi.name.toLowerCase().includes('income') || kpi.name.toLowerCase().includes('flow') || kpi.name.toLowerCase().includes('cost') || kpi.name.toLowerCase().includes('commission') || kpi.id === 'NOI' || kpi.id === 'CASH_FLOW' || kpi.id === 'CAPEX' || kpi.id === 'GOI') {
      return rawVal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    }
    if (kpi.id === 'GRM' || kpi.id === 'DSCR' || kpi.id === 'EQUITY_MULTIPLE' || kpi.id === 'INTEREST_COVERAGE' || kpi.id === 'RISK_SCORE') {
      return rawVal.toFixed(2);
    }
    return rawVal.toLocaleString('en-US', { maximumFractionDigits: 1 });
  };

  return (
    <div className="space-y-10" data-testid="insights-grid">
      {CATEGORY_ORDER.map((category) => {
        const CategoryIcon = CATEGORY_ICONS[category] || BarChart2;
        const categoryKPIs = METRIC_TAXONOMY.filter((m) => m.category === category);

        return (
          <section key={category} className="space-y-4" data-testid={`category-section-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
            {/* Category Heading */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CategoryIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-outfit">
                    {category}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {categoryKPIs.length} canonical datapoints
                  </p>
                </div>
              </div>

              <DataFreshnessPill lastComputedAt={lastComputedAt} />
            </div>

            {/* Grid of KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categoryKPIs.map((kpi) => {
                const rawVal = computedValues[kpi.id] !== undefined ? computedValues[kpi.id] : null;
                const formattedVal = formatValue(kpi, rawVal);
                const kpiIdLower = kpi.id.toLowerCase();

                return (
                  <button
                    key={kpi.id}
                    type="button"
                    data-testid={`kpi-card-${kpiIdLower}`}
                    data-kpi-id={kpi.id}
                    onClick={() => onSelectKPI(kpi.id)}
                    className="group relative flex flex-col justify-between p-5 rounded-xl text-left bg-white dark:bg-[#16141a] border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    {/* Top Row: KPI Number + Icon */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        {kpi.kpiNumber && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono">
                            #{kpi.kpiNumber}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                          {kpi.tier === 'hero' ? 'Hero Scorecard' : 'Supplemental'}
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug mb-3 group-hover:text-emerald-400 transition-colors">
                      {kpi.name}
                    </h3>

                    {/* Bottom Row: Value + Sparkline */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-end justify-between gap-2 mt-auto">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Current Benchmark
                        </span>
                        <p className="text-xl font-bold font-mono text-slate-900 dark:text-emerald-400 tabular-nums">
                          {formattedVal}
                        </p>
                      </div>

                      <div className="shrink-0 pb-0.5">
                        <MiniSparkline value={rawVal} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default InsightsDatapointGrid;
