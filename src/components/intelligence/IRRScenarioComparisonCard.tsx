'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Layers, ArrowRight, Sparkles, Award, AlertTriangle } from 'lucide-react';
import { calculateAmortization } from '@/lib/utils/reiCalculators';

/* ═══════════════════════════════════════════════════════════════
   IRR SCENARIO COMPARISON CARD
   Computes IRR across multiple hold-period scenarios (3/5/7/10yr)
   with Base / Optimistic / Pessimistic variants.
   Displays ranked horizontal bars + signal badges + best scenario.
   ═══════════════════════════════════════════════════════════════ */

interface ScenarioInputs {
  totalCashInvested: number;
  annualCashFlow: number;
  purchasePrice: number;
  loanAmount: number;
  loanRate: number;
  loanTermYears: number;
  sellingCostsPercent?: number;
}

interface ScenarioVariant {
  label: string;
  appreciationPercent: number;
  cashFlowMultiplier: number;
  color: string;
}

interface IRRScenarioComparisonCardProps {
  inputs: ScenarioInputs;
  holdPeriods?: number[];
  hurdleRate?: number;
  className?: string;
}

const DEFAULT_HOLDS = [3, 5, 7, 10];

const VARIANTS: ScenarioVariant[] = [
  { label: 'Bear', appreciationPercent: 1.5, cashFlowMultiplier: 0.8, color: '#F06543' },
  { label: 'Base', appreciationPercent: 3.0, cashFlowMultiplier: 1.0, color: '#a1a1aa' },
  { label: 'Bull', appreciationPercent: 5.0, cashFlowMultiplier: 1.2, color: '#454955' },
];

/* ── Compute all scenarios ── */
interface ScenarioResult {
  holdYears: number;
  variant: string;
  irr: number | null;
  irrPct: string;
  color: string;
  cashFlows: number[];
  equityMultiple: number;
}

function localBuildIRRCashFlows(
  totalCashInvested: number,
  annualCashFlow: number,
  holdYears: number,
  purchasePrice: number,
  annualAppreciationPercent: number,
  loanAmount: number,
  loanInterestRate: number,
  loanTermYears: number,
  sellingCostsPercent = 8
): number[] {
  if (holdYears <= 0 || totalCashInvested <= 0) return [];
  const flows: number[] = [-totalCashInvested];
  const futureValue = purchasePrice * Math.pow(1 + annualAppreciationPercent / 100, holdYears);
  let remainingBalance = loanAmount;
  const monthlyRate = (loanInterestRate / 100) / 12;
  const totalPayments = loanTermYears * 12;

  if (loanInterestRate > 0 && totalPayments > 0 && loanAmount > 0) {
    const amort = calculateAmortization(loanAmount, loanInterestRate, totalPayments);
    const paymentsMade = Math.min(holdYears * 12, totalPayments);
    const scheduleItem = amort.schedule[paymentsMade - 1];
    remainingBalance = scheduleItem ? scheduleItem.remainingBalance : 0;
  }

  const sellingCosts = futureValue * (sellingCostsPercent / 100);
  const netSaleProceeds = futureValue - remainingBalance - sellingCosts;

  for (let y = 1; y <= holdYears; y++) {
    if (y === holdYears) {
      flows.push(annualCashFlow + netSaleProceeds);
    } else {
      flows.push(annualCashFlow);
    }
  }
  return flows;
}

