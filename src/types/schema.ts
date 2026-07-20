// PaperWorking Project Schema

import type { NotificationCategory, CategoryPreference } from './user';

// ── Phase Pipeline Snapshots ─────────────────────────────────
// Written once (immutable) when a user advances past a phase.
// Sub-collection path: projects/{projectId}/phaseSnapshots/{phaseKey}

export type PhaseSnapshotKey = 'phase-1' | 'phase-2' | 'phase-3';

export interface Phase1Snapshot {
  phaseKey:              'phase-1';
  purchasePrice:         number;
  estimatedARV:          number;
  loanAmount:            number;
  loanInterestRate:      number;
  loanOriginationPoints: number;
  projectedRehabCost:    number;
  estimatedTimelineDays: number;
  fixedAcquisitionCosts: number;
  maxOffer:              number;
  capturedAt:            Date;
}

export interface Phase2Snapshot {
  phaseKey:                'phase-2';
  initialCapitalizedBasis: number;
  isClearToClose:          boolean;
  capturedAt:              Date;
}

export interface Phase3Snapshot {
  phaseKey:          'phase-3';
  totalRehabActual:  number;  // sum of approved rehabExpenses
  totalHoldingCosts: number;  // sum of holdingCosts (monthlyAmount × monthsPaid)
  capturedAt:        Date;
}

export interface PhaseSnapshotMap {
  'phase-1'?: Phase1Snapshot;
  'phase-2'?: Phase2Snapshot;
  'phase-3'?: Phase3Snapshot;
}

// ── Deal Phase System ─────────────────────────────────────────

export type ProjectPhaseKey = 'acquisition' | 'fund' | 'hold' | 'exit';

export interface ProjectPhaseDefinition {
  key: ProjectPhaseKey;
  label: string;
  order: number;
  allowedTransitions: ProjectPhaseKey[];
  // Document types that must be verified before advancing to the next phase
  requiredDocuments: DocumentCategory[];
  // Human-readable gate conditions; all must be met to unlock the transition
  completionGate: string[];
}

// ── Unified Transaction Ledger ────────────────────────────────
// Single canonical type spanning Firestore LedgerItems and
// Prisma PayoutWaterfall records. Used by reporting, PDF export,
// and the financial sync service.

export type LedgerEntryType =
  | 'acquisition'   // Purchase price, title fees, origination
  | 'rehab'         // Materials, labor, permits
  | 'holding'       // Monthly recurring: taxes, insurance, interest
  | 'closing'       // Buyer/seller closing costs, commissions
  | 'payout';       // Equity distribution, lender repayment, agent fees

export interface TransactionLedger {
  id: string;
  projectId: string;
  organizationId: string;
  ledgerType: LedgerEntryType;
  description: string;
  // Positive = income/credit; negative = expense/debit
  amount: number;
  category: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Settled';
  payeeName?: string;
  payeeRole?: Role;
  submittedByUid: string;
  approvedByUid?: string;
  approvedAt?: Date;
  receiptUrl?: string;
  // Cross-system references for the dual-DB architecture
  linkedFirestoreItemId?: string;   // → Firestore LedgerItem.id
  linkedPrismaWaterfallId?: string; // → Prisma PayoutWaterfall.id
  createdAt: Date;
  updatedAt?: Date;
}

// 1. Roles & Permissions Definition
// 1.0 Atomic Permissions Catalog
export type Permission = 
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.assign'
  | 'reports.view'
  | 'reports.export'
  | 'billing.manage'
  | 'team.invite'
  | 'team.manage_members'
  | 'team.manage_roles'
  | 'vendors.manage'
  | 'deal_marketplace.post'
  | 'crowdfunding.manage'
  | 'settings.manage';

// 1.0.1 Custom Role Schema (Stored in /organizations/{orgId}/roles/{roleId})
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export type Role =
  | 'Lead Investor'      // Admin (Read/Write all)
  | 'Platform Admin'     // PaperWorking Site-wide Admin
  | 'Admin'              // Co-admin designated by account holder
  | 'General Contractor' // PM (Read/Write all except sensitive financial settings)
  | 'Real Estate Agent'  // Contributor (Read all, Edit status/timeline)
  | 'Accountant'         // Viewer/Export (Read all, no edits unless authorized)
  | 'Lender'              // Read-Only (Read specific financial data)
  | 'Vendor'              // External Professional (Marketplace access)
  | 'Analyst'             // Read-Only viewer
  | 'Observer'            // Read-Only viewer
  | 'Standard'            // General user
  | 'Guest';              // Very limited view

// 1.1 Organization-Level Role (Account Holder Self-ID)
export type OrgRole = 'Lead Investor' | 'Admin';

// 1.2 Project-Specific Team Roles (non-investor professionals)
export type ProjectRole =
  | 'Real Estate Agent'
  | 'Real Estate Attorney'
  | 'Loan Officer/Broker'
  | 'Loan Processor'
  | 'Loan Underwriter'
  | 'Appraiser'
  | 'Title Company/Escrow Officer'
  | 'Closing Agent'
  | 'Mortgage Servicer';

// 1.3 External Access Permissions (per-stakeholder gate)
export interface ExternalAccessPermission {
  canView: boolean;   // Can view project details and financials
  canUpload: boolean; // Can upload documents (appraisals, reports) to the project
  canComment: boolean; // Can leave comments/notes on project tasks
}

// 1.4 Internal Account Role (within an organization)
export type InternalRole = 'CEO' | 'President' | 'CFO' | 'COO' | 'Admin' | 'Deal Lead';

// 1.45 Organization Team Member (org-level, not deal-specific)
export interface OrgTeamMember {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  internalRole: InternalRole;
  customPermissions?: Permission[];
  scope?: 'tenant' | 'project';
  assignedProjectIds: string[]; // Projects this member leads (Project Lead only)
  /** Authoritative scoped project list set at invite time — enforced server-side */
  scopedProjectIds?: string[];
  /** true when the member was invited with explicit project-scope restrictions */
  isScoped?: boolean;
  invitedAt: Date;
  status: 'active' | 'invited' | 'removed' | 'suspended';
  /** ISO string from users/{uid}/sessions sub-collection; null = no recorded session */
  lastSeenAt?: string | null;
}

// 1.5. Organization Schema
// Establishes the multi-tenant B2B entity boundary
export interface Organization {
  id: string; // Document ID
  name: string;
  ownerUid: string; // The primary billing/admin user
  accountTier: 'Individual' | 'Team'; // Controls seat count and team features
  subscriptionPlan: 'None' | 'Individual' | 'Team' | 'Vendor Network';
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'paused';
  teamMembers: OrgTeamMember[]; // Up to 10 for Team accounts, 0 for Individual
  maxSeats: number; // 1 for Individual, 10 for Team
  
  // Portfolio Aggregates (Updated on Phase 4 Project Close)
  totalProjectsClosed?: number;
  totalNetRealizedProfit?: number;
  averagePortfolioROI?: number;

  createdAt: Date;
  updatedAt: Date;
}

// 2. User Schema
export interface ApplicationUser {
  uid: string;
  email: string;
  displayName: string;
  personalOrganizationId: string; // The user's default "Me" workspace
  organizationId?: string; // DEPRECATED: Transitioning to personalOrganizationId
  memberships?: Record<string, OrgRole | string>; // Map of tenant ID to role
  orgRole: OrgRole | string; // Account-holder self-designation or Custom Role ID
  orgPermissions?: Permission[]; // RBAC: Denormalized org-level permissions for rule enforcement
  subscriptionPlan: 'None' | 'Individual' | 'Team' | 'Vendor Network';
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'paused';
  accountType?: 'investor' | 'vendor';
  inviteToken?: string; // Populated when user arrived via crowdfund invitation
  invitedToProjectId?: string; // Project they were invited to join
  
  // Billing Metadata
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  lastFour?: string;
  // Integration Metadata
  googleCalendarRefreshToken?: string;

  /* ── Push & Email Notifications Preferences ── */
  preferences?: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    categories?: Record<NotificationCategory, CategoryPreference>;
  };

  createdAt: Date;
  updatedAt: Date;
}

export type CapitalPartyType = 'Sponsor' | 'Investor' | 'Co-GP' | 'Preferred Equity';

export interface FractionalInvestor {
  id: string;
  uid?: string; // Firebase UID (null if invited but not yet registered)
  email: string;
  name: string;
  equityPercentage: number; // e.g. 25 for 25%
  contributionAmount: number; // Dollar amount invested
  status: 'confirmed' | 'invited' | 'pending_subscription';
  invitedAt?: Date;
  confirmedAt?: Date;
  /** projects/{id}/commitments doc id this entry is derived from, if any.
   *  Used to upsert/match entries synced from the commitments pipeline
   *  without colliding with manually-entered cap-table rows. */
  commitmentId?: string;
  partyType?: CapitalPartyType;
}

// 2.5 Project-Specific Team Member (non-investor professionals)
export interface ProjectTeamMember {
  id: string;
  uid?: string; // null if invited but not yet registered
  email: string;
  phoneNumber?: string; // Optional contact phone number
  firm?: string; // Optional firm/company name
  displayName: string;
  projectRole: ProjectRole;
  permissions: ExternalAccessPermission; // Granular access gates
  assignedAt: Date;
  status: 'active' | 'invited' | 'removed';
}

// 2.6 Crowdfunding Invitation
export interface CrowdfundInvitation {
  id: string;
  projectId: string;
  projectName: string;
  email: string;
  proposedEquityPercent: number;
  proposedAmount: number;
  invitedByUid: string;
  invitedByName: string;
  token: string; // Unique token for the invite link
  status: 'pending' | 'accepted' | 'expired' | 'declined';
  createdAt: Date;
  expiresAt: Date;
}

