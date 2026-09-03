export type InsightsProjectRow = {
  purchasePrice: number | null;
  city: string | null;
  currentPhase: number;
};

export type PortfolioInsightsReadRepository = {
  listAccessibleProjects(where: Record<string, unknown>): Promise<InsightsProjectRow[]>;
};