function localComputeIRR(cashFlows: number[], maxIterations = 100, tolerance = 1e-7): number | null {
  if (cashFlows.length < 2) return null;
  let rate = 0.10;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const pv = cashFlows[t] / Math.pow(1 + rate, t);
      npv += pv;
      if (t > 0) {
        dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }
    if (Math.abs(dNpv) < 1e-12) break;
    const newRate = rate - npv / dNpv;
    if (Math.abs(newRate - rate) < tolerance) {
      return Math.round(newRate * 10000) / 10000;
    }
    rate = newRate;
    if (rate < -0.99 || rate > 10) break;
  }

  let low = -0.99;
  let high = 10.0;
  const getNpv = (r: number) => {
    let sum = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      sum += cashFlows[t] / Math.pow(1 + r, t);
    }
    return sum;
  };

  let bracketFound = false;
  let prevVal = getNpv(low);
  const steps = 100;
  const stepSize = (high - low) / steps;

  for (let step = 1; step <= steps; step++) {
    const r = low + step * stepSize;
    const val = getNpv(r);
    if (prevVal * val <= 0) {
      low = r - stepSize;
      high = r;
      bracketFound = true;
      break;
    }
    prevVal = val;
  }

  if (!bracketFound) {
    low = -0.99;
    high = 100.0;
    const widerSteps = 200;
    const widerStepSize = (high - low) / widerSteps;
    prevVal = getNpv(low);
    for (let step = 1; step <= widerSteps; step++) {
      const r = low + step * widerStepSize;
      const val = getNpv(r);
      if (prevVal * val <= 0) {
        low = r - widerStepSize;
        high = r;
        bracketFound = true;
        break;
      }
      prevVal = val;
    }
  }

  if (bracketFound) {
    for (let j = 0; j < 100; j++) {
      const mid = (low + high) / 2;
      const npvMid = getNpv(mid);
      if (Math.abs(npvMid) < tolerance || (high - low) < tolerance) {
        return Math.round(mid * 10000) / 10000;
      }
      if (getNpv(low) * npvMid < 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
  }
  return null;
}

function computeScenarios(inputs: ScenarioInputs, holds: number[]): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  for (const holdYears of holds) {
    for (const variant of VARIANTS) {
      const adjustedCF = inputs.annualCashFlow * variant.cashFlowMultiplier;
      const cashFlows = localBuildIRRCashFlows(
        inputs.totalCashInvested,
        adjustedCF,
        holdYears,
        inputs.purchasePrice,
        variant.appreciationPercent,
        inputs.loanAmount,
        inputs.loanRate,
        inputs.loanTermYears,
        inputs.sellingCostsPercent ?? 8
      );
      const irr = localComputeIRR(cashFlows);
      const totalInflows = cashFlows.slice(1).reduce((s, v) => s + v, 0);
      const equityMultiple = inputs.totalCashInvested > 0 ? totalInflows / inputs.totalCashInvested : 0;

      results.push({
        holdYears,
        variant: variant.label,
        irr,
        irrPct: irr !== null ? `${(irr * 100).toFixed(1)}%` : 'N/A',
        color: variant.color,
        cashFlows,
        equityMultiple,
      });
    }
  }

  return results;
}

/* ── Signal Badge ── */
function SignalBadge({ irr, hurdleRate }: { irr: number | null; hurdleRate: number }) {
  if (irr === null) return <span className="text-[8px] font-bold text-slate-600 uppercase">N/A</span>;

  const signals = [
    { min: hurdleRate + 0.05, label: 'Strong', color: '#3f7d20' },
    { min: hurdleRate, label: 'Pass', color: '#454955' },
    { min: 0, label: 'Weak', color: '#F59E0B' },
    { min: -Infinity, label: 'Loss', color: '#F06543' },
  ];

  const signal = signals.find((s) => irr >= s.min) ?? signals[signals.length - 1];

  return (
    <span
      className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
      style={{ color: signal.color, backgroundColor: `${signal.color}15`, border: `1px solid ${signal.color}25` }}
    >
      {signal.label}
    </span>
  );
}

