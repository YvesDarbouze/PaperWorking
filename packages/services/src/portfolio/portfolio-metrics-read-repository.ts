/** Minimal project fields used for portfolio rollup (Neon/Postgres). */
export type PortfolioMetricsProjectRow = {
  id: string;
  purchasePrice: number | null;
  currentPhase: number;
  status: string | null;
};

/** Loads projects visible under an authz-scoped Prisma where clause. */
export interface PortfolioMetricsReadRepository {
  listAccessibleProjects(where: Record<string, unknown>): Promise<PortfolioMetricsProjectRow[]>;
}
