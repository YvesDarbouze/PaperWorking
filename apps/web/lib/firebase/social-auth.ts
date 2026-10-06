'use client';

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  type UserCredential,
  type AuthProvider,
} from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase/client';

export type SocialProvider = 'google' | 'facebook';

function buildProvider(provider: SocialProvider): AuthProvider {
  switch (provider) {
    case 'google': {
      const gp = new GoogleAuthProvider();
      gp.addScope('email');
      gp.addScope('profile');
      return gp;
    }
    case 'facebook': {
      const fp = new FacebookAuthProvider();
      fp.addScope('email');
      fp.addScope('public_profile');
      return fp;
    }
  }
}

export interface SocialSignInResult {
  ok: boolean;
  idToken: string | null;
  email: string | null;
  displayName: string | null;
  error?: string;
}

/**
 * Opens the Firebase Auth popup for the given provider, returning the
 * Firebase ID token needed to create a server-side session.
 */
export async function signInWithSocialProvider(
  provider: SocialProvider,
): Promise<SocialSignInResult> {
  const app = getFirebaseApp();
  if (!app) {
    return { ok: false, idToken: null, email: null, displayName: null, error: 'Firebase not available' };
  }

  const auth = getAuth(app);
  const authProvider = buildProvider(provider);

  let credential: UserCredential;
  try {
    credential = await signInWithPopup(auth, authProvider);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { ok: false, idToken: null, email: null, displayName: null };
    }
    const message =
      code === 'auth/account-exists-with-different-credential'
        ? 'An account already exists with a different sign-in method. Try the other provider or use email/password.'
        : (err as { message?: string })?.message ?? 'Sign-in failed';
    return { ok: false, idToken: null, email: null, displayName: null, error: message };
  }

  const idToken = await credential.user.getIdToken();

  return {
    ok: true,
    idToken,
    email: credential.user.email,
    displayName: credential.user.displayName,
  };
}
