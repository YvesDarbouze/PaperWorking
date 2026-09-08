'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Button from '@/components/ui/Button';
import {
  type UnderwritingInputs,
  getDefaultUnderwritingInputs,
  underwritingInputsSchema,
} from '@paperworking/validation';

export interface UnderwritingFormProps {
  initialValues?: Partial<UnderwritingInputs> | null;
  basePurchasePrice?: number;
  mode?: 'create' | 'edit';
  onChange?: (values: UnderwritingInputs, isValid: boolean, isDirty: boolean) => void;
  onSave?: (values: UnderwritingInputs) => Promise<void> | void;
  isSaving?: boolean;
}

const INDEX_RATES: Record<'SOFR' | 'Prime', number> = {
  SOFR: 5.3,
  Prime: 8.5,
};

export default function UnderwritingInputsForm({
  initialValues,
  basePurchasePrice,
  mode = 'create',
  onChange,
  onSave,
  isSaving = false,
}: UnderwritingFormProps) {
  // Baseline initial institutional defaults
  const defaults = useMemo(() => {
    return getDefaultUnderwritingInputs(basePurchasePrice || 485000);
  }, [basePurchasePrice]);

  const [values, setValues] = useState<UnderwritingInputs>(() => {
    if (!initialValues) return defaults;
    return {
      acquisition: { ...defaults.acquisition, ...initialValues.acquisition },
      rentRoll: { ...defaults.rentRoll, ...initialValues.rentRoll },
      debt: { ...defaults.debt, ...initialValues.debt },
      exit: { ...defaults.exit, ...initialValues.exit },
      hurdles: { ...defaults.hurdles, ...initialValues.hurdles },
    };
  });

  // Track field-level dirty status
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // When basePurchasePrice changes from parent (e.g. linked deal)
  useEffect(() => {
    if (basePurchasePrice && basePurchasePrice > 0 && !dirtyFields.has('acquisition.purchasePrice')) {
      setValues((prev) => {
        const price = basePurchasePrice;
        const closingCosts = dirtyFields.has('acquisition.buyerClosingCosts')
          ? prev.acquisition.buyerClosingCosts
          : Math.round(price * 0.02);
        const ltv = prev.debt.targetLTV;
        const loanAmount = dirtyFields.has('debt.loanAmount')
          ? prev.debt.loanAmount
          : Math.round(price * (ltv / 100));

        return {
          ...prev,
          acquisition: {
            ...prev.acquisition,
            purchasePrice: price,
            buyerClosingCosts: closingCosts,
            estimatedARV: dirtyFields.has('acquisition.estimatedARV')
              ? prev.acquisition.estimatedARV
              : Math.round(price * 1.25),
          },
          debt: {
            ...prev.debt,
            loanAmount,
          },
        };
      });
    }
  }, [basePurchasePrice, dirtyFields]);

  // Validation
  const validationResult = useMemo(() => {
    return underwritingInputsSchema.safeParse(values);
  }, [values]);

  const errors = useMemo(() => {
    if (validationResult.success) return {};
    const errMap: Record<string, string> = {};
    for (const issue of validationResult.error.issues) {
      errMap[issue.path.join('.')] = issue.message;
    }
    return errMap;
  }, [validationResult]);

  const isValid = validationResult.success;
  const isDirty = dirtyFields.size > 0;

  // Notify parent on change
  useEffect(() => {
    onChange?.(values, isValid, isDirty);
  }, [values, isValid, isDirty, onChange]);

  const updateField = useCallback((path: string, val: unknown) => {
    setDirtyFields((prev) => new Set(prev).add(path));
    setValues((prev) => {
      const parts = path.split('.');
      if (parts.length === 2) {
        const [group, key] = parts as [keyof UnderwritingInputs, string];
        return {
          ...prev,
          [group]: {
            ...prev[group],
            [key]: val,
          },
        };
      }
      return prev;
    });
  }, []);

  // LTV & loanAmount bidirectional sync
  const handleLtvChange = useCallback(
    (ltv: number) => {
      setDirtyFields((prev) => new Set(prev).add('debt.targetLTV'));
      const price = values.acquisition.purchasePrice;
      const derivedLoan = Math.round(price * (ltv / 100));
      setValues((prev) => ({
        ...prev,
        debt: {
          ...prev.debt,
          targetLTV: ltv,
          loanAmount: derivedLoan,
        },
      }));
    },
    [values.acquisition.purchasePrice],
  );

  const handleLoanAmountChange = useCallback(
    (amount: number) => {
      setDirtyFields((prev) => new Set(prev).add('debt.loanAmount'));
      const price = values.acquisition.purchasePrice;
      const derivedLtv = price > 0 ? Number(((amount / price) * 100).toFixed(1)) : 0;
      setValues((prev) => ({
        ...prev,
        debt: {
          ...prev.debt,
          loanAmount: amount,
          targetLTV: derivedLtv,
        },
      }));
    },
    [values.acquisition.purchasePrice],
  );

  // Floating rate sync
  const handleFloatingRateChange = useCallback(
    (index: 'SOFR' | 'Prime', spreadBps: number) => {
      setDirtyFields((prev) => new Set(prev).add('debt.interestRate'));
      const base = INDEX_RATES[index] ?? 5.3;
      const calculatedRate = Number((base + spreadBps / 100).toFixed(2));
      setValues((prev) => ({
        ...prev,
        debt: {
          ...prev.debt,
          floatingIndex: index,
          floatingSpreadBps: spreadBps,
          interestRate: calculatedRate,
        },
      }));
    },
    [],
  );

  const [showTier2, setShowTier2] = useState<boolean>(() => {
    return Boolean(
      (initialValues?.hurdles?.hurdle2Irr !== undefined && initialValues?.hurdles?.hurdle2Irr !== null) ||
      (initialValues?.hurdles?.gpPromote2Pct !== undefined && initialValues?.hurdles?.gpPromote2Pct !== null)
    );
  });

  // LP & GP Equity % auto-balancing to 100%
  const handleLpEquityPctChange = useCallback((lp: number) => {
    setDirtyFields((prev) => new Set(prev).add('hurdles.lpEquityPct').add('hurdles.gpEquityPct'));
    const boundedLp = Math.max(0, Math.min(100, lp));
    const balancedGp = Number((100 - boundedLp).toFixed(2));
    setValues((prev) => ({
      ...prev,
      hurdles: {
        ...prev.hurdles,
        lpEquityPct: boundedLp,
        gpEquityPct: balancedGp,
      },
    }));
  }, []);

  const handleGpEquityPctChange = useCallback((gp: number) => {
    setDirtyFields((prev) => new Set(prev).add('hurdles.lpEquityPct').add('hurdles.gpEquityPct'));
    const boundedGp = Math.max(0, Math.min(100, gp));
    const balancedLp = Number((100 - boundedGp).toFixed(2));
    setValues((prev) => ({
      ...prev,
      hurdles: {
        ...prev.hurdles,
        gpEquityPct: boundedGp,
        lpEquityPct: balancedLp,
      },
    }));
  }, []);

  const handleToggleTier2 = useCallback(() => {
    setShowTier2((prev) => {
      const next = !prev;
      if (!next) {
        setValues((current) => ({
          ...current,
          hurdles: {
            ...current.hurdles,
            hurdle2Irr: undefined,
            gpPromote2Pct: undefined,
          },
        }));
      } else {
        setValues((current) => ({
          ...current,
          hurdles: {
            ...current.hurdles,
            hurdle2Irr: current.hurdles.hurdle2Irr ?? 15,
            gpPromote2Pct: current.hurdles.gpPromote2Pct ?? 30,
          },
        }));
      }
      return next;
    });
  }, []);

  // Quick headline estimates
  const headlineEstimates = useMemo(() => {
    const { purchasePrice, buyerClosingCosts, rehabBudget } = values.acquisition;
    const totalBasis = purchasePrice + buyerClosingCosts + rehabBudget;
    const { grossScheduledRent, vacancyRate, operatingExpenseRatio } = values.rentRoll;
    const annualGrossRent = grossScheduledRent * 12;
    const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate / 100);
    const annualOpEx = annualGrossRent * (operatingExpenseRatio / 100);
    const estimatedNOI = Math.max(0, effectiveGrossIncome - annualOpEx);
    const quickCapRate = purchasePrice > 0 ? (estimatedNOI / purchasePrice) * 100 : 0;

    // Monthly PMT approximation
    const principal = values.debt.loanAmount;
    const rate = values.debt.interestRate / 100 / 12;
    const n = values.debt.amortizationYears * 12;
    let monthlyPmt = 0;
    if (principal > 0 && n > 0) {
      monthlyPmt =
        rate > 0
          ? (principal * (rate * Math.pow(1 + rate, n))) / (Math.pow(1 + rate, n) - 1)
          : principal / n;
    }
    const annualDebtService = monthlyPmt * 12;
    const estimatedDSCR = annualDebtService > 0 ? estimatedNOI / annualDebtService : 0;

    return {
      totalBasis,
      estimatedNOI,
      quickCapRate: quickCapRate.toFixed(2),
      monthlyPmt: Math.round(monthlyPmt),
      annualDebtService: Math.round(annualDebtService),
      estimatedDSCR: estimatedDSCR.toFixed(2),
    };
  }, [values]);

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isValid || !onSave) return;
    await onSave(values);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Live Financial Engine Quick-Bar */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#00DD94]">
              calculate
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Underwriting Pro-Forma Summary
            </h3>
          </div>
          {isDirty && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#00DD94]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#00DD94]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00DD94] animate-pulse" />
              Unsaved refinements
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/45">Total Basis</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-white tabular-nums">
              ${headlineEstimates.totalBasis.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/45">Est. NOI (Y1)</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-white tabular-nums">
              ${Math.round(headlineEstimates.estimatedNOI).toLocaleString()}/yr
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/45">Quick Cap Rate</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-[#00DD94] tabular-nums">
              {headlineEstimates.quickCapRate}%
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/45">Monthly Debt</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-white tabular-nums">
              ${headlineEstimates.monthlyPmt.toLocaleString()}/mo
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/45">Est. DSCR</span>
            <p
              className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${
                Number(headlineEstimates.estimatedDSCR) >= 1.25 ? 'text-[#00DD94]' : 'text-amber-400'
              }`}
            >
              {headlineEstimates.estimatedDSCR}x
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/45">LTV / Debt</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-white tabular-nums">
              {values.debt.targetLTV}% / ${values.debt.loanAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. ACQUISITION */}
        <section className="rounded-2xl border border-white/10 bg-[#141216] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DD94]">
                Phase 1 — Sourcing & Intake
              </span>
              <h2 className="text-base font-bold text-white">Acquisition Basis</h2>
            </div>
            <span className="text-xs text-white/45">4 Metrics</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Purchase Price */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">
                  Gross Purchase Price <span className="text-[#00DD94]">*</span>
                </label>
                {!dirtyFields.has('acquisition.purchasePrice') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-white/40">
                  $
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  step={1000}
                  value={values.acquisition.purchasePrice}
                  onChange={(e) => updateField('acquisition.purchasePrice', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-4 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
              {errors['acquisition.purchasePrice'] && (
                <p className="mt-1 text-[11px] text-red-400">{errors['acquisition.purchasePrice']}</p>
              )}
            </div>

            {/* Buyer Closing Costs */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">
                  Buyer Closing Costs (2% default)
                </label>
                {!dirtyFields.has('acquisition.buyerClosingCosts') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-white/40">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={values.acquisition.buyerClosingCosts}
                  onChange={(e) => updateField('acquisition.buyerClosingCosts', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-4 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
            </div>

            {/* Rehab Budget */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">
                  Rehab Budget ($0 allowed)
                </label>
                {!dirtyFields.has('acquisition.rehabBudget') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-white/40">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={values.acquisition.rehabBudget}
                  onChange={(e) => updateField('acquisition.rehabBudget', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-4 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
            </div>

            {/* After Repair Value (ARV) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">
                  Estimated After Repair Value (ARV)
                </label>
                {!dirtyFields.has('acquisition.estimatedARV') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-white/40">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={values.acquisition.estimatedARV ?? ''}
                  placeholder="e.g. 620000"
                  onChange={(e) => updateField('acquisition.estimatedARV', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-4 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. RENT ROLL & OPERATIONS */}
        <section className="rounded-2xl border border-white/10 bg-[#141216] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DD94]">
                Phase 2 — Cash Flow & Operations
              </span>
              <h2 className="text-base font-bold text-white">Rent Roll &amp; Operating Expenses</h2>
            </div>
            <span className="text-xs text-white/45">4 Metrics</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Gross Scheduled Rent */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">
                  Gross Scheduled Rent <span className="text-[#00DD94]">*</span>
                </label>
                {!dirtyFields.has('rentRoll.grossScheduledRent') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-white/40">
                  $
                </span>
                <input
                  type="number"
                  required
                  min={0}
                  step={100}
                  value={values.rentRoll.grossScheduledRent}
                  onChange={(e) => updateField('rentRoll.grossScheduledRent', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-16 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  /month
                </span>
              </div>
            </div>

            {/* Other Income */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Other Monthly Income</label>
                {!dirtyFields.has('rentRoll.otherIncome') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-white/40">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={values.rentRoll.otherIncome ?? 0}
                  onChange={(e) => updateField('rentRoll.otherIncome', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-16 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  /month
                </span>
              </div>
            </div>

            {/* Vacancy Rate */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Vacancy Rate</label>
                {!dirtyFields.has('rentRoll.vacancyRate') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={values.rentRoll.vacancyRate}
                  onChange={(e) => updateField('rentRoll.vacancyRate', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  %
                </span>
              </div>
            </div>

            {/* Operating Expense Ratio */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">
                  Operating Expense Ratio (OER)
                </label>
                {!dirtyFields.has('rentRoll.operatingExpenseRatio') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={values.rentRoll.operatingExpenseRatio}
                  onChange={(e) => updateField('rentRoll.operatingExpenseRatio', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  %
                </span>
              </div>
              <p className="mt-1 text-[10px] text-white/45">
                Includes property taxes, insurance, management, repairs, turnover, and utilities.
              </p>
            </div>
          </div>
        </section>

        {/* 3. DEBT & CAPITAL STACK */}
        <section className="rounded-2xl border border-white/10 bg-[#141216] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DD94]">
                Phase 3 — Debt Sizing & Capital Stack
              </span>
              <h2 className="text-base font-bold text-white">Financing &amp; Loan Terms</h2>
            </div>
            <span className="text-xs text-white/45">Bidirectional LTV Sync</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Target LTV */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Target Loan-to-Value (LTV)</label>
                {!dirtyFields.has('debt.targetLTV') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={values.debt.targetLTV}
                  onChange={(e) => handleLtvChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  %
                </span>
              </div>
            </div>

            {/* Loan Amount */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Loan Amount (Synced with LTV)</label>
                {!dirtyFields.has('debt.loanAmount') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-white/40">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={values.debt.loanAmount}
                  onChange={(e) => handleLoanAmountChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-4 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
            </div>

            {/* Rate Type & Interest Rate */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Interest Rate Type</label>
                <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
                  <button
                    type="button"
                    onClick={() => updateField('debt.interestRateType', 'fixed')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      values.debt.interestRateType === 'fixed'
                        ? 'bg-[#00DD94] text-[#0a0a0f]'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateField('debt.interestRateType', 'floating');
                      handleFloatingRateChange(values.debt.floatingIndex ?? 'SOFR', values.debt.floatingSpreadBps ?? 250);
                    }}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      values.debt.interestRateType === 'floating'
                        ? 'bg-[#00DD94] text-[#0a0a0f]'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Floating
                  </button>
                </div>
              </div>

              {values.debt.interestRateType === 'fixed' ? (
                <div className="relative mt-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.125}
                    value={values.debt.interestRate}
                    onChange={(e) => updateField('debt.interestRate', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:border-[#00DD94] focus:outline-none"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                    %
                  </span>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    value={values.debt.floatingIndex ?? 'SOFR'}
                    onChange={(e) =>
                      handleFloatingRateChange(
                        e.target.value as 'SOFR' | 'Prime',
                        values.debt.floatingSpreadBps ?? 250,
                      )
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="SOFR" className="bg-slate-950">
                      SOFR (5.30%)
                    </option>
                    <option value="Prime" className="bg-slate-950">
                      Prime (8.50%)
                    </option>
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      step={25}
                      value={values.debt.floatingSpreadBps ?? 250}
                      onChange={(e) =>
                        handleFloatingRateChange(
                          values.debt.floatingIndex ?? 'SOFR',
                          Number(e.target.value),
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-3 pr-10 font-mono text-xs text-white focus:outline-none"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] text-white/40">
                      bps
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Amortization & Balloon Term */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Amortization &amp; Balloon Term</label>
                {!dirtyFields.has('debt.amortizationYears') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={values.debt.amortizationYears}
                    onChange={(e) => updateField('debt.amortizationYears', Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-3 pr-12 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] text-white/40">
                    yrs amort
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    placeholder="Balloon (opt)"
                    value={values.debt.balloonTermYears ?? ''}
                    onChange={(e) =>
                      updateField(
                        'debt.balloonTermYears',
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-3 pr-12 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] text-white/40">
                    yr balloon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. EXIT & PROJECTION */}
        <section className="rounded-2xl border border-white/10 bg-[#141216] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DD94]">
                Phase 4 — Disposition & Growth
              </span>
              <h2 className="text-base font-bold text-white">Exit Assumptions</h2>
            </div>
            <span className="text-xs text-white/45">5 Parameters</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Hold Period</label>
                {!dirtyFields.has('exit.holdPeriodYears') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={values.exit.holdPeriodYears}
                  onChange={(e) => updateField('exit.holdPeriodYears', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-12 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  years
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Exit Cap Rate</label>
                {!dirtyFields.has('exit.exitCapRate') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0.1}
                  max={20}
                  step={0.25}
                  value={values.exit.exitCapRate}
                  onChange={(e) => updateField('exit.exitCapRate', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  %
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Annual Rent Growth</label>
                {!dirtyFields.has('exit.annualRentGrowth') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={values.exit.annualRentGrowth}
                  onChange={(e) => updateField('exit.annualRentGrowth', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  %
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Annual Expense Growth</label>
                {!dirtyFields.has('exit.annualExpenseGrowth') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={values.exit.annualExpenseGrowth}
                  onChange={(e) => updateField('exit.annualExpenseGrowth', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  %
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Cost of Sale</label>
                {!dirtyFields.has('exit.costOfSale') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.5}
                  value={values.exit.costOfSale}
                  onChange={(e) => updateField('exit.costOfSale', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  %
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HURDLES & SENSITIVITY */}
        <section className="rounded-2xl border border-white/10 bg-[#141216] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DD94]">
                Phase 4 — Underwriting Hurdle Gates
              </span>
              <h2 className="text-base font-bold text-white">Hurdles &amp; Stress Tests</h2>
            </div>
            <span className="text-xs text-white/45">Institutional Constraints</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Minimum DSCR Hurdle</label>
                {!dirtyFields.has('hurdles.minDSCR') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0.5}
                  max={3}
                  step={0.05}
                  value={values.hurdles.minDSCR}
                  onChange={(e) => updateField('hurdles.minDSCR', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  x
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80">Exit Cap Sensitivity Step</label>
                {!dirtyFields.has('hurdles.exitCapSensitivityBps') && (
                  <span className="text-[10px] font-medium text-white/40">Default — edit to refine</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={5}
                  max={100}
                  step={5}
                  value={values.hurdles.exitCapSensitivityBps}
                  onChange={(e) => updateField('hurdles.exitCapSensitivityBps', Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                  bps
                </span>
              </div>
            </div>

            {/* Waterfall & Promote Structure Group */}
            <div className="col-span-full mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Waterfall &amp; Promote Structure</h3>
                  <p className="text-[11px] text-white/50">
                    Syndication equity split and profit hurdle gates (GP / LP / Operator alignment)
                  </p>
                </div>
                {errors['hurdles.lpEquityPct'] && (
                  <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-400">
                    {errors['hurdles.lpEquityPct']}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* LP Equity % */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white/80">LP Equity Share</label>
                    <span className="text-[10px] text-white/40">Auto-balanced</span>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={values.hurdles.lpEquityPct ?? 90}
                      onChange={(e) => handleLpEquityPctChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none focus:border-[#00DD94]"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                      %
                    </span>
                  </div>
                </div>

                {/* GP Equity % */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white/80">GP Co-Invest Share</label>
                    <span className="text-[10px] text-white/40">Auto-balanced</span>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={values.hurdles.gpEquityPct ?? 10}
                      onChange={(e) => handleGpEquityPctChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none focus:border-[#00DD94]"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                      %
                    </span>
                  </div>
                </div>

                {/* Preferred Return */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white/80">Preferred Return (LP)</label>
                    {!dirtyFields.has('hurdles.preferredReturn') && (
                      <span className="text-[10px] font-medium text-white/40">Default</span>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={25}
                      step={0.5}
                      value={values.hurdles.preferredReturn ?? 8}
                      onChange={(e) => updateField('hurdles.preferredReturn', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                      %
                    </span>
                  </div>
                </div>

                {/* GP Promote % */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white/80">Tier 1 GP Promote</label>
                    {!dirtyFields.has('hurdles.gpPromotePct') && (
                      <span className="text-[10px] font-medium text-white/40">Default</span>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={values.hurdles.gpPromotePct ?? 20}
                      onChange={(e) => updateField('hurdles.gpPromotePct', Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Tier 2 Promotes & Collapsible */}
              <div className="mt-4 border-t border-white/5 pt-3">
                {showTier2 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#00DD94]">Tier 2 Promote Hurdle (Active)</span>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        onClick={handleToggleTier2}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        - Remove Tier 2
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-white/80">Tier 2 Hurdle IRR</label>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            step={0.5}
                            value={values.hurdles.hurdle2Irr ?? 15}
                            onChange={(e) => updateField('hurdles.hurdle2Irr', Number(e.target.value))}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                            % IRR
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/80">Tier 2 GP Promote</label>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={values.hurdles.gpPromote2Pct ?? 30}
                            onChange={(e) => updateField('hurdles.gpPromote2Pct', Number(e.target.value))}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-10 font-mono text-sm font-semibold tabular-nums text-white focus:outline-none"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-white/40">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={handleToggleTier2}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    + Add Promote Tier 2
                  </Button>
                )}
              </div>

              {/* Display Notes */}
              <div className="mt-4 border-t border-white/5 pt-3">
                <label className="text-xs font-semibold text-white/80">
                  Waterfall Notes &amp; Legal Structure
                </label>
                <input
                  type="text"
                  value={values.hurdles.equityRequiredGpVsLp ?? '10% GP / 90% LP'}
                  onChange={(e) => updateField('hurdles.equityRequiredGpVsLp', e.target.value)}
                  placeholder="e.g. 10% GP Co-invest / 90% LP Syndicate with 8% pref"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Edit surface save button */}
        {mode === 'edit' && onSave && (
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00DD94]">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Underwriting inputs saved &amp; KPIs recomputed!
                </span>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!isValid || isSaving}
              loading={isSaving}
              onClick={handleSave}
              icon={<span className="material-symbols-outlined text-[18px]">save</span>}
            >
              Save &amp; Recompute KPIs
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
