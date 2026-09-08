'use client';

import React, { useState, useMemo } from 'react';
import type { DealCardData } from '@/components/marketplace/DealCard';

export interface MarketplaceFilterState {
  dealType: 'all' | 'crowdfunding' | 'syndication';
  assetClasses: string[];
  markets: string[];
  minInvestmentMax: number; // 0 to 100000+
  minIrr: number; // 5 to 25
  holdPeriods: string[];
  statuses: string[];
}

export interface MarketplaceFilterRailProps {
  filters: MarketplaceFilterState;
  allDeals: DealCardData[];
  onChange: (updated: MarketplaceFilterState) => void;
  onReset: () => void;
  className?: string;
}

export const ALL_ASSET_CLASSES = [
  'Multifamily',
  'Industrial',
  'Retail',
  'Office',
  'Hospitality',
  'Land',
  'Mixed-Use',
  'Single-family',
];

export const ALL_HOLD_PERIODS = [
  { id: '<3', label: '< 3 Yrs' },
  { id: '3–5', label: '3–5 Yrs' },
  { id: '5–7', label: '5–7 Yrs' },
  { id: '7+', label: '7+ Yrs' },
];

export const ALL_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'open', label: 'Open' },
  { id: 'closing_soon', label: 'Closing Soon' },
  { id: 'funding', label: 'Funding' },
  { id: 'published', label: 'Live' },
];

