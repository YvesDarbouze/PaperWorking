'use client';

import React from 'react';
import { Inbox, MessageSquare, UserPlus, Bell, CheckCircle } from 'lucide-react';
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
    description: 'New messages, invitations, and notifications will appear here',
  },
  message: {
    Icon: MessageSquare,
    title: 'No messages yet',
    description: 'Email threads and internal comments from your projects will show up here',
  },
  invitation: {
    Icon: UserPlus,
    title: 'No pending invitations',
    description: 'Team invitations and investment proposals will appear here when received',
  },
  system: {
    Icon: Bell,
    title: 'No system notifications',
    description: 'Phase transitions, deadline alerts, and system events will be logged here',
  },
  action: {
    Icon: CheckCircle,
    title: 'No action items',
    description: 'Tasks, receipt approvals, and items requiring your attention will appear here',
  },
};

export default function InboxEmptyState({ activeTab }: InboxEmptyStateProps) {
  const state = EMPTY_STATES[activeTab] || EMPTY_STATES.all;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-8">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-ui)',
        }}
      >
        <state.Icon
          className="w-6 h-6"
          style={{ color: 'var(--text-secondary)', opacity: 0.4 }}
        />
      </div>
      <p
        className="text-sm font-semibold mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {state.title}
      </p>
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        {state.description}
      </p>
    </div>
  );
}
