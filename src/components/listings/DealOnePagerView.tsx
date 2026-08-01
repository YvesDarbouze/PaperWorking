'use client';

import React from 'react';
import type { Project } from '@/types/schema';
import type { DealListing } from '@/types/listing';
import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import { Building2, MapPin, Info, AlertTriangle, ShieldCheck, Calendar, ArrowRight, HelpCircle, Receipt, Landmark, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import ListingStatusBadge from './ListingStatusBadge';
import FollowDealButton from './FollowDealButton';
import FollowInvestorButton from './FollowInvestorButton';
import RespondToTermsButton from './RespondToTermsButton';
import { getVariableProvenance, calculateDealCompleteness } from '@/lib/identity/provenance';
import { ProvenanceBadge } from './SubscriberDealCard';

interface DealOnePagerViewProps {
  project: Project;
  listing?: DealListing;
  followStatus?: { followingDeal: boolean; followingInvestor: boolean };
  onFollowChange?: () => void;
  readOnly?: boolean;
}

export default function DealOnePagerView({
  project,
  listing,
  followStatus,
  onFollowChange,
  readOnly = false,
}: DealOnePagerViewProps) {
  // Derive metrics live from the project document using the G-2 engine
  const metrics = deriveAllProjectMetrics(project);

  const projectId = project.id;
  const financials = project.financials || {};

  // Formatting helpers
  const formatUSD = (val: number | undefined | null) => {
    if (val == null) return '—';
    return `$${Math.round(val).toLocaleString('en-US')}`;
  };

  const formatPct = (pct: number | undefined | null) => {
    if (pct == null) return '—';
    return `${Number(pct.toFixed(2))}%`;
  };

  const formatRatio = (val: number | undefined | null) => {
    if (val == null) return '—';
    return val.toFixed(2);
  };

  // ── Missing Fields Checks (G-3 / Honesty Rule compliance) ──
  const modality = project.fundingPlan?.modality || [];
  const isFin =
    modality.some((m) =>
      ['conventional_loan', 'sba_504', 'hard_money', 'bridge'].includes(m)
    ) ||
    (project.loans && project.loans.length > 0) ||
    (financials.capitalStack || []).some((s: any) =>
      [
        'Conventional Financing',
        'Hard Money Loans',
        'SBA 504 Bank First Lien',
        'SBA 504 CDC Debenture',
        'Bridge Loans',
      ].includes(s.category)
    );
  const hasUnresolvedFinancing = isFin && !project.termsLocked;

  // Identify the missing inputs for each metric we display
  const priceVal = project.askingPriceCents ? project.askingPriceCents / 100 : financials.purchasePrice;
  const isPriceMissing = !priceVal || priceVal <= 0;
  const priceGap = isPriceMissing
    ? {
        missing: ['Purchase Price'],
        route: `/dashboard/projects/${projectId}/phase-1?card=F1.1`,
        label: 'Property facts card',
      }
    : null;

  const isCapRateMissing = metrics.capRate == null;
  const capRateGap = isCapRateMissing
    ? {
        missing: ['Estimated ARV / Current Value', 'NOI (Rent & Expenses)'],
        route: `/dashboard/projects/${projectId}`,
        label: 'Underwriting Workspace',
      }
    : null;

  const isCocMissing = metrics.cashOnCashReturn == null;
  const cocGap = isCocMissing
    ? hasUnresolvedFinancing
      ? {
          missing: ['Locked Loan Terms'],
          route: `/dashboard/projects/${projectId}/phase-2?card=F3.5`,
          label: 'Locked Terms card (F3.5)',
        }
      : {
          missing: ['Loan Amount', 'Interest Rate', 'Down Payment / Cash Invested'],
          route: `/dashboard/projects/${projectId}/phase-2`,
          label: 'Financing Workspace',
        }
    : null;

  const isNoiMissing = metrics.noi == null;
  const noiGap = isNoiMissing
    ? {
        missing: [
          'Monthly Gross Rent',
          'Vacancy Rate %',
          'Taxes / Insurance / Utilities',
          'Property Mgmt Fee',
          'Maintenance Reserve',
        ],
        route: `/dashboard/projects/${projectId}`,
        label: 'Underwriting Workspace',
      }
    : null;

  const seekingVal = financials.equityTerms?.funding_target;
  const isSeekingMissing = seekingVal == null || seekingVal <= 0;
  const seekingGap = isSeekingMissing
    ? {
        missing: ['Funding Target'],
        route: `/dashboard/projects/${projectId}/phase-2?card=F3.5`,
        label: 'Locked Terms card (F3.5)',
      }
    : null;

  const allGaps: Array<{ missing: string[]; route: string; label: string }> = [];
  if (priceGap) allGaps.push(priceGap);
  if (capRateGap) allGaps.push(capRateGap);
  if (cocGap) allGaps.push(cocGap);
  if (noiGap) allGaps.push(noiGap);
  if (seekingGap) allGaps.push(seekingGap);

  const uniqueMissingFields = Array.from(new Set(allGaps.flatMap((g) => g.missing)));
  const primaryCollectLink =
    allGaps[0] || allGaps[1] || allGaps[2] || allGaps[3] || allGaps[4] || null;

  // Completeness indicator (DM-19)
  const completeness = calculateDealCompleteness(project);

  // ── Sources and Uses Calculations (Projected vs Actual comparison) ──
  const purchasePriceProjected = metrics.purchasePrice;
  const rehabProjected = metrics.renovationCosts;
  const closingCostsBuyProjected = metrics.closingCostsBuy;
  const holdingCostsProjected = metrics.holdingCosts;
  const closingCostsSellProjected = metrics.closingCostsSell;
  const totalUsesProjected = metrics.totalInvestment || 0;

  const totalCashInvestedVal = metrics.totalCashInvested ?? 0;
  const seniorDebtProjected = (metrics.totalInvestment || 0) - totalCashInvestedVal;
  const investorEquityProjected = totalCashInvestedVal;
  const totalSourcesProjected = seniorDebtProjected + investorEquityProjected;

  // Actual Sources & Uses
  const finAny = financials as any;
  const hasActuals = project.currentPhase && project.currentPhase > 1;
  const purchasePriceActual = finAny.purchasePriceActual || (hasActuals ? financials.purchasePrice : null);
  const rehabActual = finAny.actualRehabCost ?? finAny.rehabSpend ?? finAny.rehab_spend ?? null;
  const closingCostsBuyActual = finAny.actualClosingCosts ?? financials.closingCosts ?? null;
  const holdingCostsActual = finAny.actualHoldingCosts ?? finAny.totalHoldingCosts ?? null;
  const closingCostsSellActual = finAny.actualClosingCostsSell ?? finAny.closingCostsSell ?? null;
  const totalUsesActual = purchasePriceActual !== null || rehabActual !== null
    ? (purchasePriceActual ?? 0) + (rehabActual ?? 0) + (closingCostsBuyActual ?? 0) + (holdingCostsActual ?? 0) + (closingCostsSellActual ?? 0)
    : null;

  const seniorDebtActual = financials.loanAmount || null;
  const investorEquityActual = totalUsesActual !== null && seniorDebtActual !== null
    ? totalUsesActual - seniorDebtActual
    : finAny.actualCashInvested ?? finAny.totalCashInvested ?? null;
  const totalSourcesActual = seniorDebtActual !== null && investorEquityActual !== null
    ? seniorDebtActual + investorEquityActual
    : null;

  // Exit strategy details
  const isSale = project.dispositionType === 'SALE';

  // Resolving variable provenances (DM-19)
  const priceProjProv = getVariableProvenance('purchase_price', project, 'projected');
  const priceActProv = getVariableProvenance('purchase_price', project, 'actual');
  const rehabProjProv = getVariableProvenance('rehab_budget', project, 'projected');
  const rehabActProv = getVariableProvenance('rehab_budget', project, 'actual');
  const closingProjProv = getVariableProvenance('closing_costs', project, 'projected');
  const closingActProv = getVariableProvenance('closing_costs', project, 'actual');
  const holdingProjProv = getVariableProvenance('holding_costs', project, 'projected');
  const holdingActProv = getVariableProvenance('holding_costs', project, 'actual');
  const sellingProjProv = getVariableProvenance('closing_costs_sell', project, 'projected');
  const sellingActProv = getVariableProvenance('closing_costs_sell', project, 'actual');

  const debtProjProv = getVariableProvenance('loan_amount', project, 'projected');
  const debtActProv = getVariableProvenance('loan_amount', project, 'actual');
  const equityProjProv = getVariableProvenance('cash_to_close', project, 'projected');
  const equityActProv = getVariableProvenance('cash_to_close', project, 'actual');

  // Top header price provenance
  const askingPriceProvenance = getVariableProvenance('purchase_price', project, 'projected');

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6 bg-surface-container-low/10 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {listing?.status && <ListingStatusBadge status={listing.status} />}
              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] px-2 py-0.5 rounded-full border border-pw-border bg-surface-container-low/20">
                {project.assetClass || 'Residential'}
              </span>
              {(project.subStrategy || project.dispositionType) && (
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
                  {project.subStrategy || project.dispositionType}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
              {project.propertyName || 'Untitled Opportunity'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{project.address}</span>
            </div>
            <div className="pt-1.5">
              <span 
                className="text-[10px] font-black uppercase tracking-[0.06em] text-white bg-neutral-900/60 px-2.5 py-1 rounded-full border border-pw-border flex items-center gap-1.5 w-fit"
                data-testid="completeness-indicator"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Completeness: {completeness.score}% ({completeness.filled}/{completeness.total} Required Fields)
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
              Asking Price
            </p>
            <p className="text-2xl font-bold font-mono text-[var(--color-on-surface)] flex items-center justify-end">
              {isPriceMissing ? '—' : formatUSD(priceVal)}
              <ProvenanceBadge
                source={askingPriceProvenance}
                project={project}
                fieldId="purchase_price"
                exposedDocumentIds={listing?.exposedDocumentIds || []}
              />
            </p>
          </div>
        </div>
      </div>

      {/* ── Honesty Rule Gap Display ── */}
      {uniqueMissingFields.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 p-5 bg-amber-500/[0.04] space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Lacking Underwriting Inputs (Honesty Rule)</span>
          </div>
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Every deal card must honestly disclose missing metrics rather than showing placeholders or zeroes. The following fields must be configured to complete this deal scorecard:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
            {uniqueMissingFields.map((f) => (
              <li key={f} className="text-xs text-amber-300/70 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {primaryCollectLink && !readOnly && (
            <div className="pt-2">
              <Link
                href={primaryCollectLink.route}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 underline min-h-[36px]"
              >
                Go to {primaryCollectLink.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Headline Metrics Scorecard (DM-19: Split columns for Projected vs Actual) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Projected Underwriting */}
        <div className="space-y-3 border-2 border-dashed border-amber-500/20 rounded-2xl p-5 bg-amber-500/[0.01]">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-black uppercase tracking-[0.08em] text-amber-400">
                Projected Underwriting (Assumptions)
              </h2>
            </div>
            <span className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
              Projected
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Net Operating Income',
                value: isNoiMissing ? 'Lacking inputs' : formatUSD(metrics.noi),
                isMissing: isNoiMissing,
                icon: 'payments',
              },
              {
                label: 'Cap Rate',
                value: isCapRateMissing ? 'Lacking inputs' : formatPct(metrics.capRate),
                isMissing: isCapRateMissing,
                icon: 'trending_up',
              },
              {
                label: 'Annual Cash Flow',
                value: isNoiMissing || (isFin && metrics.annualCashFlow == null) ? 'Lacking inputs' : formatUSD(metrics.annualCashFlow) + ' / yr',
                isMissing: isNoiMissing || (isFin && metrics.annualCashFlow == null),
                icon: 'account_balance_wallet',
              },
              {
                label: 'Cash-on-Cash',
                value: isCocMissing ? 'Lacking inputs' : formatPct(metrics.cashOnCashReturn),
                isMissing: isCocMissing,
                icon: 'account_balance',
              },
              {
                label: 'DSCR',
                value: metrics.dscr == null || metrics.dscr === 0 ? 'Lacking inputs' : formatRatio(metrics.dscr),
                isMissing: metrics.dscr == null || metrics.dscr === 0,
                icon: 'shield',
              },
              {
                label: 'LTV Ratio',
                value: metrics.ltv == null ? 'Lacking inputs' : formatPct(metrics.ltv),
                isMissing: metrics.ltv == null,
                icon: 'percent',
              },
              {
                label: 'Expense Ratio (OER)',
                value: metrics.oer == null || metrics.oer === 0 ? 'Lacking inputs' : formatPct(metrics.oer),
                isMissing: metrics.oer == null || metrics.oer === 0,
                icon: 'query_stats',
              },
              {
                label: 'Gross Rent Multiplier',
                value: metrics.grossRentMultiplier == null || metrics.grossRentMultiplier === 0 ? 'Lacking inputs' : formatRatio(metrics.grossRentMultiplier),
                isMissing: metrics.grossRentMultiplier == null || metrics.grossRentMultiplier === 0,
                icon: 'grid_view',
              },
              {
                label: 'Occupancy Rate',
                value: metrics.occupancyRate == null ? 'Lacking inputs' : formatPct(metrics.occupancyRate),
                isMissing: metrics.occupancyRate == null,
                icon: 'home',
              },
              {
                label: 'Projected ROI/IRR',
                value: isSale ? (metrics.roi == null ? 'Lacking inputs' : formatPct(metrics.roi) + ' ROI') : (metrics.annualizedIrr != null ? formatPct(metrics.annualizedIrr) + ' IRR' : 'Lacking inputs'),
                isMissing: isSale ? metrics.roi == null : metrics.annualizedIrr == null,
                icon: 'insights',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`glass-card rounded-xl border p-3 space-y-1 ${
                  item.isMissing
                    ? 'border-amber-500/10 bg-amber-500/[0.01]'
                    : 'border-amber-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px] text-amber-500/50">
                      {item.icon}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-amber-500/70 truncate">
                      {item.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap">
                  <p
                    className={`text-sm font-bold font-mono tabular-nums leading-tight ${
                      item.isMissing ? 'text-amber-500/60 italic text-[10px] font-sans' : 'text-amber-100'
                    }`}
                  >
                    {item.value}
                  </p>
                  {!item.isMissing && <ProvenanceBadge source="derived" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Actual / Live Underwriting */}
        <div className="space-y-3 border-2 border-emerald-500/20 rounded-2xl p-5 bg-emerald-500/[0.01]">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-[0.08em] text-emerald-400">
                Actual / Verified (Operations)
              </h2>
            </div>
            <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              Verified
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Net Operating Income',
                value: metrics.kpi33?.NOI?.actual != null ? formatUSD(metrics.kpi33.NOI.actual) : 'Lacking ledger / actuals',
                isMissing: metrics.kpi33?.NOI?.actual == null,
                icon: 'payments',
              },
              {
                label: 'Cap Rate',
                value: metrics.kpi33?.CAP_RATE?.actual != null ? formatPct(metrics.kpi33.CAP_RATE.actual) : 'Requires valuation',
                isMissing: metrics.kpi33?.CAP_RATE?.actual == null,
                icon: 'trending_up',
              },
              {
                label: 'Annual Cash Flow',
                value: metrics.kpi33?.CASH_FLOW?.actual != null ? formatUSD(metrics.kpi33.CASH_FLOW.actual) + ' / yr' : 'Lacking ledger / actuals',
                isMissing: metrics.kpi33?.CASH_FLOW?.actual == null,
                icon: 'account_balance_wallet',
              },
              {
                label: 'Cash-on-Cash',
                value: metrics.kpi33?.COC?.actual != null ? formatPct(metrics.kpi33.COC.actual) : 'Lacking ledger / actuals',
                isMissing: metrics.kpi33?.COC?.actual == null,
                icon: 'account_balance',
              },
              {
                label: 'DSCR',
                value: metrics.kpi33?.DSCR?.actual != null ? formatRatio(metrics.kpi33.DSCR.actual) : 'Lacking ledger / actuals',
                isMissing: metrics.kpi33?.DSCR?.actual == null,
                icon: 'shield',
              },
              {
                label: 'LTV Ratio',
                value: metrics.kpi33?.LTV?.actual != null ? formatPct(metrics.kpi33.LTV.actual) : 'Requires valuation',
                isMissing: metrics.kpi33?.LTV?.actual == null,
                icon: 'percent',
              },
              {
                label: 'Expense Ratio (OER)',
                value: metrics.kpi33?.OER?.actual != null ? formatPct(metrics.kpi33.OER.actual) : 'Lacking ledger / actuals',
                isMissing: metrics.kpi33?.OER?.actual == null,
                icon: 'query_stats',
              },
              {
                label: 'Gross Rent Multiplier',
                value: metrics.kpi33?.GRM?.actual != null ? formatRatio(metrics.kpi33.GRM.actual) : 'Lacking ledger / actuals',
                isMissing: metrics.kpi33?.GRM?.actual == null,
                icon: 'grid_view',
              },
              {
                label: 'Occupancy Rate',
                value: metrics.kpi33?.OCCUPANCY?.actual != null ? formatPct(metrics.kpi33.OCCUPANCY.actual) : 'Requires tenant registry',
                isMissing: metrics.kpi33?.OCCUPANCY?.actual == null,
                icon: 'home',
              },
              {
                label: 'Verified ROI/IRR',
                value: metrics.kpi33?.ROI?.actual != null ? formatPct(metrics.kpi33.ROI.actual) : 'Requires exit record',
                isMissing: metrics.kpi33?.ROI?.actual == null,
                icon: 'insights',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`glass-card rounded-xl border p-3 space-y-1 ${
                  item.isMissing
                    ? 'border-emerald-500/10 bg-emerald-500/[0.01]'
                    : 'border-emerald-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px] text-emerald-500/50">
                      {item.icon}
                    </span>
                    <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-emerald-500/70 truncate">
                      {item.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap">
                  <p
                    className={`text-sm font-bold font-mono tabular-nums leading-tight ${
                      item.isMissing ? 'text-amber-500/60 italic text-[10px] font-sans' : 'text-emerald-100'
                    }`}
                  >
                    {item.value}
                  </p>
                  {!item.isMissing && <ProvenanceBadge source="derived" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sources and Uses Table (Strict Balance Comparison) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Uses Table */}
        <div className="glass-card rounded-2xl border border-pw-border overflow-hidden bg-surface-container-low/5">
          <div className="px-6 py-4 border-b border-pw-border bg-surface-container-low/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[var(--color-muted)]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Capital Uses Comparison
              </h3>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pw-border text-[10px] font-bold uppercase text-[var(--color-muted)] bg-surface-container-low/5">
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-right">Projected</th>
                <th className="px-6 py-3 text-right">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pw-border font-mono">
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">Purchase Price</td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  <span className="inline-flex items-center">
                    {formatUSD(purchasePriceProjected)}
                    <ProvenanceBadge
                      source={priceProjProv}
                      project={project}
                      fieldId="purchase_price"
                      exposedDocumentIds={listing?.exposedDocumentIds || []}
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  <span className="inline-flex items-center justify-end">
                    {purchasePriceActual !== null ? formatUSD(purchasePriceActual) : '—'}
                    {purchasePriceActual !== null && (
                      <ProvenanceBadge
                        source={priceActProv}
                        project={project}
                        fieldId="purchase_price"
                        exposedDocumentIds={listing?.exposedDocumentIds || []}
                      />
                    )}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">Renovation & Rehab</td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  <span className="inline-flex items-center">
                    {formatUSD(rehabProjected)}
                    <ProvenanceBadge
                      source={rehabProjProv}
                      project={project}
                      fieldId="rehab_budget"
                      exposedDocumentIds={listing?.exposedDocumentIds || []}
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  <span className="inline-flex items-center justify-end">
                    {rehabActual !== null ? formatUSD(rehabActual) : '—'}
                    {rehabActual !== null && (
                      <ProvenanceBadge
                        source={rehabActProv}
                        project={project}
                        fieldId="rehab_budget"
                        exposedDocumentIds={listing?.exposedDocumentIds || []}
                      />
                    )}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">Acquisition Closing Costs</td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  <span className="inline-flex items-center">
                    {formatUSD(closingCostsBuyProjected)}
                    <ProvenanceBadge
                      source={closingProjProv}
                      project={project}
                      fieldId="closing_costs"
                      exposedDocumentIds={listing?.exposedDocumentIds || []}
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  <span className="inline-flex items-center justify-end">
                    {closingCostsBuyActual !== null ? formatUSD(closingCostsBuyActual) : '—'}
                    {closingCostsBuyActual !== null && (
                      <ProvenanceBadge
                        source={closingActProv}
                        project={project}
                        fieldId="closing_costs"
                        exposedDocumentIds={listing?.exposedDocumentIds || []}
                      />
                    )}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">Projected Carry / Holding Costs</td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  <span className="inline-flex items-center">
                    {formatUSD(holdingCostsProjected)}
                    <ProvenanceBadge
                      source={holdingProjProv}
                      project={project}
                      fieldId="holding_costs"
                      exposedDocumentIds={listing?.exposedDocumentIds || []}
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  <span className="inline-flex items-center justify-end">
                    {holdingCostsActual !== null ? formatUSD(holdingCostsActual) : '—'}
                    {holdingCostsActual !== null && (
                      <ProvenanceBadge
                        source={holdingActProv}
                        project={project}
                        fieldId="holding_costs"
                        exposedDocumentIds={listing?.exposedDocumentIds || []}
                      />
                    )}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">Exit / Broker Transaction Costs</td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  <span className="inline-flex items-center">
                    {formatUSD(closingCostsSellProjected)}
                    <ProvenanceBadge
                      source={sellingProjProv}
                      project={project}
                      fieldId="closing_costs_sell"
                      exposedDocumentIds={listing?.exposedDocumentIds || []}
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  <span className="inline-flex items-center justify-end">
                    {closingCostsSellActual !== null ? formatUSD(closingCostsSellActual) : '—'}
                    {closingCostsSellActual !== null && (
                      <ProvenanceBadge
                        source={sellingActProv}
                        project={project}
                        fieldId="closing_costs_sell"
                        exposedDocumentIds={listing?.exposedDocumentIds || []}
                      />
                    )}
                  </span>
                </td>
              </tr>
              <tr className="bg-surface-container-low/20 font-bold border-t-2 border-pw-border">
                <td className="px-6 py-4 font-sans text-[var(--color-on-surface)] uppercase tracking-wider text-[10px]">
                  Total Uses
                </td>
                <td className="px-6 py-4 text-right text-[var(--color-on-surface)] text-sm">
                  {formatUSD(totalUsesProjected)}
                </td>
                <td className="px-6 py-4 text-right text-emerald-400 text-sm">
                  {totalUsesActual !== null ? formatUSD(totalUsesActual) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sources Table */}
        <div className="glass-card rounded-2xl border border-pw-border overflow-hidden bg-surface-container-low/5">
          <div className="px-6 py-4 border-b border-pw-border bg-surface-container-low/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[var(--color-muted)]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Capital Sources Comparison
              </h3>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pw-border text-[10px] font-bold uppercase text-[var(--color-muted)] bg-surface-container-low/5">
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-right">Projected</th>
                <th className="px-6 py-3 text-right">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pw-border font-mono">
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">
                  Debt Financing (Loan Principal)
                </td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  <span className="inline-flex items-center">
                    {seniorDebtProjected > 0 ? formatUSD(seniorDebtProjected) : '$0'}
                    <ProvenanceBadge
                      source={debtProjProv}
                      project={project}
                      fieldId="loan_amount"
                      exposedDocumentIds={listing?.exposedDocumentIds || []}
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  <span className="inline-flex items-center justify-end">
                    {seniorDebtActual !== null ? formatUSD(seniorDebtActual) : '—'}
                    {seniorDebtActual !== null && (
                      <ProvenanceBadge
                        source={debtActProv}
                        project={project}
                        fieldId="loan_amount"
                        exposedDocumentIds={listing?.exposedDocumentIds || []}
                      />
                    )}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">
                  Required Investor Equity
                </td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  <span className="inline-flex items-center">
                    {formatUSD(investorEquityProjected)}
                    <ProvenanceBadge
                      source={equityProjProv}
                      project={project}
                      fieldId="cash_to_close"
                      exposedDocumentIds={listing?.exposedDocumentIds || []}
                    />
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  <span className="inline-flex items-center justify-end">
                    {investorEquityActual !== null ? formatUSD(investorEquityActual) : '—'}
                    {investorEquityActual !== null && (
                      <ProvenanceBadge
                        source={equityActProv}
                        project={project}
                        fieldId="cash_to_close"
                        exposedDocumentIds={listing?.exposedDocumentIds || []}
                      />
                    )}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.01]">
                <td className="px-6 py-3 text-[var(--color-muted)] font-sans">
                  LeadInvestor Capital / Deferred Fees
                </td>
                <td className="px-6 py-3 text-right text-[var(--color-on-surface)] font-semibold">
                  $0
                </td>
                <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                  $0
                </td>
              </tr>
              <tr className="bg-surface-container-low/20 font-bold border-t-2 border-pw-border">
                <td className="px-6 py-4 font-sans text-[var(--color-on-surface)] uppercase tracking-wider text-[10px]">
                  Total Sources
                </td>
                <td className="px-6 py-4 text-right text-[var(--color-on-surface)] text-sm">
                  {formatUSD(totalSourcesProjected)}
                </td>
                <td className="px-6 py-4 text-right text-emerald-400 text-sm">
                  {totalSourcesActual !== null ? formatUSD(totalSourcesActual) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Scope & Property details ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6 bg-surface-container-low/5">
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[var(--color-muted)]" />
          Property Details & Scope of Work
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
              Building Area
            </p>
            <p className="text-sm font-semibold text-[var(--color-on-surface)] font-mono">
              {project.squareFootage ? `${project.squareFootage.toLocaleString()} sqft` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
              Unit Count
            </p>
            <p className="text-sm font-semibold text-[var(--color-on-surface)] font-mono">
              {project.units || project.numberOfUnits || '1 Unit'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
              Year Built
            </p>
            <p className="text-sm font-semibold text-[var(--color-on-surface)] font-mono">
              {project.yearBuilt || '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
              Initial Condition
            </p>
            <p className="text-sm font-semibold text-[var(--color-on-surface)] uppercase">
              {project.condition || 'Cosmetic Rehab'}
            </p>
          </div>
        </div>
        {project.vision && (
          <div className="pt-4 border-t border-pw-border">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
              Scope Summary
            </p>
            <p className="text-sm text-[var(--color-on-surface)] leading-relaxed">
              {project.vision}
            </p>
          </div>
        )}
      </div>

      {/* ── Timeline & Exit Details ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4 bg-surface-container-low/5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-muted)]" />
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Timeline & Exit Projections
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-[var(--color-on-surface)] uppercase tracking-wide">
              Project Schedule
            </h4>
            <div className="space-y-3 font-mono">
              <div className="flex justify-between border-b border-pw-border pb-1.5">
                <span className="text-[var(--color-muted)] font-sans">Projected Hold Period</span>
                <span className="text-white font-semibold font-mono">
                  {financials.projectedHoldTimeMonths
                    ? `${Math.round(financials.projectedHoldTimeMonths / 12 * 10) / 10} Yrs`
                    : '5 Years'}
                </span>
              </div>
              <div className="flex justify-between border-b border-pw-border pb-1.5">
                <span className="text-[var(--color-muted)] font-sans">Holding Carry Timeline</span>
                <span className="text-white font-semibold font-mono">
                  {metrics.holdDays ? `${metrics.holdDays} Days` : '90 Days'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-[var(--color-on-surface)] uppercase tracking-wide">
              Exit Model: {isSale ? 'Sale (Capital Flip)' : 'Rent & Hold Operation'}
            </h4>
            {isSale ? (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between border-b border-pw-border pb-1.5">
                  <span className="text-[var(--color-muted)] font-sans">Projected ARV</span>
                  <span className="text-white font-semibold font-mono">{formatUSD(metrics.salePrice)}</span>
                </div>
                <div className="flex justify-between border-b border-pw-border pb-1.5">
                  <span className="text-[var(--color-muted)] font-sans">Selling Commissions</span>
                  <span className="text-white font-semibold font-mono">{formatUSD(metrics.closingCostsSell)}</span>
                </div>
                <div className="flex justify-between border-b border-pw-border pb-1.5 text-[var(--color-primary)] font-bold">
                  <span className="font-sans">Projected Net Profit</span>
                  <span className="font-mono">{formatUSD(metrics.netProfit)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between border-b border-pw-border pb-1.5">
                  <span className="text-[var(--color-muted)] font-sans">Gross Scheduled Rent</span>
                  <span className="text-white font-semibold font-mono">
                    {formatUSD(financials.monthlyGrossRent)} / mo
                  </span>
                </div>
                <div className="flex justify-between border-b border-pw-border pb-1.5">
                  <span className="text-[var(--color-muted)] font-sans">Vacancy Loss</span>
                  <span className="text-red-400 font-semibold font-mono">
                    {formatUSD((financials.monthlyGrossRent ?? 0) * ((financials.vacancyRatePercent ?? 7) / 100))} / mo
                  </span>
                </div>
                <div className="flex justify-between border-b border-pw-border pb-1.5 text-[#3f7d20] font-bold">
                  <span className="font-sans">Net Operating Income</span>
                  <span className="font-mono">{formatUSD(metrics.noi)} / yr</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lead Investor & Action Bar (if listing is provided) ── */}
      {listing && !readOnly && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 glass-card rounded-2xl border border-pw-border p-6 bg-surface-container-low/5">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--color-muted)]" />
              Lead Investor
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                {listing.leadInvestor.avatarUrl ? (
                  <img
                    src={listing.leadInvestor.avatarUrl}
                    alt={listing.leadInvestor.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-xl text-[var(--color-primary)]">
                    person
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="text-sm font-bold text-[var(--color-on-surface)]">
                  {listing.leadInvestor.displayName}
                </p>
                {listing.leadInvestor.bio && (
                  <p className="text-[11px] text-[var(--color-muted)] mt-1.5 leading-relaxed line-clamp-3">
                    {listing.leadInvestor.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-6 glass-card rounded-2xl border border-pw-border p-6 flex flex-col justify-between bg-surface-container-low/5">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--color-muted)]" />
              Opportunity Options
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {onFollowChange && followStatus && (
                <>
                  <FollowDealButton
                     listingId={listing.id}
                     projectId={listing.projectId}
                     isFollowing={followStatus.followingDeal}
                     onFollowChange={onFollowChange}
                  />
                  <FollowInvestorButton
                    investorUid={listing.leadInvestor.uid}
                    investorName={listing.leadInvestor.displayName}
                    isFollowing={followStatus.followingInvestor}
                    onFollowChange={onFollowChange}
                  />
                </>
              )}
              <RespondToTermsButton
                listingId={listing.id}
                projectId={listing.projectId}
                minTicketCents={listing.equityTerms?.minTicket}
                fundingTargetCents={listing.equityTerms?.fundingTarget}
                equityOfferedPct={listing.equityTerms?.equityOfferedPct}
              />
            </div>
            <div className="flex items-center gap-4 text-[10px] text-[var(--color-muted)] font-mono mt-4 pt-3 border-t border-pw-border">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">bookmark</span>
                {listing.followCount} followers
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">visibility</span>
                {listing.viewCount} views
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
