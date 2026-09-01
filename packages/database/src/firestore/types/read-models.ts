/**
 * Normalized read models for Firestore repositories.
 * Field names align with Prisma/Postgres where possible to support shadow-read comparison.
 */

export type UserReadModel = {
  id: string;
  email: string | null;
  name: string | null;
  displayName: string | null;
  accountType: string | null;
  role: string | null;
  personalOrganizationId: string | null;
  legacyFirebaseUid: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationReadModel = {
  id: string;
  name: string;
  slug: string | null;
  ownerId: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationMemberReadModel = {
  id: string;
  organizationId: string;
  userId: string | null;
  email: string | null;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectReadModel = {
  id: string;
  organizationId: string | null;
  userId: string | null;
  investorId: string | null;
  name: string | null;
  title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  currentPhase: number | null;
  visibility: string | null;
  purchasePrice: number | null;
  reilProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
