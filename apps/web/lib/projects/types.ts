import type {
  UnderwritingInputs,
  AcquisitionPipelineStatus,
  DeadRecord,
  AcquisitionTask,
  ContingencyItem,
  UnderwritingSnapshot,
} from '@paperworking/validation';

export type {
  UnderwritingInputs,
  AcquisitionPipelineStatus,
  DeadRecord,
  AcquisitionTask,
  ContingencyItem,
  UnderwritingSnapshot,
};

export type LegacyProjectPhase = 'acquisition' | 'purchase' | 'hold' | 'exit';

export interface AssigneeOption {
  id?: string;
  uid?: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
}

export type ProjectDisposition = 'SALE' | 'RENT' | 'MIXED';

export interface ProjectTodo {
  id: string;
  type: 'file' | 'question' | 'task';
  content: string;
  status: 'pending' | 'completed';
  phase: LegacyProjectPhase;
  action_label?: string;
}

export interface ProjectDocument {
  doc_id: string;
  type: string;
  name: string;
  url: string;
  generated_at: string;
  phase?: LegacyProjectPhase;
  status?: 'required' | 'uploaded' | 'verified' | 'pending';
  fileSize?: string;
}

export interface ProjectDealComponent {
  id: string;
  slug: string;
  name: string;
  address: string;
  dealType: 'underwriting' | 'syndication' | 'financing' | 'wholesale';
  status: 'draft' | 'underwritten' | 'active' | 'funded' | 'closed';
  purchasePrice: number;
  rehabBudget?: number;
  cashRequired?: number;
  projectedIrr?: number;
  capRate?: number;
  cashOnCashPct?: number;
  targetRaise?: number;
  committedAmount?: number;
  marketplaceUrl?: string;
  updatedAt?: string;
}

export interface ProjectSummary {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  currentPhase: LegacyProjectPhase;
  status: string;
  dispositionType: ProjectDisposition;
  purchasePrice: number;
  estimatedIrr?: number;
  phaseCompletionPct?: number;
  ownershipPercentage?: number;
  estimatedExitValue?: number | null;
  isIllustrativeExitValue?: boolean;
  dealId?: string | null;
  dealSlug?: string | null;
  dealAddress?: string | null;
  deals?: ProjectDealComponent[];
  underwriting?: UnderwritingInputs | null;
  acquisitionStatus?: AcquisitionPipelineStatus;
  tasks?: AcquisitionTask[];
  deadRecord?: DeadRecord | null;
  contingencies?: ContingencyItem[];
  underwritingSnapshot?: UnderwritingSnapshot | null;
  isArchived?: boolean;
  funding?: ProjectFundingTerms | null;
  phaseAssignees?: Partial<Record<LegacyProjectPhase, AssigneeOption | null>>;
  holdPhase?: HoldPhaseDetails;
}

export interface CapitalStackBreakdown {
  seniorDebt: number;
  mezzanineDebt?: number;
  preferredEquity?: number;
  investorEquity: number;
  leadEquity: number;
  totalCostBasis: number;
  ltvPct?: number;
  ltcPct?: number;
}

export interface LenderUnderwritingCondition {
  id: string;
  category: 'PTD' | 'PTF' | 'CLOSING';
  title: string;
  description?: string;
  status: 'pending' | 'submitted' | 'approved' | 'waived';
  clearedAt?: string;
  linkedDocumentId?: string;
  linkedDocumentName?: string;
  linkedDocumentUrl?: string;
}

export interface SourcesAndUsesLineItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  isCustom?: boolean;
}

export interface SourcesAndUsesStatement {
  sources: SourcesAndUsesLineItem[];
  uses: SourcesAndUsesLineItem[];
  totalSources: number;
  totalUses: number;
  variance: number;
  isBalanced: boolean;
}

export interface PropertyInspectionIssue {
  id: string;
  category: 'structural' | 'roof' | 'mep' | 'plumbing' | 'electrical' | 'environmental' | 'cosmetic' | 'other';
  description: string;
  estimatedCost: number;
  requestedResolution: 'seller_repair' | 'price_reduction' | 'closing_credit' | 'escrow_holdback' | 'waive';
  sellerResponse: 'pending' | 'agreed' | 'countered' | 'rejected';
  agreedCreditAmount?: number;
  repairStatus?: 'pending' | 'in_progress' | 'completed_verified';
  repairInvoiceUrl?: string;
}

