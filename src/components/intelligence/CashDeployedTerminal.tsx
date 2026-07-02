"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Wallet, DollarSign, Percent, Building2 } from "lucide-react";
import { computeTotalCashInvested, computeCoCReturn } from "@/lib/metrics/reiMetrics";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CashDeployedValues {
  downPayment: number;
  closingCosts: number;
  rehabBudget: number;
  holdingCostsTotal: number;
  totalCashInvested: number;
  cocReturn: number;
}

interface CashDeployedTerminalProps {
  annualCashFlow?: number;
  defaultDownPayment?: number;
  defaultClosingCosts?: number;
  defaultRehabBudget?: number;
  defaultHoldingCosts?: number;
  onValuesChange?: (values: CashDeployedValues) => void;
  className?: string;
}

/* ── Formatting ── */
const fmtUSD = (v: number): string =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/* ── Glass Input ── */
function GlassInput({
  label,
  icon: Icon,
  value,
  onChange,
  prefix = "$",
  suffix,
  step = 1000,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="group relative">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B6870] font-medium pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          step={step}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 text-sm
                     font-mono tabular-nums py-2.5 focus:outline-none focus:border-[#454955]/40
                     focus:ring-1 focus:ring-[#454955]/20 transition-all placeholder:text-slate-600"
          style={{ paddingLeft: prefix ? "1.75rem" : "0.75rem", paddingRight: suffix ? "2.5rem" : "0.75rem" }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6B6870] font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CASH DEPLOYED TERMINAL
   Investment Basis: Collects all cash invested components.
   Formula sub-component for COC = Annual Cash Flow ÷ Total Cash Invested
   ═══════════════════════════════════════════════════════════════ */

export function CashDeployedTerminal({
  annualCashFlow = 5052,
  defaultDownPayment = 55800,
  defaultClosingCosts = 4200,
  defaultRehabBudget = 0,
  defaultHoldingCosts = 0,
  onValuesChange,
  className = "",
}: CashDeployedTerminalProps) {
  const [downPayment, setDownPayment] = useState(defaultDownPayment);
  const [closingCosts, setClosingCosts] = useState(defaultClosingCosts);
  const [rehabBudget, setRehabBudget] = useState(defaultRehabBudget);
  const [holdingCostsTotal, setHoldingCostsTotal] = useState(defaultHoldingCosts);

  const computed = useMemo(() => {
    const totalCashInvested = downPayment + closingCosts + rehabBudget + holdingCostsTotal;
    const cocReturn = totalCashInvested > 0
      ? Math.round((annualCashFlow / totalCashInvested) * 100 * 100) / 100
      : 0;
    return { totalCashInvested, cocReturn };
  }, [downPayment, closingCosts, rehabBudget, holdingCostsTotal, annualCashFlow]);

  // Notify parent on value changes
  const notifyChange = useCallback(() => {
    if (onValuesChange) {
      onValuesChange({
        downPayment,
        closingCosts,
        rehabBudget,
        holdingCostsTotal,
        totalCashInvested: computed.totalCashInvested,
        cocReturn: computed.cocReturn,
      });
    }
  }, [downPayment, closingCosts, rehabBudget, holdingCostsTotal, computed, onValuesChange]);

  React.useEffect(() => { notifyChange(); }, [notifyChange]);

  /* ── COC Health Badge ── */
  const cocBadge = computed.cocReturn >= 8
    ? { label: "Excellent", className: "bg-blue-400/10 border-blue-400/20 text-blue-400" }
    : computed.cocReturn >= 6
    ? { label: "Good", className: "bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]" }
    : computed.cocReturn >= 3
    ? { label: "Fair", className: "bg-amber-400/10 border-amber-400/20 text-amber-400" }
    : { label: "Poor", className: "bg-red-400/10 border-red-400/20 text-red-400" };

  /* ── Breakdown percentages ── */
  const total = computed.totalCashInvested || 1;
  const breakdown = [
    { label: "Down Payment", value: downPayment, pct: (downPayment / total) * 100, color: "#14B8A6" },
    { label: "Closing Costs", value: closingCosts, pct: (closingCosts / total) * 100, color: "#3B82F6" },
    { label: "Rehab Budget", value: rehabBudget, pct: (rehabBudget / total) * 100, color: "#A855F7" },
    { label: "Holding Costs", value: holdingCostsTotal, pct: (holdingCostsTotal / total) * 100, color: "#EAB308" },
  ];

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: "rgba(24,33,39,0.7)", backdropFilter: "blur(16px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#6E7480]/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-[#6E7480]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Investment Basis</h3>
            <p className="text-[10px] text-[#6B6870] uppercase tracking-widest font-bold">Cash Deployed Terminal</p>
          </div>
        </div>
      </div>

      {/* ── 4 Input Fields ── */}
      <div className="grid grid-cols-2 gap-3">
        <GlassInput label="Down Payment" icon={DollarSign} value={downPayment} onChange={setDownPayment} />
        <GlassInput label="Closing Costs" icon={DollarSign} value={closingCosts} onChange={setClosingCosts} />
        <GlassInput label="Rehab Budget" icon={Building2} value={rehabBudget} onChange={setRehabBudget} />
        <GlassInput label="Holding Costs" icon={DollarSign} value={holdingCostsTotal} onChange={setHoldingCostsTotal} />
      </div>

      {/* ── Breakdown Bar ── */}
      <div className="space-y-2">
        <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
          {breakdown.filter(b => b.value > 0).map((b) => (
            <div
              key={b.label}
              className="h-full transition-all duration-500"
              style={{ width: `${b.pct}%`, backgroundColor: b.color }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {breakdown.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-[#6B6870]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
              <span>{b.label}</span>
              <span className="text-[#9E9DA0] font-mono ml-auto">{b.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-white/[0.06]" />

      {/* ── Computed Outputs ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Cash Invested */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-1">Total Cash Invested</p>
          <p className="text-lg font-bold text-white tabular-nums">{fmtUSD(computed.totalCashInvested)}</p>
        </div>

        {/* CoC Return */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-1">CoC Return</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#6E7480] tabular-nums">{computed.cocReturn.toFixed(2)}%</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cocBadge.className}`}>
              {cocBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Formula reference ── */}
      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-0.5">Formula</p>
        <p className="text-[11px] text-[#9E9DA0] font-mono">
          CoC = {fmtUSD(annualCashFlow)} ÷ {fmtUSD(computed.totalCashInvested)} = {computed.cocReturn.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}
