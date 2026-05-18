import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

/**
 * Returns minutes remaining on the user's current cached ID token.
 * Uses getIdTokenResult(false) so it never forces a network round-trip.
 * Returns null if the expiry cannot be determined.
 */
export async function getTokenExpiryMinutes(user: User): Promise<number | null> {
  try {
    const result = await user.getIdTokenResult(false);
    return (new Date(result.expirationTime).getTime() - Date.now()) / 60_000;
  } catch {
    return null;
  }
}

/**
 * Logout with a guaranteed client-side fallback.
 * If Firebase signOut throws (network failure, service unavailable), this
 * still purges the locally-known auth tokens and hits the session DELETE
 * endpoint so the server-side cookie is cleared on a best-effort basis.
 */
export async function safeLogout(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Network or Firebase failure — scrub client-side state anyway.
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('emailForSignIn'); } catch { /* noop */ }
      try { sessionStorage.clear(); } catch { /* noop */ }
    }
  }
  // Always attempt to clear the HttpOnly session cookie server-side.
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch { /* non-fatal — cookie will expire on its own */ }
}
