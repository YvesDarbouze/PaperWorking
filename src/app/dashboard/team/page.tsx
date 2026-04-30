'use client';

import React, { useMemo, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import { Shield, ShieldAlert, Trash2, Mail, Users, CheckCircle2, UserCircle } from 'lucide-react';
import Link from 'next/link';
import type { ProjectTeamMember } from '@/types/schema';

type UnifiedMemberType = 'Internal' | 'External';

interface UnifiedMember {
  id: string;
  email: string;
  displayName: string;
  role: string;
  type: UnifiedMemberType;
  status: 'active' | 'invited' | 'removed';
  assignedProjects: string[]; // Project IDs for external vendors, or managed projects for Deal Leads
}

export default function TeamDirectoryPage() {
  const { profile } = useAuth();
  const { teamMembers: internalMembers } = useUserStore();
  const { projects, updateDealTeam } = useProjectStore();

  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const isAdmin = profile?.orgRole === 'Lead Investor' || profile?.orgRole === 'Admin';

  // Aggregate and merge all team members
  const unifiedTeam = useMemo(() => {
    const list: UnifiedMember[] = [];
    const seenEmails = new Set<string>();

    // 1. Map Internal Members
    internalMembers.forEach(m => {
      if (m.status === 'removed') return;
      
      seenEmails.add(m.email.toLowerCase());
      list.push({
        id: m.id,
        email: m.email,
        displayName: m.displayName || m.email,
        role: m.internalRole,
        type: 'Internal',
        status: m.status,
        assignedProjects: m.assignedProjectIds || [],
      });
    });

    // 2. Map External Collaborators (Vendors, Agents, etc)
    projects.forEach(p => {
      if (!p.projectTeam) return;

      p.projectTeam.forEach((em: ProjectTeamMember) => {
        if (em.status === 'removed') return;
        const lowerEmail = em.email.toLowerCase();

        // If they exist as internal or we already processed them as external
        if (seenEmails.has(lowerEmail)) {
          // Find them and just append this project ID to their assigned projects
          const existing = list.find(l => l.email.toLowerCase() === lowerEmail);
          if (existing && !existing.assignedProjects.includes(p.id)) {
            existing.assignedProjects.push(p.id);
          }
        } else {
          seenEmails.add(lowerEmail);
          list.push({
            id: em.id,
            email: em.email,
            displayName: em.displayName || em.email,
            role: em.projectRole,
            type: 'External',
            status: em.status,
            assignedProjects: [p.id],
          });
        }
      });
    });

    // Sort: Internals first, then alphabetical by name
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'Internal' ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [internalMembers, projects]);

  const handleRevokeExternalAccess = (email: string) => {
    setRevokingEmail(email);

    // Filter out this member from all projects they are assigned to
    try {
      projects.forEach(p => {
        if (!p.projectTeam) return;
        
        const hasMember = p.projectTeam.some(m => m.email.toLowerCase() === email.toLowerCase() && m.status !== 'removed');
        
        if (hasMember) {
          const updatedTeam = p.projectTeam.map(m => 
            m.email.toLowerCase() === email.toLowerCase() ? { ...m, status: 'removed' as const } : m
          );
          updateDealTeam(p.id, updatedTeam);
        }
      });
    } catch (err) {
      console.error("Failed to revoke access:", err);
    } finally {
      setTimeout(() => setRevokingEmail(null), 500);
    }
  };

  return (
    <div className="dashboard-context max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--pw-black)' }}>Team Directory</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage your internal team members and external collaborators across all projects.
          </p>
        </div>

        {isAdmin && (
          <Link 
            href="/dashboard/settings/team"
            className="ag-button !py-2 !px-4 !text-xs"
          >
            <Users className="w-4 h-4" />
            Manage Internal Seats
          </Link>
        )}
      </header>

      {/* Data Table Container — Institutional Card (8px Radius) */}
      <div className="bg-bg-surface border border-border-ui overflow-hidden rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-bg-primary border-b border-border-ui" style={{ color: 'var(--text-secondary)' }}>
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Member Name</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Email</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Role</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Access Level</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui">
              {unifiedTeam.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
                    <UserCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No team members found.</p>
                  </td>
                </tr>
              ) : (
                unifiedTeam.map(member => {
                  const initials = member.displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || member.email[0].toUpperCase();

                  return (
                    <tr key={member.email} className="hover:bg-bg-primary/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: member.type === 'Internal' ? '#0d0d0d' : '#7F7F7F' }}
                          >
                            {initials}
                          </div>
                          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{member.displayName}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                        {member.email}
                      </td>

                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                          {member.type === 'Internal' && member.role === 'Admin' && <Shield className="w-3.5 h-3.5 opacity-50" />}
                          {member.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span 
                            className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border"
                            style={{ 
                              backgroundColor: member.type === 'Internal' ? '#F2F2F2' : '#FFFFFF',
                              color: member.type === 'Internal' ? '#0d0d0d' : '#7F7F7F',
                              borderColor: 'var(--border-ui)'
                            }}
                          >
                            {member.type === 'Internal' ? 'Internal Team' : 'External Vendor'}
                          </span>
                          {member.status === 'invited' && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded-sm border border-amber-100 uppercase">
                              Invited
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {member.type === 'External' ? (
                          <button
                            onClick={() => handleRevokeExternalAccess(member.email)}
                            disabled={!isAdmin || revokingEmail === member.email}
                            className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:underline disabled:opacity-30 disabled:no-underline"
                          >
                            Revoke
                          </button>
                        ) : (
                          <Link
                            href="/dashboard/settings/team"
                            className="text-[10px] font-bold uppercase tracking-wider hover:underline"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Manage
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
