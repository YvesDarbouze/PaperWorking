'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/viz/format';
import type { ProjectRentRollReport } from '@/lib/reports/rent-roll';
import ReportRequiresDataState from './ReportRequiresDataState';

export function RentRollView({
  report,
  onAddUnitsHref = '/dashboard/projects',
}: {
  report: ProjectRentRollReport;
  onAddUnitsHref?: string;
}) {
  if (!report.hasUnitData || report.units.length === 0) {
    return (
      <ReportRequiresDataState
        reportTitle="Rent Roll & Tenant Ledger"
        missingDataType="Unit & Lease Records"
        description="This property does not have unit-level rent roll records configured yet. Set up unit records in Project Underwriting or link tenant lease agreements."
        actionLabel="Configure Units in Project"
        actionHref={onAddUnitsHref}
        testId="rent-roll-requires-data"
      />
    );
  }

  const { summary, units } = report;

  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-surface/60 shadow-lg backdrop-blur-md overflow-hidden space-y-6 p-6" data-testid="rent-roll-view">
      {/* Summary Stat Quad */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Units</span>
          <p className="mt-1 text-xl font-black text-text-primary">{summary.totalUnits}</p>
          <p className="text-[11px] text-text-muted mt-0.5">{summary.occupiedUnits} occupied · {summary.vacantUnits} vacant</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Physical Occupancy</span>
          <p className="mt-1 text-xl font-black text-accent">{formatPercent(summary.occupancyRatePct, { decimals: 1 })}</p>
          <p className="text-[11px] text-text-muted mt-0.5">{summary.delinquentUnits} delinquent</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Gross Potential Rent</span>
          <p className="mt-1 text-xl font-black text-text-primary">{formatCurrency(summary.grossPotentialRentMonthly, { decimals: 0 })}/mo</p>
          <p className="text-[11px] text-text-muted mt-0.5">{formatCurrency(summary.grossPotentialRentAnnual, { compact: true })} annual</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Deposits Held (Liability)</span>
          <p className="mt-1 text-xl font-black text-text-primary">{formatCurrency(summary.totalDepositsHeld, { decimals: 0 })}</p>
          <p className="text-[11px] text-text-muted mt-0.5">Escrow balance</p>
        </div>
      </div>

      {/* Units Table */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Rent roll units table"
        className="rounded-xl border border-border-subtle overflow-x-auto focus:outline-none focus:ring-1 focus:ring-accent/50"
      >
        <table className="w-full text-left text-xs text-text-primary border-collapse">
          <thead>
            <tr className="border-b border-border-subtle bg-app/40 text-[11px] uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-6 py-3.5 font-bold">Unit #</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Tenant</th>
              <th scope="col" className="px-4 py-3.5 font-bold">Lease Term</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Market Rent</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">In-Place Rent</th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold">Deposit Held</th>
              <th scope="col" className="px-6 py-3.5 text-right font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {units.map((u) => (
              <tr key={u.id} className="hover:bg-elevated/40">
                <td className="px-6 py-3 font-mono font-bold text-text-primary">{u.unitNumber}</td>
                <td className="px-4 py-3 text-text-primary">{u.tenantName || '— Vacant —'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-text-muted">
                  {u.leaseStart && u.leaseEnd ? `${u.leaseStart} to ${u.leaseEnd}` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                  {formatCurrency(u.monthlyMarketRent, { decimals: 0 })}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-text-primary">
                  {formatCurrency(u.monthlyLeasedRent, { decimals: 0 })}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-muted">
                  {formatCurrency(u.depositHeld, { decimals: 0 })}
                </td>
                <td className="px-6 py-3 text-right">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      u.status === 'occupied'
                        ? 'bg-accent/10 text-accent'
                        : u.status === 'delinquent'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-elevated text-text-muted'
                    }`}
                  >
                    {u.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RentRollView;
