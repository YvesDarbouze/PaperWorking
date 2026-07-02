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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const paginationRange = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const showLeftDots = page > 2;
    const showRightDots = page < totalPages - 3;

    if (!showLeftDots && showRightDots) {
      return [0, 1, 2, 3, 'ellipsis-end', totalPages - 1];
    }

    if (showLeftDots && !showRightDots) {
      return [0, 'ellipsis-start', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
    }

    return [0, 'ellipsis-start', page, 'ellipsis-end', totalPages - 1];
  }, [totalPages, page]);

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
        <div className="relative mb-4 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="glass-input w-full pl-9 pr-4 py-2 text-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="border-b border-white/5 bg-surface-container-highest/50 backdrop-blur-md sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-6 py-4 font-label-md text-label-md uppercase tracking-wider whitespace-nowrap select-none transition-colors duration-200 ${
                    col.sortable ? 'cursor-pointer hover:text-pw-primary' : 'cursor-default'
                  } ${sortKey === col.key ? 'text-pw-primary' : 'text-outline'}`}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp className="w-3.5 h-3.5 text-pw-primary" />
                        : <ChevronDown className="w-3.5 h-3.5 text-pw-primary" />
                    )}
                  </span>
                </th>
              ))}
              {actions && (
                <th className="text-right px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider">
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
                  className="px-6 py-12 text-center text-sm text-pw-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/5 last:border-b-0 hover:bg-white/5 active:bg-white/10 active:duration-75 transition-colors duration-300 cursor-pointer"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 whitespace-nowrap font-body-sm text-body-sm text-pw-black"
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right whitespace-nowrap font-body-sm text-body-sm text-pw-black">
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
          <p className="text-xs text-pw-muted font-body-sm">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-white/5 bg-surface-container-high hover:bg-surface-container-highest text-pw-black transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>

            {paginationRange.map((item, index) => {
              if (item === 'ellipsis-start' || item === 'ellipsis-end') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 py-1 text-xs text-pw-muted select-none"
                  >
                    ...
                  </span>
                );
              }

              const pageIdx = item as number;
              const isActive = pageIdx === page;
              return (
                <button
                  key={pageIdx}
                  onClick={() => setPage(pageIdx)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-full transition-colors duration-200 ${
                    isActive
                      ? 'bg-pw-primary text-on-primary'
                      : 'bg-surface-container-high hover:bg-surface-container-highest border border-white/5 text-pw-black'
                  }`}
                >
                  {pageIdx + 1}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-white/5 bg-surface-container-high hover:bg-surface-container-highest text-pw-black transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
