'use client';

import React from 'react';
import { ChartFrame } from '@/lib/viz/ChartFrame';
import { VIZ_COLORS } from '@/lib/viz/theme';
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatRatio,
  niceTickRange,
} from '@/lib/viz/format';

export interface ComparisonBarPoint {
  projectId: string;
  projectName: string;
  value: number;
}

export interface ProjectComparisonChartProps {
  data: ComparisonBarPoint[];
  metricId: string;
  averageValue: number | null;
  height?: number;
  headerAction?: React.ReactNode;
  subtitle?: string;
  isDemo?: boolean;
  dataProvenance?: 'computed' | 'illustrative_demo';
}

const LOWER_IS_BETTER = new Set(['grm', 'ltv', 'oer', 'tenant_turnover', 'days_on_market']);

const METRIC_LABELS: Record<string, { name: string; unit: string }> = {
  cap_rate: { name: 'Cap Rate on Cost', unit: '%' },
  cash_on_cash: { name: 'Cash-on-Cash Return', unit: '%' },
  coc: { name: 'Cash-on-Cash Return', unit: '%' },
  dscr: { name: 'Debt Service Coverage (DSCR)', unit: '×' },
  ltv: { name: 'Loan-to-Value (LTV)', unit: '%' },
  oer: { name: 'Operating Expense Ratio (OER)', unit: '%' },
  grm: { name: 'Gross Rent Multiplier (GRM)', unit: '×' },
  noi: { name: 'Net Operating Income', unit: '$' },
  cash_flow: { name: 'Net Cash Flow', unit: '$' },
  occupancy: { name: 'Occupancy Rate', unit: '%' },
};

function truncateName(name: string) {
  return name.length > 16 ? `${name.slice(0, 13)}…` : name;
}

function formatVal(metricId: string, v: number): string {
  const mId = metricId.toLowerCase();
  if (
    mId.includes('rate') ||
    mId === 'coc' ||
    mId === 'cash_on_cash' ||
    mId === 'oer' ||
    mId === 'ltv' ||
    mId === 'cap_rate'
  ) {
    return formatPercent(v, { decimals: 1 });
  }
  if (mId === 'dscr' || mId === 'grm') {
    return formatMultiple(v, { decimals: 2 });
  }
  if (mId === 'noi' || mId === 'cash_flow') {
    return formatCurrency(v, { compact: true });
  }
  return formatRatio(v, 2);
}

