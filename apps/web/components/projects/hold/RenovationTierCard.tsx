'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import type { RenovationTier, ProjectWorkspace, SowLineItem } from '@/lib/projects/types';
import AssignOrInviteModal, { type AssigneeOption } from '../AssignOrInviteModal';

export type { SowLineItem };

interface RenovationTierCardProps {
  project: ProjectWorkspace;
  selectedTier: RenovationTier;
  onSelectTier: (tier: RenovationTier) => void;
  sowItems: SowLineItem[];
  onUpdateSowItems: (items: SowLineItem[]) => void;
  onUpdateProject: (updated: ProjectWorkspace) => void;
}

export const RENOVATION_TIER_DETAILS: Record<
  RenovationTier,
  {
    title: string;
    range: string;
    description: string;
    turnaround: string;
    typicalCost: number;
    deliverables: string[];
  }
> = {
  STAGE: {
    title: 'Stage',
    range: '$5,000 - $15,000',
    description: 'Cosmetic staging, designer furniture rental, professional lighting, and curb appeal touch-ups.',
    turnaround: '1 - 2 Weeks',
    typicalCost: 10000,
    deliverables: ['Living room & master suite furniture staging', 'Interior touch-up paint & deep clean', 'Front entry landscaping & hardware'],
  },
  REFURBISH: {
    title: 'Refurbish',
    range: '$15,000 - $35,000',
    description: 'Cosmetic refresh with new paint, carpet, luxury vinyl plank flooring, light fixtures, and hardware.',
    turnaround: '3 - 5 Weeks',
    typicalCost: 25000,
    deliverables: ['Interior/exterior Sherwin-Williams paint', 'LVP flooring & carpet replacement', 'Modern light fixtures & designer hardware', 'Drywall patch & trim refresh'],
  },
  RENOVATE: {
    title: 'Renovate',
    range: '$35,000 - $80,000',
    description: 'Substantial remodel including modern kitchens, designer bathrooms, mechanical upgrades, and tile finishes.',
    turnaround: '6 - 10 Weeks',
    typicalCost: 65000,
    deliverables: ['Custom shaker cabinetry & quartz countertops', 'Primary & guest bathroom gut remodels', 'Heat pump / HVAC mechanical upgrade', 'Full interior electrical & plumbing trim'],
  },
  GUT: {
    title: 'Gut',
    range: '$80,000 - $175,000',
    description: 'Complete tear-out down to studs, structural reframing, new MEP rough-ins, new insulation, and full finishes.',
    turnaround: '12 - 20 Weeks',
    typicalCost: 125000,
    deliverables: ['Down-to-studs interior demolition', 'Structural open floor plan framing', 'Complete 200A electrical & copper/PEX rough-in', 'New architectural roof & Level 5 drywall'],
  },
  DEVELOP: {
    title: 'Develop',
    range: '$175,000+',
    description: 'Ground-up addition, accessory dwelling unit (ADU), vertical expansion, or major zoning conversion.',
    turnaround: '24 - 40 Weeks',
    typicalCost: 250000,
    deliverables: ['Foundation pouring & structural envelope', 'Zoning variances & civil engineering plans', 'ADU / second dwelling unit construction', 'Full municipal final inspections & CO'],
  },
};

