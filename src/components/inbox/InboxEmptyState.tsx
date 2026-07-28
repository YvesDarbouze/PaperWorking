'use client';

import React from 'react';
import { Inbox, TrendingUp, CheckSquare, Briefcase, Users, AlertTriangle } from 'lucide-react';
import { InboxTabType } from '@/hooks/useInboxFeed';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { inboxTokens } from './inboxTheme';

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
    title: 'Inbox is clear',
    description: 'New opportunities, tasks, vendor bids, and team updates will appear here.',
  },
  opportunities: {
    Icon: TrendingUp,
    title: 'No opportunities',
    description: 'Phase transitions, deadlines, and investment invitations show up here.',
  },
  tasks: {
    Icon: CheckSquare,
    title: 'No pending tasks',
    description: 'Assigned tasks, checklist milestones, and completions show up here.',
  },
  vendors: {
    Icon: Briefcase,
    title: 'No vendor items',
    description: 'Vendor quotes, bidding alerts, and lead updates appear here.',
  },
  team: {
    Icon: Users,
    title: 'No team updates',
    description: 'Team invitations and document signatures appear here.',
  },
  system: {
    Icon: AlertTriangle,
    title: 'No system alerts',
    description: 'Billing and system notifications appear here.',
  },
};

export default function InboxEmptyState({ activeTab }: InboxEmptyStateProps) {
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');
  const state = EMPTY_STATES[activeTab] || EMPTY_STATES.all;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-8">
      <div
        className="w-12 h-12 flex items-center justify-center mb-4"
        style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 2 }}
      >
        <state.Icon className="w-5 h-5" style={{ color: t.muted }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: t.heading }}>
        {state.title}
      </p>
      <p className="text-xs text-center max-w-[260px] leading-relaxed" style={{ color: t.muted }}>
        {state.description}
      </p>
    </div>
  );
}
