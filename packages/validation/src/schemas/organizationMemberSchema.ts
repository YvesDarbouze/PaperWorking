import { z } from 'zod';

export const organizationMemberRoleEnum = z.enum([
  'Lead Investor',
  'Admin',
  'CEO',
  'President',
  'CFO',
  'COO',
  'Deal Lead',
  'Contributor',
]);

export const organizationMemberStatusEnum = z.enum([
  'invited',
  'active',
  'removed',
  'suspended',
]);

/**
 * Canonical schema for `/organizationMembers/{membershipId}`.
 */
export const organizationMemberSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  userId: z.string().optional(),
  email: z.string().email(),
  displayName: z.string(),
  role: organizationMemberRoleEnum.or(z.string()),
  status: organizationMemberStatusEnum,
  customPermissions: z.array(z.string()).optional(),
  scope: z.enum(['tenant', 'project']).optional(),
  assignedProjectIds: z.array(z.string()).optional(),
  invitedBy: z.string().optional(),
  invitedAt: z.any(),
  acceptedAt: z.any().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type OrganizationMember = z.infer<typeof organizationMemberSchema>;

