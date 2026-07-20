'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, ClipboardList, AlertCircle, Percent, DollarSign } from 'lucide-react';
import type { Project, ScopeOfWorkItem, RehabExpenseCategory } from '@/types/schema';
import toast from 'react-hot-toast';

interface RehabBudgetCardProps {
  project: Project;
  phaseColor?: string;
  onSave: (updates: any) => Promise<void>;
}

const CATEGORIES: RehabExpenseCategory[] = [
  'Demo',
  'Systems',
  'Interior',
  'Exterior',
  'Material',
  'Professional Labor',
  'Permits',
  'Dumpster Rental',
  'Other',
];

const uuidv4 = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export function RehabBudgetCard({
  project,
  phaseColor = '#595959',
  onSave,
}: RehabBudgetCardProps) {
  const isTurnkey = (project.condition || '').toLowerCase() === 'turnkey';

  // Load initial line items from project
  const initialItems: ScopeOfWorkItem[] = useMemo(() => {
    return project.rehab?.scopeOfWork || [];
  }, [project.rehab?.scopeOfWork]);

  // Load initial contingency from project (default to 15%)
  const initialContingency = useMemo(() => {
    const val = project.rehab?.contingencyBufferPercentage;
    return val !== undefined && val !== null ? Math.round(val * 100).toString() : '15';
  }, [project.rehab?.contingencyBufferPercentage]);

  const [items, setItems] = useState<ScopeOfWorkItem[]>(initialItems);
  const [contingency, setContingency] = useState<string>(initialContingency);
  const [upfrontRehab, setUpfrontRehab] = useState<string>(project.financials?.upfrontRehab ? (project.financials.upfrontRehab / 100).toString() : '0');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with project updates only when project ID changes
  useEffect(() => {
    setItems(initialItems);
    setContingency(initialContingency);
    setUpfrontRehab(project.financials?.upfrontRehab ? (project.financials.upfrontRehab / 100).toString() : '0');
  }, [project.id, project.financials?.upfrontRehab]);

  // Subject Property Sqft
  const subjectSqft = useMemo(() => {
    return project.propertyFacts?.sqft || project.squareFootage || 0;
  }, [project]);

  // Guidance Chips ranges
  const guidanceRanges = useMemo(() => {
    if (subjectSqft <= 0) return null;
    return {
      cosmetic: { min: subjectSqft * 15, max: subjectSqft * 30 },
      medium: { min: subjectSqft * 30, max: subjectSqft * 75 },
      gut: { min: subjectSqft * 75, max: subjectSqft * 150 },
    };
  }, [subjectSqft]);

  const handleAddItem = () => {
    const newItem: ScopeOfWorkItem = {
      id: uuidv4(),
      category: 'Interior',
      description: '',
      estimatedCost: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, fields: Partial<ScopeOfWorkItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...fields } : item)));
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const baseBudget = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.estimatedCost) || 0), 0);
  }, [items]);

  const contingencyVal = useMemo(() => {
    const pct = parseFloat(contingency) || 0;
    return baseBudget * (pct / 100);
  }, [baseBudget, contingency]);

  const totalBudget = useMemo(() => {
    return baseBudget + contingencyVal;
  }, [baseBudget, contingencyVal]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const contingencyPct = parseFloat(contingency) || 0;

      // Filter out empty items
      const validItems = items.filter(item => item.description.trim() !== '');

      const updates: any = {
        'rehab.scopeOfWork': validItems,
        'rehab.baseBudget': baseBudget,
        'rehab.contingencyBufferPercentage': contingencyPct / 100,
        'financials.rehabBudget': Math.round(totalBudget * 100),
        'financials.rehab_budget': Math.round(totalBudget * 100),
        'financials.projectedRehabCost': Math.round(totalBudget * 100),
        'financials.upfrontRehab': Math.round((parseFloat(upfrontRehab) || 0) * 100),
      };

      await onSave(updates);
      toast.success('Rehab budget saved successfully!');
    } catch (err) {
      console.error('Failed to save rehab budget:', err);
      toast.error('Failed to save rehab budget');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isTurnkey) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#161217] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            <ClipboardList className="h-4 w-4 text-[#ffac5a]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Rehab & CapEx Budget</h4>
            <p className="text-[9px] text-[#9E9DA0]">Projected rehab scope line-item modeling</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1 rounded bg-[#241e26] border border-white/10 hover:bg-white/5 text-white text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Budget'}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Scope Guidance Chips */}
        <div className="space-y-2">
          <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">Scope Guidance Hints (Per Sqft)</span>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-col items-start px-3 py-2 rounded-lg bg-[#241e26]/40 border border-white/5 max-w-[180px]">
              <span className="text-[8px] font-bold text-green-400 uppercase tracking-wide">Cosmetic</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5">$15 - $30/sqft</span>
              {guidanceRanges && (
                <span className="text-[8px] text-[#9E9DA0] font-mono mt-0.5">
                  ({formatCurrency(guidanceRanges.cosmetic.min)} - {formatCurrency(guidanceRanges.cosmetic.max)})
                </span>
              )}
            </div>
            <div className="flex flex-col items-start px-3 py-2 rounded-lg bg-[#241e26]/40 border border-white/5 max-w-[180px]">
              <span className="text-[8px] font-bold text-[#ffac5a] uppercase tracking-wide">Medium</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5">$30 - $75/sqft</span>
              {guidanceRanges && (
                <span className="text-[8px] text-[#9E9DA0] font-mono mt-0.5">
                  ({formatCurrency(guidanceRanges.medium.min)} - {formatCurrency(guidanceRanges.medium.max)})
                </span>
              )}
            </div>
            <div className="flex flex-col items-start px-3 py-2 rounded-lg bg-[#241e26]/40 border border-white/5 max-w-[180px]">
              <span className="text-[8px] font-bold text-red-400 uppercase tracking-wide">Gut Rehab</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5">$75 - $150/sqft</span>
              {guidanceRanges && (
                <span className="text-[8px] text-[#9E9DA0] font-mono mt-0.5">
                  ({formatCurrency(guidanceRanges.gut.min)} - {formatCurrency(guidanceRanges.gut.max)})
                </span>
              )}
            </div>
          </div>
          {subjectSqft <= 0 && (
            <span className="block text-[8px] text-yellow-400/80">
              * Subject square footage missing; total ranges not shown. Add sqft in Target details.
            </span>
          )}
        </div>

        {/* Line Items Repeater */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-widest text-[#9E9DA0] font-bold">Line Items</span>
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 text-[8px] font-bold text-[#ffac5a] hover:text-[#ffbe7a] uppercase tracking-wider transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-center bg-white/[0.01] border border-white/5 p-2 rounded-lg">
                <select
                  value={item.category}
                  onChange={(e) => handleUpdateItem(item.id, { category: e.target.value as RehabExpenseCategory })}
                  className="w-[120px] rounded px-2 py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                  placeholder="Item description..."
                  className="flex-1 rounded px-2.5 py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a]"
                />

                <div className="relative w-[110px]">
                  <DollarSign className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9E9DA0]" />
                  <input
                    type="number"
                    value={item.estimatedCost || ''}
                    onChange={(e) => handleUpdateItem(item.id, { estimatedCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full pl-6 pr-2 rounded py-1 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
                  />
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 rounded text-red-400/75 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-6 border border-dashed border-white/5 rounded-lg bg-white/[0.005]">
                <span className="text-[10px] text-[#9E9DA0]">No items added yet. Click "Add Item" to add a scope line.</span>
              </div>
            )}
          </div>
        </div>

        {/* Calculations & Contingency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5 bg-white/[0.005] p-4 rounded-lg">
          {/* Contingency input */}
          <div className="space-y-2">
            <label className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">Contingency Buffer (%)</label>
            <div className="relative w-[100px]">
              <input
                type="number"
                value={contingency}
                onChange={(e) => setContingency(e.target.value)}
                min="0"
                max="100"
                className="w-full pr-6 rounded px-2.5 py-1.5 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
              />
              <Percent className="absolute right-2 top-2.5 h-3 w-3 text-[#9E9DA0]" />
            </div>
            <span className="block text-[8px] text-[#9E9DA0]">Applied to the base budget total</span>
          </div>

          {/* Upfront Rehab Cash (Out of Pocket) */}
          <div className="space-y-2">
            <label className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">Upfront Rehab Cash</label>
            <div className="relative w-[130px]">
              <DollarSign className="absolute left-2.5 top-2.5 h-3 w-3 text-[#9E9DA0]" />
              <input
                type="number"
                value={upfrontRehab}
                onChange={(e) => setUpfrontRehab(e.target.value)}
                min="0"
                className="w-full pl-6 rounded px-2.5 py-1.5 text-xs bg-[#161217] border border-white/10 text-white focus:outline-none focus:border-[#ffac5a] font-mono text-right"
              />
            </div>
            <span className="block text-[8px] text-[#9E9DA0]">Out-of-pocket rehab cash basis portion</span>
          </div>

          {/* Rollups */}
          <div className="flex justify-end gap-6 text-right">
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">Base Budget</span>
              <span className="text-xs font-bold text-white font-mono">{formatCurrency(baseBudget)}</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold">Contingency ({contingency}%)</span>
              <span className="text-xs font-bold text-yellow-400 font-mono">+{formatCurrency(contingencyVal)}</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-[#9E9DA0] font-bold text-[#ffac5a]">Total Budget</span>
              <span className="text-sm font-extrabold text-[#ffac5a] font-mono">{formatCurrency(totalBudget)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
