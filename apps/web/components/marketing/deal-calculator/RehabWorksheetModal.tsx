'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';

export interface RehabLineItem {
  id: string;
  category: string;
  amount: number;
  notes?: string;
}

const DEFAULT_REHAB_ITEMS: RehabLineItem[] = [
  { id: 'demo', category: 'Interior Demo & Trash Haul', amount: 3500 },
  { id: 'kitchen', category: 'Kitchen (Cabinets, Quartz, Appliances)', amount: 12000 },
  { id: 'bathrooms', category: 'Bathrooms (Tile, Vanities, Fixtures)', amount: 7500 },
  { id: 'flooring', category: 'Flooring (LVP) & Interior Paint', amount: 6500 },
  { id: 'roof', category: 'Roofing, Gutters & Siding', amount: 0 },
  { id: 'exterior', category: 'Exterior Paint & Curb Appeal', amount: 2500 },
  { id: 'mechanical', category: 'HVAC, Electrical & Plumbing', amount: 4000 },
  { id: 'windows', category: 'Windows & Exterior Doors', amount: 1500 },
  { id: 'permits', category: 'Permits, Architecture & Inspections', amount: 1500 },
  { id: 'contingency', category: 'Contingency Reserve (10%)', amount: 3900 },
];

interface RehabWorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRehabBudget: number;
  onApplyTotal: (total: number, items: RehabLineItem[]) => void;
}

export default function RehabWorksheetModal({
  isOpen,
  onClose,
  currentRehabBudget,
  onApplyTotal,
}: RehabWorksheetModalProps) {
  const [items, setItems] = useState<RehabLineItem[]>(DEFAULT_REHAB_ITEMS);
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

  const totalCalculated = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleItemChange = (id: string, newAmount: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: Math.max(0, newAmount) } : item)),
    );
  };

  const applyPreset = (preset: 'cosmetic' | 'medium' | 'gut') => {
    if (preset === 'cosmetic') {
      setItems([
        { id: 'demo', category: 'Interior Demo & Trash Haul', amount: 1500 },
        { id: 'kitchen', category: 'Kitchen Refinish & Appliances', amount: 4500 },
        { id: 'bathrooms', category: 'Bathrooms Cosmetic Upgrade', amount: 3000 },
        { id: 'flooring', category: 'Flooring (LVP) & Paint', amount: 4500 },
        { id: 'roof', category: 'Roofing & Gutters', amount: 0 },
        { id: 'exterior', category: 'Exterior Curb Appeal', amount: 1500 },
        { id: 'mechanical', category: 'HVAC Tune-up & Service', amount: 1000 },
        { id: 'windows', category: 'Hardware & Minor Trim', amount: 500 },
        { id: 'permits', category: 'Permits & City Fees', amount: 500 },
        { id: 'contingency', category: 'Contingency Reserve (10%)', amount: 1700 },
      ]);
    } else if (preset === 'medium') {
      setItems(DEFAULT_REHAB_ITEMS);
    } else {
      setItems([
        { id: 'demo', category: 'Full Interior Gut Demo', amount: 7500 },
        { id: 'kitchen', category: 'Full Custom Kitchen & Island', amount: 24000 },
        { id: 'bathrooms', category: 'Full Bath Gut & Master Suite', amount: 16000 },
        { id: 'flooring', category: 'Hardwood / Premium LVP & Paint', amount: 12000 },
        { id: 'roof', category: 'New Architectural Shingle Roof', amount: 9500 },
        { id: 'exterior', category: 'Siding, Exterior Paint & Stucco', amount: 7500 },
        { id: 'mechanical', category: 'New HVAC Heat Pump + Re-pipe', amount: 14000 },
        { id: 'windows', category: 'New Double-Pane Windows', amount: 6500 },
        { id: 'permits', category: 'Engineering & City Permits', amount: 3500 },
        { id: 'contingency', category: 'Contingency Reserve (10%)', amount: 10000 },
      ]);
    }
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
      aria-labelledby="rehab-worksheet-title"
      data-testid="rehab-worksheet-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/15 bg-[#0f0e13] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <h2 id="rehab-worksheet-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[color:var(--color-primary)]">
                construction
              </span>
              Itemized Rehab Budget Worksheet
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Estimate renovation costs category by category.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px]"
            aria-label="Close worksheet"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 py-3 border-b border-white/5 shrink-0 overflow-x-auto text-xs">
          <span className="text-white/40 text-[11px] font-mono shrink-0">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('cosmetic')}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/80 hover:text-white hover:bg-white/10 transition min-h-[36px]"
          >
            Light Cosmetic (~$22k)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('medium')}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/80 hover:text-white hover:bg-white/10 transition min-h-[36px]"
          >
            Turnkey Standard (~$43k)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('gut')}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/80 hover:text-white hover:bg-white/10 transition min-h-[36px]"
          >
            Full Gut Rehab (~$110k)
          </button>
        </div>

        {/* Line Items Table */}
        <div className="overflow-y-auto py-3 space-y-2.5 grow divide-y divide-white/5 text-xs pr-1">
          {items.map((item) => (
            <div key={item.id} className="pt-2 flex items-center justify-between gap-4">
              <span className="font-medium text-white/80 text-xs truncate max-w-[280px]">
                {item.category}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-white/40 font-mono">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={item.amount || ''}
                  onChange={(e) => handleItemChange(item.id, Number(e.target.value))}
                  placeholder="0"
                  className="w-28 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-right font-mono font-bold text-white focus:outline-none focus:border-[color:var(--color-primary)] min-h-[38px]"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total & Apply Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <div>
            <span className="block text-[10px] uppercase font-mono text-white/40">Total Rehab Budget</span>
            <span className="text-xl font-extrabold font-mono text-[color:var(--color-primary)]">
              {formatCurrency(totalCalculated)}
            </span>
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
              data-testid="apply-rehab-total-btn"
              onClick={() => {
                onApplyTotal(totalCalculated, items);
                onClose();
              }}
              className="rounded-xl bg-[color:var(--color-primary)] px-5 py-2.5 text-xs font-bold text-[#0a0a0f] hover:brightness-110 shadow-[0_0_16px_rgba(0,221,148,0.25)] min-h-[44px]"
            >
              Apply to Deal ({formatCurrency(totalCalculated)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
