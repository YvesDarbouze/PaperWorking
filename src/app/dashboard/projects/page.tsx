'use client';

import { useState, useMemo, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { Plus, FolderX, RotateCcw } from 'lucide-react';
import type { Project } from '@/types/schema';
import { EmptyState } from '@/components/ui/empty-states/EmptyState';
import { REILKanBan } from '@/components/projects/REILKanBan';
import { useCreateProjectModal } from '@/store/createProjectModalStore';
import { useAuth } from '@/context/AuthContext';

/* ── Strategy Theme Mapping ── */
function getStrategyThemeConfig(disposition?: string) {
  const str = disposition ?? '';
  if (str === 'SALE') {
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
  if (str === 'RENT') {
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
    2: 'Fund',
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
  const router = useRouter();
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
  const strategyTheme = getStrategyThemeConfig(project.dispositionType);

  const [isEditingRent, setIsEditingRent] = useState(false);
  const [rentInput, setRentInput] = useState((project.financials?.monthlyGrossRent || 0).toString());
  const updateProjectFinancials = useProjectStore((state) => state.updateProjectFinancials);

  // Sync internal state when project financials change externally
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
  const phaseStripeColor = phase === 1 ? '#454955' : phase === 2 ? '#7A9EAA' : phase === 3 ? '#ffac5a' : 'var(--pw-success)';

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
        <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-between gap-1">
          {project.dealId || project.address ? (
            <Link
              href={`/deals/${(project.address || '123mainst').toLowerCase().replace(/[^a-z0-9]/g, '')}/detail`}
              data-testid="linked-deal-address"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[#34d399] hover:underline truncate"
            >
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              <span className="truncate">{project.address || '123 Main St, Austin, TX 78701'}</span>
            </Link>
          ) : (
            <button
              type="button"
              data-testid="link-a-deal-btn"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/projects/new?step=2');
              }}
              className="px-2.5 py-1 rounded-[6px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] text-[10px] font-bold transition-all cursor-pointer"
            >
              Link a deal
            </button>
          )}
        </div>
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
            <p className="text-[10px] text-outline uppercase tracking-wider font-semibold">Acquisition</p>
            <p className="font-label-md text-xs">{formatCurrency(project.financials?.purchasePrice ?? 0)}</p>
            {project.financials?.offer_price !== undefined && project.financials?.offer_price > 0 && (
              <p className="text-[9px] text-primary mt-0.5 font-semibold" id={`card-offer-price-${project.id}`}>
                Offer: {formatCurrency(project.financials.offer_price)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-outline uppercase tracking-wider">{headlineMetric.label}</p>
            {project.dispositionType === 'RENT' ? (
              isEditingRent ? (
                <form
                  onSubmit={handleRentSave}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 mt-0.5"
                >
                  <span className="text-xs text-primary font-semibold">$</span>
                  <input
                    type="text"
                    value={rentInput}
                    onChange={(e) => setRentInput(e.target.value)}
                    onBlur={handleRentSave}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-white outline-none focus:border-primary/50"
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
                  <p className="font-label-md text-xs text-primary transition-colors group-hover/rent:text-primary-container">
                    {headlineMetric.value}
                  </p>
                  <span className="material-symbols-outlined text-[12px] text-primary/40 opacity-0 group-hover/rent:opacity-100 transition-opacity">
                    edit
                  </span>
                </div>
              )
            ) : (
              <p className="font-label-md text-xs text-primary">{headlineMetric.value}</p>
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
    document.title = "PaperWorking — Projects";
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

  if (isVendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ color: 'var(--color-on-surface)' }}>
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] opacity-40">lock</span>
          <p className="text-sm font-semibold tracking-wide">Permission Denied</p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
            Vendors do not have direct access to the Projects portfolio view.
          </p>
        </div>
      </div>
    );
  }

  if (storeProjects.length === 0) {
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
              0 projects
            </p>
          </div>
        </div>

        <div
          className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]"
          style={{
            background: 'var(--color-surface-container-low)',
            border: '1px solid var(--color-glass-card-border)',
            boxShadow: 'var(--color-glass-card-shadow)',
          }}
        >
          <EmptyState
            title="Start your real estate portfolio"
            description="Create your first project to analyze financials, track the acquisition wizard, and manage the deal lifecycle."
            icon={FolderX}
            action={{
              label: "Create First Project",
              onClick: handleCreateProject,
              icon: Plus,
            }}
            variant="card"
          />
        </div>
      </div>
    );
  }

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
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            {viewMode === 'kanban' ? ' · REIL lifecycle board' : ' · list view'}
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
              { mode: 'list'   as const, icon: 'format_list_bulleted', label: 'List'  },
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

        {/* Phase Filter */}
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          aria-label="Filter by phase"
          className="px-4 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(253,255,252,0.7)',
          }}
        >
          <option value="">All Phases</option>
          <option value="1">Phase 1: Acquisition</option>
          <option value="2">Phase 2: Fund</option>
          <option value="3">Phase 3: Hold</option>
          <option value="4">Phase 4: Exit</option>
        </select>

        {/* Strategy Filter */}
        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          aria-label="Filter by strategy"
          className="px-4 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(253,255,252,0.7)',
          }}
        >
          <option value="">All Strategies</option>
          <option value="flip">Fix &amp; Flip</option>
          <option value="rental">Long Term Rental</option>
          <option value="brrrr">BRRRR</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-4 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(253,255,252,0.7)',
          }}
        >
          <option value="active">Active Deals</option>
          <option value="pending">Leads &amp; Under Contract</option>
          <option value="closed">Closed / Realized</option>
          <option value="all">All Statuses</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort projects"
          className="px-4 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(253,255,252,0.7)',
          }}
        >
          <option value="recent">Recently Updated</option>
          <option value="created">Date Created</option>
          <option value="name">Property Name</option>
          <option value="phase">REIL Phase</option>
          <option value="price">Purchase Price</option>
          <option value="noi">Net Operating Income</option>
        </select>
      </div>

      {/* ── Kanban Board ── */}
      {viewMode === 'kanban' && (
        <div className="mb-8">
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

      {/* ── List View Table ── */}
      {viewMode === 'list' && (
        <div
          className="glass-card rounded-2xl overflow-hidden mb-8"
          style={{
            background: 'var(--color-surface-container-low)',
            border: '1px solid var(--color-glass-card-border)',
            boxShadow: 'var(--color-glass-card-shadow)',
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
                  <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <th className="p-4">Deal Address / Name</th>
                    <th
                      className="p-4 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setListSortBy(listSortBy === 'phase' ? 'year' : 'phase')}
                    >
                      <div className="flex items-center gap-1">
                        Phase &amp; Stage
                        <span className="material-symbols-outlined text-xs">
                          {listSortBy === 'phase' ? 'arrow_downward' : 'swap_vert'}
                        </span>
                      </div>
                    </th>
                    <th className="p-4">Disposition</th>
                    <th
                      className="p-4 cursor-pointer hover:text-primary transition-colors"
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
                <tbody className="divide-y divide-white/5 text-sm" style={{ color: 'var(--color-on-surface)' }}>
                  {sortedListProjects.map((project) => {
                    const phase = project.currentPhase ?? 1;
                    const stage = project.lastActiveStage || project.entryStage || '';
                    const date = project.financials?.acquisitionDate 
                      ? new Date(project.financials.acquisitionDate) 
                      : new Date(project.createdAt);
                    const year = date.getFullYear();

                    return (
                      <tr
                        key={project.id}
                        onClick={() => handleOpenProject(project.id)}
                        className="hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold">{project.propertyName}</div>
                          <div className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{project.address}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-primary">{getPhaseLabel(phase)}</span>
                            <span className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>{getStageLabel(stage)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: project.dispositionType === 'SALE' ? 'var(--pw-success-container)' : project.dispositionType === 'RENT' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                              color: project.dispositionType === 'SALE' ? 'var(--pw-success)' : project.dispositionType === 'RENT' ? '#3B82F6' : '#F59E0B',
                            }}
                          >
                            {project.dispositionType ?? 'Undecided'}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-xs">{year}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Terminal Stats Overlay ── */}
      {filteredProjects.length > 0 && (
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
