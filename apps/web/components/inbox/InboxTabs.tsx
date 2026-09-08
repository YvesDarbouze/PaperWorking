'use client';

import { INBOX_TABS, type InboxTabId } from '@/lib/dashboard/shell-seed';

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
      className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#0d0a0b]/50 px-4 py-3 backdrop-blur-md sm:px-6"
      role="tablist"
      data-testid="inbox-tabs"
    >
      {INBOX_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = unreadCounts[tab.id];

        return (
          <button
            key={tab.id}
            id={`inbox-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-[12px] font-semibold tracking-wide transition-all duration-200 sm:px-4 sm:text-sm ${
              isActive
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_-3px_rgba(16,185,129,0.25)]'
                : 'border-white/5 bg-white/[0.02] text-[#9E9DA0] hover:border-white/10 hover:bg-white/5'
            }`}
          >
            <span
              className={`material-symbols-outlined shrink-0 text-[16px] leading-none ${
                isActive ? 'text-emerald-300' : 'text-[#9E9DA0]'
              }`}
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
            >
              {tab.icon}
            </span>
            <span className={isActive ? 'text-emerald-300' : 'text-[#9E9DA0]'}>{tab.label}</span>
            {count > 0 ? (
              <span
                className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1.5 text-[9px] font-bold leading-none ${
                  isActive ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-[#9E9DA0]'
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
