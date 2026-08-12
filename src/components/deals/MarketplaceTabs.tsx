'use client';

import React from 'react';
import { Compass, UserCheck } from 'lucide-react';

export type MarketplaceTab = 'discover' | 'my-activity';

interface MarketplaceTabsProps {
  activeTab: MarketplaceTab;
  onTabChange: (tab: MarketplaceTab) => void;
  className?: string;
}

export default function MarketplaceTabs({
  activeTab,
  onTabChange,
  className = '',
}: MarketplaceTabsProps) {
  return (
    <div className={`inline-flex items-center p-1 bg-[#0a0a0f]/80 backdrop-blur-[8px] border border-white/[0.06] rounded-[12px] ${className}`}>
      <button
        type="button"
        data-testid="tab-discover"
        onClick={() => onTabChange('discover')}
        className={`px-5 py-2 rounded-[10px] text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer min-h-[40px] ${
          activeTab === 'discover'
            ? 'bg-white/10 text-slate-100 border border-white/15 shadow-md font-extrabold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <Compass className={`w-4 h-4 ${activeTab === 'discover' ? 'text-[#34d399]' : 'text-slate-400'}`} />
        <span>Discover</span>
      </button>

      <button
        type="button"
        data-testid="tab-my-activity"
        onClick={() => onTabChange('my-activity')}
        className={`px-5 py-2 rounded-[10px] text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer min-h-[40px] ${
          activeTab === 'my-activity'
            ? 'bg-white/10 text-slate-100 border border-white/15 shadow-md font-extrabold'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <UserCheck className={`w-4 h-4 ${activeTab === 'my-activity' ? 'text-[#34d399]' : 'text-slate-400'}`} />
        <span>My Activity</span>
      </button>
    </div>
  );
}
