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
  const theme = getStrategyThemeConfig(project.strategyType);

  return (
    <div
      className="glass-card folder-cut group hover:border-primary/50 transition-all duration-300 relative overflow-hidden cursor-pointer"
      onClick={onClick}
      role="link"
      tabIndex={0}
      aria-label={`View project: ${project.propertyName}`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${theme.bg10} blur-3xl rounded-full -mr-16 -mt-16 group-hover:${theme.bg20} transition-all`} />
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className={`${theme.bg10} ${theme.text} text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest border ${theme.border20} mb-2 inline-block`}>
              {theme.label}
            </span>
            <h3 className="font-headline-md text-on-surface">{project.propertyName}</h3>
            <p className="text-outline text-sm">{project.address}</p>
          </div>
          <div className="text-right">
            <div className={`font-headline-md ${theme.text}`}>{ownership}%</div>
            <div className="text-[10px] text-outline uppercase tracking-tighter">Ownership</div>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-outline">Phase Progress</span>
            <span className={`text-xs ${theme.text} font-bold`}>{progressLabel}</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className={`h-full ${theme.bgBase} luminous-glow rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant">
          <div>
            <p className="text-[10px] text-outline uppercase">Acquisition</p>
            <p className="font-label-md">{formatCurrency(project.financials?.purchasePrice ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-outline uppercase">{headlineMetric.label}</p>
            <p className={`font-label-md ${theme.text}`}>{headlineMetric.value}</p>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
        <div className="flex -space-x-2">
          {/* Future: User avatars can go here */}
        </div>
        <button className={`${theme.text} text-xs font-bold flex items-center gap-1 hover:underline`}>
          Details <ChevronRight className="w-4 h-4" />
        </button>
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
      {/* ── Header & Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex-1 max-w-2xl relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties by address or strategy..."
            className="w-full bg-surface-container-highest border-none rounded-full py-3 pl-12 pr-4 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-primary transition-all text-on-surface placeholder:text-outline"
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleCreateProject}
            className="luminous-glow bg-primary text-on-primary px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
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
            className="glass-card folder-cut group border-dashed border-2 border-outline-variant hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center p-12 min-h-[300px]"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
              <Plus className="w-8 h-8 text-outline group-hover:text-primary" />
            </div>
            <p className="font-label-md text-outline group-hover:text-primary transition-colors">Add New Project</p>
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
