'use client';

import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '@/lib/projects/phase-utils';
import type {
  ProjectWorkspace,
  SowLineItem,
  MunicipalPermit,
  ContractorRecord,
  QualityControlInspection,
  DrawRequest,
  GroundUpMilestone,
} from '@/lib/projects/types';
import AssignOrInviteModal, { type AssigneeOption } from '../AssignOrInviteModal';
import VendorMarketplaceSuggestions from '../fund/VendorMarketplaceSuggestions';
import TeamTierUpgradeModal from '../fund/TeamTierUpgradeModal';

export interface HoldRenovationDevelopmentTasksProps {
  project: ProjectWorkspace;
  sowItems: SowLineItem[];
  onUpdateSowItems: (items: SowLineItem[]) => void;
  permits: MunicipalPermit[];
  onUpdatePermits: (permits: MunicipalPermit[]) => void;
  contractors: ContractorRecord[];
  onUpdateContractors: (contractors: ContractorRecord[]) => void;
  inspections: QualityControlInspection[];
  onUpdateInspections: (inspections: QualityControlInspection[]) => void;
  draws: DrawRequest[];
  onUpdateDraws: (draws: DrawRequest[]) => void;
  groundUpMilestones: GroundUpMilestone[];
  onUpdateGroundUpMilestones: (milestones: GroundUpMilestone[]) => void;
  userTier?: string;
  propertyState?: string;
  activeRoster?: AssigneeOption[];
  onUpdateProject?: (updated: ProjectWorkspace) => void;
}

