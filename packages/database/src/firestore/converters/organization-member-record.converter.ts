import type { OrganizationMemberReadModel } from '../types/read-models.js';

/** Matches @paperworking/services OrganizationMemberRecord (avoid circular package deps). */
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

/** Maps normalized Firestore read model to the team service contract. */
export function organizationMemberToRecord(
  model: OrganizationMemberReadModel,
): OrganizationMemberRecord {
  return {
    id: model.id,
    organizationId: model.organizationId,
    userId: model.userId,
    email: model.email,
    role: model.role,
    status: model.status,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}
