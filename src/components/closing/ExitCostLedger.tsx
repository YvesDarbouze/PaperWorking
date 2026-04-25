'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Percent,
  DollarSign,
} from 'lucide-react';
import type { ExitCostLineItem, ExitCostCategory } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Exit Cost Ledger — Final Settlement Costs
   Broker Fees (5-6%), Staging, Marketing, Buyer Concessions
   ═══════════════════════════════════════════════════════ */

const ALL_CATEGORIES: ExitCostCategory[] = ['Broker Fee', 'Staging', 'Marketing', 'Buyer Concessions', 'Other'];

const DEFAULT_EXIT_COSTS: ExitCostLineItem[] = [
  { id: 'ec-1', category: 'Broker Fee', label: "Listing Agent Commission", amount: 0, isPercentage: true, percentageRate: 3, paid: false, notes: '' },
  { id: 'ec-2', category: 'Broker Fee', label: "Buyer's Agent Commission", amount: 0, isPercentage: true, percentageRate: 2.5, paid: false, notes: '' },
  { id: 'ec-3', category: 'Staging', label: 'Home Staging', amount: 0, isPercentage: false, paid: false, notes: '' },
  { id: 'ec-4', category: 'Marketing', label: 'Professional Photography', amount: 0, isPercentage: false, paid: false, notes: '' },
  { id: 'ec-5', category: 'Marketing', label: 'Marketing & Advertising', amount: 0, isPercentage: false, paid: false, notes: '' },
  { id: 'ec-6', category: 'Buyer Concessions', label: 'Buyer Closing Cost Credit', amount: 0, isPercentage: false, paid: false, notes: '' },
];

const CATEGORY_COLORS: Record<ExitCostCategory, string> = {
  'Broker Fee': 'text-blue-600 bg-blue-50',
  Staging: 'text-purple-600 bg-purple-50',
  Marketing: 'text-amber-600 bg-amber-50',
  'Buyer Concessions': 'text-red-600 bg-red-50',
  Other: 'text-text-secondary bg-bg-primary',
};

