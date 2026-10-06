'use client';

import React, { useState } from 'react';
import type {
  ProjectPlaidLedgerState,
  ProjectRentRollItem,
  ProjectRentPaymentRecord,
} from '@/lib/projects/types';
import { calculateRentLateness } from './types';
import { formatCurrency } from '@/lib/projects/phase-utils';
import {
  Users,
  CheckCircle,
  WarningCircle,
  Clock,
  Plus,
  CurrencyDollar,
  Receipt,
  CalendarCheck,
  Tag,
  ArrowsClockwise,
} from '@/components/icons/PhosphorIcons';

export interface ProjectRentRollTrackerCardProps {
  ledger: ProjectPlaidLedgerState;
  onUpdateLedger: (updated: ProjectPlaidLedgerState) => void;
  disabled?: boolean;
}

export function ProjectRentRollTrackerCard({
  ledger,
  onUpdateLedger,
  disabled = false,
}: ProjectRentRollTrackerCardProps) {
  const [showAddTenantModal, setShowAddTenantModal] = useState<boolean>(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<boolean>(false);
  const [selectedRentRollId, setSelectedRentRollId] = useState<string>(ledger.rentRoll[0]?.id || '');

  // Form State for Manual/New Payment
  const [newPayAmount, setNewPayAmount] = useState<number>(2400);
  const [newPayDate, setNewPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newPayDueDate, setNewPayDueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newPayPayer, setNewPayPayer] = useState<string>('Zelle Payment');

  // Form State for New Tenant
  const [newUnitNumber, setNewUnitNumber] = useState<string>('Unit C');
  const [newTenantName, setNewTenantName] = useState<string>('');
  const [newRentAmount, setNewRentAmount] = useState<number>(2200);
  const [newDueDay, setNewDueDay] = useState<number>(1);
  const [newGraceDays, setNewGraceDays] = useState<number>(5);
  const [newLateFee, setNewLateFee] = useState<number>(75);
  const [newPayerPattern, setNewPayerPattern] = useState<string>('');

  // Aggregations
  const totalScheduledRent = ledger.rentRoll.reduce((acc, r) => acc + r.monthlyRent, 0);
  const totalCollectedThisMonth = ledger.paymentHistory
    .filter((p) => {
      const pMonth = new Date(p.paymentDate).getMonth();
      const currentMonth = new Date().getMonth();
      return pMonth === currentMonth;
    })
    .reduce((acc, p) => acc + p.amount, 0);

  const collectionRatePct =
    totalScheduledRent > 0
      ? Math.min(100, (totalCollectedThisMonth / totalScheduledRent) * 100)
      : 0;

  const lateCount = ledger.paymentHistory.filter(
    (p) => p.paymentStatus === 'late' || p.paymentStatus === 'delinquent'
  ).length;

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;

    const newTenant: ProjectRentRollItem = {
      id: `rr-${Date.now()}`,
      unitNumber: newUnitNumber,
      tenantName: newTenantName.trim(),
      monthlyRent: newRentAmount,
      dueDay: newDueDay,
      gracePeriodDays: newGraceDays,
      lateFeeAmount: newLateFee,
      leaseStartDate: new Date().toISOString().slice(0, 10),
      leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      depositPaid: newRentAmount,
      status: 'current',
      payerPatterns: newPayerPattern
        ? [newPayerPattern.trim(), newTenantName.trim()]
        : [newTenantName.trim()],
    };

    onUpdateLedger({
      ...ledger,
      rentRoll: [...ledger.rentRoll, newTenant],
    });

    setShowAddTenantModal(false);
    setNewTenantName('');
    setNewPayerPattern('');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedRoll = ledger.rentRoll.find((r) => r.id === selectedRentRollId);
    if (!matchedRoll) return;

    const lateness = calculateRentLateness(
      newPayDate,
      newPayDueDate,
      matchedRoll.gracePeriodDays,
      matchedRoll.lateFeeAmount,
      newPayAmount,
      matchedRoll.monthlyRent
    );

    const newPayment: ProjectRentPaymentRecord = {
      id: `pay-${Date.now()}`,
      rentRollId: matchedRoll.id,
      unitNumber: matchedRoll.unitNumber,
      tenantName: matchedRoll.tenantName,
      amount: newPayAmount,
      expectedAmount: matchedRoll.monthlyRent,
      paymentDate: newPayDate,
      dueDate: newPayDueDate,
      daysLate: lateness.daysLate,
      paymentStatus: lateness.paymentStatus,
      lateFeeAssessed: lateness.lateFeeAssessed,
      lateFeePaid: lateness.lateFeeAssessed > 0,
      rawPayerName: newPayPayer,
      matchConfidence: 1.0,
      isVerified: true,
      notes: 'Manually confirmed & reconciled',
    };

    // Update tenant status based on lateness
    const updatedRoll = ledger.rentRoll.map((r) =>
      r.id === matchedRoll.id
        ? {
            ...r,
            status:
              lateness.paymentStatus === 'on_time'
                ? ('current' as const)
                : lateness.paymentStatus === 'partial'
                  ? ('late' as const)
                  : lateness.paymentStatus,
          }
        : r
    );

    onUpdateLedger({
      ...ledger,
      rentRoll: updatedRoll,
      paymentHistory: [newPayment, ...ledger.paymentHistory],
    });

    setShowRecordPaymentModal(false);
  };

  return (
    <div className="w-full bg-card border border-border rounded-none p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-muted border border-border rounded-none text-foreground">
              <Users size={20} weight="bold" />
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              Real-Time Rent Roll & Plaid Collection Tracker
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tracks rent receipts, identifies payer names and amounts from Plaid deposits, and calculates payment lateness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowRecordPaymentModal(true)}
            disabled={disabled || ledger.rentRoll.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs sm:text-sm font-medium border border-border rounded-none transition-colors disabled:opacity-50"
          >
            <Receipt size={16} />
            Record Payment
          </button>

          <button
            type="button"
            onClick={() => setShowAddTenantModal(true)}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium rounded-none transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus size={16} weight="bold" />
            Add Unit Lease
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Scheduled Monthly Rent</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {formatCurrency(totalScheduledRent)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {ledger.rentRoll.length} leased units
          </div>
        </div>

        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Month Collections</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {formatCurrency(totalCollectedThisMonth)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {collectionRatePct.toFixed(1)}% collection rate
          </div>
        </div>

        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">On-Time Rate</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {ledger.paymentHistory.length > 0
              ? `${(
                  ((ledger.paymentHistory.length - lateCount) / ledger.paymentHistory.length) *
                  100
                ).toFixed(0)}%`
              : '100%'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Within 5-day grace period
          </div>
        </div>

        <div className="p-3.5 border border-border bg-muted/20 rounded-none">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Late Occurrences</div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {lateCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {lateCount > 0 ? 'Late fees assessed' : 'Zero delinquent accounts'}
          </div>
        </div>
      </div>

      {/* Active Leases / Rent Roll Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Active Rent Roll Units ({ledger.rentRoll.length})
        </h4>

        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Tenant Name</th>
                <th className="py-2.5 px-3">Agreed Rent</th>
                <th className="py-2.5 px-3">Due Day & Grace</th>
                <th className="py-2.5 px-3">Late Fee</th>
                <th className="py-2.5 px-3">Payer Pattern Match</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.rentRoll.map((unit) => (
                <tr key={unit.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-3 font-semibold text-foreground">{unit.unitNumber}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-foreground">{unit.tenantName}</div>
                    {unit.tenantEmail && (
                      <div className="text-[11px] text-muted-foreground">{unit.tenantEmail}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-foreground">
                    {formatCurrency(unit.monthlyRent)}/mo
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    Due {unit.dueDay}st ({unit.gracePeriodDays}d grace)
                  </td>
                  <td className="py-3 px-3 font-mono text-muted-foreground">
                    {formatCurrency(unit.lateFeeAmount)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {unit.payerPatterns.map((pat, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded-none text-foreground font-mono"
                        >
                          {pat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border rounded-none ${
                        unit.status === 'current'
                          ? 'bg-muted/40 border-border text-foreground'
                          : unit.status === 'grace_period'
                          ? 'bg-muted/60 border-border text-foreground'
                          : 'bg-destructive/10 border-destructive/30 text-destructive'
                      }`}
                    >
                      {unit.status === 'current' && <CheckCircle size={12} weight="bold" />}
                      {unit.status === 'grace_period' && <Clock size={12} />}
                      {unit.status === 'late' && <WarningCircle size={12} weight="bold" />}
                      {unit.status === 'current'
                        ? 'Current / Paid'
                        : unit.status === 'grace_period'
                        ? 'Grace Period'
                        : 'Past Due'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Log */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Plaid Ingested Payment Receipts ({ledger.paymentHistory.length})
        </h4>

        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">Payment Date</th>
                <th className="py-2.5 px-3">Unit & Tenant</th>
                <th className="py-2.5 px-3">Amount Paid</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Lateness & Status</th>
                <th className="py-2.5 px-3">Late Fee</th>
                <th className="py-2.5 px-3">Plaid Transaction Descriptor</th>
                <th className="py-2.5 px-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.paymentHistory.map((pay) => (
                <tr key={pay.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-3 font-mono text-foreground font-medium">
                    {pay.paymentDate}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-foreground">{pay.unitNumber}</div>
                    <div className="text-[11px] text-muted-foreground">{pay.tenantName}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-foreground">
                    {formatCurrency(pay.amount)}
                  </td>
                  <td className="py-3 px-3 font-mono text-muted-foreground">{pay.dueDate}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          pay.paymentStatus === 'on_time'
                            ? 'text-foreground'
                            : pay.paymentStatus === 'grace_period'
                            ? 'text-muted-foreground'
                            : 'text-destructive font-semibold'
                        }`}
                      >
                        {pay.paymentStatus === 'on_time'
                          ? 'On-Time (0d)'
                          : pay.paymentStatus === 'grace_period'
                          ? `Grace Period (${pay.daysLate}d)`
                          : `Late (${pay.daysLate} days late)`}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs">
                    {pay.lateFeeAssessed > 0 ? (
                      <span className="text-destructive font-medium">
                        +{formatCurrency(pay.lateFeeAssessed)} {pay.lateFeePaid ? '(Paid)' : '(Unpaid)'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">$0.00</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-mono text-[11px] text-foreground truncate max-w-[200px]">
                      {pay.rawPayerName || 'Direct ACH Deposit'}
                    </div>
                    {pay.bankAccountMask && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Acct ••••{pay.bankAccountMask}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded-none text-foreground">
                      <CheckCircle size={10} weight="bold" />
                      {(pay.matchConfidence * 100).toFixed(0)}% Match
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Unit Lease */}
      {showAddTenantModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddTenant}
            className="w-full max-w-lg bg-card border border-border rounded-none p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-base font-semibold text-foreground">
                Add Unit & Lease Contract
              </h4>
              <button
                type="button"
                onClick={() => setShowAddTenantModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Unit Designation</label>
                <input
                  type="text"
                  value={newUnitNumber}
                  onChange={(e) => setNewUnitNumber(e.target.value)}
                  required
                  placeholder="e.g. Unit 3B"
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Tenant Full Name</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  required
                  placeholder="e.g. Rachel Adams"
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Monthly Rent ($)</label>
                <input
                  type="number"
                  value={newRentAmount}
                  onChange={(e) => setNewRentAmount(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Monthly Due Day</label>
                <input
                  type="number"
                  value={newDueDay}
                  onChange={(e) => setNewDueDay(Number(e.target.value))}
                  required
                  min={1}
                  max={28}
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Grace Period (Days)</label>
                <input
                  type="number"
                  value={newGraceDays}
                  onChange={(e) => setNewGraceDays(Number(e.target.value))}
                  required
                  min={0}
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Late Fee ($)</label>
                <input
                  type="number"
                  value={newLateFee}
                  onChange={(e) => setNewLateFee(Number(e.target.value))}
                  required
                  min={0}
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Plaid Payer Name / Memo Pattern (for Auto-Matching)
              </label>
              <input
                type="text"
                value={newPayerPattern}
                onChange={(e) => setNewPayerPattern(e.target.value)}
                placeholder="e.g. Rachel Adams, Adams R, Zelle Rachel"
                className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddTenantModal(false)}
                className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground text-xs font-medium rounded-none border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none"
              >
                Save Lease Contract
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Record Payment */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPayment}
            className="w-full max-w-md bg-card border border-border rounded-none p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-base font-semibold text-foreground">
                Record Tenant Rent Payment
              </h4>
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Select Unit Lease</label>
                <select
                  value={selectedRentRollId}
                  onChange={(e) => {
                    setSelectedRentRollId(e.target.value);
                    const selected = ledger.rentRoll.find((r) => r.id === e.target.value);
                    if (selected) setNewPayAmount(selected.monthlyRent);
                  }}
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none text-foreground"
                >
                  {ledger.rentRoll.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unitNumber} - {unit.tenantName} ({formatCurrency(unit.monthlyRent)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Amount Paid ($)</label>
                <input
                  type="number"
                  value={newPayAmount}
                  onChange={(e) => setNewPayAmount(Number(e.target.value))}
                  required
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Due Date</label>
                  <input
                    type="date"
                    value={newPayDueDate}
                    onChange={(e) => setNewPayDueDate(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Payment Date</label>
                  <input
                    type="date"
                    value={newPayDate}
                    onChange={(e) => setNewPayDate(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Payer Name / Reference</label>
                <input
                  type="text"
                  value={newPayPayer}
                  onChange={(e) => setNewPayPayer(e.target.value)}
                  placeholder="e.g. Zelle / ACH Transfer"
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(false)}
                className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground text-xs font-medium rounded-none border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none"
              >
                Reconcile & Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
