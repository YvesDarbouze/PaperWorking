'use client';

import React from 'react';
import { LayoutList, Map } from 'lucide-react';

export type ViewMode = 'list' | 'map';

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  className?: string;
}

export default function ViewToggle({
  view,
  onViewChange,
  className = '',
}: ViewToggleProps) {
  return (
    <div className={`inline-flex p-1 bg-[#0a0a0f]/80 backdrop-blur-[8px] border border-white/[0.06] rounded-[12px] h-11 ${className}`}>
      <button
        type="button"
        data-testid="view-toggle-list"
        onClick={() => onViewChange('list')}
        className={`px-3.5 flex items-center gap-1.5 rounded-[9px] text-xs font-bold transition-all min-h-[34px] cursor-pointer ${
          view === 'list'
            ? 'bg-white/15 text-slate-100 font-extrabold shadow-sm border border-white/10'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutList className="w-4 h-4 text-slate-300" />
        <span>List</span>
      </button>

      <button
        type="button"
        data-testid="view-toggle-map"
        onClick={() => onViewChange('map')}
        className={`px-3.5 flex items-center gap-1.5 rounded-[9px] text-xs font-bold transition-all min-h-[34px] cursor-pointer ${
          view === 'map'
            ? 'bg-white/15 text-slate-100 font-extrabold shadow-sm border border-white/10'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Map className="w-4 h-4 text-slate-300" />
        <span>Map</span>
      </button>
    </div>
  );
}
