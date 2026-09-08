'use client';

import React from 'react';
import type { MarketplaceFilterState } from './MarketplaceFilterRail';

export interface MarketplaceActiveFiltersProps {
  filters: MarketplaceFilterState;
  searchQuery: string;
  totalResults: number;
  onRemoveSearch: () => void;
  onRemoveAssetClass: (ac: string) => void;
  onRemoveMarket: (m: string) => void;
  onRemoveHoldPeriod: (hp: string) => void;
  onRemoveStatus: (st: string) => void;
  onResetDealType: () => void;
  onResetMinIrr: () => void;
  onResetMinInvestment: () => void;
  onClearAll: () => void;
  className?: string;
}

export default function MarketplaceActiveFilters({
  filters,
  searchQuery,
  totalResults,
  onRemoveSearch,
  onRemoveAssetClass,
  onRemoveMarket,
  onRemoveHoldPeriod,
  onRemoveStatus,
  onResetDealType,
  onResetMinIrr,
  onResetMinInvestment,
  onClearAll,
  className = '',
}: MarketplaceActiveFiltersProps) {
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    filters.dealType !== 'all' ||
    filters.assetClasses.length > 0 ||
    filters.markets.length > 0 ||
    filters.holdPeriods.length > 0 ||
    filters.statuses.length > 0 ||
    filters.minIrr > 5 ||
    filters.minInvestmentMax < 100000;

  if (!hasActiveFilters) {
    return (
      <div className={`flex items-center justify-between text-xs text-[#9E9DA0] ${className}`}>
        <span>Showing <strong className="text-white font-mono">{totalResults}</strong> opportunities</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <span className="text-[#9E9DA0] font-medium mr-1">
        Showing <strong className="text-white font-mono">{totalResults}</strong> with filters:
      </span>

      {/* Search Query Chip */}
      {searchQuery.trim() && (
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2.5 py-1 font-medium text-[var(--accent)]">
          <span>Search: &quot;{searchQuery}&quot;</span>
          <button
            type="button"
            onClick={onRemoveSearch}
            className="hover:text-white transition"
            aria-label="Remove search filter"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      )}

      {/* Deal Type Chip */}
      {filters.dealType !== 'all' && (
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#fdfffc]">
          <span className="capitalize">{filters.dealType}</span>
          <button
            type="button"
            onClick={onResetDealType}
            className="text-[#9E9DA0] hover:text-white transition"
            aria-label="Remove deal type filter"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      )}

      {/* IRR Chip */}
      {filters.minIrr > 5 && (
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#fdfffc]">
          <span>IRR &ge; {filters.minIrr}%</span>
          <button
            type="button"
            onClick={onResetMinIrr}
            className="text-[#9E9DA0] hover:text-white transition"
            aria-label="Remove IRR filter"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      )}

      {/* Max Min Check Chip */}
      {filters.minInvestmentMax < 100000 && (
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#fdfffc]">
          <span>Min Check &le; ${filters.minInvestmentMax.toLocaleString()}</span>
          <button
            type="button"
            onClick={onResetMinInvestment}
            className="text-[#9E9DA0] hover:text-white transition"
            aria-label="Remove check size filter"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      )}

      {/* Asset Class Chips */}
      {filters.assetClasses.map((ac) => (
        <span
          key={ac}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#fdfffc]"
        >
          <span>{ac}</span>
          <button
            type="button"
            onClick={() => onRemoveAssetClass(ac)}
            className="text-[#9E9DA0] hover:text-white transition"
            aria-label={`Remove ${ac} filter`}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      ))}

      {/* Market Chips */}
      {filters.markets.map((m) => (
        <span
          key={m}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#fdfffc]"
        >
          <span>{m}</span>
          <button
            type="button"
            onClick={() => onRemoveMarket(m)}
            className="text-[#9E9DA0] hover:text-white transition"
            aria-label={`Remove ${m} filter`}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      ))}

      {/* Hold Period Chips */}
      {filters.holdPeriods.map((hp) => (
        <span
          key={hp}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#fdfffc]"
        >
          <span>Hold: {hp} Yrs</span>
          <button
            type="button"
            onClick={() => onRemoveHoldPeriod(hp)}
            className="text-[#9E9DA0] hover:text-white transition"
            aria-label={`Remove hold period filter`}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      ))}

      {/* Status Chips */}
      {filters.statuses.map((st) => (
        <span
          key={st}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[#fdfffc] capitalize"
        >
          <span>Status: {st.replace('_', ' ')}</span>
          <button
            type="button"
            onClick={() => onRemoveStatus(st)}
            className="text-[#9E9DA0] hover:text-white transition"
            aria-label={`Remove status filter`}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </span>
      ))}

      {/* Clear All Button */}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-[var(--accent)] hover:underline ml-2 transition"
      >
        Clear all
      </button>
    </div>
  );
}
