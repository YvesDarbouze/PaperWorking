import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   POST /api/auth/session
   
   Receives a Firebase ID token from the client after 
   successful login, verifies it server-side, and sets
   an HttpOnly secure session cookie.
   
   Cookie specification:
     Name:     __session
     Value:    Firebase ID token (verified)
     HttpOnly: true  (cannot be read by JavaScript)
     Secure:   true  (HTTPS only in production)
     SameSite: Lax   (prevents CSRF)
     Path:     /     (available to all routes)
     MaxAge:   14 days
   ═══════════════════════════════════════════════════════ */

const SESSION_COOKIE_NAME = '__session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid idToken' },
        { status: 400 }
      );
    }

    // Verify the ID token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (!decodedToken.uid) {
      return NextResponse.json(
        { error: 'Token verification failed' },
        { status: 401 }
      );
    }

    // Create the response with the session cookie
    const response = NextResponse.json({ status: 'success', uid: decodedToken.uid });

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
