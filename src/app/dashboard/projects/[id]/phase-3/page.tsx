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
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-3 — Hold & Rehab Workspace

   Stitch Schemas: b795e973 (Hold Phase) + df9efa99 (Operations)
   "Luminous Glass" dark design — single-column mobile-first stack.

   Phase 3 color accent: #57f1db (primary / teal) — Hold = active phase
   All save logic 100% preserved from original.
   ═══════════════════════════════════════════════════════════════ */

const PHASE_COLOR = '#57f1db';
const PHASE_GLOW  = 'rgba(87, 241, 219, 0.4)';

/* ── Rehab Tier Definitions ── */
const REHAB_TIERS: { key: RehabTier; level: number; label: string; range: string }[] = [
  { key: 'Staging',                level: 1, label: 'Staging',      range: '$1k–$5k' },
  { key: 'Minor Cosmetic',        level: 2, label: 'Minor',        range: '$5k–$20k' },
  { key: 'Minor Rehab',           level: 3, label: 'Rehab',        range: '$15k–$50k' },
  { key: 'Full Rehab',            level: 4, label: 'Full Rehab',   range: '$40k–$100k' },
  { key: 'Gut Renovation',        level: 5, label: 'Gut Reno',     range: '$75k–$200k' },
  // Ground-Up not shown as tier button per schema (too rare for Hold phase)
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
      project.strategyType,
      project.currentPhase,
      project.createdAt
    );
  }, [project?.financials, project?.strategyType, project?.currentPhase, project?.createdAt]);

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
      'Staging': [1000, 5000],
      'Minor Cosmetic': [5000, 20000],
      'Minor Rehab': [15000, 50000],
      'Full Rehab': [40000, 100000],
      'Gut Renovation': [75000, 200000],
      'Ground-Up Construction': [150000, 500000],
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

  return (
    <div className="min-h-screen bg-[#0b141a] relative">

      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-[#57f1db]/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#adc6ff]/5 blur-[100px] rounded-full" />
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
      <main className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-8">

        {/* ── Phase Context Header ── */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] uppercase" style={{ color: PHASE_COLOR }}>
                Phase: Hold & Rehab
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#bacac5]">
                  Equity: {ownershipPct}%
                </span>
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full bg-[#57f1db]/15 text-[#57f1db]">
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
          <div className="h-1.5 w-full bg-[#2d363d] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${rehabPct}%`,
                background: `linear-gradient(90deg, #3cddc7 0%, ${PHASE_COLOR} 100%)`,
                boxShadow: `0 0 20px -5px ${PHASE_GLOW}`,
              }}
            />
          </div>
        </section>

        {/* ── Rehab Tier Selector (Stitch schema: 5-column grid) ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#adc6ff]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>architecture</span>
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
                      ? 'bg-[#57f1db]/10 border border-[#57f1db]/50'
                      : 'glass-card border border-white/5 hover:bg-white/10'
                  }`}
                  style={isActive ? { boxShadow: `0 0 20px -5px ${PHASE_GLOW}` } : {}}
                >
                  <p className={`text-[10px] tracking-[0.05em] font-medium uppercase ${isActive ? 'text-[#57f1db]' : 'text-[#bacac5]'}`}>
                    LEVEL {tier.level}
                  </p>
                  <p className={`text-[14px] leading-[16px] tracking-[0.02em] font-semibold ${isActive ? 'text-[#57f1db] font-bold' : 'text-[#dae4ec]'}`}>
                    {tier.label}
                  </p>
                  <p className="text-[10px] text-[#bacac5]/60 mt-1">{tier.range}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Budget vs Actual (Stitch schema: progress bar card) ── */}
        <section className="glass-card rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#57f1db]/5 rounded-full blur-3xl" />
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5] uppercase">Rehab Budget vs. Actual</h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                  {fmtCurrency(budgetMetrics.totalSpent)}
                </span>
                <span className="text-[#bacac5]">/ {fmtCurrency(budgetMetrics.budget)} Budgeted</span>
              </div>
            </div>
            {budgetMetrics.budgetLow > 0 && (
              <div className="text-right">
                <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#adc6ff]">TIER RANGE</p>
                <p className="text-[14px] leading-[16px] font-semibold text-[#dae4ec]">
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
          <div className="flex justify-between text-[10px] font-medium tracking-[0.05em] text-[#bacac5]">
            <span>{budgetMetrics.pct}% ALLOCATED</span>
            <span>{fmtCurrency(budgetMetrics.remaining)} REMAINING</span>
          </div>
        </section>

        {/* ── Days Held Clock + Burn Rate (2-up) ── */}
        <section className="grid grid-cols-2 gap-3">
          <DaysHeldClock daysHeld={daysHeld} acquisitionDate={project.financials?.acquisitionDate} fallbackDate={project.createdAt} />
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Daily Burn Rate</span>
            <div className="space-y-1">
              <span className={`text-[24px] leading-[32px] font-semibold ${holdMetrics.dailyBurn > 100 ? 'text-[#ffb4ab]' : 'text-[#dae4ec]'}`}>
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
            <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
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
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                {project.financials?.exitStrategyType === 'Rent' ? 'Rental Income' : 'Exit Strategy'}
              </h2>
              {project.financials?.exitStrategyType === 'Rent' && (
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded bg-[#57f1db]/20 text-[#57f1db] border border-[#57f1db]/30">
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
        <section className="glass-card rounded-xl p-5 border border-[#57f1db]/20 relative group overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#57f1db]/5 rounded-full blur-3xl group-hover:bg-[#57f1db]/10 transition-all" />
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5] mb-1">Current Estimated Value (ARV)</h3>
              <p className="text-[32px] leading-[40px] font-bold tracking-[-0.01em] text-[#dae4ec]">
                {fmtCurrency(arvValue)}
              </p>
            </div>
          </div>
        </section>

        {/* ── Live Project Metrics (Stitch schema: 2×2 grid) ── */}
        <section className="space-y-4">
          <h2 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#57f1db] uppercase flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#57f1db] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#57f1db]" />
            </span>
            Live Project Metrics
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* NOI */}
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#57f1db]">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Net Operating Income</span>
                <span className="text-[10px] font-bold text-[#57f1db]">
                  {liveMetrics && liveMetrics.noi > 0 ? 'HEALTHY' : 'HOLDING'}
                </span>
              </div>
              <span className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                {liveMetrics ? fmtCurrency(Math.round(liveMetrics.noi / 12)) : '—'}
              </span>
              <p className="text-[10px] text-[#bacac5]/60 mt-1">/month</p>
            </div>

            {/* Cash-on-Cash */}
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#adc6ff]">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Cash-on-Cash</span>
                <span className="text-[10px] font-bold text-[#adc6ff]">TARGET: 12%</span>
              </div>
              <span className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                {liveMetrics ? fmtPct(liveMetrics.cashOnCashReturn) : '—'}
              </span>
            </div>

            {/* Cap Rate */}
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#adc6ff]">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">Cap Rate</span>
                <span className="text-[10px] font-bold text-[#adc6ff]">STABLE</span>
              </div>
              <span className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                {liveMetrics ? fmtPct(liveMetrics.capRate) : '—'}
              </span>
            </div>

            {/* DSCR */}
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-[#57f1db]">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">DSCR</span>
                <span className={`text-[10px] font-bold ${liveMetrics && liveMetrics.dscr >= 1.2 ? 'text-[#57f1db]' : 'text-[#ffb4ab]'}`}>
                  {liveMetrics && liveMetrics.dscr >= 1.2 ? 'SAFE' : 'AT RISK'}
                </span>
              </div>
              <span className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
                {liveMetrics ? liveMetrics.dscr.toFixed(2) : '—'}
              </span>
              <p className="text-[10px] text-[#57f1db] mt-1">{liveMetrics && liveMetrics.dscr >= 1.2 ? 'SAFE > 1.20' : 'Target > 1.20'}</p>
            </div>
          </div>
        </section>

        {/* ── Rehab Pipeline Tracker ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Rehab Pipeline
          </h2>
          <RehabSequenceTracker
            currentStage={project.rehab?.currentStage || 'Demolition'}
            onStageChange={handleStageChange}
          />
        </section>

        {/* ── Scope of Work ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Scope of Work
          </h2>
          <ScopeOfWorkForm items={scopeOfWork} onChange={setScopeOfWork} />
        </section>

        {/* ── Bids & Hiring ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
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
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            CapEx Tracker
          </h2>
          <CapExComparativeTable tasks={rehabTasks} onChange={setRehabTasks} />
        </section>

        {/* ── Contractor Draw Schedule ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Draw Schedule
          </h2>
          <ContractorDrawSchedule draws={drawSchedule} onChange={setDrawSchedule} totalBudget={totalBudget} />
        </section>

        {/* ── Rehab Expense Tracker ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
            Rehab Expenses
          </h2>
          <RehabExpenseTracker expenses={rehabExpenses} onChange={setRehabExpenses} totalBudget={totalBudget} />
        </section>

        {/* ── Site Visit Logs ── */}
        <section className="space-y-4">
          <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
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

      </main>
    </div>
  );
}