// 2.6.4 Audit Log
export interface AuditLog {
  id: string;
  organizationId: string;
  actorUid: string;
  actorName: string;
  action: 'MEMBER_INVITED' | 'MEMBER_ROLE_CHANGED' | 'MEMBER_SUSPENDED' | 'MEMBER_REMOVED' | 'MEMBER_PERMISSIONS_CHANGED' | 'PROJECT_SCOPE_CHANGED';
  targetUid?: string;
  targetEmail?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// 2.6.5 Team Invitation
export interface TeamInvitation {
  id: string;
  token: string; // Unique token for the invite link
  organizationId: string;
  organizationName: string;
  email: string;
  role: InternalRole;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedByUid: string;
  invitedByName: string;
  createdAt: Date;
  expiresAt: Date;
  day3ReminderSent?: boolean;
  day6ReminderSent?: boolean;
  invitedToTaskId?: string;
  /** @deprecated use scopedProjectIds */
  invitedToProjectId?: string;
  /** Authoritative scoped project list — written at invite time */
  scopedProjectIds?: string[];
  /** true when an explicit project-scope restriction was configured */
  isScoped?: boolean;
  lastSentAt?: Date;
}

// ── Find & Fund Module Types ──────────────────────────

// 2.7 Historical Property (Track Record Ledger)
export interface HistoricalProperty {
  id: string;
  address: string;
  purchasePrice: number;
  salePrice: number;
  purchaseDate: Date;
  saleDate: Date;
  totalRehabCost: number;
  holdingCostTotal: number;
  netProfit: number; // Derived: salePrice - purchasePrice - totalRehabCost - holdingCostTotal
  notes: string;
}

// 2.8 Prospect Property (Active Prospecting Board)
export type ProspectStatus = 'Researching' | 'Offer Sent' | 'Counter' | 'Accepted' | 'Dead';

export interface ProspectProperty {
  id: string;
  address: string;
  askingPrice: number;
  estimatedARV: number;
  estimatedRepairs: number;
  maxOffer: number; // Auto-calc: 70% of ARV - estimatedRepairs
  status: ProspectStatus;
  syndicationEnabled: boolean; // Toggle to activate crowdfunding for this prospect
  offerLetters: OfferLetter[];
  fundingDeadline?: Date; // Deadline for investors to pledge
  notes: string;
  createdAt: Date;
}

// 2.9 Offer Letter (External Offer Tracking)
export type OfferLetterStatus = 'Draft' | 'Sent' | 'Countered' | 'Accepted' | 'Expired' | 'Withdrawn';

export interface OfferLetter {
  id: string;
  recipientName: string;
  offerAmount: number;
  sentDate: Date;
  expiresDate: Date;
  status: OfferLetterStatus;
  counterAmount?: number; // Populated if status === 'Countered'
  notes: string;
}

// 2.10 Funding Pledge (Investor Commitment Tracking)
export type PledgeStatus = 'pending' | 'committed' | 'confirmed' | 'rejected';

export interface FundingPledge {
  id: string;
  prospectId: string; // Ties to a ProspectProperty
  investorEmail: string;
  investorName: string;
  pledgeAmount: number;
  pledgeEquity: number; // Percentage
  pledgedAt: Date;
  deadline: Date;
  status: PledgeStatus;
  confirmedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

// ── LOI & Investor Commitment Types ───────────────────

// 2.11 LOI Status Lifecycle
export type LOIStatus = 'Drafted' | 'Sent' | 'Viewed' | 'Signed' | 'Declined';

// 2.12 LOI Document (Letter of Intent)
export interface LOIDocument {
  id: string;
  investorId: string;
  legalEntityName: string;
  investmentAmount: number;
  termLengthMonths: number;
  equitySplitPercent: number;
  interestRatePercent: number;
  status: LOIStatus;
  createdAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  signedAt?: Date;
  signatureDataUrl?: string; // Base64 signature
}

// 2.13 Investor Commitment (enriched for Syndication Engine)
export interface InvestorCommitment {
  id: string;
  investorName: string;
  investorEmail: string;
  pledgedAmount: number;
  loiStatus: LOIStatus;
  loiDocumentId?: string;
  previousDealCount: number; // Historical commitment count
  isReturning: boolean;
  invitedAt: Date;
  respondedAt?: Date;
}

// 2.14 Guest Portal Access Token
export interface GuestPortalToken {
  id: string;
  token: string;
  projectId: string;
  investorEmail: string;
  investorName: string;
  proposedAmount: number;
  equityPercent: number;
  loiDocumentId?: string;
  expiresAt: Date;
  createdAt: Date;
  status: 'active' | 'used' | 'expired';
}

export type CommitmentStatus = 
  | 'pledged'
  | 'transferred'
  | 'cleared'
  | 'soft-committed'
  | 'docs-out'
  | 'signed'
  | 'funds-confirmed';

export interface CommitmentTransition {
  fromStatus: CommitmentStatus | null;
  toStatus: CommitmentStatus;
  timestamp: string;
  actor: string;
  evidence?: string | null;
}

export interface Commitment {
  id: string;
  name: string;
  email?: string | null;
  amountCents: number;
  status: CommitmentStatus;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  transitions?: CommitmentTransition[];
  partyType?: CapitalPartyType;
}

// ── Acquisition & Due Diligence Module Types ──────────

export type LoanStatus = 'Application-Submitted' | 'Processing' | 'Appraisal-Ordered' | 'Appraisal-Received' | 'Conditions-Issued' | 'Conditions-Cleared' | 'Clear-To-Close' | 'Underwriting-Review' | 'Pre-Approved' | 'In-Underwriting';

export type NegotiationStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface Negotiation {
  id: string;
  offerAmount: number;
  counterOffer?: number;
  earnestMoneyDeposit: number;
  status: NegotiationStatus;
  date: Date;
  notes?: string;
}



export interface DueDiligenceItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: Date;
}

// 2.11 Cost Basis Line Item
export interface CostBasisLineItem {
  id: string;
  label: string;        // e.g. "Title Insurance", "Loan Origination Fee"
  amount: number;       // Dollar amount
  paid: boolean;        // Has this been settled?
  paidAt?: Date;
  notes: string;
}

// 2.12 Cost Basis Ledger (3-part capitalization tracker)
export interface CostBasisLedger {
  directAcquisition: CostBasisLineItem[];  // Purchase Price, Title Insurance, Legal Fees, Recording Taxes, Utility Setup
  financing: CostBasisLineItem[];          // Loan Origination, Points, Appraisal Fees, Mortgage Insurance
  preClosing: CostBasisLineItem[];         // Due Diligence (Inspections/Environmental), Prepaid Taxes/Interest
}

// 2.13 Role-Linked Document (Document Vault)
export type DocumentCategory =
  | 'Appraisal Report'
  | 'Inspection Report'
  | 'Title Commitment'
  | 'Survey'
  | 'Insurance Binder'
  | 'Loan Estimate'
  | 'Closing Disclosure'
  | 'Environmental Report'
  | 'Loan Processing Documents'
  | 'Real Estate Attorney Documents'
  | 'General Sale Disclosures'
  | 'Final Settlement Statement'
  | 'Deed'
  | 'Buyer Agreements'
  | 'Co-ownership Agreement'
  | 'Title Policy'
  | 'Closing Sets'
  | 'Warranties'
  | 'Tax Documents'
  | 'Proof of Funds'
  | 'Other';

export interface RoleLinkedDocument {
  id: string;
  category: DocumentCategory;
  fileName: string;
  fileUrl?: string;         // Upload URL (mock for now)
  linkedRole: ProjectRole;     // Which roster role is responsible
  uploadedByUid?: string;
  uploadedByName?: string;
  uploadedAt?: Date;
  verified: boolean;
  verifiedByUid?: string;
  verifiedAt?: Date;
  fileSize?: number;         // Size in bytes for usage tracking
  notes: string;
}

export interface ProofOfFundsStatusLog {
  status: 'requested' | 'received' | 'verified';
  updatedAt: string;
  updatedByUid: string;
  updatedByName: string;
}

export interface ProofOfFundsStatus {
  id: string;
  sourceName: string;
  amount: number;
  status: 'requested' | 'received' | 'verified';
  documentId?: string | null;
  documentName?: string | null;
  documentUrl?: string | null;
  verifiedByUid?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  plaidAccountName?: string | null;
  plaidBalance?: number | null;
  plaidLastSync?: string | null;
  history: ProofOfFundsStatusLog[];
}

export type PhaseStatus =
  | 'Phase 1: Acquisition'
  | 'Phase 2: Fund'
  | 'Phase 3: Hold'
  | 'Phase 4: Exit';


// ── REIL v2 Types ──────────────────────────────────────────

export interface TransactionVendorAssignment {
  vendorType: 'real_estate_lawyer' | 'loan_processor';
  vendorId: string;
  assignedAt: any;
  status: string;
}

export interface ProjectTransaction {
  financingType?: 'Financed' | 'All Cash';
  closingCosts?: number;
  totalCashInvested?: number;
  loanProcessorName?: string;
  closingAttorneyName?: string;
  inspectionCost?: number;
  titleSearchCost?: number;
  insuranceCost?: number;
  hoaMonthly?: number;
  vendorAssignments?: TransactionVendorAssignment[];
}

export interface RehabLineItem {
  label: string;
  amount: number;
  tier: 'Staging' | 'Minor' | 'Rehab' | 'Gut' | 'Construction';
  vendor: string;
  status: string;
  photos: string[];
  receipts: string[];
}

export interface RehabVendorAssignment {
  vendorType: 'general_contractor' | 'specialty_contractor';
  vendorId: string;
  assignedAt: any;
  status: string;
}

export interface ProjectRehab {
  lineItems?: RehabLineItem[];
  vendorAssignments?: RehabVendorAssignment[];
  tier?: 'Staging' | 'Minor' | 'Rehab' | 'Gut' | 'Construction';
  startDate?: any;
  completedDate?: any;
  versionHistory?: any[];

  // Legacy fields from RehabModule to prevent typescript compile errors in workspaces
  scopeOfWork?: any[];
  contractorBids?: any[];
  drawSchedule?: any[];
  currentStage?: string;
  baseBudget?: number;
  contingencyBufferPercentage?: number;
  tasks?: any[];
  permits?: any[];
  pendingReceipts?: any[];
  drawRequests?: any[];
}

export interface OtherHoldCost {
  label: string;
  amount: number;
}

export interface HoldCostPeriod {
  period: string; // YYYY-MM
  phaseAtPeriod: 'acquisition' | 'transaction' | 'rehab' | 'hold_exit';
  insurance: number;
  propertyTax: number;
  maintenance: number;
  housekeeping: number;
  utilities: number;
  hoa: number;
  debtService: number;
  otherCosts: OtherHoldCost[];
  total: number;
}

export interface ProjectHoldCost {
  periods: HoldCostPeriod[];
}

export interface SaleData {
  salePrice: number;
  saleDate: string;
  sellingCosts: number;
}

export interface StabilizedRevenue {
  period: string;
  modality: string;
  grossRevenue: number;
}

export interface ExitModalitySpecificFields {
  monthlyRent?: number;
  leaseTerm?: number | string;
  tenantId?: string;
  nightlyRate?: number;
  occupiedNights?: number;
  totalNights?: number;
  platform?: 'airbnb' | 'vrbo' | 'both';
  salePrice?: number;
  saleDate?: string;
  sellingCosts?: number;
  monthlyLease?: number;
  lesseeId?: string;
}

export interface ExitModalityPeriod {
  period: string;
  modality: 'sale' | 'long_term_rental' | 'lease' | 'short_term_rental' | 'none';
  modalityStartDate: string;
  modalitySpecificFields: ExitModalitySpecificFields;
}

export interface ProjectExit {
  currentModality: 'sale' | 'long_term_rental' | 'lease' | 'short_term_rental' | 'none';
  modalityHistory: ExitModalityPeriod[];
  sale: SaleData | null;
  stabilizedRevenue: StabilizedRevenue[];
}

export interface DataCompletionTask {
  taskId: string;
  projectId: string;
  assignedToUserId: string;
  fieldPath: string;
  expectedFrequency: 'monthly' | 'one_off';
  lastSatisfiedAt: any;
  nextDueAt: any;
  missedCount: number;
  escalationLevel: 'none' | 'warning' | 'alert';
}


// Phase 1: Mandatory Document Checklist (Purchase Readiness)
export type PurchaseReadinessItemType = 'Operating Agreement' | 'Proof of Funds' | 'Title Commitment' | 'Entity Documents (LLC/Inc)';

export interface PurchaseReadinessItem {
  id: string;
  type: PurchaseReadinessItemType | string;
  completed: boolean;
  completedAt?: Date;
  completedByUid?: string;
  documentUrl?: string; // Uploaded proof
  fileSize?: number;    // Size in bytes
  notes: string;
}

export type ContingencyType = string;

export interface Contingency {
  id: string;
  type: ContingencyType;
  deadlineDate: Date;
  isWaived: boolean;
  isSatisfied: boolean;
  notes?: string;
  party?: string;
  reminderSettings?: string[];
  satisfiedDocUrl?: string;
  satisfiedDocName?: string;
  explicitConfirmation?: boolean;
}

// 3. Project Container Schema
export interface Project {
  id: string; // Document ID
  organizationId: string; // REQUIRED: Maps project to exactly one tenant for B2B data isolation
  propertyName: string;
  address: string;
  zip?: string;
  phase?: string;
  name?: string;
  numberOfUnits?: number;
  occupiedUnits?: number;
  squareFootage?: number; // Core metric for sqft-based reporting
  status: ProjectPhaseKey;
  retrospective?: boolean;
  dispositionType?: 'SALE' | 'LEASE' | 'RENT';
  dispositionMode?: string;
  city?: string;
  state?: string;
  entryStage?: string;
  lastActiveStage?: string;
  overrideReason?: string;
  propertyType?: string;
  units?: number;
  condition?: string;
  phaseStatus?: PhaseStatus; // High-level horizontal phase tracker
  subStrategy?: 'FLIP' | 'WHOLESALE' | 'BUILD_SELL' | 'LONG_TERM' | 'SHORT_TERM' | 'MID_TERM' | 'BRRRR' | 'NNN' | 'GROUND' | 'LEASE_OPTION';
  holdHorizon?: number;
  exitAssumption?: string;
  assetClass?: 'Residential' | 'Multi-Family' | 'Commercial' | 'Land';
  latitude?: number;
  longitude?: number;

