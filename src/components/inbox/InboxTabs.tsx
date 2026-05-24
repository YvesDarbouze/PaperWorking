'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Inbox,
  MessageSquare,
  UserPlus,
  Bell,
  CheckCircle,
} from 'lucide-react';
import type { InboxItemType, InboxTabCounts } from '@/types/inbox';

/* ═══════════════════════════════════════════════════════
   InboxTabs — Filtered tab bar for the notification center
   
   Tabs: All · Messages · Invitations · System · Action Items
   Each tab displays an unread count badge when > 0.
   ═══════════════════════════════════════════════════════ */

interface InboxTabsProps {
  activeTab: InboxItemType | 'all';
  onTabChange: (tab: InboxItemType | 'all') => void;
  unreadCounts: InboxTabCounts;
}

const TAB_CONFIG: {
  id: InboxItemType | 'all';
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'all',        label: 'All',          Icon: Inbox },
  { id: 'message',    label: 'Messages',     Icon: MessageSquare },
  { id: 'invitation', label: 'Invitations',  Icon: UserPlus },
  { id: 'system',     label: 'System',       Icon: Bell },
  { id: 'action',     label: 'Actions',      Icon: CheckCircle },
];

export default function InboxTabs({ activeTab, onTabChange, unreadCounts }: InboxTabsProps) {
  return (
    <div
      className="flex items-center gap-1 px-6 border-b overflow-x-auto no-scrollbar"
      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-canvas)' }}
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = unreadCounts[tab.id];

        return (
          <button
            key={tab.id}
            id={`inbox-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className="relative flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <tab.Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>

            {/* Unread badge */}
            {count > 0 && (
              <span
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                style={{
                  backgroundColor: isActive ? '#0d0d0d' : 'var(--border-ui)',
                  color: isActive ? '#ffffff' : 'var(--text-primary)',
                  minWidth: 18,
                }}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}

            {/* Active tab indicator bar */}
            {isActive && (
              <motion.div
                layoutId="inbox-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-[2px]"
                style={{ backgroundColor: '#0d0d0d' }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