export default function HoldRenovationDevelopmentTasks({
  project,
  sowItems,
  onUpdateSowItems,
  permits,
  onUpdatePermits,
  contractors,
  onUpdateContractors,
  inspections,
  onUpdateInspections,
  draws,
  onUpdateDraws,
  groundUpMilestones,
  onUpdateGroundUpMilestones,
  userTier = 'Investment Team',
  propertyState = 'TX',
  activeRoster = [],
  onUpdateProject,
}: HoldRenovationDevelopmentTasksProps) {
  const isTeamTier = userTier.toLowerCase().includes('team') || userTier.toLowerCase().includes('enterprise');

  // Active modal state
  const [activeVendorTrade, setActiveVendorTrade] = useState<string | null>(null);
  const [vendorTaskTitle, setVendorTaskTitle] = useState<string>('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeTaskTitle, setUpgradeTaskTitle] = useState('');
  const [assignModalTask, setAssignModalTask] = useState<{ id: string; title: string; currentAssignee?: string } | null>(null);

  // New Draw Request Form State
  const [newDrawAmount, setNewDrawAmount] = useState<number>(20000);
  const [newDrawInspector, setNewDrawInspector] = useState<string>('Trinity Inspection Group');

  const handleOpenAssign = (taskKey: string, taskTitle: string, currentAssignee?: string) => {
    if (!isTeamTier) {
      setUpgradeTaskTitle(taskTitle);
      setIsUpgradeModalOpen(true);
      return;
    }
    setAssignModalTask({ id: taskKey, title: taskTitle, currentAssignee });
  };

  const handleOpenVendor = (trade: string, taskTitle: string) => {
    setActiveVendorTrade(trade);
    setVendorTaskTitle(taskTitle);
  };

  // Add Draw Request
  const handleAddDraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDrawAmount <= 0) return;
    const retainage = Math.round(newDrawAmount * 0.1);
    const newDraw: DrawRequest = {
      id: `drw-${Date.now()}`,
      drawNumber: draws.length + 1,
      amountRequested: newDrawAmount,
      retainageAmount: retainage,
      amountApproved: newDrawAmount - retainage,
      lenderInspector: newDrawInspector,
      status: 'submitted',
      requestedDate: new Date().toISOString().slice(0, 10),
    };
    onUpdateDraws([...draws, newDraw]);
  };

  // Toggle SOW Item Completion
  const handleToggleSowItem = (id: string) => {
    const updated = sowItems.map((item) => {
      if (item.id !== id) return item;
      const isComplete = item.status === 'completed';
      return {
        ...item,
        status: (isComplete ? 'in_progress' : 'completed') as SowLineItem['status'],
        completionPct: isComplete ? 50 : 100,
      };
    });
    onUpdateSowItems(updated);
  };

  // SOW Totals
  const totalSowBudget = sowItems.reduce((acc, i) => acc + i.budgetedAmount, 0);
  const totalSowActual = sowItems.reduce((acc, i) => acc + i.actualAmount, 0);

  return (
    <div className="space-y-6" data-testid="hold-renovation-development-tasks">
      {/* Pillar Header Card */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400 font-bold uppercase rounded-none">
                Pillar 01: Renovation & Development
              </span>
              <span className="text-xs font-mono text-neutral-400">7 Core Activities</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              Property Renovation, Building Permits & Contractor Execution
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Lock in your scope of work, clear municipal permits, supervise general contractors, and manage milestone lender draws.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-right rounded-none">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Committed SOW</span>
              <span className="text-xs font-bold font-mono text-white">{formatCurrency(totalSowBudget)}</span>
            </div>
            <div className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-right rounded-none">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Incurred Actual</span>
              <span className="text-xs font-bold font-mono text-amber-400">{formatCurrency(totalSowActual)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task 1: Scope of Work (SOW) Finalization */}
      <section
        data-testid="task-card-sow-finalization"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Activity 01</span>
              <span className="text-xs font-bold text-white">Scope of Work (SOW) Finalization</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Detail specific construction plans, architectural designs, and engineering requirements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenVendor('Architect', 'Scope of Work (SOW) Finalization')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Request Architect / Engineer
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssign('sow', 'Scope of Work (SOW) Finalization')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Assign Team Member
            </button>
          </div>
        </div>

        {/* Why this matters context */}
        <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
          Vague scopes of work cause 80% of real-estate cost overruns. Having explicit line items, architectural blueprints, and engineering stamps prevents contractor disputes, mid-job change orders, and municipal red tags.
          <span className="block mt-1 font-mono text-[11px] text-amber-200">
            PaperWorking Benchmark: Group your SOW into trades with line-item budgets and contractor assignments before demolition begins.
          </span>
        </div>

        {/* SOW Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-neutral-800">
            <thead className="bg-neutral-900 text-neutral-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Trade / Category</th>
                <th className="p-2.5">Specific Description & Engineering</th>
                <th className="p-2.5">Assigned Contractor</th>
                <th className="p-2.5 text-right">Budget</th>
                <th className="p-2.5 text-right">Actual</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {sowItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-900/40 transition">
                  <td className="p-2.5 font-semibold text-white">{item.category}</td>
                  <td className="p-2.5 text-neutral-300">
                    <div>{item.description}</div>
                    {item.engineeringRequired && (
                      <span className="inline-block mt-1 border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 uppercase rounded-none">
                        Engineering Stamp Required
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-neutral-400 font-mono">{item.contractor}</td>
                  <td className="p-2.5 text-right font-mono text-white">{formatCurrency(item.budgetedAmount)}</td>
                  <td className="p-2.5 text-right font-mono text-amber-400">{formatCurrency(item.actualAmount)}</td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleSowItem(item.id)}
                      className={`min-h-[44px] px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-none transition border ${
                        item.status === 'completed'
                          ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white'
                      }`}
                    >
                      {item.status === 'completed' ? 'Completed' : 'In Progress'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Task 2: Permit and Zoning Procurement */}
      <section
        data-testid="task-card-permits-zoning"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Activity 02</span>
              <span className="text-xs font-bold text-white">Permit & Zoning Procurement</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Secure necessary municipal approvals, building permits, and environmental clearances.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenVendor('Expediter', 'Permit & Zoning Procurement')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Request Permit Expediter
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssign('permits', 'Permit & Zoning Procurement')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Assign Team Member
            </button>
          </div>
        </div>

        <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
          Working without required permits risks municipal stop-work orders, retroactive demolition mandates, and uninsurable title liabilities upon resale or refinance.
          <span className="block mt-1 font-mono text-[11px] text-amber-200">
            PaperWorking Benchmark: Ensure building, electrical, plumbing, and mechanical permits are posted on site before trade work commences.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {permits.map((p) => (
            <div
              key={p.id}
              className="border border-neutral-800 bg-neutral-900/60 p-3.5 text-xs rounded-none flex items-start justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{p.permitNumber}</span>
                  <span className="border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] uppercase font-semibold text-neutral-300 rounded-none">
                    {p.type}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">{p.jurisdiction}</p>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Applied: {p.appliedDate}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-none border ${
                  p.status === 'approved' || p.status === 'finaled'
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-amber-600 bg-amber-950/40 text-amber-400'
                }`}>
                  {p.status}
                </span>
                {p.approvedDate && (
                  <span className="block text-[10px] text-neutral-400 font-mono mt-1">
                    Approved: {p.approvedDate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Task 3: Contractor Management */}
      <section
        data-testid="task-card-contractor-management"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Activity 03</span>
              <span className="text-xs font-bold text-white">Contractor Management</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Hire, vet, and oversee general contractors, subcontractors, and project managers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenVendor('Contractor', 'Contractor Management')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Request General Contractor
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssign('contractors', 'Contractor Management')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Assign Owner's Rep
            </button>
          </div>
        </div>

        <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
          Using uninsured or unlicensed contractors creates catastrophic liability. If a worker is injured on site, unverified workers' compensation policies make the property owner personally liable.
          <span className="block mt-1 font-mono text-[11px] text-amber-200">
            PaperWorking Benchmark: Demand an active General Liability ($1M/$2M) and Workers' Compensation COI listing your property LLC as an Additional Insured.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contractors.map((c) => (
            <div
              key={c.id}
              className="border border-neutral-800 bg-neutral-900/60 p-3.5 text-xs rounded-none flex items-start justify-between gap-3"
            >
              <div>
                <h4 className="font-bold text-white">{c.name}</h4>
                <p className="text-[11px] text-amber-300 font-mono mt-0.5">Trade: {c.trade}</p>
                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">License: {c.licenseNumber}</p>
                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Phone: {c.phone}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-none border ${
                  c.hasCoiVerified
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-rose-600 bg-rose-950/40 text-rose-400'
                }`}>
                  {c.hasCoiVerified ? 'COI Verified' : 'Pending Insurance'}
                </span>
                <span className="block text-[10px] text-neutral-500 font-mono mt-1">
                  Expires: {c.insuranceExpDate}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Task 4: Rehab and Refurbishment Execution */}
      <section
        data-testid="task-card-rehab-execution"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Activity 04</span>
              <span className="text-xs font-bold text-white">Rehab & Refurbishment Execution</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Manage structural repairs, cosmetic updates, and mechanical upgrades (HVAC, plumbing, electrical).
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('rehab-exec', 'Rehab & Refurbishment Execution')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Project Manager
          </button>
        </div>

        <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
          Failing to sequence trades (structural first, mechanicals second, cosmetic finishes last) leads to re-work and drywall damage. Monitoring budget vs actual in real time prevents cash burn.
          <span className="block mt-1 font-mono text-[11px] text-amber-200">
            PaperWorking Benchmark: Benchmark committed spend against the 5 standard renovation tiers. Flag any category exceeding 10% budget variance immediately.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Structural & Framing</span>
            <div className="mt-1 flex items-baseline justify-between font-mono">
              <span className="text-white font-bold">$14,000 Budget</span>
              <span className="text-emerald-400">100% Done</span>
            </div>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Mechanicals (MEP)</span>
            <div className="mt-1 flex items-baseline justify-between font-mono">
              <span className="text-white font-bold">$22,000 Budget</span>
              <span className="text-amber-400">65% Done</span>
            </div>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Cosmetic Trim & Finishes</span>
            <div className="mt-1 flex items-baseline justify-between font-mono">
              <span className="text-white font-bold">$18,500 Budget</span>
              <span className="text-neutral-400">20% Done</span>
            </div>
          </div>
        </div>
      </section>

      {/* Task 5: Ground-Up Development Oversight */}
      <section
        data-testid="task-card-ground-up"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Activity 05</span>
              <span className="text-xs font-bold text-white">Ground-Up Development Oversight</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Monitor grading, framing, utility connections, and building construction for new development projects.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenVendor('Engineer', 'Ground-Up Development Oversight')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Request Civil Engineer
          </button>
        </div>

        <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
          Ground-up construction introduces high-risk civil milestones including soil compaction, foundation curing, and municipal tap connections. Missing these halts the entire project.
          <span className="block mt-1 font-mono text-[11px] text-amber-200">
            PaperWorking Benchmark: Municipal soil compaction tests and structural engineering foundation sign-offs are non-negotiable before framing.
          </span>
        </div>

        <div className="space-y-2">
          {groundUpMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none"
            >
              <div>
                <span className="font-semibold text-white">{m.label}</span>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  Target Date: {m.targetDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded-none border ${
                  m.engineeringSignoff
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                }`}>
                  {m.engineeringSignoff ? 'Engineered Sign-Off' : 'Pending Sign-Off'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase text-neutral-300 border border-neutral-700 bg-neutral-800 rounded-none">
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Task 6: Quality Control Inspections */}
      <section
        data-testid="task-card-quality-control"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Activity 06</span>
              <span className="text-xs font-bold text-white">Quality Control Inspections</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Perform regular site walkthroughs to ensure work matches specifications and local building codes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenVendor('Inspector', 'Quality Control Inspections')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Request Third-Party QA Inspector
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssign('quality-control', 'Quality Control Inspections')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Assign QA Lead
            </button>
          </div>
        </div>

        <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
          Subcontractors cut corners when unsupervised. Catching framing errors, pipe leaks, or ungrounded wiring before drywall goes up costs 10x less than fixing them post-inspection.
          <span className="block mt-1 font-mono text-[11px] text-amber-200">
            PaperWorking Benchmark: Schedule walkthroughs at 3 non-negotiable milestones: pre-pour foundation, pre-drywall MEP rough-in, and final punch.
          </span>
        </div>

        <div className="space-y-2">
          {inspections.map((insp) => (
            <div
              key={insp.id}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none"
            >
              <div>
                <span className="font-bold text-white">{insp.title}</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">{insp.findings}</p>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Inspector: {insp.inspector} | Date: {insp.date}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-none border ${
                  insp.status === 'passed'
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-amber-600 bg-amber-950/40 text-amber-400'
                }`}>
                  {insp.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Task 7: Draw Request Management */}
      <section
        data-testid="task-card-draw-requests"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Activity 07</span>
              <span className="text-xs font-bold text-white">Draw Request Management</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Review and approve construction milestone invoices to release funds from construction loans.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('draws', 'Draw Request Management')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Draw Administrator
          </button>
        </div>

        <div className="border-l-2 border-amber-400 bg-amber-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-amber-300 font-semibold block mb-0.5">Why this matters:</strong>
          Lenders require documented proof of completed work before disbursing rehab funds. Slow draw submissions cause cash crunches and halt trade crews.
          <span className="block mt-1 font-mono text-[11px] text-amber-200">
            PaperWorking Benchmark: Lenders typically withhold a 10% retainage until final certificate of occupancy to ensure punch list completion.
          </span>
        </div>

        {/* Existing Draws & Request Form */}
        <div className="space-y-3">
          <div className="space-y-2">
            {draws.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none font-mono"
              >
                <div>
                  <span className="font-bold text-white">Draw #{d.drawNumber}</span>
                  <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                    Requested: {formatCurrency(d.amountRequested)} | 10% Retainage: {formatCurrency(d.retainageAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold text-sm block">
                    {`${formatCurrency(d.amountApproved)} Approved`}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-sans uppercase">
                    Status: {d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddDraw} className="flex flex-col sm:flex-row items-center gap-3 border-t border-neutral-800 pt-3">
            <div className="w-full sm:w-1/3">
              <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                New Draw Amount ($)
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                value={newDrawAmount}
                onChange={(e) => setNewDrawAmount(Number(e.target.value))}
                className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
              />
            </div>
            <div className="w-full sm:w-1/2">
              <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                Lender Third-Party Inspector
              </label>
              <input
                type="text"
                value={newDrawInspector}
                onChange={(e) => setNewDrawInspector(e.target.value)}
                className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
              />
            </div>
            <div className="w-full sm:w-auto self-end">
              <button
                type="submit"
                className="w-full min-h-[44px] px-4 py-2 border border-emerald-600 bg-emerald-950/60 text-emerald-400 font-bold text-xs uppercase rounded-none hover:bg-emerald-900/60 transition"
              >
                Submit Draw
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Vendor Marketplace Modal */}
      {activeVendorTrade && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-2xl border border-neutral-800 bg-[#0c0c0c] p-6 text-neutral-100 rounded-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Licensed Vendor Assistance</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Requesting {activeVendorTrade} for: {vendorTaskTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVendorTrade(null)}
                className="min-h-[44px] min-w-[44px] text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <VendorMarketplaceSuggestions
              taskTitle={vendorTaskTitle}
              requiredTrade={activeVendorTrade}
              propertyState={propertyState}
              onAssignVendor={() => setActiveVendorTrade(null)}
            />
          </div>
        </div>
      )}

      {/* Team Member Assignment Modal */}
      {assignModalTask && (
        <AssignOrInviteModal
          isOpen={true}
          projectId={project.id}
          projectName={project.propertyName || project.address}
          task={{
            id: assignModalTask.id,
            title: assignModalTask.title,
            assignedTo: assignModalTask.currentAssignee,
            phase: 'hold',
          }}
          currentAssignee={assignModalTask.currentAssignee}
          existingMembers={activeRoster}
          userTier={userTier}
          propertyState={propertyState}
          onClose={() => setAssignModalTask(null)}
          onAssignExisting={(_taskIdOrPhaseKey, _assigneeName) => {
            setAssignModalTask(null);
          }}
          onMemberInvitedAndAssigned={(newMember: AssigneeOption) => {
            if (onUpdateProject) {
              const current = (project.teamMembers || []) as AssigneeOption[];
              onUpdateProject({ ...project, teamMembers: [...current, newMember] });
            }
            setAssignModalTask(null);
          }}
        />
      )}

      {/* Team Tier Upgrade Modal */}
      <TeamTierUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={userTier}
        targetTaskTitle={upgradeTaskTitle}
        onSwitchToVendors={() => {
          setIsUpgradeModalOpen(false);
          setActiveVendorTrade('General Contractor');
          setVendorTaskTitle(upgradeTaskTitle);
        }}
      />
    </div>
  );
}
