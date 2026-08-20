import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  buildInviteDocument,
  canCreateDealInvite,
  createInviteSchema,
} from '../../lib/invites/schema.js';

export type GetInviterAccountTypeFn = (uid: string) => Promise<string | undefined>;
export type ValidateInviteRecipientFn = (
  email: string,
) => Promise<{ ok: true } | { ok: false; error: string; action?: string }>;
export type SaveInviteFn = (doc: Record<string, unknown>) => Promise<string>;
export type ListInvitesByUserFn = (uid: string) => Promise<Array<Record<string, unknown>>>;

export interface InvitesPostDeps {
  requireAuth?: RequireAuthFn;
  getInviterAccountType?: GetInviterAccountTypeFn;
  validateRecipient?: ValidateInviteRecipientFn;
  saveInvite?: SaveInviteFn;
  generateInviteId?: () => string;
}

export interface InvitesGetDeps {
  requireAuth?: RequireAuthFn;
  listInvites?: ListInvitesByUserFn;
}

/**
 * POST /api/invites — create team/deal invite.
 */
export async function handleInvitesPost(
  body: unknown,
  deps: InvitesPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const accountType = deps.getInviterAccountType
      ? await deps.getInviterAccountType(auth.uid)
      : 'investment_team';

    if (!canCreateDealInvite(accountType)) {
      return jsonResponse(403, {
        error: 'Only Investment Team accounts can invite others to Deals.',
      });
    }

    const validation = createInviteSchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse(400, {
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const payload = validation.data;

    if (deps.validateRecipient) {
      const recipientCheck = await deps.validateRecipient(payload.email);
      if (!recipientCheck.ok) {
        return jsonResponse(400, {
          error: recipientCheck.error,
          action: recipientCheck.action,
          teamOptions: [],
        });
      }
    }

    const inviteId = deps.generateInviteId?.() ?? `inv_${Date.now()}`;
    const inviteDoc = buildInviteDocument(inviteId, auth.uid, payload);

    if (deps.saveInvite) {
      await deps.saveInvite(inviteDoc);
    }

    return jsonResponse(201, {
      success: true,
      inviteId,
      status: 'pending',
      invite: inviteDoc,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Invites POST Error]:', message);
    return jsonResponse(500, { error: 'Failed to create invite', details: message });
  }
}

/**
 * GET /api/invites — list invites created by caller.
 */
export async function handleInvitesGet(deps: InvitesGetDeps = {}): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const invites = deps.listInvites ? await deps.listInvites(auth.uid) : [];
    return jsonResponse(200, { success: true, invites });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Invites GET Error]:', message);
    return jsonResponse(500, { error: 'Failed to fetch invites', details: message });
  }
}
