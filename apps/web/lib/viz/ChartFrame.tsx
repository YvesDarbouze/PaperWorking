'use client';

import React from 'react';
import { VIZ_TYPOGRAPHY } from './theme';

export interface ChartLegendItem {
  label: string;
  color: string;
  style?: 'solid' | 'dashed';
}

export interface ChartDataTable {
  caption?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ChartFrameProps {
  title: string;
  timeframe?: string;
  subtitle?: string;
  unitBadge?: string;
  legend?: ChartLegendItem[];
  source?: string;
  ariaLabel: string;
  dataTable?: ChartDataTable;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  testId?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

/**
 * ChartFrame — Standardized wrapper component enforcing the Data Visualization Constitution.
 * Provides Title, Timeframe, Unit Badge, Legend, Provenance Footer, and Screen-Reader Data Table.
 */
export function ChartFrame({
  title,
  timeframe,
  subtitle,
  unitBadge,
  legend,
  source,
  ariaLabel,
  dataTable,
  headerAction,
  children,
  className = '',
  contentClassName = '',
  testId,
  onClick,
}: ChartFrameProps) {
  const showLegend = legend && legend.length > 1;

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLElement>);
        }
      }
    : undefined;

  return (
    <figure
      role="figure"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      className={`relative flex flex-col rounded-2xl border border-[var(--border-subtle,rgba(255,255,255,0.1))] bg-[#121014]/50 p-5 shadow-sm backdrop-blur-md ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={VIZ_TYPOGRAPHY.title} data-testid="chart-title">
              {title}
            </h3>
            {timeframe && (
              <span
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                data-testid="chart-timeframe"
              >
                {timeframe}
              </span>
            )}
            {unitBadge && (
              <span
                className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-300"
                data-testid="chart-unit-badge"
              >
                {unitBadge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 leading-normal" data-testid="chart-subtitle">
              {subtitle}
            </p>
          )}
        </div>

        {/* HEADER CONTROLS & LEGEND */}
        <div className="flex flex-wrap items-center gap-3">
          {showLegend && (
            <div
              role="list"
              aria-label="Chart legend"
              className="flex items-center gap-3 text-[11px] text-white/60"
              data-testid="chart-legend"
            >
              {legend.map((item, idx) => (
                <div key={idx} role="listitem" className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-xs ${
                      item.style === 'dashed' ? 'border border-dashed border-white/80' : ''
                    }`}
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </div>

      {/* CHART CONTENT / VIEWPORT */}
      <div
        role="img"
        aria-label={ariaLabel}
        className={`relative min-h-0 flex-1 pt-3 ${contentClassName}`}
      >
        {children}
      </div>

      {/* VISUALLY HIDDEN ACCESSIBLE DATA TABLE (Article 4) */}
      {dataTable && dataTable.headers.length > 0 && (
        <table
          className="sr-only"
          aria-label={dataTable.caption || `${title} accessible data`}
          data-testid="chart-sr-table"
        >
          {dataTable.caption && <caption>{dataTable.caption}</caption>}
          <thead>
            <tr>
              {dataTable.headers.map((header, hIdx) => (
                <th key={hIdx} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataTable.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) =>
                  cIdx === 0 ? (
                    <th key={cIdx} scope="row">
                      {String(cell)}
                    </th>
                  ) : (
                    <td key={cIdx}>{String(cell)}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* PROVENANCE FOOTER (Article 4) */}
      {source && (
        <figcaption
          className={`mt-3 pt-2 border-t border-white/5 ${VIZ_TYPOGRAPHY.source}`}
          data-testid="chart-source"
        >
          {source}
        </figcaption>
      )}
    </figure>
  );
}

export default ChartFrame;
