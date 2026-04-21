'use client';

import React, { useMemo, useState } from 'react';
import { Project } from '@/types/schema';
import { DealFolderIcon } from '../DealFolder';
import {
  CheckCircle2, Circle, Clock, User2,
  AlertTriangle, FileText, Receipt, ClipboardCheck,
  Filter,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   GlobalTodoWidget — Compact To-Do for Dashboard Home Sidebar

   Reuses task aggregation logic from GlobalTodoEngine but with:
   • "My Tasks" vs "Team Tasks" toggle
   • Compact sidebar format with due dates
   ═══════════════════════════════════════════════════════════════ */

type TaskUrgency = 'overdue' | 'action' | 'upcoming';
type OwnerFilter = 'mine' | 'team';

interface TodoTask {
  id: string;
  projectId: string;
  dealAddress: string;
  dealStatus: string;
  label: string;
  category: string;
  urgency: TaskUrgency;
  assignee: string | null;
  dueDate: string | null;
  icon: React.ReactNode;
}

function shortAddress(address: string): string {
  const comma = address.indexOf(',');
  return comma > 0 ? address.slice(0, comma) : address;
}

function resolveAssignee(deal: Project, taskType: string): string | null {
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
      const member = deal.projectTeam.find(
        (m: { projectRole: string; status: string }) => m.projectRole === role && m.status === 'active'
      );
      if (member) return member.displayName;
    }
  }
  if (deal.members) {
    const ownerEntry = Object.values(deal.members).find(m => m.role === 'Lead Investor');
    if (ownerEntry) return 'Lead Investor';
  }
  return null;
}