export interface PropertyInspectionDetails {
  inspectorCompany?: string;
  inspectorName?: string;
  licenseNumber?: string;
  scheduledDate?: string;
  contingencyDeadline?: string;
  status: 'pending_schedule' | 'scheduled' | 'completed' | 'issues_uncovered' | 'waived';
  reportDocumentUrl?: string;
  issuesCount?: number;
}

export interface FinalWalkThroughRecord {
  scheduledDate?: string;
  conductedAt?: string;
  inspectorOrLeadName?: string;
  status: 'pending_schedule' | 'scheduled' | 'passed' | 'issues_identified';
  agreedRepairsVerified: boolean;
  broomCleanConditionVerified: boolean;
  utilitiesOperationalVerified: boolean;
  noNewDamageVerified: boolean;
  signOffCompleted: boolean;
  signOffNotes?: string;
}

export interface ValuationVerificationRecord {
  appraisedValue?: number;
  appraisalCompany?: string;
  appraisalDate?: string;
  contractPurchasePrice?: number;
  appraisalGapAmount?: number;
  gapResolutionStrategy?: 'renegotiate_price' | 'inject_equity' | 'rebuttal' | 'none';
  phase1EsaStatus?: 'clean' | 'rec_identified' | 'phase2_recommended' | 'waived';
  surveyStatus?: 'clean' | 'encroachments_noted' | 'pending' | 'waived';
  physicalInspectionSignedOff?: boolean;
  inspectionClearanceDate?: string;
  notes?: string;
  inspectionDetails?: PropertyInspectionDetails;
  inspectionIssues?: PropertyInspectionIssue[];
  totalRepairsRequested?: number;
  totalCreditsNegotiated?: number;
  repairAmendmentExecuted?: boolean;
  appraisalOrderedDate?: string;
  appraisalOrderStatus?: 'pending_order' | 'ordered_by_lender' | 'inspection_scheduled' | 'report_received' | 'under_review';
  appraisalTargetDeliveryDate?: string;
  appraisalFeeAmount?: number;
  finalWalkThrough?: FinalWalkThroughRecord;
}

export interface TitleScheduleBItem {
  id: string;
  item: string;
  category: 'requirement' | 'exception';
  status: 'pending' | 'cleared';
  notes?: string;
}

export interface ClosingDocumentSigningRecord {
  mortgageNoteExecuted: boolean;
  deedOfTrustExecuted: boolean;
  settlementStatementExecuted: boolean;
  titleAffidavitsExecuted: boolean;
  signingMethod: 'in_person_title' | 'mobile_notary' | 'remote_online_notary';
  notaryName?: string;
  signingCompletedAt?: string;
  allDocumentsExecuted: boolean;
}

export interface ClosingFeeSettlementRecord {
  lenderOriginationFees: number;
  titleAndSettlementFees: number;
  escrowTaxesAndPrepaids: number;
  governmentRecordingCharges: number;
  totalClosingFees: number;
  feeDisbursementStatus: 'pending_disbursement' | 'disbursed_by_escrow' | 'settlement_reconciled';
  disbursedAt?: string;
  escrowDisbursementReference?: string;
}

export interface PropertyPossessionRecord {
  possessionStatus: 'pending_recording' | 'possession_transferred' | 'keys_received';
  keyDeliveryMethod: 'title_handover' | 'lockbox_code' | 'onsite_super_seller';
  lockboxCode?: string;
  lockboxLocation?: string;
  possessionEffectiveDate?: string;
  possessionConfirmedBy?: string;
  rekeyCompleted?: boolean;
}

export interface TitleSearchRecord {
  titleCompanyName: string;
  titleExaminerName?: string;
  searchOrderedDate?: string;
  searchCompletedDate?: string;
  searchStatus: 'search_ordered' | 'in_examination' | 'curative_required' | 'title_cleared';
  deedChainVerified: boolean;
  noUnsatisfiedLiens: boolean;
  noTaxOrJudgmentLiens: boolean;
  noOwnershipOrBoundaryDisputes: boolean;
  municipalLienCertificateNumber?: string;
  cleanTitleCommitmentIssued: boolean;
  notes?: string;
}

