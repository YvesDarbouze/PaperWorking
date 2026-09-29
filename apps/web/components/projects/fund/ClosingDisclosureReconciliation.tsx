'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type {
  ClosingDisclosureComparison,
  ClosingDisclosureItem,
} from '@/lib/projects/types';

export interface ClosingDisclosureReconciliationProps {
  comparison?: ClosingDisclosureComparison;
  loanAmount?: number;
  purchasePrice?: number;
  onUpdateComparison: (updated: ClosingDisclosureComparison) => void;
  onApproveClosingDisclosure?: () => void;
}

const DEFAULT_CD_ITEMS: ClosingDisclosureItem[] = [
  {
    id: 'cd-1',
    name: 'Loan Origination Fee / Points (1.00%)',
    category: 'origination',
    toleranceBucket: 'zero_percent',
    loanEstimateAmount: 2940,
    closingDisclosureAmount: 2940,
  },
  {
    id: 'cd-2',
    name: 'Lender Underwriting & Processing Fee',
    category: 'origination',
    toleranceBucket: 'zero_percent',
    loanEstimateAmount: 1250,
    closingDisclosureAmount: 1250,
  },
  {
    id: 'cd-3',
    name: 'Narrative Commercial Appraisal Fee',
    category: 'cannot_shop',
    toleranceBucket: 'zero_percent',
    loanEstimateAmount: 950,
    closingDisclosureAmount: 950,
  },
  {
    id: 'cd-4',
    name: 'Credit Report & Flood Determination',
    category: 'cannot_shop',
    toleranceBucket: 'zero_percent',
    loanEstimateAmount: 110,
    closingDisclosureAmount: 110,
  },
  {
    id: 'cd-5',
    name: 'Title - Settlement & Closing Fee',
    category: 'can_shop',
    toleranceBucket: 'ten_percent',
    loanEstimateAmount: 1200,
    closingDisclosureAmount: 1250,
    notes: '+$50 courier/electronic closing doc fee',
  },
  {
    id: 'cd-6',
    name: "Title - Lender's Title Insurance Policy",
    category: 'can_shop',
    toleranceBucket: 'ten_percent',
    loanEstimateAmount: 1650,
    closingDisclosureAmount: 1720,
  },
  {
    id: 'cd-7',
    name: 'Title - Examination & Abstract Search',
    category: 'can_shop',
    toleranceBucket: 'ten_percent',
    loanEstimateAmount: 450,
    closingDisclosureAmount: 450,
  },
  {
    id: 'cd-8',
    name: 'Government Recording & Transfer Charges',
    category: 'taxes_gov',
    toleranceBucket: 'zero_percent',
    loanEstimateAmount: 320,
    closingDisclosureAmount: 320,
  },
  {
    id: 'cd-9',
    name: 'Prepaid Interest (15 days @ $55.30/day)',
    category: 'prepaids',
    toleranceBucket: 'unlimited',
    loanEstimateAmount: 830,
    closingDisclosureAmount: 774,
  },
  {
    id: 'cd-10',
    name: 'Prepaid Hazard Insurance Premium (12 mo)',
    category: 'prepaids',
    toleranceBucket: 'unlimited',
    loanEstimateAmount: 1800,
    closingDisclosureAmount: 1680,
  },
  {
    id: 'cd-11',
    name: 'Initial Escrow Reserves (Property Tax 3 mo)',
    category: 'initial_escrow',
    toleranceBucket: 'unlimited',
    loanEstimateAmount: 1650,
    closingDisclosureAmount: 1650,
  },
];

