'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { usePipelineData } from '@/context/ProjectPipelineContext';
import ProjectCalculator from '@/components/project/ProjectCalculator';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import { PhaseLockedBanner } from '@/components/project/PhaseLockedBanner';
import ConversationalForm from '@/components/conversational/ConversationalForm';
import type { QuestionDef, FormAnswers } from '@/components/conversational/types';
import { projectsService } from '@/lib/firebase/deals';
import toast from 'react-hot-toast';
import type { Phase1Snapshot, LoanStatus, PurchaseReadinessItem } from '@/types/schema';
import { CrowdfundingTracker, type Investor } from '@/components/project/CrowdfundingTracker';
import LOIGenerator from '@/components/project/LOIGenerator';
import { LoanProcessingPipeline } from '@/components/project/LoanProcessingPipeline';
import { ProjectAnalyzer } from '@/components/project/ProjectAnalyzer';
import { TargetIdentification } from '@/components/project/TargetIdentification';
import { OfferPipelineTracker } from '@/components/project/OfferPipelineTracker';
import { PurchaseReadinessChecklist } from '@/components/project/PurchaseReadinessChecklist';
import { ContingencyCountdownWidget } from '@/components/project/ContingencyCountdownWidget';
import { EMDVerificationWidget } from '@/components/project/EMDVerificationWidget';
import { deriveAllMetrics, computeIRR, buildIRRCashFlows } from '@/lib/metrics/reiMetrics';
import {
  Building2,
  MapPin,
  CalendarDays,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Users,
  Target,
  Wallet,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-1 — Acquisition Workspace

   Stitch Schema: a0c9762016014874bc49fa4cf0572e02
   "Project Workspace: Acquisition Phase (Refined)"

   Luminous Glass dark design. Single-column mobile-first stack.
   All logic handlers are 100% preserved from original.

   Header chrome (breadcrumb, address, phase stepper) is provided
   by the parent layout.tsx workspace shell — NOT duplicated here.
   Project data is sourced from WorkspaceContext (no re-fetch).
   ═══════════════════════════════════════════════════════════════ */

const PHASE_COLOR = '#57f1db';

/* ── Phase 1 Question Schema ──────────────────────────────────────────────────
   Each item drives one "slide" in the ConversationalForm engine.
   Keys map directly to project.financials field names (in cents for currency).
   ──────────────────────────────────────────────────────────────────────────── */
const PHASE_1_QUESTIONS: QuestionDef[] = [
  {
    key:      'purchasePrice',
    type:     'currency',
    question: 'What is the Purchase Price?',
    hint:     'Enter the agreed contract price or the price you are targeting to acquire this asset.',
  },
  {
    key:      'estimatedARV',
    type:     'currency',
    question: 'What is your estimated After-Repair Value (ARV)?',
    hint:     'The projected market value of the property after all improvements are complete.',
  },
  {
    key:      'projectedRehabCost',
    type:     'currency',
    question: 'What is your estimated Rehab Budget?',
    hint:     'Total capital required to bring the property to its target condition. Include labor and materials.',
  },
  {
    key:      'loanAmount',
    type:     'currency',
    question: 'What is your Loan Amount?',
    hint:     'The total principal being borrowed from your lender for this acquisition.',
  },
  {
    key:      'loanInterestRate',
    type:     'percent',
    question: 'What is the Interest Rate on your loan?',
    hint:     'Annual interest rate (e.g., enter 9.5 for 9.5%). Bridging loans typically range from 8–14%.',
    precision: 2,
  },
  {
    key:      'loanOriginationPoints',
    type:     'percent',
    question: 'How many Origination Points are you paying?',
    hint:     'Points charged by the lender at closing. One point = 1% of the loan amount.',
    unit:     'points',
    precision: 1,
  } as any,
  {
    key:      'estimatedTimelineDays',
    type:     'integer',
    question: 'How many days do you project to hold this property?',
    hint:     'Your estimated hold period from acquisition to disposition. Used to calculate carrying costs.',
    unit:     'days',
  },
  {
    key:      'offerStatus',
    type:     'select',
    question: 'What is the current Offer Status?',
    hint:     'This will be used to tag the deal in your pipeline tracker.',
    options: [
      { value: 'Drafting',   label: 'Drafting',   description: 'Preparing the offer' },
      { value: 'Offer Sent', label: 'Offer Sent', description: 'Offer submitted to seller' },
      { value: 'Countered',  label: 'Countered',  description: 'Seller countered offer' },
      { value: 'Accepted',   label: 'Accepted',   description: 'Offer accepted' },
      { value: 'Rejected',   label: 'Rejected',   description: 'Offer declined' },
    ],
    optional: true,
  },
];

export default function Phase1WorkspacePage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useAuth();
  const projectId = params.id as string;

  /* ── Pipeline data ── */
  const { isPhaseComplete, snapshots, phase1Live } = usePipelineData();
  const phase1Locked = isPhaseComplete('phase-1');
  const [advancing, setAdvancing] = useState(false);
  const [investors, setInvestors]     = useState<Investor[]>([]);
  const [postingToMarketplace, setPostingToMarketplace] = useState(false);

  const handlePostToMarketplace = async () => {
    if (!project) return;
    setPostingToMarketplace(true);
    try {
      await projectsService.updateProject(project.id, {
        financials: {
          ...project.financials,
          marketplaceListing: true
        }
      });
      toast.success('Successfully posted this project to the Deal Marketplace!');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to post project to marketplace.');
    } finally {
      setPostingToMarketplace(false);
    }
  };

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading, refresh } = useWorkspaceProject();

  /* ── KPI panel state ── */
  const [kpiScope, setKpiScope] = useState<'property' | 'myShare'>('property');
  const [kpiMode, setKpiMode] = useState<'projected' | 'actual'>('projected');
  const [showAllKpis, setShowAllKpis] = useState(false);

  /* ── Task expansion states ── */
  const [expandedTask, setExpandedTask] = useState<string | null>('financials');

  /* ── Validation for Phase 1 Lock ── */
  const targetRaiseCents = project?.financials?.projectedRehabCost ?? 0;
  const totalRaisedCents = investors.reduce((sum, inv) => sum + inv.amountCents, 0);
  const isFullyFunded = targetRaiseCents > 0 && totalRaisedCents >= targetRaiseCents;

  const currentOfferStatus = project?.financials?.offerStatus;
  const isOfferAccepted = currentOfferStatus === 'Accepted';

  const readinessItems = project?.purchaseReadinessChecklist || [];
  const completedReadinessCount = readinessItems.filter(i => i.completed).length;
  // Requires at least 4 default documents to be completed
  const is100PercentReady = completedReadinessCount >= 4;

  const canLockDeal = isOfferAccepted && isFullyFunded && is100PercentReady;

  /* ── Derive KPI metrics from financials ── */
  const derivedMetrics = useMemo(() => {
    if (!project?.financials) return null;
    try {
      return deriveAllMetrics(
        project.financials,
        project.financials.estimatedCurrentValue,
        project.strategyType,
        1, // Phase 1
        project.createdAt
      );
    } catch {
      return null;
    }
  }, [project?.financials, project?.strategyType, project?.createdAt]);

  /* ── Task completion tracking ── */
  const taskStatuses = useMemo(() => {
    if (!project) return { details: false, financials: false, capital: false, financing: false };
    const hasDetails = !!(project.propertyName && project.address && project.strategyType);
    const hasFinancials = !!(project.financials?.purchasePrice || project.financials?.targetPrice);
    const hasCapital = isFullyFunded;
    const hasFinancing = !!(project.financials?.loanAmount && project.financials?.loanInterestRate);
    return { details: hasDetails, financials: hasFinancials, capital: hasCapital, financing: hasFinancing };
  }, [project, isFullyFunded]);

  const completedTaskCount = Object.values(taskStatuses).filter(Boolean).length;
  const progressPercent = (completedTaskCount / 4) * 100;

  /* ── Convert FormAnswers (cents) → project financials partial ── */
  function toFinancials(answers: Partial<FormAnswers>) {
    return {
      purchasePrice:         answers.purchasePrice         as number | undefined,
      estimatedARV:          answers.estimatedARV          as number | undefined,
      projectedRehabCost:    answers.projectedRehabCost    as number | undefined,
      loanAmount:            answers.loanAmount            as number | undefined,
      loanInterestRate:      answers.loanInterestRate      as number | undefined,
      loanOriginationPoints: answers.loanOriginationPoints as number | undefined,
      estimatedTimelineDays: answers.estimatedTimelineDays as number | undefined,
      offerStatus:           answers.offerStatus           as string | undefined,
    };
  }

  /* ── Build initial answers from saved financials ── */
  function toInitialAnswers(): Partial<FormAnswers> {
    const f = project?.financials;
    if (!f) return {};
    return {
      purchasePrice:         f.purchasePrice,
      estimatedARV:          f.estimatedARV,
      projectedRehabCost:    f.projectedRehabCost,
      loanAmount:            f.loanAmount,
      loanInterestRate:      f.loanInterestRate,
      loanOriginationPoints: f.loanOriginationPoints,
      estimatedTimelineDays: f.estimatedTimelineDays,
      offerStatus:           f.offerStatus as string | undefined,
    };
  }

  /* ── Auto-save each conversational step ── */
  async function handleStepSave(answers: Partial<FormAnswers>) {
    if (!project) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = { ...(project.financials ?? {}), ...toFinancials(answers) } as any;
    await projectsService.updateProject(project.id, { financials: merged });
    refresh();
  }

  async function handleTargetSave(updates: any) {
    if (!project) return;
    await projectsService.updateProject(project.id, updates);
    refresh();
  }

  async function handleReadinessChange(updatedItems: PurchaseReadinessItem[]) {
    if (!project) return;
    await projectsService.updateProject(project.id, { purchaseReadinessChecklist: updatedItems });
    refresh();
  }

  async function handlePipelineStatusChange(status: string) {
    if (!project) return;
    const merged = { ...(project.financials ?? {}), offerStatus: status as any };
    await projectsService.updateProject(project.id, { financials: merged });
    refresh();
  }

  async function handleCounterSubmit(priceCents: number, terms: string) {
    if (!project) return;
    const merged = { 
      ...(project.financials ?? {}), 
      counterPriceCents: priceCents,
      counterTerms: terms
    };
    await projectsService.updateProject(project.id, { financials: merged });
    refresh();
  }

  async function handleLoanStatusChange(status: LoanStatus) {
    if (!project) return;
    await projectsService.updateProject(project.id, { loanStatus: status });
    refresh();
  }

  async function handleClosingDateChange(dateStr: string) {
    if (!project) return;
    const [year, month, day] = dateStr.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    const merged = { ...(project.financials ?? {}), acquisitionDate: newDate };
    await projectsService.updateProject(project.id, { financials: merged });
    refresh();
  }

  async function handleEMDVerify(verified: boolean, clearedDateStr: string | null) {
    if (!project) return;
    const newDate = clearedDateStr ? new Date(`${clearedDateStr}T00:00:00`) : null;
    const merged = { 
      ...(project.financials ?? {}), 
      emdVerified: verified,
      emdClearedDate: newDate || undefined
    };
    await projectsService.updateProject(project.id, { financials: merged });
    refresh();
  }

  /* Capture Phase 1 snapshot and advance to Phase 2 */
  async function handleAdvanceToPhase2() {
    if (!project || advancing) return;
    setAdvancing(true);
    try {
      const snapshot: Phase1Snapshot = {
        phaseKey:              'phase-1',
        capturedAt:            new Date(),
        purchasePrice:         phase1Live.purchasePrice,
        estimatedARV:          phase1Live.estimatedARV,
        loanAmount:            phase1Live.loanAmount,
        loanInterestRate:      phase1Live.loanInterestRate,
        loanOriginationPoints: phase1Live.loanOriginationPoints,
        projectedRehabCost:    phase1Live.projectedRehabCost,
        estimatedTimelineDays: phase1Live.estimatedTimelineDays,
        fixedAcquisitionCosts: phase1Live.fixedAcquisitionCosts,
        maxOffer:              phase1Live.maxOffer,
      };
      await projectsService.capturePhaseSnapshot(project.id, 'phase-1', snapshot);
      
      // Update the phase status so the badge and tracking correctly reflect Phase 2
      await projectsService.updateProject(project.id, { phaseStatus: 'Phase 2: Acquisition' });
      
      refresh();
      
      // Redirect the user to the Phase 2 workspace
      router.push(`/dashboard/projects/${project.id}/phase-2`);
    } catch (err) {
      console.error('[Phase1] Advance failed:', err);
      setAdvancing(false);
    }
  }

  /* Called when the conversational form's final step is completed */
  async function handleFormComplete(_answers: FormAnswers) {
    await handleAdvanceToPhase2();
  }

  /* ── Loading state ── */
  if (loading) {
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
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="text-xs font-bold uppercase tracking-[0.12em] underline text-[#bacac5] hover:text-[#57f1db] transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  /* ── Helper: format currency ── */
  const fmtCurrency = (cents?: number) => {
    if (!cents) return '—';
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  /* ── Helper: format raw dollar ── */
  const fmtDollar = (value?: number) => {
    if (!value && value !== 0) return '—';
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  /* ── Helper: format date ── */
  const fmtDate = (d?: string | Date) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* ── Helper: scale by ownership ── */
  const scaleByScope = (value: number) => {
    if (kpiScope === 'myShare') {
      const pct = (project.financials?.ownershipPercentage ?? 100) / 100;
      return value * pct;
    }
    return value;
  };

  const ownershipPct = project.financials?.ownershipPercentage ?? 100;
  const projectData = project as any;

  return (
    <div className="min-h-screen bg-[#0b141a] relative">

      {/* ── Ambient Background Layer ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-[#57f1db]/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[30%] h-[30%] bg-[#0566d9]/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      {/* ── Explainer Video Banner ── */}
      <PhaseExplainerVideo
        phaseKey="phase-1"
        title="Understanding Phase 1: Acquisition"
        description="Learn the fundamentals of finding deals, crowdfunding capital, and generating competitive offers."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="2:45"
      />

      {/* ═══════════════════════════════════════════════════════
          Workspace Body — Luminous Glass Layout
          ═══════════════════════════════════════════════════════ */}
      <main className="max-w-4xl mx-auto px-5 md:px-10 py-10 space-y-8">

        {/* ── Phase Context Header (Stitch schema) ── */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#57f1db] uppercase">
                Phase: Acquisition
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#bacac5]">
                  Equity: {ownershipPct}%
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#57f1db]">
                {Math.round(progressPercent)}% Complete
              </span>
            </div>
          </div>
          {/* Progress Bar (Stitch schema) */}
          <div className="h-1.5 w-full bg-[#2d363d] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out luminous-glow"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #3cddc7 0%, #57f1db 100%)',
              }}
            />
          </div>
        </section>

        {/* ── Phase Locked Banner ── */}
        {phase1Locked && (
          <PhaseLockedBanner
            phaseLabel="Phase 1: Acquisition"
            capturedAt={snapshots['phase-1']?.capturedAt}
            referencedBy={['Phase 3 (Hold)', 'Phase 4 (Exit)']}
          />
        )}

        {/* ═══════════════════════════════════════════════════════
            Task List — Glass Cards (Stitch schema)
            ═══════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
              Acquisition Tasks
            </h2>
          </div>

          <div className="space-y-3">

            {/* ── Task 1: Property Details & Strategy (Completed/Pending) ── */}
            <div
              className={`glass-card rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 cursor-pointer
                ${taskStatuses.details ? 'border-l-4 border-[#57f1db]/40' : 'border-l-4 border-[#57f1db]'}`}
              onClick={() => setExpandedTask(expandedTask === 'details' ? null : 'details')}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#dae4ec] flex items-center gap-2">
                  {taskStatuses.details ? (
                    <CheckCircle2 className="w-[18px] h-[18px] text-[#57f1db]" fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Target className="w-[18px] h-[18px] text-[#57f1db]" />
                  )}
                  Property Details &amp; Strategy
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                  ${taskStatuses.details
                    ? 'bg-[#57f1db]/20 text-[#57f1db]'
                    : 'bg-[#2d363d] text-[#bacac5]'}`}>
                  {taskStatuses.details ? 'Completed' : 'Pending'}
                </span>
              </div>
              {expandedTask === 'details' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <TargetIdentification
                    projectId={projectId}
                    phaseColor={PHASE_COLOR}
                    initialData={{
                      propertyName: project.propertyName,
                      address: project.address,
                      city: projectData.city,
                      state: projectData.state,
                      zip: projectData.zip,
                      squareFootage: projectData.squareFootage,
                      yearBuilt: projectData.yearBuilt,
                      listedPrice: project.financials?.listedPrice,
                    }}
                    onSave={handleTargetSave}
                  />
                </div>
              )}
              {!expandedTask?.includes('details') && taskStatuses.details && (
                <div className="flex items-center justify-between">
                  <span className="text-[#bacac5] text-[12px] leading-[14px] font-medium tracking-[0.05em]">
                    {project.strategyType} • {project.assetClass ?? 'Residential'}
                  </span>
                </div>
              )}
            </div>

            {/* ── Task 2: Financial Projections (Active) ── */}
            <div
              className={`glass-card rounded-xl p-4 flex flex-col gap-4 transition-all duration-300
                ${taskStatuses.financials ? 'border-l-4 border-[#57f1db]/40' : 'border-l-4 border-[#57f1db]'}`}
            >
              <div
                className="flex justify-between items-start cursor-pointer"
                onClick={() => setExpandedTask(expandedTask === 'financials' ? null : 'financials')}
              >
                <h3 className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#dae4ec] flex items-center gap-2">
                  {taskStatuses.financials ? (
                    <CheckCircle2 className="w-[18px] h-[18px] text-[#57f1db]" fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Clock className="w-[18px] h-[18px] text-[#57f1db]" />
                  )}
                  Financial Projections
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                  ${taskStatuses.financials
                    ? 'bg-[#57f1db]/20 text-[#57f1db]'
                    : 'bg-[#2d363d] text-[#bacac5]'}`}>
                  {taskStatuses.financials ? 'Completed' : 'In Progress'}
                </span>
              </div>

              {/* Inline Mini-KPI strip (Stitch schema) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#060f15]/50 p-2 rounded-lg">
                  <p className="text-[10px] text-[#bacac5] uppercase">Target Price</p>
                  <p className="text-[14px] leading-[16px] font-bold text-[#dae4ec]">
                    {fmtCurrency(phase1Live.purchasePrice || project.financials?.targetPrice)}
                  </p>
                </div>
                <div className="bg-[#060f15]/50 p-2 rounded-lg">
                  <p className="text-[10px] text-[#bacac5] uppercase">Est. ARV</p>
                  <p className="text-[14px] leading-[16px] font-bold text-[#dae4ec]">
                    {fmtCurrency(phase1Live.estimatedARV)}
                  </p>
                </div>
              </div>

              {/* Expanded: ConversationalForm or ProjectCalculator */}
              {expandedTask === 'financials' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200 pt-2">
                  {phase1Locked ? (
                    <ProjectCalculator
                      phaseColor={PHASE_COLOR}
                      projectId={projectId}
                      propertyAddress={project.address}
                      initialFinancials={project.financials}
                      onSaveSuccess={() => refresh()}
                      readOnly={true}
                    />
                  ) : (
                    <>
                      <ConversationalForm
                        questions={PHASE_1_QUESTIONS}
                        initialAnswers={toInitialAnswers()}
                        phaseColor={PHASE_COLOR}
                        readOnly={false}
                        onStepSave={handleStepSave}
                        onComplete={handleFormComplete}
                      />

                      {advancing && (
                        <div className="flex items-center justify-center gap-2.5 p-4 text-[#bacac5] text-[12px] font-bold">
                          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                          Locking Phase 1 and advancing…
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Task 3: Capital Raising ── */}
            <div className="glass-card rounded-xl p-4 space-y-4 border-l-4 border-[#57f1db]">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedTask(expandedTask === 'capital' ? null : 'capital')}
              >
                <h3 className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#dae4ec] flex items-center gap-2">
                  <Wallet className="w-[18px] h-[18px] text-[#57f1db]" />
                  Capital Raising
                </h3>
                <span className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#57f1db]">
                  {targetRaiseCents > 0
                    ? `${Math.min(100, Math.round((totalRaisedCents / targetRaiseCents) * 100))}% Funded`
                    : 'Not Required'}
                </span>
              </div>
              {/* Funding progress bar */}
              {targetRaiseCents > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-[#bacac5]">
                    <span>{fmtCurrency(totalRaisedCents)} Raised</span>
                    <span>{fmtCurrency(targetRaiseCents)} Target</span>
                  </div>
                  <div className="h-2 w-full bg-[#2d363d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#57f1db] luminous-glow rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalRaisedCents / targetRaiseCents) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {expandedTask === 'capital' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                  <CrowdfundingTracker
                    targetCents={project.financials?.projectedRehabCost ?? 0}
                    phaseColor={PHASE_COLOR}
                    onChange={setInvestors}
                  />
                  <div className="flex flex-col gap-2">
                    <button className="w-full py-2.5 bg-[#57f1db] text-[#003731] text-[14px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg luminous-glow active:scale-[0.98] transition-all">
                      Invite Syndicate Investors
                    </button>
                    <button 
                      onClick={handlePostToMarketplace}
                      disabled={postingToMarketplace || project?.financials?.marketplaceListing}
                      className="w-full py-2.5 border border-[#57f1db]/30 text-[#57f1db] text-[14px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg hover:bg-[#57f1db]/5 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {postingToMarketplace ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Posting...
                        </span>
                      ) : project?.financials?.marketplaceListing ? (
                        'Listed on Marketplace'
                      ) : (
                        'Post to Deal Marketplace'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Task 4: Financing & Debt Structure (Locked/Active) ── */}
            <div
              className={`glass-card rounded-xl p-4 flex justify-between items-center cursor-pointer transition-all duration-300
                ${!taskStatuses.financials ? 'opacity-60 border-l-4 border-transparent' : 'border-l-4 border-[#57f1db]'}`}
              onClick={() => {
                if (taskStatuses.financials) {
                  setExpandedTask(expandedTask === 'financing' ? null : 'financing');
                }
              }}
            >
              <h3 className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#bacac5] flex items-center gap-2">
                {!taskStatuses.financials ? (
                  <Lock className="w-[18px] h-[18px]" />
                ) : taskStatuses.financing ? (
                  <CheckCircle2 className="w-[18px] h-[18px] text-[#57f1db]" fill="currentColor" strokeWidth={0} />
                ) : (
                  <DollarSign className="w-[18px] h-[18px] text-[#57f1db]" />
                )}
                Financing &amp; Debt Structure
              </h3>
              {!taskStatuses.financials ? (
                <span className="text-[#bacac5]/50 text-[12px]">Complete financials first</span>
              ) : (
                <ChevronDown className="w-5 h-5 text-[#bacac5]" />
              )}
            </div>
            {expandedTask === 'financing' && taskStatuses.financials && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
                {/* Contingency Countdown */}
                <ContingencyCountdownWidget
                  closingDate={project.financials?.acquisitionDate}
                  onClosingDateChange={handleClosingDateChange}
                  phaseColor={PHASE_COLOR}
                  readOnly={phase1Locked}
                />
                {/* EMD Verification */}
                <EMDVerificationWidget
                  emdAmount={project.financials?.emdAmount ?? 0}
                  emdClearedDate={project.financials?.emdClearedDate}
                  emdVerified={project.financials?.emdVerified}
                  onVerify={handleEMDVerify}
                  phaseColor={PHASE_COLOR}
                  readOnly={phase1Locked}
                />
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            Core KPIs Panel (Stitch schema)
            ═══════════════════════════════════════════════════════ */}
        <section className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">
              Core KPIs
            </h2>
            {/* PROJECTED / ACTUAL toggle */}
            <div className="flex p-1 bg-[#060f15] rounded-lg">
              <button
                onClick={() => setKpiMode('projected')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  kpiMode === 'projected'
                    ? 'bg-[#2d363d] text-[#57f1db] shadow-sm'
                    : 'text-[#bacac5]/50'
                }`}
              >
                PROJECTED
              </button>
              <button
                onClick={() => setKpiMode('actual')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  kpiMode === 'actual'
                    ? 'bg-[#2d363d] text-[#57f1db] shadow-sm'
                    : 'text-[#bacac5]/50'
                }`}
              >
                ACTUAL
              </button>
            </div>
          </div>

          {/* Property / My Share toggle */}
          <div className="flex justify-center">
            <div className="flex p-0.5 bg-[#2d363d] rounded-full w-fit">
              <button
                onClick={() => setKpiScope('property')}
                className={`px-4 py-1 text-[11px] font-bold rounded-full transition-all ${
                  kpiScope === 'property'
                    ? 'bg-[#57f1db] text-[#003731]'
                    : 'text-[#bacac5]'
                }`}
              >
                Property
              </button>
              <button
                onClick={() => setKpiScope('myShare')}
                className={`px-4 py-1 text-[11px] font-bold rounded-full transition-all ${
                  kpiScope === 'myShare'
                    ? 'bg-[#57f1db] text-[#003731]'
                    : 'text-[#bacac5]'
                }`}
              >
                My Share
              </button>
            </div>
          </div>

          {/* KPI Grid — 2×3 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <KpiCell
              label="NOI (Annual)"
              value={derivedMetrics ? fmtDollar(scaleByScope(derivedMetrics.noi / 100)) : '—'}
              fillPct={derivedMetrics ? Math.min(100, Math.abs(derivedMetrics.noi / 100) / 2000) : 0}
            />
            <KpiCell
              label="Cap Rate"
              value={derivedMetrics ? `${derivedMetrics.capRate.toFixed(1)}%` : '—'}
              fillPct={derivedMetrics ? Math.min(100, derivedMetrics.capRate * 10) : 0}
            />
            <KpiCell
              label="DSCR"
              value={derivedMetrics ? `${derivedMetrics.dscr.toFixed(2)}x` : '—'}
              fillPct={derivedMetrics ? Math.min(100, derivedMetrics.dscr * 50) : 0}
            />
            <KpiCell
              label="IRR (5yr)"
              value={(() => {
                if (!project?.financials) return '—';
                try {
                  const fin = project.financials;
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
                    totalCashInvested,
                    annualCashFlow,
                    holdYears,
                    purchasePrice,
                    appreciation,
                    loanAmount,
                    loanRate,
                    loanTerm
                  );
                  const irrVal = computeIRR(cashFlows);
                  if (irrVal === null) return '—';
                  return `${(irrVal * 100).toFixed(1)}%`;
                } catch { return '—'; }
              })()}
              fillPct={(() => {
                if (!project?.financials) return 0;
                try {
                  const fin = project.financials;
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
                    totalCashInvested,
                    annualCashFlow,
                    holdYears,
                    purchasePrice,
                    appreciation,
                    loanAmount,
                    loanRate,
                    loanTerm
                  );
                  const irrVal = computeIRR(cashFlows);
                  if (irrVal === null) return 0;
                  return Math.min(100, irrVal * 100 * 5);
                } catch { return 0; }
              })()}
            />
            <KpiCell
              label="LTV"
              value={derivedMetrics ? `${derivedMetrics.ltv.toFixed(0)}%` : '—'}
              fillPct={derivedMetrics ? derivedMetrics.ltv : 0}
            />
            <KpiCell
              label="CoC Return"
              value={derivedMetrics ? `${derivedMetrics.cashOnCashReturn.toFixed(1)}%` : '—'}
              fillPct={derivedMetrics ? Math.min(100, derivedMetrics.cashOnCashReturn * 7) : 0}
            />
          </div>

          {/* Expandable: 5 more metrics */}
          {showAllKpis && derivedMetrics && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-2 border-t border-white/5">
              <KpiCell
                label="GRM"
                value={`${derivedMetrics.grossRentMultiplier.toFixed(1)}`}
                fillPct={Math.min(100, derivedMetrics.grossRentMultiplier * 5)}
              />
              <KpiCell
                label="OER"
                value={`${derivedMetrics.oer.toFixed(1)}%`}
                fillPct={derivedMetrics.oer}
              />
              <KpiCell
                label="ARV Spread"
                value={fmtDollar(scaleByScope(derivedMetrics.arvSpread / 100))}
                fillPct={Math.min(100, Math.abs(derivedMetrics.arvSpreadPercent))}
              />
              <KpiCell
                label="Break-Even Occ."
                value={`${derivedMetrics.breakEvenOccupancyRate.toFixed(0)}%`}
                fillPct={derivedMetrics.breakEvenOccupancyRate}
              />
              <KpiCell
                label="Annual Cash Flow"
                value={fmtDollar(scaleByScope(derivedMetrics.annualCashFlow / 100))}
                fillPct={Math.min(100, Math.abs(derivedMetrics.annualCashFlow / 100) / 1000)}
              />
              <KpiCell
                label="Vacancy Rate"
                value={`${derivedMetrics.vacancyRate.toFixed(1)}%`}
                fillPct={derivedMetrics.vacancyRate}
              />
            </div>
          )}

          <button
            onClick={() => setShowAllKpis(!showAllKpis)}
            className="w-full text-center py-2 text-[#bacac5] text-[12px] leading-[14px] font-medium tracking-[0.05em] border-t border-white/5 mt-2 hover:text-[#57f1db] transition-colors flex items-center justify-center gap-1"
          >
            {showAllKpis ? (
              <>
                <ChevronUp className="w-3 h-3" /> Hide Extra Metrics
              </>
            ) : (
              <>
                + View 5 More Metrics
              </>
            )}
          </button>
        </section>

        {/* ═══════════════════════════════════════════════════════
            Deal Analyzer (MAO Calculator)
            ═══════════════════════════════════════════════════════ */}
        <ProjectAnalyzer
          arvCents={phase1Live.estimatedARV ?? project.financials?.estimatedARV ?? 0}
          rehabCents={phase1Live.projectedRehabCost ?? project.financials?.projectedRehabCost ?? 0}
          counterPriceCents={project.financials?.counterPriceCents}
          phaseColor={PHASE_COLOR}
        />

        {/* ═══════════════════════════════════════════════════════
            Offer Generation Pipeline (Glass Card)
            ═══════════════════════════════════════════════════════ */}
        <section className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-white/10"
            style={{ background: 'linear-gradient(135deg, rgba(87, 241, 219, 0.15) 0%, rgba(87, 241, 219, 0.05) 100%)' }}
          >
            <DollarSign className="w-4 h-4 text-[#57f1db]" />
            <h2 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#57f1db] uppercase">
              Offer Generation Pipeline
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Offer Pipeline Board */}
            <OfferPipelineTracker
              currentStatus={project.financials?.offerStatus as string || 'Drafting'}
              onStatusChange={handlePipelineStatusChange}
              onCounterSubmit={handleCounterSubmit}
              offerAmountCents={phase1Live.purchasePrice ?? project.financials?.purchasePrice ?? 0}
              propertyAddress={project.address}
              phaseColor={PHASE_COLOR}
            />

            <LoanProcessingPipeline
              currentStatus={project.loanStatus}
              onStatusChange={handleLoanStatusChange}
            />

            {/* LOI generator */}
            <LOIGenerator
              propertyAddress={project.address}
              maoCents={phase1Live.purchasePrice ?? project.financials?.purchasePrice ?? 0}
              phaseColor={PHASE_COLOR}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            Purchase Readiness Checklist (Glass Card)
            ═══════════════════════════════════════════════════════ */}
        <section className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-white/10"
            style={{ background: 'linear-gradient(135deg, rgba(87, 241, 219, 0.10) 0%, rgba(87, 241, 219, 0.03) 100%)' }}
          >
            <FileText className="w-4 h-4 text-[#57f1db]" />
            <h2 className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#57f1db] uppercase">
              Purchase Readiness Checklist
            </h2>
            <span className="ml-auto text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#bacac5]">
              {completedReadinessCount}/{readinessItems.length || 4} Complete
            </span>
          </div>
          <div className="p-6">
            <PurchaseReadinessChecklist
              items={project.purchaseReadinessChecklist}
              onItemChange={handleReadinessChange}
              phaseColor={PHASE_COLOR}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            Lock Deal & Proceed to Purchase (Stitch schema CTA)
            ═══════════════════════════════════════════════════════ */}
        <div className="glass-card rounded-xl flex flex-col items-center gap-5 py-10 px-6">
          <div className="text-center space-y-2">
            <h3 className="text-[18px] leading-[28px] font-bold text-[#dae4ec]">
              Ready for Acquisition
            </h3>
            <p className="text-[14px] leading-[20px] text-[#bacac5] max-w-md">
              Unlock Phase 2 when your offer is accepted and capital is fully raised.
            </p>
          </div>
          
          <button
            disabled={!canLockDeal || advancing || phase1Locked}
            onClick={handleAdvanceToPhase2}
            className={`flex items-center gap-2 px-10 py-4 rounded-xl text-[14px] leading-[16px] font-semibold tracking-[0.02em] transition-all duration-200 active:scale-95 disabled:cursor-not-allowed
              ${canLockDeal && !phase1Locked
                ? 'bg-[#57f1db] text-[#003731] luminous-glow hover:scale-[1.02]'
                : 'bg-white/5 text-[#bacac5]/50 border border-white/10'}`}
          >
            {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {phase1Locked ? 'Deal Locked' : 'Lock Deal & Proceed to Purchase'}
          </button>
          
          {!phase1Locked && (
            <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.1em] mt-1">
              <span className={isOfferAccepted ? 'text-[#57f1db]' : 'text-[#ffb4ab]'}>
                {isOfferAccepted ? '✓ Offer Accepted' : '✗ Offer Not Accepted'}
              </span>
              <span className={isFullyFunded ? 'text-[#57f1db]' : 'text-[#ffb4ab]'}>
                {isFullyFunded ? '✓ 100% Funded' : '✗ Not Fully Funded'}
              </span>
              <span className={is100PercentReady ? 'text-[#57f1db]' : 'text-[#ffb4ab]'}>
                {is100PercentReady ? '✓ Documents Ready' : '✗ Missing Documents'}
              </span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KpiCell — Single metric cell for the Core KPIs panel
   Matches Stitch schema: label + value + thin teal bar
   ═══════════════════════════════════════════════════════════════ */
function KpiCell({ label, value, fillPct }: { label: string; value: string; fillPct: number }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-[#bacac5] uppercase tracking-wider">{label}</p>
      <p className="text-[24px] leading-[32px] font-semibold text-[#dae4ec]">{value}</p>
      <div className="h-0.5 w-full bg-[#57f1db]/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#57f1db] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, fillPct))}%` }}
        />
      </div>
    </div>
  );
}
