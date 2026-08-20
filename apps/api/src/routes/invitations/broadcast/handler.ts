import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  canSendProjectInvitations,
  filterConsentedRecipients,
  isPurchasedListBlocked,
} from '../../../lib/invitations/broadcast.js';

export interface InvitationsBroadcastBody {
  projectId?: unknown;
  subject?: unknown;
  bodyTemplate?: unknown;
  termsVersion?: unknown;
}

export interface BroadcastRunResult {
  emailSentCount: number;
  inAppSentCount: number;
  totalCount: number;
}

export type RunInvitationsBroadcastFn = (input: {
  callerUid: string;
  projectId: string;
  subject: string;
  bodyTemplate: string;
  termsVersion?: number;
}) => Promise<BroadcastRunResult>;

export interface InvitationsBroadcastPostDeps {
  requireAuth?: RequireAuthFn;
  authorizeBroadcast?: (input: {
    callerUid: string;
    projectId: string;
  }) => Promise<
    | { ok: true }
    | { ok: false; status: number; error: string }
  >;
  checkRecentBroadcast?: (projectId: string) => Promise<boolean>;
  runBroadcast?: RunInvitationsBroadcastFn;
}

/**
 * POST /api/invitations/broadcast — authenticated bulk invitation send.
 */
export async function handleInvitationsBroadcastPost(
  body: InvitationsBroadcastBody,
  deps: InvitationsBroadcastPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const projectId = body.projectId;
  const subject = body.subject;
  const bodyTemplate = body.bodyTemplate;

  if (
    !projectId ||
    typeof projectId !== 'string' ||
    !subject ||
    typeof subject !== 'string' ||
    !bodyTemplate ||
    typeof bodyTemplate !== 'string'
  ) {
    return jsonResponse(400, {
      success: false,
      error: 'Missing required fields: projectId, subject, bodyTemplate',
    });
  }

  if (deps.authorizeBroadcast) {
    const authz = await deps.authorizeBroadcast({
      callerUid: auth.uid,
      projectId,
    });
    if (!authz.ok) {
      return jsonResponse(authz.status, { success: false, error: authz.error });
    }
  }

  if (deps.checkRecentBroadcast && (await deps.checkRecentBroadcast(projectId))) {
    return jsonResponse(429, {
      success: false,
      error: 'Rate limit: An invitation has already been sent for this deal in the last 24 hours.',
    });
  }

  if (!deps.runBroadcast) {
    return jsonResponse(500, { success: false, error: 'Broadcast runner not configured' });
  }

  try {
    const termsVersion =
      typeof body.termsVersion === 'number' ? body.termsVersion : undefined;

    const result = await deps.runBroadcast({
      callerUid: auth.uid,
      projectId,
      subject,
      bodyTemplate,
      termsVersion,
    });

    return jsonResponse(200, {
      success: true,
      emailSentCount: result.emailSentCount,
      inAppSentCount: result.inAppSentCount,
      totalCount: result.totalCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Invitations/Broadcast] General Error:', message);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}

export { canSendProjectInvitations, filterConsentedRecipients, isPurchasedListBlocked };