export default function ClosingDisclosureReconciliation({
  comparison: initialComparison,
  loanAmount = 294000,
  purchasePrice = 392000,
  onUpdateComparison,
  onApproveClosingDisclosure,
}: ClosingDisclosureReconciliationProps) {
  const defaultComparison: ClosingDisclosureComparison = useMemo(() => {
    if (initialComparison) return initialComparison;
    const leCash = (purchasePrice - loanAmount) + DEFAULT_CD_ITEMS.reduce((sum, item) => sum + item.loanEstimateAmount, 0);
    const cdCash = (purchasePrice - loanAmount) + DEFAULT_CD_ITEMS.reduce((sum, item) => sum + item.closingDisclosureAmount, 0);
    return {
      loanEstimateDate: '2026-08-15',
      closingDisclosureDate: '2026-09-24',
      items: DEFAULT_CD_ITEMS,
      loanEstimateCashToClose: leCash,
      closingDisclosureCashToClose: cdCash,
      isTridCompliant: true,
      reconciliationNotes: 'Verified against final ALTA settlement statement received from title.',
    };
  }, [initialComparison, loanAmount, purchasePrice]);

  const [comparison, setComparison] = useState<ClosingDisclosureComparison>(defaultComparison);
  const [filterBucket, setFilterBucket] = useState<'all' | 'zero_percent' | 'ten_percent' | 'unlimited'>('all');
  const [isApproved, setIsApproved] = useState(false);

  // TRID Variance Calculations
  const analysis = useMemo(() => {
    let zeroToleranceBreach = false;
    let tenPercentLeTotal = 0;
    let tenPercentCdTotal = 0;
    let totalLeCosts = 0;
    let totalCdCosts = 0;

    for (const item of comparison.items) {
      totalLeCosts += item.loanEstimateAmount;
      totalCdCosts += item.closingDisclosureAmount;

      if (item.toleranceBucket === 'zero_percent') {
        if (item.closingDisclosureAmount > item.loanEstimateAmount) {
          zeroToleranceBreach = true;
        }
      } else if (item.toleranceBucket === 'ten_percent') {
        tenPercentLeTotal += item.loanEstimateAmount;
        tenPercentCdTotal += item.closingDisclosureAmount;
      }
    }

    const tenPercentChangePct =
      tenPercentLeTotal > 0
        ? ((tenPercentCdTotal - tenPercentLeTotal) / tenPercentLeTotal) * 100
        : 0;
    const tenPercentToleranceBreach = tenPercentChangePct > 10;

    const isTridCompliant = !zeroToleranceBreach && !tenPercentToleranceBreach;
    const totalVariance = totalCdCosts - totalLeCosts;
    const cashToCloseVariance = comparison.closingDisclosureCashToClose - comparison.loanEstimateCashToClose;

    return {
      zeroToleranceBreach,
      tenPercentToleranceBreach,
      tenPercentChangePct,
      isTridCompliant,
      totalLeCosts,
      totalCdCosts,
      totalVariance,
      cashToCloseVariance,
    };
  }, [comparison]);

  const handleApprove = () => {
    setIsApproved(true);
    if (onApproveClosingDisclosure) {
      onApproveClosingDisclosure();
    }
  };

  const filteredItems = comparison.items.filter((item) => {
    if (filterBucket === 'all') return true;
    return item.toleranceBucket === filterBucket;
  });

  return (
    <div
      data-testid="closing-disclosure-reconciliation"
      className="w-full rounded-none border border-neutral-800 bg-[#0a0a0a] p-5 font-sans text-neutral-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                analysis.isTridCompliant
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
              }`}
            >
              {analysis.isTridCompliant ? 'TRID Compliant' : 'Tolerance Discrepancy Detected'}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              LE ({comparison.loanEstimateDate || 'Aug 15'}) vs CD ({comparison.closingDisclosureDate || 'Sep 24'})
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-white tracking-tight">
            Closing Disclosure (CD) vs. Loan Estimate (LE) Reconciliation
          </h3>
          <p className="mt-0.5 text-xs text-neutral-400">
            Compare final closing disclosure terms and line items against the original loan estimate to prevent closing fee creep.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <span className="rounded-none border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              CD Reviewed & Approved
            </span>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="rounded-none min-h-[44px] px-4 text-xs"
              onClick={handleApprove}
              data-testid="approve-cd-btn"
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">task_alt</span>
              Acknowledge & Sign Off CD
            </Button>
          )}
        </div>
      </div>

      {/* Variance Alert Banner */}
      {!analysis.isTridCompliant && (
        <div
          data-testid="tolerance-breach-banner"
          className="mt-4 rounded-none border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 space-y-1"
        >
          <div className="flex items-center gap-2 font-bold text-rose-200">
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            <span>CFPB TRID Tolerance Threshold Exceeded</span>
          </div>
          <p className="text-[11px] text-rose-300">
            {analysis.zeroToleranceBreach && 'A 0% tolerance origination charge increased from the original Loan Estimate without an approved change of circumstance. '}
            {analysis.tenPercentToleranceBreach && `Cumulative shop-for closing fees increased by ${analysis.tenPercentChangePct.toFixed(1)}% (limit is 10.0%). `}
            Lender must issue a closing cost cure credit prior to loan funding.
          </p>
        </div>
      )}

      {/* Summary KPI Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 rounded-none border border-neutral-800 bg-neutral-900/40 p-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">LE Estimated Cash to Close</span>
          <p className="text-sm font-bold text-neutral-200 mt-0.5">
            {formatCurrency(comparison.loanEstimateCashToClose)}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">Final CD Cash to Close</span>
          <p className="text-sm font-bold text-white mt-0.5">
            {formatCurrency(comparison.closingDisclosureCashToClose)}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">Net Cash-to-Close Variance</span>
          <p
            className={`text-sm font-bold mt-0.5 ${
              analysis.cashToCloseVariance <= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {analysis.cashToCloseVariance <= 0 ? '-' : '+'}
            {formatCurrency(Math.abs(analysis.cashToCloseVariance))}
            <span className="text-[10px] ml-1 font-normal text-neutral-400">
              ({analysis.cashToCloseVariance <= 0 ? 'Savings' : 'Increase'})
            </span>
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-neutral-400">Shop-For 10% Bucket Change</span>
          <p
            className={`text-sm font-bold mt-0.5 ${
              analysis.tenPercentChangePct > 10 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            +{analysis.tenPercentChangePct.toFixed(1)}%
            <span className="text-[10px] ml-1 font-normal text-neutral-400">(Max 10%)</span>
          </p>
        </div>
      </div>

      {/* Tolerance Bucket Filter Tabs */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setFilterBucket('all')}
          className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none border transition ${
            filterBucket === 'all'
              ? 'border-white bg-neutral-900 text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
          data-testid="filter-all-bucket"
        >
          All Items ({comparison.items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterBucket('zero_percent')}
          className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none border transition ${
            filterBucket === 'zero_percent'
              ? 'border-amber-400 bg-neutral-900 text-amber-300'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
          data-testid="filter-zero-bucket"
        >
          0% Tolerance (Lender & Taxes)
        </button>
        <button
          type="button"
          onClick={() => setFilterBucket('ten_percent')}
          className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none border transition ${
            filterBucket === 'ten_percent'
              ? 'border-blue-400 bg-neutral-900 text-blue-300'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
          data-testid="filter-ten-bucket"
        >
          10% Cumulative (Title & Settlement)
        </button>
        <button
          type="button"
          onClick={() => setFilterBucket('unlimited')}
          className={`min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-none border transition ${
            filterBucket === 'unlimited'
              ? 'border-emerald-400 bg-neutral-900 text-emerald-300'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
          data-testid="filter-unlimited-bucket"
        >
          Unlimited (Prepaids & Escrow)
        </button>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="mt-3 rounded-none border border-neutral-800 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-800 bg-neutral-900/70 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            <tr>
              <th className="px-4 py-3">Fee / Line Item</th>
              <th className="px-4 py-3">Tolerance Rule</th>
              <th className="px-4 py-3 text-right">Loan Estimate</th>
              <th className="px-4 py-3 text-right">Closing Disclosure</th>
              <th className="px-4 py-3 text-right">Variance</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/80">
            {filteredItems.map((item) => {
              const delta = item.closingDisclosureAmount - item.loanEstimateAmount;
              const isBreach =
                (item.toleranceBucket === 'zero_percent' && delta > 0) ||
                (item.toleranceBucket === 'ten_percent' && delta / item.loanEstimateAmount > 0.1);

              return (
                <tr
                  key={item.id}
                  data-testid={`cd-item-row-${item.id}`}
                  className="hover:bg-neutral-900/30 transition"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{item.name}</p>
                    {item.notes && <p className="text-[10px] text-neutral-400">{item.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-none px-2 py-0.5 text-[9px] uppercase font-mono font-bold ${
                        item.toleranceBucket === 'zero_percent'
                          ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                          : item.toleranceBucket === 'ten_percent'
                          ? 'border border-blue-500/30 bg-blue-500/10 text-blue-300'
                          : 'border border-neutral-700 bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {item.toleranceBucket === 'zero_percent'
                        ? '0% Tolerance'
                        : item.toleranceBucket === 'ten_percent'
                        ? '10% Cumulative'
                        : 'Unlimited'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-300 font-mono">
                    {formatCurrency(item.loanEstimateAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-mono font-semibold">
                    {formatCurrency(item.closingDisclosureAmount)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-semibold ${
                      delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-emerald-400' : 'text-neutral-400'
                    }`}
                  >
                    {delta === 0 ? '$0' : delta > 0 ? `+${formatCurrency(delta)}` : `-${formatCurrency(Math.abs(delta))}`}
                  </td>
                  <td className="px-4 py-3">
                    {isBreach ? (
                      <span className="rounded-none border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                        Breach
                      </span>
                    ) : delta < 0 ? (
                      <span className="rounded-none border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        Lower Cost
                      </span>
                    ) : (
                      <span className="rounded-none border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                        Matches LE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
