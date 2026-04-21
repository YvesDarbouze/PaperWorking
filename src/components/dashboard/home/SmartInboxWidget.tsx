'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import {
  Mail, MessageSquare, ChevronRight, ChevronDown,
  Users, Building2, Landmark, Briefcase, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   SmartInboxWidget — Collapsible Inbox Grouped by Sender Role

   Collapsed: Shows unread counts grouped by sender role
   Expanded:  Full slide-out overlay with message threads
   ═══════════════════════════════════════════════════════════════ */

interface RoleMessageGroup {
  role: string;
  icon: React.ReactNode;
  count: number;
  messages: { id: string; sender: string; preview: string; time: string; read: boolean }[];
}

/**
 * Aggregates simulated message counts from project team members.
 * In production, this would pull from a real messaging/communication store.
 */
function aggregateInboxByRole(projects: Project[]): RoleMessageGroup[] {
  const roleBuckets: Record<string, { count: number; members: Set<string> }> = {};

  projects.forEach(deal => {
    deal.projectTeam?.forEach(member => {
      if (member.status !== 'active') return;
      const role = member.projectRole;
      if (!roleBuckets[role]) {
        roleBuckets[role] = { count: 0, members: new Set() };
      }
      roleBuckets[role].members.add(member.displayName);
      // Simulate unread count based on deal activity
      if (deal.status === 'Under Contract' || deal.status === 'Renovating') {
        roleBuckets[role].count += 1;
      }
    });
  });

  const iconMap: Record<string, React.ReactNode> = {
    'General Contractor':           <Building2 className="w-4 h-4" />,
    'Real Estate Agent':            <Briefcase className="w-4 h-4" />,
    'Title Company/Escrow Officer': <Landmark className="w-4 h-4" />,
    'Loan Officer/Broker':          <Landmark className="w-4 h-4" />,
    'Appraiser':                    <Users className="w-4 h-4" />,
    'Closing Agent':                <Users className="w-4 h-4" />,
  };

  return Object.entries(roleBuckets)
    .filter(([, data]) => data.count > 0)
    .map(([role, data]) => ({
      role,
      icon: iconMap[role] || <Users className="w-4 h-4" />,
      count: data.count,
      messages: Array.from(data.members).map((name, i) => ({
        id: `${role}-${i}`,
        sender: name,
        preview: `Regarding active deal updates — action required`,
        time: 'Today',
        read: false,
      })),
    }))
    .sort((a, b) => b.count - a.count);
}

interface SmartInboxWidgetProps {
  projects: Project[];
}

export default function SmartInboxWidget({ projects }: SmartInboxWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const groups = useMemo(() => aggregateInboxByRole(projects), [projects]);
  const totalUnread = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <>
      {/* ── Collapsed Card ── */}
      <div className="ag-card bg-pw-surface border border-pw-border/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center">
              <Mail className="w-5 h-5 text-pw-muted" />
            </div>
            <div>
              <p className="ag-label opacity-60">Inbox</p>
              <h3 className="text-2xl font-light text-pw-black tracking-tighter">Messages</h3>
            </div>
          </div>
          {totalUnread > 0 && (
            <div className="flex items-center gap-2 bg-pw-black text-pw-white px-4 py-1.5 rounded-full">
              <span className="text-xs font-bold">{totalUnread}</span>
              <span className="text-[9px] uppercase tracking-widest opacity-60">unread</span>
            </div>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="w-8 h-8 mx-auto text-pw-muted opacity-20 mb-3" />
            <p className="text-sm text-pw-muted opacity-40">Inbox clear</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map(group => (
              <div
                key={group.role}
                className="flex items-center justify-between px-4 py-3 rounded-2xl bg-pw-bg/50 border border-pw-border/10 hover:bg-pw-bg transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-pw-muted">{group.icon}</div>
                  <span className="text-sm font-medium text-pw-black tracking-tight">{group.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-pw-black bg-pw-bg px-3 py-1 rounded-full border border-pw-border/30">
                    {group.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-pw-bg text-pw-black text-xs font-bold uppercase tracking-widest hover:bg-pw-black hover:text-pw-white transition-all border border-pw-border/20"
          >
            Expand Inbox
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Expanded Overlay ── */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70]"
              onClick={() => setIsExpanded(false)}
            />
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-pw-surface z-[80] shadow-2xl overflow-y-auto"
            >
              <div className="sticky top-0 bg-pw-surface/95 backdrop-blur-md px-6 py-5 border-b border-pw-border/20 flex items-center justify-between z-10">
                <div>
                  <p className="ag-label opacity-60 mb-1">Inbox</p>
                  <h3 className="text-xl font-light text-pw-black tracking-tighter">All Messages</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center hover:bg-pw-black hover:text-pw-white transition-all text-pw-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {groups.map(group => (
                  <div key={group.role}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-pw-muted">{group.icon}</div>
                      <h4 className="ag-label opacity-80 text-[10px]">{group.role}</h4>
                      <span className="text-[9px] bg-pw-bg px-2 py-0.5 rounded-full text-pw-muted font-bold">{group.count}</span>
                    </div>
                    <div className="space-y-2">
                      {group.messages.map(msg => (
                        <div
                          key={msg.id}
                          className="flex items-start gap-3 px-4 py-4 rounded-2xl bg-pw-bg/30 border border-pw-border/10 hover:bg-pw-bg transition-all cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-pw-black text-pw-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {msg.sender[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-pw-black tracking-tight">{msg.sender}</span>
                              <span className="text-[10px] text-pw-muted opacity-40">{msg.time}</span>
                            </div>
                            <p className="text-xs text-pw-muted truncate">{msg.preview}</p>
                          </div>
                          {!msg.read && (
                            <div className="w-2 h-2 rounded-full bg-pw-black flex-shrink-0 mt-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
