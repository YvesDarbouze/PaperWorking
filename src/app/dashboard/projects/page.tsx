'use client';

import { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useRouter } from 'next/navigation';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { Search, Plus, FolderX, SlidersHorizontal, ChevronRight, RotateCcw } from 'lucide-react';
import type { Project } from '@/types/schema';
import { EmptyState } from '@/components/ui/empty-states/EmptyState';

/* ── Strategy Theme Mapping ── */
function getStrategyThemeConfig(strategy?: string) {
  const str = strategy ?? '';
  if (str === 'Sell' || str === 'Fix & Flip') {
    return {
      text: 'text-primary',
      bgBase: 'bg-primary',
      bg10: 'bg-primary/10',
      bg20: 'bg-primary/20',
      bg50: 'bg-primary/50',
      border20: 'border-primary/20',
      label: 'Fix & Flip'
    };
  }
  if (str === 'Rent' || str === 'Buy & Hold') {
    return {
      text: 'text-tertiary',
      bgBase: 'bg-tertiary',
      bg10: 'bg-tertiary/10',
      bg20: 'bg-tertiary/20',
      bg50: 'bg-tertiary/50',
      border20: 'border-tertiary/20',
      label: 'Rental'
    };
  }
  return {
    text: 'text-secondary',
    bgBase: 'bg-secondary',
    bg10: 'bg-secondary/10',
    bg20: 'bg-secondary/20',
    bg50: 'bg-secondary/50',
    border20: 'border-secondary/20',
    label: 'Mixed'
  };
}

/* ── Headline metric per strategy type ── */
function getHeadlineMetric(
  project: Project,
  metrics: ReturnType<typeof deriveAllMetrics>
): { label: string; value: string } {
  const strategy = project.strategyType;
  const fin = project.financials;

  if (strategy === 'Sell' || strategy === 'Fix & Flip') {
    const arv = fin?.estimatedCurrentValue ?? fin?.estimatedARV ?? fin?.arv ?? 0;
    return { label: 'Est. Exit', value: formatCurrency(arv) };
  }

  if (strategy === 'Rent' || strategy === 'Buy & Hold') {
    const rev = metrics.noiComponents?.grossRentalIncome ? metrics.noiComponents.grossRentalIncome / 12 : 0;
    return { label: 'Monthly Rev', value: formatCurrency(rev) };
  }

  const capRate = metrics.capRate ?? 0;
  return { label: 'Cap Rate', value: `${(capRate * 100).toFixed(1)}%` };
}

/* ── Phase progress estimation ── */
function getPhaseProgressInfo(project: Project) {
  const phase = project.currentPhase ?? 1;
  const status = project.status;

  let progress = 30;
  if (status === 'Sold' || status === 'closed_won') progress = 100;
  else if (status === 'Listed') progress = 85;
  else if (status === 'Renovating') progress = 40;
  else if (status === 'Under Contract') progress = 65;
  else if (status === 'Lead') progress = 15;
  else {
    const baseProgress: Record<number, number> = { 1: 25, 2: 50, 3: 70, 4: 90 };
    progress = baseProgress[phase] ?? 30;
  }

  const phaseNames = {
    1: 'Acquisition',
    2: 'Purchase',
    3: 'Hold',
    4: 'Exit',
  };
  const label = phaseNames[phase as keyof typeof phaseNames] ?? 'Planning';
  
  return { progress, label: `Phase ${phase}: ${label}` };
}

/* ── Format currency ── */
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

/* ══════════════════════════════════════════
   FolderCard — Single project card
   ══════════════════════════════════════════ */
