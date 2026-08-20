import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  formatDealUpdateRow,
  validateUpdatesToken,
  type RawDealUpdate,
} from '../../../lib/invitations/updates.js';

export type ResolveInvitationProjectFn = (token: string) => Promise<{ projectId: string } | null>;

export type LoadDealUpdatesFn = (
  projectId: string,
) => Promise<Array<{ id: string; data: RawDealUpdate }>>;

export interface InvitationsUpdatesGetDeps {
  resolveInvitation?: ResolveInvitationProjectFn;
  loadDealUpdates?: LoadDealUpdatesFn;
}

/**
 * GET /api/invitations/[token]/updates — public guest portal feed.
 */
export async function handleInvitationsUpdatesGet(
  token: string,
  deps: InvitationsUpdatesGetDeps = {},
): Promise<RouteResult> {
  const tokenCheck = validateUpdatesToken(token);
  if (!tokenCheck.ok) {
    return jsonResponse(tokenCheck.status, { error: tokenCheck.error });
  }

  try {
    const invitation = deps.resolveInvitation
      ? await deps.resolveInvitation(token)
      : { projectId: 'proj-1' };

    if (!invitation) {
      return jsonResponse(404, { error: 'Invitation not found' });
    }

    const rows = deps.loadDealUpdates
      ? await deps.loadDealUpdates(invitation.projectId)
      : [];

    const updates = rows.map((row) => formatDealUpdateRow(row.id, row.data));

    return jsonResponse(200, { updates });
  } catch (error: unknown) {
    console.error('[GuestPortal] Deal updates lookup failed:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
