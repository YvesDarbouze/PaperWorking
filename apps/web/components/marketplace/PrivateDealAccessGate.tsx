'use client';

import React from 'react';
import Link from 'next/link';
import { RawDealCalculatorResults } from '@/lib/marketplace/seed-data';
import { formatCurrency, formatPercent } from '@/lib/format';
import { extractStreetAddress } from '@/lib/marketplace/address-utils';

export interface PrivateDealAccessGateProps {
  dealName?: string;
  dealAddress?: string;
  dealSlug?: string;
  dealId?: string;
  calculatorResults?: RawDealCalculatorResults | null;
  creatorName?: string;
  reason?: 'unsubscribed_gate' | 'unauthorized' | string;
}

export default function PrivateDealAccessGate({
  dealName,
  dealAddress = 'Private Property Opportunity',
  dealSlug,
  dealId,
  calculatorResults,
  creatorName = 'Operating Partner',
  reason = 'unsubscribed_gate',
}: PrivateDealAccessGateProps) {
  const streetName = extractStreetAddress(dealAddress || dealName || 'Private Opportunity');
  const isUnauthorized = reason === 'unauthorized';

  return (
    <div
      data-testid="private-deal-access-gate"
      className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between py-12 px-4 sm:px-6 md:px-8 selection:bg-neutral-800"
    >
      <div className="w-full max-w-[1140px] mx-auto space-y-8">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Deals Marketplace
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              Private Allocation
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium border border-neutral-700 bg-neutral-900 text-neutral-300">
            <span className="material-symbols-outlined text-[14px] text-amber-400">lock</span>
            Private Deal · Restricted Access
          </div>
        </div>

        {/* Hero Notice Banner */}
        <div className="border border-neutral-800 bg-neutral-900/60 p-6 md:p-8 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex-shrink-0 bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200">
              <span className="material-symbols-outlined text-[24px]">lock_clock</span>
            </div>
            <div className="space-y-2 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                {isUnauthorized ? 'Confidential Deal: Access Restricted' : 'Private Deal Access: Delivered Calculator Results'}
              </h1>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-3xl">
                {isUnauthorized
                  ? 'This investment is private and has only been shared with invited investors. If you received a private invite or token, please sign in with your authorized PaperWorking account.'
                  : `You received the Deal Calculator results for ${streetName}. Unsubscribed users cannot view the full deal room, confidential document vault, or communicate directly with ${creatorName} on PaperWorking. Subscribe to unlock full underwriting models, due diligence records, and direct execution.`}
              </p>
            </div>
          </div>
        </div>

        {/* Deal Identity & Quick Header */}
        <div className="border border-neutral-800 bg-neutral-900/40 p-6 space-y-2">
          <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
            Target Property & Operator
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {streetName}
          </div>
          <div className="text-sm text-neutral-400">
            Full Address: <span className="font-mono text-neutral-300">{dealAddress}</span>
          </div>
          <div className="text-xs text-neutral-500 pt-1">
            Operating Partner: <span className="text-neutral-300 font-medium">{creatorName}</span>
          </div>
        </div>

        {/* Delivered Deal Calculator Results (Visible to Unsubscribed Recipients) */}
        {calculatorResults && !isUnauthorized && (
          <div
            data-testid="delivered-calculator-results-grid"
            className="border border-neutral-800 bg-neutral-900/30 p-6 md:p-8 space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-neutral-400">calculate</span>
                  Delivered Deal Calculator Results
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Calculated financial outputs shared by the operator via email broadcast / private channel.
                </p>
              </div>
              <div className="text-xs font-mono text-neutral-400 px-2.5 py-1 border border-neutral-800 bg-neutral-950">
                Strategy: {calculatorResults.strategy || 'Fix & Flip'} ({calculatorResults.holdPeriod || '2–3 Years'})
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Purchase Price</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {formatCurrency(calculatorResults.purchasePrice || 0)}
                </div>
              </div>

              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Rehab Budget</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {formatCurrency(calculatorResults.rehabBudget || 0)}
                </div>
              </div>

              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">After Repair (ARV)</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {formatCurrency(calculatorResults.arv || 0)}
                </div>
              </div>

              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Target IRR / ROI</div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400">
                  {formatPercent(calculatorResults.targetIrr || calculatorResults.projectedRoi || 0)}
                </div>
              </div>

              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Cash Required</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {formatCurrency(calculatorResults.cashRequired || 0)}
                </div>
              </div>

              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Net Operating Income</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {formatCurrency(calculatorResults.netOperatingIncome || 0)}
                </div>
              </div>

              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Cap Rate on Cost</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {calculatorResults.capRateOnCost ? `${calculatorResults.capRateOnCost.toFixed(2)}%` : '5.80%'}
                </div>
              </div>

              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-1">
                <div className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Equity Multiple</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {calculatorResults.equityMultiple ? `${calculatorResults.equityMultiple.toFixed(2)}x` : '1.75x'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Locked Deal Room Teaser & Upgrade Barrier */}
        <div data-testid="subscriber-full-deal-gate" className="relative border border-neutral-800 bg-neutral-900/20 overflow-hidden p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-neutral-400">shield_lock</span>
              Confidential Deal Room Assets (Restricted)
            </h3>
            <span className="text-xs text-neutral-500 font-mono">Subscriber Tier Exclusive</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-50 select-none pointer-events-none filter blur-[0.5px]">
            <div className="border border-neutral-800 p-4 bg-neutral-950">
              <div className="text-xs font-mono text-neutral-400">Vault Documents</div>
              <div className="text-sm font-semibold text-white mt-1">Title, Appraisal & Leases</div>
              <div className="text-xs text-neutral-500 mt-2">14 confidential files locked</div>
            </div>
            <div className="border border-neutral-800 p-4 bg-neutral-950">
              <div className="text-xs font-mono text-neutral-400">Full Financial Model</div>
              <div className="text-sm font-semibold text-white mt-1">10-Year Pro-Forma Worksheet</div>
              <div className="text-xs text-neutral-500 mt-2">Sensitivity tables locked</div>
            </div>
            <div className="border border-neutral-800 p-4 bg-neutral-950">
              <div className="text-xs font-mono text-neutral-400">Operator Messaging</div>
              <div className="text-sm font-semibold text-white mt-1">In-App Term Negotiation</div>
              <div className="text-xs text-neutral-500 mt-2">Direct messaging channel locked</div>
            </div>
          </div>

          {/* Subscription Action CTA Bar */}
          <div className="border-t border-neutral-800 pt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white">
                Users must be subscribers to see the full deal.
              </div>
              <div className="text-xs text-neutral-400">
                Unlock full access to this deal room and the PaperWorking Bloomberg terminal for real estate investors.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-5 min-h-[44px] text-sm font-medium bg-white text-neutral-950 hover:bg-neutral-200 transition-colors"
                data-testid="upgrade-subscription-btn"
              >
                Subscribe to PaperWorking
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 min-h-[44px] text-sm font-medium border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 transition-colors"
                data-testid="signin-active-account-btn"
              >
                Sign In with Active Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
