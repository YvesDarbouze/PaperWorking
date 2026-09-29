'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type {
  ProjectWorkspace,
  ProjectFundingTerms,
  RateLockDetails,
  ClosingDisclosureComparison,
  DownPaymentCoordination,
  LendingPackage,
  LendingPackageDocument,
  ProjectTodo,
  PropertyInspectionIssue,
  ValuationVerificationRecord,
} from '@/lib/projects/types';
import VendorMarketplaceSuggestions from './VendorMarketplaceSuggestions';
import TeamTierUpgradeModal from './TeamTierUpgradeModal';

export interface FundConversationalEngineProps {
  project: ProjectWorkspace;
  funding: ProjectFundingTerms;
  propertyState?: string;
  userTier?: string;
  initialStepId?: ConversationalStepId;
  onUpdateProject: (updated: ProjectWorkspace) => void;
  onUpdateFunding: (updated: ProjectFundingTerms) => void;
  onSwitchToExecutiveView: () => void;
  activeRoster?: any[];
}

type ConversationalStepId =
  | 'capital_structure'
  | 'lender_package'
  | 'rate_lock'
  | 'earnest_money'
  | 'property_inspection'
  | 'repair_negotiation'
  | 'appraisal_valuation'
  | 'title_clearance'
  | 'closing_disclosure'
  | 'final_walk_through'
  | 'down_payment_wire'
  | 'deed_recordation';

