'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { AssigneeOption, LegacyProjectPhase } from '@/lib/projects/types';
import { SEED_MARKETPLACE_VENDORS } from '@/lib/marketplace/seed-data';

export type { AssigneeOption };

export interface AssignOrInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  assignType?: 'step' | 'phase';
  phaseKey?: LegacyProjectPhase;
  phaseTitle?: string;
  currentAssignee?: string | null;
  task?: {
    id: string;
    title: string;
    assignedTo?: string;
    phase?: string;
  } | null;
  existingMembers?: AssigneeOption[];
  onAssignExisting: (taskIdOrPhaseKey: string, assigneeName: string, assigneeUid?: string) => Promise<void> | void;
  onAssignPhase?: (phaseKey: LegacyProjectPhase, member: AssigneeOption) => Promise<void> | void;
  onMemberInvitedAndAssigned: (
    newMember: AssigneeOption,
    taskIdOrPhaseKey: string
  ) => Promise<void> | void;
  initialTab?: 'roster' | 'invite' | 'vendors';
  userTier?: string;
  propertyState?: string;
  onAssignVendor?: (vendor: AssigneeOption, taskIdOrPhaseKey: string) => Promise<void> | void;
}

const DEFAULT_ROLES = [
  'Lead Underwriter',
  'Acquisition Analyst',
  'Transaction Coordinator',
  'Title & Escrow Officer',
  'Lender / Debt Broker',
  'General Contractor',
  'Property Manager',
  'CPA / Tax Professional',
  'Legal Counsel',
  'Appraiser / Inspector',
  'Equity Partner',
];