export default function ExitCostLedger() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateExitCosts = useProjectStore(s => s.updateExitCosts);

  const [costs, setCosts] = useState<ExitCostLineItem[]>(
    () => currentProject?.exitCosts ?? DEFAULT_EXIT_COSTS.map(c => ({ ...c }))
  );
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [newCategory, setNewCategory] = useState<ExitCostCategory>('Broker Fee');
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIsPercentage, setNewIsPercentage] = useState(false);
  const [newRate, setNewRate] = useState('');

  const salePrice = currentProject?.financials?.actualSalePrice || currentProject?.financials?.estimatedARV || 0;

  const persist = useCallback(
    (next: ExitCostLineItem[]) => {
      setCosts(next);
      if (currentProject) updateExitCosts(currentProject.id, next);
    },
    [currentProject, updateExitCosts]
  );

  const addCost = () => {
    if (!newLabel) return;
    const item: ExitCostLineItem = {
      id: `ec-${Date.now()}`,
      category: newCategory,
      label: newLabel,
      amount: parseFloat(newAmount) || 0,
      isPercentage: newIsPercentage,
      percentageRate: newIsPercentage ? parseFloat(newRate) || 0 : undefined,
      paid: false,
      notes: '',
    };
    persist([...costs, item]);
    setNewLabel('');
    setNewAmount('');
    setNewRate('');
    setNewIsPercentage(false);
    setShowForm(false);
  };

  const togglePaid = (id: string) => {
    persist(
      costs.map(c =>
        c.id === id ? { ...c, paid: !c.paid, paidAt: !c.paid ? new Date() : undefined } : c
      )
    );
  };

  const updateField = (id: string, field: keyof ExitCostLineItem, value: unknown) => {
    persist(costs.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCost = (id: string) => {
    persist(costs.filter(c => c.id !== id));
  };

  // Calculate effective amounts
  const getEffectiveAmount = (item: ExitCostLineItem): number => {
    if (item.isPercentage && item.percentageRate) {
      return (item.percentageRate / 100) * salePrice;
    }
    return item.amount;
  };

  const totals = useMemo(() => {
    const totalExit = costs.reduce((s, c) => s + getEffectiveAmount(c), 0);
    const totalPaid = costs.filter(c => c.paid).reduce((s, c) => s + getEffectiveAmount(c), 0);
    return { totalExit, totalPaid, outstanding: totalExit - totalPaid };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costs, salePrice]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, ExitCostLineItem[]> = {};
    costs.forEach(c => {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    });
    return map;
  }, [costs]);

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-bg-primary transition"
      >
        <div className="flex items-center gap-2 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
          <Receipt className="w-5 h-5 text-text-secondary" />
          <div>
            <h3 className="text-lg font-medium tracking-tight text-text-primary">Exit Cost Ledger</h3>
            <p className="text-xs text-text-secondary mt-0.5">Broker fees, staging, marketing & buyer concessions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono font-medium text-text-primary">${totals.totalExit.toLocaleString()}</span>
          <span className="text-text-secondary">{costs.length} items</span>
        </div>
      </button>

      {expanded && (
        <>
          {/* Summary */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-bg-primary rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-text-secondary">Sale Price</p>
                <p className="text-lg font-light text-text-primary">${salePrice.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-text-secondary">Total Exit Costs</p>
                <p className="text-lg font-light text-red-600">${totals.totalExit.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-text-secondary">Paid</p>
                <p className="text-lg font-light text-green-700">${totals.totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-text-secondary">Outstanding</p>
                <p className="text-lg font-light text-amber-700">${totals.outstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Category groups */}
          <div className="divide-y divide-gray-100">
            {Object.entries(grouped).map(([cat, items]) => {
              const catTotal = items.reduce((s, c) => s + getEffectiveAmount(c), 0);
              const color = CATEGORY_COLORS[cat as ExitCostCategory] || CATEGORY_COLORS.Other;
              return (
                <div key={cat} className="px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${color}`}>{cat}</span>
                      <span className="text-xs text-text-secondary">{items.length} items</span>
                    </div>
                    <span className="text-sm font-mono text-text-primary">${catTotal.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(item => {
                      const effective = getEffectiveAmount(item);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition ${
                            item.paid ? 'bg-bg-primary border-border-accent opacity-70' : 'border-border-accent'
                          }`}
                        >
                          <button
                            onClick={() => togglePaid(item.id)}
                            className={`flex-shrink-0 ${item.paid ? 'text-green-500' : 'text-gray-300 hover:text-text-secondary'}`}
                          >
                            {item.paid ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.label}
                              onChange={e => updateField(item.id, 'label', e.target.value)}
                              className={`w-full text-sm bg-transparent outline-none ${
                                item.paid ? 'line-through text-text-secondary' : 'text-text-primary'
                              }`}
                            />
                          </div>

                          {/* Amount / Percentage display */}
                          {item.isPercentage ? (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <input
                                type="number"
                                value={item.percentageRate || ''}
                                onChange={e =>
                                  updateField(item.id, 'percentageRate', parseFloat(e.target.value) || 0)
                                }
                                className="w-14 text-sm font-mono text-right bg-transparent outline-none text-text-primary"
                              />
                              <Percent className="w-3 h-3 text-text-secondary" />
                              <span className="text-xs text-text-secondary ml-1">=</span>
                              <span className="text-sm font-mono text-text-primary ml-1">${effective.toLocaleString()}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <DollarSign className="w-3 h-3 text-text-secondary" />
                              <input
                                type="number"
                                value={item.amount || ''}
                                onChange={e =>
                                  updateField(item.id, 'amount', parseFloat(e.target.value) || 0)
                                }
                                placeholder="0"
                                className="w-20 text-sm font-mono text-right bg-transparent outline-none text-text-primary"
                              />
                            </div>
                          )}

                          <button
                            onClick={() => removeCost(item.id)}
                            className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {costs.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-text-secondary">
              No exit costs logged yet.
            </div>
          )}

          {/* Add cost form */}
          <div className="px-6 py-4 border-t border-border-accent">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-border-accent rounded-lg text-xs text-text-secondary hover:bg-bg-primary hover:border-gray-400 transition"
              >
                <Plus className="w-3 h-3" /> Add Exit Cost
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as ExitCostCategory)}
                    className="text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                  >
                    {ALL_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Line item label"
                    className="text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                  />
                </div>

                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsPercentage}
                      onChange={e => setNewIsPercentage(e.target.checked)}
                      className="rounded border-border-accent"
                    />
                    % of sale price
                  </label>

                  {newIsPercentage ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        value={newRate}
                        onChange={e => setNewRate(e.target.value)}
                        placeholder="e.g. 3"
                        className="w-full text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                      />
                      <Percent className="w-3.5 h-3.5 text-text-secondary" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-1">
                      <DollarSign className="w-3.5 h-3.5 text-text-secondary" />
                      <input
                        type="number"
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                      />
                    </div>
                  )}

                  <button
                    onClick={addCost}
                    disabled={!newLabel}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
