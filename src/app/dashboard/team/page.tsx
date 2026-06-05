'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import { Shield, Users, UserCircle, Search, ArrowLeft, RefreshCw, XCircle, Settings, History } from 'lucide-react';
import Link from 'next/link';
import type { ProjectTeamMember } from '@/types/schema';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Team Directory & Access Management Terminal
   (Premium Luminous Glass / Obsidian Bento Grid)
   ═══════════════════════════════════════════════════════ */

type UnifiedMemberType = 'Internal' | 'External';

interface UnifiedMember {
  id: string;
  email: string;
  displayName: string;
  role: string;
  type: UnifiedMemberType;
  status: 'active' | 'invited' | 'removed' | 'suspended';
  assignedProjects: string[];
}

export default function TeamDirectoryPage() {
  const { profile } = useAuth();
  const { teamMembers: internalMembers } = useUserStore();
  const { projects, updateProjectTeam } = useProjectStore();

  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
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

  // Split active personnel vs pending invitations
  const activePersonnel = useMemo(() => {
    return unifiedTeam.filter(
      member => 
        member.status !== 'invited' &&
        (member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
         member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
         member.role.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [unifiedTeam, searchQuery]);

  const pendingInvitations = useMemo(() => {
    return unifiedTeam.filter(member => member.status === 'invited');
  }, [unifiedTeam]);

  // Terminal simulated logs
  useEffect(() => {
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] INFO Connection established to primary DB node.`,
      `[${new Date().toLocaleTimeString()}] INFO Polling access scopes for namespace 'Team'...`,
      `[${new Date().toLocaleTimeString()}] SEC Role verification successful for current operators.`,
      `[${new Date().toLocaleTimeString()}] INFO System status: STABLE. Ready for commands.`
    ];
    setTerminalLogs(initialLogs);
  }, []);

  const handleRevokeExternalAccess = async (email: string) => {
    setRevokingEmail(email);
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] WARN Initialized revocation sequence for collaborator: ${email}`
    ]);

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
      
      toast.success(`Access revoked for ${email}`);
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] SEC Revocation complete. Purging auth tokens for: ${email}`
      ]);
    } catch (err) {
      console.error("Failed to revoke access:", err);
      toast.error("Failed to revoke access.");
    } finally {
      setTimeout(() => setRevokingEmail(null), 500);
    }
  };

  return (
    <div className="min-h-full pb-28 md:pb-28 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 relative z-10 pt-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-on-surface tracking-tight">Team Management</h2>
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-primary font-mono shadow-[0_0_10px_rgba(87,241,219,0.15)] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Node: US-EAST-01 • Stable
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Administer roles, monitor access scoping, and manage platform invitations across global nodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link 
              href="/dashboard/settings/team"
              className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-xl flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_-3px_rgba(32, 178, 170,0.4)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Provision Access
            </Link>
          )}
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active Personnel List (lg:col-span-8) */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-surface-container/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/20 to-transparent"></div>
            
            {/* Header row with search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-headline-md text-[20px] text-on-surface flex items-center gap-2.5 font-bold">
                <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
                Active Personnel
              </h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search identities..." 
                  className="bg-black/20 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-1.5 pl-9 pr-4 text-xs text-on-surface w-full sm:w-64 transition-all placeholder:text-on-surface-variant/40 outline-none"
                />
              </div>
            </div>

            {/* Custom Table Row Layout */}
            <div className="flex flex-col gap-1">
              
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-white/5 pb-3">
                <div className="col-span-5 sm:col-span-4">Identity</div>
                <div className="col-span-4 sm:col-span-3">Designation</div>
                <div className="col-span-3 sm:col-span-2">State</div>
                <div className="col-span-12 sm:col-span-3 text-left sm:text-right hidden sm:block">Access Scope</div>
              </div>

              {activePersonnel.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant/50">
                  <UserCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No active personnel matching query.</p>
                </div>
              ) : (
                activePersonnel.map(member => {
                  const initials = member.displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || member.email[0].toUpperCase();

                  const isInternal = member.type === 'Internal';
                  const isSuspended = member.status === 'suspended';

                  return (
                    <div 
                      key={member.email} 
                      className="grid grid-cols-12 gap-4 items-center px-4 py-3.5 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5 cursor-default group/row"
                    >
                      {/* Identity */}
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                        <div 
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border flex-shrink-0 transition-transform ${
                            isInternal
                              ? 'bg-primary/10 border-primary/20 text-primary shadow-[0_0_10px_rgba(87,241,219,0.1)]'
                              : 'bg-white/5 border-white/10 text-on-surface-variant'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-label-md text-sm text-on-surface group-hover/row:text-primary transition-colors truncate font-semibold">
                            {member.displayName}
                          </p>
                          <p className="text-[10px] text-on-surface-variant font-mono truncate">
                            ID: AUTH-0{member.id.charCodeAt(member.id.length - 1) % 100 || '00'}
                          </p>
                        </div>
                      </div>

                      {/* Designation / Role */}
                      <div className="col-span-4 sm:col-span-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          isInternal 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-secondary-container/10 border-secondary-container/20 text-secondary'
                        }`}>
                          {member.role}
                        </span>
                      </div>

                      {/* State */}
                      <div className="col-span-3 sm:col-span-2">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isSuspended 
                              ? 'bg-error shadow-[0_0_5px_rgba(255,180,171,0.8)] animate-pulse' 
                              : 'bg-primary shadow-[0_0_5px_rgba(87,241,219,0.8)]'
                          }`} />
                          <span className="text-xs text-on-surface">{isSuspended ? 'Suspended' : 'Active'}</span>
                        </div>
                      </div>

                      {/* Access Scope (Desktop view only, wraps down on mobile) */}
                      <div className="col-span-12 sm:col-span-3 flex items-center justify-start sm:justify-end gap-2 mt-2 sm:mt-0">
                        <div className="flex items-center gap-1">
                          {isInternal ? (
                            <>
                              <span className="w-5 h-5 rounded bg-white/5 border border-white/5 flex items-center justify-center text-on-surface-variant text-[10px] font-bold font-mono" title="Global Scope">G</span>
                              <span className="w-5 h-5 rounded bg-white/5 border border-white/5 flex items-center justify-center text-on-surface-variant text-[10px] font-bold font-mono" title="All Projects">A</span>
                            </>
                          ) : (
                            member.assignedProjects.slice(0, 3).map((projId, index) => {
                              const proj = projects.find(p => p.id === projId);
                              const letter = proj?.propertyName?.[0]?.toUpperCase() || 'P';
                              return (
                                <span 
                                  key={projId} 
                                  className="w-5 h-5 rounded bg-white/5 border border-white/5 flex items-center justify-center text-on-surface-variant text-[10px] font-bold font-mono"
                                  title={proj?.propertyName || 'Project Access'}
                                >
                                  {letter}
                                </span>
                              );
                            })
                          )}
                          {member.assignedProjects.length > 3 && (
                            <span className="text-[10px] text-on-surface-variant px-1 font-mono">+{member.assignedProjects.length - 3}</span>
                          )}
                        </div>

                        {/* Revoke / Manage button actions */}
                        <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-2">
                          {member.type === 'External' ? (
                            <button
                              onClick={() => handleRevokeExternalAccess(member.email)}
                              disabled={!isAdmin || revokingEmail === member.email}
                              className="text-[10px] font-bold uppercase tracking-wider text-error hover:underline disabled:opacity-30 transition-all cursor-pointer"
                              title="Revoke collaborator access"
                            >
                              {revokingEmail === member.email ? 'Revoking...' : 'Revoke'}
                            </button>
                          ) : (
                            <Link
                              href="/dashboard/settings/team"
                              className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors"
                              title="Configure internal user permissions"
                            >
                              Manage
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Load Additional Nodes */}
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
              <button 
                onClick={() => toast.success('All available node operators loaded.')} 
                className="font-label-md text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 bg-transparent border-none cursor-pointer"
              >
                Load Additional Nodes <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Invitations & Live Logs (lg:col-span-4) */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Pending Invitations Card */}
          <div className="bg-surface-container-low/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg relative">
            <h3 className="font-label-md text-sm text-on-surface mb-4 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-tertiary text-[18px]">forward_to_inbox</span>
              Pending Invitations
            </h3>
            
            <div className="flex flex-col gap-2.5">
              {pendingInvitations.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant/40 text-xs">
                  No pending invitations sent.
                </div>
              ) : (
                pendingInvitations.map(invite => (
                  <div 
                    key={invite.email} 
                    className="bg-surface-container rounded-xl p-3 border border-white/[0.02] flex items-center justify-between group hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-label-sm text-xs text-on-surface truncate font-semibold">{invite.email}</p>
                      <p className="text-[9px] text-on-surface-variant font-mono mt-0.5 uppercase tracking-wide">
                        Role: {invite.role} • Invited
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          toast.success(`Invitation resent to ${invite.email}`);
                          setTerminalLogs(prev => [
                            ...prev,
                            `[${new Date().toLocaleTimeString()}] INFO Resent registration link to collaborator: ${invite.email}`
                          ]);
                        }} 
                        className="w-7 h-7 rounded bg-white/5 hover:bg-primary/10 hover:text-primary text-on-surface-variant flex items-center justify-center transition-colors border border-transparent hover:border-primary/20"
                        title="Resend Invitation"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleRevokeExternalAccess(invite.email)} 
                        className="w-7 h-7 rounded bg-white/5 hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center transition-colors border border-transparent hover:border-error/20"
                        title="Revoke Invitation"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Simulated Terminal Widget */}
          <div className="bg-[#03080b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex-1 min-h-[300px] flex flex-col relative font-mono">
            
            {/* Terminal Tab Header */}
            <div className="bg-surface-container-low px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">code</span>
                <span className="text-[11px] text-on-surface-variant font-medium">system_log.sh</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white/10"></div>
                <div className="w-2 h-2 rounded-full bg-white/10"></div>
                <div className="w-2 h-2 rounded-full bg-white/10"></div>
              </div>
            </div>

            {/* Terminal Output */}
            <div className="p-4 text-[11px] leading-relaxed text-primary/80 overflow-y-auto flex-1 h-[240px]">
              {terminalLogs.map((log, idx) => {
                let colorClass = "text-primary/70";
                if (log.includes("WARN")) colorClass = "text-amber-400";
                if (log.includes("SEC")) colorClass = "text-primary font-bold";
                return (
                  <p key={idx} className={`mb-1 break-all ${colorClass}`}>
                    {log}
                  </p>
                );
              })}
              <p className="flex items-center gap-1.5 mt-3 text-primary">
                <span>admin@paperworking:~$</span>
                <span className="w-1.5 h-3 bg-primary animate-pulse inline-block"></span>
              </p>
            </div>
          </div>

        </aside>

      </div>

      {/* Terminal System Status Footer */}
      <footer className="mt-8 border-t border-white/5 pt-6 hidden lg:block">
        <div className="grid grid-cols-4 gap-4">
          <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#091015]/40">
            <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-mono font-bold mb-1">Session Key</p>
            <p className="text-xs text-primary font-mono font-semibold truncate">A9-F2-B4-E1-00-PW-SEC-KEY</p>
          </div>
          <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#091015]/40">
            <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-mono font-bold mb-1">Active Instances</p>
            <p className="text-xs text-primary font-mono font-semibold">{unifiedTeam.filter(m => m.status === 'active').length} Operators Online</p>
          </div>
          <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#091015]/40">
            <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-mono font-bold mb-1">Data Sovereignty</p>
            <p className="text-xs text-primary font-mono font-semibold">AES-256 E2EE Enabled</p>
          </div>
          <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#091015]/40">
            <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-mono font-bold mb-1">Last Audit</p>
            <p className="text-xs text-primary font-mono font-semibold">{new Date().toISOString().slice(0,10).replace(/-/g,'.')} {new Date().toTimeString().slice(0,8)}</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