  // AQ-5 Source Card
  leadSource?: string;
  listingUrl?: string;
  askingPriceCents?: number;
  subjectDom?: number;
  leadAgent?: string;
  dateIdentified?: string | Date;

  // AQ-5 Seller Card
  sellerName?: string;
  sellerType?: string;
  sellerMotivation?: string;
  sellerContact?: string;

  // AQ-5 Market Card
  submarket?: string;
  medianSalesPriceCents?: number;
  medianRentCents?: number;
  marketVacancyRate?: number;
  hazardFlag?: boolean;
  hazardNote?: string;

  // AQ-6 First-Pass Screen
  firstPassRentCents?: number;
  firstPassVerdict?: string;

  // AQ-7 Comps & ARV
  arv?: number;
  arvCents?: number;
  comps?: any[];
  leadEmail?: string;
  partnerEmails?: string;
  vision?: string;
  yearBuilt?: number;
  members: Record<string, ProjectMember>; // Map of user UIDs to their role in the project
  financials: ProjectFinancials;
  closingRoom?: ClosingRoom;
  fractionalInvestors?: FractionalInvestor[]; // Phase 8 addition
  projectTeam?: ProjectTeamMember[]; // Phase 9: Project-specific professional assignments
  historicalProperties?: HistoricalProperty[]; // Find & Fund: Track Record Ledger
  prospects?: ProspectProperty[]; // Find & Fund: Active Prospecting Board
  pledges?: FundingPledge[]; // Find & Fund: Investor Pledges
  loiDocuments?: LOIDocument[]; // Find & Fund: LOI Workflow
  investorCommitments?: InvestorCommitment[]; // Find & Fund: Syndication Engine
  guestPortalTokens?: GuestPortalToken[]; // Find & Fund: Guest Portal Access
  
  // Phase 1 Purchase Readiness Checklist
  purchaseReadinessChecklist?: PurchaseReadinessItem[];
  
  // Acquisition & Due Diligence
  costBasisLedger?: CostBasisLedger; // Acquisition: Capitalization tracker
  roleLinkedDocuments?: RoleLinkedDocument[]; // Acquisition: Document vault
  loanStatus?: LoanStatus; // Financing status tracker
  negotiations?: Negotiation[]; // Phase 2: Negotiation history
  contingencies?: Contingency[]; // Phase 2: Due Diligence contingencies
  dueDiligenceChecklist?: DueDiligenceItem[]; // Phase 2: Due Diligence Checklist
  closingChecklist?: ClosingChecklistItem[]; // Phase 2: Closing Checklist
  isClearToClose?: boolean; // Milestone gate
  closingTimeline?: ClosingMilestone[]; // Card F5.1: Closing timeline milestones
  closingTimelineTemplate?: 'financed_conventional' | 'cash_hard_money' | 'sba' | null; // Card F5.1: Active template type  
  currentPhase?: number;
  scenarioId?: string;             // Multi-scenario analysis: conservative / base / aggressive underwriting
  transaction?: ProjectTransaction;
  rehab?: ProjectRehab;
  holdCost?: ProjectHoldCost;
  exit?: ProjectExit;

  // FD-3 Fund Data Plane
  fundingPlan?: FundingPlan;
  equityParties?: EquityParty[];
  loans?: LoanRecord[];
  contributions?: ContributionEntry[];
  closingRecord?: ClosingRecord;
  titleHolding?: TitleHolding;
  completedFundCards?: string[];
  termsLocked?: boolean;
  termsLockedAt?: string;
  termsLockedBy?: string;
  proofOfFunds?: ProofOfFundsStatus[];
  
  propertyFacts?: {
    beds?: number;
    baths?: number;
    sqft?: number;
    propertyType?: string;
    estRentCents?: number;
    listPriceCents?: number;
    [key: string]: any;
  };

  actionItems?: any[]; // Persistent storage for ProjectTodoList tasks
  lenderVaultDocuments?: {
    id: string;
    name: string;
    status: 'pending' | 'verified';
    fileUrl?: string;
    storagePath?: string;
    uploadedAt?: string;
  }[];

  // Phase 4 Exit & Settlement
  settlementDocuments?: SettlementDocument[]; // HUD-1, Closing Disclosures

  locked?: boolean; // Global read-only lock after closure
  lastSyncedAt?: string | Date;
  valueSyncedAt?: string | Date;
  rentSyncedAt?: string | Date;
  marketSyncedAt?: string | Date;
  createdAt: Date;
  updatedAt: Date;
  lastPhaseTransitionAt?: Date; // Phase 6: Tracks time spent in a specific lifecycle state
  ownerUid: string; // The person who created the project
  documentHubFolderId?: string; // Google Drive folder link for compliance hub

  // AQ-27 Marketplace Posting
  activeListingId?: string; // Back-reference to the active DealListing document ID
}

export interface ProjectMember {
  uid: string;
  role: Role | string;
  projectPermissions?: Permission[]; // RBAC: Denormalized project-level permissions
  joinedAt: Date;
}

export interface CostEntry {
  id: string;
  description: string;
  amount: number;
  approved: boolean; // Must be true to reflect in ROI globally
  addedBy: string; // UID
  createdAt: Date;
  // Phase 6 Additions
  category?: 'Plumbing' | 'Electrical' | 'Framing' | 'HVAC' | 'Foundation' | 'Other';
  receiptUrl?: string; // Digital proof uploaded by GC
  status?: 'Pending Triage' | 'Approved' | 'Rejected'; // Escrow ledger state
}

// Sub-Collection Model: projects/{projectId}/ledgerItems/{itemId}
// Replaces flat arrays for massive transaction scalability
export interface LedgerItem {
  id: string; // Sub-document ID
  projectId: string; // Reference to parent project
  organizationId: string; // Partitions sub-collection records globally against B2B leakage
  type: 'expense' | 'receipt' | 'budget_line';
  category: 'Plumbing' | 'Electrical' | 'Framing' | 'HVAC' | 'Foundation' | 'General' | 'Other';
  description: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedByUid: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Sub-Collection Model: projects/{projectId}/privateFinancials/summary
// Securely isolates sensitive aggregate data from Contractor-level reads.
// Firestore cannot redact individual fields on a document read, so this
// sub-collection is the structural workaround for True Field-Level Security.
// Access via: projects/{projectId}/privateFinancials/summary
export interface PrivateFinancials {
  netProfit: number; // Realized or projected net profit
  costOfCapital: number; // Total financing burden (interest + origination)
  projectedROI: number; // (netProfit / totalInvestment) * 100
  totalApprovedCosts: number; // Sum of all Approved LedgerItems
  totalInvestment: number; // purchasePrice + totalApprovedCosts
  lastCalculatedAt: Date;
}

export interface RehabTask {
  id: string;
  title: string;
  category: 'Plumbing' | 'Electrical' | 'Framing' | 'HVAC' | 'Foundation' | 'Other';
  status: 'Pending' | 'In Progress' | 'Complete';
  estimatedCost: number;
  actualCost?: number;
  afterPhotoUrl?: string; 
  escrowDrawRequested?: boolean; // Automates draw request alert when Complete
}

export interface BuildingPermit {
  id: string;
  type: string; // e.g. "Structural", "Electrical"
  status: 'Pending' | 'Approved' | 'Rejected';
  filedAt: Date;
  updatedAt?: Date;
}

export type InspectionStatus = 'Pending' | 'Pass' | 'Fail' | 'Needs Negotiation';

export interface InspectionItem {
  id: string;
  category: string;
  status: InspectionStatus;
  notes: string;
  estimatedCost?: number;
  actualCost?: number;
  loggedBy?: string; // UID
}

export interface InspectionFinding {
  id: string;
  system: string; // e.g. Roof, HVAC, Electrical, Plumbing, Structural, Other
  severity: 'Critical' | 'Major' | 'Minor';
  repairCost: number; // in dollars
  notes?: string;
}

export interface TitleLienException {
  id: string;
  description: string;
  status: 'Resolved' | 'Outstanding' | 'Escrow Hold';
}

// ── Title Search Checklist ─────────────────────────────────────
// Promoted from TitleSearchClearance.tsx to allow Firestore persistence + type-sharing.
export type ClearanceStatus = 'Pending' | 'In Review' | 'Cleared' | 'Issue Found';

export interface TitleCheckItem {
  id: string;
  name: string;
  status: ClearanceStatus;
  notes?: string;
  /** UID of the team member who last set this to Cleared / Issue Found */
  clearedByUid?: string;
  /** Display name of that member */
  clearedByName?: string;
  /** ISO 8601 timestamp when the status was last changed to a terminal state */
  clearedAt?: string;
}

export interface TitleCommitmentData {
  policyAmount: number;
  effectiveDate: string;
  exceptionsCount: number;
  commitmentDocumentUrl?: string | null;
  commitmentDocumentName?: string | null;
}

export interface TitleDefect {
  id: string;
  description: string;
  status: 'pending' | 'resolved';
  resolvedAt?: string;
  resolvedByUid?: string;
  resolvedByName?: string;
  notes?: string;
  documentUrl?: string | null;
  documentName?: string | null;
}

export interface TitleWorkflowState {
  status: 'order_opened' | 'commitment_received' | 'defects_identified' | 'cleared';
  orderOpenedAt?: string;
  orderOpenedByUid?: string;
  orderOpenedByName?: string;
  commitment?: TitleCommitmentData;
  defects?: TitleDefect[];
  clearedAt?: string;
  clearedByUid?: string;
  clearedByName?: string;
}

export interface ClosingRoom {
  titleInsuranceUrl: string | null;
  closingDisclosureUrl: string | null;
  wiringInstructionsUrl: string | null;
  assignedLawyerUid: string | null;
  lawyerVerified: boolean;
  blockchainTxHash: string | null;
  chainOfTitleStatus: 'pending' | 'verified' | 'failed';
  verifiedByUid?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  verifiedRole?: string | null;
  /** Per-check title clearance status, persisted to Firestore, attributed per member */
  titleChecks?: TitleCheckItem[];
  titleWorkflow?: TitleWorkflowState;
  cdFinalClosingCosts?: number | null;
  cdCashToClose?: number | null;
  cdPrepaidsReserves?: number | null;
  cdSourceDocumentUrl?: string | null;
  cdSourceDocumentName?: string | null;
  cdCapturedAt?: string | null;
  cdCapturedByUid?: string | null;
  cdCapturedByName?: string | null;
  reconciliationOverrideReason?: string | null;
  isReconciliationOverridden?: boolean;
  // Card F5.5 — Closing execution & recording
  actualClosingDate?: string | null;
  closingStatus?: 'pending' | 'signed' | 'completed' | null;
  isClosingExecuted?: boolean;
  executedDocs?: {
    deedUrl?: string | null;
    deedSigned?: boolean;
    noteUrl?: string | null;
    noteSigned?: boolean;
    settlementStatementUrl?: string | null;
    settlementStatementSigned?: boolean;
    titlePolicyUrl?: string | null;
    titlePolicySigned?: boolean;
    entityDocsUrl?: string | null;
    entityDocsSigned?: boolean;
  } | null;
  disbursementRecorded?: boolean;
  disbursementStatementUrl?: string | null;
  deedRecordingCounty?: string | null;
  deedRecordingDate?: string | null;
  deedRecordingInstrumentNumber?: string | null;
}
export type LeadSource =
  | 'Wholesaler'
  | 'MLS'
  | 'REO'
  | 'Direct Mail'
  | 'Auction'
  | 'Probate'
  | 'Driving for Dollars'
  | 'Referral'
  | 'Manual';

export interface ComparableSale {
  id: string;
  address: string;
  soldPrice: number;
  distanceMiles: number;
  daysOnMarket: number;
}

export interface DistressedIndicators {
  absenteeOwnership: boolean;
  preForeclosure: boolean;
  liensPresent: boolean;
  vacantStatus: boolean;
  highTurnoverSalesHistory: boolean;
}

export type FundingCategory = 'Hard Money Loans' | 'Private Money' | 'Conventional Financing' | 'SBA 504 Bank First Lien' | 'SBA 504 CDC Debenture' | 'Bridge Loans' | 'Borrower Injection' | 'Co-buying Equity' | 'Syndication Equity' | 'GP Co-investment';
export type FundingSourceStatus = 'Exploring' | 'Pre-Approved' | 'Applied' | 'Approved' | 'Funded' | 'Declined';

export interface CapitalSource {
  id: string;
  category: FundingCategory;
  amount: number;
  interestRate: number; // e.g., 12 for 12%
  // Optional enrichment fields (added by FundingSourceTracker)
  lenderName?: string;
  termMonths?: number;
  status?: FundingSourceStatus;
  notes?: string;

