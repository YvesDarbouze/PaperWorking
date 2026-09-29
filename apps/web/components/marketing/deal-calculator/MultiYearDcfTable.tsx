'use client';

import React from 'react';
import type { AnnualProjectionItem } from '@paperworking/financial-engine';

interface MultiYearDcfTableProps {
  projections: AnnualProjectionItem[];
  holdPeriodYears: number;
  onChangeHoldPeriod: (years: number) => void;
  stabilizationMonths?: number;
  loanType?: string;
  rentGrowthPct?: number;
  expenseGrowthPct?: number;
}

export default function MultiYearDcfTable({
  projections,
  holdPeriodYears,
  onChangeHoldPeriod,
  stabilizationMonths,
  loanType,
  rentGrowthPct,
  expenseGrowthPct,
}: MultiYearDcfTableProps) {
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExportCsv = () => {
    const headers = [
      'Year',
      'Gross Rent',
      'Operating Expenses',
      'Net Operating Income (NOI)',
      'Operating Cash Flow',
      'Net Exit Proceeds',
      'Total Equity Cash Flow',
    ];

    const rows = projections.map((p) => [
      `Year ${p.year}`,
      p.grossRent,
      p.opex,
      p.noi,
      p.operatingCashFlow,
      p.netSaleProceeds,
      p.totalCashFlow,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deal_dcf_projections_${holdPeriodYears}yr.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      data-testid="dcf-projections-table"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">
            {`Multi-Year DCF Projection (${holdPeriodYears} Years)`}
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            {stabilizationMonths ? `${stabilizationMonths}-month lease-up transition • ` : ''}
            {loanType === 'interest_only' ? 'Interest-Only Debt • ' : ''}
            {`${rentGrowthPct || 0}% rent / ${expenseGrowthPct || 0}% exp`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Hold Period Selectors */}
          <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/10 text-xs">
            {[3, 5, 7, 10, 15, 30].map((yrs) => (
              <button
                key={yrs}
                type="button"
                onClick={() => onChangeHoldPeriod(yrs)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition ${
                  holdPeriodYears === yrs
                    ? 'bg-[color:var(--color-primary)] text-[#0a0a0f]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {yrs}Y
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            data-testid="export-dcf-csv-btn"
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition min-h-[36px]"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span className="text-[11px] font-medium">Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[380px] scrollbar-thin scrollbar-thumb-white/10">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-[#0c0b10] z-10 border-b border-white/10 text-white/40 text-[10px]">
            <tr>
              <th className="py-2.5 pr-2">Yr</th>
              <th className="py-2.5 pr-2">Gross Rent</th>
              <th className="py-2.5 pr-2">OpEx</th>
              <th className="py-2.5 pr-2">NOI</th>
              <th className="py-2.5 pr-2">Op Cash Flow</th>
              <th className="py-2.5 pr-2">Exit Proceeds</th>
              <th className="py-2.5 text-right">Total Equity CF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {projections.map((p) => (
              <tr key={p.year} className="hover:bg-white/[0.02]">
                <td className="py-2 pr-2 font-bold text-white">{`Y${p.year}`}</td>
                <td className="py-2 pr-2">{formatCurrency(p.grossRent)}</td>
                <td className="py-2 pr-2 text-white/60">{formatCurrency(p.opex)}</td>
                <td className="py-2 pr-2 font-semibold text-white">{formatCurrency(p.noi)}</td>
                <td className={`py-2 pr-2 font-semibold ${p.operatingCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(p.operatingCashFlow)}
                </td>
                <td className="py-2 pr-2 text-white/60">
                  {p.netSaleProceeds > 0 ? formatCurrency(p.netSaleProceeds) : '$0'}
                </td>
                <td className={`py-2 text-right font-bold ${p.totalCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(p.totalCashFlow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
