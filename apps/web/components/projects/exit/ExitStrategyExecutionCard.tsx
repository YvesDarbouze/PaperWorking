'use client';

import React from 'react';
import type {
  ExitStrategyRoute,
  OutrightSaleExecutionState,
  RefinanceRetainExecutionState,
  CondoSellOffExecutionState,
  CoopSellOffExecutionState,
  LeaseOptionExecutionState,
  Exchange1031ExecutionState,
} from '@/lib/projects/types';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import {
  FileText,
  Clock,
  CheckCircle,
  Building,
  Key,
  ArrowsClockwise,
  Scales,
  Handshake,
  ShieldCheck,
  CalendarCheck,
  FileLock,
  FileCheck,
  Users,
} from '@/components/icons/PhosphorIcons';

interface ExitStrategyExecutionCardProps {
  selectedRoute: ExitStrategyRoute;
  outrightSale: OutrightSaleExecutionState;
  refinanceRetain: RefinanceRetainExecutionState;
  condoSellOff: CondoSellOffExecutionState;
  coopSellOff?: CoopSellOffExecutionState;
  leaseOption: LeaseOptionExecutionState;
  exchange1031: Exchange1031ExecutionState;
  onUpdateOutrightSale: (updated: OutrightSaleExecutionState) => void;
  onUpdateRefinanceRetain: (updated: RefinanceRetainExecutionState) => void;
  onUpdateCondoSellOff: (updated: CondoSellOffExecutionState) => void;
  onUpdateCoopSellOff?: (updated: CoopSellOffExecutionState) => void;
  onUpdateLeaseOption: (updated: LeaseOptionExecutionState) => void;
  onUpdateExchange1031: (updated: Exchange1031ExecutionState) => void;
  onHandBackToHold?: () => void;
}

