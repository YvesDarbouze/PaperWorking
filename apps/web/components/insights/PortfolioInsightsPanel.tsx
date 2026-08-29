'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProjectComparisonChart from '@/components/insights/ProjectComparisonChart';
import {
  COMPARE_METRIC_OPTIONS,
  formatInvestorValue,
  INSIGHTS_TAB_CATEGORIES,
  TREND_METRIC_OPTIONS,
  TREND_PERIOD_LABELS,
  trendTone,
  type TrendPeriod,
  type InvestorKpiCard,
} from '@/lib/insights/insights-dashboard-seed';
import {
  loadInsightsDashboardMockOnly,
  loadProjects,
  useMockData,
} from '@/lib/data';
import { apiFetch } from '@/lib/api/client';
import type { ProjectWorkspace } from '@/lib/projects/types';

interface ApiMetric {
  id: string;
  name: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  benchmark?: string;
  category: string;
  isWarning?: boolean;
}

interface ApiCategory {
  category: string;
  metrics: ApiMetric[];
}

type ComparisonPoint = {
  projectId: string;
  projectName: string;
  metrics: Record<string, number>;
};

type TrendPoint = { label: string; value: number };
type KpiSection = {
  key: string;
  title: string;
  metrics: InvestorKpiCard[];
};

const TONE_CLASS = {
  positive: 'text-emerald-400',
  negative: 'text-rose-400',
  neutral: 'text-slate-500',
} as const;

/**
 * Full Insights dashboard — port of PaperWorking insights page
 * (commit era with Portfolio Aggregate / Trends / Project Comparison).
 */
