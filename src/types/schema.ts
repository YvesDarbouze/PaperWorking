// PaperWorking Project Schema

// 1. Roles Definition
export type Role =
  | 'Lead Investor'      // Admin (Read/Write all)
  | 'Admin'              // Co-admin designated by account holder
  | 'General Contractor' // PM (Read/Write all except sensitive financial settings)
  | 'Real Estate Agent'  // Contributor (Read all, Edit status/timeline)
  | 'Accountant'         // Viewer/Export (Read all, no edits unless authorized)
  | 'Lender'              // Read-Only (Read specific financial data)
  | 'Vendor';            // External Professional (Marketplace access)

// 1.1 Organization-Level Role (Account Holder Self-ID)
export type OrgRole = 'Lead Investor' | 'Admin';

// 1.2 Deal-Specific Team Roles (non-investor professionals)
export type DealRole =
  | 'Real Estate Agent'
  | 'Loan Officer/Broker'
  | 'Loan Processor'
  | 'Loan Underwriter'
  | 'Appraiser'
  | 'Title Company/Escrow Officer'
  | 'Closing Agent'
  | 'Mortgage Servicer';

// 1.3 External Access Permissions (per-stakeholder gate)
export interface ExternalAccessPermission {
  canView: boolean;   // Can view deal details and financials
  canUpload: boolean; // Can upload documents (appraisals, reports) to the deal
  canComment: boolean; // Can leave comments/notes on deal tasks
}

// 1.4 Internal Account Role (within an organization)
export type InternalRole = 'Admin' | 'Deal Lead';

// 1.45 Organization Team Member (org-level, not deal-specific)
export interface OrgTeamMember {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  internalRole: InternalRole;
  assignedDealIds: string[]; // Deals this member leads (Deal Lead only)
  invitedAt: Date;
  status: 'active' | 'invited' | 'removed';
}

// 1.5. Organization Schema
// Establishes the multi-tenant B2B entity boundary
export interface Organization {
  id: string; // Document ID
  name: string;
  ownerUid: string; // The primary billing/admin user
  accountTier: 'Individual' | 'Team'; // Controls seat count and team features
  subscriptionPlan: 'None' | 'Individual' | 'Team' | 'Lawyer Lead-Gen';
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled';
  teamMembers: OrgTeamMember[]; // Up to 10 for Team accounts, 0 for Individual
  maxSeats: number; // 1 for Individual, 10 for Team
  createdAt: Date;
  updatedAt: Date;
}

// 2. User Schema
export interface ApplicationUser {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string; // REQUIRED: Enforces strict data containment to the Organization
  orgRole: OrgRole; // Account-holder self-designation
  subscriptionPlan: 'None' | 'Individual' | 'Team' | 'Lawyer Lead-Gen';
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled';
  inviteToken?: string; // Populated when user arrived via crowdfund invitation
  invitedToDealId?: string; // Deal they were invited to join
  createdAt: Date;
  updatedAt: Date;
}

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
}

// 2.5 Deal-Specific Team Member (non-investor professionals)
export interface DealTeamMember {
  id: string;
  uid?: string; // null if invited but not yet registered
  email: string;
  displayName: string;
  dealRole: DealRole;
  permissions: ExternalAccessPermission; // Granular access gates
  assignedAt: Date;
  status: 'active' | 'invited' | 'removed';
}

// 2.6 Crowdfunding Invitation
export interface CrowdfundInvitation {
  id: string;
  dealId: string;
  dealName: string;
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

// ── Acquisition & Due Diligence Module Types ──────────

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
  | 'Other';

export interface RoleLinkedDocument {
  id: string;
  category: DocumentCategory;
  fileName: string;
  fileUrl?: string;         // Upload URL (mock for now)
  linkedRole: DealRole;     // Which roster role is responsible
  uploadedByUid?: string;
  uploadedByName?: string;
  uploadedAt?: Date;
  verified: boolean;
  verifiedByUid?: string;
  verifiedAt?: Date;
  notes: string;
}

// 3. Deal Container Schema
export interface PropertyDeal {
  id: string; // Document ID
  organizationId: string; // REQUIRED: Maps deal to exactly one tenant for B2B data isolation
  propertyName: string;
  address: string;
  status: 'Lead' | 'Under Contract' | 'Renovating' | 'Listed' | 'Sold';
  members: Record<string, DealMember>; // Map of user UIDs to their role in the deal
  financials: DealFinancials;
  closingRoom?: ClosingRoom;
  fractionalInvestors?: FractionalInvestor[]; // Phase 8 addition
  dealTeam?: DealTeamMember[]; // Phase 9: Deal-specific professional assignments
  historicalProperties?: HistoricalProperty[]; // Find & Fund: Track Record Ledger
  prospects?: ProspectProperty[]; // Find & Fund: Active Prospecting Board
  pledges?: FundingPledge[]; // Find & Fund: Investor Pledges
  costBasisLedger?: CostBasisLedger; // Acquisition: Capitalization tracker
  roleLinkedDocuments?: RoleLinkedDocument[]; // Acquisition: Document vault
  createdAt: Date;
  updatedAt: Date;
  lastPhaseTransitionAt?: Date; // Phase 6: Tracks time spent in a specific lifecycle state
  ownerUid: string; // The person who created the deal
  documentHubFolderId?: string; // Google Drive folder link for compliance hub
}

export interface DealMember {
  uid: string;
  role: Role;
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

// Sub-Collection Model: deals/{dealId}/ledgerItems/{itemId}
// Replaces flat arrays for massive transaction scalability
export interface LedgerItem {
  id: string; // Sub-document ID
  dealId: string; // Reference to parent deal
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

// Sub-Collection Model: deals/{dealId}/privateFinancials/summary
// Securely isolates sensitive aggregate data from Contractor-level reads.
// Firestore cannot redact individual fields on a document read, so this
// sub-collection is the structural workaround for True Field-Level Security.
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

export interface InspectionItem {
  id: string;
  category: string;
  estimatedCost: number;
  actualCost: number;
  loggedBy: string; // UID
}

export interface ClosingRoom {
  titleInsuranceUrl: string | null;
  closingDisclosureUrl: string | null;
  wiringInstructionsUrl: string | null;
  assignedLawyerUid: string | null;
  lawyerVerified: boolean;
  blockchainTxHash: string | null;
  chainOfTitleStatus: 'pending' | 'verified' | 'failed';
}

export interface DealFinancials {
  purchasePrice: number;
  estimatedARV: number; // After-Repair Value
  costs: CostEntry[]; // Ledger of costs
  
