'use client';

import React, { useState } from 'react';
import { Project } from '@/types/schema';
import { Flame, Timer, Wallet, AlertTriangle } from 'lucide-react';
import DOMCountdown from './DOMCountdown';
import HoldingCostTicker from './HoldingCostTicker';
import TaxImplicationWarning from './TaxImplicationWarning';

/* ═══════════════════════════════════════════════════════════════
   BurnRateMonitor — Orchestrator for Right Column

   Combines DOMCountdown, HoldingCostTicker, and TaxImplicationWarning
   into a single vertically stacked panel with section headers.
   ═══════════════════════════════════════════════════════════════ */

type MonitorTab = 'dom' | 'costs' | 'tax';

interface BurnRateMonitorProps {
  projects: Project[];
}

export default function BurnRateMonitor({ projects }: BurnRateMonitorProps) {
  const [activeTab, setActiveTab] = useState<MonitorTab>('dom');

  const tabs: { key: MonitorTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dom',   label: 'DOM',       icon: <Timer className="w-3.5 h-3.5" /> },
    { key: 'costs', label: 'Costs',     icon: <Wallet className="w-3.5 h-3.5" /> },
    { key: 'tax',   label: 'Tax Risk',  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="ag-card bg-bg-surface border border-border-accent/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-md bg-bg-primary flex items-center justify-center">
          <Flame className="w-5 h-5 text-text-secondary" />
        </div>
        <div>
          <p className="ag-label opacity-60">Active Deals</p>
          <h3 className="text-2xl font-light text-text-primary tracking-tighter">Burn Rate</h3>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-bg-primary/50 p-1 rounded-md">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded border transition-all duration-300 ${
              activeTab === tab.key
                ? 'bg-pw-black text-pw-white border-pw-black shadow-md'
                : 'bg-transparent text-text-secondary border-transparent hover:bg-bg-surface hover:border-border-accent/30'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto max-h-[500px]">
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
  );
}
