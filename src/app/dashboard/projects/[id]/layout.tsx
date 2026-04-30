'use client';

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/projects';
import type { Project, PhaseStatus } from '@/types/schema';
import {
  ArrowLeft,
  FolderOpen,
  MapPin,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  PhaseProgressTracker,
  PhaseProgressTrackerSkeleton,
} from '@/components/project/PhaseProgressTracker';
import { ProjectPipelineProvider } from '@/context/ProjectPipelineContext';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/layout.tsx
   Universal Project Workspace Shell

   This layout wraps ALL phase routes under a single project.
   It provides:
     • A sticky focused top-bar (address + phase + exit)
     • Phase navigation tabs (Phase 1 → Phase 4)
     • A shared ProjectWorkspaceContext so child pages can
       read the project record without re-fetching

   Layout architecture:
   ┌────────────────────────────────────────────────────────────┐
   │  WORKSPACE TOP-BAR                                         │
   │  [← Projects]  [📁 Address]  [Phase pill]  [Phase nav]  [✕]│
   ├────────────────────────────────────────────────────────────┤
   │  {children}  (phase-1 / phase-2 / phase-3 / phase-4 page) │
   └────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════ */

/* ─── Types ─────────────────────────────────────────────────── */
interface WorkspaceContextValue {
  project: Project | null;
  loading: boolean;
  refresh: () => void;
}

/* ─── Shared Context ─────────────────────────────────────────── */
const WorkspaceContext = createContext<WorkspaceContextValue>({
  project: null,
  loading: true,
  refresh: () => {},
});

export function useWorkspaceProject() {
  return useContext(WorkspaceContext);
}

/* PHASE_TABS removed — PhaseProgressTracker owns all phase navigation */

/* ─── Phase pill color ───────────────────────────────────────── */
const PHASE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Phase 1: Find & Fund':       { bg: 'rgba(89,89,89,0.12)',  text: '#595959' },
  'Phase 2: Acquisition':       { bg: 'rgba(37,99,235,0.10)', text: '#1D4ED8' },
  'Phase 3: Holding & Rehab':   { bg: 'rgba(234,88,12,0.10)', text: '#C2410C' },
  'Phase 4: Closing & Exit':    { bg: 'rgba(89,89,89,0.12)',  text: '#595959' },
};

/* ─── Phase-aware folder icon color ──────────────────────────── */
const PHASE_FOLDER_COLORS: Record<string, { bg: string; icon: string }> = {
  'Phase 1: Find & Fund':       { bg: '#595959', icon: '#FFFFFF' },
  'Phase 2: Acquisition':       { bg: '#595959', icon: '#FFFFFF' },
  'Phase 3: Holding & Rehab':   { bg: '#CCCCCC', icon: '#595959' },
  'Phase 4: Closing & Exit':    { bg: '#595959', icon: '#FFFFFF' },
};

/* ─── Status badge ───────────────────────────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Active':           { bg: '#DCFCE7', text: '#15803D' },
  'Lead':             { bg: '#FEF9C3', text: '#854D0E' },
  'Under Contract':   { bg: '#DBEAFE', text: '#1D4ED8' },
  'Renovating':       { bg: '#FED7AA', text: '#C2410C' },
  'Listed':           { bg: '#EDE9FE', text: '#6D28D9' },
  'Sold':             { bg: '#F3F4F6', text: '#374151' },
  'Rented':           { bg: '#CFFAFE', text: '#0E7490' },
};

/* ─── Skeleton while loading ─────────────────────────────────── */
function WorkspaceHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-40 flex flex-col" style={{ background: 'var(--bg-surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Row 1: breadcrumb bar skeleton */}
      <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderBottom: '1px solid var(--border-ui)' }}>
        <div className="h-6 w-24 animate-shimmer rounded-lg" />
        <div className="flex-1" />
        <div className="h-5 w-16 animate-shimmer rounded-full" />
        <div className="h-6 w-14 animate-shimmer rounded-lg" />
      </div>
      {/* Row 2: identity skeleton */}
      <div className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--border-ui)' }}>
        <div className="w-9 h-9 animate-shimmer rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-48 animate-shimmer rounded" />
          <div className="h-3 w-64 animate-shimmer rounded" />
        </div>
      </div>
      {/* Phase tracker skeleton */}
      <PhaseProgressTrackerSkeleton />
    </div>
  );
}

