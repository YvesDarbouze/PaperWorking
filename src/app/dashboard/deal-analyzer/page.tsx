'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   Deal Analyzer — Standalone Underwriting Tool
   
   Analyze a potential deal WITHOUT creating a project.
   Quick Entry → Instant 10-Metric Analysis → Verdict → Save as Project
   ═══════════════════════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────────────────

interface DealInputs {
  propertyAddress: string;
  purchasePrice: string;
  downPaymentPercent: string;
  grossMonthlyRent: string;
  monthlyOperatingExpenses: string;
  loanInterestRate: string;
  loanTermYears: string;
}

interface MetricResult {
  label: string;
  value: string;
  zone: 'excellent' | 'good' | 'fair' | 'poor' | 'neutral';
  description: string;
}

type Verdict = 'STRONG BUY' | 'BUY' | 'HOLD' | 'PASS';

// ── Constants ──────────────────────────────────────────────────

const ASSUMED_OCCUPANCY = 92;
const ASSUMED_APPRECIATION = 3;
const IRR_HOLD_YEARS = 5;
const SELLING_COSTS_PERCENT = 8;

const ZONE_STYLES: Record<MetricResult['zone'], { bg: string; text: string; border: string }> = {
  excellent: { bg: 'rgba(69, 73, 85, 0.12)', text: '#454955', border: 'rgba(69, 73, 85, 0.3)' },
  good:      { bg: 'rgba(69, 73, 85, 0.06)', text: '#5eead4', border: 'rgba(69, 73, 85, 0.15)' },
  fair:      { bg: 'rgba(251, 146, 60, 0.08)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.2)' },
  poor:      { bg: 'rgba(240, 101, 67, 0.08)', text: '#F06543', border: 'rgba(240, 101, 67, 0.2)' },
  neutral:   { bg: 'rgba(255, 255, 255, 0.03)', text: 'rgba(253, 255, 252, 0.5)', border: 'rgba(255, 255, 255, 0.06)' },
};

const VERDICT_STYLES: Record<Verdict, { bg: string; text: string; border: string; glow: string }> = {
  'STRONG BUY': { bg: 'rgba(69, 73, 85, 0.1)', text: '#454955', border: 'rgba(69, 73, 85, 0.4)', glow: '0 0 30px rgba(69, 73, 85, 0.2)' },
  'BUY':        { bg: 'rgba(94, 234, 212, 0.06)', text: '#5eead4', border: 'rgba(94, 234, 212, 0.25)', glow: '0 0 20px rgba(94, 234, 212, 0.1)' },
  'HOLD':       { bg: 'rgba(251, 146, 60, 0.06)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.25)', glow: '0 0 20px rgba(251, 146, 60, 0.1)' },
  'PASS':       { bg: 'rgba(240, 101, 67, 0.06)', text: '#F06543', border: 'rgba(240, 101, 67, 0.25)', glow: '0 0 20px rgba(240, 101, 67, 0.1)' },
};

// ── Helper: Parse number from string ───────────────────────────

function num(s: string): number {
  const v = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return isNaN(v) ? 0 : v;
}

// ── Helper: Format currency ────────────────────────────────────

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

// ── IRR Solver (Newton-Raphson, inline) ────────────────────────

function solveIRR(cashFlows: number[]): number | null {
  if (cashFlows.length < 2) return null;
  let rate = 0.10;
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const pv = cashFlows[t] / Math.pow(1 + rate, t);
      npv += pv;
      if (t > 0) dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dNpv) < 1e-12) return null;
    const newRate = rate - npv / dNpv;
    if (Math.abs(newRate - rate) < 1e-7) return Math.round(newRate * 10000) / 10000;
    rate = newRate;
    if (rate < -0.99 || rate > 10) return null;
  }
  return null;
}

// ── GlassInput Component ───────────────────────────────────────

