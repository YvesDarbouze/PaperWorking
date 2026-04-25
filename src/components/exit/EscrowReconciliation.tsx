'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { ProratedEscrowItem } from '@/types/schema';
import { computeProratedEscrow } from '@/lib/math/calculatorUtils';
import { Calendar, Plus, Trash2, Scale } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Escrow Reconciliation — Prorated Cost Calculator
   
   Calculates seller/buyer credits for taxes, insurance, 
   and HOA based on closing date position in the year.
   ═══════════════════════════════════════════════════════ */

const ESCROW_TYPES: ProratedEscrowItem['type'][] = ['Property Tax', 'Insurance', 'HOA', 'Utilities', 'Other'];

interface EscrowReconciliationProps {
  projectId: string;
}

export default function EscrowReconciliation({ projectId }: EscrowReconciliationProps) {
  const financials = useProjectStore(state => {
    const p = state.projects.find(d => d.id === projectId);
    return p?.financials;
  });
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  const [closingDate, setClosingDate] = useState<string>(() => {
    const d = financials?.soldDate ? new Date(financials.soldDate) : new Date();
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState<ProratedEscrowItem[]>(() =>
    financials?.proratedEscrow?.length
      ? financials.proratedEscrow
      : [
          { id: 'pe-tax', type: 'Property Tax', annualAmount: 0, dailyRate: 0, sellerDays: 0, sellerCredit: 0, buyerCredit: 0 },
          { id: 'pe-ins', type: 'Insurance', annualAmount: 0, dailyRate: 0, sellerDays: 0, sellerCredit: 0, buyerCredit: 0 },
        ]
  );

  // Recompute on date or amount change
  useEffect(() => {
    const date = new Date(closingDate);
    if (!isNaN(date.getTime())) {
      const computed = computeProratedEscrow(date, items);
      setItems(computed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closingDate]);

  const persistItems = useCallback((updated: ProratedEscrowItem[]) => {
    setItems(updated);
    updateProjectFinancials(projectId, { proratedEscrow: updated });
  }, [projectId, updateProjectFinancials]);

  const handleAmountChange = (id: string, value: string) => {
    const amount = Number(value) || 0;
    const date = new Date(closingDate);
    const updated = items.map(item =>
      item.id === id ? { ...item, annualAmount: amount } : item
    );
    if (!isNaN(date.getTime())) {
      persistItems(computeProratedEscrow(date, updated));
    } else {
      persistItems(updated);
    }
  };

  const handleAddItem = () => {
    const newItem: ProratedEscrowItem = {
      id: `pe-custom-${Date.now()}`,
      type: 'Other',
      annualAmount: 0,
      dailyRate: 0,
      sellerDays: 0,
      sellerCredit: 0,
      buyerCredit: 0,
    };
    persistItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    persistItems(items.filter(i => i.id !== id));
  };

  const handleTypeChange = (id: string, type: ProratedEscrowItem['type']) => {
    persistItems(items.map(i => i.id === id ? { ...i, type } : i));
  };

  const totalSellerCredit = useMemo(() => items.reduce((s, i) => s + i.sellerCredit, 0), [items]);
  const totalBuyerCredit = useMemo(() => items.reduce((s, i) => s + i.buyerCredit, 0), [items]);

  return (
    <div className="bg-bg-surface border border-border-accent relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-accent">
        <div className="flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-pw-accent" />
          <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">
            Escrow_Reconciliation
          </h3>
        </div>
      </div>

      {/* Closing Date */}
      <div className="px-6 py-4 bg-bg-primary border-b border-border-accent">
        <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block mb-2">
          Closing_Date
        </label>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-text-secondary" />
          <input
            type="date"
            value={closingDate}
            onChange={e => setClosingDate(e.target.value)}
            className="bg-transparent text-sm font-mono font-bold text-text-primary focus:outline-none border-b border-transparent focus:border-pw-accent"
          />
        </div>
      </div>

      {/* Prorated Items */}
      <div className="divide-y divide-pw-border">
        {items.map(item => (
          <div key={item.id} className="px-6 py-4 grid grid-cols-12 gap-3 items-center hover:bg-bg-primary/50 transition-colors">
            {/* Type Selector */}
            <div className="col-span-3">
              <select
                value={item.type}
                onChange={e => handleTypeChange(item.id, e.target.value as ProratedEscrowItem['type'])}
                className="text-xs font-bold text-text-primary bg-transparent focus:outline-none w-full border-b border-transparent focus:border-pw-accent"
              >
                {ESCROW_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Annual Amount */}
            <div className="col-span-2">
              <label className="text-[8px] font-black text-text-secondary uppercase block mb-0.5">Annual $</label>
              <input
                type="number"
                value={item.annualAmount || ''}
                onChange={e => handleAmountChange(item.id, e.target.value)}
                placeholder="0"
                className="text-xs font-mono font-black text-text-primary bg-transparent w-full focus:outline-none border-b border-transparent focus:border-pw-accent"
              />
            </div>

            {/* Daily Rate */}
            <div className="col-span-2 text-center">
              <label className="text-[8px] font-black text-text-secondary uppercase block mb-0.5">Daily</label>
              <span className="text-[11px] font-mono text-text-secondary">
                ${item.dailyRate.toFixed(2)}
              </span>
            </div>

            {/* Seller Credit */}
            <div className="col-span-2 text-right">
              <label className="text-[8px] font-black text-red-400 uppercase block mb-0.5">Seller</label>
              <span className="text-xs font-mono font-black text-red-600">
                ${item.sellerCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Buyer Credit */}
            <div className="col-span-2 text-right">
              <label className="text-[8px] font-black text-blue-400 uppercase block mb-0.5">Buyer</label>
              <span className="text-xs font-mono font-black text-blue-600">
                ${item.buyerCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Remove */}
            <div className="col-span-1 text-center">
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="p-1 text-text-secondary hover:text-red-500 transition-colors"
                aria-label={`Remove ${item.type}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-pw-black px-6 py-4 bg-bg-primary">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleAddItem}
            className="flex items-center gap-1.5 text-[10px] font-black text-pw-accent uppercase tracking-widest hover:text-text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add_Prorated_Item
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border border-border-accent bg-bg-surface">
            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">Seller_Owes</p>
            <p className="text-lg font-black font-mono tracking-tighter text-text-primary">
              ${totalSellerCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 border border-border-accent bg-bg-surface">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Buyer_Owes</p>
            <p className="text-lg font-black font-mono tracking-tighter text-text-primary">
              ${totalBuyerCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
