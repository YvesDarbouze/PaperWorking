'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import ProjectComparisonChart from '@/components/insights/ProjectComparisonChart';
import { Button } from '@/components/ui/Button';
import { KpiDetailModal } from '@/components/insights/KpiDetailModal';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
import type { ProjectSummary } from '@/lib/projects/types';
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
  derivePortfolioMetrics,
  deriveSingleProjectMetrics,
  build24MonthTrendSeries,
  buildProjectComparisonPoints,
  hasUnderwritingInputs,
  type TrendPoint24,
  type LiveComparisonPoint,
} from '@/lib/insights/live-insights';
import {
  AUTHORITATIVE_33_KPIS,
  getKpiById,
  getKpisByCategory,
  getKpisByPhase,
  KPI_CATEGORIES,
  KPI_CATEGORY_METADATA,
  PHASE_HEADERS,
  type KpiDefinition,
  type KpiCategory,
  type KpiPhaseNumber,
} from '@/lib/insights/kpi-registry';
import { exportBulkKpiCsv } from '@/lib/export/kpi-csv';
import type { ProjectMetricsResult } from '@paperworking/financial-engine';
import { ChartFrame } from '@/lib/viz/ChartFrame';
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatRatio,
} from '@/lib/viz/format';

interface ApiMetric {
  id: string;
  name: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  benchmark?: string;
  category: string;
  isWarning?: boolean;
  dataProvenance?: 'computed' | 'illustrative_demo';
}

interface ApiCategory {
  category: string;
  metrics: ApiMetric[];
}

/**
 * Sparkline micro-component per Article 5 of Data Visualization Constitution.
 * <=120px wide, inline in KPI card with mandatory aria-label.
 */
