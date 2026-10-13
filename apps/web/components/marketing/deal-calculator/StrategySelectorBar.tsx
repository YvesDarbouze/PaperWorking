'use client';

import React from 'react';
import {
  House,
  Bed,
  Hammer,
  ArrowsClockwise,
  Buildings,
  Tag,
} from '@phosphor-icons/react';

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
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'buy_and_hold_rental',
    label: 'Long-Term Rental',
    shortLabel: 'Rental',
    tagline: 'Cash flow, debt paydown, and equity growth',
    icon: House,
  },
  {
    id: 'short_term_rental_airbnb',
    label: 'Short-Term (STR / Airbnb)',
    shortLabel: 'STR',
    tagline: 'Nightly ADR, dynamic occupancy, and hospitality yields',
    icon: Bed,
    badge: 'STR Engine',
  },
  {
    id: 'flip',
    label: 'Fix & Flip',
    shortLabel: 'Flip',
    tagline: 'Short-term value-add, holding cost carry, and margin',
    icon: Hammer,
  },
  {
    id: 'brrrr',
    label: 'BRRRR Refinance',
    shortLabel: 'BRRRR',
    tagline: 'Cash-out refinance timeline and capital recycling',
    icon: ArrowsClockwise,
    badge: 'Cash-Out',
  },
  {
    id: 'commercial_value_add',
    label: 'Commercial & Multi-Family',
    shortLabel: 'Commercial',
    tagline: 'Multi-unit NOI, debt yield, and cap rate expansion',
    icon: Buildings,
  },
  {
    id: 'wholesale',
    label: 'Wholesaling',
    shortLabel: 'Wholesale',
    tagline: 'Contract spread, MAO 70% rule, and double closing',
    icon: Tag,
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
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Investment Strategy
        </label>
        <span className="text-[10px] font-mono text-muted-foreground">
          6 Strategies Supported
        </span>
      </div>

      <div
        data-testid="strategy-selector-bar"
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin"
      >
        {STRATEGY_OPTIONS.map((strat) => {
          const isSelected = selectedStrategy === strat.id;
          const Icon = strat.icon;
          return (
            <button
              key={strat.id}
              type="button"
              data-testid={`strategy-tab-${strat.id}`}
              onClick={() => onSelectStrategy(strat.id)}
              className={`flex shrink-0 items-center gap-2 rounded-none border px-3.5 py-2.5 text-left transition min-h-[44px] ${
                isSelected
                  ? 'border-foreground bg-foreground/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold leading-tight">
                    {strat.label}
                  </span>
                  {strat.badge && (
                    <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">
                      {strat.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
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
