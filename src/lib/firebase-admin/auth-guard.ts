import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   API Auth Guard — Firebase Admin SDK Token Verifier

   Usage (in any Route Handler):

     import { requireAuth } from '@/lib/firebase-admin/auth-guard';

     export async function POST(req: NextRequest) {
       const { uid } = await requireAuth(req);
       // … your business logic …
     }

   Flow:
     1. Reads the `Authorization: Bearer <idToken>` header.
     2. Verifies the token cryptographically using the Admin SDK.
     3. Returns { uid, token } on success.
     4. Returns a 401 NextResponse on any failure (missing header,
        malformed token, revoked token, expired token).

   The caller MUST check the return type and short-circuit if a
   NextResponse is returned (use the `isAuthError` helper below).
   ═══════════════════════════════════════════════════════ */

export interface AuthContext {
  uid: string;
  /** The raw decoded token — contains email, claims, etc. */
  token: import('firebase-admin/auth').DecodedIdToken;
}

/**
 * Narrows an `AuthResult` to a guard failure response.
 * Use this to short-circuit early in route handlers:
 *
 * ```ts
 * const auth = await requireAuth(req);
 * if (isAuthError(auth)) return auth;
 * const { uid } = auth;
 * ```
 */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Verifies the Firebase ID token from the `Authorization` header.
 *
 * @returns `AuthContext` on success, or a `401 NextResponse` on failure.
 */
export async function requireAuth(req: NextRequest): Promise<AuthContext | NextResponse> {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing or malformed Authorization header. Expected: Bearer <idToken>' },
      { status: 401 }
    );
  }

  const idToken = authHeader.slice(7); // strip "Bearer "

  if (!idToken) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Bearer token is empty' },
      { status: 401 }
    );
  }

  try {
    // checkRevoked: true ensures logged-out/disabled users cannot use cached tokens
    const decoded = await adminAuth.verifyIdToken(idToken, /* checkRevoked */ true);

    if (!decoded.uid) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token decoded but uid is missing' },
        { status: 401 }
      );
    }

    return { uid: decoded.uid, token: decoded };
  } catch (err: any) {
    // Classify Firebase auth errors for cleaner logging
    const code: string = err?.code ?? 'unknown';
    const isRevoked = code === 'auth/id-token-revoked';
    const isExpired = code === 'auth/id-token-expired';

    console.error(`[AuthGuard] Token verification failed (${code}):`, err.message ?? err);

    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: isRevoked
          ? 'Token has been revoked. Please sign in again.'
          : isExpired
          ? 'Token has expired. Please sign in again.'
          : 'Token verification failed.',
      },
      { status: 401 }
    );
  }
}
