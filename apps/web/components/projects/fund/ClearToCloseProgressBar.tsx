'use client';

import React, { useMemo } from 'react';
import type {
  ProjectFundingTerms,
} from '@/lib/projects/types';
import { cn } from '@/lib/utils';
import {
  ShieldCheck,
  Check,
  Clock,
  WarningCircle,
  Buildings,
  FileText,
  Lock,
} from '@/components/icons/PhosphorIcons';

export interface ClearToCloseProgressBarProps {
  funding: ProjectFundingTerms;
  earnestMoney?: {
    amount?: number;
    status?: string;
    receiptConfirmed?: boolean;
    dueDate?: string;
  } | null;
  contingencies?: Array<{
    id: string;
    type: string;
    label?: string;
    status: string;
    deadline: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  className?: string;
  onSelectStage?: (stageId: string) => void;
}

export interface ClosingMilestoneStage {
  id: string;
  number: number;
  label: string;
  shortLabel: string;
  description: string;
  isComplete: boolean;
  isInProgress: boolean;
  blockingItems: string[];
}

export function ClearToCloseProgressBar({
  funding,
  earnestMoney,
  contingencies = [],
  tasks = [],
  className = '',
  onSelectStage,
}: ClearToCloseProgressBarProps) {
  const verification = funding.valuationVerification;
  const legal = funding.legalTransfer;
  const lenderConditions = funding.lenderConditions || [];

  // Evaluate each milestone stage based on real state data
  const stages: ClosingMilestoneStage[] = useMemo(() => {
    // 1. PSA & Escrow
    const emdConfirmed = Boolean(earnestMoney?.receiptConfirmed || earnestMoney?.status === 'held');
    const stage1Blockers: string[] = [];
    if (!emdConfirmed) {
      stage1Blockers.push('Earnest Money Deposit receipt not yet confirmed by escrow.');
    }
    const stage1Complete: boolean = Boolean(emdConfirmed);
    const stage1InProgress: boolean = !stage1Complete;

    // 2. Diligence & Underwriting
    const stage2Blockers: string[] = [];
    const inspectionSignedOff = Boolean(verification?.physicalInspectionSignedOff);
    if (!inspectionSignedOff) {
      stage2Blockers.push('Physical property inspection condition sign-off pending.');
    }
    const openDiligenceContingencies = contingencies.filter(
      (c) =>
        (c.type === 'inspection' || c.type === 'environmental') &&
        c.status !== 'satisfied' &&
        c.status !== 'waived'
    );
    if (openDiligenceContingencies.length > 0) {
      stage2Blockers.push(
        `${openDiligenceContingencies.length} physical/environmental contingency deadline open.`
      );
    }
    const stage2Complete: boolean = Boolean(stage1Complete && inspectionSignedOff && openDiligenceContingencies.length === 0);
    const stage2InProgress: boolean = Boolean(stage1Complete && !stage2Complete);

    // 3. Valuation & PTD Clearance
    const stage3Blockers: string[] = [];
    const hasAppraisal = Boolean(verification?.appraisedValue && verification.appraisedValue > 0);
    if (!hasAppraisal) {
      stage3Blockers.push('Commercial narrative appraisal report required.');
    }
    const gapAmount = verification?.appraisalGapAmount || 0;
    const gapResolved =
      gapAmount <= 0 ||
      (verification?.gapResolutionStrategy && verification.gapResolutionStrategy !== 'none');
    if (gapAmount > 0 && !gapResolved) {
      stage3Blockers.push(`Appraisal shortfall of $${gapAmount.toLocaleString()} requires resolution.`);
    }
    const ptdConditions = lenderConditions.filter((c) => c.category === 'PTD');
    const unclearedPtd = ptdConditions.filter((c) => c.status !== 'approved' && c.status !== 'waived');
    if (unclearedPtd.length > 0) {
      stage3Blockers.push(`${unclearedPtd.length} Prior to Documents (PTD) condition pending.`);
    }
    const stage3Complete: boolean = Boolean(
      stage2Complete &&
      hasAppraisal &&
      gapResolved &&
      unclearedPtd.length === 0
    );
    const stage3InProgress: boolean = Boolean(stage2Complete && !stage3Complete);

    // 4. Clear to Close & PTF
    const stage4Blockers: string[] = [];
    const ptfConditions = lenderConditions.filter((c) => c.category === 'PTF');
    const unclearedPtf = ptfConditions.filter((c) => c.status !== 'approved' && c.status !== 'waived');
    if (unclearedPtf.length > 0) {
      stage4Blockers.push(`${unclearedPtf.length} Prior to Funding (PTF) condition pending.`);
    }
    const entityAuthorityVerified = Boolean(
      legal?.goodStandingVerified && legal?.operatingAgreementExecuted
    );
    if (!entityAuthorityVerified) {
      stage4Blockers.push('Borrowing entity Good Standing and Operating Agreement authority pending.');
    }
    const stage4Complete: boolean = Boolean(
      stage3Complete &&
      unclearedPtf.length === 0 &&
      entityAuthorityVerified
    );
    const stage4InProgress: boolean = Boolean(stage3Complete && !stage4Complete);

    // 5. Settlement & Deed Recordation
    const stage5Blockers: string[] = [];
    const wireVoiceVerified = Boolean(legal?.wireFraudVerified);
    if (!wireVoiceVerified) {
      stage5Blockers.push('Institutional voice verification of escrow wire instructions required.');
    }
    const deedRecorded = Boolean(legal?.deedInstrumentNumber && legal.deedRecordingDate);
    if (!deedRecorded) {
      stage5Blockers.push('County clerk deed recording instrument number and date required.');
    }
    const stage5Complete: boolean = Boolean(stage4Complete && wireVoiceVerified && deedRecorded);
    const stage5InProgress: boolean = Boolean(stage4Complete && !stage5Complete);

    return [
      {
        id: 'psa_escrow',
        number: 1,
        label: 'PSA & Escrow Deposit',
        shortLabel: 'Escrow',
        description: 'Contract executed & EMD wired to title escrow',
        isComplete: stage1Complete,
        isInProgress: stage1InProgress,
        blockingItems: stage1Blockers,
      },
      {
        id: 'diligence_underwriting',
        number: 2,
        label: 'Diligence & Underwriting',
        shortLabel: 'Diligence',
        description: 'PCA inspection sign-off & loan submission',
        isComplete: stage2Complete,
        isInProgress: stage2InProgress,
        blockingItems: stage2Blockers,
      },
      {
        id: 'valuation_ptd',
        number: 3,
        label: 'Valuation & PTD Clearance',
        shortLabel: 'PTD Docs',
        description: 'Narrative appraisal approved & PTD conditions cleared',
        isComplete: stage3Complete,
        isInProgress: stage3InProgress,
        blockingItems: stage3Blockers,
      },
      {
        id: 'ctc_ptf',
        number: 4,
        label: 'Clear to Close & PTF',
        shortLabel: 'Clear to Close',
        description: 'PTF conditions cleared & entity corporate authority',
        isComplete: stage4Complete,
        isInProgress: stage4InProgress,
        blockingItems: stage4Blockers,
      },
      {
        id: 'settlement_deed',
        number: 5,
        label: 'Funding & Deed Recordation',
        shortLabel: 'Record Deed',
        description: 'Voice wire verified & county deed recorded',
        isComplete: stage5Complete,
        isInProgress: stage5InProgress,
        blockingItems: stage5Blockers,
      },
    ];
  }, [earnestMoney, contingencies, verification, legal, lenderConditions]);

  // Overall readiness index calculation
  const completedStagesCount = stages.filter((s) => s.isComplete).length;
  const currentActiveStage = stages.find((s) => s.isInProgress) || (completedStagesCount === 5 ? stages[4] : stages[0]);
  const readinessPercentage = Math.round((completedStagesCount / stages.length) * 100);

  // Collect all active blockers across stages
  const activeBlockers = useMemo(() => {
    return stages.flatMap((s) => s.blockingItems);
  }, [stages]);

  return (
    <div
      data-testid="clear-to-close-progress-bar"
      className={cn('w-full border border-neutral-800 bg-neutral-950 p-4 sm:p-5 rounded-none space-y-4', className)}
    >
      {/* Header with Readiness Index */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-none bg-blue-500/20 text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Clear to Close (CTC) Readiness Radar
            </h2>
            <span
              data-testid="ctc-readiness-badge"
              className={cn(
                'rounded-none px-2 py-0.5 text-[11px] font-mono font-bold uppercase border',
                readinessPercentage === 100
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : readinessPercentage >= 60
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              )}
            >
              {`${readinessPercentage}% Ready`}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            5-stage statutory escrow closing radar from Purchase Agreement execution to county deed recordation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">
            Current Stage: <strong className="text-white">{currentActiveStage.label}</strong>
          </span>
        </div>
      </div>

      {/* 5-Stage Milestone Step Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3">
        {stages.map((stage) => {
          const isSelected = stage.id === currentActiveStage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage?.(stage.id)}
              data-testid={`ctc-stage-${stage.id}`}
              className={cn(
                'flex flex-col justify-between p-3 text-left transition rounded-none border min-h-[44px]',
                stage.isComplete
                  ? 'border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/30'
                  : stage.isInProgress
                  ? 'border-blue-500/60 bg-blue-950/30 ring-1 ring-blue-500/40'
                  : 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/60 opacity-70'
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                  Stage 0{stage.number}
                </span>
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-none text-[11px]',
                    stage.isComplete
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : stage.isInProgress
                      ? 'bg-blue-500/20 text-blue-300 animate-pulse'
                      : 'bg-neutral-800 text-neutral-500'
                  )}
                >
                  {stage.isComplete ? (
                    <Check className="h-3 w-3" />
                  ) : stage.isInProgress ? (
                    <Clock className="h-3 w-3" />
                  ) : (
                    <span>{stage.number}</span>
                  )}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-white leading-snug">
                  {stage.label}
                </p>
                <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                  {stage.description}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                <span
                  className={cn(
                    'font-medium uppercase tracking-wider',
                    stage.isComplete
                      ? 'text-emerald-400'
                      : stage.isInProgress
                      ? 'text-blue-400'
                      : 'text-neutral-500'
                  )}
                >
                  {stage.isComplete ? 'Cleared' : stage.isInProgress ? 'Active' : 'Queued'}
                </span>
                {stage.blockingItems.length > 0 && !stage.isComplete && (
                  <span className="text-amber-400 font-mono">
                    {stage.blockingItems.length} Blocker{stage.blockingItems.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Blocker Chips Banner */}
      {activeBlockers.length > 0 && (
        <div
          data-testid="ctc-blockers-strip"
          className="border border-amber-500/30 bg-amber-500/10 p-3 rounded-none space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
            <WarningCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Active Clear-to-Close Blockers ({activeBlockers.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {activeBlockers.map((blocker, idx) => (
              <div
                key={idx}
                className="flex items-start gap-1.5 text-xs text-amber-200/90 bg-neutral-950/40 p-2 border border-amber-500/20"
              >
                <span className="text-amber-400 shrink-0">•</span>
                <span>{blocker}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClearToCloseProgressBar;
