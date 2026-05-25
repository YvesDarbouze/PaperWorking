'use client';

import { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useRouter } from 'next/navigation';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { Search, Plus, FolderX, SlidersHorizontal, ChevronDown } from 'lucide-react';
import type { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects — Folder Grid (Stitch Schema ed38cf94)

   Glass folder cards with phase-colored tabs, strategy badges,
   live headline metrics, and phase progress indicators.
   Filters: Phase, Strategy, Status, Search, Sort.
   ═══════════════════════════════════════════════════════════════ */

/* ── Phase color mapping (matches Stitch schema exactly) ── */
const PHASE_COLORS: Record<number, { border: string; bg: string; text: string; label: string }> = {
  1: { border: 'border-l-primary',       bg: 'bg-primary/20',       text: 'text-primary',           label: 'Acquisition' },
  2: { border: 'border-l-secondary',     bg: 'bg-secondary/20',     text: 'text-secondary',         label: 'Purchase' },
  3: { border: 'border-l-on-surface-variant', bg: 'bg-on-surface-variant/20', text: 'text-on-surface-variant', label: 'Hold' },
  4: { border: 'border-l-error',         bg: 'bg-error/20',         text: 'text-error',             label: 'Exit' },
};

function getPhaseConfig(phase?: number) {
  return PHASE_COLORS[phase ?? 1] ?? PHASE_COLORS[1];
}

/* ── Headline metric per strategy type ── */
function getHeadlineMetric(
  project: Project,
  metrics: ReturnType<typeof deriveAllMetrics>
): { label: string; value: string } {
  const strategy = project.strategyType;
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

/* ── Phase progress estimation ── */
function getPhaseProgress(project: Project): number {
  const phase = project.currentPhase ?? 1;
  const status = project.status;

  // Status-based progress within phase
  if (status === 'Sold' || status === 'closed_won') return 100;
  if (status === 'Listed') return 85;
  if (status === 'Renovating') return 40;
  if (status === 'Under Contract') return 65;
  if (status === 'Lead') return 15;

  // Phase-based baseline progress
  const baseProgress: Record<number, number> = { 1: 25, 2: 50, 3: 70, 4: 90 };
  return baseProgress[phase] ?? 30;
}

/* ── Format currency ── */
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

/* ── Strategy display label ── */
function getStrategyLabel(strategy?: string): string {
  const map: Record<string, string> = {
    'Sell': 'FLIP',
    'Fix & Flip': 'FLIP',
    'Rent': 'RENTAL',
    'Buy & Hold': 'BRRRR',
  };
  return map[strategy ?? ''] ?? 'MIXED';
}

/* ── Extract state abbreviation from address ── */
function getStateFromAddress(address: string): string {
  // Try to match ", ST " or ", ST\d" pattern
  const match = address.match(/,\s*([A-Z]{2})\s/);
  if (match) return match[1];
  // Try last two-letter word before zip
  const parts = address.split(/\s+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^[A-Z]{2}$/.test(parts[i])) return parts[i];
  }
  return '';
}

/* ══════════════════════════════════════════
   FolderCard — Single project card
   Schema: glass-card + folder tab + phase border
   ══════════════════════════════════════════ */
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
        project.strategyType,
        project.currentPhase,
        project.createdAt
      ),
    [project]
  );
  const headlineMetric = getHeadlineMetric(project, metrics);
  const ownership = project.financials?.ownershipPercentage ?? 100;
  const progress = getPhaseProgress(project);
  const stateAbbr = getStateFromAddress(project.address);
  const strategyLabel = getStrategyLabel(project.strategyType);

  return (
    <div
      className="group relative flex flex-col transition-transform duration-300 hover:-translate-y-2 cursor-pointer"
      onClick={onClick}
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
      <div className={`glass-card rounded-xl p-6 border-l-4 ${phaseConfig.border} flex flex-col gap-4 overflow-hidden relative`}>
        {/* Phase Badge — top right */}
        <div className="absolute top-0 right-0 p-4">
          <span className={`${phaseConfig.bg.replace('/20', '/10')} ${phaseConfig.text} px-3 py-1 rounded-full text-[12px] font-medium tracking-widest uppercase`}>
            {phaseConfig.label}
          </span>
        </div>

        {/* Property Name + Tags */}
        <div className="flex items-start justify-between mt-4">
          <div>
            <h3 className={`text-[24px] leading-[32px] font-semibold text-on-background group-hover:${phaseConfig.text.replace('text-', '')} transition-colors`}>
              {project.propertyName}
            </h3>
            <div className="flex gap-2 mt-2">
              <span className="bg-white/5 text-on-surface-variant border border-white/10 px-2 py-0.5 rounded text-[12px] font-medium tracking-[0.05em] uppercase">
                {strategyLabel}
              </span>
              {stateAbbr && (
                <span className="bg-white/5 text-on-surface-variant border border-white/10 px-2 py-0.5 rounded text-[12px] font-medium tracking-[0.05em] uppercase">
                  {stateAbbr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2-col Metric Grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[12px] font-medium tracking-[0.05em] text-on-surface-variant uppercase">
              Equity
            </p>
            <p className={`text-[24px] leading-[32px] font-semibold ${phaseConfig.text}`}>
              {ownership}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[12px] font-medium tracking-[0.05em] text-on-surface-variant uppercase">
              {headlineMetric.label}
            </p>
            <p className={`text-[24px] leading-[32px] font-semibold ${phaseConfig.text}`}>
              {headlineMetric.value}
            </p>
          </div>
        </div>

        {/* Phase Progress Bar */}
        <div className="space-y-2 mt-2">
          <div className="flex justify-between text-[12px] font-medium tracking-[0.05em]">
            <span className="text-on-surface-variant">Phase Progress</span>
            <span className={phaseConfig.text}>{progress}%</span>
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

/* ══════════════════════════════════════════
   ProjectsPage — Main Export
   ══════════════════════════════════════════ */
export default function ProjectsPage() {
  const router = useRouter();
  const storeProjects = useProjectStore((state) => state.projects);

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('');
  const [strategyFilter, setStrategyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<string>('recent');

  /* ── Filtered + sorted data ── */
  const filteredProjects = useMemo(() => {
    let data = [...storeProjects];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }

    // Phase filter
    if (phaseFilter) {
      const phaseNum = parseInt(phaseFilter);
      data = data.filter((p) => (p.currentPhase ?? 1) === phaseNum);
    }

    // Strategy filter
    if (strategyFilter) {
      const map: Record<string, string[]> = {
        flip: ['Sell', 'Fix & Flip'],
        rental: ['Rent', 'Buy & Hold'],
        brrrr: ['Buy & Hold'],
      };
      const allowedStrategies = map[strategyFilter] ?? [];
      data = data.filter((p) => allowedStrategies.includes(p.strategyType ?? ''));
    }

    // Status filter
    if (statusFilter === 'active') {
      data = data.filter((p) => !['Sold', 'closed_won', 'closed_lost'].includes(p.status));
    } else if (statusFilter === 'closed') {
      data = data.filter((p) => ['Sold', 'closed_won', 'closed_lost'].includes(p.status));
    } else if (statusFilter === 'pending') {
      data = data.filter((p) => ['Lead', 'Under Contract'].includes(p.status));
    }

    // Sort
    if (sortBy === 'recent') {
      data.sort((a, b) => {
        const aDate = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
        const bDate = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
        return bDate - aDate;
      });
    } else if (sortBy === 'name') {
      data.sort((a, b) => a.propertyName.localeCompare(b.propertyName));
    } else if (sortBy === 'phase') {
      data.sort((a, b) => (a.currentPhase ?? 1) - (b.currentPhase ?? 1));
    }

    return data;
  }, [storeProjects, search, phaseFilter, strategyFilter, statusFilter, sortBy]);

  const handleCreateProject = () => router.push('/dashboard/projects/new');
  const handleOpenProject = (id: string) => router.push(`/dashboard/projects/${id}`);

  return (
    <div className="min-h-full pb-28 md:pb-0">
      {/* ── Header & Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex-1 max-w-2xl relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties by address or strategy..."
            className="w-full bg-surface-container-high/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-[16px] leading-[24px] font-normal focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all backdrop-blur-md text-on-surface placeholder:text-on-surface-variant"
          />
        </div>
        <button
          onClick={handleCreateProject}
          className="flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-xl text-[14px] leading-[16px] tracking-[0.02em] font-semibold luminous-glow hover:scale-[1.02] active:scale-95 transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          CREATE PROJECT
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-2 bg-surface-container-lowest/40 rounded-2xl backdrop-blur-sm border border-white/5">
        <div className="flex items-center px-4 py-2 gap-2 text-on-surface-variant border-r border-white/10">
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[14px] leading-[16px] tracking-[0.02em] font-semibold uppercase">Filters</span>
        </div>

        {/* Phase Filter */}
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="bg-transparent border-none text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-on-surface focus:ring-0 cursor-pointer hover:text-primary transition-colors"
        >
          <option value="">Phase: All</option>
          <option value="1">Acquisition</option>
          <option value="2">Purchase</option>
          <option value="3">Hold</option>
          <option value="4">Exit</option>
        </select>

        {/* Strategy Filter */}
        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          className="bg-transparent border-none text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-on-surface focus:ring-0 cursor-pointer hover:text-primary transition-colors"
        >
          <option value="">Strategy: All</option>
          <option value="flip">Flip</option>
          <option value="rental">Rental</option>
          <option value="brrrr">BRRRR</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-transparent border-none text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-on-surface focus:ring-0 cursor-pointer hover:text-primary transition-colors"
        >
          <option value="active">Status: Active</option>
          <option value="">Status: All</option>
          <option value="closed">Closed</option>
          <option value="pending">Pending</option>
        </select>

        {/* Sort */}
        <div className="ml-auto hidden sm:flex items-center gap-2 text-on-surface-variant pr-4">
          <span className="text-[12px] font-medium tracking-[0.05em] uppercase">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent border-none text-[12px] font-medium tracking-[0.05em] uppercase text-on-surface focus:ring-0 cursor-pointer hover:text-primary transition-colors"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="phase">Phase</option>
          </select>
        </div>
      </div>

      {/* ── Project Grid ── */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mb-8">
          {filteredProjects.map((project) => (
            <FolderCard
              key={project.id}
              project={project}
              onClick={() => handleOpenProject(project.id)}
            />
          ))}
        </div>
      ) : (
        /* ── Empty State (Stitch schema) ── */
        <div className="flex flex-col items-center justify-center py-20 px-8 glass-card rounded-3xl border-dashed border-2 border-white/10 text-center mb-12">
          <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
            <FolderX className="w-10 h-10 text-on-surface-variant" />
          </div>
          <h2 className="text-[24px] leading-[32px] font-semibold text-on-background mb-2">
            No projects found
          </h2>
          <p className="text-[16px] leading-[24px] font-normal text-on-surface-variant max-w-sm mb-8">
            It looks like your search didn&apos;t match any properties. Source your first deal or adjust your filters to get started.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setPhaseFilter('');
              setStrategyFilter('');
              setStatusFilter('active');
            }}
            className="bg-white/5 hover:bg-white/10 text-primary border border-primary/20 px-6 py-3 rounded-xl text-[14px] leading-[16px] tracking-[0.02em] font-semibold transition-all"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
