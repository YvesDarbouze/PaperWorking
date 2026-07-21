"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Calculator, DollarSign, Percent, Clock } from "lucide-react";
import {
  computeDebtServiceFormMetrics,
} from "@/lib/metrics/reiMetrics";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DebtServiceValues {
  loanAmount: number;
  interestRate: number;
  termYears: number;
  annualDebtService: number;
  monthlyCashFlow: number;
}

interface DebtServiceInputFormProps {
  noi?: number;
  defaultLoanAmount?: number;
  defaultRate?: number;
  defaultTerm?: number;
  onValuesChange?: (values: DebtServiceValues) => void;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

const formatCurrencyDetailed = (val: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(val);

// ── Component ────────────────────────────────────────────────────────────────

export function DebtServiceInputForm({
  noi,
  defaultLoanAmount = 0,
  defaultRate = 0,
  defaultTerm = 30,
  onValuesChange,
  className = "",
}: DebtServiceInputFormProps) {
  const [loanAmount, setLoanAmount] = useState(defaultLoanAmount);
  const [interestRate, setInterestRate] = useState(defaultRate);
  const [termYears, setTermYears] = useState(defaultTerm);

  const derived = useMemo(() => {
    const res = computeDebtServiceFormMetrics(loanAmount, interestRate, termYears, noi);
    return {
      annualDebtService: res.annualDebtService,
      monthlyPayment: res.monthlyPayment,
      annualCashFlow: res.annualCashFlow,
      monthlyCashFlow: res.monthlyCashFlow
    };
  }, [loanAmount, interestRate, termYears, noi]);

  const handleChange = useCallback(
    (field: "loan" | "rate" | "term", raw: string) => {
      const val = parseFloat(raw) || 0;
      let nextLoan = loanAmount;
      let nextRate = interestRate;
      let nextTerm = termYears;

      if (field === "loan") { nextLoan = Math.max(0, val); setLoanAmount(nextLoan); }
      if (field === "rate") { nextRate = Math.max(0, val); setInterestRate(nextRate); }
      if (field === "term") { nextTerm = Math.max(0, val); setTermYears(nextTerm); }

      if (onValuesChange) {
        const res = computeDebtServiceFormMetrics(nextLoan, nextRate, nextTerm, noi);
        onValuesChange({
          loanAmount: nextLoan,
          interestRate: nextRate,
          termYears: nextTerm,
          annualDebtService: res.annualDebtService,
          monthlyCashFlow: res.monthlyCashFlow,
        });
      }
    },
    [loanAmount, interestRate, termYears, noi, onValuesChange]
  );

  const inputClass =
    "w-full bg-surface-container-high border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden relative ${className}`}
      style={{
        background: "rgba(13, 10, 11, 0.6)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center gap-2 bg-gradient-to-b from-primary/5 to-transparent">
        <Calculator className="w-4 h-4 text-primary" />
        <h3 className="font-headline-md text-headline-md text-primary">
          Debt Service Calculator
        </h3>
      </div>

      {/* Input Fields */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Loan Amount */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
              Loan Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <input
                type="number"
                min={0}
                value={loanAmount || ""}
                onChange={(e) => handleChange("loan", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
              Interest Rate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Percent className="w-3.5 h-3.5" />
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.125}
                value={interestRate || ""}
                onChange={(e) => handleChange("rate", e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          {/* Loan Term */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
              Loan Term (years)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={termYears || ""}
                onChange={(e) => handleChange("term", e.target.value)}
                placeholder="30"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Computed Outputs */}
        <div className="pt-4 border-t border-white/5">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold block mb-4">
            Computed Results
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Monthly Payment */}
            <div
              className="rounded-xl p-4 border border-white/5"
              style={{ background: "rgba(24,33,39,0.5)" }}
            >
              <span className="text-xs uppercase tracking-widest text-[#6B6870] font-semibold block mb-1">
                Monthly Payment
              </span>
              <span className="text-2xl font-bold text-white tabular-nums font-mono">
                {formatCurrencyDetailed(derived.monthlyPayment)}
              </span>
            </div>

            {/* Annual Debt Service */}
            <div
              className="rounded-xl p-4 border border-white/5"
              style={{ background: "rgba(24,33,39,0.5)" }}
            >
              <span className="text-xs uppercase tracking-widest text-[#6B6870] font-semibold block mb-1">
                Annual Debt Service
              </span>
              <span className="text-2xl font-bold text-white tabular-nums font-mono">
                {formatCurrency(derived.annualDebtService)}
              </span>
            </div>

            {/* Cash Flow (only if NOI provided) */}
            <div
              className="rounded-xl p-4 border border-white/5"
              style={{ background: "rgba(24,33,39,0.5)" }}
            >
              <span className="text-xs uppercase tracking-widest text-[#6B6870] font-semibold block mb-1">
                {noi != null ? "Monthly Cash Flow" : "Cash Flow"}
              </span>
              {noi != null && noi > 0 ? (
                <span
                  className={`text-2xl font-bold tabular-nums font-mono ${
                    derived.monthlyCashFlow >= 0
                      ? "text-[#6E7480]"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrencyDetailed(derived.monthlyCashFlow)}
                </span>
              ) : (
                <span className="text-sm text-[#6B6870] italic">
                  Provide NOI to compute
                </span>
              )}
            </div>
          </div>

          {/* Annual Cash Flow summary when NOI is present */}
          {noi != null && noi > 0 && (
            <div className="mt-3 flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 border border-white/5">
              <span className="text-xs text-[#9E9DA0] uppercase tracking-widest font-semibold">
                Annual Cash Flow (NOI − Debt Service)
              </span>
              <span
                className={`text-base font-bold tabular-nums font-mono ${
                  derived.annualCashFlow >= 0
                    ? "text-[#6E7480]"
                    : "text-red-400"
                }`}
              >
                {formatCurrency(derived.annualCashFlow)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