function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(253, 255, 252, 0.35)' }}
      >
        {label}
      </label>
      <div
        className="flex items-center rounded-lg overflow-hidden transition-all focus-within:border-[#454955]/50"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {prefix && (
          <span
            className="pl-3 pr-1 text-sm font-medium select-none"
            style={{ color: 'rgba(253, 255, 252, 0.4)' }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm font-medium outline-none placeholder:text-slate-600"
          style={{ color: 'rgba(253, 255, 252, 0.9)' }}
        />
        {suffix && (
          <span
            className="pr-3 pl-1 text-sm font-medium select-none"
            style={{ color: 'rgba(253, 255, 252, 0.4)' }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ── MetricCard Component ───────────────────────────────────────

function MetricCard({ metric }: { metric: MetricResult }) {
  const style = ZONE_STYLES[metric.zone];
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1.5 transition-all hover:scale-[1.02]"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'rgba(253, 255, 252, 0.4)' }}
      >
        {metric.label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span
          className="text-xl font-bold tabular-nums leading-none"
          style={{ color: style.text }}
        >
          {metric.value}
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
          style={{
            background: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`,
          }}
        >
          {metric.zone}
        </span>
      </div>
      <span className="text-[11px] leading-tight" style={{ color: 'rgba(253, 255, 252, 0.35)' }}>
        {metric.description}
      </span>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────

export default function DealAnalyzerPage() {
  const [inputs, setInputs] = useState<DealInputs>({
    propertyAddress: '',
    purchasePrice: '',
    downPaymentPercent: '25',
    grossMonthlyRent: '',
    monthlyOperatingExpenses: '',
    loanInterestRate: '7.0',
    loanTermYears: '30',
  });

  const update = (field: keyof DealInputs) => (val: string) =>
    setInputs((prev) => ({ ...prev, [field]: val }));

  // ── Compute all 10 metrics ──

  const { metrics, verdict, hasInputs: isReady } = useMemo(() => {
    const pp = num(inputs.purchasePrice);
    const dpPct = num(inputs.downPaymentPercent);
    const gmr = num(inputs.grossMonthlyRent);
    const moe = num(inputs.monthlyOperatingExpenses);
    const ir = num(inputs.loanInterestRate);
    const lt = num(inputs.loanTermYears);

    const hasInputs = pp > 0 && gmr > 0;
    if (!hasInputs) {
      return { metrics: [] as MetricResult[], verdict: null, hasInputs: false };
    }

    // Derived values
    const downPayment = pp * (dpPct / 100);
    const loanAmount = pp - downPayment;
    const annualGrossRent = gmr * 12;
    const annualOpEx = moe * 12;
    const effectiveGrossIncome = annualGrossRent * (ASSUMED_OCCUPANCY / 100);

    // 1. NOI = Effective Gross Income - Operating Expenses
    const noi = effectiveGrossIncome - annualOpEx;

    // 2. Annual Debt Service (standard amortization)
    let annualDebtService = 0;
    if (loanAmount > 0 && ir > 0 && lt > 0) {
      const monthlyRate = ir / 100 / 12;
      const totalPayments = lt * 12;
      const pow = Math.pow(1 + monthlyRate, totalPayments);
      const monthlyPayment = loanAmount * (monthlyRate * pow) / (pow - 1);
      annualDebtService = monthlyPayment * 12;
    } else if (loanAmount > 0 && lt > 0) {
      annualDebtService = (loanAmount / (lt * 12)) * 12;
    }

    // 3. Cash Flow
    const annualCashFlow = noi - annualDebtService;
    const monthlyCashFlow = annualCashFlow / 12;

    // 4. Cap Rate = NOI / Purchase Price × 100
    const capRate = pp > 0 ? (noi / pp) * 100 : 0;

    // 5. Cash-on-Cash = Annual Cash Flow / Total Cash Invested × 100
    const totalCashInvested = downPayment;
    const coc = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

    // 6. GRM = Purchase Price / Gross Annual Rent
    const grm = annualGrossRent > 0 ? pp / annualGrossRent : 0;

    // 7. DSCR = NOI / Annual Debt Service
    const dscr = annualDebtService > 0 ? noi / annualDebtService : (noi > 0 ? Infinity : 0);

    // 8. IRR (5yr projected)
    const futureValue = pp * Math.pow(1 + ASSUMED_APPRECIATION / 100, IRR_HOLD_YEARS);
    let remainingBalance = loanAmount;
    if (ir > 0 && lt > 0 && loanAmount > 0) {
      const mr = ir / 100 / 12;
      const tp = lt * 12;
      const mp = loanAmount * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1);
      const pm = IRR_HOLD_YEARS * 12;
      remainingBalance = loanAmount * Math.pow(1 + mr, pm) - mp * ((Math.pow(1 + mr, pm) - 1) / mr);
      remainingBalance = Math.max(0, remainingBalance);
    }
    const netSaleProceeds = futureValue - remainingBalance - futureValue * (SELLING_COSTS_PERCENT / 100);
    const irrFlows = [-totalCashInvested];
    for (let y = 1; y <= IRR_HOLD_YEARS; y++) {
      irrFlows.push(y === IRR_HOLD_YEARS ? annualCashFlow + netSaleProceeds : annualCashFlow);
    }
    const irr = solveIRR(irrFlows);

    // 9. OER = Operating Expenses / Gross Rental Income × 100
    const oer = annualGrossRent > 0 ? (annualOpEx / annualGrossRent) * 100 : 0;

    // 10. Occupancy (assumed) & Appreciation (assumed)
    // Already constants

    // ── Zone Classification ──

    function capRateZone(v: number): MetricResult['zone'] {
      if (v > 8) return 'excellent';
      if (v > 5) return 'good';
      if (v > 3) return 'fair';
      return 'poor';
    }
    function cocZone(v: number): MetricResult['zone'] {
      if (v > 12) return 'excellent';
      if (v > 8) return 'good';
      if (v > 4) return 'fair';
      return 'poor';
    }
    function dscrZone(v: number): MetricResult['zone'] {
      if (v >= 1.5) return 'excellent';
      if (v >= 1.2) return 'good';
      if (v >= 1.0) return 'fair';
      return 'poor';
    }
    function grmZone(v: number): MetricResult['zone'] {
      if (v > 0 && v <= 8) return 'excellent';
      if (v <= 12) return 'good';
      if (v <= 15) return 'fair';
      return 'poor';
    }
    function cashFlowZone(v: number): MetricResult['zone'] {
      if (v > 500) return 'excellent';
      if (v > 200) return 'good';
      if (v > 0) return 'fair';
      return 'poor';
    }
    function irrZone(v: number | null): MetricResult['zone'] {
      if (v === null) return 'neutral';
      const pct = v * 100;
      if (pct > 15) return 'excellent';
      if (pct > 10) return 'good';
      if (pct > 5) return 'fair';
      return 'poor';
    }
    function oerZone(v: number): MetricResult['zone'] {
      if (v < 35) return 'excellent';
      if (v < 50) return 'good';
      if (v < 65) return 'fair';
      return 'poor';
    }
    function noiZone(v: number): MetricResult['zone'] {
      if (v > 30000) return 'excellent';
      if (v > 15000) return 'good';
      if (v > 0) return 'fair';
      return 'poor';
    }

    const results: MetricResult[] = [
      {
        label: 'Net Operating Income',
        value: fmtCurrency(noi),
        zone: noiZone(noi),
        description: 'Annual income after operating expenses',
      },
      {
        label: 'Monthly Cash Flow',
        value: `$${monthlyCashFlow.toFixed(0)}`,
        zone: cashFlowZone(monthlyCashFlow),
        description: 'Net monthly profit after all costs',
      },
      {
        label: 'Cap Rate',
        value: `${capRate.toFixed(2)}%`,
        zone: capRateZone(capRate),
        description: 'Return on property value',
      },
      {
        label: 'Cash-on-Cash',
        value: `${coc.toFixed(2)}%`,
        zone: cocZone(coc),
        description: 'Return on cash invested',
      },
      {
        label: 'GRM',
        value: grm > 0 ? grm.toFixed(1) : '—',
        zone: grmZone(grm),
        description: 'Price ÷ annual rent ratio',
      },
      {
        label: 'DSCR',
        value: dscr === Infinity ? '∞' : `${dscr.toFixed(2)}x`,
        zone: dscrZone(dscr === Infinity ? 99 : dscr),
        description: 'Debt service coverage ratio',
      },
      {
        label: 'IRR (5yr)',
        value: irr !== null ? `${(irr * 100).toFixed(1)}%` : '—',
        zone: irrZone(irr),
        description: `${IRR_HOLD_YEARS}-year projected internal rate of return`,
      },
      {
        label: 'Occupancy',
        value: `${ASSUMED_OCCUPANCY}%`,
        zone: 'good',
        description: 'Assumed occupancy rate',
      },
      {
        label: 'OER',
        value: `${oer.toFixed(1)}%`,
        zone: oerZone(oer),
        description: 'Operating expense ratio',
      },
      {
        label: 'Appreciation',
        value: `+${ASSUMED_APPRECIATION}%`,
        zone: 'good',
        description: 'Assumed annual appreciation',
      },
    ];

    // ── Verdict Logic ──
    let v: Verdict;
    if (capRate > 5 && (dscr === Infinity || dscr > 1.2) && coc > 8) {
      v = 'STRONG BUY';
    } else if (capRate > 4 && (dscr === Infinity || dscr > 1.1) && coc > 5) {
      v = 'BUY';
    } else if (capRate > 3 && (dscr === Infinity || dscr >= 1.0) && coc > 0) {
      v = 'HOLD';
    } else {
      v = 'PASS';
    }

    return { metrics: results, verdict: v, hasInputs: true };
  }, [inputs]);

  // ── Build query string for Save as Project ──

  const saveAsProjectHref = useMemo(() => {
    const params = new URLSearchParams();
    if (inputs.propertyAddress) params.set('address', inputs.propertyAddress);
    if (inputs.purchasePrice) params.set('purchasePrice', inputs.purchasePrice);
    if (inputs.grossMonthlyRent) params.set('monthlyRent', inputs.grossMonthlyRent);
    if (inputs.downPaymentPercent) params.set('downPayment', inputs.downPaymentPercent);
    if (inputs.loanInterestRate) params.set('interestRate', inputs.loanInterestRate);
    if (inputs.loanTermYears) params.set('loanTerm', inputs.loanTermYears);
    const qs = params.toString();
    return `/dashboard/projects/new${qs ? `?${qs}` : ''}`;
  }, [inputs]);

  return (
    <div
      className="min-h-full px-6 lg:px-8 py-8 space-y-6"
      style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)' }}
    >
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgba(253, 255, 252, 0.95)' }}>
          Deal Analyzer
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(253, 255, 252, 0.45)' }}>
          Underwrite a potential deal instantly — no project needed.
        </p>
      </div>

      {/* ── Section 1: Quick Entry Form ── */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <span
          className="block text-[10px] font-bold uppercase tracking-widest mb-5"
          style={{ color: 'rgba(253, 255, 252, 0.35)' }}
        >
          Quick Entry
        </span>

        {/* Property Address — Full Width */}
        <div className="mb-4">
          <GlassInput
            label="Property Address"
            value={inputs.propertyAddress}
            onChange={update('propertyAddress')}
            placeholder="123 Main St, Austin, TX 78701"
          />
        </div>

        {/* 3-column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <GlassInput
            label="Purchase Price"
            value={inputs.purchasePrice}
            onChange={update('purchasePrice')}
            placeholder="350,000"
            prefix="$"
            type="text"
          />
          <GlassInput
            label="Down Payment"
            value={inputs.downPaymentPercent}
            onChange={update('downPaymentPercent')}
            placeholder="25"
            suffix="%"
            type="text"
          />
          <GlassInput
            label="Gross Monthly Rent"
            value={inputs.grossMonthlyRent}
            onChange={update('grossMonthlyRent')}
            placeholder="2,800"
            prefix="$"
            type="text"
          />
          <GlassInput
            label="Monthly Operating Expenses"
            value={inputs.monthlyOperatingExpenses}
            onChange={update('monthlyOperatingExpenses')}
            placeholder="800"
            prefix="$"
            type="text"
          />
          <GlassInput
            label="Loan Interest Rate"
            value={inputs.loanInterestRate}
            onChange={update('loanInterestRate')}
            placeholder="7.0"
            suffix="%"
            type="text"
          />
          <GlassInput
            label="Loan Term"
            value={inputs.loanTermYears}
            onChange={update('loanTermYears')}
            placeholder="30"
            suffix="years"
            type="text"
          />
        </div>
      </div>

      {/* ── Section 2: Instant 10-Metric Analysis ── */}
      {isReady && (
        <div
          className="rounded-xl p-6"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span
            className="block text-[10px] font-bold uppercase tracking-widest mb-5"
            style={{ color: 'rgba(253, 255, 252, 0.35)' }}
          >
            Instant Analysis — 10 Key Metrics
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {metrics.map((m) => (
              <MetricCard key={m.label} metric={m} />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 3: Verdict Strip ── */}
      {isReady && verdict && (
        <div
          className="rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            background: VERDICT_STYLES[verdict].bg,
            border: `1px solid ${VERDICT_STYLES[verdict].border}`,
            boxShadow: VERDICT_STYLES[verdict].glow,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: VERDICT_STYLES[verdict].bg,
                border: `1px solid ${VERDICT_STYLES[verdict].border}`,
              }}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: VERDICT_STYLES[verdict].text }}>
                {verdict === 'STRONG BUY' || verdict === 'BUY'
                  ? 'trending_up'
                  : verdict === 'HOLD'
                    ? 'trending_flat'
                    : 'trending_down'}
              </span>
            </div>
            <div>
              <p
                className="text-xl font-bold tracking-wide"
                style={{ color: VERDICT_STYLES[verdict].text }}
              >
                {verdict}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(253, 255, 252, 0.45)' }}>
                {verdict === 'STRONG BUY'
                  ? 'Cap Rate > 5%, DSCR > 1.2x, CoC > 8% — strong fundamentals'
                  : verdict === 'BUY'
                    ? 'Solid metrics — deal meets investment criteria'
                    : verdict === 'HOLD'
                      ? 'Marginal returns — proceed with caution'
                      : 'Metrics below thresholds — consider renegotiating'}
              </p>
            </div>
          </div>

          {/* Verdict Summary */}
          <div className="flex items-center gap-3 text-xs font-semibold tabular-nums" style={{ color: 'rgba(253, 255, 252, 0.55)' }}>
            <span>
              Cap {metrics.find((m) => m.label === 'Cap Rate')?.value ?? '—'}
            </span>
            <span style={{ color: 'rgba(253, 255, 252, 0.2)' }}>·</span>
            <span>
              DSCR {metrics.find((m) => m.label === 'DSCR')?.value ?? '—'}
            </span>
            <span style={{ color: 'rgba(253, 255, 252, 0.2)' }}>·</span>
            <span>
              CoC {metrics.find((m) => m.label === 'Cash-on-Cash')?.value ?? '—'}
            </span>
          </div>
        </div>
      )}

      {/* ── Section 4: Save as Project CTA ── */}
      {isReady && (
        <div
          className="rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgba(253, 255, 252, 0.9)' }}>
              Ready to track this deal?
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(253, 255, 252, 0.4)' }}>
              Create a full project to track acquisition, rehab, and exit.
            </p>
          </div>
          <Link
            href={saveAsProjectHref}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:scale-105"
            style={{
              background: 'var(--color-primary-container)',
              color: 'var(--color-on-primary)',
              boxShadow: '0 0 20px -5px rgba(69, 73, 85, 0.4)',
            }}
          >
            Save as Project
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* ── Empty State ── */}
      {!isReady && (
        <div
          className="rounded-xl px-6 py-16 flex flex-col items-center justify-center gap-4 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <span
            className="material-symbols-outlined text-4xl"
            style={{ color: 'rgba(253, 255, 252, 0.15)' }}
          >
            calculate
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgba(253, 255, 252, 0.5)' }}>
              Enter a purchase price and monthly rent to begin analysis
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(253, 255, 252, 0.3)' }}>
              All 10 key investment metrics will compute instantly as you type.
            </p>
          </div>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="text-center text-[11px] pb-2" style={{ color: 'rgba(253, 255, 252, 0.3)' }}>
        Assumptions: {ASSUMED_OCCUPANCY}% occupancy, {ASSUMED_APPRECIATION}% annual appreciation, {SELLING_COSTS_PERCENT}% selling costs, {IRR_HOLD_YEARS}-year hold period for IRR.
        This tool is for estimation only — consult a CPA for tax advice.
      </p>
    </div>
  );
}
