import type { AuthUser } from '@paperworking/authz';
import { jsonResponse, type RouteResult } from '../../../http/response.js';

/** Legacy auth callback types used by other route handlers. */
export interface AuthContext {
  uid: string;
}

export interface AuthFailure {
  status: number;
  body: unknown;
}

export type RequireAuthFn = () => Promise<AuthContext | AuthFailure>;

export interface AuthSessionRecord {
  id: string;
  uid: string;
  createdAt: string;
  lastActiveAt: string;
  userAgent: string;
  current: true;
}

/** Exact Nest GET /api/auth/sessions response body (AuthService.listSessions). */
export interface AuthSessionsResponse {
  success: true;
  incomplete: true;
  stub: true;
  message: string;
  sessions: AuthSessionRecord[];
}

export interface AuthSessionsDeps {
  now?: () => Date;
}

export function buildAuthSessionsResponse(
  user: AuthUser,
  userAgent?: string,
  deps: AuthSessionsDeps = {},
): AuthSessionsResponse {
  const timestamp = (deps.now ?? (() => new Date()))().toISOString();

  return {
    success: true,
    incomplete: true,
    stub: true,
    message: 'Multi-device session listing is not implemented; showing current session only.',
    sessions: [
      {
        id: 'sess_current',
        uid: user.uid,
        createdAt: timestamp,
        lastActiveAt: timestamp,
        userAgent: userAgent || 'unknown',
        current: true,
      },
    ],
  };
}

/**
 * GET /api/auth/sessions — shared handler for Nest parity and Next.js adapter.
 * Caller must resolve AuthUser via @paperworking/services session resolver.
 */
export async function handleAuthSessionsGet(
  user: AuthUser | null,
  userAgent?: string,
  deps: AuthSessionsDeps = {},
): Promise<RouteResult> {
  if (!user) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const body = buildAuthSessionsResponse(user, userAgent, deps);
  return jsonResponse(200, body);
}
