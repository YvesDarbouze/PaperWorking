'use client';

import React from 'react';
import ChartFrame from '@/lib/viz/ChartFrame';
import { formatCurrency } from '@/lib/viz/format';
import type { StatementColumn, StatementRow } from '@paperworking/financial-engine';

export interface ReportsSummaryChartProps {
  fiscalYear: number;
  granularity: 'monthly' | 'quarterly' | 'annual';
  columns: StatementColumn[];
  rows: StatementRow[];
  testId?: string;
}

export function ReportsSummaryChart({
  fiscalYear,
  granularity,
  columns,
  rows,
  testId = 'reports-summary-chart',
}: ReportsSummaryChartProps) {
  // Extract NOI and CFBT rows
  const noiRow = rows.find((r) => r.id === 'noi');
  const cfbtRow = rows.find((r) => r.id === 'cfbt');

  // Filter out the 'total' column for chart points
  const periodCols = columns.filter((c) => !c.isTotal);

  const seriesData = periodCols.map((c) => {
    const noi = noiRow?.values[c.key] ?? 0;
    const cfbt = cfbtRow?.values[c.key] ?? 0;
    return {
      label: c.label,
      sublabel: c.sublabel,
      noi: Number(noi),
      cfbt: Number(cfbt),
    };
  });

  // Determine min and max for scale
  const allValues = seriesData.flatMap((d) => [d.noi, d.cfbt]);
  const rawMax = Math.max(100, ...allValues);
  const rawMin = Math.min(0, ...allValues);
  const maxVal = Math.max(100, rawMax * 1.15);
  const minVal = rawMin < 0 ? rawMin * 1.15 : 0;
  const range = maxVal - minVal;

  // Zero baseline percentage from bottom
  const zeroPct = range > 0 ? ((-minVal) / range) * 100 : 0;

  // Accessible data table for screen readers
  const tableHeaders = ['Period', 'Net Operating Income', 'Cash Flow Before Tax'];
  const tableRows = seriesData.map((d) => [
    d.label,
    formatCurrency(d.noi, { decimals: 0 }),
    formatCurrency(d.cfbt, { decimals: 0, negativeParens: true }),
  ]);

  const timeframeLabel = `${granularity.toUpperCase()} · FY ${fiscalYear}`;

  return (
    <ChartFrame
      title="Net Operating Income vs. Cash Flow Before Tax"
      subtitle="Period performance projection showing operational NOI vs. bottom-line spendable cash flow after debt service"
      timeframe={timeframeLabel}
      unitBadge="USD ($)"
      ariaLabel={`NOI vs CFBT bar chart for ${timeframeLabel}`}
      source="Source: PaperWorking Underwriting Financial Engine"
      testId={testId}
      legend={[
        { label: 'Net Operating Income (NOI)', color: 'var(--accent)' },
        { label: 'Cash Flow Before Tax (CFBT)', color: 'var(--text-secondary)' },
      ]}
      dataTable={{
        caption: `NOI and CFBT by period for ${timeframeLabel}`,
        headers: tableHeaders,
        rows: tableRows,
      }}
    >
      <div className="relative h-48 w-full pt-4 pb-6">
        {/* Zero Baseline Line (when negative values exist) */}
        {minVal < 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border-subtle z-0 pointer-events-none"
            style={{ bottom: `${zeroPct}%` }}
            aria-hidden="true"
          >
            <span className="absolute right-0 -top-2.5 text-[9px] font-mono text-text-muted">
              $0 baseline
            </span>
          </div>
        )}

        {/* Grouped Bars Container */}
        <div className="flex h-full w-full items-end justify-between gap-1 sm:gap-2 px-2">
          {seriesData.map((pt, idx) => {
            // Calculate NOI bar height and position
            const noiHeightPct = range > 0 ? (Math.abs(pt.noi) / range) * 100 : 0;
            const cfbtHeightPct = range > 0 ? (Math.abs(pt.cfbt) / range) * 100 : 0;

            const isCfbtNegative = pt.cfbt < 0;

            return (
              <div
                key={idx}
                className="group relative flex flex-1 flex-col items-center h-full justify-end"
                data-testid={`chart-bar-group-${pt.label.toLowerCase()}`}
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute -top-10 z-30 flex flex-col items-center whitespace-nowrap rounded-md bg-elevated px-2 py-1 text-[10px] text-text-primary shadow-elevation-modal border border-border-subtle">
                  <span className="font-semibold">{pt.label}:</span>
                  <span className="text-accent">NOI: {formatCurrency(pt.noi, { compact: true })}</span>
                  <span className={isCfbtNegative ? 'text-danger' : 'text-text-secondary'}>
                    CFBT: {formatCurrency(pt.cfbt, { compact: true, negativeParens: true })}
                  </span>
                </div>

                {/* Bars inner flex */}
                <div className="relative w-full h-full flex items-end justify-center gap-0.5 sm:gap-1">
                  {/* NOI Bar (always positive in viable CRE) */}
                  <div
                    className="w-full max-w-[14px] sm:max-w-[20px] rounded-t-xs bg-accent transition-all duration-300 hover:brightness-110"
                    style={{
                      height: `${Math.max(2, noiHeightPct)}%`,
                      marginBottom: minVal < 0 ? `${zeroPct}%` : '0',
                    }}
                    title={`NOI: ${formatCurrency(pt.noi, { decimals: 0 })}`}
                  />

                  {/* CFBT Bar (can be above or below zero) */}
                  <div
                    className={`w-full max-w-[14px] sm:max-w-[20px] transition-all duration-300 hover:brightness-110 ${
                      isCfbtNegative
                        ? 'rounded-b-xs bg-danger/80 shadow-[0_2px_4px_rgba(239,68,68,0.2)]'
                        : 'rounded-t-xs bg-text-secondary shadow-elevation-subtle'
                    }`}
                    style={
                      isCfbtNegative
                        ? {
                            height: `${Math.max(2, cfbtHeightPct)}%`,
                            position: 'absolute',
                            top: `${100 - zeroPct}%`,
                          }
                        : {
                            height: `${Math.max(2, cfbtHeightPct)}%`,
                            marginBottom: minVal < 0 ? `${zeroPct}%` : '0',
                          }
                    }
                    title={`CFBT: ${formatCurrency(pt.cfbt, { decimals: 0, negativeParens: true })}`}
                  />
                </div>

                {/* Period X-Axis Label */}
                <div className="absolute -bottom-5 text-[10px] font-mono font-medium text-text-muted truncate max-w-full">
                  {pt.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartFrame>
  );
}

export default ReportsSummaryChart;
