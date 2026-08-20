export const INVITE_ROLES = new Set(['Lead Investor', 'Admin', 'Platform Admin']);

export interface SendInvitationBody {
  projectId?: unknown;
  dealName?: unknown;
  email?: unknown;
  name?: unknown;
  proposedEquityPercent?: unknown;
  proposedAmount?: unknown;
}

export function validateSendInvitationBody(
  body: SendInvitationBody,
): { ok: true; projectId: string; email: string; name: string; proposedEquityPercent: number; proposedAmount: number } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const proposedEquityPercent = body.proposedEquityPercent;
  const proposedAmount = typeof body.proposedAmount === 'number' ? body.proposedAmount : 0;

  if (!projectId || !email || !name) {
    return {
      ok: false,
      error: 'Missing required fields: projectId, email, name',
      status: 400,
    };
  }

  if (
    typeof proposedEquityPercent !== 'number' ||
    proposedEquityPercent <= 0 ||
    proposedEquityPercent > 100
  ) {
    return {
      ok: false,
      error: 'Equity percentage must be a number between 0 and 100',
      status: 400,
    };
  }

  return { ok: true, projectId, email, name, proposedEquityPercent, proposedAmount };
}

export function canSendInvitation(input: {
  callerUid: string;
  members: Record<string, { role?: string; projectPermissions?: string[] }>;
  organizationId: string;
  callerOrgId?: string;
  callerRole?: string;
}): boolean {
  const member = input.members[input.callerUid];
  if (member) {
    const hasInviteRole = INVITE_ROLES.has(member.role ?? '');
    const hasInvitePermission =
      Array.isArray(member.projectPermissions) &&
      member.projectPermissions.includes('team.invite');
    return hasInviteRole || hasInvitePermission;
  }

  if (
    input.callerOrgId &&
    input.callerOrgId === input.organizationId &&
    INVITE_ROLES.has(input.callerRole ?? '')
  ) {
    return true;
  }

  return false;
}

export function generateInvitationToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

export function buildInvitationRecord(input: {
  projectId: string;
  dealName: string;
  organizationId: string;
  email: string;
  name: string;
  proposedEquityPercent: number;
  proposedAmount: number;
  invitedByUid: string;
  invitedByName: string;
  token: string;
}): Record<string, unknown> {
  const invitationId = `inv_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
  return {
    id: invitationId,
    projectId: input.projectId,
    dealName: input.dealName,
    organizationId: input.organizationId,
    email: input.email,
    name: input.name,
    proposedEquityPercent: input.proposedEquityPercent,
    proposedAmount: input.proposedAmount,
    invitedByUid: input.invitedByUid,
    invitedByName: input.invitedByName,
    token: input.token,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

export function buildInviteUrl(token: string, appUrl?: string): string {
  const base = appUrl || 'https://paperworking.co';
  return `${base}/invest/${token}`;
}
