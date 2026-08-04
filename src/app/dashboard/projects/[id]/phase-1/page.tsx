'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { usePhaseAccess } from '@/hooks/usePhaseAccess';
import { PhaseAccessGuard } from '@/components/project/PhaseAccessGuard';
import { usePipelineData } from '@/context/ProjectPipelineContext';
import ProjectCalculator from '@/components/project/ProjectCalculator';
import { MarketContextPanel } from '@/components/project/MarketContextPanel';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';
import { PhaseLockedBanner } from '@/components/project/PhaseLockedBanner';
import ConversationalForm from '@/components/conversational/ConversationalForm';
import type { QuestionDef, FormAnswers } from '@/components/conversational/types';
import { projectsService } from '@/lib/firebase/deals';
import { closeListing } from '@/actions/listings';
import toast from 'react-hot-toast';
import type { Phase1Snapshot, LoanStatus, PurchaseReadinessItem } from '@/types/schema';
import { CrowdfundingTracker } from '@/components/project/CrowdfundingTracker';
import { DealUpdateComposer } from '@/components/project/DealUpdateComposer';
import { InvestorQandATracker } from '@/components/project/InvestorQandATracker';
import { DealComposer } from '@/components/project/DealComposer';
import DealOnePagerView from '@/components/listings/DealOnePagerView';
import LOIGenerator from '@/components/project/LOIGenerator';
import { LoanProcessingPipeline } from '@/components/project/LoanProcessingPipeline';
import { ProjectAnalyzer } from '@/components/project/ProjectAnalyzer';
import { TargetIdentification } from '@/components/project/TargetIdentification';
import { FirstPassScreen } from '@/components/project/FirstPassScreen';
import { SourceSellerMarketSnapshot } from '@/components/project/SourceSellerMarketSnapshot';
import { CompsARVCard } from '@/components/project/CompsARVCard';
import { OfferPipelineTracker } from '@/components/project/OfferPipelineTracker';
import { PurchaseReadinessChecklist } from '@/components/project/PurchaseReadinessChecklist';
import { ContingencyCountdownWidget } from '@/components/project/ContingencyCountdownWidget';
import { PSACard } from '@/components/project/PSACard';
import { EarnestMoneyCard } from '@/components/project/EarnestMoneyCard';
import { InspectionCard } from '@/components/project/InspectionCard';
import { TitleCard } from '@/components/project/TitleCard';
import { SurveyCard } from '@/components/project/SurveyCard';
import { PhaseICard } from '@/components/project/PhaseICard';
import { HOACard } from '@/components/project/HOACard';
import { AttorneyCard } from '@/components/project/AttorneyCard';
import { ZoningCard } from '@/components/project/ZoningCard';
import { InsuranceCard } from '@/components/project/InsuranceCard';
import FundingSourceTracker from '@/components/evaluation/FundingSourceTracker';
import { DeclareStrategyPanel } from '@/components/project/DeclareStrategyPanel';
import { TenKpiScorecard } from '@/components/project/TenKpiScorecard';

import { HurdleTestCard } from '@/components/project/HurdleTestCard';
import { RehabBudgetCard } from '@/components/project/RehabBudgetCard';
import { IncomeAssumptionsCard } from '@/components/project/IncomeAssumptionsCard';
import { ExpenseAssumptionsCard } from '@/components/project/ExpenseAssumptionsCard';
import { FinancingAssumptionsCard } from '@/components/project/FinancingAssumptionsCard';
import { ContingencyTracker } from '@/components/project/ContingencyTracker';
import { GoNoGoPanel } from '@/components/project/GoNoGoPanel';
import { EquityEnginePanel } from '@/components/project/EquityEnginePanel';
import { AudienceManager } from '@/components/project/AudienceManager';
import { VendorMatchList } from '@/components/project/VendorMatchList';
import {
  deriveAllMetrics,
  type MetricResult,
} from '@/lib/metrics';
import { AcquisitionPhaseGate } from '@/components/project/AcquisitionPhaseGate';
import { MetricReadout } from '@/components/metrics/MetricReadout';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
  Plus,
  ShieldAlert,
} from 'lucide-react';

const PHASE_COLOR = '#454955';

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

function getScorecardInputsHash(project: any): string {
  if (!project) return '';
  const f = (project.financials || {}) as any;
  const values = [
    f.purchasePrice ?? 0,
    f.listedPrice ?? 0,
    f.projectedRehabCost ?? 0,
    f.estimatedARV ?? 0,
    f.arv ?? 0,
    f.targetCapRate ?? 0,
    f.targetCoc ?? f.targetCoCReturn ?? 0,
    f.minDscr ?? f.targetMinDSCR ?? 0,
    f.maxPurchasePrice ?? f.targetMaxPurchasePrice ?? 0,
    f.gross_rent_per_unit ?? f.monthlyGrossRent ?? f.grossRent ?? 0,
    f.vacancy_pct ?? f.vacancyRatePercent ?? f.vacancyRate ?? 0,
    f.other_income ?? f.otherIncome ?? 0,
    f.tax ?? f.taxes ?? 0,
    f.insurance ?? 0,
    f.utilities ?? 0,
    f.management ?? 0,
    f.management_pct ?? 0,
    f.maintenance ?? 0,
    f.maintenance_pct ?? f.monthlyMaintenanceReserve ?? 0,
    f.otherExpenses ?? 0,
    f.downPaymentPercent ?? 0,
    f.loanInterestRate ?? f.interestRate ?? 0,
    f.loanTermYears ?? 0,
    project.dispositionType || '',
    project.subStrategy || '',
  ];
  return values.join('|');
}

