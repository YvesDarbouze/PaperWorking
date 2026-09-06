export type AdminUserListRow = {
  /** Firebase Auth uid (or legacy doc id fallback). */
  id: string;
  /** Firestore `/users/{documentId}` — authoritative write key. */
  documentId: string;
  email: string;
  name: string | null;
  displayName: string | null;
  accountType: string | null;
  /** Profile job title (`users.role`) — display only, not platform RBAC. */
  jobTitle: string | null;
  /** Organization role on user profile (`users.orgRole`). */
  orgRole: string | null;
  createdAt: Date;
};

export type AdminAuditRow = {
  id: string;
  timestamp: Date;
  actorEmail: string;
  action: string;
  targetResource: string;
  targetResourceId: string | null;
  status: string;
  entryHash: string;
  ip: string;
};

export type AdminSyntheticAgentRow = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  agentPersona: string | null;
  projectsCount: number;
  listingsCount: number;
  messagesCount: number;
};

export type AdminProjectListRow = {
  id: string;
  name: string;
  ownerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminOrganizationListRow = {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
};

export type AdminReadRepository = {
  countUsers(): Promise<number>;
  countSubscriptions(): Promise<number>;
  countProjects(): Promise<number>;
  countOrganizations(): Promise<number>;
  countListings(): Promise<number>;
  countVendors(): Promise<number>;
  listRecentUsers(limit: number): Promise<AdminUserListRow[]>;
  findUserByLookupId(lookupId: string): Promise<AdminUserListRow | null>;
  listRecentProjects(limit: number): Promise<AdminProjectListRow[]>;
  listRecentOrganizations(limit: number): Promise<AdminOrganizationListRow[]>;
  listRecentAuditEvents(limit: number): Promise<AdminAuditRow[]>;
  listRecentSubscriptions(limit: number): Promise<Array<Record<string, unknown>>>;
  listRecentListings(limit: number): Promise<Array<Record<string, unknown>>>;
  getAppConfigValue(key: string): Promise<Record<string, unknown> | null>;
  countRentcastCalls(year: number, month: number): Promise<number>;
  listSyntheticAgents(): Promise<AdminSyntheticAgentRow[]>;
  getSyntheticAgentById(id: string): Promise<AdminSyntheticAgentRow | null>;
  deleteSyntheticAgent(id: string): Promise<boolean>;
};
