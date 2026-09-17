'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  computeMonthlyPayment,
  computeProjectedIrr,
  canonicalDemoDeal,
} from '@paperworking/financial-engine';

// ─────────────────────────────────────────────────────────────
// TYPES & DATA STRUCTURES
// ─────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarBg: string;
  textColor: string;
}

export interface FundTask {
  id: string;
  title: string;
  dueDate: string;
  status: 'Urgent' | 'In Progress' | 'Done' | 'To Do';
  assigneeId: string | null;
}

export interface ShowcaseTab {
  id: string;
  title: string;
  url: string;
  altText: string;
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: 'calculator',
    title: 'Calculator',
    url: 'paperworking.co/deal-calculator',
    altText:
      'PaperWorking Deal Calculator with live calculation engine math: Cap Rate, Cash-on-Cash, and Projected IRR',
  },
  {
    id: 'insights',
    title: 'Insights',
    url: 'paperworking.co/dashboard/insights',
    altText:
      'PaperWorking Portfolio Insights view with live actuals for a 4-property portfolio including NOI, DSCR, and cash flow',
  },
  {
    id: 'fund',
    title: 'Fund',
    url: 'paperworking.co/project/oak-ridge/fund',
    altText:
      'PaperWorking REIL Fund Phase task board with live team assignment for S. Reyes, M. Okafor, and J. Lindqvist',
  },
];

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-sr',
    name: 'S. Reyes',
    role: 'Lead Investor',
    initials: 'SR',
    avatarBg: 'bg-[#00DD94]',
    textColor: 'text-[#0a0a0f]',
  },
  {
    id: 'member-mo',
    name: 'M. Okafor',
    role: 'Acquisitions',
    initials: 'MO',
    avatarBg: 'bg-blue-500',
    textColor: 'text-white',
  },
  {
    id: 'member-jl',
    name: 'J. Lindqvist',
    role: 'Legal & Escrow',
    initials: 'JL',
    avatarBg: 'bg-purple-500',
    textColor: 'text-white',
  },
];

const INITIAL_FUND_TASKS: FundTask[] = [
  {
    id: 'task-1',
    title: 'Track appraisal contingency deadline',
    dueDate: 'Due in 3 days · Nov 4',
    status: 'Urgent',
    assigneeId: 'member-sr',
  },
  {
    id: 'task-2',
    title: 'Confirm earnest money deposit received',
    dueDate: 'Cleared Oct 28 · Escrow receipt in vault',
    status: 'Done',
    assigneeId: 'member-mo',
  },
  {
    id: 'task-3',
    title: 'Upload executed contract to vault',
    dueDate: 'Due Nov 8 · Counter-signed copy',
    status: 'In Progress',
    assigneeId: 'member-jl',
  },
  {
    id: 'task-4',
    title: 'Complete lender document checklist',
    dueDate: 'Due Nov 12 · 7 of 8 items verified',
    status: 'To Do',
    assigneeId: null,
  },
];

// ─────────────────────────────────────────────────────────────
// SUB-VIEW 1: DEAL CALCULATOR (Powered by Real Financial Engine Math)
// ─────────────────────────────────────────────────────────────

interface CalcInputs {
  purchasePrice: number;
  rehabBudget: number;
  grossRentMonthly: number;
  arv: number;
  ltvPct: number;
  interestRatePct: number;
  amortizationYears: number;
  operatingExpensePct: number;
  vacancyRatePct: number;
  holdPeriodYears: number;
  annualAppreciationPct: number;
  sellingCostsPct: number;
}

const DEFAULT_CALC_INPUTS: CalcInputs = {
  purchasePrice: canonicalDemoDeal.purchasePrice,
  rehabBudget: canonicalDemoDeal.rehabBudget,
  grossRentMonthly: canonicalDemoDeal.grossRentMonthly,
  arv: 680000,
  ltvPct: canonicalDemoDeal.targetLtvPct,
  interestRatePct: canonicalDemoDeal.interestRatePct,
  amortizationYears: canonicalDemoDeal.amortizationYears,
  operatingExpensePct: canonicalDemoDeal.operatingExpenseRatioPct,
  vacancyRatePct: canonicalDemoDeal.vacancyRatePct,
  holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
  annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
  sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
};

