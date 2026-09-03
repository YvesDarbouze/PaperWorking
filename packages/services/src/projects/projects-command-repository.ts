export type ProjectCommandRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  purchasePrice?: number | null;
  status?: string | null;
  visibility?: string | null;
  currentPhase?: number;
  organizationId?: string | null;
  userId?: string | null;
  investorId?: string | null;
  phaseData?: unknown;
  subcollections?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
};

export type ProjectCreateData = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  purchasePrice?: number;
  organizationId?: string;
  userId: string;
};

export type ProjectsCommandRepository = {
  create(data: ProjectCreateData): Promise<ProjectCommandRecord>;
  update(id: string, patch: Record<string, unknown>): Promise<ProjectCommandRecord>;
};
