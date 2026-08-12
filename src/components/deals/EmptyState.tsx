'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  onResetFilters?: () => void;
  className?: string;
}

export default function EmptyState({
  onResetFilters,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={`rounded-[14px] border border-white/10 p-12 text-center max-w-lg mx-auto space-y-4 my-8 bg-[#0a0a0f]/80 backdrop-blur-[12px] shadow-2xl ${className}`}
    >
      <div className="w-16 h-16 mx-auto rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 opacity-40">
        <Search className="w-8 h-8 text-slate-400" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">No deals found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Try adjusting your filters or search for a different address.
        </p>
      </div>

      {onResetFilters && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4 text-[#34d399]" />
            <span>Reset all filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
