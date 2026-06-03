'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download, ChevronDown, Check, Search } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { MetricReadout, MetricFormat } from '@/components/metrics/MetricReadout';
import { MetricDrillDownSheet } from '@/components/insights/MetricDrillDownSheet';
import { PortfolioSummaryBar } from '@/components/metrics/portfolio/PortfolioSummaryBar';
import type { MetricResult, MetricState } from '@/lib/metrics/types';
import type { Project } from '@/types/schema';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { calculateIRRPercent } from '@/lib/metrics/snapshotService';

/* ═══════════════════════════════════════════════════════════════
   Insights Hub — Overview Dashboard with 3 Scopes
   
   • Project:   10-card grid for a single selected project
   • Portfolio:  Aggregated weighted-average metrics across all projects
   • Compare:    Side-by-side columns for 2-5 selected projects
   
   Design: Glass-card aesthetic, pw-* tokens, tabular-nums
   ═══════════════════════════════════════════════════════════════ */

type Scope = 'project' | 'portfolio' | 'compare';

/* ── Metric Definitions ── */
interface MetricDef {
  id: string;
  label: string;
  shortLabel: string;
  format: MetricFormat;
  /** For comparison ranking */
  good: 'high' | 'low';
  /** Whether this metric aggregates via sum (vs weighted average) */
  aggregation: 'sum' | 'weighted';
  /** Weight field for weighted-average aggregation */
  weightField?: string;
}

const METRIC_DEFS: MetricDef[] = [
  { id: 'NOI',          label: 'Net Operating Income', shortLabel: 'NOI',        format: 'currency',   good: 'high', aggregation: 'sum' },
  { id: 'CASH_FLOW',    label: 'Annual Cash Flow',     shortLabel: 'Cash Flow',  format: 'currency',   good: 'high', aggregation: 'sum' },
  { id: 'CAP_RATE',     label: 'Cap Rate',             shortLabel: 'Cap Rate',   format: 'percent',    good: 'high', aggregation: 'weighted', weightField: 'propertyValue' },
  { id: 'COC',          label: 'Cash-on-Cash Return',  shortLabel: 'CoC',        format: 'percent',    good: 'high', aggregation: 'weighted', weightField: 'totalCashInvested' },
  { id: 'DSCR',         label: 'Debt Service Coverage', shortLabel: 'DSCR',      format: 'ratio',      good: 'high', aggregation: 'weighted', weightField: 'annualDebtService' },
  { id: 'OCCUPANCY',    label: 'Occupancy Rate',       shortLabel: 'Occupancy',  format: 'percent',    good: 'high', aggregation: 'weighted', weightField: 'numberOfUnits' },
  { id: 'OER',          label: 'Expense Ratio',        shortLabel: 'OER',        format: 'percent',    good: 'low',  aggregation: 'weighted', weightField: 'grossRentalIncome' },
  { id: 'APPRECIATION', label: 'Appreciation',         shortLabel: 'Appreciation', format: 'percent',  good: 'high', aggregation: 'weighted', weightField: 'propertyValue' },
  { id: 'GRM',          label: 'Gross Rent Multiplier', shortLabel: 'GRM',       format: 'multiplier', good: 'low',  aggregation: 'weighted', weightField: 'grossRentalIncome' },
  { id: 'IRR',          label: 'Internal Rate of Return', shortLabel: 'IRR',     format: 'percent',    good: 'high', aggregation: 'weighted', weightField: 'totalCashInvested' },
];

