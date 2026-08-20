import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildAcceptInvitationResponse,
  checkInvitationAcceptable,
  validateAcceptToken,
} from '../../../lib/invitations/accept.js';

export type ResolvePendingInvitationFn = (
  token: string,
) => Promise<{
  status: string;
  expiresAt: string | Date;
  projectId: string;
  dealName?: string;
  proposedEquityPercent?: number;
  invitedByName?: string;
} | null>;

export interface InvitationsAcceptGetDeps {
  resolveInvitation?: ResolvePendingInvitationFn;
}

/**
 * GET /api/invitations/accept?token=
 */
export async function handleInvitationsAcceptGet(
  query: { token?: string | null },
  deps: InvitationsAcceptGetDeps = {},
): Promise<RouteResult> {
  const tokenCheck = validateAcceptToken(query.token);
  if (!tokenCheck.ok) {
    return jsonResponse(tokenCheck.status, { success: false, error: tokenCheck.error });
  }

  try {
    const invitation = deps.resolveInvitation
      ? await deps.resolveInvitation(tokenCheck.token)
      : {
          status: 'pending',
          expiresAt: new Date(Date.now() + 86400000),
          projectId: 'proj-1',
          dealName: 'Sample Deal',
          proposedEquityPercent: 10,
          invitedByName: 'Lead Investor',
        };

    if (!invitation) {
      return jsonResponse(404, {
        success: false,
        error: 'Invalid or expired invitation token',
      });
    }

    const acceptable = checkInvitationAcceptable({
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    });
    if (!acceptable.ok) {
      return jsonResponse(acceptable.status, { success: false, error: acceptable.error });
    }

    return jsonResponse(
      200,
      buildAcceptInvitationResponse({
        token: tokenCheck.token,
        projectId: invitation.projectId,
        dealName: invitation.dealName,
        proposedEquityPercent: invitation.proposedEquityPercent,
        invitedByName: invitation.invitedByName,
      }),
    );
  } catch (error: unknown) {
    console.error('[Invitations] Error accepting invitation:', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}
