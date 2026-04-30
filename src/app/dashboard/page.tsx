'use client';

import React, { Suspense, lazy } from 'react';
import { PanelTrack } from '@/components/dashboard/HorizontalPanelShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/* ─── Panel Content Imports ─── */
import PipelinePanel from './panels/PipelinePanel';
import EvaluationPanel from './panels/EvaluationPanel';
import ClosingPanel from './panels/ClosingPanel';
import EnginePanel from './panels/EnginePanel';
import ExitPanel from './panels/ExitPanel';
import RehabPanel from './panels/RehabPanel';
import FindAndFundPanel from './panels/FindAndFundPanel';

import { useUIStore } from '@/store/uiStore';
import KanbanView from '@/components/dashboard/kanban/KanbanView';
import { LayoutGrid, Kanban as KanbanIcon, Home } from 'lucide-react';

/* ─── Lazy-load Dashboard Home for code-splitting ─── */
const DashboardHome = lazy(() => import('@/components/dashboard/home/DashboardHome'));

function PanelFallback() {
  return (
    <div className="flex h-screen w-full flex-col bg-bg-primary p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="h-10 w-48 animate-shimmer rounded bg-pw-border/20" />
        <div className="h-10 w-32 animate-shimmer rounded-full bg-pw-border/20" />
      </div>
      <div className="grid grid-cols-12 gap-8 flex-1">
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="h-64 animate-shimmer rounded-xl bg-bg-surface border border-border-accent/10" />
          <div className="h-64 animate-shimmer rounded-xl bg-bg-surface border border-border-accent/10" />
        </div>
        <div className="col-span-12 lg:col-span-6 space-y-6">
          <div className="h-32 animate-shimmer rounded-xl bg-bg-surface border border-border-accent/10" />
          <div className="h-96 animate-shimmer rounded-xl bg-bg-surface border border-border-accent/10" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <div className="h-full animate-shimmer rounded-xl bg-bg-surface border border-border-accent/10" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { viewMode, setViewMode } = useUIStore();

  const viewButtons: { mode: typeof viewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'HOME',           label: 'Home',           icon: <Home className="w-3 h-3 mr-2" aria-hidden="true" /> },
    { mode: 'COMMAND_CENTER', label: 'Command Center',  icon: <LayoutGrid className="w-3 h-3 mr-2" aria-hidden="true" /> },
    { mode: 'KANBAN',         label: 'Deep Focus',      icon: <KanbanIcon className="w-3 h-3 mr-2" aria-hidden="true" /> },
  ];

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Global View Toggle — 3 modes */}
      <div
        role="group"
        aria-label="Dashboard view mode"
        className="fixed bottom-4 right-4 md:bottom-8 md:right-auto md:left-8 z-[60] flex items-center bg-black/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl"
      >
        {viewButtons.map(btn => (
          <button
            key={btn.mode}
            onClick={() => setViewMode(btn.mode)}
            aria-pressed={viewMode === btn.mode}
            aria-label={`Switch to ${btn.label} view`}
            className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
              viewMode === btn.mode
                ? 'bg-bg-surface text-text-primary'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {btn.icon}
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* ── View Router ── */}
      {viewMode === 'HOME' ? (
        <ErrorBoundary name="Dashboard Home">
          <Suspense fallback={<PanelFallback />}>
            <DashboardHome />
          </Suspense>
        </ErrorBoundary>
      ) : viewMode === 'KANBAN' ? (
        <ErrorBoundary name="Kanban View">
          <Suspense fallback={<PanelFallback />}>
            <KanbanView />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <ErrorBoundary name="Command Center">
          <Suspense fallback={<PanelFallback />}>
            <PanelTrack headerHeight={64}>
              <ErrorBoundary name="Find & Fund Hub">
                <FindAndFundPanel />
              </ErrorBoundary>
              <ErrorBoundary name="Acquisition Pipeline">
                <PipelinePanel />
              </ErrorBoundary>
              <ErrorBoundary name="Due Diligence Evaluation">
                <EvaluationPanel />
              </ErrorBoundary>
              <ErrorBoundary name="Closing Room">
                <ClosingPanel />
              </ErrorBoundary>
              <ErrorBoundary name="Hold & Rehab">
                <RehabPanel />
              </ErrorBoundary>
              <ErrorBoundary name="Operational Engine">
                <EnginePanel />
              </ErrorBoundary>
              <ErrorBoundary name="Exit Strategy Hub">
                <ExitPanel />
              </ErrorBoundary>
            </PanelTrack>
          </Suspense>
        </ErrorBoundary>
      )}
    </main>
  );
}
