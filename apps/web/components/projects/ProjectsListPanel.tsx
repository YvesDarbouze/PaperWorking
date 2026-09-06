'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import ProjectFolderCard from '@/components/projects/ProjectFolderCard';
import REILKanBan from '@/components/projects/REILKanBan';
import { PHASE_LABELS } from '@/lib/projects/phase-utils';
import type { LegacyProjectPhase, ProjectSummary } from '@/lib/projects/types';
import { bffFetch } from '@/lib/api/bff-fetch';

type ViewMode = 'kanban' | 'list';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('');
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortBy, setSortBy] = useState<SortBy>('recent');

  useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      setLoading(true);
      setError(null);
      try {
        const response = await bffFetch('/api/projects', { credentials: 'include', cache: 'no-store' });
        const body = (await response.json()) as {
          projects?: Array<Record<string, unknown>>;
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load projects');
        const mapped = (body.projects ?? []).map((row) => ({
          id: String(row.id ?? ''),
          propertyName: String(row.propertyName ?? row.name ?? row.title ?? ''),
          address: String(row.address ?? ''),
          city: String(row.city ?? ''),
          currentPhase: row.currentPhase as ProjectSummary['currentPhase'],
          status: String(row.status ?? ''),
          dispositionType: row.dispositionType as ProjectSummary['dispositionType'],
          purchasePrice: Number(row.purchasePrice ?? 0),
          estimatedIrr: typeof row.estimatedIrr === 'number' ? row.estimatedIrr : undefined,
          phaseCompletionPct:
            typeof row.phaseCompletionPct === 'number' ? row.phaseCompletionPct : undefined,
          ownershipPercentage:
            typeof row.ownershipPercentage === 'number' ? row.ownershipPercentage : 100,
          estimatedExitValue:
            typeof row.estimatedExitValue === 'number' ? row.estimatedExitValue : undefined,
          dealId: row.dealId != null && row.dealId !== '' ? String(row.dealId) : null,
          dealSlug: row.dealSlug != null && row.dealSlug !== '' ? String(row.dealSlug) : null,
          dealAddress:
            row.dealAddress != null && row.dealAddress !== ''
              ? String(row.dealAddress)
              : row.address
                ? String(row.address)
                : null,
        }));
        if (!cancelled) setProjects(mapped);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load projects');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = projects.filter((project) => {
      if (phaseFilter && project.currentPhase !== PHASE_BY_FILTER[phaseFilter]) return false;
      if (strategyFilter === 'flip' && project.dispositionType !== 'SALE') return false;
      if (strategyFilter === 'rental' && project.dispositionType !== 'RENT') return false;
      if (strategyFilter === 'brrrr' && project.dispositionType !== 'MIXED') return false;
      if (statusFilter === 'active') {
        const closed = /closed|realized|sold/i.test(project.status);
        if (closed) return false;
      } else if (statusFilter === 'pending') {
        if (!/lead|under contract|underwriting|review/i.test(project.status)) return false;
      } else if (statusFilter === 'closed') {
        if (!/closed|realized|sold/i.test(project.status)) return false;
      }
      if (!q) return true;
      return (
        project.propertyName.toLowerCase().includes(q) ||
        project.address.toLowerCase().includes(q) ||
        project.city.toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'name') return a.propertyName.localeCompare(b.propertyName);
      if (sortBy === 'phase') return PHASE_ORDER[a.currentPhase] - PHASE_ORDER[b.currentPhase];
      if (sortBy === 'price') return b.purchasePrice - a.purchasePrice;
      return a.propertyName.localeCompare(b.propertyName);
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
                  viewMode === 'kanban' ? ' · REIL lifecycle board' : ' · list view'
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
                { mode: 'kanban' as const, icon: 'view_kanban', label: 'Board' },
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

          <button
            type="button"
            onClick={handleCreateProject}
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
          </button>
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

      {!loading && !error && viewMode === 'kanban' ? (
        <div className="mb-8">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-6 py-16 text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-white/25">folder_off</span>
              <h3 className="text-lg font-semibold text-[#fdfffc]">No projects found</h3>
              <p className="mt-2 max-w-sm text-sm text-white/50">
                Adjust your filters or clear them to see your projects.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 flex items-center gap-1.5 rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-white/75"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Clear all filters
              </button>
            </div>
          ) : (
            <REILKanBan
              projects={filteredProjects}
              onAdd={handleCreateProject}
              renderCard={(project) => <ProjectFolderCard project={project} />}
            />
          )}
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
            <div className="overflow-x-auto">
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
          )}
        </div>
      ) : null}
    </div>
  );
}
