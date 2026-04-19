'use client';

import React from 'react';
import { useUserStore } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { Crown, KeyRound, ChevronDown } from 'lucide-react';
import type { InternalRole } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   InternalHierarchy — Admin vs Deal Lead Permissions

   Renders a table of org-level team members with:
   • Role badge + dropdown to reassign
   • Deal assignment for Deal Leads
   • Visual distinction: Admin (gold), Deal Lead (blue)
   ═══════════════════════════════════════════════════════ */

const ROLE_META: Record<InternalRole, { color: string; bg: string; icon: React.ReactNode; desc: string }> = {
  'Admin': {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: <Crown className="w-3 h-3" />,
    desc: 'Controls billing, account settings, all projects',
  },
  'Deal Lead': {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: <KeyRound className="w-3 h-3" />,
    desc: 'Assigned to run specific properties, manages deal roster',
  },
};

export default function InternalHierarchy() {
  const teamMembers = useUserStore(s => s.teamMembers);
  const updateMemberRole = useUserStore(s => s.updateMemberRole);
  const assignMemberToDeal = useUserStore(s => s.assignMemberToDeal);
  const unassignMemberFromDeal = useUserStore(s => s.unassignMemberFromDeal);
  const accountTier = useUserStore(s => s.accountTier);
  const projects = useProjectStore(s => s.projects);

  const activeMembers = teamMembers.filter(m => m.status !== 'removed');

  const [expandedMember, setExpandedMember] = React.useState<string | null>(null);

  if (accountTier === 'Individual') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-amber-500" />
          Internal Hierarchy
        </h3>
        <p className="text-xs text-gray-500">
          Upgrade to a Team account to assign Admin and Deal Lead roles to members.
        </p>
      </div>
    );
  }

  if (activeMembers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-amber-500" />
          Internal Hierarchy
        </h3>
        <p className="text-xs text-gray-500">
          No team members yet. Invite members from the Account Tier settings above.
        </p>
      </div>
    );
  }

  const handleRoleChange = (memberId: string, role: InternalRole) => {
    updateMemberRole(memberId, role);
    toast.success(`Role updated to ${role}.`);
  };

  const handleDealToggle = (memberId: string, projectId: string, isAssigned: boolean) => {
    if (isAssigned) {
      unassignMemberFromDeal(memberId, projectId);
    } else {
      assignMemberToDeal(memberId, projectId);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          Internal Hierarchy
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Assign internal roles. Admins control billing; Deal Leads run specific properties.
        </p>
      </div>

      {/* Role Legend */}
      <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100 flex gap-6">
        {(['Admin', 'Deal Lead'] as InternalRole[]).map(role => (
          <div key={role} className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${ROLE_META[role].bg} ${ROLE_META[role].color}`}>
              {ROLE_META[role].icon}
              {role}
            </span>
            <span className="text-xs text-gray-400">{ROLE_META[role].desc}</span>
          </div>
        ))}
      </div>

      {/* Member Rows */}
      <div className="divide-y divide-gray-100">
        {activeMembers.map(member => {
          const meta = ROLE_META[member.internalRole];
          const isExpanded = expandedMember === member.id;
          const assignedCount = member.assignedProjectIds.length;

          return (
            <div key={member.id}>
              <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{member.displayName}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role Dropdown */}
                  <select
                    value={member.internalRole}
                    onChange={e => handleRoleChange(member.id, e.target.value as InternalRole)}
                    className={`appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border-0 cursor-pointer ${meta.bg} ${meta.color}`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.4rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1rem 1rem',
                    }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Deal Lead">Deal Lead</option>
                  </select>

                  {/* Deal Assignment Toggle (Deal Lead only) */}
                  {member.internalRole === 'Deal Lead' && projects.length > 0 && (
                    <button
                      onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      {assignedCount} deal{assignedCount !== 1 ? 's' : ''}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Deal Assignment Panel (expanded) */}
              {isExpanded && member.internalRole === 'Deal Lead' && (
                <div className="px-6 pb-4 bg-gray-50/40">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Assign Deals
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {projects.map(deal => {
                      const isAssigned = member.assignedProjectIds.includes(deal.id);
                      return (
                        <button
                          key={deal.id}
                          onClick={() => handleDealToggle(member.id, deal.id, isAssigned)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
                            isAssigned
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isAssigned ? 'bg-white' : 'bg-gray-300'}`} />
                          <span className="truncate font-medium">{deal.propertyName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