export interface TitleInsurancePolicyRecord {
  underwriterName: string;
  titleAgencyName: string;
  lenderPolicyNumber?: string;
  lenderPolicyCoverageAmount: number;
  lenderPolicyStatus: 'ordered' | 'binder_issued' | 'policy_issued';
  ownerPolicyNumber?: string;
  ownerPolicyCoverageAmount: number;
  ownerPolicyStatus: 'ordered' | 'binder_issued' | 'policy_issued';
  simultaneousIssueDiscount: boolean;
  totalTitleInsurancePremium: number;
  policiesBound: boolean;
  binderIssuedDate?: string;
}

export interface PropertyInsuranceBinderRecord {
  insuranceCarrier: string;
  agencyName?: string;
  policyType: 'landlord_dp3' | 'homeowners_ho3' | 'builders_risk' | 'commercial_property';
  policyNumber?: string;
  binderNumber?: string;
  dwellingCoverageAmount: number;
  liabilityCoverageAmount: number;
  deductibleAmount: number;
  annualPremium: number;
  effectiveDate?: string;
  expirationDate?: string;
  status: 'quote_received' | 'bound' | 'paid' | 'dec_page_issued';
  lenderLossPayeeEndorsed: boolean;
  floodInsuranceRequired: boolean;
  floodInsuranceBound?: boolean;
}

export interface LegalTransferRecord {
  vestingEntityName?: string;
  vestingEntityState?: string;
  vestingEntityEin?: string;
  goodStandingVerified?: boolean;
  operatingAgreementExecuted?: boolean;
  authorizedSignatoryName?: string;
  titleCommitmentNumber?: string;
  titleInsurer?: string;
  scheduleBCurativeItems?: TitleScheduleBItem[];
  titleSearch?: TitleSearchRecord;
  titleInsurance?: TitleInsurancePolicyRecord;
  propertyInsurance?: PropertyInsuranceBinderRecord;
  wireFraudVerified?: boolean;
  wireVerifiedPhone?: string;
  wireVerifiedWith?: string;
  wireVerifiedDate?: string;
  outgoingWireReference?: string;
  deedInstrumentNumber?: string;
  deedRecordingDate?: string;
  closingDocumentSigning?: ClosingDocumentSigningRecord;
  closingFeeSettlement?: ClosingFeeSettlementRecord;
  propertyPossession?: PropertyPossessionRecord;
}

export interface LendingPackageDocument {
  id: string;
  title: string;
  category: 'financials' | 'tax_returns' | 'bank_statements' | 'property' | 'entity' | 'underwriting' | 'other';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isIncluded: boolean;
  required: boolean;
  uploadedAt?: string;
}

