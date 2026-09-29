'use client';

import React from 'react';
import type {
  TaxAccountingReconciliation,
  PartnerWaterfallDistribution,
} from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import {
  Scales,
  ChartPieSlice,
  Receipt,
  Users,
  Coin,
} from '@/components/icons/PhosphorIcons';

interface ExitTaxAccountingWaterfallCardProps {
  grossRealization: number;
  totalClosingFees: number;
  netSalesProceeds: number;
  purchasePrice: number;
  rehabActual: number;
  originalDebt: number;
  is1031Exchange: boolean;
  taxAccounting?: TaxAccountingReconciliation;
  onUpdateTaxAccounting?: (updated: TaxAccountingReconciliation) => void;
}

export default function ExitTaxAccountingWaterfallCard({
  grossRealization,
  totalClosingFees,
  netSalesProceeds,
  purchasePrice,
  rehabActual,
  originalDebt,
  is1031Exchange,
}: ExitTaxAccountingWaterfallCardProps) {
  // Tax basis calculations
  const totalCapitalInvested = (purchasePrice - originalDebt) + rehabActual + 15000;
  const buildingBasis = Math.round(purchasePrice * 0.80); // Land is ~20%, non-depreciable
  const holdYears = 1.5; // Canonical average holding duration in years
  const cumulativeDepreciation = Math.round((buildingBasis / 27.5) * holdYears);
  const adjustedCostBasis = purchasePrice + rehabActual - cumulativeDepreciation;
  const netSellingPrice = grossRealization - totalClosingFees;
  const totalGainOnSale = Math.max(0, netSellingPrice - adjustedCostBasis);
  const depreciationRecaptureAmount = Math.min(cumulativeDepreciation, totalGainOnSale);
  const federalDepreciationRecaptureTax = is1031Exchange ? 0 : Math.round(depreciationRecaptureAmount * 0.25); // Section 1250: 25%
  const longTermCapitalGain = Math.max(0, totalGainOnSale - depreciationRecaptureAmount);
  const estimatedCapitalGainsTax = is1031Exchange ? 0 : Math.round(longTermCapitalGain * 0.20); // 20% federal cap gains

  // Waterfall Distributions Engine based on Fund Phase capital structure
  // Tier 1: 100% Return of Capital
  const capitalToReturn = Math.min(netSalesProceeds, totalCapitalInvested);
  const proceedsAfterCapitalReturn = Math.max(0, netSalesProceeds - capitalToReturn);

  // Tier 2: 8% Annual Preferred Return
  const annualPrefRate = 0.08;
  const prefReturnRequired = Math.round(totalCapitalInvested * annualPrefRate * holdYears);
  const prefReturnPaid = Math.min(proceedsAfterCapitalReturn, prefReturnRequired);
  const proceedsAfterPref = Math.max(0, proceedsAfterCapitalReturn - prefReturnPaid);

  // Tier 3: 80/20 Excess Promote Split (80% LP Investors, 20% Managing Partner / Lead Investor)
  const lpExcessPromote = Math.round(proceedsAfterPref * 0.80);
  const leadInvestorPromote = proceedsAfterPref - lpExcessPromote;

  // Partner Distribution Table
  // Equity: 55% LP Partner 1, 25% LP Partner 2, 20% Lead Investor (General Partner)
  const partners: PartnerWaterfallDistribution[] = [
    {
      partnerName: 'Apex Capital Multi-Asset LP',
      role: 'LP Partner',
      equityContributed: Math.round(totalCapitalInvested * 0.55),
      ownershipPct: 55,
      capitalReturned: Math.round(capitalToReturn * 0.55),
      preferredReturnPaid: Math.round(prefReturnPaid * 0.55),
      excessPromoteDistributed: Math.round(lpExcessPromote * (55 / 80)),
      totalDistribution:
        Math.round(capitalToReturn * 0.55) +
        Math.round(prefReturnPaid * 0.55) +
        Math.round(lpExcessPromote * (55 / 80)),
    },
    {
      partnerName: 'Sunbelt Family Office Partners',
      role: 'LP Partner',
      equityContributed: Math.round(totalCapitalInvested * 0.25),
      ownershipPct: 25,
      capitalReturned: Math.round(capitalToReturn * 0.25),
      preferredReturnPaid: Math.round(prefReturnPaid * 0.25),
      excessPromoteDistributed: Math.round(lpExcessPromote * (25 / 80)),
      totalDistribution:
        Math.round(capitalToReturn * 0.25) +
        Math.round(prefReturnPaid * 0.25) +
        Math.round(lpExcessPromote * (25 / 80)),
    },
    {
      partnerName: 'Managing Partner (Lead Investor)',
      role: 'Lead Investor',
      equityContributed: Math.round(totalCapitalInvested * 0.20),
      ownershipPct: 20,
      capitalReturned: Math.round(capitalToReturn * 0.20),
      preferredReturnPaid: Math.round(prefReturnPaid * 0.20),
      excessPromoteDistributed: leadInvestorPromote,
      totalDistribution:
        Math.round(capitalToReturn * 0.20) +
        Math.round(prefReturnPaid * 0.20) +
        leadInvestorPromote,
    },
  ];

  return (
    <article
      data-testid="exit-tax-accounting-waterfall-card"
      className="rounded-none border border-border bg-card p-5 md:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-foreground">
              Task 05 · Accounting &amp; Tax Basis Reconciliation
            </span>
            <span className="text-xs text-muted-foreground">IRS §1250 Recapture &amp; Capital Waterfall</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1">
            Tax Basis, Depreciation Recapture &amp; Distribution Waterfall
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reconcile cumulative depreciation, determine capital gains liability, and execute multi-tier investor waterfall distributions.
          </p>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Total Capital Distributed</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(netSalesProceeds)}
          </span>
        </div>
      </div>

      {/* Tax Basis & Depreciation Recapture Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-none border border-border bg-muted/20 p-3">
          <span className="block text-[10px] uppercase text-muted-foreground">Adjusted Cost Basis</span>
          <span className="block text-base font-bold text-foreground mt-1">
            {formatCurrency(adjustedCostBasis)}
          </span>
          <span className="block text-[10px] text-muted-foreground mt-0.5 font-sans">
            Basis less depreciation taken
          </span>
        </div>

        <div className="rounded-none border border-border bg-muted/20 p-3">
          <span className="block text-[10px] uppercase text-muted-foreground">Cumulative Depreciation</span>
          <span className="block text-base font-bold text-foreground mt-1">
            {formatCurrency(cumulativeDepreciation)}
          </span>
          <span className="block text-[10px] text-muted-foreground mt-0.5 font-sans">
            27.5 yr residential schedule
          </span>
        </div>

        <div className="rounded-none border border-border bg-muted/20 p-3">
          <span className="block text-[10px] uppercase text-muted-foreground">§1250 Recapture (25%)</span>
          <span className="block text-base font-bold text-foreground mt-1">
            {is1031Exchange ? '$0 (1031 Rollover)' : formatCurrency(federalDepreciationRecaptureTax)}
          </span>
          <span className="block text-[10px] text-muted-foreground mt-0.5 font-sans">
            {is1031Exchange ? 'Tax liability deferred' : 'Taxed at 25% maximum'}
          </span>
        </div>

        <div className="rounded-none border border-border bg-muted/20 p-3">
          <span className="block text-[10px] uppercase text-muted-foreground">Capital Gains Liability</span>
          <span className="block text-base font-bold text-primary mt-1">
            {is1031Exchange ? '$0 (Deferred)' : formatCurrency(estimatedCapitalGainsTax)}
          </span>
          <span className="block text-[10px] text-primary/80 mt-0.5 font-sans">
            {is1031Exchange ? 'Section 1031 safe harbor' : '20% federal long-term gain'}
          </span>
        </div>
      </div>

      {/* 3-Tier Disposition Waterfall Explanation */}
      <div className="rounded-none border border-border bg-muted/10 p-4 space-y-3 text-xs">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ChartPieSlice size={16} className="text-primary" />
          <span>Capital Waterfall Distribution Tiers (Fund Phase Rules)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="rounded-none border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Tier 1: Return of Capital
            </span>
            <span className="text-base font-bold text-foreground block">
              {formatCurrency(capitalToReturn)}
            </span>
            <p className="text-[11px] text-muted-foreground font-sans">
              100% of proceeds fund full recovery of original equity invested before profits split.
            </p>
          </div>

          <div className="rounded-none border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Tier 2: 8% Preferred Return
            </span>
            <span className="text-base font-bold text-foreground block">
              {formatCurrency(prefReturnPaid)}
            </span>
            <p className="text-[11px] text-muted-foreground font-sans">
              8.0% annual preferred yield paid pro-rata across all equity partners.
            </p>
          </div>

          <div className="rounded-none border border-border bg-card p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Tier 3: 80/20 Excess Promote
            </span>
            <span className="text-base font-bold text-primary block">
              {formatCurrency(proceedsAfterPref)}
            </span>
            <p className="text-[11px] text-muted-foreground font-sans">
              80% to LP equity investors ($
              {lpExcessPromote.toLocaleString()}) and 20% promote to Managing Partner ($
              {leadInvestorPromote.toLocaleString()}).
            </p>
          </div>
        </div>
      </div>

      {/* Partner Distribution Ledger Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <span>Final Partner Distribution Ledger</span>
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            3 Partner Entities Reconciled
          </span>
        </div>

        <div className="overflow-x-auto border border-border rounded-none">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Partner Entity</th>
                <th className="p-3">Role</th>
                <th className="p-3">Ownership</th>
                <th className="p-3 text-right">Original Equity</th>
                <th className="p-3 text-right">Capital Return</th>
                <th className="p-3 text-right">Pref Paid</th>
                <th className="p-3 text-right">Excess Split</th>
                <th className="p-3 text-right text-foreground font-bold">Total Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {partners.map((partner) => (
                <tr key={partner.partnerName} className="hover:bg-muted/10 transition">
                  <td className="p-3 font-medium text-foreground">{partner.partnerName}</td>
                  <td className="p-3 text-muted-foreground font-sans">{partner.role}</td>
                  <td className="p-3 text-muted-foreground">{partner.ownershipPct}%</td>
                  <td className="p-3 text-right text-muted-foreground">{formatCurrency(partner.equityContributed)}</td>
                  <td className="p-3 text-right text-foreground">{formatCurrency(partner.capitalReturned)}</td>
                  <td className="p-3 text-right text-foreground">{formatCurrency(partner.preferredReturnPaid)}</td>
                  <td className="p-3 text-right text-primary">{formatCurrency(partner.excessPromoteDistributed)}</td>
                  <td className="p-3 text-right font-bold text-primary">{formatCurrency(partner.totalDistribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
