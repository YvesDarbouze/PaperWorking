import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  role: z.enum(['team_member', 'vendor', 'investor']).default('team_member'),
  professionalRole: z.string().optional().default('General Specialist'),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  customMessage: z.string().optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const INVESTMENT_TEAM_ACCOUNT_TYPES = new Set(['investment_team', 'team']);

export function canCreateDealInvite(accountType: string | undefined): boolean {
  return INVESTMENT_TEAM_ACCOUNT_TYPES.has(accountType ?? '');
}

export function buildInviteDocument(
  inviteId: string,
  uid: string,
  payload: CreateInviteInput,
  now: Date = new Date(),
): Record<string, unknown> {
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    invite_id: inviteId,
    id: inviteId,
    invited_by: uid,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email,
    role: payload.role,
    account_type:
      payload.role === 'vendor'
        ? 'vendor'
        : payload.role === 'investor'
          ? 'investor'
          : 'team',
    professionalRole: payload.professionalRole,
    projectId: payload.projectId || null,
    projectName: payload.projectName || null,
    customMessage: payload.customMessage || null,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
