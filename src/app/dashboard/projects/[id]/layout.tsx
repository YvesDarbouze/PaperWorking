'use client';

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/projects';
import type { Project, PhaseStatus } from '@/types/schema';
import {
  ArrowLeft,
  Briefcase,
  FolderOpen,
  MapPin,
  ChevronRight,
  X,
  Settings,
  FileDown,
  Share2,
  Archive,
  ListChecks,
} from 'lucide-react';
import { PhaseTodoList } from '@/components/projects/PhaseTodoList';
import { RetrospectiveWorkspace } from '@/components/project/RetrospectiveWorkspace';
import {
  PhaseProgressTracker,
  PhaseProgressTrackerSkeleton,
} from '@/components/project/PhaseProgressTracker';
import { ProjectPipelineProvider } from '@/context/ProjectPipelineContext';
import { usePropertyMetricSnapshots } from '@/hooks/usePropertyMetricSnapshots';
import { MetricDrillDownSheet } from '@/components/insights/MetricDrillDownSheet';
import {
  deriveAllMetrics,
  MetricResult,
} from '@/lib/metrics';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/layout.tsx
   Universal Project Workspace Shell (REIL v2 & Prompt 5 Enhanced)

   This layout wraps ALL phase routes under a single project.
   It provides:
     • A 96px sticky focused top-bar with strategy/ownership/time-ago
     • A persistent 80px Project Metric Strip (6 mini KPI cards with sparklines)
     • Right-side actions menu: settings, PDF, CPA share, archive
     • Stepper navigation tabs
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

/* ─── Phase pill color ───────────────────────────────────────── */
const PHASE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Phase 1: Acquisition':       { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
  'Phase 2: Fund':              { bg: 'rgba(59,130,246,0.10)',  text: '#3B82F6' },
  'Phase 3: Hold':              { bg: 'rgba(249,115,22,0.10)',  text: '#F97316' },
  'Phase 4: Exit':              { bg: 'rgba(16,185,129,0.10)',  text: '#10B981' },
};

/* ─── Phase-aware folder icon color ──────────────────────────── */
const PHASE_FOLDER_COLORS: Record<string, { bg: string; icon: string }> = {
  'Phase 1: Acquisition':       { bg: '#F59E0B', icon: '#FFFFFF' },
  'Phase 2: Fund':              { bg: '#3B82F6', icon: '#FFFFFF' },
  'Phase 3: Hold':              { bg: '#F97316', icon: '#FFFFFF' },
  'Phase 4: Exit':              { bg: '#10B981', icon: '#FFFFFF' },
};

