'use client';

import React from 'react';
import { formatCurrency } from '@/lib/viz/format';
import { TAX_DISCLAIMER, type CapExReport, type Vendor1099Report } from '@/lib/reports/tax-reports';
import type { ScheduleEReport } from '@/lib/reports/schedule-e-mapper';
import type { AssetDepreciationSchedule } from '@paperworking/financial-engine';

export function ScheduleETable({ report }: { report: ScheduleEReport }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-surface/60 shadow-lg backdrop-blur-md overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 bg-surface">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-text-primary">
            IRS Form 1040 Schedule E Summary (Part I — Rental Real Estate)
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Authoritative 14-line tax classification for individual and entity tax preparation
          </p>
        </div>
        <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
          FY {report.fiscalYear}
        </span>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Schedule E summary table"
        className="relative w-full overflow-x-auto focus:outline-none focus:ring-1 focus:ring-accent/50"
      >
        <table className="w-full text-left text-xs text-text-primary border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app/40 text-[11px] uppercase tracking-wider text-text-muted">
              <th scope="col" className="sticky left-0 z-20 min-w-[100px] bg-surface px-6 py-3.5 font-bold border-r border-border-subtle/50">
                Line #
              </th>
              <th scope="col" className="min-w-[240px] px-4 py-3.5 font-bold">
                Schedule E Line Description
              </th>
              {report.properties.map((p) => (
                <th key={p.id} scope="col" className="min-w-[140px] px-4 py-3.5 text-right font-bold">
                  {p.name}
                </th>
              ))}
              <th scope="col" className="min-w-[140px] px-6 py-3.5 text-right font-bold bg-elevated/50 text-accent border-l border-border-subtle">
                Portfolio Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {report.lines.map((l) => {
              const isSubtotal = l.isSubtotal;
              const isTotal = l.isTotal;
              const isIncome = l.isIncome;

              const rowStyle = isTotal
                ? 'bg-accent/10 font-extrabold text-text-primary border-t-2 border-b-2 border-accent/30'
                : isSubtotal
                ? 'bg-surface font-bold text-text-primary border-t border-border-subtle'
                : 'hover:bg-elevated/40 text-text-secondary';

              return (
                <tr key={l.lineKey} className={rowStyle} data-testid={`sche-row-${l.lineKey}`}>
                  <td className="sticky left-0 z-10 bg-surface px-6 py-2.5 font-mono text-[11px] font-bold text-text-muted border-r border-border-subtle/50">
                    {l.lineNumber}
                  </td>
                  <td className={`px-4 py-2.5 ${isTotal || isSubtotal || isIncome ? 'font-bold text-text-primary' : ''}`}>
                    {l.label}
                  </td>
                  {report.properties.map((p) => {
                    const val = l.valuesByProperty[p.id] ?? 0;
                    return (
                      <td key={p.id} className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {formatCurrency(val, { decimals: 0, negativeParens: true })}
                      </td>
                    );
                  })}
                  <td className="px-6 py-2.5 text-right font-mono font-bold tabular-nums bg-elevated/50 border-l border-border-subtle text-text-primary">
                    {formatCurrency(l.portfolioTotal, { decimals: 0, negativeParens: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border-subtle px-6 py-3 bg-surface/30">
        <p className="text-[11px] italic text-text-muted" data-testid="tax-disclaimer">
          {TAX_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

export function DepreciationScheduleTable({
  schedules,
  fiscalYear,
}: {
  schedules: AssetDepreciationSchedule[];
  fiscalYear: number;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-surface/60 shadow-lg backdrop-blur-md overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 bg-surface">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-text-primary">
            MACRS Straight-Line Depreciation Schedule
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            IRS Form 4562 compliant straight-line recovery with land value separation and mid-month convention
          </p>
        </div>
        <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
          FY {fiscalYear}
        </span>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Depreciation schedule table"
        className="relative w-full overflow-x-auto focus:outline-none focus:ring-1 focus:ring-accent/50"
      >
        <table className="w-full text-left text-xs text-text-secondary border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app/40 text-[11px] uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-6 py-3.5 font-bold">Asset Description</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Class / Life</th>
              <th scope="col" className="px-4 py-3.5 font-bold">In-Service Date</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Total Basis</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Land Value</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Depreciable Basis</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Annual Full-Year</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold text-accent">FY Depreciation</th>
              <th scope="col" className="px-6 py-3.5 text-right font-bold bg-elevated/50 border-l border-border-subtle">
                Ending Basis
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {schedules.map((s) => {
              const currentYearRow = s.schedule.find((r) => r.year === fiscalYear) || s.schedule[0];
              const depAmount = currentYearRow?.annualDepreciation ?? s.annualStraightLineFullYear;
              const endingBasis = currentYearRow?.endingBasis ?? (s.improvementBasis - depAmount);

              return (
                <tr key={s.assetId} className="hover:bg-elevated/40" data-testid={`dep-row-${s.assetId}`}>
                  <td className="px-6 py-3 font-semibold text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-text-secondary">
                    {s.recoveryPeriodYears} yrs ({s.assetClass === 'residential_27_5' ? 'Residential' : 'Commercial'})
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-text-secondary">{s.inServiceDate}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(s.totalBasis, { decimals: 0 })}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-muted">{formatCurrency(s.landValue, { decimals: 0 })}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-text-primary">{formatCurrency(s.improvementBasis, { decimals: 0 })}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">{formatCurrency(s.annualStraightLineFullYear, { decimals: 0 })}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-accent">{formatCurrency(depAmount, { decimals: 0 })}</td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums font-bold bg-elevated/50 border-l border-border-subtle text-text-primary">
                    {formatCurrency(endingBasis, { decimals: 0 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border-subtle px-6 py-3 bg-surface/30">
        <p className="text-[11px] italic text-text-muted" data-testid="tax-disclaimer">
          {TAX_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

export function Vendor1099Table({ report }: { report: Vendor1099Report }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-surface/60 shadow-lg backdrop-blur-md overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 bg-surface">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-text-primary">
            Form 1099 Contractor & Vendor Payments
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Payees monitored for the $600 IRS Form 1099-NEC nonemployee compensation threshold
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-status-caution/10 border border-status-caution/20 px-2.5 py-1 text-[11px] font-bold text-status-caution">
            {report.summary.vendorsRequiring1099} Required 1099s
          </span>
          <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
            FY {report.fiscalYear}
          </span>
        </div>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="1099 contractor payments table"
        className="relative w-full overflow-x-auto focus:outline-none focus:ring-1 focus:ring-accent/50"
      >
        <table className="w-full text-left text-xs text-text-secondary border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app/40 text-[11px] uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-6 py-3.5 font-bold">Vendor / Contractor</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Service Category</th>
              <th scope="col" className="px-4 py-3.5 font-bold">W-9 Status</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Payments</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Total Paid YTD</th>
              <th scope="col" className="px-6 py-3.5 text-right font-bold">1099-NEC Filing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {report.vendors.map((v) => (
              <tr key={v.vendorId} className="hover:bg-elevated/40">
                <td className="px-6 py-3 font-semibold text-text-primary">{v.vendorName}</td>
                <td className="px-4 py-3 text-text-secondary">{v.serviceCategory}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                    {v.w9Status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">{v.paymentCount}</td>
                <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-text-primary">
                  {formatCurrency(v.totalPaidYtd, { decimals: 0 })}
                </td>
                <td className="px-6 py-3 text-right">
                  {v.requires1099Nec ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-status-caution/30 bg-status-caution/10 px-2 py-0.5 text-[10px] font-bold text-status-caution">
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      Form 1099 Required (≥$600)
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
                      Below $600 Threshold
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border-subtle px-6 py-3 bg-surface/30">
        <p className="text-[11px] italic text-text-muted" data-testid="tax-disclaimer">
          {TAX_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

export function CapExLogTable({ report }: { report: CapExReport }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-surface/60 shadow-lg backdrop-blur-md overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 bg-surface">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-text-primary">
            Capital Expenditures (CapEx) & Repair Classification Log
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            IRS Tangible Property Regulations distinction: capitalized improvements vs. routine operating repairs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-accent font-bold">
            Capitalized: {formatCurrency(report.summary.capitalizedImprovements, { decimals: 0 })}
          </span>
          <span className="text-xs text-text-muted">
            Expensed: {formatCurrency(report.summary.routineRepairsExpensed, { decimals: 0 })}
          </span>
        </div>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="CapEx log table"
        className="relative w-full overflow-x-auto focus:outline-none focus:ring-1 focus:ring-accent/50"
      >
        <table className="w-full text-left text-xs text-text-secondary border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app/40 text-[11px] uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-6 py-3.5 font-bold">Date</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Property</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Description</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Tax Treatment</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Asset Class</th>
              <th scope="col" className="px-6 py-3.5 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {report.items.map((i) => (
              <tr key={i.id} className="hover:bg-elevated/40">
                <td className="px-6 py-3 font-mono text-[11px] text-text-muted">{i.date}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{i.projectName}</td>
                <td className="px-4 py-3 text-text-secondary">{i.description}</td>
                <td className="px-4 py-3">
                  {i.isCapitalized ? (
                    <span className="inline-flex rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                      Capitalized Improvement
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      Expensed Repair (Sched E)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-text-muted">
                  {i.depreciationRecoveryYears > 0 ? `${i.depreciationRecoveryYears}-yr Recovery` : 'Immediate Expense'}
                </td>
                <td className="px-6 py-3 text-right font-mono font-bold tabular-nums text-text-primary">
                  {formatCurrency(i.amount, { decimals: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border-subtle px-6 py-3 bg-surface/30">
        <p className="text-[11px] italic text-text-muted" data-testid="tax-disclaimer">
          {TAX_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
