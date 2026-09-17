import type { InvestmentStrategy as StrategyTemplateType, PropertyType } from '@paperworking/validation';

export interface DraftProjectData {
  step: number; // 1 to 5
  // Step 1: Property
  address: string;
  unit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  sourceType?: 'MLS' | 'off-market' | 'wholesaler' | 'referral' | 'other';
  sourceContactName?: string;
  sourceContactPhone?: string;
  propertyType?: PropertyType;
  beds?: number;
  baths?: number;
  squareFeet?: number;
  yearBuilt?: number;

  // Step 2: Strategy
  strategy: StrategyTemplateType;

  // Step 3: Numbers (Underwriting)
  purchasePrice: number;
  rehabBudget?: number;
  estimatedARV?: number;
  grossRentMonthly?: number;
  targetLtvPct?: number;
  interestRatePct?: number;
  amortizationYears?: number;
  operatingExpenseRatioPct?: number;
  vacancyRatePct?: number;
  buyerClosingCostsPct?: number;
  capExReservePct?: number;
  exitCapRatePct?: number;

  // Step 4: Team & Deadlines
  targetContractDate?: string;
  targetClosingDate?: string;
  inspectionDays?: number;
  financingDays?: number;
  teamMembers?: Array<{
    id?: string;
    name: string;
    role: string;
    email?: string;
  }>;
  dealNotes?: string;

  // Metadata
  source?: 'manual' | 'deal_calculator' | 'template';
  calculatorSnapshotId?: string;
  updatedAt?: string;
}

// In-memory store keyed by userId (or session identifier)
const draftsStore = new Map<string, DraftProjectData>();

export function getProjectDraft(userId: string): DraftProjectData | null {
  const normalizedKey = (userId || 'default-user').trim();
  const draft = draftsStore.get(normalizedKey);
  return draft ? { ...draft } : null;
}

export function saveProjectDraft(
  userId: string,
  data: Partial<DraftProjectData>,
): DraftProjectData {
  const normalizedKey = (userId || 'default-user').trim();
  const existing = draftsStore.get(normalizedKey) || {
    step: 1,
    address: '',
    strategy: 'flip',
    purchasePrice: 0,
  };

  const updated: DraftProjectData = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  draftsStore.set(normalizedKey, updated);
  return { ...updated };
}

export function deleteProjectDraft(userId: string): boolean {
  const normalizedKey = (userId || 'default-user').trim();
  return draftsStore.delete(normalizedKey);
}

export function clearAllDrafts(): void {
  draftsStore.clear();
}
