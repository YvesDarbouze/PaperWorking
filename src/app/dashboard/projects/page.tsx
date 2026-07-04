'use client';

import { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { Plus, FolderX, RotateCcw } from 'lucide-react';
import type { Project } from '@/types/schema';
import { EmptyState } from '@/components/ui/empty-states/EmptyState';
import { REILKanBan } from '@/components/projects/REILKanBan';
import { useCreateProjectModal } from '@/store/createProjectModalStore';

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
    2: 'Closing',
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
  let progressGlow = "shadow-[0_0_10px_rgba(69, 73, 85,0.8)]";

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

  // Phase accent colors for top stripe (Stitch folder tab)
  const phaseStripeColor = phase === 1 ? '#454955' : phase === 2 ? '#7A9EAA' : phase === 3 ? '#ffac5a' : '#5aaa3f';

  return (
    <div
      className="backdrop-blur-xl border border-white/[0.08] flex flex-col gap-4 cursor-pointer group relative overflow-hidden transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, rgba(22,19,24,0.65) 0%, rgba(13,10,11,0.88) 100%)',
        // Asymmetric folder tab: sharp top-left, rounded top-right (Stitch blueprint)
        borderRadius: '8px 28px 16px 16px',
        borderTop: `2px solid ${phaseStripeColor}55`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        padding: '20px',
      }}
      onClick={onClick}
      role="link"
      tabIndex={0}
      aria-label={`View project: ${project.propertyName}`}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderTopColor = `${phaseStripeColor}99`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${phaseStripeColor}22`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderTopColor = `${phaseStripeColor}55`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
      }}
    >
      {/* Hover glow from phase color */}
      <div
        className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 20% 0%, ${phaseStripeColor}08 0%, transparent 60%)` }}
      />
      
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const storeProjects = useProjectStore((state) => state.projects);
  const { open: openCreateWizard } = useCreateProjectModal();

  /* ── View mode ── */
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');

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
    } else if (sortBy === 'noi') {
      data.sort((a, b) => {
        const mA = deriveAllMetrics(a.financials, a.financials?.estimatedCurrentValue, a.strategyType, a.currentPhase, a.createdAt);
        const mB = deriveAllMetrics(b.financials, b.financials?.estimatedCurrentValue, b.strategyType, b.currentPhase, b.createdAt);
        return (mB.noi ?? 0) - (mA.noi ?? 0);
      });
    } else if (sortBy === 'price') {
      data.sort((a, b) => (b.financials?.purchasePrice ?? 0) - (a.financials?.purchasePrice ?? 0));
    } else if (sortBy === 'created') {
      data.sort((a, b) => {
        const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bDate - aDate;
      });
    }

    return data;
  }, [storeProjects, search, phaseFilter, strategyFilter, statusFilter, sortBy]);

  const handleCreateProject = () => openCreateWizard();
  const handleOpenProject = (id: string) => router.push(`/dashboard/projects/${id}/phase-1`);

  return (
    <div className="min-h-full pb-28 md:pb-28">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'rgba(253,255,252,0.95)', letterSpacing: '-0.01em' }}
          >
            Projects
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(253,255,252,0.45)' }}>
            {storeProjects.length} project{storeProjects.length !== 1 ? 's' : ''}
            {viewMode === 'kanban' ? ' · REIL lifecycle board' : ' · grid view'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div
            className="flex items-center p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {([
              { mode: 'kanban' as const, icon: 'view_kanban',  label: 'Board' },
              { mode: 'grid'   as const, icon: 'grid_view',    label: 'Grid'  },
            ] as const).map(({ mode, icon, label }) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                  style={{
                    background: active ? 'rgba(69,73,85,0.25)' : 'transparent',
                    color:      active ? 'rgba(253,255,252,0.90)' : 'rgba(253,255,252,0.40)',
                    border:     active ? '1px solid rgba(255,255,255,0.10)' : '1px solid transparent',
                  }}
                >
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Create project */}
          <button
            onClick={handleCreateProject}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{
              background: isDark ? 'var(--color-primary)' : '#0b8649',
              color: isDark ? '#0d0a0b' : '#FDFFFC',
              boxShadow: isDark ? '0 4px 16px rgba(0,221,148,0.25)' : '0 4px 16px rgba(11,134,73,0.25)',
            }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Create Project
          </button>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 group">
          <span
            className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] transition-colors duration-200 pointer-events-none"
            style={{ color: 'rgba(253,255,252,0.35)' }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address or name…"
            aria-label="Search projects"
            className="w-full py-2.5 pl-10 pr-4 text-sm rounded-xl transition-all duration-200 focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(253,255,252,0.9)',
            }}
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort projects"
          className="py-2.5 px-3 rounded-xl text-sm focus:outline-none cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(253,255,252,0.7)',
          }}
        >
          <option value="recent">Recent Activity</option>
          <option value="name">Name</option>
          <option value="phase">Phase</option>
          <option value="noi">NOI ↓</option>
          <option value="price">Purchase Price</option>
          <option value="created">Date Created</option>
        </select>
      </div>

      {/* ── Phase + Strategy pill filters ── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {/* Phase pills */}
        {[
          { value: '', label: 'All Phases' },
          { value: '1', label: 'Acquisition', color: '#454955' },
          { value: '2', label: 'Closing',      color: '#7A9EAA' },
          { value: '3', label: 'Rehab',        color: '#ffac5a' },
          { value: '4', label: 'Hold / Exit',  color: '#5aaa3f' },
        ].map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => setPhaseFilter(value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150"
            style={{
              background: phaseFilter === value
                ? `${color || '#454955'}18`
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${phaseFilter === value ? `${color || '#454955'}40` : 'rgba(255,255,255,0.08)'}`,
              color: phaseFilter === value ? (color || '#454955') : 'rgba(253,255,252,0.5)',
            }}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-5 self-center" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Strategy pills */}
        {[
          { value: '', label: 'All Strategies' },
          { value: 'flip', label: 'Flip' },
          { value: 'rental', label: 'Rental' },
          { value: 'brrrr', label: 'BRRRR' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStrategyFilter(value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150"
            style={{
              background: strategyFilter === value ? 'rgba(69,73,85,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${strategyFilter === value ? 'rgba(69,73,85,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: strategyFilter === value ? '#454955' : 'rgba(253,255,252,0.5)',
            }}
          >
            {label}
          </button>
        ))}

        {filteredProjects.length !== storeProjects.length && (
          <span className="ml-auto text-xs self-center" style={{ color: 'rgba(253,255,252,0.35)' }}>
            {filteredProjects.length} of {storeProjects.length}
          </span>
        )}
      </div>

      {/* ── Kanban Board ── */}
      {viewMode === 'kanban' && (
        <div className="mb-8">
          {storeProjects.length === 0 ? (
            <div className="flex justify-center py-12">
              <EmptyState
                title="Your Portfolio is Empty."
                description="Create your first project to start tracking deal phases, costs, and performance."
                icon={FolderX}
                action={{ label: "Create New Project", onClick: handleCreateProject, icon: Plus }}
              />
            </div>
          ) : (
            <REILKanBan
              projects={filteredProjects}
              onAdd={handleCreateProject}
              renderCard={(project) => (
                <FolderCard
                  key={project.id}
                  project={project}
                  onClick={() => handleOpenProject(project.id)}
                />
              )}
            />
          )}
        </div>
      )}

      {/* ── Project Grid ── */}
      {viewMode === 'grid' && filteredProjects.length > 0 ? (
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
      ) : viewMode === 'grid' && storeProjects.length === 0 ? (
        <div className="flex justify-center py-12">
          <EmptyState
            title="Your Portfolio is Empty."
            description="Create your first project to start tracking deal phases, costs, and performance."
            icon={FolderX}
            action={{ label: "Create New Project", onClick: handleCreateProject, icon: Plus }}
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="flex justify-center py-12">
          <EmptyState
            title="No projects found"
            description="Adjust your filters or clear them to see your projects."
            icon={FolderX}
            action={{
              label: "Clear all filters",
              onClick: () => { setSearch(''); setPhaseFilter(''); setStrategyFilter(''); setStatusFilter('active'); },
              icon: RotateCcw,
            }}
            variant="card"
          />
        </div>
      ) : null}

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
