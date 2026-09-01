export type ProjectKpiInputRow = {
  id: string;
  purchasePrice?: number | null;
  currentPhase?: number | null;
  phaseData?: unknown;
};

export type RecentTransactionRow = {
  id: string;
  payee: string | null;
  category: string;
  amount: number;
  transactionDate: string;
};

export type ProjectKpiReadRepository = {
  findProjectKpiInputs(projectId: string): Promise<ProjectKpiInputRow | null>;
  listRecentApprovedTransactions(projectId: string): Promise<RecentTransactionRow[]>;
};