  // FD-3 fields (integrated type-safely)
  type?: CapitalSourceType;
  amountCents?: number;
  seniority?: number; // 1 = senior, 2 = junior, 3 = equity
}

// ── R3 Hold Agent — Rehab Tier Classification ─────────────
export type RehabTier =
  | 'Stage'                  // $1k–$5k
  | 'Refurbish'              // $5k–$20k
  | 'Renovate'               // $20k–$100k
  | 'Gut'                    // $100k–$250k
  | 'Develop';               // $250k+ // $150k+

// R3 Hold Agent — Field-level edit history for versioned data
export interface HoldEditHistoryEntry {
  field: string;
  oldValue: any;
  newValue: any;
  editedAt: Date;
  editedByUid: string;
}

export interface InsuranceQuote {
  id: string;
  carrier: string;
  policyType: string;
  premium: number;
  monthlyPremium: number;
  coverageLimit: number;
  liabilityLimit: number;
  lossOfRentLimit: number;
  hasFloodWindRider: boolean;
  documentUrl?: string;
  documentName?: string;
  isAccepted?: boolean;
}

/** Structured vendor assignment for F4 team slots */
export interface F4VendorAssignment {
  name: string;
  firm?: string | null;
  phone?: string | null;
  email?: string | null;
  /** How this vendor was assigned */
  source: 'marketplace' | 'off_platform' | 'carried_forward';
  /** Marketplace vendor profile ID if assigned from directory */
  marketplaceVendorId?: string | null;
  assignedAt: string;
  assignedBy: string;
}

/**
 * Card F4.3 — RFP Bid
 *
 * Stored at projects/{projectId}/rfpBids/{bidId}.
 * Each bid links to a vendorAssignment doc and groups under a shared rfpId
 * so bids for the same slot+round can be compared side-by-side.
 */
export interface F4RfpBid {
  id: string;
  /** Shared ID grouping all bids for the same slot+round */
  rfpId: string;
  /** Which F4 team slot this bid is for (e.g. 'f4AppraiserVendor') */
  slotKey: string;
  vendorUid: string;
  vendorName: string;
  vendorCompanyName: string;
  /** Quoted fee — null until vendor responds */
  price: number | null;
  /** Estimated turnaround in days — null until vendor responds */
  turnaroundDays: number | null;
  /** Vendor scope notes / clarification */
  notes: string;
  status: 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  /** Link to the vendorAssignments doc that was created */
  assignmentId: string;
  createdAt: any;
  quotedAt?: any;
  acceptedAt?: any;
}

export interface ProjectFinancials {
  purchasePrice: number;
  estimatedARV: number; // After-Repair Value (canonical field)
  leaseStartDate?: Date;
  arv?: number;         // Shorthand alias — calculation components may write here; consumers should prefer estimatedARV
  listedPrice?: number; // Current Listed Price (if applicable)
  costs: CostEntry[]; // Ledger of costs
  offer_price?: number; // solved offer price in cents
  scorecardAcknowledged?: boolean;
  acknowledgedInputsHash?: string;
  finalAgreedPrice?: number;
  fundingType?: 'Solo' | 'Syndicated';
  psaDocumentUrl?: string;
  psaDocumentName?: string;
  annualDebtService?: number | null;
  sourceTags?: Record<string, 'document' | 'manual' | 'user_actual' | 'user_assumption' | 'derived' | 'plaid' | null> | null;

  // Phase-specific fields (Project lifecycle spine)
  targetPurchasePrice?: number;
  capitalRaiseTarget?: number;
  committedCapital?: number;
  actualRehabCost?: number;
  rehabBudget?: number;
  rehabActual?: number;
  rehabDoneDate?: any;
  actualRentalIncome?: number;
  daysOccupied?: number;
  totalHoldDays?: number;

  // Phase 1 Deal Analyzer — Sourcing intelligence
  acquisitionDate?: Date;          // Explicit close/acquisition date for timeline tracking
  estimatedCloseDate?: Date;       // Expected or target close date
  fixedAcquisitionCosts?: number; // Buy-side closing costs deducted in MAO formula
  
  // FD-3 target/projected dual-slots
  targetDownPaymentPercent?: number;
  targetLoanAmount?: number;
  targetLoanInterestRate?: number;
  targetLoanTermYears?: number;
  targetLoanOriginationPoints?: number;
  targetClosingCosts?: number;
  targetTotalCashInvested?: number;
  upfrontRehab?: number;
  actualCommissions?: number;

  comparableSales?: ComparableSale[];
  leadSource?: LeadSource;
  sellerMotivation?: string;
  emdAmount?: number;
  emdGoHardDate?: Date;
  emdClearedDate?: Date;
  emdVerified?: boolean;
  distressedIndicators?: DistressedIndicators;
  offerStatus?: 'Draft' | 'Sent' | 'Countered' | 'Accepted' | 'Expired' | 'Withdrawn' | 'No' | 'Drafting' | 'Offer Sent' | 'Rejected' | 'Pending';
  counterPriceCents?: number;
  counterTerms?: string;
  offerRationale?: string;
  loiBuyerEntity?: string;
  loiEarnestAmount?: number;
  loiRefundable?: boolean;
  loiDueDiligenceDays?: number;
  loiClosingDays?: number;
  loiContingencies?: string[];
  loiExclusivity?: boolean;
  loiExclusivityDays?: number;
  loiExpiration?: string;
  loiAssignability?: boolean;
  loiNonBinding?: boolean;
  loiUrl?: string;
  counterOffers?: any[];
  
  // Stage 5 PSA & Earnest Money tracking
  psaEffectiveDate?: string;
  psaContractPrice?: number;
  psaContingencies?: string[];
  psaDdEndDate?: string;
  psaClosingDate?: string;
  psaAssignability?: string;
  psaSellerDeliverablesChecklist?: { text: string; checked: boolean }[];
  emdEscrowHolder?: string;
  emdDueDate?: string;
  emdRefundableUntilDate?: string;
  emdIsHardDeposit?: boolean;
  emdReceiptUrl?: string;
  emdReceiptName?: string;
  
  // Stage 5 Due Diligence: Inspection
  inspectionInspector?: string;
  inspectionDate?: string;
  inspectionFindings?: InspectionFinding[];
  inspectionReferrals?: string[];
  inspectionReportUrl?: string;
  inspectionReportName?: string;
  inspectionPhotosUrl?: string;
  inspectionPhotosName?: string;
  inspectionDecision?: 'proceed' | 'renegotiate' | 'walk' | '';
  inspectionNote?: string;

  // Stage 5 Due Diligence: Title
  titleCompany?: string;
  titleCommitmentDate?: string;
  titleVestingConfirmed?: boolean;
  titleLiensLog?: TitleLienException[];
  titleStatus?: 'clear' | 'curative' | 'defective';
  titleOwnersPolicyOrdered?: boolean;
  titleCommitmentUrl?: string;
  titleCommitmentName?: string;

  // Stage 5 Due Diligence: Conditional DD Framework (AQ-21)
  hasHOA?: boolean;

  // Survey
  surveyElected?: boolean;
  surveyVendor?: string;
  surveyOrderedDate?: string;
  surveyCompletedDate?: string;
  surveyFindings?: string;
  surveyDocumentUrl?: string;
  surveyDocumentName?: string;
  surveyWaived?: boolean;
  surveyWaiverReason?: string;

  // Phase I Environmental (ESA)
  phaseIElected?: boolean;
  phaseIVendor?: string;
  phaseIOrderedDate?: string;
  phaseICompletedDate?: string;
  phaseIFindings?: string;
  phaseIDocumentUrl?: string;
  phaseIDocumentName?: string;
  phaseIWaived?: boolean;
  phaseIWaiverReason?: string;

  // HOA Review
  hoaElected?: boolean;
  hoaVendor?: string;
  hoaOrderedDate?: string;
  hoaCompletedDate?: string;
  hoaRentalRestrictionsExist?: boolean;
  hoaRentalRestrictionsDetails?: string;
  hoaDocumentUrl?: string;
  hoaDocumentName?: string;
  hoaWaived?: boolean;
  hoaWaiverReason?: string;

  // Attorney Review
  attorneyElected?: boolean;
  attorneyVendor?: string;
  attorneyOrderedDate?: string;
  attorneyCompletedDate?: string;
  attorneyFindings?: string;
  attorneyDocumentUrl?: string;
  attorneyDocumentName?: string;
  attorneyWaived?: boolean;
  attorneyWaiverReason?: string;
  
  // Zoning & CO (AQ-22)
  zoningClassification?: string;
  zoningIntendedUsePermitted?: boolean;
  zoningVerificationLetterUrl?: string;
  zoningVerificationLetterName?: string;
  zoningCoStatus?: string;
  zoningCoDocumentUrl?: string;
  zoningCoDocumentName?: string;
  zoningPermitHistory?: string;
  zoningViolations?: string;

  // Insurance Quotes (AQ-22)
  insuranceCarrier?: string;
  insurancePolicyType?: string;
  insuranceQuotes?: InsuranceQuote[];
  
  // Card F4.4 — Insurance binder fields
  insuranceBinderUrl?: string | null;
  insuranceBinderName?: string | null;
  insuranceBinderEffectiveDate?: string | null;
  hasFloodRider?: boolean;
  hasEarthquakeRider?: boolean;
  floodZone?: string | null;
  earthquakeZone?: string | null;
  insuranceZoneDetermination?: string | null;
  
  // Equity Valuation Tracker
  estimatedCurrentValue?: number;
  estimatedExistingDebt?: number;
  
  // Evaluation & Capital Financing
  capitalStack?: CapitalSource[];
  loanAmount?: number; // Hard money loan amount
  loanInterestRate?: number; // e.g., 12 for 12%
  loanTermYears?: number; // Loan term in years, e.g. 30 for a 30-year conventional
  loanOriginationPoints?: number; // Upfront percentage cost of loan value
  downPaymentPercent?: number;
  estimatedTimelineDays?: number; // Estimation for holding costs
  /** Timeline template: 'standard' for conventional, 'compressed' for hard money / bridge routes */
  timelineTemplate?: 'standard' | 'compressed' | null;
  preApprovalDocuments?: string[]; // Array of strings/URLs
  inspections?: InspectionItem[]; // Virtual Inspection Estimate vs Actual

  // Phase 6 Field Management
  projectedRehabCost?: number; // Budget target for rehab
  maxOffer?: number; // Maximum allowable purchase price (70% rule output)
  rehabTasks?: RehabTask[];
  permits?: BuildingPermit[];

