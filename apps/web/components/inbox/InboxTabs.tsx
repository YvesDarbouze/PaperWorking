'use client';

import { INBOX_TABS, type InboxTabId } from '@/lib/dashboard/shell-seed';
import {
  Tray,
  TrendUp,
  CheckSquare,
  Briefcase,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';

function getTabIcon(tabId: InboxTabId) {
  switch (tabId) {
    case 'all':
      return Tray;
    case 'opportunities':
      return TrendUp;
    case 'tasks':
      return CheckSquare;
    case 'vendor':
      return Briefcase;
    case 'team':
      return Users;
    case 'system':
      return WarningCircle;
    default:
      return Tray;
  }
}

export default function InboxTabs({
  activeTab,
  onTabChange,
  unreadCounts,
}: {
  activeTab: InboxTabId;
  onTabChange: (tab: InboxTabId) => void;
  unreadCounts: Record<InboxTabId, number>;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border bg-muted/20 px-4 py-2.5 sm:px-6"
      role="tablist"
      data-testid="inbox-tabs"
    >
      {INBOX_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = unreadCounts[tab.id];
        const Icon = getTabIcon(tab.id);

        return (
          <button
            key={tab.id}
            id={`inbox-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-none border px-3.5 py-2 text-xs font-semibold tracking-wide transition min-h-[44px] ${
              isActive
                ? 'border-border bg-card text-foreground shadow-sm ring-1 ring-foreground/10'
                : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            }`}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            {count > 0 ? (
              <span
                className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-none px-1.5 text-[9px] font-mono font-bold leading-none ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted border border-border text-foreground'
                }`}
              >
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