function KpiSparkline({
  kpi,
  value,
  period,
}: {
  kpi: KpiDefinition;
  value: number | null;
  period: TrendPeriod;
}) {
  const formatted = value !== null && !Number.isNaN(value) ? String(value) : '—';
  const ariaLabel = `${kpi.name} trend: current ${formatted} (${period})`;

  // 5-bar subtle visual micro-sparkline
  const pseudoDeltas = [0.88, 0.94, 0.91, 0.97, 1.0];

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex items-end gap-0.5 h-3.5 w-12 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
    >
      {pseudoDeltas.map((factor, i) => (
        <div
          key={i}
          className="flex-1 rounded-xs"
          style={{
            height: `${Math.max(20, Math.min(100, factor * 85))}%`,
            backgroundColor:
              i === 4 ? 'var(--accent, #00dd94)' : 'var(--text-secondary, #9E9DA0)',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Determines whether the "Load Demo Fixture" action should be rendered.
 * Strictly forbidden in production environments (nodeEnv === 'production').
 * In non-production, renders only when the demo flag is actively set (?demo=true).
 */
export function shouldShowDemoLoader(
  isDemoParam: boolean,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (nodeEnv === 'production') return false;
  return Boolean(isDemoParam);
}

export default function PortfolioInsightsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDemoParam = searchParams.get('demo') === 'true';
  const periodParam = searchParams.get('period') as TrendPeriod | null;
  const projectParam = searchParams.get('project');
  const initialPeriod: TrendPeriod =
    periodParam && ['monthly', 'quarterly', 'annual'].includes(periodParam)
      ? periodParam
      : 'monthly';

  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(initialPeriod);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadProjectsError, setLoadProjectsError] = useState<string | null>(null);
  const [scope, setScope] = useState<'portfolio' | 'project'>('portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [activeTab, setActiveTab] = useState('financial');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [compareMetric, setCompareMetric] = useState<string>('cap_rate');
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const [trendMetrics, setTrendMetrics] = useState<[string, string, string]>([
    'noi',
    'cash_flow',
    'occupancy',
  ]);

  // Expandable Modal state
  const [expandedKpi, setExpandedKpi] = useState<KpiDefinition | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [bulkExportToast, setBulkExportToast] = useState<string | null>(null);

  // Derived live financial engine state
  const [activeMetrics, setActiveMetrics] = useState<ProjectMetricsResult | null>(null);
  const [projectResultsMap, setProjectResultsMap] = useState<Map<string, ProjectMetricsResult>>(
    new Map(),
  );
  const [computingMetrics, setComputingMetrics] = useState(false);

  const auth = useOptionalAuth();
  const isAuthed = auth ? auth.authenticated && !auth.loading : true;

  // Sync trendPeriod from URL if query param changes externally
  useEffect(() => {
    if (periodParam && ['monthly', 'quarterly', 'annual'].includes(periodParam)) {
      setTrendPeriod(periodParam);
    }
  }, [periodParam]);

  // Sync project context from URL if query param changes externally
  useEffect(() => {
    if (!projectParam || projects.length === 0) return;
    if (projectParam === 'portfolio') {
      setScope('portfolio');
      setSelectedProjectId('');
    } else if (projects.some((p) => p.id === projectParam)) {
      setScope('project');
      setSelectedProjectId(projectParam);
    }
  }, [projectParam, projects]);

  // Load real projects from API (or demo fixture if explicit)
  const loadProjects = async () => {
    setLoadingProjects(true);
    setLoadProjectsError(null);
    try {
      const res = await bffFetch('/api/projects');
      if (res.ok) {
        const data = (await res.json()) as { projects?: ProjectSummary[] };
        const loaded = data.projects || [];
        setProjects(loaded);
        if (loaded.length > 0) {
          if (projectParam === 'portfolio') {
            setScope('portfolio');
            setSelectedProjectId('');
          } else if (projectParam && loaded.some((p) => p.id === projectParam)) {
            setScope('project');
            setSelectedProjectId(projectParam);
          } else {
            const firstWithInputs = loaded.find((p) => hasUnderwritingInputs(p));
            if (firstWithInputs) {
              setScope('project');
              setSelectedProjectId(firstWithInputs.id);
            } else {
              setScope('project');
              setSelectedProjectId(loaded[0].id);
            }
          }
        }
      } else {
        setProjects([]);
        setLoadProjectsError(`Failed to load projects (${res.status})`);
      }
    } catch (err: unknown) {
      setProjects([]);
      const msg = err instanceof Error ? err.message : 'Network error loading projects';
      setLoadProjectsError(msg);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  // Load categories from insights API
  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await bffFetch('/api/insights?userId=dev-user-1', {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as { categories?: ApiCategory[] };
          if (!cancelled && data.categories) setCategories(data.categories);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  // Recompute financial engine metrics whenever projects, scope, or selection changes
  useEffect(() => {
    let cancelled = false;
    async function compute() {
      if (projects.length === 0) {
        setActiveMetrics(null);
        return;
      }

      setComputingMetrics(true);
      try {
        const { metricsResult: portfolioRes, projectResults } =
          await derivePortfolioMetrics(projects);
        if (cancelled) return;

        setProjectResultsMap(projectResults);

        if (scope === 'portfolio') {
          setActiveMetrics(portfolioRes);
        } else {
          const selected = projects.find((p) => p.id === selectedProjectId) || projects[0];
          const singleRes =
            projectResults.get(selected.id) || (await deriveSingleProjectMetrics(selected));
          if (!cancelled) setActiveMetrics(singleRes);
        }
      } catch (err) {
        console.error('Error deriving live insights metrics:', err);
      } finally {
        if (!cancelled) setComputingMetrics(false);
      }
    }

    void compute();
    return () => {
      cancelled = true;
    };
  }, [projects, scope, selectedProjectId]);

  // Handle period change with URL sync
  const handlePeriodChange = (newPeriod: TrendPeriod) => {
    setTrendPeriod(newPeriod);
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Handle project context selection with URL sync
  const handleProjectContextChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '__portfolio__' || value === 'portfolio') {
      setScope('portfolio');
      setSelectedProjectId('');
      params.set('project', 'portfolio');
    } else {
      setScope('project');
      setSelectedProjectId(value);
      params.set('project', value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Handle exiting demo fixture
  const handleExitDemo = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('demo');
    router.replace(
      params.toString() ? `?${params.toString()}` : '/dashboard/insights',
      { scroll: false },
    );
    void (async () => {
      setLoadingProjects(true);
      try {
        const res = await bffFetch('/api/projects');
        if (res.ok) {
          const data = (await res.json()) as { projects?: ProjectSummary[] };
          const loaded = data.projects || [];
          setProjects(loaded);
          if (loaded.length > 0) setSelectedProjectId(loaded[0].id);
        } else {
          setProjects([]);
        }
      } catch {
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    })();
  };

  // Bulk Export CSV Handler (F-K1, F-K4)
  const handleBulkExportCsv = () => {
    const kpis = AUTHORITATIVE_33_KPIS.map((k) => {
      const rawVal = k.getValue(activeMetrics, trendPeriod);
      let formattedVal = '—';
      if (rawVal !== null && !Number.isNaN(rawVal)) {
        if (k.unit === 'currency') formattedVal = `$${Math.round(rawVal).toLocaleString('en-US')}`;
        else if (k.unit === 'percent') formattedVal = `${rawVal.toFixed(1)}%`;
        else if (k.unit === 'ratio') formattedVal = `${rawVal.toFixed(2)}×`;
        else formattedVal = String(rawVal);
      }
      return {
        number: k.number,
        name: k.name,
        id: k.id,
        phase: k.phase,
        category: k.category,
        unit: k.unit,
        rawValue: rawVal,
        formattedValue: formattedVal,
        formulaTemplate: k.formulaTemplate,
        inputsList: k.inputs.map((inp) => inp.name).join('; '),
      };
    });

    const filename = exportBulkKpiCsv({
      kpis,
      period: trendPeriod,
      projectCount: projects.length,
      projectName:
        scope === 'portfolio' ? 'Portfolio Aggregate' : selectedProject?.propertyName || 'Project',
      projectSlug: scope === 'portfolio' ? 'portfolio' : selectedProject?.id || 'project',
    });

    setBulkExportToast(`Exported ${filename}`);
    setTimeout(() => setBulkExportToast(null), 4000);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const selectedProjectLabel =
    selectedProject?.address ?? selectedProject?.propertyName ?? 'Selected project';
  const hasProjects = projects.length > 0;

  const isDemoActive = Boolean(
    isDemoParam ||
      projects.length === 0 ||
      projects.some((p) => p.id.startsWith('deal-') || (p as any).isDemo)
  );

  const hasInputsForContext = useMemo(() => {
    if (scope === 'portfolio') {
      return projects.some((p) => hasUnderwritingInputs(p));
    }
    return Boolean(selectedProject && hasUnderwritingInputs(selectedProject));
  }, [scope, projects, selectedProject]);

  // Live 24-Month Trend Series (F-K3)
  const liveTrendSeries: Record<string, TrendPoint24[]> = useMemo(() => {
    if (!activeMetrics) return {};
    return build24MonthTrendSeries(activeMetrics, 8);
  }, [activeMetrics]);

  // Live Project Comparison Points (F-K5)
  const comparisonPoints: LiveComparisonPoint[] = useMemo(() => {
    let pts = buildProjectComparisonPoints(projects, projectResultsMap, compareMetric);
    if (sortOrder === 'asc') pts = [...pts].sort((a, b) => a.value - b.value);
    if (sortOrder === 'desc') pts = [...pts].sort((a, b) => b.value - a.value);
    return pts;
  }, [projects, projectResultsMap, compareMetric, sortOrder]);

  const compareAvg =
    comparisonPoints.reduce((s, p) => s + p.value, 0) / Math.max(comparisonPoints.length, 1);

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

  // Scenario C: Explicit Actionable API Error State
  if (loadProjectsError && !loadingProjects) {
    return (
      <div
        className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center"
        data-testid="insights-api-error"
      >
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-12 max-w-lg w-full shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="material-symbols-outlined text-3xl text-rose-400">error</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Unable to load insights</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {loadProjectsError}. Please check your connection and try again.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              size="md"
              onClick={() => void loadProjects()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Scenario A: Guided Zero-Projects Empty State
  if (!loadingProjects && !hasProjects) {
    const showDemoLoader = shouldShowDemoLoader(isDemoParam, process.env.NODE_ENV);

    return (
      <div
        className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center relative"
        data-testid="insights-empty-state"
      >
        {/* Demo Fixture Notice if active */}
        {isDemoParam && (
          <div
            data-testid="demo-fixture-banner"
            className="mb-8 w-full max-w-lg flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">science</span>
              DEMO FIXTURE ACTIVE — Displaying sample underwriting data for evaluation.
            </span>
            <button
              type="button"
              data-testid="exit-demo-banner-btn"
              onClick={handleExitDemo}
              className="underline hover:text-white cursor-pointer"
            >
              Exit Demo Fixture
            </button>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 max-w-lg w-full shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-3xl text-white/30">analytics</span>
          </div>
          <div className="text-xs uppercase tracking-wider font-semibold text-white/40 mb-1">
            No KPI data yet.
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Insights are computed from your project underwriting inputs.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            KPIs appear once a project has underwriting inputs — financial assumptions are required to compute live portfolio metrics.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              href="/projects/new"
              variant="primary"
              size="md"
              data-testid="create-project-btn"
            >
              + Create New Project
            </Button>
            {showDemoLoader && (
              <Button
                variant="secondary"
                size="md"
                data-testid="load-demo-fixture-btn"
                onClick={() => {
                  setProjects(SEED_PROJECTS);
                  setSelectedProjectId(SEED_PROJECTS[0]?.id ?? '');
                }}
              >
                Load Demo Fixture
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 px-6 py-8 text-white">
      {/* Toast Alert for Bulk Download */}
      {bulkExportToast && (
        <div
          data-testid="bulk-download-toast"
          className="fixed top-6 right-6 z-[150] flex items-center gap-2 rounded-xl border border-[var(--accent,#00dd94)]/40 bg-[var(--bg-elevated,#18151c)] px-5 py-3 text-xs font-semibold text-[var(--accent,#00dd94)] shadow-2xl backdrop-blur-md"
        >
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{bulkExportToast}</span>
        </div>
      )}

      {/* Demo Fixture Notice if active */}
      {isDemoParam && (
        <div
          data-testid="demo-fixture-banner"
          className="flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300 backdrop-blur-sm"
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">science</span>
            DEMO FIXTURE ACTIVE — Displaying sample underwriting data for evaluation.
          </span>
          <button
            type="button"
            data-testid="exit-demo-banner-btn"
            onClick={handleExitDemo}
            className="underline hover:text-white cursor-pointer"
          >
            Exit Demo Fixture
          </button>
        </div>
      )}

      {/* Header — F-K1: Canonical Secondary Bulk Export */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/5 pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Insights</h1>
            {isDemoActive && (
              <span
                data-testid="illustrative-demo-badge"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
              >
                ILLUSTRATIVE DEMO DATA
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white/55">
            Real-time calculations, persona KPIs, portfolio aggregation, and regulatory benchmarks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleBulkExportCsv}
            data-testid="header-bulk-export-csv-btn"
            icon={<span className="material-symbols-outlined text-[16px]">download</span>}
          >
            Export to CSV
          </Button>

          {hasProjects ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-1.5 backdrop-blur-md">
              <div className="relative">
                <select
                  data-testid="project-context-selector"
                  aria-label="Select project context"
                  value={scope === 'portfolio' ? '__portfolio__' : selectedProjectId}
                  onChange={(e) => handleProjectContextChange(e.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-8 text-xs font-semibold text-white focus:outline-none hover:bg-white/10 transition-colors"
                >
                  <option value="__portfolio__" className="bg-slate-950">
                    Portfolio Aggregate
                  </option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="bg-slate-950">
                      {proj.propertyName || proj.address}
                    </option>
                  ))}
                </select>
              </div>

              {/* F-K6: Canonical Secondary Playbook Button */}
              <Button href="/support/metrics" variant="secondary" size="sm">
                Playbook
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Persona / engine category cards (Portfolio Metrics) */}
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
                  <span className="material-symbols-outlined text-[18px] text-[color:var(--status-live,var(--accent,#00dd94))]">
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
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {metric.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(metric.dataProvenance === 'illustrative_demo' || isDemoActive) && (
                          <span
                            data-testid="persona-card-demo-badge"
                            className="inline-flex items-center rounded-xs bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-500/30"
                          >
                            ILLUSTRATIVE DEMO DATA
                          </span>
                        )}
                        {metric.trend ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              metric.trend === 'up'
                                ? 'bg-[var(--accent,#00dd94)]/10 text-[var(--accent,#00dd94)]'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {metric.trend}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-2xl font-bold tracking-tight text-white">
                        {metric.value}
                      </span>
                    </div>
                    {metric.benchmark ? (
                      <div className="mt-3 flex items-center gap-1.5 border-t border-white/5 pt-3 text-[11px] text-slate-400">
                        <span>Target:</span>
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

      {/* Viewing context + Authoritative 33 Underwriting KPI Sections */}
      <div className="space-y-6" data-testid="insights-kpi-block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/55" data-testid="viewing-context">
            Viewing insights for:{' '}
            <span className="font-semibold text-white" data-testid="viewing-context-name">
              {scope === 'portfolio' ? 'Portfolio Aggregate' : selectedProjectLabel}
            </span>
          </p>

          <div className="flex items-center gap-2" data-testid="trend-period-selector">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {(['monthly', 'quarterly', 'annual'] as TrendPeriod[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => handlePeriodChange(tp)}
                  data-testid={`trend-period-${tp}`}
                  aria-pressed={trendPeriod === tp}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    trendPeriod === tp
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/45 hover:text-white'
                  }`}
                >
                  {tp === 'annual' ? 'Year' : tp === 'quarterly' ? 'Quarter' : 'Month'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scenario B Banner: Missing Underwriting Inputs */}
        {!hasInputsForContext && (
          <div
            data-testid="underwriting-needed-banner"
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-400 text-xl">warning</span>
              <p className="text-sm font-medium">
                Underwriting inputs needed. Complete inputs for{' '}
                <span className="font-semibold text-white">
                  {scope === 'portfolio'
                    ? 'your projects'
                    : selectedProject?.propertyName || selectedProject?.address || 'this project'}
                </span>{' '}
                to compute 33 live KPIs.
              </p>
            </div>
            {selectedProject ? (
              <Button
                href={`/project/${selectedProject.id}/underwriting`}
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                Complete Inputs →
              </Button>
            ) : (
              <Button
                href="/projects"
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                View Projects →
              </Button>
            )}
          </div>
        )}

        {/* All 33 Underwriting KPIs Grouped in 4 Categories */}
        <div className="space-y-10" data-testid="kpi-sections">
          {computingMetrics && !activeMetrics ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/40 animate-pulse">
              Recomputing 33 underwriting KPIs…
            </div>
          ) : (
            KPI_CATEGORIES.map((catName, catIdx) => {
              const catMeta = KPI_CATEGORY_METADATA[catName];
              const catKpis = getKpisByCategory(catName);

              return (
                <section
                  key={catName}
                  data-testid={`kpi-category-${catMeta.id}`}
                  className="space-y-3"
                >
                  <div data-testid={`kpi-phase-${catIdx + 1}`} className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-white/80">
                          {catMeta.title}
                        </h2>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/40">
                          {catKpis.length} KPIs
                        </span>
                        <span className="text-[11px] text-white/30">
                          ({TREND_PERIOD_LABELS[trendPeriod]})
                        </span>
                      </div>
                      <p className="text-xs text-white/40">{catMeta.description}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {catKpis.map((kpi) => {
                        const rawVal =
                          hasInputsForContext && activeMetrics
                            ? kpi.getValue(activeMetrics, trendPeriod)
                            : null;
                        const hasValidValue =
                          hasInputsForContext && rawVal !== null && !Number.isNaN(rawVal);
                        let formattedVal = '—';
                        if (hasValidValue) {
                          if (kpi.unit === 'currency') {
                            formattedVal = `$${Math.round(rawVal).toLocaleString('en-US')}`;
                          } else if (kpi.unit === 'percent') {
                            formattedVal = `${rawVal.toFixed(1)}%`;
                          } else if (kpi.unit === 'ratio') {
                            formattedVal = `${rawVal.toFixed(2)}×`;
                          } else {
                            formattedVal = String(rawVal);
                          }
                        }

                        // Backwards compatibility data-metric-id
                        let metricDataId = kpi.id;
                        if (kpi.id === 'projected_gross_rent') metricDataId = 'noi';

                        if (hasValidValue) {
                          return (
                            <div
                              key={kpi.id}
                              role="button"
                              tabIndex={0}
                              aria-haspopup="dialog"
                              aria-label={`Expand ${kpi.name} details. Current value: ${formattedVal}`}
                              onClick={(e) => {
                                triggerRef.current = e.currentTarget;
                                setExpandedKpi(kpi);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  triggerRef.current = e.currentTarget;
                                  setExpandedKpi(kpi);
                                }
                              }}
                              data-testid="kpi-card"
                              data-kpi-number={kpi.number}
                              data-metric-id={metricDataId}
                              className="group relative flex flex-col justify-between cursor-pointer rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.1))] bg-[#161318] p-4 text-left transition-all duration-150 hover:border-[var(--accent,#00dd94)]/50 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#00dd94)]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/45 transition-colors group-hover:text-white/70">
                                  {kpi.name}
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    data-testid={isDemoActive ? 'kpi-demo-badge' : 'kpi-computed-badge'}
                                    className={`inline-flex items-center rounded-xs px-1.5 py-0.5 text-[9px] font-semibold ${
                                      isDemoActive
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                        : 'bg-[var(--accent,#00dd94)]/10 text-[var(--accent,#00dd94)]'
                                    }`}
                                  >
                                    {isDemoActive ? 'ILLUSTRATIVE DEMO DATA' : 'computed'}
                                  </span>
                                  <span className="material-symbols-outlined text-[16px] text-white/20 transition-all duration-150 group-hover:scale-110 group-hover:text-[var(--accent,#00dd94)]">
                                    open_in_new
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 flex items-baseline justify-between gap-2">
                                <span
                                  className={`truncate text-2xl font-extrabold tabular-nums tracking-tight ${
                                    kpi.unit === 'percent' || kpi.unit === 'ratio'
                                      ? 'text-[var(--accent,#00dd94)]'
                                      : 'text-white'
                                  }`}
                                  data-testid="kpi-value"
                                >
                                  {formattedVal}
                                </span>
                                <KpiSparkline kpi={kpi} value={rawVal} period={trendPeriod} />
                              </div>

                              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-white/30">
                                <span className="truncate">{kpi.formulaTemplate}</span>
                                <span className="font-mono text-white/40">#{kpi.number}</span>
                              </div>
                            </div>
                          );
                        }

                        // INSUFFICIENT_INPUTS state: Container has no role="button" so <a> descendant is WCAG valid
                        return (
                          <div
                            key={kpi.id}
                            data-testid="kpi-card"
                            data-kpi-number={kpi.number}
                            data-metric-id={metricDataId}
                            className="group relative flex flex-col justify-between rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.1))] bg-[#161318] p-4 text-left transition-all duration-150 hover:border-[var(--accent,#00dd94)]/50 hover:bg-white/[0.04]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/45 transition-colors group-hover:text-white/70">
                                {kpi.name}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  data-testid="kpi-insufficient-inputs"
                                  className="inline-flex items-center rounded-xs bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-500/20"
                                >
                                  INSUFFICIENT_INPUTS
                                </span>
                                <button
                                  type="button"
                                  aria-haspopup="dialog"
                                  aria-label={`Expand ${kpi.name} details`}
                                  onClick={(e) => {
                                    triggerRef.current = e.currentTarget;
                                    setExpandedKpi(kpi);
                                  }}
                                  className="material-symbols-outlined text-[16px] text-white/20 transition-all duration-150 group-hover:scale-110 group-hover:text-[var(--accent,#00dd94)] cursor-pointer"
                                >
                                  open_in_new
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 flex items-baseline justify-between gap-2">
                              <span
                                className="truncate text-2xl font-extrabold tabular-nums tracking-tight text-white"
                                data-testid="kpi-value"
                              >
                                —
                              </span>
                            </div>

                            <div className="mt-2 pt-1">
                              <a
                                href={
                                  selectedProject
                                    ? `/project/${selectedProject.id}/underwriting`
                                    : '/projects'
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent,#00dd94)] hover:underline"
                                data-testid="complete-inputs-link"
                              >
                                Complete inputs →
                              </a>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-white/30">
                              <span className="truncate">{kpi.formulaTemplate}</span>
                              <span className="font-mono text-white/40">#{kpi.number}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      {/* Trends — Real 24-Month Series with Modal Expansion (F-K3) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight text-white">Trends</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Last 24 Months
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {trendMetrics.map((metricId, idx) => {
            const opt =
              TREND_METRIC_OPTIONS.find((o) => o.id === metricId) ?? TREND_METRIC_OPTIONS[0]!;
            const series: TrendPoint24[] = liveTrendSeries[opt.id] || [];
            const max = Math.max(...series.map((p) => p.value), 1);

            // Map trend metric to corresponding KPI definition
            const correspondingKpi =
              opt.id === 'noi'
                ? getKpiById('projected_gross_rent') || AUTHORITATIVE_33_KPIS[7]
                : opt.id === 'cash_flow'
                  ? getKpiById('cash_on_cash') || AUTHORITATIVE_33_KPIS[12]
                  : getKpiById('break_even_occupancy') || AUTHORITATIVE_33_KPIS[16];

            const currentPoint = series[series.length - 1];
            const currentFormatted =
              currentPoint
                ? opt.unit === 'currency'
                  ? formatCurrency(currentPoint.value, { compact: true })
                  : formatPercent(currentPoint.value)
                : '—';

            const dataTable = {
              caption: `${opt.name} — 24-Month Data Series`,
              headers: ['Month', `${opt.name} (${opt.unit === 'currency' ? '$' : '%'})`, 'Type'],
              rows: series.map((p) => [
                p.label,
                opt.unit === 'currency'
                  ? formatCurrency(p.value, { compact: true })
                  : formatPercent(p.value),
                p.isProjected ? 'Projected' : 'Actual',
              ]),
            };

            const legendItems = [
              { label: 'Actuals (Elapsed)', color: opt.color },
              { label: 'Projected', color: 'rgba(255,255,255,0.3)', style: 'dashed' as const },
            ];

            return (
              <ChartFrame
                key={`${opt.id}-${idx}`}
                testId={`trend-card-${opt.id}`}
                title={opt.name}
                timeframe="Last 24 Months"
                unitBadge={opt.unit === 'currency' ? '$' : '%'}
                legend={legendItems}
                source="Source: 24-Month Project Underwriting Model · Live Derived"
                ariaLabel={`${opt.name} 24-month trend: 12 months actuals, 12 months projected. Current value is ${currentFormatted}.`}
                dataTable={dataTable}
                onClick={(e) => {
                  triggerRef.current = e.currentTarget;
                  if (correspondingKpi) setExpandedKpi(correspondingKpi);
                }}
                className="group hover:border-[var(--accent,#00dd94)]/50 hover:bg-white/[0.03] transition-all duration-150"
                headerAction={
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-white/20 group-hover:text-[var(--accent,#00dd94)]">
                      open_in_new
                    </span>
                    <select
                      value={opt.id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = [...trendMetrics] as [string, string, string];
                        next[idx] = e.target.value;
                        setTrendMetrics(next);
                      }}
                      aria-label={`Select trend metric for slot ${idx + 1}`}
                      className="cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 py-1 pl-2.5 pr-7 text-xs font-semibold text-white focus:outline-none hover:bg-white/10 transition-colors"
                    >
                      {TREND_METRIC_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id} className="bg-slate-950">
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                <div className="flex flex-col h-[200px]">
                  {/* Y-axis Label (Article 1 Rule 2) */}
                  <div className="flex justify-between items-center text-[9px] font-semibold uppercase tracking-wider text-slate-400 pb-1">
                    <span>{opt.unit === 'currency' ? 'Amount ($)' : 'Occupancy (%)'}</span>
                    <span className="font-mono text-slate-400">
                      Current: <strong className="text-white">{currentFormatted}</strong>
                    </span>
                  </div>

                  {/* Gridlines & Bars (Article 2 Rule 1: Zero Baseline; Article 2 Rule 4: Subdued Gridlines) */}
                  <div className="relative flex-1 min-h-0">
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1">
                      <div className="h-px w-full border-t border-dashed border-white/[0.05]" />
                      <div className="h-px w-full border-t border-dashed border-white/[0.05]" />
                      <div className="h-px w-full border-t border-dashed border-white/[0.05]" />
                    </div>

                    <div className="absolute inset-0 flex items-end gap-1 px-1 pt-5">
                      {series.map((point, pIdx) => {
                        const isLast = pIdx === series.length - 1;
                        return (
                          <div
                            key={point.label}
                            className="group/bar relative flex flex-1 flex-col items-center justify-end gap-1 h-full"
                            title={`${point.label}: ${point.value.toLocaleString()} (${point.isProjected ? 'Projected' : 'Actual'})`}
                          >
                            {/* Endpoint Data Label for latest month (Article 3 Rule 2) */}
                            {isLast && (
                              <span className="absolute -top-3 font-mono text-[8px] font-bold tabular-nums text-white whitespace-nowrap">
                                {currentFormatted}
                              </span>
                            )}
                            <div
                              className={`w-full rounded-t transition-all ${
                                point.isProjected
                                  ? 'border-t border-dashed border-white/60 opacity-50'
                                  : 'opacity-85'
                              }`}
                              style={{
                                height: `${Math.max(4, (point.value / max) * 100)}%`,
                                backgroundColor: opt.color,
                              }}
                            />
                            <span className="text-[7px] text-white/30 truncate w-full text-center">
                              {point.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-axis Label (Article 1 Rule 2) */}
                  <div className="text-center pt-1 text-[8px] font-semibold uppercase tracking-wider text-slate-500">
                    Timeline (24-Month Window)
                  </div>
                </div>
              </ChartFrame>
            );
          })}
        </div>
      </div>

      {/* Project Comparison — Real live project points (F-K5) */}
      <ProjectComparisonChart
        data={comparisonPoints}
        metricId={compareMetric}
        averageValue={compareAvg}
        height={320}
        isDemo={isDemoActive}
        dataProvenance={isDemoActive ? 'illustrative_demo' : 'computed'}
        subtitle={
          scope === 'portfolio'
            ? 'Compare active real estate projects. Top performers highlighted with status token.'
            : `Highlighting ${selectedProjectLabel} against the portfolio set.`
        }
        headerAction={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setSortOrder((s) => (s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none'))
              }
              icon={<span className="material-symbols-outlined text-[14px]">swap_vert</span>}
            >
              Sort:{' '}
              {sortOrder === 'none'
                ? 'Default'
                : sortOrder === 'asc'
                  ? 'Low to High'
                  : 'High to Low'}
            </Button>
            <select
              value={compareMetric}
              onChange={(e) => setCompareMetric(e.target.value)}
              aria-label="Select comparison metric"
              className="cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-8 text-xs font-semibold text-white focus:outline-none hover:bg-white/10 transition-colors"
            >
              {COMPARE_METRIC_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-slate-950">
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

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

      {/* Expandable KPI Detail Modal */}
      <KpiDetailModal
        kpi={expandedKpi}
        metrics={activeMetrics}
        project={selectedProject}
        period={trendPeriod}
        isOpen={Boolean(expandedKpi)}
        onClose={() => setExpandedKpi(null)}
        triggerRef={triggerRef}
        isDemo={isDemoActive}
        dataProvenance={isDemoActive ? 'illustrative_demo' : 'computed'}
      />
    </div>
  );
}