export interface LendingPackage {
  id: string;
  name: string;
  targetLender: string;
  loanType: string;
  requestedAmount: number;
  status: 'draft' | 'ready' | 'submitted' | 'under_review' | 'term_sheet_received' | 'approved';
  submissionDate?: string;
  lenderContactName?: string;
  lenderContactEmail?: string;
  documents: LendingPackageDocument[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RateLockDetails {
  status: 'floating' | 'locked' | 'expired';
  lockedRatePct?: number;
  lockExecutionDate?: string;
  expirationDate?: string;
  lockPeriodDays?: number;
  pointsOrFeeAmount?: number;
  lenderConfirmationNumber?: string;
  agreementDocumentUrl?: string;
  agreementDocumentName?: string;
}

export interface ClosingDisclosureItem {
  id: string;
  name: string;
  category: 'origination' | 'cannot_shop' | 'can_shop' | 'taxes_gov' | 'prepaids' | 'initial_escrow' | 'other';
  toleranceBucket: 'zero_percent' | 'ten_percent' | 'unlimited';
  loanEstimateAmount: number;
  closingDisclosureAmount: number;
  notes?: string;
}

export interface ClosingDisclosureComparison {
  loanEstimateDate?: string;
  closingDisclosureDate?: string;
  items: ClosingDisclosureItem[];
  loanEstimateCashToClose: number;
  closingDisclosureCashToClose: number;
  isTridCompliant: boolean;
  reconciliationNotes?: string;
}

export interface DownPaymentCoordination {
  paymentMethod: 'wire_transfer' | 'cashiers_check';
  totalAmountDue: number;
  recipientEscrowCompany?: string;
  recipientBankName?: string;
  routingNumberMasked?: string;
  accountNumberMasked?: string;
  referenceFileNumber?: string;
  verbalConfirmationCompleted: boolean;
  verbalVerifiedWith?: string;
  verbalVerifiedPhone?: string;
  verbalVerifiedAt?: string;
  status: 'awaiting_instructions' | 'instructions_verified' | 'payment_dispatched' | 'confirmed_by_escrow';
  dispatchedAt?: string;
  dispatchReferenceNumber?: string;
  proofOfPaymentUrl?: string;
}

export interface ProjectFundingTerms {
  loanAmount?: number;
  interestRatePct?: number;
  amortizationYears?: number;
  downPayment?: number;
  closingCosts?: number;
  actualCashToClose?: number;
  fundingStatus?: string;
  lenderName?: string;
  loanType?: string;
  monthlyDebtService?: number;
  capitalStack?: CapitalStackBreakdown;
  sourcesAndUses?: SourcesAndUsesStatement;
  lenderConditions?: LenderUnderwritingCondition[];
  valuationVerification?: ValuationVerificationRecord;
  legalTransfer?: LegalTransferRecord;
  titleSearch?: TitleSearchRecord;
  titleInsurance?: TitleInsurancePolicyRecord;
  propertyInsurance?: PropertyInsuranceBinderRecord;
  lendingPackages?: LendingPackage[];
  activeLendingPackageId?: string;
  rateLock?: RateLockDetails;
  closingDisclosureComparison?: ClosingDisclosureComparison;
  downPaymentCoordination?: DownPaymentCoordination;
}

export type RenovationTier = 'STAGE' | 'REFURBISH' | 'RENOVATE' | 'GUT' | 'DEVELOP';

export type HoldingCostCategory =
  | 'piti_debt_service'
  | 'piti_property_taxes'
  | 'piti_insurance'
  | 'maintenance_repairs'
  | 'capex_reserves'
  | 'vacancy_buffer'
  | 'property_management'
  | 'utilities'
  | 'hoa_dues'
  | 'municipal_fees_taxes';

export interface HoldingCostItem {
  id: string;
  category: HoldingCostCategory;
  name: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  monthlyAmount: number;
  actualSpentToDate?: number;
  dueDay?: number;
  notes?: string;
  ruleOfThumbBenchmark?: string;
  status: 'active' | 'projected' | 'paid';
}

export interface ListingAdRecord {
  id: string;
  channel:
    | 'Zillow'
    | 'CoStar / Apartments.com'
    | 'Facebook Marketplace'
    | 'MLS / Realtor.com'
    | 'StreetEasy'
    | 'Yard Sign'
    | 'Broker Direct'
    | 'Other';
  datePlaced: string;
  spendAmount: number;
  isRecurring: boolean;
  status: 'active' | 'paused' | 'completed';
  inquiriesGenerated: number;
  showingsScheduled: number;
  applicationsReceived: number;
  notes?: string;
}

// 🛠️ Property Renovation & Development Types
export interface SowLineItem {
  id: string;
  category: string;
  description: string;
  contractor: string;
  budgetedAmount: number;
  actualAmount: number;
  completionPct: number;
  status: 'pending' | 'not_started' | 'in_progress' | 'completed' | 'delayed';
  assignedTo?: string;
  plansUrl?: string;
  engineeringRequired?: boolean;
}

export interface MunicipalPermit {
  id: string;
  permitNumber: string;
  type: 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'demolition' | 'environmental' | 'zoning_variance';
  jurisdiction: string;
  appliedDate: string;
  approvedDate?: string;
  finaledDate?: string;
  status: 'applied' | 'under_review' | 'approved' | 'finaled';
  notes?: string;
  assignedTo?: string;
}

export interface ContractorRecord {
  id: string;
  name: string;
  trade: string;
  licenseNumber: string;
  insuranceExpDate: string;
  phone: string;
  status: 'active' | 'pending_insurance' | 'completed';
  hasCoiVerified: boolean;
  assignedTo?: string;
}

export interface QualityControlInspection {
  id: string;
  title: string;
  stage: 'pre_pour' | 'framing' | 'mep_rough' | 'pre_drywall' | 'final_punch';
  inspector: string;
  date: string;
  status: 'passed' | 'conditional' | 'failed' | 'scheduled';
  findings: string;
  actionRequired: boolean;
}

export interface DrawRequest {
  id: string;
  drawNumber: number;
  amountRequested: number;
  retainageAmount: number;
  amountApproved: number;
  lenderInspector: string;
  status: 'draft' | 'submitted' | 'inspected' | 'approved' | 'funded';
  requestedDate: string;
  fundedDate?: string;
}

export interface GroundUpMilestone {
  id: string;
  milestone: 'grading_earthwork' | 'foundation_pour' | 'framing_envelope' | 'utility_connections' | 'drywall_finishes';
  label: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  engineeringSignoff: boolean;
}

// 💰 Financial Management & Carrying Costs Types
export interface DebtServiceHoldDetails {
  monthlyPayment: number;
  paymentType: 'interest_only' | 'principal_and_interest';
  lenderName: string;
  dueDay: number;
  autopayEnabled: boolean;
  lastPaymentDate?: string;
}

export interface PropertyTaxHoldDetails {
  countyParcelId: string;
  annualTaxAmount: number;
  monthlyEscrowAmount: number;
  appealStatus: 'not_applicable' | 'under_appeal' | 'assessment_reduced' | 'appeal_denied';
  nextDueDate: string;
  assessedValue: number;
}

export interface InsuranceHoldDetails {
  policyType: 'builders_risk' | 'landlord_dp3' | 'commercial_property';
  carrier: string;
  policyNumber: string;
  annualPremium: number;
  monthlyPremium: number;
  coverageLimit: number;
  expirationDate: string;
  transitionReady: boolean;
}

export interface UtilityHoldItem {
  id: string;
  type: 'electricity' | 'water_sewer' | 'gas' | 'trash_dumpster';
  provider: string;
  accountNumber: string;
  monthlyBudget: number;
  meterActive: boolean;
}

export interface HoaHoldDetails {
  hasHoa: boolean;
  associationName?: string;
  monthlyDues: number;
  dueDay: number;
  arcApprovalStatus?: 'approved' | 'pending_submission' | 'under_review' | 'not_required';
  goodStanding: boolean;
}

export interface CapExHoldItem {
  id: string;
  title: string;
  category: 'roofing' | 'hvac' | 'plumbing_main' | 'structural' | 'parking_paving' | 'appliance_package';
  amount: number;
  dateCapitalized: string;
  recoveryYears: number;
  isCapitalizedForTax: boolean;
}

export interface BookkeepingVarianceSummary {
  initialHoldingBudget: number;
  actualHoldingSpend: number;
  projectedCarryingAtExit: number;
  varianceAmount: number;
  variancePct: number;
  hasOverrunWarning: boolean;
}

// 📊 Asset & Property Management Types
export interface StabilizationReadiness {
  punchListRemainingCount: number;
  certificateOfOccupancyObtained: boolean;
  coDate?: string;
  deepCleaningCompleted: boolean;
  stagingCompleted: boolean;
  readyForMarketing: boolean;
}

export interface PropertyManagerHoldDetails {
  isSelfManaged: boolean;
  companyName: string;
  leadManagerName: string;
  feePct: number;
  leaseUpFeeAmount: number;
  phone: string;
  email: string;
  contractSigned: boolean;
}

export interface SiteSecurityHoldDetails {
  hasCellularCameras: boolean;
  hasSmartLockbox: boolean;
  hasMotionLighting: boolean;
  lockboxCodeLastRotated?: string;
  weeklySiteWalkLogged: boolean;
  squatterPreventionProtocolActive: boolean;
}

export interface RoutineMaintenanceHoldItem {
  id: string;
  service: 'lawn_care' | 'snow_removal' | 'pest_control' | 'gutter_cleaning' | 'hvac_filter_turnover';
  provider: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'seasonal';
  costPerVisit: number;
  lastCompletedDate?: string;
  nextScheduledDate: string;
  status: 'active' | 'paused';
}

export interface HoldPhaseDetails {
  targetDisposition: 'RENT' | 'LEASE' | 'SALE';
  renovationTier: RenovationTier;
  initialRehabBudget: number;
  committedSowBudget: number;
  actualRehabSpend: number;
  finalProjectedCost: number;
  targetCompletionDate?: string;
  daysInHold: number;
  holdingCosts: HoldingCostItem[];
  listingAds: ListingAdRecord[];
  isSelfManaged: boolean;
  propertyManagementFeePct: number;
  propertyManagerName?: string;
  targetMarketRent?: number;
  targetSaleArv?: number;
  reservePolicy?: {
    vacancyBufferPct: number;
    maintenanceAnnualPct: number;
    capexGrossRentPct: number;
  };
  notes?: string;

  // 18 Core Activities Structured State
  sowItems?: SowLineItem[];
  permits?: MunicipalPermit[];
  contractors?: ContractorRecord[];
  qualityControlInspections?: QualityControlInspection[];
  drawRequests?: DrawRequest[];
  groundUpMilestones?: GroundUpMilestone[];

  debtService?: DebtServiceHoldDetails;
  propertyTax?: PropertyTaxHoldDetails;
  insurance?: InsuranceHoldDetails;
  utilities?: UtilityHoldItem[];
  hoa?: HoaHoldDetails;
  capexItems?: CapExHoldItem[];
  bookkeepingSummary?: BookkeepingVarianceSummary;

  stabilization?: StabilizationReadiness;
  propertyManagerDetails?: PropertyManagerHoldDetails;
  siteSecurity?: SiteSecurityHoldDetails;
  routineMaintenance?: RoutineMaintenanceHoldItem[];
}

// ==========================================
// REIL PHASE 4: EXIT & DISPOSITION TYPES
// ==========================================

export type ExitStrategyRoute =
  | 'outright_sale'
  | 'refinance_retain'
  | 'condo_selloff'
  | 'lease_option'
  | '1031_exchange';

// Task 2: Data Audit & Asset Stabilization Pre-Check
export interface HoldAuditSummary {
  totalRevenueCollected: number;
  totalOperatingExpensesPaid: number;
  netOperatingIncomeHold: number;
  monthsInHold: number;
  averageOccupancyPct: number;
}

export interface TenantReconciliation {
  totalSecurityDepositsHeld: number;
  prepaidRentLiability: number;
  activeLeaseContractsCount: number;
  tenantCount: number;
}

export interface TenantEstoppelCertificate {
  id: string;
  unitNumber: string;
  tenantName: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  securityDepositAmount: number;
  delinquentBalance: number;
  confirmedByTenant: boolean;
  documentUrl?: string;
}

export interface VdrAssetItem {
  id: string;
  category: 'financial_statement' | 'tax_return' | 'utility_records' | 'capex_log' | 'rent_roll' | 'environmental';
  title: string;
  fileName: string;
  fileSize: string;
  verifiedDate: string;
  status: 'ready' | 'pending';
}

// Task 3: State Transfer Tax & Baseline Setup
export interface StateTransferTaxOverride {
  stateCode: string;
  stateName: string;
  statutoryRatePct: number;
  paidBy: 'seller' | 'buyer' | 'split_50_50';
  recordingFeeFlat: number;
  customRatePct?: number;
  isCustomOverrideActive: boolean;
  notes?: string;
}

// Task 4: Strategy-Specific Execution States
export interface OutrightSaleExecutionState {
  omPublished: boolean;
  omDocumentUrl?: string;
  signedNdasCount: number;
  buyerName?: string;
  psaSignedDate?: string;
  dueDiligenceDeadline?: string;
  lenderPayoffDemandReceived: boolean;
  deedTitleTransferred: boolean;
}

export interface RefinanceRetainExecutionState {
  postRehabAppraisalValue: number;
  newLoanAmount: number;
  newLoanLtvPct: number;
  dscrPackageSubmitted: boolean;
  newInterestRatePct: number;
  newAmortizationYears: number;
  constructionDebtPaidOff: boolean;
  cashOutEquityExtracted: number;
  newMonthlyDebtService: number;
  ongoingDscr: number;
  ongoingCashOnCashYield: number;
  handedBackToHold: boolean;
}

export interface CondoSellOffTranche {
  trancheNumber: number;
  unitsCount: number;
  pricePerUnit: number;
  releasePricePaydown: number;
  status: 'closed' | 'under_contract' | 'active' | 'upcoming';
}

export interface CondoSellOffExecutionState {
  masterDeedRecorded: boolean;
  offeringPlanAccepted: boolean;
  posAndCcrsApproved: boolean;
  hoaEntityName: string;
  hoaIncorporated: boolean;
  monthlyDuesPerUnit: number;
  conventionalFinancingEligible: boolean;
  totalUnits: number;
  unitsSold: number;
  averageUnitPrice: number;
  tranches: CondoSellOffTranche[];
  buyerBoardInterviewsCount: number;
  hoaBoardTransitionThresholdMet: boolean;
}

export interface LeaseOptionExecutionState {
  optionContractExecuted: boolean;
  upfrontOptionFee: number;
  strikePrice: number;
  monthlyRent: number;
  monthlyOptionCredit: number;
  leaseTermMonths: number;
  optionExpiryDate: string;
  accumulatedOptionCredits: number;
  tenantCreditScoreTarget: number;
  tenantCreditMilestoneReached: boolean;
  conversionTriggered: 'pending' | 'exercised_sale' | 'expired_hold';
}

export interface Identified1031Property {
  id: string;
  address: string;
  estimatedValue: number;
  identifiedDate: string;
  status: 'identified' | 'under_contract' | 'closed';
}

export interface Exchange1031ExecutionState {
  qiName: string;
  qiEngagementSigned: boolean;
  qiEscrowSetup: boolean;
  saleClosingDate: string;
  identificationDeadline: string;
  replacementClosingDeadline: string;
  identifiedProperties: Identified1031Property[];
  bootAmount: number;
  taxDeferredAmount: number;
  passedForwardToNewAcquisition: boolean;
}

// Task 5: Accounting & Tax Basis Waterfall
export interface PartnerWaterfallDistribution {
  partnerName: string;
  role: 'Lead Investor' | 'LP Partner' | 'Operator';
  equityContributed: number;
  ownershipPct: number;
  capitalReturned: number;
  preferredReturnPaid: number;
  excessPromoteDistributed: number;
  totalDistribution: number;
}

export interface TaxAccountingReconciliation {
  totalCapitalInvested: number;
  adjustedCostBasis: number;
  cumulativeDepreciationTaken: number;
  depreciationRecaptureAmount: number;
  recognizedCapitalGain: number;
  estimatedFederalCapitalGainsTax: number;
  waterfallDistributions: PartnerWaterfallDistribution[];
}

// Task 6: Lifecycle Closure & Performance Record
export interface ExitPhaseDetails {
  selectedRoute: ExitStrategyRoute;
  targetGrossPrice: number;
  brokerCommissionPct: number;
  sellerClosingCostPct: number;
  debtPayoffAmount: number;
  proratedTaxes: number;
  netSalesProceeds: number;

  // Task 2
  holdAudit?: HoldAuditSummary;
  tenantReconciliation?: TenantReconciliation;
  estoppelCertificates?: TenantEstoppelCertificate[];
  vdrAssets?: VdrAssetItem[];

  // Task 3
  stateTransferTax?: StateTransferTaxOverride;

  // Task 4: Strategy execution sub-states
  outrightSale?: OutrightSaleExecutionState;
  refinanceRetain?: RefinanceRetainExecutionState;
  condoSellOff?: CondoSellOffExecutionState;
  leaseOption?: LeaseOptionExecutionState;
  exchange1031?: Exchange1031ExecutionState;

  // Task 5
  taxAccounting?: TaxAccountingReconciliation;

  // Task 6: Life-of-Asset KPIs & Audit Lock
  terminalIrr: number;
  equityMultiple: number;
  cashOnCashReturnPct: number;
  returnOnEquityPct: number;
  netProfit: number;
  glAccountsClosed: boolean;
  closingStatementDocId?: string;
  isLifecycleLocked: boolean;
  lockedTimestamp?: string | null;
  lockedBy?: string;
}

export interface ProjectWorkspace extends ProjectSummary {
  project_id: string;
  property_address: string;
  phase: LegacyProjectPhase;
  phase_completion_pct: number;
  purchase_price: number;
  rehab_costs: number;
  exit_strategy: string;
  entity_type: string;
  storage_used_bytes: number;
  storageQuotaBytes: number;
  todos: ProjectTodo[];
  documents: ProjectDocument[];
  underwriting?: UnderwritingInputs | null;
  statusHistory?: any[];
  organizationId?: string;
  offers?: any[];
  earnestMoney?: any;
  checklistItems?: any[];
  teamMembers?: any[];
  underwritingRecord?: Record<string, unknown> | null;
  financials?: Record<string, unknown> | null;
  phaseAssignees?: Partial<Record<LegacyProjectPhase, AssigneeOption | null>>;
  holdPhase?: HoldPhaseDetails;
  exitPhase?: ExitPhaseDetails;
  userTier?: string;
  propertyState?: string;
}

export const PROJECT_SUBROUTES = [
  { slug: '', label: 'Overview' },
  { slug: 'underwriting', label: 'Underwriting' },
  { slug: 'insights', label: '33 Datapoints' },
  { slug: 'documents', label: 'Documents' },
  { slug: 'reports', label: 'Reports' },
  { slug: 'scorecard', label: 'Scorecard' },
] as const;

export type ProjectSubrouteSlug = (typeof PROJECT_SUBROUTES)[number]['slug'];

