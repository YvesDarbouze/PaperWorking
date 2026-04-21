'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  Clock,
  Home,
  Shield,
  Zap,
  Building2,
  CreditCard,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { HoldingCostEntry, HoldingCostType } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Holding Cost Ticker — Phase 3 (The Engine Room)
   Recurring monthly costs during active renovation:
     Property Tax, Insurance, Utilities, HOA, Loan Interest
   ═══════════════════════════════════════════════════════ */

const COST_TYPE_META: Record<HoldingCostType, { icon: React.ReactNode; defaultAmount: number }> = {
  'Property Tax': { icon: <Home className="w-4 h-4" />, defaultAmount: 0 },
  Insurance: { icon: <Shield className="w-4 h-4" />, defaultAmount: 0 },
  Utilities: { icon: <Zap className="w-4 h-4" />, defaultAmount: 0 },
  HOA: { icon: <Building2 className="w-4 h-4" />, defaultAmount: 0 },
  'Loan Interest': { icon: <CreditCard className="w-4 h-4" />, defaultAmount: 0 },
  Other: { icon: <Clock className="w-4 h-4" />, defaultAmount: 0 },
};

const DEFAULT_COSTS: HoldingCostEntry[] = [
  { id: 'hc-1', type: 'Property Tax', monthlyAmount: 0, monthsPaid: 0, totalMonths: 6, notes: '' },
  { id: 'hc-2', type: 'Insurance', monthlyAmount: 0, monthsPaid: 0, totalMonths: 6, notes: '' },
  { id: 'hc-3', type: 'Utilities', monthlyAmount: 0, monthsPaid: 0, totalMonths: 6, notes: '' },
  { id: 'hc-4', type: 'HOA', monthlyAmount: 0, monthsPaid: 0, totalMonths: 6, notes: '' },
  { id: 'hc-5', type: 'Loan Interest', monthlyAmount: 0, monthsPaid: 0, totalMonths: 6, notes: '' },
];

export default function HoldingCostTicker() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateHoldingCosts = useProjectStore(s => s.updateHoldingCosts);

  const [costs, setCosts] = useState<HoldingCostEntry[]>(
    () => currentProject?.holdingCosts ?? DEFAULT_COSTS.map(c => ({ ...c }))
  );
  const [expanded, setExpanded] = useState(true);
  const [taxCapitalized, setTaxCapitalized] = useState(false);

  const persist = useCallback(
    (next: HoldingCostEntry[]) => {
      setCosts(next);
      if (currentProject) updateHoldingCosts(currentProject.id, next);
    },
    [currentProject, updateHoldingCosts]
  );

  const updateField = (id: string, field: keyof HoldingCostEntry, value: unknown) => {
    persist(costs.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const incrementMonthPaid = (id: string) => {
    persist(
      costs.map(c =>
        c.id === id && c.monthsPaid < c.totalMonths
          ? { ...c, monthsPaid: c.monthsPaid + 1 }
          : c
      )
    );
  };

  const addCost = () => {
    const newCost: HoldingCostEntry = {
      id: `hc-${Date.now()}`,
      type: 'Other',
      monthlyAmount: 0,
      monthsPaid: 0,
      totalMonths: 6,
      notes: '',
    };
    persist([...costs, newCost]);
  };

  const removeCost = (id: string) => {
    persist(costs.filter(c => c.id !== id));
  };

  // Derived metrics
  const totals = useMemo(() => {
    const totalMonthly = costs.reduce((s, c) => s + c.monthlyAmount, 0);
    const totalPaid = costs.reduce((s, c) => s + c.monthlyAmount * c.monthsPaid, 0);
    const totalProjected = costs.reduce((s, c) => s + c.monthlyAmount * c.totalMonths, 0);
    return { totalMonthly, totalPaid, totalProjected, outstanding: totalProjected - totalPaid };
  }, [costs]);

  // Elapsed months (from deal holding cost clock)
  const elapsedMonths = useMemo(() => {
    if (!currentProject?.holdingCostClockStart) return 0;
    const start = new Date(currentProject.holdingCostClockStart);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
  }, [currentProject]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <Clock className="w-5 h-5 text-pw-subtle" />
          <div>
            <h3 className="text-lg font-medium tracking-tight text-gray-900">Holding Cost Ticker</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Recurring monthly costs during renovation
              {elapsedMonths > 0 && <span className="ml-1">· {elapsedMonths} months elapsed</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Capitalize Costs for IRS
            </span>
            <div 
              role="switch"
              aria-checked={taxCapitalized}
              onClick={() => setTaxCapitalized(!taxCapitalized)}
              className={`w-8 h-4 flex items-center rounded-full p-1 cursor-pointer transition-colors ${taxCapitalized ? 'bg-pw-black' : 'bg-gray-300'}`}
            >
              <div className={`bg-white w-2.5 h-2.5 rounded-full shadow-md transform transition-transform duration-300 ${taxCapitalized ? 'translate-x-3.5' : ''}`} />
            </div>
          </div>
          <span className="text-sm font-mono font-medium text-gray-700 ml-4 border-l border-gray-200 pl-4">
            ${totals.totalMonthly.toLocaleString()}/mo
          </span>
        </div>
      </button>

      {expanded && (
        <>
          {/* Summary */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Monthly Burn</p>
                <p className="text-lg font-light text-gray-900">${totals.totalMonthly.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Paid to Date</p>
                <p className="text-lg font-light text-green-700">${totals.totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Projected Total</p>
                <p className="text-lg font-light text-gray-900">${totals.totalProjected.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">Outstanding</p>
                <p className="text-lg font-light text-amber-700">${totals.outstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Cost entries */}
          <div className="px-6 pb-4 space-y-2">
            {costs.map(c => {
              const meta = COST_TYPE_META[c.type];
              const progress = c.totalMonths > 0 ? (c.monthsPaid / c.totalMonths) * 100 : 0;

              return (
                <div key={c.id} className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
                  <div className="flex items-center gap-3">
                    {/* Type icon */}
                    <span className="text-gray-500 flex-shrink-0">{meta.icon}</span>

                    {/* Type selector */}
                    <select
                      value={c.type}
                      onChange={e => updateField(c.id, 'type', e.target.value)}
                      className="text-sm font-medium text-gray-900 bg-transparent outline-none border-none cursor-pointer"
                    >
                      {(Object.keys(COST_TYPE_META) as HoldingCostType[]).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    {/* Monthly amount */}
                    <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                      <span className="text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={c.monthlyAmount || ''}
                        onChange={e => updateField(c.id, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-20 text-sm font-mono text-right bg-transparent outline-none text-gray-900"
                      />
                      <span className="text-gray-400 text-xs">/mo</span>
                    </div>

                    {/* Pay month button */}
                    <button
                      onClick={() => incrementMonthPaid(c.id)}
                      disabled={c.monthsPaid >= c.totalMonths}
                      className="px-2 py-1 text-xs font-bold uppercase bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition disabled:opacity-30"
                      title="Mark next month as paid"
                    >
                      Pay Mo {c.monthsPaid + 1}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeCost(c.id)}
                      className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#7f7f7f] to-[#595959] rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {c.monthsPaid}/{c.totalMonths} mo
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Add cost */}
            <button
              onClick={addCost}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition"
            >
              <Plus className="w-3 h-3" /> Add Holding Cost
            </button>
          </div>
        </>
      )}
    </div>
  );
}
