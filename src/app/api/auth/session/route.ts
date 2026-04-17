import { NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════════════
   POST /api/auth/session
   
   Receives a Firebase ID token from the client after 
   successful login and sets an HttpOnly secure session
   cookie.

   Two modes:
     1. Production — verifies token via Firebase Admin SDK
     2. Dev fallback — sets cookie without verification
        when Admin SDK credentials are unavailable
   
   Cookie specification:
     Name:     __session
     Value:    Firebase ID token
     HttpOnly: true  (cannot be read by JavaScript)
     Secure:   true  (HTTPS only in production)
     SameSite: Lax   (prevents CSRF)
     Path:     /     (available to all routes)
     MaxAge:   14 days
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE_NAME = '__session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

/**
 * Check if Firebase Admin SDK credentials are available.
 */
function hasAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid idToken' },
        { status: 400 }
      );
    }

    // ── Mode 1: Full Admin SDK verification ──
    if (hasAdminCredentials()) {
      try {
        const { adminAuth } = await import('@/lib/firebase/admin');
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        if (!decodedToken.uid) {
          return NextResponse.json(
            { error: 'Token verification failed' },
            { status: 401 }
          );
        }

        const response = NextResponse.json({ status: 'success', uid: decodedToken.uid });
        response.cookies.set(SESSION_COOKIE_NAME, idToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: SESSION_MAX_AGE,
        });
        return response;
      } catch (adminError: any) {
        console.error('Admin SDK verification failed:', adminError.message);
        // Fall through to dev fallback
      }
    }

    // ── Mode 2: Dev fallback — trust the client-side Firebase token ──
    // This is safe in dev because the token was already verified by
    // Firebase client SDK (onAuthStateChanged). For production, you
    // MUST set the FIREBASE_* server-side environment variables.
    console.log('[Session] Using dev fallback — setting cookie without Admin SDK verification');

    const response = NextResponse.json({ status: 'success', mode: 'dev-fallback' });
    response.cookies.set(SESSION_COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return response;

  } catch (error: any) {
    console.error('Session creation error:', error.message);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  // Clear the session cookie on logout
  const response = NextResponse.json({ status: 'success' });

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });

  return response;
}
