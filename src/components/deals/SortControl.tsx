'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'funding';

interface SortControlProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

export default function SortControl({
  sort,
  onSortChange,
  className = '',
}: SortControlProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative flex items-center w-full">
        <ArrowUpDown className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        <select
          data-testid="sort-control-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="h-11 pl-9 pr-8 bg-[#0a0a0f]/80 backdrop-blur-[8px] border border-white/[0.06] rounded-[12px] text-xs font-bold text-slate-200 focus:outline-none focus:border-[#34d399]/40 appearance-none cursor-pointer min-h-[44px]"
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="funding">Funding progress</option>
        </select>
        <span className="absolute right-3 pointer-events-none text-slate-400 text-[10px]">▼</span>
      </div>
    </div>
  );
}
