'use client';

import React, { useMemo, useState } from 'react';
import { PropertyDeal } from '@/types/schema';
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
  dealId: string;
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
function resolveAssignee(deal: PropertyDeal, taskType: string): string | null {
  // Check deal team first
  if (deal.dealTeam?.length) {
    const roleMap: Record<string, string[]> = {
      'rehab':     ['General Contractor'],
      'receipt':   ['General Contractor'],
      'closing':   ['Closing Agent', 'Title Company/Escrow Officer'],
      'document':  ['Loan Officer/Broker', 'Appraiser', 'Title Company/Escrow Officer'],
      'offer':     ['Real Estate Agent'],
    };
    const targetRoles = roleMap[taskType] || [];
    for (const role of targetRoles) {
      const member = deal.dealTeam.find(m => m.dealRole === role && m.status === 'active');
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
 * Core aggregation: scan all deals and emit tasks.
 */
function aggregateTasks(deals: PropertyDeal[]): AggregatedTask[] {
  const tasks: AggregatedTask[] = [];

  deals.forEach(deal => {
    const addr = shortAddress(deal.address || deal.propertyName);
    const base = { dealId: deal.id, dealAddress: addr, dealStatus: deal.status };

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

/* ─── Urgency badge colors ─── */
const URGENCY_STYLE: Record<TaskUrgency, string> = {
  overdue:  'bg-red-50 text-red-700 border-red-200',
  action:   'bg-amber-50 text-amber-700 border-amber-200',
  upcoming: 'bg-gray-50 text-gray-600 border-gray-200',
};

const URGENCY_LABEL: Record<TaskUrgency, string> = {
  overdue:  'Overdue',
  action:   'Action Needed',
  upcoming: 'Upcoming',
};

interface GlobalTodoEngineProps {
  deals: PropertyDeal[];
  onNavigateToDeal: (dealId: string) => void;
}

export default function GlobalTodoEngine({ deals, onNavigateToDeal }: GlobalTodoEngineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const tasks = useMemo(() => aggregateTasks(deals), [deals]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter(t => t.urgency === activeFilter);
  }, [tasks, activeFilter]);

  const overdueCt = tasks.filter(t => t.urgency === 'overdue').length;
  const actionCt = tasks.filter(t => t.urgency === 'action').length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Global To-Do Engine
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {[
            { key: 'all' as FilterTab, label: 'All', count: tasks.length },
            { key: 'overdue' as FilterTab, label: 'Overdue', count: overdueCt },
            { key: 'action' as FilterTab, label: 'Action', count: actionCt },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md border transition-all ${
                activeFilter === tab.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === tab.key ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto max-h-[320px] divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Circle className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-xs">No tasks in this category</p>
          </div>
        ) : (
          filtered.map(task => (
            <button
              key={task.id}
              onClick={() => onNavigateToDeal(task.dealId)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50/80 transition-colors group"
            >
              {/* Folder icon */}
              <DealFolderIcon status={task.dealStatus} size={18} />

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate group-hover:text-black">
                  {task.label}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 truncate">
                    {task.dealAddress}
                  </span>
                  {task.assignee && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <User2 className="w-2.5 h-2.5" />
                      {task.assignee}
                    </span>
                  )}
                </div>
              </div>

              {/* Urgency badge */}
              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded border flex-shrink-0 ${URGENCY_STYLE[task.urgency]}`}>
                {URGENCY_LABEL[task.urgency]}
              </span>

              {/* Category pill */}
              <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded hidden sm:inline-block flex-shrink-0">
                {task.category}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
