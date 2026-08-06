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
      className="grid grid-cols-3 gap-1.5 px-3 py-3 sm:flex sm:items-center sm:gap-2.5 sm:px-6 border-b border-white/10 sm:overflow-x-auto sm:no-scrollbar bg-[#0d0a0b]/50 backdrop-blur-md shrink-0"
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = unreadCounts[tab.id];

        return (
          <button
            key={tab.id}
            id={`inbox-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            /* `role="tab"` is load-bearing as well as semantic: the global rule
               at globals.css:1275 pins every unqualified `button` to
               `font-size: 0.875rem` and `padding: 12px 28px`, which silently
               overrode the responsive sizing below. The `:not([role="tab"])`
               escape hatch lets these utilities win.

               Mobile is 12px rather than the spec's `text-sm`: at 320px each
               of the three columns is ~94.7px, and "Opportunities" at 14px
               semibold needs ~91px against ~79px of content box — it could
               only fit by truncating. 12px needs ~79px against ~86.7px here,
               so every label renders in full. */
            className={`relative flex min-w-0 items-center justify-center gap-1.5 px-1 py-2 text-[12px] sm:text-base sm:justify-start sm:gap-2 sm:px-4 sm:py-2 lg:px-6 lg:py-2.5 font-semibold tracking-wide transition-all duration-200 rounded-xl sm:whitespace-nowrap border ${
              isActive
                ? 'bg-primary/20 border-primary/30 text-primary luminous-glow shadow-[0_0_15px_-3px_rgba(69,73,85,0.25)]'
                : 'glass-card hover:bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'
            }`}
          >
            <tab.Icon className={`hidden sm:block w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-[#9E9DA0]'}`} />
            <span className={isActive ? 'text-primary' : 'text-[#9E9DA0]'}>{tab.label}</span>

            {/* Unread badge */}
            {count > 0 && (
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-white/10 text-[#9E9DA0]'
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