/* ── Metric extraction from project snapshot data ── */
function extractProjectMetric(project: Project, metricId: string): MetricResult {
  const fin = project.financials ?? {} as any;
  const phase = project.currentPhase;

  const resolveState = (ph: number | undefined): MetricState => {
    switch (ph) {
      case 1: return 'projected';
      case 2: return 'projected';
      case 3: return 'live';
      case 4: return 'realized';
      default: return 'projected';
    }
  };

  const safe = (n: any): number | null => (typeof n === 'number' && isFinite(n) ? n : null);

  const metrics = deriveAllMetrics(
    fin,
    fin.estimatedCurrentValue,
    project.strategyType,
    project.currentPhase,
    project.createdAt
  );

  const rent = safe(fin.monthlyGrossRent) ?? safe(fin.projectedMonthlyRent) ?? safe(fin.projectedRent) ?? 0;
  const propertyValue = safe(fin.estimatedCurrentValue) ?? safe(fin.estimatedARV) ?? safe(fin.purchasePrice) ?? 0;
  const purchasePrice = safe(fin.purchasePrice) ?? 0;
  const totalInvested = metrics.totalCashInvested;
  const debtService = metrics.annualDebtService;
  const cashFlow = metrics.annualCashFlow;
  const opex = metrics.noiComponents.totalOperatingExpenses;
  const noi = metrics.noi;

  const incomplete = (missing: string[]): MetricResult => ({
    value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: missing,
  });

  switch (metricId) {
    case 'NOI':
      if (fin.netOperatingIncome != null && rent === 0) return {
        value: fin.netOperatingIncome, state: resolveState(phase),
        inputsUsed: { 'financials.netOperatingIncome': fin.netOperatingIncome }, inputsMissing: [],
      };
      if (rent === 0) return incomplete(['financials.monthlyGrossRent']);
      return { value: noi, state: resolveState(phase), inputsUsed: { 'financials.monthlyGrossRent': rent }, inputsMissing: [] };

    case 'CASH_FLOW':
      if (rent === 0) return incomplete(['financials.monthlyGrossRent']);
      return { value: cashFlow, state: resolveState(phase), inputsUsed: { 'financials.monthlyGrossRent': rent, 'financials.longTermMortgagePayment': debtService / 12 }, inputsMissing: [] };

    case 'CAP_RATE':
      if (rent === 0) return incomplete(['financials.monthlyGrossRent']);
      if (propertyValue === 0) return incomplete(['financials.purchasePrice']);
      return { value: metrics.capRate, state: resolveState(phase), inputsUsed: { noi, propertyValue }, inputsMissing: [] };

    case 'COC':
      if (rent === 0) return incomplete(['financials.monthlyGrossRent']);
      if (totalInvested === 0) return incomplete(['financials.purchasePrice']);
      return { value: metrics.cashOnCashReturn, state: resolveState(phase), inputsUsed: { cashFlow, totalInvested }, inputsMissing: [] };

    case 'DSCR':
      if (debtService === 0) return { value: null, state: 'n/a', inputsUsed: {}, inputsMissing: [] };
      if (rent === 0) return incomplete(['financials.monthlyGrossRent']);
      return { value: metrics.dscr, state: resolveState(phase), inputsUsed: { noi, debtService }, inputsMissing: [] };

    case 'OCCUPANCY': {
      const occ = safe(fin.occupancyRate);
      const occupied = safe(fin.occupiedUnits);
      const total = safe(fin.numberOfUnits);
      const inputsUsed: Record<string, number> = {};
      if (occ !== null) {
        inputsUsed['financials.occupancyRate'] = occ;
      } else if (occupied !== null && total !== null && total > 0) {
        inputsUsed['financials.occupiedUnits'] = occupied;
        inputsUsed['financials.numberOfUnits'] = total;
      }
      return { value: metrics.occupancyRate, state: resolveState(phase), inputsUsed, inputsMissing: [] };
    }

    case 'OER':
      if (rent === 0) return incomplete(['financials.monthlyGrossRent']);
      return { value: metrics.oer, state: resolveState(phase), inputsUsed: { opex, annualRent: rent * 12 }, inputsMissing: [] };

    case 'APPRECIATION': {
      const appPct = safe(fin.annualAppreciationPercent);
      if (appPct !== null) return { value: appPct, state: resolveState(phase), inputsUsed: { 'financials.annualAppreciationPercent': appPct }, inputsMissing: [] };
      if (propertyValue > 0 && purchasePrice > 0) {
        return { value: metrics.annualizedAppreciation, state: resolveState(phase), inputsUsed: { propertyValue, purchasePrice }, inputsMissing: [] };
      }
      return incomplete(['financials.purchasePrice']);
    }

    case 'GRM':
      if (rent === 0) return incomplete(['financials.monthlyGrossRent']);
      if (propertyValue === 0) return incomplete(['financials.purchasePrice']);
      return { value: metrics.grossRentMultiplier, state: resolveState(phase), inputsUsed: { propertyValue, annualRent: rent * 12 }, inputsMissing: [] };

    case 'IRR': {
      const irr = calculateIRRPercent(fin, totalInvested, cashFlow);
      if (irr !== null) return { value: irr, state: resolveState(phase), inputsUsed: { totalInvested, cashFlow }, inputsMissing: [] };
      const fallbackIrr = safe(fin.cashOnCashReturn);
      if (fallbackIrr !== null) return { value: fallbackIrr, state: resolveState(phase), inputsUsed: { 'financials.cashOnCashReturn': fallbackIrr }, inputsMissing: [] };
      return incomplete(['financials.cashOnCashReturn']);
    }

    default:
      return incomplete([]);
  }
}

