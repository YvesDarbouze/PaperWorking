import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/config';

function authErrorMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. If you signed up with Google/Facebook, use that button instead.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in, or use Google/Facebook.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked. Allow popups and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email using a different sign-in method. Use Google or Facebook.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Auth.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Wait a moment and try again.';
    default:
      return fallback || 'Sign-in failed. Please try again.';
  }
}

function toAuthError(err: unknown): Error {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    const message = (err as { message?: string }).message;
    return new Error(authErrorMessage(code, message));
  }
  if (err instanceof Error) return err;
  return new Error('Sign-in failed. Please try again.');
}

export function requireFirebaseConfigured(): void {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars to enable Google/Facebook sign-in.',
    );
  }
}

export async function syncSessionCookie(user: User | null, accountType?: string): Promise<void> {
  if (user) {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, accountType }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error || `Session sync failed (${res.status})`);
    }
    return;
  }

  await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
}

export async function firebaseLogin(email: string, password: string): Promise<User> {
  requireFirebaseConfigured();
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncSessionCookie(result.user);
    return result.user;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function firebaseRegister(
  email: string,
  password: string,
  displayName: string,
  accountType = 'investor',
): Promise<User> {
  requireFirebaseConfigured();
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(result.user, { displayName: displayName.trim() });
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pw_pending_account_type', accountType);
    }
    await syncSessionCookie(result.user, accountType);
    return result.user;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

/** Returns true if Firebase reports a brand-new user (additionalUserInfo). */
export async function firebaseLoginWithGoogle(accountType = 'investor'): Promise<boolean> {
  requireFirebaseConfigured();
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pw_pending_account_type', accountType);
    }
    const result = await signInWithPopup(auth, provider);
    const isNewUser = Boolean(getAdditionalUserInfo(result)?.isNewUser);
    await syncSessionCookie(result.user, accountType);
    return isNewUser;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function firebaseLoginWithFacebook(accountType = 'investor'): Promise<boolean> {
  requireFirebaseConfigured();
  try {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pw_pending_account_type', accountType);
    }
    const result = await signInWithPopup(auth, provider);
    const isNewUser = Boolean(getAdditionalUserInfo(result)?.isNewUser);
    await syncSessionCookie(result.user, accountType);
    return isNewUser;
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function firebaseSendMagicLink(email: string): Promise<void> {
  requireFirebaseConfigured();
  const actionCodeSettings = {
    url: `${window.location.origin}/login/finish`,
    handleCodeInApp: true,
  };
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function firebaseResetPassword(email: string): Promise<void> {
  requireFirebaseConfigured();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: unknown) {
    throw toAuthError(err);
  }
}

export async function firebaseLogout(): Promise<void> {
  try {
    await syncSessionCookie(null);
  } finally {
    if (isFirebaseConfigured()) {
      await signOut(auth).catch(() => undefined);
    }
  }
}