export default function ExitStrategyExecutionCard({
  selectedRoute,
  outrightSale,
  refinanceRetain,
  condoSellOff,
  coopSellOff,
  leaseOption,
  exchange1031,
  onUpdateOutrightSale,
  onUpdateRefinanceRetain,
  onUpdateCondoSellOff,
  onUpdateCoopSellOff,
  onUpdateLeaseOption,
  onUpdateExchange1031,
  onHandBackToHold,
}: ExitStrategyExecutionCardProps) {
  return (
    <article
      data-testid="exit-strategy-execution-card"
      className="rounded-none border border-border bg-card p-5 md:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-foreground">
              Task 04 · Strategy-Specific Execution
            </span>
            <span className="text-xs text-muted-foreground uppercase font-mono">
              {selectedRoute.replace('_', ' ')}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1">
            Strategy Execution & Transaction Milestone Controls
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational checklists, regulatory milestones, legal instruments, and live timers tailored to your active route.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROUTE A: OUTRIGHT SALE                                  */}
      {/* ======================================================== */}
      {selectedRoute === 'outright_sale' && (
        <div data-testid="route-a-outright-sale-view" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. OM & NDAs */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Milestone 01
                </span>
                {outrightSale.omPublished ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <CheckCircle size={13} weight="fill" />
                    Published
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground">Drafting</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-foreground">Offering Memorandum & NDAs</h3>
              <p className="text-[11px] text-muted-foreground">
                Digital marketing teaser and confidential document room released to vetted commercial buyers.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
                <span>Signed NDAs:</span>
                <strong className="text-foreground">{outrightSale.signedNdasCount} Investors</strong>
              </div>
              <button
                type="button"
                data-testid="toggle-om-published-btn"
                onClick={() =>
                  onUpdateOutrightSale({
                    ...outrightSale,
                    omPublished: !outrightSale.omPublished,
                  })
                }
                className="w-full min-h-[44px] rounded-none border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition"
              >
                {outrightSale.omPublished ? 'Unpublish OM' : 'Publish OM & Open Deal Room'}
              </button>
            </div>

            {/* 2. PSA & Due Diligence */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Milestone 02
                </span>
                {outrightSale.buyerName ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <CheckCircle size={13} weight="fill" />
                    Under Contract
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground">Open Bidding</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-foreground">PSA Execution & Diligence</h3>
              <p className="text-[11px] text-muted-foreground">
                Buyer: <strong className="text-foreground">{outrightSale.buyerName || 'Unassigned'}</strong>
              </p>
              <div className="pt-2 border-t border-border space-y-1 font-mono text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>PSA Signed:</span>
                  <span className="text-foreground">{outrightSale.psaSignedDate || 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diligence Hard Date:</span>
                  <span className="text-foreground">{outrightSale.dueDiligenceDeadline || 'Pending'}</span>
                </div>
              </div>
              <button
                type="button"
                data-testid="confirm-psa-contract-btn"
                onClick={() =>
                  onUpdateOutrightSale({
                    ...outrightSale,
                    buyerName: outrightSale.buyerName || 'Lonestar Capital Fund LP',
                    psaSignedDate: new Date().toISOString().slice(0, 10),
                  })
                }
                className="w-full min-h-[44px] rounded-none border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition"
              >
                {outrightSale.buyerName ? 'Update Contract Terms' : 'Record Executed PSA'}
              </button>
            </div>

            {/* 3. Debt Payoff & Title Transfer */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Milestone 03
                </span>
                {outrightSale.deedTitleTransferred ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <CheckCircle size={13} weight="fill" />
                    Recorded
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400">Escrow Closing</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-foreground">Lender Payoff & Title Transfer</h3>
              <p className="text-[11px] text-muted-foreground">
                Payoff demand letter received and certified warranty deed transmitted for county recording.
              </p>
              <div className="pt-2 border-t border-border space-y-1 font-mono text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Lender Demand:</span>
                  <span className={outrightSale.lenderPayoffDemandReceived ? 'text-emerald-400' : 'text-foreground'}>
                    {outrightSale.lenderPayoffDemandReceived ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Deed Recorded:</span>
                  <span className={outrightSale.deedTitleTransferred ? 'text-emerald-400' : 'text-foreground'}>
                    {outrightSale.deedTitleTransferred ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                data-testid="toggle-deed-transferred-btn"
                onClick={() =>
                  onUpdateOutrightSale({
                    ...outrightSale,
                    deedTitleTransferred: !outrightSale.deedTitleTransferred,
                    lenderPayoffDemandReceived: true,
                  })
                }
                className="w-full min-h-[44px] rounded-none border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition"
              >
                {outrightSale.deedTitleTransferred ? 'Deed Transfer Recorded' : 'Confirm Deed Recordation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ROUTE B: REFINANCE & RETAIN (BRRRR)                     */}
      {/* ======================================================== */}
      {selectedRoute === 'refinance_retain' && (
        <div data-testid="route-b-refinance-view" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Appraised Refi Value</span>
              <span className="block text-base font-bold text-foreground mt-1">
                {formatCurrency(refinanceRetain.postRehabAppraisalValue)}
              </span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">New Loan Amount (75% LTV)</span>
              <span className="block text-base font-bold text-foreground mt-1">
                {formatCurrency(refinanceRetain.newLoanAmount)}
              </span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Cash-Out Equity Extracted</span>
              <span className="block text-base font-bold text-primary mt-1">
                {formatCurrency(refinanceRetain.cashOutEquityExtracted)}
              </span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">New Debt Service (P&I)</span>
              <span className="block text-base font-bold text-foreground mt-1">
                ${refinanceRetain.newMonthlyDebtService.toLocaleString()}/mo
              </span>
            </div>
          </div>

          <div className="rounded-none border border-border bg-muted/10 p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  <ArrowsClockwise size={16} className="text-primary" />
                  <span>DSCR Underwriting & Primary Debt Service Reset</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Executing permanent refinance pays off short-term construction debt and resets monthly debt service for long-term hold.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-primary">
                Ongoing DSCR: {refinanceRetain.ongoingDscr}x · CoC: {refinanceRetain.ongoingCashOnCashYield}%
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="constructionDebtPayoffCheckbox"
                  checked={refinanceRetain.constructionDebtPaidOff}
                  onChange={(e) =>
                    onUpdateRefinanceRetain({
                      ...refinanceRetain,
                      constructionDebtPaidOff: e.target.checked,
                    })
                  }
                  className="rounded-none border-border"
                />
                <label htmlFor="constructionDebtPayoffCheckbox" className="font-medium text-foreground cursor-pointer">
                  Construction / Bridge Loan Paid in Full ($363,750 senior payoff satisfied)
                </label>
              </div>

              <button
                type="button"
                data-testid="hand-back-to-hold-btn"
                onClick={() => {
                  onUpdateRefinanceRetain({
                    ...refinanceRetain,
                    handedBackToHold: true,
                  });
                  if (onHandBackToHold) onHandBackToHold();
                }}
                className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-none bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-none"
              >
                {refinanceRetain.handedBackToHold ? 'Handoff to Hold Completed' : 'Handoff to Active Hold Phase →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ROUTE C: DEVELOPED CONDO SALES (TASKS 1-4)               */}
      {/* ======================================================== */}
      {selectedRoute === 'condo_selloff' && (
        <div data-testid="route-c-condo-selloff-view" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Total Fee-Simple Units</span>
              <span className="block text-base font-bold text-foreground mt-1">{condoSellOff.totalUnits} Parcels</span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Units Sold to Date</span>
              <span className="block text-base font-bold text-primary mt-1">{condoSellOff.unitsSold} / {condoSellOff.totalUnits} Sold</span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Average Price / Parcel</span>
              <span className="block text-base font-bold text-foreground mt-1">{formatCurrency(condoSellOff.averageUnitPrice)}</span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Monthly HOA Dues</span>
              <span className="block text-base font-bold text-foreground mt-1">${condoSellOff.monthlyDuesPerUnit}/mo</span>
            </div>
          </div>

          {/* 4 Dedicated Regulatory & Execution Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Task 1: Condominium Declaration & Plat Filing */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 01 · Legal Declaration
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Recorded
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Condominium Declaration &amp; Plat Filing</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Master deed, declaration covenants, and certified survey plats are legally recorded with the municipal registry to establish individual tax parcels.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Tax Parcels: <strong className="text-foreground">{condoSellOff.totalUnits} Recorded</strong></span>
                <span className="text-emerald-400">Plat Approved</span>
              </div>
            </div>

            {/* Task 2: Launch the HOA & Initial Budget */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 02 · Association Governance
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Active
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Launch HOA &amp; Initial Reserve Budget</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Homeowners Association incorporated, bylaws adopted, and initial reserve accounts funded to facilitate building management transfer.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>HOA: <strong className="text-foreground">{condoSellOff.hoaEntityName}</strong></span>
                <span>Dues: <strong className="text-foreground">${condoSellOff.monthlyDuesPerUnit}/mo</strong></span>
              </div>
            </div>

            {/* Task 3: Public Offering Statement (POS) Delivery */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 03 · Statutory Disclosures
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Delivered
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Public Offering Statement (POS) Delivery</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Legal disclosure booklets detailing construction warranties, association governance, operating budgets, and CC&amp;Rs delivered to all prospective buyers.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Compliance: <strong className="text-foreground">Fannie / FHA Ready</strong></span>
                <span className="text-emerald-400">POS Certified</span>
              </div>
            </div>

            {/* Task 4: Phased Marketing & Sales Closings */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 04 · Phased Debt Paydown
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary">
                  <Clock size={13} />
                  In Progress
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Phased Marketing &amp; Sales Closings</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Contracted sales gallery securing buyer deposits. Individual unit closings systematically pay down construction loan release prices.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Tranches: <strong className="text-foreground">{condoSellOff.unitsSold} Closed</strong></span>
                <span>Paydown: <strong className="text-foreground">$180,000 Paid</strong></span>
              </div>
            </div>
          </div>

          {/* Unit Tranche Distribution Schedule */}
          <div className="rounded-none border border-border bg-muted/10 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                <Building size={16} className="text-primary" />
                <span>Unitized Tranche Sales &amp; Release Price Paydown Schedule</span>
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                Fannie / Freddie / FHA Eligible
              </span>
            </div>

            <div className="space-y-2">
              {condoSellOff.tranches.map((tranche) => (
                <div
                  key={tranche.trancheNumber}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 border border-border bg-card rounded-none text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-foreground">Tranche {tranche.trancheNumber}</span>
                    <span className="text-muted-foreground"> · {tranche.unitsCount} Unit(s) at {formatCurrency(tranche.pricePerUnit)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">Release Paydown: <strong className="text-foreground">{formatCurrency(tranche.releasePricePaydown)}</strong></span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        tranche.status === 'closed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : tranche.status === 'under_contract'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {tranche.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border">
              <span>HOA Entity: <strong className="text-foreground">{condoSellOff.hoaEntityName}</strong></span>
              <span>Board Transition Threshold: <strong className="text-foreground">75% Units Sold</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ROUTE D: DEVELOPED CO-OP SALES (TASKS 1-4)                */}
      {/* ======================================================== */}
      {selectedRoute === 'coop_selloff' && (
        <div data-testid="route-d-coop-selloff-view" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Total Corporate Shares</span>
              <span className="block text-base font-bold text-foreground mt-1">
                {(coopSellOff?.totalCorporateShares || 10000).toLocaleString()} Shares
              </span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Shares Allocated &amp; Sold</span>
              <span className="block text-base font-bold text-primary mt-1">
                {(coopSellOff?.sharesSold || 4200).toLocaleString()} / {(coopSellOff?.totalCorporateShares || 10000).toLocaleString()}
              </span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Average Price / Share</span>
              <span className="block text-base font-bold text-foreground mt-1">
                ${coopSellOff?.averageSharePrice || 85} / Share
              </span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Proprietary Leases</span>
              <span className="block text-base font-bold text-foreground mt-1">
                {coopSellOff?.proprietaryLeasesExecutedCount || 2} Executed
              </span>
            </div>
          </div>

          {/* 4 Dedicated Co-op Regulatory Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Task 1: Form the Housing Corporation */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 01 · Corporate Entity
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Incorporate
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Form the Housing Corporation</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Co-op corporation incorporated to hold the master title to the land and building. Proprietary leases issued against corporate stock shares.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Corp: <strong className="text-foreground">{coopSellOff?.housingCorpEntityName || 'The Elm Housing Corp'}</strong></span>
                <span className="text-emerald-400">Master Title Held</span>
              </div>
            </div>

            {/* Task 2: Establish the Board of Directors & Acceptance Rules */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 02 · Board Rules &amp; Standards
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Adopted
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Establish Board &amp; Buyer Acceptance Rules</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Corporate bylaws, house rules, and strict financial standards (max DTI, post-closing liquid reserve requirements) drafted and ratified.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Max DTI: <strong className="text-foreground">{coopSellOff?.minimumBuyerDtiPct || 28}%</strong></span>
                <span>Reserves: <strong className="text-foreground">{coopSellOff?.minimumLiquidReserveMonths || 24} mos</strong></span>
              </div>
            </div>

            {/* Task 3: Offering Plan Clearance */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 03 · State Regulatory Clearance
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  AG Cleared
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Cooperative Offering Plan Clearance</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Formal cooperative offering plan filed, reviewed, and declared effective with state regulatory authorities (State Attorney General Real Estate Finance Bureau).
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>AG File: <strong className="text-foreground">{coopSellOff?.agClearanceNumber || 'AG-REALTY-84920'}</strong></span>
                <span className="text-emerald-400">Effective</span>
              </div>
            </div>

            {/* Task 4: Manage Share Allocation & Co-op Board Reviews */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 04 · Board Review &amp; Issuance
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary">
                  <Clock size={13} />
                  Active Reviews
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Manage Share Allocations &amp; Board Packages</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Facilitate prospective buyer financial packages and board interviews. Issue stock certificates and proprietary leases upon closing.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Stock Certificates: <strong className="text-foreground">{coopSellOff?.stockCertificatesIssuedCount || 2} Issued</strong></span>
                <span className="text-primary font-bold">2 Under Contract</span>
              </div>
            </div>
          </div>

          {/* Share Allocation & Proprietary Lease Ledger */}
          <div className="rounded-none border border-border bg-muted/10 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                <FileCheck size={16} className="text-primary" />
                <span>Share Allocation &amp; Proprietary Lease Disposition Ledger</span>
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                Corporate Stock + Proprietary Lease Structure
              </span>
            </div>

            <div className="space-y-2">
              {(coopSellOff?.shareAllocations || []).map((alloc) => (
                <div
                  key={alloc.unitNumber}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 border border-border bg-card rounded-none text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-foreground">{alloc.unitNumber}</span>
                    <span className="text-muted-foreground"> · {alloc.sharesAllocated.toLocaleString()} Shares ({alloc.buyerName || 'Unassigned'})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      Proprietary Lease: <strong className="text-foreground">{alloc.proprietaryLeaseSigned ? 'Signed' : 'Pending'}</strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        alloc.status === 'closed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : alloc.status === 'interview_scheduled'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : alloc.status === 'in_review'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {alloc.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ROUTE D: LEASE-OPTION CONVERSION                         */}
      {/* ======================================================== */}
      {selectedRoute === 'lease_option' && (
        <div data-testid="route-d-lease-option-view" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Agreed Strike Price</span>
              <span className="block text-base font-bold text-foreground mt-1">{formatCurrency(leaseOption.strikePrice)}</span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Upfront Option Fee</span>
              <span className="block text-base font-bold text-primary mt-1">{formatCurrency(leaseOption.upfrontOptionFee)}</span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Monthly Rent Credit</span>
              <span className="block text-base font-bold text-foreground mt-1">${leaseOption.monthlyOptionCredit}/mo</span>
            </div>
            <div className="rounded-none border border-border bg-muted/20 p-3 text-center">
              <span className="block text-[10px] uppercase text-muted-foreground">Accumulated Credits</span>
              <span className="block text-base font-bold text-foreground mt-1">{formatCurrency(leaseOption.accumulatedOptionCredits)}</span>
            </div>
          </div>

          {/* 4 Dedicated Lease-Option Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Task 1: Draft the Lease-Option Agreement */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 01 · Legal Agreement
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Executed
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Draft Lease-Option Agreement</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Two distinct contracts executed: standard residential lease contract and bilateral option agreement specifying future purchase strike price and expiration date.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Strike Price: <strong className="text-foreground">{formatCurrency(leaseOption.strikePrice)}</strong></span>
                <span>Term: <strong className="text-foreground">{leaseOption.leaseTermMonths} Months</strong></span>
              </div>
            </div>

            {/* Task 2: Manage Option Premium Escrow */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 02 · Escrow &amp; Rent Credits
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Secured
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Manage Option Premium Escrow</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Upfront non-refundable option fee secured in escrow. Monthly rent credits tracked and credited towards tenant down payment upon purchase trigger.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Option Fee: <strong className="text-foreground">{formatCurrency(leaseOption.upfrontOptionFee)}</strong></span>
                <span>Credits: <strong className="text-foreground">{formatCurrency(leaseOption.accumulatedOptionCredits)}</strong></span>
              </div>
            </div>

            {/* Task 3: Routine Maintenance Covenants */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 03 · Operational Covenants
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Tenant Active
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Routine Maintenance Covenants</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Clear delineation of repair responsibilities: minor maintenance covenants transitioned to option tenant, minimizing landlord operating drag.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Repairs under $500: <strong className="text-foreground">Tenant Responsible</strong></span>
                <span className="text-emerald-400">Covenant Signed</span>
              </div>
            </div>

            {/* Task 4: Trigger the Purchase */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 04 · Purchase Conversion
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary">
                  <Clock size={13} />
                  Underwriting
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Trigger Purchase &amp; Underwriting</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Oversee tenant mortgage pre-qualification at option term expiration, credit accumulated deposits, and close title conveyance to buyer.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Credit Score: <strong className="text-foreground">{leaseOption.tenantCreditScoreTarget}+</strong></span>
                <span className="text-primary font-bold">Pre-Qualified</span>
              </div>
            </div>
          </div>

          <div className="rounded-none border border-border bg-muted/10 p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                <Key size={16} className="text-primary" />
                <span>Option Agreement &amp; Tenant Buyer Conversion Controls</span>
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                Expires: {leaseOption.optionExpiryDate}
              </span>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Tenant buyer has reached credit score target of <strong className="text-foreground">{leaseOption.tenantCreditScoreTarget}</strong>.
              Upon formal exercise, accumulated credits ($
              {leaseOption.accumulatedOptionCredits.toLocaleString()}) and option fee are applied to the strike price ($
              {leaseOption.strikePrice.toLocaleString()}) to execute standard closing.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <span className="text-xs font-mono text-muted-foreground">
                Status: <strong className="text-foreground uppercase">{leaseOption.conversionTriggered}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="trigger-lease-option-sale-btn"
                  onClick={() =>
                    onUpdateLeaseOption({
                      ...leaseOption,
                      conversionTriggered: 'exercised_sale',
                    })
                  }
                  className="min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-none bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-none"
                >
                  Exercise Option &amp; Convert to Sale
                </button>
                <button
                  type="button"
                  data-testid="expire-lease-option-btn"
                  onClick={() =>
                    onUpdateLeaseOption({
                      ...leaseOption,
                      conversionTriggered: 'expired_hold',
                    })
                  }
                  className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-none border border-border bg-muted/40 hover:bg-muted text-foreground transition"
                >
                  Expire Option (Retain Fee &amp; Hold)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ROUTE F: 1031 TAX-DEFERRED EXCHANGE / TRADITIONAL RENTAL */}
      {/* ======================================================== */}
      {selectedRoute === '1031_exchange' && (
        <div data-testid="route-e-1031-exchange-view" className="space-y-4">
          {/* 4 Dedicated Traditional Rental Portfolio Exit Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Task 1: Financial Stabilization & Audit */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 01 · Trailing Financials
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Audited
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Financial Stabilization &amp; T-12 Audit</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Profit and loss statements (P&amp;Ls), rent rolls, and trailing 12-month metrics reconciled to compute an accurate exit capitalization rate.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Exit Cap Rate: <strong className="text-foreground">6.25%</strong></span>
                <span className="text-emerald-400">T-12 Verified</span>
              </div>
            </div>

            {/* Task 2: Lease Auditing & Estoppel Certificates */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 02 · Tenant Estoppels
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Certified
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Lease Auditing &amp; Estoppel Certificates</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Tenant estoppel certificates signed verifying exact rent amounts, security deposits, and lease terms to eliminate buyer price retrades.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Estoppels: <strong className="text-foreground">100% Signed</strong></span>
                <span className="text-emerald-400">Zero Disputes</span>
              </div>
            </div>

            {/* Task 3: Tenant Notification & Security Deposit Transfer */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 03 · Tenant Escrow Transfer
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  Prepared
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Tenant Notice &amp; Deposit Escrow Transfer</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Formal ownership transfer notices dispatched to all occupants. Security deposits and prepaid rent transferred into buyer escrow accounts.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Deposits: <strong className="text-foreground">$7,600 in Escrow</strong></span>
                <span className="text-emerald-400">Notices Queued</span>
              </div>
            </div>

            {/* Task 4: Tax Deferral Execution */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                  Task 04 · Section 1031 Rollover
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <CheckCircle size={13} weight="fill" />
                  QI Retained
                </span>
              </div>
              <h4 className="font-semibold text-foreground">Tax Deferral Execution (1031 Exchange)</h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Qualified Intermediary retained prior to closing. Funds held in segregated escrow to roll proceeds into replacement assets and defer capital gains taxes.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Deferred Tax: <strong className="text-foreground">{formatCurrency(exchange1031.taxDeferredAmount)}</strong></span>
                <span className="text-emerald-400">{exchange1031.qiName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 45-Day Identification Timer Card */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Clock size={14} className="text-primary" />
                  <span>45-Day Identification Window</span>
                </span>
                <span className="rounded-none bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] font-mono text-primary font-bold">
                  Safe Harbor Strict
                </span>
              </div>
              <p className="text-lg font-mono font-bold text-foreground">
                Deadline: {exchange1031.identificationDeadline}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Must formally identify up to 3 replacement properties in writing to the Qualified Intermediary before midnight on Day 45.
              </p>
            </div>

            {/* 180-Day Settlement Timer Card */}
            <div className="rounded-none border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <CalendarCheck size={14} className="text-primary" />
                  <span>180-Day Replacement Closing Window</span>
                </span>
                <span className="rounded-none bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground font-bold">
                  Settlement Clock
                </span>
              </div>
              <p className="text-lg font-mono font-bold text-foreground">
                Deadline: {exchange1031.replacementClosingDeadline}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Acquisition of identified replacement property must close within 180 calendar days of relinquished asset deed recording.
              </p>
            </div>
          </div>

          {/* Identified Replacement Properties Table */}
          <div className="rounded-none border border-border bg-muted/10 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                <Building size={16} className="text-primary" />
                <span>Identified Replacement Properties (3-Property Rule)</span>
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                QI: <strong className="text-foreground">{exchange1031.qiName}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {exchange1031.identifiedProperties.map((prop, idx) => (
                <div
                  key={prop.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 border border-border bg-card rounded-none text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-foreground">Target #{idx + 1}: {prop.address}</span>
                    <span className="text-muted-foreground"> · {formatCurrency(prop.estimatedValue)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">Identified {prop.identifiedDate}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        prop.status === 'under_contract'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {prop.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border">
              <span>Estimated Tax Deferred: <strong className="text-primary">{formatCurrency(exchange1031.taxDeferredAmount)}</strong></span>
              <button
                type="button"
                data-testid="pass-to-new-acquisition-btn"
                onClick={() =>
                  onUpdateExchange1031({
                    ...exchange1031,
                    passedForwardToNewAcquisition: true,
                  })
                }
                className="min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-none bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-none"
              >
                {exchange1031.passedForwardToNewAcquisition
                  ? 'Parameters Passed to Phase 01 Instance'
                  : 'Pass Equity to New Acquisition Phase Instance →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