function ShowcaseDealCalculator() {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_CALC_INPUTS);

  // Exact engine math calculation (Honesty & No-Mock Contract)
  const math = useMemo(() => {
    const {
      purchasePrice,
      rehabBudget,
      arv,
      grossRentMonthly,
      operatingExpensePct,
      vacancyRatePct,
      ltvPct,
      interestRatePct,
      amortizationYears,
      holdPeriodYears,
      annualAppreciationPct,
      sellingCostsPct,
    } = inputs;

    const buyerClosingCosts = Math.round(
      purchasePrice * (canonicalDemoDeal.buyerClosingCostsPct / 100),
    ); // $15,600
    const totalCostBasis = purchasePrice + rehabBudget + buyerClosingCosts; // $595,400
    const loanAmount = Math.round(purchasePrice * (ltvPct / 100)); // $390,000
    const cashRequired = Math.max(0, totalCostBasis - loanAmount); // $205,400

    const annualGrossRent = grossRentMonthly * 12; // $62,400
    const vacancyAmount = Math.round(annualGrossRent * (vacancyRatePct / 100)); // $3,120
    const grossOperatingIncome = annualGrossRent - vacancyAmount; // $59,280
    const operatingExpenses = Math.round(annualGrossRent * (operatingExpensePct / 100)); // $21,142
    const netOperatingIncome = Math.max(0, grossOperatingIncome - operatingExpenses); // $38,138

    // Debt service from canonical amortization formula
    const rawPayment = computeMonthlyPayment(
      loanAmount,
      interestRatePct / 100,
      amortizationYears,
    );
    const monthlyDebtService = Math.round(rawPayment); // $2,465
    const annualDebtService = monthlyDebtService * 12; // $29,580

    const annualCashFlow = netOperatingIncome - annualDebtService; // $8,558
    const capRate = totalCostBasis > 0 ? (netOperatingIncome / totalCostBasis) * 100 : 0; // 6.4%
    const cashOnCash = cashRequired > 0 ? (annualCashFlow / cashRequired) * 100 : 0; // 4.2%

    // True DCF Projected IRR via Canonical Financial Engine (NO-MOCK CONTRACT)
    const projectedIrr =
      cashRequired > 0
        ? computeProjectedIrr({
            totalCashInvested: cashRequired,
            annualPreTaxCashFlow: annualCashFlow,
            purchasePrice,
            loanAmount,
            interestRatePct,
            amortizationYears,
            holdPeriodYears,
            annualAppreciationPct,
            sellingCostsPct,
          })
        : null;

    return {
      buyerClosingCosts,
      totalCostBasis,
      loanAmount,
      cashRequired,
      netOperatingIncome,
      monthlyDebtService,
      annualCashFlow,
      capRate,
      cashOnCash,
      projectedIrr,
    };
  }, [inputs]);

  const presetOffers = [
    { label: '$520k (Base)', price: 520000, rehab: 59800, rent: 5200 },
    { label: '$490k (Offer)', price: 490000, rehab: 59800, rent: 5200 },
    { label: '$540k (Counter)', price: 540000, rehab: 65000, rent: 5400 },
  ];

  return (
    <div className="space-y-3">
      {/* Context Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#00DD94]/10 text-[#00DD94]">
            <span className="material-symbols-outlined text-[15px]">calculate</span>
          </span>
          <div>
            <h3 className="text-[12.5px] font-semibold text-white tracking-tight leading-none">
              Deal Calculator
            </h3>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] text-white/40">
              512 Oak Ridge Ave, Austin, TX 78704 · Acquisition Underwriting
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#00DD94]/25 bg-[#00DD94]/10 px-2 py-0.5 text-[9.5px] font-semibold text-[#00DD94]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00DD94] animate-pulse" />
          Engine Math Live
        </span>
      </div>

      {/* Top 3 Headline Output KPI Cards (Reconciled to Engine Math) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
            Cap Rate on Cost
          </span>
          <span
            data-testid="showcase-calc-cap-rate"
            className="block text-[15px] sm:text-[17px] font-bold text-[#00DD94] tracking-tight"
          >
            {`${math.capRate.toFixed(1)}%`}
          </span>
          <span className="block text-[8.5px] text-white/40">
            {`NOI $${(math.netOperatingIncome / 1000).toFixed(1)}k ÷ Basis`}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
            Cash-on-Cash
          </span>
          <span
            data-testid="showcase-calc-coc"
            className="block text-[15px] sm:text-[17px] font-bold text-[#00DD94] tracking-tight"
          >
            {`${math.cashOnCash.toFixed(1)}%`}
          </span>
          <span className="block text-[8.5px] text-white/40">
            {`$${math.annualCashFlow.toLocaleString()} ÷ Equity`}
          </span>
        </div>

        <div className="rounded-xl border border-[#00DD94]/20 bg-[#00DD94]/[0.04] p-2.5">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-[#00DD94]/80 mb-0.5">
            Projected IRR
          </span>
          <span
            data-testid="showcase-calc-irr"
            className="block text-[15px] sm:text-[17px] font-extrabold text-[#00DD94] tracking-tight"
          >
            {math.projectedIrr !== null ? `${math.projectedIrr.toFixed(1)}%` : 'n/a — adjust assumptions'}
          </span>
          <span className="block text-[8.5px] text-[#00DD94]/70">
            5-Yr DCF Target
          </span>
        </div>
      </div>

      {/* Interactive Scenario Presets */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40">
          Stress Test Inputs:
        </span>
        <div className="flex items-center gap-1.5">
          {presetOffers.map((preset) => {
            const isSelected = inputs.purchasePrice === preset.price;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setInputs((prev) => ({
                    ...prev,
                    purchasePrice: preset.price,
                    rehabBudget: preset.rehab,
                    grossRentMonthly: preset.rent,
                  }))
                }
                className={`px-2 py-0.5 rounded-md text-[9.5px] font-[family-name:var(--font-jetbrains-mono)] transition ${
                  isSelected
                    ? 'bg-[#00DD94]/20 border border-[#00DD94]/50 text-[#00DD94] font-semibold'
                    : 'bg-white/[0.04] border border-white/5 text-white/60 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Underwriting Capital & Debt Summary Grid */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 text-[10.5px] space-y-1.5">
        <div className="flex justify-between items-center text-white/60">
          <span>Purchase Price</span>
          <span className="font-semibold text-white">
            {`$${inputs.purchasePrice.toLocaleString()}`}
          </span>
        </div>
        <div className="flex justify-between items-center text-white/60">
          <span>Rehab Budget</span>
          <span className="font-semibold text-white">
            {`$${inputs.rehabBudget.toLocaleString()}`}
          </span>
        </div>
        <div className="flex justify-between items-center text-white/60">
          <span>Total Cost Basis (incl. closing)</span>
          <span
            data-testid="showcase-calc-basis"
            className="font-semibold text-white font-[family-name:var(--font-jetbrains-mono)]"
          >
            {`$${math.totalCostBasis.toLocaleString()}`}
          </span>
        </div>
        <div className="flex justify-between items-center text-white/60">
          <span>Initial Loan ({inputs.ltvPct}% LTV)</span>
          <span
            data-testid="showcase-calc-loan"
            className="font-semibold text-white font-[family-name:var(--font-jetbrains-mono)]"
          >
            {`$${math.loanAmount.toLocaleString()}`}
          </span>
        </div>
        <div className="flex justify-between items-center text-white/60">
          <span>Cash Required to Close</span>
          <span
            data-testid="showcase-calc-cash-req"
            className="font-semibold text-[#00DD94] font-[family-name:var(--font-jetbrains-mono)]"
          >
            {`$${math.cashRequired.toLocaleString()}`}
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-white/[0.06] pt-1.5 text-white/60">
          <span>Monthly Debt Service (P&amp;I)</span>
          <span
            data-testid="showcase-calc-debt-service"
            className="font-semibold text-white font-[family-name:var(--font-jetbrains-mono)]"
          >
            {`$${math.monthlyDebtService.toLocaleString()}/mo`}
          </span>
        </div>
      </div>

      {/* Bottom Route Link */}
      <div className="flex items-center justify-between pt-1 text-[10px]">
        <span className="text-white/40">
          Confidence Score: <strong className="text-white/70">84%</strong>
        </span>
        <Link
          href="/deal-calculator"
          className="inline-flex items-center gap-1 font-semibold text-[#00DD94] hover:underline"
        >
          Open Deal Calculator
          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-VIEW 2: PORTFOLIO INSIGHTS (Driven by Seeded Demo Dataset)
// ─────────────────────────────────────────────────────────────

function ShowcasePortfolioInsights() {
  const properties = [
    { name: 'Oakridge Quadplex', units: '4', val: '$1.20M', noi: '$84,000', cf: '$24,000' },
    { name: 'Magnolia 6-Plex', units: '6', val: '$1.60M', noi: '$112,000', cf: '$32,000' },
    { name: 'High St Triplex', units: '3', val: '$800k', noi: '$56,000', cf: '$16,000' },
    { name: 'Elmwood Duplex', units: '2', val: '$600k', noi: '$42,000', cf: '$12,000' },
  ];

  return (
    <div className="space-y-3">
      {/* Context Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#00DD94]/10 text-[#00DD94]">
            <span className="material-symbols-outlined text-[15px]">analytics</span>
          </span>
          <div>
            <h3 className="text-[12.5px] font-semibold text-white tracking-tight leading-none">
              Portfolio Insights
            </h3>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] text-white/40">
              Apex Equity Fund I · 4 Properties (15 Units)
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9.5px] font-medium text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00DD94]" />
          Live Actuals
        </span>
      </div>

      {/* Top 5 Headline Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
            NOI (Annual)
          </span>
          <span className="block text-[14px] sm:text-[15px] font-bold text-white tracking-tight">
            $294,000
          </span>
          <span className="block text-[8px] font-medium text-[#00DD94]">
            +4.4% YoY
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
            Market Cap Rate
          </span>
          <span className="block text-[14px] sm:text-[15px] font-bold text-[#00DD94] tracking-tight">
            7.0%
          </span>
          <span className="block text-[8px] text-white/40">
            NOI ÷ $4.20M
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
            DSCR
          </span>
          <span className="block text-[14px] sm:text-[15px] font-bold text-white tracking-tight">
            1.40x
          </span>
          <span className="block text-[8px] text-white/40">
            $210k Debt Serv
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-white/40 mb-0.5">
            Cash-on-Cash
          </span>
          <span className="block text-[14px] sm:text-[15px] font-bold text-[#00DD94] tracking-tight">
            8.0%
          </span>
          <span className="block text-[8px] text-white/40">
            $84k ÷ $1.05M
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#00DD94]/20 bg-[#00DD94]/[0.04] p-2">
          <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-[#00DD94]/80 mb-0.5">
            Projected IRR
          </span>
          <span className="block text-[14px] sm:text-[15px] font-extrabold text-[#00DD94] tracking-tight">
            18.4%
          </span>
          <span className="block text-[8px] text-[#00DD94]/70">
            5-Yr Target
          </span>
        </div>
      </div>

      {/* Financial Engine Strip + Sparkline */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2">
        <div className="grid grid-cols-3 gap-2 text-left">
          <div>
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40">
              Portfolio Value
            </span>
            <span className="text-[11.5px] font-semibold text-white">
              $4,200,000
            </span>
          </div>
          <div>
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40">
              Equity Invested
            </span>
            <span className="text-[11.5px] font-semibold text-white">
              $1,050,000
            </span>
          </div>
          <div>
            <span className="block font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40">
              Net Cash Flow
            </span>
            <span className="text-[11.5px] font-semibold text-[#00DD94]">
              $84,000/yr
            </span>
          </div>
        </div>

        {/* SVG Sparkline */}
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-white/[0.06] pt-1 sm:pt-0 sm:pl-3">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase text-white/40">
            NOI Trend
          </span>
          <svg className="w-20 h-5 shrink-0" viewBox="0 0 100 24" fill="none" aria-hidden="true">
            <path
              d="M 0 18 Q 15 17 30 14 T 60 11 T 85 8 T 100 5 L 100 24 L 0 24 Z"
              fill="url(#showcase-emerald-gradient)"
              opacity="0.3"
            />
            <path
              d="M 0 18 Q 15 17 30 14 T 60 11 T 85 8 T 100 5"
              stroke="#00DD94"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="showcase-emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00DD94" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00DD94" stopOpacity="0.0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Per-Property Breakdown Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]">
        <div className="grid grid-cols-12 bg-white/[0.03] px-3 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
          <span className="col-span-4">Property</span>
          <span className="col-span-2 text-right">Units</span>
          <span className="col-span-2 text-right">Value</span>
          <span className="col-span-2 text-right">NOI</span>
          <span className="col-span-2 text-right">Cash Flow</span>
        </div>
        <div className="divide-y divide-white/[0.04] text-[10px]">
          {properties.map((row) => (
            <div key={row.name} className="grid grid-cols-12 items-center px-3 py-1 text-white/80">
              <span className="col-span-4 font-medium text-white truncate">{row.name}</span>
              <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-white/50">{row.units}</span>
              <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">{row.val}</span>
              <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-[#00DD94]">{row.noi}</span>
              <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">{row.cf}</span>
            </div>
          ))}
          {/* Total Summary Row */}
          <div className="grid grid-cols-12 items-center px-3 py-1 bg-white/[0.025] font-semibold text-white text-[10px]">
            <span className="col-span-4 font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-wider text-[#00DD94]">
              Total (4 Props)
            </span>
            <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">15</span>
            <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)]">$4.20M</span>
            <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-[#00DD94]">$294,000</span>
            <span className="col-span-2 text-right font-[family-name:var(--font-jetbrains-mono)] text-[#00DD94]">$84,000</span>
          </div>
        </div>
      </div>

      {/* Bottom Route Link */}
      <div className="flex items-center justify-between pt-1 text-[10px]">
        <span className="text-white/40">Canonical Financial Ledger</span>
        <Link
          href="/dashboard/insights"
          className="inline-flex items-center gap-1 font-semibold text-[#00DD94] hover:underline"
        >
          View Portfolio Insights
          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-VIEW 3: REIL FUND PHASE (With Live Interactive Task Assignment)
// ─────────────────────────────────────────────────────────────

function ShowcaseFundPhase() {
  const [tasks, setTasks] = useState<FundTask[]>(INITIAL_FUND_TASKS);
  const [activePopoverTaskId, setActivePopoverTaskId] = useState<string | null>(null);

  const handleAssign = (taskId: string, memberId: string | null) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, assigneeId: memberId } : task)),
    );
    setActivePopoverTaskId(null);
  };

  const getAssignee = (memberId: string | null): TeamMember | undefined => {
    return TEAM_MEMBERS.find((m) => m.id === memberId);
  };

  return (
    <div className="space-y-3">
      {/* Context & REIL Stepper */}
      <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
              <span className="material-symbols-outlined text-[15px]">account_balance</span>
            </span>
            <div>
              <h3 className="text-[12.5px] font-semibold text-white tracking-tight leading-none">
                Oakridge Quadplex
              </h3>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9.5px] text-white/40">
                Phase 02: Fund · Target Closing Nov 14
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[9.5px] font-semibold text-sky-300">
            Earnest Money: $25,000 Escrowed
          </span>
        </div>

        {/* 4-Phase REIL Stepper */}
        <div className="grid grid-cols-4 gap-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider">
          <div className="rounded-md border border-white/10 bg-white/[0.02] py-1 text-white/45 flex items-center justify-center gap-0.5">
            <span className="material-symbols-outlined text-[9px] text-emerald-400">check</span>
            01 Acquisition
          </div>
          <div className="rounded-md border border-[#00DD94] bg-[#00DD94]/10 py-1 text-[#00DD94] font-bold shadow-[0_0_10px_rgba(0,221,148,0.2)]">
            02 Fund (Active)
          </div>
          <div className="rounded-md border border-white/5 bg-white/[0.01] py-1 text-white/30">
            03 Hold
          </div>
          <div className="rounded-md border border-white/5 bg-white/[0.01] py-1 text-white/30">
            04 Exit
          </div>
        </div>
      </div>

      {/* Interactive Task Board */}
      <div className="space-y-1.5" data-testid="fund-task-board">
        {tasks.map((task) => {
          const assignee = getAssignee(task.assigneeId);
          const isPopoverOpen = activePopoverTaskId === task.id;

          return (
            <div
              key={task.id}
              data-testid={`fund-task-item-${task.id}`}
              className={`relative rounded-xl border p-2 transition ${
                task.status === 'Urgent'
                  ? 'border-[#00DD94]/40 bg-[#00DD94]/[0.04]'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`material-symbols-outlined text-[15px] shrink-0 ${
                      task.status === 'Done'
                        ? 'text-emerald-400'
                        : task.status === 'Urgent'
                          ? 'text-amber-300'
                          : 'text-white/40'
                    }`}
                  >
                    {task.status === 'Done'
                      ? 'check_circle'
                      : task.status === 'Urgent'
                        ? 'schedule'
                        : 'checklist'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-white truncate">{task.title}</p>
                    <span
                      className={`font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] ${
                        task.status === 'Urgent' ? 'text-amber-300/90 font-medium' : 'text-white/40'
                      }`}
                    >
                      {task.dueDate}
                    </span>
                  </div>
                </div>

                {/* Assignee Button Trigger (Interactive against real store state) */}
                <button
                  type="button"
                  data-testid={`assign-btn-${task.id}`}
                  onClick={() => setActivePopoverTaskId(isPopoverOpen ? null : task.id)}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:border-[#00DD94]/40 px-2 py-0.5 text-[9.5px] font-medium text-white transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00DD94]"
                  aria-expanded={isPopoverOpen}
                  aria-label={`Change assignee for task: ${task.title}`}
                >
                  {assignee ? (
                    <>
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${assignee.avatarBg} text-[7.5px] font-bold ${assignee.textColor}`}
                      >
                        {assignee.initials}
                      </span>
                      <span
                        data-testid={`task-assignee-name-${task.id}`}
                        className="truncate max-w-[70px]"
                      >
                        {assignee.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[12px] text-white/40">
                        person_add
                      </span>
                      <span data-testid={`task-assignee-name-${task.id}`} className="text-white/50">
                        Assign
                      </span>
                    </>
                  )}
                  <span className="material-symbols-outlined text-[11px] text-white/30">
                    expand_more
                  </span>
                </button>
              </div>

              {/* Working Assignee Selection Popover */}
              {isPopoverOpen && (
                <div
                  data-testid={`assignee-popover-${task.id}`}
                  className="absolute right-2 top-full z-20 mt-1 w-56 rounded-xl border border-white/15 bg-[#141624] p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="flex items-center justify-between px-1 text-[8.5px] font-[family-name:var(--font-jetbrains-mono)] uppercase tracking-wider text-white/40">
                    <span>Assign Team Member</span>
                    <button
                      type="button"
                      onClick={() => setActivePopoverTaskId(null)}
                      className="text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {TEAM_MEMBERS.map((member) => {
                      const isAssigned = task.assigneeId === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          data-testid={`assign-member-${task.id}-${member.id}`}
                          onClick={() => handleAssign(task.id, member.id)}
                          className={`w-full flex items-center justify-between p-1.5 rounded-lg text-[10px] transition text-left ${
                            isAssigned
                              ? 'bg-[#00DD94]/15 text-[#00DD94] font-semibold'
                              : 'hover:bg-white/[0.04] text-white/80'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full ${member.avatarBg} text-[7.5px] font-bold ${member.textColor}`}
                            >
                              {member.initials}
                            </span>
                            <div>
                              <p className="font-medium leading-none">{member.name}</p>
                              <span className="text-[8px] text-white/40">{member.role}</span>
                            </div>
                          </div>
                          {isAssigned && (
                            <span className="material-symbols-outlined text-[13px] text-[#00DD94]">
                              check
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {task.assigneeId && (
                      <button
                        type="button"
                        data-testid={`unassign-${task.id}`}
                        onClick={() => handleAssign(task.id, null)}
                        className="w-full text-left p-1.5 rounded-lg text-[9px] text-red-400 hover:bg-red-500/10 transition"
                      >
                        ✕ Remove assignment
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Team Roster Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[9.5px] text-white/50">
        <div className="flex items-center gap-1.5">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-wider text-white/40">
            Active Team:
          </span>
          <div className="flex -space-x-1.5">
            {TEAM_MEMBERS.map((m) => (
              <span
                key={m.id}
                className={`flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[#0c0d15] ${m.avatarBg} text-[7px] font-bold ${m.textColor}`}
                title={`${m.name} (${m.role})`}
              >
                {m.initials}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 font-semibold text-[#00DD94] hover:underline"
        >
          View Fund Phase
          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SHOWCASE COMPONENT: HERO PRODUCT SHOWCASE
// ─────────────────────────────────────────────────────────────

export default function HeroProductShowcase() {
  const [currentTab, setCurrentTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Auto-rotation every 6 seconds with pause-on-hover & reduced motion respect
  useEffect(() => {
    if (isPaused || reducedMotion) return;

    const timer = setInterval(() => {
      setCurrentTab((prev) => (prev + 1) % SHOWCASE_TABS.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused, reducedMotion]);

  const goToTab = useCallback((index: number) => {
    setCurrentTab(index);
  }, []);

  const nextTab = useCallback(() => {
    setCurrentTab((prev) => (prev + 1) % SHOWCASE_TABS.length);
  }, []);

  const prevTab = useCallback(() => {
    setCurrentTab((prev) => (prev - 1 + SHOWCASE_TABS.length) % SHOWCASE_TABS.length);
  }, []);

  // Mobile touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      nextTab();
    } else if (distance < -45) {
      prevTab();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevTab();
    } else if (e.key === 'ArrowRight') {
      nextTab();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="PaperWorking in-browser product showcase"
      data-testid="hero-product-showcase"
      className="relative w-full max-w-[620px] flex flex-col gap-3.5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Screen Reader Announcements */}
      <p className="sr-only">
        Interactive in-browser showcase of the PaperWorking investment platform. Use arrow keys to
        switch views.
      </p>
      <div className="sr-only" aria-live="polite">
        Showing view {currentTab + 1} of {SHOWCASE_TABS.length}: {SHOWCASE_TABS[currentTab].title} —{' '}
        {SHOWCASE_TABS[currentTab].altText}
      </div>

      {/* Browser Chrome Frame */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0f111a] shadow-[0_24px_50px_rgba(0,0,0,0.6)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Window Chrome Bar */}
        <div className="flex items-center justify-between bg-[#141624] px-4 py-2.5 border-b border-white/[0.08] select-none pointer-events-none">
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] opacity-85" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] opacity-85" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f] opacity-85" />
          </div>

          {/* Address Bar with Dynamic URL */}
          <div className="flex h-6 w-3/5 max-w-[280px] items-center justify-center gap-1.5 rounded-lg bg-black/40 px-3 border border-white/[0.08] text-[11px] text-white/50 font-[family-name:var(--font-jetbrains-mono)] truncate">
            <span className="material-symbols-outlined text-[12px] text-[#00DD94]">lock</span>
            <span data-testid="showcase-address-bar" className="truncate text-white/70">
              {SHOWCASE_TABS[currentTab].url}
            </span>
          </div>

          {/* Discreet Sample Data Badge */}
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-wider text-[#00DD94]/80 border border-[#00DD94]/20 rounded bg-[#00DD94]/10 px-1.5 py-0.5 font-medium">
            Demo data
          </span>
        </div>

        {/* Screen Viewport Container */}
        <div className="relative w-full min-h-[440px] sm:min-h-[460px] bg-[#0c0d15] p-3.5 sm:p-4 text-white overflow-hidden">
          {/* Ambient subtle glow */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00DD94]/5 blur-[80px]"
            aria-hidden="true"
          />

          {/* VIEW 0: DEAL CALCULATOR */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 1 of 3: Deal Calculator"
            data-testid="showcase-view-calculator"
            className={`transition-opacity duration-300 ease-in-out ${
              currentTab === 0
                ? 'opacity-100 relative'
                : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            <ShowcaseDealCalculator />
          </div>

          {/* VIEW 1: PORTFOLIO INSIGHTS */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 2 of 3: Portfolio Insights"
            data-testid="showcase-view-insights"
            className={`transition-opacity duration-300 ease-in-out ${
              currentTab === 1
                ? 'opacity-100 relative'
                : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            <ShowcasePortfolioInsights />
          </div>

          {/* VIEW 2: REIL FUND PHASE */}
          <div
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 3 of 3: REIL Fund Phase"
            data-testid="showcase-view-fund"
            className={`transition-opacity duration-300 ease-in-out ${
              currentTab === 2
                ? 'opacity-100 relative'
                : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            <ShowcaseFundPhase />
          </div>
        </div>
      </div>

      {/* Showcase Navigation Bar (Prev / 3 Tabs / Next) */}
      <div className="flex items-center justify-between px-2 text-white/60">
        {/* Previous Button */}
        <button
          type="button"
          onClick={prevTab}
          data-testid="showcase-prev-btn"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DD94]"
          aria-label="Previous view"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        </button>

        {/* 3 Manual Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          {SHOWCASE_TABS.map((tab, index) => {
            const isActive = currentTab === index;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`showcase-tab-${tab.id}`}
                onClick={() => goToTab(index)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DD94] ${
                  isActive
                    ? 'bg-[#00DD94]/15 border border-[#00DD94]/40 text-[#00DD94]'
                    : 'bg-white/[0.03] border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
                aria-label={`Go to ${tab.title} view`}
                aria-selected={isActive}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    isActive ? 'bg-[#00DD94] animate-pulse' : 'bg-white/30'
                  }`}
                  aria-hidden="true"
                />
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={nextTab}
          data-testid="showcase-next-btn"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DD94]"
          aria-label="Next view"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
