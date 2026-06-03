'use client';

import React from 'react';
import {
  Inbox,
  TrendingUp,
  CheckSquare,
  Briefcase,
  Users,
  AlertTriangle,
} from 'lucide-react';
import type { InboxTabType } from '@/context/NotificationContext';

/* ═══════════════════════════════════════════════════════
   InboxTabs — Filtered tab bar for the notification center
   
   Tabs: All · Opportunities · Tasks · Vendor Bids · Team · System
   Each tab displays an unread count badge when > 0.
   ═══════════════════════════════════════════════════════ */

interface InboxTabsProps {
  activeTab: InboxTabType;
  onTabChange: (tab: InboxTabType) => void;
  unreadCounts: Record<InboxTabType, number>;
}

const TAB_CONFIG: {
  id: InboxTabType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'all',           label: 'All',            Icon: Inbox },
  { id: 'opportunities', label: 'Opportunities',  Icon: TrendingUp },
  { id: 'tasks',         label: 'Tasks',          Icon: CheckSquare },
  { id: 'vendors',       label: 'Vendor Bids',    Icon: Briefcase },
  { id: 'team',          label: 'Team',           Icon: Users },
  { id: 'system',        label: 'System',         Icon: AlertTriangle },
];

export default function InboxTabs({ activeTab, onTabChange, unreadCounts }: InboxTabsProps) {
  return (
    <div
      className="flex items-center gap-2.5 px-6 py-3 border-b border-white/10 overflow-x-auto no-scrollbar bg-[#091015]/50 backdrop-blur-md shrink-0"
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = unreadCounts[tab.id];

        return (
          <button
            key={tab.id}
            id={`inbox-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 rounded-xl whitespace-nowrap border ${
              isActive
                ? 'bg-primary/20 border-primary/30 text-primary luminous-glow shadow-[0_0_15px_-3px_rgba(45,212,191,0.25)]'
                : 'glass-card hover:bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'
            }`}
          >
            <tab.Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-[#bacac5]'}`} />
            <span className={isActive ? 'text-primary' : 'text-[#dae4ec]'}>{tab.label}</span>

            {/* Unread badge */}
            {count > 0 && (
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-white/10 text-[#dae4ec]'
                }`}
                style={{
                  minWidth: 16,
                  height: 16,
                }}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

