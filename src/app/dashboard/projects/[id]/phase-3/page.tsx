'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsService } from '@/lib/firebase/deals';
import { RehabExpense, HoldingCostEntry, SiteVisitLog, ScopeOfWorkItem, ContractorBid, DrawScheduleItem, RehabTask, ProjectFinancials, RehabTier } from '@/types/schema';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { RehabExpenseTracker } from '@/components/project/RehabExpenseTracker';
import { HoldingCostsTracker } from '@/components/project/HoldingCostsTracker';
import { SiteVisitLogTracker } from '@/components/project/SiteVisitLogTracker';
import { ScopeOfWorkForm } from '@/components/project/ScopeOfWorkForm';
import { ContractorBids } from '@/components/project/ContractorBids';
import GCBidUploader from '@/components/GCBidUploader';
import { CapExComparativeTable } from '@/components/project/CapExComparativeTable';
import { RehabSequenceTracker } from '@/components/project/RehabSequenceTracker';
import { ContractorDrawSchedule } from '@/components/project/ContractorDrawSchedule';
import { RenovationsCompleteGate } from '@/components/project/RenovationsCompleteGate';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import { ExitStrategyToggle } from '@/components/project/ExitStrategyToggle';
import { RentalSetupForm } from '@/components/project/RentalSetupForm';
import { DaysHeldClock } from '@/components/project/DaysHeldClock';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

import { MetricReadout } from '@/components/metrics/MetricReadout';
import type { MetricResult } from '@/lib/metrics/types';
import toast from 'react-hot-toast';
import { ProjectAtAGlanceSidebar } from '@/components/project/ProjectAtAGlanceSidebar';
import { ValuationHistory } from '@/components/project/ValuationHistory';



/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-3 — Hold & Rehab Workspace

   Stitch Schemas: b795e973 (Hold Phase) + df9efa99 (Operations)
   "Luminous Glass" dark design — single-column mobile-first stack.

   Phase 3 color accent: #454955 (primary / teal) — Hold = active phase
   All save logic 100% preserved from original.
   ═══════════════════════════════════════════════════════════════ */

const PHASE_COLOR = '#454955';
const PHASE_GLOW  = 'rgba(69, 73, 85, 0.4)';

/* ── Rehab Tier Definitions ── */
const REHAB_TIERS: { key: RehabTier; level: number; label: string; range: string }[] = [
  { key: 'Stage',                  level: 1, label: 'Stage',      range: '$1k–$5k' },
  { key: 'Refurbish',              level: 2, label: 'Refurbish',  range: '$5k–$20k' },
  { key: 'Renovate',               level: 3, label: 'Renovate',   range: '$20k–$100k' },
  { key: 'Gut',                    level: 4, label: 'Gut',        range: '$100k–$250k' },
  { key: 'Develop',                level: 5, label: 'Develop',    range: '$250k+' },
];

