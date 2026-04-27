'use client';

import React, { useState } from 'react';
import { Project } from '@/types/schema';
import { Flame, Timer, Wallet, AlertTriangle } from 'lucide-react';
import DOMCountdown from './DOMCountdown';
import HoldingCostTicker from './HoldingCostTicker';
import TaxImplicationWarning from './TaxImplicationWarning';
import VelocityProjection from './VelocityProjection';

/* ═══════════════════════════════════════════════════════════════
   BurnRateMonitor — Efficiency & Risk Orchestrator
   
   Centralizes time-sensitive and financial-drain metrics.
   Aesthetics: Sleek tab navigation, high-contrast active states, 
   and clean content transitions.
   ═══════════════════════════════════════════════════════════════ */

type MonitorTab = 'velocity' | 'dom' | 'costs' | 'tax';

interface BurnRateMonitorProps {
  projects: Project[];
}

export default function BurnRateMonitor({ projects }: BurnRateMonitorProps) {
  const [activeTab, setActiveTab] = useState<MonitorTab>('velocity');

  const tabs: { key: MonitorTab; label: string; icon: React.ElementType }[] = [
    { key: 'velocity', label: 'VELOCITY',       icon: Zap },
    { key: 'dom',      label: 'DAYS ON MARKET', icon: Timer },
    { key: 'costs',    label: 'BURN RATE',      icon: Wallet },
    { key: 'tax',      label: 'TAX RISK',       icon: AlertTriangle },
  ];

  return (
    <div className="ag-card bg-bg-surface border border-border-accent/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)] flex flex-col group hover:border-pw-black/20 transition-all duration-500 min-h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-md bg-bg-primary flex items-center justify-center text-text-secondary group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500 shadow-sm">
          <Flame className="w-5 h-5" />
        </div>
        <div>
          <p className="ag-label opacity-40 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-[0.2em] text-[10px]">
            Deal Efficiency
          </p>
          <h3 className="text-2xl font-light text-text-primary tracking-tighter">Velocity & Burn</h3>
        </div>
      </div>

      {/* Premium Tab Navigation */}
      <div className="flex gap-1.5 mb-8 bg-bg-primary p-1 rounded-xl border border-border-accent/5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-2 py-3 px-1 rounded-lg transition-all duration-500 ${
                isActive
                  ? 'bg-bg-surface text-text-primary shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-border-accent/10'
                  : 'text-text-secondary opacity-40 hover:opacity-100 hover:bg-bg-surface/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-text-primary' : 'text-text-secondary'}`} />
              <span className={`text-[8px] font-black tracking-widest uppercase text-center leading-tight`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content with Animation */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'velocity' && (
            <VelocityProjection projects={projects} />
          )}
          {activeTab === 'dom' && (
            <DOMCountdown projects={projects} />
          )}
          {activeTab === 'costs' && (
            <HoldingCostTicker projects={projects} />
          )}
          {activeTab === 'tax' && (
            <TaxImplicationWarning projects={projects} />
          )}
        </div>
      </div>
    </div>
  );
}
    </div>
  );
}
