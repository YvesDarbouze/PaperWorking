'use client';

import { useState, useEffect } from 'react';
import {
  UserPlus,
  X,
  Shield,
  Buildings,
  Link as LinkIcon,
  Plus,
  Trash,
  Copy,
  Check,
  GlobeSimple,
  Clock,
} from '@phosphor-icons/react';

interface InviteRow {
  name: string;
  email: string;
  roleOrCompany: string;
  guestType: 'vendor' | 'lender' | 'title' | 'limited_partner' | 'other';
}

interface PublicShareLink {
  token: string;
  page: string;
  label?: string;
  createdAt: string;
  expiresAt?: string;
  vendorOnly?: boolean;
}

export default function InviteTeamModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'invite' | 'links'>('invite');
  const [inviteType, setInviteType] = useState<'team' | 'guest'>('team');

  // Multi-person invite rows
  const [rows, setRows] = useState<InviteRow[]>([
    { name: '', email: '', roleOrCompany: '', guestType: 'vendor' },
  ]);
  const [personalNote, setPersonalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Public Links state
  const [publicLinks, setPublicLinks] = useState<PublicShareLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linkPage, setLinkPage] = useState<'overview' | 'messages' | 'tasks' | 'card_table' | 'schedule' | 'docs'>('overview');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkVendorOnly, setLinkVendorOnly] = useState(true);
  const [linkExpiresDays, setLinkExpiresDays] = useState(30);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'links') {
      fetchPublicLinks();
    }
  }, [isOpen, activeTab, projectId]);

  async function fetchPublicLinks() {
    setLoadingLinks(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/public-links`);
      if (res.ok) {
        const data = await res.json();
        setPublicLinks(data.links ?? []);
      }
    } catch (err) {
      console.error('Failed to load public links', err);
    } finally {
      setLoadingLinks(false);
    }
  }

  if (!isOpen) return null;

  function addRow() {
    setRows((prev) => [
      ...prev,
      { name: '', email: '', roleOrCompany: '', guestType: 'vendor' },
    ]);
  }

  function removeRow(index: number) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof InviteRow, value: string) {
    setRows((prev) => {
      const next = [...prev];
      const target = next[index];
      if (target) {
        (target as any)[field] = value;
      }
      return next;
    });
  }

  async function handleSendInvites(e: React.FormEvent) {
    e.preventDefault();
    const validRows = rows.filter((r) => r.name.trim() && r.email.trim());
    if (validRows.length === 0 || submitting) return;

    setSubmitting(true);
    setStatusMessage(null);

    let successCount = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        const generatedUid = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        if (inviteType === 'team') {
          const res = await fetch(`/api/projects/${projectId}/team`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: generatedUid,
              name: row.name.trim(),
              email: row.email.trim(),
              role: row.roleOrCompany.trim() || 'Investment Partner',
              personalNote: personalNote.trim() || undefined,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            errors.push(`${row.name}: ${err.error || 'Failed to add'}`);
          } else {
            successCount++;
          }
        } else {
          const res = await fetch(`/api/projects/${projectId}/guests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: generatedUid,
              name: row.name.trim(),
              email: row.email.trim(),
              company: row.roleOrCompany.trim() || undefined,
              guestType: row.guestType,
              personalNote: personalNote.trim() || undefined,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            errors.push(`${row.name}: ${err.error || 'Failed to add'}`);
          } else {
            successCount++;
          }
        }
      } catch (err) {
        errors.push(`${row.name}: ${(err as Error).message}`);
      }
    }

    setSubmitting(false);

    if (errors.length > 0) {
      setStatusMessage({ type: 'error', text: errors.join('; ') });
    } else {
      setStatusMessage({
        type: 'success',
        text: `Successfully invited ${successCount} ${successCount === 1 ? 'person' : 'people'}.`,
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    }
  }

  async function handleCreatePublicLink(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/public-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: linkPage,
          label: linkLabel.trim() || undefined,
          vendorOnly: linkVendorOnly,
          expiresInDays: linkExpiresDays,
        }),
      });
      if (res.ok) {
        setLinkLabel('');
        await fetchPublicLinks();
      }
    } catch (err) {
      console.error('Failed to create public share link', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokePublicLink(token: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/public-links?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPublicLinks((prev) => prev.filter((l) => l.token !== token));
      }
    } catch (err) {
      console.error('Failed to revoke public share link', err);
    }
  }

  function copyPublicLinkUrl(link: PublicShareLink) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/public/project/${projectId}/${link.page}?token=${encodeURIComponent(link.token)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(link.token);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-none border border-border bg-card p-6 shadow-2xl space-y-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-foreground shrink-0" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              People, Vendors & Access Controls
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Primary Tabs */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`rounded-none border px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition ${
              activeTab === 'invite'
                ? 'border-foreground bg-muted text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus size={16} />
            <span>Invite Collaborators</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`rounded-none border px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition ${
              activeTab === 'links'
                ? 'border-foreground bg-muted text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <LinkIcon size={16} />
            <span>Shareable Public Links</span>
          </button>
        </div>

        {/* TAB 1: INVITE COLLABORATORS */}
        {activeTab === 'invite' && (
          <div className="space-y-4">
            {/* Role classification */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInviteType('team')}
                className={`rounded-none border px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition ${
                  inviteType === 'team'
                    ? 'border-foreground bg-muted text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield size={14} />
                <span>Company Member / Employee</span>
              </button>
              <button
                type="button"
                onClick={() => setInviteType('guest')}
                className={`rounded-none border px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 min-h-[44px] transition ${
                  inviteType === 'guest'
                    ? 'border-foreground bg-muted text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <Buildings size={14} />
                <span>Vendor / Contractor / Guest</span>
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {inviteType === 'team'
                ? 'Internal team members have full access to financial underwriting, loan agreements, internal chats, and all lifecycle stages.'
                : 'External vendors, lawyers, appraisers, and inspectors only see designated items marked "Vendor Visible". Private financials stay hidden.'}
            </p>

            {statusMessage && (
              <div
                className={`rounded-none border p-2.5 text-xs ${
                  statusMessage.type === 'error'
                    ? 'border-destructive/40 bg-destructive/10 text-destructive'
                    : 'border-border bg-muted/60 text-foreground'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleSendInvites} className="space-y-4">
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={index}
                    className="p-3 border border-border bg-card/60 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[11px] font-mono uppercase text-muted-foreground">
                        Person #{index + 1}
                      </span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-muted-foreground hover:text-destructive transition p-1"
                          aria-label="Remove person"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(index, 'name', e.target.value)}
                          placeholder="e.g. Jordan Taylor"
                          className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={row.email}
                          onChange={(e) => updateRow(index, 'email', e.target.value)}
                          placeholder="e.g. jordan@example.com"
                          className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          {inviteType === 'team' ? 'Job Title' : 'Company'}
                        </label>
                        <input
                          type="text"
                          value={row.roleOrCompany}
                          onChange={(e) => updateRow(index, 'roleOrCompany', e.target.value)}
                          placeholder={inviteType === 'team' ? 'e.g. Lead Underwriter' : 'e.g. Apex Inspections'}
                          className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                        />
                      </div>

                      {inviteType === 'guest' && (
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Professional Category
                          </label>
                          <select
                            value={row.guestType}
                            onChange={(e) => updateRow(index, 'guestType', e.target.value)}
                            className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                          >
                            <option value="vendor">Vendor / Contractor</option>
                            <option value="lender">Mortgage / Private Lender</option>
                            <option value="title">Title / Escrow / Legal</option>
                            <option value="limited_partner">Limited Partner (LP)</option>
                            <option value="other">Outside Collaborator</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add person button */}
              <button
                type="button"
                onClick={addRow}
                className="w-full border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center gap-1.5 transition min-h-[44px]"
              >
                <Plus size={14} />
                <span>Add another person</span>
              </button>

              {/* Optional personal note */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Optional Personal Welcome Note (Included in Email)
                </label>
                <textarea
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="e.g. Welcome to the deal team! Please review the inspection contingencies scheduled for this week."
                  rows={2}
                  className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-none bg-primary px-6 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px] disabled:opacity-50"
                >
                  {submitting ? 'Sending Invites...' : `Send Invitation${rows.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: SHAREABLE PUBLIC LINKS */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate read-only shareable links for non-users and external clients. Viewers cannot edit data or view private financials.
            </p>

            {/* Create Public Link Form */}
            <form onSubmit={handleCreatePublicLink} className="p-4 border border-border bg-card/60 space-y-3">
              <span className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                <GlobeSimple size={14} />
                Create New Public Share Link
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Specific Page</label>
                  <select
                    value={linkPage}
                    onChange={(e) => setLinkPage(e.target.value as any)}
                    className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                  >
                    <option value="overview">Project Overview</option>
                    <option value="messages">Message Board</option>
                    <option value="tasks">To-do Tasks</option>
                    <option value="card_table">The REIL (Card Table)</option>
                    <option value="schedule">Schedule & Deadlines</option>
                    <option value="docs">Docs & Files</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Link Label (Optional)</label>
                  <input
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="e.g. City Inspector View"
                    className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Expiration</label>
                  <select
                    value={linkExpiresDays}
                    onChange={(e) => setLinkExpiresDays(Number(e.target.value))}
                    className="w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={linkVendorOnly}
                    onChange={(e) => setLinkVendorOnly(e.target.checked)}
                    className="rounded-none border-input h-4 w-4"
                  />
                  <span>Enforce Vendor-Only visibility (hide internal notes & private files)</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px] shrink-0"
                >
                  Generate Link
                </button>
              </div>
            </form>

            {/* List Active Links */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-muted-foreground">Active Share Links</span>
              {loadingLinks ? (
                <div className="text-xs text-muted-foreground py-3">Loading links...</div>
              ) : publicLinks.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-border p-4 text-center">
                  No public share links generated yet for this project.
                </div>
              ) : (
                <div className="space-y-2">
                  {publicLinks.map((link) => {
                    const isCopied = copiedToken === link.token;
                    return (
                      <div
                        key={link.token}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-border bg-card/40"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground uppercase tracking-tight">
                              {link.page.replace('_', ' ')}
                            </span>
                            {link.label && (
                              <span className="text-xs text-muted-foreground">({link.label})</span>
                            )}
                            {link.vendorOnly && (
                              <span className="text-[10px] font-mono border border-border px-1 py-0.5 text-muted-foreground">
                                Vendor-Scoped
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {link.expiresAt
                                ? `Expires: ${new Date(link.expiresAt).toLocaleDateString()}`
                                : 'No Expiry'}
                            </span>
                            <span>Token: {link.token.substring(0, 10)}...</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyPublicLinkUrl(link)}
                            className="inline-flex items-center gap-1.5 rounded-none border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted transition min-h-[40px]"
                          >
                            {isCopied ? <Check size={14} className="text-foreground" /> : <Copy size={14} />}
                            <span>{isCopied ? 'Copied' : 'Copy URL'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokePublicLink(link.token)}
                            className="text-muted-foreground hover:text-destructive p-2 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                            aria-label="Revoke link"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
