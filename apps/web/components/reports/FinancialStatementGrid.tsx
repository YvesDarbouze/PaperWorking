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
      className="flex flex-col rounded-none border border-border bg-card shadow-sm ring-1 ring-foreground/10 overflow-hidden"
    >
      {/* Statement Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 sm:px-6 py-4 bg-card">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-none border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">
            Fiscal Year {fiscalYear}
          </span>
          <span className="rounded-none border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
            Chronological (Oldest → Newest)
          </span>
        </div>
      </div>

      {/* Grid Table with Horizontal Scroll */}
      <div
        tabIndex={0}
        role="region"
        aria-label={title}
        className="relative w-full overflow-x-auto focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <table className="w-full text-left text-xs text-foreground border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th
                scope="col"
                className="min-w-[240px] bg-card px-6 py-3.5 font-bold whitespace-nowrap border-r border-border text-foreground"
              >
                Line Item
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`min-w-[110px] px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap ${
                    col.isTotal
                      ? 'bg-muted/60 text-foreground border-l border-border'
                      : ''
                  }`}
                >
                  <div>{col.label}</div>
                  {col.sublabel && (
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {col.sublabel}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              if (row.isHeader) {
                return (
                  <tr
                    key={row.id}
                    className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    data-testid={`row-header-${row.id}`}
                  >
                    <td
                      colSpan={columns.length + 1}
                      className="bg-muted/50 px-6 py-2.5 whitespace-nowrap"
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
                ? 'bg-muted/60 font-extrabold text-foreground border-t-2 border-b-2 border-border'
                : isSubtotal
                ? 'bg-card font-bold text-foreground border-t border-border'
                : 'bg-card hover:bg-muted/30 text-muted-foreground';

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${rowStyle}`}
                  data-testid={`row-${row.id}`}
                >
                  <th
                    scope="row"
                    className={`${indentClass} pr-6 py-2.5 font-sans whitespace-nowrap border-r border-border ${
                      isTotal ? 'bg-muted/60 text-foreground font-bold' : isSubtotal ? 'bg-card text-foreground font-semibold' : 'bg-card text-muted-foreground'
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
                          className={`px-4 py-2.5 text-right font-mono text-[11px] whitespace-nowrap ${
                            isTotalCol ? 'bg-muted/50 border-l border-border' : ''
                          }`}
                        >
                          <span className="inline-flex rounded-none bg-status-caution/10 px-1.5 py-0.5 text-[9px] font-bold text-status-caution">
                            INSUFFICIENT
                          </span>
                        </td>
                      );
                    }

                    const isNegative = val !== null && val !== undefined && val < 0;
                    const formatted =
                      val !== null && val !== undefined
                        ? formatCurrency(val, { decimals: 0, negativeParens: true })
                        : 'N/A';

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                          isTotalCol ? 'bg-muted/50 border-l border-border font-bold' : ''
                        } ${
                          isNegative
                            ? 'text-destructive'
                            : isTotal || (isTotalCol && isSubtotal)
                            ? 'text-foreground font-bold'
                            : 'text-foreground'
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
