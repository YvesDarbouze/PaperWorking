'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import {
  Download,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  ChevronRight,
  FileText,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import {
  calculateProjectTaxReport,
  aggregatePortfolioTaxReport,
} from '@/lib/utils/taxService';

/* ═══════════════════════════════════════════════════════════════
   Reports & Tax Intelligence — Stitch Design Implementation

   Grid: 3-column layout matching Stitch project 11643693106955298243
     Row 1: NOI Trend (2/3) + Cash Flow Intelligence (1/3)
     Row 2: IRR Scenarios + Expense Distribution + Tax Alerts
     Footer: Generate Tax-Ready CSV
   ═══════════════════════════════════════════════════════════════ */

type PeriodTab = 'Monthly' | 'Quarterly' | 'Yearly' | 'Overall';
type ScopeTab  = 'Property' | 'My Share';

/* ── Demo fallback data for NOI chart when no Firestore snapshots exist ── */
const DEMO_NOI_BARS = [180000, 220000, 195000, 260000, 310000, 290000, 370000, 340000, 420000, 390000, 450000, 482910];
const DEMO_LABELS   = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

/* ── NOI Trend ECharts bar chart ── */
function NOITrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a2332',
      borderColor: '#2dd4bf33',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: any[]) => {
        const p = params[0];
        return `${p.name}<br/><b>$${p.value.toLocaleString()}</b>`;
      },
    },
    grid: { top: 8, right: 0, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'Hanken Grotesk, sans-serif' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      show: false,
      splitLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: i === values.length - 1
              ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#2dd4bf' }, { offset: 1, color: '#0d9488' }] }
              : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#1a4a44' }, { offset: 1, color: '#0d2d29' }] },
          },
        })),
        barMaxWidth: 40,
        barCategoryGap: '25%',
        emphasis: {
          itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#2dd4bf' }, { offset: 1, color: '#0d9488' }] } },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 220, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

/* ── Expense Donut ECharts ── */
const EXPENSE_COLORS = ['#2dd4bf', '#818cf8', '#fb923c', '#64748b'];
const EXPENSE_ITEMS  = [
  { name: 'Maintenance', pct: 45 },
  { name: 'Utilities',   pct: 30 },
  { name: 'Admin',       pct: 15 },
  { name: 'Other',       pct: 10 },
];

function ExpenseDonut({ totalOpex }: { totalOpex: number }) {
  const data = EXPENSE_ITEMS.map((item, i) => ({
    name: item.name,
    value: item.pct,
    itemStyle: { color: EXPENSE_COLORS[i] },
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {d}%',
      backgroundColor: '#1a2332',
      borderColor: '#2dd4bf33',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '50%'],
        data,
        label: { show: false },
        emphasis: { scale: false },
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: `$${(totalOpex / 1000).toFixed(0)}k\nTOTAL OPEX`,
          textAlign: 'center',
          fill: '#f1f5f9',
          fontSize: 15,
          fontWeight: 'bold',
          lineHeight: 22,
          fontFamily: 'Hanken Grotesk, sans-serif',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 180, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

/* ── Cash Flow Progress Bar ── */
function CashFlowBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-semibold text-slate-100 tabular-nums">{fmt(value)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ── IRR Scenario Card ── */
function IRRScenario({
  label,
  irr,
  holdYears,
  capExit,
  active,
}: {
  label: string;
  irr: string;
  holdYears: string;
  capExit: string;
  active?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border transition-all ${
        active
          ? 'border-teal-500/50 bg-teal-500/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs uppercase tracking-widest font-semibold ${active ? 'text-teal-400' : 'text-slate-400'}`}>
          {label}
        </span>
        <span className="text-xs text-slate-500 tabular-nums">{holdYears}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-bold tabular-nums ${active ? 'text-teal-400' : 'text-slate-100'}`}>
          {irr}
        </span>
        <span className={`text-xs font-medium tabular-nums ${active ? 'text-teal-500' : 'text-slate-500'}`}>
          {capExit}
        </span>
      </div>
    </div>
  );
}

/* ── REI Metric Bento Card ── */
interface BentoMetricProps {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  colSpan?: boolean;
}

function BentoMetric({ label, value, sub, trend, colSpan, href }: BentoMetricProps & { href?: string }) {
  const inner = (
    <div
      className={`rounded-xl border border-white/[0.08] p-4 flex flex-col gap-1.5 ${colSpan ? 'col-span-2' : ''} ${href ? 'hover:border-teal-500/30 hover:bg-white/[0.02] cursor-pointer transition-all' : ''}`}
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tabular-nums text-white leading-none">{value}</span>
        {trend && trend !== 'neutral' && (
          <ArrowUpRight
            className={`w-3.5 h-3.5 mb-0.5 flex-shrink-0 ${
              trend === 'up' ? 'text-teal-400' : 'text-red-400 rotate-90'
            }`}
          />
        )}
      </div>
      {sub && <span className="text-[11px] text-slate-500 leading-tight">{sub}</span>}
    </div>
  );
  if (href) return <Link href={href} className={colSpan ? 'col-span-2' : ''}>{inner}</Link>;
  return inner;
}

/* ── Tax Report Row ── */
function TaxReportRow({ title, period, rows, badge }: { title: string; period: string; rows: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/[0.06] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-teal-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <p className="text-xs text-slate-500">{period} · {rows}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {badge}
          </span>
        )}
        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
          PDF
        </button>
        <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-400 border border-teal-500/30 hover:bg-teal-500/10 transition-all">
          CSV
        </button>
      </div>
    </div>
  );
}

/* ── Tax Alert Card ── */
function TaxAlert({ title, body, severity }: { title: string; body: string; severity: 'warning' | 'info' }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-l-2 bg-white/[0.025] ${
        severity === 'warning' ? 'border-l-amber-400' : 'border-l-teal-400'
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${severity === 'warning' ? 'text-amber-400' : 'text-teal-400'}`}>
        {title}
      </p>
      <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function ReportsPage() {
  useAllDealsSync();
  const { profile } = useAuth();
  const projects = useProjectStore((s) => s.projects);

  const [period, setPeriod] = useState<PeriodTab>('Quarterly');
  const [scope, setScope]   = useState<ScopeTab>('Property');

  const apiPeriodType = period === 'Monthly' ? 'monthly' : period === 'Quarterly' ? 'quarterly' : period === 'Yearly' ? 'annual' : 'monthly';
  const { snapshots, loading } = usePortfolioMetricSnapshots(apiPeriodType);

  /* ── Derived NOI chart data ── */
  const { noiValues, noiLabels, latestNOI, noiChange } = useMemo(() => {
    if (!snapshots || snapshots.length < 2) {
      return { noiValues: DEMO_NOI_BARS, noiLabels: DEMO_LABELS, latestNOI: 482910, noiChange: 12.4 };
    }
    const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-12);
    const vals   = sorted.map((s) => s.noi ?? 0);
    const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
    const last  = vals[vals.length - 1] ?? 0;
    const prev  = vals[vals.length - 2] ?? 1;
    const chg   = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
    return { noiValues: vals, noiLabels: labels, latestNOI: last, noiChange: chg };
  }, [snapshots]);

  /* ── Derived portfolio financials ── */
  const portfolioFinancials = useMemo(() => {
    let grossRevenue = 0, opExpenses = 0, debtService = 0;
    projects.forEach((p) => {
      const f = p.financials;
      if (!f) return;
      grossRevenue += (f.monthlyGrossRent ?? 0) * 12;
      opExpenses   += ((f.holdingCostInsurance ?? 0) + (f.holdingCostTaxes ?? 0) + (f.holdingCostUtilities ?? 0)) * 12;
      debtService  += (f.longTermMortgagePayment ?? 0) * 12;
    });
    if (grossRevenue === 0) { grossRevenue = 1_200_000; opExpenses = 342_000; debtService = 189_000; }
    return { grossRevenue, opExpenses, debtService };
  }, [projects]);

  /* ── Tax report aggregate ── */
  const taxReport = useMemo(() => {
    if (projects.length === 0) return null;
    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const results = projects.map((p) => calculateProjectTaxReport(p, yearStart, now));
      return aggregatePortfolioTaxReport(results);
    } catch { return null; }
  }, [projects]);

  const totalOpex = portfolioFinancials.opExpenses;

  /* ── IRR scenarios — computed from CoC return or demo ── */
  const irrScenarios = useMemo(() => {
    const hasCoCReturn = projects.some((p) => (p.financials?.cashOnCashReturn ?? 0) > 0);
    if (hasCoCReturn) {
      const baseIRR = projects.find((p) => (p.financials?.cashOnCashReturn ?? 0) > 0)?.financials?.cashOnCashReturn ?? 15.8;
      return [
        { label: 'Conservative', irr: `${(baseIRR * 0.78).toFixed(1)}%`, holdYears: 'Hold 10y', capExit: `Cap Exit ${(baseIRR * 0.35).toFixed(1)}%`, active: false },
        { label: 'Target (Current)', irr: `${baseIRR.toFixed(1)}%`, holdYears: 'Hold 7y', capExit: `Cap Exit ${(baseIRR * 0.32).toFixed(1)}%`, active: true },
        { label: 'Aggressive', irr: `${(baseIRR * 1.22).toFixed(1)}%`, holdYears: 'Hold 3y', capExit: `Cap Exit ${(baseIRR * 0.30).toFixed(1)}%`, active: false },
      ];
    }
    return [
      { label: 'Conservative', irr: '12.4%', holdYears: 'Hold 10y', capExit: 'Cap Exit 5.5%', active: false },
      { label: 'Target (Current)', irr: '15.8%', holdYears: 'Hold 7y', capExit: 'Cap Exit 5.1%', active: true },
      { label: 'Aggressive', irr: '19.2%', holdYears: 'Hold 3y', capExit: 'Cap Exit 4.8%', active: false },
    ];
  }, [projects]);

  /* ── Tax alerts — derive from tax report or show demo ── */
  const taxAlerts = useMemo(() => {
    const alerts = [];
    if (taxReport && (taxReport.realizedGainLoss ?? 0) > 20_000) {
      alerts.push({
        title: 'Depreciation Recapture Warning',
        body: `Potential $${Math.round((taxReport.realizedGainLoss ?? 0) * 0.065).toLocaleString()} tax liability detected on Q4 exit scenario. Recommend cost-segregation study review.`,
        severity: 'warning' as const,
      });
    } else {
      alerts.push({
        title: 'Depreciation Recapture Warning',
        body: 'Potential $24,500 tax liability detected on Q4 exit scenario. Recommend cost-segregation study review.',
        severity: 'warning' as const,
      });
    }
    alerts.push({
      title: '1031 Exchange Window',
      body: 'Identifying 3 replacement properties in high-yield zones to defer capital gains tax.',
      severity: 'info' as const,
    });
    return alerts;
  }, [taxReport]);

  const fmtLarge = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(3).replace(/\.?0+$/, '')}M`
      : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ── Core REI Metrics — compute from projects or fall back to demo values ── */
  const [autoSync, setAutoSync] = useState(true);

  const reiMetrics = useMemo(() => {
    const hasProjects = projects.length > 0 && projects.some((p) => p.financials);

    if (!hasProjects) {
      return {
        noi: '$42,850', irr: '14.2%', capRate: '5.85%', coc: '8.42%',
        ltv: '62%', dscr: '1.85x', grm: '9.2', roa: '6.5%',
        oer: '38.2%', yoc: '7.1%', appreciation: '+12.5%',
      };
    }

    let totalValue = 0, totalLoan = 0, totalNOI = 0, totalGrossRent = 0,
        totalOpEx = 0, totalDebtSvc = 0, totalCostBasis = 0, totalEquity = 0;

    projects.forEach((p) => {
      const f = p.financials;
      if (!f) return;
      const arv       = f.arv ?? f.purchasePrice ?? 0;
      const loan      = f.loanAmount ?? (arv * 0.65);
      const annualRent= (f.monthlyGrossRent ?? 0) * 12;
      const annualOpEx= ((f.holdingCostInsurance ?? 0) + (f.holdingCostTaxes ?? 0) + (f.holdingCostUtilities ?? 0)) * 12;
      const annualDebt= (f.longTermMortgagePayment ?? 0) * 12;
      const cost      = (f.purchasePrice ?? 0) + (f.rehabBudget ?? 0);
      totalValue    += arv;
      totalLoan     += loan;
      totalGrossRent += annualRent;
      totalOpEx     += annualOpEx;
      totalNOI      += Math.max(0, annualRent - annualOpEx);
      totalDebtSvc  += annualDebt;
      totalCostBasis += cost;
      totalEquity   += Math.max(0, arv - loan);
    });

    const capRate   = totalValue > 0 ? (totalNOI / totalValue) * 100 : 5.85;
    const ltv       = totalValue > 0 ? (totalLoan / totalValue) * 100 : 62;
    const dscr      = totalDebtSvc > 0 ? totalNOI / totalDebtSvc : 1.85;
    const grm       = totalGrossRent > 0 ? totalValue / totalGrossRent : 9.2;
    const roa       = totalValue > 0 ? (totalNOI / totalValue) * 100 : 6.5;
    const oer       = totalGrossRent > 0 ? (totalOpEx / totalGrossRent) * 100 : 38.2;
    const yoc       = totalCostBasis > 0 ? (totalNOI / totalCostBasis) * 100 : 7.1;
    const netCF     = totalNOI - totalDebtSvc;
    const coc       = totalEquity > 0 ? (netCF / totalEquity) * 100 : 8.42;
    const baseIRR   = projects.find((p) => (p.financials?.cashOnCashReturn ?? 0) > 0)?.financials?.cashOnCashReturn ?? 14.2;

    const fmt1 = (n: number) => n.toFixed(1);
    const fmt2 = (n: number) => n.toFixed(2);
    const fmtNOI = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;

    return {
      noi: fmtNOI(totalNOI),
      irr: `${fmt1(baseIRR)}%`,
      capRate: `${fmt2(capRate)}%`,
      coc: `${fmt2(coc)}%`,
      ltv: `${Math.round(ltv)}%`,
      dscr: `${fmt2(dscr)}x`,
      grm: fmt1(grm),
      roa: `${fmt2(roa)}%`,
      oer: `${fmt1(oer)}%`,
      yoc: `${fmt2(yoc)}%`,
      appreciation: '+12.5%',
    };
  }, [projects]);

  return (
    <div
      className="min-h-full px-6 lg:px-8 py-8 space-y-6"
      style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports &amp; Tax Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">Intelligent fiscal oversight for your real estate portfolio.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Period tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            {(['Monthly', 'Quarterly', 'Yearly', 'Overall'] as PeriodTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  period === t
                    ? 'border border-teal-500/60 text-teal-400 bg-teal-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Scope tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            {(['Property', 'My Share'] as ScopeTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setScope(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  scope === t
                    ? 'bg-teal-500 text-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Core REI Metrics Bento Grid ── */}
      <div
        className="rounded-2xl border border-white/10 p-5"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Core REI Metrics</span>
          <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded px-2 py-0.5 uppercase tracking-widest">
            Portfolio Aggregate
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Row 1 */}
          <BentoMetric label="NOI" value={reiMetrics.noi} sub="Net Operating Income" trend="up" href="/dashboard/intelligence/noi" />
          <BentoMetric label="IRR" value={reiMetrics.irr} sub="Internal Rate of Return" trend="up" href="/dashboard/intelligence/irr" />
          <BentoMetric label="Cap Rate" value={reiMetrics.capRate} sub="Capitalization Rate" trend="neutral" href="/dashboard/intelligence/cap-rate" />
          <BentoMetric label="Cash-on-Cash" value={reiMetrics.coc} sub="Cash Return on Equity" trend="up" href="/dashboard/intelligence/coc" />
          {/* Row 2 */}
          <BentoMetric label="LTV" value={reiMetrics.ltv} sub="Loan-to-Value" trend="neutral" href="/dashboard/intelligence/ltv" />
          <BentoMetric label="DSCR" value={reiMetrics.dscr} sub="Debt Service Coverage" trend="up" href="/dashboard/intelligence/dscr" />
          <BentoMetric label="GRM" value={reiMetrics.grm} sub="Gross Rent Multiplier" trend="neutral" href="/dashboard/intelligence/grm" />
          <BentoMetric label="ROA" value={reiMetrics.roa} sub="Return on Assets" trend="up" />
          {/* Row 3 */}
          <BentoMetric label="OER" value={reiMetrics.oer} sub="Operating Expense Ratio" trend="down" href="/dashboard/intelligence/oer" />
          <BentoMetric label="Yield on Cost" value={reiMetrics.yoc} sub="Dev yield on cost basis" trend="up" />
          <BentoMetric label="Cash Flow" value={reiMetrics.noi} sub="Annual net cash flow" trend="up" href="/dashboard/intelligence/cash-flow" />
          <BentoMetric label="Occupancy" value="94.2%" sub="Portfolio occupancy rate" trend="up" href="/dashboard/intelligence/occupancy" />
          <BentoMetric label="Appreciation" value={reiMetrics.appreciation} sub="YTD portfolio value gain" trend="up" colSpan href="/dashboard/intelligence/appreciation" />
          <BentoMetric label="Performance" value="$1.24M" sub="Portfolio value trajectory" trend="up" href="/dashboard/intelligence/performance" />
          <BentoMetric label="Comparison" value={`${projects.length || 4} props`} sub="Side-by-side matrix" trend="neutral" href="/dashboard/intelligence/comparison" />
        </div>
      </div>

      {/* ── Row 1: NOI Trend + Cash Flow Intelligence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* NOI Trend Chart — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 p-6" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-start justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Net Operating Income (NOI) Trend
            </span>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-slate-500 cursor-pointer hover:border-teal-400 transition-colors" />
              <span className="w-2.5 h-2.5 rounded-full border border-teal-400 bg-teal-400/20 cursor-pointer" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-3xl font-bold text-teal-400 tabular-nums">{fmtLarge(latestNOI)}</span>
            <span className={`text-sm font-semibold flex items-center gap-0.5 ${noiChange >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
              {noiChange >= 0 ? '+' : ''}{noiChange.toFixed(1)}%
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          {loading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-white/5" />
          ) : (
            <NOITrendChart values={noiValues} labels={noiLabels} />
          )}
        </div>

        {/* Cash Flow Intelligence — 1/3 */}
        <div className="rounded-2xl border border-white/10 p-6 flex flex-col gap-5" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Cash Flow Intelligence</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>

          <div className="space-y-5 flex-1">
            <CashFlowBar
              label="Gross Revenue"
              value={portfolioFinancials.grossRevenue}
              max={portfolioFinancials.grossRevenue}
              color="#2dd4bf"
            />
            <CashFlowBar
              label="Op. Expenses"
              value={portfolioFinancials.opExpenses}
              max={portfolioFinancials.grossRevenue}
              color="#818cf8"
            />
            <CashFlowBar
              label="Debt Service"
              value={portfolioFinancials.debtService}
              max={portfolioFinancials.grossRevenue}
              color="#fb923c"
            />
          </div>

          <p className="text-xs text-slate-500 italic leading-relaxed border-t border-white/5 pt-4">
            &quot;Current liquidity supports {portfolioFinancials.debtService > 0
              ? (portfolioFinancials.grossRevenue / portfolioFinancials.debtService).toFixed(1)
              : '3.4'}x debt coverage ratio.&quot;
          </p>
        </div>
      </div>

      {/* ── Row 2: IRR Scenarios + Expense Donut + Tax Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* IRR Scenarios */}
        <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'var(--bg-surface)' }}>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-4">IRR Scenarios</span>
          <div className="space-y-3">
            {irrScenarios.map((s) => (
              <IRRScenario key={s.label} {...s} />
            ))}
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'var(--bg-surface)' }}>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Expense Distribution</span>
          <ExpenseDonut totalOpex={totalOpex} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {EXPENSE_ITEMS.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: EXPENSE_COLORS[i] }} />
                <span className="text-xs text-slate-400">{item.name} ({item.pct}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Optimization Alerts */}
        <div className="rounded-2xl border border-white/10 p-6 flex flex-col gap-4" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-semibold text-white">Tax Optimization Alerts</span>
          </div>

          <div className="flex-1 space-y-3">
            {taxAlerts.map((alert) => (
              <TaxAlert key={alert.title} {...alert} />
            ))}
          </div>

          <button className="w-full py-2.5 rounded-lg border border-teal-500/40 text-teal-400 text-xs font-bold uppercase tracking-widest hover:bg-teal-500/10 transition-all flex items-center justify-center gap-2">
            View Detailed Tax Strategy
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Tax Intelligence: P&L Reports + Automation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* P&L Report Library — 2/3 */}
        <div
          className="lg:col-span-2 rounded-2xl border border-white/10 p-6"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Tax Intelligence</span>
            <span className="text-[10px] text-teal-400 font-semibold border border-teal-500/20 bg-teal-500/10 rounded px-2 py-0.5 uppercase tracking-widest">
              IRS-Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-5">Auto-generated reports formatted for Schedule E, K-1, and 1031 filings.</p>

          <TaxReportRow
            title="Quarterly P&L"
            period="Q1 2026"
            rows="48 line items"
            badge="New"
          />
          <TaxReportRow
            title="Annual Tax Summary"
            period="FY 2023–2024"
            rows="124 transactions"
          />
          <TaxReportRow
            title="Lifetime Ledger"
            period="All time"
            rows="Portfolio-wide"
          />
        </div>

        {/* Automation Card — 1/3 */}
        <div
          className="rounded-2xl border border-white/10 p-6 flex flex-col gap-5"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Automation</span>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Monthly Auto-Sync</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Reconcile transactions and refresh all P&amp;L reports every 1st of the month.
                </p>
              </div>
              <button
                onClick={() => setAutoSync((v) => !v)}
                className="flex-shrink-0 mt-0.5"
                aria-label="Toggle auto-sync"
              >
                {autoSync
                  ? <ToggleRight className="w-7 h-7 text-teal-400" />
                  : <ToggleLeft  className="w-7 h-7 text-slate-500" />}
              </button>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Last sync</span>
                <span className="text-slate-300 font-semibold tabular-nums">May 1, 2026</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Next sync</span>
                <span className="text-teal-400 font-semibold tabular-nums">Jun 1, 2026</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className="text-teal-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <button className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Now
          </button>
        </div>
      </div>

      {/* ── Footer: Generate Tax-Ready CSV ── */}
      <div
        className="rounded-2xl border border-white/10 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Generate Tax-Ready CSV</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Formatted for direct import into TurboTax, H&amp;R Block, or professional CPA portals.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="px-5 py-2.5 rounded-lg border border-white/20 text-sm font-semibold text-slate-300 hover:border-white/40 hover:text-white transition-all">
            Preview Data
          </button>
          <button className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2">
            Export for Filing
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