export default function Phase1WorkspacePage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useAuth();
  const projectId = params?.id as string;

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading, refresh } = useWorkspaceProject();
  const { canView, canEdit, loading: accessLoading } = usePhaseAccess('phase-1');

  /* ── Stage Stepper active state ── */
  const [activeStage, setActiveStage] = useState<string>('target');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [contingencies, setContingencies] = useState<any[]>([]);

  // Sync stage selection on load and load contingencies
  useEffect(() => {
    if (project) {
      const resumeStage = project.lastActiveStage || localStorage.getItem(`pw_phase1_active_stage_${projectId}`) || 'target';
      setActiveStage(resumeStage);
      setContingencies(project.contingencies || []);
      setOverrideReason(project.overrideReason || '');
    }
  }, [project?.id, projectId, project?.overrideReason, project?.contingencies]);

  // Deep-link scroll routing for components in various stages
  useEffect(() => {
    if (typeof window !== 'undefined' && project) {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get('focus');
      if (focus) {
        let stage = 'underwrite';
        let id = '';

        if (focus === 'rehab') {
          stage = 'underwrite';
          id = 'rehab-budget-card';
        } else if (focus === 'financing' || focus === 'loan_amount' || focus === 'loan_interest_rate' || focus === 'loan_term') {
          stage = 'underwrite';
          id = 'financing-assumptions-card';
        } else if (focus === 'gross_rent_per_unit' || focus === 'income' || focus === 'vacancy_pct') {
          stage = 'underwrite';
          id = 'income-assumptions-card';
        } else if (
          focus === 'tax' ||
          focus === 'insurance' ||
          focus === 'utilities' ||
          focus === 'management_pct' ||
          focus === 'management' ||
          focus === 'maintenance' ||
          focus === 'operating_expenses' ||
          focus === 'oer'
        ) {
          stage = 'underwrite';
          id = 'expense-assumptions-card';
        } else if (focus === 'psa') {
          stage = 'due_diligence';
          id = 'psa-card';
        } else if (focus === 'earnest_money') {
          stage = 'due_diligence';
          id = 'earnest-money-card';
        } else if (focus === 'inspection') {
          stage = 'due_diligence';
          id = 'inspection-card';
        } else if (focus === 'title') {
          stage = 'due_diligence';
          id = 'title-card';
        }

        if (id) {
          setActiveStage(stage);
          setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 500);
        }
      }
    }
  }, [project?.id]);

  const handleStageSelect = async (stageKey: string) => {
    setActiveStage(stageKey);
    localStorage.setItem(`pw_phase1_active_stage_${projectId}`, stageKey);
    if (project) {
      try {
        await projectsService.updateProject(projectId, { lastActiveStage: stageKey });
      } catch (err) {
        console.error('Failed to update lastActiveStage:', err);
      }
    }
  };

  const handleContingenciesChange = async (newContingencies: any[]) => {
    setContingencies(newContingencies);
    if (project) {
      try {
        await projectsService.updateProject(project.id, { contingencies: newContingencies });
        refresh();
      } catch (err) {
        console.error('Failed to update contingencies:', err);
        toast.error('Failed to save contingencies');
      }
    }
  };

  /* ── Pipeline data ── */
  const { isPhaseComplete, snapshots, phase1Live } = usePipelineData();
  const phase1Locked = false;
  const [advancing, setAdvancing] = useState(false);
  const [totalRaisedCents, setTotalRaisedCents] = useState(0);
  const [postingToMarketplace, setPostingToMarketplace] = useState(false);

  // ── Syndicate Invite Modal ────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', equityPct: '', amount: '' });
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showOnePagerPreview, setShowOnePagerPreview] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !user) return;
    setInviteSending(true);
    setInviteError(null);
    try {
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId:             project.id,
          dealName:              project.name || project.address || 'Deal',
          email:                 inviteForm.email.trim(),
          name:                  inviteForm.name.trim(),
          proposedEquityPercent: inviteForm.equityPct ? parseFloat(inviteForm.equityPct) : undefined,
          proposedAmount:        inviteForm.amount    ? parseFloat(inviteForm.amount.replace(/[^0-9.]/g, '')) * 100 : undefined,
          invitedByUid:          user.uid,
          invitedByName:         user.displayName || user.email || 'Investor',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send invitation');
      }
      setInviteSuccess(true);
      setInviteForm({ name: '', email: '', equityPct: '', amount: '' });
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteSending(false);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteSuccess(false);
    setInviteError(null);
    setInviteForm({ name: '', email: '', equityPct: '', amount: '' });
  };

  const handlePostToMarketplace = () => {
    if (!project) return;
    // AQ-27: Navigate to the listing management page for preview + publish
    router.push(`/dashboard/projects/${project.id}/listing`);
  };



  /* ── KPI panel state ── */
  const [kpiScope, setKpiScope] = useState<'property' | 'myShare'>('property');
  const [kpiMode, setKpiMode] = useState<'projected' | 'actual'>('projected');
  const [showAllKpis, setShowAllKpis] = useState(false);

  /* ── Task expansion states ── */
  const [expandedTask, setExpandedTask] = useState<string | null>('financials');

  /* ── Validation for Phase 1 Lock ── */
  const targetRaiseCents = project?.financials?.projectedRehabCost ?? 0;
  const isFullyFunded = targetRaiseCents > 0 && totalRaisedCents >= targetRaiseCents;

  const currentOfferStatus = project?.financials?.offerStatus;
  const isOfferAccepted = currentOfferStatus === 'Accepted';

  const readinessItems = project?.purchaseReadinessChecklist || [];
  const completedReadinessCount = readinessItems.filter(i => i.completed).length;
  // Requires at least 4 default documents to be completed
  const is100PercentReady = completedReadinessCount >= 4;



  /* ── Derive KPI metrics from financials (legacy aggregator) ── */
  const derivedMetrics = useMemo(() => {
    if (!project?.financials) return null;
    try {
      const f = project.financials as any;
      const isAccepted = f.offerStatus === 'Accepted';
      const finalPriceVal = f.renegotiatedPrice != null && f.renegotiatedPrice > 0
        ? f.renegotiatedPrice
        : ((isAccepted && f.finalAgreedPrice != null && f.finalAgreedPrice > 0)
          ? f.finalAgreedPrice
          : (f.purchasePrice || 0));
      const normalized = {
        ...f,
        purchasePrice: finalPriceVal ? finalPriceVal / 100 : 0,
        finalAgreedPrice: f.finalAgreedPrice ? f.finalAgreedPrice / 100 : undefined,
        loanAmount: f.loanAmount ? f.loanAmount / 100 : 0,
        projectedRehabCost: f.projectedRehabCost ? f.projectedRehabCost / 100 : 0,
        estimatedARV: f.estimatedARV ? f.estimatedARV / 100 : 0,
        closingCosts: f.closingCosts ? f.closingCosts / 100 : (f.fixedAcquisitionCosts ? f.fixedAcquisitionCosts / 100 : 0),
        totalCashInvested: f.totalCashInvested ? f.totalCashInvested / 100 : 0,
        emdAmount: f.emdAmount ? f.emdAmount / 100 : undefined,
        loiEarnestAmount: f.loiEarnestAmount ? f.loiEarnestAmount / 100 : undefined,
        monthlyGrossRent: f.monthlyGrossRent ?? f.monthlyRent ?? 0,
        vacancyRatePercent: f.vacancyRatePercent ?? 7,
        holdingCostTaxes: f.holdingCostTaxes ?? 0,
        holdingCostInsurance: f.holdingCostInsurance ?? 0,
        holdingCostUtilities: f.holdingCostUtilities ?? 0,
        propertyManagementFeePercent: f.propertyManagementFeePercent ?? 0,
        monthlyMaintenanceReserve: f.monthlyMaintenanceReserve ?? 0,
        monthlyHOA: f.monthlyHOA ?? 0,
        loanInterestRate: f.loanInterestRate ?? 6.5,
        loanTermYears: f.loanTermYears ?? 30,
      };

      return deriveAllMetrics(
        normalized,
        f.estimatedCurrentValue ? f.estimatedCurrentValue / 100 : undefined,
        project.dispositionType,
        1, // Phase 1
        project.createdAt
      );
    } catch (err) {
      console.error('Failed to derive metrics on phase 1 page:', err);
      return null;
    }
  }, [project?.financials, project?.dispositionType, project?.createdAt]);

  const noiResult: MetricResult = useMemo(() => {
    const rent = project?.financials?.monthlyGrossRent ?? (project?.financials as any)?.monthlyRent ?? 0;
    if (!rent || rent === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.monthlyGrossRent'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.noi ?? null,
      state: 'projected',
      inputsUsed: { 'financials.monthlyGrossRent': rent },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.noi]);

  const capRateResult: MetricResult = useMemo(() => {
    const purchasePrice = project?.financials?.purchasePrice ?? 0;
    if (!purchasePrice || purchasePrice === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.purchasePrice'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.capRate ?? null,
      state: 'projected',
      inputsUsed: { 'financials.purchasePrice': purchasePrice },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.capRate]);

  const grmResult: MetricResult = useMemo(() => {
    const rent = project?.financials?.monthlyGrossRent ?? (project?.financials as any)?.monthlyRent ?? 0;
    if (!rent || rent === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.monthlyGrossRent'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.grossRentMultiplier ?? null,
      state: 'projected',
      inputsUsed: { 'financials.monthlyGrossRent': rent },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.grossRentMultiplier]);

  const dscrResult: MetricResult = useMemo(() => {
    const isAllCash = project?.financials?.financingType === 'All Cash' || (project?.financials?.loanAmount ?? 0) === 0;
    if (isAllCash) {
      return { value: null, state: 'n/a', inputsUsed: {}, inputsMissing: [] } as MetricResult;
    }
    const rent = project?.financials?.monthlyGrossRent ?? (project?.financials as any)?.monthlyRent ?? 0;
    if (!rent || rent === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.monthlyGrossRent'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.dscr ?? null,
      state: 'projected',
      inputsUsed: {
        'financials.loanAmount': project?.financials?.loanAmount ?? 0,
        'financials.loanInterestRate': project?.financials?.loanInterestRate ?? 0,
      },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.dscr]);

  const cocResult: MetricResult = useMemo(() => {
    const totalCash = derivedMetrics?.totalCashInvested ?? 0;
    if (totalCash <= 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.purchasePrice'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.cashOnCashReturn ?? null,
      state: 'projected',
      inputsUsed: { 'financials.totalCashInvested': totalCash },
      inputsMissing: [],
    } as MetricResult;
  }, [derivedMetrics?.totalCashInvested, derivedMetrics?.cashOnCashReturn]);

  const cashFlowResult: MetricResult = useMemo(() => {
    const rent = project?.financials?.monthlyGrossRent ?? (project?.financials as any)?.monthlyRent ?? 0;
    if (!rent || rent === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.monthlyGrossRent'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.monthlyCashFlow ?? null,
      state: 'projected',
      inputsUsed: { 'financials.monthlyGrossRent': rent },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.monthlyCashFlow]);

  const irrResult: MetricResult = useMemo(() => {
    const rent = project?.financials?.monthlyGrossRent ?? (project?.financials as any)?.monthlyRent ?? 0;
    if (!rent || rent === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.monthlyGrossRent'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.irr ?? null,
      state: 'projected',
      inputsUsed: {
        'financials.purchasePrice': project?.financials?.purchasePrice ?? 0,
        'financials.totalCashInvested': derivedMetrics?.totalCashInvested ?? 0,
      },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.totalCashInvested, derivedMetrics?.irr]);

  const occupancyResult: MetricResult = useMemo(() => {
    return {
      value: derivedMetrics?.occupancyRate ?? null,
      state: 'projected',
      inputsUsed: {},
      inputsMissing: [],
    } as MetricResult;
  }, [derivedMetrics?.occupancyRate]);

  const expenseRatioResult: MetricResult = useMemo(() => {
    const rent = project?.financials?.monthlyGrossRent ?? (project?.financials as any)?.monthlyRent ?? 0;
    if (!rent || rent === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.monthlyGrossRent'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.oer ?? null,
      state: 'projected',
      inputsUsed: { 'financials.monthlyGrossRent': rent },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.oer]);

  const appreciationResult: MetricResult = useMemo(() => {
    const purchasePrice = project?.financials?.purchasePrice ?? 0;
    if (!purchasePrice || purchasePrice === 0) {
      return { value: null, state: 'incomplete', inputsUsed: {}, inputsMissing: ['financials.purchasePrice'] } as MetricResult;
    }
    return {
      value: derivedMetrics?.annualizedAppreciation ?? null,
      state: 'projected',
      inputsUsed: { 'financials.purchasePrice': purchasePrice },
      inputsMissing: [],
    } as MetricResult;
  }, [project?.financials, derivedMetrics?.annualizedAppreciation]);

  /* ── Stage Stepper Exit Conditions & Lock Validation ── */
  const isStage1Complete = !!(
    project?.address &&
    project?.propertyType &&
    project?.units &&
    project?.condition &&
    (project?.retrospective || project?.firstPassVerdict === 'PURSUE') &&
    project?.comps &&
    project.comps.length >= 3
  );

  const hasFailedHurdles = useMemo(() => {
    if (!project || !derivedMetrics) return false;
    const f = (project.financials || {}) as any;
    const actualCapRate = derivedMetrics.capRate ?? 0;
    const actualCoc = derivedMetrics.cashOnCashReturn ?? 0;
    const actualDscr = derivedMetrics.dscr ?? 0;
    const actualPurchasePrice = (f.purchasePrice ?? 0) / 100;

    const targetCapRate = f.targetCapRate ?? 5.5;
    const targetCoc = f.targetCoCReturn ?? f.targetCoc ?? 8.0;
    const minDscr = f.targetMinDSCR ?? f.minDscr ?? 1.25;
    const maxPurchasePrice = f.targetMaxPurchasePrice ?? f.maxPurchasePrice ?? 500000;

    const isSale = project.dispositionType === 'SALE';
    const arv = (f.estimatedARV ?? f.arv ?? 0) / 100;
    const rehab = (f.projectedRehabCost ?? 0) / 100;
    const mao = arv * 0.70 - rehab;

    const checks = {
      capRate: actualCapRate >= targetCapRate,
      coc: actualCoc >= targetCoc,
      dscr: actualDscr >= minDscr,
      price: actualPurchasePrice <= maxPurchasePrice,
      mao: !isSale || actualPurchasePrice <= mao,
    };

    return !(checks.capRate && checks.coc && checks.dscr && checks.price && checks.mao);
  }, [project, derivedMetrics]);

  const isStage2Complete = useMemo(() => {
    if (!project) return false;
    const f = (project.financials || {}) as any;
    
    // Check if income/expense are entered
    const incomeEntered = !!(
      (f.grossRent && f.grossRent > 0) ||
      (f.gross_rent_per_unit && f.gross_rent_per_unit > 0) ||
      (f.monthlyGrossRent && f.monthlyGrossRent > 0)
    );
    const expensesEntered = !!(
      f.tax !== undefined ||
      f.taxes !== undefined ||
      f.insurance !== undefined ||
      f.utilities !== undefined ||
      f.management !== undefined ||
      f.management_pct !== undefined ||
      f.maintenance !== undefined ||
      f.maintenance_pct !== undefined ||
      f.holdingCostTaxes !== undefined ||
      f.operatingExpenseTaxes !== undefined
    );
    
    const isTurnkey = project.condition?.toLowerCase() === 'turnkey';
    const needsRehab = !isTurnkey;
    const needsARV = !isTurnkey && project.dispositionType === 'SALE';
    const rehabOk = !needsRehab || (f.projectedRehabCost ?? 0) > 0;
    const arvOk = !needsARV || (f.estimatedARV ?? 0) > 0 || (f.arv ?? 0) > 0;
    
    const currentHash = getScorecardInputsHash(project);
    const scorecardAcknowledged = !!f.scorecardAcknowledged && f.acknowledgedInputsHash === currentHash;
    const verdictOk = !hasFailedHurdles || !!(project.overrideReason && project.overrideReason.trim());
    
    // Detailed hurdle checks diagnostic
    const actualCapRate = derivedMetrics?.capRate ?? 0;
    const actualCoc = derivedMetrics?.cashOnCashReturn ?? 0;
    const actualDscr = derivedMetrics?.dscr ?? 0;
    const actualPurchasePrice = (f.purchasePrice ?? 0) / 100;
    const targetCapRate = f.targetCapRate ?? 5.5;
    const targetCoc = f.targetCoCReturn ?? f.targetCoc ?? 8.0;
    const minDscr = f.targetMinDSCR ?? f.minDscr ?? 1.25;
    const maxPurchasePrice = f.targetMaxPurchasePrice ?? f.maxPurchasePrice ?? 500000;
    const isSale = project.dispositionType === 'SALE';
    const arv = (f.estimatedARV ?? f.arv ?? 0) / 100;
    const rehab = (f.projectedRehabCost ?? 0) / 100;
    const mao = arv * 0.70 - rehab;

    console.log(
      'Hurdles debug detailed:',
      'capRateCheck:', actualCapRate >= targetCapRate, `(${actualCapRate} vs ${targetCapRate})`,
      'cocCheck:', actualCoc >= targetCoc, `(${actualCoc} vs ${targetCoc})`,
      'dscrCheck:', actualDscr >= minDscr, `(${actualDscr} vs ${minDscr})`,
      'priceCheck:', actualPurchasePrice <= maxPurchasePrice, `(${actualPurchasePrice} vs ${maxPurchasePrice})`,
      'maoCheck:', !isSale || actualPurchasePrice <= mao, `(${actualPurchasePrice} vs ${mao})`,
      'hasFailedHurdles:', hasFailedHurdles,
      'verdictOk:', verdictOk,
      'overrideReason:', project.overrideReason
    );

    return incomeEntered && expensesEntered && rehabOk && arvOk && scorecardAcknowledged && verdictOk;
  }, [project, hasFailedHurdles]);

  const isStage3Complete = !!(
    project?.dispositionType &&
    project?.subStrategy
  );

  const isStage4Complete = !!(
    project?.financials?.offerStatus === 'Accepted' &&
    (project?.financials?.finalAgreedPrice ?? 0) > 0
  );

  const isSurveyRequired = (proj: any) => {
    const type = (proj?.propertyType || '').toLowerCase();
    const assetClass = (proj?.assetClass || '').toLowerCase();
    const isCommercial = type.includes('commercial') || assetClass.includes('commercial');
    const isMultifamily = type.includes('multi') || assetClass.includes('multi-family');
    const isLand = type.includes('land') || assetClass.includes('land');
    return isCommercial || isMultifamily || isLand || !!proj?.financials?.surveyElected;
  };

  const isPhaseIRequired = (proj: any) => {
    const type = (proj?.propertyType || '').toLowerCase();
    const assetClass = (proj?.assetClass || '').toLowerCase();
    const isCommercial = type.includes('commercial') || assetClass.includes('commercial') || type.includes('industrial') || assetClass.includes('industrial');
    const isPre1980 = proj?.yearBuilt !== undefined && proj?.yearBuilt > 0 && proj?.yearBuilt < 1980;
    return isCommercial || isPre1980 || !!proj?.financials?.phaseIElected;
  };

  const isHOARequired = (proj: any) => {
    return !!proj?.hoa || !!proj?.financials?.hasHOA || !!proj?.financials?.hoaElected;
  };

  const isAttorneyRequired = (proj: any) => {
    const ATTORNEY_STATES = ['NY', 'NJ', 'MA', 'CT', 'GA', 'SC', 'NC', 'IL'];
    const stateCode = proj?.state || proj?.address?.state || '';
    const isAttorneyState = !!stateCode && ATTORNEY_STATES.includes(stateCode.toUpperCase());
    return isAttorneyState || !!proj?.financials?.attorneyElected;
  };

  const isStage5Complete = !!(
    project?.financials?.psaDocumentUrl &&
    project?.financials?.emdVerified &&
    project?.financials?.emdReceiptUrl &&
    (project?.contingencies === undefined || project.contingencies.length === 0 || project.contingencies.every((c: any) => (c.isSatisfied && (!!c.satisfiedDocUrl || !!c.explicitConfirmation)) || c.isWaived)) &&
    project?.financials?.titleVestingConfirmed &&
    project?.financials?.titleOwnersPolicyOrdered &&
    ((project?.financials as any)?.titleCommitmentReceived || !!project?.financials?.titleCommitmentUrl) &&
    project?.financials?.titleStatus !== 'defective' &&
    (!isSurveyRequired(project) || !!((project.financials?.surveyDocumentUrl && project.financials?.surveyCompletedDate) || (project.financials?.surveyWaived && project.financials?.surveyWaiverReason?.trim()))) &&
    (!isPhaseIRequired(project) || !!((project.financials?.phaseIDocumentUrl && project.financials?.phaseICompletedDate) || (project.financials?.phaseIWaived && project.financials?.phaseIWaiverReason?.trim()))) &&
    (!isHOARequired(project) || !!((project.financials?.hoaDocumentUrl && project.financials?.hoaCompletedDate) || (project.financials?.hoaWaived && project.financials?.hoaWaiverReason?.trim()))) &&
    (!isAttorneyRequired(project) || !!((project.financials?.attorneyDocumentUrl && project.financials?.attorneyCompletedDate) || (project.financials?.attorneyWaived && project.financials?.attorneyWaiverReason?.trim())))
  );

  const isStage6Complete = !!(
    project?.financials?.capitalPlan === 'all-cash solo' ||
    project?.financials?.capitalPlan === 'solo-financed' ||
    project?.financials?.capitalPlan === 'partnership' ||
    (project?.financials?.capitalPlan === 'raise interest' && totalRaisedCents > 0) ||
    project?.financials?.fundingType === 'Solo' ||
    (project?.financials?.fundingType === 'Syndicated' && totalRaisedCents > 0) ||
    (!project?.financials?.capitalPlan && !project?.financials?.fundingType && totalRaisedCents > 0)
  );

  const isStageUnlocked = (stageKey: string): boolean => {
    if (stageKey === 'target') return true;
    if (stageKey === 'underwrite' || stageKey === 'raise_interest') return isStage1Complete;
    if (stageKey === 'strategy') return isStage2Complete;
    if (stageKey === 'offer') return isStage3Complete;
    if (stageKey === 'due_diligence') return isStage4Complete;
    if (stageKey === 'phase_gate') return isStage4Complete;
    return false;
  };

  const canLockDeal =
    isStage1Complete &&
    isStage2Complete &&
    isStage3Complete &&
    isStage4Complete &&
    isStage5Complete &&
    isStage6Complete &&
    project?.financials?.zoningIntendedUsePermitted !== false &&
    project?.financials?.decision !== 'terminate';

  /* ── Deal Compare ── */
  const [addingToCompare, setAddingToCompare] = useState(false);

  const handleAddToDealCompare = useCallback(async () => {
    if (!user?.uid || !projectId || addingToCompare) return;
    setAddingToCompare(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentCompare = userSnap.data()?.dealCompare ?? [];

      if (currentCompare.includes(projectId)) {
        toast('Already in Deal Compare', { icon: 'ℹ️' });
        return;
      }

      await updateDoc(userRef, {
        dealCompare: arrayUnion(projectId),
      });
      toast.success('Added to Deal Compare!');
    } catch (err) {
      console.error('[DealCompare] Failed:', err);
      toast.error('Failed to add to Deal Compare');
    } finally {
      setAddingToCompare(false);
    }
  }, [user?.uid, projectId, addingToCompare]);

  /* ── Task completion tracking ── */
  const taskStatuses = useMemo(() => {
    if (!project) return { details: false, financials: false, capital: false, financing: false };
    const hasDetails = !!(project.propertyName && project.address && project.dispositionType);
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
      purchasePrice:         f.purchasePrice || (project?.askingPriceCents ? Number(project.askingPriceCents) : undefined),
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
    // Await refresh so project.financials is current before the next step merges.
    // Without this, each step starts from stale project.financials and silently
    // overwrites all previously-saved steps with its own partial write.
    await refresh();
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
    const updates: any = {
      offerStatus: status as any
    };
    if (status === 'Accepted') {
      updates.acceptanceDate = new Date().toISOString();
    }
    const merged = { ...(project.financials ?? {}), ...updates };
    await projectsService.updateProject(project.id, { financials: merged });
    refresh();
  }

  async function handleCounterSubmit(priceCents: number, terms: string, initiator: 'Buyer' | 'Seller' = 'Seller') {
    if (!project) return;
    const dateStr = new Date().toISOString();
    const newCounter = {
      price: priceCents,
      date: dateStr,
      initiator: initiator,
      updatedTerms: terms
    };
    const existingLog = project.financials?.counterOffers || [];
    const merged = { 
      ...(project.financials ?? {}), 
      offerStatus: 'Countered' as const,
      counterPriceCents: priceCents,
      counterTerms: terms,
      counterOffers: [...existingLog, newCounter]
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
      await projectsService.updateProject(project.id, { 
        phaseStatus: 'Phase 2: Fund',
        currentPhase: 2,
        status: 'fund'
      });

      // AQ-27: Auto-close any active marketplace listing when advancing out of Phase 1
      if (project.activeListingId && user) {
        try {
          const idToken = await user.getIdToken();
          await closeListing(idToken, project.activeListingId, 'auto_phase_advance');
        } catch (err) {
          console.error('[Phase1] Auto-close listing warning:', err);
          // Non-fatal — phase advance should not be blocked by listing close failure
        }
      }
      
      refresh();
      
      // Redirect the user to the Phase 2 workspace
      router.push(`/dashboard/projects/${project.id}/phase-2`);
    } catch (err) {
      console.error('[Phase1] Advance failed:', err);
      setAdvancing(false);
    }
  }

  /* Called when the conversational form's final step is completed */
  async function handleFormComplete(answers: FormAnswers) {
    // Persist the final step's answers before advancing — onStepSave fires first
    // but this guarantees the last set of inputs is written even if that fires in
    // a different order or is retried.
    await handleStepSave(answers);
    toast.success('Form complete! Please review the Acquisition Phase Gate checks below.');
    const gateElem = document.getElementById('phase_gate');
    if (gateElem) {
      gateElem.scrollIntoView({ behavior: 'smooth' });
    }
  }

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

  /* ── Not found state ── */
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-[#9E9DA0]">Project not found.</p>
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="text-xs font-bold uppercase tracking-[0.12em] underline text-[#9E9DA0] hover:text-[#454955] transition-colors"
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
    <PhaseAccessGuard phaseId="phase-1" phaseName="Phase 1: Acquisition">
      <div className="min-h-screen bg-[#0d0a0b] relative">

      {/* ── Syndicate Investor Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d0a0b] border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Invite Co-Investor</h2>
              <button onClick={closeInviteModal} className="text-[#9E9DA0] hover:text-white transition-colors p-1">
                <span className="material-symbols-outlined text-xl select-none">close</span>
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center space-y-4 py-4">
                <span className="material-symbols-outlined text-4xl text-[#454955] select-none">check_circle</span>
                <p className="text-white font-semibold">Invitation sent!</p>
                <p className="text-sm text-[#9E9DA0]">They'll receive an email with a link to review the deal and respond.</p>
                <button onClick={closeInviteModal} className="w-full py-3 bg-[#454955] text-[#0d0a0b] font-bold rounded-lg text-sm">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none focus:ring-1 focus:ring-[#454955]/60 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="investor@example.com"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none focus:ring-1 focus:ring-[#454955]/60 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Equity % (optional)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={inviteForm.equityPct}
                      onChange={(e) => setInviteForm(p => ({ ...p, equityPct: e.target.value }))}
                      placeholder="e.g. 15"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none focus:ring-1 focus:ring-[#454955]/60 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Amount $ (optional)</label>
                    <input
                      type="text"
                      value={inviteForm.amount}
                      onChange={(e) => setInviteForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="e.g. 50000"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none focus:ring-1 focus:ring-[#454955]/60 text-sm"
                    />
                  </div>
                </div>

                {inviteError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{inviteError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="flex-1 py-3 border border-white/10 text-[#9E9DA0] text-sm font-semibold rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSending}
                    className="flex-1 py-3 bg-[#454955] text-[#0d0a0b] text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviteSending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {inviteSending ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
              <p className="text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#454955] uppercase">
                Phase: Acquisition
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[14px] leading-[16px] font-semibold tracking-[0.02em] text-[#9E9DA0]">
                  Equity: {ownershipPct}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stage Stepper Rail (Stitch schema) ── */}
          <section className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
              {[
                { key: 'target', label: '1. Target', icon: 'gps_fixed', isComplete: isStage1Complete },
                { key: 'underwrite', label: '2. Analyze & Underwrite', icon: 'analytics', isComplete: isStage2Complete },
                { key: 'strategy', label: '3. Declare Strategy', icon: 'assignment', isComplete: isStage3Complete },
                { key: 'offer', label: '4. Offer / LOI', icon: 'description', isComplete: isStage4Complete },
                { key: 'due_diligence', label: '5. Due Diligence', icon: 'gavel', isComplete: isStage5Complete },
                { key: 'raise_interest', label: '6. Raise Interest', icon: 'group', isComplete: isStage6Complete },
                { key: 'phase_gate', label: '7. Phase Gate', icon: 'door_open', isComplete: canLockDeal },
              ].map((stage) => {
                const active = activeStage === stage.key;
                const unlocked = isStageUnlocked(stage.key);
                return (
                  <button
                    key={stage.key}
                    id={`stage-tab-${stage.key}`}
                    disabled={!unlocked}
                    onClick={() => handleStageSelect(stage.key)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      active
                        ? 'bg-[#454955] text-black shadow-lg shadow-[#454955]/20 font-bold'
                        : stage.isComplete
                        ? 'bg-[var(--pw-success)]/15 text-[var(--pw-success)] hover:bg-[var(--pw-success)]/25'
                        : unlocked
                        ? 'bg-white/5 text-white hover:bg-white/10'
                        : 'bg-transparent text-[#9E9DA0]/20 cursor-not-allowed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{stage.icon}</span>
                    <span>{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Guided Acquisition Wizard Callout Card ── */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Prefer a Guided Experience?</h3>
              <p className="text-xs text-slate-400">Launch the step-by-step Acquisition Wizard to verify budget, research market trends, search properties, model underwriting, and draft LOIs.</p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/projects/${project.id}/phase-1/wizard`)}
              className="px-5 py-2.5 bg-emerald-500 text-black hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg self-start sm:self-center shrink-0 transition-opacity"
            >
              Start Acquisition Wizard
            </button>
          </div>

          {/* ── Active Stage Panels ── */}
          <section className="space-y-6">
            {activeStage === 'target' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200" id="stage-panel-target">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Stage 1: Property Identity &amp; Target ID</h3>
                  <span className="text-xs text-[#9E9DA0]">{isStage1Complete ? '✓ Exit conditions met' : '○ Pending exit conditions'}</span>
                </div>
                <div className="glass-card rounded-2xl p-6 border border-white/5">
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
                      propertyType: project.propertyType,
                      units: project.units,
                      condition: project.condition,
                    }}
                    onSave={handleTargetSave}
                  />
                </div>
                <FirstPassScreen
                  project={project}
                  phaseColor={PHASE_COLOR}
                  onSave={async (updates) => {
                    await projectsService.updateProject(projectId, updates);
                    refresh();
                  }}
                  onRestore={async () => {
                    await projectsService.updateProject(projectId, {
                      status: 'acquisition',
                      currentPhase: 1,
                      firstPassVerdict: 'PURSUE',
                    });
                    refresh();
                  }}
                />
                <SourceSellerMarketSnapshot
                  project={project}
                  phaseColor={PHASE_COLOR}
                  onSave={async (updates) => {
                    await projectsService.updateProject(projectId, updates);
                    refresh();
                  }}
                />
                <CompsARVCard
                  project={project}
                  phaseColor={PHASE_COLOR}
                  onSave={async (updates) => {
                    await projectsService.updateProject(projectId, updates);
                    refresh();
                  }}
                />
              </div>
            )}

            {activeStage === 'underwrite' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200" id="stage-panel-underwrite">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Stage 2: Analyze &amp; Underwrite</h3>
                  <span className="text-xs text-[#9E9DA0]">{isStage2Complete ? '✓ Exit conditions met' : '○ Pending exit conditions'}</span>
                </div>
                
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Conversational Underwriter</h4>
                  {phase1Locked ? (
                    <ProjectCalculator
                      phaseColor={PHASE_COLOR}
                      projectId={projectId}
                      propertyAddress={project.address}
                    initialFinancials={{
                      ...project.financials,
                      purchasePrice: project.financials?.purchasePrice || (project.askingPriceCents ? Number(project.askingPriceCents) : 0),
                    }}
                      onSaveSuccess={() => refresh()}
                      readOnly={true}
                    />
                  ) : (
                    <ConversationalForm
                      questions={PHASE_1_QUESTIONS}
                      initialAnswers={toInitialAnswers()}
                      phaseColor={PHASE_COLOR}
                      readOnly={false}
                      onStepSave={handleStepSave}
                      onComplete={handleFormComplete}
                    />
                  )}

                  {advancing && (
                    <div className="flex items-center justify-center gap-2.5 p-4 text-[#9E9DA0] text-[12px] font-bold">
                      <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                      Locking Phase 1 and advancing…
                    </div>
                  )}
                </div>

                {/* Live Underwriting KPIs */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Scorecard &amp; Acknowledgment</h4>
                  <TenKpiScorecard project={project} />
                  {project.financials?.scorecardAcknowledged && 
                   project.financials?.acknowledgedInputsHash !== getScorecardInputsHash(project) && (
                    <div className="mt-4 p-4 rounded-xl border border-[#F06543]/20 bg-[#F06543]/10 text-xs font-semibold text-[#F06543] flex items-center gap-2 animate-pulse">
                      <span className="material-symbols-outlined text-base">warning</span>
                      Assumptions changed since acknowledgment. Please review and re-acknowledge.
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-4 bg-white/5 p-4 rounded-xl border border-white/5">
                    <input
                      type="checkbox"
                      id="scorecard-ack-checkbox"
                      checked={!!project.financials?.scorecardAcknowledged && project.financials?.acknowledgedInputsHash === getScorecardInputsHash(project)}
                      disabled={!!project.financials?.scorecardAcknowledged && project.financials?.acknowledgedInputsHash === getScorecardInputsHash(project)}
                      onChange={async (e) => {
                        if (e.target.checked) {
                          const hash = getScorecardInputsHash(project);
                          const merged = { 
                            ...(project.financials ?? {}), 
                            scorecardAcknowledged: true,
                            acknowledgedInputsHash: hash
                          };
                          await projectsService.updateProject(project.id, { financials: merged });
                          toast.success('Scorecard calculations successfully acknowledged');
                          refresh();
                        }
                      }}
                      className="rounded border-white/10 bg-white/5 text-primary focus:ring-primary w-5 h-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="scorecard-ack-checkbox" className="text-xs font-semibold text-white tracking-wide cursor-pointer uppercase select-none flex items-center gap-2">
                      I have reviewed and acknowledge the 10-KPI Scorecard calculations
                      {project.financials?.scorecardAcknowledged && project.financials?.acknowledgedInputsHash === getScorecardInputsHash(project) && (
                        <span className="text-[var(--pw-success)] text-[10px] font-bold lowercase tracking-normal font-sans">(Acknowledged ✓)</span>
                      )}
                    </label>
                  </div>
                </div>

                {/* Hurdle & Buy-Box Test */}
                <HurdleTestCard
                  project={project}
                  onSave={handleTargetSave}
                />

                {/* Rehab & CapEx Budget */}
                <div id="rehab-budget-card">
                  <RehabBudgetCard
                    project={project}
                    phaseColor={PHASE_COLOR}
                    onSave={handleTargetSave}
                  />
                </div>

                {/* Income Assumptions */}
                <div id="income-assumptions-card">
                  <IncomeAssumptionsCard
                    project={project}
                    phaseColor={PHASE_COLOR}
                    onSave={handleTargetSave}
                  />
                </div>

                {/* Expense Assumptions */}
                <div id="expense-assumptions-card">
                  <ExpenseAssumptionsCard
                    project={project}
                    phaseColor={PHASE_COLOR}
                    onSave={handleTargetSave}
                  />
                </div>

                                {/* Financing Assumptions */}
                <div id="financing-assumptions-card">
                  <FinancingAssumptionsCard
                    project={project}
                    phaseColor={PHASE_COLOR}
                    onSave={handleTargetSave}
                  />
                </div>
              </div>
            )}

            {activeStage === 'strategy' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200" id="stage-panel-strategy">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Stage 3: Declare Strategy</h3>
                  <span className="text-xs text-[#9E9DA0]">{isStage3Complete ? '✓ Exit conditions met' : '○ Pending exit conditions'}</span>
                </div>
                <div className="glass-card rounded-2xl p-6 border border-white/5">
                  <DeclareStrategyPanel
                    project={project}
                    onSaveSuccess={refresh}
                  />
                </div>
              </div>
            )}

            {activeStage === 'offer' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200" id="stage-panel-offer">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Stage 4: Offer &amp; LOI Workflow</h3>
                  <span className="text-xs text-[#9E9DA0]">{isStage4Complete ? '✓ Exit conditions met' : '○ Pending exit conditions'}</span>
                </div>

                {/* Offer Details Card & Context Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Input Fields */}
                  <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                      Offer Parameters
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">
                          Offer Price ($)
                        </label>
                        <input
                          type="number"
                          id="offer-price-input"
                          value={project.financials?.offer_price ? project.financials.offer_price / 100 : ''}
                          onChange={async (e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const merged = { ...(project.financials ?? {}), offer_price: val * 100 };
                            await projectsService.updateProject(project.id, { financials: merged });
                            refresh();
                          }}
                          placeholder="e.g. 150000"
                          className="w-full px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-2">
                          Is the property subject to an HOA?
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            id="hoa-toggle-yes"
                            onClick={async () => {
                              const merged = { ...(project.financials ?? {}), hasHOA: true };
                              await projectsService.updateProject(project.id, { financials: merged });
                              refresh();
                            }}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                              project.financials?.hasHOA === true
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-extrabold'
                                : 'bg-white/5 border-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            id="hoa-toggle-no"
                            onClick={async () => {
                              const merged = { ...(project.financials ?? {}), hasHOA: false };
                              await projectsService.updateProject(project.id, { financials: merged });
                              refresh();
                            }}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                              project.financials?.hasHOA === false
                                ? 'bg-white/10 border-white/20 text-white font-extrabold'
                                : 'bg-[#0d0a0b]/80 border-white/10 text-[#9E9DA0] hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">
                          Offer Rationale / Strategy
                        </label>
                        <textarea
                          id="offer-rationale-input"
                          value={project.financials?.offerRationale || ''}
                          onChange={async (e) => {
                            const merged = { ...(project.financials ?? {}), offerRationale: e.target.value };
                            await projectsService.updateProject(project.id, { financials: merged });
                            refresh();
                          }}
                          placeholder="e.g. Based on comp average value and gut rehab requirements..."
                          className="w-full px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none text-sm resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Context Comparison Panel */}
                  <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0] mb-3">
                        Offer Context Comparison
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#9E9DA0]">Asking Price:</span>
                          <span className="text-white font-mono font-medium" id="context-asking-price">
                            {project.financials?.purchasePrice
                              ? `$${(project.financials.purchasePrice / 100).toLocaleString()}`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#9E9DA0]">Comp-Implied ARV:</span>
                          <span className="text-white font-mono font-medium" id="context-comp-arv">
                            {project.financials?.estimatedARV
                              ? `$${(project.financials.estimatedARV / 100).toLocaleString()}`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#9E9DA0]">MAO (Max Allowable Offer):</span>
                          <span className="text-white font-mono font-medium" id="context-mao">
                            {derivedMetrics?.mao
                              ? `$${derivedMetrics.mao.toLocaleString()}`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Delta vs Asking:</span>
                      {(() => {
                        const offer = project.financials?.offer_price ?? 0;
                        const asking = project.financials?.purchasePrice ?? 0;
                        if (!offer || !asking) return <span className="text-white font-mono text-sm" id="context-delta">—</span>;
                        const diff = (offer - asking) / 100;
                        const pct = ((offer - asking) / asking) * 100;
                        const sign = diff >= 0 ? '+' : '';
                        const color = diff >= 0 ? 'text-red-400' : 'text-green-400';
                        return (
                          <span className={`font-mono text-sm font-bold ${color}`} id="context-delta">
                            {sign}${diff.toLocaleString()} ({sign}{pct.toFixed(1)}%)
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Offer Pipeline Board */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
                  <OfferPipelineTracker
                    currentStatus={project.financials?.offerStatus as string || 'Drafting'}
                    onStatusChange={handlePipelineStatusChange}
                    onCounterSubmit={handleCounterSubmit}
                    offerAmountCents={project.financials?.offer_price || project.financials?.purchasePrice || 0}
                    propertyAddress={project.address}
                    phaseColor={PHASE_COLOR}
                  />
                </div>

                {/* Negotiation Counter Offer History Log */}
                {project.financials?.counterOffers && project.financials.counterOffers.length > 0 && (
                  <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4 animate-in fade-in duration-300">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                      Negotiation Counter Offer Log
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse text-white">
                        <thead>
                          <tr className="border-b border-white/5 text-[#9E9DA0]">
                            <th className="py-2 font-bold uppercase tracking-wider">Date</th>
                            <th className="py-2 font-bold uppercase tracking-wider">Initiator</th>
                            <th className="py-2 font-bold uppercase tracking-wider text-right">Counter Price</th>
                            <th className="py-2 font-bold uppercase tracking-wider pl-4">Terms</th>
                          </tr>
                        </thead>
                        <tbody>
                          {project.financials.counterOffers.map((log: any, idx: number) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-2 font-mono text-[#9E9DA0]">
                                {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  log.initiator === 'Buyer' ? 'bg-blue-950 text-blue-300' : 'bg-amber-950 text-amber-300'
                                }`}>
                                  {log.initiator}
                                </span>
                              </td>
                              <td className="py-2 text-right font-semibold text-white font-mono">
                                ${(log.price / 100).toLocaleString()}
                              </td>
                              <td className="py-2 pl-4 text-[#9E9DA0]">
                                {log.updatedTerms || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {project.financials?.offerStatus === 'Accepted' && (
                  <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4 animate-in fade-in duration-350">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                      Confirm Final Agreed Purchase Price
                    </h4>
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
                          Final Agreed Price ($)
                        </label>
                        <input
                          type="number"
                          placeholder="Final Agreed Purchase Price"
                          defaultValue={project.financials?.finalAgreedPrice ? project.financials.finalAgreedPrice / 100 : ''}
                          id="final-agreed-price-input"
                          className="w-full px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('final-agreed-price-input') as HTMLInputElement;
                            if (input) {
                              const offerAmt = project.financials?.offer_price || project.financials?.purchasePrice || 0;
                              input.value = (offerAmt / 100).toString();
                            }
                          }}
                          className="px-4 py-3 bg-white/5 border border-white/10 text-[#9E9DA0] hover:text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Pre-fill from Offer
                        </button>
                        <button
                          id="confirm-price-btn"
                          type="button"
                          onClick={async () => {
                            const input = document.getElementById('final-agreed-price-input') as HTMLInputElement;
                            const val = input ? parseFloat(input.value) : 0;
                            if (!isNaN(val) && val > 0) {
                              const merged = { ...(project.financials ?? {}), finalAgreedPrice: val * 100 };
                              await projectsService.updateProject(project.id, { financials: merged });
                              toast.success(`Confirmed Final Agreed Price: $${val.toLocaleString()}`);
                              refresh();
                            } else {
                              toast.error('Please enter a valid final agreed price');
                            }
                          }}
                          className="px-5 py-3 bg-[#454955] text-black hover:opacity-90 rounded-lg text-sm font-bold transition-colors"
                        >
                          Confirm Price
                        </button>
                      </div>
                    </div>
                    {project.financials?.finalAgreedPrice ? (
                      <p className="text-xs text-green-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Confirmed Final Agreed Price: ${(project.financials.finalAgreedPrice / 100).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Agreed price requires explicit confirmation to unlock next stage.
                      </p>
                    )}
                  </div>
                )}

                {/* Loan Processing Pipeline */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
                  <LoanProcessingPipeline
                    projectId={project.id}
                  />
                </div>

                {/* LOI generator */}
                <LOIGenerator
                  project={project}
                  onSave={async (updates) => {
                    const merged = { ...(project.financials ?? {}), ...updates };
                    
                    // Smart sync contingencies array
                    let updatedContingencies = [...(project.contingencies || [])];
                    if (updates.loiContingencies && updates.loiContingencies.length > 0) {
                      const ddDays = updates.loiDueDiligenceDays || merged.loiDueDiligenceDays || 14;
                      const baseDate = merged.psaEffectiveDate ? new Date(merged.psaEffectiveDate) : new Date();
                      
                      updates.loiContingencies.forEach((type: string) => {
                        const exists = updatedContingencies.find((c: any) => c.type === type);
                        if (!exists) {
                          const deadline = new Date(baseDate);
                          deadline.setDate(deadline.getDate() + ddDays);
                          updatedContingencies.push({
                            id: crypto.randomUUID(),
                            type: type as any,
                            deadlineDate: deadline.toISOString().split('T')[0] as any,
                            isWaived: false,
                            isSatisfied: false,
                            party: 'Buyer',
                            reminderSettings: ['T-7', 'T-3', 'T-1'],
                          });
                        }
                      });
                    }

                    await projectsService.updateProject(project.id, {
                      financials: merged,
                      contingencies: updatedContingencies,
                    });
                    refresh();
                  }}
                  phaseColor={PHASE_COLOR}
                />
              </div>
            )}

            {activeStage === 'due_diligence' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200" id="stage-panel-due_diligence">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Stage 5: Under Contract &amp; Due Diligence</h3>
                  <span className="text-xs text-[#9E9DA0]">{isStage5Complete ? '✓ Exit conditions met' : '○ Pending exit conditions'}</span>
                </div>

                <div id="psa-card">
                  <PSACard
                    project={project}
                    contingencies={contingencies}
                    onSaveFinancials={async (updates) => {
                      const merged = { ...(project.financials ?? {}), ...updates };
                      
                      // Smart sync contingencies
                      let updatedContingencies = [...(project.contingencies || [])];
                      if (updatedContingencies.length === 0 && merged.loiContingencies && merged.loiContingencies.length > 0) {
                        const ddDays = merged.loiDueDiligenceDays || 14;
                        const baseDate = merged.psaEffectiveDate ? new Date(merged.psaEffectiveDate) : new Date();
                        merged.loiContingencies.forEach((type: string) => {
                          const deadline = new Date(baseDate);
                          deadline.setDate(deadline.getDate() + ddDays);
                          updatedContingencies.push({
                            id: crypto.randomUUID(),
                            type: type as any,
                            deadlineDate: deadline.toISOString().split('T')[0] as any,
                            isWaived: false,
                            isSatisfied: false,
                            party: 'Buyer',
                            reminderSettings: ['T-7', 'T-3', 'T-1'],
                          });
                        });
                      }

                      await projectsService.updateProject(project.id, {
                        financials: merged,
                        contingencies: updatedContingencies,
                      });
                      refresh();
                    }}
                    onSaveContingencies={async (updatedContingencies) => {
                      await projectsService.updateProject(project.id, { contingencies: updatedContingencies });
                      refresh();
                    }}
                    phaseColor={PHASE_COLOR}
                    readOnly={phase1Locked}
                  />
                </div>

                <ContingencyTracker
                  projectId={project.id}
                  contingencies={contingencies}
                  onChange={async (updatedContingencies) => {
                    setContingencies(updatedContingencies);
                    await projectsService.updateProject(project.id, { contingencies: updatedContingencies });
                    refresh();
                  }}
                  readOnly={phase1Locked}
                />

                <div id="earnest-money-card">
                  <EarnestMoneyCard
                    project={project}
                    onSaveFinancials={async (updates) => {
                      const merged = { ...(project.financials ?? {}), ...updates };
                      await projectsService.updateProject(project.id, { financials: merged });
                      refresh();
                    }}
                    phaseColor={PHASE_COLOR}
                    readOnly={phase1Locked}
                  />
                </div>

                <div id="inspection-card">
                  <InspectionCard
                    project={project}
                    onSaveFinancials={async (updates) => {
                      const merged = { ...(project.financials ?? {}), ...updates };
                      await projectsService.updateProject(project.id, { financials: merged });
                      refresh();
                    }}
                    phaseColor={PHASE_COLOR}
                    readOnly={phase1Locked}
                  />
                </div>
                <VendorMatchList project={project} specialty="Inspector" />

                <div id="title-card">
                  <TitleCard
                    project={project}
                    onSaveFinancials={async (updates) => {
                      const merged = { ...(project.financials ?? {}), ...updates };
                      await projectsService.updateProject(project.id, { financials: merged });
                      refresh();
                    }}
                    phaseColor={PHASE_COLOR}
                    readOnly={phase1Locked}
                  />
                </div>
                <VendorMatchList project={project} specialty="Title Company" />

                {/* Manual DD Election Panel */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Additional Due Diligence Options</h4>
                    <p className="text-[10px] text-[#9E9DA0]/80">Manually require additional DD reviews if they are not triggered automatically by property details.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Survey election */}
                    <div
                      id="toggle-survey-election"
                      onClick={async () => {
                        const merged = { ...(project.financials ?? {}), surveyElected: !project.financials?.surveyElected };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer select-none ${
                        project.financials?.surveyElected
                          ? 'border-white/10 bg-[#454955]/10 text-white font-semibold'
                          : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">Property Survey</span>
                      <span className="text-[11px] font-medium">{project.financials?.surveyElected ? '✓ Required' : '○ Optional'}</span>
                    </div>

                    {/* Phase I ESA election */}
                    <div
                      id="toggle-phaseI-election"
                      onClick={async () => {
                        const merged = { ...(project.financials ?? {}), phaseIElected: !project.financials?.phaseIElected };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer select-none ${
                        project.financials?.phaseIElected
                          ? 'border-white/10 bg-[#454955]/10 text-white font-semibold'
                          : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">Phase I ESA</span>
                      <span className="text-[11px] font-medium">{project.financials?.phaseIElected ? '✓ Required' : '○ Optional'}</span>
                    </div>

                    {/* HOA election */}
                    <div
                      id="toggle-hoa-election"
                      onClick={async () => {
                        const merged = { ...(project.financials ?? {}), hoaElected: !project.financials?.hoaElected };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer select-none ${
                        project.financials?.hoaElected
                          ? 'border-white/10 bg-[#454955]/10 text-white font-semibold'
                          : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">HOA Audit</span>
                      <span className="text-[11px] font-medium">{project.financials?.hoaElected ? '✓ Required' : '○ Optional'}</span>
                    </div>

                    {/* Attorney election */}
                    <div
                      id="toggle-attorney-election"
                      onClick={async () => {
                        const merged = { ...(project.financials ?? {}), attorneyElected: !project.financials?.attorneyElected };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer select-none ${
                        project.financials?.attorneyElected
                          ? 'border-white/10 bg-[#454955]/10 text-white font-semibold'
                          : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">Attorney Close</span>
                      <span className="text-[11px] font-medium">{project.financials?.attorneyElected ? '✓ Required' : '○ Optional'}</span>
                    </div>
                  </div>
                </div>

                {isSurveyRequired(project) && (
                  <>
                    <SurveyCard
                      project={project}
                      onSaveFinancials={async (updates) => {
                        const merged = { ...(project.financials ?? {}), ...updates };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      phaseColor={PHASE_COLOR}
                      readOnly={phase1Locked}
                    />
                    <VendorMatchList project={project} specialty="Surveyor" />
                  </>
                )}

                {isPhaseIRequired(project) && (
                  <>
                    <PhaseICard
                      project={project}
                      onSaveFinancials={async (updates) => {
                        const merged = { ...(project.financials ?? {}), ...updates };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      phaseColor={PHASE_COLOR}
                      readOnly={phase1Locked}
                    />
                    <VendorMatchList project={project} specialty="Environmental Consultant" />
                  </>
                )}

                {isHOARequired(project) && (
                  <>
                    <HOACard
                      project={project}
                      onSaveFinancials={async (updates) => {
                        const merged = { ...(project.financials ?? {}), ...updates };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      phaseColor={PHASE_COLOR}
                      readOnly={phase1Locked}
                    />
                    <VendorMatchList project={project} specialty="HOA Consultant" />
                  </>
                )}

                {isAttorneyRequired(project) && (
                  <>
                    <AttorneyCard
                      project={project}
                      onSaveFinancials={async (updates) => {
                        const merged = { ...(project.financials ?? {}), ...updates };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      phaseColor={PHASE_COLOR}
                      readOnly={phase1Locked}
                    />
                    <VendorMatchList project={project} specialty="Attorney" />
                  </>
                )}

                <ZoningCard
                  project={project}
                  onSaveFinancials={async (updates) => {
                    const merged = { ...(project.financials ?? {}), ...updates };
                    await projectsService.updateProject(project.id, { financials: merged });
                    refresh();
                  }}
                  phaseColor={PHASE_COLOR}
                  readOnly={phase1Locked}
                />
                <VendorMatchList project={project} specialty="Zoning Consultant" />

                <InsuranceCard
                  project={project}
                  onSaveFinancials={async (updates) => {
                    const merged = { ...(project.financials ?? {}), ...updates };
                    await projectsService.updateProject(project.id, { financials: merged });
                    refresh();
                  }}
                  phaseColor={PHASE_COLOR}
                  readOnly={phase1Locked}
                />
                <VendorMatchList project={project} specialty="Insurance Carrier" />

                {/* Purchase Readiness Checklist */}
                <div className="glass-card rounded-2xl p-6 border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Purchase Readiness Checklist</h4>
                    <span className="text-xs text-[#9E9DA0]">
                      {completedReadinessCount}/{readinessItems.length || 4} Complete
                    </span>
                  </div>
                  <PurchaseReadinessChecklist
                    items={project.purchaseReadinessChecklist}
                    onItemChange={handleReadinessChange}
                    phaseColor={PHASE_COLOR}
                  />
                </div>

                <GoNoGoPanel
                  project={project}
                  derivedMetrics={derivedMetrics}
                  onSaveFinancials={async (updates) => {
                    const merged = { ...(project.financials ?? {}), ...updates };
                    await projectsService.updateProject(project.id, { financials: merged });
                    refresh();
                  }}
                  onUpdateProjectStatus={async (status) => {
                    await projectsService.updateProject(project.id, { status });
                    refresh();
                  }}
                  readOnly={phase1Locked}
                />
              </div>
            )}

            {activeStage === 'raise_interest' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200" id="stage-panel-raise_interest">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Stage 6: Raise Interest</h3>
                  <span className="text-xs text-[#9E9DA0]">{isStage6Complete ? '✓ Exit conditions met' : '○ Pending exit conditions'}</span>
                </div>

                <EquityEnginePanel
                  project={project}
                  derivedMetrics={derivedMetrics}
                  onSaveFinancials={async (updates) => {
                    const merged = { ...(project.financials ?? {}), ...updates };
                    await projectsService.updateProject(project.id, { financials: merged });
                    refresh();
                  }}
                  readOnly={phase1Locked}
                />

                {project.financials?.capitalPlan === 'raise interest' && (
                  <>
                    <AudienceManager projectId={project.id} readOnly={phase1Locked} />

                    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                      <FundingSourceTracker projectId={projectId} />
                      <CrowdfundingTracker
                        projectId={project.id}
                        targetCents={project.financials?.equityTerms?.funding_target ?? 0}
                        phaseColor={PHASE_COLOR}
                        onTotalChange={(cents) => {
                          setTotalRaisedCents(cents);
                        }}
                      />
                      <div className="flex justify-end pt-2 border-t border-white/5">
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[#9E9DA0] hover:text-white"
                        >
                          <Users className="w-4 h-4" /> Invite Co-Investor
                        </button>
                      </div>
                    </div>

                    {/* Deal Communication Composer */}
                    <div className="glass-card rounded-2xl p-6 border border-white/5">
                      <DealComposer
                        projectId={projectId}
                        project={project}
                        derivedMetrics={derivedMetrics}
                        onRefresh={refresh}
                      />
                    </div>

                    {/* Deal Update Composer */}
                    <div className="glass-card rounded-2xl p-6 border border-white/5">
                      <DealUpdateComposer projectId={projectId} phaseColor={PHASE_COLOR} />
                    </div>

                    {/* Investor Q&A Threads */}
                    <div className="glass-card rounded-2xl p-6 border border-white/5">
                      <InvestorQandATracker projectId={projectId} />
                    </div>

                    {/* Card 6.3: Deal One-Pager Preview */}
                    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4" id="card-6-3-one-pager-preview">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[var(--color-primary)]">
                            description
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                              Card 6.3: Deal One-Pager
                            </h4>
                            <p className="text-xs text-[#9E9DA0] mt-0.5">
                              Review the underwriting scorecard, capital sources & uses, and exit details.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowOnePagerPreview(!showOnePagerPreview)}
                          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all min-h-[36px]"
                        >
                          {showOnePagerPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                      </div>
                      {showOnePagerPreview && (
                        <div className="pt-4 border-t border-white/5 bg-neutral-950/20 rounded-xl p-4">
                          <DealOnePagerView project={project} readOnly={true} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeStage === 'phase_gate' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Stage 7: Phase Gate Validator</h3>
                  <span className="text-xs text-[#9E9DA0]">Review stage completion before locking phase</span>
                </div>

                {project?.financials?.titleStatus === 'defective' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 font-medium" id="title-defective-warning">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-red-500">Title Search Status: Defective</h5>
                      <p className="text-[11px] text-red-400/80 mt-1">
                        The title search status is currently marked as Defective. This is an open item that must be resolved (curative action) before you can proceed to lock this phase.
                      </p>
                    </div>
                  </div>
                )}

                {project?.financials?.zoningIntendedUsePermitted === false && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 font-medium" id="zoning-use-warning">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-red-500">Zoning / Intended Use Not Permitted</h5>
                      <p className="text-[11px] text-red-400/80 mt-1">
                        Intended use is not permitted under current zoning. This is an open item that must be resolved before locking the phase.
                      </p>
                    </div>
                  </div>
                )}

                {project?.financials?.decision === 'terminate' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 font-medium" id="deal-terminated-warning">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-red-500">Deal Terminated</h5>
                      <p className="text-[11px] text-red-400/80 mt-1">
                        This deal has been Terminated during the Go/No-Go decision framework. Locking is disabled, but all historical data remains intact.
                      </p>
                    </div>
                  </div>
                )}

                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
                  <div className="space-y-3">
                    {[
                      { label: 'Stage 1: Address, property type, units, condition, and at least 3 comps complete', met: isStage1Complete, ref: 'target' },
                      { label: 'Stage 2: Underwriting income/expense entered, scorecard acknowledged & buy-box verdict/override recorded', met: isStage2Complete, ref: 'underwrite' },
                      { label: 'Stage 3: Strategy & disposition mode declared', met: isStage3Complete, ref: 'strategy' },
                      { label: 'Stage 4: Active Offer Status accepted & final agreed price recorded', met: isStage4Complete, ref: 'offer' },
                      { label: 'Stage 5: Executed PSA uploaded, earnest money deposited with receipt, and contingencies satisfied/waived', met: isStage5Complete, ref: 'due_diligence' },
                      { label: 'Stage 6: Capital plan resolved (Solo confirmed or Crowdfunded interest logged)', met: isStage6Complete, ref: 'raise_interest' },
                    ].map((cond, index) => (
                      <div
                        key={index}
                        id={`gate-stage-row-${cond.ref}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => handleStageSelect(cond.ref)}
                      >
                        <span className="text-sm font-medium text-white">{cond.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            cond.met ? 'bg-[var(--pw-success)]/20 text-[var(--pw-success)]' : 'bg-[#F06543]/20 text-[#F06543]'
                          }`}>
                            {cond.met ? 'Met' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {hasFailedHurdles && (
                  <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffd1aa]">
                      Emergency Override Required
                    </h4>
                    <p className="text-xs text-[#9E9DA0]">
                      This project does not meet the specified Buy-Box criteria. You can only advance the deal by typing an emergency override justification reason.
                    </p>
                    <textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      onBlur={async () => {
                        await handleTargetSave({ overrideReason });
                      }}
                      placeholder="Type emergency override justification reason here..."
                      className="w-full h-24 p-3 rounded-lg bg-[#161217] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#454955] resize-none"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

        {/* ═══════════════════════════════════════════════════════
            Core KPIs Panel — Structured MetricResult Readouts
            ═══════════════════════════════════════════════════════ */}
        <section className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] leading-[32px] font-semibold text-[#9E9DA0]">
              Core KPIs
            </h2>
            {/* Add to Deal Compare button */}
            <button
              onClick={handleAddToDealCompare}
              disabled={addingToCompare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#454955]/30 text-[#454955] hover:bg-[#454955]/10 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToCompare ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              Deal Compare
            </button>
          </div>

          {/* PROJECTED / ACTUAL toggle */}
          <div className="flex items-center justify-between">
            <div className="flex p-1 bg-[#0d0a0b] rounded-lg">
              <button
                onClick={() => setKpiMode('projected')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  kpiMode === 'projected'
                    ? 'bg-[#262328] text-[#454955] shadow-sm'
                    : 'text-[#9E9DA0]/50'
                }`}
              >
                PROJECTED
              </button>
              <button
                onClick={() => setKpiMode('actual')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  kpiMode === 'actual'
                    ? 'bg-[#262328] text-[#454955] shadow-sm'
                    : 'text-[#9E9DA0]/50'
                }`}
              >
                ACTUAL
              </button>
            </div>

            {/* Property / My Share toggle */}
            <div className="flex p-0.5 bg-[#262328] rounded-full w-fit">
              <button
                onClick={() => setKpiScope('property')}
                className={`px-4 py-1 text-[11px] font-bold rounded-full transition-all ${
                  kpiScope === 'property'
                    ? 'bg-[#454955] text-[#0d0a0b]'
                    : 'text-[#9E9DA0]'
                }`}
              >
                Property
              </button>
              <button
                onClick={() => setKpiScope('myShare')}
                className={`px-4 py-1 text-[11px] font-bold rounded-full transition-all ${
                  kpiScope === 'myShare'
                    ? 'bg-[#454955] text-[#0d0a0b]'
                    : 'text-[#9E9DA0]'
                }`}
              >
                My Share
              </button>
            </div>
          </div>

          {/* KPI Grid — Structured MetricReadout cards (2×3) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <MetricReadout
              label="Projected NOI"
              result={noiResult}
              format="currency"
              accentColor={PHASE_COLOR}
            />
            <MetricReadout
              label="Projected Cash Flow"
              result={cashFlowResult}
              format="currency"
              accentColor={PHASE_COLOR}
            />
            <MetricReadout
              label="Projected Cap Rate"
              result={capRateResult}
              format="percent"
              accentColor={PHASE_COLOR}
            />
            <MetricReadout
              label="Projected Cash-on-Cash"
              result={cocResult}
              format="percent"
              accentColor={PHASE_COLOR}
            />
            <MetricReadout
              label="Projected GRM"
              result={grmResult}
              format="multiplier"
              accentColor={PHASE_COLOR}
            />
            <MetricReadout
              label="Projected DSCR"
              result={dscrResult}
              format="ratio"
              accentColor={PHASE_COLOR}
            />
          </div>

          {/* Expandable: 4 more metrics (structured where available) */}
          {showAllKpis && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 animate-in fade-in slide-in-from-top-2 duration-200 pt-2 border-t border-white/5">
              <MetricReadout
                label="Projected IRR"
                result={irrResult}
                format="percent"
                accentColor={PHASE_COLOR}
              />
              <MetricReadout
                label="Projected Occupancy Rate"
                result={occupancyResult}
                format="percent"
                accentColor={PHASE_COLOR}
              />
              <MetricReadout
                label="Projected Expense Ratio"
                result={expenseRatioResult}
                format="percent"
                accentColor={PHASE_COLOR}
              />
              <MetricReadout
                label="Projected Appreciation"
                result={appreciationResult}
                format="percent"
                accentColor={PHASE_COLOR}
              />
            </div>
          )}

          <button
            onClick={() => setShowAllKpis(!showAllKpis)}
            className="w-full text-center py-2 text-[#9E9DA0] text-[12px] leading-[14px] font-medium tracking-[0.05em] border-t border-white/5 mt-2 hover:text-[#454955] transition-colors flex items-center justify-center gap-1"
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
        {/* ═══════════════════════════════════════════════════════
            Acquisition Phase Gate
            ═══════════════════════════════════════════════════════ */}
        <AcquisitionPhaseGate
          project={project}
          totalRaisedCents={totalRaisedCents}
          onSuccess={() => {
            refresh();
            router.push(`/dashboard/projects/${project.id}/phase-2`);
          }}
          onStageSelect={handleStageSelect}
        />

      </main>

      {/* ═══════════════════════════════════════════════════════
          Sticky Footer — Primary Acquisition Metrics
          Glass-card bar pinned to bottom with key deal metrics.
          ═══════════════════════════════════════════════════════ */}
      {project && (
        <div className="sticky bottom-0 z-30 backdrop-blur-xl bg-[#0d0a0b]/80 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-5 md:px-10 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* GRM — quick screen */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]/60">GRM</p>
                <p className="text-[16px] font-bold text-[#9E9DA0] truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {grmResult.value !== null ? grmResult.value.toFixed(1) : '—'}
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-white/10" />

              {/* Cap Rate — deal terms */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]/60">Cap Rate</p>
                <p className="text-[16px] font-bold text-[#9E9DA0] truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {capRateResult.value !== null ? `${capRateResult.value.toFixed(1)}%` : '—'}
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-white/10" />

              {/* NOI — underwriting */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]/60">NOI</p>
                <p className="text-[16px] font-bold text-[#9E9DA0] truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {noiResult.value !== null ? fmtDollar(noiResult.value) : '—'}
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-white/10" />

              {/* DSCR — debt serviceability */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9E9DA0]/60">DSCR</p>
                <p className="text-[16px] font-bold text-[#9E9DA0] truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dscrResult.state === 'n/a' ? 'N/A' : dscrResult.value !== null ? `${dscrResult.value.toFixed(2)}x` : '—'}
                </p>
              </div>

              {/* State pill for the set */}
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  noiResult.state === 'projected' ? 'bg-amber-500/15 text-amber-400'
                  : noiResult.state === 'live' ? 'bg-pw-success-container text-pw-success'
                  : noiResult.state === 'incomplete' ? 'bg-gray-500/15 text-gray-400'
                  : 'bg-blue-500/15 text-blue-400'
                }`}
              >
                {noiResult.state === 'incomplete' ? 'INCOMPLETE' : noiResult.state.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
      </div>
    </PhaseAccessGuard>
  );
}

