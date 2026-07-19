'use client';

import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { ArrowRightLeft, Home, TrendingUp, Key } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Exit Strategy Fork — Sell vs. Refinance & Hold vs. Lease
   
   Top-of-panel toggle controlling the dashboard's math 
   route. Dispatches to Zustand on change.
   ═══════════════════════════════════════════════════════ */

interface ExitStrategyForkProps {
  projectId: string;
  strategy: 'Sell' | 'Rent' | 'Lease';
  onStrategyChange: (s: 'Sell' | 'Rent' | 'Lease') => void;
}

export default function ExitStrategyFork({ projectId, strategy, onStrategyChange }: ExitStrategyForkProps) {
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  const handleToggle = (next: 'Sell' | 'Rent' | 'Lease') => {
    onStrategyChange(next);
    updateProjectFinancials(projectId, { exitStrategyType: next === 'Lease' ? 'Rent' : next });
  };

  return (
    <div className="glass-card border border-pw-border p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-pw-border">
        <ArrowRightLeft className="w-3.5 h-3.5 text-pw-accent" />
        <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">
          Exit_Strategy_Fork
        </h3>
        <span className="ml-auto text-[10px] font-bold text-text-secondary uppercase tracking-widest">
          {strategy === 'Sell' ? 'Liquidation' : strategy === 'Lease' ? 'Commercial_Lease' : 'Cash_Flow'}
        </span>
      </div>

      {/* Toggle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sell Card */}
        <button
          onClick={() => handleToggle('Sell')}
          className={`group relative p-6 border transition-all duration-300 text-left ${
            strategy === 'Sell'
              ? 'border-pw-accent bg-pw-accent text-pw-white'
              : 'border-pw-border bg-pw-glass-bg text-text-primary hover:border-pw-accent'
          }`}
        >
          <TrendingUp className={`w-5 h-5 mb-3 ${strategy === 'Sell' ? 'text-pw-white' : 'text-text-secondary group-hover:text-pw-accent'}`} />
          <p className="text-sm font-black uppercase tracking-widest mb-1">Sell Property</p>
          <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed text-text-secondary group-hover:text-pw-white/80">
            Liquidate asset → Settlement ledger → Net proceeds → Capital gains
          </p>
          {strategy === 'Sell' && (
            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-pw-white rounded-full animate-pulse" />
          )}
        </button>

        {/* Hold Card */}
        <button
          onClick={() => handleToggle('Rent')}
          className={`group relative p-6 border transition-all duration-300 text-left ${
            strategy === 'Rent'
              ? 'border-pw-accent bg-pw-accent text-pw-white'
              : 'border-pw-border bg-pw-glass-bg text-text-primary hover:border-pw-accent'
          }`}
        >
          <Home className={`w-5 h-5 mb-3 ${strategy === 'Rent' ? 'text-pw-white' : 'text-text-secondary group-hover:text-pw-accent'}`} />
          <p className="text-sm font-black uppercase tracking-widest mb-1">Refinance & Hold</p>
          <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed text-text-secondary group-hover:text-pw-white/80">
            Rental cash flow → Monthly NOI → Cash-on-cash return
          </p>
          {strategy === 'Rent' && (
            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-pw-white rounded-full animate-pulse" />
          )}
        </button>

        {/* Lease Card */}
        <button
          onClick={() => handleToggle('Lease')}
          className={`group relative p-6 border transition-all duration-300 text-left ${
            strategy === 'Lease'
              ? 'border-pw-accent bg-pw-accent text-pw-white'
              : 'border-pw-border bg-pw-glass-bg text-text-primary hover:border-pw-accent'
          }`}
        >
          <Key className={`w-5 h-5 mb-3 ${strategy === 'Lease' ? 'text-pw-white' : 'text-text-secondary group-hover:text-pw-accent'}`} />
          <p className="text-sm font-black uppercase tracking-widest mb-1">Commercial Lease</p>
          <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed text-text-secondary group-hover:text-pw-white/80">
            Commercial leasing → NNN lease terms → Corporate tenant receipts
          </p>
          {strategy === 'Lease' && (
            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-pw-white rounded-full animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
