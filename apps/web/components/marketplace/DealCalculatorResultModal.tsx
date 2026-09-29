'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PropertySatelliteViewer from '@/components/maps/PropertySatelliteViewer';
import type { DealCardData } from '@/components/marketplace/DealCard';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import DealCrowdfundModal from './DealCrowdfundModal';
import ExpressInterestModal from './ExpressInterestModal';

export interface DealCalculatorResultModalProps {
  deal: DealCardData;
  isOpen: boolean;
  onClose: () => void;
  onCommitSuccess?: (committedAmount: number) => void;
  onExpressInterest?: (deal: DealCardData) => void;
  isInterested?: boolean;
}

export default function DealCalculatorResultModal({
  deal,
  isOpen,
  onClose,
  onCommitSuccess,
  onExpressInterest,
  isInterested = false,
}: DealCalculatorResultModalProps) {
  const [isCrowdfundOpen, setIsCrowdfundOpen] = useState(false);
  const [isExpressInterestOpen, setIsExpressInterestOpen] = useState(false);
  const [internalInterested, setInternalInterested] = useState(isInterested);
  const [localCommitted, setLocalCommitted] = useState<number>(
    deal.committedAmount ?? deal.committed ?? 0
  );
  const [localInvestors, setLocalInvestors] = useState<number>(
    deal.investorCount ?? 4
  );

  if (!isOpen) return null;

  const calc = deal.calculatorResults;
  const purchasePrice = calc?.purchasePrice ?? deal.purchasePrice ?? deal.price ?? 0;
  const rehab = calc?.rehabBudget ?? 0;
  const arv = calc?.arv ?? (purchasePrice > 0 ? purchasePrice + (rehab > 0 ? Math.round(rehab * 1.5) : 0) : 0);
  const targetIrr = calc?.targetIrr ?? calc?.projectedRoi ?? deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 0;
  const equityMultiple = calc?.equityMultiple ?? deal.equityMultiple ?? 1.8;
  const cashRequired = calc?.cashRequired ?? (purchasePrice > 0 ? Math.round(purchasePrice * 0.25 + rehab) : 0);
  const grossMonthlyRent = calc?.grossMonthlyRent ?? 0;
  const annualNoi = calc?.netOperatingIncome ?? 0;
  const capRate = calc?.capRateOnCost ?? (annualNoi > 0 && (purchasePrice + rehab) > 0 ? (annualNoi / (purchasePrice + rehab)) * 100 : 0);
  const cashOnCash = calc?.cashOnCashReturnPct ?? 0;
  const monthlyDebtService = calc?.monthlyDebtService ?? 0;
  const mao = calc?.maximumAllowableOffer70Pct ?? (arv > 0 ? Math.round(arv * 0.70 - rehab) : 0);
  const holdPeriod = calc?.holdPeriod ?? deal.holdPeriod ?? (deal.holdPeriodYears ? `${deal.holdPeriodYears} Years` : '3-5 Years');

  const target = deal.fundingTarget ?? deal.target ?? (purchasePrice > 0 ? Math.round(purchasePrice * 0.35) : 1000000);
  const committed = localCommitted;
  const progressPct = target > 0 ? Math.min(100, Math.round((committed / target) * 100)) : 0;
  const minInvestment = deal.minInvestment ?? 25000;

  const overarchingProjectName = deal.projectName ?? deal.projects?.[0]?.name ?? 'Master Project';
  const overarchingProjectId = deal.projectId ?? deal.projects?.[0]?.id ?? null;

  const handleCommitSuccess = (amount: number) => {
    setLocalCommitted((prev) => prev + amount);
    setLocalInvestors((prev) => prev + 1);
    setInternalInterested(true);
    setIsCrowdfundOpen(false);
    if (onCommitSuccess) onCommitSuccess(amount);
  };

  const handleExpressInterestClick = () => {
    setInternalInterested(true);
    if (onExpressInterest) {
      onExpressInterest(deal);
    }
    setIsExpressInterestOpen(true);
  };

  return (
    <>
      <div
        data-testid="deal-calculator-result-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl rounded-none border border-neutral-800 bg-[#0e0e11] p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-none bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 text-[10px] font-mono uppercase text-neutral-200 tracking-wider">
                  Verified Underwriting Snapshot
                </span>
                <span className="text-xs text-neutral-400 font-mono">Deal Serial: {deal.slug || deal.id}</span>
                {internalInterested && (
                  <span
                    data-testid="modal-interest-registered-badge"
                    className="rounded-none bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    <span>Investment Interest Registered</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-neutral-100 font-sans">
                {deal.propertyName || deal.name || deal.address.split(',')[0]}
              </h2>
              <p className="text-xs text-neutral-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-neutral-500">location_on</span>
                <span>{deal.address}</span>
              </p>
            </div>

            <button
              type="button"
              data-testid="close-deal-modal-btn"
              onClick={onClose}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Overarching Project Lineage */}
          <div
            data-testid="modal-overarching-project-section"
            className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-neutral-800 bg-neutral-900/60 p-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-neutral-400">account_tree</span>
              <span className="text-[10px] font-mono uppercase text-neutral-400">Overarching Project:</span>
              <Link
                href={overarchingProjectId ? `/projects/${overarchingProjectId}` : '/projects'}
                data-testid="modal-overarching-project-link"
                className="font-medium text-neutral-100 hover:text-white hover:underline flex items-center gap-1"
              >
                <span>{overarchingProjectName}</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            </div>
            <div className="text-[11px] font-mono text-neutral-400">
              Hold: <span className="text-neutral-200">{holdPeriod}</span>
            </div>
          </div>

          {/* Satellite Aerial Screencap & Crowdfunding Progress Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-7">
              <PropertySatelliteViewer
                address={deal.address}
                aspectRatio="16/9"
                title={deal.address}
                className="rounded-none border border-neutral-800"
              />
            </div>

            <div className="md:col-span-5 flex flex-col justify-between rounded-none border border-neutral-800 bg-neutral-900/40 p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Crowdfunding Campaign</span>
                  <span className="font-bold text-neutral-100 font-mono">{`${progressPct}% Funded`}</span>
                </div>
                <div className="h-2 w-full rounded-none bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-neutral-100 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-mono">Committed</span>
                    <span className="font-mono font-bold text-neutral-100">{formatCurrency(committed)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block font-mono">Target</span>
                    <span className="font-mono text-neutral-300">{formatCurrency(target)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-none bg-neutral-950 p-3 border border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Min Check Size:</span>
                  <span className="font-mono font-bold text-neutral-100">{formatCurrency(minInvestment)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Active Investors:</span>
                  <span className="text-neutral-200 font-semibold font-mono">{`${localInvestors} Co-Investors`}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Target Hold Period:</span>
                  <span className="text-neutral-200">{holdPeriod}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {/* Interested in Investing into this Project button (Requirement 9) */}
                <button
                  type="button"
                  data-testid="modal-interested-investing-btn"
                  onClick={handleExpressInterestClick}
                  className="w-full flex items-center justify-center gap-2 rounded-none border border-neutral-700 bg-neutral-800 py-2.5 text-xs font-bold text-neutral-100 hover:bg-neutral-700 hover:text-white transition shadow-sm min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  <span>{internalInterested ? 'Update Project Investment Interest' : 'Interested in Investing into this Project'}</span>
                </button>

                {/* Direct Crowdfund Capital Allocation CTA */}
                <button
                  type="button"
                  data-testid="crowdfund-invest-btn"
                  onClick={() => setIsCrowdfundOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-none bg-neutral-100 py-2.5 text-xs font-bold text-neutral-950 hover:bg-white transition shadow-sm min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  <span>Crowdfund / Allocate Capital</span>
                </button>
              </div>
            </div>
          </div>

          {/* Deal Calculator Institutional Metrics Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 font-mono">
                <span className="material-symbols-outlined text-neutral-400 text-[16px]">calculate</span>
                <span>Deal Calculator Output Engine (Institutional Underwriting)</span>
              </h3>
              <Link
                href={`/deal-calculator?price=${purchasePrice}&arv=${arv}&rehab=${rehab}&rent=${grossMonthlyRent}&address=${encodeURIComponent(deal.address)}`}
                data-testid="modal-open-in-deal-calculator-link"
                className="text-[11px] font-semibold text-neutral-300 hover:text-white hover:underline flex items-center gap-1"
              >
                <span>Open in Deal Calculator</span>
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-target-irr">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Target IRR</span>
                <span className="text-lg font-bold font-mono text-neutral-100">{formatPercent(targetIrr / 100)}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">Annualized Return</span>
              </div>

              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-equity-multiple">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Equity Multiple</span>
                <span className="text-lg font-bold font-mono text-neutral-100">{`${equityMultiple}x`}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">{`Hold: ${holdPeriod}`}</span>
              </div>

              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-cap-rate">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Cap Rate on Cost</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{formatPercent(capRate / 100)}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">Unleveraged Yield</span>
              </div>

              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-cash-on-cash">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Cash-on-Cash</span>
                <span className="text-lg font-bold font-mono text-neutral-100">{formatPercent(cashOnCash / 100)}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">Year 1 Dividend</span>
              </div>

              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-cash-required">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Cash Required</span>
                <span className="text-lg font-bold font-mono text-neutral-100">{formatCurrency(cashRequired)}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">Equity & Closing</span>
              </div>

              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-arv">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">After Repair Value (ARV)</span>
                <span className="text-lg font-bold font-mono text-neutral-100">{formatCurrency(arv)}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">Appraised Exit Value</span>
              </div>

              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-noi">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Net Operating Income</span>
                <span className="text-lg font-bold font-mono text-neutral-100">{annualNoi > 0 ? `${formatCurrency(annualNoi)}/yr` : 'N/A'}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">Annual Pro-Forma NOI</span>
              </div>

              <div className="rounded-none border border-neutral-800 bg-neutral-900/30 p-3" data-testid="modal-calc-mao">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Max Allowable Offer (70%)</span>
                <span className="text-lg font-bold font-mono text-neutral-100">{mao > 0 ? formatCurrency(mao) : 'N/A'}</span>
                <span className="text-[9.5px] text-neutral-500 block mt-0.5">70% ARV minus Rehab</span>
              </div>
            </div>

            {/* Financial Baseline Breakdown Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-none border border-neutral-800 bg-neutral-950 p-3 text-[11px]">
              <div data-testid="modal-calc-purchase-price">
                <span className="text-neutral-400 block font-mono text-[10px]">Purchase Price</span>
                <span className="font-mono font-semibold text-neutral-100">{formatCurrency(purchasePrice)}</span>
              </div>
              <div data-testid="modal-calc-rehab-budget">
                <span className="text-neutral-400 block font-mono text-[10px]">Rehab Budget</span>
                <span className="font-mono font-semibold text-neutral-100">{rehab > 0 ? formatCurrency(rehab) : '$0'}</span>
              </div>
              <div data-testid="modal-calc-gross-rent">
                <span className="text-neutral-400 block font-mono text-[10px]">Gross Monthly Rent</span>
                <span className="font-mono font-semibold text-neutral-100">{grossMonthlyRent > 0 ? `${formatCurrency(grossMonthlyRent)}/mo` : 'N/A'}</span>
              </div>
              <div data-testid="modal-calc-debt-service">
                <span className="text-neutral-400 block font-mono text-[10px]">Monthly Debt Service</span>
                <span className="font-mono font-semibold text-neutral-100">{monthlyDebtService > 0 ? `${formatCurrency(monthlyDebtService)}/mo` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Express Interest Modal (Requirement 9) */}
      {isExpressInterestOpen && (
        <ExpressInterestModal
          deal={deal}
          isOpen={isExpressInterestOpen}
          onClose={() => setIsExpressInterestOpen(false)}
          onSuccessToast={() => {
            setInternalInterested(true);
            setIsExpressInterestOpen(false);
          }}
        />
      )}

      {/* Crowdfund Investment Modal */}
      {isCrowdfundOpen && (
        <DealCrowdfundModal
          deal={deal}
          isOpen={isCrowdfundOpen}
          onClose={() => setIsCrowdfundOpen(false)}
          onCommitSuccess={handleCommitSuccess}
        />
      )}
    </>
  );
}
