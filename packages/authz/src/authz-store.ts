import type { DealRecord, OrganizationMemberRecord, ProjectRecord } from './types.js';

/**
 * Data access port for AuthorizationService.
 * Implementations live in packages/database (Neon/Firestore) — not in authz.
 */
export interface AuthzStore<
  TProject extends ProjectRecord = ProjectRecord,
  TDeal extends DealRecord = DealRecord,
> {
  findOrganizationsOwnedBy(userId: string): Promise<{ id: string }[]>;
  findActiveOrgMemberships(userId: string): Promise<{ organizationId: string }[]>;
  findProjectById(projectId: string): Promise<TProject | null>;
  findActiveProjectMember(
    projectId: string,
    userId: string,
    email?: string | null,
  ): Promise<{ id: string } | null>;
  findDealById(dealId: string): Promise<TDeal | null>;
  findActiveProjectMemberByUserId(
    projectId: string,
    userId: string,
  ): Promise<{ id: string } | null>;
  findActiveOrgMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRecord | null>;
  findOrganizationOwnedBy(
    organizationId: string,
    ownerId: string,
  ): Promise<{ id: string } | null>;
  findActiveOrgMemberInOrgs(
    userId: string,
    organizationIds: string[],
  ): Promise<{ userId: string } | null>;
  findOrganizationOwnedByUserInOrgs(
    ownerId: string,
    organizationIds: string[],
  ): Promise<{ ownerId: string } | null>;
  findMessageInThreadForUser(
    threadId: string,
    userId: string,
  ): Promise<{ id: string } | null>;
  findAnyMessageInThread(threadId: string): Promise<{ id: string } | null>;
}
