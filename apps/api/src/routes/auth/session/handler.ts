import {
  jsonResponse,
  parseCookieHeader,
  type CookieOptions,
  type HttpRequestLike,
  type RouteResult,
  type SetCookie,
} from '../../../http/response.js';
import { validateCsrf } from '../../../lib/auth/csrf.js';
import {
  ACCT_COOKIE,
  SESSION_COOKIE,
  SESSION_ID_COOKIE,
  SESSION_MAX_AGE,
  SUB_COOKIE,
  encodeSubCookie,
  hasAdminCredentials,
  parseDeviceFromUserAgent,
} from '../../../lib/auth/session-constants.js';
import type { EstablishSessionResult } from '@paperworking/services';

export interface SessionPostBody {
  idToken?: string;
}

export interface UserSessionProfile {
  subscriptionPlan: string;
  subscriptionStatus: string;
  accountType: string;
}

export interface SessionTrackInput {
  uid: string;
  sessionId: string;
  device: string;
  userAgent: string;
  ipAddress: string;
}

export interface SessionPostDeps {
  hasCredentials?: () => boolean;
  verifyIdToken?: (idToken: string) => Promise<{ uid: string }>;
  createSessionCookie?: (idToken: string, expiresInMs: number) => Promise<string>;
  getUserProfile?: (uid: string) => Promise<UserSessionProfile>;
  trackSession?: (input: SessionTrackInput) => Promise<void>;
  /** Shared SessionCommandService path — provisions user and builds cookie descriptors. */
  establishSharedSession?: (input: {
    idToken: string;
    sessionId: string;
  }) => Promise<EstablishSessionResult>;
  env?: {
    nodeEnv?: string;
    enableMockAuth?: boolean;
  };
}

export interface SessionDeleteDeps {
  hasCredentials?: () => boolean;
  verifySessionCookie?: (sessionCookie: string) => Promise<{ uid: string }>;
  invalidateSession?: (uid: string, sessionId: string) => Promise<void>;
  env?: {
    nodeEnv?: string;
  };
}

function validateCsrfFromRequest(request: HttpRequestLike): ReturnType<typeof validateCsrf> {
  return validateCsrf(request as Request);
}

function prodCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

function devCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

function clearCookies(nodeEnv?: string): SetCookie[] {
  const clear: CookieOptions = {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };
  return [
    { name: SESSION_COOKIE, value: '', options: clear },
    { name: SUB_COOKIE, value: '', options: { ...clear, httpOnly: false } },
    { name: ACCT_COOKIE, value: '', options: clear },
    { name: SESSION_ID_COOKIE, value: '', options: { ...clear, httpOnly: false } },
  ];
}

/**
 * POST /api/auth/session — migrated from PaperWorking src/app/api/auth/session/route.ts
 */
