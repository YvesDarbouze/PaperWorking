export type AuthUser = {
  uid: string;
  email?: string | null;
  accountType: string;
  isAdmin: boolean;
  role?: string | null;
};

/** Minimum fields required for ACL checks on projects. */
export type ProjectRecord = {
  id: string;
  userId: string;
  investorId: string | null;
  organizationId: string | null;
};

/** Project shape returned from stores during migration (superset of ACL fields). */
export type StoredProject = ProjectRecord & {
  name?: string | null;
  title?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  purchasePrice?: number | null;
  status?: string | null;
  currentPhase?: number;
  visibility?: string | null;
  [key: string]: unknown;
};

export type DealRecord = {
  id: string;
  creatorId: string;
  visibility: string;
  status: string;
};

/** Deal shape returned from stores during migration. */
export type StoredDeal = DealRecord & Record<string, unknown>;

export type OrganizationMemberRecord = {
  role: string;
};
