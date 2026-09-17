'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, type CSSProperties } from 'react';
import ProjectFolderCard from '@/components/projects/ProjectFolderCard';
import REILKanBan from '@/components/projects/REILKanBan';
import AcquisitionPipelineBoard from '@/components/projects/AcquisitionPipelineBoard';
import { bffFetch } from '@/lib/api/bff-fetch';
import { useOptionalAuth } from '@/context/AuthContext';
import { PHASE_LABELS } from '@/lib/projects/phase-utils';
import type { LegacyProjectPhase, ProjectSummary } from '@/lib/projects/types';

type ViewMode = 'pipeline' | 'kanban' | 'list';
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

function selectStyle(active = false): CSSProperties {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)'}`,
    color: 'rgba(253,255,252,0.7)',
  };
}

export default function ProjectsListPanel() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const auth = useOptionalAuth();
  const isAuthed = auth ? (auth.authenticated && !auth.loading) : true;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('');
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortBy, setSortBy] = useState<SortBy>('recent');

  const loadProjects = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const response = await bffFetch('/api/projects', { cache: 'no-store' });
      const body = (await response.json()) as {
        projects?: Array<Record<string, unknown>>;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? 'Failed to load projects');
      const mapped = (body.projects ?? []).map((row) => ({
        id: String(row.id ?? ''),
        propertyName: String(row.propertyName ?? row.property_address ?? 'Untitled'),
        address: String(row.address ?? row.property_address ?? ''),
        city: String(row.city ?? ''),
        currentPhase: (row.currentPhase ?? 'acquisition') as LegacyProjectPhase,
        status: String(row.status ?? 'Active'),
        dispositionType: ((row.dispositionType === 'RENT' || row.dispositionType === 'MIXED') ? row.dispositionType : 'SALE') as ProjectSummary['dispositionType'],
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
      if (!isSilent) setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    loadProjects();
  }, [isAuthed, loadProjects]);

  const filteredProjects = useMemo(() => {
    let rows = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      );
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
    setSearch('');
    setPhaseFilter('');
    setStrategyFilter('');
    setStatusFilter('active');
  }

  function handleCreateProject() {
    router.push('/projects/new');
  }

  return (
    <div className="min-h-full px-5 pb-28 pt-6 lg:px-8 lg:pt-7">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'rgba(253,255,252,0.95)', letterSpacing: '-0.01em' }}
          >
            Projects
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'rgba(253,255,252,0.45)' }}>
            {loading
              ? 'Loading projects…'
              : `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''}${
                  viewMode === 'pipeline'
                    ? ' · Acquisition pipeline'
                    : viewMode === 'kanban'
                    ? ' · REIL lifecycle board'
                    : ' · list view'
                }`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-xl p-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {(
              [
                { mode: 'pipeline' as const, icon: 'account_tree', label: 'Pipeline' },
                { mode: 'kanban' as const, icon: 'view_kanban', label: 'REIL Board' },
                { mode: 'list' as const, icon: 'format_list_bulleted', label: 'List' },
              ] as const
            ).map(({ mode, icon, label }) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150"
                  style={{
                    background: active ? 'rgba(69,73,85,0.25)' : 'transparent',
                    color: active ? 'rgba(253,255,252,0.90)' : 'rgba(253,255,252,0.40)',
                    border: active ? '1px solid rgba(255,255,255,0.10)' : '1px solid transparent',
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

          <Link
            href="/projects/new"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{
              background: '#00dd94',
              color: '#0d0a0b',
              boxShadow: '0 4px 16px rgba(0,221,148,0.25)',
            }}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add_circle
            </span>
            Create Project
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row">
        <div className="group relative flex-1">
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]"
            style={{ color: 'rgba(253,255,252,0.35)' }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by address or name…"
            aria-label="Search projects"
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm transition-all duration-200 focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(253,255,252,0.9)',
            }}
          />
        </div>

        <select
          value={phaseFilter}
          onChange={(event) => setPhaseFilter(event.target.value as PhaseFilter)}
          aria-label="Filter by phase"
          className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          style={selectStyle(Boolean(phaseFilter))}
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
          className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          style={selectStyle(Boolean(strategyFilter))}
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
          className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          style={selectStyle()}
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
          className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          style={selectStyle()}
        >
          <option value="recent">Recently Updated</option>
          <option value="name">Property Name</option>
          <option value="phase">REIL Phase</option>
          <option value="price">Purchase Price</option>
        </select>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-10 text-sm text-white/55">
          Loading REIL board…
        </div>
      ) : null}

      {!loading && !error && filteredProjects.length === 0 ? (
        projects.length === 0 ? (
          /* Rich Empty State for New Investors / Fresh Workspace */
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00dd94]/30 bg-[#00dd94]/10 text-[#00dd94]">
              <span className="material-symbols-outlined text-[30px]">add_home_work</span>
            </div>
            <h3 className="text-xl font-bold text-white">Start Your First Investment Project</h3>
            <p className="mt-2 max-w-lg mx-auto text-xs sm:text-sm text-white/60 leading-relaxed">
              PaperWorking structures deals around the 4-phase Real Estate Investment Lifecycle (REIL).
              Choose an entry point to launch your first deal into Acquisition:
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/deal-calculator"
                className="flex items-center gap-2 rounded-xl bg-[#00dd94] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0a0a0f] hover:brightness-110 shadow-lg shadow-[#00dd94]/20 transition"
              >
                <span className="material-symbols-outlined text-[18px]">calculate</span>
                Create from Calculator
              </Link>
              <Link
                href="/projects/new"
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Create Manually
              </Link>
            </div>

            {/* 3 Clickable Template Preview Cards */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
              <Link
                href="/projects/new?strategy=flip"
                className="group rounded-xl border border-white/10 bg-black/40 p-4 transition hover:border-[#00dd94]/50 hover:bg-[#00dd94]/5 no-underline"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#00dd94]">Fix & Flip</h4>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">SALE</span>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  Short 6–12 mo hold. Prefills 12% rehab ratio, 0% rehab vacancy, and 5 standard rehab categories.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00dd94]">
                  Use Flip Template →
                </span>
              </Link>

              <Link
                href="/projects/new?strategy=brrrr"
                className="group rounded-xl border border-white/10 bg-black/40 p-4 transition hover:border-[#00dd94]/50 hover:bg-[#00dd94]/5 no-underline"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#00dd94]">BRRRR</h4>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">REFINANCE</span>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  Buy, Rehab, Rent, Refinance. 7.0% institutional vacancy floor and post-rehab equity extraction.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00dd94]">
                  Use BRRRR Template →
                </span>
              </Link>

              <Link
                href="/projects/new?strategy=buy_and_hold_rental"
                className="group rounded-xl border border-white/10 bg-black/40 p-4 transition hover:border-[#00dd94]/50 hover:bg-[#00dd94]/5 no-underline"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#00dd94]">Buy & Hold Rental</h4>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">CASH FLOW</span>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  Durable monthly cash flow. 6.0% institutional vacancy floor, 35% opex ratio, and 30-yr amortization.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00dd94]">
                  Use Rental Template →
                </span>
              </Link>
            </div>
          </div>
        ) : (
          /* Filter Empty State */
          <div className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-6 py-16 text-center">
            <span className="material-symbols-outlined mb-3 text-5xl text-white/25">filter_alt_off</span>
            <h3 className="text-lg font-semibold text-[#fdfffc]">No projects match active filters</h3>
            <p className="mt-2 max-w-sm text-sm text-white/50">
              Adjust your search keywords or filter criteria to see your deals.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 flex items-center gap-1.5 rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-white/75 hover:text-white"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Clear all filters
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
        <div
          className="mb-8 overflow-hidden rounded-2xl"
          style={{
            background: 'rgba(18,16,20,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <h3 className="text-lg font-semibold text-[#fdfffc]">No projects found</h3>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-[#7A9EAA]"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div>
              {/* Mobile Card Stack for small screens */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/project/${project.id}`}
                    className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 no-underline transition active:scale-[0.98] touch-press hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white text-base truncate">{project.propertyName}</p>
                        <p className="text-xs text-white/50 truncate">{project.address || project.city}</p>
                      </div>
                      <span className="rounded-full bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/30 px-2.5 py-0.5 text-[10.5px] font-semibold text-[color:var(--color-primary)] shrink-0">
                        {PHASE_LABELS[project.currentPhase]}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2.5 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase text-white/40 font-mono">Strategy</span>
                        <span className="font-medium text-white/80">
                          {project.dispositionType === 'SALE'
                            ? 'Fix & Flip'
                            : project.dispositionType === 'RENT'
                              ? 'Rental'
                              : 'Mixed'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-white/40 font-mono">Purchase</span>
                        <span className="font-semibold text-white">{formatCurrency(project.purchasePrice)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-white/40 font-mono">IRR</span>
                        <span className="font-semibold text-[color:var(--color-primary)]">
                          {project.estimatedIrr ? `${(project.estimatedIrr * 100).toFixed(1)}%` : '—'}
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
                    <tr
                      className="border-b border-white/5 text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'rgba(253,255,252,0.4)' }}
                    >
                      <th className="p-4">Deal Address / Name</th>
                      <th className="p-4">Phase &amp; Stage</th>
                      <th className="p-4">Disposition</th>
                      <th className="p-4">Purchase</th>
                      <th className="p-4">IRR</th>
                      <th className="p-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="border-b border-white/5 last:border-0">
                        <td className="p-4">
                          <p className="font-semibold text-[#fdfffc]">{project.propertyName}</p>
                          <p className="text-xs text-white/45">{project.address || project.city}</p>
                        </td>
                        <td className="p-4 text-sm text-white/70">
                          {PHASE_LABELS[project.currentPhase]}
                          <span className="mt-0.5 block text-xs text-white/40">{project.status}</span>
                        </td>
                        <td className="p-4 text-sm text-white/70">
                          {project.dispositionType === 'SALE'
                            ? 'Fix & Flip'
                            : project.dispositionType === 'RENT'
                              ? 'Rental'
                              : 'Mixed'}
                        </td>
                        <td className="p-4 text-sm text-white/85">
                          {formatCurrency(project.purchasePrice)}
                        </td>
                        <td className="p-4 text-sm text-white/85">
                          {project.estimatedIrr
                            ? `${(project.estimatedIrr * 100).toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/project/${project.id}`}
                            className="text-[12px] font-semibold text-[#34d399] no-underline hover:underline"
                          >
                            Open
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
      ) : null}
    </div>
  );
}