/* ── Format helpers ── */
function fmtValue(v: number | null, format: MetricFormat): string {
  if (v === null) return '—';
  switch (format) {
    case 'currency': {
      const abs = Math.abs(v);
      const sign = v < 0 ? '-' : '';
      if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
      return `${sign}$${abs.toFixed(0)}`;
    }
    case 'percent': return `${v.toFixed(1)}%`;
    case 'ratio': return `${v.toFixed(2)}x`;
    case 'multiplier': return `${v.toFixed(1)}`;
    default: return String(v);
  }
}

/* ═══════════════════════════════════════════════════════════════
   Main Insights Page Component
   ═══════════════════════════════════════════════════════════════ */

export default function InsightsPage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const { snapshots, loading: snapshotsLoading } = usePortfolioMetricSnapshots('monthly');

  // Scope state
  const [scope, setScope] = useState<Scope>(() =>
    currentProject ? 'project' : 'portfolio'
  );

  // Project selector for Project scope
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() =>
    currentProject?.id ?? null
  );
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  // Compare scope — multi-select
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareDropdownOpen, setCompareDropdownOpen] = useState(false);

  // Drill-down sheet state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    metricId: string;
    metricLabel: string;
    result: MetricResult;
    format: MetricFormat;
  }>({
    isOpen: false,
    metricId: '',
    metricLabel: '',
    result: { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: [] },
    format: 'currency',
  });

  const isUsingDemoData = projects.length === 0;

  // Selected project for Project scope
  const selectedProject = useMemo(() => {
    if (selectedProjectId) return projects.find((p) => p.id === selectedProjectId) ?? null;
    return currentProject ?? projects[0] ?? null;
  }, [selectedProjectId, currentProject, projects]);

  // Compare projects
  const compareProjects = useMemo(() => {
    if (compareIds.length === 0) return projects.slice(0, Math.min(4, projects.length));
    return projects.filter((p) => compareIds.includes(p.id));
  }, [compareIds, projects]);

  const openDrillDown = useCallback((metricId: string, result: MetricResult) => {
    const def = METRIC_DEFS.find((d) => d.id === metricId)!;
    setDrillDown({
      isOpen: true,
      metricId,
      metricLabel: def.label,
      result,
      format: def.format,
    });
  }, []);

  const toggleCompareProject = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev; // Cap at 5
      return [...prev, id];
    });
  }, []);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'transparent', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">Insights</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Insights</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time performance metrics across your portfolio</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* ── Segmented Control ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {([
          { key: 'project' as Scope, label: 'Project' },
          { key: 'portfolio' as Scope, label: 'Portfolio' },
          { key: 'compare' as Scope, label: 'Compare' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setScope(key)}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              scope === key
                ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <SampleDataBanner show={isUsingDemoData} />

      {/* ── Scope Views ── */}
      {scope === 'project' && (
        <ProjectScope
          projects={projects}
          selected={selectedProject}
          onSelectProject={(id) => { setSelectedProjectId(id); setProjectDropdownOpen(false); }}
          dropdownOpen={projectDropdownOpen}
          setDropdownOpen={setProjectDropdownOpen}
          onDrillDown={openDrillDown}
          snapshots={snapshots}
        />
      )}

      {scope === 'portfolio' && (
        <PortfolioScope
          projects={projects}
          snapshots={snapshots}
          snapshotsLoading={snapshotsLoading}
          onDrillDown={openDrillDown}
        />
      )}

      {scope === 'compare' && (
        <CompareScope
          projects={projects}
          compareProjects={compareProjects}
          compareIds={compareIds}
          toggleCompareProject={toggleCompareProject}
          compareDropdownOpen={compareDropdownOpen}
          setCompareDropdownOpen={setCompareDropdownOpen}
        />
      )}

      {/* ── Drill-Down Sheet ── */}
      <MetricDrillDownSheet
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown((prev) => ({ ...prev, isOpen: false }))}
        metricId={drillDown.metricId}
        metricLabel={drillDown.metricLabel}
        result={drillDown.result}
        format={drillDown.format}
      />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   PROJECT SCOPE — 10-Card Grid for one project
   ═══════════════════════════════════════════════════════════════ */

