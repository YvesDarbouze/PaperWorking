'use client';

import React from 'react';

export type InvestmentStrategyType =
  | 'buy_and_hold_rental'
  | 'short_term_rental_airbnb'
  | 'flip'
  | 'brrrr'
  | 'commercial_value_add'
  | 'wholesale';

export interface StrategyOption {
  id: InvestmentStrategyType;
  label: string;
  shortLabel: string;
  tagline: string;
  icon: string;
  badge?: string;
}

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'buy_and_hold_rental',
    label: 'Long-Term Rental',
    shortLabel: 'Rental',
    tagline: 'Cash flow, debt paydown, and equity growth',
    icon: 'home',
  },
  {
    id: 'short_term_rental_airbnb',
    label: 'Short-Term (STR / Airbnb)',
    shortLabel: 'STR',
    tagline: 'Nightly ADR, dynamic occupancy, and hospitality yields',
    icon: 'hotel',
    badge: 'STR Engine',
  },
  {
    id: 'flip',
    label: 'Fix & Flip',
    shortLabel: 'Flip',
    tagline: 'Short-term value-add, holding cost carry, and margin',
    icon: 'handyman',
  },
  {
    id: 'brrrr',
    label: 'BRRRR Refinance',
    shortLabel: 'BRRRR',
    tagline: 'Cash-out refinance timeline and capital recycling',
    icon: 'cycle',
    badge: 'Cash-Out',
  },
  {
    id: 'commercial_value_add',
    label: 'Commercial & Multi-Family',
    shortLabel: 'Commercial',
    tagline: 'Multi-unit NOI, debt yield, and cap rate expansion',
    icon: 'apartment',
  },
  {
    id: 'wholesale',
    label: 'Wholesaling',
    shortLabel: 'Wholesale',
    tagline: 'Contract spread, MAO 70% rule, and double closing',
    icon: 'sell',
    badge: 'Assignment',
  },
];

interface StrategySelectorBarProps {
  selectedStrategy: InvestmentStrategyType;
  onSelectStrategy: (strategy: InvestmentStrategyType) => void;
}

export default function StrategySelectorBar({
  selectedStrategy,
  onSelectStrategy,
}: StrategySelectorBarProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
          Investment Strategy
        </label>
        <span className="text-[10px] font-mono text-emerald-400">
          6 Strategies Supported
        </span>
      </div>

      <div
        data-testid="strategy-selector-bar"
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10"
      >
        {STRATEGY_OPTIONS.map((strat) => {
          const isSelected = selectedStrategy === strat.id;
          return (
            <button
              key={strat.id}
              type="button"
              data-testid={`strategy-tab-${strat.id}`}
              onClick={() => onSelectStrategy(strat.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition min-h-[44px] ${
                isSelected
                  ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-white shadow-[0_0_16px_rgba(0,221,148,0.15)]'
                  : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  isSelected ? 'text-[color:var(--color-primary)]' : 'text-white/40'
                }`}
              >
                {strat.icon}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold leading-tight">
                    {strat.label}
                  </span>
                  {strat.badge && (
                    <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-mono uppercase text-white/70">
                      {strat.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/40 hidden sm:inline">
                  {strat.tagline}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
