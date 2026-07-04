import { NextResponse } from 'next/server';

/**
 * GET /api/auth/debug
 *
 * Temporary diagnostic endpoint (no secrets exposed).
 * Reports environment & Admin SDK health so we can pinpoint
 * why the session cookie isn't being set in production.
 *
 * DELETE THIS FILE once the login loop is resolved.
 */
export async function GET(request: Request) {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasGoogleCloudProject: !!process.env.GOOGLE_CLOUD_PROJECT,
    hasKService: !!process.env.K_SERVICE,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
    privateKeyStartsWith: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) ?? 'MISSING',
    cookies: Object.fromEntries(
      request.headers.get('cookie')?.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=').substring(0, 20) + '...'];
      }) ?? []
    ),
  };

  // Try initializing Admin SDK
  try {
    const { adminAuth } = await import('@/lib/firebase/admin');
    diagnostics.adminSdkInitialized = true;

    // Try listing one user to verify auth admin works
    try {
      const listResult = await adminAuth.listUsers(1);
      diagnostics.authAdminWorking = true;
      diagnostics.userCount = listResult.users.length;
    } catch (err: any) {
      diagnostics.authAdminWorking = false;
      diagnostics.authAdminError = err.message;
    }

    // Try creating a test session cookie (with a fake token — will fail,
    // but the error message tells us if the SDK itself is functional)
    try {
      await adminAuth.createSessionCookie('fake-token-for-diagnostics', { expiresIn: 60000 });
      diagnostics.createSessionCookieWorks = 'unexpectedly-succeeded';
    } catch (err: any) {
      // We EXPECT this to fail with "invalid token" — that means the SDK is working.
      // If it fails with "credential" or "permission" errors, that's the bug.
      diagnostics.createSessionCookieError = err.message;
      diagnostics.createSessionCookieErrorCode = err.code;
      diagnostics.createSessionCookieWorking = 
        err.code === 'auth/invalid-id-token' || 
        err.message?.includes('Firebase ID token') ||
        err.message?.includes('Decoding Firebase ID token');
    }
  } catch (err: any) {
    diagnostics.adminSdkInitialized = false;
    diagnostics.adminSdkError = err.message;
  }

  return NextResponse.json(diagnostics, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
