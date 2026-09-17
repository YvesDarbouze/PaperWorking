'use client';

import React, { useState, useMemo } from 'react';
import {
  formatCurrency,
} from '@/lib/projects/phase-utils';
import type { ProjectWorkspace } from '@/lib/projects/types';
import {
  reconcileAcquisitionUnderwriting,
  type ReconciledUnderwritingMetrics,
} from '@paperworking/financial-engine';
import type {
  AcquisitionPipelineStatus,
  DeadReasonCategory,
  AcquisitionTask,
} from '@paperworking/validation';
import { SupersededSnapshotBadge } from '@/components/calculator/SupersededSnapshotBadge';

const PIPELINE_STEPS: Array<{
  status: AcquisitionPipelineStatus;
  label: string;
  order: number;
}> = [
  { status: 'lead', label: '1. Lead', order: 1 },
  { status: 'analyzing', label: '2. Analyzing', order: 2 },
  { status: 'offer_sent', label: '3. Offer Sent', order: 3 },
  { status: 'negotiating', label: '4. Negotiating', order: 4 },
  { status: 'under_contract', label: '5. Under Contract', order: 5 },
  { status: 'due_diligence', label: '6. Due Diligence', order: 6 },
  { status: 'clear_to_close', label: '7. Clear to Close', order: 7 },
  { status: 'closed', label: '8. Closed', order: 8 },
];

const DEAD_REASONS: Array<{ value: DeadReasonCategory; label: string }> = [
  { value: 'inspection', label: 'Inspection Failure / Structural Defects' },
  { value: 'appraisal_shortfall', label: 'Appraisal Shortfall' },
  { value: 'financing', label: 'Financing Denied / Unacceptable Terms' },
  { value: 'title', label: 'Title Defect / Cloud on Title' },
  { value: 'numbers_failed', label: 'Numbers Failed / Underwriting Unviable' },
  { value: 'offer_rejected', label: 'Offer Rejected / Seller Cancelled' },
];

interface AcquisitionWorkspaceViewProps {
  project: ProjectWorkspace;
  onUpdateProject: (updated: ProjectWorkspace) => void;
}

