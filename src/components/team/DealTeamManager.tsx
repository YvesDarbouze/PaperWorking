'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { UserPlus, X, Briefcase, Scale, Landmark, Building } from 'lucide-react';
import type { ProjectTeamMember, ProjectRole } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   DealTeamManager — Per-Deal Team Assignment

   Renders slots for deal-specific professionals:
   RE Agent, RE Lawyer, Loan Processor, Bank.
   Each slot supports email invite and member display.
   ═══════════════════════════════════════════════════════ */

const DEAL_ROLE_SLOTS: { role: ProjectRole; label: string; icon: React.ReactNode }[] = [
  { role: 'Real Estate Agent', label: 'RE Agent', icon: <Briefcase className="w-4 h-4" /> },
  { role: 'Loan Officer/Broker', label: 'Loan Officer', icon: <Scale className="w-4 h-4" /> },
  { role: 'Loan Processor', label: 'Loan Processor', icon: <Landmark className="w-4 h-4" /> },
  { role: 'Closing Agent', label: 'Closing Agent', icon: <Building className="w-4 h-4" /> },
];

interface Props {
  projectId: string;
}

export default function DealTeamManager({ projectId }: Props) {
  const currentProject = useProjectStore((s) => s.projects.find((d) => d.id === projectId));
  const updateDealTeam = useProjectStore((s) => s.updateDealTeam);
  const team = currentProject?.dealTeam || [];

  const [editingRole, setEditingRole] = useState<ProjectRole | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const getMemberForRole = (role: ProjectRole) =>
    team.find((m) => m.dealRole === role && m.status !== 'removed');

  const handleAssign = (role: ProjectRole) => {
    if (!inviteEmail.trim()) return;

    const newMember: ProjectTeamMember = {
      id: `tm_${Date.now()}`,
      email: inviteEmail.trim(),
      displayName: inviteName.trim() || inviteEmail.split('@')[0],
      dealRole: role,
      permissions: { canView: true, canUpload: false, canComment: false },
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
    const updated = team.map((m) =>
      m.id === memberId ? { ...m, status: 'removed' as const } : m
    );
    updateDealTeam(projectId, updated);
    toast.success('Team member removed.');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">Deal Team</h3>
          <p className="text-sm text-gray-500 mt-0.5">Assign professionals to this deal.</p>
        </div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {team.filter((m) => m.status !== 'removed').length} / {DEAL_ROLE_SLOTS.length} assigned
        </span>
      </div>

      <div className="space-y-3">
        {DEAL_ROLE_SLOTS.map(({ role, label, icon }) => {
          const member = getMemberForRole(role);
          const isEditing = editingRole === role;

          return (
            <div
              key={role}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                member
                  ? 'border-gray-200 bg-gray-50/50'
                  : isEditing
                  ? 'border-indigo-300 bg-indigo-50/30'
                  : 'border-dashed border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      member ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{label}</p>
                    {member ? (
                      <p className="text-sm text-gray-500">
                        {member.displayName}{' '}
                        <span className="text-gray-400">· {member.email}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">Not assigned</p>
                    )}
                  </div>
                </div>

                {member ? (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : !isEditing ? (
                  <button
                    onClick={() => setEditingRole(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition"
                  >
                    <UserPlus className="w-3 h-3" /> Invite
                  </button>
                ) : null}
              </div>

              {/* Inline Invite Form */}
              {isEditing && !member && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="flex-[2] border border-gray-200 rounded-md px-3 py-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    onClick={() => handleAssign(role)}
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 bg-black text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => { setEditingRole(null); setInviteEmail(''); setInviteName(''); }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition"
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