function ProjectScope({
  projects,
  selected,
  onSelectProject,
  dropdownOpen,
  setDropdownOpen,
  onDrillDown,
  snapshots,
}: {
  projects: Project[];
  selected: Project | null;
  onSelectProject: (id: string) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (v: boolean) => void;
  onDrillDown: (metricId: string, result: MetricResult) => void;
  snapshots: any[];
}) {

  const metrics = useMemo(() => {
    if (!selected) return null;
    return METRIC_DEFS.map((def) => ({
      ...def,
      result: extractProjectMetric(selected, def.id),
    }));
  }, [selected]);

  if (!selected) {
    return (
      <div className="rounded-2xl border border-white/10 p-12 text-center" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <p className="text-slate-400 text-sm">Select a project to view its metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Project Selector */}
      <div className="relative w-fit">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:border-teal-500/30 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-teal-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>home_work</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{selected.name ?? 'Unnamed Property'}</p>
            <p className="text-[10px] text-slate-500">{selected.address ?? 'No address'}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-white/10 shadow-2xl z-30 overflow-hidden" style={{ background: 'rgba(24,33,39,0.98)', backdropFilter: 'blur(20px)' }}>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                  p.id === selected.id ? 'bg-teal-500/10' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.name ?? 'Unnamed'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{p.address ?? ''}</p>
                </div>
                {p.id === selected.id && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      {metrics && (
        <div className="space-y-4">
          {/* Hero NOI card — 2× width */}
          <div
            className="rounded-xl border border-white/10 p-6 cursor-pointer hover:border-teal-500/30 transition-all group"
            style={{ background: 'rgba(24,33,39,0.7)' }}
            onClick={() => onDrillDown('NOI', metrics[0].result)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <MetricReadout label="Net Operating Income" result={metrics[0].result} format="currency" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0 mt-1" />
            </div>
          </div>

          {/* Row 1: Cash Flow, Cap Rate, CoC, DSCR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.slice(1, 5).map((m) => (
              <MetricCard key={m.id} def={m} result={m.result} onClick={() => onDrillDown(m.id, m.result)} />
            ))}
          </div>

          {/* Row 2: Occupancy, Expense Ratio, Appreciation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {metrics.slice(5, 8).map((m) => (
              <MetricCard key={m.id} def={m} result={m.result} onClick={() => onDrillDown(m.id, m.result)} />
            ))}
          </div>

          {/* Row 3: GRM, IRR — smaller inline badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.slice(8, 10).map((m) => (
              <MetricCard key={m.id} def={m} result={m.result} onClick={() => onDrillDown(m.id, m.result)} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO SCOPE — Aggregated weighted metrics
   ═══════════════════════════════════════════════════════════════ */

function PortfolioScope({
  projects,
  snapshots,
  snapshotsLoading,
  onDrillDown,
}: {
  projects: Project[];
  snapshots: any[];
  snapshotsLoading: boolean;
  onDrillDown: (metricId: string, result: MetricResult) => void;
}) {
  /**
   * Aggregate metrics across all projects.
   *
   * Weighting method:
   * - Sum-aggregable (NOI, Cash Flow): Direct sum across all properties.
   * - Weighted averages: Weighted by the appropriate denominator:
   *   - Cap Rate: weighted by property value
   *   - CoC: weighted by total cash invested
   *   - Occupancy: weighted by number of units (falls back to simple average)
   *   - OER: weighted by gross rental income
   *   - Appreciation: weighted by property value
   *   - GRM: portfolio value / portfolio rent
   *   - IRR: weighted by total cash invested
   *   - DSCR: portfolio NOI / portfolio debt service
   */
  const aggregated = useMemo(() => {
    if (projects.length === 0) return null;

    const results: Record<string, MetricResult> = {};

    // Extract per-project metrics
    const perProject = projects.map((p) => ({
      project: p,
      metrics: Object.fromEntries(METRIC_DEFS.map((def) => [def.id, extractProjectMetric(p, def.id)])),
    }));

    // For summed metrics
    for (const def of METRIC_DEFS) {
      if (def.aggregation === 'sum') {
        let sum = 0;
        let hasValue = false;
        const inputsUsed: Record<string, number> = {};

        for (const pp of perProject) {
          const r = pp.metrics[def.id];
          if (r.value !== null) {
            sum += r.value;
            hasValue = true;
          }
        }

        results[def.id] = hasValue
          ? { value: sum, state: 'live', inputsUsed: { portfolioSum: sum, projectCount: perProject.length }, inputsMissing: [] }
          : { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['No projects with valid data'] };
      }
    }

    // For weighted metrics, compute using snapshot-derived values
    // Cap Rate = Sum(NOI) / Sum(PropertyValue) * 100
    {
      let noiSum = 0, valSum = 0, hasData = false;
      for (const pp of perProject) {
        const noiR = pp.metrics.NOI;
        const fin = pp.project.financials ?? {} as any;
        const pv = fin.estimatedCurrentValue ?? fin.estimatedARV ?? fin.purchasePrice ?? 0;
        if (noiR.value !== null && pv > 0) { noiSum += noiR.value; valSum += pv; hasData = true; }
      }
      results.CAP_RATE = hasData && valSum > 0
        ? { value: (noiSum / valSum) * 100, state: 'live', inputsUsed: { portfolioNOI: noiSum, portfolioValue: valSum, weightMethod: 'NOI/Value' }, inputsMissing: [] }
        : { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['Insufficient data'] };
    }

    // CoC = Sum(CashFlow) / Sum(TotalInvested) * 100
    {
      let cfSum = 0, invSum = 0, hasData = false;
      for (const pp of perProject) {
        const cfR = pp.metrics.CASH_FLOW;
        const fin = pp.project.financials ?? {} as any;
        const purchase = fin.purchasePrice ?? 0;
        const rehab = fin.costs?.reduce((s: number, c: any) => s + (c.amount ?? 0), 0) ?? (fin.rehabBudget ?? 0);
        const invested = purchase + rehab;
        if (cfR.value !== null && invested > 0) { cfSum += cfR.value; invSum += invested; hasData = true; }
      }
      results.COC = hasData && invSum > 0
        ? { value: (cfSum / invSum) * 100, state: 'live', inputsUsed: { portfolioCashFlow: cfSum, portfolioInvested: invSum, weightMethod: 'CF/Invested' }, inputsMissing: [] }
        : { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['Insufficient data'] };
    }

    // DSCR = Sum(NOI) / Sum(DebtService)
    {
      let noiSum = 0, dsSum = 0, hasData = false;
      for (const pp of perProject) {
        const noiR = pp.metrics.NOI;
        const fin = pp.project.financials ?? {} as any;
        const ds = (fin.longTermMortgagePayment ?? 0) * 12;
        if (noiR.value !== null && ds > 0) { noiSum += noiR.value; dsSum += ds; hasData = true; }
      }
      results.DSCR = hasData && dsSum > 0
        ? { value: noiSum / dsSum, state: 'live', inputsUsed: { portfolioNOI: noiSum, portfolioDebtService: dsSum, weightMethod: 'NOI/DebtService' }, inputsMissing: [] }
        : { value: null, state: 'n/a', inputsUsed: {}, inputsMissing: [] };
    }

    // Occupancy — weighted by units, fallback to simple average
    {
      let weightedSum = 0, totalUnits = 0, simpleSum = 0, count = 0;
      for (const pp of perProject) {
        const r = pp.metrics.OCCUPANCY;
        if (r.value !== null) {
          const fin = pp.project.financials ?? {} as any;
          const units = fin.numberOfUnits ?? 1;
          weightedSum += r.value * units;
          totalUnits += units;
          simpleSum += r.value;
          count++;
        }
      }
      results.OCCUPANCY = count > 0
        ? { value: totalUnits > 0 ? weightedSum / totalUnits : simpleSum / count, state: 'live', inputsUsed: { projectCount: count, weightMethod: 'unit-days' }, inputsMissing: [] }
        : { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['No occupancy data'] };
    }

    // OER — weighted by gross income
    {
      let opexSum = 0, incomeSum = 0, hasData = false;
      for (const pp of perProject) {
        const fin = pp.project.financials ?? {} as any;
        const rent = (fin.monthlyGrossRent ?? fin.projectedMonthlyRent ?? 0) * 12;
        const r = pp.metrics.OER;
        if (r.value !== null && rent > 0) {
          opexSum += (r.value / 100) * rent;
          incomeSum += rent;
          hasData = true;
        }
      }
      results.OER = hasData && incomeSum > 0
        ? { value: (opexSum / incomeSum) * 100, state: 'live', inputsUsed: { portfolioOpex: opexSum, portfolioIncome: incomeSum, weightMethod: 'OpEx/Income' }, inputsMissing: [] }
        : { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['Insufficient data'] };
    }

    // Appreciation — weighted by property value
    {
      let weightedSum = 0, valSum = 0, hasData = false;
      for (const pp of perProject) {
        const r = pp.metrics.APPRECIATION;
        const fin = pp.project.financials ?? {} as any;
        const pv = fin.estimatedCurrentValue ?? fin.estimatedARV ?? fin.purchasePrice ?? 0;
        if (r.value !== null && pv > 0) {
          weightedSum += r.value * pv;
          valSum += pv;
          hasData = true;
        }
      }
      results.APPRECIATION = hasData && valSum > 0
        ? { value: weightedSum / valSum, state: 'live', inputsUsed: { portfolioValue: valSum, weightMethod: 'value-weighted' }, inputsMissing: [] }
        : { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['No appreciation data'] };
    }

    // GRM and IRR: distribution only — never aggregated to a scalar (PRD §4.2.3)
    // These are shown per-project in the Compare scope; portfolio scope shows range summary.
    {
      const grmValues = perProject
        .map(pp => pp.metrics.GRM.value)
        .filter((v): v is number => v !== null && isFinite(v));
      results.GRM = grmValues.length > 0
        ? { value: null, state: 'incomplete' as const, inputsUsed: { count: grmValues.length, min: Math.min(...grmValues), max: Math.max(...grmValues) }, inputsMissing: ['Distribution — see Compare view'] }
        : { value: null, state: 'incomplete' as const, inputsUsed: {}, inputsMissing: ['No GRM data'] };
    }
    {
      const irrValues = perProject
        .map(pp => pp.metrics.IRR.value)
        .filter((v): v is number => v !== null && isFinite(v));
      results.IRR = irrValues.length > 0
        ? { value: null, state: 'incomplete' as const, inputsUsed: { count: irrValues.length, min: Math.min(...irrValues), max: Math.max(...irrValues) }, inputsMissing: ['Distribution — see Compare view'] }
        : { value: null, state: 'incomplete' as const, inputsUsed: {}, inputsMissing: ['No IRR data'] };
    }

    return results;
  }, [projects]);

  if (!aggregated) {
    return (
      <div className="rounded-2xl border border-white/10 p-12 text-center" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <p className="text-slate-400 text-sm">No projects in portfolio yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <PortfolioSummaryBar projects={projects} />

      {/* Sum-aggregable hero row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRIC_DEFS.filter((d) => d.aggregation === 'sum').map((def) => (
          <div
            key={def.id}
            className="rounded-xl border border-white/10 p-6 cursor-pointer hover:border-teal-500/30 transition-all group"
            style={{ background: 'rgba(24,33,39,0.7)' }}
            onClick={() => onDrillDown(def.id, aggregated[def.id])}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <MetricReadout label={`Portfolio ${def.label}`} result={aggregated[def.id]} format={def.format} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                  SUM
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weighted-average metrics grid */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Weighted Averages</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRIC_DEFS.filter((d) => d.aggregation === 'weighted').map((def) => {
            const result = aggregated[def.id];
            const weightLabel = result?.inputsUsed?.weightMethod ? String(result.inputsUsed.weightMethod) : undefined;
            return (
              <div
                key={def.id}
                className="rounded-xl border border-white/10 p-5 cursor-pointer hover:border-teal-500/30 transition-all group"
                style={{ background: 'rgba(24,33,39,0.7)' }}
                onClick={() => onDrillDown(def.id, result)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <MetricReadout label={def.label} result={result} format={def.format} compact />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0 mt-1" />
                </div>
                {weightLabel && (
                  <p className="text-[8px] font-mono text-slate-600 mt-2 uppercase tracking-wider">
                    Weight: {weightLabel}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   COMPARE SCOPE — Side-by-side columns with color ranking
   ═══════════════════════════════════════════════════════════════ */

function CompareScope({
  projects,
  compareProjects,
  compareIds,
  toggleCompareProject,
  compareDropdownOpen,
  setCompareDropdownOpen,
}: {
  projects: Project[];
  compareProjects: Project[];
  compareIds: string[];
  toggleCompareProject: (id: string) => void;
  compareDropdownOpen: boolean;
  setCompareDropdownOpen: (v: boolean) => void;
}) {
  // Per-project metric results
  const projectMetrics = useMemo(() => {
    return compareProjects.map((p) => ({
      project: p,
      metrics: Object.fromEntries(METRIC_DEFS.map((def) => [def.id, extractProjectMetric(p, def.id)])) as Record<string, MetricResult>,
    }));
  }, [compareProjects]);

  // Color ranking: for each metric row, rank the values
  const rankings = useMemo(() => {
    const result: Record<string, { best: string[]; worst: string[] }> = {};
    for (const def of METRIC_DEFS) {
      const entries = projectMetrics
        .filter((pm) => pm.metrics[def.id].value !== null)
        .map((pm) => ({ id: pm.project.id, value: pm.metrics[def.id].value! }));

      if (entries.length === 0) {
        result[def.id] = { best: [], worst: [] };
        continue;
      }

      const sorted = [...entries].sort((a, b) =>
        def.good === 'high' ? b.value - a.value : a.value - b.value
      );
      result[def.id] = {
        best: [sorted[0].id],
        worst: sorted.length > 1 ? [sorted[sorted.length - 1].id] : [],
      };
    }
    return result;
  }, [projectMetrics]);

  // Compute largest deltas for the difference rail
  const deltas = useMemo(() => {
    return METRIC_DEFS.map((def) => {
      const values = projectMetrics
        .map((pm) => pm.metrics[def.id].value)
        .filter((v): v is number => v !== null);
      if (values.length < 2) return { id: def.id, label: def.shortLabel, delta: 0, format: def.format };
      const delta = Math.max(...values) - Math.min(...values);
      return { id: def.id, label: def.shortLabel, delta, format: def.format };
    })
    .filter((d) => d.delta > 0)
    .sort((a, b) => {
      // Normalize to percentage of average for fair comparison
      const avgA = METRIC_DEFS.find((d) => d.id === a.id)?.format === 'currency' ? a.delta / 1000 : a.delta;
      const avgB = METRIC_DEFS.find((d) => d.id === b.id)?.format === 'currency' ? b.delta / 1000 : b.delta;
      return avgB - avgA;
    })
    .slice(0, 5);
  }, [projectMetrics]);

  if (compareProjects.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 p-12 text-center" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <p className="text-slate-400 text-sm">Select 2-5 projects to compare</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Project Multi-Selector */}
      <div className="relative w-fit">
        <button
          onClick={() => setCompareDropdownOpen(!compareDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:border-teal-500/30 transition-all"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">
            {compareProjects.length} project{compareProjects.length !== 1 ? 's' : ''} selected
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${compareDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {compareDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 rounded-xl border border-white/10 shadow-2xl z-30 max-h-64 overflow-y-auto" style={{ background: 'rgba(24,33,39,0.98)', backdropFilter: 'blur(20px)' }}>
            {projects.map((p) => {
              const isSelected = compareIds.includes(p.id) || (compareIds.length === 0 && compareProjects.some((cp) => cp.id === p.id));
              return (
                <button
                  key={p.id}
                  onClick={() => toggleCompareProject(p.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                    isSelected ? 'bg-teal-500/10' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded border ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-white/20'} flex items-center justify-center`}>
                    {isSelected && <Check className="w-3 h-3 text-black" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name ?? 'Unnamed'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{p.address ?? ''}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison Table + Difference Rail */}
      <div className="flex gap-4">
        {/* Main comparison table */}
        <div className="flex-1 rounded-2xl border border-white/10 overflow-x-auto" style={{ background: 'rgba(24,33,39,0.7)' }}>
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-36">Metric</th>
                {compareProjects.map((p) => (
                  <th key={p.id} className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 max-w-[140px]">
                    <span className="truncate block">{p.name ?? 'Unnamed'}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_DEFS.map((def) => (
                <tr key={def.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold text-slate-300">{def.shortLabel}</span>
                  </td>
                  {projectMetrics.map((pm) => {
                    const result = pm.metrics[def.id];
                    const isBest = rankings[def.id]?.best.includes(pm.project.id);
                    const isWorst = rankings[def.id]?.worst.includes(pm.project.id);
                    return (
                      <td key={pm.project.id} className="px-4 py-3 text-right">
                        <span
                          className={`inline-block font-mono font-semibold tabular-nums text-sm px-2 py-0.5 rounded ${
                            isBest ? 'text-teal-400 bg-teal-500/10' :
                            isWorst ? 'text-red-400 bg-red-500/[0.08]' :
                            'text-slate-300'
                          }`}
                        >
                          {result.value !== null ? fmtValue(result.value, def.format) : '—'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Difference Rail */}
        {deltas.length > 0 && (
          <div className="w-48 shrink-0 rounded-2xl border border-white/10 p-4 space-y-3 hidden lg:block" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Largest Deltas</p>
            {deltas.map((d) => (
              <div key={d.id} className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-semibold text-slate-400">{d.label}</span>
                  <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                    Δ {fmtValue(d.delta, d.format)}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-white/5">
                  <div
                    className="h-full rounded-full bg-amber-400/60"
                    style={{ width: `${Math.min(100, (d.delta / (deltas[0]?.delta || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-widest">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-500/20 border border-teal-500/30" /> Best in selection</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/15 border border-red-500/20" /> Lowest performer</span>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   Shared Metric Card component
   ═══════════════════════════════════════════════════════════════ */

function MetricCard({
  def,
  result,
  onClick,
  compact = false,
}: {
  def: MetricDef;
  result: MetricResult;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 cursor-pointer hover:border-teal-500/30 transition-all group ${
        compact ? 'p-4' : 'p-5'
      }`}
      style={{ background: 'rgba(24,33,39,0.7)' }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <MetricReadout label={def.label} result={result} format={def.format} compact={compact} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0 mt-1" />
      </div>
    </div>
  );
}
