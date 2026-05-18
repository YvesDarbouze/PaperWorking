import { NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════
   POST /api/auth/session

   Receives a Firebase ID token from the client, verifies it
   with the Admin SDK, exchanges it for a long-lived Firebase
   session cookie (14-day exp), and sets three HttpOnly cookies:

     __session  — Firebase session cookie (14-day exp, signed by Firebase)
     __sub      — base64-encoded { plan, status } for subscription gating
     __acct     — account type ('investor' | 'vendor')

   Security model:
   - Admin SDK verifyIdToken rejects forged / expired / revoked ID tokens
   - createSessionCookie produces a Firebase-signed cookie whose exp
     matches the cookie maxAge (no 60-min vs 14-day mismatch)
   - Fails closed in production — no unverified cookie is ever issued
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE  = '__session';
const SUB_COOKIE      = '__sub';
const ACCT_COOKIE     = '__acct';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

function hasAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function encodeSubCookie(plan: string, status: string): string {
  return btoa(JSON.stringify({ plan, status }));
}

/**
 * CSRF Protection — validates that the request originates from our own domain.
 * Prevents cross-site cookie injection via forged POST/DELETE to /api/auth/session.
 */
function validateOrigin(request: Request): boolean {
  const origin  = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Allow localhost and RFC-1918 ranges in development
  if (process.env.NODE_ENV !== 'production') {
    if (!origin && !referer) return true;
    const isLocal = (str: string) => {
      try {
        const { hostname } = new URL(str);
        return (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          (hostname.startsWith('172.') &&
            parseInt(hostname.split('.')[1]) >= 16 &&
            parseInt(hostname.split('.')[1]) <= 31)
        );
      } catch {
        return str.includes('localhost:') || str.includes('127.0.0.1:');
      }
    };
    if (origin && isLocal(origin)) return true;
    if (referer && isLocal(referer)) return true;
  }

  // Explicit allowlist — no wildcards
  const allowedOrigins = new Set([
    process.env.NEXT_PUBLIC_APP_URL,          // https://paperworking.co (from apphosting.yaml)
    'https://paperworking.co',
    'https://www.paperworking.co',
    'https://paperworking-97055.web.app',     // Firebase Hosting (specific project only)
    'https://paperworking-97055.firebaseapp.com',
  ].filter(Boolean) as string[]);

  const isAllowedHost = (urlStr: string) => {
    try {
      return allowedOrigins.has(new URL(urlStr).origin);
    } catch {
      return false;
    }
  };

  if (origin && isAllowedHost(origin)) return true;
  if (referer && isAllowedHost(referer)) return true;

  console.warn('[Session CSRF] Rejected request — origin:', origin, 'referer:', referer);
  return false;
}

export async function POST(request: Request) {
  // ── CSRF guard ────────────────────────────────────────
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
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

  // ── Fail closed if Admin SDK is unavailable in production ─
  if (!hasAdminCredentials()) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Session] Admin SDK credentials missing in production — rejecting session creation');
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

  // ── Full production path ───────────────────────────────
  try {
    const { adminAuth, adminDb } = await import('@/lib/firebase/admin');

    // Step 1: Verify the ID token is authentic and not revoked
    const decoded = await adminAuth.verifyIdToken(idToken, /* checkRevoked */ true);

    // Step 2: Exchange for a Firebase session cookie (14-day exp).
    // Unlike ID tokens (which expire in 60 min), session cookies are
    // Firebase-managed JWTs whose exp claim matches the cookie maxAge —
    // eliminating the 60-min vs 14-day mismatch that caused hourly loops.
    const expiresInMs = SESSION_MAX_AGE * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs });

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
    response.cookies.set(SESSION_COOKIE, sessionCookie,                          cookieOpts);
    response.cookies.set(SUB_COOKIE,     encodeSubCookie(subPlan, subStatus),    { ...cookieOpts, httpOnly: false });
    response.cookies.set(ACCT_COOKIE,    acctType,                               cookieOpts);
    return response;

  } catch (err: any) {
    // verifyIdToken throws on expired, revoked, or malformed tokens.
    // createSessionCookie throws if the ID token is too old (>5 min) for
    // session cookie creation — in that case the client should force-refresh.
    console.error('[Session] Authentication failed:', err.code ?? err.message);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
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