export default function RenovationTierCard({
  project,
  selectedTier,
  onSelectTier,
  sowItems,
  onUpdateSowItems,
  onUpdateProject,
}: RenovationTierCardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBudget, setNewBudget] = useState(5000);
  const [newContractor, setNewContractor] = useState('');

  const [assignModalTask, setAssignModalTask] = useState<{
    id: string;
    title: string;
    assignedTo?: string;
  } | null>(null);

  const tierInfo = RENOVATION_TIER_DETAILS[selectedTier];

  const totalBudget = useMemo(
    () => sowItems.reduce((acc, item) => acc + item.budgetedAmount, 0),
    [sowItems]
  );
  const totalActual = useMemo(
    () => sowItems.reduce((acc, item) => acc + item.actualAmount, 0),
    [sowItems]
  );
  const variance = totalBudget - totalActual;
  const isUnderBudget = variance >= 0;

  const overallProgressPct = useMemo(() => {
    if (sowItems.length === 0) return 0;
    const weightedSum = sowItems.reduce(
      (acc, item) => acc + item.budgetedAmount * (item.completionPct / 100),
      0
    );
    return Math.round((weightedSum / (totalBudget || 1)) * 100);
  }, [sowItems, totalBudget]);

  const handleUpdateCompletion = (id: string, pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct));
    const updated = sowItems.map((item) => {
      if (item.id === id) {
        const newStatus: SowLineItem['status'] =
          clamped === 100 ? 'completed' : clamped > 0 ? 'in_progress' : 'not_started';
        return { ...item, completionPct: clamped, status: newStatus };
      }
      return item;
    });
    onUpdateSowItems(updated);
  };

  const handleAddSow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || !newDescription.trim()) return;
    const newItem: SowLineItem = {
      id: `sow-${Date.now()}`,
      category: newCategory.trim(),
      description: newDescription.trim(),
      contractor: newContractor.trim() || 'Unassigned',
      budgetedAmount: Number(newBudget) || 0,
      actualAmount: 0,
      completionPct: 0,
      status: 'not_started',
    };
    onUpdateSowItems([...sowItems, newItem]);
    setNewCategory('');
    setNewDescription('');
    setNewContractor('');
    setNewBudget(5000);
    setShowAddModal(false);
  };

  const handleMemberAssigned = (newMember: AssigneeOption, taskId: string) => {
    const currentMembers = (project.teamMembers || []) as AssigneeOption[];
    const updatedMembers = [...currentMembers, newMember];
    const updatedSow = sowItems.map((item) => {
      if (item.id === taskId) {
        return { ...item, contractor: newMember.name };
      }
      return item;
    });
    onUpdateSowItems(updatedSow);
    onUpdateProject({
      ...project,
      teamMembers: updatedMembers,
    });
  };

  return (
    <div className="space-y-6" data-testid="renovation-tier-card">
      {/* 5 Renovation Tiers Selector */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Renovation Scope Hierarchy
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Target Scope Tier: {tierInfo.title} ({tierInfo.range})
            </h2>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 border border-neutral-700 bg-neutral-900 text-neutral-300 rounded-none">
            Est. Turnaround: {tierInfo.turnaround}
          </span>
        </div>

        {/* 5 Tier Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Renovation Tier">
          {(['STAGE', 'REFURBISH', 'RENOVATE', 'GUT', 'DEVELOP'] as RenovationTier[]).map((tier) => {
            const isSelected = selectedTier === tier;
            const details = RENOVATION_TIER_DETAILS[tier];
            return (
              <button
                key={tier}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`renovation-tier-${tier.toLowerCase()}`}
                onClick={() => onSelectTier(tier)}
                className={`min-h-[44px] p-3 text-left border rounded-none transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-white bg-neutral-900 text-white shadow-sm'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase font-mono tracking-wider">{details.title}</span>
                  {isSelected && <span className="h-2 w-2 bg-emerald-400 rounded-none" />}
                </div>
                <span className="text-[11px] font-mono text-neutral-400 mt-2">{details.range}</span>
              </button>
            );
          })}
        </div>

        {/* Tier Details Callout */}
        <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block mb-1">Scope Profile</span>
            <p className="text-neutral-300 leading-relaxed">{tierInfo.description}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block mb-1">Key Deliverables</span>
            <ul className="space-y-1 text-neutral-400">
              {tierInfo.deliverables.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Budget vs Actual Comparison Card */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none" data-testid="rehab-budget-comparison">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Rehabilitation Financial Reconciliation
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">Budget vs. Committed Contracts vs. Incurred Spend</h3>
          </div>
          <button
            type="button"
            data-testid="add-sow-line-btn"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] px-4 py-2 border border-neutral-700 bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 transition rounded-none flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Add SOW Line Item</span>
          </button>
        </div>

        {/* 4 Metric Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Baseline Budget</span>
            <span className="text-base font-bold font-mono text-white mt-1 block">{formatCurrency(totalBudget)}</span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">{sowItems.length} Trade Scopes</span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Committed SOW</span>
            <span className="text-base font-bold font-mono text-neutral-200 mt-1 block">{formatCurrency(totalBudget)}</span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">Signed Contracts</span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Actual Incurred</span>
            <span className="text-base font-bold font-mono text-white mt-1 block">{formatCurrency(totalActual)}</span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">Draws & Invoices</span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Variance (Budget - Actual)</span>
            <span className={`text-base font-bold font-mono mt-1 block ${isUnderBudget ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUnderBudget ? `+${formatCurrency(variance)}` : `-${formatCurrency(Math.abs(variance))}`}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              {isUnderBudget ? 'Under Budget' : 'Budget Overrun'}
            </span>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
            <span className="text-neutral-400">Substantial Completion Progress</span>
            <span className="font-bold text-white">{overallProgressPct}% Reconciled</span>
          </div>
          <div className="h-2 w-full bg-neutral-800 rounded-none overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 rounded-none"
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* SOW Line Items Table */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono mb-4">
          Scope of Work (SOW) Line Item Execution
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 pr-4">Trade / Scope</th>
                <th className="py-2.5 px-4">Contractor / Assignee</th>
                <th className="py-2.5 px-4 text-right">Budget</th>
                <th className="py-2.5 px-4 text-right">Actual</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 pl-4 text-right">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-200">
              {sowItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-900/40 transition">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-white">{item.category}</p>
                    <p className="text-[11px] text-neutral-400">{item.description}</p>
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-300">
                    <div className="flex items-center gap-1.5">
                      <span>{item.contractor}</span>
                      <button
                        type="button"
                        title="Assign or invite contractor"
                        data-testid={`assign-sow-${item.id}`}
                        onClick={() =>
                          setAssignModalTask({
                            id: item.id,
                            title: `${item.category}: ${item.description}`,
                            assignedTo: item.contractor,
                          })
                        }
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-white transition rounded-none"
                      >
                        <span className="material-symbols-outlined text-[15px]">person_add</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.budgetedAmount)}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className={item.actualAmount > item.budgetedAmount ? 'text-red-400 font-bold' : 'text-neutral-200'}>
                      {formatCurrency(item.actualAmount)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase border rounded-none ${
                        item.status === 'completed'
                          ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                          : item.status === 'in_progress'
                          ? 'border-amber-600 bg-amber-950/40 text-amber-300'
                          : item.status === 'delayed'
                          ? 'border-red-600 bg-red-950/40 text-red-400'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {item.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={item.completionPct}
                        onChange={(e) => handleUpdateCompletion(item.id, Number(e.target.value))}
                        className="w-16 accent-white cursor-pointer"
                        aria-label={`Update progress for ${item.category}`}
                      />
                      <span className="font-mono text-[11px] font-semibold w-10 text-right text-white">
                        {item.completionPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add SOW Line Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleAddSow}
            className="w-full max-w-md border border-neutral-700 bg-neutral-950 p-6 space-y-4 rounded-none shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Add Scope of Work Item</h3>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Trade / Category</label>
              <input
                type="text"
                required
                placeholder="e.g. Electrical 200A Upgrade"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Detailed Scope Description</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Pull new service cable, replace main panel, add dedicated 50A EV charger circuit."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Budgeted Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newBudget}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono text-base sm:text-xs outline-none focus:border-white rounded-none"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Contractor / Sub</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Electric LLC"
                  value={newContractor}
                  onChange={(e) => setNewContractor(e.target.value)}
                  className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[44px] px-4 py-2 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-900 rounded-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 bg-white text-black text-xs font-bold hover:bg-neutral-200 transition rounded-none"
              >
                Save Line Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contractor Assignment Modal */}
      <AssignOrInviteModal
        isOpen={Boolean(assignModalTask)}
        onClose={() => setAssignModalTask(null)}
        projectId={project.id}
        projectName={project.propertyName || project.property_address || 'Hold Workspace'}
        task={assignModalTask}
        existingMembers={(project.teamMembers || []) as AssigneeOption[]}
        onAssignExisting={async (taskId, assigneeName) => {
          const updatedSow = sowItems.map((item) => {
            if (item.id === taskId) {
              return { ...item, contractor: assigneeName };
            }
            return item;
          });
          onUpdateSowItems(updatedSow);
        }}
        onMemberInvitedAndAssigned={handleMemberAssigned}
      />
    </div>
  );
}
