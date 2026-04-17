'use client';

import React from 'react';
import { PanelTrack } from '@/components/dashboard/HorizontalPanelShell';

/* ─── Panel Content Imports ─── */
import PipelinePanel from './panels/PipelinePanel';
import EvaluationPanel from './panels/EvaluationPanel';
import ClosingPanel from './panels/ClosingPanel';
import EnginePanel from './panels/EnginePanel';
import ExitPanel from './panels/ExitPanel';

/* ═══════════════════════════════════════════════════════
   Dashboard Page — PanelTrack with 5 Kanban Lanes

   The PanelProvider lives in layout.tsx so header/overlay
   components share context. This page just renders the
   draggable track with each full-viewport lane panel.
   ═══════════════════════════════════════════════════════ */

import { useUIStore } from '@/store/uiStore';
import KanbanView from '@/components/dashboard/kanban/KanbanView';
import { LayoutGrid, Kanban as KanbanIcon } from 'lucide-react';

export default function DashboardPage() {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Global View Toggle Floating Button */}
      <div className="fixed bottom-8 left-8 z-[60] flex items-center bg-black/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl">
        <button
          onClick={() => setViewMode('COMMAND_CENTER')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            viewMode === 'COMMAND_CENTER' 
              ? 'bg-white text-black' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-3 h-3 mr-2" />
          Command Center
        </button>
        <button
          onClick={() => setViewMode('KANBAN')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            viewMode === 'KANBAN' 
              ? 'bg-white text-black' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <KanbanIcon className="w-3 h-3 mr-2" />
          Deep Focus
        </button>
      </div>

      {viewMode === 'KANBAN' ? (
        <KanbanView />
      ) : (
        <PanelTrack headerHeight={64}>
          {/* ── Lane 0: Deal Pipeline (Home) ── */}
          <PipelinePanel />

          {/* ── Lane 1: Capital & Evaluation ── */}
          <EvaluationPanel />

          {/* ── Lane 2: The Closing Room ── */}
          <ClosingPanel />

          {/* ── Lane 3: The Engine Room ── */}
          <EnginePanel />

          {/* ── Lane 4: The Exit Hub ── */}
          <ExitPanel />
        </PanelTrack>
      )}
    </main>
  );
}