export default function PortfolioInsightsPanel() {
  const mockMode = useMockData();
  const [projects, setProjects] = useState<Array<{ id: string; address?: string; propertyName?: string; name?: string }>>([]);
  const [kpiSections, setKpiSections] = useState<KpiSection[]>([]);
  const [trendSeries, setTrendSeries] = useState<Record<string, TrendPoint[]>>({});
  const [comparisonSeed, setComparisonSeed] = useState<ComparisonPoint[]>([]);
  const [scope, setScope] = useState<'portfolio' | 'project'>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('monthly');
  const [activeTab, setActiveTab] = useState('financial');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [openMetric, setOpenMetric] = useState<InvestorKpiCard | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [compareMetric, setCompareMetric] = useState<string>('cap_rate');
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const [trendMetrics, setTrendMetrics] = useState<[string, string, string]>([
    'noi',
    'cash_flow',
    'occupancy',
  ]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (mockMode) {
          const dash = loadInsightsDashboardMockOnly();
          if (cancelled) return;
          setProjects(
            (dash.projects as ProjectWorkspace[]).map((p) => ({
              id: p.id,
              address: p.address,
              propertyName: p.propertyName,
            })),
          );
          setKpiSections(dash.kpiSections as KpiSection[]);
          setTrendSeries(dash.trendSeries as Record<string, TrendPoint[]>);
          setComparisonSeed(dash.comparisonPoints as ComparisonPoint[]);
          setSelectedProjectId(dash.projects[0]?.id ?? '');
        } else {
          const list = await loadProjects();
          if (cancelled) return;
          const mapped = (Array.isArray(list) ? list : []).map((p) => {
            const row = p as Record<string, unknown>;
            return {
              id: String(row.id ?? ''),
              address: row.address ? String(row.address) : undefined,
              propertyName: String(row.propertyName ?? row.name ?? row.title ?? ''),
              name: row.name ? String(row.name) : undefined,
            };
          });
          setProjects(mapped);
          setSelectedProjectId(mapped[0]?.id ?? '');
          setKpiSections([]);
          setTrendSeries({});
          setComparisonSeed([]);
        }

        const res = await apiFetch('/api/insights', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as { categories?: ApiCategory[] };
          if (!cancelled && data.categories) setCategories(data.categories);
        }
      } catch {
        if (!cancelled && !mockMode) {
          setKpiSections([]);
          setTrendSeries({});
          setComparisonSeed([]);
        }
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mockMode]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedProjectLabel =
    selectedProject?.address ?? selectedProject?.propertyName ?? selectedProject?.name ?? 'Selected project';
  const hasProjects = projects.length > 0;

  const tabMatch = INSIGHTS_TAB_CATEGORIES.find((t) => t.id === activeTab)?.match;
  const tabMetrics = useMemo(() => {
    if (!tabMatch) return [];
    const group = categories.find((c) => c.category === tabMatch);
    return group?.metrics ?? [];
  }, [categories, tabMatch]);

  const portfolioCategoryCards = useMemo(() => {
    return categories.filter((c) =>
      ['Deal Metrics', 'Financial Metrics', 'Portfolio Metrics', 'Syndication Metrics'].includes(
        c.category,
      ),
    );
  }, [categories]);

  const comparisonPoints = useMemo(() => {
    let points = comparisonSeed.map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      value: p.metrics[compareMetric] ?? 0,
    }));
    if (sortOrder === 'asc') points = [...points].sort((a, b) => a.value - b.value);
    if (sortOrder === 'desc') points = [...points].sort((a, b) => b.value - a.value);
    return points;
  }, [compareMetric, sortOrder, comparisonSeed]);

  const compareAvg =
    comparisonPoints.length > 0
      ? comparisonPoints.reduce((s, p) => s + p.value, 0) / comparisonPoints.length
      : 0;

  function toggleWatch(id: string) {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen space-y-8 px-6 py-8 text-white">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/5 pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Insights</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/55">
            Real-time calculations, persona KPIs, portfolio aggregation, and regulatory benchmarks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-sm hover:bg-slate-700"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export to CSV
          </button>

          {hasProjects ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-1.5 backdrop-blur-md">
              <div className="flex shrink-0 rounded-lg bg-white/5 p-0.5">
                <button
                  type="button"
                  onClick={() => setScope('portfolio')}
                  className={`min-w-[72px] rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                    scope === 'portfolio'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/45 hover:text-white'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedProjectId && projects[0]) setSelectedProjectId(projects[0].id);
                    setScope('project');
                  }}
                  className={`min-w-[72px] rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                    scope === 'project'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/45 hover:text-white'
                  }`}
                >
                  Project
                </button>
              </div>

              {/* Always visible — selecting a deal switches scope to Project without layout jump */}
              <select
                value={scope === 'portfolio' ? '' : selectedProjectId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setScope('portfolio');
                    return;
                  }
                  setSelectedProjectId(id);
                  setScope('project');
                }}
                className="min-w-[168px] appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-8 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="" className="bg-slate-950">
                  All projects
                </option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id} className="bg-slate-950">
                    {proj.propertyName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Link
            href="/support/metrics"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 no-underline hover:text-white"
          >
            Playbook
          </Link>
        </div>
      </div>

      {/* Persona / engine category cards (Portfolio Metrics etc.) */}
      <div className="space-y-8">
        {loadingCats ? (
          <div className="animate-pulse rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            Calculating portfolio metrics…
          </div>
        ) : (
          portfolioCategoryCards.map((catGroup) => (
            <div key={catGroup.category} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
                  <span className="material-symbols-outlined text-[18px] text-emerald-500">
                    trending_up
                  </span>
                  {catGroup.category}
                </h2>
                <span className="text-xs font-medium text-slate-400">
                  {catGroup.metrics.length} Metrics
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {catGroup.metrics.map((metric) => (
                  <div
                    key={metric.id}
                    id={metric.id}
                    className={`rounded-2xl border p-5 shadow-sm backdrop-blur-md transition-all ${
                      metric.isWarning
                        ? 'border-rose-500/30 bg-rose-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {metric.name}
                      </span>
                      {metric.trend ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            metric.trend === 'up'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : metric.trend === 'down'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {metric.trend.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={`mt-4 text-2xl font-bold ${
                        metric.isWarning ? 'text-rose-400' : 'text-white'
                      }`}
                    >
                      {metric.value}
                    </div>
                    {metric.benchmark ? (
                      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-400">
                        <span>Benchmark:</span>
                        <span className="font-medium text-slate-300">{metric.benchmark}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Viewing context + investor KPI sections */}
      <div className="space-y-4" data-testid="insights-kpi-block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/55" data-testid="viewing-context">
            Viewing insights for:{' '}
            <span className="font-semibold text-white" data-testid="viewing-context-name">
              {scope === 'portfolio' ? 'Portfolio Aggregate' : selectedProjectLabel}
            </span>
          </p>

          <div className="flex items-center gap-2" data-testid="trend-period-selector">
            <span className="text-xs text-white/45">Compare</span>
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {(['monthly', 'quarterly', 'annual'] as TrendPeriod[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTrendPeriod(tp)}
                  data-testid={`trend-period-${tp}`}
                  aria-pressed={trendPeriod === tp}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    trendPeriod === tp
                      ? 'bg-white/10 text-white'
                      : 'text-white/45 hover:text-white'
                  }`}
                >
                  {tp === 'annual' ? 'Year' : tp === 'quarterly' ? 'Quarter' : 'Month'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8" data-testid="kpi-sections">
          {kpiSections.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/45">
              {loadingCats ? 'Loading KPIs…' : 'No KPI data yet.'}
            </p>
          ) : (
            kpiSections.map((section) => (
            <section key={section.key} data-testid={`kpi-section-${section.key}`}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/45">
                {section.title}
                <span className="ml-2 font-normal normal-case tracking-normal text-white/30">
                  ({TREND_PERIOD_LABELS[trendPeriod]})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {section.metrics.map((metric) => {
                  const trend = trendTone(metric.higherIsBetter, metric.value, metric.prior);
                  return (
                    <button
                      key={metric.id}
                      type="button"
                      onClick={() => setOpenMetric(metric)}
                      data-testid="kpi-card"
                      data-metric-id={metric.id}
                      className="cursor-pointer rounded-xl border border-white/10 bg-[#161318] p-4 text-left transition-colors hover:border-white/20"
                    >
                      <p className="truncate text-[11px] uppercase tracking-wider text-white/45">
                        {metric.name}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span
                          className="truncate text-xl font-bold tabular-nums text-white"
                          data-testid="kpi-value"
                        >
                          {formatInvestorValue(metric.value, metric.unit)}
                        </span>
                        {trend.arrow !== 'none' ? (
                          <span
                            className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold ${TONE_CLASS[trend.tone]}`}
                            data-testid="kpi-trend"
                            data-tone={trend.tone}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {trend.arrow === 'up'
                                ? 'arrow_upward'
                                : trend.arrow === 'down'
                                  ? 'arrow_downward'
                                  : 'remove'}
                            </span>
                            {trend.label}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
          )}
        </div>
      </div>

      {/* Trends */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white">Trends</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Last 24 Months
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {trendMetrics.map((metricId, idx) => {
            const opt =
              TREND_METRIC_OPTIONS.find((o) => o.id === metricId) ?? TREND_METRIC_OPTIONS[0]!;
            const series = trendSeries[opt.id] ?? [];
            const max = Math.max(...series.map((p) => p.value), 1);
            return (
              <div
                key={`${opt.id}-${idx}`}
                className="space-y-4 rounded-2xl border border-white/10 bg-[#121014]/50 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    {opt.name}
                  </h3>
                  <select
                    value={opt.id}
                    onChange={(e) => {
                      const next = [...trendMetrics] as [string, string, string];
                      next[idx] = e.target.value;
                      setTrendMetrics(next);
                    }}
                    className="appearance-none rounded-lg border border-white/10 bg-white/5 py-1 pl-3 pr-7 text-xs font-semibold text-white focus:outline-none"
                  >
                    {TREND_METRIC_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id} className="bg-slate-950">
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex h-[180px] items-end gap-1.5 px-1">
                  {series.map((point) => (
                    <div
                      key={point.label}
                      className="flex flex-1 flex-col items-center justify-end gap-1"
                      title={`${point.label}: ${point.value}`}
                    >
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.max(8, (point.value / max) * 100)}%`,
                          backgroundColor: opt.color,
                          opacity: 0.85,
                        }}
                      />
                      <span className="text-[8px] text-white/30">{point.label.replace('M-', '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Comparison — always mounted (fixed height) to avoid page jump */}
      <div className="min-h-[420px] space-y-6 rounded-2xl border border-white/10 bg-[#121014]/50 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-white/5 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Project Comparison</h2>
            <p className="mt-1 text-xs text-slate-400">
              {scope === 'portfolio'
                ? 'Compare active real estate projects. Top performers in green, bottom in red.'
                : `Highlighting ${selectedProjectLabel} against the portfolio set.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSortOrder((s) => (s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none'))
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[14px]">swap_vert</span>
              Sort:{' '}
              {sortOrder === 'none' ? 'Default' : sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
            </button>
            <select
              value={compareMetric}
              onChange={(e) => setCompareMetric(e.target.value)}
              className="appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-8 text-xs font-semibold text-white focus:outline-none"
            >
              {COMPARE_METRIC_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-slate-950">
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ProjectComparisonChart
          data={comparisonPoints}
          metricId={compareMetric}
          averageValue={compareAvg}
          height={320}
        />
      </div>

      {/* Category tabs + metrics table strip */}
      <div className="space-y-6">
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/5 pb-2">
          {INSIGHTS_TAB_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)] text-[#0d0a0b] shadow-md'
                    : 'border border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-3 font-semibold">Metric</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Trend</th>
                <th className="px-4 py-3 font-semibold">Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {tabMetrics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                    {loadingCats
                      ? 'Loading metrics…'
                      : 'No metrics in this category for the current persona.'}
                  </td>
                </tr>
              ) : (
                tabMetrics.map((m) => (
                  <tr key={m.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white/85">{m.name}</td>
                    <td className="px-4 py-3 tabular-nums text-white">{m.value}</td>
                    <td className="px-4 py-3 capitalize text-white/50">{m.trend ?? '—'}</td>
                    <td className="px-4 py-3 text-white/50">{m.benchmark ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI detail drawer */}
      {openMetric ? (
        <div
          className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setOpenMetric(null)}
        >
          <aside
            role="dialog"
            aria-label={`${openMetric.name} detail`}
            data-testid="kpi-drawer"
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md space-y-5 overflow-y-auto border-l border-white/10 bg-[#161318] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/45">Investor KPI</p>
                <h3 className="mt-0.5 text-lg font-bold text-white">{openMetric.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenMetric(null)}
                aria-label="Close"
                data-testid="kpi-drawer-close"
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-3xl font-bold tabular-nums text-white">
              {formatInvestorValue(openMetric.value, openMetric.unit)}
            </p>
            <p className="text-sm leading-relaxed text-white/60">{openMetric.description}</p>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
                Formula
              </p>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 font-mono text-xs text-emerald-400">
                {openMetric.formula}
              </div>
            </div>

            <button
              type="button"
              data-testid="kpi-watchlist-toggle"
              onClick={() => toggleWatch(openMetric.id)}
              className="w-full cursor-pointer rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
            >
              {watchlist.has(openMetric.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
