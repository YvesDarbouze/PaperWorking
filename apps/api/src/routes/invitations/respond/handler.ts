import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildInvitationStatusUpdate,
  validateInvitationRespondBody,
  type InvitationRespondAction,
} from '../../../lib/invitations/respond.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export type CheckInvitationRateLimitFn = (
  token: string,
) => Promise<RateLimitCheckResult>;

export interface InvitationRespondContext {
  token: string;
  action: InvitationRespondAction;
  signatureDataUrl?: string;
  declineReason?: string;
  disclosedCard?: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
}

export type ProcessInvitationResponseFn = (
  ctx: InvitationRespondContext,
) => Promise<{ invitationId: string }>;

export interface InvitationsRespondPostDeps {
  checkRateLimit?: CheckInvitationRateLimitFn;
  processResponse?: ProcessInvitationResponseFn;
}

/**
 * POST /api/invitations/respond — unauthenticated investor response by token.
 */
export async function handleInvitationsRespondPost(
  body: Record<string, unknown>,
  deps: InvitationsRespondPostDeps = {},
): Promise<RouteResult> {
  try {
    const validated = validateInvitationRespondBody(body);
    if (!validated.ok) {
      return jsonResponse(validated.status, { error: validated.error });
    }

    const { token, action, signatureDataUrl, declineReason, disclosedCard } = validated.value;

    if (deps.checkRateLimit) {
      const rateCheck = await deps.checkRateLimit(token);
      if (!rateCheck.allowed) {
        return jsonResponse(429, {
          error: 'Rate limit exceeded.',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
      }
    }

    if (!deps.processResponse) {
      return jsonResponse(500, { error: 'Invitation processor not configured' });
    }

    const result = await deps.processResponse({
      token,
      action,
      signatureDataUrl,
      declineReason,
      disclosedCard,
    });

    return jsonResponse(200, {
      success: true,
      action,
      invitationId: result.invitationId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = (err as { status?: number })?.status ?? 500;
    if (status !== 500) {
      return jsonResponse(status, { error: message });
    }
    console.error('[Invitations/Respond] Error:', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}

export { buildInvitationStatusUpdate, validateInvitationRespondBody };
