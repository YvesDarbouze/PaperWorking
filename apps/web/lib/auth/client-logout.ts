import { destroySession } from '@/lib/auth/session-client';
import { firebaseLogout, shouldUseFirebaseAuthClient } from '@/lib/firebase/auth-client';

/** Clears Nest session cookies and Firebase auth without requiring AuthProvider. */
export async function performClientLogout(): Promise<void> {
  try {
    if (shouldUseFirebaseAuthClient()) {
      await firebaseLogout();
      return;
    }
    await destroySession();
  } catch {
    // Best-effort — caller still navigates away.
  }
}
