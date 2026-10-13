'use client';

import React, { useState } from 'react';
import { GridFour, FilePdf } from '@phosphor-icons/react';
import type { SensitivityGridsResult, SensitivityCell } from '@paperworking/validation';

interface SensitivityGridsViewProps {
  sensitivityGrids?: SensitivityGridsResult;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
}

export function SensitivityGridsView({
  sensitivityGrids,
  onExportPdf,
  isExportingPdf = false,
}: SensitivityGridsViewProps) {
  const [activeMetric, setActiveMetric] = useState<'irr' | 'coc'>('irr');
  const [activeGrid, setActiveGrid] = useState<'exit_value' | 'interest_rate'>('exit_value');

  if (!sensitivityGrids) {
    return null;
  }

  const currentGrid =
    activeGrid === 'exit_value'
      ? sensitivityGrids.rentVsExitValue
      : sensitivityGrids.rentVsInterestRate;

  const colDimensionLabel =
    activeGrid === 'exit_value' ? 'Exit Valuation Shock (±10%)' : 'Interest Rate Shock (±200 bps)';

  return (
    <div
      data-testid="sensitivity-grids-container"
      className="rounded-none border border-neutral-800 bg-neutral-900/60 p-5 space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GridFour className="h-4 w-4 text-white" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Institutional Sensitivity Matrix (5x5)
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            Every cell is a discrete server engine execution — zero interpolation. Base Case highlighted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* PDF Export Button */}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              data-testid="export-pdf-btn"
              className="inline-flex items-center gap-1.5 rounded-none border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50"
            >
              <FilePdf className="h-4 w-4" />
              <span>{isExportingPdf ? 'Generating...' : 'Export PDF'}</span>
            </button>
          )}

          {/* Metric Selector (IRR vs CoC) */}
          <div className="inline-flex rounded-none bg-neutral-950 p-0.5 border border-neutral-800">
            <button
              type="button"
              data-testid="sensitivity-metric-irr"
              onClick={() => setActiveMetric('irr')}
              className={`rounded-none px-2.5 py-1 text-xs font-semibold transition-all ${
                activeMetric === 'irr'
                  ? 'bg-neutral-200 text-black shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              IRR (%)
            </button>
            <button
              type="button"
              data-testid="sensitivity-metric-coc"
              onClick={() => setActiveMetric('coc')}
              className={`rounded-none px-2.5 py-1 text-xs font-semibold transition-all ${
                activeMetric === 'coc'
                  ? 'bg-neutral-200 text-black shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cash-on-Cash (%)
            </button>
          </div>
        </div>
      </div>

      {/* Grid Dimension Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          type="button"
          data-testid="sensitivity-tab-exit"
          onClick={() => setActiveGrid('exit_value')}
          className={`text-xs font-semibold pb-1 transition-colors border-b-2 -mb-[9px] ${
            activeGrid === 'exit_value'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Rent vs. Exit Valuation (±10%)
        </button>
        <span className="text-neutral-600">•</span>
        <button
          type="button"
          data-testid="sensitivity-tab-rate"
          onClick={() => setActiveGrid('interest_rate')}
          className={`text-xs font-semibold pb-1 transition-colors border-b-2 -mb-[9px] ${
            activeGrid === 'interest_rate'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Rent vs. Interest Rate (±200 bps)
        </button>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs font-mono border-collapse">
          <thead>
            {/* Super Header */}
            <tr>
              <th className="p-1"></th>
              <th
                colSpan={5}
                className="py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800"
              >
                {colDimensionLabel}
              </th>
            </tr>
            {/* Column Labels */}
            <tr className="border-b border-neutral-800 text-neutral-400 text-[10px]">
              <th className="py-2 px-3 text-left font-sans text-neutral-400">Rent Shock</th>
              {currentGrid.colSteps.map((step, idx) => (
                <th
                  key={idx}
                  className={`py-2 px-2.5 font-bold ${
                    step === 0 ? 'text-white font-extrabold' : 'text-neutral-300'
                  }`}
                >
                  {step === 0 ? 'Base' : activeGrid === 'exit_value' ? `${step > 0 ? '+' : ''}${step}%` : `${step > 0 ? '+' : ''}${step} bps`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {currentGrid.cells.map((row, rIdx) => {
              const rowStep = currentGrid.rowSteps[rIdx];
              return (
                <tr key={rIdx} className="hover:bg-neutral-800/20">
                  {/* Row Header */}
                  <td className={`py-2.5 px-3 text-left font-bold ${rowStep === 0 ? 'text-white font-extrabold' : 'text-neutral-300'}`}>
                    {rowStep === 0 ? 'Base Rent' : `${rowStep > 0 ? '+' : ''}${rowStep}%`}
                  </td>

                  {/* 5 Column Cells */}
                  {row.map((cell: SensitivityCell, cIdx: number) => {
                    const isBase = cell.isBaseCase;
                    const value = activeMetric === 'irr' ? cell.irrPct : cell.cashOnCashPct;

                    // Color ramp styling
                    let textColor = 'text-neutral-200';
                    let bgColor = 'bg-neutral-900/30';

                    if (isBase) {
                      bgColor = 'bg-neutral-800 border-2 border-white';
                      textColor = 'text-white font-extrabold text-sm';
                    } else if (value === null) {
                      textColor = 'text-amber-400/90 text-[10px] font-normal';
                      bgColor = 'bg-amber-500/5';
                    } else if (value >= 8.0) {
                      textColor = 'text-white font-bold';
                      bgColor = 'bg-neutral-800/60';
                    } else if (value >= 4.0) {
                      textColor = 'text-neutral-200 font-medium';
                    } else if (value >= 0) {
                      textColor = 'text-neutral-300';
                    } else {
                      textColor = 'text-red-400 font-semibold';
                      bgColor = 'bg-red-500/5';
                    }

                    return (
                      <td
                        key={cIdx}
                        data-testid={isBase ? 'sensitivity-base-cell' : `sensitivity-cell-${rIdx}-${cIdx}`}
                        className={`py-2.5 px-2 relative transition-all rounded-none ${bgColor}`}
                      >
                        {isBase && (
                          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-none bg-white px-1 py-0.2 text-[8px] font-sans font-extrabold text-black uppercase tracking-wider">
                            Base
                          </span>
                        )}
                        <div className="flex flex-col items-center justify-center">
                          {value !== null ? (
                            <span className={textColor}>{`${value.toFixed(1)}%`}</span>
                          ) : (
                            <span
                              className={textColor}
                              title={
                                cell.irrStatus === 'no_sign_change'
                                  ? 'Cash flows never cross zero — IRR undefined'
                                  : 'Cash flows cross zero multiple times — ambiguous'
                              }
                            >
                              {cell.irrStatus === 'no_sign_change'
                                ? 'No Sign'
                                : cell.irrStatus === 'multiple_roots'
                                  ? 'Multi-Root'
                                  : '—'}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-neutral-400 pt-1 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-none bg-neutral-800 border border-white"></span>
            <span>Base Case (0%, 0%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-none bg-neutral-700"></span>
            <span>Accretive (&gt;4%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-none bg-red-500/20"></span>
            <span>Dilutive (&lt;0%)</span>
          </span>
        </div>
        <span>W2-05 Solver: &quot;No Sign&quot; honestly discloses cash flows that never cross zero.</span>
      </div>
    </div>
  );
}