  // Phase 7 The Exit & Taxes
  actualSalePrice?: number;
  buyersAgentCommission?: number; // Represented as a percentage, e.g. 3 for 3%
  sellersAgentCommission?: number; // Represented as a percentage, e.g. 3 for 3%
  finalClosingCosts?: number; // Fixed dollar amount
  finalCashToClose?: number;
  finalPrepaidsReserves?: number;
  totalHoldingCosts?: number; // Accumulated holding costs
  listingDate?: Date;   // Date the property was listed on MLS — used for exact DOM calculation
  soldDate?: Date;
  mlsNumber?: string; // Added for CRM-lite tracker
  numberOfShowings?: number; // Added for CRM-lite tracker
  openHouseFeedback?: string; // Added for CRM-lite tracker
  stagingCosts?: number; // Added for Disposition Ledger
  photographyAndMedia?: number; // Added for Disposition Ledger
  mlsListingFees?: number; // Added for Disposition Ledger
  utilityUpkeep?: number; // Final expense tracker
  landscapingMaintenance?: number; // Final expense tracker
  stagingAndMarketingCosts?: number; // Derived/Fixed total
  agentCommissionsFixed?: number; // Fixed dollar amount for Phase 4 UX
  sellerConcessionsFixed?: number; // Fixed dollar amount for Phase 4 UX

  // Phase 10 / UX Phase 4 Fork
  exitStrategyType?: 'Sell' | 'Rent';
  projectedMonthlyRent?: number;
  vacancyRate?: number; // percentage e.g., 5 for 5%
  maintenanceReserves?: number; // per month
  propertyManagementFee?: number; // per month (fixed amount)
  propertyManagementFeePercent?: number; // percentage e.g., 10 for 10%
  propertyManagerName?: string;
  propertyManagerPhone?: string;
  propertyManagerEmail?: string;
  leasingFee?: number; // up-front leasing fee / tenant placement fee
  longTermMortgagePayment?: number; // per month
  occupancyRate?: number;
  grossRentMultiplier?: number;
  projectedMonthlyRentSource?: string;

  // Supplemental metrics fields
  capitalReserves?: number;
  tenantTurnoverRate?: number;
  leaseRenewalRate?: number;
  numberOfMoveOuts?: number;
  numberOfRenewals?: number;
  daysOnMarket?: number;


  // Deal Calculator Detailed Fields
  grossIncomeBaseRent?: number;
  grossIncomeParking?: number;
  grossIncomeLaundry?: number;
  operatingExpenseTaxes?: number;
  operatingExpenseInsurance?: number;
  financingCashInvested?: number;
  financingDebtService?: number;

  // Rental Income Inputs (needed for NOI calculation — CCIM / NARPM conventions)
  monthlyGrossRent?: number;             // Scheduled gross monthly rent
  otherMonthlyIncome?: number;           // Parking, laundry, storage, etc.
  vacancyRatePercent?: number;           // 0–100, default 7%
  monthlyMaintenanceReserve?: number;    // Fixed monthly maintenance/CapEx reserve
  maintenanceCapExPercent?: number;      // Maintenance as % of gross rent (0–100); when present, overrides monthlyMaintenanceReserve
  monthlyHOA?: number;                   // HOA fees if applicable
  numberOfUnits?: number;                // Total leasable units
  occupiedUnits?: number;                // Currently occupied units
  annualRentGrowthPercent?: number;      // YoY rent growth tracking
  marketRentComparable?: number;         // Market rent for comparable units ($/mo)
  amortizationYears?: number;            // Loan amortization term in years
  annualAppreciationPercent?: number;    // Estimated annual property appreciation

  // Canonical Group 2/3 Variables (reil-registry.md)
  gross_rent_per_unit?: number;
  vacancy_pct?: number;
  other_income?: number;
  tax?: number;
  insurance?: number;
  security?: number;
  maintenance?: number;
  maintenance_pct?: number;
  utilities?: number;
  management?: number;
  management_pct?: number;
  HOA?: number;
  capex?: number;
  unitRents?: number[];
  taxBillUrl?: string;
  t12Url?: string;


  // Holding Costs Calculator
  projectedHoldTimeMonths?: number;
  holdingCostTaxes?: number; // per month
  holdingCostInsurance?: number; // per month
  holdingCostUtilities?: number; // per month

  // Phase 4 Exit Dashboard — Settlement & Tax
  settlementLedger?: SettlementLineItem[];
  proratedEscrow?: ProratedEscrowItem[];
  taxEstimate?: TaxEstimate;
  marginalTaxBracket?: number; // user-supplied marginal rate, e.g. 32 for 32%
  
  // Debt Service Payoffs (Settlement Ledger)
  hardMoneyPrincipalPayoff?: number;
  privateLenderPayoff?: number;
  finalClosingAttorneyFees?: number;
  loanOriginationFeesSettlement?: number;
  titleInsuranceSettlement?: number;
  
  // Phase 2 Capitalized Basis
  initialCapitalizedBasis?: number;

  // Derived / Calculated Final Metrics (Phase 4)
  totalAllInCost?: number;
  netRealizedProfit?: number;
  netOperatingIncome?: number;
  netCashFlow?: number;
  capRate?: number;
  cashOnCashReturn?: number;
  closedOutcome?: 'won' | 'lost'; // Explicit performance outcome tracked post-closing

  // Projected Underwriting Fields (Phase 1 Acquisition Guided Interview)
  targetPrice?: number;
  projectedRent?: number;
  projectedSalePrice?: number;
  projectedOpex?: number;
  raiseTarget?: number;
  equitySplit?: number;
  investorInvites?: string[];
  marketplaceListing?: boolean;
  offerAmount?: number;
  offerDate?: any; // Can be Date, string, or firestore Timestamp

  // Phase 2 Purchase Actuals (Guided Interview)
  financingType?: 'Financed' | 'All Cash'; // Router — gates loan questions; prevents DSCR divide-by-zero for all-cash
  closingCosts?: number;                    // Total buy-side closing costs (title, escrow, recording, transfer tax)
  totalCashInvested?: number;               // Down payment + closing costs — drives D4 CoC Return, D7 IRR (t₀)
  loanProcessorName?: string;               // Vendor assignment: loan processor / loan officer
  closingAttorneyName?: string;             // Vendor assignment: real estate closing attorney

  // Card F2.2 — Title holding (co-buy)
  titleHolding?: 'TIC' | 'JTWROS';
  titleHoldingDerived?: boolean;
  titleCoOwnershipAgreementUrl?: string | null;
  titleCoOwnershipAgreementName?: string | null;
  titleCoOwnershipAgreementStatus?: 'unsigned' | 'docs-out' | 'signed' | 'verified';

  // R2 Purchase Diligence — Optional cost tracking
  inspectionCost?: number;                  // Licensed home inspection fee
  titleSearchCost?: number;                 // Title search & commitment fee
  insuranceCost?: number;                   // Annual hazard insurance premium
  hoaMonthly?: number;                      // Monthly HOA/condo fees (if applicable)

  // Phase 4 Exit Realized Fields
  exitType?: 'Sale' | 'Stabilization' | 'Refinance';
  sellingCosts?: number;
  isStabilized?: boolean;
  stabilizationDate?: any;
  refiLoanAmount?: number;
  refiInterestRate?: number;
  refiLoanTermYears?: number;
  refiCashOut?: number;
  refiDate?: any;
  isRefinanced?: boolean;

  // R0 — Ownership & Capital Structure
  ownershipPercentage?: number;           // 0-100, default 100. Reduced by crowdfund commitments.
  ownerCashInvested?: number;             // Actual cash the owner put in (may differ from totalCashInvested)
  entryPath?: 'new_acquisition' | 'already_owned' | 'backdated';

  // R3 — Hold Agent: Rehab Tier & Extended Holding Costs
  rehabTier?: RehabTier;                  // Selected rehab scope classification
  renovation_tier?: RehabTier;            // Declared renovation tier
  rehabTierBudgetLow?: number;            // Auto-populated template low-end for selected tier
  rehabTierBudgetHigh?: number;           // Auto-populated template high-end for selected tier
  rehab_budget?: number;                  // Declared renovation budget (cents)
  rehab_completion_target?: any;           // Target renovation completion date
  rehab_contractors?: Record<string, F4VendorAssignment | null>; // Contractor slots per tier
  rehab_spend?: RehabSpendEntry[];        // running log of renovation spend
  rehab_completed_date?: any;             // Actual renovation completion date
  rehab_spend_total?: number;             // Actual final spend total (cents)
  current_value?: ValuationEntry[];       // Dated series of market valuations
  target_rent?: number;                   // Target monthly rent (cents) (user_assumption)
  listing_ads?: ListingAdLogEntry[];     // Rent listing ad log
  screening_checklist?: ScreeningChecklistState; // Screening checklist configuration
  target_lease_terms?: TargetLeaseTerms;  // Commercial lease terms (rate, term, type)
  list_price_sale?: number;               // Target sale list price (cents) (user_assumption)
  listing_agent_vendor?: F4VendorAssignment | null; // Listing agent vendor assignment
  holding_cost_tax?: number;              // Monthly property tax (cents)
  holding_cost_insurance?: number;        // Monthly hazard insurance premium (cents)
  holding_cost_security?: number;         // Monthly security system cost (cents)
  holding_cost_maintenance?: number;      // Monthly maintenance reserve (cents)
  holding_cost_utilities?: number;         // Monthly utility costs (cents)
  holding_cost_management?: number;        // Monthly management fees (cents)
  holding_cost_hoa?: number;               // Monthly HOA fees (cents)
  holding_cost_capex?: number;             // Monthly CapEx reserve (cents)
  holdingCostMaintenance?: number;        // Monthly maintenance/CapEx during hold (non-rental)
  holdingCostManagement?: number;         // Monthly management fee during hold (non-rental PM)
  totalMonthlyHoldingCost?: number;       // Derived: sum of all itemized monthly holding costs
  holdStartDate?: any;                    // Explicit hold clock start (defaults to acquisitionDate)
  exit_cost_basis?: number;
  exit_capitalized_improvements?: number;
  exit_holding_cost_total?: number;
  exit_marketing_outcome?: string;
  sale_under_contract?: boolean;

  // R4 — Exit/Rent Agent
  rentalMarketingCost?: number;           // Marketing spend for rental tenant placement
  exitAttorneyFees?: number;              // Sell-side attorney fees
  exitMarketingCost?: number;             // Sale-side marketing spend
  realizedGrossProfit?: number;           // Derived: salePrice - purchasePrice
  realizedNetProceeds?: number;           // Derived: salePrice - allSellCosts
  realizedROI?: number;                   // Derived: netProfit / totalCashInvested * 100
  taxEstimateSnapshot?: TaxEstimate;      // Frozen tax estimate at time of sale finalization

  // Phase 2 Closing Cost Model — per-line overrides (keyed by ClosingCostLine.id)
  closingCostOverrides?: Record<string, number>;

  // Schedule E Depreciation & Tax
  taxAssessedLandValue?: number;
  taxAssessedImprovementValue?: number;
  placedInServiceDate?: string;
  retrospectiveCompleted?: boolean;
  annualAdvertisingExpense?: number;     // Recurring advertising / vacancy-listing costs (Schedule E Line 5)

