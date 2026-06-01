'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TrendingUp, Calendar, DollarSign, Percent, Building2, ArrowRight, Calculator, BarChart3, Sparkles } from 'lucide-react';
import { computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   IRR EXIT ASSUMPTIONS TERMINAL
   Collects the inputs needed to compute Internal Rate of Return:
     • Total Cash Invested (t0 outlay)
     • Annual Cash Flow (ongoing returns)
     • Hold Period (years)
     • Purchase Price
     • Annual Appreciation (%)
     • Loan Amount + Rate + Term
     • Selling Costs (%)
   Outputs live IRR via Newton-Raphson + cash flow timeline
   ═══════════════════════════════════════════════════════════════ */

export interface IRRAssumptions {
  totalCashInvested: number;
  annualCashFlow: number;
  holdYears: number;
  purchasePrice: number;
  appreciationPercent: number;
  loanAmount: number;
  loanRate: number;
  loanTermYears: number;
  sellingCostsPercent: number;
  irr: number | null;
  cashFlows: number[];
}

interface IRRExitAssumptionsTerminalProps {
  defaults?: Partial<IRRAssumptions>;
  onValuesChange?: (values: IRRAssumptions) => void;
  className?: string;
}

/* ── Glass Input ── */
function GlassInput({
  label,
  sublabel,
  icon: Icon,
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
}: {
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <div className="group">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      {sublabel && <p className="text-[9px] text-slate-600 mb-1">{sublabel}</p>}
      <div className="relative">
        {!suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none">$</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          step={step}
          min={min}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 text-sm
                     font-mono tabular-nums py-2 px-3 focus:outline-none focus:border-teal-500/40
                     focus:ring-1 focus:ring-teal-500/20 transition-all placeholder:text-slate-600"
          style={!suffix ? { paddingLeft: '1.75rem' } : undefined}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

/* ── Hold Period Selector ── */
function HoldPeriodSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [3, 5, 7, 10, 15, 20];
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
        <Calendar className="w-3 h-3" />
        Hold Period
      </label>
      <div className="flex gap-1.5">
        {options.map((yr) => (
          <button
            key={yr}
            onClick={() => onChange(yr)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              value === yr
                ? 'bg-teal-500/20 border border-teal-400/40 text-teal-400'
                : 'bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10'
            }`}
          >
            {yr}yr
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Cash Flow Timeline ── */
function CashFlowTimeline({ flows }: { flows: number[] }) {
  if (flows.length < 2) return null;
  const maxAbs = Math.max(...flows.map(Math.abs));

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
        <BarChart3 className="w-3 h-3" />
        Cash Flow Timeline
      </p>
      <div className="flex items-end gap-1 h-16">
        {flows.map((cf, i) => {
          const heightPct = maxAbs > 0 ? (Math.abs(cf) / maxAbs) * 100 : 0;
          const isNeg = cf < 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group/bar">
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: isNeg ? 'rgba(239,68,68,0.5)' : 'rgba(45,212,191,0.5)',
                  minHeight: '2px',
                }}
              />
              <span className="text-[7px] text-slate-600 mt-0.5 tabular-nums">t{i}</span>

              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 rounded px-1.5 py-0.5
                              text-[8px] text-white font-mono tabular-nums opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                {cf < 0 ? '-' : '+'}${Math.abs(cf).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function IRRExitAssumptionsTerminal({
  defaults = {},
  onValuesChange,
  className = '',
}: IRRExitAssumptionsTerminalProps) {
  const [cashInvested, setCashInvested] = useState(defaults.totalCashInvested ?? 60000);
  const [annualCF, setAnnualCF] = useState(defaults.annualCashFlow ?? -4443.31);
  const [holdYears, setHoldYears] = useState(defaults.holdYears ?? 5);
  const [purchasePrice, setPurchasePrice] = useState(defaults.purchasePrice ?? 279000);
  const [appreciation, setAppreciation] = useState(defaults.appreciationPercent ?? 3);
  const [loanAmount, setLoanAmount] = useState(defaults.loanAmount ?? 223200);
  const [loanRate, setLoanRate] = useState(defaults.loanRate ?? 6.5);
  const [loanTerm, setLoanTerm] = useState(defaults.loanTermYears ?? 30);
  const [sellingCosts, setSellingCosts] = useState(defaults.sellingCostsPercent ?? 8);

  /* ── Compute IRR ── */
  const computed = useMemo(() => {
    const cashFlows = buildIRRCashFlows(
      cashInvested, annualCF, holdYears, purchasePrice,
      appreciation, loanAmount, loanRate, loanTerm, sellingCosts
    );
    const irr = computeIRR(cashFlows);
    return { cashFlows, irr };
  }, [cashInvested, annualCF, holdYears, purchasePrice, appreciation, loanAmount, loanRate, loanTerm, sellingCosts]);

  /* ── Exit value calculations ── */
  const exitMetrics = useMemo(() => {
    const futureValue = purchasePrice * Math.pow(1 + appreciation / 100, holdYears);
    const totalCashFlows = annualCF * holdYears;
    const exitProceeds = computed.cashFlows.length > 0 ? computed.cashFlows[computed.cashFlows.length - 1] : 0;
    const totalReturn = totalCashFlows + exitProceeds - cashInvested;
    const equityMultiple = cashInvested > 0 ? (totalCashFlows + exitProceeds) / cashInvested : 0;
    return { futureValue, totalCashFlows, exitProceeds, totalReturn, equityMultiple };
  }, [computed.cashFlows, cashInvested, annualCF, holdYears, purchasePrice, appreciation]);

  const stableOnChange = useCallback((values: IRRAssumptions) => {
    onValuesChange?.(values);
  }, [onValuesChange]);

  useEffect(() => {
    stableOnChange({
      totalCashInvested: cashInvested,
      annualCashFlow: annualCF,
      holdYears,
      purchasePrice,
      appreciationPercent: appreciation,
      loanAmount,
      loanRate,
      loanTermYears: loanTerm,
      sellingCostsPercent: sellingCosts,
      irr: computed.irr,
      cashFlows: computed.cashFlows,
    });
  }, [cashInvested, annualCF, holdYears, purchasePrice, appreciation, loanAmount, loanRate, loanTerm, sellingCosts, computed, stableOnChange]);

  const irrColor = computed.irr === null ? '#64748b' : computed.irr >= 0.15 ? '#14B8A6' : computed.irr >= 0.08 ? '#F59E0B' : '#EF4444';
  const irrLabel = computed.irr === null ? 'N/A' : `${(computed.irr * 100).toFixed(1)}%`;
  const irrSignal = computed.irr === null ? 'Cannot Converge' : computed.irr >= 0.15 ? 'Strong Return' : computed.irr >= 0.08 ? 'Moderate' : 'Weak';

  const fmtUSD = (v: number) => `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Exit Assumptions</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">IRR Analysis Terminal</p>
          </div>
        </div>
      </div>

      {/* ── Hold Period ── */}
      <HoldPeriodSelector value={holdYears} onChange={setHoldYears} />

      {/* ── Investment Inputs ── */}
      <div className="grid grid-cols-2 gap-3">
        <GlassInput label="Cash Invested" sublabel="Total equity at t0" icon={DollarSign} value={cashInvested} onChange={setCashInvested} step={5000} />
        <GlassInput label="Annual Cash Flow" sublabel="Net annual from operations" icon={TrendingUp} value={annualCF} onChange={setAnnualCF} step={100} />
      </div>

      {/* ── Property + Exit ── */}
      <div className="grid grid-cols-2 gap-3">
        <GlassInput label="Purchase Price" icon={Building2} value={purchasePrice} onChange={setPurchasePrice} step={5000} />
        <GlassInput label="Appreciation" sublabel="Annual %" icon={Percent} value={appreciation} onChange={setAppreciation} suffix="%" step={0.5} />
      </div>

      {/* ── Loan Terms (collapsible feel) ── */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Financing</p>
        <div className="grid grid-cols-3 gap-2">
          <GlassInput label="Loan" icon={DollarSign} value={loanAmount} onChange={setLoanAmount} step={5000} />
          <GlassInput label="Rate" icon={Percent} value={loanRate} onChange={setLoanRate} suffix="%" step={0.25} />
          <GlassInput label="Term" icon={Calendar} value={loanTerm} onChange={setLoanTerm} suffix="yr" step={1} min={1} />
        </div>
        <GlassInput label="Selling Costs" sublabel="Commissions + closing" icon={Percent} value={sellingCosts} onChange={setSellingCosts} suffix="%" step={0.5} />
      </div>

      {/* ── IRR Result ── */}
      <div className="rounded-xl border p-4 flex items-center justify-between transition-all duration-500"
        style={{ borderColor: `${irrColor}30`, background: `${irrColor}08` }}>
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 flex-shrink-0" style={{ color: irrColor }} />
          <div>
            <p className="text-xs font-bold" style={{ color: irrColor }}>{irrSignal}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{holdYears}-year hold scenario</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold tabular-nums tracking-tighter" style={{ color: irrColor }}>
            {irrLabel}
          </span>
          <p className="text-[9px] text-slate-600 mt-0.5">IRR (annualized)</p>
        </div>
      </div>

      {/* ── Exit Metrics Row ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Future Value', value: fmtUSD(exitMetrics.futureValue), color: '#64748b' },
          { label: 'Total Return', value: `${exitMetrics.totalReturn >= 0 ? '+' : '-'}${fmtUSD(exitMetrics.totalReturn)}`, color: exitMetrics.totalReturn >= 0 ? '#14B8A6' : '#EF4444' },
          { label: 'Equity Multiple', value: `${exitMetrics.equityMultiple.toFixed(2)}x`, color: '#8B5CF6' },
        ].map((m) => (
          <div key={m.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{m.label}</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* ── Cash Flow Timeline ── */}
      <CashFlowTimeline flows={computed.cashFlows} />

      {/* ── Formula ── */}
      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Newton-Raphson Solver</p>
        <p className="text-[11px] text-slate-400 font-mono">
          IRR where NPV = Σ CF(t) / (1+r)^t = 0 → {irrLabel}
        </p>
      </div>
    </div>
  );
}
