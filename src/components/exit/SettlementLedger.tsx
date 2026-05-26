'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { SettlementLineItem } from '@/types/schema';
import { computeSettlementDefaults, recomputeSettlement } from '@/lib/math/calculatorUtils';
import { Receipt, Plus, Trash2, Lock, Unlock, Percent, DollarSign } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Settlement Ledger — Itemized Sell-Side Closing Costs
   
   Pre-populated with industry defaults. Each row is 
   editable. Real-time recomputation as sale price changes.
   ═══════════════════════════════════════════════════════ */

interface SettlementLedgerProps {
  projectId: string;
  salePrice: number;
}

export default function SettlementLedger({ projectId, salePrice }: SettlementLedgerProps) {
  const financials = useProjectStore(state => {
    const p = state.projects.find(d => d.id === projectId);
    return p?.financials;
  });
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  // Initialize from store or defaults
  const [items, setItems] = useState<SettlementLineItem[]>(() =>
    financials?.settlementLedger?.length
      ? financials.settlementLedger
      : computeSettlementDefaults(salePrice)
  );

  // Recompute when sale price changes
  useEffect(() => {
    if (salePrice > 0) {
      setItems(prev => recomputeSettlement(prev, salePrice));
    }
  }, [salePrice]);

  // Persist to store on change
  const persistItems = useCallback((updated: SettlementLineItem[]) => {
    setItems(updated);
    updateProjectFinancials(projectId, { settlementLedger: updated });
  }, [projectId, updateProjectFinancials]);

  // Totals
  const sellerTotal = useMemo(() =>
    items.reduce((sum, i) => {
      if (i.paidBy === 'Seller') return sum + i.computedAmount;
      if (i.paidBy === 'Split') return sum + i.computedAmount / 2;
      return sum;
    }, 0),
    [items]
  );

  const buyerTotal = useMemo(() =>
    items.reduce((sum, i) => {
      if (i.paidBy === 'Buyer') return sum + i.computedAmount;
      if (i.paidBy === 'Split') return sum + i.computedAmount / 2;
      return sum;
    }, 0),
    [items]
  );

  const handleUpdateRate = (id: string, value: string) => {
    const updated = items.map(item => {
      if (item.id !== id || item.locked) return item;
      if (item.isPercentage) {
        const rate = Number(value) || 0;
        return { ...item, percentageRate: rate, computedAmount: salePrice * (rate / 100) };
      } else {
        const flat = Number(value) || 0;
        return { ...item, flatAmount: flat, computedAmount: flat };
      }
    });
    persistItems(updated);
  };

  const handleTogglePaidBy = (id: string) => {
    const cycle: Array<'Seller' | 'Buyer' | 'Split'> = ['Seller', 'Buyer', 'Split'];
    const updated = items.map(item => {
      if (item.id !== id || item.locked) return item;
      const idx = cycle.indexOf(item.paidBy);
      return { ...item, paidBy: cycle[(idx + 1) % cycle.length] };
    });
    persistItems(updated);
  };

  const handleRemove = (id: string) => {
    persistItems(items.filter(i => i.id !== id));
  };

  const handleAddCustom = () => {
    const newItem: SettlementLineItem = {
      id: `sl-custom-${Date.now()}`,
      label: 'Custom Fee',
      category: 'Other',
      isPercentage: false,
      flatAmount: 0,
      computedAmount: 0,
      paidBy: 'Seller',
      locked: false,
    };
    persistItems([...items, newItem]);
  };

  const handleLabelChange = (id: string, label: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, label } : item
    );
    persistItems(updated);
  };

  return (
    <div className="glass-card border border-pw-border rounded-none shadow-none relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-pw-border bg-pw-black text-pw-white">
        <div className="flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5" />
          <h3 className="text-xs font-black tracking-[0.3em] uppercase">Settlement_Ledger</h3>
        </div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
          {items.length} Line_Items
        </span>
      </div>

      {/* Table */}
      <div className="divide-y divide-pw-border">
        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-pw-glass-bg/50 text-[9px] font-black text-text-secondary uppercase tracking-widest border-b border-pw-border">
          <div className="col-span-4">Line Item</div>
          <div className="col-span-2 text-right">Rate / Amount</div>
          <div className="col-span-2 text-right">Computed $</div>
          <div className="col-span-2 text-center">Paid By</div>
          <div className="col-span-2 text-center">Action</div>
        </div>

        {/* Rows */}
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`grid grid-cols-12 gap-2 px-6 py-3 items-center transition-colors ${
              idx % 2 === 0 ? 'bg-pw-glass-bg/10' : 'bg-pw-glass-bg/20'
            } ${item.locked ? 'opacity-60' : 'hover:bg-pw-glass-bg/30'}`}
          >
            {/* Label */}
            <div className="col-span-4">
              {item.locked ? (
                <span className="text-xs font-bold text-text-primary">{item.label}</span>
              ) : (
                <input
                  type="text"
                  value={item.label}
                  onChange={e => handleLabelChange(item.id, e.target.value)}
                  className="text-xs font-bold text-text-primary bg-transparent w-full focus:outline-none border-b border-transparent focus:border-pw-accent"
                />
              )}
              <span className="text-[9px] text-text-secondary block mt-0.5">{item.category}</span>
            </div>

            {/* Rate / Amount Input */}
            <div className="col-span-2 text-right">
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  step={item.isPercentage ? '0.1' : '100'}
                  value={item.isPercentage ? (item.percentageRate ?? 0) : (item.flatAmount ?? 0)}
                  onChange={e => handleUpdateRate(item.id, e.target.value)}
                  disabled={item.locked}
                  className="text-xs font-mono font-black text-right w-16 bg-transparent focus:outline-none border-b border-transparent focus:border-pw-accent disabled:cursor-not-allowed text-text-primary"
                />
                {item.isPercentage ? (
                  <Percent className="w-3 h-3 text-text-secondary flex-shrink-0" />
                ) : (
                  <DollarSign className="w-3 h-3 text-text-secondary flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Computed Amount */}
            <div className="col-span-2 text-right">
              <span className="text-xs font-mono font-black text-text-primary">
                ${item.computedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>

            {/* Paid By */}
            <div className="col-span-2 text-center">
              <button
                onClick={() => handleTogglePaidBy(item.id)}
                disabled={item.locked}
                className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 border rounded-none transition-all disabled:cursor-not-allowed ${
                  item.paidBy === 'Seller'
                    ? 'bg-color-error/10 border-color-error/30 text-color-error'
                    : item.paidBy === 'Buyer'
                    ? 'bg-pw-accent/10 border-pw-accent/30 text-pw-accent'
                    : 'bg-pw-muted/20 border-pw-border text-text-primary'
                }`}
              >
                {item.paidBy}
              </button>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex justify-center gap-2">
              {!item.locked && (
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-text-secondary hover:text-color-error transition-colors"
                  aria-label={`Remove ${item.label}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {item.locked ? (
                <Lock className="w-3.5 h-3.5 text-text-secondary" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-text-secondary opacity-30" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Totals + Add */}
      <div className="border-t border-pw-border px-6 py-4 bg-pw-glass-bg/30">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleAddCustom}
            className="flex items-center gap-1.5 pw-btn pw-btn--secondary pw-btn--sm rounded-none text-[9px] font-black uppercase tracking-wider py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" /> Add_Line_Item
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-pw-border bg-pw-glass-bg/40 rounded-none">
            <p className="text-[9px] font-black text-color-error uppercase tracking-widest mb-1">Seller_Liability</p>
            <p className="text-2xl font-black font-mono tracking-tighter text-text-primary">
              ${sellerTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 border border-pw-border bg-pw-glass-bg/40 rounded-none">
            <p className="text-[9px] font-black text-pw-accent uppercase tracking-widest mb-1">Buyer_Liability</p>
            <p className="text-2xl font-black font-mono tracking-tighter text-text-primary">
              ${buyerTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
