'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ProjectFolderCard from '@/components/projects/ProjectFolderCard';
import REILKanBan from '@/components/projects/REILKanBan';
import AcquisitionPipelineBoard from '@/components/projects/AcquisitionPipelineBoard';
import ProjectStacksView from '@/components/projects/basecamp/ProjectStacksView';
import ProjectLineupView from '@/components/projects/basecamp/ProjectLineupView';
import ProjectEverythingView from '@/components/projects/basecamp/ProjectEverythingView';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';
import { PHASE_LABELS } from '@/lib/projects/phase-utils';
import type { LegacyProjectPhase, ProjectSummary } from '@/lib/projects/types';
import {
  TreeStructure,
  Kanban,
  ListBullets,
  Folder,
  ChartLineUp,
  Newspaper,
  Plus,
  MagnifyingGlass,
  Funnel,
  ArrowClockwise,
  Buildings,
  Calculator,
  PencilSimple,
  ArrowRight,
  X,
} from '@phosphor-icons/react';

type ViewMode = 'pipeline' | 'kanban' | 'list' | 'stacks' | 'lineup' | 'everything';
type PhaseFilter = '' | '1' | '2' | '3' | '4';
type StrategyFilter = '' | 'flip' | 'rental' | 'brrrr';
type StatusFilter = 'active' | 'pending' | 'closed' | 'all';
type SortBy = 'recent' | 'name' | 'phase' | 'price';

const PHASE_BY_FILTER: Record<Exclude<PhaseFilter, ''>, LegacyProjectPhase> = {
  '1': 'acquisition',
  '2': 'purchase',
  '3': 'hold',
  '4': 'exit',
};

