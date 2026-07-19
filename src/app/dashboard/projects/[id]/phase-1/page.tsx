'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
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
import { DealComposer } from '@/components/project/DealComposer';
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
import { AgeConditionalTestsCard } from '@/components/project/AgeConditionalTestsCard';
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
  Mail,
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

const PHASE_COLOR = '#454955';

const isAgeConditionalRequired = (answers: Partial<FormAnswers>, project?: any): boolean => {
  // Only reveal if offer is accepted
  const offerStatus = answers.offer_status || project?.financials?.offer_status || project?.offer_status;
  if (offerStatus !== 'accepted') {
    return false;
  }
  const year = project?.yearBuilt || project?.year_built || project?.financials?.yearBuilt || project?.financials?.year_built || project?.propertyFacts?.yearBuilt || 0;
  const isOlderHome = year > 0 && year < 1978;
  const isFlaggedByInspector = !!project?.financials?.inspector_flagged_specialty_tests || !!answers.inspector_flagged_specialty_tests;
  const isElected = !!project?.financials?.age_conditional_tests_elected || !!answers.age_conditional_tests_elected;
  return isOlderHome || isFlaggedByInspector || isElected;
};

const areContingenciesResolved = (answers: Partial<FormAnswers>, project?: any): boolean => {
  const contingencies = answers.contingencies || project?.contingencies || [];
  if (contingencies.length === 0) return true;
  return contingencies.every((c: any) => c.isWaived || (c.isSatisfied && (!!c.satisfiedDocUrl || !!c.explicitConfirmation)));
};

/* ── Phase 1 Question Schema ──────────────────────────────────────────────────
   Each item drives one "slide" in the ConversationalForm engine.
   Keys map directly to project.financials field names (in cents for currency).
   ──────────────────────────────────────────────────────────────────────────── */
