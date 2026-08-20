import { jsonResponse, type RouteResult } from '../../../http/response.js';

export interface AuthContext {
  uid: string;
}

export interface AuthFailure {
  status: number;
  body: unknown;
}

export type RequireAuthFn = () => Promise<AuthContext | AuthFailure>;

export interface SessionRecord {
  id: string;
  device?: string;
  location?: string;
  ip?: string;
  isCurrent?: boolean;
  lastActiveAt?: string;
  [key: string]: unknown;
}

export interface SessionsListDeps {
  authenticate?: RequireAuthFn;
  listSessions?: (uid: string) => Promise<SessionRecord[]>;
}

function isAuthFailure(result: AuthContext | AuthFailure): result is AuthFailure {
  return 'status' in result && 'body' in result && !('uid' in result);
}

/**
 * GET /api/auth/sessions — migrated read path from PaperWorking src/app/api/auth/sessions/route.ts
 * Write/seed behavior removed; inject listSessions for production wiring.
 */
export async function handleSessionsGet(deps: SessionsListDeps = {}): Promise<RouteResult> {
  if (deps.authenticate) {
    const auth = await deps.authenticate();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const sessions = deps.listSessions ? await deps.listSessions(auth.uid) : [];
    return jsonResponse(200, sessions);
  }

  return jsonResponse(401, { error: 'Unauthorized' });
}
