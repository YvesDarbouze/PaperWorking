'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ProjectSummary } from '@/lib/projects/types';
import type {
  AcquisitionPipelineStatus,
  DeadReasonCategory,
  AcquisitionTask,
} from '@paperworking/validation';

export interface AcquisitionPipelineBoardProps {
  projects: ProjectSummary[];
  onProjectUpdated?: (updatedProject: ProjectSummary) => void;
  onRefresh?: () => void;
}

const STAGES: Array<{
  id: AcquisitionPipelineStatus;
  label: string;
  order: number;
  description: string;
}> = [
  { id: 'lead', label: 'Lead', order: 1, description: 'New off-market or MLS lead' },
  { id: 'analyzing', label: 'Analyzing', order: 2, description: 'Underwriting & comps run' },
  { id: 'offer_sent', label: 'Offer Sent', order: 3, description: 'LOI or PSA submitted' },
  { id: 'negotiating', label: 'Negotiating', order: 4, description: 'Counteroffers in play' },
  { id: 'under_contract', label: 'Under Contract', order: 5, description: 'Binding PSA & escrow open' },
  { id: 'due_diligence', label: 'Due Diligence', order: 6, description: 'Inspections & loan underwriting' },
  { id: 'clear_to_close', label: 'Clear to Close', order: 7, description: 'Contingencies cleared' },
  { id: 'closed', label: 'Closed', order: 8, description: 'Acquisition finalized' },
];

