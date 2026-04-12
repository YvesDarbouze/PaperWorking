// PaperWorking Project Schema

// 1. Roles Definition
export type Role =
  | 'Lead Investor'      // Admin (Read/Write all)
  | 'General Contractor' // PM (Read/Write all except sensitive financial settings)
  | 'Real Estate Agent'  // Contributor (Read all, Edit status/timeline)
  | 'Accountant'         // Viewer/Export (Read all, no edits unless authorized)
  | 'Lender';            // Read-Only (Read specific financial data)

// 1.5. Organization Schema
// Establishes the multi-tenant B2B entity boundary
export interface Organization {
  id: string; // Document ID
  name: string;
  ownerUid: string; // The primary billing/admin user
  subscriptionPlan: 'None' | 'Individual' | 'Team' | 'Lawyer Lead-Gen';
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled';
  createdAt: Date;
  updatedAt: Date;
}

// 2. User Schema
export interface ApplicationUser {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string; // REQUIRED: Enforces strict data containment to the Organization
  subscriptionPlan: 'None' | 'Individual' | 'Team' | 'Lawyer Lead-Gen';
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled';
  createdAt: Date;
  updatedAt: Date;
}

export interface FractionalInvestor {
  id: string;
  name: string;
  equityPercentage: number;
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
  createdAt: Date;
  updatedAt: Date;
  ownerUid: string; // The person who created the deal
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
  loanInterestRate?: number; // e.g., 12 for 12%
  loanOriginationPoints?: number; // Upfront percentage cost of loan value
  estimatedTimelineDays?: number; // Estimation for holding costs
  preApprovalDocuments?: string[]; // Array of strings/URLs
  inspections?: InspectionItem[]; // Virtual Inspection Estimate vs Actual

  // Phase 6 Field Management
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

// Phase 6: Rehab & Execution
export interface RehabTask {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedToUid?: string;
  category: string;
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

