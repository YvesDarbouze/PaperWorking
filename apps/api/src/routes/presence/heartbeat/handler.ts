import { jsonResponse, type RouteResult } from '../../../http/response.js';

export type VerifyBearerTokenFn = (authorization?: string | null) => Promise<{ uid: string } | null>;
export type MarkPresenceOnlineFn = (uid: string) => Promise<void>;

/**
 * POST /api/presence/heartbeat
 */
export async function handlePresenceHeartbeatPost(
  headers: { authorization?: string | null },
  deps: { verifyBearer?: VerifyBearerTokenFn; markOnline?: MarkPresenceOnlineFn } = {},
): Promise<RouteResult> {
  try {
    const auth = deps.verifyBearer ? await deps.verifyBearer(headers.authorization) : null;
    if (!auth) return jsonResponse(401, { error: 'Unauthorized' });

    if (deps.markOnline) await deps.markOnline(auth.uid);
    return jsonResponse(200, { success: true, status: 'online' });
  } catch (err: unknown) {
    console.error('[Presence Heartbeat]', err);
    return jsonResponse(500, { error: 'Internal Server Error' });
  }
}
