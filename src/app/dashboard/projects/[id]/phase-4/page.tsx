'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { projectsService } from '@/lib/firebase/projects';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { usePhaseAccess } from '@/hooks/usePhaseAccess';
import { PhaseAccessGuard } from '@/components/project/PhaseAccessGuard';
import { closeProjectAndArchiveServerAction } from '@/actions';
import toast from 'react-hot-toast';
import type { ProjectFinancials, ValuationEntry } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import ExitStrategyFork from '@/components/exit/ExitStrategyFork';
import { DispositionLedger } from '@/components/project/DispositionLedger';
import { SettlementLedger } from '@/components/project/SettlementLedger';
import { RentalOperationsLedger } from '@/components/project/RentalOperationsLedger';
import { ListingCRMTracker } from '@/components/project/ListingCRMTracker';
import { MarketingListingLedger } from '@/components/project/MarketingListingLedger';
import PhotographyUploadManager from '@/components/exit/PhotographyUploadManager';
import { TotalAllInCostCard } from '@/components/project/TotalAllInCostCard';
import { NetRealizedProfitCard } from '@/components/project/NetRealizedProfitCard';
import { DocumentVault } from '@/components/project/DocumentVault';
import NetProceedsCard from '@/components/exit/NetProceedsCard';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import RentRollCard from '@/components/project/RentRollCard';
import LeaseOperationsCard from '@/components/project/LeaseOperationsCard';
import SaleOperationsCard from '@/components/project/SaleOperationsCard';
import OperatingActualsCard from '@/components/project/OperatingActualsCard';
import { computeAutopsyMetrics, computeCapitalGainsTax } from '@/lib/math/calculatorUtils';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';
import { computeScheduleE } from '@/lib/tax/scheduleE';
import { aggregateScheduleE } from '@/lib/tax/portfolioSummary';
import { generateScheduleEPdf } from '@/lib/tax/pdfGenerator';
/* ── Structured MetricResult wrappers ── */
import { MetricReadout } from '@/components/metrics/MetricReadout';
import type { MetricResult } from '@/lib/metrics/types';
import { ValuationHistory } from '@/components/project/ValuationHistory';
import { CurrentValueTracker } from '@/components/project/CurrentValueTracker';
import { ActualScorecard } from '@/components/project/ActualScorecard';
import CrowdfundingReconciliation from '@/components/exit/CrowdfundingReconciliation';


/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-4 — Closing & Exit Workspace

   Stitch Schemas: c442a569 (Exit Phase) + 650e166b (Typography)
   "Luminous Glass" dark mode — single-column mobile-first stack.

   Phase 4 accent: #454955 (primary / teal) — same as global primary
   Gold accent: #ffd1aa (tertiary) — for IRR hero card
   All save/close logic 100% preserved from original.
   ═══════════════════════════════════════════════════════════════ */

const PHASE_COLOR = '#454955';
const PHASE_GLOW  = 'rgba(69, 73, 85, 0.4)';

type ExitPath = 'Sell' | 'Rent' | 'Refinance';

