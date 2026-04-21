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
    <div className="flex h-screen w-full items-center justify-center bg-pw-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-48 animate-pulse rounded-full bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
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
        className="fixed bottom-8 left-8 z-[60] flex items-center bg-black/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl"
      >
        {viewButtons.map(btn => (
          <button
            key={btn.mode}
            onClick={() => setViewMode(btn.mode)}
            aria-pressed={viewMode === btn.mode}
            aria-label={`${btn.label} view`}
            className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              viewMode === btn.mode
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {btn.icon}
            {btn.label}
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
              <FindAndFundPanel />
              <PipelinePanel />
              <EvaluationPanel />
              <ClosingPanel />
              <RehabPanel />
              <EnginePanel />
              <ExitPanel />
            </PanelTrack>
          </Suspense>
        </ErrorBoundary>
      )}
    </main>
  );
}