  // ── Ingestion Instruments (VZ-2) ─────────────────────────────────────────
  incomeLedger?: IncomeLedgerEntry[];
  rent_received?: RentReceivedEntry[];
  lease_income?: LeaseIncomeEntry[];
  lease_terms?: ActualLeaseTerms;
  expenseLedger?: ExpenseLedgerEntry[];
  opex_tax?: OpexEntry[];
  opex_insurance?: OpexEntry[];
  opex_security?: OpexEntry[];
  opex_maintenance?: OpexEntry[];
  opex_utilities?: OpexEntry[];
  opex_management?: OpexEntry[];
  opex_hoa?: OpexEntry[];
  opex_capex?: OpexEntry[];
  tenantRegistry?: TenantRegistryEntry[];
  listingsLog?: ListingShowingsEntry[];
  saleRecord?: SaleRecord;
  sale_contract_price?: number;            // Contract price in dollars
  sale_buyer_contingencies?: Contingency[]; // Contingencies tracker list
  sale_price?: number;                    // Actual final sale price in dollars
  selling_costs?: number;                 // Actual selling costs in dollars
  sale_closed_date?: string;              // Actual closing date
  reValuations?: ReValuationEntry[];
  complianceChecklist?: ComplianceChecklistItem[];
  decision?: 'proceed' | 'renegotiate' | 'terminate';
  renegotiatedPrice?: number;
  dealStatus?: 'Active' | 'Terminated' | 'Proceeding';
  capitalPlan?: 'all-cash solo' | 'solo-financed' | 'partnership' | 'raise interest';
  equityTerms?: EquityTerms;
  distributionStructure?: DistributionStructure;

  // ── SBA 504 Route Eligibility (Card F3.6) ──────────────────────────────
  // The platform organizes eligibility — it never determines it.
  sbaOccupancyType?: 'existing' | 'new_construction' | null;
  /** Attested owner-occupancy rate (existing ≥51%, new construction ≥60%) */
  sbaOccupancyRate?: number | null;
  /** 10-year projected occupancy for new construction (target ≥80%) */
  sbaOccupancyRateTenYears?: number | null;

  // Business Credit Context — user-provided values, source noted, never fetched
  sbaPaydexScore?: number | null;
  sbaPaydexSource?: string | null;
  sbaSbssScore?: number | null;
  sbaSbssSource?: string | null;
  sbaIntelliscoreScore?: number | null;
  sbaIntelliscoreSource?: string | null;

  /** Borrower equity injection tier: 10% standard, 15% new-business or special-purpose, 20% both */
  sbaInjectionTier?: 10 | 15 | 20 | null;

  // ── F4 Title & Closing Team Vendor Slots (Card F4.1) ────────────────────
  // Each slot stores a structured record or a simple string (backward-compat).
  f4TitleEscrowVendor?: string | F4VendorAssignment | null;
  f4ClosingAttorneyVendor?: string | F4VendorAssignment | null;
  f4AppraiserVendor?: string | F4VendorAssignment | null;
  f4EnvironmentalVendor?: string | F4VendorAssignment | null;
  f4SurveyorVendor?: string | F4VendorAssignment | null;
  f4InsuranceBrokerVendor?: string | F4VendorAssignment | null;
  /** CDC vendor — visible only when SBA 504 route is selected */
  f4CdcVendor?: string | F4VendorAssignment | null;
  /** Hard money / bridge lender — visible only when HM/Bridge route is selected */
  f4HardMoneyLenderVendor?: string | F4VendorAssignment | null;
}

export interface EquityTerms {
  funding_target: number;         // in cents
  equity_offered_pct: number;     // percentage e.g., 25.0
  min_ticket: number;             // in cents
  price_basis: number;            // total capitalization in cents when terms were set
  version: number;
}

export interface DistributionStructure {
  type: 'straight' | 'pref_return' | 'waterfall';
  splitRatioLP: number; // e.g. 70 for 70%
  splitRatioGP: number; // e.g. 30 for 30%
  preferredRate?: number; // e.g. 7.0 for 7% preferred return
  preferredType?: 'cumulative' | 'non_cumulative';
  waterfallTiers?: {
    tierNumber: number;
    thresholdPct: number; // cash-on-capital threshold e.g. 7 for 7% LP cumulative return
    splitRatioLP: number;
    splitRatioGP: number;
  }[];
}

export interface InvestorContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;                   // e.g. "Individual", "Institutional"
  relationship: string;           // e.g. "Warm", "Cold", "Existing"
  potentialTicket: number;        // in cents
  emailConsent: boolean;
  inAppConsent: boolean;
  createdAt: string;
}

export interface ProjectFollower {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emailConsent: boolean;
  inAppConsent: boolean;
  followedAt: string;
}

export interface IncomeLedgerEntry {
  id: string;
  date: string;
  amount: number;
  type: 'rent' | 'other';
  unitId?: string;
  tenantName?: string;
}

export interface RentReceivedEntry {
  id: string;
  amount: number; // in cents
  date: string; // ISO date string
  unit: string;
  tenantName?: string;
  confirmed: boolean;
  source?: 'plaid' | 'manual';
}

export interface LeaseIncomeEntry {
  id: string;
  amount: number;
  date: string;
  confirmed: boolean;
  source?: 'plaid' | 'manual';
}

export interface OpexEntry {
  id: string;
  amount: number;
  date: string;
  confirmed: boolean;
  source?: 'plaid' | 'manual';
  notes?: string;
}

export interface ActualLeaseTerms {
  rateCents: number;
  termMonths: number;
  escalations?: string;
  type: 'NNN' | 'Modified_Gross' | 'Gross';
}

export interface ExpenseLedgerEntry {
  id: string;
  date: string;
  amount: number;
  category: 'tax' | 'insurance' | 'security' | 'maintenance' | 'utilities' | 'management' | 'HOA' | 'capex';
  description?: string;
}

export interface TenantRegistryEntry {
  id: string;
  unitId: string;
  rentAmount: number;
  leaseStart: string;
  leaseEnd: string;
  status: 'active' | 'vacated' | 'renewed';
  moveInDate: string;
  moveOutDate?: string;
  renewalDate?: string;
}

export interface ListingShowingsEntry {
  id: string;
  type: 'listing' | 'showing';
  date: string;
  channel?: string;
  askingPrice?: number;
  notes?: string;
}

export interface SaleRecord {
  salePrice?: number;
  commissionPercent?: number;
  closingCosts?: number;
  saleDate?: string;
}

export interface ReValuationEntry {
  id: string;
  date: string;
  value: number;
  source: string;
}

export interface ValuationEntry {
  id: string;
  date: string;
  value: number; // in cents
  source: 'user_assumption' | 'appraisal' | 'bpo' | 'avm';
  documentUrl?: string | null;
  documentName?: string | null;
}

export interface ListingAdLogEntry {
  id: string;
  platform: string;
  listingUrl?: string | null;
  status: 'active' | 'paused' | 'removed';
  listedDate: string;
  monthlyRent: number; // cents
}

export interface ScreeningChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface ScreeningChecklistState {
  creditScoreCheck: boolean;
  backgroundCheck: boolean;
  incomeVerification: boolean;
  priorEvictionsCheck: boolean;
  landlordReferences: boolean;
  customItems?: ScreeningChecklistItem[];
}

export interface TargetLeaseTerms {
  rateCents: number;
  termMonths: number;
  type: 'NNN' | 'Modified_Gross' | 'Gross';
  sqft?: number | null;
}

export interface ComplianceChecklistItem {
  id: string;
  title: string;
  status: 'compliant' | 'pending' | 'failed';
  updatedAt: string;
}

export interface ExitAssets {
  stagingImages?: string[];
  mlsListingLink?: string;
  mlsListingStatus?: 'pending_integration' | 'syndicated' | 'failed' | 'draft';
}

// Updating Project Model to include Exit Assets
declare module './schema' {
  interface Project {
    exitAssets?: ExitAssets;
    exitEditHistory?: HoldEditHistoryEntry[];
  }
}

// Phase 5: Acquisition & Compliance
export interface ClosingDocument {
  id: string;
  type: 'Title Insurance' | 'Closing Disclosure' | 'Wiring Instructions';
  fileName: string;
  verifiedByLawyer: boolean;
  uploadedAt: Date;
  fileSize?: number; // Size in bytes
}

export interface ClosingPortalState {
  documents: ClosingDocument[];
  blockchainTitleVerified: boolean;
  blockchainTxHash?: string;
  assignedLawyerUid?: string;
}

// ── Closing Settlement Types ──────────────────────────────

// Closing Checklist — strict validation items before "Closed"
export type ClosingChecklistItemType =
  | 'Proof of Funds / Hard Money Payoff'
  | 'Signed Purchase Contract'
  | 'Closing Disclosure'
  | 'Title / Deed Transfer'
  | 'Entity Documents (LLC/Inc)';

export interface ClosingChecklistItem {
  id: string;
  type: ClosingChecklistItemType;
  completed: boolean;
  completedAt?: Date;
  completedByUid?: string;
  documentUrl?: string;   // Uploaded proof
  fileSize?: number;      // Size in bytes
  notes: string;
}

export interface ClosingMilestone {
  id: string;
  key: string;               // e.g. 'financing', 'title', 'appraisal', 'cdc_sba_approval', 'conditions_cleared', 'cd_delivered', 'closing'
  label: string;             // e.g. 'Financing Approval'
  targetOffsetDays: number;  // offset relative to psaEffectiveDate
  targetDate: string;        // YYYY-MM-DD
  actualDate?: string | null;// YYYY-MM-DD
  completed: boolean;
  notes?: string;
  slippage?: boolean;
}

// Exit Cost Ledger — final settlement costs
export type ExitCostCategory = 'Broker Fee' | 'Staging' | 'Marketing' | 'Buyer Concessions' | 'Other';

export interface ExitCostLineItem {
  id: string;
  category: ExitCostCategory;
  label: string;
  amount: number;
  isPercentage: boolean;   // true = % of sale price, false = flat $
  percentageRate?: number; // e.g. 5.5 for 5.5%
  paid: boolean;
  paidAt?: Date;
  notes: string;
}

// ── Phase 4 Exit Dashboard: Settlement & Tax Types ──────────

export type SettlementCategory =
  | 'Commission'
  | 'Title'
  | 'Transfer Tax'
  | 'Attorney'
  | 'Recording'
  | 'Escrow'
  | 'Prorated'
  | 'Other';

export interface SettlementLineItem {
  id: string;
  label: string;
  category: SettlementCategory;
  isPercentage: boolean;
  percentageRate?: number;        // e.g. 6 for 6%
  flatAmount?: number;            // used when isPercentage = false
  computedAmount: number;         // resolved dollar value
  paidBy: 'Seller' | 'Buyer' | 'Split';
  locked: boolean;                // false = user-editable
  notes?: string;
}

export interface TaxEstimate {
  holdingPeriodDays: number;
  isLongTerm: boolean;
  costBasis: number;
  netProceeds: number;
  capitalGain: number;
  estimatedTaxRate: number;
  estimatedTaxLiability: number;
  netAfterTax: number;
}

export interface ProratedEscrowItem {
  id: string;
  type: 'Property Tax' | 'Insurance' | 'HOA' | 'Utilities' | 'Other';
  annualAmount: number;
  dailyRate: number;
  sellerDays: number;
  sellerCredit: number;
  buyerCredit: number;
}

// Phase 6: Rehab & Execution (primary definition at line 107)

// ── Rehab Expansion Module Types ──────────────────────

// 3.1 Rehab Expense Category (separate from Acquisition costs)
export type RehabExpenseCategory = 'Demo' | 'Systems' | 'Interior' | 'Exterior' | 'Material' | 'Professional Labor' | 'Permits' | 'Dumpster Rental' | 'Other';

// 3.1b Renovation Zone — ROI-focused grouping (orthogonal to trade-based category)
// Kitchen + Bathroom = "Money Rooms" — should receive 50-60% of total rehab budget.
export type RenovationZone = 'Kitchen' | 'Bathroom' | 'Curb Appeal' | 'Interior' | 'Structural';

export interface RehabExpense {
  id: string;
  category: RehabExpenseCategory;
  renovationZone?: RenovationZone;  // Which ROI zone this expense belongs to
  description: string;
  amount: number;
  vendor?: string;
  paid: boolean;
  paidAt?: Date;
  receiptUrl?: string;
  createdAt: Date;
}

// 3.2 Holding Cost Entry (recurring monthly costs during renovation)
export type HoldingCostType = 'Property Tax' | 'Insurance' | 'Utilities' | 'HOA' | 'Loan Interest' | 'Other';

export interface HoldingCostEntry {
  id: string;
  type: HoldingCostType;
  monthlyAmount: number;
  monthsPaid: number;     // How many months have been paid so far
  totalMonths: number;    // Estimated total hold duration
  notes: string;
}

export interface RehabSpendHistoryEntry {
  updatedAt: string;
  updatedBy: string;
  previousValue: {
    amount: number;
    date: string;
    category: 'CapEx' | 'Repairs & Maintenance';
    note: string;
  };
}

export interface RehabSpendEntry {
  id: string;
  amount: number; // in cents
  date: string; // YYYY-MM-DD
  category: 'CapEx' | 'Repairs & Maintenance';
  note: string;
  history?: RehabSpendHistoryEntry[];
  source?: 'manual' | 'plaid';
  plaidTransactionId?: string | null;
}

// 3.3 Site Visit Log (field logistics)
export interface SiteVisitLog {
  id: string;
  date: Date;
  visitedBy: string;      // Person name or UID
  type: 'Daily Check' | 'Weekly Inspection' | 'Milestone Review' | 'Issue Report';
  notes: string;
  photosUploaded: number;
  issuesFound: number;
  resolved: boolean;
}

export interface Permit {
  id: string;
  name: string;
  municipality: string;
  status: 'Pending' | 'Approved' | 'Denied';
  lastCheckedAt?: Date;
  propertyAddress?: string;
  permitType?: string;
  description?: string;
  issueDate?: Date;
  expirationDate?: Date;
  filedDate?: Date;
  inspectorName?: string;
  permitFee?: number;
}

export interface PendingReceipt {
  id: string;
  amount: number;
  budgetLineItem: string;
  imageUrl: string;
  status: 'pending' | 'rejected';
  submittedByUid: string;
  submittedAt: Date;
}

export interface DrawRequest {
  id: string;
  taskId: string;
  afterPhotoUrl: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  authorizedByLender: boolean;
  requestedAt: Date;
}

export interface RehabModule {
   baseBudget: number;
   contingencyBufferPercentage: number; // e.g. 0.15 for 15%
   tasks: RehabTask[];
   permits: Permit[];
   pendingReceipts: PendingReceipt[];
   drawRequests: DrawRequest[];
   
