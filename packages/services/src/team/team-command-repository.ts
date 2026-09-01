import type { OrganizationMemberRecord } from './team-members-read-repository.js';

/** Canonical organization invite row from Neon/Postgres. */
export type OrganizationInviteRecord = {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  invitedBy: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateMemberData = {
  organizationId: string;
  userId?: string;
  email?: string;
  role: string;
  status: string;
};

export type CreateInviteData = {
  organizationId: string;
  email: string;
  role: string;
  invitedBy: string;
};

export type UpdateMemberData = {
  role?: string;
  status?: string;
};

/** Team mutation persistence — org-scoped writes after authz in service layer. */
export interface TeamCommandRepository {
  findMemberById(id: string): Promise<OrganizationMemberRecord | null>;
  createMember(data: CreateMemberData): Promise<OrganizationMemberRecord>;
  updateMember(id: string, data: UpdateMemberData): Promise<OrganizationMemberRecord>;
  deleteMember(id: string): Promise<void>;
  listInvitesByOrganizationId(organizationId: string): Promise<OrganizationInviteRecord[]>;
  createInvite(data: CreateInviteData): Promise<OrganizationInviteRecord>;
}
