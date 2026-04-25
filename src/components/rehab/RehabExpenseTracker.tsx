'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  Wrench,
  Package,
  HardHat,
  Trash2 as TrashIcon,
  Plus,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import type { RehabExpense, RehabExpenseCategory } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Rehab Expense Tracker — Phase 3 (The Engine Room)
   Separate from Acquisition costs. Categories:
     Material, Professional Labor, Permits, Dumpster Rental
   ═══════════════════════════════════════════════════════ */

const CATEGORY_META: Record<RehabExpenseCategory, { icon: React.ReactNode; color: string }> = {
  Material: { icon: <Package className="w-4 h-4" />, color: 'text-blue-600' },
  'Professional Labor': { icon: <HardHat className="w-4 h-4" />, color: 'text-amber-600' },
  Permits: { icon: <Receipt className="w-4 h-4" />, color: 'text-purple-600' },
  'Dumpster Rental': { icon: <TrashIcon className="w-4 h-4" />, color: 'text-text-secondary' },
  Other: { icon: <Wrench className="w-4 h-4" />, color: 'text-text-secondary' },
};

const ALL_CATEGORIES: RehabExpenseCategory[] = ['Material', 'Professional Labor', 'Permits', 'Dumpster Rental', 'Other'];

export default function RehabExpenseTracker() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateRehabExpenses = useProjectStore(s => s.updateRehabExpenses);

  const [expenses, setExpenses] = useState<RehabExpense[]>(
    () => currentProject?.rehabExpenses ?? []
  );
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [newCategory, setNewCategory] = useState<RehabExpenseCategory>('Material');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newVendor, setNewVendor] = useState('');

  const persist = useCallback(
    (next: RehabExpense[]) => {
      setExpenses(next);
      if (currentProject) updateRehabExpenses(currentProject.id, next);
    },
    [currentProject, updateRehabExpenses]
  );

  const addExpense = () => {
    if (!newDesc || !newAmount) return;
    const expense: RehabExpense = {
      id: `re-${Date.now()}`,
      category: newCategory,
      description: newDesc,
      amount: parseFloat(newAmount) || 0,
      vendor: newVendor || undefined,
      paid: false,
      createdAt: new Date(),
    };
    persist([...expenses, expense]);
    setNewDesc('');
    setNewAmount('');
    setNewVendor('');
    setShowForm(false);
  };

  const togglePaid = (id: string) => {
    persist(
      expenses.map(e =>
        e.id === id ? { ...e, paid: !e.paid, paidAt: !e.paid ? new Date() : undefined } : e
      )
    );
  };

  const removeExpense = (id: string) => {
    persist(expenses.filter(e => e.id !== id));
  };

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, RehabExpense[]> = {};
    expenses.forEach(e => {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    });
    return map;
  }, [expenses]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-bg-primary transition"
      >
        <div className="flex items-center gap-2 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
          <Wrench className="w-5 h-5 text-text-secondary" />
          <div>
            <h3 className="text-lg font-medium tracking-tight text-text-primary">Rehab Expense Tracker</h3>
            <p className="text-xs text-text-secondary mt-0.5">Material, labor, permits & dumpster costs (separate from acquisition)</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="font-mono font-medium text-text-primary">${totalSpent.toLocaleString()}</span>
          <span className="text-text-secondary">{expenses.length} items</span>
        </div>
      </button>

      {expanded && (
        <>
          {/* Summary bar */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-bg-primary rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-text-secondary">Total Rehab</p>
                <p className="text-xl font-light text-text-primary">${totalSpent.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-text-secondary">Paid</p>
                <p className="text-xl font-light text-green-700">${totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg text-center">
                <p className="text-xs uppercase tracking-widest text-text-secondary">Outstanding</p>
                <p className="text-xl font-light text-amber-700">${(totalSpent - totalPaid).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Category groups */}
          <div className="divide-y divide-gray-100">
            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CATEGORY_META[cat as RehabExpenseCategory];
              const catTotal = items.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={cat} className="px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={meta?.color}>{meta?.icon}</span>
                      <span className="text-sm font-semibold text-text-primary">{cat}</span>
                      <span className="text-xs text-text-secondary">{items.length} items</span>
                    </div>
                    <span className="text-sm font-mono text-text-primary">${catTotal.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(e => (
                      <div
                        key={e.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition ${
                          e.paid ? 'bg-bg-primary border-border-accent opacity-70' : 'border-border-accent'
                        }`}
                      >
                        <button
                          onClick={() => togglePaid(e.id)}
                          className={`flex-shrink-0 ${e.paid ? 'text-green-500' : 'text-gray-300 hover:text-text-secondary'}`}
                        >
                          {e.paid ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${e.paid ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                            {e.description}
                          </p>
                          {e.vendor && <p className="text-xs text-text-secondary">{e.vendor}</p>}
                        </div>
                        <span className="text-sm font-mono text-text-primary flex-shrink-0">${e.amount.toLocaleString()}</span>
                        <button
                          onClick={() => removeExpense(e.id)}
                          className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {expenses.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-text-secondary">
              No rehab expenses logged yet. Add your first expense below.
            </div>
          )}

          {/* Add expense form */}
          <div className="px-6 py-4 border-t border-border-accent">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-border-accent rounded-lg text-xs text-text-secondary hover:bg-bg-primary hover:border-gray-400 transition"
              >
                <Plus className="w-3 h-3" /> Add Rehab Expense
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as RehabExpenseCategory)}
                    className="text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                  >
                    {ALL_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newVendor}
                    onChange={e => setNewVendor(e.target.value)}
                    placeholder="Vendor (optional)"
                    className="text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (e.g., 'Drywall for kitchen remodel')"
                  className="w-full text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                />
                <div className="flex gap-3">
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-text-secondary text-sm">$</span>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-sm border border-border-accent rounded-lg px-3 py-2 focus:ring-1 focus:ring-gray-400 outline-none"
                    />
                  </div>
                  <button
                    onClick={addExpense}
                    disabled={!newDesc || !newAmount}
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
