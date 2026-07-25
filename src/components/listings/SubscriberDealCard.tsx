'use client';

import React from 'react';
import Link from 'next/link';
import type { DealListing, SubscriberDealMatch } from '@/types/listing';
import { Building2, MapPin, Info, AlertTriangle } from 'lucide-react';
import ListingStatusBadge from './ListingStatusBadge';
import { recordConversionTelemetry } from '@/actions/telemetry';
import { getVariableProvenance, calculateDealCompleteness } from '@/lib/identity/provenance';
import type { VariableSourceTag } from '@/types/schema';
import { useAuth } from '@/context/AuthContext';
import { toggleDocumentExposure } from '@/actions/listings';
import toast from 'react-hot-toast';

interface SubscriberDealCardProps {
  match: SubscriberDealMatch;
  className?: string;
}

export function ProvenanceBadge({
  source,
  project,
  fieldId,
  exposedDocumentIds = []
}: {
  source?: VariableSourceTag | 'derived' | string | null;
  project?: any;
  fieldId?: string;
  exposedDocumentIds?: string[];
}) {
  const [showMetadata, setShowMetadata] = React.useState(false);

  React.useEffect(() => {
    if (!showMetadata) return;
    const handleOutsideClick = () => {
      setShowMetadata(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showMetadata]);

  if (!source) return null;

  let label = 'ASSUMPTION';
  let styles = 'bg-amber-500/[0.04] text-amber-400 border-amber-500/20';

  if (source === 'user_actual') {
    label = 'ACTUAL';
    styles = 'bg-emerald-500/[0.04] text-emerald-400 border-emerald-500/20';
  } else if (source === 'document') {
    label = 'DOCUMENT';
    styles = 'bg-violet-500/[0.04] text-violet-400 border-violet-500/20 cursor-pointer hover:bg-violet-500/10';
  } else if (source === 'plaid') {
    label = 'PLAID';
    styles = 'bg-cyan-500/[0.04] text-cyan-400 border-cyan-500/20';
  } else if (source === 'derived') {
    label = 'DERIVED';
    styles = 'bg-blue-500/[0.04] text-blue-400 border-blue-500/20';
  }

  // Resolve metadata for DOCUMENT source
  let docType = 'Project Document';
  let docDate = '';
  let docName = '';
  let docUrl = '';

  if (source === 'document' && project) {
    const financials = project.financials || {};
    if (fieldId === 'purchase_price') {
      docType = 'Purchase Agreement';
      docDate = financials.psaEffectiveDate || '';
      docName = financials.psaDocumentName || 'Executed_PSA.pdf';
      docUrl = financials.psaDocumentUrl || '';
    } else if (fieldId === 'rehab_budget') {
      docType = 'Inspection Report';
      docDate = financials.inspectionDate || '';
      docName = financials.inspectionReportName || 'Inspection_Report.pdf';
      docUrl = financials.inspectionReportUrl || '';
    } else if (fieldId === 'loan_amount' || fieldId === 'funding_target') {
      docType = 'Closing Disclosure';
      docDate = financials.loanDate || '';
      docName = financials.closingDisclosureName || 'Closing_Disclosure.pdf';
      docUrl = financials.closingDisclosureUrl || financials.psaDocumentUrl || '';
    } else {
      docType = 'Project Document';
      docDate = financials.uploadedAt || '';
      docName = financials.documentName || 'Document.pdf';
      docUrl = financials.documentUrl || '';
    }
  }

  return (
    <span className="relative inline-block select-none">
      <span
        onClick={(e) => {
          if (source === 'document') {
            e.preventDefault();
            e.stopPropagation();
            setShowMetadata(!showMetadata);
          }
        }}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ml-1.5 shrink-0 ${styles}`}
        data-testid={`provenance-${label.toLowerCase()}`}
      >
        {label}
      </span>

      {showMetadata && source === 'document' && (
        <ProvenanceBadgePopover
          project={project}
          docType={docType}
          docDate={docDate}
          docName={docName}
          docUrl={docUrl}
          fieldId={fieldId}
          exposedDocumentIds={exposedDocumentIds}
        />
      )}
    </span>
  );
}

function ProvenanceBadgePopover({
  project,
  docType,
  docDate,
  docName,
  docUrl,
  fieldId,
  exposedDocumentIds
}: {
  project: any;
  docType: string;
  docDate: string;
  docName: string;
  docUrl: string;
  fieldId?: string;
  exposedDocumentIds: string[];
}) {
  const { user } = useAuth();
  const isMember = project?.isMember || project?.ownerUid === user?.uid;

  // A subscriber can only download if the document ID is exposed
  const isExposed = docUrl && (isMember || (project.activeListingId && exposedDocumentIds.includes(docName)));
  const finalDocUrl = isExposed ? docUrl : '';
  const isExposedToSubscribers = exposedDocumentIds.includes(docName);

  const handleToggleExposed = async () => {
    if (!project?.activeListingId) return;
    try {
      const token = user?.idToken || 'mock_token';
      await toggleDocumentExposure(token, project.activeListingId, docName, !isExposedToSubscribers);
      toast.success(isExposedToSubscribers ? 'Document hidden from subscribers' : 'Document exposed to subscribers');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle document exposure');
    }
  };

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="absolute left-0 mt-1 z-50 w-48 p-2.5 rounded-lg bg-[#121020] border border-white/15 text-[10px] text-white shadow-2xl flex flex-col gap-1 cursor-default text-left font-normal normal-case tracking-normal"
    >
      <span className="font-bold text-violet-400 text-xs">Document Citation</span>
      <span className="text-[#9E9DA0] mt-1">Type: <span className="text-white font-medium">{docType}</span></span>
      {docDate && <span className="text-[#9E9DA0]">Date: <span className="text-white font-medium">{docDate}</span></span>}
      {docName && <span className="text-[#9E9DA0] truncate">File: <span className="text-white font-medium">{docName}</span></span>}
      
      {finalDocUrl ? (
        <a
          href={finalDocUrl}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-400 hover:text-emerald-300 font-bold underline mt-1.5 self-start flex items-center gap-0.5"
        >
          Open Document ↗
        </a>
      ) : (
        <span className="text-amber-400 font-medium mt-1.5 flex items-center gap-1">
          🔒 Locked by Lead Investor
        </span>
      )}

      {isMember && project?.activeListingId && (
        <button
          onClick={handleToggleExposed}
          id={`btn-expose-doc-${fieldId}`}
          className={`mt-2 w-full text-center py-1 rounded text-[9px] font-bold uppercase transition ${
            isExposedToSubscribers
              ? 'bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-950/60'
              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-950/60'
          }`}
        >
          {isExposedToSubscribers ? '🔒 Hide from Subscribers' : '🌐 Expose to Subscribers'}
        </button>
      )}
    </span>
  );
}

export default function SubscriberDealCard({ match, className = '' }: SubscriberDealCardProps) {
  const { listing, project, metrics } = match;
  const projectId = project.id;

  // Formatting helpers matching DealFullView.tsx
  const formatCents = (cents: number | undefined | null) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const formatPct = (pct: number | undefined | null) => {
    if (pct == null) return '—';
    return `${pct.toFixed(2)}%`;
  };

  // ── Missing Fields Checks (G-3 / Honesty Rule compliance) ──
  const financials = project.financials || {};
  
  // Unresolved financing check
  const modality = project.fundingPlan?.modality || [];
  const isFin = modality.some(m => 
    ['conventional_loan', 'sba_504', 'hard_money', 'bridge'].includes(m)
  ) || (project.loans && project.loans.length > 0) || (financials.capitalStack || []).some(
    (s: any) => ['Conventional Financing', 'Hard Money Loans', 'SBA 504 Bank First Lien', 'SBA 504 CDC Debenture', 'Bridge Loans'].includes(s.category)
  );
  const hasUnresolvedFinancing = isFin && !project.termsLocked;

  // Let's identify the missing inputs for each metric we display on the card:
  const priceVal = project.askingPriceCents ? project.askingPriceCents / 100 : financials.purchasePrice;
  const isPriceMissing = !priceVal || priceVal <= 0;
  const priceGap = isPriceMissing ? {
    missing: ["Purchase Price"],
    route: `/dashboard/projects/${projectId}/phase-1?card=F1.1`,
    label: "Property facts card"
  } : null;

  const isCapRateMissing = metrics.capRate == null;
  const capRateGap = isCapRateMissing ? {
    missing: ["Estimated ARV / Current Value", "NOI (Rent & Expenses)"],
    route: `/dashboard/projects/${projectId}`,
    label: "Underwriting Workspace"
  } : null;

  const isCocMissing = metrics.cashOnCashReturn == null;
  const cocGap = isCocMissing ? (
    hasUnresolvedFinancing ? {
      missing: ["Locked Loan Terms"],
      route: `/dashboard/projects/${projectId}/phase-2?card=F3.5`,
      label: "Locked Terms card (F3.5)"
    } : {
      missing: ["Loan Amount", "Interest Rate", "Down Payment / Cash Invested"],
      route: `/dashboard/projects/${projectId}/phase-2`,
      label: "Financing Workspace"
    }
  ) : null;

  const isNoiMissing = metrics.noi == null;
  const noiGap = isNoiMissing ? {
    missing: ["Monthly Gross Rent", "Vacancy Rate %", "Taxes / Insurance / Utilities", "Property Mgmt Fee", "Maintenance Reserve"],
    route: `/dashboard/projects/${projectId}`,
    label: "Underwriting Workspace"
  } : null;

  const seekingVal = financials.equityTerms?.funding_target;
  const isSeekingMissing = seekingVal == null || seekingVal <= 0;
  const seekingGap = isSeekingMissing ? {
    missing: ["Funding Target"],
    route: `/dashboard/projects/${projectId}/phase-2?card=F3.5`,
    label: "Locked Terms card (F3.5)"
  } : null;

  // Collect all unique missing fields and link
  const allGaps: Array<{ missing: string[]; route: string; label: string }> = [];
  if (priceGap) allGaps.push(priceGap);
  if (capRateGap) allGaps.push(capRateGap);
  if (cocGap) allGaps.push(cocGap);
  if (noiGap) allGaps.push(noiGap);
  if (seekingGap) allGaps.push(seekingGap);

  const uniqueMissingFields = Array.from(new Set(allGaps.flatMap(g => g.missing)));
  const primaryCollectLink = allGaps[0] || allGaps[1] || allGaps[2] || allGaps[3] || allGaps[4] || null;

  // Provenance resolutions
  const priceProvenance = getVariableProvenance('purchase_price', project, 'projected');
  const seekingProvenance = getVariableProvenance('funding_target', project);

  // Completeness indicator (DM-19)
  const completeness = calculateDealCompleteness(project);

  return (
    <div className={`glass-card rounded-2xl border border-pw-border flex flex-col p-5 group transition-all duration-200 hover:border-[var(--color-primary)]/30 hover:shadow-lg hover:shadow-[var(--color-primary)]/5 ${className}`}>
      {/* Badges & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <ListingStatusBadge status={listing.status} />
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] px-2 py-0.5 rounded-full border border-pw-border bg-surface-container-low/20">
            {listing.assetClass}
          </span>
          {listing.subStrategy && (
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
              {listing.subStrategy}
            </span>
          )}
          {listing.isCrowdfunding && (
            <span
              className="text-xs font-bold uppercase tracking-[0.06em] text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5"
              data-testid="crowdfunding-badge"
            >
              Crowdfunding
            </span>
          )}
        </div>
        <span 
          className="text-[9px] font-bold uppercase tracking-[0.06em] text-white/90 bg-neutral-900/60 px-2 py-0.5 rounded-full border border-pw-border flex items-center gap-1"
          data-testid="completeness-indicator"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Completeness: {completeness.score}%
        </span>
      </div>

      {/* Property Name & Neighborhood */}
      <div className="space-y-1 mb-4">
        <h3 className="text-base font-bold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
          {listing.propertyName}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-muted)]" />
          <span className="truncate">{listing.address}</span>
        </div>
      </div>

      {/* Grouped metrics rendering (G-3 Compliance) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4 flex-1">
        {/* Asking Price */}
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] block mb-0.5">
            Asking Price
          </span>
          {isPriceMissing ? (
            <span className="text-xs font-semibold text-amber-500/80 italic flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Lacking inputs
            </span>
          ) : (
            <span className="text-[15px] font-bold font-mono text-[var(--color-on-surface)] flex items-center flex-wrap">
              {formatCents(priceVal * 100)}
              <ProvenanceBadge
                source={priceProvenance}
                project={project}
                fieldId="purchase_price"
                exposedDocumentIds={listing.exposedDocumentIds || []}
              />
            </span>
          )}
        </div>

        {/* Seeking */}
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] block mb-0.5">
            Seeking
          </span>
          {isSeekingMissing ? (
            <span className="text-xs font-semibold text-amber-500/80 italic flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Lacking inputs
            </span>
          ) : (
            <span className="text-[15px] font-bold font-mono text-[var(--color-on-surface)] flex items-center flex-wrap">
              {formatCents(seekingVal)}
              <ProvenanceBadge
                source={seekingProvenance}
                project={project}
                fieldId="funding_target"
                exposedDocumentIds={listing.exposedDocumentIds || []}
              />
            </span>
          )}
        </div>

        {/* Cap Rate */}
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] block mb-0.5">
            Cap Rate
          </span>
          {isCapRateMissing ? (
            <span className="text-xs font-semibold text-amber-500/80 italic flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Lacking inputs
            </span>
          ) : (
            <span className="text-[15px] font-bold font-mono text-[var(--color-on-surface)] flex items-center flex-wrap">
              {formatPct(metrics.capRate)}
              <ProvenanceBadge source="derived" />
            </span>
          )}
        </div>

        {/* Cash-on-Cash */}
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] block mb-0.5">
            Cash-on-Cash
          </span>
          {isCocMissing ? (
            <span className="text-xs font-semibold text-amber-500/80 italic flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Lacking inputs
            </span>
          ) : (
            <span className="text-[15px] font-bold font-mono text-[var(--color-on-surface)] flex items-center flex-wrap">
              {formatPct(metrics.cashOnCashReturn)}
              <ProvenanceBadge source="derived" />
            </span>
          )}
        </div>

        {/* NOI */}
        <div className="col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] block mb-0.5">
            Net Operating Income
          </span>
          {isNoiMissing ? (
            <span className="text-xs font-semibold text-amber-500/80 italic flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Lacking inputs
            </span>
          ) : (
            <span className="text-[15px] font-bold font-mono text-[var(--color-on-surface)] flex items-center flex-wrap">
              {formatCents(metrics.noi ? metrics.noi * 100 : null)} / yr
              <ProvenanceBadge source="derived" />
            </span>
          )}
        </div>
      </div>

      {/* Honesty Rule Gap Display */}
      {uniqueMissingFields.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/15 p-3 bg-amber-500/[0.03]">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80" />
            <span>Lacking Inputs (Honesty Rule)</span>
          </div>
          <ul className="space-y-1">
            {uniqueMissingFields.map((f) => (
              <li key={f} className="text-xs text-amber-300/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {primaryCollectLink && (
            <Link
              href={primaryCollectLink.route}
              className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold text-amber-400 hover:text-amber-300 underline min-h-[36px]"
            >
              Go to {primaryCollectLink.label} to enter data
              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
            </Link>
          )}
        </div>
      )}

      {/* Footer / Lead Investor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-pw-border">
        <div className="flex items-center gap-2">
          {listing.leadInvestor?.avatarUrl ? (
            <img
              src={listing.leadInvestor.avatarUrl}
              alt={listing.leadInvestor.displayName || ''}
              className="w-5 h-5 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 flex items-center justify-center">
              <span className="text-[12px] font-bold text-[var(--color-primary)]">
                {listing.leadInvestor?.displayName
                  ? listing.leadInvestor.displayName.slice(0, 2).toUpperCase()
                  : '??'}
              </span>
            </div>
          )}
          <span className="text-xs font-medium text-[var(--color-muted)]">
            {listing.leadInvestor?.displayName || 'Unknown'}
          </span>
        </div>

        <Link
          href={`/deals/${listing.id}`}
          onClick={() => {
            recordConversionTelemetry({
              eventType: 'deal_view',
              listingId: listing.id,
              details: { propertyName: listing.propertyName }
            }).catch(console.error);
          }}
          className="
            h-11 px-4
            flex items-center justify-center gap-1.5
            rounded-xl
            border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.04]
            text-xs font-bold text-[var(--color-primary)]
            transition-all duration-200
            hover:bg-[var(--color-primary)]/[0.08] hover:border-[var(--color-primary)]/40
            active:scale-[0.98]
            w-full sm:w-auto
          "
        >
          View Deal
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