export async function handleSessionPost(
  request: HttpRequestLike,
  body: SessionPostBody,
  deps: SessionPostDeps = {},
): Promise<RouteResult> {
  const csrf = validateCsrfFromRequest(request);
  if (!csrf.ok) {
    return jsonResponse(csrf.status, { error: csrf.reason });
  }

  const idToken = body.idToken;
  if (!idToken || typeof idToken !== 'string') {
    return jsonResponse(400, { error: 'Missing or invalid idToken' });
  }

  const nodeEnv = deps.env?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  // Production can never enable mock auth, even if ENABLE_MOCK_AUTH=true.
  const requestedMock =
    deps.env?.enableMockAuth ?? process.env.ENABLE_MOCK_AUTH === 'true';
  const enableMockAuth = nodeEnv !== 'production' && Boolean(requestedMock);
  const hasCredentials = deps.hasCredentials ?? hasAdminCredentials;

  if (!hasCredentials()) {
    if (nodeEnv === 'production' || (!enableMockAuth && nodeEnv !== 'test')) {
      return jsonResponse(503, { error: 'Auth service unavailable' });
    }

    const cookieOpts = devCookieOpts();
    return jsonResponse(
      200,
      { status: 'success', mode: 'dev' },
      undefined,
      [
        { name: SESSION_COOKIE, value: idToken, options: cookieOpts },
        {
          name: SUB_COOKIE,
          value: encodeSubCookie('Individual', 'active'),
          options: { ...cookieOpts, httpOnly: false },
        },
        { name: ACCT_COOKIE, value: 'investor', options: cookieOpts },
      ],
    );
  }

  const verifyIdToken = deps.verifyIdToken;
  const createSessionCookie = deps.createSessionCookie;
  const establishSharedSession = deps.establishSharedSession;
  if (!verifyIdToken && !establishSharedSession) {
    return jsonResponse(503, { error: 'Auth service unavailable' });
  }

  try {
    const sessionId = crypto.randomUUID();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'Unknown';

    if (establishSharedSession) {
      const shared = await establishSharedSession({ idToken, sessionId });
      if (!shared.ok) {
        if (shared.status === 401) {
          return jsonResponse(401, {
            error: 'Token verification failed',
            detail: 'verify_failed',
          });
        }
        return jsonResponse(shared.status, shared.body as Record<string, unknown>);
      }

      if (deps.trackSession) {
        try {
          await deps.trackSession({
            uid: shared.uid,
            sessionId,
            device: parseDeviceFromUserAgent(userAgent),
            userAgent,
            ipAddress,
          });
        } catch {
          // Non-fatal — mirrors source behavior
        }
      }

      return jsonResponse(
        200,
        { status: 'success', uid: shared.uid },
        undefined,
        shared.cookies.map((c) => ({
          name: c.name,
          value: c.value,
          options: c.options as CookieOptions,
        })),
      );
    }

    if (!verifyIdToken) {
      return jsonResponse(503, { error: 'Auth service unavailable' });
    }

    let decoded: { uid: string };
    try {
      decoded = await verifyIdToken(idToken);
    } catch (verifyErr: unknown) {
      const code =
        verifyErr && typeof verifyErr === 'object' && 'code' in verifyErr
          ? String((verifyErr as { code: unknown }).code)
          : 'verify_failed';
      return jsonResponse(401, { error: 'Token verification failed', detail: code });
    }

    let cookieValue = idToken;
    if (createSessionCookie) {
      try {
        cookieValue = await createSessionCookie(idToken, SESSION_MAX_AGE * 1000);
      } catch {
        cookieValue = idToken;
      }
    }

    const profile = deps.getUserProfile
      ? await deps.getUserProfile(decoded!.uid)
      : {
          subscriptionPlan: 'None',
          subscriptionStatus: 'inactive',
          accountType: 'investor',
        };

    const legacySessionId = crypto.randomUUID();

    if (deps.trackSession) {
      try {
        await deps.trackSession({
          uid: decoded!.uid,
          sessionId: legacySessionId,
          device: parseDeviceFromUserAgent(userAgent),
          userAgent,
          ipAddress,
        });
      } catch {
        // Non-fatal — mirrors source behavior
      }
    }

    const cookieOpts = nodeEnv === 'production' ? prodCookieOpts() : devCookieOpts();
    return jsonResponse(
      200,
      { status: 'success', uid: decoded!.uid },
      undefined,
      [
        { name: SESSION_COOKIE, value: cookieValue, options: cookieOpts },
        {
          name: SUB_COOKIE,
          value: encodeSubCookie(profile.subscriptionPlan, profile.subscriptionStatus),
          options: { ...cookieOpts, httpOnly: false },
        },
        { name: ACCT_COOKIE, value: profile.accountType, options: cookieOpts },
        { name: SESSION_ID_COOKIE, value: legacySessionId, options: { ...cookieOpts, httpOnly: false } },
      ],
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(401, { error: 'Authentication failed', detail: message });
  }
}

/**
 * DELETE /api/auth/session — logout; clears session cookies.
 */
export async function handleSessionDelete(
  request: HttpRequestLike,
  deps: SessionDeleteDeps = {},
): Promise<RouteResult> {
  const csrf = validateCsrfFromRequest(request);
  if (!csrf.ok) {
    return jsonResponse(csrf.status, { error: csrf.reason });
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const sessionId = cookies[SESSION_ID_COOKIE];
  const sessionCookie = cookies[SESSION_COOKIE];
  const hasCredentials = deps.hasCredentials ?? hasAdminCredentials;

  if (sessionId && sessionCookie && hasCredentials() && deps.verifySessionCookie && deps.invalidateSession) {
    try {
      const decoded = await deps.verifySessionCookie(sessionCookie);
      await deps.invalidateSession(decoded.uid, sessionId);
    } catch {
      // Non-fatal
    }
  }

  const nodeEnv = deps.env?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  return jsonResponse(200, { status: 'success' }, undefined, clearCookies(nodeEnv));
}
