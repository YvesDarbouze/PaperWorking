'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, X } from 'lucide-react';
import type { MetricRegistryEntry } from '@/lib/metrics/metricRegistry';
import {
  EM_DASH,
  computeTrend,
  formatMetricValue,
  resolvedKpiSections,
  trendTone,
  type TrendTone,
} from '@/lib/metrics/investorKpiView';

/* ═══════════════════════════════════════════════════════════════════════════
   KpiSectionGrid — the Insights KPI cards.

   Visual language matches the Tax Intelligence / Reports cards: flat dark
   surface, white metric value, gray label, hairline border. No accent
   backgrounds.

   Colour is used for exactly one thing: the trend arrow. Green for genuinely
   positive movement, red for negative, gray for flat or unknown — and
   "positive" respects direction, so a rising LTV is red. See `trendTone`.
   ═══════════════════════════════════════════════════════════════════════════ */

const TONE_CLASS: Record<TrendTone, string> = {
  positive: 'text-emerald-400',
  negative: 'text-rose-400',
  neutral: 'text-slate-500',
};

export interface KpiSectionGridProps {
  /** Selected project, or null when viewing the portfolio aggregate. */
  project: unknown | null;
  /** All projects; supplied to `compute` for the aggregate view. */
  portfolio: unknown[];
  /**
   * Prior-period values keyed by metric id, used for the trend arrows. Omit
   * and every arrow renders neutral rather than inventing a comparison.
   */
  priorValues?: Record<string, number | null>;
  /** What the arrows compare against, e.g. "vs last month". Shown in the drawer. */
  periodLabel?: string;
  testId?: string;
}

interface CardData {
  metric: MetricRegistryEntry;
  value: number | null;
  display: string;
  tone: TrendTone;
  arrow: 'up' | 'down' | 'flat' | 'none';
  trendLabel: string;
}

export function KpiSectionGrid({
  project,
  portfolio,
  priorValues,
  periodLabel,
  testId = 'kpi',
}: KpiSectionGridProps) {
  const [openMetric, setOpenMetric] = useState<MetricRegistryEntry | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  const sections = useMemo(() => {
    const isAggregate = project === null;
    return resolvedKpiSections().map((section) => ({
      ...section,
      cards: section.metrics.map<CardData>((metric) => {
        let value: number | null = null;
        try {
          value = isAggregate
            ? metric.compute(null, portfolio)
            : metric.compute(project);
        } catch (err) {
          // A single bad metric must never blank the whole dashboard.
          console.warn('[KpiSectionGrid] compute failed for', metric.id, err);
          value = null;
        }
        const trend = computeTrend(value, priorValues?.[metric.id] ?? null);
        return {
          metric,
          value,
          display: formatMetricValue(value, metric.unit),
          tone: trendTone(metric.id, trend.direction),
          arrow: trend.direction,
          trendLabel: trend.label,
        };
      }),
    }));
  }, [project, portfolio, priorValues]);

  const toggleWatch = (id: string) =>
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-8" data-testid={`${testId}-sections`}>
      {sections.map((section) => (
        <section key={section.key} data-testid={`${testId}-section-${section.key}`}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-3">
            {section.title}
          </h2>

          {/* 1 col mobile · 2 tablet · 4 desktop (requirement 6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {section.cards.map((card) => (
              <button
                key={card.metric.id}
                type="button"
                onClick={() => setOpenMetric(card.metric)}
                data-testid={`${testId}-card`}
                data-metric-id={card.metric.id}
                className="pw-interactive-custom text-left rounded-xl border border-[var(--pw-border)] bg-[var(--pw-surface)] p-4 hover:border-white/20 transition-colors cursor-pointer"
              >
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-on-surface-variant)] truncate">
                  {card.metric.name}
                </p>

                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span
                    className="text-xl font-bold text-white tabular-nums truncate"
                    data-testid={`${testId}-value`}
                  >
                    {card.display}
                  </span>

                  {card.arrow !== 'none' && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold shrink-0 ${TONE_CLASS[card.tone]}`}
                      data-testid={`${testId}-trend`}
                      data-tone={card.tone}
                    >
                      {card.arrow === 'up' && <ArrowUp className="w-3 h-3" />}
                      {card.arrow === 'down' && <ArrowDown className="w-3 h-3" />}
                      {card.arrow === 'flat' && <Minus className="w-3 h-3" />}
                      {card.trendLabel !== EM_DASH && card.trendLabel}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* ── Detail drawer (requirement 4) ── */}
      {openMetric && (
        <div
          className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setOpenMetric(null)}
        >
          <aside
            role="dialog"
            aria-label={`${openMetric.name} detail`}
            data-testid={`${testId}-drawer`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full overflow-y-auto p-6 space-y-5"
            style={{ background: 'var(--pw-surface)', borderLeft: '1px solid var(--pw-border)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  {openMetric.category}
                </p>
                <h3 className="text-lg font-bold text-white mt-0.5">{openMetric.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenMetric(null)}
                aria-label="Close"
                data-testid={`${testId}-drawer-close`}
                className="pw-interactive-custom p-1.5 rounded-lg text-slate-400 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1">
                Formula
              </p>
              <p className="text-sm text-slate-300 font-mono leading-relaxed">
                {openMetric.formula}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1">
                Benchmark
              </p>
              <p className="text-sm text-slate-300">
                {openMetric.benchmark.good === null && openMetric.benchmark.warning === null
                  ? 'No published benchmark for this metric.'
                  : `Good ${openMetric.benchmark.good ?? EM_DASH} · Watch ${openMetric.benchmark.warning ?? EM_DASH}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleWatch(openMetric.id)}
              data-testid={`${testId}-watchlist-toggle`}
              aria-pressed={watchlist.has(openMetric.id)}
              className="pw-interactive-custom w-full h-10 rounded-lg border border-[var(--pw-border)] text-sm font-semibold text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {watchlist.has(openMetric.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </button>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1">
                Trend basis
              </p>
              <p className="text-sm text-slate-300" data-testid={`${testId}-drawer-period`}>
                {periodLabel
                  ? `Arrows compare ${periodLabel}.`
                  : 'No prior period recorded yet, so arrows stay neutral.'}
              </p>
            </div>

            <p className="text-xs text-slate-500">
              Historical trend charts appear here once at least two reporting periods
              have been recorded for this metric.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

export default KpiSectionGrid;
