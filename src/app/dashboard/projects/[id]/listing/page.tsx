'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import {
  createDraftListing,
  publishListing,
  pauseListing,
  resumeListing,
  closeListing,
  refreshListingSnapshot,
  getListingByProject,
  changeVisibilityMode,
  acknowledgeDisclosure,
  updateControlStatus,
} from '@/actions/listings';
import {
  inviteSubscribers,
  getDealInvitations,
  getInviteTargets,
} from '@/actions/dealInvitations';
import type { DealInvitation } from '@/types/dealInvitation';
import { evaluatePublishGate } from '@/lib/deals/publishGate';
import type { DealListing, VisibilityMode, PublishGateResult } from '@/types/listing';
import ListingStatusBadge from '@/components/listings/ListingStatusBadge';
import PublishPreview from '@/components/listings/PublishPreview';
import toast from 'react-hot-toast';
import posthog from 'posthog-js';
import { NON_BINDING_DISCLOSURE } from '@/lib/constants/disclosure';
import { IndicationAggregate } from '@/components/project/IndicationAggregate';

/* ═══════════════════════════════════════════════════════
   /dashboard/projects/[id]/listing — Listing Management

   "Post this Deal" flow + lifecycle controls.
   Gated by DM-21 Publish Gate checklist and DM-22 Visibility Mode Selection.
   ═══════════════════════════════════════════════════════ */

