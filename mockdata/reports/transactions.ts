import { getSeedProjectById, SEED_PROJECTS } from '../projects/projects';

export interface SeedReportTransaction {
  id: string;
  projectId: string;
  payee: string;
  category: string;
  amount: number;
  transactionDate: string;
}

export const BASE_TRANSACTIONS: SeedReportTransaction[] = [
  {
    id: 'tx-deal-1-rent',
    projectId: 'deal-1',
    payee: 'Tenant — Unit A',
    category: 'RENT_INCOME',
    amount: 3200,
    transactionDate: '2026-08-05',
  },
  {
    id: 'tx-deal-1-mgmt',
    projectId: 'deal-1',
    payee: 'Property Manager',
    category: 'MANAGEMENT',
    amount: 320,
    transactionDate: '2026-08-01',
  },
  {
    id: 'tx-deal-1-insurance',
    projectId: 'deal-1',
    payee: 'State Farm',
    category: 'INSURANCE',
    amount: 185,
    transactionDate: '2026-08-03',
  },
  {
    id: 'tx-deal-2-rent',
    projectId: 'deal-2',
    payee: 'Tenant — Duplex B',
    category: 'RENT_INCOME',
    amount: 2800,
    transactionDate: '2026-08-04',
  },
  {
    id: 'tx-deal-2-rehab',
    projectId: 'deal-2',
    payee: 'Contractor Co.',
    category: 'REHAB',
    amount: 4200,
    transactionDate: '2026-08-02',
  },
  {
    id: 'tx-deal-3-closing',
    projectId: 'deal-3',
    payee: 'Title Company',
    category: 'CLOSING',
    amount: 2100,
    transactionDate: '2026-08-06',
  },
  {
    id: 'tx-deal-3-appraisal',
    projectId: 'deal-3',
    payee: 'Appraisal Services',
    category: 'DUE_DILIGENCE',
    amount: 650,
    transactionDate: '2026-07-28',
  },
];

export function seedReportTransactions(options?: {
  organizationId?: string;
  projectId?: string;
}): Array<Record<string, unknown>> {
  void options?.organizationId;
  let rows = BASE_TRANSACTIONS;
  if (options?.projectId) {
    rows = rows.filter((row) => row.projectId === options.projectId);
  }
  return rows.map((row) => ({
    ...row,
    amount: row.category === 'RENT_INCOME' ? -row.amount : row.amount,
  }));
}

export function seedReportProjectOptions(): Array<{ id: string; name: string }> {
  return SEED_PROJECTS.map((project) => ({
    id: project.id,
    name: project.propertyName,
  }));
}

export function resolveSeedProjectName(projectId: string): string {
  return getSeedProjectById(projectId)?.propertyName ?? projectId;
}
