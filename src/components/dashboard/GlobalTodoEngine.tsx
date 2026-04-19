'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { DealFolderIcon } from './DealFolder';
import {
  CheckCircle2, Circle, Clock, AlertTriangle,
  FileText, Receipt, ClipboardCheck, User2,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   GlobalTodoEngine — Unified Cross-Deal Task Aggregator

   Scans every active deal and rolls up actionable items into a
   single prioritized list. Each row attributes the responsible
   team member based on deal role assignments.

   Data Sources:
     • rehabTasks (Pending/In Progress)
     • closingChecklist (incomplete items)
     • rehab.pendingReceipts (pending review)
     • roleLinkedDocuments (unverified)
     • prospects with active offers
   ═══════════════════════════════════════════════════════════════ */

type TaskUrgency = 'overdue' | 'action' | 'upcoming';
type FilterTab = 'all' | 'overdue' | 'action';

interface AggregatedTask {
  id: string;
  projectId: string;
  dealAddress: string;
  dealStatus: string;
  label: string;
  category: string;
  urgency: TaskUrgency;
  assignee: string | null;
  icon: React.ReactNode;
}

/**
 * Extracts the street portion of an address for compact display.
 */
function shortAddress(address: string): string {
  const comma = address.indexOf(',');
  return comma > 0 ? address.slice(0, comma) : address;
}

/**
 * Resolves the most relevant team member name for a given task type.
 */
function resolveAssignee(deal: Project, taskType: string): string | null {
  // Check deal team first
  if (deal.projectTeam?.length) {
    const roleMap: Record<string, string[]> = {
      'rehab':     ['General Contractor'],
      'receipt':   ['General Contractor'],
      'closing':   ['Closing Agent', 'Title Company/Escrow Officer'],
      'document':  ['Loan Officer/Broker', 'Appraiser', 'Title Company/Escrow Officer'],
      'offer':     ['Real Estate Agent'],
    };
    const targetRoles = roleMap[taskType] || [];
    for (const role of targetRoles) {
      const member = deal.projectTeam.find((m: { projectRole: string; status: string; displayName: string }) => m.projectRole === role && m.status === 'active');
      if (member) return member.displayName;
    }
  }
  // Fallback to deal owner via members map
  if (deal.members) {
    const ownerEntry = Object.values(deal.members).find(m => m.role === 'Lead Investor');
    if (ownerEntry) return 'Lead Investor';
  }
  return null;
}

/**
 * Core aggregation: scan all projects and emit tasks.
 */
function aggregateTasks(projects: Project[]): AggregatedTask[] {
  const tasks: AggregatedTask[] = [];

  projects.forEach(deal => {
    const addr = shortAddress(deal.address || deal.propertyName);
    const base = { projectId: deal.id, dealAddress: addr, dealStatus: deal.status };

    // ── Rehab Tasks (Pending / In Progress) ──
    deal.financials?.rehabTasks?.forEach(task => {
      if (task.status === 'Complete') return;
      tasks.push({
        ...base,
        id: `rehab-${deal.id}-${task.id}`,
        label: `${task.title} — ${task.category}`,
        category: 'Rehab',
        urgency: task.status === 'In Progress' ? 'action' : 'upcoming',
        assignee: resolveAssignee(deal, 'rehab'),
        icon: <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />,
      });
    });

    // ── Closing Checklist (incomplete) ──
    deal.closingChecklist?.forEach(item => {
      if (item.completed) return;
      tasks.push({
        ...base,
        id: `closing-${deal.id}-${item.id}`,
        label: `${item.type}`,
        category: 'Closing',
        urgency: deal.status === 'Under Contract' ? 'overdue' : 'action',
        assignee: resolveAssignee(deal, 'closing'),
        icon: <FileText className="w-3.5 h-3.5 text-red-500" />,
      });
    });

    // ── Pending Receipts (triage queue) ──
    deal.rehab?.pendingReceipts?.forEach(receipt => {
      if (receipt.status !== 'pending') return;
      tasks.push({
        ...base,
        id: `receipt-${deal.id}-${receipt.id}`,
        label: `Review $${receipt.amount.toLocaleString()} receipt — ${receipt.budgetLineItem}`,
        category: 'Triage',
        urgency: 'action',
        assignee: resolveAssignee(deal, 'receipt'),
        icon: <Receipt className="w-3.5 h-3.5 text-orange-500" />,
      });
    });

    // ── Unverified Documents ──
    deal.roleLinkedDocuments?.forEach(doc => {
      if (doc.verified) return;
      tasks.push({
        ...base,
        id: `doc-${deal.id}-${doc.id}`,
        label: `Verify ${doc.category} — ${doc.fileName}`,
        category: 'Documents',
        urgency: 'action',
        assignee: resolveAssignee(deal, 'document'),
        icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
      });
    });

    // ── Active Offers (follow-up needed) ──
    deal.prospects?.forEach(prospect => {
      if (prospect.status !== 'Offer Sent') return;
      prospect.offerLetters?.forEach(letter => {
        if (letter.status !== 'Sent') return;
        const isExpired = new Date(letter.expiresDate) < new Date();
        tasks.push({
          ...base,
          id: `offer-${deal.id}-${letter.id}`,
          label: `Follow up: $${letter.offerAmount.toLocaleString()} offer to ${letter.recipientName}`,
          category: 'Offers',
          urgency: isExpired ? 'overdue' : 'upcoming',
          assignee: resolveAssignee(deal, 'offer'),
          icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />,
        });
      });
    });
  });

  // Sort: overdue first, then action, then upcoming
  const urgencyOrder: Record<TaskUrgency, number> = { overdue: 0, action: 1, upcoming: 2 };
  tasks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return tasks;
}

/* ─── Urgency badge style ─── */
const URGENCY_STYLE: Record<TaskUrgency, string> = {
  overdue:  'bg-pw-black text-white shadow-sm',
  action:   'bg-pw-bg text-pw-black border border-pw-border/50 shadow-sm',
  upcoming: 'bg-pw-bg text-pw-muted border border-pw-border/20',
};

const URGENCY_LABEL: Record<TaskUrgency, string> = {
  overdue:  'Urgent',
  action:   'Ready',
  upcoming: 'Queued',
};

interface GlobalTodoEngineProps {
  projects: Project[];
  onNavigateToDeal: (projectId: string) => void;
}

export default function GlobalTodoEngine({ projects, onNavigateToDeal }: GlobalTodoEngineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const tasks = useMemo(() => aggregateTasks(projects), [projects]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter(t => t.urgency === activeFilter);
  }, [tasks, activeFilter]);

  const overdueCt = tasks.filter(t => t.urgency === 'overdue').length;
  const actionCt = tasks.filter(t => t.urgency === 'action').length;

  return (
    <div className="ag-card bg-pw-surface shadow-[0_30px_60px_rgba(0,0,0,0.02)] border border-pw-border/10 flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="px-8 py-10 flex items-center justify-between border-b border-pw-border/10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-pw-black" />
              <p className="ag-label opacity-60">Task Rollup</p>
            </div>
            <h3 className="text-3xl font-light text-pw-black tracking-tighter">Action Engine</h3>
          </div>
          <div className="bg-pw-bg px-4 py-2 rounded-full border border-pw-border/50">
            <span className="text-[10px] font-bold text-pw-black tracking-widest uppercase">
              {tasks.length} Active Nodes
            </span>
          </div>
      </div>

      <div className="px-8 py-6">
        {/* Filter tabs */}
        <div className="flex gap-3">
          {[
            { key: 'all' as FilterTab, label: 'Full Stream', count: tasks.length },
            { key: 'overdue' as FilterTab, label: 'Urgent', count: overdueCt },
            { key: 'action' as FilterTab, label: 'Pending', count: actionCt },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-all duration-300 ${
                activeFilter === tab.key
                  ? 'bg-pw-black text-pw-white border-pw-black shadow-lg shadow-pw-black/10'
                  : 'bg-pw-bg text-pw-muted border-pw-border/30 hover:border-pw-black hover:text-pw-black'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 font-medium opacity-60 ${
                  activeFilter === tab.key ? 'text-pw-white' : 'text-pw-black'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-pw-muted opacity-40">
            <Circle className="w-12 h-12 mb-4 stroke-[1px]" />
            <p className="text-sm font-medium">All tasks verified.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => (
              <button
                key={task.id}
                onClick={() => onNavigateToDeal(task.projectId)}
                className="w-full flex items-center gap-6 px-4 py-6 text-left rounded-2xl hover:bg-pw-bg/50 transition-all duration-300 group border border-transparent hover:border-pw-border/10"
              >
                {/* Folder icon */}
                <div className="shrink-0 transition-transform group-hover:scale-110 duration-500">
                  <DealFolderIcon status={task.dealStatus} size={22} />
                </div>

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-pw-black tracking-tight group-hover:text-black transition-colors">
                    {task.label}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-pw-muted font-normal truncate opacity-60">
                      {task.dealAddress}
                    </span>
                    {task.assignee && (
                      <span className="flex items-center gap-1.5 text-xs text-pw-muted font-medium opacity-40 bg-pw-bg px-2 py-0.5 rounded-full">
                        <User2 className="w-3 h-3" />
                        {task.assignee}
                      </span>
                    )}
                  </div>
                </div>

                {/* Urgency badge */}
                <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex-shrink-0 transition-all ${URGENCY_STYLE[task.urgency]}`}>
                  {URGENCY_LABEL[task.urgency]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
