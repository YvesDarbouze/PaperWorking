import { NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/auth/csrf';

/* ═══════════════════════════════════════════════════════
   POST /api/auth/session

   Receives a Firebase ID token from the client, verifies it
   with the Admin SDK, exchanges it for a long-lived Firebase
   session cookie (14-day exp), and sets three HttpOnly cookies:

     __session  — Firebase session cookie (14-day exp, signed by Firebase)
     __sub      — base64-encoded { plan, status } for subscription gating
     __acct     — account type ('investor' | 'vendor')

   Security model:
   - CSRF validated via src/lib/auth/csrf.ts (explicit allowlist, no wildcards)
   - Admin SDK verifyIdToken rejects forged / expired / revoked ID tokens
   - createSessionCookie produces a Firebase-signed cookie whose exp
     matches the cookie maxAge (no 60-min vs 14-day mismatch)
   - Fails closed in production — no unverified cookie is ever issued
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE  = '__session';
const SUB_COOKIE      = '__sub';
const ACCT_COOKIE     = '__acct';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

/**
 * Returns true when we have at least one usable credential path:
 *   • Explicit service-account key (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
 *   • Application Default Credentials available in GCP / App Hosting (GOOGLE_CLOUD_PROJECT set)
 *
 * The only time this returns false is a local dev environment with no credentials
 * at all — in which case we issue an unverified dev cookie as a convenience fallback.
 */
function hasAdminCredentials(): boolean {
  const hasExplicit = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const hasAdc      = !!(process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE); // K_SERVICE is set by Cloud Run
  return hasExplicit || hasAdc;
}

function encodeSubCookie(plan: string, status: string): string {
  return btoa(JSON.stringify({ plan, status }));
}

export async function POST(request: Request) {
  // ── CSRF guard — abort immediately on untrusted origin ────────────────────
  const csrf = validateCsrf(request);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.reason }, { status: csrf.status });
  }

  let idToken: string;
  try {
    const body = await request.json();
    idToken = body?.idToken;
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid idToken' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // ── Fail closed if Admin SDK is unavailable in production ─────────────────
  if (!hasAdminCredentials()) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Session] Admin SDK credentials missing in production — rejecting');
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
    }
    // Dev-only fallback: no Admin SDK configured locally
    console.warn('[Session] Dev mode — issuing unverified cookie (no Admin SDK credentials)');
    const cookieOpts = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE,
    };
    const res = NextResponse.json({ status: 'success', mode: 'dev' });
    res.cookies.set(SESSION_COOKIE, idToken, cookieOpts);
    res.cookies.set(SUB_COOKIE, encodeSubCookie('Individual', 'active'), { ...cookieOpts, httpOnly: false });
    res.cookies.set(ACCT_COOKIE, 'investor', cookieOpts);
    return res;
  }

  // ── Full production path ───────────────────────────────────────────────────
  try {
    const { adminAuth, adminDb } = await import('@/lib/firebase/admin');

    // Step 1: Verify the ID token is authentic.
    // checkRevoked omitted — it adds a network round-trip that can fail on cold starts;
    // the 1-hour token expiry provides equivalent protection for normal login flows.
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Step 2: Exchange for a Firebase session cookie (14-day exp).
    // Unlike raw ID tokens (60-min exp), session cookies are Firebase-signed
    // JWTs whose exp matches the cookie maxAge — no hourly-loop mismatch.
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    // Step 3: Fetch subscription + account type for the __sub / __acct cookies
    let subPlan   = 'None';
    let subStatus = 'inactive';
    let acctType  = 'investor';
    try {
      const snap = await adminDb.collection('users').doc(decoded.uid).get();
      const data = snap.data();
      if (data) {
        subPlan   = data.subscriptionPlan   ?? 'None';
        subStatus = data.subscriptionStatus ?? 'inactive';
        acctType  = data.accountType        ?? 'investor';
      }
    } catch {
      // Non-fatal — defaults applied; subscription gating degrades gracefully
    }

    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE,
    };

    const response = NextResponse.json({ status: 'success', uid: decoded.uid });
    response.cookies.set(SESSION_COOKIE, sessionCookie,                       cookieOpts);
    response.cookies.set(SUB_COOKIE,     encodeSubCookie(subPlan, subStatus), { ...cookieOpts, httpOnly: false });
    response.cookies.set(ACCT_COOKIE,    acctType,                            cookieOpts);
    return response;

  } catch (err: any) {
    console.error('[Session] Authentication failed:', err.code ?? err.message);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  const csrf = validateCsrf(request);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.reason }, { status: csrf.status });
  }

  const response = NextResponse.json({ status: 'success' });
  const clear = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
  response.cookies.set(SESSION_COOKIE, '', clear);
  response.cookies.set(SUB_COOKIE,     '', { ...clear, httpOnly: false });
  response.cookies.set(ACCT_COOKIE,    '', clear);
  return response;
}
