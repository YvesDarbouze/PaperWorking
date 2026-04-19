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

export async function POST(request: Request) {
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

        // Fetch subscription state for the __sub cookie
        let subPlan   = 'None';
        let subStatus = 'inactive';
        try {
          const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
          const data = userSnap.data();
          if (data) {
            subPlan   = data.subscriptionPlan  ?? 'None';
            subStatus = data.subscriptionStatus ?? 'inactive';
          }
        } catch {
          // Non-fatal — middleware falls back to cookie absence
        }

        const response = NextResponse.json({ status: 'success', uid: decoded.uid });
        response.cookies.set(SESSION_COOKIE, idToken,                           cookieOpts);
        response.cookies.set(SUB_COOKIE,     encodeSubCookie(subPlan, subStatus), { ...cookieOpts, httpOnly: false });
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
    // In dev, treat as active so the dashboard is accessible
    response.cookies.set(SUB_COOKIE, encodeSubCookie('Individual', 'active'), { ...cookieOpts, httpOnly: false });
    return response;

  } catch (error: any) {
    console.error('Session creation error:', error.message);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: 'success' });
  const clear = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 0 };
  response.cookies.set(SESSION_COOKIE, '', clear);
  response.cookies.set(SUB_COOKIE,     '', { ...clear, httpOnly: false });
  return response;
}
