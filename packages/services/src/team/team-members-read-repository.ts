/** Canonical organization member row from Neon/Postgres (Prisma OrganizationMember). */
export type OrganizationMemberRecord = {
  id: string;
  organizationId: string;
  userId: string | null;
  email: string | null;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Loads members for a trusted organization id. */
export interface TeamMembersReadRepository {
  listByOrganizationId(organizationId: string): Promise<OrganizationMemberRecord[]>;
}
