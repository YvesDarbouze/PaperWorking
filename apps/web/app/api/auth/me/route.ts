import { handleAuthMeGet } from '@paperworking/api';
import { NEXT_SESSION_MAX_AGE_SEC, readCookieFromHeader } from '@paperworking/services';
import { buildAuthMeDeps, buildHandlerDeps } from '@/lib/api/handler-deps';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import { ACCT_COOKIE, SESSION_COOKIE, SUB_COOKIE, decodeSubCookie, encodeSubCookie } from '@/lib/auth/session-cookies';
import { verifySessionTokenEdge } from '@/lib/auth/session-edge';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — DB-authoritative session via shared Phase 9A resolver. */
export async function GET(request: Request) {
  const deps = buildHandlerDeps();
  const user = await resolveAuthUserFromRequest(request, deps);
  const result = await handleAuthMeGet(user, buildAuthMeDeps(deps));
  const response = toNextResponse(result);

  // Edge fallback: HMAC session cookies (dev/mock flows) validate without Admin SDK.
  if (result.status === 401) {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    const secret = process.env.SESSION_SECRET || 'paperworking_session_secure_key_2026_prod';
    const edgeValid = session ? await verifySessionTokenEdge(session, secret) : false;
    if (edgeValid) {
      const sub = decodeSubCookie(readCookieFromHeader(request.headers.get('cookie'), SUB_COOKIE));
      return NextResponse.json({
        authenticated: true,
        accountType: cookieStore.get(ACCT_COOKIE)?.value ?? 'investor',
        subscriptionPlan: sub.plan,
        subscriptionStatus: sub.status,
      });
    }
  }

  // Keep the client-readable __sub cookie in sync with the effective plan so
  // tier-aware UI/routes do not lag behind server-side entitlement changes
  // (e.g. internal Team-tier override) until the next login.
  const body = result.body as { subscriptionPlan?: string; subscriptionStatus?: string } | null;
  if (result.status === 200 && body?.subscriptionPlan) {
    const current = decodeSubCookie(readCookieFromHeader(request.headers.get('cookie'), SUB_COOKIE));
    const nextStatus = body.subscriptionStatus || 'active';
    if (current.plan !== body.subscriptionPlan || current.status !== nextStatus) {
      response.cookies.set(SUB_COOKIE, encodeSubCookie(body.subscriptionPlan, nextStatus), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: NEXT_SESSION_MAX_AGE_SEC,
      });
    }
  }

  return response;
}