export const PHASE_1_QUESTIONS: QuestionDef[] = [
  {
    key:      'purchasePrice',
    type:     'currency',
    question: 'What is the Purchase Price?',
    hint:     'Enter the agreed contract price or the price you are targeting to acquire this asset.',
  },
  {
    key:      'gross_annual_rent',
    type:     'currency',
    question: 'Confirm or adjust the expected rent.',
    hint:     'Every projection starts from income. This is the estimated gross annual rent.',
  },
  {
    key:      'vacancy_rate',
    type:     'percent',
    question: 'What vacancy should we assume?',
    hint:     'Nobody collects 100% of scheduled rent; this keeps your NOI honest. 5–10% is customary.',
    precision: 1,
  },
  {
    key:      'expense_tax',
    type:     'currency',
    question: 'What is the estimated monthly property tax?',
    hint:     'Annual property taxes divided by 12.',
  },
  {
    key:      'expense_insurance',
    type:     'currency',
    question: 'What is the estimated monthly property insurance?',
    hint:     'Landlord insurance policy premium divided by 12.',
  },
  {
    key:      'expense_security',
    type:     'currency',
    question: 'What is the estimated monthly security expense?',
    hint:     'Costs for alarm systems, monitoring, patrols, or cameras.',
  },
  {
    key:      'expense_maintenance',
    type:     'currency',
    question: 'What is the estimated monthly maintenance expense?',
    hint:     'Ongoing upkeep, repairs, landscaping, or cleaning.',
  },
  {
    key:      'expense_utilities',
    type:     'currency',
    question: 'What is the estimated monthly utility expense?',
    hint:     'Water, sewer, trash, gas, or electricity paid by the owner.',
  },
  {
    key:      'has_professional_management',
    type:     'select',
    question: 'Will you hire professional property management?',
    hint:     'Professional management handles leasing, tenants, and maintenance for a fee.',
    options: [
      { value: 'yes', label: 'Yes, hire professional management' },
      { value: 'no',  label: 'No, I will self-manage' },
    ],
  },
  {
    key:      'expense_management',
    type:     'currency',
    question: 'What is the monthly property management fee?',
    hint:     'Enter the estimated monthly management expense.',
    condition: (answers: any) => answers.has_professional_management === 'yes',
  },
  {
    key:      'expense_hoa',
    type:     'currency',
    question: 'What is the monthly HOA fee?',
    hint:     'Enter the monthly homeowner association or condo association dues.',
    condition: (answers: any, project: any) => {
      const type = String(project?.property_type || project?.propertyType || '').toLowerCase();
      return type.includes('condo') || type.includes('hoa') || type.includes('mixed-use');
    },
  },
  {
    key:      'expense_capex',
    type:     'currency',
    question: 'What is the monthly CapEx reserve?',
    hint:     'Funds set aside for long-term capital improvements (roof, HVAC, etc.).',
  },
  {
    key:      'expected_purchase_price',
    type:     'currency',
    question: 'What do you expect to pay?',
    hint:     'Enter your projected target purchase price for this property.',
  },
  {
    key:      'down_payment_pct',
    type:     'percent',
    question: 'How much down payment (percentage)?',
    hint:     'Percentage of the purchase price paid in cash (e.g. 25 for 25%).',
    precision: 1,
  },
  {
    key:      'est_rate',
    type:     'percent',
    question: 'What is the estimated interest rate?',
    hint:     'Projected annual interest rate on the loan financing (e.g. 6.5 for 6.5%).',
    precision: 2,
  },
  {
    key:      'est_term_years',
    type:     'integer',
    question: 'What is the estimated loan term (years)?',
    hint:     'Enter the loan term duration in years (typically 30 years for long-term debt).',
    placeholder: '30',
  },
  {
    key:      'closing_costs',
    type:     'currency',
    question: 'Estimated closing costs?',
    hint:     'Title search, escrow fees, transfer taxes, loan origination fees, etc.',
  },
  {
    key:      'upfront_rehab_budget',
    type:     'currency',
    question: "Upfront repair budget before it's ready?",
    hint:     'Initial cash/capital needed to make the property tenant-ready or complete initial rehab.',
  },
  {
    key:      'hold_period_years',
    type:     'integer',
    question: 'How long do you plan to hold (years)?',
    hint:     'Expected hold period duration in years before selling or refinancing.',
    placeholder: '5',
  },
  {
    key:      'appreciation_rate',
    type:     'percent',
    question: 'What annual appreciation should we assume?',
    hint:     'Expected annual rate of property value growth (e.g. 3 for 3%).',
    precision: 2,
  },
  {
    key:      'scorecard',
    type:     'scorecard',
    question: 'Underwriting Scorecard',
    hint:     'Review the projected performance metrics based on your current inputs.',
    condition: (answers) => {
      return (
        answers.gross_annual_rent !== undefined &&
        answers.vacancy_rate !== undefined &&
        answers.expected_purchase_price !== undefined
      );
    },
  },
  {
    key:      'offer_price',
    type:     'currency',
    question: 'What is your offer price?',
    hint:     'The purchase price you are offering to the seller.',
  },
  {
    key:      'earnest_money',
    type:     'currency',
    question: 'How much earnest money are you depositing?',
    hint:     'Good faith deposit showing the seller you are serious about the purchase.',
  },
  {
    key:      'offer_terms',
    type:     'text',
    question: 'What are the key terms of your offer?',
    hint:     'Specify key terms (e.g. financing contingencies, inspection period, closing timeline).',
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
    key:      'offer_status',
    type:     'select',
    question: 'Where does the offer stand?',
    hint:     'Specify the status of your offer.',
    options: [
      { value: 'submitted', label: 'Submitted', description: 'Offer submitted to the seller.' },
      { value: 'countered', label: 'Countered', description: 'Seller sent a counter offer.' },
      { value: 'accepted',  label: 'Accepted',  description: 'Seller accepted the offer.' },
      { value: 'rejected',  label: 'Rejected',  description: 'Seller rejected the offer.' },
    ],
  },
  {
    key:      'accepted_price',
    type:     'currency',
    question: 'What is the accepted price?',
    hint:     'The final price accepted by the seller. This will actualize your purchase price expectations.',
    condition: (answers) => answers.offer_status === 'accepted',
  },
  {
    key:      'contract_executed_date',
    type:     'date',
    question: 'What is the contract executed date?',
    hint:     'The date the purchase and sale agreement was executed by all parties.',
    condition: (answers) => answers.offer_status === 'accepted',
  },
  {
    key:      'inspection_status',
    type:     'select',
    question: 'What is the inspection status?',
    hint:     'Schedule and record the inspection. Select the current progress status.',
    options: [
      { value: 'pending', label: 'Pending', description: 'Inspection is not yet scheduled.' },
      { value: 'scheduled', label: 'Scheduled', description: 'Inspection has been scheduled.' },
      { value: 'completed', label: 'Completed', description: 'Inspection has been completed.' },
      { value: 'cancelled', label: 'Cancelled', description: 'Inspection has been cancelled.' },
    ],
    condition: (answers) => answers.offer_status === 'accepted',
  },
  {
    key:      'inspection_findings',
    type:     'text',
    question: 'What are the key findings from the inspection?',
    hint:     'What you learn here is negotiating leverage and a repair map.',
    condition: (answers) => answers.offer_status === 'accepted',
  },
  {
    key:      'radon_test_status',
    type:     'select',
    question: 'What is the Radon test status?',
    hint:     'Radon is an odorless radioactive gas. EPA recommends testing all older/susceptible homes.',
    options: [
      { value: 'pending', label: 'Pending', description: 'Test is not yet ordered.' },
      { value: 'ordered', label: 'Ordered', description: 'Test has been ordered.' },
      { value: 'completed', label: 'Completed', description: 'Test has been completed.' },
      { value: 'waived', label: 'Waived', description: 'Test has been waived.' },
    ],
    condition: (answers, project) => isAgeConditionalRequired(answers, project),
  },
  {
    key:      'radon_test_result',
    type:     'text',
    question: 'What is the Radon test result?',
    hint:     'Enter measurement or findings summary (e.g. 2.4 pCi/L - normal, elevated, passed).',
    condition: (answers, project) => isAgeConditionalRequired(answers, project) && answers.radon_test_status === 'completed',
  },
  {
    key:      'lead_test_status',
    type:     'select',
    question: 'What is the Lead-based paint test status?',
    hint:     'Residential lead paint was banned in 1978. Homes built before this date have high risk.',
    options: [
      { value: 'pending', label: 'Pending', description: 'Test is not yet ordered.' },
      { value: 'ordered', label: 'Ordered', description: 'Test has been ordered.' },
      { value: 'completed', label: 'Completed', description: 'Test has been completed.' },
      { value: 'waived', label: 'Waived', description: 'Test has been waived.' },
    ],
    condition: (answers, project) => isAgeConditionalRequired(answers, project),
  },
  {
    key:      'lead_test_result',
    type:     'text',
    question: 'What is the Lead-based paint test result?',
    hint:     'Enter findings summary (e.g. lead detected on windowsills, negative).',
    condition: (answers, project) => isAgeConditionalRequired(answers, project) && answers.lead_test_status === 'completed',
  },
  {
    key:      'termite_test_status',
    type:     'select',
    question: 'What is the Termite/WDI inspection status?',
    hint:     'Wood-destroying insects can cause severe structural damage to older properties.',
    options: [
      { value: 'pending', label: 'Pending', description: 'Inspection is not yet ordered.' },
      { value: 'ordered', label: 'Ordered', description: 'Inspection has been ordered.' },
      { value: 'completed', label: 'Completed', description: 'Inspection has been completed.' },
      { value: 'waived', label: 'Waived', description: 'Inspection has been waived.' },
    ],
    condition: (answers, project) => isAgeConditionalRequired(answers, project),
  },
  {
    key:      'termite_test_result',
    type:     'text',
    question: 'What is the Termite/WDI inspection result?',
    hint:     'Enter findings summary (e.g. active infestation in crawlspace, no activity found).',
    condition: (answers, project) => isAgeConditionalRequired(answers, project) && answers.termite_test_status === 'completed',
  },
  {
    key:      'phase_i_esa_status',
    type:     'select',
    question: 'What is the Phase I ESA status?',
    hint:     'Phase I Environmental Site Assessment. Contamination can make a property un-financeable.',
    options: [
      { value: 'pending', label: 'Pending', description: 'ESA is not yet ordered.' },
      { value: 'ordered', label: 'Ordered', description: 'ESA has been ordered.' },
      { value: 'completed', label: 'Completed', description: 'ESA has been completed.' },
      { value: 'waived', label: 'Waived', description: 'ESA has been waived.' },
    ],
    condition: (answers, project) => {
      const type = ((project?.property_type || project?.propertyType) || '').toLowerCase();
      const assetClass = ((project?.asset_class || project?.assetClass) || '').toLowerCase();
      const isCommercialOrMixed = type.includes('commercial') || type.includes('mixed') || type.includes('industrial') ||
        assetClass.includes('commercial') || assetClass.includes('mixed') || assetClass.includes('industrial');
      const isElected = !!project?.financials?.phaseIElected;
      return answers.offer_status === 'accepted' && (isCommercialOrMixed || isElected);
    },
  },
  {
    key:      'phase_i_esa_findings',
    type:     'text',
    question: 'What are the Phase I ESA findings?',
    hint:     'Detail RECs (Recognized Environmental Conditions) identified, soil contamination, historical hazards, etc.',
    condition: (answers, project) => {
      const type = ((project?.property_type || project?.propertyType) || '').toLowerCase();
      const assetClass = ((project?.asset_class || project?.assetClass) || '').toLowerCase();
      const isCommercialOrMixed = type.includes('commercial') || type.includes('mixed') || type.includes('industrial') ||
        assetClass.includes('commercial') || assetClass.includes('mixed') || assetClass.includes('industrial');
      const isElected = !!project?.financials?.phaseIElected;
      return answers.offer_status === 'accepted' && (isCommercialOrMixed || isElected) && answers.phase_i_esa_status === 'completed';
    },
  },
  {
    key:      'has_hoa',
    type:     'select',
    question: 'Is there an HOA?',
    hint:     'Confirm if there is an active Homeowners Association.',
    options: [
      { value: 'yes', label: 'Yes', description: 'Property is subject to HOA regulations and dues.' },
      { value: 'no', label: 'No', description: 'Property is not subject to an HOA.' },
    ],
    condition: (answers) => answers.offer_status === 'accepted',
  },
  {
    key:      'hoa_dues',
    type:     'number',
    question: 'What are the verified monthly HOA dues ($)?',
    hint:     'The actual monthly HOA dues. This actualizes the projected HOA expense under operating costs.',
    condition: (answers) => answers.offer_status === 'accepted' && answers.has_hoa === 'yes',
  },
  {
    key:      'title_company',
    type:     'text',
    question: "Who's handling title?",
    hint:     'Enter the title/escrow company handling the title search and escrow. This starts title work, which the Fund Phase will finalize.',
    condition: (answers) => answers.offer_status === 'accepted',
  },
  {
    key:      'contingencies',
    type:     'scorecard',
    question: 'Contingency deadline tracker',
    hint:     'Enter each contingency and its deadline (inspection, appraisal, loan approval, others). Missed contingency deadlines are the most common way deals and deposits are lost. This card alerts you before that happens.',
    condition: (answers, project) => {
      const offerStatus = answers.offer_status || project?.financials?.offer_status || project?.offer_status;
      return offerStatus === 'accepted';
    },
  },
  {
    key:      'dd_decision',
    type:     'select',
    question: 'All diligence in — do you proceed?',
    hint:     'The recorded decision that closes diligence. Proceed means closing the deal, Renegotiate means adjusting price, and Walk means terminating the contract.',
    options: [
      { value: 'proceed', label: 'Proceed', description: 'Accept diligence terms and prepare to close.' },
      { value: 'renegotiate', label: 'Renegotiate', description: 'Request price or term adjustments based on findings.' },
      { value: 'walk', label: 'Walk', description: 'Terminate the contract and archive this deal.' },
    ],
    condition: (answers, project) => {
      const offerStatus = answers.offer_status || project?.financials?.offer_status || project?.offer_status;
      return offerStatus === 'accepted' && areContingenciesResolved(answers, project);
    },
  },
  {
    key:      'dd_decision_reason',
    type:     'text',
    question: 'What is the reason for this decision?',
    hint:     'Provide a brief explanation or context for the go/no-go decision.',
    condition: (answers, project) => {
      const offerStatus = answers.offer_status || project?.financials?.offer_status || project?.offer_status;
      return offerStatus === 'accepted' && areContingenciesResolved(answers, project);
    },
  },
  {
    key:      'capital_intent',
    type:     'select',
    question: 'Funding this yourself, or inviting investors?',
    hint:     'Carried to Fund\'s modality card as a pre-fill. Selecting Solo will close the Capital Raise Interest stage automatically.',
    options: [
      { value: 'solo', label: 'Solo (Self-Funded)', description: 'Funding the deal completely on your own.' },
      { value: 'group', label: 'Group (Partnership)', description: 'Funding with a small group of partners or co-owners.' },
      { value: 'raise', label: 'Raise Capital', description: 'Raising capital or inviting co-investors to fund the deal.' },
    ],
    condition: (answers, project) => {
      const offerStatus = answers.offer_status || project?.financials?.offer_status || project?.offer_status;
      const ddDecision = answers.dd_decision || project?.financials?.dd_decision || project?.dd_decision;
      return offerStatus === 'accepted' && ddDecision === 'proceed';
    },
  },
  {
    key:      'mailing_list',
    type:     'scorecard',
    question: 'Build/Import your investor mailing list',
    hint:     'Your raise is only as strong as the list you can reach. Import contacts via CSV or track followers here.',
    condition: (answers, project) => {
      const capitalIntent = answers.capital_intent || project?.financials?.capital_intent || project?.capital_intent;
      return capitalIntent !== undefined && capitalIntent !== 'solo';
    },
  },
  {
    key:      'one_pager',
    type:     'scorecard',
    question: 'Review the Deal One-Pager',
    hint:     'Review the generated identity and projected scorecard below, honestly labeled with Projected values.',
    condition: (answers, project) => {
      const capitalIntent = answers.capital_intent || project?.financials?.capital_intent || project?.capital_intent;
      const opexTax = answers.expense_tax || project?.financials?.expense_tax || project?.expense_tax;
      return capitalIntent !== undefined && capitalIntent !== 'solo' && opexTax !== undefined;
    },
  },
  {
    key:      'loi_log',
    type:     'scorecard',
    question: 'Share & log interest',
    hint:     'Share to the Deal Marketplace and/or email the list; log LOIs and soft commitments against the equity target. Nothing binding happens here.',
    condition: (answers, project) => {
      const capitalIntent = answers.capital_intent || project?.financials?.capital_intent || project?.capital_intent;
      const onePagerReviewed = answers.one_pager_reviewed || project?.financials?.one_pager_reviewed || project?.one_pager_reviewed;
      return capitalIntent !== undefined && capitalIntent !== 'solo' && onePagerReviewed === true;
    },
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

function DealOnePagerStep({ project, answers, onSave }: { project: any; answers: any; onSave: (val: boolean) => void }) {
  const isReviewed = answers.one_pager_reviewed === true || answers.one_pager_reviewed === 'true' || project?.one_pager_reviewed === true || project?.financials?.one_pager_reviewed === true;
  
  return (
    <div className="space-y-6 text-left" id="deal-one-pager-wizard-step">
      <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Projected Deal One-Pager</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#9E9DA0] block uppercase tracking-wider text-[9px] font-bold">Deal Identity</span>
            <span className="text-white font-semibold block mt-1">{project.name || 'Unnamed Property'}</span>
            <span className="text-[#9E9DA0]/80 block text-[10px] mt-0.5">{project.address || '—'}</span>
          </div>
          <div>
            <span className="text-[#9E9DA0] block uppercase tracking-wider text-[9px] font-bold">Strategy &amp; Hold Period</span>
            <span className="text-white font-semibold block mt-1">{project.dispositionType || 'Rental'}</span>
            <span className="text-[#9E9DA0]/80 block text-[10px] mt-0.5">{project.financials?.hold_period_years ?? '—'} Years</span>
          </div>
        </div>
      </div>

      <div className="border border-white/5 rounded-xl p-4 bg-white/5">
        <TenKpiScorecard project={project} />
      </div>

      <div
        className="p-4 rounded-lg text-xs leading-relaxed space-y-1.5"
        style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', color: 'var(--text-secondary)' }}
      >
        <p className="font-bold text-amber-500 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Projected Estimates Notice
        </p>
        <p>
          All calculations, metrics, and financial yield estimates displayed here are projected figures based on current assumptions and are honestly labeled as Projected. They do not represent guarantees of actual performance.
        </p>
      </div>

      <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
        <input
          type="checkbox"
          checked={isReviewed}
          onChange={(e) => onSave(e.target.checked)}
          className="rounded border-white/20 bg-white/10 text-amber-500 focus:ring-amber-500/20 w-4 h-4"
        />
        <div className="text-xs">
          <span className="text-white font-semibold block">I have reviewed the generated projected one-pager</span>
          <span className="text-[#9E9DA0]/60 text-[10px] block mt-0.5">Confirming this checkmark records your diligence review in the deal files.</span>
        </div>
      </label>
    </div>
  );
}

function ShareAndLogStep({
  project,
  answers,
  onSave
}: {
  project: any;
  answers: any;
  onSave: (updates: { loi_log?: any[]; equity_target?: number }) => void;
}) {
  const f = project?.financials ?? {};
  const [equityTargetStr, setEquityTargetStr] = useState(
    answers.equity_target !== undefined 
      ? String(answers.equity_target) 
      : (f.equity_target !== undefined ? String(f.equity_target / 100) : '')
  );
  
  const [loiLog, setLoiLog] = useState<any[]>(
    answers.loi_log || f.loi_log || []
  );

  const [investorName, setInvestorName] = useState('');
  const [commitAmountStr, setCommitAmountStr] = useState('');
  const [isSharedToMarketplace, setIsSharedToMarketplace] = useState(false);
  const [isEmailedToList, setIsEmailedToList] = useState(false);

  // Sync state changes back
  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investorName.trim() || !commitAmountStr) {
      toast.error('Please enter investor name and commitment amount');
      return;
    }
    const amt = Math.round(parseFloat(commitAmountStr) * 100);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid commitment amount');
      return;
    }

    const newLog = [
      ...loiLog,
      {
        investor: investorName.trim(),
        amount: amt,
        date: new Date().toISOString().split('T')[0],
        status: 'soft-committed' as const
      }
    ];

    setLoiLog(newLog);
    setInvestorName('');
    setCommitAmountStr('');

    onSave({
      loi_log: newLog,
      equity_target: equityTargetStr ? Math.round(parseFloat(equityTargetStr) * 100) : undefined
    });
    toast.success('Soft commitment logged!');
  };

  const handleRemoveCommitment = (idx: number) => {
    const newLog = loiLog.filter((_, i) => i !== idx);
    setLoiLog(newLog);
    onSave({
      loi_log: newLog,
      equity_target: equityTargetStr ? Math.round(parseFloat(equityTargetStr) * 100) : undefined
    });
    toast.success('Commitment removed');
  };

  const handleTargetBlur = () => {
    const targetCents = equityTargetStr ? Math.round(parseFloat(equityTargetStr) * 100) : undefined;
    onSave({
      loi_log: loiLog,
      equity_target: targetCents
    });
  };

  const totalLoggedCents = loiLog.reduce((sum, c) => sum + (c.amount || 0), 0);
  const targetCents = equityTargetStr ? Math.round(parseFloat(equityTargetStr) * 100) : 0;
  const progressPercent = targetCents > 0 ? Math.min(100, Math.round((totalLoggedCents / targetCents) * 100)) : 0;

  return (
    <div className="space-y-6 text-left" id="share-and-log-wizard-step">
      {/* Target & Summary Panel */}
      <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Equity Financing Target</h4>
            <p className="text-[10px] text-[#9E9DA0]/60 mt-0.5">Determine the target raise amount for this opportunity.</p>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-3 py-1">
            <span className="text-xs text-[#9E9DA0] font-semibold">$</span>
            <input
              type="number"
              value={equityTargetStr}
              onChange={(e) => setEquityTargetStr(e.target.value)}
              onBlur={handleTargetBlur}
              placeholder="0"
              className="bg-transparent text-xs text-white font-bold w-24 outline-none focus:ring-0 text-right"
              id="input-equity-target"
            />
          </div>
        </div>

        {targetCents > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold">
              <span className="text-[#9E9DA0]">Raised Progress</span>
              <span className="text-pw-success">
                {(totalLoggedCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} / {(targetCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className="bg-pw-success h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Share Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            setIsSharedToMarketplace(true);
            toast.success('Deal successfully shared to PaperWorking Marketplace!');
          }}
          className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
            isSharedToMarketplace
              ? 'bg-pw-success-container border-pw-success-border text-pw-success font-extrabold'
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
          }`}
          id="btn-share-marketplace"
        >
          <TrendingUp className="w-4 h-4" />
          {isSharedToMarketplace ? 'Shared to Marketplace' : 'Share to Marketplace'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsEmailedToList(true);
            toast.success('Project one-pager distributed to email list!');
          }}
          className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
            isEmailedToList
              ? 'bg-pw-success-container border-pw-success-border text-pw-success font-extrabold'
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
          }`}
          id="btn-email-list"
        >
          <Mail className="w-4 h-4" />
          {isEmailedToList ? 'Distributed to List' : 'Email to Mailing List'}
        </button>
      </div>

      {/* Commitments list */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-[#9E9DA0] uppercase tracking-wider">Interest Funnel (Non-Binding LOIs)</h4>
        
        {loiLog.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-white/5 bg-white/5 text-xs text-[#9E9DA0]/60">
            No soft commitments logged yet. Share the deal or add commits manually below.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-[#9E9DA0] uppercase tracking-wider text-[9px] font-bold">
                  <th className="p-3">Investor</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loiLog.map((c, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-all text-white font-semibold">
                    <td className="p-3 text-xs">{c.investor}</td>
                    <td className="p-3 font-mono text-xs">{(c.amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-[#9E9DA0] font-mono text-xs">{c.date}</td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-pw-success-container text-pw-success border border-pw-success-border uppercase tracking-wider">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveCommitment(i)}
                        className="p-1 hover:bg-red-500/10 rounded text-red-400 font-bold transition-all text-[10px]"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add manually form */}
      <form onSubmit={handleAddCommitment} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
        <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Log Manual Soft Commitment</h5>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Investor Name</label>
            <input
              type="text"
              value={investorName}
              onChange={(e) => setInvestorName(e.target.value)}
              placeholder="e.g. Alice Capital"
              className="w-full bg-black/40 border border-white/10 text-xs text-white rounded-lg p-2.5 outline-none focus:border-white/20"
              id="input-loi-investor"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Commitment Amount ($)</label>
            <input
              type="number"
              value={commitAmountStr}
              onChange={(e) => setCommitAmountStr(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full bg-black/40 border border-white/10 text-xs text-white rounded-lg p-2.5 outline-none focus:border-white/20"
              id="input-loi-amount"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-pw-success text-[#0d0a0b] hover:bg-pw-success/90 transition-all"
          id="btn-add-loi-commitment"
        >
          Add to Interest Log
        </button>
      </form>
    </div>
  );
}

function ScorecardStepAnswers({ project, answers }: { project: any; answers: Partial<FormAnswers> }) {
  const liveFinancials = useMemo(() => {
    if (!project) return {};
    const f = project.financials ?? {};
    
    const isSelfManaged = answers.has_professional_management === 'no';
    const type = String(project.property_type || project.propertyType || '').toLowerCase();
    const hasHOA = type.includes('condo') || type.includes('hoa') || type.includes('mixed-use');

    const vacancyRate = answers.vacancy_rate !== undefined ? Number(answers.vacancy_rate) : (project.vacancy_rate ?? f.vacancyRatePercent ?? 5.5);
    const holdPeriod = answers.hold_period_years !== undefined ? Number(answers.hold_period_years) : (project.hold_period_years ?? f.hold_period_years ?? 5);
    const appreciationRate = answers.appreciation_rate !== undefined ? Number(answers.appreciation_rate) : (project.appreciation_rate ?? f.appreciation_rate ?? 3);

    const purchasePriceCents = answers.expected_purchase_price !== undefined
      ? Number(answers.expected_purchase_price)
      : (project.expected_purchase_price ?? (f.purchasePrice ?? 0) * 100);
    const purchasePrice = purchasePriceCents / 100;

    const downPaymentPercent = answers.down_payment_pct !== undefined ? Number(answers.down_payment_pct) : (f.downPaymentPercent ?? 25);
    const loanInterestRate = answers.est_rate !== undefined ? Number(answers.est_rate) : (f.loanInterestRate ?? 6.5);
    const loanTermYears = answers.est_term_years !== undefined ? Number(answers.est_term_years) : (f.loanTermYears ?? 30);

    const closingCosts = answers.closing_costs !== undefined ? Number(answers.closing_costs) / 100 : (f.closingCosts ?? 0);
    const upfrontRehab = answers.upfront_rehab_budget !== undefined ? Number(answers.upfront_rehab_budget) / 100 : (f.projectedRehabCost ?? 0);

    const tax = answers.expense_tax !== undefined ? Number(answers.expense_tax) / 100 : (f.tax ?? 0);
    const insurance = answers.expense_insurance !== undefined ? Number(answers.expense_insurance) / 100 : (f.insurance ?? 0);
    const security = answers.expense_security !== undefined ? Number(answers.expense_security) / 100 : (f.security ?? 0);
    const maintenance = answers.expense_maintenance !== undefined ? Number(answers.expense_maintenance) / 100 : (f.maintenance ?? 0);
    const utilities = answers.expense_utilities !== undefined ? Number(answers.expense_utilities) / 100 : (f.utilities ?? 0);
    const hoa = !hasHOA ? 0 : (answers.expense_hoa !== undefined ? Number(answers.expense_hoa) / 100 : (f.HOA ?? 0));
    const capex = answers.expense_capex !== undefined ? Number(answers.expense_capex) / 100 : (f.capex ?? 0);
    const management = isSelfManaged ? 0 : (answers.expense_management !== undefined ? Number(answers.expense_management) / 100 : (f.management ?? 0));

    const grossRentCents = answers.gross_annual_rent !== undefined ? Number(answers.gross_annual_rent) : (project.gross_annual_rent ?? (f.monthlyGrossRent ?? 0) * 12 * 100);
    const grossRentDollars = grossRentCents / 100;
    const monthlyGrossRentDollars = grossRentDollars / 12;

    const loanAmount = purchasePrice * (1 - (downPaymentPercent / 100));

    return {
      ...f,
      purchasePrice,
      targetPrice: purchasePrice,
      gross_annual_rent: grossRentCents,
      monthlyGrossRent: monthlyGrossRentDollars,
      vacancyRatePercent: vacancyRate,
      vacancy_pct: vacancyRate,
      projectedHoldTimeMonths: holdPeriod * 12,
      hold_period_years: holdPeriod,
      annualAppreciationPercent: appreciationRate,
      appreciation_rate: appreciationRate,
      downPaymentPercent,
      loanInterestRate,
      loanTermYears,
      loanAmount,
      closingCosts,
      projectedRehabCost: upfrontRehab,
      tax,
      insurance,
      security,
      maintenance,
      utilities,
      HOA: hoa,
      capex,
      management,
      has_professional_management: answers.has_professional_management,
    };
  }, [project, answers]);

  const metrics = useMemo(() => {
    if (!project) return null;
    try {
      return deriveAllMetrics(
        liveFinancials,
        liveFinancials.estimatedCurrentValue || undefined,
        project.dispositionType ?? 'RENT',
        1,
        project.createdAt
      );
    } catch (err) {
      console.error('Error deriving metrics:', err);
      return null;
    }
  }, [liveFinancials, project]);

  if (!metrics) return null;

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const fmtPercent = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return `${val.toFixed(2)}%`;
  };

  const fmtRatio = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return `${val.toFixed(2)}x`;
  };

  const isAllCash = liveFinancials.financingType === 'All Cash';

  const isCocValid = metrics.cashOnCashReturn >= 8 && metrics.cashOnCashReturn <= 12;
  const isGrmValid = metrics.grossRentMultiplier >= 4 && metrics.grossRentMultiplier <= 7;
  const isOerValid = metrics.oer >= 35 && metrics.oer <= 45;
  const isCapValid = metrics.capRate >= 4 && metrics.capRate <= 10;
  const isDscrValid = isAllCash || metrics.dscr >= 1.25;

  return (
    <div className="space-y-6 w-full max-w-4xl" id="underwriting-scorecard-step">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {/* NOI */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-noi">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">NOI</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{fmtCurrency(metrics.noi)}</span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Net Operating Income</span>
        </div>

        {/* Cash Flow */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-cashflow">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Cash Flow</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{fmtCurrency(metrics.monthlyCashFlow)}/mo</span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">{fmtCurrency(metrics.annualCashFlow)}/yr</span>
        </div>

        {/* Cap Rate */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-caprate">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Cap Rate</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{fmtPercent(metrics.capRate)}</span>
            <span className={`text-[9px] inline-block px-1.5 py-0.5 rounded-full mt-1.5 font-bold ${isCapValid ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-white/5 text-[#9E9DA0]'}`}>
              Guidance: 4-10%
            </span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Purchase Yield</span>
        </div>

        {/* Cash-on-Cash */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-coc">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Cash-on-Cash</span>
            <span className={`text-lg font-extrabold mt-1 block ${metrics.cashOnCashReturn >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {fmtPercent(metrics.cashOnCashReturn)}
            </span>
            <span className={`text-[9px] inline-block px-1.5 py-0.5 rounded-full mt-1.5 font-bold ${isCocValid ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-white/5 text-[#9E9DA0]'}`}>
              Target: 8-12%
            </span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Yield on Cash</span>
        </div>

        {/* GRM */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-grm">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">GRM</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{fmtRatio(metrics.grossRentMultiplier)}</span>
            <span className={`text-[9px] inline-block px-1.5 py-0.5 rounded-full mt-1.5 font-bold ${isGrmValid ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-white/5 text-[#9E9DA0]'}`}>
              Target: 4-7
            </span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Rent Multiplier</span>
        </div>

        {/* DSCR */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors relative" id="scorecard-dscr">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">DSCR</span>
            <span className={`text-lg font-extrabold mt-1 block ${isDscrValid ? 'text-white' : 'text-rose-400'}`}>
              {isAllCash ? 'N/A' : fmtRatio(metrics.dscr)}
            </span>
            {!isAllCash && metrics.dscr < 1.25 && (
              <span className="text-[8px] font-bold text-rose-400 block mt-1.5">
                ⚠️ Low DSCR
              </span>
            )}
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Debt Coverage</span>
        </div>

        {/* IRR */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-irr">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">IRR</span>
            <span className="text-lg font-extrabold text-white mt-1 block">
              {metrics.irr !== null && metrics.irr !== undefined ? fmtPercent(metrics.irr) : '—'}
            </span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Newton-Raphson Yield</span>
        </div>

        {/* Occupancy */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-occupancy">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Occupancy</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{fmtPercent(metrics.occupancyRate)}</span>
            <span className="text-[8px] text-[#9E9DA0]/70 block mt-1.5">
              Vacancy: {fmtPercent(liveFinancials.vacancyRatePercent)}
            </span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Assumed Occupancy</span>
        </div>

        {/* Expense Ratio */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-oer">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Expense Ratio</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{fmtPercent(metrics.oer)}</span>
            <span className={`text-[9px] inline-block px-1.5 py-0.5 rounded-full mt-1.5 font-bold ${isOerValid ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-white/5 text-[#9E9DA0]'}`}>
              Target: 35-45%
            </span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Operating Ratio</span>
        </div>

        {/* Long-Term Appreciation */}
        <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors" id="scorecard-appreciation">
          <div>
            <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Appreciation</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{fmtPercent(metrics.annualizedAppreciation)}</span>
          </div>
          <span className="text-[9px] text-[#9E9DA0]/50 mt-1 block">Assumed Growth</span>
        </div>
      </div>

      {!isAllCash && metrics.dscr < 1.25 && (
        <div className="bg-rose-950/40 border border-rose-500/20 rounded-xl p-4 flex gap-3 items-start animate-pulse" id="scorecard-dscr-warning-callout">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-[#FDFFFC]/90">
            <h5 className="font-bold text-rose-400">Prominent Warning: Debt Service Coverage Ratio (DSCR) is {fmtRatio(metrics.dscr)}</h5>
            <p className="text-[#9E9DA0] mt-1 leading-relaxed">
              This is below the standard commercial lending threshold of 1.20x - 1.25x. Real estate fund financing and leverage terms will heavily hinge on this ratio. Adjust your expected rent, purchase price, down payment, or rate to improve debt coverage before proceeding to fund.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Phase1WorkspacePage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useAuth();
  const projectId = params.id as string;

  /* ── Data from shared WorkspaceContext (fetched once by layout) ── */
  const { project, loading, refresh } = useWorkspaceProject();

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
    (project?.disposition_type || project?.dispositionType) &&
    project?.subStrategy
  );

  const isStage4Complete = !!(
    (project?.financials?.offer_status === 'accepted' || project?.financials?.offerStatus === 'Accepted') &&
    ((project?.financials?.accepted_price ?? 0) > 0 || (project?.financials?.finalAgreedPrice ?? 0) > 0)
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
    const type = (proj?.propertyType || '').toLowerCase();
    const assetClass = (proj?.assetClass || '').toLowerCase();
    const isCondoOrMixed = type.includes('condo') || type.includes('townhome') || type.includes('mixed') ||
      assetClass.includes('condo') || assetClass.includes('townhome') || assetClass.includes('mixed');
    return isCondoOrMixed || !!proj?.hoa || !!proj?.financials?.hasHOA || !!proj?.financials?.hoaElected || !!proj?.financials?.has_hoa;
  };

  const isAttorneyRequired = (proj: any) => {
    const ATTORNEY_STATES = ['NY', 'NJ', 'MA', 'CT', 'GA', 'SC', 'NC', 'IL'];
    const stateCode = proj?.state || proj?.address?.state || '';
    const isAttorneyState = !!stateCode && ATTORNEY_STATES.includes(stateCode.toUpperCase());
    return isAttorneyState || !!proj?.financials?.attorneyElected;
  };

  const isAgeConditionalTestsRequired = (proj: any) => {
    const year = proj?.yearBuilt || proj?.year_built || proj?.financials?.yearBuilt || proj?.financials?.year_built || proj?.propertyFacts?.yearBuilt || 0;
    const isOlderHome = year > 0 && year < 1978;
    const isFlaggedByInspector = !!proj?.financials?.inspector_flagged_specialty_tests;
    const isElected = !!proj?.financials?.age_conditional_tests_elected;
    return isOlderHome || isFlaggedByInspector || isElected;
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
    (!isPhaseIRequired(project) || (
      !!((project.financials?.phaseIDocumentUrl && project.financials?.phaseICompletedDate) || (project.financials?.phaseIWaived && project.financials?.phaseIWaiverReason?.trim())) &&
      (project.financials?.phase_i_esa_status === 'completed' || project.financials?.phase_i_esa_status === 'waived')
    )) &&
    (!isHOARequired(project) || (
      !!((project.financials?.hoaDocumentUrl && project.financials?.hoaCompletedDate) || (project.financials?.hoaWaived && project.financials?.hoaWaiverReason?.trim())) &&
      (project.financials?.hoaWaived || project.financials?.has_hoa === false || project.financials?.hoa_dues !== undefined)
    )) &&
    (!isAttorneyRequired(project) || !!((project.financials?.attorneyDocumentUrl && project.financials?.attorneyCompletedDate) || (project.financials?.attorneyWaived && project.financials?.attorneyWaiverReason?.trim()))) &&
    (!isAgeConditionalTestsRequired(project) || (
      (project.financials?.radon_test_status === 'completed' || project.financials?.radon_test_status === 'waived') &&
      (project.financials?.lead_test_status === 'completed' || project.financials?.lead_test_status === 'waived') &&
      (project.financials?.termite_test_status === 'completed' || project.financials?.termite_test_status === 'waived')
    ))
  );

  const totalLoiAmountCents = (project?.financials?.loi_log || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const isStage6Complete = !!(
    project?.financials?.capital_intent === 'solo' ||
    project?.financials?.capitalPlan === 'all-cash solo' ||
    project?.financials?.capitalPlan === 'solo-financed' ||
    ((project?.financials?.capital_intent === 'group' || project?.financials?.capitalPlan === 'partnership') &&
      !!project?.financials?.one_pager_reviewed &&
      project?.financials?.equity_target !== undefined && project?.financials?.equity_target > 0 &&
      totalLoiAmountCents >= project?.financials?.equity_target) ||
    ((project?.financials?.capital_intent === 'raise' || project?.financials?.capitalPlan === 'raise interest') &&
      !!project?.financials?.one_pager_reviewed &&
      project?.financials?.equity_target !== undefined && project?.financials?.equity_target > 0 &&
      totalLoiAmountCents >= project?.financials?.equity_target)
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
    const isSelfManaged = answers.has_professional_management === 'no';
    const type = String(project?.property_type || project?.propertyType || '').toLowerCase();
    const hasHOA = type.includes('condo') || type.includes('hoa') || type.includes('mixed-use');

    return {
      purchasePrice:         answers.purchasePrice         as number | undefined,
      gross_annual_rent:     answers.gross_annual_rent     as number | undefined,
      vacancy_rate:          answers.vacancy_rate          as number | undefined,
      estimatedARV:          answers.estimatedARV          as number | undefined,
      projectedRehabCost:    answers.projectedRehabCost    as number | undefined,
      loanAmount:            answers.loanAmount            as number | undefined,
      loanInterestRate:      answers.loanInterestRate      as number | undefined,
      loanOriginationPoints: answers.loanOriginationPoints as number | undefined,
      estimatedTimelineDays: answers.estimatedTimelineDays as number | undefined,
      offerStatus:           answers.offerStatus           as string | undefined,

      expense_tax:           answers.expense_tax !== undefined ? (answers.expense_tax as number) / 100 : undefined,
      expense_insurance:     answers.expense_insurance !== undefined ? (answers.expense_insurance as number) / 100 : undefined,
      expense_security:      answers.expense_security !== undefined ? (answers.expense_security as number) / 100 : undefined,
      expense_maintenance:   answers.expense_maintenance !== undefined ? (answers.expense_maintenance as number) / 100 : undefined,
      expense_utilities:     answers.expense_utilities !== undefined ? (answers.expense_utilities as number) / 100 : undefined,
      expense_hoa:           !hasHOA ? 0 : (answers.expense_hoa !== undefined ? (answers.expense_hoa as number) / 100 : undefined),
      expense_capex:         answers.expense_capex !== undefined ? (answers.expense_capex as number) / 100 : undefined,
      
      has_professional_management: answers.has_professional_management as string | undefined,
      expense_management:    isSelfManaged ? 0 : (answers.expense_management !== undefined ? (answers.expense_management as number) / 100 : undefined),

      expected_purchase_price: answers.expected_purchase_price !== undefined ? (answers.expected_purchase_price as number) / 100 : undefined,
      down_payment_pct:      answers.down_payment_pct !== undefined ? (answers.down_payment_pct as number) : undefined,
      est_rate:              answers.est_rate !== undefined ? (answers.est_rate as number) : undefined,
      est_term_years:        answers.est_term_years !== undefined ? (answers.est_term_years as number) : undefined,

      closing_costs:         answers.closing_costs !== undefined ? (answers.closing_costs as number) / 100 : undefined,
      upfront_rehab_budget:  answers.upfront_rehab_budget !== undefined ? (answers.upfront_rehab_budget as number) / 100 : undefined,

      hold_period_years:     answers.hold_period_years !== undefined ? (answers.hold_period_years as number) : undefined,
      appreciation_rate:     answers.appreciation_rate !== undefined ? (answers.appreciation_rate as number) : undefined,
      offer_price:           answers.offer_price !== undefined ? (answers.offer_price as number) : undefined,
      earnest_money:         answers.earnest_money !== undefined ? (answers.earnest_money as number) : undefined,
      offer_terms:           answers.offer_terms !== undefined ? (answers.offer_terms as string) : undefined,
      offer_status:           answers.offer_status !== undefined ? (answers.offer_status as 'submitted' | 'countered' | 'accepted' | 'rejected') : undefined,
      accepted_price:         answers.accepted_price !== undefined ? (answers.accepted_price as number) : undefined,
      contract_executed_date: answers.contract_executed_date !== undefined ? (answers.contract_executed_date as string) : undefined,
      inspection_status:      answers.inspection_status !== undefined ? (answers.inspection_status as 'pending' | 'scheduled' | 'completed' | 'cancelled') : undefined,
      inspection_findings:    answers.inspection_findings !== undefined ? (answers.inspection_findings as string) : undefined,
      radon_test_status:      answers.radon_test_status !== undefined ? (answers.radon_test_status as 'pending' | 'ordered' | 'completed' | 'waived') : undefined,
      radon_test_result:      answers.radon_test_result !== undefined ? (answers.radon_test_result as string) : undefined,
      lead_test_status:       answers.lead_test_status !== undefined ? (answers.lead_test_status as 'pending' | 'ordered' | 'completed' | 'waived') : undefined,
      lead_test_result:       answers.lead_test_result !== undefined ? (answers.lead_test_result as string) : undefined,
      termite_test_status:    answers.termite_test_status !== undefined ? (answers.termite_test_status as 'pending' | 'ordered' | 'completed' | 'waived') : undefined,
      termite_test_result:    answers.termite_test_result !== undefined ? (answers.termite_test_result as string) : undefined,
      inspector_flagged_specialty_tests: answers.inspector_flagged_specialty_tests !== undefined ? Boolean(answers.inspector_flagged_specialty_tests) : undefined,
      age_conditional_tests_elected: answers.age_conditional_tests_elected !== undefined ? Boolean(answers.age_conditional_tests_elected) : undefined,
      phase_i_esa_status: answers.phase_i_esa_status !== undefined ? (answers.phase_i_esa_status as 'pending' | 'ordered' | 'completed' | 'waived') : undefined,
      phase_i_esa_findings: answers.phase_i_esa_findings !== undefined ? (answers.phase_i_esa_findings as string) : undefined,
      has_hoa: answers.has_hoa !== undefined ? answers.has_hoa === 'yes' : undefined,
      hoa_dues: answers.hoa_dues !== undefined ? (answers.hoa_dues as number) * 100 : undefined,
      title_company: answers.title_company !== undefined ? (answers.title_company as string) : undefined,
      contingencies: answers.contingencies !== undefined ? answers.contingencies : undefined,
      dd_decision: answers.dd_decision !== undefined ? (answers.dd_decision as 'proceed' | 'renegotiate' | 'walk') : undefined,
      dd_decision_reason: answers.dd_decision_reason !== undefined ? (answers.dd_decision_reason as string) : undefined,
      capital_intent: answers.capital_intent !== undefined ? (answers.capital_intent as 'solo' | 'group' | 'raise') : undefined,
      one_pager_reviewed: answers.one_pager_reviewed !== undefined ? Boolean(answers.one_pager_reviewed) : undefined,
      loi_log: answers.loi_log !== undefined ? answers.loi_log : undefined,
      equity_target: answers.equity_target !== undefined ? (answers.equity_target as number) * 100 : undefined,
    };
  }

  /* ── Build initial answers from saved financials ── */
  function toInitialAnswers(): Partial<FormAnswers> {
    const f = project?.financials;
    if (!f) return {};
    return {
      purchasePrice:         f.purchasePrice || (project?.askingPriceCents ? Number(project.askingPriceCents) : undefined),
      gross_annual_rent:     project.gross_annual_rent || f.gross_annual_rent,
      vacancy_rate:          project.vacancy_rate || f.vacancy_rate,
      estimatedARV:          f.estimatedARV,
      projectedRehabCost:    f.projectedRehabCost,
      loanAmount:            f.loanAmount,
      loanInterestRate:      f.loanInterestRate,
      loanOriginationPoints: f.loanOriginationPoints,
      estimatedTimelineDays: f.estimatedTimelineDays,
      offerStatus:           f.offerStatus as string | undefined,

      expense_tax:           project.expense_tax !== undefined ? project.expense_tax : (f.expense_tax !== undefined ? f.expense_tax * 100 : (f.tax ?? f.holdingCostTaxes ?? 0) * 100),
      expense_insurance:     project.expense_insurance !== undefined ? project.expense_insurance : (f.expense_insurance !== undefined ? f.expense_insurance * 100 : (f.insurance ?? f.holdingCostInsurance ?? 0) * 100),
      expense_security:      project.expense_security !== undefined ? project.expense_security : (f.expense_security !== undefined ? f.expense_security * 100 : (f.security ?? 0) * 100),
      expense_maintenance:   project.expense_maintenance !== undefined ? project.expense_maintenance : (f.expense_maintenance !== undefined ? f.expense_maintenance * 100 : (f.maintenance ?? f.monthlyMaintenanceReserve ?? f.maintenanceReserves ?? 0) * 100),
      expense_utilities:     project.expense_utilities !== undefined ? project.expense_utilities : (f.expense_utilities !== undefined ? f.expense_utilities * 100 : (f.utilities ?? f.holdingCostUtilities ?? 0) * 100),
      expense_hoa:           project.expense_hoa !== undefined ? project.expense_hoa : (f.expense_hoa !== undefined ? f.expense_hoa * 100 : (f.HOA ?? f.monthlyHOA ?? 0) * 100),
      expense_capex:         project.expense_capex !== undefined ? project.expense_capex : (f.expense_capex !== undefined ? f.expense_capex * 100 : (f.capex ?? 0) * 100),
      has_professional_management: project.has_professional_management || f.has_professional_management,
      expense_management:    project.expense_management !== undefined ? project.expense_management : (f.expense_management !== undefined ? f.expense_management * 100 : (f.management ?? f.propertyManagementFee ?? 0) * 100),

      expected_purchase_price: project.expected_purchase_price !== undefined ? project.expected_purchase_price : (f.expected_purchase_price !== undefined ? f.expected_purchase_price * 100 : (f.purchasePrice ?? f.targetPrice ?? 0) * 100),
      down_payment_pct:      project.down_payment_pct !== undefined ? project.down_payment_pct : (f.down_payment_pct !== undefined ? f.down_payment_pct : (f.downPaymentPercent ?? 25)),
      est_rate:              project.est_rate !== undefined ? project.est_rate : (f.est_rate !== undefined ? f.est_rate : (f.loanInterestRate ?? 0)),
      est_term_years:        project.est_term_years !== undefined ? project.est_term_years : (f.est_term_years !== undefined ? f.est_term_years : (f.loanTermYears ?? 30)),

      closing_costs:         project.closing_costs !== undefined ? project.closing_costs : (f.closing_costs !== undefined ? f.closing_costs * 100 : (f.closingCosts !== undefined ? f.closingCosts * 100 : (f.estClosingCostsCents !== undefined ? Number(f.estClosingCostsCents) : 0))),
      upfront_rehab_budget:  project.upfront_rehab_budget !== undefined ? project.upfront_rehab_budget : (f.upfront_rehab_budget !== undefined ? f.upfront_rehab_budget * 100 : (f.projectedRehabCost !== undefined ? f.projectedRehabCost * 100 : 0)),

      hold_period_years:     project.hold_period_years !== undefined ? project.hold_period_years : (f.hold_period_years !== undefined ? f.hold_period_years : (f.projectedHoldTimeMonths !== undefined ? f.projectedHoldTimeMonths / 12 : 5)),
      appreciation_rate:     project.appreciation_rate !== undefined ? project.appreciation_rate : (f.appreciation_rate !== undefined ? f.appreciation_rate : (f.annualAppreciationPercent !== undefined ? f.annualAppreciationPercent : 3)),
      offer_price:           project.offer_price !== undefined ? project.offer_price : (f.offer_price !== undefined ? f.offer_price : undefined),
      earnest_money:         project.earnest_money !== undefined ? project.earnest_money : (f.earnest_money !== undefined ? f.earnest_money : undefined),
      offer_terms:           project.offer_terms !== undefined ? project.offer_terms : (f.offer_terms !== undefined ? f.offer_terms : undefined),
      offer_status:           project.offer_status !== undefined ? project.offer_status : (f.offer_status !== undefined ? f.offer_status : undefined),
      accepted_price:         project.accepted_price !== undefined ? project.accepted_price : (f.accepted_price !== undefined ? f.accepted_price : undefined),
      inspection_status:      project.inspection_status !== undefined ? project.inspection_status : (f.inspection_status !== undefined ? f.inspection_status : undefined),
      contract_executed_date: project.contract_executed_date !== undefined ? project.contract_executed_date : (f.contract_executed_date !== undefined ? f.contract_executed_date : undefined),
      inspection_findings:    project.inspection_findings !== undefined ? project.inspection_findings : (f.inspection_findings !== undefined ? f.inspection_findings : undefined),
      radon_test_status:      project.radon_test_status !== undefined ? project.radon_test_status : (f.radon_test_status !== undefined ? f.radon_test_status : undefined),
      radon_test_result:      project.radon_test_result !== undefined ? project.radon_test_result : (f.radon_test_result !== undefined ? f.radon_test_result : undefined),
      lead_test_status:       project.lead_test_status !== undefined ? project.lead_test_status : (f.lead_test_status !== undefined ? f.lead_test_status : undefined),
      lead_test_result:       project.lead_test_result !== undefined ? project.lead_test_result : (f.lead_test_result !== undefined ? f.lead_test_result : undefined),
      termite_test_status:    project.termite_test_status !== undefined ? project.termite_test_status : (f.termite_test_status !== undefined ? f.termite_test_status : undefined),
      termite_test_result:    project.termite_test_result !== undefined ? project.termite_test_result : (f.termite_test_result !== undefined ? f.termite_test_result : undefined),
      phase_i_esa_status:     project.phase_i_esa_status !== undefined ? project.phase_i_esa_status : (f.phase_i_esa_status !== undefined ? f.phase_i_esa_status : undefined),
      phase_i_esa_findings:   project.phase_i_esa_findings !== undefined ? project.phase_i_esa_findings : (f.phase_i_esa_findings !== undefined ? f.phase_i_esa_findings : undefined),
      has_hoa:                project.has_hoa !== undefined ? (project.has_hoa ? 'yes' : 'no') : (f.has_hoa !== undefined ? (f.has_hoa ? 'yes' : 'no') : undefined),
      hoa_dues:               project.hoa_dues !== undefined ? project.hoa_dues / 100 : (f.hoa_dues !== undefined ? f.hoa_dues / 100 : undefined),
      title_company:          project.title_company !== undefined ? project.title_company : (f.title_company !== undefined ? f.title_company : undefined),
      contingencies:          project.contingencies !== undefined ? project.contingencies : (f.contingencies !== undefined ? f.contingencies : []),
      dd_decision:            project.dd_decision !== undefined ? project.dd_decision : (f.dd_decision !== undefined ? f.dd_decision : undefined),
      dd_decision_reason:     project.dd_decision_reason !== undefined ? project.dd_decision_reason : (f.dd_decision_reason !== undefined ? f.dd_decision_reason : undefined),
      capital_intent:         project.capital_intent !== undefined ? project.capital_intent : (f.capital_intent !== undefined ? f.capital_intent : undefined),
      one_pager_reviewed:     project.one_pager_reviewed !== undefined ? project.one_pager_reviewed : (f.one_pager_reviewed !== undefined ? f.one_pager_reviewed : undefined),
      loi_log:                project.loi_log !== undefined ? project.loi_log : (f.loi_log !== undefined ? f.loi_log : []),
      equity_target:          project.equity_target !== undefined ? project.equity_target / 100 : (f.equity_target !== undefined ? f.equity_target / 100 : undefined),
    };
  }

  const handleOnePagerReviewedChange = async (reviewed: boolean) => {
    if (project) {
      try {
        const merged = { ...(project.financials ?? {}), one_pager_reviewed: reviewed };
        await projectsService.updateProject(project.id, {
          one_pager_reviewed: reviewed,
          financials: merged,
        });
        refresh();
      } catch (err) {
        console.error('Failed to save one pager review status:', err);
        toast.error('Failed to save review status');
      }
    }
  };

  const handleLoiLogChange = async (updates: { loi_log?: any[]; equity_target?: number }) => {
    if (project) {
      try {
        const merged = { ...(project.financials ?? {}), ...updates };
        await projectsService.updateProject(project.id, {
          ...updates,
          financials: merged,
        });
        refresh();
      } catch (err) {
        console.error('Failed to save LOI log updates:', err);
        toast.error('Failed to save interest log');
      }
    }
  };

  /* ── Auto-save each conversational step ── */
  async function handleStepSave(answers: Partial<FormAnswers>) {
    if (!project) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = { ...(project.financials ?? {}), ...toFinancials(answers) } as any;
    const updatePayload: any = { financials: merged };
    if (answers.gross_annual_rent !== undefined) {
      updatePayload.gross_annual_rent = answers.gross_annual_rent;
    }
    if (answers.vacancy_rate !== undefined) {
      updatePayload.vacancy_rate = answers.vacancy_rate;
    }
    
    // Also save flat fields on root
    const rootKeys = [
      'expense_tax', 'expense_insurance', 'expense_security', 'expense_maintenance',
      'expense_utilities', 'expense_hoa', 'expense_capex', 'has_professional_management',
      'expense_management', 'expected_purchase_price', 'down_payment_pct', 'est_rate',
      'est_term_years', 'closing_costs', 'upfront_rehab_budget', 'hold_period_years',
      'appreciation_rate', 'offer_price', 'earnest_money', 'offer_terms', 'offer_status',
      'accepted_price', 'contract_executed_date', 'inspection_status', 'inspection_findings',
      'radon_test_status', 'radon_test_result', 'lead_test_status', 'lead_test_result',
      'termite_test_status', 'termite_test_result', 'inspector_flagged_specialty_tests',
      'age_conditional_tests_elected', 'phase_i_esa_status', 'phase_i_esa_findings',
      'has_hoa', 'hoa_dues', 'title_company', 'contingencies', 'dd_decision', 'dd_decision_reason', 'capital_intent', 'one_pager_reviewed', 'loi_log', 'equity_target'
    ];
    if (answers.capital_intent !== undefined) {
      if (answers.capital_intent === 'solo') {
        merged.capitalPlan = 'all-cash solo';
      } else if (answers.capital_intent === 'group') {
        merged.capitalPlan = 'partnership';
      } else if (answers.capital_intent === 'raise') {
        merged.capitalPlan = 'raise interest';
      }
      updatePayload.capitalPlan = merged.capitalPlan;
    }
    if (answers.dd_decision !== undefined) {
      if (answers.dd_decision === 'walk') {
        updatePayload.status = 'exit';
      } else {
        updatePayload.status = 'acquisition';
      }
    }
    for (const key of rootKeys) {
      if (answers[key] !== undefined) {
        updatePayload[key] = merged[key];
      }
    }

    await projectsService.updateProject(project.id, updatePayload);
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
      updates.offer_status = 'accepted';
    } else if (status === 'Rejected') {
      updates.offer_status = 'rejected';
    } else if (status === 'Countered') {
      updates.offer_status = 'countered';
    } else {
      updates.offer_status = 'submitted';
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
      offer_status: 'countered' as const,
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
  if (loading) {
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
                      beds: project.beds,
                      baths: project.baths,
                      listedPrice: project.financials?.listedPrice,
                      list_price: project.list_price ?? (project.askingPriceCents ? Number(project.askingPriceCents) : undefined),
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
                      project={project}
                      onStepSave={handleStepSave}
                      onComplete={handleFormComplete}
                      renderCustomStep={(stepKey, answers) => {
                        if (stepKey === 'scorecard') {
                          return <ScorecardStepAnswers project={project} answers={answers} />;
                        }
                        if (stepKey === 'contingencies') {
                          return (
                            <div className="text-left">
                              <ContingencyTracker
                                contingencies={contingencies}
                                onChange={handleContingenciesChange}
                              />
                            </div>
                          );
                        }
                        if (stepKey === 'mailing_list') {
                          return (
                            <div className="text-left">
                              <AudienceManager projectId={project.id} readOnly={phase1Locked} />
                            </div>
                          );
                        }
                        if (stepKey === 'one_pager') {
                          return (
                            <DealOnePagerStep
                              project={project}
                              answers={answers}
                              onSave={handleOnePagerReviewedChange}
                            />
                          );
                        }
                        if (stepKey === 'loi_log') {
                          return (
                            <ShareAndLogStep
                              project={project}
                              answers={answers}
                              onSave={handleLoiLogChange}
                            />
                          );
                        }
                        return null;
                      }}
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
                <RehabBudgetCard
                  project={project}
                  phaseColor={PHASE_COLOR}
                  onSave={handleTargetSave}
                />

                {/* Income Assumptions */}
                <IncomeAssumptionsCard
                  project={project}
                  phaseColor={PHASE_COLOR}
                  onSave={handleTargetSave}
                />

                {/* Expense Assumptions */}
                <ExpenseAssumptionsCard
                  project={project}
                  phaseColor={PHASE_COLOR}
                  onSave={handleTargetSave}
                />

                {/* Financing Assumptions */}
                <FinancingAssumptionsCard
                  project={project}
                  phaseColor={PHASE_COLOR}
                  onSave={handleTargetSave}
                />
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
                            
                            // Sync to Postgres
                            const token = (window as any).firebaseUserToken || '';
                            await fetch(`/api/reil/projects/${project.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token && { Authorization: `Bearer ${token}` }),
                              },
                              body: JSON.stringify({
                                financials: { offer_price: val * 100 }
                              }),
                            });
                            refresh();
                          }}
                          placeholder="e.g. 150000"
                          className="w-full px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">
                          Earnest Money ($)
                        </label>
                        <input
                          type="number"
                          id="earnest-money-input"
                          value={project.financials?.earnest_money ? project.financials.earnest_money / 100 : ''}
                          onChange={async (e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const merged = { ...(project.financials ?? {}), earnest_money: val * 100 };
                            await projectsService.updateProject(project.id, { financials: merged });

                            // Sync to Postgres
                            const token = (window as any).firebaseUserToken || '';
                            await fetch(`/api/reil/projects/${project.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token && { Authorization: `Bearer ${token}` }),
                              },
                              body: JSON.stringify({
                                financials: { earnest_money: val * 100 }
                              }),
                            });
                            refresh();
                          }}
                          placeholder="e.g. 5000"
                          className="w-full px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0] mb-1">
                          Offer Terms / Key Terms
                        </label>
                        <textarea
                          id="offer-terms-input"
                          value={project.financials?.offer_terms || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            const merged = { ...(project.financials ?? {}), offer_terms: val };
                            await projectsService.updateProject(project.id, { financials: merged });

                            // Sync to Postgres
                            const token = (window as any).firebaseUserToken || '';
                            await fetch(`/api/reil/projects/${project.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token && { Authorization: `Bearer ${token}` }),
                              },
                              body: JSON.stringify({
                                financials: { offer_terms: val }
                              }),
                            });
                            refresh();
                          }}
                          placeholder="e.g. 30 days close, inspection contingency..."
                          className="w-full px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none text-sm resize-none"
                          rows={3}
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

                {(project.financials?.offer_status === 'accepted' || project.financials?.offerStatus === 'Accepted') && (
                  <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-350">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
                        Confirm Offer Outcome &amp; Executed Contract Details
                      </h4>
                      <p className="text-[10px] text-[#9E9DA0]/60">Specify final contract values and upload your purchase &amp; sale agreement.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
                          Final Agreed Price ($)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Final Agreed Purchase Price"
                            defaultValue={project.financials?.accepted_price ? project.financials?.accepted_price / 100 : (project.financials?.finalAgreedPrice ? project.financials?.finalAgreedPrice / 100 : '')}
                            id="final-agreed-price-input"
                            className="flex-1 px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white placeholder-[#9E9DA0]/40 focus:outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('final-agreed-price-input') as HTMLInputElement;
                              if (input) {
                                const offerAmt = project.financials?.offer_price || project.financials?.purchasePrice || 0;
                                input.value = (offerAmt / 100).toString();
                              }
                            }}
                            className="px-3 py-2 bg-white/5 border border-white/10 text-[#9E9DA0] hover:text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            Pre-fill
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">
                          Contract Executed Date
                        </label>
                        <input
                          type="date"
                          value={project.financials?.contract_executed_date || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            const merged = { ...(project.financials ?? {}), contract_executed_date: val };
                            await projectsService.updateProject(project.id, { financials: merged });

                            // Sync to Postgres
                            const token = (window as any).firebaseUserToken || '';
                            await fetch(`/api/reil/projects/${project.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token && { Authorization: `Bearer ${token}` }),
                              },
                              body: JSON.stringify({
                                financials: { contract_executed_date: val }
                              }),
                            });
                            refresh();
                          }}
                          className="w-full px-4 py-3 rounded-lg bg-[#0d0a0b]/80 border border-white/10 text-white focus:outline-none text-sm"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      {project.financials?.accepted_price || project.financials?.finalAgreedPrice ? (
                        <p className="text-xs text-green-400 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Confirmed Final Agreed Price: ${( (project.financials?.accepted_price || project.financials?.finalAgreedPrice || 0) / 100 ).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Agreed price requires explicit confirmation to unlock next stage.
                        </p>
                      )}

                      <button
                        id="confirm-price-btn"
                        type="button"
                        onClick={async () => {
                          const input = document.getElementById('final-agreed-price-input') as HTMLInputElement;
                          const val = input ? parseFloat(input.value) : 0;
                          if (!isNaN(val) && val > 0) {
                            const merged = { 
                              ...(project.financials ?? {}), 
                              accepted_price: val * 100,
                              finalAgreedPrice: val * 100,
                              expected_purchase_price: val * 100,
                              purchasePrice: val * 100,
                              targetPrice: val * 100
                            };
                            await projectsService.updateProject(project.id, { financials: merged });

                            // Sync to Postgres
                            const token = (window as any).firebaseUserToken || '';
                            await fetch(`/api/reil/projects/${project.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token && { Authorization: `Bearer ${token}` }),
                              },
                              body: JSON.stringify({
                                financials: { 
                                  accepted_price: val * 100,
                                  finalAgreedPrice: val * 100,
                                  expected_purchase_price: val * 100,
                                  purchasePrice: val * 100,
                                  targetPrice: val * 100
                                }
                              }),
                            });
                            toast.success(`Confirmed Final Agreed Price: $${val.toLocaleString()}`);
                            refresh();
                          } else {
                            toast.error('Please enter a valid final agreed price');
                          }
                        }}
                        className="px-5 py-2.5 bg-[#454955] text-black hover:opacity-90 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        Confirm Price
                      </button>
                    </div>

                    {/* Executed PSA Document Upload */}
                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Executed Purchase &amp; Sale Agreement (PSA) Document</h5>
                        <p className="text-[10px] text-[#9E9DA0]/60 mt-1">An executed, signed PSA contract document upload is required for stage completion.</p>
                      </div>

                      {project.financials?.psaDocumentUrl ? (
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#454955] text-xl">description</span>
                            <div>
                              <p className="text-xs font-bold text-white" id="psa-contract-filename">{project.financials.psaDocumentName || 'Executed_PSA_Signed.pdf'}</p>
                              <a href={project.financials.psaDocumentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#454955] hover:underline block mt-0.5">Download Contract</a>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const merged = { ...(project.financials ?? {}), psaDocumentUrl: '', psaDocumentName: '' };
                              await projectsService.updateProject(project.id, { financials: merged });
                              toast.success('PSA contract document removed.');
                              refresh();
                            }}
                            id="remove-psa-contract-btn"
                            className="text-xs text-[#F06543] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-dashed border-white/10 rounded-xl">
                          <span className="material-symbols-outlined text-[#9E9DA0]/40 text-3xl mb-2">description</span>
                          <p className="text-xs text-[#9E9DA0] mb-4">No contract uploaded yet</p>
                          <button
                            onClick={async () => {
                              const merged = {
                                ...(project.financials ?? {}),
                                psaDocumentUrl: '/mock/documents/Executed_PSA_Signed.pdf',
                                psaDocumentName: 'Executed_PSA_Signed.pdf'
                              };
                              await projectsService.updateProject(project.id, { financials: merged });
                              toast.success('PSA contract uploaded successfully');
                              refresh();
                            }}
                            id="upload-psa-contract-btn"
                            className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
                          >
                            Select &amp; Upload PSA PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Loan Processing Pipeline */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6">
                  <LoanProcessingPipeline
                    currentStatus={project.loanStatus}
                    onStatusChange={handleLoanStatusChange}
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

                <ContingencyTracker
                  contingencies={contingencies}
                  onChange={async (updatedContingencies) => {
                    setContingencies(updatedContingencies);
                    await projectsService.updateProject(project.id, { contingencies: updatedContingencies });
                    refresh();
                  }}
                  readOnly={phase1Locked}
                />

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
                <VendorMatchList project={project} specialty="Inspector" />

                {isAgeConditionalTestsRequired(project) && (
                  <>
                    <AgeConditionalTestsCard
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
                <VendorMatchList project={project} specialty="Title Company" />

                {/* Manual DD Election Panel */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Additional Due Diligence Options</h4>
                    <p className="text-[10px] text-[#9E9DA0]/80">Manually require additional DD reviews if they are not triggered automatically by property details.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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

                    {/* Age-Conditional tests election */}
                    <div
                      id="toggle-age-conditional-tests-election"
                      onClick={async () => {
                        const merged = { ...(project.financials ?? {}), age_conditional_tests_elected: !project.financials?.age_conditional_tests_elected };
                        await projectsService.updateProject(project.id, { financials: merged });
                        refresh();
                      }}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer select-none ${
                        project.financials?.age_conditional_tests_elected
                          ? 'border-white/10 bg-[#454955]/10 text-white font-semibold'
                          : 'border-white/5 bg-white/5 text-[#9E9DA0] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">Environmental/Pest</span>
                      <span className="text-[11px] font-medium">{project.financials?.age_conditional_tests_elected ? '✓ Required' : '○ Optional'}</span>
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

                {(project.financials?.capitalPlan === 'raise interest' || project.financials?.capitalPlan === 'partnership' || project.financials?.capital_intent === 'group' || project.financials?.capital_intent === 'raise') && (
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
  );
}

