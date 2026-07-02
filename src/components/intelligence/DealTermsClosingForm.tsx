"use client";

import React, { useState, useMemo, useCallback } from "react";
import { FileText, DollarSign } from "lucide-react";
import { computeCapRate, computeLTV } from "@/lib/metrics/reiMetrics";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DealTermsValues {
  purchasePrice: number;
  closingCosts: number;
  downPayment: number;
  capRate: number;
}

interface DealTermsClosingFormProps {
  noi?: number;
  defaultPurchasePrice?: number;
  onValuesChange?: (values: DealTermsValues) => void;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);

// ── Component ────────────────────────────────────────────────────────────────

export function DealTermsClosingForm({
  noi,
  defaultPurchasePrice = 0,
  onValuesChange,
  className = "",
}: DealTermsClosingFormProps) {
  const [purchasePrice, setPurchasePrice] = useState(defaultPurchasePrice);
  const [closingCosts, setClosingCosts] = useState(0);
  const [downPayment, setDownPayment] = useState(0);

  const derived = useMemo(() => {
    // Cap Rate = NOI / Purchase Price × 100
    const capRate =
      noi != null && noi > 0 ? computeCapRate(noi, purchasePrice) : 0;

    // Loan Amount = Purchase Price − Down Payment
    const loanAmount = Math.max(0, purchasePrice - downPayment);

    // LTV = Loan Amount / Purchase Price × 100
    const ltv = computeLTV(loanAmount, purchasePrice);

    // Total Cash Invested = Down Payment + Closing Costs
    const totalCashInvested = downPayment + closingCosts;

    return { capRate, ltv, totalCashInvested, loanAmount };
  }, [purchasePrice, closingCosts, downPayment, noi]);

  const handleChange = useCallback(
    (field: "price" | "closing" | "down", raw: string) => {
      const val = parseFloat(raw) || 0;
      let nextPrice = purchasePrice;
      let nextClosing = closingCosts;
      let nextDown = downPayment;

      if (field === "price") {
        nextPrice = Math.max(0, val);
        setPurchasePrice(nextPrice);
      }
      if (field === "closing") {
        nextClosing = Math.max(0, val);
        setClosingCosts(nextClosing);
      }
      if (field === "down") {
        nextDown = Math.max(0, val);
        setDownPayment(nextDown);
      }

      if (onValuesChange) {
        const cr =
          noi != null && noi > 0 ? computeCapRate(noi, nextPrice) : 0;
        onValuesChange({
          purchasePrice: nextPrice,
          closingCosts: nextClosing,
          downPayment: nextDown,
          capRate: cr,
        });
      }
    },
    [purchasePrice, closingCosts, downPayment, noi, onValuesChange]
  );

  const inputClass =
    "w-full bg-surface-container-high border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

  // Cap rate health indicator
  const capRateHealth =
    derived.capRate >= 8
      ? { label: "Excellent", color: "#454955" }
      : derived.capRate >= 5
        ? { label: "Good", color: "#454955" }
        : derived.capRate >= 3
          ? { label: "Fair", color: "#f59e0b" }
          : derived.capRate > 0
            ? { label: "Low", color: "#F06543" }
            : { label: "—", color: "#64748b" };

  // LTV risk indicator
  const ltvHealth =
    derived.ltv <= 0
      ? { label: "—", color: "#64748b" }
      : derived.ltv <= 75
        ? { label: "Conservative", color: "#454955" }
        : derived.ltv <= 85
          ? { label: "Standard", color: "#f59e0b" }
          : { label: "High Leverage", color: "#F06543" };

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
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="font-headline-md text-headline-md text-primary">
          Deal Terms & Closing
        </h3>
      </div>

      {/* Input Fields */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Purchase Price */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
              Purchase Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <input
                type="number"
                min={0}
                value={purchasePrice || ""}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {/* Closing Costs */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
              Closing Costs
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <input
                type="number"
                min={0}
                value={closingCosts || ""}
                onChange={(e) => handleChange("closing", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {/* Down Payment */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">
              Down Payment
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <input
                type="number"
                min={0}
                value={downPayment || ""}
                onChange={(e) => handleChange("down", e.target.value)}
                placeholder="0"
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
            {/* Cap Rate */}
            <div
              className="rounded-xl p-4 border border-white/5"
              style={{ background: "rgba(24,33,39,0.5)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-widest text-[#6B6870] font-semibold">
                  Cap Rate
                </span>
                {derived.capRate > 0 && (
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: capRateHealth.color }}
                  >
                    {capRateHealth.label}
                  </span>
                )}
              </div>
              {noi != null && noi > 0 ? (
                <span
                  className="text-2xl font-bold tabular-nums font-mono"
                  style={{ color: capRateHealth.color }}
                >
                  {derived.capRate.toFixed(2)}%
                </span>
              ) : (
                <span className="text-sm text-[#6B6870] italic">
                  Provide NOI to compute
                </span>
              )}
            </div>

            {/* LTV */}
            <div
              className="rounded-xl p-4 border border-white/5"
              style={{ background: "rgba(24,33,39,0.5)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-widest text-[#6B6870] font-semibold">
                  LTV
                </span>
                {derived.ltv > 0 && (
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: ltvHealth.color }}
                  >
                    {ltvHealth.label}
                  </span>
                )}
              </div>
              {purchasePrice > 0 ? (
                <span
                  className="text-2xl font-bold tabular-nums font-mono"
                  style={{ color: ltvHealth.color }}
                >
                  {derived.ltv.toFixed(1)}%
                </span>
              ) : (
                <span className="text-sm text-[#6B6870] italic">
                  Enter purchase price
                </span>
              )}
            </div>

            {/* Total Cash Invested */}
            <div
              className="rounded-xl p-4 border border-white/5"
              style={{ background: "rgba(24,33,39,0.5)" }}
            >
              <span className="text-xs uppercase tracking-widest text-[#6B6870] font-semibold block mb-1">
                Total Cash Invested
              </span>
              <span className="text-2xl font-bold text-white tabular-nums font-mono">
                {formatCurrency(derived.totalCashInvested)}
              </span>
            </div>
          </div>

          {/* Loan amount summary row */}
          {purchasePrice > 0 && downPayment > 0 && (
            <div className="mt-3 flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 border border-white/5">
              <span className="text-xs text-[#9E9DA0] uppercase tracking-widest font-semibold">
                Implied Loan Amount (Price − Down Payment)
              </span>
              <span className="text-base font-bold text-white tabular-nums font-mono">
                {formatCurrency(derived.loanAmount)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