export default function ProjectComparisonChart({
  data,
  metricId,
  averageValue,
  height = 320,
  headerAction,
  subtitle,
  isDemo = false,
  dataProvenance,
}: ProjectComparisonChartProps) {
  const metricMeta = METRIC_LABELS[metricId.toLowerCase()] || {
    name: metricId.toUpperCase(),
    unit: '',
  };

  const showDemoBadge = isDemo || dataProvenance === 'illustrative_demo';
  const demoBadgeElement = showDemoBadge ? (
    <span
      data-testid="chart-demo-badge"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
    >
      <span className="material-symbols-outlined text-xs">science</span>
      ILLUSTRATIVE DEMO DATA
    </span>
  ) : null;

  const combinedHeaderAction = (
    <div className="flex items-center gap-3">
      {demoBadgeElement}
      {headerAction}
    </div>
  );

  if (data.length === 0) {
    return (
      <ChartFrame
        title="Project Comparison"
        timeframe="Active Portfolio"
        subtitle={subtitle || 'No active project comparison data available.'}
        unitBadge={metricMeta.unit || undefined}
        source="Source: Authoritative 33-KPI Financial Engine"
        ariaLabel="Empty project comparison chart"
        headerAction={combinedHeaderAction}
      >
        <div
          style={{ height }}
          className="flex items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/40"
        >
          No Data Available
        </div>
      </ChartFrame>
    );
  }

  const lowerIsBetter = LOWER_IS_BETTER.has(metricId.toLowerCase());

  // Article 3 Rule 3: Categorical bars sorted descending by value (or natural order).
  // If not already sorted, sort descending by value (or ascending if lower is better).
  const indexed = data.map((d, originalIndex) => ({ ...d, originalIndex }));
  const sorted = [...indexed].sort((a, b) => a.value - b.value);

  const topIdx = new Set<number>();
  const bottomIdx = new Set<number>();
  if (lowerIsBetter) {
    sorted.slice(0, Math.min(3, sorted.length)).forEach((i) => topIdx.add(i.originalIndex));
    sorted.slice(Math.max(0, sorted.length - 3)).forEach((i) => bottomIdx.add(i.originalIndex));
  } else {
    sorted.slice(Math.max(0, sorted.length - 3)).forEach((i) => topIdx.add(i.originalIndex));
    sorted
      .slice(0, Math.min(3, Math.max(0, sorted.length - 3)))
      .forEach((i) => bottomIdx.add(i.originalIndex));
  }

  // Article 2 Rule 1: Zero baseline mandatory for bar/column charts.
  const rawMax = Math.max(...data.map((d) => d.value), averageValue ?? 0, 1);
  const tickRange = niceTickRange(0, rawMax, 5);
  const yAxisMax = Math.max(tickRange.max, rawMax);
  const yTicks = tickRange.ticks;

  const dataTable = {
    caption: `Project Comparison — ${metricMeta.name}`,
    headers: ['Project', `${metricMeta.name} (${metricMeta.unit})`],
    rows: data.map((d) => [d.projectName, formatVal(metricId, d.value)]),
  };

  const legendItems = [
    { label: 'Top Performer', color: VIZ_COLORS.accent },
    { label: 'Standard Set', color: VIZ_COLORS.secondary },
    ...(averageValue !== null
      ? [{ label: 'Portfolio Average', color: VIZ_COLORS.caution, style: 'dashed' as const }]
      : []),
  ];

  const avgFormatted = averageValue !== null ? formatVal(metricId, averageValue) : '—';
  const ariaLabel = `Project Comparison for ${metricMeta.name}: ${data.length} projects analyzed. Portfolio average is ${avgFormatted}. Highest value is ${formatVal(metricId, Math.max(...data.map((d) => d.value)))}.`;

  return (
    <ChartFrame
      title={`Project Comparison — ${metricMeta.name}`}
      timeframe="Active Portfolio"
      subtitle={
        subtitle ||
        'Cross-deal benchmarking. Top performers highlighted with active status token.'
      }
      unitBadge={metricMeta.unit || undefined}
      legend={legendItems}
      source="Source: Authoritative 33-KPI Financial Engine · Project Underwriting Model"
      ariaLabel={ariaLabel}
      dataTable={dataTable}
      headerAction={combinedHeaderAction}
    >
      <div style={{ height }} className="flex flex-col">
        {/* Y-axis Title (Article 1 Rule 2) */}
        <div className="flex items-center justify-between pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>
            {metricMeta.name} ({metricMeta.unit || 'Score'})
          </span>
          {averageValue !== null && (
            <span className="font-mono text-slate-400">
              Avg: <strong className="text-white">{avgFormatted}</strong>
            </span>
          )}
        </div>

        <div className="relative min-h-0 flex-1">
          {/* Y Gridlines (Article 2 Rule 4: subdued gridlines) */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1 pl-10 pr-2">
            {yTicks
              .slice()
              .reverse()
              .map((tick) => (
                <div key={tick} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-right font-mono text-[9px] tabular-nums text-slate-500">
                    {tick >= 10 ? tick.toFixed(0) : tick.toFixed(1)}
                  </span>
                  <div className="h-px flex-1 border-t border-dashed border-white/[0.05]" />
                </div>
              ))}
          </div>

          {/* Average Reference Line (Article 2 Rule 5) */}
          {averageValue !== null ? (
            <div
              className="pointer-events-none absolute right-2 left-12 z-10 flex items-center"
              style={{ bottom: `${(averageValue / yAxisMax) * 100}%` }}
            >
              <div className="h-px flex-1 border-t border-dashed border-[var(--status-caution,#F06543)]" />
              <span className="ml-2 shrink-0 rounded border border-[var(--status-caution,#F06543)]/30 bg-[var(--status-caution,#F06543)]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--status-caution,#F06543)] tabular-nums">
                Avg: {avgFormatted}
              </span>
            </div>
          ) : null}

          {/* Bars (Article 2 Rule 1: Zero Baseline; Article 3: Semantic Palette) */}
          <div className="absolute inset-0 flex items-end gap-3 pb-0 pl-12 pr-3 pt-6">
            {data.map((d, index) => {
              let color: string = VIZ_COLORS.secondary;
              if (topIdx.has(index)) color = VIZ_COLORS.accent;
              else if (bottomIdx.has(index)) color = VIZ_COLORS.danger;

              // Zero baseline: strictly proportionate height from 0 to yAxisMax
              const hPct = Math.max(0, Math.min(100, (d.value / yAxisMax) * 100));

              return (
                <div
                  key={d.projectId}
                  className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  title={`${d.projectName}: ${formatVal(metricId, d.value)}`}
                >
                  {/* Data label at top of bar (Article 3 Rule 2: permanent for <=12 bars) */}
                  <span
                    className={`mb-1 font-mono text-[10px] font-semibold tabular-nums text-white/85 transition-opacity ${
                      data.length <= 12 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {formatVal(metricId, d.value)}
                  </span>
                  <div
                    className="w-[40%] min-w-[28px] max-w-[72px] rounded-t transition-all duration-300"
                    style={{ height: `${hPct}%`, backgroundColor: color }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis Label & Project Names (Article 1 Rule 2) */}
        <div className="mt-2 flex gap-3 border-t border-white/5 pt-2 pl-12 pr-3">
          {data.map((d) => (
            <div
              key={d.projectId}
              className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-400"
              title={d.projectName}
            >
              {truncateName(d.projectName)}
            </div>
          ))}
        </div>
        <div className="text-center pt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
          Projects
        </div>
      </div>
    </ChartFrame>
  );
}
