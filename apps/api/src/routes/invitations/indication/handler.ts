import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildIndicationUpdate,
  checkInvitationNotExpired,
  validateIndicationBody,
} from '../../../lib/invitations/indication.js';

export type BlockVendorFn = () => Promise<boolean>;

export type ResolveInvitationByTokenFn = (
  token: string,
) => Promise<{ expiresAt: string | Date; projectId: string } | null>;

export type UpdateInvitationIndicationFn = (
  token: string,
  update: Record<string, unknown> | { indication: null },
) => Promise<void>;

export type NotifyIndicationChangeFn = (input: {
  token: string;
  type: 'updated' | 'withdrawn';
  indication?: { type: string; value: number; currency: string | null };
}) => Promise<void>;

export interface InvitationsIndicationDeps {
  blockVendor?: BlockVendorFn;
  resolveInvitation?: ResolveInvitationByTokenFn;
  updateIndication?: UpdateInvitationIndicationFn;
  notifyChange?: NotifyIndicationChangeFn;
}

/**
 * POST /api/invitations/[token]/indication
 */
export async function handleInvitationsIndicationPost(
  token: string,
  body: { type?: unknown; value?: unknown; currency?: unknown },
  deps: InvitationsIndicationDeps = {},
): Promise<RouteResult> {
  if (deps.blockVendor && (await deps.blockVendor())) {
    return jsonResponse(404, { error: 'Not Found' });
  }

  const validated = validateIndicationBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  try {
    const invitation = deps.resolveInvitation
      ? await deps.resolveInvitation(token)
      : { expiresAt: new Date(Date.now() + 86400000), projectId: 'proj-1' };

    if (!invitation) {
      return jsonResponse(404, { error: 'Invitation not found.' });
    }

    const expiry = checkInvitationNotExpired(invitation.expiresAt);
    if (!expiry.ok) {
      return jsonResponse(expiry.status, { error: expiry.error });
    }

    const update = buildIndicationUpdate(validated.type, validated.value, validated.currency);
    if (deps.updateIndication) {
      await deps.updateIndication(token, update);
    }
    if (deps.notifyChange) {
      await deps.notifyChange({
        token,
        type: 'updated',
        indication: {
          type: validated.type,
          value: validated.value,
          currency: validated.currency,
        },
      });
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Indication POST Error]', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}

/**
 * DELETE /api/invitations/[token]/indication
 */
export async function handleInvitationsIndicationDelete(
  token: string,
  deps: InvitationsIndicationDeps = {},
): Promise<RouteResult> {
  if (deps.blockVendor && (await deps.blockVendor())) {
    return jsonResponse(404, { error: 'Not Found' });
  }

  try {
    const invitation = deps.resolveInvitation
      ? await deps.resolveInvitation(token)
      : { expiresAt: new Date(Date.now() + 86400000), projectId: 'proj-1' };

    if (!invitation) {
      return jsonResponse(404, { error: 'Invitation not found.' });
    }

    const expiry = checkInvitationNotExpired(invitation.expiresAt);
    if (!expiry.ok) {
      return jsonResponse(expiry.status, { error: expiry.error });
    }

    if (deps.updateIndication) {
      await deps.updateIndication(token, { indication: null });
    }
    if (deps.notifyChange) {
      await deps.notifyChange({ token, type: 'withdrawn' });
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Indication DELETE Error]', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
