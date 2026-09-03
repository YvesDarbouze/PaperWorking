import { authFetch } from '@/lib/auth/auth-fetch';
import {
  firebasePublicConfig,
  isFirebaseAuthEnabled,
  isFirebaseConfigured,
} from '@/lib/firebase/config';

type FirebaseAuthModule = typeof import('firebase/auth');
type FirebaseAppModule = typeof import('firebase/app');

let authPromise: Promise<import('firebase/auth').Auth> | null = null;

async function getFirebaseAuth() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is browser-only');
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  if (!authPromise) {
    authPromise = (async () => {
      const appMod: FirebaseAppModule = await import('firebase/app');
      const authMod: FirebaseAuthModule = await import('firebase/auth');
      const existing = appMod.getApps()[0];
      const app = existing ?? appMod.initializeApp(firebasePublicConfig());
      return authMod.getAuth(app);
    })();
  }
  return authPromise;
}

/** Exchange Firebase ID token for same-origin Next httpOnly session cookies. */
export async function syncNestSession(
  idToken: string | null,
  accountType?: string,
): Promise<void> {
  if (idToken) {
    const res = await authFetch('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: idToken, idToken, accountType }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      status?: string;
    };
    if (!res.ok) {
      const detail =
        data && typeof data === 'object' && 'detail' in data
          ? String((data as { detail?: unknown }).detail)
          : undefined;
      const base = data.error || `Session sync failed (${res.status})`;
      throw new Error(detail ? `${base} (${detail})` : base);
    }
    return;
  }
  await authFetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
}

/** Wait until Firebase restores persisted auth state (onAuthStateChanged initial callback). */
async function waitForFirebaseAuthReady(): Promise<import('firebase/auth').User | null> {
  const authMod: FirebaseAuthModule = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  return new Promise((resolve) => {
    const unsubscribe = authMod.onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function syncSessionFromFirebase(accountType?: string) {
  const user = await waitForFirebaseAuthReady();
  if (user) {
    const idToken = await user.getIdToken();
    await syncNestSession(idToken, accountType);
  }
  return user;
}

export async function firebaseLogin(email: string, password: string) {
  const authMod: FirebaseAuthModule = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  const credential = await authMod.signInWithEmailAndPassword(auth, email, password);
  if (!credential.user) throw new Error('Sign-in failed');
  const idToken = await credential.user.getIdToken();
  await syncNestSession(idToken);
  return credential.user;
}

export async function firebaseRegister(
  email: string,
  password: string,
  displayName: string,
  accountType = 'investor',
) {
  const authMod: FirebaseAuthModule = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  const credential = await authMod.createUserWithEmailAndPassword(auth, email, password);
  if (!credential.user) throw new Error('Registration failed');
  if (displayName.trim()) {
    await authMod.updateProfile(credential.user, { displayName: displayName.trim() });
  }
  window.localStorage.setItem('pw_pending_account_type', accountType);
  const idToken = await credential.user.getIdToken();
  await syncNestSession(idToken, accountType);
  return credential.user;
}

export async function firebaseLoginWithGoogle(accountType = 'investor'): Promise<void> {
  window.localStorage.setItem('pw_pending_account_type', accountType);
  const authMod: FirebaseAuthModule = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  const provider = new authMod.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  await authMod.signInWithPopup(auth, provider);
  await syncSessionFromFirebase(accountType);
}

export async function firebaseLoginWithFacebook(accountType = 'investor'): Promise<void> {
  window.localStorage.setItem('pw_pending_account_type', accountType);
  const authMod: FirebaseAuthModule = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  const provider = new authMod.FacebookAuthProvider();
  provider.addScope('email');
  provider.addScope('public_profile');
  await authMod.signInWithPopup(auth, provider);
  await syncSessionFromFirebase(accountType);
}

export async function firebaseLogout(): Promise<void> {
  try {
    await syncNestSession(null);
  } finally {
    if (isFirebaseConfigured()) {
      const authMod: FirebaseAuthModule = await import('firebase/auth');
      const auth = await getFirebaseAuth();
      await authMod.signOut(auth).catch(() => undefined);
    }
  }
}

export async function firebaseResetPassword(email: string): Promise<void> {
  const authMod: FirebaseAuthModule = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  await authMod.sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/auth/action?mode=resetPassword`,
  });
}

export async function firebaseConfirmPasswordReset(
  oobCode: string,
  newPassword: string,
): Promise<void> {
  const authMod: FirebaseAuthModule = await import('firebase/auth');
  const auth = await getFirebaseAuth();
  await authMod.confirmPasswordReset(auth, oobCode, newPassword);
}

export async function firebaseSendMagicLink(_email: string): Promise<void> {
  throw new Error('Magic link sign-in is not enabled for Firebase Auth yet.');
}

export function shouldUseFirebaseAuthClient(): boolean {
  return isFirebaseAuthEnabled() && isFirebaseConfigured();
}

export { isFirebaseAuthEnabled, isFirebaseConfigured };
