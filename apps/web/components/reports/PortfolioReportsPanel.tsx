'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportCatalogGrid from '@/components/reports/ReportCatalogGrid';
import ReportViewModal from '@/components/reports/ReportViewModal';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
import {
  formatReportMoney,
  type ReportPeriodOption,
} from '@/lib/reports/adapters';
import {
  PHASE_BREAKDOWN_SEED,
  PERIOD_TABS,
  REPORT_CATALOG,
  TAB_CATEGORIES,
  type PeriodTab,
  type ReportCatalogItem,
} from '@/lib/reports/report-catalog';

interface PortfolioReportPayload {
  period: ReportPeriodOption;
  overview: {
    totalActiveProjects: number;
    totalPortfolioValue: number;
    totalCashInvested: number;
    totalReturns: number;
    portfolioROIPercent: number;
    avgDaysHeld: number;
  };
  narrative?: string;
  executiveSummary?: string;
  kpis33?: {
    cashOnCashReturnPct: number;
    capRatePct: number;
    estQuarterlyTaxLiability: number;
    totalExitRevenue: number;
  };
}

const ALL_PROJECTS = '__all__';

const PERIOD_TO_API: Record<PeriodTab, ReportPeriodOption> = {
  Monthly: 'monthly',
  Quarterly: 'quarterly',
  Yearly: 'yearly',
  Overall: 'overall',
  'By Property': 'overall',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Tax Intelligence / Reports — port of PaperWorking Tax Intelligence page
 * (catalog + period tabs) combined with portfolio overview cards from the
 * simplified investment reports surface.
 */
export default function PortfolioReportsPanel() {
  const projects = SEED_PROJECTS;
  const [period, setPeriod] = useState<PeriodTab>('Monthly');
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const [openReport, setOpenReport] = useState<ReportCatalogItem['id'] | null>(null);
  const [report, setReport] = useState<PortfolioReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const apiPeriod = PERIOD_TO_API[period];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/portfolio?period=${apiPeriod}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (response.ok) {
          const body = (await response.json()) as PortfolioReportPayload;
          if (!cancelled) setReport(body);
        }
      } catch {
        // Seed overview still renders
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [apiPeriod]);

  const scopedProjects = useMemo(() => {
    if (projectFilter === ALL_PROJECTS) return projects;
    return projects.filter((p) => p.id === projectFilter);
  }, [projects, projectFilter]);

  const visibleReports = useMemo(() => {
    const cats = TAB_CATEGORIES[period];
    return REPORT_CATALOG.filter((r) => cats.includes(r.category)).map((r) => r.id);
  }, [period]);

  const contextLabel = useMemo(() => {
    const first = scopedProjects[0];
    const scope =
      projectFilter === ALL_PROJECTS
        ? `${projects.length} propert${projects.length === 1 ? 'y' : 'ies'}`
        : first?.address ?? first?.propertyName ?? 'Selected property';
    return `${scope} · ${period}`;
  }, [projectFilter, projects.length, scopedProjects, period]);

  const overview = report?.overview;
  const portfolioValue = overview?.totalPortfolioValue ?? 2_642_000;
  const cashInvested = overview?.totalCashInvested ?? 450_000;
  const totalReturns = overview?.totalReturns ?? 274_000;
  const portfolioROI = overview?.portfolioROIPercent ?? 24.6;
  const narrative =
    report?.narrative ||
    report?.executiveSummary ||
    'Executive Summary: Portfolio has generated $274,000 in capital gains with a 24.6% overall return across 3 active projects.';

  const handleExport = useCallback(
    async (format: 'pdf' | 'csv') => {
      setExporting(format);
      try {
        if (format === 'csv') {
          const csv =
            'data:text/csv;charset=utf-8,Metric,Value\n' +
            `Active Projects,${overview?.totalActiveProjects ?? 3}\n` +
            `Portfolio Value,${portfolioValue}\n` +
            `Cash Invested,${cashInvested}\n` +
            `Total Returns,${totalReturns}\n` +
            `ROI,${portfolioROI}%\n`;
          const link = document.createElement('a');
          link.href = encodeURI(csv);
          link.download = `PaperWorking_Portfolio_Metrics_${apiPeriod}.csv`;
          link.click();
          return;
        }

        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: apiPeriod === 'overall' ? 'quarterly' : apiPeriod,
            format: 'pdf',
          }),
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        downloadBlob(blob, `PaperWorking_${apiPeriod.toUpperCase()}_Report_2026.pdf`);
      } catch {
        // Soft-fail for seed environment
      } finally {
        setExporting(null);
      }
    },
    [apiPeriod, overview, portfolioValue, cashInvested, totalReturns, portfolioROI],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8 text-white" data-testid="tax-intelligence-page">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1
            className="flex items-center gap-2 text-2xl font-black tracking-tight text-white"
            data-testid="tax-intelligence-title"
          >
            <span className="material-symbols-outlined text-[28px] text-emerald-400">description</span>
            Tax Intelligence
          </h1>
          <p className="mt-1.5 text-sm text-white/55">
            Fiscal oversight, estimated taxes, CPA-ready packages, and investment performance
            statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExport('csv')}
            data-testid="export-csv-btn"
            disabled={exporting !== null}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-400">table</span>
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void handleExport('pdf')}
            data-testid="export-pdf-btn"
            disabled={exporting !== null}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF Package'}
          </button>
        </div>
      </div>

      {/* Period tabs — green active */}
      <div
        className="flex w-fit flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1.5"
        role="tablist"
        data-testid="period-tabs"
      >
        {PERIOD_TABS.map((tab) => {
          const isActive = period === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`period-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setPeriod(tab)}
              className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold transition ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Project filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="project-filter"
          className="text-xs font-bold uppercase tracking-wider text-white/45"
        >
          Project
        </label>
        <select
          id="project-filter"
          data-testid="project-filter"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-9 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none"
        >
          <option value={ALL_PROJECTS} className="bg-slate-950">
            All projects ({projects.length})
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-950">
              {p.address || p.propertyName}
            </option>
          ))}
        </select>
        <span className="text-xs text-white/40">{contextLabel}</span>
      </div>

      {/* Bank connect CTA */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
        data-testid="empty-no-plaid"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-white/45">
            account_balance
          </span>
          <p className="text-sm text-white/55">
            <span className="font-semibold text-white">Link your bank account</span> to
            auto-categorize transactions for tax reporting.
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing"
          data-testid="connect-bank-cta"
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-white/10 px-4 text-xs font-semibold text-white no-underline hover:bg-white/5"
        >
          Connect Bank Account
        </Link>
      </div>

      {/* Phase breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="phase-breakdown">
        {PHASE_BREAKDOWN_SEED.map((t) => (
          <div
            key={t.phase}
            data-testid={`phase-card-${t.phase}`}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{t.label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">
              {formatReportMoney(t.amount)}
            </p>
            <p className="mt-0.5 text-xs text-white/45">
              {t.count} transaction{t.count === 1 ? '' : 's'}
              {t.unconfidentCount > 0 ? ` · ${t.unconfidentCount} need review` : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Quarterly tax alert */}
      {period === 'Quarterly' ? (
        <div
          className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
          data-testid="estimated-tax-alert"
        >
          <span className="material-symbols-outlined shrink-0 text-[18px] text-amber-400">
            warning
          </span>
          <p className="text-sm text-white">
            <span className="font-semibold">Q3 estimated tax due Sep 15.</span>{' '}
            <span className="text-white/55">Review the 1040-ES worksheet below.</span>
          </p>
        </div>
      ) : null}

      {/* Executive narrative + overview (investment reports surface) */}
      <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-6 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Automated Executive Narrative
        </h2>
        <p className="text-sm font-medium leading-relaxed text-emerald-100">
          {loading ? 'Loading investment reports…' : narrative}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1 rounded-2xl border border-white/10 bg-black/30 p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Value
          </span>
          <p className="text-xl font-black text-white">${portfolioValue.toLocaleString()}</p>
        </div>
        <div className="space-y-1 rounded-2xl border border-white/10 bg-black/30 p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Cash Invested
          </span>
          <p className="text-xl font-black text-white">${cashInvested.toLocaleString()}</p>
        </div>
        <div className="space-y-1 rounded-2xl border border-white/10 bg-black/30 p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Returns
          </span>
          <p className="text-xl font-black text-emerald-400">${totalReturns.toLocaleString()}</p>
        </div>
        <div className="space-y-1 rounded-2xl border border-white/10 bg-black/30 p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Portfolio ROI
          </span>
          <p className="text-xl font-black text-emerald-400">{portfolioROI}%</p>
        </div>
      </div>

      {/* Report catalog */}
      <ReportCatalogGrid
        onSelectReport={(id) => setOpenReport(id)}
        visibleReportIds={visibleReports}
      />

      {openReport ? (
        <ReportViewModal
          reportId={openReport}
          contextLabel={contextLabel}
          onClose={() => setOpenReport(null)}
        />
      ) : null}
    </div>
  );
}
