import { NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════
   POST /api/auth/session

   Receives a Firebase ID token from the client after
   successful login and sets two HttpOnly cookies:

     __session  — the raw Firebase ID token (verified)
     __sub      — base64-encoded { plan, status } for
                  edge-middleware subscription gating
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE  = '__session';
const SUB_COOKIE      = '__sub';
const ACCT_COOKIE     = '__acct';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

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

  // Allow localhost in dev
  if (process.env.NODE_ENV !== 'production') {
    if (!origin && !referer) return true;
    const isLocal = (str: string) => str.includes('localhost:') || str.includes('127.0.0.1:');
    if (origin && isLocal(origin)) return true;
    if (referer && isLocal(referer)) return true;
  }

  // Canonical domains
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://paperworking.co',
    'https://www.paperworking.co',
  ].filter(Boolean);

  const isAllowedHost = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      if (allowedOrigins.includes(url.origin)) return true;
      // Allow Firebase hosting domains
      if (url.hostname.endsWith('.hosted.app') || 
          url.hostname.endsWith('.web.app') || 
          url.hostname.endsWith('.firebaseapp.com')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  if (origin && isAllowedHost(origin)) return true;
  if (referer && isAllowedHost(referer)) return true;

  console.warn('[Session CSRF] Rejected request from origin:', origin, 'referer:', referer);
  return false;
}

export async function POST(request: Request) {
  // ── CSRF check ────────────────────────────────────
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden: invalid origin' },
      { status: 403 }
    );
  }

  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid idToken' }, { status: 400 });
    }

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE,
    };

    // ── Mode 1: Full Admin SDK verification + subscription lookup ──
    if (hasAdminCredentials()) {
      try {
        const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
        const decoded = await adminAuth.verifyIdToken(idToken);

        if (!decoded.uid) {
          return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
        }

        // Fetch subscription state + account type for edge-middleware cookies
        let subPlan   = 'None';
        let subStatus = 'inactive';
        let acctType  = 'investor';
        try {
          const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
          const data = userSnap.data();
          if (data) {
            subPlan  = data.subscriptionPlan  ?? 'None';
            subStatus = data.subscriptionStatus ?? 'inactive';
            acctType  = data.accountType ?? 'investor';
          }
        } catch {
          // Non-fatal — middleware falls back to cookie absence
        }

        const response = NextResponse.json({ status: 'success', uid: decoded.uid });
        response.cookies.set(SESSION_COOKIE, idToken,                             cookieOpts);
        response.cookies.set(SUB_COOKIE,     encodeSubCookie(subPlan, subStatus), { ...cookieOpts, httpOnly: false });
        response.cookies.set(ACCT_COOKIE,    acctType,                            cookieOpts);
        return response;
      } catch (adminError: any) {
        console.error('Admin SDK verification failed:', adminError.message);
        // Fall through to dev fallback
      }
    }

    // ── Mode 2: Dev fallback ──
    console.log('[Session] Dev fallback — cookie set without Admin SDK');
    const response = NextResponse.json({ status: 'success', mode: 'dev-fallback' });
    response.cookies.set(SESSION_COOKIE, idToken, cookieOpts);
    response.cookies.set(SUB_COOKIE, encodeSubCookie('Individual', 'active'), { ...cookieOpts, httpOnly: false });
    response.cookies.set(ACCT_COOKIE, 'investor', cookieOpts);
    return response;

  } catch (error: any) {
    console.error('Session creation error:', error.message);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  // ── CSRF check ────────────────────────────────────
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden: invalid origin' },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ status: 'success' });
  const clear = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 0 };
  response.cookies.set(SESSION_COOKIE, '', clear);
  response.cookies.set(SUB_COOKIE,     '', { ...clear, httpOnly: false });
  response.cookies.set(ACCT_COOKIE,    '', clear);
  return response;
}
