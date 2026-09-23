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
  underwriting?: UnderwritingInputs | null;
  acquisitionStatus?: AcquisitionPipelineStatus;
  tasks?: AcquisitionTask[];
  deadRecord?: DeadRecord | null;
  contingencies?: ContingencyItem[];
  underwritingSnapshot?: UnderwritingSnapshot | null;
  isArchived?: boolean;
  funding?: ProjectFundingTerms | null;
}

export interface EarnestMoneyRecord {
  amount?: number;
  holderEntity?: string;
  contactName?: string;
  dueDate?: string;
  status?: string;
  receiptConfirmed?: boolean;
  [key: string]: unknown;
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
  earnestMoney?: EarnestMoneyRecord | null;
  checklistItems?: any[];
  teamMembers?: any[];
  underwritingRecord?: Record<string, unknown> | null;
  financials?: Record<string, unknown> | null;
}

export const PROJECT_SUBROUTES = [
  { slug: '', label: 'Overview' },
  { slug: 'underwriting', label: 'Underwriting' },
  { slug: 'insights', label: 'Insights' },
  { slug: 'documents', label: 'Documents' },
  { slug: 'reports', label: 'Reports' },
  { slug: 'scorecard', label: 'Scorecard' },
] as const;

export type ProjectSubrouteSlug = (typeof PROJECT_SUBROUTES)[number]['slug'];

