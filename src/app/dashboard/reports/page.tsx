'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  X,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import {
  calculateProjectTaxReport,
  aggregatePortfolioTaxReport,
  TaxPLResult,
  parseDateSafe,
} from '@/lib/utils/taxService';
import { projectsService } from '@/lib/firebase/projects';
import toast from 'react-hot-toast';
import { useTheme } from '@/lib/utils/ThemeProvider';
import {
  computeAllScenarioIRRs,
  type ScenarioAssumptions,
  type ScenarioResult,
} from '@/lib/projections/scenarioIRR';

type PeriodTab = 'Monthly' | 'Quarterly' | 'Yearly' | 'Overall';
type ScopeTab = 'Property' | 'My Share';

/* ═══════════════════════════════════════════════════════════════
   Reports & Tax Intelligence — Stitch Design Implementation

   Grid: 3-column layout matching Stitch project 11643693106955298243
     Row 1: NOI Trend (2/3) + Cash Flow Intelligence (1/3)
     Row 2: IRR Scenarios + Expense Distribution + Tax Alerts
     Footer: Generate Tax-Ready CSV
   ════════════════/* ── NOI Trend ECharts bar chart ── */
function NOITrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#18191D' : '#FFFFFF',
      borderColor: isDark ? 'rgba(230, 234, 240, 0.12)' : 'rgba(33, 34, 38, 0.12)',
      textStyle: { color: isDark ? '#FFFFFF' : '#121317', fontSize: 12 },
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
      axisLabel: { color: isDark ? '#9E9DA0' : '#45474D', fontSize: 10, fontFamily: 'var(--font-inter), Inter, sans-serif' },
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
              ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#627C85' }, { offset: 1, color: '#4c6168' }] }
              : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: isDark ? [{ offset: 0, color: '#282a32' }, { offset: 1, color: '#15161a' }] : [{ offset: 0, color: '#EFF2F7' }, { offset: 1, color: '#CDD4DC' }] },
          },
        })),
        barMaxWidth: 40,
        barCategoryGap: '25%',
        emphasis: {
          itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#627C85' }, { offset: 1, color: '#4c6168' }] } },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 220, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

/* ── Expense Donut ECharts ── */
function ExpenseDonut({ totalOpex, items, colors }: { totalOpex: number; items: { name: string; pct: number }[]; colors: string[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = items.map((item, i) => ({
    name: item.name,
    value: item.pct,
    itemStyle: { color: colors[i % colors.length] },
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {d}%',
      backgroundColor: isDark ? '#18191D' : '#FFFFFF',
      borderColor: isDark ? 'rgba(230, 234, 240, 0.12)' : 'rgba(33, 34, 38, 0.12)',
      textStyle: { color: isDark ? '#FFFFFF' : '#121317', fontSize: 12 },
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
          text: totalOpex > 0 ? `$${(totalOpex / 1000).toFixed(0)}k\nTOTAL OPEX` : '$0\nTOTAL OPEX',
          textAlign: 'center',
          fill: isDark ? '#FFFFFF' : '#121317',
          fontSize: 15,
          fontWeight: 'bold',
          lineHeight: 22,
          fontFamily: 'var(--font-inter), Inter, sans-serif',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 220, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

/* ── Cash Flow Progress Bar ── */
function CashFlowBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">{label}</span>
        <span className="text-sm font-semibold text-[var(--color-on-surface)] tabular-nums">{fmt(value)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-container-high)] overflow-hidden">
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
  assumptions,
}: {
  label: string;
  irr: string;
  holdYears: string;
  capExit: string;
  active?: boolean;
  assumptions?: ScenarioAssumptions;
}) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border transition-all ${
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]'
          : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-on-surface-variant)]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs uppercase tracking-widest font-semibold ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>
          {label}
        </span>
        <span className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">{holdYears}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-bold tabular-nums ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]'}`}>
          {irr}
        </span>
        <span className={`text-xs font-medium tabular-nums ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>
          {capExit}
        </span>
      </div>
      {assumptions && (
        <div className="mt-2 pt-2 border-t border-[var(--color-outline-variant)] grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-[10px] text-[var(--color-on-surface-variant)]">
            Rent growth: {assumptions.rentGrowthPct}%/yr
          </span>
          <span className="text-[10px] text-[var(--color-on-surface-variant)]">
            Vacancy: {assumptions.vacancyPct}%
          </span>
        </div>
      )}
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
      className={`rounded-xl border border-[var(--color-outline-variant)] p-4 flex flex-col gap-1.5 ${colSpan ? 'col-span-2' : ''} ${href ? 'hover:border-primary hover:bg-[var(--color-surface-container-low)] cursor-pointer transition-all' : ''}`}
      style={{ background: 'var(--color-surface-container-low)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tabular-nums text-[var(--color-on-surface)] leading-none">{value}</span>
        {trend && trend !== 'neutral' && (
          <ArrowUpRight
            className={`w-3.5 h-3.5 mb-0.5 flex-shrink-0 ${
              trend === 'up' ? 'text-[var(--color-primary)]' : 'text-[var(--color-error)] rotate-90'
            }`}
          />
        )}
      </div>
      {sub && <span className="text-[11px] text-[var(--color-on-surface-variant)] leading-tight">{sub}</span>}
    </div>
  );
  if (href) return <Link href={href} className={colSpan ? 'col-span-2' : ''}>{inner}</Link>;
  return inner;
}

/* ── Skeleton Loader ── */
function SkeletonMetric() {
  return (
    <div className="rounded-xl border border-[var(--color-outline-variant)] p-4 flex flex-col gap-2 animate-pulse">
      <div className="h-3 w-16 rounded bg-[var(--color-outline-variant)]" />
      <div className="h-7 w-24 rounded bg-[var(--color-outline-variant)]" />
      <div className="h-2.5 w-32 rounded bg-[var(--color-outline-variant)] opacity-50" />
    </div>
  );
}

/* ── Empty State Banner ── */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
      <AlertCircle className="w-5 h-5 text-[var(--color-on-surface-variant)] flex-shrink-0" />
      <p className="text-sm text-[var(--color-on-surface-variant)]">{message}</p>
    </div>
  );
}

interface CategorizedExpenses {
  advertising: number;
  insurance: number;
  repairs: number;
  taxes: number;
  utilities: number;
  management: number;
  depreciation: number;
}

function getCategorizedExpenses(
  project: any,
  ledgers: any[],
  taxYear: number,
  scale: number,
  grossRent: number
): CategorizedExpenses {
  const f = project.financials || {};
  const yearStart = new Date(taxYear, 0, 1).getTime();
  const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59, 999).getTime();

  const isInYear = (dateStr: any) => {
    const d = parseDateSafe(dateStr);
    if (!d) return false;
    const time = d.getTime();
    return time >= yearStart && time <= yearEnd;
  };

  const yearLedgers = ledgers.filter(
    (item: any) => item.status === 'Approved' && isInYear(item.createdAt)
  );

  const legacyCosts = f.costs || [];
  const yearLegacy = legacyCosts.filter(
    (item: any) => item.approved && isInYear(item.createdAt)
  );

  const allItems = [...yearLedgers, ...yearLegacy];

  const rxAdvertising = /advertis|market|listing fee/i;
  const rxInsurance = /insur|policy/i;
  const rxRepairs = /repair|mainten|fix|plumb|electr/i;
  const rxTaxes = /tax|assessor/i;
  const rxUtilities = /utilit|water|sewer/i;
  const rxManagement = /mgmt|management/i;

  let actualAdv = 0;
  let actualIns = 0;
  let actualRep = 0;
  let actualTax = 0;
  let actualUtil = 0;
  let actualMgmt = 0;

  allItems.forEach((item) => {
    const desc = (item.description || item.name || '').toLowerCase();
    const amount = (item.amount ?? 0) * scale;

    if (rxAdvertising.test(desc)) {
      actualAdv += amount;
    } else if (rxInsurance.test(desc)) {
      actualIns += amount;
    } else if (rxRepairs.test(desc)) {
      actualRep += amount;
    } else if (rxTaxes.test(desc)) {
      actualTax += amount;
    } else if (rxUtilities.test(desc)) {
      actualUtil += amount;
    } else if (rxManagement.test(desc)) {
      actualMgmt += amount;
    }
  });

  const fallbackIns = ((f.holdingCostInsurance ?? f.operatingExpenseInsurance ?? 0) * 12) * scale;
  const fallbackRep = ((f.monthlyMaintenanceReserve ?? f.maintenanceReserves ?? 0) * 12) * scale;
  const fallbackTax = ((f.holdingCostTaxes ?? f.operatingExpenseTaxes ?? 0) * 12) * scale;
  const fallbackUtil = ((f.holdingCostUtilities ?? 0) * 12) * scale;

  let fallbackMgmt = 0;
  if (f.propertyManagementFeePercent != null) {
    fallbackMgmt = grossRent * (f.propertyManagementFeePercent / 100);
  } else {
    fallbackMgmt = ((f.propertyManagementFee ?? 0) * 12) * scale;
  }

  // Fallback to annualAdvertisingExpense (user-entered) when no ledger items match
  const fallbackAdv = (f.annualAdvertisingExpense ?? f.rentalMarketingCost ?? 0) * scale;
  const advertising = actualAdv > 0 ? actualAdv : fallbackAdv;
  const insurance = actualIns > 0 ? actualIns : fallbackIns;
  const repairs = actualRep > 0 ? actualRep : fallbackRep;
  const taxes = actualTax > 0 ? actualTax : fallbackTax;
  const utilities = actualUtil > 0 ? actualUtil : fallbackUtil;
  const management = actualMgmt > 0 ? actualMgmt : fallbackMgmt;

  // Use calculateProjectTaxReport for unified depreciation logic
  const report = calculateProjectTaxReport(project, new Date(taxYear, 0, 1), new Date(taxYear, 11, 31));
  const depreciation = (report.depreciationEstimate ?? 0) * scale;

  return {
    advertising,
    insurance,
    repairs,
    taxes,
    utilities,
    management,
    depreciation,
  };
}

function ComparativeDepreciationCard({ projects }: { projects: any[] }) {
  const propA = projects[0] || {
    propertyName: 'Standard Asset (80/20 Fallback)',
    financials: {
      purchasePrice: 350000,
      taxAssessedLandValue: 70000,
      taxAssessedImprovementValue: 280000,
      placedInServiceDate: '2025-01-01',
    }
  };

  const propB = projects[1] || {
    propertyName: 'Premium Land Asset (70/30 Split)',
    financials: {
      purchasePrice: 500000,
      taxAssessedLandValue: 150000,
      taxAssessedImprovementValue: 350000,
      placedInServiceDate: '2025-01-01',
    }
  };

  const getPropDetails = (p: any) => {
    const f = p.financials || {};
    const price = f.purchasePrice || 300000;
    const acqCosts = f.fixedAcquisitionCosts || 0;
    const basis = price + acqCosts;

    const landVal = f.taxAssessedLandValue ?? 0;
    const impVal = f.taxAssessedImprovementValue ?? 0;
    const totalAssessed = landVal + impVal;

    let landPct = 0.20;
    let buildingPct = 0.80;

    if (totalAssessed > 0) {
      landPct = landVal / totalAssessed;
      buildingPct = impVal / totalAssessed;
    }

    const landValue = basis * landPct;
    const depreciableBasis = basis * buildingPct;
    const annualDepr = depreciableBasis / 27.5;

    return {
      name: p.propertyName || p.address || 'Example Asset',
      basis,
      landPct: landPct * 100,
      landValue,
      buildingPct: buildingPct * 100,
      depreciableBasis,
      annualDepr,
    };
  };

  const a = getPropDetails(propA);
  const b = getPropDetails(propB);

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Property A Column */}
        <div className="p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex flex-col gap-3">
          <div className="truncate text-xs font-bold text-[var(--color-on-surface)]" title={a.name}>
            {a.name}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider block">Acquisition Basis</span>
            <span className="text-lg font-extrabold text-[var(--color-on-surface)] tabular-nums">{fmt(a.basis)}</span>
          </div>
          <div className="space-y-2 border-t border-[var(--color-outline-variant)] pt-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-on-surface-variant)]">Land Split ({a.landPct.toFixed(0)}%)</span>
              <span className="font-semibold tabular-nums text-amber-500">{fmt(a.landValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-on-surface-variant)]">Building Basis ({a.buildingPct.toFixed(0)}%)</span>
              <span className="font-semibold tabular-nums text-[var(--color-primary)]">{fmt(a.depreciableBasis)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-[var(--color-outline-variant)] pt-2">
              <span className="text-[var(--color-on-surface-variant)] font-medium">Annual Deduction</span>
              <span className="font-bold tabular-nums text-[var(--color-primary)]">{fmt(a.annualDepr)}/yr</span>
            </div>
          </div>
        </div>

        {/* Property B Column */}
        <div className="p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex flex-col gap-3">
          <div className="truncate text-xs font-bold text-[var(--color-on-surface)]" title={b.name}>
            {b.name}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider block">Acquisition Basis</span>
            <span className="text-lg font-extrabold text-[var(--color-on-surface)] tabular-nums">{fmt(b.basis)}</span>
          </div>
          <div className="space-y-2 border-t border-[var(--color-outline-variant)] pt-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-on-surface-variant)]">Land Split ({b.landPct.toFixed(0)}%)</span>
              <span className="font-semibold tabular-nums text-amber-500">{fmt(b.landValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-on-surface-variant)]">Building Basis ({b.buildingPct.toFixed(0)}%)</span>
              <span className="font-semibold tabular-nums text-[var(--color-primary)]">{fmt(b.depreciableBasis)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-[var(--color-outline-variant)] pt-2">
              <span className="text-[var(--color-on-surface-variant)] font-medium">Annual Deduction</span>
              <span className="font-bold tabular-nums text-[var(--color-primary)]">{fmt(b.annualDepr)}/yr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual basis ratio comparison bars */}
      <div className="p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] block">Basis Allocation Visualizer</span>
        <div className="space-y-2.5">
          {/* Bar A */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--color-on-surface-variant)]">
              <span className="truncate max-w-[150px]">{a.name}</span>
              <span>Building: {a.buildingPct.toFixed(0)}% | Land: {a.landPct.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[var(--color-surface-container-high)] flex overflow-hidden">
              <div style={{ width: `${a.buildingPct}%` }} className="h-full bg-[var(--color-primary)] animate-all duration-500" />
              <div style={{ width: `${a.landPct}%` }} className="h-full bg-amber-500 animate-all duration-500" />
            </div>
          </div>
          {/* Bar B */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--color-on-surface-variant)]">
              <span className="truncate max-w-[150px]">{b.name}</span>
              <span>Building: {b.buildingPct.toFixed(0)}% | Land: {b.landPct.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[var(--color-surface-container-high)] flex overflow-hidden">
              <div style={{ width: `${b.buildingPct}%` }} className="h-full bg-[var(--color-primary)] animate-all duration-500" />
              <div style={{ width: `${b.landPct}%` }} className="h-full bg-amber-500 animate-all duration-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tax Report Row ── */
function TaxReportRow({
  title,
  period,
  rows,
  badge,
  onPDF,
  onCSV,
}: {
  title: string;
  period: string;
  rows: string;
  badge?: string;
  onPDF: () => void;
  onCSV: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[var(--color-outline-variant)] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate">{title}</p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">{period} · {rows}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-primary)] border border-[var(--color-outline-variant)]">
            {badge}
          </span>
        )}
        <button
          onClick={onPDF}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:border-primary hover:text-[var(--color-on-surface)] transition-all"
        >
          PDF
        </button>
        <button
          onClick={onCSV}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-primary-container)] transition-all"
        >
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
      className={`px-4 py-3 rounded-lg border-l-2 bg-[var(--color-surface-container-low)] ${
        severity === 'warning' ? 'border-l-amber-500' : 'border-l-[var(--color-primary)]'
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${severity === 'warning' ? 'text-amber-500' : 'text-[var(--color-primary)]'}`}>
        {title}
      </p>
      <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">{body}</p>
    </div>
  );
}

/* ── Preview Modal ── */
function PreviewModal({ csvData, onClose }: { csvData: string; onClose: () => void }) {
  const lines = csvData.split('\n').slice(0, 25);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[80vh] rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-6 overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-[var(--color-on-surface)]">CSV Data Preview</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--color-surface-container-high)] transition-all">
            <X className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] p-4">
          <pre className="text-xs text-[var(--color-on-surface)] font-mono whitespace-pre leading-relaxed">
            {lines.join('\n')}
            {csvData.split('\n').length > 25 && '\n\n... (truncated — full data will be in export)'}
          </pre>
        </div>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-3">
          Showing first {Math.min(25, csvData.split('\n').length)} of {csvData.split('\n').length} rows.
        </p>
      </div>
    </div>
  );
}

/* ── CSV Generation Helpers ── */
function generateTaxReportCSV(title: string, report: TaxPLResult | Omit<TaxPLResult, 'projectId' | 'propertyName'> | null): string {
  if (!report) return 'No data available';
  const headers = [
    'Field', 'Amount'
  ];
  const rows = [
    ['Rental Income', report.rentalIncome.toFixed(2)],
    ['Other Income', report.otherIncome.toFixed(2)],
    ['Sale Proceeds', report.saleProceeds.toFixed(2)],
    ['Total Gross Income', report.totalGrossIncome.toFixed(2)],
    ['Property Taxes', report.propertyTaxes.toFixed(2)],
    ['Insurance', report.insurance.toFixed(2)],
    ['Utilities', report.utilities.toFixed(2)],
    ['Property Management', report.propertyManagement.toFixed(2)],
    ['Repairs & Maintenance', report.repairsMaintenance.toFixed(2)],
    ['HOA Fees', report.hoaFees.toFixed(2)],
    ['Mortgage Interest', report.mortgageInterest.toFixed(2)],
    ['Total Deductible Expenses', report.totalDeductibleExpenses.toFixed(2)],
    ['Net Operating Result', report.netOperatingResult.toFixed(2)],
    ['Net Taxable Result', report.netTaxableResult.toFixed(2)],
    ['Mortgage Principal', report.mortgagePrincipal.toFixed(2)],
    ['Capitalized Rehab', report.capitalizedRehab.toFixed(2)],
    ['Depreciation Estimate', report.depreciationEstimate.toFixed(2)],
    ['Selling Costs', report.sellingCosts.toFixed(2)],
    ['Realized Gain/Loss', report.realizedGainLoss.toFixed(2)],
    ['Acquisition Basis', report.acquisitionBasis.toFixed(2)],
    ['Lifetime Capitalized Rehab', report.lifetimeCapitalizedRehab.toFixed(2)],
  ];
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generatePortfolioCSV(
  projects: any[],
  periodStart: Date,
  periodEnd: Date,
): string {
  if (projects.length === 0) return 'No projects with financial data';
  const headers = [
    'Property', 'Rental Income', 'Other Income', 'Sale Proceeds', 'Total Income',
    'Taxes', 'Insurance', 'Utilities', 'Mgmt', 'Maintenance', 'HOA', 'Mortgage Interest',
    'Total Expenses', 'Net Operating', 'Net Taxable', 'Depreciation', 'Gain/Loss',
  ];
  const rows = projects.map((p) => {
    try {
      const r = calculateProjectTaxReport(p, periodStart, periodEnd);
      return [
        `"${r.propertyName}"`, r.rentalIncome.toFixed(2), r.otherIncome.toFixed(2),
        r.saleProceeds.toFixed(2), r.totalGrossIncome.toFixed(2),
        r.propertyTaxes.toFixed(2), r.insurance.toFixed(2), r.utilities.toFixed(2),
        r.propertyManagement.toFixed(2), r.repairsMaintenance.toFixed(2),
        r.hoaFees.toFixed(2), r.mortgageInterest.toFixed(2),
        r.totalDeductibleExpenses.toFixed(2), r.netOperatingResult.toFixed(2),
        r.netTaxableResult.toFixed(2), r.depreciationEstimate.toFixed(2),
        r.realizedGainLoss.toFixed(2),
      ].join(',');
    } catch {
      return `"${p.propertyName || p.address || 'Unknown'}",Error computing report`;
    }
  });
  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadPDFViaPrint(title: string, csvContent: string) {
  // Create a print-optimized view and trigger window.print()
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    toast.error('Please allow pop-ups to generate PDF');
    return;
  }
  const lines = csvContent.split('\n');
  const headers = lines[0]?.split(',') || [];
  const rows = lines.slice(1).map(l => l.split(','));

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} — PaperWorking</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #111; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
        td { padding: 6px 12px; border-bottom: 1px solid #e5e5e5; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .footer { margin-top: 24px; font-size: 10px; color: #999; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>PAPERWORKING — ${title}</h1>
      <div class="subtitle">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <table>
        <thead><tr>${headers.map(h => `<th>${h.replace(/"/g, '')}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c.replace(/"/g, '')}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <div class="footer">This report is for informational purposes only. Not official tax advice. Consult a CPA.</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
}

/* ═══ Main Page ═══ */
export default function ReportsPage() {
  useAllDealsSync();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const expenseColors = isDark
    ? ['#627C85', '#9E9DA0', '#C4A35A', '#282a32']
    : ['#627C85', '#45474D', '#7A5500', '#EFF2F7'];

  const projects = useProjectStore((s) => s.projects);
  const ledgerItemsMap = useProjectStore((s) => s.ledgerItems);
  const updateProjectFinancials = useProjectStore((s) => s.updateProjectFinancials);

  const [selectedTaxProject, setSelectedTaxProject] = useState<any | null>(null);
  const [landValueInput, setLandValueInput] = useState('');
  const [improvementValueInput, setImprovementValueInput] = useState('');
  const [placedInServiceInput, setPlacedInServiceInput] = useState('');
  const [advertisingInput, setAdvertisingInput] = useState('');
  const [isSavingTaxSettings, setIsSavingTaxSettings] = useState(false);

  const handleOpenTaxSettings = (proj: any) => {
    setSelectedTaxProject(proj);
    setLandValueInput(proj.financials?.taxAssessedLandValue?.toString() || '');
    setImprovementValueInput(proj.financials?.taxAssessedImprovementValue?.toString() || '');
    setAdvertisingInput(proj.financials?.annualAdvertisingExpense?.toString() || '');
    const serviceDate = proj.financials?.placedInServiceDate;
    if (serviceDate) {
      setPlacedInServiceInput(new Date(serviceDate).toISOString().split('T')[0]);
    } else {
      setPlacedInServiceInput('');
    }
  };

  const handleSaveTaxSettings = async () => {
    if (!selectedTaxProject) return;
    setIsSavingTaxSettings(true);
    try {
      const landVal = parseFloat(landValueInput) || 0;
      const impVal = parseFloat(improvementValueInput) || 0;
      const advVal = parseFloat(advertisingInput) || 0;
      const dateVal = placedInServiceInput ? new Date(placedInServiceInput).toISOString() : undefined;

      // 1. Update store
      updateProjectFinancials(selectedTaxProject.id, {
        taxAssessedLandValue: landVal,
        taxAssessedImprovementValue: impVal,
        placedInServiceDate: dateVal,
        annualAdvertisingExpense: advVal,
      });

      // 2. Persist to Firestore
      const projToUpdate = projects.find((p) => p.id === selectedTaxProject.id);
      if (projToUpdate) {
        const updatedFinancials = {
          ...projToUpdate.financials,
          taxAssessedLandValue: landVal,
          taxAssessedImprovementValue: impVal,
          placedInServiceDate: dateVal,
          annualAdvertisingExpense: advVal,
        };
        await projectsService.updateProject(selectedTaxProject.id, {
          financials: updatedFinancials
        });
      }
      toast.success('Tax settings updated successfully');
      setSelectedTaxProject(null);
    } catch (err) {
      console.error('[handleSaveTaxSettings] Error:', err);
      toast.error('Failed to update tax settings');
    } finally {
      setIsSavingTaxSettings(false);
    }
  };

  const now = useMemo(() => new Date(), []);
  const [localLastSynced, setLocalLastSynced] = useState<Date | null>(null);

  const lastSyncedDate = useMemo(() => {
    let latest: Date | null = null;
    for (const p of projects) {
      if (p.lastSyncedAt) {
        const d = new Date(p.lastSyncedAt);
        if (!latest || d.getTime() > latest.getTime()) {
          latest = d;
        }
      }
    }
    return latest;
  }, [projects]);

  // Prefer the optimistic local timestamp set immediately on sync success;
  // fall back to the Firestore-derived value once the snapshot propagates.
  const effectiveLastSynced = localLastSynced ?? lastSyncedDate;

  const lastSyncStr = useMemo(() => {
    if (effectiveLastSynced) {
      return effectiveLastSynced.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return 'Never synced';
  }, [effectiveLastSynced]);

  // Next eligible refresh = last sync + 7 days (matches the 7-day TTL in the cron route).
  // Shown as an estimate, not a scheduled event.
  const nextSyncStr = useMemo(() => {
    if (!effectiveLastSynced) return 'Next manual sync';
    const next = new Date(effectiveLastSynced.getTime() + 7 * 24 * 60 * 60 * 1000);
    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [effectiveLastSynced]);

  const [period, setPeriod] = useState<PeriodTab>('Quarterly');
  const [scope, setScope]   = useState<ScopeTab>('Property');
  const [syncing, setSyncing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [capGains, setCapGains] = useState({
    purchasePrice: '',
    salePrice: '',
    improvements: '',
    depreciationRecapture: '',
  });

  const apiPeriodType = period === 'Monthly' ? 'monthly' : period === 'Quarterly' ? 'quarterly' : period === 'Yearly' ? 'annual' : 'monthly';
  // Route only accepts monthly/quarterly/yearly; Overall has no API analogue
  const reportApiPeriod = period === 'Monthly' ? 'monthly' : period === 'Quarterly' ? 'quarterly' : period === 'Yearly' ? 'yearly' : null;
  const scopeParam = scope === 'My Share' ? 'myShare' : 'property';

  // Period ledger — fetched from /api/reports/[period]
  type PeriodLedgerTx = { date: string; label: string; category: string; amount: number; projectId: string; project: string };
  type PeriodLedger = {
    totals: { totalTransactions: number; totalExpenses: number; totalRevenue: number; netFlow: number };
    transactions: PeriodLedgerTx[];
    count: number;
    page: number;
    pages: number;
    periodStart: string;
    periodEnd: string;
  };
  const [periodLedger, setPeriodLedger] = useState<PeriodLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const orgId = profile?.organizationId || profile?.personalOrganizationId;

  useEffect(() => {
    if (!reportApiPeriod || !orgId || !user) {
      setPeriodLedger(null);
      return;
    }
    let cancelled = false;
    setLedgerLoading(true);
    setLedgerError(null);
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(
          `/api/reports/${reportApiPeriod}?organizationId=${encodeURIComponent(orgId)}`,
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setPeriodLedger(data);
      } catch (err: any) {
        if (!cancelled) setLedgerError(err.message || 'Failed to load period ledger');
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportApiPeriod, orgId, user]);

  // Pass scope + projects into the hook so it applies ownershipPercentage scaling
  const { snapshots, loading } = usePortfolioMetricSnapshots(apiPeriodType, projects, scopeParam as 'property' | 'myShare');

  const hasProjects = projects.length > 0;
  const projectsWithFinancials = projects.filter((p) => p.financials);
  const hasFinancials = projectsWithFinancials.length > 0;

  // Ownership scaling factor for per-project computations
  const scopeScale = useCallback(
    (p: any) => {
      if (scope !== 'My Share') return 1;
      return ((p.financials?.ownershipPercentage ?? 100) / 100);
    },
    [scope],
  );

  /* ── Derived NOI chart data ── */
  const { noiValues, noiLabels, latestNOI, noiChange } = useMemo(() => {
    if (!snapshots || snapshots.length < 2) {
      return { noiValues: [], noiLabels: [], latestNOI: 0, noiChange: 0 };
    }
    const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-12);
    const vals   = sorted.map((s) => s.noi ?? 0);
    const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
    const last  = vals[vals.length - 1] ?? 0;
    const prev  = vals[vals.length - 2] ?? 1;
    const chg   = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
    return { noiValues: vals, noiLabels: labels, latestNOI: last, noiChange: chg };
  }, [snapshots]);

  /* ── Derived portfolio financials (scope-aware) ── */
  const portfolioFinancials = useMemo(() => {
    let grossRevenue = 0, opExpenses = 0, debtService = 0;
    projects.forEach((p) => {
      const f = p.financials;
      if (!f) return;
      const scale = scopeScale(p);
      grossRevenue += ((f.monthlyGrossRent ?? 0) * 12) * scale;
      const security = (f.holding_cost_security ? f.holding_cost_security / 100 : f.holdingCostSecurity) ?? 0;
      opExpenses   += (((f.holdingCostInsurance ?? 0) + (f.holdingCostTaxes ?? 0) + (f.holdingCostUtilities ?? 0) + security) * 12) * scale;
      debtService  += ((f.longTermMortgagePayment ?? 0) * 12) * scale;
    });
    return { grossRevenue, opExpenses, debtService };
  }, [projects, scopeScale]);

  /* ── Expense distribution — computed from actual project data ── */
  const expenseItems = useMemo(() => {
    let totalInsurance = 0, totalTaxes = 0, totalUtilities = 0, totalOther = 0;
    projects.forEach((p) => {
      const f = p.financials;
      if (!f) return;
      const scale = scopeScale(p);
      totalInsurance += ((f.holdingCostInsurance ?? 0) * 12) * scale;
      totalTaxes     += ((f.holdingCostTaxes ?? 0) * 12) * scale;
      totalUtilities += ((f.holdingCostUtilities ?? 0) * 12) * scale;
      const security = (f.holding_cost_security ? f.holding_cost_security / 100 : f.holdingCostSecurity) ?? 0;
      // Other includes management fees, maintenance, HOA, security
      const otherMonthly = (f.propertyManagementFee ?? 0) + (f.monthlyMaintenanceReserve ?? f.maintenanceReserves ?? 0) + (f.monthlyHOA ?? 0) + security;
      totalOther += (otherMonthly * 12) * scale;
    });

    const total = totalInsurance + totalTaxes + totalUtilities + totalOther;
    if (total === 0) {
      return [
        { name: 'Insurance', pct: 25 },
        { name: 'Taxes', pct: 25 },
        { name: 'Utilities', pct: 25 },
        { name: 'Other', pct: 25 },
      ];
    }
    return [
      { name: 'Insurance', pct: Math.round((totalInsurance / total) * 100) },
      { name: 'Taxes', pct: Math.round((totalTaxes / total) * 100) },
      { name: 'Utilities', pct: Math.round((totalUtilities / total) * 100) },
      { name: 'Other', pct: 100 - Math.round((totalInsurance / total) * 100) - Math.round((totalTaxes / total) * 100) - Math.round((totalUtilities / total) * 100) },
    ];
  }, [projects, scopeScale]);

  /* ── Tax report aggregate ── */
  const { taxReport, perProjectReports } = useMemo(() => {
    if (projects.length === 0) return { taxReport: null, perProjectReports: [] as TaxPLResult[] };
    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const results = projects.map((p) => calculateProjectTaxReport(p, yearStart, now));
      return { taxReport: aggregatePortfolioTaxReport(results), perProjectReports: results };
    } catch { return { taxReport: null, perProjectReports: [] as TaxPLResult[] }; }
  }, [projects]);

  const totalOpex = portfolioFinancials.opExpenses;

  /* ── IRR scenarios — modeled from real cash-flow projections ── */
  const irrScenarios = useMemo((): ScenarioResult[] | null => {
    // Find the first project with both purchasePrice and monthly rent — the
    // minimum inputs required by projectScenarioCashFlows.
    const baseProject = projects.find((p) => {
      const f = p.financials;
      if (!f) return false;
      const pp = f.purchasePrice || (f as any).targetPurchasePrice;
      const rent = f.monthlyGrossRent ?? f.projectedMonthlyRent ?? (f as any).projectedRent;
      return pp && rent;
    });
    if (!baseProject) return null;

    return computeAllScenarioIRRs(baseProject);
  }, [projects]);

  /* ── Tax alerts — derive from tax report ── */
  const taxAlerts = useMemo(() => {
    const alerts = [];
    if (taxReport && (taxReport.realizedGainLoss ?? 0) > 20_000) {
      alerts.push({
        title: 'Depreciation Recapture Warning',
        body: `Potential $${Math.round((taxReport.realizedGainLoss ?? 0) * 0.065).toLocaleString()} tax liability detected on Q4 exit scenario. Recommend cost-segregation study review.`,
        severity: 'warning' as const,
      });
    } else if (taxReport && taxReport.totalGrossIncome > 0) {
      alerts.push({
        title: 'Tax Position',
        body: `Net taxable result: $${Math.round(taxReport.netTaxableResult).toLocaleString()}. Review depreciation strategy to optimize tax position.`,
        severity: 'info' as const,
      });
    }

    if (hasProjects) {
      const soldCount = projects.filter(p => p.status === 'exit' && p.dispositionType === 'SALE').length;
      if (soldCount > 0) {
        alerts.push({
          title: '1031 Exchange Window',
          body: `${soldCount} sold ${soldCount === 1 ? 'property' : 'properties'} — review replacement property options to defer capital gains tax.`,
          severity: 'info' as const,
        });
      }
    }

    return alerts;
  }, [taxReport, hasProjects, projects]);

  const fmtLarge = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(3).replace(/\.?0+$/, '')}M`
      : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ── Core REI Metrics — compute from projects (scope-aware) ── */
  const [autoSync, setAutoSync] = useState(true);

  const reiMetrics = useMemo(() => {
    if (!hasFinancials) {
      return {
        noi: '$0', irr: '—', capRate: '—', coc: '—',
        ltv: '—', dscr: '—', grm: '—', roa: '—',
        oer: '—', yoc: '—', appreciation: '—',
        occupancy: '—', performance: '$0',
      };
    }

    let totalValue = 0, totalLoan = 0, totalNOI = 0, totalGrossRent = 0,
        totalOpEx = 0, totalDebtSvc = 0, totalCostBasis = 0, totalEquity = 0;

    projects.forEach((p) => {
      const f = p.financials;
      if (!f) return;
      const scale = scopeScale(p);
      const arv       = (f.arv ?? f.purchasePrice ?? 0) * scale;
      const loan      = (f.loanAmount ?? ((f.arv ?? f.purchasePrice ?? 0) * 0.65)) * scale;
      const annualRent= ((f.monthlyGrossRent ?? 0) * 12) * scale;
      const insurance = (f.holding_cost_insurance ? f.holding_cost_insurance / 100 : f.holdingCostInsurance) ?? 0;
      const tax = (f.holding_cost_tax ? f.holding_cost_tax / 100 : f.holdingCostTaxes) ?? 0;
      const utilities = (f.holding_cost_utilities ? f.holding_cost_utilities / 100 : f.holdingCostUtilities) ?? 0;
      const security = (f.holding_cost_security ? f.holding_cost_security / 100 : f.holdingCostSecurity) ?? 0;
      const rehab = (f.rehab_budget ? f.rehab_budget / 100 : f.rehabBudget) ?? 0;
      const annualOpEx= ((insurance + tax + utilities + security) * 12) * scale;
      const cost      = ((f.purchasePrice ?? 0) + rehab) * scale;
      const annualDebt= ((f.longTermMortgagePayment ?? 0) * 12) * scale;
      totalValue    += arv;
      totalLoan     += loan;
      totalGrossRent += annualRent;
      totalOpEx     += annualOpEx;
      totalNOI      += Math.max(0, annualRent - annualOpEx);
      totalDebtSvc  += annualDebt;
      totalCostBasis += cost;
      totalEquity   += Math.max(0, arv - loan);
    });

    const capRate   = totalValue > 0 ? (totalNOI / totalValue) * 100 : 0;
    const ltv       = totalValue > 0 ? (totalLoan / totalValue) * 100 : 0;
    const dscr      = totalDebtSvc > 0 ? totalNOI / totalDebtSvc : 0;
    const grm       = totalGrossRent > 0 ? totalValue / totalGrossRent : 0;
    const roa       = totalValue > 0 ? (totalNOI / totalValue) * 100 : 0;
    const oer       = totalGrossRent > 0 ? (totalOpEx / totalGrossRent) * 100 : 0;
    const yoc       = totalCostBasis > 0 ? (totalNOI / totalCostBasis) * 100 : 0;
    const netCF     = totalNOI - totalDebtSvc;
    const coc       = totalEquity > 0 ? (netCF / totalEquity) * 100 : 0;
    const baseIRR   = projects.find((p) => (p.financials?.cashOnCashReturn ?? 0) > 0)?.financials?.cashOnCashReturn;

    // Compute occupancy from snapshots if available
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const occupancyVal = latestSnapshot?.occupancyRate;
    const appreciationVal = latestSnapshot?.appreciation;

    const fmt1 = (n: number) => n.toFixed(1);
    const fmt2 = (n: number) => n.toFixed(2);
    const fmtNOI = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;
    const fmtPerf = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;

    return {
      noi: fmtNOI(totalNOI),
      irr: baseIRR != null ? `${fmt1(baseIRR)}%` : '—',
      capRate: capRate > 0 ? `${fmt2(capRate)}%` : '—',
      coc: coc !== 0 ? `${fmt2(coc)}%` : '—',
      ltv: ltv > 0 ? `${Math.round(ltv)}%` : '—',
      dscr: dscr > 0 ? `${fmt2(dscr)}x` : '—',
      grm: grm > 0 ? fmt1(grm) : '—',
      roa: roa > 0 ? `${fmt2(roa)}%` : '—',
      oer: oer > 0 ? `${fmt1(oer)}%` : '—',
      yoc: yoc > 0 ? `${fmt2(yoc)}%` : '—',
      appreciation: appreciationVal != null ? `${appreciationVal >= 0 ? '+' : ''}${fmt1(appreciationVal)}%` : '—',
      occupancy: occupancyVal != null ? `${fmt1(occupancyVal)}%` : '—',
      performance: fmtPerf(totalValue),
    };
  }, [projects, hasFinancials, scopeScale, snapshots]);

  /* ── Button Handlers ── */

  // Sync Now — re-trigger data sync by forcing store update
  const handleSyncNow = useCallback(async () => {
    if (!user) {
      toast.error('User session not found.');
      return;
    }
    setSyncing(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/reil/cron/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to refresh data');
      }

      const data = await res.json();
      const syncedAt = new Date();
      setLocalLastSynced(syncedAt);
      toast.success(`Sync completed! Refreshed ${data.refreshed} projects.`, {
        icon: '🔄',
        style: { background: '#111', color: '#fff', border: '1px solid #333' },
      });
      // Trigger metric recalculation; the Firestore onSnapshot will update
      // lastSyncedAt on individual project records as it propagates.
      useProjectStore.getState().recalculateMetrics();
    } catch (err) {
      console.error('[Sync Now] Failed to refresh data', err);
      toast.error('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }, [user]);

  // Tax report period bounds
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const q1End = new Date(now.getFullYear(), 2, 31);

  // Per-row tax report handlers
  const handleQuarterlyPDF = useCallback(() => {
    const csv = generatePortfolioCSV(projects, yearStart, q1End);
    downloadPDFViaPrint('Quarterly P&L — Q1 ' + now.getFullYear(), csv);
    toast.success('PDF generated');
  }, [projects, yearStart, q1End, now]);

  const handleQuarterlyCSV = useCallback(() => {
    const csv = generatePortfolioCSV(projects, yearStart, q1End);
    downloadCSV(csv, `Quarterly_PL_Q1_${now.getFullYear()}.csv`);
    toast.success('CSV downloaded');
  }, [projects, yearStart, q1End, now]);

  const handleAnnualPDF = useCallback(() => {
    const prevYearStart = new Date(now.getFullYear() - 2, 0, 1);
    const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    const csv = generatePortfolioCSV(projects, prevYearStart, prevYearEnd);
    downloadPDFViaPrint(`Annual Tax Summary — FY ${now.getFullYear() - 2}–${now.getFullYear() - 1}`, csv);
    toast.success('PDF generated');
  }, [projects, now]);

  const handleAnnualCSV = useCallback(() => {
    const prevYearStart = new Date(now.getFullYear() - 2, 0, 1);
    const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    const csv = generatePortfolioCSV(projects, prevYearStart, prevYearEnd);
    downloadCSV(csv, `Annual_Tax_Summary_FY${now.getFullYear() - 2}-${now.getFullYear() - 1}.csv`);
    toast.success('CSV downloaded');
  }, [projects, now]);

  const handleLifetimePDF = useCallback(() => {
    const allTimeStart = new Date(2000, 0, 1);
    const csv = generatePortfolioCSV(projects, allTimeStart, now);
    downloadPDFViaPrint('Lifetime Ledger — All Time', csv);
    toast.success('PDF generated');
  }, [projects, now]);

  const handleLifetimeCSV = useCallback(() => {
    const allTimeStart = new Date(2000, 0, 1);
    const csv = generatePortfolioCSV(projects, allTimeStart, now);
    downloadCSV(csv, 'Lifetime_Ledger_All_Time.csv');
    toast.success('CSV downloaded');
  }, [projects, now]);

  // View Detailed Tax Strategy
  const handleViewTaxStrategy = useCallback(() => {
    router.push('/dashboard/reports/tax-strategy');
  }, [router]);

  // Preview Data
  const handlePreviewData = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  // Export for Filing
  const handleExportForFiling = useCallback(() => {
    if (!hasProjects) {
      toast.error('No projects to export');
      return;
    }
    const csv = generatePortfolioCSV(projects, yearStart, now);
    downloadCSV(csv, `PaperWorking_Tax_Export_${now.getFullYear()}_${now.toISOString().split('T')[0]}.csv`);
    toast.success('Tax-ready CSV exported', {
      icon: '📄',
      style: { background: '#111', color: '#fff', border: '1px solid #333' },
    });
  }, [hasProjects, projects, yearStart, now]);

  // Preview CSV content for modal
  const previewCSV = useMemo(() => {
    if (!hasProjects) return 'No projects with financial data available.';
    return generatePortfolioCSV(projects, yearStart, now);
  }, [hasProjects, projects, yearStart, now]);

  return (
    <div
      className="min-h-full px-6 lg:px-8 py-8 space-y-6"
      style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Preview Modal */}
      {previewOpen && (
        <PreviewModal csvData={previewCSV} onClose={() => setPreviewOpen(false)} />
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] tracking-tight">Reports &amp; Tax Intelligence</h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">Intelligent fiscal oversight for your real estate portfolio.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Period tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]">
            {(['Monthly', 'Quarterly', 'Yearly', 'Overall'] as PeriodTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  period === t
                    ? 'border border-[var(--color-outline-variant)] text-[var(--color-primary)] bg-[var(--color-primary-container)]'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Scope tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]">
            {(['Property', 'My Share'] as ScopeTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setScope(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  scope === t
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── No Data Empty State ── */}
      {!hasFinancials && !loading && (
        <EmptyState message="No financial data yet — add financials to your projects to see reports." />
      )}

      {/* ── Core REI Metrics Bento Grid ── */}
      <div
        className="rounded-2xl border border-[var(--color-outline-variant)] p-5"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Core REI Metrics</span>
          <div className="flex items-center gap-2">
            {scope === 'My Share' && (
              <span className="text-[10px] font-semibold text-[var(--color-secondary)] bg-[var(--color-secondary-container)] border border-[var(--color-outline-variant)] rounded px-2 py-0.5 uppercase tracking-widest">
                My Share
              </span>
            )}
            <span className="text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-container)] border border-[var(--color-outline-variant)] rounded px-2 py-0.5 uppercase tracking-widest">
              Portfolio Aggregate
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 15 }).map((_, i) => <SkeletonMetric key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Row 1 */}
            <BentoMetric label="NOI" value={reiMetrics.noi} sub="Net Operating Income" trend={hasFinancials ? 'up' : 'neutral'} href="/dashboard/intelligence/noi" />
            <BentoMetric label="IRR" value={reiMetrics.irr} sub="Internal Rate of Return" trend={hasFinancials ? 'up' : 'neutral'} href="/dashboard/intelligence/irr" />
            <BentoMetric label="Cap Rate" value={reiMetrics.capRate} sub="Capitalization Rate" trend="neutral" href="/dashboard/intelligence/cap-rate" />
            <BentoMetric label="Cash-on-Cash" value={reiMetrics.coc} sub="Cash Return on Equity" trend={hasFinancials ? 'up' : 'neutral'} href="/dashboard/intelligence/coc" />
            {/* Row 2 */}
            <BentoMetric label="LTV" value={reiMetrics.ltv} sub="Loan-to-Value" trend="neutral" href="/dashboard/intelligence/ltv" />
            <BentoMetric label="DSCR" value={reiMetrics.dscr} sub="Debt Service Coverage" trend={hasFinancials ? 'up' : 'neutral'} href="/dashboard/intelligence/dscr" />
            <BentoMetric label="GRM" value={reiMetrics.grm} sub="Gross Rent Multiplier" trend="neutral" href="/dashboard/intelligence/grm" />
            <BentoMetric label="ROA" value={reiMetrics.roa} sub="Return on Assets" trend={hasFinancials ? 'up' : 'neutral'} />
            {/* Row 3 */}
            <BentoMetric label="OER" value={reiMetrics.oer} sub="Operating Expense Ratio" trend={hasFinancials ? 'down' : 'neutral'} href="/dashboard/intelligence/oer" />
            <BentoMetric label="Yield on Cost" value={reiMetrics.yoc} sub="Dev yield on cost basis" trend={hasFinancials ? 'up' : 'neutral'} />
            <BentoMetric label="Cash Flow" value={reiMetrics.noi} sub="Annual net cash flow" trend={hasFinancials ? 'up' : 'neutral'} href="/dashboard/intelligence/cash-flow" />
            <BentoMetric label="Occupancy" value={reiMetrics.occupancy} sub="Portfolio occupancy rate" trend={hasFinancials ? 'up' : 'neutral'} href="/dashboard/intelligence/occupancy" />
            <BentoMetric label="Appreciation" value={reiMetrics.appreciation} sub="YTD portfolio value gain" trend={hasFinancials ? 'up' : 'neutral'} colSpan href="/dashboard/intelligence/appreciation" />
            <BentoMetric label="Performance" value={reiMetrics.performance} sub="Portfolio value trajectory" trend={hasFinancials ? 'up' : 'neutral'} href="/dashboard/intelligence/performance" />
            <BentoMetric label="Comparison" value={`${projects.length} props`} sub="Side-by-side matrix" trend="neutral" href="/dashboard/intelligence/comparison" />
          </div>
        )}
      </div>

      {/* ── Row 1: NOI Trend + Cash Flow Intelligence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* NOI Trend Chart — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl border border-[var(--color-outline-variant)] p-6" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-start justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Net Operating Income (NOI) Trend
            </span>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-[var(--color-outline-variant)] cursor-pointer hover:border-primary transition-colors" />
              <span className="w-2.5 h-2.5 rounded-full border border-primary bg-[var(--color-primary-container)] cursor-pointer" />
            </div>
          </div>
          {noiValues.length > 0 ? (
            <>
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-3xl font-bold text-[var(--color-on-surface)] tabular-nums">{fmtLarge(latestNOI)}</span>
                <span className={`text-sm font-semibold flex items-center gap-0.5 ${noiChange >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-error)]'}`}>
                  {noiChange >= 0 ? '+' : ''}{noiChange.toFixed(1)}%
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              {loading ? (
                <div className="h-[220px] animate-pulse rounded-lg bg-[var(--color-surface-container-high)]" />
              ) : (
                <NOITrendChart values={noiValues} labels={noiLabels} />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[260px]">
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                {loading ? 'Loading chart data...' : 'Not enough data points to display trend. Add metric snapshots to see the NOI chart.'}
              </p>
            </div>
          )}
        </div>

        {/* Cash Flow Intelligence — 1/3 */}
        <div className="rounded-2xl border border-[var(--color-outline-variant)] p-6 flex flex-col gap-5" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Cash Flow Intelligence</span>
            <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
          </div>

          {hasFinancials ? (
            <>
              <div className="space-y-5 flex-1">
                <CashFlowBar
                  label="Gross Revenue"
                  value={portfolioFinancials.grossRevenue}
                  max={portfolioFinancials.grossRevenue}
                  color="var(--color-primary)"
                />
                <CashFlowBar
                  label="Op. Expenses"
                  value={portfolioFinancials.opExpenses}
                  max={portfolioFinancials.grossRevenue}
                  color="var(--color-secondary)"
                />
                <CashFlowBar
                  label="Debt Service"
                  value={portfolioFinancials.debtService}
                  max={portfolioFinancials.grossRevenue}
                  color="var(--color-tertiary)"
                />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] italic leading-relaxed border-t border-[var(--color-outline-variant)] pt-4">
                &quot;Current liquidity supports {portfolioFinancials.debtService > 0
                  ? (portfolioFinancials.grossRevenue / portfolioFinancials.debtService).toFixed(1)
                  : '∞'}x debt coverage ratio.&quot;
              </p>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-[var(--color-on-surface-variant)] text-center leading-relaxed">
                Add financial data to your projects to see cash flow analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: IRR Scenarios + Expense Donut + Tax Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* IRR Scenarios */}
        <div className="rounded-2xl border border-[var(--color-outline-variant)] p-6" style={{ background: 'var(--bg-surface)' }}>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] block mb-4">IRR Scenarios</span>
          {irrScenarios ? (
            <div className="space-y-3">
              {irrScenarios.map((s) => (
                <IRRScenario
                  key={s.label}
                  label={s.label}
                  irr={s.irr}
                  holdYears={s.holdYears}
                  capExit={s.capExit}
                  active={s.active}
                  assumptions={s.assumptions}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs text-[var(--color-on-surface-variant)] text-center leading-relaxed">
                No cash-on-cash return data available. Add financial details to project(s) to see IRR scenarios.
              </p>
            </div>
          )}
        </div>

        {/* Expense Distribution */}
        <div className="rounded-2xl border border-[var(--color-outline-variant)] p-6" style={{ background: 'var(--bg-surface)' }}>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] block mb-2">Expense Distribution</span>
          {hasFinancials ? (
            <>
              <ExpenseDonut totalOpex={totalOpex} items={expenseItems} colors={expenseColors} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {expenseItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: expenseColors[i % expenseColors.length] }} />
                    <span className="text-xs text-[var(--color-on-surface-variant)]">{item.name} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-[var(--color-on-surface-variant)] text-center leading-relaxed">
                No expense data available yet.
              </p>
            </div>
          )}
        </div>

        {/* Tax Optimization Alerts */}
        <div className="rounded-2xl border border-[var(--color-outline-variant)] p-6 flex flex-col gap-4" style={{ background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm font-semibold text-[var(--color-on-surface)]">Tax Optimization Alerts</span>
          </div>

          <div className="flex-1 space-y-3">
            {taxAlerts.length > 0 ? (
              taxAlerts.map((alert) => (
                <TaxAlert key={alert.title} {...alert} />
              ))
            ) : (
              <div className="flex items-center justify-center py-4">
                <p className="text-xs text-[var(--color-on-surface-variant)]">No tax alerts — add projects with financial data to see optimization insights.</p>
              </div>
            )}
          </div>

          <button
            onClick={handleViewTaxStrategy}
            className="w-full py-2.5 rounded-lg border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] text-xs font-bold uppercase tracking-widest hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-all flex items-center justify-center gap-2"
          >
            View Detailed Tax Strategy
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Period Ledger: transaction-level detail ── */}
      <div
        className="rounded-2xl border border-[var(--color-outline-variant)] p-6"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Period Ledger
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-container)] border border-[var(--color-outline-variant)] rounded px-2 py-0.5 uppercase tracking-widest">
              {period}
            </span>
            {periodLedger && (
              <span className="text-[10px] text-[var(--color-on-surface-variant)]">
                {periodLedger.count} transaction{periodLedger.count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {ledgerLoading && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded-lg bg-[var(--color-surface-container-high)] animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {!ledgerLoading && ledgerError && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
            <AlertCircle className="w-4 h-4 text-[var(--color-error)] flex-shrink-0" />
            <p className="text-sm text-[var(--color-on-surface-variant)]">{ledgerError}</p>
          </div>
        )}

        {/* No period selected (Overall) */}
        {!ledgerLoading && !ledgerError && !reportApiPeriod && (
          <p className="text-sm text-[var(--color-on-surface-variant)] py-4 text-center">
            Select Monthly, Quarterly, or Yearly to see transaction-level detail.
          </p>
        )}

        {/* Empty period — honest empty shape */}
        {!ledgerLoading && !ledgerError && reportApiPeriod && periodLedger && periodLedger.count === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <FileText className="w-8 h-8 text-[var(--color-on-surface-variant)] opacity-40" />
            <p className="text-sm text-[var(--color-on-surface-variant)]">No approved transactions in this period.</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] opacity-70">
              Approved ledger items and legacy cost entries will appear here once added.
            </p>
          </div>
        )}

        {/* Transactions table */}
        {!ledgerLoading && !ledgerError && periodLedger && periodLedger.count > 0 && (
          <>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--color-surface-container-high)]">
                    {['Date', 'Project', 'Category', 'Description', 'Amount'].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left font-bold uppercase tracking-widest whitespace-nowrap text-[var(--color-on-surface-variant)]"
                        style={{ fontSize: '10px' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodLedger.transactions.map((tx, idx) => {
                    const fmtAmt = (v: number) =>
                      v >= 0
                        ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `-$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    const txDate = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <tr
                        key={`${tx.projectId}-${tx.date}-${idx}`}
                        className={`border-b border-[var(--color-outline-variant)] last:border-0 ${idx % 2 === 1 ? 'bg-[var(--color-surface-container-lowest)]' : 'bg-transparent'}`}
                      >
                        <td className="px-3 py-2 tabular-nums text-[var(--color-on-surface-variant)] whitespace-nowrap">{txDate}</td>
                        <td className="px-3 py-2 font-semibold text-[var(--color-on-surface)] max-w-[160px] truncate">{tx.project}</td>
                        <td className="px-3 py-2 text-[var(--color-on-surface-variant)] whitespace-nowrap">{tx.category}</td>
                        <td className="px-3 py-2 text-[var(--color-on-surface)] max-w-[240px] truncate">{tx.label}</td>
                        <td className="px-3 py-2 tabular-nums font-semibold text-right text-[var(--color-on-surface)] whitespace-nowrap">{fmtAmt(tx.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--color-surface-container-low)] border-t-2 border-[var(--color-outline-variant)]">
                    <td colSpan={4} className="px-3 py-2.5 font-bold text-[var(--color-on-surface)] text-[11px] uppercase tracking-widest">
                      Period Total
                      {periodLedger.pages > 1 && (
                        <span className="ml-2 font-normal text-[var(--color-on-surface-variant)] normal-case tracking-normal text-[10px]">
                          (page {periodLedger.page ?? 1} of {periodLedger.pages})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-bold text-right text-[var(--color-on-surface)] whitespace-nowrap">
                      ${periodLedger.totals.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-3">
              Showing {periodLedger.transactions.length} of {periodLedger.count} approved transactions.
              Totals reflect the full period regardless of page.
            </p>
          </>
        )}
      </div>

      {/* ── Tax Intelligence: P&L Reports + Automation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* P&L Report Library — 2/3 */}
        <div
          className="lg:col-span-2 rounded-2xl border border-[var(--color-outline-variant)] p-6"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Tax Intelligence</span>
            <span className="text-[10px] text-[var(--color-primary)] font-semibold border border-[var(--color-outline-variant)] bg-[var(--color-primary-container)] rounded px-2 py-0.5 uppercase tracking-widest">
              IRS-Ready
            </span>
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)] mb-5">Auto-generated reports formatted for Schedule E, K-1, and 1031 filings.</p>

          <TaxReportRow
            title="Quarterly P&L"
            period={`Q1 ${now.getFullYear()}`}
            rows={hasProjects ? `${projects.length} properties` : '0 properties'}
            badge={hasProjects ? 'New' : undefined}
            onPDF={handleQuarterlyPDF}
            onCSV={handleQuarterlyCSV}
          />
          <TaxReportRow
            title="Annual Tax Summary"
            period={`FY ${now.getFullYear() - 2}–${now.getFullYear() - 1}`}
            rows={hasProjects ? `${projects.length} properties` : '0 properties'}
            onPDF={handleAnnualPDF}
            onCSV={handleAnnualCSV}
          />
          <TaxReportRow
            title="Lifetime Ledger"
            period="All time"
            rows="Portfolio-wide"
            onPDF={handleLifetimePDF}
            onCSV={handleLifetimeCSV}
          />
        </div>

        {/* Automation Card — 1/3 */}
        <div
          className="rounded-2xl border border-[var(--color-outline-variant)] p-6 flex flex-col gap-5"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Automation</span>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-on-surface)]">Monthly Auto-Sync</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 leading-relaxed">
                  Reconcile transactions and refresh all P&amp;L reports every 1st of the month.
                </p>
              </div>
              <button
                onClick={() => setAutoSync((v) => !v)}
                className="flex-shrink-0 mt-0.5"
                aria-label="Toggle auto-sync"
              >
                {autoSync
                  ? <ToggleRight className="w-7 h-7 text-[var(--color-primary)]" />
                  : <ToggleLeft  className="w-7 h-7 text-[var(--color-on-surface-variant)]" />}
              </button>
            </div>

            <div className="rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-on-surface-variant)]">Last sync</span>
                <span className="text-[var(--color-on-surface)] font-semibold tabular-nums">
                  {lastSyncStr}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-on-surface-variant)]">Next eligible sync</span>
                <span className={`font-semibold tabular-nums ${effectiveLastSynced ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>
                  {nextSyncStr}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-on-surface-variant)]">Status</span>
                <span className={`font-semibold flex items-center gap-1 ${autoSync ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${autoSync ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-on-surface-variant)]'}`} />
                  {autoSync ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full py-2.5 rounded-lg bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* ═══ NEW TAX REPORTING HUB SECTIONS ═══ */}

      {/* ── Tax Year Selector ── */}
      <div
        className="rounded-2xl border border-[var(--color-outline-variant)] px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Tax Reporting Hub</span>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">Schedule E, depreciation schedules, and capital gains — tax-ready.</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]">
          {[2024, 2025, 2026].map((yr) => (
            <button
              key={yr}
              onClick={() => setTaxYear(yr)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tabular-nums transition-all ${
                taxYear === yr
                  ? 'border border-[var(--color-outline-variant)] text-[var(--color-primary)] bg-[var(--color-primary-container)]'
                  : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* ── Schedule E Preview ── */}
      <div
        className="rounded-2xl border border-[var(--color-outline-variant)] p-6 overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Schedule E Preview — {taxYear}
          </span>
          <span className="text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-container)] border border-[var(--color-outline-variant)] rounded px-2 py-0.5 uppercase tracking-widest">
            IRS Form 1040
          </span>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--color-surface-container-high)]">
                {['Property', 'Gross Rent', 'Advertising', 'Insurance', 'Management', 'Repairs', 'Taxes', 'Utilities', 'Depreciation', 'Total Expenses', 'Net Income'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left font-bold uppercase tracking-widest whitespace-nowrap text-[var(--color-on-surface-variant)]"
                    style={{ fontSize: '10px' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectsWithFinancials.length > 0 ? projectsWithFinancials.map((p, idx) => {
                const f = p.financials;
                const scale = scope === 'My Share' ? ((f.ownershipPercentage ?? 100) / 100) : 1;
                const grossRent = ((f.monthlyGrossRent ?? 0) * 12) * scale;
                const ledgers = ledgerItemsMap[p.id] || [];
                const expenses = getCategorizedExpenses(p, ledgers, taxYear, scale, grossRent);

                const totalExpenses =
                  expenses.advertising +
                  expenses.insurance +
                  expenses.management +
                  expenses.repairs +
                  expenses.taxes +
                  expenses.utilities +
                  expenses.depreciation;
                const netIncome = grossRent - totalExpenses;
                const fmt = (v: number) => v >= 0 ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[var(--color-outline-variant)] last:border-0 ${idx % 2 === 1 ? 'bg-[var(--color-surface-container-lowest)]' : 'bg-transparent'}`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-[var(--color-on-surface)] whitespace-nowrap truncate max-w-[200px] flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenTaxSettings(p)}
                        className="p-1 rounded hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-all flex-shrink-0"
                        title="Edit Tax Allocation Settings"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <span className="truncate">{p.propertyName || p.address || 'Unnamed'}</span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface)]">{fmt(grossRent)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface-variant)]">{fmt(expenses.advertising)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface)]">{fmt(expenses.insurance)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface)]">{fmt(expenses.management)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface)]">{fmt(expenses.repairs)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface)]">{fmt(expenses.taxes)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface)]">{fmt(expenses.utilities)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-primary)]">{fmt(expenses.depreciation)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface)] font-semibold">{fmt(totalExpenses)}</td>
                    <td className={`px-3 py-2.5 tabular-nums font-bold ${netIncome >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-error)]'}`}>{fmt(netIncome)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[var(--color-on-surface-variant)] text-xs">
                    No properties with financial data for {taxYear}.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Footer Totals */}
            {projectsWithFinancials.length > 0 && (
              <tfoot>
                <tr className="bg-[var(--color-surface-container-low)] border-t border-[var(--color-outline-variant)]">
                  {(() => {
                    let tGross = 0, tAdv = 0, tIns = 0, tMgmt = 0, tRepairs = 0, tTaxes = 0, tUtils = 0, tDepr = 0, tTotal = 0, tNet = 0;
                    projectsWithFinancials.forEach((p) => {
                      const f = p.financials;
                      const s = scope === 'My Share' ? ((f.ownershipPercentage ?? 100) / 100) : 1;
                      const gr = ((f.monthlyGrossRent ?? 0) * 12) * s;
                      const ledgers = ledgerItemsMap[p.id] || [];
                      const exp = getCategorizedExpenses(p, ledgers, taxYear, s, gr);
                      const tot = exp.advertising + exp.insurance + exp.management + exp.repairs + exp.taxes + exp.utilities + exp.depreciation;
                      
                      tGross += gr;
                      tAdv += exp.advertising;
                      tIns += exp.insurance;
                      tMgmt += exp.management;
                      tRepairs += exp.repairs;
                      tTaxes += exp.taxes;
                      tUtils += exp.utilities;
                      tDepr += exp.depreciation;
                      tTotal += tot;
                      tNet += gr - tot;
                    });
                    const fmt = (v: number) => v >= 0 ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                    return (
                      <>
                        <td className="px-3 py-2.5 font-bold text-[var(--color-on-surface)] text-[11px] uppercase tracking-widest">Totals</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-on-surface)]">{fmt(tGross)}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[var(--color-on-surface-variant)]">{fmt(tAdv)}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-on-surface)]">{fmt(tIns)}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-on-surface)]">{fmt(tMgmt)}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-on-surface)]">{fmt(tRepairs)}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-on-surface)]">{fmt(tTaxes)}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-on-surface)]">{fmt(tUtils)}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-primary)]">{fmt(tDepr)}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold text-[var(--color-on-surface)]">{fmt(tTotal)}</td>
                        <td className={`px-3 py-2.5 tabular-nums font-bold ${tNet >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-error)]'}`}>{fmt(tNet)}</td>
                      </>
                    );
                  })()}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Schedule E Tax Disclaimer */}
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Estimates Only — Not Tax Advice</p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-relaxed">
              These figures are automated estimates for planning purposes only. Depreciation uses county-assessed land/improvement allocations
              where entered, falling back to an 80/20 building ratio when assessor data is absent. Actual Schedule E figures depend on your
              specific tax elections, cost-segregation studies, and filing status. Consult a qualified tax professional or CPA before filing.
            </p>
          </div>
        </div>
      </div>

      {/* ── Depreciation Schedule + Capital Gains Calculator ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Depreciation Comparison Bento Card */}
        <div
          className="rounded-2xl border border-[var(--color-outline-variant)] p-6"
          style={{ background: 'var(--bg-surface)' }}
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] block mb-1">Depreciation Comparison</span>
          <p className="text-[11px] text-[var(--color-on-surface-variant)] mb-4">27.5-year straight-line residential (assessed land split vs. 80/20 building fallback)</p>
          <ComparativeDepreciationCard projects={projectsWithFinancials} />
        </div>

        {/* Capital Gains Calculator */}
        <div
          className="rounded-2xl border border-[var(--color-outline-variant)] p-6"
          style={{ background: 'var(--bg-surface)' }}
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] block mb-1">Capital Gains Calculator</span>
          <p className="text-[11px] text-[var(--color-on-surface-variant)] mb-4">Estimate tax liability for sold or prospective dispositions</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {([
              { label: 'Purchase Price', key: 'purchasePrice' as const, prefix: '$' },
              { label: 'Sale Price', key: 'salePrice' as const, prefix: '$' },
              { label: 'Improvements', key: 'improvements' as const, prefix: '$' },
              { label: 'Depreciation Recapture', key: 'depreciationRecapture' as const, prefix: '$' },
            ]).map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  {field.label}
                </label>
                <div
                  className="flex items-center rounded-lg overflow-hidden bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]"
                >
                  <span className="pl-2.5 text-xs font-medium text-[var(--color-on-surface-variant)]">{field.prefix}</span>
                  <input
                    type="text"
                    value={capGains[field.key]}
                    onChange={(e) => setCapGains((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder="0"
                    className="flex-1 bg-transparent px-2 py-2 text-xs font-medium outline-none placeholder:text-[var(--color-on-surface-variant)] text-[var(--color-on-surface)] tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Computed Results */}
          {(() => {
            const cp = parseFloat(capGains.purchasePrice.replace(/[^0-9.-]/g, '')) || 0;
            const sp = parseFloat(capGains.salePrice.replace(/[^0-9.-]/g, '')) || 0;
            const imp = parseFloat(capGains.improvements.replace(/[^0-9.-]/g, '')) || 0;
            const dr = parseFloat(capGains.depreciationRecapture.replace(/[^0-9.-]/g, '')) || 0;

            const adjustedBasis = cp + imp - dr;
            const totalGain = sp - adjustedBasis;
            const longTermRate = 0.15; // assumed 15% LTCG
            const depRecaptureRate = 0.25; // 25% depreciation recapture rate
            const depRecaptureTax = dr * depRecaptureRate;
            const capitalGainsTax = Math.max(0, totalGain - dr) * longTermRate;
            const totalTaxEstimate = depRecaptureTax + capitalGainsTax;
            const hasInput = sp > 0;

            const fmt = (v: number) => v >= 0 ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

            return (
              <div className="space-y-2">
                {[
                  { label: 'Adjusted Basis', value: fmt(adjustedBasis), color: 'text-[var(--color-on-surface)]' },
                  { label: 'Total Gain', value: fmt(totalGain), color: totalGain >= 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-error)]' },
                  { label: 'Depreciation Recapture Tax (25%)', value: fmt(depRecaptureTax), color: 'text-amber-500' },
                  { label: 'Capital Gains Tax (15%)', value: fmt(capitalGainsTax), color: 'text-[var(--color-on-surface)]' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-[var(--color-outline-variant)] last:border-0">
                    <span className="text-[11px] text-[var(--color-on-surface-variant)]">{row.label}</span>
                    <span className={`text-xs font-semibold tabular-nums ${row.color}`}>{hasInput ? row.value : '—'}</span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between py-3 mt-2 rounded-lg px-3 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface)]">Estimated Tax</span>
                  <span className={`text-lg font-bold tabular-nums ${hasInput ? (totalTaxEstimate > 0 ? 'text-amber-500' : 'text-[var(--color-primary)]') : 'text-[var(--color-on-surface-variant)]'}`}>
                    {hasInput ? fmt(totalTaxEstimate) : '—'}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1">Assumes 15% LTCG rate + 25% depreciation recapture. Consult a CPA for actual liability.</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Export Buttons ── */}
      <div
        className="rounded-2xl border border-[var(--color-outline-variant)] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: 'var(--bg-surface)' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Export Tax Reports</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              toast('PDF generation via browser print', { icon: '🖨️', style: { background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' } });
              const csv = generatePortfolioCSV(projects, new Date(taxYear, 0, 1), new Date(taxYear, 11, 31));
              downloadPDFViaPrint(`Schedule E — ${taxYear}`, csv);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-outline-variant)] text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            onClick={() => {
              const csv = generatePortfolioCSV(projects, new Date(taxYear, 0, 1), new Date(taxYear, 11, 31));
              downloadCSV(csv, `Schedule_E_${taxYear}.csv`);
              toast.success('CSV downloaded');
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-inverse-primary)] text-[var(--color-on-primary)] text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      {/* ── Footer: Generate Tax-Ready CSV ── */}
      <div
        className="rounded-2xl border border-[var(--color-outline-variant)] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-container)] border border-[var(--color-outline-variant)] flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-on-surface)]">Generate Tax-Ready CSV</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              Formatted for direct import into TurboTax, H&amp;R Block, or professional CPA portals.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handlePreviewData}
            className="px-5 py-2.5 rounded-lg border border-[var(--color-outline-variant)] text-sm font-semibold text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-all"
          >
            Preview Data
          </button>
          <button
            onClick={handleExportForFiling}
            className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-inverse-primary)] text-[var(--color-on-primary)] text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            Export for Filing
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Data Completeness Footer ── */}
      <div className="text-center pb-2">
        <p className="text-[11px] text-[var(--color-on-surface-variant)]">
          Based on {projectsWithFinancials.length} of {projects.length} project{projects.length !== 1 ? 's' : ''} with complete financial data.
          {scope === 'My Share' && ' Metrics scaled by your ownership percentage.'}
        </p>
      </div>

      {/* ── Tax Settings Modal ── */}
      {selectedTaxProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTaxProject(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--bg-surface)] p-6 overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTaxProject(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] block mb-1">Tax Allocation Settings</span>
            <h3 className="text-base font-bold text-[var(--color-on-surface)] truncate mb-4">
              {selectedTaxProject.propertyName || selectedTaxProject.address || 'Property'}
            </h3>

            <div className="space-y-4">
              {/* Land Value */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Assessed Land Value (USD)
                </label>
                <div className="flex items-center rounded-lg bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] transition-all">
                  <span className="pl-3 pr-1 text-xs text-[var(--color-on-surface-variant)] font-medium">$</span>
                  <input
                    type="number"
                    value={landValueInput}
                    onChange={(e) => setLandValueInput(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full bg-transparent px-2 py-2 text-xs text-[var(--color-on-surface)] font-medium outline-none"
                  />
                </div>
              </div>

              {/* Improvement Value */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Assessed Improvement/Building Value (USD)
                </label>
                <div className="flex items-center rounded-lg bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] transition-all">
                  <span className="pl-3 pr-1 text-xs text-[var(--color-on-surface-variant)] font-medium">$</span>
                  <input
                    type="number"
                    value={improvementValueInput}
                    onChange={(e) => setImprovementValueInput(e.target.value)}
                    placeholder="e.g. 200000"
                    className="w-full bg-transparent px-2 py-2 text-xs text-[var(--color-on-surface)] font-medium outline-none"
                  />
                </div>
              </div>

              {/* Annual Advertising Expense */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Annual Advertising Expense (USD) — Schedule E Line 5
                </label>
                <div className="flex items-center rounded-lg bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] transition-all">
                  <span className="pl-3 pr-1 text-xs text-[var(--color-on-surface-variant)] font-medium">$</span>
                  <input
                    type="number"
                    value={advertisingInput}
                    onChange={(e) => setAdvertisingInput(e.target.value)}
                    placeholder="e.g. 600"
                    className="w-full bg-transparent px-2 py-2 text-xs text-[var(--color-on-surface)] font-medium outline-none"
                  />
                </div>
                <p className="text-[10px] text-[var(--color-on-surface-variant)]">Vacancy listings, marketing ads, and tenant-placement fees paid per year.</p>
              </div>

              {/* Placed in Service Date */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Placed In Service Date
                </label>
                <input
                  type="date"
                  value={placedInServiceInput}
                  onChange={(e) => setPlacedInServiceInput(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-xs text-[var(--color-on-surface)] font-medium outline-none focus:border-[var(--color-primary)] transition-all"
                />
              </div>

              {/* Info Alert on ratio */}
              {parseFloat(landValueInput) > 0 && parseFloat(improvementValueInput) > 0 && (
                <div className="p-3 rounded-lg bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] text-[11px] text-[var(--color-on-surface-variant)]">
                  <span className="font-semibold text-[var(--color-on-surface)]">Building Basis Ratio: </span>
                  {Math.round((parseFloat(improvementValueInput) / (parseFloat(landValueInput) + parseFloat(improvementValueInput))) * 100)}% 
                  <span className="ml-2 font-semibold text-[var(--color-on-surface)]">Land Ratio: </span>
                  {Math.round((parseFloat(landValueInput) / (parseFloat(landValueInput) + parseFloat(improvementValueInput))) * 100)}%
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-[var(--color-outline-variant)] pt-4">
              <button
                type="button"
                onClick={() => setSelectedTaxProject(null)}
                className="px-4 py-2 rounded-lg border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingTaxSettings}
                onClick={handleSaveTaxSettings}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-container)] hover:text-[var(--color-primary)] text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingTaxSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSavingTaxSettings ? 'Saving...' : 'Save Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
