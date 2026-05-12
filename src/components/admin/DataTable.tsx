'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   DataTable — Interactive sortable/filterable table
   
   Antigravity dashboard-context styling.
   ═══════════════════════════════════════════════════════ */

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKeys?: string[];
  searchPlaceholder?: string;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKeys = [],
  searchPlaceholder = 'Search…',
  actions,
  emptyMessage = 'No data found.',
  pageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <div>
      {/* Search bar */}
      {searchKeys.length > 0 && (
        <div className="mb-4 relative" style={{ maxWidth: 380 }}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="pw-input w-full pl-9 pr-4 py-2.5 text-sm"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-auto"
        style={{
          border: '1px solid var(--border-ui)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-surface)',
        }}
      >
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-ui)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                  style={{
                    color: 'var(--text-secondary)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
              {actions && (
                <th
                  className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={idx}
                  className="transition-colors duration-100"
                  style={{ borderBottom: idx < paged.length - 1 ? '1px solid var(--border-ui)' : undefined }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 whitespace-nowrap"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-opacity disabled:opacity-30"
              style={{ color: 'var(--text-primary)' }}
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-opacity disabled:opacity-30"
              style={{ color: 'var(--text-primary)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
