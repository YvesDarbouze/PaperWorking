'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { usePipelineData } from '@/context/ProjectPipelineContext';
import DealCalculator from '@/components/project/DealCalculator';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import { PhaseLockedBanner } from '@/components/project/PhaseLockedBanner';
import ConversationalForm from '@/components/conversational/ConversationalForm';
import type { QuestionDef, FormAnswers } from '@/components/conversational/types';
import { projectsService } from '@/lib/firebase/deals';
import type { Phase1Snapshot, LoanStatus, PurchaseReadinessItem } from '@/types/schema';
import { CrowdfundingTracker, type Investor } from '@/components/project/CrowdfundingTracker';
import LOIGenerator from '@/components/project/LOIGenerator';
import { LoanProcessingPipeline } from '@/components/project/LoanProcessingPipeline';
import { DealAnalyzer } from '@/components/project/DealAnalyzer';
import { TargetIdentification } from '@/components/project/TargetIdentification';
import { OfferPipelineTracker } from '@/components/project/OfferPipelineTracker';
import { PurchaseReadinessChecklist } from '@/components/project/PurchaseReadinessChecklist';
import { ContingencyCountdownWidget } from '@/components/project/ContingencyCountdownWidget';
import { EMDVerificationWidget } from '@/components/project/EMDVerificationWidget';
import {
  Building2,
  MapPin,
  CalendarDays,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/phase-1 — Acquisition Workspace

   Header chrome (breadcrumb, address, phase stepper) is provided
   by the parent layout.tsx workspace shell — NOT duplicated here.

   Project data is sourced from WorkspaceContext (no re-fetch).
   ═══════════════════════════════════════════════════════════════ */

const PHASE_COLOR = '#595959';

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
  const [advancing, setAdvancing]     = useState(false);
  const [loanStatus, setLoanStatus]   = useState<LoanStatus | undefined>(undefined);
  const [investors, setInvestors]     = useState<Investor[]>([]);

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading, refresh } = useWorkspaceProject();

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
    await projectsService.updateDeal(project.id, { financials: merged });
    refresh();
  }

  async function handleTargetSave(updates: any) {
    if (!project) return;
    await projectsService.updateDeal(project.id, updates);
    refresh();
  }

  async function handleReadinessChange(updatedItems: PurchaseReadinessItem[]) {
    if (!project) return;
    await projectsService.updateDeal(project.id, { purchaseReadinessChecklist: updatedItems });
    refresh();
  }

  async function handlePipelineStatusChange(status: string) {
    if (!project) return;
    const merged = { ...(project.financials ?? {}), offerStatus: status };
    await projectsService.updateDeal(project.id, { financials: merged });
    refresh();
  }

  async function handleCounterSubmit(priceCents: number, terms: string) {
    if (!project) return;
    const merged = { 
      ...(project.financials ?? {}), 
      counterPriceCents: priceCents,
      counterTerms: terms
    };
    await projectsService.updateDeal(project.id, { financials: merged });
    refresh();
  }

  async function handleClosingDateChange(dateStr: string) {
    if (!project) return;
    const [year, month, day] = dateStr.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    const merged = { ...(project.financials ?? {}), acquisitionDate: newDate };
    await projectsService.updateDeal(project.id, { financials: merged });
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
    await projectsService.updateDeal(project.id, { financials: merged });
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
      await projectsService.updateDeal(project.id, { phaseStatus: 'Phase 2: Acquisition' });
      
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-2 rounded-full animate-spin"
            style={{ borderColor: PHASE_COLOR, borderTopColor: 'transparent' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--text-secondary)' }}>
            Loading Workspace…
          </p>
        </div>
      </div>
    );
  }

  /* ── Not found state ── */
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="text-center space-y-3">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Project not found.</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="text-xs font-bold uppercase tracking-[0.12em] underline"
            style={{ color: 'var(--text-secondary)' }}
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

  /* ── Helper: format date ── */
  const fmtDate = (d?: string | Date) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };



  const projectData = project as any;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>

      {/* ── Explainer Video Banner (flush below workspace header) ── */}
      <PhaseExplainerVideo
        phaseKey="phase-1"
        title="Understanding Phase 1: Acquisition"
        description="Learn the fundamentals of finding deals, crowdfunding capital, and generating competitive offers."
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        duration="2:45"
      />

      {/* ═══════════════════════════════════════════════════════
          Workspace Body — Component Container
          Header chrome is provided by layout.tsx — not here.
          ═══════════════════════════════════════════════════════ */}
      <main className="max-w-6xl mx-auto px-6 lg:px-12 py-16 space-y-16">

        {/* ── Success banner ── */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#16A34A' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#166534' }}>Project created successfully</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#15803D' }}>
              Your acquisition workspace is ready. Complete the items below to build your deal folder.
            </p>
          </div>
        </div>

        {/* ── Two-column workspace grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* ── Left column (3/5): Primary content ── */}
          <div className="lg:col-span-3 space-y-12">

            {phase1Locked && (
              <PhaseLockedBanner
                phaseLabel="Phase 1: Acquisition"
                capturedAt={snapshots['phase-1']?.capturedAt}
                referencedBy={['Phase 3 (Hold)', 'Phase 4 (Exit)']}
              />
            )}

            {/* ════════════════════════════════════════════════════════
                Conversational Form Engine (active phase)
                vs.
                Read-only DealCalculator summary (locked phase)
                ════════════════════════════════════════════════════════ */}
            {phase1Locked ? (
              /* ── Locked: show compact read-only summary ── */
              <DealCalculator
                phaseColor={PHASE_COLOR}
                projectId={projectId}
                propertyAddress={project.address}
                initialFinancials={project.financials}
                onSaveSuccess={() => refresh()}
                readOnly={true}
              />
            ) : (
              /* ── Active: conversational question engine ── */
              <>
                <ConversationalForm
                  questions={PHASE_1_QUESTIONS}
                  initialAnswers={toInitialAnswers()}
                  phaseColor={PHASE_COLOR}
                  readOnly={false}
                  onStepSave={handleStepSave}
                  onComplete={handleFormComplete}
                />

                {/* Manual advance fallback — shown during the "completed" state
                    of the form (after hitting Complete on final step) */}
                {advancing && (
                  <div
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      gap:            '10px',
                      padding:        '16px',
                      color:          'var(--text-secondary)',
                      fontSize:       '12px',
                      fontWeight:     700,
                    }}
                  >
                    <Loader2
                      size={14}
                      strokeWidth={2}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    Locking Phase 1 and advancing…
                  </div>
                )}
              </>
            )}

            {/* ── Deal Analyzer (Dynamic MAO Calculator) ── */}
            <DealAnalyzer
              arvCents={phase1Live.estimatedARV ?? project.financials?.estimatedARV ?? 0}
              rehabCents={phase1Live.projectedRehabCost ?? project.financials?.projectedRehabCost ?? 0}
              counterPriceCents={project.financials?.counterPriceCents}
              phaseColor={PHASE_COLOR}
            />

            {/* Property Identity Card (Target Identification) */}
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

          {/* ── Right column (2/5): Crowdfunding + Offer Pipeline ── */}
          <div className="lg:col-span-2 space-y-10">

            {/* ── Contingency Countdown ── */}
            <ContingencyCountdownWidget
              closingDate={project.financials?.acquisitionDate}
              onClosingDateChange={handleClosingDateChange}
              phaseColor={PHASE_COLOR}
              readOnly={phase1Locked}
            />

            {/* ── EMD Verification ── */}
            <EMDVerificationWidget
              emdAmount={project.financials?.emdAmount ?? 0}
              emdClearedDate={project.financials?.emdClearedDate}
              emdVerified={project.financials?.emdVerified}
              onVerify={handleEMDVerify}
              phaseColor={PHASE_COLOR}
              readOnly={phase1Locked}
            />

            {/* ── Capital Raise Tracker ── */}
            <CrowdfundingTracker
              targetCents={project.financials?.projectedRehabCost ?? 0}
              phaseColor={PHASE_COLOR}
              onChange={setInvestors}
            />

            {/* ── Offer Letter Generation Pipeline ── */}
            <section
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
            >
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: PHASE_COLOR }}>
                <DollarSign className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#FFFFFF' }}>
                  Offer Generation Pipeline
                </h2>
              </div>

              {/* Loan processing stepper */}
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
                  currentStatus={loanStatus}
                  onStatusChange={setLoanStatus}
                />

                {/* LOI generator — rendered inside the same card */}
                <LOIGenerator
                  propertyAddress={project.address}
                  maoCents={phase1Live.purchasePrice ?? project.financials?.purchasePrice ?? 0}
                  phaseColor={PHASE_COLOR}
                />
              </div>
            </section>

            {/* ── Purchase Readiness Checklist ── */}
            <PurchaseReadinessChecklist
              items={project.purchaseReadinessChecklist}
              onItemChange={handleReadinessChange}
              phaseColor={PHASE_COLOR}
            />

          </div>
        </div>

        {/* ── Lock Deal & Proceed to Purchase ── */}
        <div className="flex flex-col items-center gap-4 py-12 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-primary)' }}>
              Ready for Acquisition
            </h3>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Unlock Phase 2 when your offer is accepted and capital is fully raised.
            </p>
          </div>
          
          <button
            disabled={!canLockDeal || advancing || phase1Locked}
            onClick={handleAdvanceToPhase2}
            className="flex items-center gap-2 px-8 py-4 rounded-md text-xs font-bold uppercase tracking-[0.1em] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: canLockDeal ? '#16A34A' : 'var(--bg-canvas)',
              color: canLockDeal ? '#FFFFFF' : 'var(--text-secondary)',
              border: canLockDeal ? 'none' : '1px solid var(--border-ui)'
            }}
          >
            {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {phase1Locked ? 'Deal Locked' : 'Lock Deal & Proceed to Purchase'}
          </button>
          
          {!phase1Locked && (
            <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.1em] mt-2">
              <span style={{ color: isOfferAccepted ? '#16A34A' : '#C2410C' }}>
                {isOfferAccepted ? '✓ Offer Accepted' : '✗ Offer Not Accepted'}
              </span>
              <span style={{ color: isFullyFunded ? '#16A34A' : '#C2410C' }}>
                {isFullyFunded ? '✓ 100% Funded' : '✗ Not Fully Funded'}
              </span>
              <span style={{ color: is100PercentReady ? '#16A34A' : '#C2410C' }}>
                {is100PercentReady ? '✓ Documents Ready' : '✗ Missing Documents'}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