   // Phase 3 Additions
   scopeOfWork?: ScopeOfWorkItem[];
   contractorBids?: ContractorBid[];
   drawSchedule?: DrawScheduleItem[];
   currentStage?: 'Demolition' | 'Rough-In/MEP' | 'Finishes' | 'Staging' | 'Complete';
}

export interface ContractorBid {
  id: string;
  contractorName: string;
  totalAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: Date;
  notes?: string;
  fileUrl?: string;
}

export interface ScopeOfWorkItem {
  id: string;
  description: string;
  category: RehabExpenseCategory;
  estimatedCost: number;
}

export interface DrawScheduleItem {
  id: string;
  milestone: string;
  completionPercentage: number;
  amount: number;
  status: 'Pending' | 'Requested' | 'Approved' | 'Paid';
  requestedAt?: Date;
  paidAt?: Date;
}

// 3.5 Rehab Schedule Task (Critical Path Method)
export type RehabTrade =
  | 'Demo' | 'Framing' | 'Plumbing' | 'Electrical'
  | 'HVAC' | 'Insulation' | 'Drywall' | 'Painting'
  | 'Flooring' | 'Cabinets' | 'Tile' | 'Roofing'
  | 'Exterior' | 'Landscaping' | 'Final Inspection';

export type RehabStage =
  | 'Pre-Construction'
  | 'Active Renovation'
  | 'Punch List';

export interface RehabScheduleTask {
  id: string;
  title: string;
  trade: RehabTrade;
  phase: RehabStage;
  startDay: number;       // Day offset from acquisition date
  durationDays: number;
  dependsOn: string[];    // IDs of tasks that must complete first
  status: 'Not Started' | 'In Progress' | 'Complete' | 'Blocked';
  isCriticalPath?: boolean;
  inspectionRequired?: boolean;
}

// ── Financial Statement Generator Types ──────────────────

// Settlement Document Upload (HUD-1 / Closing Disclosure)
export type SettlementDocumentType = 'HUD-1' | 'Closing Disclosure';

export interface SettlementDocument {
  id: string;
  projectId: string;
  type: SettlementDocumentType;
  fileName: string;
  fileUrl?: string;
  uploadedByUid?: string;
  uploadedAt?: Date;
  verified: boolean;
  verifiedByUid?: string;
  verifiedAt?: Date;
  // Extracted (or manually entered) values from the settlement statement
  extractedAcquisitionCost?: number;
  extractedDispositionCost?: number;
  extractedLoanPayoff?: number;
  extractedTitleFees?: number;
  extractedRecordingFees?: number;
  extractedTransferTaxes?: number;
  fileSize?: number; // Size in bytes
  notes: string;
}

// Update Project internally via merging later, or expand here:
// Specifically, we add the portal onto Project itself so the Kanban handles it natively.
declare module './schema' {
  interface Project {
    stateCode?: string; // e.g. FL, TX
    closingPortal?: ClosingPortalState;
    rehab?: ProjectRehab;
    // NOTE: privateFinancials lives as a SUB-COLLECTION, not an inline field.
    // Access via: projects/{projectId}/privateFinancials/summary
    // This ensures Contractors are blocked at the Firestore Rules level.
    // currentPhase is now a first-class field on the main Project interface above.
    assignedUsers?: string[]; // UID array for cross-org guest access
    holdingCostClockStart?: Date; // Server-timestamped on project creation
    rehabExpenses?: RehabExpense[]; // Rehab: Separate expense ledger
    holdingCosts?: HoldingCostEntry[]; // Rehab: Recurring monthly costs
    siteVisitLogs?: SiteVisitLog[]; // Rehab: Field logistics
    rehabScheduleTasks?: RehabScheduleTask[]; // Rehab: Critical Path Method schedule
    closingChecklist?: ClosingChecklistItem[]; // Closing: Validation checklist
    exitCosts?: ExitCostLineItem[]; // Closing: Exit cost ledger
    settlementDocuments?: SettlementDocument[]; // Financial Statements: HUD-1 / Closing Disclosures
    driveFolders?: {
      parentFolderId: string;
      parentFolderUrl: string;
      subFolders: {
        closingDocs: { id: string; url: string };
        receipts: { id: string; url: string };
        permits: { id: string; url: string };
      };
    };