export default function Phase4WorkspacePage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useAuth();
  const projectId = params.id as string;

  const { project, loading, refresh } = useWorkspaceProject();
  const { canView, canEdit, loading: accessLoading } = usePhaseAccess('phase-4');
  const [localProject, setLocalProject] = useState<typeof project>(null);

  useEffect(() => {
    if (project) setLocalProject(project);
  }, [project]);

  const [isSaving, setIsSaving] = useState(false);
  const [metricsScope, setMetricsScope] = useState<'property' | 'myShare'>('property');
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  /* ── Computed: Autopsy metrics from real data ── */
  const metrics = useMemo(() => {
    const srcProject = localProject || project;
    if (!srcProject) return { basis: 0, capEx: 0, holding: 0 };
    const autopsy = computeAutopsyMetrics(srcProject);
    return {
      basis: autopsy.purchasePrice + autopsy.acquisitionCosts,
      capEx: autopsy.actualRehabCost > 0 ? autopsy.actualRehabCost : autopsy.projectedRehabCost,
      holding: autopsy.holdingCosts
    };
  }, [localProject, project]);

  /* ── Computed: Full autopsy for realized metrics ── */
  const autopsy = useMemo(() => {
    const srcProject = localProject || project;
    if (!srcProject) return null;
    return computeAutopsyMetrics(srcProject);
  }, [localProject, project]);

  /* ── Computed: Live derived metrics ── */
  const liveMetrics = useMemo(() => {
    const srcProject = localProject || project;
    if (!srcProject?.financials) return null;
    return deriveAllMetrics(
      srcProject.financials,
      srcProject.financials.estimatedCurrentValue,
      srcProject.dispositionType,
      srcProject.currentPhase,
      srcProject.createdAt
    );
  }, [localProject, project]);

  /* ── Computed: Tax estimate ── */
  const taxEstimate = useMemo(() => {
    const srcProject = localProject || project;
    if (!srcProject) return null;
    return computeCapitalGainsTax(srcProject);
  }, [localProject, project]);

  /* ── Computed: IRR ── */
  const irr = useMemo((): number => {
    const srcProject = localProject || project;
    const fin = srcProject?.financials;
    if (!fin) return 0;
    try {
      const totalCashInvested = fin.totalCashInvested || Math.max(0, (fin.purchasePrice || 0) - (fin.loanAmount || 0));
      const annualGrossRent = (fin.monthlyGrossRent || 0) * 12;
      const annualExpenses = ((fin.operatingExpenseTaxes || 0) + (fin.operatingExpenseInsurance || 0)) * 12;
      const annualCashFlow = annualGrossRent - annualExpenses;
      const holdYears = Math.max(1, Math.round((fin.projectedHoldTimeMonths || 60) / 12));
      const purchasePrice = fin.purchasePrice || 0;
      const appreciation = fin.annualAppreciationPercent || 3;
      const loanAmount = fin.loanAmount || 0;
      const loanRate = fin.loanInterestRate || 0;
      const loanTerm = fin.loanTermYears || 30;
      const cashFlows = buildIRRCashFlows(
        totalCashInvested, annualCashFlow, holdYears,
        purchasePrice, appreciation, loanAmount, loanRate, loanTerm
      );
      return computeIRR(cashFlows) ?? 0;
    } catch { return 0; }
  }, [localProject, project]);

  /* ── Structured MetricResult computations ── */
  const irrResult: MetricResult = useMemo(() => {
    const srcProject = localProject || project;
    const fin = srcProject?.financials as any;
    if (!fin) return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['project'] } as MetricResult;
    const missing = [];
    const purchasePrice = fin.purchasePrice || 0;
    const rent = fin.monthlyGrossRent || fin.monthlyRent || 0;
    if (!(purchasePrice > 0)) missing.push('financials.purchasePrice');
    if (!(rent > 0)) missing.push('financials.monthlyGrossRent');
    if (missing.length > 0) return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: missing } as MetricResult;
    return {
      value: liveMetrics?.irr !== null && liveMetrics?.irr !== undefined ? liveMetrics.irr * 100 : null,
      state: 'actual',
      inputsUsed: {
        'financials.purchasePrice': purchasePrice,
        'financials.monthlyGrossRent': rent,
      },
      inputsMissing: [],
    } as MetricResult;
  }, [localProject, project, liveMetrics]);

  const appreciationResult: MetricResult = useMemo(() => {
    const srcProject = localProject || project;
    const fin = srcProject?.financials as any;
    if (!fin) return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['project'] } as MetricResult;
    const missing = [];
    const purchasePrice = fin.purchasePrice || 0;
    if (!(purchasePrice > 0)) missing.push('financials.purchasePrice');
    if (missing.length > 0) return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: missing } as MetricResult;
    return {
      value: liveMetrics?.annualizedAppreciation ?? null,
      state: 'actual',
      inputsUsed: {
        'financials.purchasePrice': purchasePrice,
      },
      inputsMissing: [],
    } as MetricResult;
  }, [localProject, project, liveMetrics]);

  const cocResult: MetricResult = useMemo(() => {
    const srcProject = localProject || project;
    const fin = srcProject?.financials as any;
    if (!fin) return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['project'] } as MetricResult;
    const missing = [];
    const purchasePrice = fin.purchasePrice || 0;
    const rent = fin.monthlyGrossRent || fin.monthlyRent || 0;
    if (!(purchasePrice > 0)) missing.push('financials.purchasePrice');
    if (!(rent > 0)) missing.push('financials.monthlyGrossRent');
    if (missing.length > 0) return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: missing } as MetricResult;
    return {
      value: liveMetrics?.cashOnCashReturn ?? null,
      state: 'actual',
      inputsUsed: {
        'financials.purchasePrice': purchasePrice,
        'financials.monthlyGrossRent': rent,
      },
      inputsMissing: [],
    } as MetricResult;
  }, [localProject, project, liveMetrics]);

  /* ── Realized state detection ── */
  const isRealized = !!((project as any)?.reiStatus === 'realized' || (project?.financials as any)?.exitRealized || project?.status?.toLowerCase() === 'exited');
  const closedAtDate = (project as any)?.closedAt
    ? new Date((project as any).closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  /* ── Total return (absolute $) ── */
  const totalReturn: MetricResult = useMemo(() => {
    if (!autopsy) return { value: null, state: 'incomplete' as const, inputsUsed: {} as Record<string, number>, inputsMissing: ['autopsy'] };
    const state: MetricResult['state'] = isRealized ? 'realized' : (project?.currentPhase === 3 ? 'live' : 'projected');
    return {
      value: Math.round(autopsy.netProfit),
      state,
      inputsUsed: {
        'financials.grossSalePrice': autopsy.grossSalePrice ?? 0,
        'financials.totalCostBasis': autopsy.totalCostBasis ?? 0,
      },
      inputsMissing: [],
    };
  }, [autopsy, isRealized, project?.currentPhase]);

  /* ── Confirm Sale (live → realized) handler ── */
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const handleConfirmSale = useCallback(async () => {
    if (!project || !user || isRealized) return;
    setIsConfirmingSale(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/exit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          realized: true,
          financials: {
            actualSalePrice: localProject?.financials?.actualSalePrice
              || localProject?.financials?.projectedSalePrice
              || project.financials?.estimatedARV || 0,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to confirm sale');
      }
      toast.success('Deal marked as Realized — all metrics are now final.');
      refresh();
    } catch (error: any) {
      console.error('Failed to confirm sale:', error);
      toast.error(error.message || 'Failed to confirm sale');
    } finally {
      setIsConfirmingSale(false);
    }
  }, [project, user, projectId, localProject, isRealized, refresh]);

  const strategy = project?.dispositionType === 'LEASE'
    ? 'Lease'
    : project?.dispositionType === 'RENT'
    ? 'Rent'
    : (localProject?.financials?.exitStrategyType || 'Sell');
  const ownershipPct = localProject?.financials?.ownershipPercentage ?? 100;

  const handleStrategyChange = (next: 'Sell' | 'Rent' | 'Lease') => {
    if (!project) return;
    const disp = next === 'Lease' ? 'LEASE' : next === 'Rent' ? 'RENT' : 'SALE';
    projectsService.updateProject(projectId, {
      dispositionType: disp,
      financials: { 
        ...project.financials, 
        exitStrategyType: next === 'Lease' ? 'Rent' : next 
      }
    }).then(() => refresh()).catch(console.error);
  };

  const handleAddValuation = async (newEntry: ValuationEntry) => {
    if (!project) return;
    try {
      const currentList = project.financials?.current_value || [];
      const updatedList = [...currentList, newEntry];
      
      const sorted = [...updatedList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestValue = sorted[0]?.value || 0;

      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          current_value: updatedList,
          estimatedCurrentValue: latestValue
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to add valuation:', err);
      toast.error('Failed to add valuation');
    }
  };

  const handleDeleteValuation = async (id: string) => {
    if (!project) return;
    try {
      const currentList = project.financials?.current_value || [];
      const updatedList = currentList.filter(v => v.id !== id);
      
      const sorted = [...updatedList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestValue = sorted[0]?.value || 0;

      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          current_value: updatedList,
          estimatedCurrentValue: latestValue
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to delete valuation:', err);
      toast.error('Failed to delete valuation');
    }
  };

  const handleFinancialsChange = (updated: Partial<ProjectFinancials>) => {
    if (!localProject) return;
    setLocalProject({
      ...localProject,
      financials: {
        ...localProject.financials,
        ...updated
      } as ProjectFinancials
    });
  };

  const handleSaveFinancials = async (derived?: Partial<ProjectFinancials>) => {
    if (!project) return;
    setIsSaving(true);
    try {
      let currentLocal = localProject;
      if (derived && localProject) {
        currentLocal = {
          ...localProject,
          financials: { ...localProject.financials, ...derived } as ProjectFinancials
        };
        setLocalProject(currentLocal);
      }
      const payload = currentLocal?.financials || project.financials;
      await updateProjectFinancials(projectId, payload);
      refresh();
    } catch (err) {
      console.error('Failed to save financials:', err);
      if (project) setLocalProject(project);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentsChange = async (newDocs: any[]) => {
    if (!project) return;
    if (localProject) {
      setLocalProject({ ...localProject, roleLinkedDocuments: newDocs });
    }
    try {
      await projectsService.updateProject(projectId, { roleLinkedDocuments: newDocs });
      refresh();
    } catch (err) {
      console.error('Failed to save documents:', err);
      if (project) setLocalProject(project);
    }
  };

  const handleCloseProject = async () => {
    if (!project || !user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const orgId = project.organizationId;
      if (!orgId) throw new Error("Organization ID is missing.");
      await closeProjectAndArchiveServerAction(idToken, projectId, orgId, strategy as 'Sell' | 'Rent');
      toast.success('Project successfully closed and archived');
      refresh();
      router.push('/dashboard/projects');
    } catch (error: any) {
      console.error('Failed to close project', error);
      toast.error(error.message || 'Failed to close project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateTaxReport = async () => {
    if (!taxEstimate || !project) return;

    const fin = project.financials ?? {};
    const addr = project.address || project.name || 'Unknown Property';
    const taxYear = fin.acquisitionDate
      ? new Date(fin.acquisitionDate as any).getFullYear() + 1
      : new Date().getFullYear();

    const loadToast = toast.loading('Generating real Schedule E PDF...');
    try {
      // 1. Fetch live ledger items
      const ledgerItems = await projectsService.getLedgerItems(projectId);

      // 2. Compute Schedule E Preview
      const preview = computeScheduleE(project, ledgerItems, taxYear);

      // 3. Compute aggregated stats
      const aggregated = aggregateScheduleE([preview], taxYear);

      // 4. Generate PDF bytes via generateScheduleEPdf
      const pdfBytes = generateScheduleEPdf([preview], aggregated, taxYear);

      // 5. Convert Uint8Array to Blob and download
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ScheduleE_${addr.replace(/[^a-zA-Z0-9]/g, '_')}_${taxYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Schedule E PDF downloaded — share with your CPA.', { id: loadToast });
    } catch (error) {
      console.error('Failed to generate tax report PDF:', error);
      toast.error('Failed to generate Schedule E PDF', { id: loadToast });
    }
  };

  /* ── Format helpers ── */
  const fmtCurrency = (val?: number) => {
    if (!val && val !== 0) return '—';
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };
  const fmtDollar = (val?: number) => {
    if (!val && val !== 0) return '—';
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
    return `$${val.toFixed(0)}`;
  };
  const fmtPct = (val?: number) => {
    if (!val && val !== 0) return '—';
    return `${val.toFixed(1)}%`;
  };

  /* ── Apply ownership share ── */
  const shareMultiplier = metricsScope === 'myShare' ? ownershipPct / 100 : 1;

  /* ── Loading state ── */
  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-2 rounded-full animate-spin"
            style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9DA0]">
            Loading Workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-[#9E9DA0]">Project not found.</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="text-xs font-bold uppercase tracking-[0.12em] underline text-[#9E9DA0]"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <PhaseAccessGuard phaseId="phase-4" phaseName="Phase 4: Exit">
      <div className="min-h-screen bg-[#0d0a0b] relative">

      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] bg-[#454955]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[400px] h-[400px] bg-[#454955]/5 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Locked / Realized State Banner ── */}
      {(project.locked || isRealized) && (
        <div className="sticky top-0 z-[100] bg-[#454955]/10 border-b border-[#454955]/30 py-2 px-6 flex items-center justify-center gap-3 backdrop-blur-xl">
          <span className="material-symbols-outlined text-[#454955] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#454955]">
            {project.locked
              ? 'Immutable Record: Project Complete & Archived'
              : `Project Complete · Sale Closed ${closedAtDate || ''}`}
          </span>
          {isRealized && !project.locked && (
            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-blue-400/15 text-blue-300">
              COMPLETE
            </span>
          )}
        </div>
      )}

      {/* ── Explainer Video Banner ── */}
      <PhaseExplainerVideo
        phaseKey="phase-4"
        title="Understanding Phase 4: Closing & Exit"
        description="Welcome to the final phase. This is the culmination of your project where you execute your exit strategy—either selling the property for a lump-sum profit or refinancing it into a long-term rental portfolio."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="3:15"
      />

      {/* ═══════════════════════════════════════════════════════
          Workspace Body — Luminous Glass Layout
          ═══════════════════════════════════════════════════════ */}
      <main className="max-w-[1280px] mx-auto px-5 md:px-10 py-10 space-y-8">

        {/* ── Guided Exit Wizard CTA Callout ── */}
        <section className="glass-card rounded-2xl p-5 border border-[#7A9EAA]/25 bg-[#7A9EAA]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#7A9EAA]">task_alt</span> Guided Exit & Disposition Wizard
            </h3>
            <p className="text-xs text-slate-400">
              Evaluate exit strategies (Sell, Refinance, Hold Long-Term), follow preparation checklists, manage showing feedback or refi terms, and run final payouts.
            </p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}/phase-4/wizard`)}
            className="px-5 py-2.5 bg-[#7A9EAA] hover:bg-[#7A9EAA]/95 text-black font-extrabold uppercase tracking-wider text-[10px] rounded-xl transition-all shadow-[0_0_12px_rgba(122,158,170,0.2)] shrink-0"
          >
            Launch Exit Wizard
          </button>
        </section>

        {/* ── Strategy Selector (Stitch: pill toggle bar) ── */}
        <section className="space-y-2">
          <h2 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase tracking-widest">Exit Strategy</h2>
          <div className="glass-card rounded-2xl p-2 inline-flex items-center gap-1">
            {(['Sell', 'Rent', 'Refinance'] as ExitPath[]).map((path) => {
              const isActive = strategy === path || (path === 'Refinance' && strategy !== 'Sell' && strategy !== 'Rent');
              return (
                <button
                  key={path}
                  onClick={() => {
                    if (path === 'Sell' || path === 'Rent') handleStrategyChange(path);
                  }}
                  className={`px-8 py-3 rounded-xl text-[14px] leading-[16px] tracking-[0.02em] font-semibold transition-all ${
                    isActive
                      ? 'bg-[#454955]/20 text-[#454955]'
                      : 'text-[#9E9DA0] hover:bg-white/5'
                  }`}
                  style={isActive ? { boxShadow: `0 0 20px -5px ${PHASE_GLOW}` } : {}}
                >
                  {path}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Cost Basis Summary (3-column) ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Capitalized Basis', value: metrics.basis, desc: 'Purchase + Acquisition' },
            { label: 'Total CapEx', value: metrics.capEx, desc: 'Finalized rehab & renovations' },
            { label: 'Holding Costs', value: metrics.holding, desc: 'Accrued carry & maintenance' }
          ].map((m, i) => (
            <div key={i} className="glass-card p-5 rounded-xl flex flex-col gap-2 transition-all hover:border-white/20 group">
              <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase">{m.label}</span>
              <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0] tabular-nums group-hover:text-[#454955] transition-colors">
                {fmtCurrency(Math.round(m.value * shareMultiplier))}
              </span>
              <span className="text-[10px] text-[#9E9DA0]/60">{m.desc}</span>
            </div>
          ))}
        </section>

        {/* ── Exit Assumptions Quick-View (projected sale vs. cost basis) ── */}
        {!isRealized && (
          <section className="glass-card rounded-2xl p-6 space-y-4 border border-[#454955]/10">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-[#9E9DA0] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffd1aa]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                Exit Assumptions
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400">
                PROJECTED
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] text-[#9E9DA0] uppercase tracking-wider font-medium">Projected Sale Price</p>
                <p className="text-[20px] font-semibold text-[#9E9DA0] tabular-nums">
                  {fmtCurrency(localProject?.financials?.projectedSalePrice || localProject?.financials?.estimatedARV || project.financials?.estimatedARV || 0)}
                </p>
                <p className="text-[9px] text-[#9E9DA0]/50">vs. Basis: {fmtCurrency(Math.round(metrics.basis))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-[#9E9DA0] uppercase tracking-wider font-medium">Hold Period</p>
                <p className="text-[20px] font-semibold text-[#9E9DA0] tabular-nums">
                  {Math.round((localProject?.financials?.projectedHoldTimeMonths || project.financials?.projectedHoldTimeMonths || 60) / 12)}y
                  <span className="text-[14px] text-[#9E9DA0] ml-1">
                    ({localProject?.financials?.projectedHoldTimeMonths || project.financials?.projectedHoldTimeMonths || 60}mo)
                  </span>
                </p>
              </div>
              <div className="space-y-1">
                <MetricReadout label="Projected IRR" result={irrResult} format="percent" accentColor="#ffd1aa" compact />
              </div>
            </div>
            {/* Confirm Sale CTA */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={handleConfirmSale}
                disabled={isConfirmingSale || project.locked}
                className="px-8 py-3 rounded-xl bg-[#454955]/10 border border-[#454955]/30 text-[#454955] font-semibold text-[14px] leading-[16px] hover:bg-[#454955]/20 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {isConfirmingSale ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>Confirm Sale & Mark Realized</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-[#9E9DA0]/50 mt-2">This will lock all financial fields and transition metrics to Realized state.</p>
            </div>
          </section>
        )}

        {/* ── Realized Summary (read-only, all fields finalized) ── */}
        {isRealized && (
          <section className="glass-card rounded-2xl p-6 space-y-4 border border-blue-400/20" style={{ background: 'linear-gradient(90deg, rgba(96,165,250,0.05) 0%, transparent 100%)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-[#9E9DA0] flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-300" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Realized Performance Summary
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-blue-400/15 text-blue-300">
                REALIZED {closedAtDate ? `· ${closedAtDate}` : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Acquisition Price', value: fmtCurrency(project.financials?.purchasePrice || 0) },
                { label: 'Sale Price', value: fmtCurrency(project.financials?.actualSalePrice || project.financials?.estimatedARV || 0) },
                { label: 'Total Cash Invested', value: fmtCurrency(autopsy?.outOfPocketCash || 0) },
                { label: 'Total Rehab', value: fmtCurrency(autopsy?.actualRehabCost || 0) },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] text-[#9E9DA0] uppercase tracking-wider font-medium">{item.label}</p>
                  <p className="text-[18px] font-semibold text-[#9E9DA0] tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5">
              {[
                { label: 'Holding Costs', value: fmtCurrency(autopsy?.holdingCosts || 0) },
                { label: 'Selling Costs', value: fmtCurrency(autopsy?.sellClosingCosts || 0) },
                { label: 'Hold Period', value: autopsy?.holdDays ? `${autopsy.holdDays} days` : '—' },
                { label: 'Net Profit', value: fmtCurrency(autopsy?.netProfit || 0), accent: true },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] text-[#9E9DA0] uppercase tracking-wider font-medium">{item.label}</p>
                  <p className={`text-[18px] font-semibold tabular-nums ${
                    (item as any).accent
                      ? (autopsy && autopsy.netProfit >= 0 ? 'text-[#454955]' : 'text-[#ffb4ab]')
                      : 'text-[#9E9DA0]'
                  }`}>{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Main Layout Grid: Left (Execution) + Right (Metrics) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left Column: Exit Execution ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Strategy Fork (existing component) */}
            <ExitStrategyFork
              projectId={projectId}
              strategy={strategy as 'Sell' | 'Rent'}
              onStrategyChange={handleStrategyChange}
            />

            {/* ── Sell Path ── */}
            {strategy === 'Sell' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <NetRealizedProfitCard project={project} />

                <SaleOperationsCard
                  project={localProject || project}
                  refresh={refresh}
                  isLocked={project.locked}
                />

                <MarketingListingLedger
                  financials={localProject?.financials || project.financials || {}}
                  onChange={handleFinancialsChange}
                  onSave={() => handleSaveFinancials()}
                  isSaving={isSaving}
                  isLocked={project.locked}
                />

                <PhotographyUploadManager projectId={projectId} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ListingCRMTracker
                    financials={localProject?.financials || project.financials || {}}
                    onChange={handleFinancialsChange}
                    onSave={() => handleSaveFinancials()}
                    isSaving={isSaving}
                    isLocked={project.locked}
                  />
                  <DispositionLedger
                    financials={localProject?.financials || project.financials || {}}
                    onChange={handleFinancialsChange}
                    onSave={() => handleSaveFinancials()}
                    isSaving={isSaving}
                    isLocked={project.locked}
                  />
                </div>

                <SettlementLedger
                  financials={localProject?.financials || project.financials || {}}
                  onChange={handleFinancialsChange}
                  onSave={() => handleSaveFinancials()}
                  isSaving={isSaving}
                  isLocked={project.locked}
                />
              </div>
            )}

            {/* ── Rent Path ── */}
            {strategy === 'Rent' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <NetProceedsCard deal={localProject || project} />
                <RentalOperationsLedger
                  financials={localProject?.financials || project.financials || {}}
                  totalAllInCost={metrics.basis + metrics.capEx}
                  onChange={handleFinancialsChange}
                  onSave={(derived) => handleSaveFinancials(derived)}
                  isSaving={isSaving}
                  isLocked={project.locked}
                />
                <RentRollCard
                  project={localProject || project}
                  refresh={refresh}
                  isLocked={project.locked}
                />
                <OperatingActualsCard
                  project={localProject || project}
                  refresh={refresh}
                  isLocked={project.locked}
                />
                <CurrentValueTracker
                  projectId={projectId}
                  currentValue={localProject?.financials?.current_value || project?.financials?.current_value || []}
                  onAddValuation={handleAddValuation}
                  onDeleteValuation={handleDeleteValuation}
                />
              </div>
            )}

            {strategy === 'Lease' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <NetProceedsCard deal={localProject || project} />
                <LeaseOperationsCard
                  project={localProject || project}
                  refresh={refresh}
                  isLocked={project.locked}
                />
                <OperatingActualsCard
                  project={localProject || project}
                  refresh={refresh}
                  isLocked={project.locked}
                />
                <CurrentValueTracker
                  projectId={projectId}
                  currentValue={localProject?.financials?.current_value || project?.financials?.current_value || []}
                  onAddValuation={handleAddValuation}
                  onDeleteValuation={handleDeleteValuation}
                />
              </div>
            )}

            {/* ── All-In Cost Summary ── */}
            <TotalAllInCostCard project={project} />

            {/* ── Permanent Record Archive (Card E3.3) ── */}
            <div className="pt-4 border-t border-white/5">
              <DocumentVault
                projectId={projectId}
                documents={localProject?.roleLinkedDocuments || project.roleLinkedDocuments || []}
                onChange={handleDocumentsChange}
                categories={['Deed', 'Title Policy', 'Closing Sets', 'Warranties', 'Tax Documents']}
                title="Permanent Record Archive"
                description="Store deed, title policy, closing sets, warranties, and tax documents for the project's permanent history."
              />
            </div>
          </div>

          {/* ── Right Column: Realized Performance ── */}
          <div className="lg:col-span-5 space-y-4">

            <ActualScorecard
              project={localProject || project}
              strategy={strategy as 'Sell' | 'Rent' | 'Lease'}
              liveMetrics={liveMetrics}
              autopsy={autopsy}
              metricsScope={metricsScope}
              setMetricsScope={setMetricsScope}
              isRealized={isRealized}
            />

            {/* Generate Tax Report CTA (Stitch: full-width button) */}
            <div className="glass-card rounded-2xl p-4 border border-[#454955]/20 bg-[#262328]/10">
              <button
                onClick={handleGenerateTaxReport}
                className="w-full py-3.5 rounded-xl border border-white/20 text-[#9E9DA0] font-semibold text-[16px] leading-[24px] hover:bg-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <span className="material-symbols-outlined">request_quote</span>
                Generate Tax Report
              </button>
            </div>

            {isRealized && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CrowdfundingReconciliation deal={localProject || project} />
                
                {/* ── Reinvestment Notice ── */}
                <div className="glass-card rounded-2xl p-5 border border-[#454955]/20 bg-[#262328]/10 space-y-3">
                  <div className="flex items-center gap-2 text-text-primary">
                    <span className="material-symbols-outlined text-[#ffd1aa]">info</span>
                    <h4 className="text-[12px] font-bold uppercase tracking-wider">Reinvestment Notice</h4>
                  </div>
                  <p className="text-[12px] leading-[18px] text-[#9E9DA0]">
                    Reinvestment of proceeds is classified as a portfolio-level event. Since a new acquisition represents a new project rather than a subsequent phase of this deal, any redeployed equity will be tracked outside of this workspace.
                  </p>
                </div>
              </div>
            )}

            {/* Live Valuation History (AVM) timeline */}
            <ValuationHistory projectId={projectId} />

            {/* ── Tax Snapshot Card ── */}
            {taxEstimate && (

              <div className="glass-card rounded-xl p-5 space-y-3">
                <h4 className="text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-[#9E9DA0] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#7A9EAA]">receipt_long</span>
                  Tax Intelligence
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[12px] leading-[14px] tracking-[0.05em] font-medium text-[#9E9DA0]">Hold Period</span>
                    <p className="text-[14px] leading-[16px] font-semibold text-[#9E9DA0]">{taxEstimate.holdingPeriodDays} days</p>
                  </div>
                  <div>
                    <span className="text-[12px] leading-[14px] tracking-[0.05em] font-medium text-[#9E9DA0]">Classification</span>
                    <p className={`text-[14px] leading-[16px] font-semibold ${taxEstimate.isLongTerm ? 'text-[#454955]' : 'text-[#ffb4ab]'}`}>
                      {taxEstimate.isLongTerm ? 'Long-Term' : 'Short-Term'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[12px] leading-[14px] tracking-[0.05em] font-medium text-[#9E9DA0]">Est. Tax Rate</span>
                    <p className="text-[14px] leading-[16px] font-semibold text-[#9E9DA0]">{taxEstimate.estimatedTaxRate}%</p>
                  </div>
                  <div>
                    <span className="text-[12px] leading-[14px] tracking-[0.05em] font-medium text-[#9E9DA0]">Tax Liability</span>
                    <p className="text-[14px] leading-[16px] font-semibold text-[#ffb4ab]">
                      {fmtCurrency(Math.round(taxEstimate.estimatedTaxLiability * shareMultiplier))}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <span className="text-[12px] leading-[14px] tracking-[0.05em] font-medium text-[#9E9DA0]">Net After Tax</span>
                  <p className="text-[24px] leading-[32px] font-semibold text-[#454955] tabular-nums">
                    {fmtCurrency(Math.round(taxEstimate.netAfterTax * shareMultiplier))}
                  </p>
                </div>
              </div>
            )}

            {/* ── Project Metadata Card ── */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-[#454955]/10 flex items-center justify-between border-b border-[#454955]/20">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#454955]">Project Metadata</h4>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                  project.locked ? 'bg-[#454955]/20 text-[#454955]' : 'bg-white/10 text-[#9E9DA0]'
                }`}>
                  {project.status}
                </span>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: 'Lifecycle State', value: project.phaseStatus || 'Closing & Exit' },
                  { label: 'Primary Owner', value: user?.displayName || project.ownerUid },
                  { label: 'Ownership', value: `${ownershipPct}%` }
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-[12px] leading-[14px] tracking-[0.05em] font-medium text-[#9E9DA0]">{row.label}</span>
                    <span className="text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-[#9E9DA0]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Exit Intelligence ── */}
            <div className="glass-card rounded-xl p-5 border border-dashed border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-[#7A9EAA]">psychology</span>
                <h4 className="text-[14px] leading-[16px] tracking-[0.02em] font-semibold text-[#9E9DA0]">Exit Intelligence</h4>
              </div>
              <p className="text-[12px] leading-[20px] text-[#9E9DA0]">
                Our calculation engine uses capital-weighted aggregation to derive your final net realized profit. Every staging fee, lender payoff, and tax proratio is factored into the terminal ROI.
              </p>
            </div>
          </div>
        </div>

        {/* ── Final Submission Hub (Stitch: centered hero CTA) ── */}
        <section className="mt-12 pt-12 border-t border-white/5 flex flex-col items-center text-center gap-8">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#454955]/5 border border-[#454955]/10">
              <div className={`w-2 h-2 rounded-full ${project.locked ? 'bg-[#454955]' : 'bg-[#454955] animate-pulse'}`} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#454955]">
                {project.locked ? 'Project Complete' : 'Ready for Completion'}
              </span>
            </div>
            <h2 className="text-[32px] leading-[40px] font-bold tracking-[-0.01em] text-[#9E9DA0]">
              Terminal Project Reconciliation
            </h2>
            <p className="text-[14px] leading-[20px] text-[#9E9DA0] max-w-lg mx-auto">
              Closing this project will freeze all financial data, mark the project as complete, compute final equity distributions, and transition it to an immutable read-only archive. Reinvestment of proceeds is managed as a portfolio event.
            </p>
          </div>

          <button
            onClick={handleCloseProject}
            disabled={isSaving || project.locked}
            className={`relative px-16 py-5 rounded-xl text-[14px] leading-[16px] font-bold uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-3 ${
              project.locked
                ? 'bg-white/5 text-[#9E9DA0] cursor-not-allowed'
                : 'bg-[#454955] text-[#0d0a0b] hover:scale-105 active:scale-95'
            }`}
            style={!project.locked ? { boxShadow: `0 20px 50px rgba(69, 73, 85,0.3)` } : {}}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
                <span>Aggregating Portfolio Data…</span>
              </>
            ) : project.locked ? (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span>Archived & Synchronized</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">description</span>
                <span>Close Project & Archive</span>
              </>
            )}
          </button>
        </section>

      </main>

      {/* ═══════════════════════════════════════════════════════
          Sticky Footer — Crown Jewel Exit Metrics
          Glass-card bar pinned to bottom with IRR, Total Return,
          and Appreciation Rate.
          ═══════════════════════════════════════════════════════ */}
      <div className="sticky bottom-0 z-50 border-t border-white/10 bg-[#0d0a0b]/80 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Phase chip */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRealized ? 'bg-blue-400' : 'bg-[#454955] animate-pulse'}`} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E9DA0]">
                {isRealized ? `Realized · ${closedAtDate || 'Closed'}` : 'Phase 4 · Exit'}
              </span>
            </div>

            {/* Center: Key metrics trio */}
            <div className="flex items-center gap-6">
              {/* IRR */}
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">IRR</p>
                <p className="text-[20px] font-bold text-[#ffd1aa] tabular-nums">
                  {irrResult.value !== null ? `${irrResult.value.toFixed(1)}%` : (irr > 0 ? `${irr.toFixed(1)}%` : '—')}
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-white/10" />

              {/* Total Return */}
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">Total Return</p>
                <p className={`text-[20px] font-bold tabular-nums ${autopsy && autopsy.netProfit >= 0 ? 'text-[#454955]' : 'text-[#ffb4ab]'}`}>
                  {autopsy ? fmtDollar(Math.round(autopsy.netProfit * shareMultiplier)) : '—'}
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-white/10" />

              {/* Appreciation Rate */}
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">Appreciation</p>
                <p className="text-[20px] font-bold text-[#9E9DA0] tabular-nums">
                  {appreciationResult.value !== null ? `${appreciationResult.value.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>

            {/* Right: State pill */}
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              isRealized
                ? 'bg-blue-400/15 text-blue-300'
                : 'bg-amber-500/15 text-amber-400'
            }`}>
              {isRealized ? 'REALIZED' : 'PROJECTED'}
            </span>
          </div>
        </div>
      </div>
      </div>
    </PhaseAccessGuard>
  );
}
