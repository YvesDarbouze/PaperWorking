'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  FolderOpen,
  Building2,
  MoreHorizontal,
  Pencil,
  Archive,
  ExternalLink,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects — Project Directory Table

   Industry-standard directory UI for managing project folders.
   Features: local search, phase/status filter dropdowns,
   sortable column headers, and navigable row hover states.

   Palette: --bg-canvas, --bg-surface, --border-ui,
            --text-primary, --text-secondary
   ═══════════════════════════════════════════════════════════════ */

/* ── Types ── */
type DealStatus = 'Active' | 'Lead' | 'Under Contract' | 'Renovating' | 'Listed' | 'Sold';
type PhaseLabel = 'Sourcing' | 'Due Diligence' | 'Closing' | 'Renovation' | 'Stabilization' | 'Disposition';
type SortDir = 'asc' | 'desc' | null;
type SortKey = 'projectName' | 'phase' | 'status' | 'updatedAt';

interface ProjectRow {
  id: string;
  projectName: string;
  address: string;
  phase: PhaseLabel;
  status: DealStatus;
  updatedAt: string; // ISO date
}

/* ── Mock data ── */
const MOCK_PROJECTS: ProjectRow[] = [
  { id: '1', projectName: '42 Elm Street Duplex',     address: '42 Elm St, Austin TX',        phase: 'Renovation',    status: 'Renovating',     updatedAt: '2026-04-25T14:30:00Z' },
  { id: '2', projectName: 'Westlake Office Park',     address: '1200 Westlake Dr, Austin TX',  phase: 'Due Diligence', status: 'Under Contract',  updatedAt: '2026-04-24T09:15:00Z' },
  { id: '3', projectName: 'Riverside 4-Plex',         address: '88 River Rd, San Antonio TX',  phase: 'Disposition',   status: 'Listed',          updatedAt: '2026-04-22T18:00:00Z' },
  { id: '4', projectName: 'Montrose Bungalow',        address: '315 Montrose Blvd, Houston TX', phase: 'Sourcing',     status: 'Lead',            updatedAt: '2026-04-26T11:45:00Z' },
  { id: '5', projectName: 'Downtown Loft Conversion', address: '900 Main St, Dallas TX',       phase: 'Closing',       status: 'Under Contract',  updatedAt: '2026-04-23T16:20:00Z' },
  { id: '6', projectName: 'Kingswood Townhome',       address: '77 Kingswood Ln, Plano TX',    phase: 'Stabilization', status: 'Renovating',      updatedAt: '2026-04-20T08:00:00Z' },
  { id: '7', projectName: 'Lakeside Retreat',         address: '450 Lake View Dr, Frisco TX',  phase: 'Disposition',   status: 'Sold',            updatedAt: '2026-04-15T12:00:00Z' },
];

const ALL_PHASES: PhaseLabel[] = ['Sourcing', 'Due Diligence', 'Closing', 'Renovation', 'Stabilization', 'Disposition'];
const ALL_STATUSES: DealStatus[] = ['Active', 'Lead', 'Under Contract', 'Renovating', 'Listed', 'Sold'];

/* ── Status badge color map ── */
function statusBadgeStyle(status: DealStatus): string {
  const map: Record<DealStatus, string> = {
    Active:           'bg-green-50 text-green-700',
    Lead:             'bg-slate-100 text-slate-600',
    'Under Contract': 'bg-amber-50 text-amber-700',
    Renovating:       'bg-orange-50 text-orange-700',
    Listed:           'bg-sky-50 text-sky-700',
    Sold:             'bg-emerald-50 text-emerald-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

/* ── Relative date formatter ── */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Filter Dropdown ── */
function FilterDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T | 'all';
  onChange: (v: T | 'all') => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | 'all')}
        aria-label={label}
        className="appearance-none pl-3 pr-8 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-ui)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="all">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
        style={{ color: 'var(--text-secondary)' }}
        aria-hidden="true"
      />
    </div>
  );
}

/* ── Sort icon ── */
function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp className="w-3 h-3 ml-1" />;
  if (dir === 'desc') return <ChevronDown className="w-3 h-3 ml-1" />;
  return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-30" />;
}

