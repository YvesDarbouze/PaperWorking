'use client';

import React from 'react';
import { formatCurrency } from '@/lib/viz/format';
import type {
  StatementColumn,
  StatementRow,
} from '@paperworking/financial-engine';

export interface FinancialStatementGridProps {
  title: string;
  subtitle?: string;
  fiscalYear: number;
  columns: StatementColumn[];
  rows: StatementRow[];
  testId?: string;
}

export function FinancialStatementGrid({
  title,
  subtitle,
  fiscalYear,
  columns,
  rows,
  testId = 'financial-statement-grid',
}: FinancialStatementGridProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col rounded-2xl border border-border-subtle bg-surface/60 shadow-lg backdrop-blur-md overflow-hidden"
    >
      {/* Statement Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 bg-surface">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-text-primary">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
            Fiscal Year {fiscalYear}
          </span>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">
            Chronological (Oldest → Newest)
          </span>
        </div>
      </div>

      {/* Grid Table with Horizontal Scroll & Sticky First Column */}
      <div
        tabIndex={0}
        role="region"
        aria-label={title}
        className="relative w-full overflow-x-auto focus:outline-none focus:ring-1 focus:ring-accent/50"
      >
        <table className="w-full text-left text-xs text-text-primary border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app/40 text-[11px] uppercase tracking-wider text-text-muted">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[280px] bg-surface px-6 py-3.5 font-bold shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-border-subtle/50"
              >
                Line Item
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`min-w-[110px] px-4 py-3.5 text-right font-mono font-bold ${
                    col.isTotal
                      ? 'bg-elevated/50 text-accent border-l border-border-subtle'
                      : ''
                  }`}
                >
                  <div>{col.label}</div>
                  {col.sublabel && (
                    <div className="text-[10px] font-normal text-text-muted">
                      {col.sublabel}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row) => {
              if (row.isHeader) {
                return (
                  <tr
                    key={row.id}
                    className="bg-elevated/40 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                    data-testid={`row-header-${row.id}`}
                  >
                    <td
                      colSpan={columns.length + 1}
                      className="sticky left-0 z-10 bg-elevated px-6 py-2.5 border-r border-border-subtle/50"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              const isSubtotal = row.isSubtotal;
              const isTotal = row.isTotal;
              const indentClass =
                row.indent === 1 ? 'pl-9' : row.indent === 2 ? 'pl-14' : 'pl-6';

              const rowStyle = isTotal
                ? 'bg-accent/10 font-extrabold text-text-primary border-t-2 border-b-2 border-accent/30'
                : isSubtotal
                ? 'bg-surface font-bold text-text-primary border-t border-border-subtle'
                : 'hover:bg-elevated/40 text-text-secondary';

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${rowStyle}`}
                  data-testid={`row-${row.id}`}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 ${indentClass} pr-4 py-2.5 font-sans whitespace-nowrap bg-surface shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-border-subtle/50 ${
                      isTotal ? 'text-accent font-bold' : isSubtotal ? 'text-text-primary font-semibold' : 'text-text-secondary'
                    }`}
                  >
                    {row.label}
                  </th>

                  {columns.map((col) => {
                    const isTotalCol = col.isTotal;
                    const val = isTotalCol ? row.total : row.values[col.key];

                    if (row.status === 'insufficient_inputs') {
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 text-right font-mono text-[11px] ${
                            isTotalCol ? 'bg-elevated/50 border-l border-border-subtle' : ''
                          }`}
                        >
                          <span className="inline-flex rounded bg-status-caution/10 px-1.5 py-0.5 text-[9px] font-bold text-status-caution">
                            INSUFFICIENT
                          </span>
                        </td>
                      );
                    }

                    const isNegative = val !== null && val !== undefined && val < 0;
                    const formatted =
                      val !== null && val !== undefined
                        ? formatCurrency(val, { decimals: 0, negativeParens: true })
                        : '—';

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                          isTotalCol ? 'bg-elevated/50 border-l border-border-subtle font-bold' : ''
                        } ${
                          isNegative
                            ? 'text-danger'
                            : isTotal || (isTotalCol && isSubtotal)
                            ? 'text-text-primary font-bold'
                            : 'text-text-primary'
                        }`}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FinancialStatementGrid;