export default function ListingManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { project, refresh } = useWorkspaceProject();
  const projectId = params.id as string;

  const [listing, setListing] = useState<DealListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Publish gate & Visibility states
  const [targetVisibility, setTargetVisibility] = useState<VisibilityMode | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [typedAck, setTypedAck] = useState('');

  // Invitations state
  const [invitations, setInvitations] = useState<DealInvitation[]>([]);
  const [inviteTargets, setInviteTargets] = useState<Array<{ email: string; name?: string; source: string }>>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<Array<{ email: string; name?: string }>>([]);
  const [emailInput, setEmailInput] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadInvitations = async () => {
    try {
      const res = await getDealInvitations(user?.idToken || 'mock_token', projectId);
      setInvitations(res);
    } catch (err) {
      console.error('[Listing] Load invitations error:', err);
    }
  };

  const loadTargets = async () => {
    try {
      const res = await getInviteTargets(user?.idToken || 'mock_token', projectId);
      setInviteTargets(res);
    } catch (err) {
      console.error('[Listing] Load targets error:', err);
    }
  };

  useEffect(() => {
    if (projectId && user) {
      loadInvitations();
      loadTargets();
    }
  }, [projectId, user]);

  const expectedAck = "I acknowledge that Public Solicited mode is irreversible and complies with public offering requirements.";

  // ── Load existing listing ──
  useEffect(() => {
    async function load() {
      try {
        const existing = await getListingByProject(projectId);
        setListing(existing as DealListing | null);
        if (existing) {
          if (existing.status === 'draft') {
            setTargetVisibility(null); // Force explicit selection
          } else {
            setTargetVisibility(existing.visibilityMode || 'PRIVATE');
          }
        }
      } catch (err) {
        console.error('[Listing] Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Sync target visibility when listing loads/reloads (only if already published/paused)
  useEffect(() => {
    if (listing && listing.status !== 'draft') {
      setTargetVisibility(listing.visibilityMode || 'PRIVATE');
    }
  }, [listing]);

  // ── Action helpers ──
  const withAction = async (action: string, fn: () => Promise<void>) => {
    if (!user) return;
    setActionLoading(action);
    try {
      await fn();
      const updated = await getListingByProject(projectId);
      setListing(updated as DealListing | null);
      setOverrideReason(''); // reset override reason on success
      setTypedAck(''); // reset typed acknowledgment on success
      refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvitations = async () => {
    if (!user) return;
    if (selectedInvitees.length === 0) {
      toast.error('Please select or enter at least one invitee.');
      return;
    }
    setInviteLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await inviteSubscribers(
        idToken,
        projectId,
        selectedInvitees,
        personalNote
      );
      if (res.success) {
        toast.success(`Successfully sent ${res.invitedCount} invitations!`);
        setSelectedInvitees([]);
        setPersonalNote('');
        loadInvitations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitations.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (invitations.length === 0) {
      toast.error('No invitations to export.');
      return;
    }
    const headers = ['Name', 'Email', 'Status', 'Visibility Mode', 'Version', 'Sent At', 'Opened At', 'Responded At', 'Personal Note', 'Indication'];
    const rows = invitations.map(inv => [
      inv.inviteeName || 'N/A',
      inv.inviteeEmail,
      inv.status,
      inv.visibilityMode,
      inv.version,
      inv.createdAt ? new Date(inv.createdAt).toLocaleString() : 'N/A',
      inv.openedAt ? new Date(inv.openedAt).toLocaleString() : 'N/A',
      inv.respondedAt ? new Date(inv.respondedAt).toLocaleString() : 'N/A',
      inv.personalNote || '',
      inv.indication
        ? inv.indication.type === 'amount'
          ? `${inv.indication.currency} ${inv.indication.value}`
          : `${inv.indication.value}%`
        : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',')),
      '',
      `"* Note: ${NON_BINDING_DISCLOSURE.replace(/"/g, '""')}"`
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deal-invitees-${projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddEmail = (emailStr: string) => {
    const email = emailStr.trim().toLowerCase();
    if (!email) return;
    
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (selectedInvitees.some(i => i.email.toLowerCase() === email)) {
      toast.error('Email already added.');
      return;
    }

    const isVendorTarget = inviteTargets.some(
      t => t.email.toLowerCase() === email && (t.source?.toLowerCase() === 'vendor' || t.name?.toLowerCase() === 'vendor')
    ) || email.includes('vendor');

    if (isVendorTarget) {
      toast.error('A Vendor cannot be invited to a Deal listing.');
      return;
    }

    const target = inviteTargets.find(t => t.email.toLowerCase() === email);
    setSelectedInvitees(prev => [...prev, { email, name: target?.name }]);
    setEmailInput('');
  };

  const handleCreateDraft = () =>
    withAction('create', async () => {
      const idToken = await user!.getIdToken();
      const result = await createDraftListing(idToken, projectId);
      toast.success('Draft listing created!');
      try { posthog.capture('listing_draft_created', { projectId, listingId: result.listingId }); } catch {}
    });

  const handlePublish = (reasonToUse?: string) =>
    withAction('publish', async () => {
      if (!listing || !targetVisibility) return;
      const idToken = await user!.getIdToken();
      // Enforce visibility change first
      await changeVisibilityMode(
        idToken,
        listing.id,
        targetVisibility,
        undefined,
        targetVisibility === 'PUBLIC_SOLICITED' ? typedAck : undefined
      );
      // Publish the listing
      await publishListing(
        idToken,
        listing.id,
        reasonToUse,
        targetVisibility === 'PUBLIC_SOLICITED' ? typedAck : undefined
      );
      toast.success('Deal listing is now live!');
      try { posthog.capture('listing_published', { listingId: listing.id, override: !!reasonToUse }); } catch {}
    });

  const handlePause = () =>
    withAction('pause', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await pauseListing(idToken, listing.id);
      toast.success('Listing paused.');
    });

  const handleResume = () =>
    withAction('resume', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await resumeListing(idToken, listing.id);
      toast.success('Listing resumed!');
    });

  const handleClose = () =>
    withAction('close', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await closeListing(idToken, listing.id, 'manual');
      toast.success('Listing closed.');
      try { posthog.capture('listing_closed', { listingId: listing.id, reason: 'manual' }); } catch {}
    });

  const handleRefresh = () =>
    withAction('refresh', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await refreshListingSnapshot(idToken, listing.id);
      toast.success('Listing snapshot updated with latest project data.');
    });

  const handleVisibilityChange = (mode: VisibilityMode, reasonToUse?: string) =>
    withAction('visibility', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await changeVisibilityMode(idToken, listing.id, mode, reasonToUse, mode === 'PUBLIC_SOLICITED' ? typedAck : undefined);
      toast.success(`Visibility mode updated to ${mode}`);
    });

  const handleAcknowledgeDisclosure = (mode: VisibilityMode) =>
    withAction('acknowledge', async () => {
      if (!listing) return;
      const idToken = await user!.getIdToken();
      await acknowledgeDisclosure(idToken, listing.id, mode);
      toast.success('Disclosure acknowledged.');
    });

  const handleUpdateControlStatus = (status: 'owned' | 'under-contract' | 'option' | 'exclusive_right' | 'none') =>
    withAction('control_status', async () => {
      const idToken = await user!.getIdToken();
      await updateControlStatus(idToken, projectId, status);
      toast.success('Control status updated.');
    });

  // Evaluate publish gate
  const gateResult = project && listing && targetVisibility
    ? evaluatePublishGate(project as any, listing, targetVisibility)
    : null;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[var(--color-muted)]/10 rounded-lg w-48 animate-pulse" />
        <div className="h-64 bg-[var(--color-muted)]/10 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ── No listing yet → Create Draft ──
  if (!listing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
            Post this Deal
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Assemble a marketplace listing from your project registry and equity terms.
          </p>
        </div>

        {/* Pre-flight checklist */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">checklist</span>
            Pre-Flight Check
          </h2>

          {[
            {
              label: 'Property address',
              ok: !!project?.address,
              detail: project?.address || 'Missing — add address in project settings',
            },
            {
              label: 'Capital plan: "Raise Interest"',
              ok: project?.financials?.capitalPlan === 'raise interest',
              detail: project?.financials?.capitalPlan || 'Not set',
            },
            {
              label: 'Equity terms configured',
              ok: !!project?.financials?.equityTerms,
              detail: project?.financials?.equityTerms
                ? `Target: $${((project.financials.equityTerms.funding_target || 0) / 100).toLocaleString()}`
                : 'Missing — configure equity terms first',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-3 rounded-xl border border-pw-border"
            >
              <span
                className={`material-symbols-outlined text-lg mt-0.5 ${
                  item.ok ? 'text-[var(--color-positive)]' : 'text-[var(--color-error)]'
                }`}
              >
                {item.ok ? 'check_circle' : 'cancel'}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--color-on-surface)]">
                  {item.label}
                </p>
                <p className="text-xs text-[var(--color-muted)]">{item.detail}</p>
              </div>
            </div>
          ))}

          <button
            onClick={handleCreateDraft}
            disabled={
              actionLoading === 'create' ||
              !project?.address ||
              project?.financials?.capitalPlan !== 'raise interest' ||
              !project?.financials?.equityTerms
            }
            className="luminous-button w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === 'create' ? (
              <>
                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                Assembling Listing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Create Draft Listing
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Plain language consequences for visibility modes
  const MODE_DETAILS = {
    PRIVATE: {
      visible: 'Full underwritten financials, project scope, capital stack, closing checklists, and document attachments.',
      who: 'Only you, members of your workspace organization, and individuals explicitly invited to this project.',
      reversibility: 'Fully reversible. You can change to Marketplace or Public Solicited at any time.',
      disclosure: 'Private listing restricts views to authorized members. No general solicitation warnings are required.',
    },
    MARKETPLACE: {
      visible: 'Asset details, project outline, submarket stats, and derived performance metrics. Dillutive documents require a non-disclosure agreement.',
      who: 'All registered and verified subscriber accounts on the platform.',
      reversibility: 'Fully reversible. You can restrict back to Private or upgrade to Public Solicited.',
      disclosure: 'Offers on the marketplace are limited to verified platform members under standard private placement exemptions.',
    },
    PUBLIC_SOLICITED: {
      visible: 'General project overview, summary attributes, and basic metrics.',
      who: 'Anyone on the internet via the public link. No platform account or login required.',
      reversibility: 'IRREVERSIBLE. Once a deal is advertised publicly, regulations prohibit restricting access or changing the mode back to Private or Marketplace.',
      disclosure: 'General Solicitation (Rule 506(c)). All investors must be independently verified as accredited prior to accepting funds.',
    },
  };

  const isCurrentModeAcknowledge =
    targetVisibility && listing.disclosureAcknowledgedForMode === targetVisibility;

  const isAckCorrect =
    targetVisibility !== 'PUBLIC_SOLICITED' || typedAck.trim() === expectedAck;

  const isIrreversibleLocked = listing.status === 'published' && listing.visibilityMode === 'PUBLIC_SOLICITED';

  const autoReopened = listing.status === 'draft' && !!listing.transitionLog && listing.transitionLog.length > 0 && !!listing.transitionLog[listing.transitionLog.length - 1].reason?.startsWith('Auto-reopened to draft');

  return (
    <div className="space-y-6">
      {/* Auto-reopen warning notice */}
      {autoReopened && (
        <div className="glass-card rounded-2xl border border-[var(--color-error)]/20 p-5 bg-[var(--color-error)]/5" id="auto-reopen-warning">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--color-error)]">
              warning
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--color-on-surface)]">
                Reverted to Draft (Material Changes Detected)
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1 leading-relaxed">
                This listing was automatically reverted to draft status because material terms (price/scope/etc.) were modified. You must review the checklist and republish to make these changes live.
              </p>
              <p className="text-[11px] font-semibold text-[var(--color-error)] mt-2">
                Reason: {listing.transitionLog![listing.transitionLog!.length - 1].reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
              Marketplace Listing
            </h1>
            <ListingStatusBadge status={listing.status} />
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            {listing.propertyName} · {listing.neighborhood}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {listing.status === 'draft' && (
            <button
              onClick={() => handlePublish(gateResult?.passed ? undefined : overrideReason)}
              disabled={
                actionLoading === 'publish' ||
                !targetVisibility ||
                !isCurrentModeAcknowledge ||
                !isAckCorrect ||
                (!gateResult?.passed && !overrideReason.trim())
              }
              className="luminous-button px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">publish</span>
              {actionLoading === 'publish'
                ? 'Publishing...'
                : gateResult?.passed
                ? 'Publish'
                : 'Publish with Override'}
            </button>
          )}
          {listing.status === 'published' && (
            <>
              <button
                onClick={handlePause}
                disabled={!!actionLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-pw-border text-[var(--color-muted)] hover:text-[var(--color-on-surface)] flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">pause_circle</span>
                Pause
              </button>
              <button
                onClick={handleRefresh}
                disabled={!!actionLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-pw-border text-[var(--color-muted)] hover:text-[var(--color-on-surface)] flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Refresh
              </button>
            </>
          )}
          {listing.status === 'paused' && (
            <button
              onClick={handleResume}
              disabled={actionLoading === 'resume'}
              className="luminous-button px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">play_circle</span>
              {actionLoading === 'resume' ? 'Resuming...' : 'Resume'}
            </button>
          )}
          {listing.status !== 'closed' && (
            <button
              onClick={handleClose}
              disabled={!!actionLoading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
              Close Listing
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl border border-pw-border p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
            Status
          </p>
          <ListingStatusBadge status={listing.status} />
        </div>
        <div className="glass-card rounded-xl border border-pw-border p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
            Followers
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
            {listing.followCount}
          </p>
        </div>
        <div className="glass-card rounded-xl border border-pw-border p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
            Views
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
            {listing.viewCount}
          </p>
        </div>
      </div>

      {/* ── Publish Gate & Visibility Setup Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls & Checklist (Left 7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">settings</span>
              Visibility and Controls
            </h2>

            {/* Visibility Mode Switcher / Selector */}
            {isIrreversibleLocked ? (
              <div className="p-4 bg-[var(--color-primary)]/10 rounded-xl border border-[var(--color-primary)]/20" id="irreversible-lock-banner">
                <p className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  Visibility Permanently Locked: Public Solicited
                </p>
                <p className="text-[11px] text-[var(--color-muted)] mt-1 leading-relaxed">
                  Due to regulatory solicitation requirements, once a deal listing is publicly advertised, the mode cannot be reverted to Private or Marketplace.
                </p>
              </div>
            ) : (
              <div className="space-y-3" id="visibility-mode-selector">
                <label className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide">
                  Target Visibility Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRIVATE', 'MARKETPLACE', 'PUBLIC_SOLICITED'] as VisibilityMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setTargetVisibility(mode);
                        setTypedAck('');
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        targetVisibility === mode
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg'
                          : 'border-pw-border text-[var(--color-muted)] hover:text-[var(--color-on-surface)]'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Consequences in Plain Language (DM-22) */}
            {targetVisibility && (
              <div className="p-5 rounded-xl border border-pw-border bg-[var(--color-muted)]/5 space-y-4 text-xs" id="consequences-panel">
                <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold uppercase tracking-wider text-[10px]">
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span>Plain Language Consequences — {targetVisibility.replace('_', ' ')}</span>
                </div>
                
                <div className="space-y-3 leading-relaxed text-[var(--color-muted)]">
                  <div>
                    <span className="font-bold text-[var(--color-on-surface)] block mb-0.5">What will be visible:</span>
                    {MODE_DETAILS[targetVisibility].visible}
                  </div>
                  <div>
                    <span className="font-bold text-[var(--color-on-surface)] block mb-0.5">Who can view this:</span>
                    {MODE_DETAILS[targetVisibility].who}
                  </div>
                  <div>
                    <span className="font-bold text-[var(--color-on-surface)] block mb-0.5">Reversibility:</span>
                    <span className={targetVisibility === 'PUBLIC_SOLICITED' ? 'text-[var(--color-error)] font-bold' : ''}>
                      {MODE_DETAILS[targetVisibility].reversibility}
                    </span>
                  </div>
                </div>

                {/* Disclosure Action */}
                <div className="pt-3 border-t border-pw-border space-y-2">
                  <p className="text-[10px] font-bold text-[var(--color-on-surface)] uppercase">
                    Disclosure Agreement
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] italic">
                    {MODE_DETAILS[targetVisibility].disclosure}
                  </p>
                  {!isCurrentModeAcknowledge ? (
                    <button
                      onClick={() => handleAcknowledgeDisclosure(targetVisibility)}
                      className="px-4 py-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold rounded-lg transition-all flex items-center gap-1.5 w-full justify-center text-xs"
                    >
                      <span className="material-symbols-outlined text-sm">gavel</span>
                      Acknowledge Disclosure & Consequences
                    </button>
                  ) : (
                    <div className="text-[10px] font-semibold text-[var(--color-positive)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Disclosure & consequences acknowledged for {targetVisibility.replace('_', ' ')}
                    </div>
                  )}
                </div>

                {/* Irreversible Typed Acknowledgment (DM-22) */}
                {targetVisibility === 'PUBLIC_SOLICITED' && (
                  <div className="pt-3 border-t border-pw-border space-y-2.5">
                    <p className="text-[10px] font-bold text-[var(--color-error)] uppercase">
                      Irreversible Mode Typed Acknowledgment Required
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                      Type the following phrase exactly to confirm public solicitation mode:
                      <br />
                      <strong className="text-[var(--color-on-surface)] font-mono block p-2 bg-[var(--color-muted)]/10 rounded-lg mt-1 select-all">
                        {expectedAck}
                      </strong>
                    </p>
                    <input
                      type="text"
                      value={typedAck}
                      onChange={(e) => setTypedAck(e.target.value)}
                      placeholder="Type the phrase here..."
                      className="w-full bg-[var(--color-surface)] border border-pw-border rounded-xl px-3 py-2 text-xs text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    {isAckCorrect ? (
                      <div className="text-[10px] font-semibold text-[var(--color-positive)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Acknowledgment verified
                      </div>
                    ) : typedAck.trim().length > 0 ? (
                      <div className="text-[10px] font-semibold text-[var(--color-error)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Phrase does not match
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Property Control Status Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide">
                Property Control Status
              </label>
              <select
                value={project?.controlStatus || 'none'}
                onChange={(e) => handleUpdateControlStatus(e.target.value as any)}
                className="w-full bg-[var(--color-surface)] border border-pw-border rounded-xl px-4 py-2.5 text-xs text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="none">None / Not Set</option>
                <option value="owned">Owned</option>
                <option value="under-contract">Under Contract</option>
                <option value="option">Option</option>
                <option value="exclusive_right">Exclusive Right</option>
              </select>
            </div>

            {/* Save Visibility Button (if listing is published and mode differs) */}
            {listing.status === 'published' && targetVisibility && targetVisibility !== listing.visibilityMode && (
              <button
                onClick={() => handleVisibilityChange(targetVisibility, gateResult?.passed ? undefined : overrideReason)}
                disabled={
                  actionLoading === 'visibility' ||
                  !isCurrentModeAcknowledge ||
                  !isAckCorrect ||
                  (!gateResult?.passed && !overrideReason.trim())
                }
                className="w-full luminous-button py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                {gateResult?.passed ? 'Save Visibility Mode' : 'Save Visibility Mode with Override'}
              </button>
            )}
          </div>
        </div>

        {/* Live Checklist & Override (Right 5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">checklist</span>
              Publish Gate Checklist
            </h2>

            {!targetVisibility ? (
              <div className="text-xs text-[var(--color-muted)] py-4 text-center italic">
                Select a target visibility mode to evaluate checklist criteria.
              </div>
            ) : (
              gateResult?.criteria.map((c) => (
                <div
                  key={c.key}
                  className="flex items-start gap-3 p-3 rounded-xl border border-pw-border"
                >
                  <span
                    className={`material-symbols-outlined text-lg mt-0.5 ${
                      c.status ? 'text-[var(--color-positive)]' : 'text-[var(--color-error)]'
                    }`}
                  >
                    {c.status ? 'check_circle' : 'cancel'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--color-on-surface)]">
                      {c.label}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                      {c.detail}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Override area if checklist fails */}
            {gateResult && !gateResult.passed && (
              <div className="pt-4 border-t border-pw-border space-y-3">
                <div className="p-3 bg-[var(--color-error)]/5 rounded-xl border border-[var(--color-error)]/20 text-xs text-[var(--color-error)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>Publish blocked on checklist criteria. An override requires a typed reason.</span>
                </div>
                
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this deal can be published with missing or unverified inputs..."
                  className="w-full min-h-[80px] bg-[var(--color-surface)] border border-pw-border rounded-xl p-3 text-xs text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] placeholder-[var(--color-muted)]"
                />
              </div>
            )}

            {/* Display stored gate results */}
            {listing.publishGateResult && (
              <div className="pt-4 border-t border-pw-border space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Last Gate Result (Stored)
                </p>
                <div className="text-[10px] text-[var(--color-muted)] leading-relaxed">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">history</span>
                    <span>Evaluated at {new Date(listing.publishGateResult.evaluatedAt).toLocaleString()}</span>
                  </div>
                  {listing.publishGateResult.overrideReason && (
                    <div className="mt-1 p-2 bg-[var(--color-muted)]/10 rounded-lg italic">
                      Override reason: "{listing.publishGateResult.overrideReason}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Closed notice */}
      {listing.status === 'closed' && (
        <div className="glass-card rounded-2xl border border-[var(--color-error)]/20 p-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--color-error)]">
              block
            </span>
            <div>
              <p className="text-base font-bold text-[var(--color-on-surface)]">
                Listing Closed
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                {listing.closedReason === 'auto_phase_advance'
                  ? 'Automatically closed when the project advanced to the next phase.'
                  : listing.closedReason === 'project_archived'
                  ? 'Closed because the project was archived.'
                  : 'Manually closed by the listing owner.'}
                {listing.closedAt && ` · ${new Date(listing.closedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Version History & Diff Log (DM-23) */}
      {listing.versions && listing.versions.length > 0 && (
        <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4" id="version-history-card">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">history</span>
            Version History & Change Log
          </h2>

          <div className="space-y-4">
            {listing.versions.map((ver: any) => {
              const currentPrice = listing.askingPriceCents || 0;
              const snapPrice = ver.snapshot?.askingPriceCents || 0;
              const priceChanged = currentPrice !== snapPrice;

              const currentRehab = (project as any)?.rehabTier || (project as any)?.scopeTier || 'none';
              const snapRehab = ver.snapshot?.rehabTier || 'none';
              const rehabChanged = currentRehab !== snapRehab;

              const currentTarget = listing.equityTerms?.fundingTarget || 0;
              const snapTarget = ver.snapshot?.fundingTarget || 0;
              const targetChanged = currentTarget !== snapTarget;

              const currentControl = project?.controlStatus || 'none';
              const snapControl = ver.snapshot?.controlStatus || 'none';
              const controlChanged = currentControl !== snapControl;

              return (
                <div key={ver.version} className="p-4 rounded-xl border border-pw-border bg-[var(--color-muted)]/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-on-surface)]">
                      Version {ver.version} Snapshot
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">
                      Published {new Date(ver.publishedAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">Asking Price</p>
                      <p className="font-mono">
                        {priceChanged ? (
                          <>
                            <span className="line-through text-[var(--color-error)] mr-1">${(snapPrice / 100).toLocaleString()}</span>
                            <span className="text-[var(--color-positive)] font-bold">${(currentPrice / 100).toLocaleString()}</span>
                          </>
                        ) : (
                          <span>${(snapPrice / 100).toLocaleString()}</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">Rehab Scope</p>
                      <p className="font-mono">
                        {rehabChanged ? (
                          <>
                            <span className="line-through text-[var(--color-error)] mr-1">{snapRehab}</span>
                            <span className="text-[var(--color-positive)] font-bold">{currentRehab}</span>
                          </>
                        ) : (
                          <span>{snapRehab}</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">Funding Target</p>
                      <p className="font-mono">
                        {targetChanged ? (
                          <>
                            <span className="line-through text-[var(--color-error)] mr-1">${(snapTarget / 100).toLocaleString()}</span>
                            <span className="text-[var(--color-positive)] font-bold">${(currentTarget / 100).toLocaleString()}</span>
                          </>
                        ) : (
                          <span>${(snapTarget / 100).toLocaleString()}</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">Control Status</p>
                      <p className="font-mono">
                        {controlChanged ? (
                          <>
                            <span className="line-through text-[var(--color-error)] mr-1">{snapControl}</span>
                            <span className="text-[var(--color-positive)] font-bold">{currentControl}</span>
                          </>
                        ) : (
                          <span>{snapControl}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deal Invitations & Composer (DM-24) */}
      <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-6" id="deal-invitations-card">
        <div className="flex items-center justify-between border-b border-pw-border pb-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">mail</span>
            Deal Invitations & Solicitations
          </h2>
          {invitations.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-pw-border text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-muted)]/5 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export Invitees (CSV)
            </button>
          )}
        </div>

        {listing?.status !== 'published' ? (
          <div className="p-4 bg-[var(--color-error)]/5 rounded-xl border border-[var(--color-error)]/25 text-xs text-[var(--color-error)] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-base shrink-0">lock</span>
            <span>You must publish this Deal listing before you can send invitations. Do not share unpublished deals.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Invite Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-on-surface)]">
                  Add Invitees (Subscribers & Contacts)
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-[var(--color-surface)] border border-pw-border rounded-xl min-h-[48px] items-center">
                  {selectedInvitees.map((invitee) => (
                    <div
                      key={invitee.email}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-muted)]/10 text-xs font-medium text-[var(--color-on-surface)] rounded-lg border border-pw-border/50"
                    >
                      <span>{invitee.name || invitee.email}</span>
                      <button
                        onClick={() => setSelectedInvitees(prev => prev.filter(i => i.email !== invitee.email))}
                        className="text-[var(--color-muted)] hover:text-[var(--color-on-surface)] font-bold ml-0.5 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddEmail(emailInput);
                      }
                    }}
                    placeholder={selectedInvitees.length === 0 ? "Type email and press Enter..." : "Add more..."}
                    className="flex-1 min-w-[150px] bg-transparent border-none text-xs text-[var(--color-on-surface)] outline-none placeholder-[var(--color-muted)] p-1"
                  />
                </div>

                {/* Suggestions dropdown if email input matches some targets */}
                {emailInput.trim().length > 0 && (
                  <div className="max-h-[150px] overflow-y-auto border border-pw-border rounded-xl bg-[var(--color-surface)] shadow-lg mt-1 text-xs z-50 relative">
                    {inviteTargets
                      .filter(t => 
                        (t.email.toLowerCase().includes(emailInput.toLowerCase()) || 
                         t.name?.toLowerCase().includes(emailInput.toLowerCase())) &&
                        !selectedInvitees.some(s => s.email.toLowerCase() === t.email.toLowerCase())
                      )
                      .map(t => (
                        <button
                          key={t.email}
                          type="button"
                          onClick={() => {
                            if (t.source === 'Vendor' || t.name === 'Vendor' || t.email.includes('vendor')) {
                              toast.error('A Vendor cannot be invited to a Deal listing.');
                              return;
                            }
                            setSelectedInvitees(prev => [...prev, { email: t.email, name: t.name }]);
                            setEmailInput('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[var(--color-muted)]/5 flex items-center justify-between border-b border-pw-border/30 last:border-0"
                        >
                          <div>
                            <span className="font-semibold text-[var(--color-on-surface)]">{t.name || 'No Name'}</span>
                            <span className="text-[10px] text-[var(--color-muted)] ml-2">({t.email})</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-muted)]/10 text-[var(--color-muted)]">
                            {t.source}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Personal Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-on-surface)]">
                  Personal Invitation Note (Optional)
                </label>
                <textarea
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="Enter a brief, customized message to include with the invitation..."
                  className="w-full min-h-[70px] bg-[var(--color-surface)] border border-pw-border rounded-xl p-3 text-xs text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] placeholder-[var(--color-muted)] resize-none"
                />
              </div>

              {/* Send Actions */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="text-[10px] text-[var(--color-muted)]">
                  Bulk invitation is capped at <span className="font-bold">20</span> invitees per action.
                </div>
                <button
                  onClick={handleSendInvitations}
                  disabled={inviteLoading || selectedInvitees.length === 0}
                  className="px-4 py-2.5 bg-[var(--color-primary)] text-xs font-bold text-[var(--color-on-primary)] rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-1.5"
                >
                  {inviteLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[var(--color-on-primary)] border-t-transparent rounded-full animate-spin"></div>
                      Inviting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      Send {selectedInvitees.length > 0 ? `(${selectedInvitees.length}) ` : ''}Invitations
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Aggregate indications summary */}
            {invitations.length > 0 && (
              <IndicationAggregate invitations={invitations} />
            )}

            {/* Invitees Directory status list */}
            <div className="space-y-3 pt-4 border-t border-pw-border">
              <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-on-surface)]">
                Invitee List & Ledger Status
              </h3>

              {invitations.length === 0 ? (
                <div className="text-xs text-[var(--color-muted)] py-6 text-center italic border border-dashed border-pw-border rounded-xl">
                  No invitations sent yet. Add emails above to invite subscribers.
                </div>
              ) : (
                <div className="overflow-x-auto border border-pw-border rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[var(--color-muted)]/5 border-b border-pw-border text-[var(--color-muted)] font-bold">
                        <th className="p-3">Invitee</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Details</th>
                        <th className="p-3">Indication</th>
                        <th className="p-3">Sent At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pw-border">
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[var(--color-muted)]/5 transition-all">
                          <td className="p-3">
                            <p className="font-semibold text-[var(--color-on-surface)]">
                              {inv.inviteeName || 'N/A'}
                            </p>
                            <p className="text-[10px] text-[var(--color-muted)] font-mono">
                              {inv.inviteeEmail}
                            </p>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                inv.status === 'interested'
                                  ? 'bg-[var(--color-positive)]/10 text-[var(--color-positive)]'
                                  : inv.status === 'opened'
                                  ? 'bg-[var(--color-info)]/10 text-[var(--color-info)]'
                                  : inv.status === 'declined'
                                  ? 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
                                  : 'bg-[var(--color-muted)]/10 text-[var(--color-muted)]'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 text-[10px] text-[var(--color-muted)]">
                            <p>Mode: <span className="font-bold text-[var(--color-on-surface)]">{inv.visibilityMode}</span></p>
                            <p>Version: <span className="font-mono text-[var(--color-on-surface)]">V{inv.version}</span></p>
                          </td>
                          <td className="p-3 text-[11px] font-mono text-[var(--color-on-surface)]">
                            {inv.indication ? (
                              inv.indication.type === 'amount'
                                ? `${inv.indication.currency} ${Number(inv.indication.value).toLocaleString()}`
                                : `${inv.indication.value}%`
                            ) : (
                              <span className="text-[var(--color-muted)]">—</span>
                            )}
                          </td>
                          <td className="p-3 text-[10px] text-[var(--color-muted)] whitespace-nowrap">
                            {new Date(inv.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Locked Non-Binding Disclosure Banner */}
              <div className="p-4 rounded-xl border border-pw-border bg-[var(--color-muted)]/5 text-xs text-[var(--color-muted)] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-sm shrink-0 select-none text-[var(--color-primary)] mt-0.5">
                  info
                </span>
                <p className="leading-relaxed">
                  <strong>Non-Binding Disclosure:</strong> {NON_BINDING_DISCLOSURE}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview — visible for draft and published states */}
      {(listing.status === 'draft' || listing.status === 'published' || listing.status === 'paused') && (
        <PublishPreview listing={listing} project={project ?? undefined} />
      )}

      {/* Public link — STRICT AFFORDANCE ABSENCE (DM-D1): ONLY rendered when mode is PUBLIC_SOLICITED */}
      {listing.status === 'published' && listing.visibilityMode === 'PUBLIC_SOLICITED' && (
        <div className="glass-card rounded-xl border border-pw-border p-4 flex items-center gap-3" id="public-share-link-card">
          <span className="material-symbols-outlined text-lg text-[var(--color-primary)]">
            link
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-0.5">
              Public Listing URL
            </p>
            <p className="text-sm font-mono text-[var(--color-on-surface)] truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/deals/${listing.id}` : `/deals/${listing.id}`}
            </p>
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/deals/${listing.id}`;
              navigator.clipboard.writeText(url);
              toast.success('Link copied!');
            }}
            className="px-3 py-2 rounded-lg border border-pw-border text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-on-surface)] transition-all"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
