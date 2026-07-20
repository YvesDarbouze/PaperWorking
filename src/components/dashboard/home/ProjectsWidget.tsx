'use client';

import React, { useMemo } from 'react';
import { Folder, Plus } from 'lucide-react';
import { Project } from '@/types/schema';
import { computePhaseProgress } from '@/lib/utils/projectProgress';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useRouter } from 'next/navigation';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

interface ProjectsWidgetProps {
  projects: Project[];
  onCreateProject: () => void;
  isGuest: boolean;
}

/* ── Phase color mapping (matches Stitch/page.tsx design) ── */
const PHASE_COLORS: Record<number, { border: string; bg: string; text: string; label: string }> = {
  1: { border: 'border-l-primary',            bg: 'bg-primary/20',            text: 'text-primary',            label: 'Acquisition' },
  2: { border: 'border-l-secondary',          bg: 'bg-secondary/20',          text: 'text-secondary',          label: 'Fund' },
  3: { border: 'border-l-tertiary-container',  bg: 'bg-tertiary-container/20', text: 'text-tertiary-container', label: 'Hold' },
  4: { border: 'border-l-primary-container',   bg: 'bg-primary-container/20',  text: 'text-primary-container',  label: 'Exit' },
};

function getPhaseConfig(phase?: number) {
  return PHASE_COLORS[phase ?? 1] ?? PHASE_COLORS[1];
}

