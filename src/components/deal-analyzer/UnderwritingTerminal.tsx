'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import {
  type UnderwritingInputs,
  calculateUnderwriting,
  getCashFlowHealth,
  getCapRateHealth,
  getCashOnCashHealth,
  getDscrHealth,
  formatCurrency,
  type HealthBand,
} from '@/lib/calculators/underwriting';

/* ═══════════════════════════════════════════════════════════════
   UnderwritingTerminal — Stitch-matched Rental Underwriting UI
   12-column grid: left inputs (col-span-8) + right sticky metrics (col-span-4)
   ═══════════════════════════════════════════════════════════════ */

type Strategy = 'rental' | 'flip';

const DEFAULT_INPUTS: UnderwritingInputs = {
  purchasePrice: 450000,
  arv: 625000,
  repairCosts: 35000,
  closingCostsPct: 2.5,
  downPaymentPct: 20,
  interestRate: 6.75,
  amortizationYears: 30,
  grossRentMonthly: 3800,
  vacancyRatePct: 5,
  propertyTaxAnnual: 4200,
  insuranceAnnual: 2160,
  maintenancePct: 5,
  managementPct: 8,
};

// ─── Health band color mapping ───────────────────────────
const HEALTH_COLORS: Record<HealthBand, string> = {
  good: 'bg-primary',                  // teal #57f1db
  fair: 'bg-tertiary-container',       // amber #ffac5a
  poor: 'bg-error',                    // red  #ffb4ab
};

// ─── Formatted currency input hook ───────────────────────
function useCurrencyInput(
  initial: number,
  onValue: (v: number) => void
) {
  const [display, setDisplay] = useState(initial.toLocaleString('en-US'));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      setDisplay(raw);
      const num = parseFloat(raw);
      if (!isNaN(num)) onValue(num);
    },
    [onValue]
  );

  const handleBlur = useCallback(() => {
    const num = parseFloat(display.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) {
      setDisplay(num.toLocaleString('en-US'));
    }
  }, [display]);

  const handleFocus = useCallback(() => {
    const num = parseFloat(display.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) setDisplay(num.toString());
  }, [display]);

  return { display, handleChange, handleBlur, handleFocus, setDisplay };
}

// ─── Reusable input components ───────────────────────────

interface CurrencyFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  id: string;
}

function CurrencyField({ label, value, onChange, id }: CurrencyFieldProps) {
  const { display, handleChange, handleBlur, handleFocus } = useCurrencyInput(
    value,
    onChange
  );

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="uw-glass-input flex items-center px-4 py-3 rounded-lg">
        <span className="text-on-surface-variant mr-2 font-mono">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className="bg-transparent border-none p-0 focus:ring-0 text-on-surface font-mono text-[16px] w-full outline-none"
        />
      </div>
    </div>
  );
}

interface PercentFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  id: string;
  suffix?: string;
  extra?: React.ReactNode;
}

function PercentField({
  label,
  value,
  onChange,
  id,
  suffix = '%',
  extra,
}: PercentFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="flex gap-4 items-center">
        <div className="uw-glass-input flex items-center px-4 py-3 rounded-lg flex-1">
          <input
            id={id}
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="bg-transparent border-none p-0 focus:ring-0 text-on-surface font-mono text-[16px] w-full outline-none"
          />
          <span className="text-on-surface-variant ml-2 font-mono text-sm">
            {suffix}
          </span>
        </div>
        {extra}
      </div>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  health: HealthBand;
}

