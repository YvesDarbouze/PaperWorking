'use client';

import React, { useState } from 'react';
import type {
  ExitStrategyRoute,
  StateTransferTaxOverride,
} from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import { resolveStateTransferTax, STATE_TRANSFER_TAX_RATES } from './types';
import {
  Calculator,
  SlidersHorizontal,
  Bank,
  Receipt,
  Scales,
} from '@/components/icons/PhosphorIcons';

interface ExitValuationFinancialBaselineCardProps {
  selectedRoute: ExitStrategyRoute;
  propertyState: string;
  grossRealization: number;
  brokerCommissionPct: number;
  closingCostPct: number;
  debtPayoffAmount: number;
  proratedTaxes: number;
  stateTransferTax: StateTransferTaxOverride;
  onUpdateGrossRealization: (val: number) => void;
  onUpdateBrokerCommissionPct: (val: number) => void;
  onUpdateClosingCostPct: (val: number) => void;
  onUpdateDebtPayoff: (val: number) => void;
  onUpdateProratedTaxes: (val: number) => void;
  onUpdateStateTransferTax: (override: StateTransferTaxOverride) => void;
}

export default function ExitValuationFinancialBaselineCard({
  selectedRoute,
  propertyState,
  grossRealization,
  brokerCommissionPct,
  closingCostPct,
  debtPayoffAmount,
  proratedTaxes,
  stateTransferTax,
  onUpdateGrossRealization,
  onUpdateBrokerCommissionPct,
  onUpdateClosingCostPct,
  onUpdateDebtPayoff,
  onUpdateProratedTaxes,
  onUpdateStateTransferTax,
}: ExitValuationFinancialBaselineCardProps) {
  const [isEditingOverride, setIsEditingOverride] = useState(false);

  // Compute state transfer tax
  const effectiveTransferTaxRate = stateTransferTax.isCustomOverrideActive && stateTransferTax.customRatePct !== undefined
    ? stateTransferTax.customRatePct
    : stateTransferTax.statutoryRatePct;

  const totalTransferTax = (grossRealization * effectiveTransferTaxRate) / 100;
  const sellerTransferTaxPortion =
    stateTransferTax.paidBy === 'seller'
      ? totalTransferTax
      : stateTransferTax.paidBy === 'split_50_50'
      ? totalTransferTax * 0.5
      : 0;

  const brokerCommissionAmount = (grossRealization * brokerCommissionPct) / 100;
  const sellerClosingCostsAmount = (grossRealization * closingCostPct) / 100;
  const totalClosingFriction =
    brokerCommissionAmount + sellerClosingCostsAmount + sellerTransferTaxPortion + proratedTaxes + stateTransferTax.recordingFeeFlat;

  const netSalesProceeds = grossRealization - totalClosingFriction - debtPayoffAmount;

  const handleStateChange = (stateCode: string) => {
    const benchmark = resolveStateTransferTax(stateCode);
    onUpdateStateTransferTax({
      stateCode: benchmark.stateCode,
      stateName: benchmark.stateName,
      statutoryRatePct: benchmark.statutoryRatePct,
      paidBy: benchmark.paidByDefault,
      recordingFeeFlat: benchmark.recordingFeeFlat,
      isCustomOverrideActive: false,
      notes: benchmark.notes,
    });
  };

  return (
    <article
      data-testid="exit-valuation-financial-baseline-card"
      className="rounded-none border border-border bg-card p-5 md:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-foreground">
              Task 03 · Valuation & Financial Baseline
            </span>
            <span className="text-xs text-muted-foreground">50-State Statutory Closing Friction Engine</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1">
            Valuation Inputs & Net Sales Proceeds
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Model headline purchase offers, title transfer taxes, broker commissions, and senior debt payoffs to determine certified net cash proceeds.
          </p>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Net Proceeds to Equity</span>
          <span className="text-lg font-bold text-primary" data-testid="live-net-proceeds-display">
            {formatCurrency(netSalesProceeds)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Exit Valuation Input */}
        <div className="space-y-1.5 rounded-none border border-border bg-muted/10 p-3.5">
          <label className="block text-xs font-semibold text-foreground">
            {selectedRoute === 'refinance_retain' ? 'Appraised Refinance Valuation' : 'Gross Offer / Exit Price'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">$</span>
            <input
              type="number"
              step={1000}
              value={grossRealization}
              data-testid="gross-exit-valuation-input"
              onChange={(e) => onUpdateGrossRealization(Number(e.target.value) || 0)}
              className="w-full min-h-[44px] rounded-none border border-border bg-card pl-7 pr-3 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {selectedRoute === 'condo_selloff' ? 'Sum of all unit tranche prices' : 'Buyer executed purchase contract sum'}
          </p>
        </div>

        {/* Broker Commission % */}
        <div className="space-y-1.5 rounded-none border border-border bg-muted/10 p-3.5">
          <label className="block text-xs font-semibold text-foreground">
            Broker Commission ({brokerCommissionPct}%)
          </label>
          <div className="relative">
            <input
              type="number"
              step={0.25}
              min={0}
              max={10}
              value={brokerCommissionPct}
              data-testid="broker-commission-input"
              onChange={(e) => onUpdateBrokerCommissionPct(Number(e.target.value) || 0)}
              className="w-full min-h-[44px] rounded-none border border-border bg-card px-3 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            {formatCurrency(brokerCommissionAmount)} fee allocation
          </p>
        </div>

        {/* Senior Debt Payoff Demand */}
        <div className="space-y-1.5 rounded-none border border-border bg-muted/10 p-3.5">
          <label className="block text-xs font-semibold text-foreground">
            Senior Debt Payoff Demand
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">$</span>
            <input
              type="number"
              step={1000}
              value={debtPayoffAmount}
              data-testid="debt-payoff-input"
              onChange={(e) => onUpdateDebtPayoff(Number(e.target.value) || 0)}
              className="w-full min-h-[44px] rounded-none border border-border bg-card pl-7 pr-3 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Includes principal + accrued interest
          </p>
        </div>

        {/* Prorated Property Taxes & Escrows */}
        <div className="space-y-1.5 rounded-none border border-border bg-muted/10 p-3.5">
          <label className="block text-xs font-semibold text-foreground">
            Prorated Taxes &amp; Escrows
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">$</span>
            <input
              type="number"
              step={100}
              value={proratedTaxes}
              data-testid="prorated-taxes-input"
              onChange={(e) => onUpdateProratedTaxes(Number(e.target.value) || 0)}
              className="w-full min-h-[44px] rounded-none border border-border bg-card pl-7 pr-3 py-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Seller credit to buyer for unpaid taxes
          </p>
        </div>
      </div>

      {/* 50-State Transfer Tax & Legal Closing Fee Engine */}
      <div className="rounded-none border border-border bg-muted/20 p-4 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Scales size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">
              State Deed Transfer Tax Engine ({stateTransferTax.stateName})
            </h3>
            {stateTransferTax.isCustomOverrideActive && (
              <span className="rounded-none bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-400">
                Custom Override Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={stateTransferTax.stateCode}
              onChange={(e) => handleStateChange(e.target.value)}
              className="min-h-[38px] rounded-none border border-border bg-card px-2.5 py-1 text-xs font-mono font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              {Object.keys(STATE_TRANSFER_TAX_RATES).map((st) => (
                <option key={st} value={st}>
                  {st} · {STATE_TRANSFER_TAX_RATES[st].stateName} ({STATE_TRANSFER_TAX_RATES[st].statutoryRatePct}%)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsEditingOverride(!isEditingOverride)}
              className="min-h-[38px] px-3 py-1 text-xs font-semibold rounded-none border border-border bg-muted/40 hover:bg-muted text-foreground transition"
            >
              {isEditingOverride ? 'Close Overrides' : 'Edit Allocation'}
            </button>
          </div>
        </div>

        {/* State Transfer Tax Breakdown Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Statutory Rate</span>
            <span className="text-foreground font-semibold">
              {effectiveTransferTaxRate.toFixed(3)}% ({Math.round(effectiveTransferTaxRate * 100)} bps)
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Responsible Party</span>
            <span className="text-foreground font-semibold capitalize">
              {stateTransferTax.paidBy === 'split_50_50' ? '50/50 Split' : stateTransferTax.paidBy}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Seller Tax Share</span>
            <span className="text-primary font-bold">
              {formatCurrency(sellerTransferTaxPortion)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Recording Fee Flat</span>
            <span className="text-foreground font-semibold">
              ${stateTransferTax.recordingFeeFlat}
            </span>
          </div>
        </div>

        {/* Inline Override Form Drawer */}
        {isEditingOverride && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card p-3 rounded-none">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Custom Tax Rate (%)
              </label>
              <input
                type="number"
                step={0.01}
                value={stateTransferTax.customRatePct ?? stateTransferTax.statutoryRatePct}
                onChange={(e) =>
                  onUpdateStateTransferTax({
                    ...stateTransferTax,
                    customRatePct: Number(e.target.value) || 0,
                    isCustomOverrideActive: true,
                  })
                }
                className="w-full min-h-[38px] rounded-none border border-border bg-muted/20 px-2.5 py-1 text-xs font-mono text-foreground"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Paid By Allocation
              </label>
              <select
                value={stateTransferTax.paidBy}
                onChange={(e) =>
                  onUpdateStateTransferTax({
                    ...stateTransferTax,
                    paidBy: e.target.value as any,
                  })
                }
                className="w-full min-h-[38px] rounded-none border border-border bg-muted/20 px-2.5 py-1 text-xs text-foreground"
              >
                <option value="seller">Seller Pays 100%</option>
                <option value="buyer">Buyer Pays 100%</option>
                <option value="split_50_50">50/50 Customary Split</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Recording Fee ($)
              </label>
              <input
                type="number"
                value={stateTransferTax.recordingFeeFlat}
                onChange={(e) =>
                  onUpdateStateTransferTax({
                    ...stateTransferTax,
                    recordingFeeFlat: Number(e.target.value) || 0,
                  })
                }
                className="w-full min-h-[38px] rounded-none border border-border bg-muted/20 px-2.5 py-1 text-xs font-mono text-foreground"
              />
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Benchmark Note: {stateTransferTax.notes || 'Standard statutory county transfer fee applies.'}
        </p>
      </div>

      {/* Closing Proceeds Waterline Summary */}
      <div className="rounded-none border border-border bg-card p-4 space-y-2 text-xs">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Receipt size={16} className="text-primary" />
          <span>Settlement Waterline Summary</span>
        </h3>
        <div className="space-y-1.5 font-mono text-xs pt-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Gross Realization</span>
            <span className="text-foreground font-semibold">{formatCurrency(grossRealization)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Less Broker Commissions ({brokerCommissionPct}%)</span>
            <span className="text-red-400 font-semibold">-{formatCurrency(brokerCommissionAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Less Closing &amp; Escrow Fees ({closingCostPct}%)</span>
            <span className="text-red-400 font-semibold">-{formatCurrency(sellerClosingCostsAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Less State &amp; County Deed Transfer Tax</span>
            <span className="text-red-400 font-semibold">-{formatCurrency(sellerTransferTaxPortion)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Less Prorated Taxes &amp; Recording</span>
            <span className="text-red-400 font-semibold">-{formatCurrency(proratedTaxes + stateTransferTax.recordingFeeFlat)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Less Senior Mortgage Debt Payoff</span>
            <span className="text-red-400 font-semibold">-{formatCurrency(debtPayoffAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
            <span>Certified Net Sales Proceeds to Equity</span>
            <span className="text-primary font-mono">{formatCurrency(netSalesProceeds)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
