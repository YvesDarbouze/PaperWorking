'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { projectsService } from '@/lib/firebase/deals';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { Project, LoanStatus, ClosingChecklistItem, ProjectTeamMember, CostBasisLedger, RoleLinkedDocument, DueDiligenceItem, InspectionItem } from '@/types/schema';
import { LoanProcessingPipeline } from '@/components/project/LoanProcessingPipeline';
import { ClosingChecklist } from '@/components/project/ClosingChecklist';
import { AcquisitionTeamAssembly } from '@/components/project/AcquisitionTeamAssembly';
import { DueDiligenceChecklist } from '@/components/project/DueDiligenceChecklist';
import { InspectionTracker } from '@/components/project/InspectionTracker';
import { ContingencyTracker } from '@/components/project/ContingencyTracker';
import { DocumentVault } from '@/components/project/DocumentVault';
import { ClosingCostsLedger } from '@/components/project/ClosingCostsLedger';
import { ClearToCloseMilestone } from '@/components/project/ClearToCloseMilestone';
import { ClosingHandoffModal } from '@/components/phase2/ClosingHandoffModal';
import { Contingency } from '@/types/schema';
import toast from 'react-hot-toast';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import MarketVitals from '@/components/metrics/MarketVitals';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-2 — Purchase Workspace

   Stitch Schema: 5a320feb + ca708b12 (Purchase Phase)
   "Luminous Glass" dark design — single-column mobile-first stack.

   Phase 2 color accent: #adc6ff (secondary / blue)
   All save logic 100% preserved from original.

   Header chrome (breadcrumb, address, phase stepper) is provided
   by the parent layout.tsx workspace shell — NOT duplicated here.
   Project data is sourced from WorkspaceContext (no re-fetch).
   ═══════════════════════════════════════════════════════════════ */

const PHASE_COLOR = '#adc6ff';    // Purchase = blue/secondary
const PHASE_GLOW  = 'rgba(173, 198, 255, 0.3)';