function MetricCard({ label, value, unit, health }: MetricCardProps) {
  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group transition-all duration-200 hover:bg-white/[0.02]">
      {/* Health band */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${HEALTH_COLORS[health]} transition-colors duration-500`}
      />
      <span className="font-label-sm text-label-sm text-on-surface-variant ml-2 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-end gap-1 ml-2">
        <span className="text-[28px] leading-[36px] font-bold text-on-surface font-mono tracking-tight">
          {value}
        </span>
        <span className="text-on-surface-variant text-[12px] mb-1.5 font-mono">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export interface UnderwritingTerminalProps {
  initialInputs?: Partial<UnderwritingInputs>;
  onSave?: (inputs: UnderwritingInputs) => void;
}

export function UnderwritingTerminal({
  initialInputs,
  onSave,
}: UnderwritingTerminalProps) {
  const [strategy, setStrategy] = useState<Strategy>('rental');
  const [inputs, setInputs] = useState<UnderwritingInputs>({
    ...DEFAULT_INPUTS,
    ...initialInputs,
  });

  // Live calculations
  const results = useMemo(() => calculateUnderwriting(inputs), [inputs]);

  // Health bands
  const cashFlowHealth = getCashFlowHealth(results.monthlyCashFlow);
  const capRateHealth = getCapRateHealth(results.capRate);
  const cocHealth = getCashOnCashHealth(results.cashOnCash);
  const dscrHealth = getDscrHealth(results.dscr);

  // Partial updater
  const update = useCallback(
    (field: keyof UnderwritingInputs, value: number) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSave = useCallback(() => {
    onSave?.(inputs);
  }, [inputs, onSave]);

  return (
    <div className="pt-6 px-6 lg:px-10 pb-12 max-w-[1280px] mx-auto w-full">
      {/* ── 12-Column Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ════════ LEFT COLUMN: Input Controls ════════ */}
        <div className="xl:col-span-8 flex flex-col gap-8 w-full">
          {/* Strategy Toggle */}
          <div className="flex items-center gap-4 glass-panel p-2 rounded-xl w-fit">
            <button
              onClick={() => setStrategy('rental')}
              className={`px-6 py-2 rounded-lg font-label-md text-label-md transition-all duration-200 ${
                strategy === 'rental'
                  ? 'bg-surface-variant text-on-surface shadow-inner border border-white/5'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Rental
            </button>
            <button
              onClick={() => setStrategy('flip')}
              className={`px-6 py-2 rounded-lg font-label-md text-label-md transition-all duration-200 ${
                strategy === 'flip'
                  ? 'bg-surface-variant text-on-surface shadow-inner border border-white/5'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Flip
            </button>
          </div>

          {/* ── Section: Purchase Details ── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/70" />
              Purchase Details
            </h2>
            <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField
                id="uw-purchase-price"
                label="Purchase Price"
                value={inputs.purchasePrice}
                onChange={(v) => update('purchasePrice', v)}
              />
              <CurrencyField
                id="uw-arv"
                label="After Repair Value (ARV)"
                value={inputs.arv}
                onChange={(v) => update('arv', v)}
              />
              <CurrencyField
                id="uw-repair-costs"
                label="Repair Costs"
                value={inputs.repairCosts}
                onChange={(v) => update('repairCosts', v)}
              />
              <PercentField
                id="uw-closing-costs"
                label="Closing Costs"
                value={inputs.closingCostsPct}
                onChange={(v) => update('closingCostsPct', v)}
                extra={
                  <span className="text-on-surface-variant font-mono text-sm whitespace-nowrap">
                    = {formatCurrency(results.closingCostsAmount)}
                  </span>
                }
              />
            </div>
          </section>

          {/* ── Section: Financing ── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              Financing
            </h2>
            <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="uw-down-payment"
                  className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider"
                >
                  Down Payment
                </label>
                <div className="flex gap-4 items-center">
                  <div className="uw-glass-input flex items-center px-4 py-3 rounded-lg w-1/3">
                    <input
                      id="uw-down-payment"
                      type="number"
                      step="1"
                      value={inputs.downPaymentPct}
                      onChange={(e) =>
                        update(
                          'downPaymentPct',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="bg-transparent border-none p-0 focus:ring-0 text-on-surface font-mono text-[16px] w-full outline-none text-right"
                    />
                    <span className="text-on-surface-variant ml-2 font-mono">
                      %
                    </span>
                  </div>
                  <span className="text-on-surface-variant font-mono text-sm">
                    = {formatCurrency(results.downPaymentAmount)}
                  </span>
                </div>
              </div>
              <PercentField
                id="uw-interest-rate"
                label="Interest Rate"
                value={inputs.interestRate}
                onChange={(v) => update('interestRate', v)}
              />
              <PercentField
                id="uw-amortization"
                label="Amortization"
                value={inputs.amortizationYears}
                onChange={(v) => update('amortizationYears', v)}
                suffix="Years"
              />
            </div>
          </section>

          {/* ── Section: Income ── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary-container" />
              Income
            </h2>
            <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField
                id="uw-gross-rent"
                label="Gross Rent (Monthly)"
                value={inputs.grossRentMonthly}
                onChange={(v) => update('grossRentMonthly', v)}
              />
              <PercentField
                id="uw-vacancy"
                label="Vacancy Rate"
                value={inputs.vacancyRatePct}
                onChange={(v) => update('vacancyRatePct', v)}
              />
            </div>
          </section>

          {/* ── Section: Operating Expenses ── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-on-surface flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim" />
              Operating Expenses
            </h2>
            <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField
                id="uw-property-tax"
                label="Property Tax (Annual)"
                value={inputs.propertyTaxAnnual}
                onChange={(v) => update('propertyTaxAnnual', v)}
              />
              <CurrencyField
                id="uw-insurance"
                label="Insurance (Annual)"
                value={inputs.insuranceAnnual}
                onChange={(v) => update('insuranceAnnual', v)}
              />
              <PercentField
                id="uw-maintenance"
                label="Maintenance Reserve"
                value={inputs.maintenancePct}
                onChange={(v) => update('maintenancePct', v)}
                extra={
                  <span className="text-on-surface-variant font-mono text-xs whitespace-nowrap">
                    of EGI
                  </span>
                }
              />
              <PercentField
                id="uw-management"
                label="Property Management"
                value={inputs.managementPct}
                onChange={(v) => update('managementPct', v)}
                extra={
                  <span className="text-on-surface-variant font-mono text-xs whitespace-nowrap">
                    of EGI
                  </span>
                }
              />
            </div>
          </section>
        </div>

        {/* ════════ RIGHT COLUMN: Live Metrics (Sticky) ════════ */}
        <div className="xl:col-span-4 relative">
          <div className="sticky top-24 flex flex-col gap-4">
            <h3 className="text-[18px] font-semibold text-on-surface mb-1">
              Deal Metrics
            </h3>

            {/* 2×2 Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="Monthly Cash Flow"
                value={formatCurrency(Math.round(results.monthlyCashFlow))}
                unit="/mo"
                health={cashFlowHealth}
              />
              <MetricCard
                label="Cap Rate"
                value={results.capRate.toFixed(1)}
                unit="%"
                health={capRateHealth}
              />
              <MetricCard
                label="Cash-on-Cash"
                value={results.cashOnCash.toFixed(1)}
                unit="%"
                health={cocHealth}
              />
              <MetricCard
                label="DSCR"
                value={results.dscr.toFixed(2)}
                unit="x"
                health={dscrHealth}
              />
            </div>

            {/* Total Cash Needed */}
            <div className="glass-panel rounded-xl p-5 mt-1 flex justify-between items-center">
              <span className="text-on-surface-variant">
                Total Cash Needed
              </span>
              <span className="text-[22px] font-bold text-on-surface font-mono tracking-tight">
                {formatCurrency(Math.round(results.totalCashNeeded))}
              </span>
            </div>

            {/* Save CTA */}
            <button
              onClick={handleSave}
              className="luminous-button w-full py-4 rounded-xl font-label-md text-label-md uppercase tracking-widest mt-4 flex justify-center items-center gap-2 group"
            >
              <Save className="w-4 h-4" />
              Save as Project
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Subtle NOI / Debt Service breakdown */}
            <div className="mt-3 space-y-2 px-1">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Effective Gross Income</span>
                <span className="font-mono">
                  {formatCurrency(Math.round(results.effectiveGrossIncome))}
                  /yr
                </span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Operating Expenses</span>
                <span className="font-mono">
                  −{formatCurrency(Math.round(results.totalOperatingExpenses))}
                  /yr
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between text-xs text-on-surface">
                <span className="font-semibold">NOI</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(Math.round(results.noi))}/yr
                </span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Annual Debt Service</span>
                <span className="font-mono">
                  −{formatCurrency(Math.round(results.annualDebtService))}/yr
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between text-xs">
                <span className="text-primary font-semibold">
                  Annual Cash Flow
                </span>
                <span className="text-primary font-mono font-semibold">
                  {formatCurrency(Math.round(results.annualCashFlow))}/yr
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