  // Evaluation & Capital Financing
  loanAmount?: number; // Hard money loan amount
  loanInterestRate?: number; // e.g., 12 for 12%
  loanOriginationPoints?: number; // Upfront percentage cost of loan value
  estimatedTimelineDays?: number; // Estimation for holding costs
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
  soldDate?: Date;

  // Phase 10 / UX Phase 4 Fork
  exitStrategyType?: 'Sell' | 'Rent';
  projectedMonthlyRent?: number;
  vacancyRate?: number; // percentage e.g., 5 for 5%
  maintenanceReserves?: number; // per month
  propertyManagementFee?: number; // per month
  longTermMortgagePayment?: number; // per month
}

export interface ExitAssets {
  stagingImages?: string[];
  mlsListingLink?: string;
}

// Updating Deal Model to include Exit Assets
declare module './schema' {
  interface PropertyDeal {
    exitAssets?: ExitAssets;
  }
}

// Phase 5: Acquisition & Compliance
export interface ClosingDocument {
  id: string;
  type: 'Title Insurance' | 'Closing Disclosure' | 'Wiring Instructions';
  fileName: string;
  verifiedByLawyer: boolean;
  uploadedAt: Date;
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
  notes: string;
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

// Phase 6: Rehab & Execution (primary definition at line 107)

// ── Rehab Expansion Module Types ──────────────────────

// 3.1 Rehab Expense Category (separate from Acquisition costs)
export type RehabExpenseCategory = 'Material' | 'Professional Labor' | 'Permits' | 'Dumpster Rental' | 'Other';

export interface RehabExpense {
  id: string;
  category: RehabExpenseCategory;
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
}

// ── Financial Statement Generator Types ──────────────────

// Settlement Document Upload (HUD-1 / Closing Disclosure)
export type SettlementDocumentType = 'HUD-1' | 'Closing Disclosure';

export interface SettlementDocument {
  id: string;
  dealId: string;
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
  notes: string;
}

// Update PropertyDeal internally via merging later, or expand here:
// Specifically, we add the portal onto PropertyDeal itself so the Kanban handles it natively.
declare module './schema' {
  interface PropertyDeal {
    stateCode?: string; // e.g. FL, TX
    closingPortal?: ClosingPortalState;
    rehab?: RehabModule;
    // NOTE: privateFinancials lives as a SUB-COLLECTION, not an inline field.
    // Access via: deals/{dealId}/privateFinancials/summary
    // This ensures Contractors are blocked at the Firestore Rules level.
    currentPhase?: number; // 1-4, only Admin/Lead Investor can mutate
    assignedUsers?: string[]; // UID array for cross-org guest access
    holdingCostClockStart?: Date; // Server-timestamped on deal creation
    rehabExpenses?: RehabExpense[]; // Rehab: Separate expense ledger
    holdingCosts?: HoldingCostEntry[]; // Rehab: Recurring monthly costs
    siteVisitLogs?: SiteVisitLog[]; // Rehab: Field logistics
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
  dealId: string;
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
}

export interface CommunicationThread {
  id: string; // Typically the base Deal ID or a derived hash
  dealId: string;
  organizationId: string;
  lastMessageAt: Date;
  participants: string[]; // Email addresses or UIDs
  subject: string;
}

// ── Phase 11: Vendor Marketplace Types ──────────────────

export type VendorType = 'Lawyer' | 'Appraiser';
export type RequestStatus = 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';

export interface VendorProfile {
  id: string;
  uid: string;
  type: VendorType;
  companyName: string;
  licensingStates: string[];
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
  dealId: string;
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
  dealId: string;
  investorUid: string;
  rating: number; // 1-5
  speedRating: number;
  accuracyRating: number;
  feedback: string;
  createdAt: Date;
}