/* ── Headline metric per strategy type ── */
function getHeadlineMetric(
  project: Project,
  metrics: ReturnType<typeof deriveAllMetrics>
): { label: string; value: string } {
  const strategy = project.dispositionType === 'RENT'
    ? (project.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
    : (project.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip');
  const fin = project.financials;

  if (strategy === 'Sell' || strategy === 'Fix & Flip') {
    // For flips: show estimated ROI
    const totalInvested = metrics.totalCashInvested || 1;
    const arv = fin?.estimatedCurrentValue ?? fin?.estimatedARV ?? fin?.arv ?? 0;
    const roi = totalInvested > 0 ? ((arv - totalInvested) / totalInvested) * 100 : 0;
    return { label: 'Est. ROI', value: `${roi.toFixed(0)}%` };
  }

  if (strategy === 'Rent' || strategy === 'Buy & Hold') {
    // For rentals: show Cash-on-Cash or Net Yield
    const coc = metrics.cashOnCashReturn ?? 0;
    return { label: 'Net Yield', value: `${(coc * 100).toFixed(1)}%` };
  }

  // Fallback: show Cap Rate
  const capRate = metrics.capRate ?? 0;
  return { label: 'Cap Rate', value: `${(capRate * 100).toFixed(1)}%` };
}

/* ── Phase progress baseline calculation ── */
function getPhaseProgress(project: Project): number {
  const phase = project.currentPhase ?? 1;
  const status = project.status;

  const progressMap: Record<string, number> = {
    acquisition: 25,
    fund: 50,
    hold: 75,
    exit: 100,
  };
  return progressMap[status] ?? (phase * 25);
}

/* ── Strategy display label ── */
function getStrategyLabel(strategy?: string): string {
  const map: Record<string, string> = {
    'Sell': 'FLIP',
    'Fix & Flip': 'FLIP',
    'Rent': 'HOLD',
    'Buy & Hold': 'BRRRR',
    'Wholesale': 'WHOLESALE',
  };
  return map[strategy ?? ''] ?? (strategy ? strategy.toUpperCase() : 'MIXED');
}

/* ── Extract state abbreviation from address ── */
function getStateFromAddress(address?: string): string {
  if (!address) return '';
  const match = address.match(/,\s*([A-Z]{2})\s/);
  if (match) return match[1];
  const parts = address.split(/\s+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^[A-Z]{2}$/.test(parts[i])) return parts[i];
  }
  return '';
}

/* ── FolderCard component for asymmetric grid items ── */
function FolderCard({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  const phaseConfig = getPhaseConfig(project.currentPhase);
  const metrics = useMemo(
    () =>
      deriveAllMetrics(
        project.financials,
        project.financials?.estimatedCurrentValue,
        project.dispositionType,
        project.currentPhase,
        project.createdAt
      ),
    [project]
  );
  
  const headlineMetric = getHeadlineMetric(project, metrics);
  const ownership = project.financials?.ownershipPercentage ?? 100;
  const progress = computePhaseProgress(project, project.currentPhase || 1) || getPhaseProgress(project);
  const stateAbbr = getStateFromAddress(project.address);
  const strategyLabel = getStrategyLabel(
    project.dispositionType === 'RENT'
      ? (project.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
      : (project.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip')
  );

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col transition-transform duration-300 hover:-translate-y-2 cursor-pointer"
      role="link"
      tabIndex={0}
      aria-label={`View project: ${project.propertyName}`}
    >
      {/* Folder Tab */}
      <div
        className={`h-8 w-32 ${phaseConfig.bg} rounded-t-lg border-t border-l ${phaseConfig.border.replace('border-l-', 'border-')}/30 ml-4`}
        style={{ clipPath: 'polygon(0% 0%, 70% 0%, 85% 100%, 0% 100%)' }}
      />

      {/* Card Body */}
      <div className={`glass-card rounded-xl p-6 border-l-4 ${phaseConfig.border} flex flex-col gap-4 overflow-hidden relative min-h-[220px]`}>
        {/* Phase Badge — top right */}
        <div className="absolute top-0 right-0 p-4">
          <span className={`${phaseConfig.bg.replace('/20', '/10')} ${phaseConfig.text} px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase`}>
            {phaseConfig.label}
          </span>
        </div>

        {/* Property Name + Tags */}
        <div className="flex items-start justify-between mt-4">
          <div>
            <h3 className={`text-[20px] leading-[28px] font-semibold text-on-background group-hover:${phaseConfig.text.replace('text-', '')} transition-colors line-clamp-1`}>
              {project.propertyName || project.address || 'Unnamed Project'}
            </h3>
            <div className="flex gap-2 mt-2">
              <span className="bg-white/5 text-on-surface-variant border border-white/10 px-2 py-0.5 rounded text-[10px] font-medium tracking-[0.05em] uppercase">
                {strategyLabel}
              </span>
              {stateAbbr && (
                <span className="bg-white/5 text-on-surface-variant border border-white/10 px-2 py-0.5 rounded text-[10px] font-medium tracking-[0.05em] uppercase">
                  {stateAbbr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2-col Metric Grid */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[10px] font-medium tracking-[0.05em] text-on-surface-variant uppercase">
              Equity
            </p>
            <p className={`text-[20px] leading-[28px] font-bold ${phaseConfig.text}`}>
              {ownership}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[10px] font-medium tracking-[0.05em] text-on-surface-variant uppercase">
              {headlineMetric.label}
            </p>
            <p className={`text-[20px] leading-[28px] font-bold ${phaseConfig.text}`}>
              {headlineMetric.value}
            </p>
          </div>
        </div>

        {/* Phase Progress Bar */}
        <div className="space-y-2 mt-2">
          <div className="flex justify-between text-[10px] font-medium tracking-[0.05em]">
            <span className="text-on-surface-variant">Phase Progress</span>
            <span className={`font-bold ${phaseConfig.text}`}>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
            <div
              className={`h-full ${phaseConfig.border.replace('border-l-', 'bg-')} luminous-glow transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsWidget({ projects, onCreateProject, isGuest }: ProjectsWidgetProps) {
  // Sync deals from Firestore
  useAllDealsSync();
  const storeProjects = useProjectStore((state) => state.projects);
  const router = useRouter();

  // Primary source of projects is state, fall back to props
  const displayProjects = storeProjects.length > 0 ? storeProjects : projects;
  
  // Filter active projects (exclude closed or sold)
  const activeProjects = useMemo(() => {
    return displayProjects
      .filter((p) => !['Sold', 'closed_won', 'closed_lost'].includes(p.status))
      .slice(0, 3);
  }, [displayProjects]);

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-label-md text-label-md text-on-surface flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
          <Folder className="text-primary w-4 h-4" />
          Active Portfolios
        </h3>
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="text-primary hover:text-primary-fixed-dim text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
        >
          See All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeProjects.map((project) => (
          <FolderCard
            key={project.id}
            project={project}
            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
          />
        ))}

        {!isGuest && activeProjects.length < 3 && (
          <button
            onClick={onCreateProject}
            className="group relative flex flex-col pt-6 h-full text-left transition-transform duration-300 hover:-translate-y-2 cursor-pointer w-full"
          >
            {/* Folder Tab */}
            <div
              className="h-8 w-32 bg-white/5 folder-tab rounded-t-lg border-t border-l border-white/10 ml-4"
              style={{ clipPath: 'polygon(0% 0%, 70% 0%, 85% 100%, 0% 100%)' }}
            />
            {/* Card Body */}
            <div className="glass-card flex-1 relative z-10 rounded-xl flex flex-col items-center justify-center p-8 border-dashed border-2 border-white/10 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all min-h-[220px] w-full">
              <Plus className="w-8 h-8 text-on-surface-variant group-hover:text-primary mb-2" />
              <span className="font-headline-md text-body-md text-on-surface-variant group-hover:text-on-surface font-bold">New Project</span>
            </div>
          </button>
        )}
      </div>

      {activeProjects.length === 0 && (
        <div className="glass-card border-dashed border-2 border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
          <Folder className="w-8 h-8 text-on-surface-variant mb-3" />
          <p className="font-label-md text-label-md text-on-surface-variant mb-4">No active portfolios</p>
          {!isGuest && (
            <button
              onClick={onCreateProject}
              className="bg-white/5 hover:bg-white/10 text-primary border border-primary/20 px-6 py-2 rounded-xl text-[12px] font-semibold transition-all"
            >
              Create Project
            </button>
          )}
        </div>
      )}
    </section>
  );
}
