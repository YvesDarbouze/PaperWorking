'use client';

import React, { lazy, Suspense } from 'react';
import { useProjectStore } from '@/store/projectStore';
import SmartInboxWidget from './SmartInboxWidget';
import GlobalTodoWidget from './GlobalTodoWidget';
import PortfolioKPIStrip from './PortfolioKPIStrip';
import MAOGaugeTracker from './MAOGaugeTracker';
import BurnRateMonitor from './BurnRateMonitor';
import { LayoutGrid, ArrowRight } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

/* ═══════════════════════════════════════════════════════════════
   DashboardHome — Root Orchestrator for Home View

   3-column CSS Grid layout:
   • Left  (cols 1-3):  Action Center — Inbox + To-Dos
   • Center (cols 4-9): Portfolio Health — KPIs + ROI + MAO
   • Right (cols 10-12): Burn Rate — DOM + Costs + Tax

   Background: pw-bg (#f2f2f2)
   Card style: ag-card (white surfaces, rounded, subtle shadow)
   ═══════════════════════════════════════════════════════════════ */

const ROIChart = lazy(() => import('./ROIChart'));

function ChartSkeleton() {
  return (
    <div className="ag-card bg-pw-surface border border-pw-border/10 animate-pulse">
      <div className="h-4 bg-pw-bg rounded w-1/3 mb-4" />
      <div className="h-[280px] bg-pw-bg rounded-2xl" />
    </div>
  );
}

export default function DashboardHome() {
  const projects = useProjectStore(s => s.projects);
  const setViewMode = useUIStore(s => s.setViewMode);

  const handleNavigateToDeal = (projectId: string) => {
    // Switch to command center and let existing navigation handle the deal
    setViewMode('COMMAND_CENTER');
  };

  const activeDeals = projects.filter(p => p.status !== 'Sold' && p.status !== 'Lead');
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-full bg-pw-bg px-8 py-8 overflow-y-auto">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-pw-black flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-pw-white" />
            </div>
            <p className="ag-label opacity-40">Command Center</p>
          </div>
          <h1 className="text-5xl font-extralight text-pw-black tracking-tight leading-none">
            {greeting}
          </h1>
          <p className="text-base text-pw-muted mt-3 font-normal tracking-tight">
            {activeDeals.length > 0
              ? `${activeDeals.length} active deal${activeDeals.length === 1 ? '' : 's'} in pipeline`
              : 'Your pipeline is clear — start sourcing'
            }
          </p>
        </div>

        {/* Enter Pipeline CTA */}
        <button
          onClick={() => setViewMode('COMMAND_CENTER')}
          className="flex items-center gap-3 px-8 py-4 bg-pw-black text-pw-white rounded-full hover:bg-pw-muted transition-all duration-300 group shadow-lg"
        >
          <span className="text-sm font-bold uppercase tracking-widest">Enter Pipeline</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* ── Left Column: Action Center ── */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <SmartInboxWidget projects={projects} />
          <GlobalTodoWidget
            projects={projects}
            onNavigateToDeal={handleNavigateToDeal}
          />
        </div>

        {/* ── Center Column: Portfolio Health ── */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          <PortfolioKPIStrip projects={projects} />
          <Suspense fallback={<ChartSkeleton />}>
            <ROIChart projects={projects} />
          </Suspense>
          <MAOGaugeTracker projects={projects} />
        </div>

        {/* ── Right Column: Burn Rate & Active Monitors ── */}
        <div className="col-span-12 lg:col-span-3">
          <BurnRateMonitor projects={projects} />
        </div>
      </div>
    </div>
  );
}
