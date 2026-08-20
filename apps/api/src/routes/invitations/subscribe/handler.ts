import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildNewSubscriberContact,
  validateSubscribeBody,
} from '../../../lib/invitations/subscribe.js';

export type BlockVendorFn = () => Promise<boolean>;

export type ResolveInvitationForSubscribeFn = (
  token: string,
) => Promise<{ projectId: string; email?: string; name?: string } | null>;

export type SubscribeInvestorFn = (input: {
  projectId: string;
  email: string;
  name: string | null;
  fallbackName?: string;
}) => Promise<void>;

export interface InvitationsSubscribePostDeps {
  blockVendor?: BlockVendorFn;
  resolveInvitation?: ResolveInvitationForSubscribeFn;
  subscribeInvestor?: SubscribeInvestorFn;
}

/**
 * POST /api/invitations/[token]/subscribe
 */
export async function handleInvitationsSubscribePost(
  token: string,
  body: { name?: unknown; email?: unknown },
  deps: InvitationsSubscribePostDeps = {},
): Promise<RouteResult> {
  if (deps.blockVendor && (await deps.blockVendor())) {
    return jsonResponse(404, { error: 'Not Found' });
  }

  const validated = validateSubscribeBody(token, body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  try {
    const invitation = deps.resolveInvitation
      ? await deps.resolveInvitation(token)
      : { projectId: 'proj-1', email: validated.email, name: validated.name ?? undefined };

    if (!invitation) {
      return jsonResponse(404, { error: 'Invitation not found.' });
    }

    const email = validated.email || (invitation.email ?? '').trim().toLowerCase();

    if (deps.subscribeInvestor) {
      await deps.subscribeInvestor({
        projectId: invitation.projectId,
        email,
        name: validated.name,
        fallbackName: invitation.name,
      });
    } else {
      buildNewSubscriberContact({
        email,
        name: validated.name,
        fallbackName: invitation.name,
      });
    }

    return jsonResponse(200, {
      success: true,
      message: 'Successfully subscribed. Deal unlocked.',
    });
  } catch (error: unknown) {
    console.error('[Subscribe] Error:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
