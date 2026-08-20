export function validateAcceptToken(
  token: string | null | undefined,
): { ok: true; token: string } | { ok: false; error: string; status: number } {
  if (!token) {
    return { ok: false, error: 'Missing invitation token', status: 400 };
  }
  return { ok: true, token };
}

export function checkInvitationAcceptable(input: {
  status: string;
  expiresAt: string | Date;
  now?: Date;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (input.status !== 'pending') {
    return { ok: false, error: 'Invitation has already been processed', status: 410 };
  }

  const now = input.now ?? new Date();
  const expiresAt =
    input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt);
  if (expiresAt.getTime() < now.getTime()) {
    return { ok: false, error: 'Invitation link has expired', status: 410 };
  }

  return { ok: true };
}

export function buildAcceptInvitationResponse(input: {
  token: string;
  projectId: string;
  dealName?: string;
  proposedEquityPercent?: number;
  invitedByName?: string;
}): Record<string, unknown> {
  return {
    success: true,
    action: 'redirect_to_register',
    redirectUrl: `/register?invite=${input.token}`,
    context: {
      projectId: input.projectId,
      dealName: input.dealName,
      proposedEquity: input.proposedEquityPercent,
      invitedBy: input.invitedByName,
    },
    message: 'Invitation verified. Proceed to registration.',
  };
}
