'use client';

import React from 'react';
import type { InvestmentStrategyType } from './StrategySelectorBar';

interface StrategyInputsPanelProps {
  strategy: InvestmentStrategyType;
  inputs: {
    // STR
    averageDailyRate: number;
    occupancyRatePct: number;
    cleaningFeePerStay: number;
    averageStayNights: number;
    cleaningCostPerStay: number;
    platformFeePct: number;
    strFurnishingCapex: number;
    // Flip
    holdPeriodYears: number;
    sellingCostsPct: number;
    // BRRRR
    refinanceMonthsAfterClose: number;
    refinanceLtvPct: number;
    refinanceInterestRatePct: number;
    refinanceAmortizationYears: number;
    refinanceClosingCostsPct: number;
    postRefiGrossMonthlyRent?: number;
    postRefiMonthlyOperatingExpenses?: number;
    // Commercial
    unitsCount?: number;
    commercialSqft: number;
    marketCapRatePct: number;
    // Wholesale
    contractPurchasePrice: number;
    targetAssignmentFee: number;
    isDoubleClosing: boolean;
    doubleClosingEscrowFees: number;
  };
  onInputChange: (field: string, value: any) => void;
}

export default function StrategyInputsPanel({
  strategy,
  inputs,
  onInputChange,
}: StrategyInputsPanelProps) {
  if (strategy === 'buy_and_hold_rental') {
    // Long term rental uses standard acquisition inputs
    return null;
  }

  return (
    <div
      data-testid="strategy-specific-inputs-panel"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[color:var(--color-primary)]">
            tune
          </span>
          <span>
            {strategy === 'short_term_rental_airbnb' && 'Short-Term Rental (Airbnb) Assumptions'}
            {strategy === 'flip' && 'Fix & Flip Timing & Holding Assumptions'}
            {strategy === 'brrrr' && 'BRRRR Refinance Timeline & Exit Loan'}
            {strategy === 'commercial_value_add' && 'Commercial & Multi-Family Density'}
            {strategy === 'wholesale' && 'Wholesale Contract & Assignment Parameters'}
          </span>
        </h2>
        <span className="text-[10px] font-mono text-emerald-400">
          Strategy Specific
        </span>
      </div>

      {/* STR Inputs */}
      {strategy === 'short_term_rental_airbnb' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div>
            <label htmlFor="str-average-daily-rate" className="block text-[11px] font-medium text-white/50 mb-1">
              Average Daily Rate (ADR) ($) *
            </label>
            <input
              id="str-average-daily-rate"
              type="number"
              value={inputs.averageDailyRate}
              onChange={(e) => onInputChange('averageDailyRate', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="str-occupancy-rate-pct" className="block text-[11px] font-medium text-white/50 mb-1">
              Occupancy Rate (%) *
            </label>
            <input
              id="str-occupancy-rate-pct"
              type="number"
              value={inputs.occupancyRatePct}
              onChange={(e) => onInputChange('occupancyRatePct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="str-furnishing-capex" className="block text-[11px] font-medium text-white/50 mb-1">
              Furnishing Capex ($)
            </label>
            <input
              id="str-furnishing-capex"
              type="number"
              value={inputs.strFurnishingCapex}
              onChange={(e) => onInputChange('strFurnishingCapex', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="str-cleaning-fee-per-stay" className="block text-[11px] font-medium text-white/50 mb-1">
              Cleaning Fee to Guest ($)
            </label>
            <input
              id="str-cleaning-fee-per-stay"
              type="number"
              value={inputs.cleaningFeePerStay}
              onChange={(e) => onInputChange('cleaningFeePerStay', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="str-cleaning-cost-per-stay" className="block text-[11px] font-medium text-white/50 mb-1">
              Cleaning Cost to Cleaner ($)
            </label>
            <input
              id="str-cleaning-cost-per-stay"
              type="number"
              value={inputs.cleaningCostPerStay}
              onChange={(e) => onInputChange('cleaningCostPerStay', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="str-average-stay-nights" className="block text-[11px] font-medium text-white/50 mb-1">
              Avg Stay Length (Nights)
            </label>
            <input
              id="str-average-stay-nights"
              type="number"
              step="0.5"
              value={inputs.averageStayNights}
              onChange={(e) => onInputChange('averageStayNights', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* Flip Inputs */}
      {strategy === 'flip' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div>
            <label htmlFor="flip-hold-duration-months" className="block text-[11px] font-medium text-white/50 mb-1">
              Projected Hold Duration (Months) *
            </label>
            <input
              id="flip-hold-duration-months"
              type="number"
              value={Math.round(inputs.holdPeriodYears * 12)}
              onChange={(e) => onInputChange('holdPeriodYears', Number(e.target.value) / 12)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="flip-selling-costs-pct" className="block text-[11px] font-medium text-white/50 mb-1">
              Selling Costs at Exit (%) *
            </label>
            <input
              id="flip-selling-costs-pct"
              type="number"
              step="0.5"
              value={inputs.sellingCostsPct}
              onChange={(e) => onInputChange('sellingCostsPct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* BRRRR Inputs */}
      {strategy === 'brrrr' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div>
            <label htmlFor="brrrr-refi-timeline-months" className="block text-[11px] font-medium text-white/50 mb-1">
              Refi Timeline (Months After Close) *
            </label>
            <input
              id="brrrr-refi-timeline-months"
              type="number"
              value={inputs.refinanceMonthsAfterClose}
              onChange={(e) => onInputChange('refinanceMonthsAfterClose', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="brrrr-refi-ltv-pct" className="block text-[11px] font-medium text-white/50 mb-1">
              Refinance LTV (%) *
            </label>
            <input
              id="brrrr-refi-ltv-pct"
              type="number"
              value={inputs.refinanceLtvPct}
              onChange={(e) => onInputChange('refinanceLtvPct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="brrrr-refi-interest-rate-pct" className="block text-[11px] font-medium text-white/50 mb-1">
              Refinance Interest Rate (%) *
            </label>
            <input
              id="brrrr-refi-interest-rate-pct"
              type="number"
              step="0.125"
              value={inputs.refinanceInterestRatePct}
              onChange={(e) => onInputChange('refinanceInterestRatePct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="brrrr-refi-amortization-years" className="block text-[11px] font-medium text-white/50 mb-1">
              Refi Amortization (Years)
            </label>
            <input
              id="brrrr-refi-amortization-years"
              type="number"
              value={inputs.refinanceAmortizationYears}
              onChange={(e) => onInputChange('refinanceAmortizationYears', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="brrrr-refi-closing-costs-pct" className="block text-[11px] font-medium text-white/50 mb-1">
              Refi Closing Costs (%)
            </label>
            <input
              id="brrrr-refi-closing-costs-pct"
              type="number"
              step="0.5"
              value={inputs.refinanceClosingCostsPct}
              onChange={(e) => onInputChange('refinanceClosingCostsPct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="brrrr-post-refi-gross-rent" className="block text-[11px] font-medium text-white/50 mb-1">
              Post-Refi Gross Rent ($)
            </label>
            <input
              id="brrrr-post-refi-gross-rent"
              type="number"
              value={inputs.postRefiGrossMonthlyRent ?? ''}
              placeholder="Leave empty to use base rent"
              onChange={(e) => onInputChange('postRefiGrossMonthlyRent', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* Commercial Inputs */}
      {strategy === 'commercial_value_add' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div>
            <label htmlFor="commercial-units-count" className="block text-[11px] font-medium text-white/50 mb-1">
              Total Units Count *
            </label>
            <input
              id="commercial-units-count"
              type="number"
              min="1"
              value={inputs.unitsCount ?? 1}
              onChange={(e) => onInputChange('unitsCount', Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="commercial-sqft" className="block text-[11px] font-medium text-white/50 mb-1">
              Rentable Commercial SqFt *
            </label>
            <input
              id="commercial-sqft"
              type="number"
              value={inputs.commercialSqft}
              onChange={(e) => onInputChange('commercialSqft', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="commercial-market-cap-rate-pct" className="block text-[11px] font-medium text-white/50 mb-1">
              Market Cap Rate (%) *
            </label>
            <input
              id="commercial-market-cap-rate-pct"
              type="number"
              step="0.25"
              value={inputs.marketCapRatePct}
              onChange={(e) => onInputChange('marketCapRatePct', Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* Wholesale Inputs */}
      {strategy === 'wholesale' && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="wholesale-contract-purchase-price" className="block text-[11px] font-medium text-white/50 mb-1">
                Contract Purchase Price ($) *
              </label>
              <input
                id="wholesale-contract-purchase-price"
                type="number"
                value={inputs.contractPurchasePrice}
                onChange={(e) => onInputChange('contractPurchasePrice', Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="wholesale-target-assignment-fee" className="block text-[11px] font-medium text-white/50 mb-1">
                Target Assignment Fee ($) *
              </label>
              <input
                id="wholesale-target-assignment-fee"
                type="number"
                value={inputs.targetAssignmentFee}
                onChange={(e) => onInputChange('targetAssignmentFee', Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white font-semibold focus:outline-none focus:border-[color:var(--color-primary)] min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label htmlFor="wholesale-is-double-closing" className="flex items-center gap-2 cursor-pointer">
              <input
                id="wholesale-is-double-closing"
                type="checkbox"
                checked={inputs.isDoubleClosing}
                onChange={(e) => onInputChange('isDoubleClosing', e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-white/80 text-xs">
                Use Double Closing (A-to-B then B-to-C simultaneous escrow)
              </span>
            </label>

            {inputs.isDoubleClosing && (
              <div className="flex items-center gap-2">
                <label htmlFor="wholesale-double-closing-fees" className="text-[11px] text-white/50">Escrow/Title Fees:</label>
                <input
                  id="wholesale-double-closing-fees"
                  type="number"
                  value={inputs.doubleClosingEscrowFees}
                  onChange={(e) => onInputChange('doubleClosingEscrowFees', Number(e.target.value))}
                  className="w-24 rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-right font-mono text-white focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
