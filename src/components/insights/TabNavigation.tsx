'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

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
  return (
    <div className="flex overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none border-b border-slate-200 dark:border-white/5">
      <div className="flex space-x-1.5">
        {categories.map((cat) => {
          const IconComp = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onTabChange(cat.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap active:scale-98 ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md shadow-slate-900/10'
                  : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <IconComp className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'opacity-80'}`} />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
