export type ReportProjectRow = {
  id: string;
  name: string | null;
  title: string | null;
  address: string | null;
  purchasePrice: number | null;
  currentPhase: number;
  status: string | null;
  city?: string | null;
};

export type ReportsReadRepository = {
  listAccessibleProjects(where: Record<string, unknown>): Promise<ReportProjectRow[]>;
  findProjectById(id: string): Promise<ReportProjectRow | null>;
};
