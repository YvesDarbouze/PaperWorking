'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, X, RotateCcw } from 'lucide-react';

export interface FilterState {
  propertyType: string;
  strategy: string;
  status: string;
  priceRange: string;
}

export const PROPERTY_TYPES = ['All', 'Residential', 'Multi-family', 'Commercial', 'Land'];
export const STRATEGIES = ['All', 'Flip', 'BRRRR', 'Buy and hold', 'Wholesale'];
export const STATUSES = ['All', 'Draft', 'Listed', 'Under review', 'Funded', 'Closed'];
export const PRICE_RANGES = ['All', 'Under $500K', '$500K – $1M', '$1M – $3M', 'Over $3M'];

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

export default function FilterPanel({
  filters,
  onFilterChange,
  className = '',
}: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const updateFilterField = (field: keyof FilterState, value: string) => {
    const updated = { ...filters, [field]: value };
    onFilterChange(updated);

    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value && value !== 'All') {
      params.set(field, value);
    } else {
      params.delete(field);
    }
    const queryString = params.toString();
    const newPath = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newPath, { scroll: false });
  };

  const handleReset = () => {
    const resetState: FilterState = {
      propertyType: 'All',
      strategy: 'All',
      status: 'All',
      priceRange: 'All',
    };
    onFilterChange(resetState);

    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('propertyType');
    params.delete('strategy');
    params.delete('status');
    params.delete('priceRange');
    const queryString = params.toString();
    const newPath = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newPath, { scroll: false });
  };

  const activeCount =
    (filters.propertyType !== 'All' ? 1 : 0) +
    (filters.strategy !== 'All' ? 1 : 0) +
    (filters.status !== 'All' ? 1 : 0) +
    (filters.priceRange !== 'All' ? 1 : 0);

  return (
    <div className={`w-full ${className}`}>
      {/* Filters Ghost Button: bg rgba(52,211,153,0.08), border rgba(52,211,153,0.25), text #34d399 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="filter-toggle-button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-11 px-4 rounded-[10px] text-xs font-extrabold transition-all duration-200 flex items-center gap-2 cursor-pointer border min-h-[44px] ${
            isOpen || activeCount > 0
              ? 'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/40 shadow-lg'
              : 'bg-[#34d399]/[0.08] border-[#34d399]/25 text-[#34d399] hover:bg-[#34d399]/15'
          }`}
        >
          <Filter className="w-4 h-4 text-[#34d399]" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#34d399] text-slate-950 font-black text-[10px] flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Collapsible Glass Sheet / Mobile Bottom Sheet */}
      <div
        data-testid="filter-panel-content"
        className={`transition-all duration-300 ease-in-out ${
          isOpen
            ? 'max-h-[80vh] opacity-100 mt-4 overflow-y-auto'
            : 'max-h-0 opacity-0 mt-0 overflow-hidden pointer-events-none'
        }`}
      >
        <div className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] sm:backdrop-blur-[20px] shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#34d399]" />
              <span>Refine Deal Criteria</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-100 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Filter Groups in Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Property Type */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Property Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map((pt) => {
                  const isSelected = filters.propertyType === pt;
                  return (
                    <button
                      key={pt}
                      type="button"
                      data-testid={`filter-chip-propertyType-${pt}`}
                      onClick={() => updateFilterField('propertyType', pt)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all min-h-[36px] border ${
                        isSelected
                          ? 'bg-[#34d399]/15 text-[#34d399] border-[#34d399]/40 font-extrabold shadow'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {pt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Strategy */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Strategy
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STRATEGIES.map((st) => {
                  const isSelected = filters.strategy === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      data-testid={`filter-chip-strategy-${st}`}
                      onClick={() => updateFilterField('strategy', st)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all min-h-[36px] border ${
                        isSelected
                          ? 'bg-[#34d399]/15 text-[#34d399] border-[#34d399]/40 font-extrabold shadow'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Status */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((st) => {
                  const isSelected = filters.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      data-testid={`filter-chip-status-${st}`}
                      onClick={() => updateFilterField('status', st)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all min-h-[36px] border ${
                        isSelected
                          ? 'bg-[#34d399]/15 text-[#34d399] border-[#34d399]/40 font-extrabold shadow'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Price Range */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Price Range
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_RANGES.map((pr) => {
                  const isSelected = filters.priceRange === pr;
                  return (
                    <button
                      key={pr}
                      type="button"
                      data-testid={`filter-chip-priceRange-${pr}`}
                      onClick={() => updateFilterField('priceRange', pr)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all min-h-[36px] border ${
                        isSelected
                          ? 'bg-[#34d399]/15 text-[#34d399] border-[#34d399]/40 font-extrabold shadow'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {pr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