const PHASE_ORDER: Record<LegacyProjectPhase, number> = {
  acquisition: 1,
  purchase: 2,
  hold: 3,
  exit: 4,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function isInternalMetadataValidationError(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const upper = val.toUpperCase();
  return (
    upper.includes('UNEXPECTED_KEY') ||
    upper.includes('METADATA_UNKNOWN_JSON') ||
    upper.includes('STAGE WIRE VALIDATION') ||
    upper.includes('UNRECOGNIZED_KEYS')
  );
}

export interface ProjectsListPanelProps {
  initialProjects?: ProjectSummary[];
  initialLoading?: boolean;
  initialViewMode?: ViewMode;
  initialSearch?: string;
  initialPhaseFilter?: PhaseFilter;
  initialStrategyFilter?: StrategyFilter;
  initialStatusFilter?: StatusFilter;
  initialSortBy?: SortBy;
}

export default function ProjectsListPanel({
  initialProjects = [],
  initialLoading = true,
  initialViewMode = 'pipeline',
  initialSearch = '',
  initialPhaseFilter = '',
  initialStrategyFilter = '',
  initialStatusFilter = 'active',
  initialSortBy = 'recent',
}: ProjectsListPanelProps = {}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const auth = useOptionalAuth();
  const isAuthed = auth ? auth.authenticated && !auth.loading : true;
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [search, setSearch] = useState(initialSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>(initialPhaseFilter);
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>(initialStrategyFilter);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);

  const hasActiveFilters =
    search.trim().length > 0 ||
    phaseFilter !== '' ||
    strategyFilter !== '' ||
    statusFilter !== 'active' ||
    sortBy !== 'recent';

  const loadProjects = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const response = await bffFetch('/api/projects', { cache: 'no-store' });
      const body = (await response.json()) as {
        projects?: Array<Record<string, unknown>>;
        error?: string | { message?: string };
      };
      if (!response.ok) {
        const errorMessage =
          typeof body.error === 'string'
            ? body.error
            : body.error?.message || 'Failed to load projects';
        throw new Error(errorMessage);
      }
      const mapped = (body.projects ?? [])
        .filter(
          (row) =>
            !isInternalMetadataValidationError(row.id) &&
            !isInternalMetadataValidationError(row.propertyName) &&
            !isInternalMetadataValidationError(row.address) &&
            !isInternalMetadataValidationError(row.property_address),
        )
        .map((row) => ({
          id: String(row.id ?? ''),
          propertyName: String(row.propertyName ?? row.property_address ?? 'Untitled'),
          address: String(row.address ?? row.property_address ?? ''),
          city: String(row.city ?? ''),
          currentPhase: (row.currentPhase ?? 'acquisition') as LegacyProjectPhase,
          status: String(row.status ?? 'Active'),
          dispositionType: (row.dispositionType === 'RENT' || row.dispositionType === 'MIXED'
            ? row.dispositionType
            : 'SALE') as ProjectSummary['dispositionType'],
          purchasePrice: Number(row.purchasePrice ?? row.purchase_price ?? 0),
          estimatedIrr: Number(row.estimatedIrr ?? 0),
          phaseCompletionPct: Number(row.phaseCompletionPct ?? row.phase_completion_pct ?? 0),
          ownershipPercentage: Number(row.ownershipPercentage ?? 100),
          estimatedExitValue: Number(row.estimatedExitValue ?? 0),
          dealId: row.dealId ? String(row.dealId) : null,
          dealSlug: row.dealSlug ? String(row.dealSlug) : null,
          dealAddress: row.dealAddress ? String(row.dealAddress) : null,
          acquisitionStatus: (row.acquisitionStatus as any) || 'lead',
          tasks: (row.tasks as any) || [],
          deadRecord: (row.deadRecord as any) || null,
          contingencies: (row.contingencies as any) || [],
          underwritingSnapshot: (row.underwritingSnapshot as any) || null,
          isArchived: Boolean(row.isArchived),
        }));
      setProjects(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      if (!isSilent && !isInternalMetadataValidationError(msg)) {
        setError(msg);
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    loadProjects();
  }, [isAuthed, loadProjects]);

  const filteredProjects = useMemo(() => {
    let rows = projects.filter(
      (p) =>
        !isInternalMetadataValidationError(p.id) &&
        !isInternalMetadataValidationError(p.propertyName) &&
        !isInternalMetadataValidationError(p.address),
    );
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const qNumeric = q.replace(/[$,\s]/g, '');
      rows = rows.filter((p) => {
        const strategyLabel =
          p.dispositionType === 'SALE'
            ? 'fix & flip sale'
            : p.dispositionType === 'RENT'
              ? 'rental buy & hold rent'
              : 'brrrr mixed refinance';
        const phaseLabel = (PHASE_LABELS[p.currentPhase] || '').toLowerCase();
        const formattedPurchase = formatCurrency(p.purchasePrice).toLowerCase();
        const formattedExit = p.estimatedExitValue
          ? formatCurrency(p.estimatedExitValue).toLowerCase()
          : '';
        return (
          p.propertyName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          (p.dealAddress && p.dealAddress.toLowerCase().includes(q)) ||
          p.city.toLowerCase().includes(q) ||
          formattedPurchase.includes(q) ||
          (qNumeric.length > 0 && String(p.purchasePrice).includes(qNumeric)) ||
          (formattedExit && formattedExit.includes(q)) ||
          (qNumeric.length > 0 &&
            Boolean(p.estimatedExitValue) &&
            String(p.estimatedExitValue).includes(qNumeric)) ||
          strategyLabel.includes(q) ||
          phaseLabel.includes(q) ||
          p.currentPhase.toLowerCase().includes(q) ||
          (p.status && p.status.toLowerCase().includes(q)) ||
          (p.acquisitionStatus && p.acquisitionStatus.toLowerCase().replace(/_/g, ' ').includes(q))
        );
      });
    }
    if (phaseFilter) {
      const targetPhase = PHASE_BY_FILTER[phaseFilter];
      rows = rows.filter((p) => p.currentPhase === targetPhase);
    }
    if (strategyFilter) {
      rows = rows.filter((p) => {
        const d = (p.dispositionType || '').toLowerCase();
        if (strategyFilter === 'flip') return d === 'sale';
        if (strategyFilter === 'rental') return d === 'rent' || d === 'hold';
        if (strategyFilter === 'brrrr') return d === 'mixed' || d === 'rent';
        return true;
      });
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((p) => {
        const s = (p.status || '').toLowerCase();
        if (statusFilter === 'active') return !s.includes('closed') && !s.includes('archived');
        if (statusFilter === 'pending') return s.includes('review') || s.includes('under');
        if (statusFilter === 'closed') return s.includes('closed') || s.includes('archived');
        return true;
      });
    }
    rows.sort((a, b) => {
      if (sortBy === 'name') return a.propertyName.localeCompare(b.propertyName);
      if (sortBy === 'phase') return PHASE_ORDER[a.currentPhase] - PHASE_ORDER[b.currentPhase];
      if (sortBy === 'price') return b.purchasePrice - a.purchasePrice;
      return 0;
    });
    return rows;
  }, [projects, search, phaseFilter, strategyFilter, statusFilter, sortBy]);

  function clearFilters() {
    if (!hasActiveFilters) return;
    setSearch('');
    setPhaseFilter('');
    setStrategyFilter('');
    setStatusFilter('active');
    setSortBy('recent');
  }

  function handleCreateProject() {
    router.push('/projects/new');
  }

  return (
    <div className="min-h-full w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-28">
      {/* Top Header Bar */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {loading
              ? 'Loading projects…'
              : `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''}${
                  viewMode === 'pipeline'
                    ? ' · Acquisition pipeline'
                    : viewMode === 'kanban'
                    ? ' · REIL lifecycle board'
                    : viewMode === 'stacks'
                    ? ' · Project stacks'
                    : viewMode === 'lineup'
                    ? ' · Lineup roadmap'
                    : viewMode === 'everything'
                    ? ' · Everything & portfolio activity'
                    : ' · list view'
                }`}
          </p>
        </div>

        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 flex-wrap">
          {/* View mode switcher */}
          <div className="flex items-center rounded-none border border-border bg-muted/40 p-1 flex-wrap gap-1">
            {(
              [
                { mode: 'pipeline' as const, Icon: TreeStructure, label: 'Pipeline' },
                { mode: 'kanban' as const, Icon: Kanban, label: 'REIL Board' },
                { mode: 'list' as const, Icon: ListBullets, label: 'List' },
                { mode: 'stacks' as const, Icon: Folder, label: 'Stacks' },
                { mode: 'lineup' as const, Icon: ChartLineUp, label: 'Lineup' },
                { mode: 'everything' as const, Icon: Newspaper, label: 'Everything' },
              ] as const
            ).map(({ mode, Icon, label }) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-semibold transition min-h-[36px] ${
                    active
                      ? 'border border-border bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={16} weight={active ? 'fill' : 'regular'} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <Link
            href="/projects/new"
            className="flex items-center gap-2 rounded-none bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground min-h-[44px] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus size={16} weight="bold" />
            <span>Create Project</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && search) {
                event.preventDefault();
                setSearch('');
              }
            }}
            placeholder="Search address or name…"
            aria-label="Search projects"
            data-testid="projects-search-input"
            className="w-full rounded-none border border-input bg-background py-2 pl-9 pr-10 text-base md:text-xs text-foreground placeholder:text-muted-foreground min-h-[44px] focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
              data-testid="clear-project-search-btn"
              className="absolute right-0 top-0 bottom-0 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-none text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X size={14} weight="bold" />
            </button>
          ) : null}
        </div>

        <select
          value={phaseFilter}
          onChange={(event) => setPhaseFilter(event.target.value as PhaseFilter)}
          aria-label="Filter by phase"
          className="rounded-none border border-input bg-background px-3 py-2 text-base md:text-xs text-foreground min-h-[44px] focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Phases</option>
          <option value="1">Phase 1: Acquisition</option>
          <option value="2">Phase 2: Fund</option>
          <option value="3">Phase 3: Hold</option>
          <option value="4">Phase 4: Exit</option>
        </select>

        <select
          value={strategyFilter}
          onChange={(event) => setStrategyFilter(event.target.value as StrategyFilter)}
          aria-label="Filter by strategy"
          className="rounded-none border border-input bg-background px-3 py-2 text-base md:text-xs text-foreground min-h-[44px] focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Strategies</option>
          <option value="flip">Fix &amp; Flip</option>
          <option value="rental">Long Term Rental</option>
          <option value="brrrr">BRRRR</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="rounded-none border border-input bg-background px-3 py-2 text-base md:text-xs text-foreground min-h-[44px] focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="active">Active Deals</option>
          <option value="pending">Leads &amp; Under Contract</option>
          <option value="closed">Closed / Realized</option>
          <option value="all">All Statuses</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
          aria-label="Sort projects"
          className="rounded-none border border-input bg-background px-3 py-2 text-base md:text-xs text-foreground min-h-[44px] focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="recent">Recently Updated</option>
          <option value="name">Property Name</option>
          <option value="phase">REIL Phase</option>
          <option value="price">Purchase Price</option>
        </select>
      </div>

      {error && !isInternalMetadataValidationError(error) ? (
        <div className="mb-6 rounded-none border border-destructive/30 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-none border border-border bg-card p-10 text-center text-xs sm:text-sm text-muted-foreground shadow-sm">
          Loading REIL board…
        </div>
      ) : null}

      {!loading && !error && filteredProjects.length === 0 ? (
        projects.length === 0 && !hasActiveFilters ? (
          /* Rich Empty State for New Investors / Fresh Workspace */
          <div className="mb-8 rounded-none border border-border bg-card p-8 md:p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-none border border-border bg-muted text-foreground">
              <Buildings size={28} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Start Your First Investment Project</h2>
            <p className="mt-2 max-w-lg mx-auto text-xs sm:text-sm text-muted-foreground leading-relaxed">
              PaperWorking structures deals around the 4-phase Real Estate Investment Lifecycle (REIL).
              Choose an entry point to launch your first deal into Acquisition:
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/deal-calculator"
                className="flex items-center gap-2 rounded-none bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition min-h-[44px]"
              >
                <Calculator size={18} />
                <span>Create from Calculator</span>
              </Link>
              <Link
                href="/projects/new"
                className="flex items-center gap-2 rounded-none border border-border bg-muted/50 px-5 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition min-h-[44px]"
              >
                <PencilSimple size={18} />
                <span>Create Manually</span>
              </Link>
            </div>

            {/* 3 Clickable Template Preview Cards */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
              <Link
                href="/projects/new?strategy=flip"
                className="group rounded-none border border-border bg-muted/20 p-4 transition hover:border-foreground/30 hover:bg-muted/40 no-underline"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Fix &amp; Flip</h3>
                  <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">SALE</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Short 6–12 mo hold. Prefills 12% rehab ratio, 0% rehab vacancy, and 5 standard rehab categories.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground group-hover:underline">
                  Use Flip Template <ArrowRight size={12} />
                </span>
              </Link>

              <Link
                href="/projects/new?strategy=brrrr"
                className="group rounded-none border border-border bg-muted/20 p-4 transition hover:border-foreground/30 hover:bg-muted/40 no-underline"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">BRRRR</h3>
                  <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">REFINANCE</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Buy, Rehab, Rent, Refinance. 7.0% institutional vacancy floor and post-rehab equity extraction.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground group-hover:underline">
                  Use BRRRR Template <ArrowRight size={12} />
                </span>
              </Link>

              <Link
                href="/projects/new?strategy=buy_and_hold_rental"
                className="group rounded-none border border-border bg-muted/20 p-4 transition hover:border-foreground/30 hover:bg-muted/40 no-underline"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Buy &amp; Hold Rental</h3>
                  <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">CASH FLOW</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Durable monthly cash flow. 6.0% institutional vacancy floor, 35% opex ratio, and 30-yr amortization.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground group-hover:underline">
                  Use Rental Template <ArrowRight size={12} />
                </span>
              </Link>
            </div>
          </div>
        ) : (
          /* Filter Empty State */
          <div className="mb-8 flex flex-col items-center justify-center rounded-none border border-border bg-card px-6 py-16 text-center shadow-sm">
            <Funnel size={36} className="mb-3 text-muted-foreground/60" />
            <h2 className="text-base sm:text-lg font-semibold text-foreground">No projects match active filters</h2>
            <p className="mt-2 max-w-sm text-xs sm:text-sm text-muted-foreground">
              Adjust your search keywords or filter criteria to see your deals.
            </p>
            <button
              type="button"
              data-testid="clear-all-filters-btn"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              aria-disabled={!hasActiveFilters}
              className="mt-5 flex cursor-pointer items-center gap-1.5 rounded-none border border-border bg-muted/40 px-4 py-2 text-xs sm:text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline disabled:pointer-events-none min-h-[44px]"
            >
              <ArrowClockwise size={16} />
              <span>Clear all filters</span>
            </button>
          </div>
        )
      ) : null}

      {!loading && !error && filteredProjects.length > 0 && viewMode === 'pipeline' ? (
        <div className="mb-8">
          <AcquisitionPipelineBoard
            projects={filteredProjects}
            onProjectUpdated={(updated) => {
              setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            }}
            onRefresh={() => loadProjects(true)}
          />
        </div>
      ) : null}

      {!loading && !error && filteredProjects.length > 0 && viewMode === 'kanban' ? (
        <div className="mb-8">
          <REILKanBan
            projects={filteredProjects}
            onAdd={handleCreateProject}
            renderCard={(project) => <ProjectFolderCard project={project} />}
          />
        </div>
      ) : null}

      {!loading && !error && viewMode === 'list' ? (
        <div className="mb-8 overflow-hidden rounded-none border border-border bg-card shadow-sm">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">No projects found</h2>
              <button
                type="button"
                data-testid="clear-all-filters-btn"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                aria-disabled={!hasActiveFilters}
                className="mt-4 cursor-pointer text-xs sm:text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline disabled:pointer-events-none min-h-[44px]"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div>
              {/* Mobile Card Stack for small screens */}
              <div className="grid grid-cols-1 gap-2.5 p-3 md:hidden">
                {filteredProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/project/${project.id}`}
                    className="flex flex-col gap-2 rounded-none border border-border bg-card p-4 no-underline transition hover:border-foreground/30 active:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-base truncate">{project.propertyName}</p>
                        <p className="text-xs text-muted-foreground truncate">{project.address || project.city}</p>
                      </div>
                      <span className="rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground shrink-0 uppercase tracking-wide">
                        {PHASE_LABELS[project.currentPhase]}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-border pt-2 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground font-mono">Strategy</span>
                        <span className="font-medium text-foreground">
                          {project.dispositionType === 'SALE'
                            ? 'Fix & Flip'
                            : project.dispositionType === 'RENT'
                              ? 'Rental'
                              : 'Mixed'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground font-mono">Purchase</span>
                        <span className="font-semibold text-foreground">{formatCurrency(project.purchasePrice)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground font-mono">IRR</span>
                        <span className="font-semibold text-primary">
                          {project.estimatedIrr ? `${(project.estimatedIrr * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-3.5 pl-4">Deal Address / Name</th>
                      <th className="p-3.5">Phase &amp; Stage</th>
                      <th className="p-3.5">Disposition</th>
                      <th className="p-3.5">Purchase</th>
                      <th className="p-3.5">IRR</th>
                      <th className="p-3.5 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 pl-4">
                          <p className="font-semibold text-foreground">{project.propertyName}</p>
                          <p className="text-xs text-muted-foreground">{project.address || project.city}</p>
                        </td>
                        <td className="p-3.5 text-xs text-foreground">
                          {PHASE_LABELS[project.currentPhase]}
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">{project.status}</span>
                        </td>
                        <td className="p-3.5 text-xs text-foreground">
                          {project.dispositionType === 'SALE'
                            ? 'Fix & Flip'
                            : project.dispositionType === 'RENT'
                              ? 'Rental'
                              : 'Mixed'}
                        </td>
                        <td className="p-3.5 text-xs font-medium text-foreground">
                          {formatCurrency(project.purchasePrice)}
                        </td>
                        <td className="p-3.5 text-xs font-semibold text-foreground">
                          {project.estimatedIrr
                            ? `${(project.estimatedIrr * 100).toFixed(1)}%`
                            : 'N/A'}
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <Link
                            href={`/project/${project.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline min-h-[32px]"
                          >
                            Open <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : !loading && !error && filteredProjects.length > 0 && viewMode === 'stacks' ? (
        <ProjectStacksView projects={filteredProjects} />
      ) : !loading && !error && filteredProjects.length > 0 && viewMode === 'lineup' ? (
        <ProjectLineupView projects={filteredProjects} />
      ) : !loading && !error && (filteredProjects.length > 0 || !hasActiveFilters) && viewMode === 'everything' ? (
        <ProjectEverythingView />
      ) : null}
    </div>
  );
}