export default function AssignOrInviteModal({
  isOpen,
  onClose,
  projectId,
  projectName = 'Deal Workspace',
  assignType = 'step',
  phaseKey,
  phaseTitle,
  currentAssignee,
  task,
  existingMembers = [],
  onAssignExisting,
  onAssignPhase,
  onMemberInvitedAndAssigned,
  initialTab = 'roster',
  userTier = 'Investment Team',
  propertyState = 'TX',
  onAssignVendor,
}: AssignOrInviteModalProps) {
  const isPhaseAssignment = assignType === 'phase';
  const resolvedPhaseTitle =
    phaseTitle ||
    (phaseKey ? phaseKey.charAt(0).toUpperCase() + phaseKey.slice(1) : 'Lifecycle Phase');

  const isTeamTier = useMemo(() => {
    const tierLower = String(userTier || '').toLowerCase();
    return tierLower.includes('team') || tierLower.includes('enterprise');
  }, [userTier]);

  const [activeTab, setActiveTab] = useState<'roster' | 'invite' | 'vendors'>(initialTab);
  const [selectedVendorTradeFilter, setSelectedVendorTradeFilter] = useState<string>('All');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(
    isPhaseAssignment ? `${resolvedPhaseTitle} Lead` : DEFAULT_ROLES[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setInviteName('');
      setInviteEmail('');
      setInviteRole(isPhaseAssignment ? `${resolvedPhaseTitle} Lead` : DEFAULT_ROLES[0]);
      setStatusMessage(null);
      setSubmitting(false);
      setActiveTab(initialTab);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isPhaseAssignment, resolvedPhaseTitle]);

  if (!isOpen) return null;
  if (!isPhaseAssignment && !task) return null;
  if (isPhaseAssignment && !phaseKey) return null;

  const currentAssigneeName = isPhaseAssignment ? currentAssignee : task?.assignedTo;

  const handleSelectExisting = async (member: AssigneeOption) => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      if (isPhaseAssignment && phaseKey) {
        if (onAssignPhase) {
          await onAssignPhase(phaseKey, member);
        } else {
          await onAssignExisting(phaseKey, member.name, member.uid || member.id);
        }
      } else if (task) {
        await onAssignExisting(task.id, member.name, member.uid || member.id);
      }
      onClose();
    } catch {
      setStatusMessage({ text: 'Failed to assign team member', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setStatusMessage({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const memberName = inviteName.trim() || inviteEmail.split('@')[0];

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          name: memberName,
          role: inviteRole,
          projectId,
          assignType: isPhaseAssignment ? 'phase' : 'step',
          phaseKey: isPhaseAssignment ? phaseKey : undefined,
          phaseTitle: isPhaseAssignment ? resolvedPhaseTitle : undefined,
          taskId: !isPhaseAssignment ? task?.id : undefined,
          taskTitle: !isPhaseAssignment ? task?.title : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send invite');
      }

      const data = await res.json();
      const newMember: AssigneeOption = data.member || {
        id: `team-${Date.now().toString().slice(-6)}`,
        name: memberName,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: 'invited',
      };

      if (isPhaseAssignment && phaseKey) {
        if (onAssignPhase) {
          await onAssignPhase(phaseKey, newMember);
        }
        await onMemberInvitedAndAssigned(newMember, phaseKey);
        setStatusMessage({
          text: `Invited ${memberName} and assigned to lead ${resolvedPhaseTitle} phase.`,
          type: 'success',
        });
      } else if (task) {
        await onMemberInvitedAndAssigned(newMember, task.id);
        setStatusMessage({ text: `Invited ${memberName} and assigned task.`, type: 'success' });
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending invitation';
      setStatusMessage({ text: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        ref={modalRef}
        data-testid="assign-or-invite-modal"
        className="w-full max-w-lg rounded-none border border-neutral-800 bg-[#0c0c0c] p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-neutral-100 font-sans"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {isPhaseAssignment ? 'Phase Lead Assignment' : 'Task Assignment'}
            </span>
            <h2 id="assign-modal-title" className="mt-2 text-lg font-bold tracking-tight text-white">
              {isPhaseAssignment ? 'Assign Phase Lead' : 'Assign REIL Task'}
            </h2>
            <p className="mt-1 text-xs text-neutral-300 line-clamp-1">
              {isPhaseAssignment ? (
                <>
                  Phase: <strong className="text-white">{resolvedPhaseTitle}</strong>
                </>
              ) : (
                <>
                  Task: <strong className="text-white">{task?.title}</strong>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none border border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex flex-wrap border-b border-neutral-800">
          <button
            type="button"
            data-testid="tab-existing-roster"
            onClick={() => setActiveTab('roster')}
            className={`min-h-[44px] border-b-2 px-4 py-2.5 text-xs font-semibold rounded-none transition ${
              activeTab === 'roster'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Project Team ({existingMembers.length})
          </button>
          <button
            type="button"
            data-testid="tab-invite-new"
            onClick={() => setActiveTab('invite')}
            className={`min-h-[44px] border-b-2 px-4 py-2.5 text-xs font-semibold rounded-none transition ${
              activeTab === 'invite'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            + Invite New Member via Email
          </button>
          <button
            type="button"
            data-testid="tab-state-vendors"
            onClick={() => setActiveTab('vendors')}
            className={`min-h-[44px] border-b-2 px-4 py-2.5 text-xs font-semibold rounded-none transition ${
              activeTab === 'vendors'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {`Vendors in ${propertyState}`}
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 rounded-none border p-3 text-xs ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Tier Gate Warning Screen for Solo Tier attempting Team assignment */}
        {!isTeamTier && (activeTab === 'roster' || activeTab === 'invite') ? (
          <div
            data-testid="team-tier-error-screen"
            className="mt-4 p-5 rounded-none border border-amber-500/30 bg-amber-500/5 text-xs text-neutral-200 space-y-3"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <h3>Team Account Required</h3>
            </div>
            <p className="text-neutral-300">
              Assigning tasks to internal team members or inviting new seats to your SaaS team requires an <strong>Investment Team</strong> subscription. Your account is currently on the <strong>{userTier}</strong> plan.
            </p>
            <p className="text-neutral-400 text-[11px]">
              You can still work with and assign <strong>Subscribed Vendors</strong> licensed in {propertyState} from the marketplace without upgrading.
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <Link
                href="/dashboard/settings?tab=subscription"
                className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition"
                data-testid="upgrade-settings-link"
              >
                Go to Settings to Upgrade
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="rounded-none min-h-[44px] px-4 text-xs"
                onClick={() => setActiveTab('vendors')}
                data-testid="switch-to-state-vendors-btn"
              >
                {`Browse Subscribed Vendors in ${propertyState}`}
              </Button>
            </div>
          </div>
        ) : activeTab === 'roster' ? (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {existingMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <p>No team members added yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('invite')}
                  className="mt-2 text-emerald-400 hover:underline min-h-[44px] inline-flex items-center"
                >
                  Invite your first collaborator
                </button>
              </div>
            ) : (
              existingMembers.map((member) => {
                const isCurrent = currentAssigneeName === member.name;
                return (
                  <div
                    key={member.id || member.uid || member.name}
                    data-testid={`member-row-${member.name}`}
                    className={`flex items-center justify-between rounded-none border p-3 text-xs transition ${
                      isCurrent
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-none border border-neutral-700 bg-neutral-800 text-[11px] font-bold text-neutral-200 uppercase">
                        {member.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{member.name}</p>
                        <p className="text-[11px] text-neutral-400">
                          {member.role || 'Collaborator'} {member.email ? ` · ${member.email}` : ''}
                        </p>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="rounded-none border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                        Assigned
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-none min-h-[44px] px-4"
                        disabled={submitting}
                        onClick={() => handleSelectExisting(member)}
                        data-testid={`assign-button-${member.name}`}
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === 'invite' ? (
          <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-neutral-300">
              {isPhaseAssignment ? (
                <>
                  Invite a team member not currently on the roster. They will receive an email invitation to collaborate on <strong>{projectName}</strong> and lead the <strong>{resolvedPhaseTitle}</strong> phase.
                </>
              ) : (
                <>
                  Invite a partner, broker, or contractor not currently on the team. They will receive an email invitation to collaborate on <strong>{projectName}</strong> and this task will be automatically assigned to them.
                </>
              )}
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-200">Full Name</label>
              <input
                type="text"
                data-testid="invite-name-input"
                placeholder="e.g. Jordan Matthews"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                data-testid="invite-email-input"
                placeholder="e.g. jordan@apexcapital.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200">Project Role</label>
              <select
                data-testid="invite-role-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-base sm:text-xs text-white focus:border-neutral-400 focus:outline-none"
              >
                {isPhaseAssignment && (
                  <option value={`${resolvedPhaseTitle} Lead`}>
                    {resolvedPhaseTitle} Lead
                  </option>
                )}
                {DEFAULT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4">
              <Button
                type="button"
                variant="tertiary"
                size="md"
                className="rounded-none min-h-[44px] px-4"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="rounded-none min-h-[44px] px-4"
                disabled={submitting}
                data-testid="invite-and-assign-submit"
              >
                {submitting
                  ? 'Inviting...'
                  : isPhaseAssignment
                  ? 'Invite & Assign Phase Lead'
                  : 'Invite & Assign Task'}
              </Button>
            </div>
          </form>
        ) : (
          /* Vendors in State Tab (Available to all tiers) */
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <p>
                Subscribed vendors licensed or operating in <strong className="text-white">{propertyState}</strong>.
              </p>
              <select
                aria-label="Filter vendors by trade"
                value={selectedVendorTradeFilter}
                onChange={(e) => setSelectedVendorTradeFilter(e.target.value)}
                className="rounded-none border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-white focus:outline-none"
                data-testid="vendor-trade-filter"
              >
                <option value="All">All Trades</option>
                <option value="Appraiser">Appraisers</option>
                <option value="Inspector">Inspectors</option>
                <option value="Title">Title & Escrow</option>
                <option value="Lender">Lenders</option>
                <option value="Contractor">Contractors</option>
                <option value="Insurance">Insurance</option>
                <option value="Lawyer">Legal Counsel</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {SEED_MARKETPLACE_VENDORS.filter((v) => {
                const normState = propertyState.trim().toUpperCase();
                const matchesState =
                  !normState ||
                  v.licensingStates.some((s) => s.toUpperCase() === normState) ||
                  v.location.toUpperCase().includes(normState);
                if (!matchesState) return false;
                if (selectedVendorTradeFilter === 'All') return true;
                return v.type.toLowerCase().includes(selectedVendorTradeFilter.toLowerCase());
              }).length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  <p>No verified vendors found in {propertyState} for this trade.</p>
                </div>
              ) : (
                SEED_MARKETPLACE_VENDORS.filter((v) => {
                  const normState = propertyState.trim().toUpperCase();
                  const matchesState =
                    !normState ||
                    v.licensingStates.some((s) => s.toUpperCase() === normState) ||
                    v.location.toUpperCase().includes(normState);
                  if (!matchesState) return false;
                  if (selectedVendorTradeFilter === 'All') return true;
                  return v.type.toLowerCase().includes(selectedVendorTradeFilter.toLowerCase());
                }).map((vendor) => {
                  const isAssigned = currentAssigneeName === vendor.companyName;
                  return (
                    <div
                      key={vendor.id}
                      data-testid={`state-vendor-row-${vendor.id}`}
                      className={`flex items-center justify-between rounded-none border p-3 text-xs transition ${
                        isAssigned
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-none border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{vendor.companyName}</p>
                            <span className="rounded-none border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-neutral-300">
                              {vendor.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400">
                            {vendor.city}, {vendor.location} · {vendor.feeRangeLabel} · {vendor.avgTurnaroundDays}d avg turnaround
                          </p>
                        </div>
                      </div>
                      {isAssigned ? (
                        <span className="rounded-none border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                          Assigned
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-none min-h-[44px] px-3 text-xs"
                          disabled={submitting}
                          onClick={async () => {
                            setSubmitting(true);
                            try {
                              const vendorOption: AssigneeOption = {
                                id: vendor.id,
                                uid: vendor.uid,
                                name: vendor.companyName,
                                role: `${vendor.type} (Vendor)`,
                                status: 'active',
                              };
                              if (onAssignVendor && task) {
                                await onAssignVendor(vendorOption, task.id);
                              } else if (task) {
                                await onAssignExisting(task.id, vendor.companyName, vendor.uid);
                              } else if (isPhaseAssignment && phaseKey) {
                                if (onAssignPhase) {
                                  await onAssignPhase(phaseKey, vendorOption);
                                } else {
                                  await onAssignExisting(phaseKey, vendor.companyName, vendor.uid);
                                }
                              }
                              onClose();
                            } catch {
                              setStatusMessage({ text: 'Failed to assign vendor', type: 'error' });
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          data-testid={`assign-vendor-btn-${vendor.id}`}
                        >
                          Assign Vendor
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