/* ─── High Stress Counter ────────────────────────────────────── */
function HighStressCounter({ acquisitionDate }: { acquisitionDate: string | Date }) {
  const [timeHeld, setTimeHeld] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const acqDate = new Date(acquisitionDate).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, now - acqDate);
      
      setTimeHeld({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [acquisitionDate]);

  return (
    <div className="bg-[#B91C1C] text-white w-full py-1.5 px-4 flex flex-col md:flex-row justify-center items-center md:gap-6 shadow-[inset_0_-4px_0_rgba(153,27,27,1)] border-b border-red-900 z-50">
      <div className="flex items-center gap-2 mb-1 md:mb-0">
        <div className="w-2 h-2 rounded-full bg-red-400 animate-ping"></div>
        <span className="font-bold tracking-[0.2em] text-[10px] uppercase text-red-200">
          Holding Costs Accumulating
        </span>
      </div>
      
      <div className="flex items-baseline gap-1.5 font-mono text-shadow-sm">
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-2xl md:text-3xl font-black text-white">{timeHeld.days.toString().padStart(2, '0')}</span>
          <span className="text-[8px] uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Days</span>
        </div>
        <span className="text-xl md:text-2xl font-bold text-red-400 -mt-3">:</span>
        <div className="flex flex-col items-center min-w-[2.5rem]">
          <span className="text-2xl md:text-3xl font-black text-red-50">{timeHeld.hours.toString().padStart(2, '0')}</span>
          <span className="text-[8px] uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Hrs</span>
        </div>
        <span className="text-xl md:text-2xl font-bold text-red-400 -mt-3">:</span>
        <div className="flex flex-col items-center min-w-[2.5rem]">
          <span className="text-2xl md:text-3xl font-black text-red-100">{timeHeld.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[8px] uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Min</span>
        </div>
        <span className="text-xl md:text-2xl font-bold text-red-400 -mt-3">:</span>
        <div className="flex flex-col items-center min-w-[2.5rem]">
          <span className="text-2xl md:text-3xl font-black text-red-200">{timeHeld.seconds.toString().padStart(2, '0')}</span>
          <span className="text-[8px] uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Sec</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Workspace Header (loaded state) ───────────────────────── */
function WorkspaceHeader({ project }: { project: Project }) {
  const router = useRouter();

  const phaseColor  = PHASE_BADGE_COLORS[project.phaseStatus ?? ''] ?? PHASE_BADGE_COLORS['Phase 1: Find & Fund'];
  const statusColor = STATUS_COLORS[project.status] ?? { bg: '#F3F4F6', text: '#595959' };
  const folderColor = PHASE_FOLDER_COLORS[project.phaseStatus ?? ''] ?? PHASE_FOLDER_COLORS['Phase 1: Find & Fund'];

  // Only show the active counter if we have an acquisition date and the project hasn't been sold/closed
  const isHolding = project.financials?.acquisitionDate && 
                    !['Sold', 'Rented', 'closed_won', 'closed_lost'].includes(project.status);

  return (
    <div
      className="sticky top-0 z-40 flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        boxShadow:  '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── High-Stress Counter ── */}
      {isHolding && project.financials?.acquisitionDate && (
        <HighStressCounter acquisitionDate={project.financials.acquisitionDate} />
      )}

      {/* ── Row 1: Breadcrumb + status pills + exit ── */}
      <div
        className="flex items-center gap-3 px-5 py-2.5"
        style={{ borderBottom: '1px solid var(--border-ui)' }}
      >
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-150 hover:bg-[#F2F2F2]"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-ui)' }}
          aria-label="Back to all projects"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={2.5} />
          Projects
        </button>

        <ChevronRight className="w-3 h-3 shrink-0" style={{ color: 'var(--border-ui)', opacity: 0.6 }} strokeWidth={2} />

        <span
          className="text-[10px] font-bold uppercase tracking-[0.12em] truncate max-w-[200px]"
          style={{ color: 'var(--text-primary)' }}
        >
          {project.propertyName}
        </span>

        <div className="flex-1" />

        {/* Phase status pill */}
        <span
          className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] shrink-0"
          style={{ background: phaseColor.bg, color: phaseColor.text }}
        >
          {project.phaseStatus ?? 'Phase 1: Find & Fund'}
        </span>

        {/* Deal status pill */}
        <span
          className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] shrink-0"
          style={{ background: statusColor.bg, color: statusColor.text }}
        >
          {project.status}
        </span>

        {/* Exit button */}
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-150 hover:bg-red-50 hover:border-red-200 group"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-ui)' }}
          aria-label="Exit project workspace"
        >
          <X className="w-3 h-3 group-hover:text-red-500 transition-colors" strokeWidth={2.5} />
          <span className="hidden sm:inline group-hover:text-red-500 transition-colors">Exit</span>
        </button>
      </div>

      {/* ── Row 2: Property identity block ── */}
      <div
        className="flex items-center gap-4 px-5 py-3"
        style={{ borderBottom: '1px solid var(--border-ui)' }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300"
          style={{ background: folderColor.bg }}
        >
          <FolderOpen className="w-4 h-4" style={{ color: folderColor.icon }} strokeWidth={2} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
            {project.propertyName}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--text-secondary)' }} strokeWidth={2} />
            <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
              {project.address}
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 3: Phase Progress Tracker (stepper) ── */}
      <PhaseProgressTracker
        phaseStatus={project.phaseStatus}
        projectId={project.id}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Root Layout Export
   ═══════════════════════════════════════════════════════════════ */
export default function ProjectWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params    = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const deal = await projectsService.getDeal(projectId);
      setProject(deal ?? null);
    } catch (err) {
      console.error('[WorkspaceLayout] Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return (
    <WorkspaceContext.Provider value={{ project, loading, refresh: fetchProject }}>
      {/* Full-screen focused workspace container */}
      <div
        className="flex flex-col min-h-full"
        style={{ background: 'var(--bg-canvas)' }}
      >
        {/* ── Workspace Header Shell ── */}
        {loading || !project ? (
          <WorkspaceHeaderSkeleton />
        ) : (
          <WorkspaceHeader project={project} />
        )}

        {/* ── Phase Content wrapped in Pipeline Context ── */}
        {/* ProjectPipelineProvider must be inside WorkspaceContext.Provider
            so it can call useWorkspaceProject() to piggy-back on the
            already-fetched project without an extra Firestore round-trip. */}
        <div className="flex-1 min-h-0">
          <ProjectPipelineProvider>
            {children}
          </ProjectPipelineProvider>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
