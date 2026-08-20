'use client';

import { useCallback, useEffect, useState } from 'react';
import MetricCard from '@/components/insights/MetricCard';
import {
  REPORT_PERIOD_OPTIONS,
  formatReportMoney,
  type ReportPeriodOption,
} from '@/lib/reports/adapters';
import { REPORT_NARRATIVE } from '@/lib/dashboard/shell-seed';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

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
  phaseDistribution: {
    acquisition: number;
    purchase: number;
    hold: number;
    exit: number;
  };
  expenseBreakdown: Array<{ name: string; value: number }>;
  recentActivities: Array<{ id: string; action: string; project: string; timestamp: string }>;
  kpis33: {
    cashOnCashReturnPct: number;
    capRatePct: number;
    estQuarterlyTaxLiability: number;
    totalExitRevenue: number;
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PortfolioReportsPanel() {
  const [period, setPeriod] = useState<ReportPeriodOption>('quarterly');
  const [report, setReport] = useState<PortfolioReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/reports/portfolio?period=${period}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const body = (await response.json()) as PortfolioReportPayload & { error?: string };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load portfolio report');
        if (!cancelled) setReport(body);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const handleExport = useCallback(
    async (format: 'pdf' | 'csv') => {
      setExporting(format);
      try {
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: period === 'overall' ? 'quarterly' : period, format }),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? 'Export failed');
        }
        const blob = await response.blob();
        const extension = format === 'pdf' ? 'pdf' : 'csv';
        downloadBlob(blob, `PaperWorking_Report_${period}.${extension}`);
      } catch (exportError) {
        setError(exportError instanceof Error ? exportError.message : 'Export failed');
      } finally {
        setExporting(null);
      }
    },
    [period],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-sm text-white/60">
        Loading portfolio reports…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-100">
        {error ?? 'Report unavailable'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Reports"
        subtitle="Period snapshots with PDF/CSV export from migrated report handlers."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="rounded-lg border border-white/15 px-3.5 py-2 text-[12px] font-semibold text-white/80 transition hover:bg-white/5 disabled:opacity-50"
            >
              {exporting === 'csv' ? 'Exporting CSV…' : 'Export CSV'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="rounded-lg border border-white/12 bg-[#454955]/90 px-3.5 py-2 text-[12px] font-semibold text-[#fdfffc] disabled:opacity-50"
            >
              {exporting === 'pdf' ? 'Exporting PDF…' : 'Export PDF'}
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-400">
          Executive narrative
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{REPORT_NARRATIVE}</p>
      </div>

      <section className="flex flex-wrap gap-2">
        {REPORT_PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              period === option.value
                ? 'bg-white text-black'
                : 'border border-white/15 text-white/70 hover:bg-white/5'
            }`}
          >
            {option.label}
          </button>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active projects', value: String(report.overview.totalActiveProjects) },
          { label: 'Portfolio value', value: formatReportMoney(report.overview.totalPortfolioValue) },
          { label: 'Cash invested', value: formatReportMoney(report.overview.totalCashInvested) },
          { label: 'Portfolio ROI', value: `${report.overview.portfolioROIPercent.toFixed(1)}%` },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          name="Cash-on-cash"
          value={`${report.kpis33.cashOnCashReturnPct.toFixed(1)}%`}
          category="Hold KPIs"
        />
        <MetricCard
          name="Cap rate"
          value={`${report.kpis33.capRatePct.toFixed(1)}%`}
          category="Hold KPIs"
        />
        <MetricCard
          name="Est. quarterly tax"
          value={formatReportMoney(report.kpis33.estQuarterlyTaxLiability)}
          category="Tax"
        />
        <MetricCard
          name="Exit revenue"
          value={formatReportMoney(report.kpis33.totalExitRevenue)}
          category="Exit"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <h3 className="mb-4 text-lg font-semibold">Phase distribution</h3>
          <div className="space-y-3">
            {Object.entries(report.phaseDistribution).map(([phase, count]) => (
              <div key={phase} className="flex items-center justify-between text-sm">
                <span className="capitalize text-white/70">{phase}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <h3 className="mb-4 text-lg font-semibold">Expense breakdown</h3>
          <div className="space-y-3">
            {report.expenseBreakdown.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{item.name}</span>
                <span className="font-medium">{formatReportMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {report.recentActivities.length ? (
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <h3 className="mb-4 text-lg font-semibold">Recent activity</h3>
          <div className="space-y-3">
            {report.recentActivities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-white/8 px-4 py-3 text-sm">
                <p className="font-medium">{activity.action}</p>
                <p className="text-xs text-white/55">
                  {activity.project} · {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
