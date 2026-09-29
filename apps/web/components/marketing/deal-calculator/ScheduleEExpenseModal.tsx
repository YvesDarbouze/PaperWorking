'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';

export interface ScheduleELineItem {
  id: string;
  irsLine: string;
  category: string;
  annualAmount: number;
}

interface ScheduleEExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  grossRentAnnual: number;
  currentAnnualOpex: number;
  onApplyExpenses: (annualTotal: number, opexRatioPct: number) => void;
}

export default function ScheduleEExpenseModal({
  isOpen,
  onClose,
  grossRentAnnual,
  currentAnnualOpex,
  onApplyExpenses,
}: ScheduleEExpenseModalProps) {
  const [items, setItems] = useState<ScheduleELineItem[]>([
    { id: 'taxes', irsLine: 'Line 16', category: 'Real Estate / Property Taxes', annualAmount: 4200 },
    { id: 'insurance', irsLine: 'Line 9', category: 'Property & Casualty Insurance', annualAmount: 1400 },
    { id: 'management', irsLine: 'Line 7', category: 'Property Management Fee (8-10%)', annualAmount: Math.round(grossRentAnnual * 0.08) },
    { id: 'repairs', irsLine: 'Line 14', category: 'Repairs & Routine Maintenance', annualAmount: 2400 },
    { id: 'utilities', irsLine: 'Line 17', category: 'Utilities (Water, Sewer, Trash, Common)', annualAmount: 1200 },
    { id: 'hoa', irsLine: 'Line 19', category: 'HOA / Condo Dues & Assessments', annualAmount: 0 },
    { id: 'capex', irsLine: 'Line 18', category: 'Capital Expenditures Reserve (CapEx)', annualAmount: 1800 },
  ]);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });
    return cleanup;
  }, [isOpen, onClose]);

  const totalAnnual = items.reduce((sum, item) => sum + (item.annualAmount || 0), 0);
  const monthlyTotal = Math.round(totalAnnual / 12);
  const computedRatioPct =
    grossRentAnnual > 0 ? Number(((totalAnnual / grossRentAnnual) * 100).toFixed(1)) : 35.0;

  const handleAmountChange = (id: string, val: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, annualAmount: Math.max(0, val) } : item)),
    );
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-e-modal-title"
      data-testid="schedule-e-expense-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/15 bg-[#0f0e13] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <h2 id="schedule-e-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[color:var(--color-primary)]">
                receipt_long
              </span>
              Schedule E Operating Expenses Editor
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Canonical IRS Form 1040 Schedule E expense categories for accurate net operating income.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px]"
            aria-label="Close operating expenses editor"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Info Banner */}
        <div className="my-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs flex items-center justify-between shrink-0">
          <span className="text-white/70">
            Gross Annual Rent: <strong className="text-white font-mono">{formatCurrency(grossRentAnnual)}</strong> ({formatCurrency(Math.round(grossRentAnnual / 12))}/mo)
          </span>
          <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-emerald-300 border border-white/10">
            Computed OpEx Ratio: {computedRatioPct}%
          </span>
        </div>

        {/* Line Items List */}
        <div className="overflow-y-auto py-2 space-y-2.5 grow divide-y divide-white/5 text-xs pr-1">
          {items.map((item) => (
            <div key={item.id} className="pt-2 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-white/50 border border-white/10">
                    {item.irsLine}
                  </span>
                  <span className="font-semibold text-white/90">{item.category}</span>
                </div>
                <span className="text-[10px] text-white/40 mt-0.5">
                  ~{formatCurrency(Math.round(item.annualAmount / 12))}/month
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-white/40 font-mono">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={item.annualAmount || ''}
                  onChange={(e) => handleAmountChange(item.id, Number(e.target.value))}
                  placeholder="0"
                  className="w-28 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-right font-mono font-bold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[38px]"
                />
                <span className="text-white/40 text-[10px] font-mono">/yr</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <div>
            <span className="block text-[10px] uppercase font-mono text-white/40">Total Operating Expenses</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-mono text-[color:var(--color-primary)]">
                {formatCurrency(totalAnnual)}/yr
              </span>
              <span className="text-xs text-white/50 font-mono">
                ({formatCurrency(monthlyTotal)}/mo • {computedRatioPct}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="apply-schedule-e-btn"
              onClick={() => {
                onApplyExpenses(totalAnnual, computedRatioPct);
                onClose();
              }}
              className="rounded-xl bg-[color:var(--color-primary)] px-5 py-2.5 text-xs font-bold text-[#0a0a0f] hover:brightness-110 shadow-[0_0_16px_rgba(0,221,148,0.25)] min-h-[44px]"
            >
              Apply Expenses ({formatCurrency(totalAnnual)}/yr)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
