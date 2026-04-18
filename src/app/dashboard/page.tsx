'use client';

import React, { Suspense } from 'react';
import { PanelTrack } from '@/components/dashboard/HorizontalPanelShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/* ─── Panel Content Imports ─── */
import PipelinePanel from './panels/PipelinePanel';
import EvaluationPanel from './panels/EvaluationPanel';
import ClosingPanel from './panels/ClosingPanel';
import EnginePanel from './panels/EnginePanel';
import ExitPanel from './panels/ExitPanel';

import { useUIStore } from '@/store/uiStore';
import KanbanView from '@/components/dashboard/kanban/KanbanView';
import { LayoutGrid, Kanban as KanbanIcon } from 'lucide-react';

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

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Global View Toggle */}
      <div
        role="group"
        aria-label="Dashboard view mode"
        className="fixed bottom-8 left-8 z-[60] flex items-center bg-black/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl"
      >
        <button
          onClick={() => setViewMode('COMMAND_CENTER')}
          aria-pressed={viewMode === 'COMMAND_CENTER'}
          aria-label="Command Center view"
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            viewMode === 'COMMAND_CENTER'
              ? 'bg-white text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-3 h-3 mr-2" aria-hidden="true" />
          Command Center
        </button>
        <button
          onClick={() => setViewMode('KANBAN')}
          aria-pressed={viewMode === 'KANBAN'}
          aria-label="Deep Focus Kanban view"
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            viewMode === 'KANBAN'
              ? 'bg-white text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <KanbanIcon className="w-3 h-3 mr-2" aria-hidden="true" />
          Deep Focus
        </button>
      </div>

      {viewMode === 'KANBAN' ? (
        <ErrorBoundary name="Kanban View">
          <Suspense fallback={<PanelFallback />}>
            <KanbanView />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <ErrorBoundary name="Command Center">
          <Suspense fallback={<PanelFallback />}>
            <PanelTrack headerHeight={64}>
              <PipelinePanel />
              <EvaluationPanel />
              <ClosingPanel />
              <EnginePanel />
              <ExitPanel />
            </PanelTrack>
          </Suspense>
        </ErrorBoundary>
      )}
    </main>
  );
}
