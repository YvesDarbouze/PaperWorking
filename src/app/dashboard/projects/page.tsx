'use client';

import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { Plus, FolderX, RotateCcw } from 'lucide-react';
import type { Project } from '@/types/schema';
import { EmptyState } from '@/components/ui/empty-states/EmptyState';
import { REILKanBan } from '@/components/projects/REILKanBan';
import { useCreateProjectModal } from '@/store/createProjectModalStore';
import { useAuth } from '@/context/AuthContext';
import { projectsTokens, phaseColor } from '@/components/projects/projectsTheme';

/* ── Strategy Theme Mapping ── */
function getStrategyThemeConfig(disposition: string | undefined, t: ReturnType<typeof projectsTokens>) {
  const str = disposition ?? '';
  if (str === 'SALE') {
    return { color: t.sale, label: 'Fix & Flip' };
  }
  if (str === 'RENT') {
    return { color: t.rent, label: 'Rental' };
  }
  return { color: t.mixed, label: 'Mixed' };
}

/* ── Headline metric per strategy type ── */
function getHeadlineMetric(
  project: Project,
  metrics: ReturnType<typeof deriveAllMetrics>
): { label: string; value: string } {
  const fin = project.financials;

  if (project.dispositionType === 'SALE') {
    const arv = fin?.estimatedCurrentValue ?? fin?.estimatedARV ?? fin?.arv ?? 0;
    return { label: 'Est. Exit', value: formatCurrency(arv) };
  }

  if (project.dispositionType === 'RENT') {
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

  let progress = 25;
  const progressMap: Record<string, number> = {
    acquisition: 25,
    fund: 50,
    hold: 75,
    exit: 100,
  };
  progress = progressMap[status] ?? (phase * 25);

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = projectsTokens(isDark);

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
  const { progress, label: progressLabel } = getPhaseProgressInfo(project);
  const strategyTheme = getStrategyThemeConfig(project.dispositionType, t);

  const [isEditingRent, setIsEditingRent] = useState(false);
  const [rentInput, setRentInput] = useState((project.financials?.monthlyGrossRent || 0).toString());
  const updateProjectFinancials = useProjectStore((state) => state.updateProjectFinancials);

  useEffect(() => {
    setRentInput((project.financials?.monthlyGrossRent || 0).toString());
  }, [project.financials?.monthlyGrossRent]);

  const handleRentSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsEditingRent(false);
    const val = parseFloat(rentInput.replace(/[^0-9.]/g, '')) || 0;
    try {
      await updateProjectFinancials(project.id, {
        monthlyGrossRent: val
      });
    } catch (err) {
      console.error('Failed to update rent:', err);
    }
  };

  const phase = project.currentPhase ?? 1;
  const accent = phaseColor(phase, t);
  const phaseIcon =
    phase === 2 ? 'snippet_folder' :
    phase === 3 ? 'folder' :
    phase >= 4 ? 'folder_shared' : 'folder_special';

  return (
    <div
      className="flex flex-col gap-3 cursor-pointer group relative overflow-hidden transition-colors"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 2,
        boxShadow: t.shadow,
        padding: '14px 14px 14px 12px',
      }}
      onClick={onClick}
      role="link"
      tabIndex={0}
      aria-label={`View project: ${project.propertyName}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? '#1C1E26' : '#FAFBFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = t.surface;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <div
          className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, color: accent, borderRadius: 2 }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>
            {phaseIcon}
          </span>
        </div>

        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 shrink-0"
          style={{
            color: strategyTheme.color,
            background: `${strategyTheme.color}18`,
            borderRadius: 2,
          }}
        >
          {strategyTheme.label}
        </span>
      </div>

      <div>
        <h3
          className="text-[15px] font-semibold leading-snug mb-0.5 truncate"
          style={{ color: t.heading }}
        >
          {project.propertyName}
        </h3>
        <p className="text-[12px] flex items-center gap-1" style={{ color: t.muted }}>
          <span className="material-symbols-outlined text-[13px]">location_on</span>
          <span className="truncate">{project.address}</span>
        </p>
      </div>

      <div className="pt-3 flex flex-col gap-2.5" style={{ borderTop: `1px solid ${t.divider}` }}>
        <div className="flex justify-between items-center">
          <span className="text-[11px]" style={{ color: t.muted }}>Ownership</span>
          <span
            className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5"
            style={{ color: t.accent, background: t.accentMuted, borderRadius: 2 }}
          >
            {ownership}%
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.muted }}>
              {progressLabel}
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: t.muted }}>{progress}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden" style={{ background: t.hover, borderRadius: 1 }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progress}%`, background: accent, borderRadius: 1 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: t.muted }}>
              Acquisition
            </p>
            <p className="text-[12px] font-semibold tabular-nums" style={{ color: t.heading }}>
              {formatCurrency(project.financials?.purchasePrice ?? 0)}
            </p>
            {project.financials?.offer_price !== undefined && project.financials?.offer_price > 0 && (
              <p className="text-[10px] mt-0.5 font-medium" style={{ color: t.accent }} id={`card-offer-price-${project.id}`}>
                Offer: {formatCurrency(project.financials.offer_price)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: t.muted }}>
              {headlineMetric.label}
            </p>
            {project.dispositionType === 'RENT' ? (
              isEditingRent ? (
                <form
                  onSubmit={handleRentSave}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 mt-0.5"
                >
                  <span className="text-xs font-semibold" style={{ color: t.accent }}>$</span>
                  <input
                    type="text"
                    value={rentInput}
                    onChange={(e) => setRentInput(e.target.value)}
                    onBlur={handleRentSave}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 px-1.5 py-0.5 text-xs font-mono outline-none"
                    style={{
                      background: t.inputBg,
                      border: `1px solid ${t.border}`,
                      borderRadius: 2,
                      color: t.heading,
                    }}
                    autoFocus
                  />
                </form>
              ) : (
                <div
                  className="flex items-center gap-1 group/rent cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingRent(true);
                  }}
                  title="Click to edit rent"
                >
                  <p className="text-[12px] font-semibold tabular-nums" style={{ color: t.accent }}>
                    {headlineMetric.value}
                  </p>
                  <span
                    className="material-symbols-outlined text-[12px] opacity-0 group-hover/rent:opacity-100 transition-opacity"
                    style={{ color: t.muted }}
                  >
                    edit
                  </span>
                </div>
              )
            ) : (
              <p className="text-[12px] font-semibold tabular-nums" style={{ color: t.accent }}>
                {headlineMetric.value}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stage tiebreaker order helper ── */
function getStageOrder(stage?: string): number {
  if (!stage) return 0;
  const orders: Record<string, number> = {
    'target': 1,
    'underwrite': 2,
    'strategy': 3,
    'offer': 4,
    'due_diligence': 5,
    'raise_interest': 6,
    'phase_gate': 7,
    'sourcing': 1,
    'under_contract': 2,
    'rehab': 3,
    'listed': 4,
    'sold': 5,
    'rented': 6
  };
  return orders[stage.toLowerCase()] ?? 0;
}

/* ── Stage label formatter ── */
function getStageLabel(stage?: string): string {
  if (!stage) return '—';
  const labels: Record<string, string> = {
    'target': 'Target',
    'underwrite': 'Analyze & Underwrite',
    'strategy': 'Declare Strategy',
    'offer': 'Offer/LOI',
    'due_diligence': 'Under Contract & DD',
    'raise_interest': 'Raise Interest',
    'phase_gate': 'Phase Gate'
  };
  return labels[stage.toLowerCase()] ?? stage;
}

/* ── Phase label formatter ── */
function getPhaseLabel(phase?: number): string {
  const names = {
    1: 'Acquisition',
    2: 'Fund',
    3: 'Hold',
    4: 'Exit'
  };
  return names[phase as keyof typeof names] ?? 'Planning';
}

/* ══════════════════════════════════════════
   ProjectsPage — Main Export
   ══════════════════════════════════════════ */
export default function ProjectsPage() {
  useAllDealsSync();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, profile } = useAuth();
  const storeProjects = useProjectStore((state) => state.projects);
  const { open: openCreateWizard } = useCreateProjectModal();

  /* ── View mode with localStorage persistence ── */
  const [viewMode, setViewModeState] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    const saved = localStorage.getItem('pw_projects_view_mode');
    if (saved === 'kanban' || saved === 'list') {
      setViewModeState(saved);
    }
  }, []);

  const setViewMode = (mode: 'kanban' | 'list') => {
    setViewModeState(mode);
    localStorage.setItem('pw_projects_view_mode', mode);
  };

  /* ── List view sort state ── */
  const [listSortBy, setListSortBy] = useState<'year' | 'phase'>('year');

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('');
  const [strategyFilter, setStrategyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<string>('recent');

  // Vendor access guard
  const isVendor =
    profile?.role === "Vendor" ||
    profile?.accountType === "vendor" ||
    profile?.subscriptionPlan === "Vendor Network";

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

      const metrics = deriveAllMetrics(p.financials, p.financials?.estimatedCurrentValue, p.dispositionType, p.currentPhase, p.createdAt);
      if (p.dispositionType === 'SALE') {
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

    // Filter by user role involvement
    if (user?.uid) {
      data = data.filter((p) => {
        const memberInfo = p.members?.[user.uid];
        const isLead = p.ownerUid === user.uid || (p as any).leadInvestorId === user.uid || memberInfo?.role === 'Lead Investor';
        const isTeam = (memberInfo !== undefined && memberInfo.role !== 'General Contractor' && memberInfo.role !== 'Vendor') || p.projectTeam?.some((t: any) => (t.uid === user.uid || t.email === user.email) && t.role !== 'General Contractor' && t.role !== 'Vendor');
        const isConfirmedHolder = p.fractionalInvestors?.some(
          (inv) => inv.uid === user.uid && inv.status === 'confirmed'
        );
        return isLead || isTeam || isConfirmedHolder;
      });
    }

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
      if (strategyFilter === 'flip') {
        data = data.filter((p) => p.dispositionType === 'SALE');
      } else if (strategyFilter === 'rental') {
        data = data.filter((p) => p.dispositionType === 'RENT');
      } else if (strategyFilter === 'brrrr') {
        data = data.filter((p) => p.dispositionType === 'RENT' && p.subStrategy === 'BRRRR');
      }
    }

    if (statusFilter === 'active') {
      data = data.filter((p) => p.status !== 'exit');
    } else if (statusFilter === 'closed') {
      data = data.filter((p) => p.status === 'exit');
    } else if (statusFilter === 'pending') {
      data = data.filter((p) => ['acquisition', 'fund'].includes(p.status));
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
        const mA = deriveAllMetrics(a.financials, a.financials?.estimatedCurrentValue, a.dispositionType, a.currentPhase, a.createdAt);
        const mB = deriveAllMetrics(b.financials, b.financials?.estimatedCurrentValue, b.dispositionType, b.currentPhase, b.createdAt);
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
  }, [storeProjects, search, phaseFilter, strategyFilter, statusFilter, sortBy, user?.uid, user?.email]);

  /* Sort the final array for list view if selected */
  const sortedListProjects = useMemo(() => {
    let data = [...filteredProjects];
    data.sort((a, b) => {
      // Primary: compare by listSortBy choice
      if (listSortBy === 'year') {
        const dateA = a.financials?.acquisitionDate 
          ? new Date(a.financials.acquisitionDate) 
          : (a.createdAt ? new Date(a.createdAt) : new Date());
        const dateB = b.financials?.acquisitionDate 
          ? new Date(b.financials.acquisitionDate) 
          : (b.createdAt ? new Date(b.createdAt) : new Date());
        const yearA = dateA.getFullYear();
        const yearB = dateB.getFullYear();
        if (yearA !== yearB) {
          return yearB - yearA; // Year descending
        }
        
        // Then phase position ascending
        const phaseA = a.currentPhase ?? 1;
        const phaseB = b.currentPhase ?? 1;
        if (phaseA !== phaseB) {
          return phaseA - phaseB;
        }
        
        // Then stage order ascending
        const stageA = a.lastActiveStage || a.entryStage || '';
        const stageB = b.lastActiveStage || b.entryStage || '';
        return getStageOrder(stageA) - getStageOrder(stageB);
      } else {
        // Primary: phase position ascending
        const phaseA = a.currentPhase ?? 1;
        const phaseB = b.currentPhase ?? 1;
        if (phaseA !== phaseB) {
          return phaseA - phaseB;
        }
        
        // Then stage order ascending
        const stageA = a.lastActiveStage || a.entryStage || '';
        const stageB = b.lastActiveStage || b.entryStage || '';
        const stageDiff = getStageOrder(stageA) - getStageOrder(stageB);
        if (stageDiff !== 0) return stageDiff;
        
        // Then Year descending
        const dateA = a.financials?.acquisitionDate 
          ? new Date(a.financials.acquisitionDate) 
          : (a.createdAt ? new Date(a.createdAt) : new Date());
        const dateB = b.financials?.acquisitionDate 
          ? new Date(b.financials.acquisitionDate) 
          : (b.createdAt ? new Date(b.createdAt) : new Date());
        return dateB.getFullYear() - dateA.getFullYear();
      }
    });
    return data;
  }, [filteredProjects, listSortBy]);

  const handleCreateProject = () => openCreateWizard();
  const handleOpenProject = (id: string) => router.push(`/dashboard/projects/${id}`);

  const t = projectsTokens(isDark);

  const controlStyle: CSSProperties = {
    background: t.inputBg,
    border: `1px solid ${t.border}`,
    color: t.body,
    borderRadius: 2,
  };

  if (isVendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ color: t.heading }}>
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[40px]" style={{ color: t.muted, opacity: 0.5 }}>lock</span>
          <p className="text-sm font-semibold tracking-wide">Permission denied</p>
          <p className="text-xs text-center max-w-xs" style={{ color: t.muted }}>
            Vendors do not have access to the projects portfolio.
          </p>
        </div>
      </div>
    );
  }

  if (storeProjects.length === 0) {
    return (
      <div className="min-h-full pb-16 px-1" style={{ color: t.body }}>
        <header className="mb-8">
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1" style={{ color: t.accent }}>
            Pipeline
          </p>
          <h1 className="text-[1.75rem] font-semibold tracking-tight" style={{ color: t.heading }}>
            Projects
          </h1>
          <p className="text-sm mt-1" style={{ color: t.muted }}>0 projects</p>
        </header>

        <div
          className="p-10 md:p-14 flex flex-col items-center justify-center text-center min-h-[360px]"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            boxShadow: t.shadow,
          }}
        >
          <div
            className="w-16 h-16 flex items-center justify-center mb-5"
            style={{
              background: isDark ? t.accentMuted : '#14161C',
              color: isDark ? t.accent : '#F5F6F8',
              borderRadius: 2,
            }}
          >
            <FolderX className="w-8 h-8" strokeWidth={1.75} />
          </div>

          <h2 className="text-xl font-semibold mb-2" style={{ color: t.heading }}>
            Start your portfolio
          </h2>
          <p className="text-sm max-w-md mb-7 leading-relaxed" style={{ color: t.muted }}>
            Create a project to underwrite deals, track the lifecycle, and manage each phase.
          </p>

          <button
            type="button"
            className="pw-interactive-custom inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            onClick={handleCreateProject}
            style={{
              background: t.ctaBg,
              color: t.ctaFg,
              border: 'none',
              borderRadius: 2,
              padding: '12px 20px',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(20,22,28,0.18)',
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Create first project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-16 px-1" style={{ color: t.body }}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1" style={{ color: t.accent }}>
            Pipeline
          </p>
          <h1 className="text-[1.75rem] font-semibold tracking-tight" style={{ color: t.heading }}>
            Projects
          </h1>
          <p className="text-sm mt-1" style={{ color: t.muted }}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            {viewMode === 'kanban' ? ' · lifecycle board' : ' · list view'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center p-0.5"
            style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
          >
            {([
              { mode: 'kanban' as const, icon: 'view_kanban',  label: 'Board' },
              { mode: 'list'   as const, icon: 'format_list_bulleted', label: 'List'  },
            ] as const).map(({ mode, icon, label }) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  className="pw-interactive-custom flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  onClick={() => setViewMode(mode)}
                  style={{
                    background: active ? t.surface : 'transparent',
                    color: active ? t.heading : t.muted,
                    border: 'none',
                    borderRadius: 2,
                    padding: '6px 12px',
                    boxShadow: active ? t.shadow : 'none',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[15px]"
                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {icon}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="pw-interactive-custom flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            onClick={handleCreateProject}
            style={{
              background: t.ctaBg,
              color: t.ctaFg,
              border: 'none',
              borderRadius: 2,
              padding: '8px 16px',
            }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New project
          </button>
        </div>
      </header>

      {/* Portfolio snapshot — same stats, usable hierarchy */}
      {filteredProjects.length > 0 && (
        <div
          className="grid grid-cols-3 gap-3 mb-6"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            boxShadow: t.shadow,
          }}
        >
          {[
            { label: 'Portfolio value', value: formatCurrency(stats.totalValue) },
            { label: 'Avg. equity', value: `${stats.avgEquity.toFixed(1)}%` },
            {
              label: 'Avg. yield',
              value: `${stats.avgYield > 0 ? '+' : ''}${stats.avgYield.toFixed(1)}%`,
            },
          ].map((item, i) => (
            <div
              key={item.label}
              className="px-4 py-3"
              style={{ borderLeft: i === 0 ? 'none' : `1px solid ${t.divider}` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: t.muted }}>
                {item.label}
              </p>
              <p className="text-[1.15rem] font-semibold tabular-nums" style={{ color: t.heading }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none"
            style={{ color: t.muted }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address or name…"
            aria-label="Search projects"
            className="w-full py-2.5 pl-10 pr-3 text-sm outline-none"
            style={controlStyle}
          />
        </div>

        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          aria-label="Filter by phase"
          className="px-3 py-2.5 text-sm outline-none"
          style={controlStyle}
        >
          <option value="">All phases</option>
          <option value="1">Phase 1: Acquisition</option>
          <option value="2">Phase 2: Fund</option>
          <option value="3">Phase 3: Hold</option>
          <option value="4">Phase 4: Exit</option>
        </select>

        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          aria-label="Filter by strategy"
          className="px-3 py-2.5 text-sm outline-none"
          style={controlStyle}
        >
          <option value="">All strategies</option>
          <option value="flip">Fix &amp; Flip</option>
          <option value="rental">Long term rental</option>
          <option value="brrrr">BRRRR</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2.5 text-sm outline-none"
          style={controlStyle}
        >
          <option value="active">Active deals</option>
          <option value="pending">Leads &amp; under contract</option>
          <option value="closed">Closed / realized</option>
          <option value="all">All statuses</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort projects"
          className="px-3 py-2.5 text-sm outline-none"
          style={controlStyle}
        >
          <option value="recent">Recently updated</option>
          <option value="created">Date created</option>
          <option value="name">Property name</option>
          <option value="phase">REIL phase</option>
          <option value="price">Purchase price</option>
          <option value="noi">Net operating income</option>
        </select>
      </div>

      {viewMode === 'kanban' && (
        <div className="mb-6">
          {filteredProjects.length === 0 ? (
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

      {viewMode === 'list' && (
        <div
          className="overflow-hidden mb-6"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            boxShadow: t.shadow,
          }}
        >
          {sortedListProjects.length === 0 ? (
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: t.muted, borderBottom: `1px solid ${t.divider}` }}
                  >
                    <th className="px-4 py-3 font-semibold">Deal</th>
                    <th
                      className="px-4 py-3 font-semibold cursor-pointer"
                      onClick={() => setListSortBy(listSortBy === 'phase' ? 'year' : 'phase')}
                    >
                      <div className="flex items-center gap-1">
                        Phase &amp; stage
                        <span className="material-symbols-outlined text-xs">
                          {listSortBy === 'phase' ? 'arrow_downward' : 'swap_vert'}
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold">Disposition</th>
                    <th
                      className="px-4 py-3 font-semibold cursor-pointer"
                      onClick={() => setListSortBy(listSortBy === 'year' ? 'phase' : 'year')}
                    >
                      <div className="flex items-center gap-1">
                        Year
                        <span className="material-symbols-outlined text-xs">
                          {listSortBy === 'year' ? 'arrow_downward' : 'swap_vert'}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedListProjects.map((project) => {
                    const phase = project.currentPhase ?? 1;
                    const stage = project.lastActiveStage || project.entryStage || '';
                    const date = project.financials?.acquisitionDate
                      ? new Date(project.financials.acquisitionDate)
                      : new Date(project.createdAt);
                    const year = date.getFullYear();
                    const accent = phaseColor(phase, t);
                    const strategy = getStrategyThemeConfig(project.dispositionType, t);

                    return (
                      <tr
                        key={project.id}
                        onClick={() => handleOpenProject(project.id)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: `1px solid ${t.divider}` }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-sm" style={{ color: t.heading }}>{project.propertyName}</div>
                          <div className="text-xs mt-0.5" style={{ color: t.muted }}>{project.address}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs" style={{ color: accent }}>{getPhaseLabel(phase)}</span>
                            <span className="text-[11px]" style={{ color: t.muted }}>{getStageLabel(stage)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                              background: `${strategy.color}18`,
                              color: strategy.color,
                              borderRadius: 2,
                            }}
                          >
                            {project.dispositionType ?? 'Undecided'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold tabular-nums" style={{ color: t.heading }}>
                          {year}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
