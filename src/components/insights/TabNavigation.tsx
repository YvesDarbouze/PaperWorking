'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { insightsTokens } from './insightsTheme';

export interface TabCategory {
  id: string;
  name: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  categories: readonly TabCategory[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabNavigation({
  categories,
  activeTab,
  onTabChange
}: TabNavigationProps) {
  const { theme } = useTheme();
  const t = insightsTokens(theme === 'dark');

  return (
    <div
      className="flex overflow-x-auto no-scrollbar"
      style={{ borderBottom: `1px solid ${t.border}` }}
      role="tablist"
      aria-label="Insight categories"
    >
      {categories.map((cat) => {
        const IconComp = cat.icon;
        const isActive = activeTab === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(cat.id)}
            className="pw-interactive-custom flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors"
            style={{
              color: isActive ? t.heading : t.muted,
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? `2px solid ${t.accent}` : '2px solid transparent',
              borderRadius: 0,
              marginBottom: -1,
              boxShadow: 'none',
              padding: '10px 14px',
            }}
          >
            <IconComp className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? t.accent : t.muted }} />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