export default function Phase3RehabPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params.id as string;

  const { project, loading: isLoading, refresh } = useWorkspaceProject();

  const [isSaving, setIsSaving] = useState(false);
  const [rehabExpenses, setRehabExpenses] = useState<RehabExpense[]>([]);
  const [holdingCosts, setHoldingCosts] = useState<HoldingCostEntry[]>([]);
  const [siteVisitLogs, setSiteVisitLogs] = useState<SiteVisitLog[]>([]);
  const [scopeOfWork, setScopeOfWork] = useState<ScopeOfWorkItem[]>([]);
  const [contractorBids, setContractorBids] = useState<ContractorBid[]>([]);
  const [drawSchedule, setDrawSchedule] = useState<DrawScheduleItem[]>([]);
  const [rehabTasks, setRehabTasks] = useState<RehabTask[]>([]);
  const [daysHeld, setDaysHeld] = useState(0);

  useEffect(() => {
    if (!project) return;
    setRehabExpenses(project.rehabExpenses || []);
    setHoldingCosts(project.holdingCosts || []);
    setSiteVisitLogs(project.siteVisitLogs || []);
    setScopeOfWork(project.rehab?.scopeOfWork || []);
    setContractorBids(project.rehab?.contractorBids || []);
    setDrawSchedule(project.rehab?.drawSchedule || []);
    setRehabTasks(project.financials?.rehabTasks || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const startDate = project.financials?.holdStartDate || project.financials?.acquisitionDate || project.createdAt;
    if (!startDate) return;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    setDaysHeld(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [project?.financials?.holdStartDate, project?.financials?.acquisitionDate, project?.createdAt]);

  /* ── Computed: Budget vs Actual ── */
  const budgetMetrics = useMemo(() => {
    const totalSpent = rehabExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetLow = project?.financials?.rehabTierBudgetLow || 0;
    const budgetHigh = project?.financials?.rehabTierBudgetHigh || 0;
    const budget = budgetHigh || (project?.financials?.purchasePrice ? project.financials.purchasePrice * 0.1 : 0);
    const pct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
    const remaining = Math.max(0, budget - totalSpent);
    return { totalSpent, budget, budgetLow, budgetHigh, pct: Math.min(pct, 100), remaining };
  }, [rehabExpenses, project?.financials]);

  /* ── Computed: Holding Costs ── */
  const holdMetrics = useMemo(() => {
    const monthlyTotal = holdingCosts.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);
    const dailyBurn = monthlyTotal / 30;
    const totalBurned = dailyBurn * daysHeld;
    return { monthlyTotal, dailyBurn, totalBurned };
  }, [holdingCosts, daysHeld]);

  /* ── Computed: Live Project Metrics via deriveAllMetrics ── */
  const liveMetrics = useMemo(() => {
    if (!project?.financials) return null;
    return deriveAllMetrics(
      project.financials,
      project.financials.estimatedCurrentValue,
      project.dispositionType,
      project.currentPhase,
      project.createdAt
    );
  }, [project?.financials, project?.dispositionType, project?.currentPhase, project?.createdAt]);

  const wrapResult = (val: number | null): MetricResult => ({
    value: val,
    state: project?.currentPhase === 3 ? 'live' : project?.currentPhase === 4 ? 'realized' : 'projected',
    inputsUsed: {},
    inputsMissing: [],
  });

  const noiResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.noi ?? null), [liveMetrics, project?.currentPhase]);
  const occupancyResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.occupancyRate ?? null), [liveMetrics, project?.currentPhase]);
  const oerResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.oer ?? null), [liveMetrics, project?.currentPhase]);
  const cashFlowResult: MetricResult = useMemo(() => wrapResult(liveMetrics?.annualCashFlow ?? null), [liveMetrics, project?.currentPhase]);

  /* ── Derived NOI formula components for footer ── */
  const noiFormula = useMemo(() => {
    if (!project?.financials) return { grossIncome: 0, vacancyLoss: 0, opex: 0, noi: 0 };
    const fin = project.financials;
    const monthlyRent = fin.monthlyGrossRent ?? fin.projectedMonthlyRent ?? fin.projectedRent ?? 0;
    const grossIncome = monthlyRent * 12 + (fin.otherMonthlyIncome ?? 0) * 12;
    const vacancyPct = fin.vacancyRatePercent ?? fin.vacancyRate ?? 7;
    const vacancyLoss = (monthlyRent * 12) * (vacancyPct / 100);
    const noi = noiResult.value ?? 0;
    const opex = grossIncome - vacancyLoss - noi;
    return { grossIncome, vacancyLoss, opex, noi };
  }, [project?.financials, noiResult.value]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      await projectsService.updateProject(projectId, {
        rehabExpenses,
        holdingCosts,
        siteVisitLogs,
        rehab: {
          baseBudget: 0,
          contingencyBufferPercentage: 0.15,
          tasks: [],
          permits: [],
          pendingReceipts: [],
          drawRequests: [],
          ...(project.rehab || {}),
          scopeOfWork,
          contractorBids,
          drawSchedule
        },
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          rehabTasks
        }
      });
      toast.success('Phase 3 tracking saved!');
      refresh();
    } catch (error) {
      console.error('Error saving Phase 3:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletePhase = async () => {
    if (!project) return;
    try {
      await handleSave();
      await projectsService.updateProject(projectId, {
        phaseStatus: 'Phase 4: Closing & Exit',
        updatedAt: new Date()
      });
      toast.success('Phase 3 Complete! Transitioning to Phase 4...');
      router.push(`/dashboard/projects/${projectId}/phase-4`);
    } catch (error) {
      console.error('Error transitioning phase:', error);
      toast.error('Failed to complete phase');
    }
  };

  const handleStageChange = async (stage: 'Demolition' | 'Rough-In/MEP' | 'Finishes' | 'Staging' | 'Complete') => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        rehab: {
          baseBudget: 0, contingencyBufferPercentage: 0.15, tasks: [], permits: [],
          pendingReceipts: [], drawRequests: [],
          ...(project.rehab || {}),
          currentStage: stage,
        }
      });
      refresh();
    } catch (err) { console.error('Failed to update stage:', err); }
  };

  const handleTierChange = async (tier: RehabTier) => {
    if (!project) return;
    // Budget ranges per tier
    const budgetMap: Record<RehabTier, [number, number]> = {
      'Stage': [1000, 5000],
      'Refurbish': [5000, 20000],
      'Renovate': [20000, 100000],
      'Gut': [100000, 250000],
      'Develop': [250000, 1000000],
    };
    const [low, high] = budgetMap[tier] || [0, 0];
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          rehabTier: tier,
          rehabTierBudgetLow: low,
          rehabTierBudgetHigh: high,
        }
      });
      refresh();
      toast.success(`Rehab tier set to ${tier}`);
    } catch (err) {
      console.error('Failed to update tier:', err);
      toast.error('Failed to update rehab tier');
    }
  };

  const handleStrategyChange = async (strategy: 'Sell' | 'Rent') => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          exitStrategyType: strategy
        }
      });
      refresh();
      toast.success(`Exit strategy set to ${strategy}`);
    } catch (err) {
      console.error('Failed to update exit strategy:', err);
      toast.error('Failed to update strategy');
    }
  };

  const handleRentalSetupChange = async (updates: Partial<ProjectFinancials>) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, {
        financials: {
          ...project.financials,
          purchasePrice: project.financials?.purchasePrice || 0,
          estimatedARV: project.financials?.estimatedARV || 0,
          costs: project.financials?.costs || [],
          ...updates
        }
      });
      refresh();
    } catch (err) {
      console.error('Failed to update rental setup:', err);
      toast.error('Failed to update setup');
    }
  };

  const handleImmediateSave = async (updates: Record<string, any>) => {
    if (!project) return;
    try {
      await projectsService.updateProject(projectId, updates);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleDrawScheduleChange = async (newDraws: DrawScheduleItem[]) => {
    if (!project) return;

    // Detect newly paid draws (Paid status in newDraws but not in drawSchedule)
    const newlyPaidDraws = newDraws.filter(newDraw => {
      if (newDraw.status !== 'Paid') return false;
      const oldDraw = drawSchedule.find(d => d.id === newDraw.id);
      return !oldDraw || oldDraw.status !== 'Paid';
    });

    let updatedExpenses = [...rehabExpenses];

    if (newlyPaidDraws.length > 0) {
      newlyPaidDraws.forEach(draw => {
        // Trigger simulated bank transfer notification toast
        toast.success(`Bank transfer initiated: $${draw.amount.toLocaleString()} for "${draw.milestone}"`);

        // Automatically append matching expense entry to rehabExpenses ledger
        const newExpense: RehabExpense = {
          id: crypto.randomUUID(),
          category: 'Professional Labor',
          description: `Contractor Draw: ${draw.milestone}`,
          amount: draw.amount,
          vendor: 'General Contractor',
          paid: true,
          paidAt: new Date(),
          createdAt: new Date()
        };
        updatedExpenses.push(newExpense);
      });
      setRehabExpenses(updatedExpenses);
    }

    setDrawSchedule(newDraws);

    // Persist updates immediately
    try {
      await projectsService.updateProject(projectId, {
        rehabExpenses: updatedExpenses,
        rehab: {
          baseBudget: 0,
          contingencyBufferPercentage: 0.15,
          tasks: [],
          permits: [],
          pendingReceipts: [],
          drawRequests: [],
          ...(project.rehab || {}),
          scopeOfWork,
          contractorBids,
          drawSchedule: newDraws
        }
      });
      refresh();
    } catch (error) {
      console.error('Failed to auto-save draw schedule update:', error);
      toast.error('Failed to save draw schedule changes');
    }
  };

  /* ── Format helpers ── */
  const fmtDollar = (value?: number) => {
    if (!value && value !== 0) return '—';
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  const fmtCurrency = (value?: number) => {
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
        </div>
      </div>
    );
  }

  const ownershipPct = project.financials?.ownershipPercentage ?? 100;
  const currentTier = project.financials?.rehabTier;
  const arvValue = project.financials?.estimatedARV || project.financials?.estimatedCurrentValue || 0;
  const monthlyHoldingCosts = holdMetrics.monthlyTotal;
  const totalBudget = budgetMetrics.budget;
  const unpaidInvoicesCount = rehabExpenses.filter(e => !e.paid).length;
  const uncompletedMilestonesCount = drawSchedule.filter(d => d.status !== 'Paid').length;

  /* ── Rehab progress (tasks-based) ── */
  const rehabDone = rehabTasks.filter(t => t.status === 'Complete').length;
  const rehabTotal = rehabTasks.length;
  const rehabPct = rehabTotal > 0 ? Math.round((rehabDone / rehabTotal) * 100) : 0;

  if (project?.entryStage === 'renovating_marketing') {
    return (
      <div className="min-h-screen bg-[#0d0a0b] relative p-8">
        <div className="max-w-2xl mx-auto bg-[#161318] border border-white/10 rounded-2xl p-8 space-y-6 text-left">
          <div className="flex items-center gap-3 text-[#ffac5a]">
            <span className="material-symbols-outlined text-3xl">construction</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Hold Workspace in Development</h1>
          </div>
          <p className="text-[#9E9DA0] text-sm">
            This project was initialized directly at the <strong>Owned (Renovating / Marketing)</strong> stage. 
            The operational checklist for the Hold Workspace is currently in development.
          </p>

          <hr className="border-white/5" />

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0] mb-3">Backfilled Project Data</h3>
            <div className="space-y-3 bg-[#0d0a0b] p-4 rounded-xl border border-white/5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">PROPERTY ADDRESS:</span>
                <span className="text-white font-medium">{project.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">CONTRACT PRICE:</span>
                <span className="text-white font-medium">
                  {project.financials?.purchasePrice ? `$${project.financials.purchasePrice.toLocaleString()}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">TARGET CLOSING:</span>
                <span className="text-white font-medium">
                  {project.financials?.acquisitionDate ? new Date(project.financials.acquisitionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9E9DA0]">ENTRY STAGE:</span>
                <span className="text-[#ffac5a] font-bold">OWNED — RENOVATING/MARKETING</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a0b] relative">

      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-[#454955]/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#7A9EAA]/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Explainer Video Banner ── */}
      <PhaseExplainerVideo
        phaseKey="phase-3"
        title="Understanding Phase 3: Hold"
        description="Welcome to the Hold phase. Understand the severity of tracking holding costs—whether you intend to rehab, rent, or sell. Keep tight control over your contractor sequencing, because every day of delay eats directly into your final profit."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="4:12"
      />

      {/* ═══════════════════════════════════════════════════════
          Workspace Body — Luminous Glass Layout
          ═══════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-5 md:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Forms and Trackers) */}
          <div className="lg:col-span-8 space-y-8">
            {/* ── Phase Context Header ── */}
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] uppercase" style={{ color: PHASE_COLOR }}>
                    Phase: Hold
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#9E9DA0]">
                      Equity: {ownershipPct}%
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full bg-[#454955]/15 text-[#454955]">
                      Day {daysHeld}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em]" style={{ color: PHASE_COLOR }}>
                    {rehabPct}% Complete
                  </span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-[#262328] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${rehabPct}%`,
                    background: `linear-gradient(90deg, #454955 0%, ${PHASE_COLOR} 100%)`,
                    boxShadow: `0 0 20px -5px ${PHASE_GLOW}`,
                  }}
                />
              </div>
            </section>

            {/* ── Rehab Tier Selector (Stitch schema: 5-column grid) ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7A9EAA]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>architecture</span>
                Rehab Strategy & Level
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {REHAB_TIERS.map((tier) => {
                  const isActive = currentTier === tier.key;
                  return (
                    <button
                      key={tier.key}
                      onClick={() => handleTierChange(tier.key)}
                      className={`px-3 py-4 rounded-lg text-center transition-all ${
                        isActive
                          ? 'bg-[#454955]/10 border border-[#454955]/50'
                          : 'glass-card border border-white/5 hover:bg-white/10'
                      }`}
                      style={isActive ? { boxShadow: `0 0 20px -5px ${PHASE_GLOW}` } : {}}
                    >
                      <p className={`text-[10px] tracking-[0.05em] font-medium uppercase ${isActive ? 'text-[#454955]' : 'text-[#9E9DA0]'}`}>
                        LEVEL {tier.level}
                      </p>
                      <p className={`text-[14px] leading-[16px] tracking-[0.02em] font-semibold ${isActive ? 'text-[#454955] font-bold' : 'text-[#9E9DA0]'}`}>
                        {tier.label}
                      </p>
                      <p className="text-[10px] text-[#9E9DA0]/60 mt-1">{tier.range}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Budget vs Actual (Stitch schema: progress bar card) ── */}
            <section className="glass-card rounded-xl p-5 space-y-4 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#454955]/5 rounded-full blur-3xl" />
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] uppercase">Rehab Budget vs. Actual</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                      {fmtCurrency(budgetMetrics.totalSpent)}
                    </span>
                    <span className="text-[#9E9DA0]">/ {fmtCurrency(budgetMetrics.budget)} Budgeted</span>
                  </div>
                </div>
                {budgetMetrics.budgetLow > 0 && (
                  <div className="text-right">
                    <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#7A9EAA]">TIER RANGE</p>
                    <p className="text-[14px] leading-[16px] font-semibold text-[#9E9DA0]">
                      {fmtDollar(budgetMetrics.budgetLow)} – {fmtDollar(budgetMetrics.budgetHigh)}
                    </p>
                  </div>
                )}
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 luminous-glow"
                  style={{
                    width: `${budgetMetrics.pct}%`,
                    background: budgetMetrics.pct > 90
                      ? 'linear-gradient(90deg, #ffb4ab 0%, #ff6b6b 100%)'
                      : `linear-gradient(90deg, ${PHASE_COLOR}66 0%, ${PHASE_COLOR} 100%)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-medium tracking-[0.05em] text-[#9E9DA0]">
                <span>{budgetMetrics.pct}% ALLOCATED</span>
                <span>{fmtCurrency(budgetMetrics.remaining)} REMAINING</span>
              </div>
            </section>

            {/* ── Days Held Clock + Burn Rate (2-up) ── */}
            <section className="grid grid-cols-2 gap-3">
              <DaysHeldClock daysHeld={daysHeld} acquisitionDate={project.financials?.acquisitionDate} fallbackDate={project.createdAt} />
              <div className="glass-card rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0]">Daily Burn Rate</span>
                <div className="space-y-1">
                  <span className={`text-[24px] leading-[32px] font-semibold ${holdMetrics.dailyBurn > 100 ? 'text-[#ffb4ab]' : 'text-[#9E9DA0]'}`}>
                    {fmtCurrency(Math.round(holdMetrics.dailyBurn))}
                  </span>
                  <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#ffb4ab]">
                    {holdMetrics.dailyBurn > 100 ? 'CRITICAL' : holdMetrics.dailyBurn > 50 ? 'MODERATE' : 'LOW'}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Holding Costs + Operational Income (Stitch schema: 2-up) ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Holding Costs (editable line items) */}
              <div className="space-y-4">
                <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                  Holding Costs
                </h2>
                <HoldingCostsTracker
                  holdingCosts={holdingCosts}
                  onChange={(newCosts) => {
                    setHoldingCosts(newCosts);
                    handleImmediateSave({ holdingCosts: newCosts });
                  }}
                  daysHeld={daysHeld}
                />
              </div>

              {/* Operational Income (Rent strategy) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                    {project.financials?.exitStrategyType === 'Rent' ? 'Rental Income' : 'Exit Strategy'}
                  </h2>
                  {project.financials?.exitStrategyType === 'Rent' && (
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded bg-[#454955]/20 text-[#454955] border border-[#454955]/30">
                      ACTIVE
                    </span>
                  )}
                </div>
                <ExitStrategyToggle
                  currentStrategy={project.financials?.exitStrategyType}
                  onChange={handleStrategyChange}
                />
                {project.financials?.exitStrategyType === 'Rent' && (
                  <RentalSetupForm
                    financials={project.financials}
                    onChange={handleRentalSetupChange}
                  />
                )}
              </div>
            </section>

            {/* ── Current Estimated Value (ARV) — Hero Card ── */}
            <section className="glass-card rounded-xl p-5 border border-[#454955]/20 relative group overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#454955]/5 rounded-full blur-3xl group-hover:bg-[#454955]/10 transition-all" />
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] mb-1">Current Estimated Value (ARV)</h3>
                  <p className="text-[32px] leading-[40px] font-bold tracking-[-0.01em] text-[#9E9DA0]">
                    {fmtCurrency(arvValue)}
                  </p>
                </div>
              </div>
            </section>

            {/* Live Valuation History (AVM) timeline */}
            <ValuationHistory projectId={projectId} />


            {/* ── Live Project Metrics (Stitch schema: 2×2 grid + structured readouts) ── */}
            <section className="space-y-4">
              <h2 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#454955] uppercase flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#454955] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#454955]" />
                </span>
                Live Project Metrics
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* NOI — Structured MetricReadout */}
                <div className="noi-value glass-card p-4 rounded-xl border-l-4 border-l-[#454955]">
                  <MetricReadout
                    label="Net Operating Income"
                    result={noiResult}
                    format="currency"
                    accentColor={PHASE_COLOR}
                    compact
                  />
                  {noiResult.value !== null && (
                    <p className="text-[10px] text-[#9E9DA0]/60 mt-1">
                      {fmtCurrency(Math.round((noiResult.value) / 12))}/month
                    </p>
                  )}
                </div>

                {/* Cash Flow — Structured MetricReadout */}
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#7A9EAA]">
                  <MetricReadout
                    label="Cash Flow"
                    result={cashFlowResult}
                    format="currency"
                    accentColor="#7A9EAA"
                    compact
                  />
                  {cashFlowResult.value !== null && (
                    <p className="text-[10px] text-[#9E9DA0]/60 mt-1">
                      {fmtCurrency(Math.round(cashFlowResult.value / 12))}/month
                    </p>
                  )}
                </div>

                {/* Cap Rate + Cash-on-Cash — from deriveAllMetrics */}
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#7A9EAA]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0]">Cap Rate</span>
                    <span className="text-[10px] font-bold text-[#7A9EAA]">STABLE</span>
                  </div>
                  <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {liveMetrics ? fmtPct(liveMetrics.capRate) : '—'}
                  </span>
                  {liveMetrics && (
                    <p className="text-[10px] text-[#9E9DA0]/60 mt-1">CoC: {fmtPct(liveMetrics.cashOnCashReturn)}</p>
                  )}
                </div>

                {/* DSCR */}
                <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#454955]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0]">DSCR</span>
                    <span className={`text-[10px] font-bold ${liveMetrics && liveMetrics.dscr >= 1.2 ? 'text-[#454955]' : 'text-[#ffb4ab]'}`}>
                      {liveMetrics && liveMetrics.dscr >= 1.2 ? 'SAFE' : 'AT RISK'}
                    </span>
                  </div>
                  <span className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {liveMetrics ? liveMetrics.dscr.toFixed(2) : '—'}
                  </span>
                  <p className="text-[10px] text-[#454955] mt-1">{liveMetrics && liveMetrics.dscr >= 1.2 ? 'SAFE > 1.20' : 'Target > 1.20'}</p>
                </div>
              </div>

              {/* ── Occupancy + OER readout row ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-xl">
                  <MetricReadout
                    label="Occupancy Rate"
                    result={occupancyResult}
                    format="percent"
                    accentColor={PHASE_COLOR}
                  />
                </div>
                <div className="glass-card p-4 rounded-xl">
                  <MetricReadout
                    label="Operating Expense Ratio"
                    result={oerResult}
                    format="percent"
                    accentColor="#7A9EAA"
                  />
                </div>
              </div>
            </section>

            {/* ── Rehab Pipeline Tracker ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                Rehab Pipeline
              </h2>
              <RehabSequenceTracker
                currentStage={(project.rehab?.currentStage as any) || 'Demolition'}
                onStageChange={handleStageChange}
              />
            </section>

            {/* ── Scope of Work ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                Scope of Work
              </h2>
              <ScopeOfWorkForm items={scopeOfWork} onChange={setScopeOfWork} />
            </section>

            {/* ── Bids & Hiring ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                Bids & Hiring
              </h2>
              <GCBidUploader
                projectId={projectId}
                onBidSaved={bid => setContractorBids(prev => [...prev, bid])}
              />
              <ContractorBids
                bids={contractorBids}
                baseBudget={totalBudget}
                onChange={setContractorBids}
              />
            </section>

            {/* ── CapEx Comparative Table ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                CapEx Tracker
              </h2>
              <CapExComparativeTable tasks={rehabTasks} onChange={setRehabTasks} />
            </section>

            {/* ── Contractor Draw Schedule ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                Draw Schedule
              </h2>
              <ContractorDrawSchedule draws={drawSchedule} onChange={handleDrawScheduleChange} totalBudget={totalBudget} />
            </section>

            {/* ── Rehab Expense Tracker ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                Rehab Expenses
              </h2>
              <RehabExpenseTracker expenses={rehabExpenses} onChange={setRehabExpenses} totalBudget={totalBudget} />
            </section>

            {/* ── Site Visit Logs ── */}
            <section className="space-y-4">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
                Site Visit Log
              </h2>
              <SiteVisitLogTracker logs={siteVisitLogs} onChange={setSiteVisitLogs} />
            </section>

            {/* ── Final Sign-off Gate ── */}
            <section className="pt-8">
              <RenovationsCompleteGate
                unpaidInvoicesCount={unpaidInvoicesCount}
                uncompletedMilestonesCount={uncompletedMilestonesCount}
                onComplete={handleCompletePhase}
              />
            </section>
          </div>

          {/* Right Column (At-a-Glance Sticky Sidebar) */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
            <ProjectAtAGlanceSidebar project={project} />
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════
          Sticky NOI Formula Footer — always visible
          ═══════════════════════════════════════════════════════ */}
      <div className="sticky bottom-0 z-30 w-full border-t border-white/10">
        <div
          className="glass-card rounded-t-xl backdrop-blur-xl"
          style={{ background: 'rgba(13, 10, 11, 0.85)' }}
        >
          <div className="max-w-4xl mx-auto px-5 md:px-10 py-3 flex items-center justify-between gap-4">
            {/* Formula breakdown */}
            <div className="flex items-center gap-2 text-[11px] tracking-wide overflow-x-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <span className="text-[#9E9DA0] whitespace-nowrap">Gross Income</span>
              <span className="text-[#9E9DA0] font-semibold whitespace-nowrap">{fmtCurrency(Math.round(noiFormula.grossIncome))}</span>
              <span className="text-[#9E9DA0]">−</span>
              <span className="text-[#9E9DA0] whitespace-nowrap">Vacancy</span>
              <span className="text-[#ffb4ab] font-semibold whitespace-nowrap">{fmtCurrency(Math.round(noiFormula.vacancyLoss))}</span>
              <span className="text-[#9E9DA0]">−</span>
              <span className="text-[#9E9DA0] whitespace-nowrap">OpEx</span>
              <span className="text-[#ffb4ab] font-semibold whitespace-nowrap">{fmtCurrency(Math.round(noiFormula.opex))}</span>
              <span className="text-[#9E9DA0]">=</span>
            </div>

            {/* NOI value + state pill */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9E9DA0]">NOI</p>
                <p
                  className="text-[20px] leading-[24px] font-bold"
                  style={{ color: '#15803D', fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtCurrency(Math.round(noiFormula.noi))}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                noiResult.state === 'live'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : noiResult.state === 'incomplete'
                    ? 'bg-gray-500/15 text-gray-400'
                    : 'bg-amber-500/15 text-amber-400'
              }`}>
                {noiResult.state === 'live' ? 'LIVE' : noiResult.state === 'incomplete' ? 'INCOMPLETE' : noiResult.state.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