    // R3 — Hold Agent: Versioned edit history & tier
    holdEditHistory?: HoldEditHistoryEntry[]; // Append-only audit trail for hold field edits
    rehabTier?: RehabTier;                     // Top-level convenience alias
    renovation_tier?: RehabTier;               // Top-level convenience alias for renovation tier
    rehab_budget?: number;
    rehab_completion_target?: any;
    rehab_contractors?: Record<string, F4VendorAssignment | null>;
    rehab_spend?: RehabSpendEntry[];
    rehab_completed_date?: any;
    rehab_spend_total?: number;
    current_value?: ValuationEntry[];
    target_rent?: number;
    listing_ads?: ListingAdLogEntry[];
    screening_checklist?: ScreeningChecklistState;
    target_lease_terms?: TargetLeaseTerms;
    list_price_sale?: number;
    listing_agent_vendor?: F4VendorAssignment | null;
    holding_cost_tax?: number;
    holding_cost_insurance?: number;
    holding_cost_security?: number;
    holding_cost_maintenance?: number;
    holding_cost_utilities?: number;
    holding_cost_management?: number;
    holding_cost_hoa?: number;
    holding_cost_capex?: number;
    exit_cost_basis?: number;
    exit_capitalized_improvements?: number;
    exit_holding_cost_total?: number;
    exit_marketing_outcome?: string;
    sale_under_contract?: boolean;
  }
}

// ── Epic 1: Portfolio Accounting Types ──────────────────

export interface PropertyUnit {
  id: string;
  propertyId: string;
  name: string; // e.g. "Unit A", "Unit B", "Apt 1"
  status: 'Occupied' | 'Vacant' | 'Under Rehab';
  monthlyRentTarget?: number;
}

export interface FinancialTransaction {
  id: string;
  organizationId: string;
  amount: number;
  date: Date;
  description: string;
  type: 'Income' | 'Expense';
  category: 'Rent' | 'Maintenance' | 'Taxes' | 'Insurance' | 'Utilities' | 'Capital Expenditure' | 'Other';
  linkedPropertyId: string;
  linkedUnitId?: string; // Optional: If tied to a specific unit
  receiptUrl?: string;
}

export interface PropertyAsset {
  id: string;
  organizationId: string; // Links to Tenant
  name: string;
  address: string;
  purchasePrice: number;
  purchaseDate: Date;
  status: 'active' | 'sold';
  units: PropertyUnit[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Phase 4: Communication Types ──────────────────────────

export type MessageType = 'EMAIL_INBOUND' | 'EMAIL_OUTBOUND' | 'INTERNAL_COMMENT';

export interface CommunicationMessage {
  id: string;
  projectId: string;
  organizationId: string;
  threadId: string;
  senderUid?: string;
  senderEmail: string;
  senderName: string;
  type: MessageType;
  subject?: string;
  body: string;
  createdAt: Date;
  providerMessageId?: string;
  attachments?: string[]; // URLs
  
  // Notification tracking fields
  readByUid?: string[];     // UIDs of users who have read the message
  recipientsUid?: string[]; // Intended recipients for this message
  emailNotificationSent?: boolean; // True if the cron processed this message
}

export interface CommunicationThread {
  id: string; // Typically the base Project ID or a derived hash
  projectId: string;
  organizationId: string;
  lastMessageAt: Date;
  participants: string[]; // Email addresses or UIDs
  subject: string;
}

// ── Phase 11: Vendor Marketplace Types ──────────────────

export type VendorType = 'Lawyer' | 'Appraiser' | 'Lender' | 'Inspector' | 'Title' | 'Insurance' | 'Contractor' | 'Property Manager' | 'Listing Agent';
export type RequestStatus = 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
export type AssignmentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';

export interface VendorAssignment {
  id: string;
  projectId: string;
  vendorId: string;                // vendor's Firestore UID
  vendorName: string;              // denormalized for display
  vendorCompanyName: string;       // denormalized for display
  serviceType: VendorType;         // type of service requested
  requestedBy: string;             // investor UID who created the assignment
  requestedByName: string;         // denormalized for display
  status: AssignmentStatus;
  message?: string;                // optional context from investor
  quotedFee?: number;              // fee quoted by vendor
  respondedAt?: Date;              // when vendor accepted/declined
  completedAt?: Date;              // when work was completed
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorProfile {
  id: string;
  uid: string;
  type: VendorType;
  companyName: string;
  licensingStates: string[];
  serviceAreas?: string[]; // Array of zip codes
  specialties: string[];
  bio: string;
  avgTurnaroundDays: number;
  overallRating: number;
  totalReviews: number;
  availability: 'Available' | 'Busy' | 'Available in 1 week';
  feeRangeLabel: string; // e.g. "$500 - $1,500"
  verified: boolean;
  insuranceVerified: boolean;
}

export interface VendorRequest {
  id: string;
  projectId: string;
  vendorUid: string;
  status: RequestStatus;
  requestedAt: Date;
  quotedFee?: number;
  completedAt?: Date;
  sharedFolderUrl?: string;
  message?: string;
}

export interface VendorReview {
  id: string;
  vendorUid: string;
  projectId: string;
  investorUid: string;
  rating: number; // 1-5
  speedRating: number;
  accuracyRating: number;
  feedback: string;
  createdAt: Date;
}

// ── Engine Room: Document Hub ────────────────────────────

export type DealDocumentCategory =
  | 'Offer Letter'
  | 'Signed Deed'
  | 'Lender Form'
  | 'Inspection Report'
  | 'Insurance Binder'
  | 'Purchase Agreement'
  | 'Other';

export type ESignStatus =
  | 'Not Required'
  | 'Awaiting Signature'
  | 'Signed'
  | 'Declined';

export interface DealDocument {
  id: string;
  projectId: string;
  category: DealDocumentCategory;
  fileName: string;
  fileUrl?: string;
  storagePath?: string;    // Firebase Storage path — for re-OCR and archive
  fileSize?: number;
  mimeType?: string;
  uploadedByUid: string;
  uploadedByName: string;
  uploadedAt: Date;
  eSignStatus: ESignStatus;
  eSignRequestedAt?: Date;
  eSignedAt?: Date;
  eSignedByName?: string;
  notes?: string;
}

// ── Engine Room: CRM Contact Manager ────────────────────

export type ContactRole =
  | 'Lawyer'
  | 'Real Estate Agent'
  | 'Lender / Bank'
  | 'Appraiser'
  | 'Title Company'
  | 'Insurance Agent'
  | 'Other';

export interface CRMContact {
  id: string;
  organizationId: string;
  role: ContactRole;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  licenseNumber?: string;
  assignedProjectIds: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy alias — keeps older tests and scripts compatible with the renamed Project type
export type PropertyDeal = Project;

// ── KPI & Analytics Types ──────────────────────────────

// Sub-Collection Model: organizations/{organizationId}/metricSnapshots/{dateKey}
export interface MetricSnapshot {
  id: string; // The dateKey (e.g., "2026-05-20")
  organizationId: string;
  date: Date;
  
  // The daily metrics
  totalDocuments: number;
  pendingSignatures: number;
  teamEfficiencyScore: number; // e.g., 94 for 94%
  storageUsageBytes: number; 
  
  createdAt: Date;
}

export interface PropertyMetricSnapshot {
  id: string; // Format: `${projectId}_${period}`
  projectId: string;
  organizationId: string;
  period: string; // "YYYY-MM" (monthly), "YYYY-QX" (quarterly), or "YYYY" (annual)
  periodType: 'monthly' | 'quarterly' | 'annual';
  date: Date; // The first day of the period, saved as Timestamp/Date
  
  // 10 core financial metrics + IRR
  noi: number | null;
  annualCashFlow: number | null;
  monthlyCashFlow: number | null;
  capRate: number | null;
  arvCapRate: number | null;
  cashOnCashReturn: number | null;
  grossRentMultiplier: number | null;
  dscr: number | null;
  ltv: number | null;
  oer: number | null;
  occupancyRate: number | null;
  irr: number | null;
  appreciation: number | null;
  isAppreciationRealized: boolean | null;

  // Raw component fields used for portfolio weighting
  propertyValue: number | null;
  totalCashInvested: number | null;
  grossRentalIncome: number | null;
  annualDebtService: number | null;
  loanAmount: number | null;
  totalOperatingExpenses: number | null;
  grossOperatingIncome: number | null;
  occupiedUnits: number | null;
  numberOfUnits: number | null;

  // R0 — Investor-scope fields
  ownershipPercentage: number | null;
  investorNOI: number | null;
  investorCashFlow: number | null;
  investorCoCReturn: number | null;

  createdAt: Date;
}

// ── R0 — Field Edit History (Audit Trail) ─────────────────────────────────────

export interface FieldEditEntry {
  id?: string;                   // Firestore auto-generated
  field: string;                 // e.g. "purchasePrice"
  previousValue: number;
  newValue: number;
  changedAt: Date;
  changedByUid: string;
  reason?: string;               // Optional user-supplied justification
}

// ── R0 — Dual-Scope Metrics ──────────────────────────────────────────────────

export interface InvestorMetrics {
  ownershipPercentage: number;     // The % used for scaling (0-100)
  ownerCashInvested: number;       // Actual cash the owner put in
  investorNOI: number;             // NOI × ownership%
  investorAnnualCashFlow: number;  // CashFlow × ownership%
  investorMonthlyCashFlow: number;
  investorCapRate: number | null;         // Same as asset (property-level metric)
  investorCoCReturn: number | null;       // investorAnnualCashFlow / ownerCashInvested
  investorNetProfit: number;       // netProfit × ownership%
  investorROI: number;             // investorNetProfit / ownerCashInvested
  investorEquityValue: number;     // propertyValue × ownership%
}

export interface DualScopeMetrics {
  asset: import('@/lib/metrics/reiMetrics').DerivedMetrics;
  investor: InvestorMetrics;
}

// ── AQ-1 — Variable Registry Types ──────────────────────────────────────────

/**
 * How a variable's value was sourced.
 * - user_assumption: User-entered estimate during underwriting (projected)
 * - user_actual:     User-entered verified number (signed contract, closing docs)
 * - document:        Extracted from an uploaded document (tax assessment, appraisal)
 * - derived:         Computed from other registry fields (NOT stored — metrics only)
 */
export type VariableSourceTag =
  | 'user_assumption'
  | 'user_actual'
  | 'document'
  | 'derived'
  | 'plaid';

/**
 * Logical grouping of atomic variables. Groups 1–4 + 7 are Acquisition-phase;
 * Groups 5–6 are Rehab and Exit (out of AQ-1 scope).
 */
export type VariableGroup =
  | 'property_identity'     // Group 1
  | 'income'                // Group 2
  | 'operating_expenses'    // Group 3
  | 'deal_capital'          // Group 4
  | 'rehab'                 // Group 5
  | 'disposition_leasing'   // Group 6
  | 'market_compliance';    // Group 7

/** Data type of the underlying field value. */
export type RegistryFieldType =
  | 'usd'       // Dollar float (not cents)
  | 'percent'   // Whole number (12.5 = 12.5%)
  | 'count'     // Integer count (units, sqft, years)
  | 'string'    // Text (address, name)
  | 'enum'      // Constrained string set
  | 'boolean'   // Flag
  | 'timestamp'; // Date/time

/**
 * Schema-level definition of a single atomic variable in the registry.
 * Pure type — no runtime code, no I/O.
 */
export interface RegistryFieldDefinition {
  /** Unique key for this variable (e.g., 'purchasePrice') */
  id: string;
  /** Human-readable label */
  label: string;
  /** Path to the field in ProjectFinancials or Project */
  fieldPath: string;
  /** Data type */
  type: RegistryFieldType;
  /** Which group this belongs to */
  group: VariableGroup;
  /** Default source tag when first entered */
  defaultSourceTag: VariableSourceTag;
  /** Is this field required for basic deal underwriting? */
  required: boolean;
  /** Description for documentation */
  description: string;
  /** Which hero/supplemental metric IDs consume this variable */
  metricsConsumedBy: string[];
  /**
   * A→U dual-slot mapping. When present, this variable transitions from
   * assumption (projected) to actual (verified) during the deal lifecycle.
   * Both field paths point into ProjectFinancials.
   */
  dualSlot?: {
    projectedField: string;
    actualField: string;
  };
}

/**
 * A single variable value seeded into the registry with its metadata.
 * Used for DEMO_FINANCIALS and test fixtures.
 */
export interface SeededVariable {
  /** Registry field ID (matches RegistryFieldDefinition.id) */
  fieldId: string;
  /** The actual value */
  value: number | string | boolean;
  /** How this value was sourced */
  sourceTag: VariableSourceTag;
  /** Whether this is the projected (A) or actual (U) slot */
  slot: 'projected' | 'actual';
}

export interface LoanRecord {
  id: string;
  projectId: string;
  instrument: 'Conventional' | 'Hard Money' | 'Bridge' | 'SBA 504';
  lenderName?: string | null;
  amountCents?: number | null;
  interestRate?: number | null;
  interestRatePercent?: number | null; // FD-3 alias/field
  termMonths?: number | null;
  points?: number | null;
  status: LoanStatus;
  estimatedCostsCents?: number | null;
  fileId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  appraisedValueCents?: number | null;
  appraisalFileId?: string | null;
  appraisalFileName?: string | null;
  appraisalFileUrl?: string | null;
  ltvPercent?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  notes?: string | null;

  // ── Hard Money / Bridge Terms (Card F3.7) ──────────────────────────────
  /** After-Repair Value in cents — user_assumption or from uploaded ARV appraisal */
  arvCents?: number | null;
  /** How the ARV was sourced */
  arvSource?: 'user_assumption' | 'arv_appraisal' | null;
  /** ARV appraisal document reference */
  arvAppraisalFileId?: string | null;
  arvAppraisalFileName?: string | null;
  arvAppraisalFileUrl?: string | null;
  /** Loan-to-ARV percentage (derived: amountCents / arvCents * 100) */
  ltarvPercent?: number | null;
  /** Whether this loan is interest-only (no principal amortization) */
  interestOnly?: boolean | null;
  isInterestOnly?: boolean | null; // FD-3 alias/field
  /** Exit plan — seeded from project.dispositionType, never re-asked */
  exitPlan?: 'SALE' | 'LEASE' | 'RENT' | 'REFINANCE' | null;
}

export interface LenderPackageItem {
  id: string;
  projectId: string;
  name: string;
  isCustom: boolean;
  status: 'Pending' | 'Uploaded';
  fileId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  reminderCadence: 'daily' | 'weekly' | 'none';
  lastRemindedAt?: string | null;
  createdAt: string;
}

export interface LoanEstimateCandidate {
  id: string;
  projectId: string;
  loanRecordId?: string | null;
  lenderName: string;
  amountCents: number;
  interestRate: number;
  termMonths: number;
  points: number;
  estimatedCostsCents: number;
  fileId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  isChosen: boolean;
  sourceTags?: {
    lenderName?: 'document' | 'manual' | null;
    amountCents?: 'document' | 'manual' | null;
    interestRate?: 'document' | 'manual' | null;
    termMonths?: 'document' | 'manual' | null;
    points?: 'document' | 'manual' | null;
    estimatedCostsCents?: 'document' | 'manual' | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export type CapitalSourceType =
  | 'solo_cash'
  | 'co_buyer_equity'
  | 'syndication_equity'
  | 'conventional_loan'
  | 'hard_money'
  | 'bridge'
  | 'sba_504_bank'
  | 'sba_504_cdc'
  | 'sba_504_injection';

export interface FundingPlan {
  id: string;
  projectId: string;
  modality: string[]; // Modality set (e.g. ['solo_cash', 'conventional_mortgage'])
  sources: CapitalSource[];
  titleHolding?: TitleHolding;
  closingRecord?: ClosingRecord;
}

export interface PhasePermission {
  canView: boolean;
  canEdit: boolean;
}

export interface EquityParty {
  id: string;
  projectId: string;
  role: 'co_buyer' | 'GP' | 'LP';
  name: string;
  email?: string | null;
  entityType: 'Individual' | 'LLC' | 'Other';
  memberId?: string | null;
  ownershipPct: number;
  phasePermissions?: Record<string, PhasePermission>; // key: phase-1, phase-2, etc.
}

export interface ContributionEntry {
  id: string;
  projectId: string;
  partyName: string;
  email?: string | null;
  amountCents: number;
  status: 'pledged' | 'transferred' | 'cleared' | 'soft-committed' | 'docs-out' | 'signed' | 'funds-confirmed';
  evidenceDocId?: string | null;
  evidenceDocUrl?: string | null;
  partyType: 'Sponsor' | 'Investor' | 'Co-GP' | 'Preferred Equity';
  createdAt?: string | Date;
}

export interface TitleHolding {
  structure: 'TIC' | 'JTWROS';
  documentUrl?: string | null;
  signatureStatus: 'unsigned' | 'signed';
  ownershipPercentages?: Record<string, number>; // TIC details
}

export interface ClosingRecord {
  closingDate?: string | null;
  deedRecordedDate?: string | null;
  instrumentNumber?: string | null;
  countyName?: string | null;
  checklistState?: Record<string, boolean>; // checklist of executed docs
}
