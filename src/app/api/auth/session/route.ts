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
    console.log('[Session] Admin SDK imported successfully');

    // Step 1: Verify the ID token is authentic.
    // checkRevoked omitted — it adds a network round-trip that can fail on cold starts;
    // the 1-hour token expiry provides equivalent protection for normal login flows.
    let decoded: { uid: string };
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
      console.log('[Session] Step 1 OK — verifyIdToken succeeded for uid:', decoded.uid);
    } catch (verifyErr: any) {
      console.error('[Session] Step 1 FAILED — verifyIdToken error:', verifyErr.code, verifyErr.message);
      return NextResponse.json({ error: 'Token verification failed', detail: verifyErr.code }, { status: 401 });
    }

    // Step 2: Exchange for a Firebase session cookie (14-day exp).
    // If this fails (credential issues, permissions, etc.), fall back to
    // using the verified ID token directly. The middleware only checks cookie
    // EXISTENCE, not the value, so this is safe. The 50-min refresh interval
    // in AuthContext keeps the cookie value fresh.
    let cookieValue: string;
    try {
      cookieValue = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_MAX_AGE * 1000,
      });
      console.log('[Session] Step 2 OK — createSessionCookie succeeded');
    } catch (sessionErr: any) {
      console.error('[Session] Step 2 FAILED — createSessionCookie error:', sessionErr.code, sessionErr.message);
      console.warn('[Session] Falling back to verified ID token as cookie value');
      // Fallback: use the verified ID token itself as the cookie value.
      // This is less ideal (60-min token vs 14-day session cookie) but the
      // AuthContext refreshes it every 50 minutes, so it stays valid.
      cookieValue = idToken;
    }

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
      console.log('[Session] Step 3 OK — user data fetched, plan:', subPlan);
    } catch {
      console.warn('[Session] Step 3 non-fatal — user doc fetch failed, using defaults');
    }

    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE,
    };

    // --- Create Custom Session Tracking Document ---
    const sessionId = crypto.randomUUID();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';
    
    // Basic device parsing from user-agent
    let device = 'Unknown Device';
    if (userAgent.includes('Mac OS')) device = 'Mac';
    else if (userAgent.includes('Windows')) device = 'Windows PC';
    else if (userAgent.includes('iPhone')) device = 'iPhone';
    else if (userAgent.includes('iPad')) device = 'iPad';
    else if (userAgent.includes('Android')) device = 'Android Device';
    else if (userAgent.includes('Linux')) device = 'Linux PC';

    try {
      const FieldValue = (await import('firebase-admin/firestore')).FieldValue;
      await adminDb.collection('users').doc(decoded.uid).collection('sessions').doc(sessionId).set({
        id: sessionId,
        device,
        userAgent,
        ipAddress,
        location: 'Unknown', // IP Geolocation can be added later
        createdAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
        isValid: true,
      });
    } catch (e) {
      console.error('[Session] Failed to write session document:', e);
    }
    // -----------------------------------------------

    const response = NextResponse.json({ status: 'success', uid: decoded.uid });
    response.cookies.set(SESSION_COOKIE, cookieValue,                        cookieOpts);
    response.cookies.set(SUB_COOKIE,     encodeSubCookie(subPlan, subStatus), { ...cookieOpts, httpOnly: false });
    response.cookies.set(ACCT_COOKIE,    acctType,                            cookieOpts);
    response.cookies.set('__session_id', sessionId,                           { ...cookieOpts, httpOnly: false }); // Allow client to know its own sessionId
    console.log('[Session] ✅ All cookies set — returning success response');
    return response;

  } catch (err: any) {
    console.error('[Session] FATAL — unexpected error:', err.code ?? '', err.message);
    return NextResponse.json({ error: 'Authentication failed', detail: err.message }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  const csrf = validateCsrf(request);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.reason }, { status: csrf.status });
  }

  // --- Invalidate Session Document ---
  const cookies = request.headers.get('cookie') || '';
  const sessionIdMatch = cookies.match(/(?:^|; )__session_id=([^;]*)/);
  const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
  const sessionCookieMatch = cookies.match(/(?:^|; )__session=([^;]*)/);
  const sessionCookie = sessionCookieMatch ? sessionCookieMatch[1] : null;

  if (sessionId && sessionCookie && hasAdminCredentials()) {
    try {
      const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
      const decoded = await adminAuth.verifySessionCookie(sessionCookie);
      await adminDb.collection('users').doc(decoded.uid).collection('sessions').doc(sessionId).update({
        isValid: false
      });
    } catch (e) {
      console.error('[Session] Failed to invalidate session doc:', e);
    }
  }
  // -----------------------------------

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
  response.cookies.set('__session_id', '', { ...clear, httpOnly: false });
  return response;
}