/* ══════════════════════════════════════════
   ProjectsPage (default export)
   ══════════════════════════════════════════ */

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseLabel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  /* Toggle sort on column click */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  /* Filtered + sorted data */
  const rows = useMemo(() => {
    let data = [...MOCK_PROJECTS];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }

    // Filters
    if (phaseFilter !== 'all') data = data.filter((p) => p.phase === phaseFilter);
    if (statusFilter !== 'all') data = data.filter((p) => p.status === statusFilter);

    // Sort
    if (sortKey && sortDir) {
      data.sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'updatedAt') {
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        } else {
          cmp = a[sortKey].localeCompare(b[sortKey]);
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return data;
  }, [search, phaseFilter, statusFilter, sortKey, sortDir]);

  /* Column definitions */
  const columns: { key: SortKey; label: string; className: string }[] = [
    { key: 'projectName', label: 'Project Name',  className: 'w-[40%]' },
    { key: 'phase',       label: 'Current Phase',  className: 'w-[20%]' },
    { key: 'status',      label: 'Status',          className: 'w-[20%]' },
    { key: 'updatedAt',   label: 'Last Updated',    className: 'w-[20%]' },
  ];

  return (
    <div className="min-h-full px-8 py-8 overflow-y-auto" style={{ background: 'var(--bg-canvas)' }}>

      {/* ── Page Header ── */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1A1A1A' }}>
            <FolderOpen className="w-5 h-5" style={{ color: '#FFFFFF' }} aria-hidden="true" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
            Deal Management
          </p>
        </div>
        <h1 className="text-4xl font-extralight tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
          Projects
        </h1>
        <p className="text-sm mt-3 font-normal tracking-tight" style={{ color: 'var(--text-secondary)' }}>
          Browse, filter, and manage all deals across your portfolio
        </p>
      </header>

      {/* ── Controls: Search + Filters ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--text-secondary)' }}
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-ui)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <FilterDropdown label="Filter by Phase" options={ALL_PHASES} value={phaseFilter} onChange={setPhaseFilter} />
        <FilterDropdown label="Filter by Status" options={ALL_STATUSES} value={statusFilter} onChange={setStatusFilter} />

        {/* Result count */}
        <span className="text-[10px] font-medium ml-auto tabular-nums" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
          {rows.length} project{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
        <table className="w-full text-left">
          {/* Head */}
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-ui)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.className} px-5 py-3.5 cursor-pointer select-none transition-colors duration-150`}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => handleSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none') : 'none'}
                >
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.15em]">
                    {col.label}
                    <SortIcon dir={sortKey === col.key ? sortDir : null} />
                  </span>
                </th>
              ))}
              {/* Actions column — no sort */}
              <th className="w-12 px-3 py-3.5" aria-label="Row actions" />
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
                      <FolderOpen className="w-5 h-5" style={{ color: 'var(--text-secondary)', opacity: 0.4 }} aria-hidden="true" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-secondary)' }}>
                      No projects found
                    </p>
                    <p className="text-[10px] max-w-[200px] leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="group cursor-pointer transition-colors duration-150"
                  style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--border-ui)' : undefined }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-canvas)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { /* placeholder: navigate to /dashboard/projects/[id] */ }}
                  role="link"
                  tabIndex={0}
                  aria-label={`View project: ${row.projectName}`}
                >
                  {/* Project Name + Address */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-black group-hover:text-white"
                        style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)' }}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {row.projectName}
                        </p>
                        <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                          {row.address}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phase */}
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {row.phase}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded ${statusBadgeStyle(row.status)}`}>
                      {row.status}
                    </span>
                  </td>

                  {/* Last Updated */}
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(row.updatedAt)}
                    </span>
                  </td>

                  {/* ── Triple-dot actions ── */}
                  <td className="px-3 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenRowMenuId(openRowMenuId === row.id ? null : row.id)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 transition-all"
                        style={{ color: 'var(--text-secondary)' }}
                        aria-label={`Actions for ${row.projectName}`}
                      >
                        <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                      </button>

                      {openRowMenuId === row.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenRowMenuId(null)} />
                          <div
                            className="absolute right-0 top-full mt-1 w-44 z-20 rounded-lg py-1 shadow-lg"
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-ui)',
                            }}
                          >
                            <button
                              onClick={() => setOpenRowMenuId(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-bg-primary transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
                              Open Project
                            </button>
                            <button
                              onClick={() => setOpenRowMenuId(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-bg-primary transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <Pencil className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
                              Edit Details
                            </button>
                            <div className="my-1" style={{ borderTop: '1px solid var(--border-ui)' }} />
                            <button
                              onClick={() => setOpenRowMenuId(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-text-secondary hover:bg-bg-primary transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" strokeWidth={2} />
                              Archive
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
