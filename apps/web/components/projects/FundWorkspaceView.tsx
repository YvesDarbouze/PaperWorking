'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  formatCurrency,
} from '@/lib/projects/phase-utils';
import type { ProjectWorkspace, ProjectFundingTerms } from '@/lib/projects/types';
import { computeMonthlyPayment } from '@paperworking/financial-engine';
import { SupersededSnapshotBadge } from '@/components/calculator/SupersededSnapshotBadge';

interface FundWorkspaceViewProps {
  project: ProjectWorkspace;
  onUpdateProject: (updated: ProjectWorkspace) => void;
}

export default function FundWorkspaceView({
  project,
  onUpdateProject,
}: FundWorkspaceViewProps) {
  // ── 1. Funding Summary State & Calculations ───────────────────────────────
  const initialFunding: ProjectFundingTerms = useMemo(() => {
    if (project.funding) return project.funding;
    const snap = project.underwritingSnapshot;
    const purchasePrice = project.purchasePrice || 392000;
    const loanAmount = snap?.outputs.loanAmount ?? Math.round(purchasePrice * 0.75);
    const ratePct = snap?.inputs.interestRatePct ?? 6.875;
    const amortization = snap?.inputs.amortizationYears ?? 30;
    const downPayment = snap ? purchasePrice - loanAmount : Math.round(purchasePrice * 0.25);
    const closingCosts = snap?.inputs.buyerClosingCostsAmount ?? Math.round(purchasePrice * 0.02);
    const actualCashToClose = snap?.outputs.cashRequired ?? downPayment + closingCosts;

    return {
      loanAmount,
      interestRatePct: ratePct,
      amortizationYears: amortization,
      downPayment,
      closingCosts,
      actualCashToClose,
      fundingStatus: 'Term Sheet Received',
      lenderName: 'Apex Commercial Capital',
      loanType: 'Hard Money / Bridge',
      monthlyDebtService: 0,
    };
  }, [project]);

  const [funding, setFunding] = useState<ProjectFundingTerms>(initialFunding);
  const [isEditingFunding, setIsEditingFunding] = useState(false);
  const [fundingSaving, setFundingSaving] = useState(false);
  const [fundingEditForm, setFundingEditForm] = useState<ProjectFundingTerms>(initialFunding);

  // Live computed monthly debt service using canonical financial engine
  const computedMonthlyPayment = useMemo(() => {
    const principal = Number(funding.loanAmount) || 0;
    const rate = Number(funding.interestRatePct) || 0;
    const years = Number(funding.amortizationYears) || 30;
    if (principal <= 0 || rate <= 0 || years <= 0) return 0;
    const rateDecimal = rate > 1 ? rate / 100 : rate;
    try {
      return computeMonthlyPayment(principal, rateDecimal, years);
    } catch {
      return 0;
    }
  }, [funding.loanAmount, funding.interestRatePct, funding.amortizationYears]);

  // ── 2. Progressive Hard Dates Alert Engine ─────────────────────────────────
  const [acknowledgedCritical, setAcknowledgedCritical] = useState(false);

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

    if (project.earnestMoney && project.earnestMoney.status !== 'held' && project.earnestMoney.status !== 'released') {
      const emdDueMs = new Date(project.earnestMoney.dueDate).getTime();
      const hoursLeft = Math.round((emdDueMs - now) / 3600000);
      if (hoursLeft <= 72 && hoursLeft > 0) {
        alerts.push({
          id: 'emd-deadline',
          name: 'Earnest Money Deposit (EMD)',
          hoursLeft,
          dateFormatted: new Date(project.earnestMoney.dueDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
          }),
          severity: hoursLeft <= 24 ? 'critical' : hoursLeft <= 48 ? 'urgent' : 'notice',
        });
      }
    }

    return alerts.sort((a, b) => a.hoursLeft - b.hoursLeft);
  }, [project.contingencies, project.earnestMoney]);

  const criticalAlert = hardDateAlerts.find((a) => a.severity === 'critical');
  const urgentAlert = hardDateAlerts.find((a) => a.severity === 'urgent');

  // ── 3. Contingencies State & Extension History ────────────────────────────
  const [contingencies, setContingencies] = useState<any[]>(project.contingencies || []);
  const [selectedContingencyForExtension, setSelectedContingencyForExtension] = useState<any | null>(null);
  const [extensionNewDate, setExtensionNewDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionSaving, setExtensionSaving] = useState(false);

  // ── 4. Earnest Money (EMD) Tracker State ──────────────────────────────────
  const [isEditingEmd, setIsEditingEmd] = useState(false);
  const [emdSaving, setEmdSaving] = useState(false);
  const initialEmd = project.earnestMoney || {
    amount: Math.round((project.purchasePrice || 392000) * 0.01),
    holderEntity: 'First American Title & Escrow Co',
    contactName: 'Sarah Jenkins (Escrow Officer)',
    phone: '(813) 555-0144',
    email: 'sjenkins@firstamtitle.example.com',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    status: 'held',
    receiptConfirmed: true,
  };
  const [emdData, setEmdData] = useState<any>(initialEmd);
  const [emdForm, setEmdForm] = useState<any>(initialEmd);

  // ── 5. Fund Tasks & Persistent Assignment ─────────────────────────────────
  const [tasks, setTasks] = useState<any[]>(project.tasks || []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssigneeUid, setNewTaskAssigneeUid] = useState('usr-lender-1');
  const [newTaskLinkedContingency, setNewTaskLinkedContingency] = useState('');
  const [taskUpdatingId, setTaskUpdatingId] = useState<string | null>(null);

  // ── 6. Contract Vault State & Real Storage ────────────────────────────────
  const [vaultDocs, setVaultDocs] = useState<any[]>(project.documents || []);
  const [storageIsConfigured, setStorageIsConfigured] = useState(true);
  const [storageProviderName, setStorageProviderName] = useState('Local Storage Driver');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState('Debt');
  const [uploadDocumentType, setUploadDocumentType] = useState('Loan Estimate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vaultNotice, setVaultNotice] = useState<string | null>(null);

  // ── 7. Lineage Snapshot Modal ─────────────────────────────────────────────
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  // Fetch initial document vault status
  useEffect(() => {
    let cancelled = false;
    async function checkVault() {
      try {
        const res = await fetch(`/api/projects/${project.id}/documents`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setStorageIsConfigured(data.isConfigured);
            setStorageProviderName(data.providerName || 'Cloud Storage');
            if (data.documents && data.documents.length > 0) {
              setVaultDocs(data.documents);
            }
          }
        }
      } catch {
        // Keep default
      }
    }
    checkVault();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  // Keep state synced with project props
  useEffect(() => {
    if (project.funding) setFunding(project.funding);
    if (project.contingencies) setContingencies(project.contingencies);
    if (project.tasks) setTasks(project.tasks);
    if (project.documents) setVaultDocs(project.documents);
    if (project.earnestMoney) setEmdData(project.earnestMoney);
  }, [project]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Save Funding Summary terms
  const handleSaveFunding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFundingSaving(true);
    try {
      const updatedFunding: ProjectFundingTerms = {
        ...fundingEditForm,
        loanAmount: Number(fundingEditForm.loanAmount),
        interestRatePct: Number(fundingEditForm.interestRatePct),
        amortizationYears: Number(fundingEditForm.amortizationYears),
        downPayment: Number(fundingEditForm.downPayment),
        closingCosts: Number(fundingEditForm.closingCosts),
        actualCashToClose: Number(fundingEditForm.actualCashToClose),
        monthlyDebtService: computedMonthlyPayment,
      };

      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funding: updatedFunding }),
      });

      if (!res.ok) throw new Error('Failed to update funding terms');

      setFunding(updatedFunding);
      onUpdateProject({
        ...project,
        funding: updatedFunding,
      });
      setIsEditingFunding(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving funding');
    } finally {
      setFundingSaving(false);
    }
  };

  // Update Contingency Status
  const handleContingencyStatusChange = async (contingencyId: string, status: string) => {
    const updated = contingencies.map((c) => (c.id === contingencyId ? { ...c, status } : c));
    setContingencies(updated);

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

  // Submit Contingency Extension
  const handleSaveExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContingencyForExtension || !extensionNewDate) return;
    setExtensionSaving(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/contingencies`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contingencyId: selectedContingencyForExtension.id,
          newDeadline: new Date(extensionNewDate).toISOString(),
          reason: extensionReason || 'Extension requested',
        }),
      });

      if (!res.ok) throw new Error('Failed to record extension');
      const data = await res.json();

      if (data.contingencies) {
        setContingencies(data.contingencies);
        onUpdateProject({
          ...project,
          contingencies: data.contingencies,
        });
      }
      setSelectedContingencyForExtension(null);
      setExtensionNewDate('');
      setExtensionReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Extension request failed');
    } finally {
      setExtensionSaving(false);
    }
  };

  // Save Earnest Money
  const handleSaveEmd = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmdSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/earnest-money`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emdForm),
      });

      if (!res.ok) throw new Error('Failed to update earnest money');
      const data = await res.json();
      const updatedEmd = data.earnestMoney || emdForm;

      setEmdData(updatedEmd);
      onUpdateProject({
        ...project,
        earnestMoney: updatedEmd,
      });
      setIsEditingEmd(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update EMD');
    } finally {
      setEmdSaving(false);
    }
  };

  // Assign Task to Team Member with REAL PERSISTENCE
  const handleAssignTask = async (taskId: string, assigneeName: string, assigneeUid: string) => {
    setTaskUpdatingId(taskId);
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          assignedTo: assigneeName,
          assigneeName,
          assignedToUid: assigneeUid,
          assigneeUid,
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    onUpdateProject({
      ...project,
      tasks: updatedTasks,
    });

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: assigneeName,
          assigneeName,
          assignedToUid: assigneeUid,
          assigneeUid,
        }),
      });
      if (!res.ok) {
        console.warn('[Task Assignment] Server returned non-ok status');
      }
    } catch (err) {
      console.error('[Task Assignment Error]', err);
    } finally {
      setTaskUpdatingId(null);
    }
  };

  // Toggle Task Completion
  const handleToggleTaskStatus = async (taskId: string) => {
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: t.status === 'complete' ? ('pending' as const) : ('complete' as const),
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    onUpdateProject({
      ...project,
      tasks: updatedTasks,
    });

    try {
      await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updatedTasks.find((t) => t.id === taskId)?.status,
        }),
      });
    } catch {
      // Non-fatal
    }
  };

  // Create New Ad-hoc Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const teamMember = (project.teamMembers || []).find((m) => m.id === newTaskAssigneeUid || m.uid === newTaskAssigneeUid);
    const assigneeName = teamMember?.name || 'Alex Mercer';

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          assignedTo: assigneeName,
          assignedToUid: newTaskAssigneeUid,
          dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          linkedContingencyId: newTaskLinkedContingency || undefined,
          status: 'pending',
          isAutoGenerated: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.task || {
          id: `task-${Date.now()}`,
          title: newTaskTitle.trim(),
          assignedTo: assigneeName,
          assignedToUid: newTaskAssigneeUid,
          dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          status: 'pending',
          isAutoGenerated: false,
        };
        const updated = [...tasks, created];
        setTasks(updated);
        onUpdateProject({
          ...project,
          tasks: updated,
        });
        setNewTaskTitle('');
      }
    } catch {
      // Fallback
    }
  };

  // Upload Document to Contract Vault
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadingFile(true);
    setUploadError(null);
    setUploadSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', uploadCategory);
    formData.append('documentType', uploadDocumentType);

    try {
      const res = await fetch(`/api/projects/${project.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      if (data.document) {
        const updatedDocs = [data.document, ...vaultDocs];
        setVaultDocs(updatedDocs);
        onUpdateProject({
          ...project,
          documents: updatedDocs,
          storage_used_bytes: data.storageUsedBytes || project.storage_used_bytes,
        });
        setSelectedFile(null);
        setUploadSuccessMessage(`Successfully uploaded ${data.document.name} to Contract Vault.`);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete Document with IRS 3-Year Protection Check
  const handleDeleteDocument = async (docId: string) => {
    setVaultNotice(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/documents/${docId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.isTaxLocked) {
          setVaultNotice(`IRS Compliance Lock: ${data.error}`);
          return;
        }
        throw new Error(data.error || 'Delete failed');
      }

      const updatedDocs = vaultDocs.filter((d) => d.doc_id !== docId);
      setVaultDocs(updatedDocs);
      onUpdateProject({
        ...project,
        documents: updatedDocs,
      });
      setVaultNotice('Document removed from vault.');
    } catch (err: unknown) {
      setVaultNotice(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const defaultTeamRoster = [
    { uid: 'usr-lead-1', name: 'Jordan Taylor', role: 'Lead Investor' },
    { uid: 'usr-analyst-1', name: 'Alex Mercer', role: 'Analyst' },
    { uid: 'usr-lender-1', name: 'Elena Rostova', role: 'Mortgage Loan Officer' },
    { uid: 'usr-escrow-1', name: 'Heritage Escrow Co', role: 'Title & Escrow Officer' },
    { uid: 'usr-contractor-1', name: 'Marcus Vance', role: 'General Contractor' },
  ];

  const activeRoster = (project.teamMembers && project.teamMembers.length > 0)
    ? project.teamMembers
    : defaultTeamRoster;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden" data-testid="fund-workspace-view">
      {/* ── CRITICAL 24H MODAL BARRIER ── */}
      {criticalAlert && !acknowledgedCritical && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/50 bg-neutral-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-lg font-bold">
                ⚠️
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Critical Deadline Approaching</h3>
                <p className="text-xs text-red-300">Action required within 24 hours</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
              <p className="font-semibold text-white">{criticalAlert.name}</p>
              <p className="mt-1 text-xs text-red-300">
                Deadline: {criticalAlert.dateFormatted} ({criticalAlert.hoursLeft} hours remaining).
              </p>
              <p className="mt-2 text-xs text-neutral-300">
                Failure to satisfy or extend this contingency before the deadline may put earnest money at risk.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAcknowledgedCritical(true)}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500"
              >
                Acknowledge & Enter Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP PROGRESSIVE ALERT BANNER (48H URRENT) ── */}
      {urgentAlert && (
        <div
          data-testid="urgent-deadline-banner"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-amber-200"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-amber-400">⏰</span>
            <span>
              Upcoming Hard Date: <strong>{urgentAlert.name}</strong> expires in{' '}
              <strong className="text-amber-300">{urgentAlert.hoursLeft}h</strong> ({urgentAlert.dateFormatted}).
            </span>
          </div>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            Action Required
          </span>
        </div>
      )}

      {/* ── WORKSPACE HEADER ── */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#3B82F6]">
              Phase 02 · Fund
            </span>
            <span className="text-xs text-white/45">{project.property_address || project.address}</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
            Fund & Documentation Vault
          </h1>
          <p className="mt-1 text-xs text-white/60">
            Fund is where you fund the project and compile the necessary documentation and paperwork to make a real-estate transaction.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {project.underwritingSnapshot && !project.underwritingSnapshot.superseded && (
            <button
              type="button"
              onClick={() => setShowSnapshotModal(true)}
              data-testid="view-snapshot-lineage-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/[0.1] hover:text-white"
            >
              <span>📜</span> Underwriting Lineage (v{project.underwritingSnapshot.version})
            </button>
          )}
          {project.underwritingSnapshot?.superseded && (
            <button
              type="button"
              onClick={() => setShowSnapshotModal(true)}
              data-testid="view-superseded-snapshot-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
            >
              <SupersededSnapshotBadge showTooltip={false} />
            </button>
          )}
          <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70">
            Status: <strong className="text-white">{funding.fundingStatus || 'Underwriting'}</strong>
          </span>
        </div>
      </section>

      {/* ── GRID: SECTION 1 (FUNDING SUMMARY) & SECTION 2 (CONTINGENCIES) ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* SECTION 1: FUNDING SUMMARY */}
        <article
          data-testid="funding-summary-card"
          className="rounded-2xl border border-white/10 bg-black/25 p-5 lg:col-span-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white">Funding Summary</h2>
              <p className="text-xs text-white/45">Debt structure, capital stack & cash to close</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFundingEditForm(funding);
                setIsEditingFunding(true);
              }}
              data-testid="edit-funding-btn"
              className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white"
            >
              Edit Terms
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">Loan Amount</p>
              <p className="mt-1 text-base font-bold text-white" data-testid="funding-loan-amount">
                {formatCurrency(funding.loanAmount || 0)}
              </p>
              <p className="text-[10px] text-white/40">{funding.loanType || 'Bridge Loan'}</p>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">Interest Rate</p>
              <p className="mt-1 text-base font-bold text-white" data-testid="funding-rate">
                {funding.interestRatePct}%
              </p>
              <p className="text-[10px] text-white/40">{funding.amortizationYears}yr Amortization</p>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">Monthly Debt Service</p>
              <p className="mt-1 text-base font-bold text-[#00DD94]" data-testid="funding-monthly-debt">
                {formatCurrency(computedMonthlyPayment)}/mo
              </p>
              <p className="text-[10px] text-white/40">P&I Payment</p>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">Down Payment</p>
              <p className="mt-1 text-base font-semibold text-white">
                {formatCurrency(funding.downPayment || 0)}
              </p>
              <p className="text-[10px] text-white/40">
                {project.purchasePrice ? `${Math.round(((funding.downPayment || 0) / project.purchasePrice) * 100)}% of Purchase` : 'Equity'}
              </p>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/45">Closing Costs</p>
              <p className="mt-1 text-base font-semibold text-white">
                {formatCurrency(funding.closingCosts || 0)}
              </p>
              <p className="text-[10px] text-white/40">Title, origination & escrow</p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wider text-emerald-400">Actual Cash to Close</p>
              <p className="mt-1 text-base font-bold text-emerald-200" data-testid="funding-cash-to-close">
                {formatCurrency(funding.actualCashToClose || 0)}
              </p>
              <p className="text-[10px] text-emerald-400/70">Reconciled Wire Total</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-white/60">
            <div>
              Lender: <strong className="text-white">{funding.lenderName || 'Apex Commercial Capital'}</strong>
            </div>
            <div>
              Funding Status:{' '}
              <span className="rounded-md bg-blue-500/20 px-2 py-0.5 font-semibold text-blue-300">
                {funding.fundingStatus || 'Term Sheet Received'}
              </span>
            </div>
          </div>
        </article>

        {/* SECTION 2: CONTINGENCY DEADLINES */}
        <article
          data-testid="contingency-deadlines-card"
          className="rounded-2xl border border-white/10 bg-black/25 p-5 lg:col-span-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white">Contingency Deadlines</h2>
              <p className="text-xs text-white/45">Carried from Acquisition with live countdowns</p>
            </div>
            <span className="text-xs text-white/40">
              {contingencies.filter((c) => c.status === 'satisfied' || c.status === 'waived').length} /{' '}
              {contingencies.length} Cleared
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {contingencies.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/40">No contingencies recorded.</div>
            ) : (
              contingencies.map((c) => {
                const deadlineMs = new Date(c.deadline).getTime();
                const now = Date.now();
                const hoursLeft = Math.round((deadlineMs - now) / 3600000);
                const isCleared = c.status === 'satisfied' || c.status === 'waived';
                const isExpired = hoursLeft <= 0 && !isCleared;

                return (
                  <div
                    key={c.id}
                    data-testid={`contingency-row-${c.id}`}
                    className="rounded-xl border border-white/8 bg-black/20 p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            isCleared
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isExpired
                              ? 'bg-red-500/20 text-red-400'
                              : hoursLeft <= 48
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {isCleared ? '✓' : isExpired ? '!' : '⏱'}
                        </span>
                        <div>
                          <p className="font-semibold text-white">{c.label || `${c.type} contingency`}</p>
                          <p className="text-[11px] text-white/45">
                            Responsible: {c.responsiblePartyName || 'Elena Rostova'}
                          </p>
                        </div>
                      </div>

                      {/* Countdown & Status */}
                      <div className="flex items-center gap-2">
                        {!isCleared && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              isExpired
                                ? 'bg-red-500/20 text-red-300'
                                : hoursLeft <= 24
                                ? 'animate-pulse bg-red-500/20 text-red-300'
                                : hoursLeft <= 48
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-white/[0.08] text-white/70'
                            }`}
                          >
                            {isExpired
                              ? 'Expired'
                              : hoursLeft <= 48
                              ? `${hoursLeft}h remaining`
                              : `${Math.round(hoursLeft / 24)} days left`}
                          </span>
                        )}

                        {/* Status Select */}
                        <select
                          value={c.status}
                          aria-label={`Status for ${c.label || c.type}`}
                          onChange={(e) => handleContingencyStatusChange(c.id, e.target.value)}
                          className="rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1 text-xs text-white"
                        >
                          <option value="open">Open</option>
                          <option value="satisfied">Satisfied</option>
                          <option value="waived">Waived</option>
                          <option value="terminated">Terminated</option>
                        </select>
                      </div>
                    </div>

                    {/* Deadline Date & Extension Trigger */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-white/50">
                      <span>
                        Hard Deadline:{' '}
                        <strong className="text-white/80">
                          {new Date(c.deadline).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedContingencyForExtension(c)}
                        className="text-xs font-semibold text-[#00DD94] hover:underline"
                      >
                        + Request Extension {c.extensionHistory?.length ? `(${c.extensionHistory.length})` : ''}
                      </button>
                    </div>

                    {/* Extension History Snippet */}
                    {c.extensionHistory && c.extensionHistory.length > 0 && (
                      <div className="mt-2 rounded-lg bg-white/[0.02] p-2 text-[10px] text-white/40">
                        Extensions:{' '}
                        {c.extensionHistory.map((ext: any) => (
                          <span key={ext.extensionId || ext.requestedAt} className="mr-2 inline-block">
                            • {ext.reason} (Approved)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>

      {/* ── SECTION 3: EARNEST MONEY (EMD) TRACKER ── */}
      <article
        data-testid="earnest-money-card"
        className="rounded-2xl border border-white/10 bg-black/25 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-semibold text-white">Earnest Money Deposit (EMD) Tracker</h2>
            <p className="text-xs text-white/45">Escrow holder, wire status and contractual deposit receipt</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmdForm(emdData);
              setIsEditingEmd(true);
            }}
            data-testid="edit-emd-btn"
            className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white"
          >
            Update EMD
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-black/20 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-white/45">Deposit Amount</p>
            <p className="mt-1 text-lg font-bold text-white" data-testid="emd-amount-display">
              {formatCurrency(emdData.amount || 5000)}
            </p>
            <p className="text-[10px] text-white/40">Contractual EMD Deposit</p>
          </div>

          <div className="rounded-xl border border-white/8 bg-black/20 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-white/45">Escrow Holder</p>
            <p className="mt-1 text-sm font-semibold text-white">{emdData.holderEntity}</p>
            <p className="text-[10px] text-white/40">{emdData.contactName || 'Title Officer'}</p>
          </div>

          <div className="rounded-xl border border-white/8 bg-black/20 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-white/45">Due Date</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {new Date(emdData.dueDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-[10px] text-emerald-400">Due within 3 business days of PSA</p>
          </div>

          <div className="rounded-xl border border-white/8 bg-black/20 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-white/45">Escrow Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  emdData.status === 'held'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : emdData.status === 'sent'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
                data-testid="emd-status-badge"
              >
                {emdData.status}
              </span>
              {emdData.receiptConfirmed && (
                <span className="text-[11px] text-emerald-400">✓ Receipt Confirmed</span>
              )}
            </div>
            <p className="text-[10px] text-white/40 mt-1">Escrow wire receipt verified</p>
          </div>
        </div>
      </article>

      {/* ── GRID: SECTION 4 (TASKS WITH ASSIGNMENT) & SECTION 5 (CONTRACT VAULT) ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* SECTION 4: FUND TASKS WITH PERSISTENT TEAM ASSIGNMENT */}
        <article
          data-testid="fund-tasks-card"
          className="rounded-2xl border border-white/10 bg-black/25 p-5 lg:col-span-7"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white">Fund Tasks & Team Assignments</h2>
              <p className="text-xs text-white/45">
                Assign tasks to project team members; changes persist against backend store
              </p>
            </div>
            <span className="text-xs text-white/40">
              {tasks.filter((t) => t.status === 'complete').length} / {tasks.length} Done
            </span>
          </div>

          {/* Quick Add Task */}
          <form onSubmit={handleCreateTask} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Add ad-hoc Fund task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-[#3B82F6] focus:outline-none"
            />
            <select
              value={newTaskAssigneeUid}
              aria-label="Assign task to team member"
              onChange={(e) => setNewTaskAssigneeUid(e.target.value)}
              className="w-full sm:w-auto max-w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white"
            >
              {activeRoster.map((m) => (
                <option key={m.uid || m.id} value={m.uid || m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2563EB]"
            >
              Add Task
            </button>
          </form>

          {/* Task List */}
          <div className="mt-4 space-y-2.5">
            {tasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/40">No Fund tasks yet.</div>
            ) : (
              tasks.map((task) => {
                const isComplete = task.status === 'complete';
                const currentAssigneeName = task.assignedTo || task.assigneeName || 'Elena Rostova';

                return (
                  <div
                    key={task.id}
                    data-testid={`task-item-${task.id}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border p-3 text-xs transition max-w-full ${
                      isComplete
                        ? 'border-white/5 bg-white/[0.01] text-white/40'
                        : 'border-white/10 bg-black/20 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskStatus(task.id)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${
                          isComplete
                            ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                            : 'border-white/20 bg-white/5 text-transparent hover:border-white/40'
                        }`}
                      >
                        ✓
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium break-words ${isComplete ? 'line-through text-white/40' : 'text-white'}`}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-[10px] text-white/45">
                            Due:{' '}
                            {new Date(task.dueDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Team Member Assignee Selector */}
                    <div className="flex items-center gap-2 max-w-full">
                      <span className="text-[10px] text-white/40 shrink-0">Assignee:</span>
                      <select
                        aria-label={`Assignee for task ${task.title}`}
                        value={currentAssigneeName}
                        disabled={taskUpdatingId === task.id}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          const member = activeRoster.find((m) => m.name === selectedName);
                          handleAssignTask(task.id, selectedName, member?.uid || member?.id || 'usr-lender-1');
                        }}
                        data-testid={`task-assignee-select-${task.id}`}
                        className="max-w-[200px] sm:max-w-xs truncate rounded-lg border border-white/15 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white focus:border-[#3B82F6] focus:outline-none"
                      >
                        {activeRoster.map((m) => (
                          <option key={m.uid || m.id} value={m.name}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* SECTION 5: CONTRACT VAULT & REAL STORAGE ADAPTER */}
        <article
          data-testid="contract-vault-card"
          className="rounded-2xl border border-white/10 bg-black/25 p-5 lg:col-span-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-semibold text-white">Contract Vault</h2>
              <p className="text-xs text-white/45">Executed contracts, disclosures & paperwork</p>
            </div>
            <span className="text-xs text-white/40">{vaultDocs.length} files</span>
          </div>

          {/* HONEST REQUIRES CREDENTIALS BANNER IF UNCONFIGURED */}
          {!storageIsConfigured && (
            <div
              data-testid="storage-unconfigured-banner"
              className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300"
            >
              <p className="font-semibold text-amber-200">
                [Contract Vault: Cloud Storage Not Configured — REQUIRES CREDENTIALS]
              </p>
              <p className="mt-1 text-amber-300/80">
                Upload pipeline requires `FIREBASE_STORAGE_BUCKET` credentials or local memory storage driver.
              </p>
            </div>
          )}

          {vaultNotice && (
            <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-200">
              {vaultNotice}
            </div>
          )}

          {uploadSuccessMessage && (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
              {uploadSuccessMessage}
            </div>
          )}

          {uploadError && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-200">
              {uploadError}
            </div>
          )}

          {/* Upload Form (Active when configured) */}
          {storageIsConfigured && (
            <form onSubmit={handleUploadDocument} className="mt-4 space-y-3 rounded-xl border border-white/8 bg-black/20 p-3.5">
              <p className="text-xs font-semibold text-white">Upload New Contract / Paperwork</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={uploadDocumentType}
                  onChange={(e) => setUploadDocumentType(e.target.value)}
                  className="rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Purchase Agreement">Purchase Agreement (PSA)</option>
                  <option value="Loan Estimate">Loan Estimate (LE)</option>
                  <option value="Closing Disclosure">Closing Disclosure (CD)</option>
                  <option value="Title Commitment">Title Commitment</option>
                  <option value="Escrow Receipt">Escrow Receipt (EMD)</option>
                  <option value="Appraisal">Appraisal</option>
                  <option value="Insurance Binder">Insurance Binder</option>
                </select>

                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Debt">Debt</option>
                  <option value="Title & Insurance">Title & Insurance</option>
                  <option value="Closing">Closing</option>
                  <option value="Equity">Equity</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-xs text-white/60 file:mr-2 file:rounded-lg file:border file:border-white/10 file:bg-white/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
                />
                <button
                  type="submit"
                  disabled={!selectedFile || uploadingFile}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {uploadingFile ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          )}

          {/* Documents Table / List */}
          <div className="mt-4 space-y-2">
            {vaultDocs.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/40">No documents in vault yet.</div>
            ) : (
              vaultDocs.map((doc) => (
                <div
                  key={doc.doc_id}
                  data-testid={`document-item-${doc.doc_id}`}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 p-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate font-medium text-white">{doc.name}</p>
                    <p className="text-[10px] text-white/45">
                      {doc.type} · {doc.generated_at ? new Date(doc.generated_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.url || `/api/projects/${project.id}/documents/${doc.doc_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#00DD94] hover:underline"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.doc_id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-white/45">
            Storage Driver: <strong className="text-white/70">{storageProviderName}</strong>
          </div>
        </article>
      </div>

      {/* ── MODAL: EDIT FUNDING SUMMARY ── */}
      {isEditingFunding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit Funding Terms</h3>
            <p className="text-xs text-white/50">Modify debt parameters and loan terms</p>

            <form onSubmit={handleSaveFunding} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60">Loan Amount ($)</label>
                  <input
                    type="number"
                    value={fundingEditForm.loanAmount || ''}
                    onChange={(e) =>
                      setFundingEditForm({ ...fundingEditForm, loanAmount: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.125"
                    value={fundingEditForm.interestRatePct || ''}
                    onChange={(e) =>
                      setFundingEditForm({ ...fundingEditForm, interestRatePct: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60">Amortization (Years)</label>
                  <input
                    type="number"
                    value={fundingEditForm.amortizationYears || ''}
                    onChange={(e) =>
                      setFundingEditForm({ ...fundingEditForm, amortizationYears: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60">Down Payment ($)</label>
                  <input
                    type="number"
                    value={fundingEditForm.downPayment || ''}
                    onChange={(e) =>
                      setFundingEditForm({ ...fundingEditForm, downPayment: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60">Closing Costs ($)</label>
                  <input
                    type="number"
                    value={fundingEditForm.closingCosts || ''}
                    onChange={(e) =>
                      setFundingEditForm({ ...fundingEditForm, closingCosts: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60">Actual Cash to Close ($)</label>
                  <input
                    type="number"
                    value={fundingEditForm.actualCashToClose || ''}
                    onChange={(e) =>
                      setFundingEditForm({ ...fundingEditForm, actualCashToClose: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60">Funding Status</label>
                <select
                  value={fundingEditForm.fundingStatus || 'Term Sheet Received'}
                  onChange={(e) =>
                    setFundingEditForm({ ...fundingEditForm, fundingStatus: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-white"
                >
                  <option value="Application-Submitted">Application Submitted</option>
                  <option value="Term Sheet Received">Term Sheet Received</option>
                  <option value="Lender Underwriting">Lender Underwriting</option>
                  <option value="Conditional Approval">Conditional Approval</option>
                  <option value="Clear to Close">Clear to Close</option>
                  <option value="Funded">Funded</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingFunding(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-white/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fundingSaving}
                  className="rounded-xl bg-[#3B82F6] px-5 py-2 font-semibold text-white hover:bg-[#2563EB]"
                >
                  {fundingSaving ? 'Saving...' : 'Save Funding Terms'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REQUEST EXTENSION ── */}
      {selectedContingencyForExtension && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Log Contingency Extension</h3>
            <p className="text-xs text-white/50">
              {selectedContingencyForExtension.label || selectedContingencyForExtension.type}
            </p>

            <form onSubmit={handleSaveExtension} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-white/60">New Expiration Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={extensionNewDate}
                  onChange={(e) => setExtensionNewDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-white/60">Reason for Extension</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Lender desk requested survey endorsement before issuing clear-to-close"
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedContingencyForExtension(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-white/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extensionSaving}
                  className="rounded-xl bg-[#00DD94] px-5 py-2 font-semibold text-black hover:bg-[#00c584]"
                >
                  {extensionSaving ? 'Saving...' : 'Record Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: UPDATE EARNEST MONEY (EMD) ── */}
      {isEditingEmd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Update Earnest Money</h3>
            <p className="text-xs text-white/50">Escrow details and wire status</p>

            <form onSubmit={handleSaveEmd} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-white/60">EMD Amount ($)</label>
                <input
                  type="number"
                  value={emdForm.amount || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, amount: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-white/60">Escrow Holder Entity</label>
                <input
                  type="text"
                  value={emdForm.holderEntity || ''}
                  onChange={(e) => setEmdForm({ ...emdForm, holderEntity: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-white/60">Deposit Due Date</label>
                <input
                  type="date"
                  value={emdForm.dueDate ? emdForm.dueDate.split('T')[0] : ''}
                  onChange={(e) => setEmdForm({ ...emdForm, dueDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-white/60">Deposit Status</label>
                <select
                  value={emdForm.status || 'pending'}
                  onChange={(e) => setEmdForm({ ...emdForm, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900 p-2.5 text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="sent">Sent / Wired</option>
                  <option value="held">Held in Escrow</option>
                  <option value="released">Released to Seller</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emd-receipt-checkbox"
                  checked={Boolean(emdForm.receiptConfirmed)}
                  onChange={(e) => setEmdForm({ ...emdForm, receiptConfirmed: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-black/30 text-emerald-500"
                />
                <label htmlFor="emd-receipt-checkbox" className="text-white/80">
                  Receipt Confirmed by Escrow Agent
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingEmd(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-white/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emdSaving}
                  className="rounded-xl bg-[#3B82F6] px-5 py-2 font-semibold text-white hover:bg-[#2563EB]"
                >
                  {emdSaving ? 'Saving...' : 'Save EMD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IMMUTABLE UNDERWRITING SNAPSHOT AUDIT VIEW ── */}
      {showSnapshotModal && project.underwritingSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Underwriting Snapshot Lineage</h3>
                  {project.underwritingSnapshot.superseded ? (
                    <SupersededSnapshotBadge />
                  ) : (
                    <span className="rounded-full border border-[#00DD94]/30 bg-[#00DD94]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00DD94]">
                      Engine v{project.underwritingSnapshot.engineVersion ?? 2}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/50">
                  Immutable baseline captured on {new Date(project.underwritingSnapshot.createdAt).toLocaleDateString()}
                  {project.underwritingSnapshot.superseded && (
                    <span className="text-amber-400/80"> · Legacy v1 Record</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-white/40">Purchase Price</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatCurrency(project.underwritingSnapshot.inputs.purchasePrice)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-white/40">Estimated ARV</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatCurrency(project.underwritingSnapshot.inputs.estimatedARV)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-white/40">Rehab Budget</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatCurrency(project.underwritingSnapshot.inputs.rehabBudget)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-white/40">Total Cost Basis</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatCurrency(project.underwritingSnapshot.outputs.totalCostBasis)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <h4 className="font-semibold text-white">Engine Outputs at Promotion</h4>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div>
                    <span className="text-white/45">Cap Rate on Cost: </span>
                    <strong className="text-white">{project.underwritingSnapshot.outputs.capRateOnCost}%</strong>
                  </div>
                  <div>
                    <span className="text-white/45">Cash on Cash: </span>
                    <strong className="text-white">{project.underwritingSnapshot.outputs.cashOnCashReturnPct}%</strong>
                  </div>
                  <div>
                    <span className="text-white/45">Projected IRR: </span>
                    {project.underwritingSnapshot.superseded ? (
                      <span className="inline-flex items-center gap-1.5">
                        <strong className="text-amber-300/70 line-through">
                          {project.underwritingSnapshot.outputs.projectedIrrPct}%
                        </strong>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                          SUPERSEDED
                        </span>
                      </span>
                    ) : (
                      <strong className="text-white">{project.underwritingSnapshot.outputs.projectedIrrPct}%</strong>
                    )}
                  </div>
                  <div>
                    <span className="text-white/45">DSCR: </span>
                    <strong className="text-white">{project.underwritingSnapshot.outputs.dscr}x</strong>
                  </div>
                  <div>
                    <span className="text-white/45">Loan Amount: </span>
                    <strong className="text-white">{formatCurrency(project.underwritingSnapshot.outputs.loanAmount)}</strong>
                  </div>
                  <div>
                    <span className="text-white/45">Monthly Debt: </span>
                    <strong className="text-white">{formatCurrency(project.underwritingSnapshot.outputs.monthlyDebtService)}</strong>
                  </div>
                </div>
              </div>

              {project.underwritingSnapshot.assumptions?.notes && (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-white/70">
                  <span className="font-semibold text-white">Investment Thesis: </span>
                  {project.underwritingSnapshot.assumptions.notes}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
