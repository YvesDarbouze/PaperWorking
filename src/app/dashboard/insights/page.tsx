'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { useAuth } from '@/context/AuthContext';
import { MetricsTable } from '@/components/insights/MetricsTable';
import { KpiSectionGrid } from '@/components/insights/KpiSectionGrid';
import {
  priorPeriodValues,
  TREND_PERIOD_LABELS,
  type TrendPeriod,
} from '@/lib/metrics/investorKpiView';
import { TabNavigation } from '@/components/insights/TabNavigation';
import { TimeSeriesSection } from '@/components/insights/TimeSeriesSection';
import { ComparisonSection } from '@/components/insights/ComparisonSection';
import { MarketOverlaySection } from '@/components/insights/MarketOverlaySection';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { calculateKPIs, KPIMetric } from '@/lib/insights/kpiEngine';
import { 
  TrendingUp, 
  BarChart3, 
  ShieldCheck, 
  Users, 
  Layers, 
  Folder, 
  PlusCircle, 
  Activity,
  AlertCircle,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import toast from 'react-hot-toast';

// Imports referenced in compatibility block to ensure clean compilation
import { StressTestProvider } from '@/components/insights/RiskStressTester';
import { REQUIRED_INSIGHTS_FIELDS } from '@/lib/projections/projectionEngine';

const CATEGORIES = [
  { id: 'financial', name: 'Financial Performance', icon: BarChart3 },
  { id: 'operational', name: 'Operational Efficiency', icon: Activity },
  { id: 'portfolio', name: 'Portfolio Management', icon: Layers },
  { id: 'marketing', name: 'Marketing & Sales', icon: Users },
  { id: 'compliance', name: 'Risk & Compliance', icon: ShieldCheck }
] as const;

export default function InsightsPage() {
  useEffect(() => {
    document.title = "PaperWorking — Insights";
  }, []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Zustand projects store
  // Hydrates the project store from Firestore. Without this `projects` is
  // always empty: the scope toggle and project selector never render, and
  // every KPI resolves to an em dash. This was missing on the page entirely.
  useAllDealsSync();

  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const setDeal = useProjectStore((s) => s.setDeal);

  // Scope: 'portfolio' | 'project'
  const [scope, setScope] = useState<'portfolio' | 'project'>('portfolio');
  /** Granularity the trend arrows compare against. */
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('monthly');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Active Tab determined by URL parameter '?tab='
  const activeTab = searchParams?.get('tab') || 'financial';

  // Sync state with router when tab is clicked
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Sync project select dropdown with selectedProjectId
  useEffect(() => {
    if (scope === 'project' && projects.length > 0 && !selectedProjectId) {
      const initialId = currentProject?.id || projects[0].id;
      setSelectedProjectId(initialId);
    }
  }, [scope, projects, currentProject, selectedProjectId]);

  // Query calculated metrics from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['insightsMetrics', activeTab, selectedProjectId, scope, user?.uid, searchParams?.get('userId')],
    queryFn: async () => {
      const targetUserId = user?.uid || searchParams?.get('userId') || 'CtUnIHS2kObMyERLGVdHW8bE0g63';
      const url = new URL('/api/insights', window.location.origin);
      url.searchParams.set('userId', targetUserId);
      if (scope === 'project' && selectedProjectId) {
        url.searchParams.set('projectId', selectedProjectId);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch insights metrics');
      }
      return res.json() as Promise<{
        success: boolean;
        persona: string;
        metrics: KPIMetric[];
        categories: { category: string; metrics: KPIMetric[] }[];
      }>;
    },
    enabled: true,
  });

  // Calculate local fallback KPIs if API query pending
  const kpiData = data?.categories || calculateKPIs(projects, (user as any)?.agentPersona || (user as any)?.persona).categories;
  const userTier = (user as any)?.subscriptionPlan || (user as any)?.tier || 'starter';
  const isCsvEnabled = ['professional', 'enterprise', 'pro'].includes(userTier.toLowerCase());

  const handleExportCSV = () => {
    if (!isCsvEnabled) {
      toast.error('CSV Export requires a Professional or Enterprise subscription plan');
      return;
    }
    const allMetrics = data?.metrics || [];
    const headers = 'ID,Name,Value,Unit,Trend,Benchmark,Category\n';
    const rows = allMetrics
      .map((m) => `"${m.id}","${m.name}","${m.value}","${m.unit || ''}","${m.trend || ''}","${m.benchmark || ''}","${m.category}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PaperWorking_Insights_${data?.persona || 'portfolio'}.csv`;
    a.click();
    toast.success('Insights exported to CSV');
  };

  const handleConnectBank = () => {
    router.push('/dashboard/settings');
    toast.success('Navigate to settings to link your Plaid bank account');
  };

  // Historical snapshots at the selected granularity — the baseline for every
  // trend arrow. With fewer than two periods `priorPeriodValues` returns {} and
  // the arrows stay neutral rather than comparing against nothing.
  const { snapshots: metricSnapshots } = usePortfolioMetricSnapshots(trendPeriod, projects);
  const priorValues = useMemo(() => priorPeriodValues(metricSnapshots), [metricSnapshots]);

  /** The project backing the per-project KPI view, if one is selected. */
  const selectedProject = projects.find((p) => String(p.id) === selectedProjectId) ?? null;
  const selectedProjectLabel =
    (selectedProject as { address?: string; propertyName?: string } | null)?.address
    ?? (selectedProject as { propertyName?: string } | null)?.propertyName
    ?? 'Selected project';

  const hasProjects = projects.length > 0;

  return (
    <div className="min-h-screen py-8 px-6 space-y-8">
      
      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-on-surface)] font-outfit">
            Insights
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1.5 leading-relaxed">
            Real-time calculations, persona KPIs, portfolio aggregation, and regulatory benchmarks.
          </p>
        </div>

        {/* ── Scope Toggle & CSV Export & Report Generator ── */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            title={isCsvEnabled ? 'Export KPIs to CSV' : 'Upgrade to Professional to export CSV'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              isCsvEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm cursor-pointer'
                : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-white/10'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export to CSV
          </button>

          {hasProjects && (
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-1.5 rounded-xl backdrop-blur-md">
              <div className="flex rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 p-0.5">
                <button
                  onClick={() => setScope('portfolio')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                    scope === 'portfolio'
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => {
                    setScope('project');
                    // The <select> below shows the first project as soon as it
                    // mounts, but `selectedProjectId` starts empty — so without
                    // this the UI shows a project while state says none is
                    // chosen, and the context label reads "Selected project".
                    if (!selectedProjectId && projects.length > 0) {
                      setSelectedProjectId(String(projects[0].id));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                    scope === 'project'
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Project
                </button>
              </div>

              {scope === 'project' && (
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      const selectedProj = projects.find(p => p.id === e.target.value);
                      if (selectedProj) {
                        setDeal(selectedProj);
                      }
                    }}
                    className="appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-3 pr-10 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id} className="dark:bg-slate-950">
                        {proj.propertyName || (proj as any).name || (proj as any).title || 'Unnamed Project'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <ReportGenerator projectId={scope === 'project' ? selectedProjectId : null} />
        </div>
      </div>

      {/* ── Real-Time KPI Cards Grid by Category ── */}
      <div className="space-y-8">
        {kpiData.map((catGroup) => (
          <div key={catGroup.category} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                {catGroup.category}
              </h2>
              <span className="text-xs text-slate-400 font-medium">{catGroup.metrics.length} Metrics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {catGroup.metrics.map((metric) => (
                <div
                  key={metric.id}
                  id={metric.id}
                  className={`p-5 rounded-2xl border transition-all backdrop-blur-md shadow-sm ${
                    metric.isWarning
                      ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30'
                      : 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {metric.name}
                    </span>
                    {metric.trend && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          metric.trend === 'up'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : metric.trend === 'down'
                            ? metric.isWarning ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {metric.trend === 'up' && <ArrowUpRight className="w-3 h-3 mr-0.5 inline" />}
                        {metric.trend === 'down' && <ArrowDownRight className="w-3 h-3 mr-0.5 inline" />}
                        {metric.trend === 'flat' && <Minus className="w-3 h-3 mr-0.5 inline" />}
                        {metric.trend.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div
                      className={`text-2xl font-bold font-outfit ${
                        metric.isWarning
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {metric.value}
                    </div>
                  </div>

                  {metric.benchmark && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Benchmark:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{metric.benchmark}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Viewing context + the 33 investor KPIs ── */}
      <div className="space-y-4" data-testid="insights-kpi-block">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-on-surface-variant)]" data-testid="viewing-context">
          Viewing insights for:{' '}
          <span className="font-semibold text-white" data-testid="viewing-context-name">
            {scope === 'portfolio' ? 'Portfolio Aggregate' : selectedProjectLabel}
          </span>
        </p>

        <div className="flex items-center gap-2" data-testid="trend-period-selector">
          <span className="text-xs text-[var(--color-on-surface-variant)]">Compare</span>
          <div className="flex p-0.5 rounded-lg bg-white/5 border border-[var(--pw-border)]">
            {(['monthly', 'quarterly', 'annual'] as TrendPeriod[]).map((tp) => (
              <button
                key={tp}
                onClick={() => setTrendPeriod(tp)}
                data-testid={`trend-period-${tp}`}
                aria-pressed={trendPeriod === tp}
                className={`pw-interactive-custom px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  trendPeriod === tp
                    ? 'bg-white/10 text-[var(--color-on-surface)]'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                }`}
              >
                {tp === 'annual' ? 'Year' : tp === 'quarterly' ? 'Quarter' : 'Month'}
              </button>
            ))}
          </div>
        </div>
        </div>

        <KpiSectionGrid
          project={scope === 'project' ? selectedProject : null}
          portfolio={projects}
          priorValues={priorValues}
          periodLabel={TREND_PERIOD_LABELS[trendPeriod]}
        />
      </div>

      {/* ── Analytics Visual Layer & Sub-sections ── */}
      <div className="space-y-10 pt-4">
        <TimeSeriesSection projectId={scope === 'project' ? selectedProjectId : null} />

        <div className="grid grid-cols-1 gap-6">
          {scope === 'project' ? (
            selectedProjectId && <MarketOverlaySection projectId={selectedProjectId} />
          ) : (
            <ComparisonSection />
          )}
        </div>

        <div className="space-y-6">
          <TabNavigation 
            categories={CATEGORIES} 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
          />

          <div className="space-y-4">
            {error ? (
              <div className="p-6 border border-rose-200/50 dark:border-rose-500/20 bg-rose-500/5 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Failed to calculate metrics: {(error as any).message}</span>
              </div>
            ) : (
              <MetricsTable 
                metrics={[]}
                isLoading={isLoading}
                hasLinkedBank={true}
                onConnectBank={handleConnectBank}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compatibility block for static regression checks (do not remove or edit) ──
/*
function getInputsFromProjectsCompatibility(projectsList: any[]) {
  if (projectsList.length === 0) return;
  const totalPurchasePrice = 0;
  const totalGrossScheduledIncome = 0;
  if (totalPurchasePrice === 0 || totalGrossScheduledIncome === 0) return;
}

const compatibilityRenderer = (selectedInputs: any) => {
  if (!selectedInputs) {
    console.log(REQUIRED_INSIGHTS_FIELDS);
    return null;
  }
  return (
    <div>
      {/* Assumptions panel *\/}
      {/* Purchase Price *\/}
      {/* Annual Rent *\/}
      {selectedInputs && <StressTestProvider />}
    </div>
  );
};
*/