export default function MarketplaceFilterRail({
  filters,
  allDeals,
  onChange,
  onReset,
  className = '',
}: MarketplaceFilterRailProps) {
  const [marketSearch, setMarketSearch] = useState('');

  // Extract all available markets dynamically with item counts
  const availableMarkets = useMemo(() => {
    const counts = new Map<string, number>();
    allDeals.forEach((d) => {
      const city = d.city || '';
      const state = d.state || '';
      const key = [city, state].filter(Boolean).join(', ');
      if (key) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allDeals]);

  // Compute live result counts per asset class
  const assetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allDeals.forEach((d) => {
      const ac = d.assetClass || 'Commercial';
      counts.set(ac, (counts.get(ac) || 0) + 1);
    });
    return counts;
  }, [allDeals]);

  const toggleAssetClass = (ac: string) => {
    const exists = filters.assetClasses.includes(ac);
    const updated = exists
      ? filters.assetClasses.filter((item) => item !== ac)
      : [...filters.assetClasses, ac];
    onChange({ ...filters, assetClasses: updated });
  };

  const toggleMarket = (m: string) => {
    const exists = filters.markets.includes(m);
    const updated = exists
      ? filters.markets.filter((item) => item !== m)
      : [...filters.markets, m];
    onChange({ ...filters, markets: updated });
  };

  const toggleHoldPeriod = (hp: string) => {
    const exists = filters.holdPeriods.includes(hp);
    const updated = exists
      ? filters.holdPeriods.filter((item) => item !== hp)
      : [...filters.holdPeriods, hp];
    onChange({ ...filters, holdPeriods: updated });
  };

  const toggleStatus = (st: string) => {
    const exists = filters.statuses.includes(st);
    const updated = exists
      ? filters.statuses.filter((item) => item !== st)
      : [...filters.statuses, st];
    onChange({ ...filters, statuses: updated });
  };

  const filteredMarkets = availableMarkets.filter((m) =>
    m.name.toLowerCase().includes(marketSearch.trim().toLowerCase()),
  );

  return (
    <aside
      className={`w-full lg:w-[240px] shrink-0 space-y-6 rounded-2xl border border-white/10 bg-[#121014] p-4 lg:sticky lg:top-20 ${className}`}
      aria-label="Marketplace Filters"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#fdfffc] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">tune</span>
          Filters
        </h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-[#9E9DA0] hover:text-[var(--accent)] transition"
        >
          Reset all
        </button>
      </div>

      {/* Deal Type (Crowdfunding vs Syndication) */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          Deal Structure
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['all', 'syndication', 'crowdfunding'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ ...filters, dealType: type })}
              className={`rounded-md py-1.5 text-[11px] font-semibold capitalize transition ${
                filters.dealType === type
                  ? 'bg-[var(--accent)] text-[#0a0a0f] font-bold shadow'
                  : 'text-[#fdfffc]/70 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : type === 'syndication' ? 'Syndicate' : 'Crowd'}
            </button>
          ))}
        </div>
      </div>

      {/* Target IRR Range Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
            Min Target IRR
          </label>
          <span className="font-mono font-bold text-[var(--accent)]">{filters.minIrr}%+</span>
        </div>
        <input
          type="range"
          min="5"
          max="25"
          step="0.5"
          aria-label="Minimum Target IRR"
          value={filters.minIrr}
          onChange={(e) => onChange({ ...filters, minIrr: parseFloat(e.target.value) })}
          className="h-1.5 w-full appearance-none rounded-lg bg-white/15 accent-[var(--accent)] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#9E9DA0] font-mono">
          <span>5%</span>
          <span>15%</span>
          <span>25%+</span>
        </div>
      </div>

      {/* Maximum Check / Min Investment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
            Max Min Check
          </label>
          <span className="font-mono font-bold text-[var(--accent)]">
            {filters.minInvestmentMax >= 100000 ? '$100K+' : `$${filters.minInvestmentMax.toLocaleString()}`}
          </span>
        </div>
        <input
          type="range"
          min="10000"
          max="100000"
          step="5000"
          aria-label="Maximum Minimum Investment"
          value={filters.minInvestmentMax}
          onChange={(e) => onChange({ ...filters, minInvestmentMax: parseInt(e.target.value, 10) })}
          className="h-1.5 w-full appearance-none rounded-lg bg-white/15 accent-[var(--accent)] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#9E9DA0] font-mono">
          <span>$10K</span>
          <span>$50K</span>
          <span>$100K+</span>
        </div>
      </div>

      {/* Asset Class Multi-Select */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          Asset Class
        </label>
        <div
          role="group"
          aria-label="Asset Class filters"
          className="space-y-1 max-h-[180px] overflow-y-auto pr-1"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const inputs = Array.from(
                e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
              );
              const activeIndex = inputs.indexOf(document.activeElement as HTMLInputElement);
              if (activeIndex !== -1) {
                const nextIndex =
                  e.key === 'ArrowDown'
                    ? (activeIndex + 1) % inputs.length
                    : (activeIndex - 1 + inputs.length) % inputs.length;
                inputs[nextIndex]?.focus();
              }
            }
          }}
        >
          {ALL_ASSET_CLASSES.map((ac) => {
            const isChecked = filters.assetClasses.includes(ac);
            const count = assetCounts.get(ac) || 0;
            return (
              <label
                key={ac}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-xs hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAssetClass(ac)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 text-[var(--accent)] accent-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121014]"
                  />
                  <span className={isChecked ? 'font-semibold text-white' : 'text-[#fdfffc]/80'}>
                    {ac}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#9E9DA0]">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Target Market Metro */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          Market / Metro
        </label>
        <div className="relative">
          <input
            type="text"
            value={marketSearch}
            onChange={(e) => setMarketSearch(e.target.value)}
            placeholder="Filter markets…"
            aria-label="Filter markets"
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div
          role="group"
          aria-label="Market filters"
          className="space-y-1 max-h-[140px] overflow-y-auto pr-1"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const inputs = Array.from(
                e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
              );
              const activeIndex = inputs.indexOf(document.activeElement as HTMLInputElement);
              if (activeIndex !== -1) {
                const nextIndex =
                  e.key === 'ArrowDown'
                    ? (activeIndex + 1) % inputs.length
                    : (activeIndex - 1 + inputs.length) % inputs.length;
                inputs[nextIndex]?.focus();
              }
            }
          }}
        >
          {filteredMarkets.map((m) => {
            const isChecked = filters.markets.includes(m.name);
            return (
              <label
                key={m.name}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-xs hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMarket(m.name)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 text-[var(--accent)] accent-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121014]"
                  />
                  <span className={isChecked ? 'font-semibold text-white' : 'text-[#fdfffc]/80'}>
                    {m.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#9E9DA0]">{m.count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Hold Period Segmented */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          Hold Period
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_HOLD_PERIODS.map((hp) => {
            const isChecked = filters.holdPeriods.includes(hp.id);
            return (
              <button
                key={hp.id}
                type="button"
                onClick={() => toggleHoldPeriod(hp.id)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121014] ${
                  isChecked
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'border-white/10 bg-white/[0.02] text-[#fdfffc]/70 hover:border-white/20'
                }`}
              >
                {hp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deal Status */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0]">
          Deal Status
        </label>
        <div
          role="group"
          aria-label="Deal Status filters"
          className="space-y-1"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const inputs = Array.from(
                e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
              );
              const activeIndex = inputs.indexOf(document.activeElement as HTMLInputElement);
              if (activeIndex !== -1) {
                const nextIndex =
                  e.key === 'ArrowDown'
                    ? (activeIndex + 1) % inputs.length
                    : (activeIndex - 1 + inputs.length) % inputs.length;
                inputs[nextIndex]?.focus();
              }
            }
          }}
        >
          {ALL_STATUSES.map((st) => {
            const isChecked = filters.statuses.includes(st.id);
            return (
              <label
                key={st.id}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-xs hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleStatus(st.id)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 text-[var(--accent)] accent-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121014]"
                  />
                  <span className={isChecked ? 'font-semibold text-white' : 'text-[#fdfffc]/80'}>
                    {st.label}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