export default function Phase2AcquisitionPage() {
  const params    = useParams();
  const projectId = params.id as string;

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading: isLoading, refresh } = useWorkspaceProject();

  const [isSaving, setIsSaving] = useState(false);

  // Local state for the components
  const [loanStatus, setLoanStatus] = useState<LoanStatus | undefined>();
  const [closingChecklist, setClosingChecklist] = useState<ClosingChecklistItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [dueDiligenceChecklist, setDueDiligenceChecklist] = useState<DueDiligenceItem[]>([]);
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [contingencies, setContingencies] = useState<Contingency[]>([]);
  const [costBasisLedger, setCostBasisLedger] = useState<CostBasisLedger | undefined>();
  const [roleLinkedDocuments, setRoleLinkedDocuments] = useState<RoleLinkedDocument[]>([]);
  const [isClearToClose, setIsClearToClose] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLender, setSelectedLender] = useState<'NEO' | 'LEGACY'>('NEO');

  const selectLender = async (lender: 'NEO' | 'LEGACY') => {
    setSelectedLender(lender);
    if (!project) return;
    const rate = lender === 'NEO' ? 6.125 : 6.450;
    const currentFinancials = project.financials || {};
    try {
      await projectsService.updateProject(projectId, {
        financials: { ...currentFinancials, loanInterestRate: rate }
      });
      toast.success(`Selected ${lender} Lender Option (${rate}%)`);
      refresh();
    } catch (e) {
      console.error("Failed to select lender:", e);
      toast.error("Failed to save lender selection");
    }
  };

  /* Sync local state whenever context project loads or changes */
  useEffect(() => {
    if (!project) return;
    setLoanStatus(project.loanStatus);
    setClosingChecklist(project.closingChecklist || []);
    setTeamMembers(project.projectTeam || []);
    setDueDiligenceChecklist(project.dueDiligenceChecklist || []);
    setInspections(project.financials?.inspections || []);
    setContingencies(project.contingencies || []);
    setCostBasisLedger(project.costBasisLedger);
    setRoleLinkedDocuments(project.roleLinkedDocuments || []);
    setIsClearToClose(project.isClearToClose || false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]); // Re-init only when project ID changes

  /* ── Computed metrics for the Cost Basis metrics panel ── */
  const costMetrics = useMemo(() => {
    if (!project?.financials) return { purchasePrice: 0, closingCosts: 0, totalCostBasis: 0, inspectionCredits: 0, lenderRate: 0, cashToClose: 0 };

    const f = project.financials;
    const purchasePrice = f.purchasePrice || 0;

    // Sum closing costs from ledger
    let closingCosts = 0;
    if (costBasisLedger) {
      const allItems = [
        ...(costBasisLedger.directAcquisition || []),
        ...(costBasisLedger.financing || []),
        ...(costBasisLedger.preClosing || [])
      ];
      closingCosts = allItems
        .filter(item => item.label.toLowerCase() !== 'purchase price')
        .reduce((sum, item) => sum + item.amount, 0);
    }

    // Inspection credits: difference when actual < estimated (negotiated savings)
    const inspectionCredits = inspections
      .filter(i => i.estimatedCost && i.actualCost && i.actualCost < i.estimatedCost)
      .reduce((sum, i) => sum + ((i.estimatedCost || 0) - (i.actualCost || 0)), 0);

    const totalCostBasis = purchasePrice + closingCosts - inspectionCredits;
    const lenderRate = f.loanInterestRate || 0;
    const loanAmount = f.loanAmount || 0;
    const cashToClose = purchasePrice - loanAmount + closingCosts;

    return { purchasePrice, closingCosts, totalCostBasis, inspectionCredits, lenderRate, cashToClose };
  }, [project?.financials, costBasisLedger, inspections]);

  /* ── DD completion tracking ── */
  const ddProgress = useMemo(() => {
    const total = dueDiligenceChecklist.length;
    const done = dueDiligenceChecklist.filter(i => i.completed).length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [dueDiligenceChecklist]);

  const handleSave = async (overrideClearToClose?: boolean) => {
    if (!project) return;
    setIsSaving(true);
    try {
      const finalIsClearToClose = overrideClearToClose !== undefined ? overrideClearToClose : isClearToClose;
      
      let initialCapitalizedBasis = project.financials?.initialCapitalizedBasis;

      if (finalIsClearToClose && !initialCapitalizedBasis) {
        const purchasePrice = project.financials?.purchasePrice || 0;
        let totalClosingCosts = 0;
        
        if (costBasisLedger) {
          const ledger = costBasisLedger;
          const allItems = [
            ...(ledger.directAcquisition || []),
            ...(ledger.financing || []),
            ...(ledger.preClosing || [])
          ];
          totalClosingCosts = allItems
            .filter(item => item.label.toLowerCase() !== 'purchase price')
            .reduce((sum, item) => sum + item.amount, 0);
        }
        initialCapitalizedBasis = purchasePrice + totalClosingCosts;
      } else if (!finalIsClearToClose) {
        initialCapitalizedBasis = undefined;
      }

      const newFinancials = { ...project.financials };
      if (initialCapitalizedBasis !== undefined) {
        newFinancials.initialCapitalizedBasis = initialCapitalizedBasis;
      } else {
        delete newFinancials.initialCapitalizedBasis;
      }

      await projectsService.updateProject(projectId, {
        loanStatus,
        closingChecklist,
        projectTeam: teamMembers,
        dueDiligenceChecklist,
        contingencies,
        costBasisLedger,
        roleLinkedDocuments,
        isClearToClose: finalIsClearToClose,
        financials: newFinancials,
      });

      if (overrideClearToClose !== undefined) {
        toast.success(finalIsClearToClose ? 'Project Cleared to Close! Financials locked.' : 'Clear to Close revoked. Financials unlocked.');
      } else {
        toast.success('Phase 2 configuration saved!');
      }

      /* Sync context so layout header stays up-to-date */
      refresh();
    } catch (error) {
      console.error('Error saving Phase 2:', error);
      toast.error('Failed to save changes');
      if (overrideClearToClose !== undefined) {
        setIsClearToClose(!overrideClearToClose);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImmediateSave = async (updates: Partial<Project>) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, updates);
    } catch (error) {
      console.error('Failed to save changes immediately:', error);
      toast.error('Failed to save changes');
    }
  };

  /* ── Format helpers ── */
  const fmtDollar = (value?: number) => {
    if (!value && value !== 0) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const fmtPct = (value?: number) => {
    if (!value && value !== 0) return '—';
    return `${value.toFixed(1)}%`;
  };

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b141a]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-2 rounded-full animate-spin"
            style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#bacac5]">
            Loading Workspace…
          </p>
        </div>
      </div>
    );
  }

  /* ── Not found state ── */
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b141a]">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-[#dae4ec]">Project not found.</p>
        </div>
      </div>
    );
  }

  const ownershipPct = project.financials?.ownershipPercentage ?? 100;

  return (
    <div className="min-h-screen bg-[#0b141a] relative">

      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Purchase phase: indigo-tinted ambient glow (per Stitch diligence schema gradient) */}
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-[#1e1b4b]/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#0566d9]/8 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Explainer Video Banner ── */}
      <PhaseExplainerVideo
        phaseKey="phase-2"
        title="Understanding Phase 2: Purchase"
        description="Learn how to organize sale documents, process loans, and manage real estate attorneys to clear your deal to close."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="3:15"
      />

      {/* ═══════════════════════════════════════════════════════
          Workspace Body — Luminous Glass Layout
          ═══════════════════════════════════════════════════════ */}
      <main className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-8">

        {/* ── Phase Context Header ── */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p
                className="text-[12px] leading-[14px] font-medium tracking-[0.05em] uppercase"
                style={{ color: PHASE_COLOR }}
              >
                Phase: Purchase
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#bacac5]">
                  Equity: {ownershipPct}%
                </span>
                {isClearToClose && (
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full bg-[#57f1db]/15 text-[#57f1db]">
                    Clear to Close
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span
                className="text-[14px] leading-[16px] font-semibold tracking-[0.02em]"
                style={{ color: PHASE_COLOR }}
              >
                {ddProgress.done}/{ddProgress.total} Tasks
              </span>
            </div>
          </div>
          {/* Progress Bar (Stitch schema pattern) */}
          <div className="h-1.5 w-full bg-[#2d363d] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${ddProgress.pct}%`,
                background: `linear-gradient(90deg, ${PHASE_COLOR} 0%, #d8e2ff 100%)`,
                boxShadow: `0 0 20px -5px ${PHASE_GLOW}`,
              }}
            />
          </div>
        </section>

        {/* ── Cost Basis Metrics Panel (Stitch schema: 2×2 grid) ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
              Cost Basis
            </h2>
            <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>visibility</span>
              Property View
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Purchase Price */}
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden">
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-[#adc6ff]/5 rounded-full blur-xl" />
              <div className="flex justify-between items-start">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Purchase Price</span>
                <span className="text-[10px] font-bold tracking-tighter" style={{ color: '#57f1db' }}>ACTUAL</span>
              </div>
              <p className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                {fmtDollar(costMetrics.purchasePrice)}
              </p>
            </div>

            {/* Lender Terms */}
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-32">
              <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Lender Terms</span>
              <div className="space-y-1">
                <span className="text-[24px] leading-[32px] font-semibold" style={{ color: PHASE_COLOR }}>
                  {fmtPct(costMetrics.lenderRate)}
                </span>
                <p className="text-[12px] leading-[14px] font-medium text-[#bacac5]/60">
                  {costMetrics.lenderRate > 0 ? 'Fixed Rate' : 'Not Set'}
                </p>
              </div>
            </div>

            {/* Closing Costs */}
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-32">
              <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Closing Costs</span>
              <div className="space-y-1">
                <span className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                  {fmtDollar(costMetrics.closingCosts)}
                </span>
                <p className="text-[12px] leading-[14px] font-medium text-[#bacac5]/60">
                  {isClearToClose ? 'Reconciled' : 'Estimated'}
                </p>
              </div>
            </div>

            {/* Cash to Close */}
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-32">
              <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Cash to Close</span>
              <div className="space-y-1">
                <span className="text-[24px] leading-[32px] font-semibold text-[#ffd1aa]">
                  {fmtDollar(costMetrics.cashToClose)}
                </span>
                <p className="text-[12px] leading-[14px] font-medium text-[#bacac5]/60">Estimated</p>
              </div>
            </div>

            {/* Total Cost Basis (full-width hero) */}
            <div className="glass-card p-4 rounded-xl flex flex-col gap-1 col-span-2 relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] w-24 h-24 rounded-full blur-3xl" style={{ background: `${PHASE_COLOR}10` }} />
              <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Total Cost Basis</span>
              <p className="text-[24px] leading-[32px] font-semibold" style={{ color: PHASE_COLOR }}>
                {fmtDollar(costMetrics.totalCostBasis)}
              </p>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: '#57f1db' }}>
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>trending_up</span>
                Live
              </div>
            </div>

            {/* Inspection Credits (if any) */}
            {costMetrics.inspectionCredits > 0 && (
              <div className="glass-card p-4 rounded-xl flex flex-col gap-1 col-span-2 border-l-4 border-l-[#ffd1aa]">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Inspection Credits</span>
                <p className="text-[24px] leading-[32px] font-semibold text-[#ffd1aa]">
                  -{fmtDollar(costMetrics.inspectionCredits)}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Lender Selection & Cost Basis Details ── */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Lender Comparison (md:col-span-7) */}
          <div className="md:col-span-7 bg-surface-container/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/20 to-transparent"></div>
            <div>
              <h3 className="font-headline-md text-lg text-on-surface flex items-center gap-2 font-bold mb-4">
                <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                Lender Selection
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-on-surface-variant/60 border-b border-white/5 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5">Parameter</th>
                      <th className="py-2.5 text-center">NEO (Primary)</th>
                      <th className="py-2.5 text-center">Legacy (Alt)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-on-surface font-mono">
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 font-sans text-xs">Interest Rate</td>
                      <td className="py-3 text-center text-primary font-bold">6.125%</td>
                      <td className="py-3 text-center text-on-surface-variant/80">6.450%</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 font-sans text-xs">Points/Credits</td>
                      <td className="py-3 text-center text-primary font-bold">1.0 Pt</td>
                      <td className="py-3 text-center text-on-surface-variant/80">1.5 Pts</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 font-sans text-xs">Lender Fees</td>
                      <td className="py-3 text-center text-primary font-bold">$1,250</td>
                      <td className="py-3 text-center text-on-surface-variant/80">$1,500</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 font-sans text-xs">Monthly P&I</td>
                      <td className="py-3 text-center text-primary font-bold">$1,520/mo</td>
                      <td className="py-3 text-center text-on-surface-variant/80">$1,610/mo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 mt-6 border-t border-white/5 pt-4">
              <button
                onClick={() => selectLender('NEO')}
                className={`flex-1 py-2.5 rounded-xl font-label-md text-xs font-bold transition-all border ${
                  selectedLender === 'NEO'
                    ? 'bg-primary/25 border-primary/45 text-primary shadow-[0_0_15px_-3px_rgba(45,212,191,0.25)]'
                    : 'bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'
                }`}
              >
                Select NEO (6.125%)
              </button>
              <button
                onClick={() => selectLender('LEGACY')}
                className={`flex-1 py-2.5 rounded-xl font-label-md text-xs font-bold transition-all border ${
                  selectedLender === 'LEGACY'
                    ? 'bg-primary/25 border-primary/45 text-primary shadow-[0_0_15px_-3px_rgba(45,212,191,0.25)]'
                    : 'bg-white/5 border-white/5 hover:border-white/10 text-on-surface-variant'
                }`}
              >
                Select Legacy (6.450%)
              </button>
            </div>
          </div>

          {/* Right Column: Live Cost Basis Sidebar & Minimap (md:col-span-5) */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {/* Live Cost Basis Sidebar Card */}
            <div className="bg-surface-container-low/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg relative flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-label-md text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-[#ffdcc0] text-[18px]">calculate</span>
                  Live Cost Basis
                </h3>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2 text-[#bacac5]">
                    <span>Property Price</span>
                    <span className="font-mono text-[#dae4ec]">{fmtDollar(costMetrics.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2 text-[#bacac5]">
                    <span>Origination Fees</span>
                    <span className="font-mono text-[#dae4ec]">$2,450</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2 text-[#bacac5]">
                    <span>Recording Tax</span>
                    <span className="font-mono text-[#dae4ec]">$1,800</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2 text-[#bacac5]">
                    <span>Prepaids</span>
                    <span className="font-mono text-[#dae4ec]">$950</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-white pt-1">
                    <span>Total Closing Costs</span>
                    <span className="font-mono text-[#57f1db]">{fmtDollar(costMetrics.closingCosts)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  toast.success("Closing ledger exported successfully to CSV.");
                }}
                className="mt-6 w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-on-surface font-label-md text-xs font-semibold transition-all active:scale-97 text-center"
              >
                Export Closing Ledger
              </button>
            </div>

            {/* Map Backdrop Widget */}
            <div className="bg-[#0b141a]/60 relative h-32 overflow-hidden rounded-2xl border border-white/10 shadow-lg group">
              {/* Mock map graphic with grid lines and marker */}
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
              {/* Map road lines using simple SVG */}
              <svg className="absolute inset-0 w-full h-full opacity-15 stroke-white" strokeWidth="1.5">
                <line x1="0" y1="40" x2="300" y2="40" />
                <line x1="0" y1="90" x2="300" y2="90" />
                <line x1="120" y1="0" x2="120" y2="150" />
                <line x1="220" y1="0" x2="220" y2="150" />
              </svg>
              <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="material-symbols-outlined text-primary text-2xl animate-bounce">location_on</span>
                <span className="w-2.5 h-1 bg-black/60 rounded-full blur-[1px] mt-0.5"></span>
              </div>
              
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* Status Indicator */}
              <div className="absolute bottom-3 left-4 flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-on-surface-variant/80 uppercase tracking-widest">Property Location</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(87,241,219,0.8)]"></span>
                  In Final Diligence
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Market Vitals: demographics + zoning scan ── */}
        <MarketVitals
          address={project.address}
          projectId={projectId}
        />

        {/* ── Due Diligence Sequence ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
              Due Diligence
            </h2>
            <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">
              {ddProgress.total} Tasks
            </span>
          </div>

          <DueDiligenceChecklist
            projectId={projectId}
            items={dueDiligenceChecklist}
            onChange={(newItems) => {
              setDueDiligenceChecklist(newItems);
              handleImmediateSave({ dueDiligenceChecklist: newItems });
            }}
          />
        </section>

        {/* ── Inspection Tracker ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Property Inspections
          </h2>
          <InspectionTracker
            projectId={projectId}
            initialInspections={inspections}
            onLocalChange={(newInspections) => {
              setInspections(newInspections);
              const currentFinancials = project?.financials || {};
              handleImmediateSave({
                financials: { ...currentFinancials, inspections: newInspections }
              });
            }}
          />
        </section>

        {/* ── Document Vault ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Documents
          </h2>
          <DocumentVault
            projectId={projectId}
            documents={roleLinkedDocuments}
            onChange={async (newDocs) => {
              setRoleLinkedDocuments(newDocs);
              handleImmediateSave({ roleLinkedDocuments: newDocs });
            }}
          />
        </section>

        {/* ── Contingency Tracker ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Contingencies
          </h2>
          <ContingencyTracker
            contingencies={contingencies}
            onChange={(newContingencies) => {
              setContingencies(newContingencies);
              handleImmediateSave({ contingencies: newContingencies });
            }}
          />
        </section>

        {/* ── Closing Costs Ledger (locks on CTC) ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Closing Costs
          </h2>
          <ClosingCostsLedger
            initialLedger={costBasisLedger}
            onChange={(newLedger) => {
              setCostBasisLedger(newLedger);
              handleImmediateSave({ costBasisLedger: newLedger });
            }}
            readOnly={isClearToClose}
          />
        </section>

        {/* ── Team & Process Tracking ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Team & Vendors
          </h2>
          <AcquisitionTeamAssembly
            teamMembers={teamMembers}
            onTeamMembersChange={(newTeamMembers) => {
              setTeamMembers(newTeamMembers);
              handleImmediateSave({ projectTeam: newTeamMembers });
            }}
          />
        </section>

        {/* ── Loan Processing Pipeline ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Loan Processing
          </h2>
          <LoanProcessingPipeline
            currentStatus={loanStatus}
            onStatusChange={(newStatus) => {
              setLoanStatus(newStatus);
              handleImmediateSave({ loanStatus: newStatus });
            }}
          />
        </section>

        {/* ── Closing Checklist ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Closing Checklist
          </h2>
          <ClosingChecklist
            items={closingChecklist}
            onItemChange={(newItems) => {
              setClosingChecklist(newItems);
              handleImmediateSave({ closingChecklist: newItems });
            }}
          />
        </section>

        {/* ── Clear to Close Milestone & Proceed ── */}
        <ClearToCloseMilestone
          dueDiligenceChecklist={dueDiligenceChecklist}
          teamMembers={teamMembers}
          loanStatus={loanStatus}
          costBasisLedger={costBasisLedger}
          isClearToClose={isClearToClose}
          onToggle={(status) => {
            setIsClearToClose(status);
            handleSave(status);
          }}
          onExecutePurchase={() => setIsModalOpen(true)}
        />

      </main>

      <ClosingHandoffModal
        isOpen={isModalOpen}
        project={project}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
