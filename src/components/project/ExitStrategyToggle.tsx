'use client';

import React from 'react';
import { Home, Key } from 'lucide-react';

interface ExitStrategyToggleProps {
  currentStrategy?: 'Sell' | 'Rent';
  onChange: (strategy: 'Sell' | 'Rent') => void;
}

export function ExitStrategyToggle({ currentStrategy, onChange }: ExitStrategyToggleProps) {
  return (
    <div className="bg-[var(--bg-surface)] p-8 rounded-xl border border-[var(--border-strong)] flex flex-col items-center shadow-md">
      <h2 className="text-2xl md:text-3xl font-extrabold mb-8 uppercase tracking-wide text-[var(--text-primary)] text-center">
        Intended Exit Strategy
      </h2>
      <div className="flex flex-col md:flex-row w-full max-w-3xl bg-[var(--bg-canvas)] p-2 rounded-2xl shadow-inner border border-[var(--border-subtle)] gap-2">
        <button
          onClick={() => onChange('Sell')}
          className={`flex-1 flex flex-col items-center justify-center p-8 rounded-xl transition-all duration-300 ${
            currentStrategy === 'Sell' 
              ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-lg scale-[1.02]' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Home className="w-12 h-12 mb-4" />
          <span className="text-3xl font-bold tracking-wider">SELL</span>
          <span className="text-sm mt-2 opacity-80 text-center font-medium max-w-xs">
            Flip the property for a lump-sum profit on the retail market.
          </span>
        </button>
        <button
          onClick={() => onChange('Rent')}
          className={`flex-1 flex flex-col items-center justify-center p-8 rounded-xl transition-all duration-300 ${
            currentStrategy === 'Rent' 
              ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-lg scale-[1.02]' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Key className="w-12 h-12 mb-4" />
          <span className="text-3xl font-bold tracking-wider">RENT</span>
          <span className="text-sm mt-2 opacity-80 text-center font-medium max-w-xs">
            Hold the asset for recurring monthly cash flow and long-term appreciation.
          </span>
        </button>
      </div>
    </div>
  );
}
