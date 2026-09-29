'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';

export interface ClosingCostLineItem {
  id: string;
  category: string;
  description: string;
  amount: number;
}

interface ClosingCostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchasePrice: number;
  currentClosingCostsPct: number;
  onApplyClosingCosts: (totalAmount: number, closingCostsPct: number) => void;
}

export default function ClosingCostsModal({
  isOpen,
  onClose,
  purchasePrice,
  currentClosingCostsPct,
  onApplyClosingCosts,
}: ClosingCostsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const initialTotal = Math.round(purchasePrice * (currentClosingCostsPct / 100));

  const [items, setItems] = useState<ClosingCostLineItem[]>([
    {
      id: 'title_escrow',
      category: 'Title Insurance & Escrow Fees',
      description: 'Lender & owner title policy, title search, settlement & escrow agent closing fees',
      amount: Math.round(initialTotal * 0.35) || 2100,
    },
    {
      id: 'legal_attorney',
      category: 'Legal & Attorney Fees',
      description: 'Real estate attorney contract review, entity document preparation, deed conveyance',
      amount: Math.round(initialTotal * 0.20) || 1200,
    },
    {
      id: 'inspection_environmental',
      category: 'Property Inspection & Environmental',
      description: 'Comprehensive physical building inspection, termite/pest, radon, sewer scope',
      amount: Math.round(initialTotal * 0.15) || 850,
    },
    {
      id: 'appraisal_survey',
      category: 'Appraisal & Boundary Survey',
      description: 'Lender-ordered residential/commercial appraisal and certified boundary/pin survey',
      amount: Math.round(initialTotal * 0.12) || 750,
    },
    {
      id: 'loan_origination',
      category: 'Loan Origination & Underwriting',
      description: 'Lender application, processing, document preparation, and underwriting fees',
      amount: Math.round(initialTotal * 0.10) || 600,
    },
    {
      id: 'recording_transfer',
      category: 'Government Recording & Transfer Taxes',
      description: 'County recording of deed and mortgage, municipal transfer taxes/stamps',
      amount: Math.round(initialTotal * 0.08) || 500,
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });
    return cleanup;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const computedPct =
    purchasePrice > 0 ? Number(((totalAmount / purchasePrice) * 100).toFixed(2)) : currentClosingCostsPct;

  const handleAmountChange = (id: string, val: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: Math.max(0, val) } : item)),
    );
  };

  const handleApply = () => {
    onApplyClosingCosts(totalAmount, computedPct);
    onClose();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="closing-costs-modal-title"
      data-testid="closing-costs-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/15 bg-[#0f0e13] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-emerald-400">
                Acquisition Modeling
              </span>
              <span className="text-[10px] font-mono text-white/50">
                Purchase Price: {formatCurrency(purchasePrice)}
              </span>
            </div>
            <h2 id="closing-costs-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-[20px] text-emerald-400">
                receipt
              </span>
              Itemized Buyer Closing Costs Worksheet
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Break down legal, inspection, title, and loan settlement costs for precision underwriting.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px]"
            aria-label="Close closing costs editor"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Total Summary Ribbon */}
        <div className="my-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-mono text-white/50 block">Total Itemized Closing Costs</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-white/50 block">Effective Closing Ratio</span>
            <span className="text-lg font-bold font-mono text-white">
              {computedPct.toFixed(2)}% of Price
            </span>
          </div>
        </div>

        {/* Line Items List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 py-1">
          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`closing-cost-item-${item.id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs"
            >
              <div className="min-w-0 pr-2">
                <span className="font-semibold text-white block">{item.category}</span>
                <span className="text-[11px] text-white/50 block mt-0.5">{item.description}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-white/40 font-mono text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={item.amount}
                  onChange={(e) => handleAmountChange(item.id, Number(e.target.value))}
                  className="w-28 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-right font-mono text-xs font-bold text-white focus:border-ring focus:outline-none min-h-[36px]"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white transition min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            data-testid="apply-closing-costs-btn"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-sm min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            <span>Apply Closing Costs ({formatCurrency(totalAmount)} · {computedPct.toFixed(1)}%)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
