'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardPageHeader, {
  DashboardPrimaryButton,
  DashboardSecondaryButton,
} from '@/components/dashboard/DashboardPageHeader';
import {
  formatCurrency,
  formatPercent,
  PHASE_COLORS,
  PHASE_LABELS,
} from '@/lib/projects/phase-utils';
import type { LegacyProjectPhase, ProjectSummary } from '@/lib/projects/types';

type ViewMode = 'board' | 'list';
type PhaseFilter = 'all' | LegacyProjectPhase;

const PHASE_COLUMNS: LegacyProjectPhase[] = ['acquisition', 'purchase', 'hold', 'exit'];

export default function ProjectsListPanel() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('board');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/projects', { credentials: 'include', cache: 'no-store' });
        const body = (await response.json()) as {
          projects?: Array<Record<string, unknown>>;
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? 'Failed to load projects');
        const mapped = (body.projects ?? []).map((row) => ({
          id: String(row.id ?? ''),
          propertyName: String(row.propertyName ?? ''),
          address: String(row.address ?? ''),
          city: String(row.city ?? ''),
          currentPhase: row.currentPhase as ProjectSummary['currentPhase'],
          status: String(row.status ?? ''),
          dispositionType: row.dispositionType as ProjectSummary['dispositionType'],
          purchasePrice: Number(row.purchasePrice ?? 0),
          estimatedIrr: typeof row.estimatedIrr === 'number' ? row.estimatedIrr : undefined,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (phaseFilter !== 'all' && project.currentPhase !== phaseFilter) return false;
      if (!q) return true;
      return (
        project.propertyName.toLowerCase().includes(q) ||
        project.address.toLowerCase().includes(q) ||
        project.city.toLowerCase().includes(q)
      );
    });
  }, [projects, query, phaseFilter]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Projects"
        subtitle={
          loading
            ? 'Loading your REIL pipeline…'
            : `${filtered.length} project${filtered.length === 1 ? '' : 's'} · Board & list views`
        }
        actions={
          <>
            <div className="flex rounded-lg border border-white/10 p-0.5">
              {(['board', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-semibold capitalize ${
                    view === mode ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <DashboardSecondaryButton href="/dashboard/deals" icon="handshake">
              Deals
            </DashboardSecondaryButton>
            <DashboardPrimaryButton href="/projects" icon="add">
              New Project
            </DashboardPrimaryButton>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by address or name"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white lg:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all' as const, label: 'All phases' },
              ...PHASE_COLUMNS.map((phase) => ({
                id: phase as PhaseFilter,
                label: PHASE_LABELS[phase],
              })),
            ] as Array<{ id: PhaseFilter; label: string }>
          ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPhaseFilter(option.id)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                  phaseFilter === option.id
                    ? 'bg-white text-black'
                    : 'border border-white/12 text-white/60 hover:bg-white/5'
                }`}
              >
                {option.label}
              </button>
            ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#121014]/90 p-8 text-sm text-white/60">
          Loading projects…
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#121014]/90 px-8 py-16 text-center">
          <span className="material-symbols-outlined mb-3 text-5xl text-white/25">folder_open</span>
          <h3 className="text-lg font-semibold text-[#fdfffc]">No projects yet</h3>
          <p className="mt-2 max-w-sm text-sm text-white/55">
            Create your first project to populate the REIL board across Acquisition → Exit.
          </p>
          <Link
            href="/projects"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#454955] px-4 py-2 text-sm font-semibold text-white no-underline"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create First Project
          </Link>
        </div>
      ) : null}

      {!loading && !error && filtered.length > 0 && view === 'board' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PHASE_COLUMNS.map((phase) => {
            const column = filtered.filter((project) => project.currentPhase === phase);
            const colors = PHASE_COLORS[phase];
            return (
              <section
                key={phase}
                className="rounded-2xl border border-white/10 bg-[#121014]/90 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {PHASE_LABELS[phase]}
                  </span>
                  <span className="font-mono text-[11px] text-white/40">{column.length}</span>
                </div>
                <div className="space-y-2.5 min-h-[120px]">
                  {column.map((project) => (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      className="block rounded-xl border border-white/8 bg-white/[0.03] p-3 no-underline transition hover:border-white/16"
                    >
                      <p className="text-sm font-semibold text-[#fdfffc]">{project.propertyName}</p>
                      <p className="mt-0.5 text-[11px] text-white/45">{project.city}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-white/55">
                        <span>{formatCurrency(project.purchasePrice)}</span>
                        <span>
                          {project.estimatedIrr ? formatPercent(project.estimatedIrr) : '—'} IRR
                        </span>
                      </div>
                    </Link>
                  ))}
                  {column.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[11px] text-white/35">Empty</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && filtered.length > 0 && view === 'list' ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121014]/90">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Strategy</th>
                <th className="px-4 py-3 font-medium">Purchase</th>
                <th className="px-4 py-3 font-medium">IRR</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const colors = PHASE_COLORS[project.currentPhase];
                return (
                  <tr key={project.id} className="border-t border-white/8">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#fdfffc]">{project.propertyName}</p>
                      <p className="text-xs text-white/45">{project.city}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {PHASE_LABELS[project.currentPhase]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/65">
                      {project.dispositionType === 'SALE' ? 'Fix & Flip' : 'Rental'}
                    </td>
                    <td className="px-4 py-3 text-white/85">{formatCurrency(project.purchasePrice)}</td>
                    <td className="px-4 py-3 text-white/85">
                      {project.estimatedIrr ? formatPercent(project.estimatedIrr) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/project/${project.id}`}
                        className="text-[12px] font-semibold text-[#7A9EAA] no-underline hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
