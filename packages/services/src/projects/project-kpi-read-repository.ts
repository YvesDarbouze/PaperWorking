export type ProjectKpiInputRow = {
  id: string;
  purchasePrice?: number | null;
  squareFootage?: number | null;
  currentPhase?: number | null;
  phaseData?: unknown;
  /** Top-level project.financials — primary user input store per projectSchema. */
  financials?: Record<string, unknown> | null;
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
