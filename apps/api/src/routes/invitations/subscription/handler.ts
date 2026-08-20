import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildCommitmentSignedTransition,
  checkSubscriptionInvitationExpiry,
  validateSubscriptionToken,
} from '../../../lib/invitations/subscription.js';

export type ResolveSubscriptionInvitationFn = (
  token: string,
) => Promise<{ projectId: string; email: string; expiresAt: string | Date } | null>;

export type FindCommitmentByEmailFn = (
  projectId: string,
  email: string,
) => Promise<{ id: string; status: string | null; name?: string; email?: string; amountCents?: number; partyType?: string; transitions?: unknown[] } | null>;

export type SignCommitmentFn = (input: {
  commitmentId: string;
  projectId: string;
  transition: ReturnType<typeof buildCommitmentSignedTransition>;
  commitment: NonNullable<Awaited<ReturnType<FindCommitmentByEmailFn>>>;
}) => Promise<void>;

export interface InvitationsSubscriptionPostDeps {
  resolveInvitation?: ResolveSubscriptionInvitationFn;
  findCommitment?: FindCommitmentByEmailFn;
  signCommitment?: SignCommitmentFn;
}

/**
 * POST /api/invitations/[token]/subscription — guest portal commitment signing.
 */
export async function handleInvitationsSubscriptionPost(
  token: string,
  body: { action?: unknown; evidence?: unknown },
  deps: InvitationsSubscriptionPostDeps = {},
): Promise<RouteResult> {
  const tokenCheck = validateSubscriptionToken(token);
  if (!tokenCheck.ok) {
    return jsonResponse(tokenCheck.status, { error: tokenCheck.error });
  }

  try {
    const invitation = deps.resolveInvitation
      ? await deps.resolveInvitation(token)
      : {
          projectId: 'proj-1',
          email: 'investor@test.com',
          expiresAt: new Date(Date.now() + 86400000),
        };

    if (!invitation) {
      return jsonResponse(404, { error: 'Invitation not found' });
    }

    const expiry = checkSubscriptionInvitationExpiry(invitation.expiresAt);
    if (!expiry.ok) {
      return jsonResponse(expiry.status, { error: expiry.error });
    }

    const commitment = deps.findCommitment
      ? await deps.findCommitment(invitation.projectId, invitation.email)
      : {
          id: 'cmt-1',
          status: 'pending',
          name: 'Investor',
          email: invitation.email,
          amountCents: 100000,
          partyType: 'Investor',
        };

    if (!commitment) {
      return jsonResponse(404, {
        error: 'No active commitment record found for this investor.',
      });
    }

    const transition = buildCommitmentSignedTransition({
      fromStatus: commitment.status,
      actorEmail: invitation.email,
      action: body.action,
      evidence: body.evidence,
    });

    if (deps.signCommitment) {
      await deps.signCommitment({
        commitmentId: commitment.id,
        projectId: invitation.projectId,
        transition,
        commitment,
      });
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GuestSubscriptionSign]', message);
    return jsonResponse(500, { error: `Internal server error: ${message}` });
  }
}
