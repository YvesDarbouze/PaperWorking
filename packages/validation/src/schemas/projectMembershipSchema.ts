import { z } from 'zod';

export const projectMembershipRoleEnum = z.enum([
  'OWNER',
  'TEAM_LEAD',
  'TEAM_MEMBER',
  'VENDOR',
]);

export const projectMembershipStatusEnum = z.enum([
  'invited',
  'active',
  'removed',
  'suspended',
]);

/**
 * Canonical schema for `/projectMembers/{membershipId}` (SoT).
 * Do not confuse with embedded `projectMemberSchema` on `projects.members`
 * (deprecated RBAC map — denormalized summary only).
 * membershipId is typically `${projectId}_${userId}`.
 */
export const projectMembershipSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  role: projectMembershipRoleEnum,
  status: projectMembershipStatusEnum,
  permissions: z.array(z.string()).optional(),
  invitedBy: z.string().optional(),
  invitedAt: z.any(),
  acceptedAt: z.any().optional(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type ProjectMembership = z.infer<typeof projectMembershipSchema>;