const DEAD_REASONS: Array<{ value: DeadReasonCategory; label: string }> = [
  { value: 'inspection', label: 'Inspection Failure / High Rehab Estimate' },
  { value: 'appraisal_shortfall', label: 'Appraisal Shortfall' },
  { value: 'financing', label: 'Financing Denied / Terms Unviable' },
  { value: 'title', label: 'Title Defect / Cloud on Title' },
  { value: 'numbers_failed', label: 'Underwriting Numbers Failed' },
  { value: 'offer_rejected', label: 'Offer Rejected by Seller' },
];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function AcquisitionPipelineBoard({
  projects,
  onProjectUpdated,
  onRefresh,
}: AcquisitionPipelineBoardProps) {
  // Mobile Stage Selection
  const [selectedMobileStage, setSelectedMobileStage] = useState<
    AcquisitionPipelineStatus | 'dead'
  >('lead');

  // Transition & Modal States
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Under Contract Modal Form
  const [showUnderContractModal, setShowUnderContractModal] = useState(false);
  const [psaDocUrl, setPsaDocUrl] = useState('/documents/psa_executed.pdf');
  const [emdAmount, setEmdAmount] = useState(5000);

  // Dead Deal Modal Form
  const [showDeadModal, setShowDeadModal] = useState(false);
  const [deadReason, setDeadReason] = useState<DeadReasonCategory>('inspection');
  const [deadNotes, setDeadNotes] = useState('');

  // Auto-Generated Tasks Toast / Banner
  const [generatedTasksNotice, setGeneratedTasksNotice] = useState<{
    projectName: string;
    taskCount: number;
  } | null>(null);

  // Group Projects by Stage
  const groupedProjects = useMemo(() => {
    const map: Record<string, ProjectSummary[]> = {
      lead: [],
      analyzing: [],
      offer_sent: [],
      negotiating: [],
      under_contract: [],
      due_diligence: [],
      clear_to_close: [],
      closed: [],
      dead: [],
    };

    for (const p of projects) {
      if (p.isArchived || p.acquisitionStatus === 'dead' || p.deadRecord) {
        map.dead.push(p);
      } else {
        const stage = p.acquisitionStatus || 'lead';
        if (map[stage]) {
          map[stage].push(p);
        } else {
          map.lead.push(p);
        }
      }
    }

    return map;
  }, [projects]);

  // Stage Volume Summaries
  const stageMetrics = useMemo(() => {
    const res: Record<string, { count: number; volume: number }> = {};
    for (const [stageKey, list] of Object.entries(groupedProjects)) {
      res[stageKey] = {
        count: list.length,
        volume: list.reduce((sum, p) => sum + (p.purchasePrice || 0), 0),
      };
    }
    return res;
  }, [groupedProjects]);

  // Handle Stage Transition Execution
  const executeTransition = async (
    project: ProjectSummary,
    targetStatus: AcquisitionPipelineStatus,
    contextData: Record<string, unknown> = {},
  ) => {
    setTransitioning(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/acquisition-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          ...contextData,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Failed to update acquisition stage');
      }

      // Check if tasks were auto-generated on entering Under Contract
      if (
        targetStatus === 'under_contract' &&
        body.autoGeneratedTasks &&
        body.autoGeneratedTasks.length > 0
      ) {
        setGeneratedTasksNotice({
          projectName: project.propertyName,
          taskCount: body.autoGeneratedTasks.length,
        });
      }

      // Update Local State
      if (onProjectUpdated) {
        onProjectUpdated({
          ...project,
          acquisitionStatus: targetStatus,
          isArchived: targetStatus === 'dead',
          deadRecord: body.deadRecord || project.deadRecord,
          tasks: body.autoGeneratedTasks?.length
            ? [...(project.tasks || []), ...body.autoGeneratedTasks]
            : project.tasks,
        });
      }

      if (onRefresh) onRefresh();

      setShowUnderContractModal(false);
      setShowDeadModal(false);
      setActiveProject(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Stage transition error');
    } finally {
      setTransitioning(false);
    }
  };

  // Get Next Legal Stage
  const getNextStage = (
    current: AcquisitionPipelineStatus,
  ): AcquisitionPipelineStatus | null => {
    switch (current) {
      case 'lead':
        return 'analyzing';
      case 'analyzing':
        return 'offer_sent';
      case 'offer_sent':
        return 'under_contract';
      case 'negotiating':
        return 'under_contract';
      case 'under_contract':
        return 'due_diligence';
      case 'due_diligence':
        return 'clear_to_close';
      case 'clear_to_close':
        return 'closed';
      default:
        return null;
    }
  };

  const handleAdvanceClick = (project: ProjectSummary) => {
    const current = project.acquisitionStatus || 'lead';
    const next = getNextStage(current);
    if (!next) return;

    if (next === 'under_contract') {
      setActiveProject(project);
      setEmdAmount(Math.round((project.purchasePrice || 450000) * 0.01));
      setShowUnderContractModal(true);
    } else {
      executeTransition(project, next);
    }
  };

  const handleDeadClick = (project: ProjectSummary) => {
    setActiveProject(project);
    setDeadReason('inspection');
    setDeadNotes('');
    setShowDeadModal(true);
  };

  return (
    <div data-testid="acquisition-pipeline-board" className="space-y-6">
      {/* Toast Notice: Auto-Generated Tasks */}
      {generatedTasksNotice && (
        <div
          data-testid="auto-generated-tasks-banner"
          className="flex items-center justify-between rounded-2xl border border-[#00dd94]/40 bg-[#00dd94]/15 p-4 text-xs sm:text-sm text-emerald-100 shadow-xl shadow-[#00dd94]/10 transition-all animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-[#00dd94]">task_alt</span>
            <div>
              <p className="font-bold text-white">Under Contract Milestones Established!</p>
              <p className="text-white/80">
                {generatedTasksNotice.taskCount} standardized contract tasks & dynamic contingency deadlines
                were auto-generated for <strong className="text-white">{generatedTasksNotice.projectName}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGeneratedTasksNotice(null)}
            className="rounded-lg p-1 text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert Modal */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs sm:text-sm text-red-200 shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-red-400">error</span>
            <div>
              <p className="font-bold">Stage Transition Blocked (Rule Violation)</p>
              <p className="text-red-200/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-lg p-1 text-red-300 hover:text-white text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile Stage Selector Pills (Horizontal Scroll) */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {STAGES.map((s) => {
            const count = stageMetrics[s.id]?.count || 0;
            const isSelected = selectedMobileStage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedMobileStage(s.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? 'border border-[#00dd94] bg-[#00dd94]/15 text-white'
                    : 'border border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
                }`}
              >
                <span>{s.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected ? 'bg-[#00dd94] text-black' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedMobileStage('dead')}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              selectedMobileStage === 'dead'
                ? 'border border-red-500/60 bg-red-500/20 text-red-200'
                : 'border border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
            }`}
          >
            <span>Dead Deals</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-bold text-white/70">
              {stageMetrics.dead?.count || 0}
            </span>
          </button>
        </div>

        {/* Mobile Stacked Cards for Selected Stage */}
        <div className="mt-4 space-y-3">
          {(groupedProjects[selectedMobileStage] || []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-xs text-white/50">
              No deals currently in {selectedMobileStage.replace('_', ' ')}.
            </div>
          ) : (
            groupedProjects[selectedMobileStage].map((project) => (
              <DealBoardCard
                key={project.id}
                project={project}
                onAdvance={() => handleAdvanceClick(project)}
                onMarkDead={() => handleDeadClick(project)}
                transitioning={transitioning}
              />
            ))
          )}
        </div>
      </div>

      {/* Desktop 8-Column Pipeline Kanban Board */}
      <div className="hidden lg:block overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-[1720px] items-start">
          {STAGES.map((stage) => {
            const count = stageMetrics[stage.id]?.count || 0;
            const volume = stageMetrics[stage.id]?.volume || 0;
            const deals = groupedProjects[stage.id] || [];

            return (
              <div
                key={stage.id}
                className="w-72 shrink-0 rounded-2xl border border-white/10 bg-black/30 p-3.5 shadow-xl flex flex-col max-h-[820px]"
              >
                {/* Stage Column Header */}
                <div className="mb-3 border-b border-white/10 pb-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                        {stage.order}
                      </span>
                      <h3 className="font-bold text-white text-xs truncate">{stage.label}</h3>
                    </div>
                    <span className="rounded-full bg-[#00dd94]/15 px-2 py-0.5 text-[10px] font-bold text-[#00dd94]">
                      {count}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/40">
                    <span className="truncate">{stage.description}</span>
                    <span className="font-mono text-white/70 shrink-0 font-medium">
                      {formatCurrency(volume)}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[140px]">
                  {deals.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-[11px] text-white/30 text-center px-4">
                      Empty stage
                    </div>
                  ) : (
                    deals.map((project) => (
                      <DealBoardCard
                        key={project.id}
                        project={project}
                        onAdvance={() => handleAdvanceClick(project)}
                        onMarkDead={() => handleDeadClick(project)}
                        transitioning={transitioning}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Archived / Dead Stage Column */}
          <div className="w-72 shrink-0 rounded-2xl border border-red-500/20 bg-red-950/10 p-3.5 shadow-xl flex flex-col max-h-[820px]">
            <div className="mb-3 border-b border-white/10 pb-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-300">
                    ✕
                  </span>
                  <h3 className="font-bold text-red-200 text-xs">Dead / Archived</h3>
                </div>
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  {stageMetrics.dead?.count || 0}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-red-200/50">Terminal audit records</p>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[140px]">
              {(groupedProjects.dead || []).length === 0 ? (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-red-500/20 bg-white/[0.01] text-[11px] text-white/30 text-center px-4">
                  No dead deals
                </div>
              ) : (
                (groupedProjects.dead || []).map((project) => (
                  <DealBoardCard
                    key={project.id}
                    project={project}
                    isArchived
                    onAdvance={() => {}}
                    onMarkDead={() => {}}
                    transitioning={transitioning}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Advance to Under Contract */}
      {showUnderContractModal && activeProject && (
        <div data-testid="psa-details-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141416] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Advance to Under Contract</h3>
              <button
                type="button"
                onClick={() => setShowUnderContractModal(false)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Moving <strong className="text-white">{activeProject.propertyName}</strong> to{' '}
              <strong>Under Contract</strong> establishes your binding PSA and auto-generates the 11
              standardized contract milestone tasks and dynamic contingency alerts.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1 font-semibold">Executed PSA Document URL / File Ref</label>
                <input
                  type="text"
                  value={psaDocUrl}
                  onChange={(e) => setPsaDocUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00dd94] focus:outline-none font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-white/50 mb-1 font-semibold">Earnest Money Deposit (EMD) Amount</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={emdAmount}
                  onChange={(e) => setEmdAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00dd94] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowUnderContractModal(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transitioning || !psaDocUrl.trim()}
                onClick={() =>
                  executeTransition(activeProject, 'under_contract', {
                    psaDocumentUrl: psaDocUrl.trim(),
                    psaExecutionDate: new Date().toISOString(),
                    emdAmount,
                    closingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
                    contingencyDeadlines: {
                      inspectionDays: 10,
                      financingDays: 21,
                      appraisalDays: 14,
                    },
                  })
                }
                className="rounded-xl bg-[#00dd94] px-5 py-2 text-xs font-bold text-[#0a0a0f] hover:brightness-110 shadow-lg shadow-[#00dd94]/20 transition disabled:opacity-40"
              >
                {transitioning ? 'Executing…' : 'Confirm & Generate Milestones'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mark Deal as Dead */}
      {showDeadModal && activeProject && (
        <div data-testid="dead-deal-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#141416] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-red-300">Archive Deal (Mark Dead)</h3>
              <button
                type="button"
                onClick={() => setShowDeadModal(false)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Recording a dead deal for <strong className="text-white">{activeProject.propertyName}</strong> requires
              an institutional reason category and minimum 3-character audit notes.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1 font-semibold">Reason Category</label>
                <select
                  value={deadReason}
                  onChange={(e) => setDeadReason(e.target.value as DeadReasonCategory)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-red-400 focus:outline-none"
                >
                  {DEAD_REASONS.map((r) => (
                    <option key={r.value} value={r.value} className="bg-[#141416]">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/50 mb-1 font-semibold">Audit Notes (Min 3 characters)</label>
                <textarea
                  rows={3}
                  value={deadNotes}
                  onChange={(e) => setDeadNotes(e.target.value)}
                  placeholder="e.g. Unrepaired foundation repair quote exceeded $40k budget."
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-red-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDeadModal(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transitioning || deadNotes.trim().length < 3}
                onClick={() =>
                  executeTransition(activeProject, 'dead', {
                    deadReason,
                    deadReasonCategory: deadReason,
                    deadReasonNotes: deadNotes.trim(),
                  })
                }
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-40"
              >
                {transitioning ? 'Archiving…' : 'Archive Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Deal card rendered inside pipeline stage columns
 */
function DealBoardCard({
  project,
  isArchived = false,
  onAdvance,
  onMarkDead,
  transitioning,
}: {
  project: ProjectSummary;
  isArchived?: boolean;
  onAdvance: () => void;
  onMarkDead: () => void;
  transitioning: boolean;
}) {
  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((t) => t.status === 'complete').length;

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all shadow-sm ${
        isArchived
          ? 'border-red-500/20 bg-red-950/10 opacity-70'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/project/${project.id}`}
          className="font-bold text-white text-xs hover:text-[#00dd94] truncate no-underline"
        >
          {project.propertyName}
        </Link>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-white/70 shrink-0">
          {project.dispositionType}
        </span>
      </div>

      <p className="mt-0.5 text-[11px] text-white/45 truncate">
        {project.address || project.city || 'Austin, TX'}
      </p>

      {/* Financials Strip */}
      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-[11px]">
        <div>
          <span className="block text-[9.5px] text-white/40 uppercase font-mono">Price</span>
          <span className="font-bold text-white">{formatCurrency(project.purchasePrice)}</span>
        </div>
        {project.estimatedExitValue ? (
          <div className="text-right">
            <span className="block text-[9.5px] text-white/40 uppercase font-mono">Target Exit</span>
            <span className="font-semibold text-white/80">{formatCurrency(project.estimatedExitValue)}</span>
          </div>
        ) : null}
      </div>

      {/* Task Milestones Progress */}
      {tasks.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-black/40 px-2 py-1 text-[10.5px]">
          <span className="text-white/60">Milestones:</span>
          <span className="font-mono font-semibold text-[#00dd94]">
            {completedTasks}/{tasks.length} Done
          </span>
        </div>
      )}

      {/* Card Actions */}
      {!isArchived && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
          <button
            type="button"
            data-testid={`mark-dead-btn-${project.id}`}
            onClick={onMarkDead}
            className="text-[10px] text-red-400/80 hover:text-red-300 font-medium transition"
          >
            Mark Dead
          </button>
          <button
            type="button"
            data-testid={`advance-stage-btn-${project.id}`}
            disabled={transitioning}
            onClick={onAdvance}
            className="flex items-center gap-1 rounded-lg bg-[#00dd94]/20 border border-[#00dd94]/30 px-2.5 py-1 text-[10.5px] font-bold text-[#00dd94] hover:bg-[#00dd94]/30 transition disabled:opacity-40"
          >
            <span>Advance</span>
            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}
