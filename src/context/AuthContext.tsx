'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, AccountType } from '@/types/user';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   PaperWorking — AuthContext (Phase 2.2)
   
   Single source of truth for Firebase Authentication.
   Provides:
     • user / loading / error state
     • login / register / logout / resetPassword actions
     • Social SSO: Google & Facebook via Redirect (Rock Solid)
     • Magic Link (Passwordless) Auth
     • Automatic server-side session cookie sync
     • Robust Organization Context
   ═══════════════════════════════════════════════════════ */

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, accountType?: AccountType) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (email: string, url: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Ensures a user document exists in Firestore for social sign-ins.
 * Does not overwrite existing roles or org IDs for returning users.
 * 
 * IMPORTANT: This function is deliberately non-throwing. A Firestore
 * failure here must NOT block the auth flow — the user is already
 * signed in with Firebase Auth, so we let them proceed to the dashboard
 * and the profile will be created on the next attempt or via server-side logic.
 */
async function provisionSocialUser(user: User) {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // Check if the user selected an account type before social sign-in
      const pendingAccountType = (typeof window !== 'undefined'
        ? window.localStorage.getItem('pw_pending_account_type')
        : null) as AccountType | null;
      const acctType: AccountType = pendingAccountType || 'investor';

      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        role: acctType === 'vendor' ? 'Vendor' : 'Lead Investor',
        accountType: acctType,
        organizationId: `org_${user.uid.slice(0, 8)}`,
        subscriptionPlan: 'None',
        subscriptionStatus: 'inactive',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Clean up the pending flag
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('pw_pending_account_type');
      }
    }
  } catch (err) {
    // Non-fatal: user is already authenticated with Firebase Auth.
    // Profile doc can be created later via onSnapshot or server-side.
    console.error('[provisionSocialUser] Firestore write failed (non-fatal):', err);
  }
}

/**
 * Syncs the Firebase ID token to a server-side HttpOnly cookie.
 * Called on every auth state change so the middleware can verify sessions.
 */
async function syncSessionCookie(user: User | null) {
  if (user) {
    try {
      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
    } catch (err) {
      console.error('Failed to sync session cookie:', err);
    }
  } else {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear session cookie:', err);
    }
  }
}

/** Token refresh interval — 50 minutes (Firebase ID tokens expire in 60 minutes) */
const TOKEN_REFRESH_MS = 50 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 2. Listen to auth state changes + sync session cookie
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      // Clear any previous refresh timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        profileUnsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) setProfile(snap.data() as UserProfile);
        });

        // Start token refresh interval — keeps __session cookie valid
        refreshTimerRef.current = setInterval(async () => {
          try {
            await firebaseUser.getIdToken(true);
            await syncSessionCookie(firebaseUser);
          } catch (err: any) {
            console.error('Token refresh failed:', err);

            // Surface the failure to the user so they can re-authenticate
            if (err?.code === 'auth/network-request-failed') {
              toast.error('Network error — your session may expire soon. Check your connection.', {
                id: 'token-refresh-network', // Prevent duplicate toasts
                duration: 8000,
              });
            } else {
              // Token revoked, user disabled, or other fatal error
              toast.error('Your session has expired. Please sign in again.', {
                id: 'token-refresh-expired',
                duration: 10000,
              });
              // Force logout to clear stale state
              try { await signOut(auth); } catch { /* best effort */ }
            }
          }
        }, TOKEN_REFRESH_MS);
      } else {
        setProfile(null);
      }

      try {
        await syncSessionCookie(firebaseUser);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  const clearError = () => setError(null);

  function getAuthErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/user-disabled': return 'This account has been disabled. Contact support.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': return 'Invalid email or password.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/account-exists-with-different-credential':
        return 'This email is already linked to another sign-in method. Try signing in with Google or email/password instead.';
      case 'auth/weak-password': return 'Password must be at least 8 characters.';
      case 'auth/too-many-requests': return 'Account temporarily locked. Try resetting your password.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      case 'auth/popup-closed-by-user': return 'Sign-in was cancelled. Please try again.';
      case 'auth/popup-blocked': return 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
      case 'auth/redirect-cancelled-by-user': return 'Sign-in redirect was cancelled.';
      case 'auth/internal-error': return 'Authentication service error. Please try again in a moment.';
      case 'auth/unauthorized-domain': return 'This domain is not authorized for sign-in. Contact support.';
      default: return 'An unexpected error occurred. Please try again.';
    }
  }

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { user: loggedInUser } = await signInWithEmailAndPassword(auth, email, password);
      await syncSessionCookie(loggedInUser);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const register = async (email: string, password: string, displayName: string, accountType: AccountType = 'investor') => {
    setError(null);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        displayName,
        role: accountType === 'vendor' ? 'Vendor' : 'Lead Investor',
        accountType,
        organizationId: `org_${newUser.uid.slice(0, 8)}`,
        subscriptionPlan: 'None',
        subscriptionStatus: 'inactive',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await syncSessionCookie(newUser);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      const result = await signInWithPopup(auth, provider);
      await provisionSocialUser(result.user);
      await syncSessionCookie(result.user);
    } catch (err: any) {
      // Benign: user closed the popup or browser cancelled a duplicate request
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return; // Silently absorb — don't set error, don't throw
      }
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const loginWithFacebook = async () => {
    setError(null);
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');
      const result = await signInWithPopup(auth, provider);
      await provisionSocialUser(result.user);
      await syncSessionCookie(result.user);
    } catch (err: any) {
      // Benign: user closed the popup or browser cancelled a duplicate request
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return; // Silently absorb — don't set error, don't throw
      }
      console.error('[loginWithFacebook] Auth error:', err.code, err.message);
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const sendMagicLink = async (email: string) => {
    setError(null);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login/finish`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const verifyMagicLink = async (email: string, url: string) => {
    setError(null);
    try {
      if (isSignInWithEmailLink(auth, url)) {
        const { user: magicUser } = await signInWithEmailLink(auth, email, url);
        await provisionSocialUser(magicUser);
        await syncSessionCookie(magicUser);
        window.localStorage.removeItem('emailForSignIn');
      } else {
        throw new Error('Invalid magic link.');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || ''));
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        login,
        register,
        loginWithGoogle,
        loginWithFacebook,
        sendMagicLink,
        verifyMagicLink,
        logout,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
