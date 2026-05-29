'use client';

import React from 'react';
import { Inbox, TrendingUp, CheckSquare, Briefcase, Users, AlertTriangle } from 'lucide-react';
import { InboxTabType } from '@/hooks/useInboxFeed';

/* ═══════════════════════════════════════════════════════
   InboxEmptyState — Contextual empty states per tab
   ═══════════════════════════════════════════════════════ */

interface InboxEmptyStateProps {
  activeTab: InboxTabType;
}

const EMPTY_STATES: Record<
  InboxTabType,
  {
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    title: string;
    description: string;
  }
> = {
  all: {
    Icon: Inbox,
    title: 'Your inbox is clear',
    description: 'New opportunities, tasks, vendor bids, and team updates will appear here.',
  },
  opportunities: {
    Icon: TrendingUp,
    title: 'No active opportunities',
    description: 'Phase transitions, contingency deadlines, and investment invitations will show up here.',
  },
  tasks: {
    Icon: CheckSquare,
    title: 'No pending tasks',
    description: 'Assigned tasks, checklist milestones, and completions will show up here.',
  },
  vendors: {
    Icon: Briefcase,
    title: 'No vendor bids',
    description: 'Vendor quotes, bidding alerts, and lead status notifications will appear here.',
  },
  team: {
    Icon: Users,
    title: 'No team updates',
    description: 'Team invitations and document signatures will appear here.',
  },
  system: {
    Icon: AlertTriangle,
    title: 'No system alerts',
    description: 'Billing statements and general system notifications will appear here.',
  },
};

export default function InboxEmptyState({ activeTab }: InboxEmptyStateProps) {
  const state = EMPTY_STATES[activeTab] || EMPTY_STATES.all;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 bg-[#0b141a]">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-white/5 border border-white/10"
      >
        <state.Icon
          className="w-6 h-6 text-[#bacac5] opacity-50"
        />
      </div>
      <p
        className="text-sm font-semibold mb-1 text-white"
      >
        {state.title}
      </p>
      <p className="text-xs text-center max-w-xs text-[#bacac5]">
        {state.description}
      </p>
    </div>
  );
}

