'use client';

import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import { ArrowRightLeft, Home, TrendingUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Exit Strategy Fork — Sell vs. Refinance & Hold
   
   Top-of-panel toggle controlling the dashboard's math 
   route. Dispatches to Zustand on change.
   ═══════════════════════════════════════════════════════ */

interface ExitStrategyForkProps {
  projectId: string;
  strategy: 'Sell' | 'Rent';
  onStrategyChange: (s: 'Sell' | 'Rent') => void;
}

export default function ExitStrategyFork({ projectId, strategy, onStrategyChange }: ExitStrategyForkProps) {
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  const handleToggle = (next: 'Sell' | 'Rent') => {
    onStrategyChange(next);
    updateProjectFinancials(projectId, { exitStrategyType: next });
  };

  return (
    <div className="bg-bg-surface border-2 border-pw-black p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border-accent">
        <ArrowRightLeft className="w-3.5 h-3.5 text-pw-accent" />
        <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">
          Exit_Strategy_Fork
        </h3>
        <span className="ml-auto text-[10px] font-bold text-text-secondary uppercase tracking-widest">
          {strategy === 'Sell' ? 'Liquidation' : 'Cash_Flow'}
        </span>
      </div>

      {/* Toggle Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sell Card */}
        <button
          onClick={() => handleToggle('Sell')}
          className={`group relative p-6 border-2 transition-all duration-300 text-left ${
            strategy === 'Sell'
              ? 'border-pw-black bg-pw-black text-pw-white shadow-[6px_6px_0px_rgba(0,0,0,0.1)]'
              : 'border-border-accent bg-bg-primary text-text-primary hover:border-pw-accent'
          }`}
        >
          <TrendingUp className={`w-5 h-5 mb-3 ${strategy === 'Sell' ? 'text-pw-white' : 'text-text-secondary'}`} />
          <p className="text-sm font-black uppercase tracking-widest mb-1">Sell Property</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider leading-relaxed ${
            strategy === 'Sell' ? 'text-text-secondary' : 'text-text-secondary'
          }`}>
            Liquidate asset → Settlement ledger → Net proceeds → Capital gains
          </p>
          {strategy === 'Sell' && (
            <div className="absolute top-3 right-3 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </button>

        {/* Hold Card */}
        <button
          onClick={() => handleToggle('Rent')}
          className={`group relative p-6 border-2 transition-all duration-300 text-left ${
            strategy === 'Rent'
              ? 'border-pw-black bg-pw-black text-pw-white shadow-[6px_6px_0px_rgba(0,0,0,0.1)]'
              : 'border-border-accent bg-bg-primary text-text-primary hover:border-pw-accent'
          }`}
        >
          <Home className={`w-5 h-5 mb-3 ${strategy === 'Rent' ? 'text-pw-white' : 'text-text-secondary'}`} />
          <p className="text-sm font-black uppercase tracking-widest mb-1">Refinance & Hold</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider leading-relaxed ${
            strategy === 'Rent' ? 'text-text-secondary' : 'text-text-secondary'
          }`}>
            Rental cash flow → Monthly NOI → Cash-on-cash return
          </p>
          {strategy === 'Rent' && (
            <div className="absolute top-3 right-3 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
