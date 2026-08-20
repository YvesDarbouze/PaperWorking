import { jsonResponse, type RouteResult } from '../../../http/response.js';

export type RevokeUserSessionsFn = (idToken: string) => Promise<void>;

export interface AuthRevokePostDeps {
  revokeSessions?: RevokeUserSessionsFn;
}

/**
 * POST /api/auth/revoke
 */
export async function handleAuthRevokePost(
  body: { idToken?: unknown },
  deps: AuthRevokePostDeps = {},
): Promise<RouteResult> {
  try {
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    if (!idToken) {
      return jsonResponse(400, { error: 'Missing idToken' });
    }

    if (deps.revokeSessions) {
      await deps.revokeSessions(idToken);
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error revoking sessions:', message);
    return jsonResponse(500, { error: 'Failed to revoke sessions', details: message });
  }
}