function aggregateTodos(projects: Project[]): TodoTask[] {
  const tasks: TodoTask[] = [];

  projects.forEach(deal => {
    const addr = shortAddress(deal.address || deal.propertyName);
    const base = { projectId: deal.id, dealAddress: addr, dealStatus: deal.status };

    // Rehab Tasks
    deal.financials?.rehabTasks?.forEach(task => {
      if (task.status === 'Complete') return;
      tasks.push({
        ...base,
        id: `rehab-${deal.id}-${task.id}`,
        label: `${task.title} — ${task.category}`,
        category: 'Rehab',
        urgency: task.status === 'In Progress' ? 'action' : 'upcoming',
        assignee: resolveAssignee(deal, 'rehab'),
        dueDate: null,
        icon: <ClipboardCheck className="w-3.5 h-3.5 text-pw-muted" />,
      });
    });

    // Closing Checklist
    deal.closingChecklist?.forEach(item => {
      if (item.completed) return;
      tasks.push({
        ...base,
        id: `closing-${deal.id}-${item.id}`,
        label: item.type,
        category: 'Closing',
        urgency: deal.status === 'Under Contract' ? 'overdue' : 'action',
        assignee: resolveAssignee(deal, 'closing'),
        dueDate: null,
        icon: <FileText className="w-3.5 h-3.5 text-pw-muted" />,
      });
    });

    // Pending Receipts
    deal.rehab?.pendingReceipts?.forEach(receipt => {
      if (receipt.status !== 'pending') return;
      tasks.push({
        ...base,
        id: `receipt-${deal.id}-${receipt.id}`,
        label: `Review $${receipt.amount.toLocaleString()} — ${receipt.budgetLineItem}`,
        category: 'Triage',
        urgency: 'action',
        assignee: resolveAssignee(deal, 'receipt'),
        dueDate: null,
        icon: <Receipt className="w-3.5 h-3.5 text-pw-muted" />,
      });
    });

    // Unverified Docs
    deal.roleLinkedDocuments?.forEach(doc => {
      if (doc.verified) return;
      tasks.push({
        ...base,
        id: `doc-${deal.id}-${doc.id}`,
        label: `Verify ${doc.category}`,
        category: 'Documents',
        urgency: 'action',
        assignee: resolveAssignee(deal, 'document'),
        dueDate: null,
        icon: <FileText className="w-3.5 h-3.5 text-pw-muted" />,
      });
    });

    // Active Offers
    deal.prospects?.forEach(prospect => {
      if (prospect.status !== 'Offer Sent') return;
      prospect.offerLetters?.forEach(letter => {
        if (letter.status !== 'Sent') return;
        const isExpired = new Date(letter.expiresDate) < new Date();
        tasks.push({
          ...base,
          id: `offer-${deal.id}-${letter.id}`,
          label: `Follow up: $${letter.offerAmount.toLocaleString()} → ${letter.recipientName}`,
          category: 'Offers',
          urgency: isExpired ? 'overdue' : 'upcoming',
          assignee: resolveAssignee(deal, 'offer'),
          dueDate: new Date(letter.expiresDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          icon: <AlertTriangle className="w-3.5 h-3.5 text-pw-muted" />,
        });
      });
    });
  });

  const urgencyOrder: Record<TaskUrgency, number> = { overdue: 0, action: 1, upcoming: 2 };
  tasks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  return tasks;
}

const URGENCY_DOT: Record<TaskUrgency, string> = {
  overdue:  'bg-pw-black',
  action:   'bg-pw-muted',
  upcoming: 'bg-pw-border',
};

interface GlobalTodoWidgetProps {
  projects: Project[];
  onNavigateToDeal: (projectId: string) => void;
}

export default function GlobalTodoWidget({ projects, onNavigateToDeal }: GlobalTodoWidgetProps) {
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('mine');
  const tasks = useMemo(() => aggregateTodos(projects), [projects]);

  // "Mine" = tasks with assignee being Lead Investor, "Team" = all
  const filtered = useMemo(() => {
    if (ownerFilter === 'mine') {
      return tasks.filter(t => t.assignee === 'Lead Investor' || !t.assignee);
    }
    return tasks;
  }, [tasks, ownerFilter]);

  return (
    <div className="ag-card bg-pw-surface border border-pw-border/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-pw-muted" />
          </div>
          <div>
            <p className="ag-label opacity-60">Tasks</p>
            <h3 className="text-2xl font-light text-pw-black tracking-tighter">To-Do</h3>
          </div>
        </div>
        <div className="bg-pw-bg px-3 py-1.5 rounded-full border border-pw-border/30">
          <span className="text-[10px] font-bold text-pw-black tracking-widest uppercase">
            {filtered.length} items
          </span>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'mine' as OwnerFilter, label: 'My Tasks' },
          { key: 'team' as OwnerFilter, label: 'Team Tasks' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setOwnerFilter(tab.key)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-all duration-300 ${
              ownerFilter === tab.key
                ? 'bg-pw-black text-pw-white border-pw-black'
                : 'bg-pw-bg text-pw-muted border-pw-border/30 hover:border-pw-black hover:text-pw-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto max-h-[400px] space-y-1.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-pw-muted opacity-30">
            <Circle className="w-10 h-10 mb-3 stroke-1" />
            <p className="text-xs font-medium">All clear</p>
          </div>
        ) : (
          filtered.slice(0, 12).map(task => (
            <button
              key={task.id}
              onClick={() => onNavigateToDeal(task.projectId)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-xl hover:bg-pw-bg/60 transition-all duration-200 group border border-transparent hover:border-pw-border/10"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${URGENCY_DOT[task.urgency]}`} />
              <div className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <DealFolderIcon status={task.dealStatus} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-pw-black tracking-tight truncate">{task.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-pw-muted opacity-50 truncate">{task.dealAddress}</span>
                  {task.assignee && (
                    <span className="flex items-center gap-1 text-[10px] text-pw-muted opacity-30">
                      <User2 className="w-2.5 h-2.5" /> {task.assignee}
                    </span>
                  )}
                </div>
              </div>
              {task.dueDate && (
                <span className="text-[10px] text-pw-muted opacity-40 flex-shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {task.dueDate}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