function FolderCard({ project, onClick }: { project: Project; onClick: () => void }) {
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
  const { progress, label: progressLabel } = getPhaseProgressInfo(project);
  const strategyTheme = getStrategyThemeConfig(project.strategyType);

  // Phase-specific colors and icons based on mockup (8db0ebdc9f0544829656d9eb188551b3.html)
  const phase = project.currentPhase ?? 1;
  let phaseIcon = "folder_special";
  let phaseIconColor = "text-primary-container";
  let phaseIconBg = "bg-primary-container/10";
  let phaseIconBorder = "border-primary-container/20";
  let progressBg = "bg-primary-container";
  let progressGlow = "shadow-[0_0_10px_rgba(45,212,191,0.8)]";

  if (phase === 2) {
    phaseIcon = "snippet_folder";
    phaseIconColor = "text-tertiary-container";
    phaseIconBg = "bg-tertiary-container/10";
    phaseIconBorder = "border-tertiary-container/20";
    progressBg = "bg-tertiary-container";
    progressGlow = "shadow-[0_0_10px_rgba(255,172,90,0.8)]";
  } else if (phase === 3) {
    phaseIcon = "folder";
    phaseIconColor = "text-secondary-container";
    phaseIconBg = "bg-secondary-container/10";
    phaseIconBorder = "border-secondary-container/20";
    progressBg = "bg-secondary-container";
    progressGlow = "shadow-[0_0_10px_rgba(5,102,217,0.8)]";
  } else if (phase >= 4) {
    phaseIcon = "folder_shared";
    phaseIconColor = "text-error";
    phaseIconBg = "bg-error/10";
    phaseIconBorder = "border-error/20";
    progressBg = "bg-error";
    progressGlow = "shadow-[0_0_10px_rgba(255,180,171,0.8)]";
  }

  return (
    <div
      className="bg-surface-container-low/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-primary-container/40 transition-all group relative overflow-hidden flex flex-col gap-4 hover:shadow-[0_0_30px_-10px_rgba(45,212,191,0.15)] cursor-pointer"
      onClick={onClick}
      role="link"
      tabIndex={0}
      aria-label={`View project: ${project.propertyName}`}
    >
      {/* Subtle top-left glow */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary-container/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="flex justify-between items-center z-10 relative">
        <div className={`p-3 ${phaseIconBg} rounded-lg ${phaseIconColor} border ${phaseIconBorder} transition-colors`}>
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {phaseIcon}
          </span>
        </div>
        
        {/* Strategy HSL Label */}
        <span className={`font-label-sm text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${strategyTheme.text} ${strategyTheme.bg10} ${strategyTheme.border20}`}>
          {strategyTheme.label}
        </span>
      </div>

      <div className="z-10 relative">
        <h3 className="font-headline-md text-[20px] leading-[28px] text-on-surface font-semibold mb-1 truncate">{project.propertyName}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          <span className="truncate">{project.address}</span>
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 z-10 relative flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Ownership</span>
          <span className="font-label-md text-label-md text-primary bg-primary/10 px-2 py-0.5 rounded-md">{ownership}%</span>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-end">
            <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">{progressLabel}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
            <div
              className={`h-full ${progressBg} ${progressGlow} rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
          <div>
            <p className="text-[10px] text-outline uppercase tracking-wider">Acquisition</p>
            <p className="font-label-md text-xs">{formatCurrency(project.financials?.purchasePrice ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-outline uppercase tracking-wider">{headlineMetric.label}</p>
            <p className="font-label-md text-xs text-primary">{headlineMetric.value}</p>
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

  /* ── Stats Computation ── */
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalEquity = 0;
    let validEquityCount = 0;
    let totalYield = 0;
    let validYieldCount = 0;

    storeProjects.forEach((p) => {
      const arv = p.financials?.estimatedCurrentValue ?? p.financials?.estimatedARV ?? p.financials?.arv ?? p.financials?.purchasePrice ?? 0;
      totalValue += arv;

      const eq = p.financials?.ownershipPercentage ?? 100;
      totalEquity += eq;
      validEquityCount++;

      const metrics = deriveAllMetrics(p.financials, p.financials?.estimatedCurrentValue, p.strategyType, p.currentPhase, p.createdAt);
      if (p.strategyType === 'Sell' || p.strategyType === 'Fix & Flip') {
        const totalInvested = metrics.totalCashInvested || 1;
        const roi = totalInvested > 0 ? ((arv - totalInvested) / totalInvested) * 100 : 0;
        totalYield += roi;
      } else {
        totalYield += (metrics.cashOnCashReturn ?? 0) * 100;
      }
      validYieldCount++;
    });

    return {
      totalValue,
      avgEquity: validEquityCount > 0 ? totalEquity / validEquityCount : 0,
      avgYield: validYieldCount > 0 ? totalYield / validYieldCount : 0,
    };
  }, [storeProjects]);

  /* ── Filtered + sorted data ── */
  const filteredProjects = useMemo(() => {
    let data = [...storeProjects];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }

    if (phaseFilter) {
      const phaseNum = parseInt(phaseFilter);
      data = data.filter((p) => (p.currentPhase ?? 1) === phaseNum);
    }

    if (strategyFilter) {
      const map: Record<string, string[]> = {
        flip: ['Sell', 'Fix & Flip'],
        rental: ['Rent', 'Buy & Hold'],
        brrrr: ['Buy & Hold'],
      };
      const allowedStrategies = map[strategyFilter] ?? [];
      data = data.filter((p) => allowedStrategies.includes(p.strategyType ?? ''));
    }

    if (statusFilter === 'active') {
      data = data.filter((p) => !['Sold', 'closed_won', 'closed_lost'].includes(p.status));
    } else if (statusFilter === 'closed') {
      data = data.filter((p) => ['Sold', 'closed_won', 'closed_lost'].includes(p.status));
    } else if (statusFilter === 'pending') {
      data = data.filter((p) => ['Lead', 'Under Contract'].includes(p.status));
    }

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
    <div className="min-h-full pb-28 md:pb-28">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight">Projects Directory</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage active properties and track phase progression.</p>
        </div>
        <button
          onClick={handleCreateProject}
          className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(45,212,191,0.4)] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Project
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1 group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors pointer-events-none">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties by address or strategy..."
            className="w-full bg-surface-container-low/50 backdrop-blur-md border border-white/10 rounded-xl py-3 pl-12 pr-4 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50"
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-8 glass-card rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-outline px-2 border-r border-outline-variant">
            <SlidersHorizontal className="w-4 h-4" />
          </div>

          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="bg-surface-container-highest px-3 py-1.5 rounded-lg text-sm font-label-md border border-outline-variant hover:border-primary transition-all text-on-surface focus:ring-0"
          >
            <option value="">Phase: All</option>
            <option value="1">Acquisition</option>
            <option value="2">Purchase</option>
            <option value="3">Hold</option>
            <option value="4">Exit</option>
          </select>

          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="bg-surface-container-highest px-3 py-1.5 rounded-lg text-sm font-label-md border border-outline-variant hover:border-primary transition-all text-on-surface focus:ring-0"
          >
            <option value="">Strategy: All</option>
            <option value="flip">Flip</option>
            <option value="rental">Rental</option>
            <option value="brrrr">BRRRR</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-highest px-3 py-1.5 rounded-lg text-sm font-label-md border border-outline-variant hover:border-primary transition-all text-on-surface focus:ring-0"
          >
            <option value="active">Status: Active</option>
            <option value="">Status: All</option>
            <option value="closed">Closed</option>
            <option value="pending">Pending</option>
          </select>

          <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block"></div>
          <span className="text-outline text-xs uppercase tracking-widest font-bold">
            {filteredProjects.length} Projects Found
          </span>
        </div>

        <div className="flex items-center gap-4 text-outline text-xs">
          <span className="font-bold">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-on-surface focus:ring-0 cursor-pointer hover:text-primary transition-colors p-0"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="phase">Phase</option>
          </select>
        </div>
      </div>

      {/* ── Project Grid ── */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {filteredProjects.map((project) => (
            <FolderCard
              key={project.id}
              project={project}
              onClick={() => handleOpenProject(project.id)}
            />
          ))}
          {/* Add New Card Placeholder */}
          <div
            onClick={handleCreateProject}
            className="bg-surface-container-low/30 hover:bg-surface-container-low/60 border-2 border-dashed border-white/10 hover:border-primary/40 rounded-xl p-5 transition-all group flex flex-col items-center justify-center min-h-[260px] cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-surface-variant/50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
              <Plus className="w-6 h-6 text-on-surface-variant group-hover:text-primary" />
            </div>
            <p className="font-label-md text-sm text-on-surface-variant group-hover:text-primary transition-colors">Add New Project</p>
          </div>
        </div>
      ) : storeProjects.length === 0 ? (
        <div className="flex justify-center py-12">
          <EmptyState
            title="Your Portfolio is Empty."
            description="Create your first project to start tracking deal phases, costs, and performance."
            icon={FolderX}
            action={{
              label: "Create New Project",
              onClick: handleCreateProject,
              icon: Plus,
            }}
          />
        </div>
      ) : (
        <div className="flex justify-center py-12">
          <EmptyState
            title="No projects found"
            description="It looks like your search didn't match any properties. Adjust your filters or clear them to see your projects."
            icon={FolderX}
            action={{
              label: "Clear all filters",
              onClick: () => {
                setSearch('');
                setPhaseFilter('');
                setStrategyFilter('');
                setStatusFilter('active');
              },
              icon: RotateCcw,
            }}
            variant="card"
          />
        </div>
      )}

      {/* ── Terminal Stats Overlay ── */}
      {storeProjects.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-40 hidden md:block">
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-primary/20 bg-surface/80">
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] text-outline uppercase font-bold">Total Port. Value</p>
                <p className="font-headline-md text-primary">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="h-10 w-px bg-outline-variant"></div>
              <div>
                <p className="text-[10px] text-outline uppercase font-bold">Avg. Equity</p>
                <p className="font-headline-md text-on-surface">{stats.avgEquity.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-px bg-outline-variant"></div>
              <div>
                <p className="text-[10px] text-outline uppercase font-bold">Monthly ROI / Yield</p>
                <p className="font-headline-md text-tertiary">
                  {stats.avgYield > 0 ? '+' : ''}{stats.avgYield.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] text-outline font-mono">LIVE_FEED_SYNCED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
