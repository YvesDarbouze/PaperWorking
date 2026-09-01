export type AdminUserListRow = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  accountType: string | null;
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

export type AdminReadRepository = {
  countUsers(): Promise<number>;
  countSubscriptions(): Promise<number>;
  countProjects(): Promise<number>;
  countListings(): Promise<number>;
  listRecentUsers(limit: number): Promise<AdminUserListRow[]>;
  listRecentAuditEvents(limit: number): Promise<AdminAuditRow[]>;
  listRecentSubscriptions(limit: number): Promise<Array<Record<string, unknown>>>;
  listRecentListings(limit: number): Promise<Array<Record<string, unknown>>>;
  getAppConfigValue(key: string): Promise<Record<string, unknown> | null>;
  countRentcastCalls(year: number, month: number): Promise<number>;
  listSyntheticAgents(): Promise<AdminSyntheticAgentRow[]>;
  getSyntheticAgentById(id: string): Promise<AdminSyntheticAgentRow | null>;
  deleteSyntheticAgent(id: string): Promise<boolean>;
};