/* ── IRR Bar ── */
function IRRBar({ irr, maxIrr, color }: { irr: number | null; maxIrr: number; color: string }) {
  const widthPct = irr !== null && maxIrr > 0 ? Math.min(Math.max((irr / maxIrr) * 100, 0), 100) : 0;
  return (
    <div className="h-2.5 rounded-full overflow-hidden bg-white/[0.04] flex-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${widthPct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function IRRScenarioComparisonCard({
  inputs,
  holdPeriods = DEFAULT_HOLDS,
  hurdleRate = 0.12,
  className = '',
}: IRRScenarioComparisonCardProps) {
  const scenarios = useMemo(() => computeScenarios(inputs, holdPeriods), [inputs, holdPeriods]);

  const maxIrr = useMemo(() => {
    const irrs = scenarios.map((s) => s.irr).filter((v): v is number => v !== null);
    return irrs.length > 0 ? Math.max(...irrs) : 0.3;
  }, [scenarios]);

  /* ── Best scenario ── */
  const bestScenario = useMemo(() => {
    const valid = scenarios.filter((s) => s.irr !== null);
    if (valid.length === 0) return null;
    return valid.reduce((best, s) => (s.irr! > best.irr! ? s : best));
  }, [scenarios]);

  /* ── Group by hold period ── */
  const grouped = useMemo(() => {
    const map = new Map<number, ScenarioResult[]>();
    for (const s of scenarios) {
      const existing = map.get(s.holdYears) ?? [];
      existing.push(s);
      map.set(s.holdYears, existing);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [scenarios]);

  /* ── Hurdle pass rate ── */
  const passRate = useMemo(() => {
    const valid = scenarios.filter((s) => s.irr !== null);
    const passing = valid.filter((s) => s.irr! >= hurdleRate);
    return valid.length > 0 ? (passing.length / valid.length) * 100 : 0;
  }, [scenarios, hurdleRate]);

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#454955]/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#454955]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Scenario Comparison</h3>
            <p className="text-[10px] text-[#6B6870] uppercase tracking-widest font-bold">IRR Intelligence</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6870]">Hurdle Rate</p>
          <p className="text-sm font-bold text-[#6E7480] tabular-nums">{(hurdleRate * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* ── Best Scenario Highlight ── */}
      {bestScenario && (
        <div className="rounded-lg border border-[#454955]/20 bg-[#454955]/[0.06] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#454955]" />
            <div>
              <p className="text-xs font-bold text-[#454955]">Best Scenario</p>
              <p className="text-[10px] text-[#6B6870]">{bestScenario.holdYears}-year {bestScenario.variant}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-[#454955]">{bestScenario.irrPct}</span>
            <span className="text-[10px] text-[#6B6870]">{bestScenario.equityMultiple.toFixed(1)}x</span>
          </div>
        </div>
      )}

      {/* ── Scenario Groups ── */}
      <div className="space-y-4">
        {grouped.map(([holdYears, variants]) => (
          <div key={holdYears} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {holdYears}-Year Hold
              </span>
            </div>

            {variants.map((s) => (
              <div key={`${s.holdYears}-${s.variant}`} className="flex items-center gap-2">
                <span className="w-10 text-[9px] font-bold uppercase tracking-wider text-right" style={{ color: s.color }}>
                  {s.variant}
                </span>
                <IRRBar irr={s.irr} maxIrr={maxIrr} color={s.color} />
                <span className="w-14 text-xs font-bold tabular-nums text-right" style={{ color: s.irr !== null ? s.color : '#64748b' }}>
                  {s.irrPct}
                </span>
                <SignalBadge irr={s.irr} hurdleRate={hurdleRate} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06]">
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6870] mb-0.5">Scenarios</p>
          <p className="text-sm font-bold text-white tabular-nums">{scenarios.length}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6870] mb-0.5">Pass Rate</p>
          <p className="text-sm font-bold tabular-nums" style={{ color: passRate >= 50 ? '#14B8A6' : '#F59E0B' }}>
            {passRate.toFixed(0)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6870] mb-0.5">Best IRR</p>
          <p className="text-sm font-bold text-[#454955] tabular-nums">{bestScenario?.irrPct ?? 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Calendar icon used in grouped headers ── */
function Calendar(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
