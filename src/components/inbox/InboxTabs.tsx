'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Inbox,
  TrendingUp,
  CheckSquare,
  Briefcase,
  Users,
  AlertTriangle,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { InboxTabType } from '@/context/NotificationContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { inboxTokens } from './inboxTheme';

/* ═══════════════════════════════════════════════════════
   InboxTabs — Horizontal filters + sliders dropdown

   Built-in categories render first. Pass `extraTabs` to
   append user-added views at the bottom of the menu.
   ═══════════════════════════════════════════════════════ */

export interface InboxTabItem {
  id: InboxTabType | string;
  label: string;
  Icon: LucideIcon;
}

interface InboxTabsProps {
  activeTab: InboxTabType | string;
  onTabChange: (tab: InboxTabType | string) => void;
  unreadCounts: Record<string, number>;
  /** Extra categories appended under the built-in list */
  extraTabs?: InboxTabItem[];
}

/** Built-in filters — keep order stable; extras append after these. */
export const INBOX_TAB_CONFIG: InboxTabItem[] = [
  { id: 'all',           label: 'All',            Icon: Inbox },
  { id: 'opportunities', label: 'Opportunities',  Icon: TrendingUp },
  { id: 'tasks',         label: 'Tasks',          Icon: CheckSquare },
  { id: 'vendors',       label: 'Vendors',        Icon: Briefcase },
  { id: 'team',          label: 'Team',           Icon: Users },
  { id: 'system',        label: 'System',         Icon: AlertTriangle },
];

export default function InboxTabs({
  activeTab,
  onTabChange,
  unreadCounts,
  extraTabs = [],
}: InboxTabsProps) {
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const tabs = [...INBOX_TAB_CONFIG, ...extraTabs];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectTab = (id: InboxTabType | string) => {
    onTabChange(id);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="relative flex items-stretch gap-1 px-2 shrink-0"
      style={{ borderBottom: `1px solid ${t.border}` }}
    >
      {/* Sliders filter — white pill trigger, borderless menu */}
      <div className="relative flex items-center self-center px-1 shrink-0">
        <button
          type="button"
          id="inbox-filter-trigger"
          className="pw-interactive-custom flex items-center justify-center shrink-0 transition-opacity hover:opacity-90"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 36,
            height: 28,
            padding: 0,
            color: '#14161C',
            background: '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,22,28,0.12)'}`,
            borderRadius: 999,
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(20,22,28,0.08)',
            cursor: 'pointer',
            lineHeight: 1,
          }}
          aria-label="Filter inbox"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <SlidersHorizontal size={16} strokeWidth={2} absoluteStrokeWidth style={{ color: '#14161C' }} />
        </button>

        {open && (
          <div
            id="inbox-filter-menu"
            role="listbox"
            aria-labelledby="inbox-filter-trigger"
            className="absolute left-0 top-full mt-2 z-50 py-1.5 min-w-[220px] overflow-hidden"
            style={{
              background: isDark ? '#1C1C1E' : '#FFFFFF',
              border: 'none',
              outline: 'none',
              borderRadius: 12,
              boxShadow: isDark
                ? '0 12px 40px rgba(0,0,0,0.55)'
                : '0 12px 32px rgba(20,22,28,0.14)',
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = unreadCounts[tab.id] ?? 0;
              const Icon = tab.Icon;
              const rowHover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(20,22,28,0.05)';
              const rowActive = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(20,22,28,0.07)';

              return (
                <button
                  key={`menu-${tab.id}`}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  className="pw-interactive-custom w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  onClick={() => selectTab(tab.id)}
                  style={{
                    color: isDark ? '#FFFFFF' : t.heading,
                    background: isActive ? rowActive : 'transparent',
                    border: 'none',
                    outline: 'none',
                    borderRadius: 0,
                    boxShadow: 'none',
                    padding: '12px 16px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = rowHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActive ? rowActive : 'transparent';
                  }}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
                  <span className="flex-1 text-[14px] font-medium truncate">{tab.label}</span>
                  {count > 0 && (
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: isDark ? 'rgba(255,255,255,0.45)' : t.muted }}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Horizontal tabs — same 6 categories */}
      <div
        className="flex items-stretch flex-1 min-w-0 overflow-x-auto no-scrollbar"
        role="tablist"
        aria-label="Inbox filters"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = unreadCounts[tab.id] ?? 0;
          const Icon = tab.Icon;

          return (
            <button
              key={tab.id}
              id={`inbox-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
              className="relative flex flex-1 items-center justify-center gap-1 px-1.5 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors min-w-0"
              style={{
                color: isActive ? t.heading : t.muted,
                borderBottom: isActive ? `2px solid ${t.accent}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <Icon className="w-3 h-3 shrink-0" style={{ color: isActive ? t.accent : t.muted }} />
              <span className="truncate">{tab.label}</span>
              {count > 0 && (
                <span
                  className="inline-flex items-center justify-center px-1 text-[9px] font-semibold tabular-nums shrink-0"
                  style={{
                    minWidth: 16,
                    height: 16,
                    borderRadius: 2,
                    background: isActive ? t.accentMuted : t.hover,
                    color: isActive ? t.accent : t.muted,
                  }}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
