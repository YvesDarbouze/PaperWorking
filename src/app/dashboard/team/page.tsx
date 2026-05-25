'use client';

import React, { useMemo, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import { Shield, ShieldAlert, Trash2, Mail, Users, CheckCircle2, UserCircle } from 'lucide-react';
import Link from 'next/link';
import type { ProjectTeamMember } from '@/types/schema';
import { usePermissions } from '@/hooks/usePermissions';

type UnifiedMemberType = 'Internal' | 'External';

interface UnifiedMember {
  id: string;
  email: string;
  displayName: string;
  role: string;
  type: UnifiedMemberType;
  status: 'active' | 'invited' | 'removed' | 'suspended';
  assignedProjects: string[]; // Project IDs for external vendors, or managed projects for Deal Leads
}

export default function TeamDirectoryPage() {
  const { profile } = useAuth();
  const { teamMembers: internalMembers } = useUserStore();
  const { projects, updateProjectTeam } = useProjectStore();

  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const { isLead: isAdmin } = usePermissions();

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
          updateProjectTeam(p.id, updatedTeam);
        }
      });
    } catch (err) {
      console.error("Failed to revoke access:", err);
    } finally {
      setTimeout(() => setRevokingEmail(null), 500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-4 pb-12">
      {/* Floating Atmosphere Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
            <span className="font-label-sm text-xs tracking-[0.2em] text-primary uppercase">
              Authorization Hub
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Team Directory</h1>
          <p className="text-sm text-on-surface-variant">
            Manage your internal team members and external collaborators across all projects.
          </p>
        </div>

        {isAdmin && (
          <Link 
            href="/dashboard/settings/team"
            className="luminous-button px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-label-md text-xs font-bold transition-all duration-300"
          >
            <Users className="w-4 h-4" />
            Manage Internal Seats
          </Link>
        )}
      </header>

      {/* Data Table Container — Institutional Card (16px Radius, glass border) */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-white/5 font-label-sm text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">Member Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Access Level</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {unifiedTeam.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
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

                  // Dynamic color and icon variables
                  const isInternal = member.type === 'Internal';
                  const isSuspended = member.status === 'suspended';
                  const isInvited = member.status === 'invited';

                  return (
                    <tr key={member.email} className="hover:bg-white/[0.02] transition-colors">
                      {/* Identity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border flex-shrink-0 transition-transform group-hover:scale-105 ${
                              isInternal
                                ? 'bg-primary/10 border-primary/20 text-primary shadow-[0_0_10px_rgba(87,241,219,0.15)]'
                                : 'bg-white/5 border-white/10 text-on-surface-variant'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-on-surface block">{member.displayName}</span>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              ID: AUTH-0{member.id.charCodeAt(member.id.length - 1) % 100 || '00'}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Email */}
                      <td className="px-6 py-4 text-on-surface-variant font-mono text-xs">
                        {member.email}
                      </td>
                      
                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                          isInternal ? 'text-primary' : 'text-on-surface-variant'
                        }`}>
                          {isInternal ? (
                            <Shield className="w-3.5 h-3.5 opacity-80" />
                          ) : (
                            <span className="material-symbols-outlined text-[14px]">account_circle</span>
                          )}
                          {member.role}
                        </span>
                      </td>

                      {/* Access Level / Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span 
                            className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full ${
                              isInternal
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-white/5 text-on-surface-variant border-white/10'
                            }`}
                          >
                            {isInternal ? 'Internal Team' : 'External Vendor'}
                          </span>
                          
                          {isInvited && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                              Invited
                            </span>
                          )}
                          {isSuspended && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded-full border border-error/20 uppercase tracking-wider animate-pulse">
                              Suspended
                            </span>
                          )}
                          {!isInvited && !isSuspended && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {member.type === 'External' ? (
                          <button
                            onClick={() => handleRevokeExternalAccess(member.email)}
                            disabled={!isAdmin || revokingEmail === member.email}
                            className="text-[10px] font-bold uppercase tracking-wider text-error hover:underline hover:opacity-90 disabled:opacity-30 disabled:no-underline transition-all"
                          >
                            {revokingEmail === member.email ? 'Revoking...' : 'Revoke'}
                          </button>
                        ) : (
                          <Link
                            href="/dashboard/settings/team"
                            className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary hover:underline transition-colors"
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
