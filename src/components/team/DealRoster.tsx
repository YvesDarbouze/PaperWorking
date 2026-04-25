'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  UserPlus, X, Briefcase, Landmark, Building, FileCheck,
  Scale, ClipboardCheck, Home, CreditCard,
} from 'lucide-react';
import type { ProjectTeamMember, ProjectRole, ExternalAccessPermission } from '@/types/schema';
import AccessGateToggle from './AccessGateToggle';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   DealRoster — 8-Slot External Stakeholder Directory

   Replaces the old DealTeamManager with the full set of
   external roles per the specification. Each slot has:
   • Invite form (name + email)
   • Access gate toggles (view / upload)
   • Status badge (active / invited / removed)
   ═══════════════════════════════════════════════════════ */

const DEFAULT_PERMISSIONS: ExternalAccessPermission = {
  canView: true,
  canUpload: false,
  canComment: false,
};

const DEAL_ROLE_SLOTS: { role: ProjectRole; label: string; icon: React.ReactNode; shortDesc: string }[] = [
  {
    role: 'Real Estate Agent',
    label: 'RE Agent',
    icon: <Home className="w-4 h-4" />,
    shortDesc: 'Manages listing, showings, negotiations',
  },
  {
    role: 'Loan Officer/Broker',
    label: 'Loan Officer',
    icon: <CreditCard className="w-4 h-4" />,
    shortDesc: 'Originates and structures the loan',
  },
  {
    role: 'Loan Processor',
    label: 'Loan Processor',
    icon: <Landmark className="w-4 h-4" />,
    shortDesc: 'Prepares loan docs and verifies data',
  },
  {
    role: 'Loan Underwriter',
    label: 'Underwriter',
    icon: <ClipboardCheck className="w-4 h-4" />,
    shortDesc: 'Evaluates risk and approves the loan',
  },
  {
    role: 'Appraiser',
    label: 'Appraiser',
    icon: <FileCheck className="w-4 h-4" />,
    shortDesc: 'Determines property value; can upload report',
  },
  {
    role: 'Title Company/Escrow Officer',
    label: 'Title / Escrow',
    icon: <Scale className="w-4 h-4" />,
    shortDesc: 'Manages title search and escrow',
  },
  {
    role: 'Closing Agent',
    label: 'Closing Agent',
    icon: <Briefcase className="w-4 h-4" />,
    shortDesc: 'Executes the final transaction',
  },
  {
    role: 'Mortgage Servicer',
    label: 'Servicer',
    icon: <Building className="w-4 h-4" />,
    shortDesc: 'Post-close loan servicing',
  },
];

interface Props {
  projectId: string;
}

export default function DealRoster({ projectId }: Props) {
  const currentProject = useProjectStore(s => s.projects.find(d => d.id === projectId));
  const updateDealTeam = useProjectStore(s => s.updateDealTeam);
  const team = currentProject?.projectTeam || [];

  const [editingRole, setEditingRole] = useState<ProjectRole | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const getMemberForRole = (role: ProjectRole) =>
    team.find(m => m.projectRole === role && m.status !== 'removed');

  const activeCount = team.filter(m => m.status !== 'removed').length;

  const handleAssign = (role: ProjectRole) => {
    if (!inviteEmail.trim()) return;

    const newMember: ProjectTeamMember = {
      id: `tm_${Date.now()}`,
      email: inviteEmail.trim(),
      displayName: inviteName.trim() || inviteEmail.split('@')[0],
      projectRole: role,
      permissions: { ...DEFAULT_PERMISSIONS },
      assignedAt: new Date(),
      status: 'invited',
    };

    updateDealTeam(projectId, [...team, newMember]);
    toast.success(`${role} invited: ${newMember.displayName}`);
    setInviteEmail('');
    setInviteName('');
    setEditingRole(null);
  };

  const handleRemove = (memberId: string) => {
    const updated = team.map(m =>
      m.id === memberId ? { ...m, status: 'removed' as const } : m
    );
    updateDealTeam(projectId, updated);
    toast.success('Stakeholder removed from deal.');
  };

  const handlePermissionChange = (memberId: string, permissions: ExternalAccessPermission) => {
    const updated = team.map(m =>
      m.id === memberId ? { ...m, permissions } : m
    );
    updateDealTeam(projectId, updated);
  };

  return (
    <div className="bg-bg-surface rounded-xl border border-border-accent shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border-accent">
        <div>
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">Deal Roster</h3>
          <p className="text-sm text-text-secondary mt-0.5">
            Tag external stakeholders and control their access.
          </p>
        </div>
        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
          {activeCount} / {DEAL_ROLE_SLOTS.length} assigned
        </span>
      </div>

      {/* Role Slots */}
      <div className="divide-y divide-gray-100">
        {DEAL_ROLE_SLOTS.map(({ role, label, icon, shortDesc }) => {
          const member = getMemberForRole(role);
          const isEditing = editingRole === role;

          return (
            <div key={role} className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left: Icon + Role Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      member ? 'bg-gray-900 text-white' : 'bg-bg-primary text-text-secondary'
                    }`}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{label}</p>
                    {member ? (
                      <p className="text-sm text-text-secondary truncate">
                        {member.displayName}{' '}
                        <span className="text-text-secondary">· {member.email}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary">{shortDesc}</p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {member ? (
                    <>
                      {/* Access Gate Toggles */}
                      <AccessGateToggle
                        permissions={member.permissions}
                        onChange={(p) => handlePermissionChange(member.id, p)}
                        compact
                      />
                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        member.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {member.status}
                      </span>
                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-text-secondary hover:text-red-500 transition"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : !isEditing ? (
                    <button
                      onClick={() => setEditingRole(role)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-text-primary bg-bg-primary rounded-md hover:bg-gray-200 transition"
                    >
                      <UserPlus className="w-3 h-3" /> Tag
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Inline Invite Form */}
              {isEditing && !member && (
                <div className="mt-3 pt-3 border-t border-border-accent flex gap-2">
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 border border-border-accent rounded-md px-3 py-2 text-xs focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                    autoFocus
                  />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="flex-[2] border border-border-accent rounded-md px-3 py-2 text-xs focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                  />
                  <button
                    onClick={() => handleAssign(role)}
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => { setEditingRole(null); setInviteEmail(''); setInviteName(''); }}
                    className="p-2 text-text-secondary hover:text-text-secondary transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