/* ─── Status badge ───────────────────────────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'acquisition':   { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
  'fund':          { bg: 'rgba(59,130,246,0.10)',  text: '#3B82F6' },
  'hold':          { bg: 'rgba(249,115,22,0.10)',  text: '#F97316' },
  'exit':          { bg: 'rgba(16,185,129,0.10)',  text: '#10B981' },
};

/* ─── formatTimeAgo Helper ──────────────────────────────────── */
function formatTimeAgo(dateInput: any): string {
  if (!dateInput) return 'recently';
  let date: Date;
  if (dateInput.seconds) {
    date = new Date(dateInput.seconds * 1000);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return 'recently';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Sparkline helper ──────────────────────────────────────── */
function Sparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (data.length < 2) {
    return (
      <svg width="48" height="16" className="overflow-visible opacity-25">
        <line x1="0" y1="8" x2="48" y2="8" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 48;
      const y = 14 - ((val - min) / range) * 12;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="48" height="16" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#454955' : '#F06543'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── fmtValue Helper ───────────────────────────────────────── */
function fmtValue(v: number | null, format: string): string {
  if (v === null) return '—';
  switch (format) {
    case 'currency': {
      const abs = Math.abs(v);
      const sign = v < 0 ? '-' : '';
      if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
      return `${sign}$${abs.toFixed(0)}`;
    }
    case 'percent': return `${v.toFixed(1)}%`;
    case 'ratio': return `${v.toFixed(2)}`;
    case 'all-cash-dscr': return 'N/A — all cash';
    default: return String(v);
  }
}

/* ─── Skeleton while loading ─────────────────────────────────── */
function WorkspaceHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-40 flex flex-col" style={{ background: 'var(--bg-surface)' }}>
      <div className="flex items-center gap-4 px-margin-mobile lg:px-margin-desktop py-2.5" style={{ borderBottom: '1px solid var(--border-ui)' }}>
        <div className="h-6 w-24 animate-shimmer" />
        <div className="flex-1" />
        <div className="h-5 w-16 animate-shimmer" />
        <div className="h-6 w-14 animate-shimmer" />
      </div>
      <div className="flex items-center gap-4 px-margin-mobile lg:px-margin-desktop py-3 h-24" style={{ borderBottom: '1px solid var(--border-ui)' }}>
        <div className="w-10 h-10 animate-shimmer shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-48 animate-shimmer" />
          <div className="h-3 w-64 animate-shimmer" />
        </div>
      </div>
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
    <div className="bg-red-700 text-white w-full py-1.5 px-4 flex flex-col md:flex-row justify-center items-center md:gap-6 border-b-2 border-red-950 z-50">
      <div className="flex items-center gap-2 mb-1 md:mb-0">
        <div className="w-2 h-2 rounded-full bg-red-400 animate-ping"></div>
        <span className="font-bold tracking-widest text-xs uppercase text-red-200">
          Holding Costs Accumulating
        </span>
      </div>
      
      <div className="flex items-baseline gap-1.5 font-mono text-shadow-sm">
        <div className="flex flex-col items-center min-w-12">
          <span className="text-2xl md:text-3xl font-black text-white">{timeHeld.days.toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Days</span>
        </div>
        <span className="text-xl md:text-2xl font-bold text-red-400 -mt-3">:</span>
        <div className="flex flex-col items-center min-w-10">
          <span className="text-2xl md:text-3xl font-black text-red-50">{timeHeld.hours.toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Hrs</span>
        </div>
        <span className="text-xl md:text-2xl font-bold text-red-400 -mt-3">:</span>
        <div className="flex flex-col items-center min-w-10">
          <span className="text-2xl md:text-3xl font-black text-red-100">{timeHeld.minutes.toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Min</span>
        </div>
        <span className="text-xl md:text-2xl font-bold text-red-400 -mt-3">:</span>
        <div className="flex flex-col items-center min-w-10">
          <span className="text-2xl md:text-3xl font-black text-red-200">{timeHeld.seconds.toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-widest text-red-300 font-sans font-bold -mt-1">Sec</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Workspace Header (loaded state) ───────────────────────── */
function WorkspaceHeader({ project, onOpenMetric }: { project: Project; onOpenMetric: (id: string, label: string, result: MetricResult, format: any) => void }) {
  const router = useRouter();
  const { snapshots } = usePropertyMetricSnapshots(project.id, 'monthly');

  const phaseColor  = PHASE_BADGE_COLORS[project.phaseStatus ?? ''] ?? PHASE_BADGE_COLORS['Phase 1: Acquisition'];
  const statusColor = STATUS_COLORS[project.status] ?? { bg: '#F3F4F6', text: '#595959' };
  const folderColor = PHASE_FOLDER_COLORS[project.phaseStatus ?? ''] ?? PHASE_FOLDER_COLORS['Phase 1: Acquisition'];

  // Only show the active counter if we have an acquisition date and the project hasn't been sold/closed
  const isHolding = project.financials?.acquisitionDate && project.status !== 'exit';

  // Strategy chip value
  const strategy = project.dispositionType === 'SALE' ? 'Sell' : (project.dispositionType === 'LEASE' ? 'Lease' : 'Rent');

  // Ownership structure calculation
  let ownershipLabel = 'Solo';
  if (project.fractionalInvestors && project.fractionalInvestors.length > 0) {
    ownershipLabel = 'Co-Invested';
  } else if (project.financials?.ownershipPercentage != null && project.financials.ownershipPercentage < 100) {
    ownershipLabel = `JV (${project.financials.ownershipPercentage}%)`;
  }

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this project?')) return;
    try {
      await projectsService.updateProject(project.id, { status: 'exit' });
      toast.success('Project archived successfully');
      router.push('/dashboard/projects');
    } catch (err) {
      console.error(err);
      toast.error('Failed to archive project');
    }
  };

  // KPIs definitions for the metric strip
  const derived = deriveAllMetrics(
    project.financials ?? {},
    undefined,
    project.dispositionType,
    project.currentPhase
  );

  const state = (() => {
    switch (project.currentPhase) {
      case 1: return 'projected';
      case 2: return 'projected';
      case 3: return 'live';
      case 4: return 'realized';
      default: return 'projected';
    }
  })();

  const wrapResult = (val: number): MetricResult => ({
    value: val,
    state,
    inputsUsed: {},
    inputsMissing: [],
  });

  const metricResults = {
    NOI: wrapResult(derived.noi),
    CASH_FLOW: wrapResult(derived.annualCashFlow),
    CAP_RATE: wrapResult(derived.capRate),
    COC: wrapResult(derived.cashOnCashReturn),
    DSCR: wrapResult(derived.dscr),
    OCCUPANCY: wrapResult(derived.occupancyRate),
    EXPENSE_RATIO: wrapResult(derived.oer),
  };

  const isAllCash = project.financials?.financingType === 'All Cash';

  const METRICS_CONFIG = isAllCash
    ? [
        { id: 'NOI', label: 'NOI', format: 'currency', result: metricResults.NOI },
        { id: 'CASH_FLOW', label: 'Cash Flow', format: 'currency', result: metricResults.CASH_FLOW },
        { id: 'CAP_RATE', label: 'Cap Rate', format: 'percent', result: metricResults.CAP_RATE },
        { id: 'COC', label: 'COC', format: 'percent', result: metricResults.COC },
        { id: 'EXPENSE_RATIO', label: 'Expense Ratio', format: 'percent', result: metricResults.EXPENSE_RATIO },
        { id: 'DSCR', label: 'DSCR', format: 'all-cash-dscr', result: metricResults.DSCR },
        { id: 'OCCUPANCY', label: 'Occupancy', format: 'percent', result: metricResults.OCCUPANCY },
      ]
    : [
        { id: 'NOI', label: 'NOI', format: 'currency', result: metricResults.NOI },
        { id: 'CASH_FLOW', label: 'Cash Flow', format: 'currency', result: metricResults.CASH_FLOW },
        { id: 'CAP_RATE', label: 'Cap Rate', format: 'percent', result: metricResults.CAP_RATE },
        { id: 'COC', label: 'COC', format: 'percent', result: metricResults.COC },
        { id: 'DSCR', label: 'DSCR', format: 'ratio', result: metricResults.DSCR },
        { id: 'EXPENSE_RATIO', label: 'Expense Ratio', format: 'percent', result: metricResults.EXPENSE_RATIO },
        { id: 'OCCUPANCY', label: 'Occupancy', format: 'percent', result: metricResults.OCCUPANCY },
      ];

  return (
    <div
      className="sticky top-0 z-40 flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-ui)'
      }}
    >
      {/* ── High-Stress Counter ── */}
      {isHolding && project.financials?.acquisitionDate && (
        <HighStressCounter acquisitionDate={project.financials.acquisitionDate} />
      )}

      {/* ── Top Header Strip (96px) ── */}
      <div
        className="flex items-center justify-between px-margin-mobile lg:px-margin-desktop py-3 h-24 border-b border-white/5"
        style={{ borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center gap-4 min-w-0 shrink-0">
          <div
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded transition-colors duration-300"
            style={{ background: folderColor.bg }}
          >
            <FolderOpen className="w-5 h-5" style={{ color: folderColor.icon }} strokeWidth={2} aria-hidden="true" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-lg font-bold truncate leading-none text-text-primary">
                {project.propertyName || project.name}
              </h2>
              <span className="text-xs font-medium truncate text-text-secondary">
                {project.address}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Phase chip */}
              <span
                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: phaseColor.bg, color: phaseColor.text }}
              >
                {project.phaseStatus ?? 'Phase 1: Acquisition'}
              </span>
              
              {/* Strategy chip */}
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-[#454955]/10 text-[#6E7480] border-[#454955]/20">
                {strategy}
              </span>
              
              {/* Ownership chip */}
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                {ownershipLabel}
              </span>
              
              {/* State pill */}
              <span
                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded"
                style={{ background: statusColor.bg, color: statusColor.text }}
              >
                {project.status}
              </span>

              {/* Timestamp */}
              <span className="text-[10px] text-text-secondary ml-1" style={{ color: 'var(--text-secondary)' }}>
                Last updated {formatTimeAgo(project.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Right-side Action Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              toast.success('Opening settings...');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 border rounded-lg text-text-secondary hover:text-text-primary"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
            aria-label="Edit project settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Settings</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 border rounded-lg text-text-secondary hover:text-text-primary"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
            aria-label="Export project as PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export PDF</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('CPA Share link copied to clipboard!');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 border rounded-lg text-text-secondary hover:text-text-primary"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
            aria-label="Share with CPA"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Share CPA</span>
          </button>

          <a
            href={`/dashboard/projects/${project.id}/data-room`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 border rounded-lg text-text-secondary hover:text-text-primary"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
            aria-label="Manage Project Data Room"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Data Room</span>
          </a>

          <a
            href={`/dashboard/projects/${project.id}/instruments`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 border rounded-lg text-text-secondary hover:text-text-primary"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
            aria-label="Manage Ingestion Instruments"
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Instruments</span>
          </a>

          <a
            href="/dashboard/marketplace"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 border rounded-lg text-text-secondary hover:text-text-primary"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-ui)' }}
            aria-label="Hire a professional"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Hire Professional</span>
          </a>

          <button
            onClick={handleArchive}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 border rounded-lg text-red-500 hover:bg-red-500/10"
            style={{ borderColor: 'rgba(239,68,68,0.2)' }}
            aria-label="Archive project"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Archive</span>
          </button>
        </div>
      </div>

      {/* ── Row 3: Phase Progress Tracker (stepper) ── */}
      {!project.retrospective && (
        <PhaseProgressTracker
          phaseStatus={project.phaseStatus}
          projectId={project.id}
        />
      )}

      {/* ── Row 4: Persistent Metric Strip (~80px) ── */}
      {!project.retrospective && (
        <div
          className="flex items-center gap-4 px-margin-mobile lg:px-margin-desktop py-2.5 h-[80px] overflow-x-auto select-none no-scrollbar"
          style={{
            borderBottom: '1px solid var(--border-ui)',
            backgroundColor: 'rgba(255,255,255,0.01)',
          }}
        >
          {METRICS_CONFIG.map((cfg) => {
            const isNa = cfg.result.state === 'n/a';
            const isIncomplete = cfg.result.state === 'incomplete';
            
            // Historical values for sparkline (last 6 periods)
            const sparklineValues = snapshots.slice(-6).map((s) => {
              switch (cfg.id) {
                case 'NOI': return s.noi ?? 0;
                case 'CASH_FLOW': return s.monthlyCashFlow ?? 0;
                case 'CAP_RATE': return s.capRate ?? 0;
                case 'COC': return s.cashOnCashReturn ?? 0;
                case 'DSCR': return s.dscr ?? 0;
                case 'OCCUPANCY': return s.occupancyRate ?? 0;
                default: return 0;
              }
            });

            const isUp = sparklineValues.length >= 2 
              ? sparklineValues[sparklineValues.length - 1] >= sparklineValues[sparklineValues.length - 2]
              : true;

            const displayState = isNa ? 'n/a' : isIncomplete ? 'incomplete' : cfg.result.state;

            const statePillStyle: React.CSSProperties = (() => {
              if (displayState === 'live') return { background: 'rgba(63, 125, 32,0.15)', color: '#3f7d20' };
              if (displayState === 'projected') return { background: 'rgba(245,158,11,0.15)', color: '#F59E0B' };
              if (displayState === 'realized') return { background: 'rgba(59,130,246,0.15)', color: '#3B82F6' };
              return { background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' };
            })();

            return (
              <button
                key={cfg.id}
                onClick={() => onOpenMetric(cfg.id, cfg.label, cfg.result, cfg.format)}
                className="flex-1 min-w-[140px] max-w-[200px] h-full rounded border p-3 flex flex-col justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left relative group outline-none"
                style={{
                  borderColor: 'var(--border-ui)',
                  background: 'var(--bg-surface)'
                }}
              >
                {/* Metric title & state badge */}
                <div className="flex justify-between items-center w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary" style={{ color: 'var(--text-secondary)' }}>
                    {cfg.label}
                  </span>
                  <span
                    className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5"
                    style={statePillStyle}
                  >
                    {displayState}
                  </span>
                </div>

                {/* Value & Sparkline row */}
                <div className="flex items-baseline justify-between w-full mt-1.5">
                  <span className="text-[20px] font-black leading-none text-text-primary tracking-tight font-mono tabular-nums">
                    {fmtValue(cfg.result.value, cfg.format)}
                  </span>

                  {/* SVG Sparkline */}
                  <div className="shrink-0 ml-2 group-hover:scale-105 transition-transform duration-200">
                    <Sparkline data={sparklineValues} isUp={isUp} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Phase accent colors ──────────────────────────────────────────────────────
// Maps project.currentPhase (1–4) to a subtle tinted canvas background and
// the accent color used in the todo panel and phase indicators.

const PHASE_ACCENT: Record<number, { color: string; canvasTint: string; label: string }> = {
  1: { color: "#454955", canvasTint: "rgba(69,73,85,0.06)",    label: "Acquisition" },
  2: { color: "#7A9EAA", canvasTint: "rgba(122,158,170,0.06)", label: "Fund"        },
  3: { color: "#ffac5a", canvasTint: "rgba(255,172,90,0.06)",  label: "Hold"        },
  4: { color: "var(--pw-success)", canvasTint: "var(--pw-success-container)",   label: "Exit"        },
};

/* ─── Root Layout Export ────────────────────────────────────── */
export default function ProjectWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params    = useParams();
  const projectId = params?.id as string;
  console.log('[WorkspaceLayout] Rendering with projectId:', projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [todoOpen, setTodoOpen] = useState(false);

  // Drill-down side sheet state
  const [selectedMetric, setSelectedMetric] = useState<{
    id: string;
    label: string;
    result: MetricResult;
    format: 'currency' | 'percent' | 'ratio' | 'multiplier';
  } | null>(null);

  const fetchProject = useCallback(async () => {
    console.log('[WorkspaceLayout] fetchProject callback executing, projectId:', projectId);
    if (!projectId) return;
    try {
      const deal = await projectsService.getProject(projectId);
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

  const handleOpenMetric = (id: string, label: string, result: MetricResult, format: any) => {
    setSelectedMetric({ id, label, result, format });
  };

  const { snapshots } = usePropertyMetricSnapshots(projectId, 'monthly');

  const phase       = project?.currentPhase ?? 1;
  const phaseAccent = PHASE_ACCENT[Math.min(Math.max(phase, 1), 4) as 1 | 2 | 3 | 4];

  return (
    <WorkspaceContext.Provider value={{ project, loading, refresh: fetchProject }}>
      <div
        className="flex flex-col min-h-full relative"
        style={{
          // Subtle phase-tinted canvas — radial glow from top-left + base surface
          background: `radial-gradient(ellipse 80% 50% at 0% 0%, ${phaseAccent.canvasTint} 0%, transparent 65%), var(--bg-canvas)`,
        }}
      >
        {/* Workspace Header Shell */}
        {loading || !project ? (
          <WorkspaceHeaderSkeleton />
        ) : (
          <WorkspaceHeader project={project} onOpenMetric={handleOpenMetric} />
        )}

        {/* Phase Content + optional Todo sidebar */}
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0">
            <ProjectPipelineProvider>
              {project?.retrospective && !project?.financials?.retrospectiveCompleted ? (
                <RetrospectiveWorkspace
                  project={project}
                  refresh={async () => {
                    await fetchProject();
                  }}
                />
              ) : (
                children
              )}
            </ProjectPipelineProvider>
          </div>

          {/* ── Phase Todo Panel (collapsible right sidebar) ── */}
          {todoOpen && project && !project.retrospective && (
            <div
              className="hidden lg:flex flex-col w-[320px] flex-shrink-0 overflow-y-auto"
              style={{
                borderLeft: `1px solid ${phaseAccent.color}18`,
                background: `rgba(8,14,19,0.70)`,
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-5 py-4 sticky top-0"
                style={{
                  borderBottom: `1px solid ${phaseAccent.color}20`,
                  background: `rgba(8,14,19,0.90)`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: phaseAccent.color }}
                  />
                  <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.55)", letterSpacing: "0.08em" }}>
                    {phaseAccent.label} Checklist
                  </span>
                </div>
                <button
                  onClick={() => setTodoOpen(false)}
                  className="flex items-center justify-center w-6 h-6 rounded-md transition-opacity hover:opacity-70"
                  style={{ color: "rgba(253,255,252,0.35)" }}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Panel body */}
              <div className="px-5 py-5">
                <PhaseTodoList
                  phase={phase}
                  phaseColor={phaseAccent.color}
                  projectId={project.id}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Floating todo toggle button ── */}
        {project && !todoOpen && (
          <button
            onClick={() => setTodoOpen(true)}
            className="hidden lg:flex fixed right-6 bottom-8 items-center gap-2 px-4 py-2.5 rounded-xl z-30 shadow-xl transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
            style={{
              background: phaseAccent.color,
              color: "#FDFFFC",
              boxShadow: `0 8px 24px ${phaseAccent.color}40`,
            }}
            aria-label="Open phase checklist"
          >
            <ListChecks className="w-4 h-4" />
            <span className="text-[12px] font-semibold">{phaseAccent.label} Checklist</span>
          </button>
        )}

        {/* Metric Insights Drill Down Side Sheet */}
        {selectedMetric && (
          <MetricDrillDownSheet
            isOpen={!!selectedMetric}
            onClose={() => setSelectedMetric(null)}
            metricId={selectedMetric.id}
            metricLabel={selectedMetric.label}
            result={selectedMetric.result}
            format={selectedMetric.format}
            sparklineData={snapshots.slice(-6).map((s) => {
              let val = 0;
              switch (selectedMetric.id) {
                case 'NOI': val = s.noi ?? 0; break;
                case 'CASH_FLOW': val = s.monthlyCashFlow ?? 0; break;
                case 'CAP_RATE': val = s.capRate ?? 0; break;
                case 'COC': val = s.cashOnCashReturn ?? 0; break;
                case 'DSCR': val = s.dscr ?? 0; break;
                case 'OCCUPANCY': val = s.occupancyRate ?? 0; break;
              }
              return { date: s.period, value: val };
            })}
          />
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