export default function AcquisitionWorkspaceView({
  project,
  onUpdateProject,
}: AcquisitionWorkspaceViewProps) {
  const currentStatus: AcquisitionPipelineStatus = project.acquisitionStatus ?? 'lead';
  const isDead = currentStatus === 'dead' || !!project.deadRecord;

  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeadModal, setShowDeadModal] = useState(false);
  const [deadReason, setDeadReason] = useState<DeadReasonCategory>('inspection');
  const [deadNotes, setDeadNotes] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showUnderContractPrompt, setShowUnderContractPrompt] = useState(false);
  const [contractPsaUrl, setContractPsaUrl] = useState('/documents/psa_executed.pdf');
  const [contractEmdAmount, setContractEmdAmount] = useState<number>(
    Math.round((project.purchasePrice || 450000) * 0.01),
  );
  const [acknowledgedCritical, setAcknowledgedCritical] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  // Counteroffer & Closing modal states
  const [showCounterofferModal, setShowCounterofferModal] = useState(false);
  const [counterPrice, setCounterPrice] = useState(
    Math.round((project.purchasePrice || 450000) * 1.05),
  );
  const [counterEmd, setCounterEmd] = useState(10000);
  const [counterInspectionDays, setCounterInspectionDays] = useState(7);
  const [counterNotes, setCounterNotes] = useState(
    'Seller counteroffered at $485,000 with 7-day inspection period.',
  );

  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingDateInput, setClosingDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [actualCashToCloseInput, setActualCashToCloseInput] = useState<number>(
    Math.round((project.purchasePrice || 450000) * 0.27),
  );

  // Fetch live progressive alerts from /api/projects/[id]/alerts
  React.useEffect(() => {
    let cancelled = false;
    async function fetchAlerts() {
      try {
        const res = await fetch(`/api/projects/${project.id}/alerts`);
        if (res.ok) {
          const json = await res.json();
          if (json.alerts && !cancelled) {
            setLiveAlerts(json.alerts);
          }
        }
      } catch {
        // Local calculation serves as fallback
      }
    }
    fetchAlerts();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const handleAssignTask = async (taskId: string, assignee: string) => {
    const currentTasks = project.tasks || [];
    const updatedTasks = currentTasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          assignedTo: assignee,
        };
      }
      return t;
    });

    onUpdateProject({
      ...project,
      tasks: updatedTasks,
    });

    try {
      await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: assignee }),
      });
    } catch {
      // Non-fatal
    }
  };

  // Financial calculations via canonical @paperworking/financial-engine
  const metrics: ReconciledUnderwritingMetrics | null = useMemo(() => {
    const arv = project.underwritingSnapshot?.inputs.estimatedARV;
    if (!arv || arv <= 0) return null;
    try {
      return reconcileAcquisitionUnderwriting({
        purchasePrice: project.purchasePrice || 0,
        rehabBudget: project.rehab_costs || 0,
        estimatedARV: arv,
        grossRentMonthly: project.underwritingSnapshot?.inputs.grossMonthlyRent ?? 3800,
        targetLtvPct: project.underwritingSnapshot?.inputs.targetLtvPct ?? 75,
        interestRatePct: project.underwritingSnapshot?.inputs.interestRatePct ?? 6.5,
        vacancyRatePct: project.underwritingSnapshot?.inputs.vacancyRatePct ?? 6.0,
        operatingExpenseRatioPct: project.underwritingSnapshot?.inputs.operatingExpenseRatioPct ?? 35.0,
        terminalValueMethod: (project.underwritingSnapshot?.inputs as any)?.terminalValueMethod ?? 'appreciation_pct',
        allowDefaultTerminalMethod: true,
      });
    } catch {
      return null;
    }
  }, [project]);

  // Hard dates calculations (contingencies & contractual dates)
  const hardDateAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      name: string;
      hoursLeft: number;
      dateFormatted: string;
      severity: 'critical' | 'urgent' | 'notice';
    }> = [];

    const now = Date.now();
    const contingencies = project.contingencies || [];

    for (const c of contingencies) {
      if (c.status !== 'open' && c.status !== 'pending' && c.status !== 'in_progress') continue;
      const deadlineMs = new Date(c.deadline).getTime();
      const hoursLeft = Math.round((deadlineMs - now) / 3600000);
      if (hoursLeft <= 72 && hoursLeft > 0) {
        alerts.push({
          id: c.id,
          name: c.label || `${c.type} contingency`,
          hoursLeft,
          dateFormatted: new Date(c.deadline).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
          severity: hoursLeft <= 24 ? 'critical' : hoursLeft <= 48 ? 'urgent' : 'notice',
        });
      }
    }

    return alerts.sort((a, b) => a.hoursLeft - b.hoursLeft);
  }, [project.contingencies]);

  const criticalAlert = useMemo(() => {
    return hardDateAlerts.find((a) => a.severity === 'critical') || null;
  }, [hardDateAlerts]);

  // Next logical state based on FSM
  const nextStatusTarget = useMemo((): { status: AcquisitionPipelineStatus; label: string } | null => {
    switch (currentStatus) {
      case 'lead':
        return { status: 'analyzing', label: 'Advance to Analyzing' };
      case 'analyzing':
        return { status: 'offer_sent', label: 'Submit Offer (Offer Sent)' };
      case 'offer_sent':
        return { status: 'negotiating', label: 'Receive Seller Counteroffer (v2)' };
      case 'negotiating':
        return { status: 'under_contract', label: 'Accept Terms & Move to Under Contract' };
      case 'under_contract':
        return { status: 'due_diligence', label: 'Start Due Diligence' };
      case 'due_diligence':
        return { status: 'clear_to_close', label: 'Mark Clear to Close' };
      case 'clear_to_close':
        return { status: 'closed', label: 'Complete Acquisition (Closed)' };
      default:
        return null;
    }
  }, [currentStatus]);

  // Handle pipeline status update
  const handleTransition = async (
    targetStatus: AcquisitionPipelineStatus,
    extraContext?: Record<string, unknown>,
  ) => {
    setTransitioning(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/acquisition-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          ...extraContext,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update acquisition status');
      }

      if (data.project) {
        onUpdateProject(data.project);
      } else {
        onUpdateProject({
          ...project,
          acquisitionStatus: targetStatus,
          tasks: data.autoGeneratedTasks?.length
            ? [...(project.tasks || []), ...data.autoGeneratedTasks]
            : project.tasks,
          deadRecord: data.deadRecord || project.deadRecord,
        });
      }
      setShowDeadModal(false);
      setShowUnderContractPrompt(false);
      setShowClosingModal(false);
      setShowCounterofferModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  // Update Contingency Status
  const handleContingencyStatusChange = async (
    contingencyId: string,
    status: 'pending' | 'open' | 'in_progress' | 'satisfied' | 'waived' | 'terminated' | 'failed',
  ) => {
    const contingencies = project.contingencies || [];
    const updated = contingencies.map((c) => (c.id === contingencyId ? { ...c, status } : c));
    onUpdateProject({
      ...project,
      contingencies: updated,
    });

    try {
      await fetch(`/api/projects/${project.id}/contingencies`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contingencyId, status }),
      });
    } catch {
      // Optimistic fallback
    }
  };

  // Submit counteroffer (Offer v2)
  const handleSubmitCounteroffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransitioning(true);
    try {
      await fetch(`/api/projects/${project.id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerPrice: counterPrice,
          earnestMoneyAmount: counterEmd,
          inspectionDays: counterInspectionDays,
          offeringParty: 'seller',
          version: 2,
          notes: counterNotes,
        }),
      });
      await handleTransition('negotiating', { note: 'Seller submitted counteroffer v2' });
      setShowCounterofferModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record counteroffer');
    } finally {
      setTransitioning(false);
    }
  };

  // Confirm closing (Closed)
  const handleConfirmClosing = async () => {
    await handleTransition('closed', {
      closingDate: new Date(closingDateInput).toISOString(),
      actualCashToClose: Number(actualCashToCloseInput),
      closingDocuments: [
        {
          id: `doc-alta-${Date.now()}`,
          type: 'Closing Statement',
          name: 'ALTA_Settlement_Statement_Executed.pdf',
          documentUrl: '/documents/ALTA_Settlement_Statement_Executed.pdf',
          uploadedAt: new Date().toISOString(),
        },
      ],
    });
    setShowClosingModal(false);
  };

  // Toggle task completion
  const handleToggleTask = async (taskId: string) => {
    const currentTasks = project.tasks || [];
    const updatedTasks = currentTasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: t.status === 'complete' ? ('pending' as const) : ('complete' as const),
        };
      }
      return t;
    });

    onUpdateProject({
      ...project,
      tasks: updatedTasks,
    });

    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
    } catch (err) {
      console.error('Failed to sync task status:', err);
    }
  };

  // Add custom task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: AcquisitionTask = {
      id: `task-${Date.now()}`,
      projectId: project.id,
      title: newTaskTitle.trim(),
      status: 'pending',
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      isAutoGenerated: false,
      sortOrder: (project.tasks?.length || 0) + 1,
    };

    const updatedTasks = [...(project.tasks || []), newTask];
    onUpdateProject({
      ...project,
      tasks: updatedTasks,
    });
    setNewTaskTitle('');

    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
    } catch (err) {
      console.error('Failed to sync new task:', err);
    }
  };

  const completedTasksCount = (project.tasks || []).filter((t) => t.status === 'complete').length;
  const totalTasksCount = project.tasks?.length || 0;

  return (
    <div className="space-y-6">
      {/* SendGrid Email Notification Alert Setting (Rule 5 honest state) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-white/40">forward_to_inbox</span>
          <div>
            <span className="font-semibold text-white">Contingency Hard Date Automated Email Dispatch</span>
            <p className="text-[11px] text-white/50">Dispatches automated email warnings to assigned team members at 72h, 48h, and 24h before dates go hard.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300">
            REQUIRES CREDENTIALS: Email Provider (SendGrid) Unconfigured
          </span>
          <button
            type="button"
            disabled
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/40 cursor-not-allowed"
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Property Data Adapter Banner (Rule 5 honest state) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400/80 animate-pulse" />
          <span className="font-mono font-medium text-white/80">
            [Property Data API: Not Configured — Manual Entry Enabled]
          </span>
        </div>
        <span className="text-amber-400/80 font-mono text-[11px]" data-testid="acquisition-comps-credentials">
          no comp data — REQUIRES CREDENTIALS
        </span>
      </div>

      {/* Hard Date Alerts Banners (progressive warning contract) */}
      {hardDateAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start sm:items-center justify-between gap-3 rounded-xl border p-4 text-xs font-medium transition-all ${
            alert.severity === 'critical'
              ? 'border-red-500/40 bg-red-950/30 text-red-200 shadow-lg shadow-red-950/40'
              : alert.severity === 'urgent'
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
              : 'border-yellow-500/30 bg-yellow-950/20 text-yellow-200'
          }`}
          data-testid={`hard-date-alert-${alert.severity}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">
              {alert.severity === 'critical' ? '🚨' : alert.severity === 'urgent' ? '⚠️' : '🔔'}
            </span>
            <div>
              <p className="font-semibold text-sm">
                {alert.severity === 'critical'
                  ? 'CRITICAL CONTINGENCY EXPIRATION — DATE GOES HARD'
                  : alert.severity === 'urgent'
                  ? 'URGENT CONTINGENCY DEADLINE'
                  : 'UPCOMING CONTRACT DEADLINE'}
              </p>
              <p className="text-white/80 mt-0.5">
                <strong className="text-white">{alert.name}</strong> expires in{' '}
                <span className="underline font-semibold">{alert.hoursLeft} hours</span> ({alert.dateFormatted}).
                Contractual rights or earnest deposit may go hard.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white">
            {alert.hoursLeft}h left
          </span>
        </div>
      ))}

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Dead / Archived Banner if state is dead */}
      {isDead && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-5 text-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🛑</span>
              <h3 className="text-base font-semibold text-white">Project Archived (Dead Deal)</h3>
            </div>
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
              Terminal State: Dead
            </span>
          </div>
          <div className="mt-3 space-y-1 text-xs text-red-200/90">
            <p>
              <strong>Reason:</strong>{' '}
              {DEAD_REASONS.find((r) => r.value === project.deadRecord?.deadReasonCategory)?.label ||
                project.deadRecord?.deadReasonCategory ||
                'Archived'}
            </p>
            {project.deadRecord?.deadReasonNotes && (
              <p>
                <strong>Notes:</strong> {project.deadRecord.deadReasonNotes}
              </p>
            )}
            {project.deadRecord?.archivedAt && (
              <p className="text-white/50 text-[11px]">
                Archived at: {new Date(project.deadRecord.archivedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pipeline Stepper Card */}
      <section className="rounded-2xl border border-white/10 bg-black/25 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#00DD94]">
                REIL Phase 01: Acquisition
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80 uppercase">
                Status: {currentStatus.replaceAll('_', ' ')}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">Acquisition Pipeline</h2>
          </div>

          {/* Stepper Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isDead && nextStatusTarget && (
              <button
                type="button"
                disabled={transitioning}
                onClick={() => {
                  if (nextStatusTarget.status === 'under_contract') {
                    setShowUnderContractPrompt(true);
                  } else if (nextStatusTarget.status === 'negotiating') {
                    setShowCounterofferModal(true);
                  } else if (nextStatusTarget.status === 'closed') {
                    setShowClosingModal(true);
                  } else {
                    handleTransition(nextStatusTarget.status);
                  }
                }}
                className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#00DD94] px-4 py-2 text-xs font-bold text-black hover:bg-[#00DD94]/90 transition active:scale-95 disabled:opacity-50 touch-press"
                data-testid="advance-pipeline-button"
              >
                {transitioning ? 'Advancing…' : `${nextStatusTarget.label} →`}
              </button>
            )}

            {!isDead && currentStatus === 'offer_sent' && (
              <button
                type="button"
                onClick={() => setShowCounterofferModal(true)}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-[#00DD94]/40 bg-[#00DD94]/10 px-3.5 py-2 text-xs font-semibold text-[#00DD94] hover:bg-[#00DD94]/20 transition active:scale-95 touch-press"
                data-testid="log-counteroffer-btn"
              >
                Log Seller Counteroffer (v2)
              </button>
            )}

            {currentStatus === 'closed' && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/project/${project.id}?phase=purchase`;
                }}
                className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-bold text-white hover:bg-[#3B82F6]/90 transition active:scale-95 touch-press"
                data-testid="go-to-fund-phase-btn"
              >
                Open Fund Phase Workspace →
              </button>
            )}

            {!isDead && (
              <button
                type="button"
                onClick={() => setShowDeadModal(true)}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition active:scale-95 touch-press"
                data-testid="mark-dead-button"
              >
                Mark as Dead Deal
              </button>
            )}
          </div>
        </div>

        {/* 8-Stage Pipeline Stepper */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {PIPELINE_STEPS.map((step) => {
            const currentOrder = PIPELINE_STEPS.find((s) => s.status === currentStatus)?.order || 1;
            const isCompleted = !isDead && step.order < currentOrder;
            const isCurrent = !isDead && step.status === currentStatus;

            return (
              <div
                key={step.status}
                className={`relative flex flex-col justify-between rounded-xl border p-3 text-center transition-all ${
                  isCurrent
                    ? 'border-[#00DD94] bg-[#00DD94]/10 shadow-sm shadow-[#00DD94]/20'
                    : isCompleted
                    ? 'border-white/20 bg-white/[0.04]'
                    : 'border-white/5 bg-black/20 opacity-50'
                }`}
              >
                <div className="flex items-center justify-center mb-1.5">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-[#00DD94] text-black'
                        : isCompleted
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {isCompleted ? '✓' : step.order}
                  </span>
                </div>
                <p
                  className={`text-xs font-semibold truncate ${
                    isCurrent ? 'text-[#00DD94]' : isCompleted ? 'text-white' : 'text-white/45'
                  }`}
                >
                  {step.label.replace(/^\d+\.\s*/, '')}
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  {isCurrent ? 'Current' : isCompleted ? 'Passed' : 'Queued'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Grid: Financial Engine Metrics & Under Contract Task Checklist */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Col: Underwriting & Financial Engine Metrics */}
        <div className="space-y-6 lg:col-span-6">
          <section className="rounded-2xl border border-white/10 bg-black/25 p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Underwriting & Financial Metrics</h3>
                <p className="text-xs text-white/50">Computed via canonical @paperworking/financial-engine</p>
              </div>
              <div className="flex items-center gap-2">
                {project.underwritingSnapshot ? (
                  <>
                    {project.underwritingSnapshot.superseded ? (
                      <SupersededSnapshotBadge />
                    ) : (
                      <span className="rounded-full border border-[#00DD94]/30 bg-[#00DD94]/10 px-2.5 py-1 text-[10px] font-semibold text-[#00DD94]">
                        Locked from Deal Calculator
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSnapshotModal(true)}
                      data-testid="underwritten-on-badge"
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/10 hover:text-white transition active:scale-95"
                      title="View underwriting snapshot lineage"
                    >
                      <span>
                        Underwritten on{' '}
                        {new Date(project.underwritingSnapshot.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-[#00DD94]">↗</span>
                    </button>
                  </>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/60">
                    Manual Underwriting
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Target Purchase Price</p>
                <p className="mt-1 text-lg font-bold text-white">{formatCurrency(project.purchasePrice)}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Rehab Budget</p>
                <p className="mt-1 text-lg font-bold text-white">{formatCurrency(project.rehab_costs)}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Estimated ARV</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {project.underwritingSnapshot?.inputs.estimatedARV
                    ? formatCurrency(project.underwritingSnapshot.inputs.estimatedARV)
                    : '—'}
                </p>
                {!project.underwritingSnapshot?.inputs.estimatedARV && (
                  <p className="text-[10px] text-amber-400">ARV not provided — enter ARV to compute equity/MAO.</p>
                )}
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">MAO (70% Rule)</p>
                <p className="mt-1 text-lg font-bold text-[#00DD94]">
                  {metrics ? formatCurrency(metrics.maximumAllowableOffer70Pct) : '—'}
                </p>
                <p className="text-[10px] text-white/40">
                  {metrics ? '(ARV × 0.70) - Rehab - Closing' : 'ARV not provided — enter ARV to compute equity/MAO.'}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Cap Rate on Cost</p>
                <p className="mt-1 text-lg font-bold text-white">{metrics ? `${metrics.capRateOnCost.toFixed(2)}%` : '—'}</p>
                <p className="text-[10px] text-white/40">NOI / Total Cost Basis</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Cash-on-Cash Return</p>
                <p className="mt-1 text-lg font-bold text-white">{metrics ? `${metrics.cashOnCashReturnPct.toFixed(2)}%` : '—'}</p>
                <p className="text-[10px] text-white/40">Net Cash Flow / Cash Required</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Monthly Debt Service</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {metrics ? `$${Math.round(metrics.monthlyDebtService).toLocaleString()}/mo` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Projected IRR</p>
                <p className="mt-1 text-lg font-bold text-[#00DD94]">
                  {metrics && metrics.projectedIrrPct !== null && metrics.projectedIrrPct !== undefined
                    ? `${metrics.projectedIrrPct.toFixed(1)}%`
                    : metrics?.irrStatus === 'multiple_roots'
                      ? 'Multiple Roots'
                      : metrics?.irrStatus === 'no_sign_change'
                        ? 'No Sign Change'
                        : metrics ? '—' : '—'}
                </p>
                {metrics?.terminalValueLabel && (
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{metrics.terminalValueLabel}</p>
                )}
              </div>
            </div>

            {metrics?.isNegativeLeverage && (
              <div
                data-testid="acquisition-negative-leverage-badge"
                className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-amber-300 uppercase">
                    Negative Leverage
                  </span>
                  <span className="font-semibold text-white">
                    Loan Constant ({metrics.loanConstantPct.toFixed(2)}%) &gt; Yield on Cost ({metrics.yieldOnCostPct.toFixed(1)}%)
                  </span>
                </div>
                <span className="text-[11px] text-amber-300/80">
                  Debt costs exceed asset yield
                </span>
              </div>
            )}

            {project.underwritingSnapshot && !project.underwritingSnapshot.superseded ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-xs text-white/70">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">Snapshot Lineage Details</p>
                  <button
                    type="button"
                    onClick={() => setShowSnapshotModal(true)}
                    data-testid="view-snapshot-lineage-btn"
                    className="text-[11px] font-medium text-[#00DD94] hover:underline"
                  >
                    View Snapshot &rarr;
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-white/50">
                  Snapshot ID: <span className="font-mono">{project.underwritingSnapshot.snapshotId}</span> · Engine v{project.underwritingSnapshot.engineVersion ?? (metrics?.engineVersion ?? 3)}
                </p>
                {project.underwritingSnapshot.assumptions?.notes && (
                  <p className="mt-1.5 italic text-white/60">
                    &ldquo;{project.underwritingSnapshot.assumptions.notes}&rdquo;
                  </p>
                )}
              </div>
            ) : project.underwritingSnapshot?.superseded ? (
              <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3.5 text-xs text-amber-200/80">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-amber-300">Historical Underwriting Archive</p>
                  <button
                    type="button"
                    onClick={() => setShowSnapshotModal(true)}
                    data-testid="view-superseded-snapshot-btn"
                    className="text-[11px] font-medium text-amber-400 hover:underline"
                  >
                    Inspect Archive &rarr;
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <SupersededSnapshotBadge />
                  <span className="text-[10px] text-amber-400/70">Excluded from active lineage</span>
                </div>
              </div>
            ) : null}
          </section>

          {/* Strategy Template Card */}
          <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">
              Strategy & Sourcing Specs
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-white/45">Strategy Template</dt>
                <dd className="font-medium text-white mt-0.5">{project.exit_strategy || 'Fix & Flip'}</dd>
              </div>
              <div>
                <dt className="text-white/45">Disposition</dt>
                <dd className="font-medium text-white mt-0.5">{project.dispositionType}</dd>
              </div>
              <div>
                <dt className="text-white/45">Holding Entity</dt>
                <dd className="font-medium text-white mt-0.5">{project.entity_type || 'LLC'}</dd>
              </div>
              <div>
                <dt className="text-white/45">Vacancy Floor</dt>
                <dd className="font-medium text-white mt-0.5">6.0% (Institutional Standard)</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Right Col: Automated Milestone Tasks & Under Contract Flow */}
        <div className="space-y-6 lg:col-span-6">
          {/* Contingency Deadlines Card */}
          {project.contingencies && project.contingencies.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-black/25 p-5 md:p-6" data-testid="contingencies-card">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Contingency Deadlines</h3>
                  <p className="text-xs text-white/50">
                    Must be satisfied or waived prior to marking Clear to Close
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#00DD94]">
                  {project.contingencies.filter((c) => c.status === 'satisfied' || c.status === 'waived').length} /{' '}
                  {project.contingencies.length} Cleared
                </span>
              </div>

              <div className="space-y-2.5">
                {project.contingencies.map((c) => {
                  const isCleared = c.status === 'satisfied' || c.status === 'waived';
                  return (
                    <div
                      key={c.id}
                      data-testid={`contingency-item-${c.id}`}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-xs transition-all ${
                        isCleared
                          ? 'border-white/5 bg-white/[0.01] opacity-70'
                          : 'border-white/10 bg-black/30'
                      }`}
                    >
                      <div>
                        <p className={`font-semibold ${isCleared ? 'text-white/60' : 'text-white'}`}>
                          {c.label || `${c.type} Contingency`}
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          Deadline: {new Date(c.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            c.status === 'satisfied'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : c.status === 'waived'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {c.status}
                        </span>
                        {!isCleared && (
                          <button
                            type="button"
                            onClick={() => handleContingencyStatusChange(c.id, 'satisfied')}
                            data-testid={`satisfy-contingency-${c.id}`}
                            className="rounded-lg bg-[#00DD94] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#00DD94]/90 transition active:scale-95"
                          >
                            Satisfy
                          </button>
                        )}
                        {!isCleared && (
                          <button
                            type="button"
                            onClick={() => handleContingencyStatusChange(c.id, 'waived')}
                            data-testid={`waive-contingency-${c.id}`}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 transition active:scale-95"
                          >
                            Waive
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-black/25 p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Acquisition Tasks & Milestones</h3>
                <p className="text-xs text-white/50">
                  {totalTasksCount > 0
                    ? `${completedTasksCount} of ${totalTasksCount} tasks completed`
                    : '11 standardized tasks auto-generated upon entering Under Contract'}
                </p>
              </div>
              {totalTasksCount > 0 && (
                <span className="text-xs font-mono font-semibold text-[#00DD94]">
                  {Math.round((completedTasksCount / totalTasksCount) * 100)}% Done
                </span>
              )}
            </div>

            {/* Task list or empty state */}
            {totalTasksCount === 0 ? (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-xs text-white/50 space-y-2">
                <p className="font-medium text-white/70">No tasks active in this stage</p>
                <p>
                  When moving to <strong>Under Contract</strong>, 11 standardized contract tasks with dynamic contingency
                  deadlines will be automatically generated.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUnderContractPrompt(true)}
                  className="mt-2 inline-flex min-h-[36px] items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition active:scale-95 touch-press"
                >
                  Advance to Under Contract →
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {project.tasks?.map((task) => {
                  const isDone = task.status === 'complete';
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs cursor-pointer transition-all ${
                        isDone
                          ? 'border-white/5 bg-white/[0.01] opacity-60'
                          : 'border-white/10 bg-black/30 hover:border-white/20'
                      }`}
                      data-testid={`task-item-${task.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-[#00DD94] focus:ring-0 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${isDone ? 'line-through text-white/50' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                          {task.isAutoGenerated && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 font-medium text-white/70">
                              Contract Milestone
                            </span>
                          )}
                          {task.dueDate && (
                            <span>
                              Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          <span>· {task.status}</span>
                          <div
                            className="flex items-center gap-1 ml-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-white/40">Assign:</span>
                            <select
                              value={(task as any).assignedTo || ''}
                              onChange={(e) => handleAssignTask(task.id, e.target.value)}
                              className="rounded border border-white/15 bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 focus:border-[#00DD94] focus:outline-none"
                            >
                              <option value="">Unassigned</option>
                              {(project.teamMembers && project.teamMembers.length > 0
                                ? project.teamMembers
                                : [{ id: 'lead', name: 'Lead Underwriter' }]
                              ).map((m: any) => (
                                <option key={m.id || m.name} value={m.name}>
                                  {m.name} ({m.role || 'Team'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Custom Task Form */}
            <form onSubmit={handleAddTask} className="mt-5 flex gap-2 border-t border-white/10 pt-4">
              <input
                type="text"
                placeholder="Add custom acquisition task…"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-[#00DD94] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="min-h-[38px] rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-40 transition active:scale-95 touch-press"
              >
                + Add
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* Under Contract Transition Modal */}
      {showUnderContractPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div data-testid="under-contract-modal" className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141416] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold">Advance to Under Contract</h3>
              <button
                type="button"
                onClick={() => setShowUnderContractPrompt(false)}
                className="text-white/50 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/70">
              Entering <strong>Under Contract</strong> establishes your binding Purchase & Sale Agreement and automatically
              generates the 11 standardized contract milestones with dynamic contingency deadlines.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Executed PSA Document URL / Reference</label>
                <input
                  type="text"
                  value={contractPsaUrl}
                  onChange={(e) => setContractPsaUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-white/50 mb-1">Earnest Money Deposit (EMD Amount)</label>
                <input
                  type="number"
                  data-testid="contract-emd-input"
                  value={contractEmdAmount}
                  onChange={(e) => setContractEmdAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowUnderContractPrompt(false)}
                className="min-h-[40px] rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transitioning}
                onClick={() => {
                  handleTransition('under_contract', {
                    psaDocumentUrl: contractPsaUrl,
                    psaExecutionDate: new Date().toISOString(),
                    executedPsaUrl: contractPsaUrl,
                    executionDate: new Date().toISOString(),
                    emdAmount: contractEmdAmount,
                    closingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
                    contingencyDeadlines: {
                      inspectionDays: 10,
                      financingDays: 21,
                      appraisalDays: 14,
                    },
                  });
                }}
                className="min-h-[40px] rounded-xl bg-[#00DD94] px-4 py-2 text-xs font-bold text-black hover:bg-[#00DD94]/90 transition active:scale-95 disabled:opacity-50 touch-press"
                data-testid="confirm-under-contract-btn"
              >
                {transitioning ? 'Executing…' : 'Confirm & Generate Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Dead Modal */}
      {showDeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141416] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-red-300">Archive Deal (Mark Dead)</h3>
              <button
                type="button"
                onClick={() => setShowDeadModal(false)}
                className="text-white/50 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/70">
              Per institutional standards, recording a dead deal requires specifying the reason category and documentation
              notes for portfolio audit trail.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Reason Category</label>
                <select
                  value={deadReason}
                  onChange={(e) => setDeadReason(e.target.value as DeadReasonCategory)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-red-400 focus:outline-none"
                  data-testid="dead-reason-select"
                >
                  {DEAD_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value} className="bg-[#141416]">
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/50 mb-1">Audit Notes (Minimum 5 characters)</label>
                <textarea
                  rows={3}
                  value={deadNotes}
                  onChange={(e) => setDeadNotes(e.target.value)}
                  placeholder="e.g., Unrepaired foundation settlement estimated at $35k exceeded contingency walk budget."
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-red-400 focus:outline-none"
                  data-testid="dead-notes-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDeadModal(false)}
                className="min-h-[40px] rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transitioning || deadNotes.trim().length < 5}
                onClick={() => {
                  handleTransition('dead', {
                    deadReason: deadReason,
                    deadReasonCategory: deadReason,
                    deadReasonNotes: deadNotes.trim(),
                  });
                }}
                className="min-h-[40px] rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition active:scale-95 disabled:opacity-40 touch-press"
                data-testid="confirm-dead-btn"
              >
                {transitioning ? 'Archiving…' : 'Confirm & Archive Deal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critical Modal Barrier: <24h Contingency Expiration */}
      {criticalAlert && !acknowledgedCritical && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="critical-contingency-modal-barrier"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-500/50 bg-[#14080a] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-3xl">🚨</span>
              <div>
                <h3 className="text-base font-bold text-white">CRITICAL CONTINGENCY EXPIRATION</h3>
                <p className="text-[11px] text-red-300 font-mono">DEADLINE IN UNDER 24 HOURS</p>
              </div>
            </div>

            <p className="text-xs text-red-100/90 leading-relaxed">
              <strong className="text-white font-semibold">{criticalAlert.name}</strong> expires in{' '}
              <span className="underline font-bold text-red-300">{criticalAlert.hoursLeft} hours</span> ({criticalAlert.dateFormatted}).
              Earnest money deposit will go hard and seller termination rights will take effect unless satisfied or waived.
            </p>

            <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-[11px] text-red-200/80">
              Required Action: Verify inspection report with seller or execute formal contingency removal / notice to cure.
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAcknowledgedCritical(true)}
                data-testid="acknowledge-critical-alert-btn"
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 shadow-lg shadow-red-950/50 transition active:scale-95"
              >
                Acknowledge &amp; Review Contingency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Underwriting Snapshot Lineage Modal */}
      {showSnapshotModal && project.underwritingSnapshot && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="snapshot-lineage-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0e1312] p-6 text-white shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Underwriting Snapshot Lineage</h3>
                  {project.underwritingSnapshot.superseded ? (
                    <SupersededSnapshotBadge />
                  ) : (
                    <span className="rounded-full border border-[#00DD94]/30 bg-[#00DD94]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00DD94]">
                      Engine v{project.underwritingSnapshot.engineVersion ?? (metrics?.engineVersion ?? 3)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/50">
                  Locked on{' '}
                  {new Date(project.underwritingSnapshot.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  · Snapshot ID: <span className="font-mono text-white/70">{project.underwritingSnapshot.snapshotId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                data-testid="close-snapshot-modal-btn"
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Inputs Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Deal Inputs</h4>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Purchase Price</p>
                  <p className="mt-0.5 font-bold text-white">{formatCurrency(project.underwritingSnapshot.inputs.purchasePrice)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Estimated ARV</p>
                  <p className="mt-0.5 font-bold text-white">{formatCurrency(project.underwritingSnapshot.inputs.estimatedARV)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Rehab Budget</p>
                  <p className="mt-0.5 font-bold text-white">{formatCurrency(project.underwritingSnapshot.inputs.rehabBudget)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Gross Rent</p>
                  <p className="mt-0.5 font-bold text-white">${(project.underwritingSnapshot.inputs.grossMonthlyRent || 0).toLocaleString()}/mo</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Annual Taxes</p>
                  <p className="mt-0.5 font-bold text-white">{formatCurrency(project.underwritingSnapshot.inputs.annualPropertyTax ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Annual Insurance</p>
                  <p className="mt-0.5 font-bold text-white">{formatCurrency(project.underwritingSnapshot.inputs.annualInsurance ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Assumptions Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Financing & Assumptions</h4>
              <div className="grid grid-cols-4 gap-2.5 text-xs">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Down Payment</p>
                  <p className="font-semibold text-white">
                    {((project.underwritingSnapshot.inputs as any).downPaymentPercent ?? (100 - (project.underwritingSnapshot.inputs.targetLtvPct ?? 80)))}%
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Interest Rate</p>
                  <p className="font-semibold text-white">{project.underwritingSnapshot.inputs.interestRatePct}%</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Amortization</p>
                  <p className="font-semibold text-white">{project.underwritingSnapshot.inputs.amortizationYears} yrs</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Vacancy Floor</p>
                  <p className="font-semibold text-white">{project.underwritingSnapshot.inputs.vacancyRatePct}%</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Expense Ratio</p>
                  <p className="font-semibold text-white">{project.underwritingSnapshot.inputs.operatingExpenseRatioPct ?? 35}%</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Management</p>
                  <p className="font-semibold text-white">{project.underwritingSnapshot.inputs.monthlyManagementFeePct ?? 8}%</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Exit Cap Rate</p>
                  <p className="font-semibold text-white">{project.underwritingSnapshot.inputs.exitCapRatePct ?? 6.5}%</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-[10px] text-white/40">Hold Period</p>
                  <p className="font-semibold text-white">{project.underwritingSnapshot.inputs.holdPeriodYears ?? 5} yrs</p>
                </div>
              </div>
            </div>

            {/* Calculated Canonical Outputs */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00DD94]/80 mb-2">Canonical Engine Outputs</h4>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-xl border border-[#00DD94]/20 bg-[#00DD94]/[0.03] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">MAO (70% Rule)</p>
                  <p className="mt-0.5 font-bold text-[#00DD94]">{formatCurrency(project.underwritingSnapshot.outputs.maximumAllowableOffer70Pct)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Cap Rate on Cost</p>
                  <p className="mt-0.5 font-bold text-white">{project.underwritingSnapshot.outputs.capRateOnCost.toFixed(2)}%</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Cash-on-Cash Return</p>
                  <p className="mt-0.5 font-bold text-white">{project.underwritingSnapshot.outputs.cashOnCashReturnPct.toFixed(2)}%</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Annual NOI</p>
                  <p className="mt-0.5 font-bold text-white">{formatCurrency(project.underwritingSnapshot.outputs.netOperatingIncome)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Monthly Cash Flow</p>
                  <p className="mt-0.5 font-bold text-white">
                    {project.underwritingSnapshot.outputs.monthlyNetCashFlow !== undefined
                      ? `$${project.underwritingSnapshot.outputs.monthlyNetCashFlow.toLocaleString()}/mo`
                      : `$${Math.round(project.underwritingSnapshot.outputs.annualNetCashFlow / 12).toLocaleString()}/mo`}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">DSCR</p>
                  <p className="mt-0.5 font-bold text-white">
                    {project.underwritingSnapshot.outputs.dscr !== null && project.underwritingSnapshot.outputs.dscr !== undefined
                      ? `${project.underwritingSnapshot.outputs.dscr.toFixed(2)}x`
                      : 'n/a'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase text-white/40">Projected IRR</p>
                    {project.underwritingSnapshot.superseded && (
                      <span className="text-[9px] font-semibold uppercase text-amber-400">SUPERSEDED</span>
                    )}
                  </div>
                  <p
                    data-testid="snapshot-projected-irr"
                    className={`mt-0.5 font-bold ${project.underwritingSnapshot.superseded ? 'text-amber-300/70 line-through' : 'text-[#00DD94]'}`}
                  >
                    {project.underwritingSnapshot.outputs.projectedIrrPct !== null && project.underwritingSnapshot.outputs.projectedIrrPct !== undefined
                      ? `${project.underwritingSnapshot.outputs.projectedIrrPct.toFixed(1)}%`
                      : 'n/a — adjust assumptions'}
                  </p>
                  {project.underwritingSnapshot.superseded && (
                    <p className="mt-1 text-[9px] text-amber-400/80 leading-tight">
                      Computed under legacy v1 heuristic. Re-underwrite in v2 engine.
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Cash Required</p>
                  <p className="mt-0.5 font-bold text-white">{formatCurrency(project.underwritingSnapshot.outputs.cashRequired)}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] uppercase text-white/40">Flip Profit</p>
                  <p className="mt-0.5 font-bold text-[#00DD94]">
                    {project.underwritingSnapshot.outputs.projectedFlipProfit !== undefined
                      ? formatCurrency(project.underwritingSnapshot.outputs.projectedFlipProfit)
                      : formatCurrency(
                          project.underwritingSnapshot.inputs.estimatedARV -
                            project.underwritingSnapshot.inputs.purchasePrice -
                            project.underwritingSnapshot.inputs.rehabBudget
                        )}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes & Provenance */}
            {project.underwritingSnapshot.assumptions?.notes && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70">
                <p className="text-[10px] uppercase text-white/40">Underwriter Notes</p>
                <p className="mt-1 italic">&ldquo;{project.underwritingSnapshot.assumptions.notes}&rdquo;</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
              <span className="text-white/40">
                Source: <span className="font-mono text-white/60">{project.underwritingSnapshot.source}</span> · Version {project.underwritingSnapshot.version}
              </span>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Counteroffer Modal (Offer v2) */}
      {showCounterofferModal && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="counteroffer-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141416] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Log Seller Counteroffer (Offer v2)</h3>
              <button
                type="button"
                onClick={() => setShowCounterofferModal(false)}
                className="text-white/50 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/70">
              Record counter-terms submitted by seller and advance pipeline stage to <strong>Negotiating</strong>.
            </p>

            <form onSubmit={handleSubmitCounteroffer} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Counteroffer Price ($)</label>
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                  data-testid="counteroffer-price-input"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Earnest Money Deposit ($)</label>
                  <input
                    type="number"
                    value={counterEmd}
                    onChange={(e) => setCounterEmd(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                    data-testid="counteroffer-emd-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Inspection Period (Days)</label>
                  <input
                    type="number"
                    value={counterInspectionDays}
                    onChange={(e) => setCounterInspectionDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                    data-testid="counteroffer-inspection-days-input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/50 mb-1">Negotiation Notes / Concessions</label>
                <textarea
                  rows={2}
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                  data-testid="counteroffer-notes-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCounterofferModal(false)}
                  className="min-h-[40px] rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transitioning}
                  className="min-h-[40px] rounded-xl bg-[#00DD94] px-4 py-2 text-xs font-bold text-black hover:bg-[#00DD94]/90 transition active:scale-95 disabled:opacity-50 touch-press"
                  data-testid="submit-counteroffer-btn"
                >
                  {transitioning ? 'Logging…' : 'Record Counteroffer & Negotiate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Acquisition (Closed) Modal */}
      {showClosingModal && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="closing-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141416] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Complete Acquisition (Close Deal)</h3>
              <button
                type="button"
                onClick={() => setShowClosingModal(false)}
                className="text-white/50 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/70">
              Confirm closing date and settlement numbers to complete Phase 01: Acquisition and transfer project to Phase 02: Fund.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">Settlement / Closing Date</label>
                <input
                  type="date"
                  value={closingDateInput}
                  onChange={(e) => setClosingDateInput(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                  data-testid="closing-date-input"
                  required
                />
              </div>
              <div>
                <label className="block text-white/50 mb-1">Actual Cash to Close ($)</label>
                <input
                  type="number"
                  value={actualCashToCloseInput}
                  onChange={(e) => setActualCashToCloseInput(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-2.5 text-white focus:border-[#00DD94] focus:outline-none"
                  data-testid="closing-cash-input"
                  required
                />
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-white/60">
                <p className="font-semibold text-white">Recorded Closing Document:</p>
                <p className="font-mono text-[#00DD94] mt-0.5">ALTA_Settlement_Statement_Executed.pdf</p>
                <p className="mt-1 text-white/40">Will be archived into project document vault automatically.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowClosingModal(false)}
                className="min-h-[40px] rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transitioning}
                onClick={handleConfirmClosing}
                className="min-h-[40px] rounded-xl bg-[#00DD94] px-4 py-2 text-xs font-bold text-black hover:bg-[#00DD94]/90 transition active:scale-95 disabled:opacity-50 touch-press"
                data-testid="confirm-closing-btn"
              >
                {transitioning ? 'Closing…' : 'Finalize Closing & Handoff to Fund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