export default function FundConversationalEngine({
  project,
  funding,
  propertyState = 'TX',
  userTier = 'Investment Team',
  initialStepId,
  onUpdateProject,
  onUpdateFunding,
  onSwitchToExecutiveView,
  activeRoster = [],
}: FundConversationalEngineProps) {
  const purchasePrice = Number(project.purchasePrice || project.purchase_price || 392000);

  // Capital Structure state
  const [capitalType, setCapitalType] = useState<'senior_debt' | 'bridge' | 'cash' | 'syndication'>(() => {
    if (funding.loanType?.toLowerCase().includes('cash')) return 'cash';
    if (funding.loanType?.toLowerCase().includes('bridge')) return 'bridge';
    if (funding.loanType?.toLowerCase().includes('syndic')) return 'syndication';
    return 'senior_debt';
  });

  // Debt & Lender state
  const [lenderName, setLenderName] = useState<string>(funding.lenderName || 'Apex Commercial Capital');
  const [loanAmount, setLoanAmount] = useState<number>(funding.loanAmount || Math.round(purchasePrice * 0.75));
  const [interestRatePct, setInterestRatePct] = useState<number>(funding.interestRatePct || 6.875);
  const [amortizationYears, setAmortizationYears] = useState<number>(funding.amortizationYears || 30);

  // Rate Lock state
  const [isRateLocked, setIsRateLocked] = useState<boolean>(funding.rateLock?.status === 'locked');
  const [lockedRatePct, setLockedRatePct] = useState<number>(funding.rateLock?.lockedRatePct || interestRatePct);
  const [lockDaysRemaining, setLockDaysRemaining] = useState<number>(funding.rateLock?.lockPeriodDays || 45);

  // Earnest Money state
  const [emdAmount, setEmdAmount] = useState<number>(
    project.earnestMoney?.amount || Math.round(purchasePrice * 0.02)
  );
  const [emdHolder, setEmdHolder] = useState<string>(
    project.earnestMoney?.holderEntity || 'First National Title & Settlement'
  );
  const [emdReceiptConfirmed, setEmdReceiptConfirmed] = useState<boolean>(
    project.earnestMoney?.receiptConfirmed ?? true
  );

  // Property Inspection State
  const [inspectionCompany, setInspectionCompany] = useState<string>(
    funding.valuationVerification?.inspectionDetails?.inspectorCompany || 'Precision Commercial Inspections'
  );
  const [inspectorName, setInspectorName] = useState<string>(
    funding.valuationVerification?.inspectionDetails?.inspectorName || 'Marcus Vance, PE'
  );
  const [inspectionLicense, setInspectionLicense] = useState<string>(
    funding.valuationVerification?.inspectionDetails?.licenseNumber || 'TREC-28491'
  );
  const [inspectionScheduledDate, setInspectionScheduledDate] = useState<string>(
    funding.valuationVerification?.inspectionDetails?.scheduledDate || ''
  );
  const [inspectionContingencyDeadline, setInspectionContingencyDeadline] = useState<string>(
    funding.valuationVerification?.inspectionDetails?.contingencyDeadline || ''
  );
  const [inspectionStatus, setInspectionStatus] = useState<
    'pending_schedule' | 'scheduled' | 'completed' | 'issues_uncovered' | 'waived'
  >(funding.valuationVerification?.inspectionDetails?.status || 'completed');
  const [inspectionSignedOff, setInspectionSignedOff] = useState<boolean>(
    funding.valuationVerification?.physicalInspectionSignedOff ?? false
  );

  // Repair & Credit Negotiation State
  const [inspectionIssues, setInspectionIssues] = useState<PropertyInspectionIssue[]>(() => {
    if (funding.valuationVerification?.inspectionIssues && funding.valuationVerification.inspectionIssues.length > 0) {
      return funding.valuationVerification.inspectionIssues;
    }
    return [
      {
        id: 'issue-1',
        category: 'mep',
        description: 'Primary HVAC compressor coil degraded; requires replacement.',
        estimatedCost: 4500,
        requestedResolution: 'closing_credit',
        sellerResponse: 'agreed',
        agreedCreditAmount: 4500,
        repairStatus: 'completed_verified',
      },
      {
        id: 'issue-2',
        category: 'plumbing',
        description: 'Main cast-iron sewer line corrosion identified via camera scope.',
        estimatedCost: 3200,
        requestedResolution: 'price_reduction',
        sellerResponse: 'agreed',
        agreedCreditAmount: 3200,
        repairStatus: 'in_progress',
      },
    ];
  });
  const [repairAmendmentExecuted, setRepairAmendmentExecuted] = useState<boolean>(
    funding.valuationVerification?.repairAmendmentExecuted ?? true
  );
  const [showConvAddIssue, setShowConvAddIssue] = useState(false);
  const [convIssueCat, setConvIssueCat] = useState<PropertyInspectionIssue['category']>('roof');
  const [convIssueDesc, setConvIssueDesc] = useState('');
  const [convIssueCost, setConvIssueCost] = useState<number>(0);
  const [convIssueRes, setConvIssueRes] = useState<PropertyInspectionIssue['requestedResolution']>('closing_credit');

  // Appraisal & Valuation state
  const [appraisalOutcome, setAppraisalOutcome] = useState<'met' | 'shortfall'>('met');
  const [appraisedValue, setAppraisedValue] = useState<number>(
    (project.underwritingSnapshot?.outputs as any)?.appraisedValue || purchasePrice
  );
  const [gapResolutionPlay, setGapResolutionPlay] = useState<
    'price_reduction' | 'equity_injection' | 'rov_rebuttal' | 'terminate'
  >('price_reduction');

  // Title & Legal Protection state
  const [titleCommitmentReceived, setTitleCommitmentReceived] = useState<boolean>(true);
  const [scheduleBCleared, setScheduleBCleared] = useState<boolean>(true);
  const [surveyClean, setSurveyClean] = useState<boolean>(true);
  const [vestingEntityName, setVestingEntityName] = useState<string>(
    project.entity_type === 'LLC'
      ? `${project.propertyName || 'Acquisition'} Holdings LLC`
      : 'Vesting Entity LLC'
  );

  // 1. Clear property title (deed search, liens, judgments, disputes)
  const [deedSearchVerified, setDeedSearchVerified] = useState<boolean>(
    funding.legalTransfer?.titleSearch?.deedChainVerified ?? true
  );
  const [noUnsatisfiedLiens, setNoUnsatisfiedLiens] = useState<boolean>(
    funding.legalTransfer?.titleSearch?.noUnsatisfiedLiens ?? true
  );
  const [noTaxOrJudgments, setNoTaxOrJudgments] = useState<boolean>(
    funding.legalTransfer?.titleSearch?.noTaxOrJudgmentLiens ?? true
  );
  const [noOwnershipDisputes, setNoOwnershipDisputes] = useState<boolean>(
    funding.legalTransfer?.titleSearch?.noOwnershipOrBoundaryDisputes ?? true
  );

  // 2. Purchase title insurance (dual policies: lender & owner)
  const [lenderTitleInsBound, setLenderTitleInsBound] = useState<boolean>(
    funding.legalTransfer?.titleInsurance?.policiesBound ?? true
  );
  const [ownerTitleInsBound, setOwnerTitleInsBound] = useState<boolean>(
    funding.legalTransfer?.titleInsurance?.policiesBound ?? true
  );

  // 3. Secure property insurance (landlord/hazard binder + lender loss payee)
  const [propertyInsuranceCarrier, setPropertyInsuranceCarrier] = useState<string>(
    funding.legalTransfer?.propertyInsurance?.insuranceCarrier || 'Steadily / Travelers'
  );
  const [propertyInsuranceBound, setPropertyInsuranceBound] = useState<boolean>(
    funding.legalTransfer?.propertyInsurance?.status === 'bound' || true
  );
  const [lenderLossPayeeEndorsed, setLenderLossPayeeEndorsed] = useState<boolean>(
    funding.legalTransfer?.propertyInsurance?.lenderLossPayeeEndorsed ?? true
  );

  // CD Reconciliation state
  const [cdApproved, setCdApproved] = useState<boolean>(
    funding.closingDisclosureComparison?.isTridCompliant ?? false
  );
  const [cdCashToClose, setCdCashToClose] = useState<number>(
    funding.actualCashToClose || (funding.downPayment || 0) + (funding.closingCosts || 7840)
  );

  // Final Walk-Through State (24 to 48 hours pre-closing)
  const [walkThroughDate, setWalkThroughDate] = useState<string>(
    funding.valuationVerification?.finalWalkThrough?.scheduledDate || ''
  );
  const [walkThroughLead, setWalkThroughLead] = useState<string>(
    funding.valuationVerification?.finalWalkThrough?.inspectorOrLeadName || 'You (Lead Investor)'
  );
  const [walkThroughStatus, setWalkThroughStatus] = useState<
    'pending_schedule' | 'scheduled' | 'passed' | 'issues_identified'
  >(funding.valuationVerification?.finalWalkThrough?.status || 'pending_schedule');
  const [repairsVerified, setRepairsVerified] = useState<boolean>(
    funding.valuationVerification?.finalWalkThrough?.agreedRepairsVerified ?? false
  );
  const [broomCleanVerified, setBroomCleanVerified] = useState<boolean>(
    funding.valuationVerification?.finalWalkThrough?.broomCleanConditionVerified ?? false
  );
  const [utilitiesVerified, setUtilitiesVerified] = useState<boolean>(
    funding.valuationVerification?.finalWalkThrough?.utilitiesOperationalVerified ?? false
  );
  const [noNewDamageVerified, setNoNewDamageVerified] = useState<boolean>(
    funding.valuationVerification?.finalWalkThrough?.noNewDamageVerified ?? false
  );
  const [walkThroughSignOff, setWalkThroughSignOff] = useState<boolean>(
    funding.valuationVerification?.finalWalkThrough?.signOffCompleted ?? false
  );

  // Down Payment Wire Defense state
  const [paymentMethod, setPaymentMethod] = useState<'wire' | 'cashier_check'>('wire');
  const [phoneVerified, setPhoneVerified] = useState<boolean>(
    funding.downPaymentCoordination?.verbalConfirmationCompleted ?? false
  );
  const [outgoingWireRef, setOutgoingWireRef] = useState<string>(
    funding.downPaymentCoordination?.dispatchReferenceNumber || ''
  );

  // Deed Recordation & Closing Execution state
  const [deedDocNumber, setDeedDocNumber] = useState<string>(
    funding.legalTransfer?.deedInstrumentNumber || ''
  );
  const [deedRecordingDate, setDeedRecordingDate] = useState<string>(
    funding.legalTransfer?.deedRecordingDate || new Date().toISOString().slice(0, 10)
  );
  const [closingDocsSigned, setClosingDocsSigned] = useState<boolean>(
    funding.legalTransfer?.closingDocumentSigning?.allDocumentsExecuted ?? true
  );
  const [closingFeesPaid, setClosingFeesPaid] = useState<boolean>(
    funding.legalTransfer?.closingFeeSettlement?.feeDisbursementStatus === 'settlement_reconciled' ||
    funding.legalTransfer?.closingFeeSettlement?.feeDisbursementStatus === 'disbursed_by_escrow' ||
    true
  );
  const [possessionReceived, setPossessionReceived] = useState<boolean>(
    funding.legalTransfer?.propertyPossession
      ? funding.legalTransfer.propertyPossession.possessionStatus === 'keys_received'
      : true
  );
  const [lockboxCode, setLockboxCode] = useState<string>(
    funding.legalTransfer?.propertyPossession?.lockboxCode || '4821'
  );
  const [lockboxLocation, setLockboxLocation] = useState<string>(
    funding.legalTransfer?.propertyPossession?.lockboxLocation || 'Master lockbox on front entry handle'
  );
  const [rekeyCompleted, setRekeyCompleted] = useState<boolean>(
    funding.legalTransfer?.propertyPossession?.rekeyCompleted ?? true
  );
  const [closingFinalized, setClosingFinalized] = useState<boolean>(false);
  const [activeVendorHelp, setActiveVendorHelp] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Team Tier Gating & Step Delegation State
  const isTeamTier = userTier.toLowerCase().includes('team') || userTier.toLowerCase().includes('enterprise');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalTaskTitle, setUpgradeModalTaskTitle] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  // Step Assignees state
  const [stepAssignees, setStepAssignees] = useState<
    Record<ConversationalStepId, { name: string; role: string; isVendor?: boolean }>
  >({
    capital_structure: { name: 'You (Lead Investor)', role: 'Principal' },
    lender_package: { name: 'You (Lead Investor)', role: 'Borrower' },
    rate_lock: { name: 'Elena Rostova', role: 'Mortgage Loan Officer' },
    earnest_money: { name: 'Heritage Escrow Co', role: 'Title & Escrow Officer', isVendor: true },
    property_inspection: { name: 'Precision Commercial Inspections', role: 'Licensed Inspector', isVendor: true },
    repair_negotiation: { name: 'You (Lead Investor)', role: 'Principal' },
    appraisal_valuation: { name: 'Austin Metro Appraisals', role: 'Appraiser', isVendor: true },
    title_clearance: { name: 'First National Title & Settlement', role: 'Title Officer', isVendor: true },
    closing_disclosure: { name: 'Heritage Escrow Co', role: 'Escrow Officer', isVendor: true },
    final_walk_through: { name: 'You (Lead Investor)', role: 'Principal' },
    down_payment_wire: { name: 'You (Lead Investor)', role: 'Borrower' },
    deed_recordation: { name: 'First National Title & Settlement', role: 'Title Officer', isVendor: true },
  });

  // Multiple Lending Packages state
  const [lendingPackages, setLendingPackages] = useState<LendingPackage[]>(() => {
    if (funding.lendingPackages && funding.lendingPackages.length > 0) {
      return funding.lendingPackages;
    }
    return [
      {
        id: 'pkg-1',
        name: 'Primary Senior Acquisition Debt Package',
        targetLender: lenderName,
        loanType: 'Commercial First Mortgage / Bridge',
        requestedAmount: loanAmount,
        status: 'ready',
        documents: [
          { id: 'd1', title: 'Personal Financial Statement (PFS / Form 1003)', category: 'financials', isIncluded: true, required: true },
          { id: 'd2', title: 'Last 2 Years Personal & Corporate Tax Returns (1040/1120S)', category: 'tax_returns', isIncluded: true, required: true },
          { id: 'd3', title: 'Last 3 Months Operating & Liquidity Bank Statements', category: 'bank_statements', isIncluded: true, required: true },
          { id: 'd4', title: 'Schedule of Real Estate Owned (SREO / Track Record)', category: 'financials', isIncluded: true, required: true },
          { id: 'd5', title: 'Executed Purchase & Sale Agreement (PSA) + Addenda', category: 'property', isIncluded: true, required: true },
          { id: 'd6', title: 'PaperWorking Pro-Forma & Rehab Scope of Work', category: 'underwriting', isIncluded: true, required: true },
          { id: 'd7', title: 'Vesting Entity Articles of Org & Operating Agreement', category: 'entity', isIncluded: true, required: true },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  });
  const [activePkgId, setActivePkgId] = useState<string>(() => funding.activeLendingPackageId || 'pkg-1');
  const [isNewPkgModalOpen, setIsNewPkgModalOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgLender, setNewPkgLender] = useState('');
  const [newPkgLoanType, setNewPkgLoanType] = useState('Senior Commercial Debt');
  const [newPkgAmount, setNewPkgAmount] = useState<number>(loanAmount);
  const [applicationSubmittedMsg, setApplicationSubmittedMsg] = useState<string | null>(null);

  const activePackage = useMemo(() => {
    return lendingPackages.find((p) => p.id === activePkgId) || lendingPackages[0];
  }, [lendingPackages, activePkgId]);

  // Adaptive Branching Step Sequence
  const activeStepSequence: ConversationalStepId[] = useMemo(() => {
    if (capitalType === 'cash') {
      // All-cash deals bypass debt, rate-lock, and lender CD screens!
      return [
        'capital_structure',
        'earnest_money',
        'property_inspection',
        'repair_negotiation',
        'appraisal_valuation',
        'title_clearance',
        'final_walk_through',
        'down_payment_wire',
        'deed_recordation',
      ];
    }
    return [
      'capital_structure',
      'lender_package',
      'rate_lock',
      'earnest_money',
      'property_inspection',
      'repair_negotiation',
      'appraisal_valuation',
      'title_clearance',
      'closing_disclosure',
      'final_walk_through',
      'down_payment_wire',
      'deed_recordation',
    ];
  }, [capitalType]);

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (initialStepId) {
      const idx = activeStepSequence.indexOf(initialStepId);
      if (idx !== -1) return idx;
    }
    return 0;
  });
  const currentStepId = activeStepSequence[currentStepIndex] || activeStepSequence[0];

  // Helper for human-faced step titles
  const stepTitles: Record<ConversationalStepId, string> = {
    capital_structure: 'Capital Structure',
    lender_package: 'Lender & Package',
    rate_lock: 'Rate Lock',
    earnest_money: 'Earnest Money',
    property_inspection: 'Property Inspection',
    repair_negotiation: 'Repair & Credit Negotiation',
    appraisal_valuation: 'Valuation & Condition',
    title_clearance: 'Title & Vesting',
    closing_disclosure: 'Closing Disclosure',
    final_walk_through: 'Final Walk-Through',
    down_payment_wire: 'Wire Fraud Defense',
    deed_recordation: 'Deed & Advance',
  };

  // Step-to-Vendor Configuration for Contextual Marketplace Help
  const stepVendorConfig: Record<
    ConversationalStepId,
    {
      trade: string;
      taskTitle: string;
      ctaText: string;
    }
  > = {
    capital_structure: {
      trade: 'Lender',
      taskTitle: 'Capital Stack Structuring',
      ctaText: `Explore Subscribed Lenders in ${propertyState}`,
    },
    lender_package: {
      trade: 'Lender',
      taskTitle: 'Senior Debt Term Sheet & Underwriting',
      ctaText: `Need a competitive debt quote in ${propertyState}? View Subscribed Lenders`,
    },
    rate_lock: {
      trade: 'Lender',
      taskTitle: 'Lock Mortgage Interest Rate',
      ctaText: `Consult licensed mortgage loan officers in ${propertyState}`,
    },
    earnest_money: {
      trade: 'Title & Escrow',
      taskTitle: 'Earnest Money Escrow Deposit',
      ctaText: `Need a licensed escrow officer or title company in ${propertyState}? View Marketplace`,
    },
    property_inspection: {
      trade: 'Home Inspector',
      taskTitle: 'Licensed Physical & Mechanical Property Inspection',
      ctaText: `Need a licensed home or commercial inspector in ${propertyState}? View Marketplace`,
    },
    repair_negotiation: {
      trade: 'General Contractor',
      taskTitle: 'Inspection Defect Bids & Repair Credit Negotiation',
      ctaText: `Need licensed contractors for repair estimates in ${propertyState}? View Marketplace`,
    },
    appraisal_valuation: {
      trade: 'Appraiser',
      taskTitle: 'Commercial Narrative Appraisal',
      ctaText: `Need a licensed commercial appraiser in ${propertyState}? View Marketplace`,
    },
    title_clearance: {
      trade: 'Title & Escrow',
      taskTitle: 'Title Commitment & Schedule B Clearance',
      ctaText: `Need a title agency or real estate counsel in ${propertyState}? View Marketplace`,
    },
    closing_disclosure: {
      trade: 'Title & Escrow',
      taskTitle: 'TRID Settlement & Closing Disclosure',
      ctaText: `Consult licensed closing officers in ${propertyState}`,
    },
    final_walk_through: {
      trade: 'Title & Escrow',
      taskTitle: '24-48 Hour Pre-Closing Walk-Through Verification',
      ctaText: `Coordinate closing walk-through with title escrow in ${propertyState}`,
    },
    down_payment_wire: {
      trade: 'Title & Escrow',
      taskTitle: 'Wire Transfer Coordination & Escrow Payoff',
      ctaText: `Verify closing funds with verified escrow agents in ${propertyState}`,
    },
    deed_recordation: {
      trade: 'Title & Escrow',
      taskTitle: 'County Deed Recordation & Title Transfer',
      ctaText: `Closing coordinators in ${propertyState}`,
    },
  };

  const handleAssignStepVendor = (
    stepId: ConversationalStepId,
    vendor: { id: string; name: string; role: string }
  ) => {
    setStepAssignees((prev) => ({
      ...prev,
      [stepId]: {
        name: vendor.name,
        role: vendor.role,
        isVendor: true,
      },
    }));
    setSyncToast(`Assigned ${stepTitles[stepId]} to ${vendor.name}`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  const handleInviteExternalVendor = (invite: {
    email: string;
    companyName: string;
    trade: string;
    notes?: string;
  }) => {
    const newTodo: ProjectTodo = {
      id: `bid-req-${Date.now()}`,
      type: 'task',
      content: `[Vendor Bid Request] ${invite.companyName} (${invite.trade}) - Follow up on proposal for ${invite.email}`,
      status: 'pending',
      phase: 'purchase',
    };
    const updatedProject: ProjectWorkspace = {
      ...project,
      todos: [...(project.todos || []), newTodo],
      tasks: [
        ...(project.tasks || []),
        {
          id: `task-bid-${Date.now()}`,
          title: `Review Bid Proposal: ${invite.companyName} (${invite.trade})`,
          phase: 'purchase',
          status: 'In Progress',
          priority: 'High',
          assignee: invite.companyName,
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        } as any,
      ],
    };
    onUpdateProject(updatedProject);
    setSyncToast(`Bid invite sent to ${invite.companyName} (${invite.email})`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleDelegateStep = (taskTitle: string) => {
    if (!isTeamTier) {
      setUpgradeModalTaskTitle(taskTitle);
      setIsUpgradeModalOpen(true);
      return;
    }
    setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen);
  };

  // Keep Canonical Project State in Sync
  const syncCanonicalState = (partialFunding?: Partial<ProjectFundingTerms>) => {
    const updatedFunding: ProjectFundingTerms = {
      ...funding,
      loanAmount: capitalType === 'cash' ? 0 : loanAmount,
      interestRatePct: capitalType === 'cash' ? 0 : interestRatePct,
      amortizationYears: capitalType === 'cash' ? 0 : amortizationYears,
      lenderName: capitalType === 'cash' ? 'All-Cash / Self-Funded' : lenderName,
      loanType:
        capitalType === 'cash'
          ? '100% All-Cash'
          : capitalType === 'bridge'
          ? 'Bridge / Hard Money'
          : capitalType === 'syndication'
          ? 'Syndicated Debt & Equity'
          : 'Senior Conventional / DSCR',
      actualCashToClose: cdCashToClose,
      rateLock: {
        status: isRateLocked ? 'locked' : 'floating',
        lockedRatePct,
        lockPeriodDays: lockDaysRemaining,
      },
      downPaymentCoordination: {
        paymentMethod: paymentMethod === 'wire' ? 'wire_transfer' : 'cashiers_check',
        totalAmountDue: cdCashToClose,
        verbalConfirmationCompleted: phoneVerified,
        dispatchReferenceNumber: outgoingWireRef,
        verbalVerifiedPhone: '(512) 555-0199',
        verbalVerifiedWith: 'Sarah Jenkins',
        recipientEscrowCompany: emdHolder,
        status: phoneVerified ? 'instructions_verified' : 'awaiting_instructions',
      },
      lendingPackages,
      activeLendingPackageId: activePkgId,
      valuationVerification: {
        ...(funding.valuationVerification || {}),
        appraisedValue,
        contractPurchasePrice: purchasePrice,
        appraisalGapAmount: Math.max(0, purchasePrice - appraisedValue),
        gapResolutionStrategy:
          appraisalOutcome === 'shortfall'
            ? gapResolutionPlay === 'price_reduction'
              ? 'renegotiate_price'
              : gapResolutionPlay === 'equity_injection'
              ? 'inject_equity'
              : gapResolutionPlay === 'rov_rebuttal'
              ? 'rebuttal'
              : 'none'
            : 'none',
        physicalInspectionSignedOff: inspectionSignedOff,
        inspectionDetails: {
          inspectorCompany: inspectionCompany,
          inspectorName: inspectorName,
          licenseNumber: inspectionLicense,
          scheduledDate: inspectionScheduledDate,
          contingencyDeadline: inspectionContingencyDeadline,
          status: inspectionStatus,
          issuesCount: inspectionIssues.length,
        },
        inspectionIssues,
        totalRepairsRequested: inspectionIssues.reduce((sum, item) => sum + (item.estimatedCost || 0), 0),
        totalCreditsNegotiated: inspectionIssues.reduce(
          (sum, item) => sum + (item.sellerResponse === 'agreed' ? (item.agreedCreditAmount ?? item.estimatedCost) : 0),
          0
        ),
        repairAmendmentExecuted,
        finalWalkThrough: {
          scheduledDate: walkThroughDate,
          inspectorOrLeadName: walkThroughLead,
          status: walkThroughStatus,
          agreedRepairsVerified: repairsVerified,
          broomCleanConditionVerified: broomCleanVerified,
          utilitiesOperationalVerified: utilitiesVerified,
          noNewDamageVerified: noNewDamageVerified,
          signOffCompleted: walkThroughSignOff,
        },
      },
      legalTransfer: {
        ...(funding.legalTransfer || {}),
        deedInstrumentNumber: deedDocNumber || funding.legalTransfer?.deedInstrumentNumber,
        deedRecordingDate: deedRecordingDate || funding.legalTransfer?.deedRecordingDate,
        closingDocumentSigning: {
          mortgageNoteExecuted: closingDocsSigned,
          deedOfTrustExecuted: closingDocsSigned,
          settlementStatementExecuted: closingDocsSigned,
          titleAffidavitsExecuted: closingDocsSigned,
          signingMethod: funding.legalTransfer?.closingDocumentSigning?.signingMethod || 'remote_online_notary',
          notaryName: funding.legalTransfer?.closingDocumentSigning?.notaryName || 'Claire Patterson, Commission #FL-882190',
          signingCompletedAt: funding.legalTransfer?.closingDocumentSigning?.signingCompletedAt || new Date().toISOString(),
          allDocumentsExecuted: closingDocsSigned,
        },
        closingFeeSettlement: {
          lenderOriginationFees: funding.legalTransfer?.closingFeeSettlement?.lenderOriginationFees ?? 2940,
          titleAndSettlementFees: funding.legalTransfer?.closingFeeSettlement?.titleAndSettlementFees ?? 1850,
          escrowTaxesAndPrepaids: funding.legalTransfer?.closingFeeSettlement?.escrowTaxesAndPrepaids ?? 2450,
          governmentRecordingCharges: funding.legalTransfer?.closingFeeSettlement?.governmentRecordingCharges ?? 600,
          totalClosingFees: funding.legalTransfer?.closingFeeSettlement?.totalClosingFees ?? 7840,
          feeDisbursementStatus: closingFeesPaid ? 'settlement_reconciled' : 'pending_disbursement',
          disbursedAt: deedRecordingDate || new Date().toISOString().slice(0, 10),
          escrowDisbursementReference: funding.legalTransfer?.closingFeeSettlement?.escrowDisbursementReference || 'ESCROW-DISB-88912',
        },
        propertyPossession: {
          possessionStatus: possessionReceived ? 'keys_received' : 'pending_recording',
          keyDeliveryMethod: funding.legalTransfer?.propertyPossession?.keyDeliveryMethod || 'lockbox_code',
          lockboxCode,
          lockboxLocation,
          possessionEffectiveDate: deedRecordingDate || new Date().toISOString().slice(0, 10),
          possessionConfirmedBy: funding.legalTransfer?.propertyPossession?.possessionConfirmedBy || 'Jordan Taylor (Lead Investor)',
          rekeyCompleted,
        },
        titleSearch: {
          titleCompanyName: funding.legalTransfer?.titleSearch?.titleCompanyName || 'First American Title Insurance Co',
          titleExaminerName: funding.legalTransfer?.titleSearch?.titleExaminerName || 'Marcus Vance, Senior Title Examiner',
          searchStatus: deedSearchVerified && noUnsatisfiedLiens && noTaxOrJudgments && noOwnershipDisputes ? 'title_cleared' : 'curative_required',
          deedChainVerified: deedSearchVerified,
          noUnsatisfiedLiens,
          noTaxOrJudgmentLiens: noTaxOrJudgments,
          noOwnershipOrBoundaryDisputes: noOwnershipDisputes,
          cleanTitleCommitmentIssued: titleCommitmentReceived,
        },
        titleInsurance: {
          underwriterName: funding.legalTransfer?.titleInsurance?.underwriterName || 'First American Title Insurance Co',
          titleAgencyName: funding.legalTransfer?.titleInsurance?.titleAgencyName || 'Sunshine State Title & Escrow LLC',
          lenderPolicyCoverageAmount: loanAmount,
          lenderPolicyStatus: lenderTitleInsBound ? 'binder_issued' : 'ordered',
          ownerPolicyCoverageAmount: project.purchase_price || 392000,
          ownerPolicyStatus: ownerTitleInsBound ? 'binder_issued' : 'ordered',
          simultaneousIssueDiscount: true,
          totalTitleInsurancePremium: 1850,
          policiesBound: lenderTitleInsBound && ownerTitleInsBound,
        },
        propertyInsurance: {
          insuranceCarrier: propertyInsuranceCarrier,
          policyType: 'landlord_dp3',
          dwellingCoverageAmount: 350000,
          liabilityCoverageAmount: 1000000,
          deductibleAmount: 2500,
          annualPremium: 2150,
          status: propertyInsuranceBound ? 'bound' : 'quote_received',
          lenderLossPayeeEndorsed: lenderLossPayeeEndorsed,
          floodInsuranceRequired: false,
          floodInsuranceBound: false,
        },
      },
      ...partialFunding,
    };

    onUpdateFunding(updatedFunding);
    onUpdateProject({
      ...project,
      funding: updatedFunding,
    });

    setSyncToast('Autosaved to Executive Record');
    setTimeout(() => setSyncToast(null), 2500);
  };

  const handleNextStep = () => {
    syncCanonicalState();
    if (currentStepIndex < activeStepSequence.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setActiveVendorHelp(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setActiveVendorHelp(false);
    }
  };

  const handleFinalizeAndAdvanceToHold = async () => {
    setClosingFinalized(true);
    syncCanonicalState({ fundingStatus: 'Closed & Funded' });

    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPhase: 'hold',
          phase: 'hold',
          status: 'Hold & Operations',
        }),
      });

      onUpdateProject({
        ...project,
        currentPhase: 'hold',
        phase: 'hold',
        status: 'Hold & Operations',
      });
    } catch {
      // Non-fatal optimistic update
    }
  };

  const progressPct = Math.round(((currentStepIndex + 1) / activeStepSequence.length) * 100);

  return (
    <div
      data-testid="fund-conversational-engine"
      className="w-full max-w-[840px] mx-auto space-y-6 text-neutral-100 font-sans px-2 sm:px-4"
    >
      {/* Top Quiet Stage Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-none bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            {currentStepIndex + 1}
          </span>
          <div className="text-xs">
            <span className="text-neutral-400">{`Step ${currentStepIndex + 1} of ${activeStepSequence.length}:`}</span>{' '}
            <strong className="text-white font-semibold">{stepTitles[currentStepId]}</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {syncToast && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-[14px]">check</span>
              {syncToast}
            </span>
          )}
          <button
            type="button"
            onClick={onSwitchToExecutiveView}
            className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1 min-h-[44px] px-2"
            data-testid="switch-to-executive-from-conversational"
          >
            <span>Executive Workspace</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Fluid Milestone Progress Bar */}
      <div className="w-full h-1 bg-neutral-900 overflow-hidden border border-neutral-800/80">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main Single-Decision Card Stage */}
      <div className="rounded-none border border-neutral-800 bg-[#0a0a0a] p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Step Ownership & Delegation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium">Assigned To:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none border border-neutral-700 bg-neutral-900 text-neutral-200 font-medium">
              <span className="material-symbols-outlined text-[14px]">
                {stepAssignees[currentStepId]?.isVendor ? 'storefront' : 'person'}
              </span>
              <span>{stepAssignees[currentStepId]?.name || 'You (Lead Investor)'}</span>
              <span className="text-[10px] text-neutral-400 font-mono">
                ({stepAssignees[currentStepId]?.role || 'Principal'})
              </span>
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => handleDelegateStep(stepTitles[currentStepId])}
              data-testid="delegate-step-btn"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-3 py-1.5 rounded-none border border-neutral-700 bg-neutral-900 min-h-[44px] transition"
            >
              <span className="material-symbols-outlined text-[15px]">group_add</span>
              <span>Delegate Step</span>
            </button>

            {/* Team Tier Inline Assignee Dropdown (when tier is valid) */}
            {isAssigneeDropdownOpen && isTeamTier && (
              <div
                data-testid="team-assignee-dropdown"
                className="absolute right-0 top-full mt-1.5 z-20 w-64 rounded-none border border-neutral-700 bg-neutral-950 p-2 shadow-xl space-y-1"
              >
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800">
                  Assign to Team Member
                </div>
                {(activeRoster || []).map((m: any) => (
                  <button
                    key={m.uid || m.id || m.name}
                    type="button"
                    onClick={() => {
                      setStepAssignees((prev) => ({
                        ...prev,
                        [currentStepId]: {
                          name: m.name,
                          role: m.role || 'Team Member',
                        },
                      }));
                      setIsAssigneeDropdownOpen(false);
                      setSyncToast(`Assigned ${stepTitles[currentStepId]} to ${m.name}`);
                      setTimeout(() => setSyncToast(null), 2500);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded-none flex items-center justify-between min-h-[36px]"
                  >
                    <span>{m.name}</span>
                    <span className="text-[10px] text-neutral-400">{m.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SCREEN 1: CAPITAL STRUCTURE SELECTION                    */}
        {/* ======================================================== */}
        {currentStepId === 'capital_structure' && (
          <div className="space-y-6" data-testid="screen-capital-structure">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Pillar 01 · Capital Assembly
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                How are you assembling the capital to purchase this property?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Your financing method customizes the exact due diligence requirements, underwriting conditions, and closing steps for this deal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                {
                  id: 'senior_debt',
                  title: 'Conventional / DSCR Mortgage',
                  desc: 'Long-term bank or agency debt with full underwriting and appraisal requirements.',
                  badge: 'Standard Debt',
                },
                {
                  id: 'bridge',
                  title: 'Bridge / Hard Money Loan',
                  desc: 'Asset-based short-term debt focused on rapid acquisition and value-add rehab funding.',
                  badge: 'Fast Closing',
                },
                {
                  id: 'cash',
                  title: '100% All-Cash Purchase',
                  desc: 'Self-funded or private equity capital with zero senior debt covenants or lender contingencies.',
                  badge: 'No Debt Covenants',
                },
                {
                  id: 'syndication',
                  title: 'Syndication / Joint Venture',
                  desc: 'Pooled LP investor equity paired with senior mortgage or private mezzanine debt.',
                  badge: 'GP / LP Capital',
                },
              ].map((opt) => {
                const isSelected = capitalType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCapitalType(opt.id as any);
                      syncCanonicalState({
                        loanType: opt.title,
                        loanAmount: opt.id === 'cash' ? 0 : loanAmount,
                      });
                    }}
                    data-testid={`choice-capital-${opt.id}`}
                    className={`flex flex-col text-left p-4 rounded-none border transition min-h-[96px] ${
                      isSelected
                        ? 'border-white bg-neutral-900/90 ring-1 ring-white'
                        : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-sm text-white">{opt.title}</span>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-none border border-neutral-700 bg-neutral-800 text-neutral-300">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-400 leading-normal">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {capitalType === 'cash' && (
              <div className="p-3.5 border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>
                  <strong>Adaptive Branching Active:</strong> All-Cash selected. Lender applications, rate lock, and loan disclosures will be automatically skipped.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 2: LENDER & LENDING PACKAGE BUILDER               */}
        {/* ======================================================== */}
        {currentStepId === 'lender_package' && (
          <div className="space-y-6" data-testid="screen-lender-package">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Debt Capital & Underwriting
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Which lending institution is providing your debt facility?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Lenders require a comprehensive borrower underwriting file. PaperWorking automatically compiles your PFS, tax returns, operating bank statements, and pro-forma into bank-ready packages.
              </p>
            </div>

            {/* Multiple Lending Packages Switcher Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider mr-1">
                  Lending Packages:
                </span>
                {lendingPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setActivePkgId(pkg.id);
                      setLenderName(pkg.targetLender);
                      setLoanAmount(pkg.requestedAmount);
                    }}
                    data-testid={`select-lending-pkg-${pkg.id}`}
                    className={`px-3 py-1 text-xs rounded-none border transition min-h-[36px] flex items-center gap-2 ${
                      activePkgId === pkg.id
                        ? 'border-white bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>{pkg.name}</span>
                    <span
                      className={`text-[9px] uppercase font-mono px-1 py-0.2 rounded-none ${
                        pkg.status === 'submitted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {pkg.status}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsNewPkgModalOpen(!isNewPkgModalOpen)}
                data-testid="btn-create-new-lending-pkg"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 min-h-[36px]"
              >
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                <span>+ Create Another Lending Package</span>
              </button>
            </div>

            {/* Create New Lending Package Inline Form */}
            {isNewPkgModalOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPkgName || !newPkgLender) return;
                  const newPkg: LendingPackage = {
                    id: `pkg-${Date.now()}`,
                    name: newPkgName,
                    targetLender: newPkgLender,
                    loanType: newPkgLoanType,
                    requestedAmount: newPkgAmount,
                    status: 'ready',
                    documents: activePackage.documents.map((d) => ({ ...d })),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  const updatedList = [...lendingPackages, newPkg];
                  setLendingPackages(updatedList);
                  setActivePkgId(newPkg.id);
                  setLenderName(newPkg.targetLender);
                  setLoanAmount(newPkg.requestedAmount);
                  setIsNewPkgModalOpen(false);
                  setNewPkgName('');
                  setNewPkgLender('');
                  syncCanonicalState({
                    lendingPackages: updatedList,
                    activeLendingPackageId: newPkg.id,
                  });
                }}
                data-testid="form-new-lending-package"
                className="p-4 border border-neutral-700 bg-neutral-900/60 space-y-3 rounded-none"
              >
                <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Create Additional Lending Package (Secondary Bank / Mezzanine)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsNewPkgModalOpen(false)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1 text-xs">Package Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Austin Credit Union First Lien"
                      value={newPkgName}
                      onChange={(e) => setNewPkgName(e.target.value)}
                      className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                      data-testid="input-new-pkg-name"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1 text-xs">Target Lender / Bank</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Frost Bank Commercial"
                      value={newPkgLender}
                      onChange={(e) => setNewPkgLender(e.target.value)}
                      className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                      data-testid="input-new-pkg-lender"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1 text-xs">Loan Type</label>
                    <select
                      value={newPkgLoanType}
                      onChange={(e) => setNewPkgLoanType(e.target.value)}
                      className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                      data-testid="select-new-pkg-loantype"
                    >
                      <option value="Senior Commercial Debt">Senior Commercial First Lien</option>
                      <option value="Bridge Loan">Bridge / Hard Money</option>
                      <option value="DSCR Mortgage">DSCR Rental Mortgage</option>
                      <option value="Mezzanine Debt">Mezzanine / Second Lien</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1 text-xs">Requested Loan Amount ($)</label>
                    <input
                      type="number"
                      required
                      value={newPkgAmount}
                      onChange={(e) => setNewPkgAmount(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                      data-testid="input-new-pkg-amount"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="rounded-none min-h-[44px] px-4 text-xs font-semibold"
                    data-testid="btn-submit-create-lending-pkg"
                  >
                    Save & Add Package
                  </Button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Primary Lender / Financial Institution
                </label>
                <input
                  type="text"
                  required
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="e.g. Apex Commercial Capital"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conversational-lender-name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Requested Facility Loan Amount ($)
                </label>
                <input
                  type="number"
                  required
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                  data-testid="input-conversational-loan-amount"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  {`Purchase Price: ${formatCurrency(purchasePrice)} · ${(
                    (loanAmount / purchasePrice) *
                    100
                  ).toFixed(1)}% LTV`}
                </span>
              </div>
            </div>

            {/* Document Bundle Checklist with Toggle & Submit */}
            <div className="border border-neutral-800 bg-neutral-950 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                    {activePackage.name}: Document Checklist
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Select all verified financial and entity records to include in the submission bundle.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">
                  {activePackage.documents.filter((d) => d.isIncluded).length} of {activePackage.documents.length} Files Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-neutral-200">
                {activePackage.documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2.5 p-2 rounded-none border border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={doc.isIncluded}
                      onChange={(e) => {
                        const updatedDocs = activePackage.documents.map((d) =>
                          d.id === doc.id ? { ...d, isIncluded: e.target.checked } : d
                        );
                        const updatedPkgs = lendingPackages.map((p) =>
                          p.id === activePackage.id ? { ...p, documents: updatedDocs } : p
                        );
                        setLendingPackages(updatedPkgs);
                        syncCanonicalState({ lendingPackages: updatedPkgs });
                      }}
                      className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs">{doc.title}</span>
                  </label>
                ))}
              </div>

              {/* Finalize Loan Application Button */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {applicationSubmittedMsg ? (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium" data-testid="loan-app-submitted-notice">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>{applicationSubmittedMsg}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-neutral-400">
                    Submit all updated financial records directly to {activePackage.targetLender || lenderName}.
                  </span>
                )}

                <Button
                  type="button"
                  variant={activePackage.status === 'submitted' ? 'secondary' : 'primary'}
                  size="sm"
                  className="rounded-none min-h-[44px] px-4 text-xs font-bold"
                  onClick={() => {
                    const updatedPkgs = lendingPackages.map((p) =>
                      p.id === activePackage.id
                        ? { ...p, status: 'submitted' as const, submissionDate: new Date().toISOString() }
                        : p
                    );
                    setLendingPackages(updatedPkgs);
                    setApplicationSubmittedMsg(
                      `Loan application and ${
                        activePackage.documents.filter((d) => d.isIncluded).length
                      } documents submitted to ${activePackage.targetLender}.`
                    );
                    syncCanonicalState({
                      lendingPackages: updatedPkgs,
                      fundingStatus: 'Underwriting Review',
                    });
                  }}
                  data-testid="btn-finalize-loan-application"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1.5">send</span>
                  {activePackage.status === 'submitted'
                    ? 'Re-submit Application & Documents'
                    : 'Finalize Loan Application & Submit to Lender'}
                </Button>
              </div>
            </div>

            {/* Contextual Marketplace Vendor Assistance */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActiveVendorHelp(!activeVendorHelp)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 min-h-[44px]"
                data-testid="toggle-lender-marketplace-help"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>{`Need a competitive debt quote in ${propertyState}? View Subscribed Lenders`}</span>
              </button>

              {activeVendorHelp && (
                <div className="mt-2">
                  <VendorMarketplaceSuggestions
                    taskTitle="Secure Debt Term Sheet"
                    requiredTrade="Lender"
                    propertyState={propertyState}
                    onAssignVendor={(v) => {
                      setLenderName(v.name);
                      handleAssignStepVendor('lender_package', v);
                      setActiveVendorHelp(false);
                    }}
                    onInviteVendorToBid={(invite) => handleInviteExternalVendor(invite)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 3: INTEREST RATE LOCK DECISION                    */}
        {/* ======================================================== */}
        {currentStepId === 'rate_lock' && (
          <div className="space-y-6" data-testid="screen-rate-lock">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Mortgage Hedging & Debt Service
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Have you locked your interest rate with the lender?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Floating interest rates expose your debt service and cash-on-cash return to bond market volatility before closing. Locking the rate freezes your financing costs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsRateLocked(true)}
                data-testid="choice-rate-locked"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  isRateLocked
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">Yes, Rate is Locked</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Rate freeze confirmed with lender. Track expiration countdown.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsRateLocked(false)}
                data-testid="choice-rate-floating"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  !isRateLocked
                    ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">No, Currently Floating</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Rate fluctuates with market. Alert me before closing deadline.
                </p>
              </button>
            </div>

            {isRateLocked ? (
              <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Confirmed Rate Lock Parameters
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Locked Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={lockedRatePct}
                      onChange={(e) => setLockedRatePct(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                      data-testid="input-conversational-locked-rate"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Rate Lock Period (Days)
                    </label>
                    <input
                      type="number"
                      value={lockDaysRemaining}
                      onChange={(e) => setLockDaysRemaining(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                      data-testid="input-conversational-lock-days"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>
                  Floating rate active at {interestRatePct}%. We will issue a mandatory warning 14 days prior to settlement if rates spike.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 4: EARNEST MONEY DEPOSIT                          */}
        {/* ======================================================== */}
        {currentStepId === 'earnest_money' && (
          <div className="space-y-6" data-testid="screen-earnest-money">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Escrow & Contractual Safeguards
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Has your earnest money deposit been wired to escrow?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Missing the initial earnest money deposit (EMD) deadline is a material breach of contract that allows the seller to terminate immediately and accept backup offers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Earnest Money Deposit Amount ($)
                </label>
                <input
                  type="number"
                  value={emdAmount}
                  onChange={(e) => setEmdAmount(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                  data-testid="input-conversational-emd-amount"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Escrow Holder / Title Company
                </label>
                <input
                  type="text"
                  value={emdHolder}
                  onChange={(e) => setEmdHolder(e.target.value)}
                  placeholder="e.g. First National Title & Settlement"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conversational-emd-holder"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border border-neutral-800 bg-neutral-950">
              <input
                type="checkbox"
                id="emd-receipt-checkbox"
                checked={emdReceiptConfirmed}
                onChange={(e) => setEmdReceiptConfirmed(e.target.checked)}
                className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                data-testid="checkbox-emd-receipt"
              />
              <label htmlFor="emd-receipt-checkbox" className="text-xs text-neutral-200 cursor-pointer">
                <strong>Escrow Receipt Formally Confirmed:</strong> Title company has confirmed receipt of funds into escrow trust account.
              </label>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN: PROPERTY INSPECTION & PHYSICAL HEALTH            */}
        {/* ======================================================== */}
        {currentStepId === 'property_inspection' && (
          <div className="space-y-6" data-testid="screen-property-inspection">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Pillar 02 · Physical Due Diligence
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Have you scheduled and completed your licensed property inspection?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                A licensed inspection verifies foundation stability, roof condition, HVAC compressors, plumbing lines, and electrical safety before contract contingency dates expire.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInspectionStatus('completed')}
                data-testid="choice-inspection-completed"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  inspectionStatus === 'completed'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">Inspection Completed &amp; Report Received</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Full physical diligence executed. Ready to evaluate repair items or clearance.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInspectionStatus('scheduled')}
                data-testid="choice-inspection-scheduled"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  inspectionStatus === 'scheduled'
                    ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">Inspection Scheduled (Pending Field Report)</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Inspector dispatched. Tracking contingency deadline countdown.
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Inspection Firm
                </label>
                <input
                  type="text"
                  value={inspectionCompany}
                  onChange={(e) => setInspectionCompany(e.target.value)}
                  placeholder="e.g. Precision Commercial Inspections"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conversational-inspector-firm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Licensed Inspector &amp; License #
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="Inspector name"
                    className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                    data-testid="input-conversational-inspector-name"
                  />
                  <input
                    type="text"
                    value={inspectionLicense}
                    onChange={(e) => setInspectionLicense(e.target.value)}
                    placeholder="License #"
                    className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                    data-testid="input-conversational-license-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Scheduled Date &amp; Contingency Deadline
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={inspectionScheduledDate}
                    onChange={(e) => setInspectionScheduledDate(e.target.value)}
                    className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                    data-testid="input-conversational-inspection-date"
                  />
                  <input
                    type="date"
                    value={inspectionContingencyDeadline}
                    onChange={(e) => setInspectionContingencyDeadline(e.target.value)}
                    className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-2 py-1 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                    data-testid="input-conversational-contingency-deadline"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border border-neutral-800 bg-neutral-950">
              <input
                type="checkbox"
                id="conv-inspection-cleared-check"
                checked={inspectionSignedOff}
                onChange={(e) => setInspectionSignedOff(e.target.checked)}
                className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                data-testid="checkbox-conversational-inspection-cleared"
              />
              <label htmlFor="conv-inspection-cleared-check" className="text-xs text-neutral-200 cursor-pointer">
                <strong>Physical &amp; Structural Inspection Cleared:</strong> Due diligence findings reviewed. No material adverse unresolvable defects.
              </label>
            </div>

            {/* Contextual Marketplace Assistance */}
            <div>
              <button
                type="button"
                onClick={() => setActiveVendorHelp(!activeVendorHelp)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 min-h-[44px]"
                data-testid="toggle-inspector-marketplace-help"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>{`Need a licensed home or commercial inspector in ${propertyState}? View Marketplace`}</span>
              </button>

              {activeVendorHelp && (
                <div className="mt-2">
                  <VendorMarketplaceSuggestions
                    taskTitle="Licensed Property Inspection"
                    requiredTrade="Home Inspector"
                    propertyState={propertyState}
                    onAssignVendor={(v) => {
                      setInspectionCompany(v.name);
                      handleAssignStepVendor('property_inspection', v);
                      setActiveVendorHelp(false);
                    }}
                    onInviteVendorToBid={(invite) => handleInviteExternalVendor(invite)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN: REPAIR & CREDIT NEGOTIATION                      */}
        {/* ======================================================== */}
        {currentStepId === 'repair_negotiation' && (
          <div className="space-y-6" data-testid="screen-repair-negotiation">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Contractual Remedy &amp; Defect Resolution
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Are you requesting seller repairs or closing credits based on inspection findings?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Negotiate with the seller for contractual credits or price reductions to cover discovered defects without endangering the acquisition schedule.
              </p>
            </div>

            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border border-neutral-800 bg-neutral-950 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Total Defects Discovered</span>
                <p className="text-sm font-bold text-neutral-200 mt-1 font-mono">
                  {inspectionIssues.length} items ({formatCurrency(inspectionIssues.reduce((sum, item) => sum + (item.estimatedCost || 0), 0))})
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Agreed Seller Credits</span>
                <p className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                  {formatCurrency(
                    inspectionIssues.reduce(
                      (sum, item) => sum + (item.sellerResponse === 'agreed' ? (item.agreedCreditAmount ?? item.estimatedCost) : 0),
                      0
                    )
                  )}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Cash-to-Close Adjustment</span>
                <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Reduces Cash Required by {formatCurrency(
                    inspectionIssues.reduce(
                      (sum, item) => sum + (item.sellerResponse === 'agreed' && item.requestedResolution === 'closing_credit' ? (item.agreedCreditAmount ?? item.estimatedCost) : 0),
                      0
                    )
                  )}
                </p>
              </div>
            </div>

            {/* Interactive Defect Ledger */}
            <div className="space-y-3 border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Inspection Issues Ledger ({inspectionIssues.length})
                </span>
                <Button
                  type="button"
                  data-testid="btn-toggle-add-issue-conv"
                  onClick={() => setShowConvAddIssue(!showConvAddIssue)}
                  className="h-8 rounded-none px-3 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">add</span>
                  Add Defect
                </Button>
              </div>

              {/* Form to add new issue */}
              {showConvAddIssue && (
                <div className="p-3 border border-neutral-700 bg-neutral-900/60 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <select
                      value={convIssueCat}
                      onChange={(e) => setConvIssueCat(e.target.value as any)}
                      className="min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-white"
                    >
                      <option value="mep">Mechanical / HVAC</option>
                      <option value="roof">Roof &amp; Attic</option>
                      <option value="structural">Foundation &amp; Structural</option>
                      <option value="plumbing">Plumbing &amp; Sewer</option>
                      <option value="electrical">Electrical Panel</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Defect description"
                      value={convIssueDesc}
                      onChange={(e) => setConvIssueDesc(e.target.value)}
                      className="sm:col-span-2 min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs"
                      data-testid="input-conv-defect-desc"
                    />
                    <input
                      type="number"
                      placeholder="Est. Cost ($)"
                      value={convIssueCost === 0 ? '' : convIssueCost}
                      onChange={(e) => setConvIssueCost(parseFloat(e.target.value) || 0)}
                      className="min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs font-mono"
                      data-testid="input-conv-defect-cost"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Resolution:</span>
                      <select
                        value={convIssueRes}
                        onChange={(e) => setConvIssueRes(e.target.value as any)}
                        className="rounded-none border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-white min-h-[36px]"
                        data-testid="select-conv-defect-res"
                      >
                        <option value="closing_credit">Seller Closing Credit</option>
                        <option value="price_reduction">Contract Price Reduction</option>
                        <option value="seller_repair">Seller Repair Prior to Closing</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowConvAddIssue(false)}
                        className="h-8 rounded-none px-3 text-xs bg-neutral-800 text-neutral-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        data-testid="btn-save-defect-conv"
                        onClick={() => {
                          if (!convIssueDesc.trim()) return;
                          const newItem: PropertyInspectionIssue = {
                            id: `issue-${Date.now()}`,
                            category: convIssueCat,
                            description: convIssueDesc.trim(),
                            estimatedCost: convIssueCost,
                            requestedResolution: convIssueRes,
                            sellerResponse: 'pending',
                            agreedCreditAmount: 0,
                            repairStatus: 'pending',
                          };
                          setInspectionIssues((prev) => [...prev, newItem]);
                          setConvIssueDesc('');
                          setConvIssueCost(0);
                          setShowConvAddIssue(false);
                        }}
                        className="h-8 rounded-none px-3 text-xs bg-neutral-100 text-neutral-900 font-semibold"
                      >
                        Save Defect
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* List of items */}
              <div className="space-y-2">
                {inspectionIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-neutral-800 bg-neutral-900/40 text-xs"
                    data-testid={`conv-issue-row-${issue.id}`}
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 text-[10px] font-mono uppercase">
                          {issue.category}
                        </span>
                        <span className="font-semibold text-neutral-200">{issue.description}</span>
                      </div>
                      <div className="text-neutral-400 text-[11px] flex items-center gap-3">
                        <span>Est: <strong className="text-neutral-200">{formatCurrency(issue.estimatedCost)}</strong></span>
                        <span>Resolution: <strong className="text-neutral-300">{issue.requestedResolution.replace('_', ' ')}</strong></span>
                        {issue.sellerResponse === 'agreed' && (
                          <span className="text-emerald-400 font-bold">
                            Credit: {formatCurrency(issue.agreedCreditAmount ?? issue.estimatedCost)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Seller response for ${issue.description}`}
                        value={issue.sellerResponse}
                        onChange={(e) => {
                          const res = e.target.value as PropertyInspectionIssue['sellerResponse'];
                          setInspectionIssues((prev) =>
                            prev.map((item) =>
                              item.id === issue.id
                                ? {
                                    ...item,
                                    sellerResponse: res,
                                    agreedCreditAmount: res === 'agreed' ? item.estimatedCost : 0,
                                  }
                                : item
                            )
                          );
                        }}
                        className="rounded-none border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-white min-h-[36px]"
                      >
                        <option value="pending">Pending Seller</option>
                        <option value="agreed">Seller Agreed</option>
                        <option value="countered">Seller Countered</option>
                        <option value="rejected">Seller Rejected</option>
                      </select>

                      <button
                        type="button"
                        aria-label={`Remove defect ${issue.description}`}
                        onClick={() => setInspectionIssues((prev) => prev.filter((i) => i.id !== issue.id))}
                        className="p-1.5 text-neutral-500 hover:text-red-400"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repair Amendment Executed Gate */}
            <div className="flex items-center gap-3 p-4 border border-neutral-800 bg-neutral-950">
              <input
                type="checkbox"
                id="conv-repair-amendment-check"
                checked={repairAmendmentExecuted}
                onChange={(e) => setRepairAmendmentExecuted(e.target.checked)}
                className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                data-testid="checkbox-conv-repair-amendment"
              />
              <label htmlFor="conv-repair-amendment-check" className="text-xs text-neutral-200 cursor-pointer">
                <strong>Repair Addendum Formally Executed:</strong> Seller and buyer have countersigned the repair credit addendum. Transmitted to escrow for settlement ledger adjustment.
              </label>
            </div>

            {/* Contextual Marketplace Assistance */}
            <div>
              <button
                type="button"
                onClick={() => setActiveVendorHelp(!activeVendorHelp)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 min-h-[44px]"
                data-testid="toggle-contractor-marketplace-help"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>{`Need licensed contractors for repair estimates in ${propertyState}? View Marketplace`}</span>
              </button>

              {activeVendorHelp && (
                <div className="mt-2">
                  <VendorMarketplaceSuggestions
                    taskTitle="Repair Cost Estimates"
                    requiredTrade="General Contractor"
                    propertyState={propertyState}
                    onAssignVendor={(v) => {
                      handleAssignStepVendor('repair_negotiation', v);
                      setActiveVendorHelp(false);
                    }}
                    onInviteVendorToBid={(invite) => handleInviteExternalVendor(invite)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 5: APPRAISAL & CONDITION VERIFICATION             */}
        {/* ======================================================== */}
        {currentStepId === 'appraisal_valuation' && (
          <div className="space-y-6" data-testid="screen-appraisal-valuation">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Pillar 02 · Valuation & Due Diligence
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Did the commercial appraisal meet or exceed the contract purchase price?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Lenders strictly size loans on the lesser of purchase price or appraised value. An appraisal shortfall creates an equity deficit that must be resolved before closing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAppraisalOutcome('met');
                  setAppraisedValue(purchasePrice);
                }}
                data-testid="choice-appraisal-met"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  appraisalOutcome === 'met'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">Met or Exceeded Purchase Price</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Value confirmed at or above contract. Loan covenants satisfied.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAppraisalOutcome('shortfall');
                  setAppraisedValue(purchasePrice - 25000);
                }}
                data-testid="choice-appraisal-shortfall"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  appraisalOutcome === 'shortfall'
                    ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">Appraisal Shortfall (Value Came in Lower)</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Value lower than contract price. Requires resolution play.
                </p>
              </button>
            </div>

            {appraisalOutcome === 'shortfall' ? (
              <div className="p-4 border border-rose-500/30 bg-rose-500/5 space-y-4 rounded-none">
                <div className="flex items-center justify-between text-xs text-rose-300 border-b border-rose-500/20 pb-2">
                  <span className="font-bold uppercase tracking-wider">Appraisal Gap Resolution Engine</span>
                  <span className="font-mono">Shortfall: {formatCurrency(purchasePrice - appraisedValue)}</span>
                </div>

                <p className="text-xs text-neutral-300">
                  Choose your institutional resolution strategy before the appraisal contingency expires:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    {
                      id: 'price_reduction',
                      title: '1. Request Seller Price Reduction',
                      desc: 'Demand seller reduce price to appraised value via amendment.',
                    },
                    {
                      id: 'equity_injection',
                      title: '2. Inject Additional Cash Equity',
                      desc: 'Cover gap with borrower equity to preserve senior loan terms.',
                    },
                    {
                      id: 'rov_rebuttal',
                      title: '3. Submit Formal ROV Rebuttal',
                      desc: 'Submit comparable sales packet to challenge appraiser valuation.',
                    },
                    {
                      id: 'terminate',
                      title: '4. Exercise Contingency & Terminate',
                      desc: 'Terminate agreement and demand full return of earnest money deposit.',
                    },
                  ].map((play) => (
                    <button
                      key={play.id}
                      type="button"
                      onClick={() => setGapResolutionPlay(play.id as any)}
                      data-testid={`choice-gap-play-${play.id}`}
                      className={`text-left p-3 rounded-none border transition ${
                        gapResolutionPlay === play.id
                          ? 'border-white bg-neutral-900 text-white font-semibold'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <p className="font-bold text-white text-xs">{play.title}</p>
                      <p className="text-[11px] text-neutral-400 mt-1">{play.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>
                  Appraisal satisfies senior loan underwriting at {formatCurrency(appraisedValue)}. Contingency cleared.
                </span>
              </div>
            )}

            {/* Contextual Appraiser Marketplace Assistance */}
            <div>
              <button
                type="button"
                onClick={() => setActiveVendorHelp(!activeVendorHelp)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 min-h-[44px]"
                data-testid="toggle-appraiser-marketplace-help"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>{`Need a licensed commercial appraiser in ${propertyState}? View Marketplace`}</span>
              </button>

              {activeVendorHelp && (
                <div className="mt-2">
                  <VendorMarketplaceSuggestions
                    taskTitle="Commercial Narrative Appraisal"
                    requiredTrade="Appraiser"
                    propertyState={propertyState}
                    onAssignVendor={(v) => {
                      handleAssignStepVendor('appraisal_valuation', v);
                      setActiveVendorHelp(false);
                    }}
                    onInviteVendorToBid={(invite) => handleInviteExternalVendor(invite)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 6: TITLE & LEGAL PROTECTION                       */}
        {/* ======================================================== */}
        {currentStepId === 'title_clearance' && (
          <div className="space-y-6" data-testid="screen-title-clearance">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Pillar 03 · Legal Ownership Transfer
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Have you cleared title, bound dual title insurance, and secured property insurance?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Lenders require verified title examination, dual title insurance policies, and an active property insurance binder with mortgagee endorsement before funding.
              </p>
            </div>

            {/* Sub-Stage 1: Clear Property Title */}
            <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-3 rounded-none" data-testid="conversational-title-clearance-block">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Clear Property Title (Deed Search &amp; Lien Clearance)
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  Deed Examination
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Title company deed search ensures no prior unreleased mortgages, contractor claims, tax warrants, or ownership disputes cloud the asset.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-start gap-2.5 p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deedSearchVerified}
                    onChange={(e) => {
                      setDeedSearchVerified(e.target.checked);
                      syncCanonicalState();
                    }}
                    className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    data-testid="checkbox-conv-deed-search"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-neutral-200">
                      30-Year Deed Search Verified
                    </span>
                    <p className="text-[10px] text-neutral-400">
                      Unbroken chain of title with zero breaks or probate gaps.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noUnsatisfiedLiens}
                    onChange={(e) => {
                      setNoUnsatisfiedLiens(e.target.checked);
                      syncCanonicalState();
                    }}
                    className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    data-testid="checkbox-conv-no-liens"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-neutral-200">
                      Zero Unsatisfied Liens
                    </span>
                    <p className="text-[10px] text-neutral-400">
                      No open prior mortgages or contractor mechanics liens.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noTaxOrJudgments}
                    onChange={(e) => {
                      setNoTaxOrJudgments(e.target.checked);
                      syncCanonicalState();
                    }}
                    className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    data-testid="checkbox-conv-no-judgments"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-neutral-200">
                      Zero Tax &amp; Civil Judgments
                    </span>
                    <p className="text-[10px] text-neutral-400">
                      No federal IRS tax warrants or civil court attachments.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noOwnershipDisputes}
                    onChange={(e) => {
                      setNoOwnershipDisputes(e.target.checked);
                      syncCanonicalState();
                    }}
                    className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    data-testid="checkbox-conv-no-disputes"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-neutral-200">
                      Zero Boundary or Title Disputes
                    </span>
                    <p className="text-[10px] text-neutral-400">
                      No lis pendens litigation or boundary line disputes.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Sub-Stage 2: Purchase Title Insurance */}
            <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-3 rounded-none" data-testid="conversational-title-insurance-block">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  2. Purchase Title Insurance (Dual Policy Protection)
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  Lender &amp; Owner Coverage
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Acquire both lender&apos;s and owner&apos;s title insurance policies to protect against future ownership claims and unrecorded title defects.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-start gap-2.5 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700">
                  <input
                    type="checkbox"
                    checked={lenderTitleInsBound}
                    onChange={(e) => {
                      setLenderTitleInsBound(e.target.checked);
                      syncCanonicalState();
                    }}
                    className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    data-testid="checkbox-conv-lender-title"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        Lender&apos;s Title Policy Bound
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {formatCurrency(loanAmount)}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Protects senior debt up to the outstanding mortgage loan balance.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700">
                  <input
                    type="checkbox"
                    checked={ownerTitleInsBound}
                    onChange={(e) => {
                      setOwnerTitleInsBound(e.target.checked);
                      syncCanonicalState();
                    }}
                    className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    data-testid="checkbox-conv-owner-title"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        Owner&apos;s Title Policy Bound
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {formatCurrency(project.purchase_price || 392000)}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Protects 100% of investor purchase equity for the full ownership horizon.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Sub-Stage 3: Secure Property Insurance */}
            <div className="p-4 border border-neutral-800 bg-neutral-950 space-y-3 rounded-none" data-testid="conversational-property-insurance-block">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  3. Secure Property Insurance (Hazard &amp; Landlord Binder)
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  Pre-Funding Mandate
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Bind a landlord or homeowners insurance policy with the mortgagee clause, which lenders require prior to funding.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Insurance Carrier / Agency
                  </label>
                  <input
                    type="text"
                    value={propertyInsuranceCarrier}
                    onChange={(e) => setPropertyInsuranceCarrier(e.target.value)}
                    placeholder="e.g. Steadily / Travelers"
                    className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                    data-testid="input-conversational-insurance-carrier"
                  />
                </div>

                <div className="space-y-2 pt-2 sm:pt-0">
                  <label className="flex items-start gap-2.5 p-2 bg-neutral-900/60 border border-neutral-800 rounded-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propertyInsuranceBound}
                      onChange={(e) => {
                        setPropertyInsuranceBound(e.target.checked);
                        syncCanonicalState();
                      }}
                      className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                      data-testid="checkbox-conversational-property-insurance-bound"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-neutral-200">
                        Hazard / Landlord Policy Bound
                      </span>
                      <p className="text-[10px] text-neutral-400">
                        Dwelling replacement cost and general liability bound.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 bg-neutral-900/80 border border-amber-800/60 rounded-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={lenderLossPayeeEndorsed}
                  onChange={(e) => {
                    setLenderLossPayeeEndorsed(e.target.checked);
                    syncCanonicalState();
                  }}
                  className="mt-0.5 h-4 w-4 rounded-none border-amber-700 bg-neutral-950 text-neutral-100 accent-amber-400 cursor-pointer"
                  data-testid="checkbox-conversational-lender-loss-payee"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-amber-200">
                    Lender Loss Payee &amp; Mortgagee Clause Endorsement Verified
                  </span>
                  <p className="text-[11px] text-neutral-300">
                    Mandatory condition precedent for loan funding: Lender named as First Mortgagee on binder.
                  </p>
                </div>
              </label>
            </div>

            {/* Vesting Entity & Curative Matrix */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Purchasing Legal Vesting Entity Legal Name
                </label>
                <input
                  type="text"
                  value={vestingEntityName}
                  onChange={(e) => setVestingEntityName(e.target.value)}
                  placeholder="e.g. 1247 Elm Street Capital LLC"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conversational-vesting-entity"
                />
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: 'title-cleared',
                    label: 'Preliminary Title Commitment Reviewed & Approved',
                    checked: titleCommitmentReceived,
                    toggle: () => setTitleCommitmentReceived(!titleCommitmentReceived),
                  },
                  {
                    id: 'schedule-b-cleared',
                    label: 'Schedule B Curative Requirements Cleared (Mortgage Payoffs & Tax Certs)',
                    checked: scheduleBCleared,
                    toggle: () => setScheduleBCleared(!scheduleBCleared),
                  },
                  {
                    id: 'survey-cleared',
                    label: 'ALTA Land Title Survey Clean (No Boundary Encroachments)',
                    checked: surveyClean,
                    toggle: () => setSurveyClean(!surveyClean),
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 border border-neutral-800 bg-neutral-950 rounded-none"
                  >
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={item.checked}
                      onChange={item.toggle}
                      className="h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 cursor-pointer"
                      data-testid={`checkbox-${item.id}`}
                    />
                    <label htmlFor={item.id} className="text-xs text-neutral-200 cursor-pointer">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Contextual Title & Insurance Marketplace Assistance */}
            <div>
              <button
                type="button"
                onClick={() => setActiveVendorHelp(!activeVendorHelp)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 min-h-[44px]"
                data-testid="toggle-title-marketplace-help"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>{`Need a title company or insurance broker in ${propertyState}? View Marketplace`}</span>
              </button>

              {activeVendorHelp && (
                <div className="mt-2">
                  <VendorMarketplaceSuggestions
                    taskTitle="Title Commitment & Schedule B Clearance"
                    requiredTrade="Title & Escrow"
                    propertyState={propertyState}
                    onAssignVendor={(v) => {
                      handleAssignStepVendor('title_clearance', v);
                      setActiveVendorHelp(false);
                    }}
                    onInviteVendorToBid={(invite) => handleInviteExternalVendor(invite)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 7: CLOSING DISCLOSURE (CD) RECONCILIATION         */}
        {/* ======================================================== */}
        {currentStepId === 'closing_disclosure' && (
          <div className="space-y-6" data-testid="screen-closing-disclosure">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                TRID Statutory Compliance
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Let&apos;s review your final Closing Disclosure against your Loan Estimate.
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Federal TRID rules strictly regulate closing fee increases. Lenders cannot increase origination charges (0% tolerance), and settlement fees are capped at a 10% cumulative variance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border border-neutral-800 bg-neutral-950 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Loan Estimate Total</span>
                <p className="text-sm font-bold text-neutral-300 mt-1 font-mono">
                  {formatCurrency(cdCashToClose - 450)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Final Certified CD</span>
                <p className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                  {formatCurrency(cdCashToClose)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">TRID Tolerance Audit</span>
                <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Within Legal Limits
                </p>
              </div>
            </div>

            <div className="p-4 border border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-xs text-white">Final Loan Terms Sign-Off</p>
                <p className="text-[11px] text-neutral-400">
                  Sign-off confirms certified cash to close matches lender instructions.
                </p>
              </div>
              <Button
                type="button"
                variant={cdApproved ? 'secondary' : 'primary'}
                size="sm"
                className="rounded-none min-h-[44px] px-4 text-xs shrink-0"
                onClick={() => {
                  setCdApproved(!cdApproved);
                  syncCanonicalState({ fundingStatus: 'Clear to Close / CD Approved' });
                }}
                data-testid="btn-approve-cd-conversational"
              >
                {cdApproved ? '✓ Closing Disclosure Approved' : 'Sign & Approve Closing Disclosure'}
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN: FINAL WALK-THROUGH PROTOCOL (24-48H PRE-CLOSE)   */}
        {/* ======================================================== */}
        {currentStepId === 'final_walk_through' && (
          <div className="space-y-6" data-testid="screen-final-walk-through">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Pre-Closing Verification (24 to 48 Hour Window)
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Have you completed the final walk-through 24 to 48 hours prior to closing?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                The final walk-through is your legal defense before funds are released from escrow. Confirm all negotiated repairs were executed with receipts, utilities are active, and no new damage has occurred.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Scheduled Walk-Through Date
                </label>
                <input
                  type="date"
                  value={walkThroughDate}
                  onChange={(e) => setWalkThroughDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conv-walkthrough-date"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Inspecting Lead / Representative
                </label>
                <input
                  type="text"
                  value={walkThroughLead}
                  onChange={(e) => setWalkThroughLead(e.target.value)}
                  placeholder="e.g. Lead Investor or Field PM"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conv-walkthrough-lead"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Walk-Through Status
                </label>
                <select
                  value={walkThroughStatus}
                  onChange={(e) => setWalkThroughStatus(e.target.value as any)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="select-conv-walkthrough-status"
                >
                  <option value="pending_schedule">Pending Schedule (24-48h pre-close)</option>
                  <option value="scheduled">Scheduled with Seller</option>
                  <option value="passed">Passed Condition Verification</option>
                  <option value="issues_identified">Issues Identified at Walk-Through</option>
                </select>
              </div>
            </div>

            {/* 4-Point Mandatory Pre-Closing Condition Checklist */}
            <div className="space-y-3 border border-neutral-800 bg-neutral-950 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-white block border-b border-neutral-800 pb-2">
                Mandatory Pre-Disbursement Condition Checklist
              </span>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'repairs-verified',
                    testId: 'checkbox-conv-repairs-verified',
                    label: '1. Agreed Repairs Completed & Invoiced',
                    desc: 'All negotiated seller repair addendum items inspected and verified with contractor invoices.',
                    checked: repairsVerified,
                    toggle: () => setRepairsVerified(!repairsVerified),
                  },
                  {
                    id: 'broom-clean',
                    testId: 'checkbox-conv-broom-clean',
                    label: '2. Broom-Clean Condition',
                    desc: 'All personal belongings, furniture, and seller construction debris removed from premises.',
                    checked: broomCleanVerified,
                    toggle: () => setBroomCleanVerified(!broomCleanVerified),
                  },
                  {
                    id: 'utilities-active',
                    testId: 'checkbox-conv-utilities-active',
                    label: '3. Utilities Fully Active & Operational',
                    desc: 'Water, electric, gas service, and HVAC active and confirmed functional throughout property.',
                    checked: utilitiesVerified,
                    toggle: () => setUtilitiesVerified(!utilitiesVerified),
                  },
                  {
                    id: 'no-new-damage',
                    testId: 'checkbox-conv-no-new-damage',
                    label: '4. Zero New Damage or Missing Fixtures',
                    desc: 'Premises in same or better condition as original inspection date. No vandalized or removed items.',
                    checked: noNewDamageVerified,
                    toggle: () => setNoNewDamageVerified(!noNewDamageVerified),
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-3 border border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900 cursor-pointer min-h-[44px] touch-target"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={item.toggle}
                      className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                      data-testid={item.testId}
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-neutral-200">{item.label}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Formal Final Walk-Through Sign-off Gate */}
            <div className="p-4 border border-emerald-500/40 bg-emerald-500/5 space-y-3 rounded-none">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Final Walk-Through Authorization Gate</span>
              </div>
              <p className="text-xs text-neutral-200">
                Signing off authorizes escrow to disburse your down payment wire and complete title transfer. Do not sign off if defects remain unresolved.
              </p>

              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  id="conv-walkthrough-signoff-gate"
                  checked={walkThroughSignOff}
                  onChange={(e) => {
                    setWalkThroughSignOff(e.target.checked);
                    syncCanonicalState();
                  }}
                  className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                  data-testid="checkbox-conv-walkthrough-signoff"
                />
                <label htmlFor="conv-walkthrough-signoff-gate" className="text-xs text-white font-semibold cursor-pointer">
                  Execute Final Walk-Through Sign-off &amp; Authorize Escrow Release.
                </label>
              </div>
            </div>

            {/* Contextual Marketplace Assistance */}
            <div>
              <button
                type="button"
                onClick={() => setActiveVendorHelp(!activeVendorHelp)}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 min-h-[44px]"
                data-testid="toggle-walkthrough-marketplace-help"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>{`Coordinate closing walk-through with title escrow in ${propertyState}`}</span>
              </button>

              {activeVendorHelp && (
                <div className="mt-2">
                  <VendorMarketplaceSuggestions
                    taskTitle="24-48 Hour Pre-Closing Walk-Through Verification"
                    requiredTrade="Title & Escrow"
                    propertyState={propertyState}
                    onAssignVendor={(v) => {
                      handleAssignStepVendor('final_walk_through', v);
                      setActiveVendorHelp(false);
                    }}
                    onInviteVendorToBid={(invite) => handleInviteExternalVendor(invite)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 8: DOWN PAYMENT & WIRE FRAUD DEFENSE              */}
        {/* ======================================================== */}
        {currentStepId === 'down_payment_wire' && (
          <div className="space-y-6" data-testid="screen-down-payment-wire">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-mono">
                Mandatory Anti-Fraud Security Shield
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                How will you deliver your down payment and closing funds to escrow?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Wire fraud is the single most common cause of catastrophic investor loss at closing. Criminals routinely hack email servers and transmit spoofed wiring coordinates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('wire')}
                data-testid="choice-pay-wire"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  paymentMethod === 'wire'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">Federal Wire Transfer (Fedwire)</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Same-day bank settlement directly to escrow trust depository.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cashier_check')}
                data-testid="choice-pay-check"
                className={`flex flex-col text-left p-4 rounded-none border transition min-h-[80px] ${
                  paymentMethod === 'cashier_check'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <span className="font-bold text-sm text-white">Official Bank Cashier&apos;s Check</span>
                <p className="mt-1 text-xs text-neutral-400">
                  Physical bank draft delivered via bonded courier or in-person.
                </p>
              </button>
            </div>

            {/* Anti-Fraud Verbal Phone Verification Gate */}
            <div className="p-4 border border-amber-500/40 bg-amber-500/5 space-y-3 rounded-none">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Mandatory Two-Party Phone Verification Gate</span>
              </div>
              <p className="text-xs text-neutral-200">
                Never rely solely on email instructions. You must verbally confirm routing and trust account digits with your escrow officer over the phone.
              </p>

              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  id="phone-verify-gate-check"
                  checked={phoneVerified}
                  onChange={(e) => {
                    setPhoneVerified(e.target.checked);
                    syncCanonicalState();
                  }}
                  className="mt-0.5 h-4 w-4 rounded-none border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0"
                  data-testid="checkbox-conversational-phone-verify"
                />
                <label htmlFor="phone-verify-gate-check" className="text-xs text-white font-semibold cursor-pointer">
                  I have verbally confirmed the escrow account number and wiring coordinates directly with my escrow officer via telephone.
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Federal Wire Reference / Cashier&apos;s Check Number
              </label>
              <input
                type="text"
                value={outgoingWireRef}
                onChange={(e) => setOutgoingWireRef(e.target.value)}
                placeholder="e.g. FEDWIRE-2026-99042"
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                data-testid="input-conversational-wire-ref"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 9: DEED RECORDATION & ADVANCE TO HOLD             */}
        {/* ======================================================== */}
        {currentStepId === 'deed_recordation' && (
          <div className="space-y-6" data-testid="screen-deed-recordation">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                Transaction Completion Ceremony
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Closing is finalized! Has the county deed been recorded?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Recording the deed officially transfers legal title from the seller to your vesting entity. Completing this milestone advances this asset into Phase 03 · Hold & Operations.
              </p>
            </div>

            {/* Closing & Legal Execution Milestone Checklist */}
            <div className="space-y-3 p-4 bg-neutral-900/50 border border-neutral-800 rounded-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                Closing & Legal Execution Checklist
              </span>

              {/* 1. Closing Documents Executed */}
              <label className="min-h-[44px] flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={closingDocsSigned}
                    onChange={(e) => setClosingDocsSigned(e.target.checked)}
                    className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer"
                    data-testid="checkbox-closing-docs-signed"
                  />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">
                      Sign Closing Documents
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      Promissory Note, Deed of Trust, Certified ALTA/HUD-1, and Compliance Affidavits executed
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-emerald-800 bg-emerald-950/40 text-emerald-300 rounded-none shrink-0">
                  {closingDocsSigned ? 'Notarized' : 'Pending'}
                </span>
              </label>

              {/* 2. Closing Fees Settled */}
              <label className="min-h-[44px] flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={closingFeesPaid}
                    onChange={(e) => setClosingFeesPaid(e.target.checked)}
                    className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer"
                    data-testid="checkbox-closing-fees-paid"
                  />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">
                      Pay Closing Fees & Settle Disbursements
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      Lender origination, title/settlement charges, taxes/prepaids, and recording charges reconciled
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-emerald-800 bg-emerald-950/40 text-emerald-300 rounded-none shrink-0">
                  {closingFeesPaid ? 'Disbursed' : 'Pending'}
                </span>
              </label>

              {/* 3. Property Possession & Key Handover */}
              <label className="min-h-[44px] flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={possessionReceived}
                    onChange={(e) => setPossessionReceived(e.target.checked)}
                    className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer"
                    data-testid="checkbox-possession-received"
                  />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">
                      Receive Property Keys & Legal Possession
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      Lockbox code released and physical key handover confirmed upon county recording
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-emerald-800 bg-emerald-950/40 text-emerald-300 rounded-none shrink-0">
                  {possessionReceived ? 'Keys Received' : 'Pending'}
                </span>
              </label>
            </div>

            {/* County Deed Recording Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  County Clerk Recording Instrument / Doc Number
                </label>
                <input
                  type="text"
                  required
                  value={deedDocNumber}
                  onChange={(e) => setDeedDocNumber(e.target.value)}
                  placeholder="e.g. DOC-2026-0049182"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                  data-testid="input-conversational-deed-num"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  County Recording Date
                </label>
                <input
                  type="date"
                  value={deedRecordingDate}
                  onChange={(e) => setDeedRecordingDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conversational-deed-date"
                />
              </div>
            </div>

            {/* Lockbox & Key Handover Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Master Lockbox Code
                </label>
                <input
                  type="text"
                  value={lockboxCode}
                  onChange={(e) => setLockboxCode(e.target.value)}
                  placeholder="e.g. 4821"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs font-mono focus:border-white focus:outline-none"
                  data-testid="input-conversational-lockbox-code"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Lockbox Secure Location
                </label>
                <input
                  type="text"
                  value={lockboxLocation}
                  onChange={(e) => setLockboxLocation(e.target.value)}
                  placeholder="e.g. Master lockbox on front entry handle"
                  className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-white text-base sm:text-xs focus:border-white focus:outline-none"
                  data-testid="input-conversational-lockbox-location"
                />
              </div>
            </div>

            <label className="min-h-[44px] flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-none cursor-pointer hover:border-neutral-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={rekeyCompleted}
                onChange={(e) => setRekeyCompleted(e.target.checked)}
                className="h-5 w-5 rounded-none border-neutral-700 bg-neutral-900 text-neutral-100 accent-neutral-200 cursor-pointer"
                data-testid="checkbox-conversational-rekey-completed"
              />
              <span className="text-xs text-neutral-200">
                Rekeying completed: Exterior deadbolt codes replaced for asset security.
              </span>
            </label>

            {closingFinalized ? (
              <div className="p-4 border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                  <span>
                    <strong>Transaction Legally Closed!</strong> Project has transitioned into Phase 03 · Hold.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="rounded-none min-h-[44px] px-4 text-xs"
                  onClick={onSwitchToExecutiveView}
                >
                  View Hold Operations →
                </Button>
              </div>
            ) : (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto rounded-none min-h-[48px] px-6 text-xs font-bold"
                  onClick={handleFinalizeAndAdvanceToHold}
                  data-testid="btn-record-deed-advance-hold"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1.5">gavel</span>
                  Record Deed & Advance to Phase 03 · Hold
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Contextual Subscribed Vendor Marketplace Assistance (All Steps) */}
        <div className="pt-4 border-t border-neutral-800/80 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveVendorHelp(!activeVendorHelp)}
              data-testid="toggle-step-vendor-help"
              className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span>
                {activeVendorHelp
                  ? 'Hide Vendor Marketplace'
                  : stepVendorConfig[currentStepId]?.ctaText || `Need assistance in ${propertyState}? View Marketplace`}
              </span>
            </button>

            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
              <span>Jurisdiction:</span>
              <span className="px-1.5 py-0.5 rounded-none border border-neutral-700 bg-neutral-900 text-white font-bold">
                {propertyState}
              </span>
            </div>
          </div>

          {activeVendorHelp && (
            <div className="mt-3">
              <VendorMarketplaceSuggestions
                taskTitle={stepVendorConfig[currentStepId]?.taskTitle || stepTitles[currentStepId]}
                requiredTrade={stepVendorConfig[currentStepId]?.trade || 'Contractor'}
                propertyState={propertyState}
                onAssignVendor={(v) => {
                  handleAssignStepVendor(currentStepId, v);
                  setActiveVendorHelp(false);
                }}
                onInviteVendorToBid={(invite) => handleInviteExternalVendor(invite)}
              />
            </div>
          )}
        </div>

        {/* Navigation Action Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-5 mt-6">
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className="rounded-none min-h-[44px] px-4 text-xs"
            data-testid="btn-conversational-prev"
          >
            ← Back
          </Button>

          {currentStepIndex < activeStepSequence.length - 1 && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextStep}
              className="rounded-none min-h-[44px] px-6 text-xs font-bold"
              data-testid="btn-conversational-next"
            >
              Continue →
            </Button>
          )}
        </div>
      </div>

      {/* Team Tier Upgrade Modal */}
      <TeamTierUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={userTier}
        targetTaskTitle={upgradeModalTaskTitle}
        onSwitchToVendors={() => {
          setIsUpgradeModalOpen(false);
          setActiveVendorHelp(true);
        }}
      />
    </div>
  );
}
