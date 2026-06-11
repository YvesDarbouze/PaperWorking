'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { UserPlus, X, Briefcase, Scale, Landmark, Building } from 'lucide-react';
import type { ProjectTeamMember, ProjectRole } from '@/types/schema';
import toast from 'react-hot-toast';
import { projectsService } from '@/lib/firebase/projects';

/* ═══════════════════════════════════════════════════════
   ProjectTeamManager — Per-Deal Team Assignment

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

export default function ProjectTeamManager({ projectId }: Props) {
  const currentProject = useProjectStore((s) => s.projects.find((d) => d.id === projectId));
  const updateProjectTeam = useProjectStore((s) => s.updateProjectTeam);
  const team = currentProject?.projectTeam || [];

  const [editingRole, setEditingRole] = useState<ProjectRole | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const getMemberForRole = (role: ProjectRole) =>
    team.find((m) => m.projectRole === role && m.status !== 'removed');

  const handleAssign = (role: ProjectRole) => {
    if (!inviteEmail.trim()) return;

    const newMember: ProjectTeamMember = {
      id: `tm_${Date.now()}`,
      email: inviteEmail.trim(),
      displayName: inviteName.trim() || inviteEmail.split('@')[0],
      projectRole: role,
      permissions: { canView: true, canUpload: false, canComment: false },
      assignedAt: new Date(),
      status: 'invited',
    };

    const updatedTeam = [...team, newMember];
    updateProjectTeam(projectId, updatedTeam);

    toast.promise(
      projectsService.updateProject(projectId, { projectTeam: updatedTeam }),
      {
        loading: 'Inviting deal team member...',
        success: `${role} invited: ${newMember.displayName}`,
        error: (err: any) => err.message || 'Failed to update deal team.',
      }
    );

    setInviteEmail('');
    setInviteName('');
    setEditingRole(null);
  };

  const handleRemove = (memberId: string) => {
    const updated = team.map((m) =>
      m.id === memberId ? { ...m, status: 'removed' as const } : m
    );
    updateProjectTeam(projectId, updated);

    toast.promise(
      projectsService.updateProject(projectId, { projectTeam: updated }),
      {
        loading: 'Removing deal team member...',
        success: 'Team member removed.',
        error: (err: any) => err.message || 'Failed to update deal team.',
      }
    );
  };

  return (
    <div className="bg-bg-surface rounded-xl border border-border-accent p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border-accent pb-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">Deal Team</h3>
          <p className="text-sm text-text-secondary mt-0.5">Assign professionals to this deal.</p>
        </div>
        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
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
                  ? 'border-border-accent bg-bg-primary/50'
                  : isEditing
                  ? 'border-[#454955]/30 bg-[#454955]/5'
                  : 'border-dashed border-border-accent hover:border-border-accent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      member ? 'bg-[#454955]/10 text-[#454955]' : 'bg-bg-primary text-text-secondary'
                    }`}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{label}</p>
                    {member ? (
                      <p className="text-sm text-text-secondary">
                        {member.displayName}{' '}
                        <span className="text-text-secondary">· {member.email}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-text-secondary">Not assigned</p>
                    )}
                  </div>
                </div>

                {member ? (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-1.5 rounded-md hover:bg-[#F06543]/10 text-text-secondary hover:text-[#F06543] transition"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : !isEditing ? (
                  <button
                    onClick={() => setEditingRole(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#454955] bg-[#454955]/10 rounded-md hover:bg-[#454955]/20 transition"
                  >
                    <UserPlus className="w-3 h-3" /> Invite
                  </button>
                ) : null}
              </div>

              {/* Inline Invite Form */}
              {isEditing && !member && (
                <div className="mt-3 pt-3 border-t border-border-accent flex gap-2">
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 border border-border-accent rounded-md px-3 py-2 text-xs focus:border-[#454955] focus:ring-1 focus:ring-[#454955] transition"
                  />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="flex-[2] border border-border-accent rounded-md px-3 py-2 text-xs focus:border-[#454955] focus:ring-1 focus:ring-[#454955] transition"
                  />
                  <button
                    onClick={() => handleAssign(role)}
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 bg-[#454955] text-white text-xs font-medium rounded-md hover:bg-[#454955]/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
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
