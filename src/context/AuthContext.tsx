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
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, AccountType } from '@/types/user';
import toast from 'react-hot-toast';
import { getTokenExpiryMinutes } from '@/lib/auth/sessionService';
import SessionExpiredModal from '@/components/auth/SessionExpiredModal';

/* ═══════════════════════════════════════════════════════
   PaperWorking — AuthContext (Phase 3.0)
   
   Single source of truth for Firebase Authentication.
   Provides:
     • user / loading / error state
     • login / register / logout / resetPassword actions
     • Social SSO: Google & Facebook via signInWithRedirect
       (production-grade — works on all browsers incl. mobile Safari)
     • Magic Link (Passwordless) Auth
     • Automatic server-side session cookie sync
     • Plan intent persistence for checkout resumption
   ═══════════════════════════════════════════════════════ */

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticating: boolean; // true while a social popup is in flight
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
  /** H-5: Force-refresh the ID token and re-sync the session cookie if the
   *  token has less than 5 minutes of lifetime remaining. Call this on every
   *  hard layout mount to catch near-expiry tokens during SPA navigation. */
  refreshSession: () => Promise<void>;
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

      // Reconcile any pending guest-checkout subscription
      if (user.email) {
        await reconcilePendingSubscription(user.uid, user.email);
      }
    }
  } catch (err) {
    // Non-fatal: user is already authenticated with Firebase Auth.
    // Profile doc can be created later via onSnapshot or server-side.
    console.error('[provisionSocialUser] Firestore write failed (non-fatal):', err);
  }
}

/**
 * Reconciles a pending guest-checkout subscription with a newly created user.
 * If the user checked out as a guest before registering, their subscription
 * metadata is stored in `pending_subscriptions/{email}` by the webhook.
 * This function links it to the new user document and cleans up.
 */
async function reconcilePendingSubscription(uid: string, email: string): Promise<void> {
  try {
    const pendingRef = doc(db, 'pending_subscriptions', email);
    const pendingSnap = await getDoc(pendingRef);

    if (pendingSnap.exists()) {
      const pending = pendingSnap.data();
      const userDocRef = doc(db, 'users', uid);

      await setDoc(userDocRef, {
        subscriptionPlan: pending.plan || 'None',
        subscriptionStatus: pending.subscriptionStatus || 'active',
        stripeCustomerId: pending.stripeCustomerId,
        stripeSubscriptionId: pending.stripeSubscriptionId,
        ...(pending.trialEnd ? { trialEnd: pending.trialEnd } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Clean up the pending record
      await deleteDoc(pendingRef);
      console.log(`[reconcilePendingSubscription] Linked pending subscription to user ${uid}`);
    }
  } catch (err) {
    // Non-fatal — the subscription will still exist in Stripe
    // and can be linked manually or on next webhook event.
    console.error('[reconcilePendingSubscription] Failed (non-fatal):', err);
  }
}

/**
 * Syncs the Firebase ID token to a server-side HttpOnly cookie.
 * Called on every auth state change so the middleware can verify sessions.
 */
async function syncSessionCookie(user: User | null) {
  if (user) {
    try {
      // Force-refresh ensures the token sent to createSessionCookie is
      // always fresh. Firebase requires the ID token to be recently issued.
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Session API failed: ${res.status} ${errData.error || ''}`);
      }
    } catch (err) {
      console.error('Failed to sync session cookie:', err);
      throw err; // Propagate the error so auth flows (login/register) can catch it
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredVisible, setSessionExpiredVisible] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref mirror of isAuthenticating so onAuthStateChanged (a stale closure)
  // can read the current value without being recreated on every render.
  const syncLockRef = useRef(false);

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

      if (firebaseUser) {
        // H-5: Proactive token refresh on auth-state fire (covers hard page loads).
        // getIdTokenResult(false) reads the cached token without a network call.
        // If <5 min remain, force-refresh NOW before syncSessionCookie runs.
        try {
          const minsLeft = await getTokenExpiryMinutes(firebaseUser);
          if (minsLeft !== null && minsLeft < 5) {
            await firebaseUser.getIdToken(true);
          }
        } catch { /* non-fatal — syncSessionCookie below will still force-refresh */ }

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

            if (err?.code === 'auth/network-request-failed') {
              // Transient network issue — surface a toast; session may still be valid
              toast.error('Network error — your session may expire soon. Check your connection.', {
                id: 'token-refresh-network',
                duration: 8000,
              });
            } else {
              // H-3: Fatal auth failure (token revoked, user disabled, etc.) —
              // show the session-expired modal. safeLogout() runs inside the modal.
              setSessionExpiredVisible(true);
            }
          }
        }, TOKEN_REFRESH_MS);
      } else {
        setProfile(null);
      }

      try {
        // Skip if a social-login popup flow already owns the sync.
        // loginWithGoogle / loginWithFacebook call syncSessionCookie directly
        // after provisionSocialUser completes. Running it again here would
        // fire two concurrent POST /api/auth/session requests.
        if (!syncLockRef.current) {
          await syncSessionCookie(firebaseUser);
        }
      } finally {
        setUser(firebaseUser);
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

      // Reconcile any pending guest-checkout subscription
      if (newUser.email) {
        await reconcilePendingSubscription(newUser.uid, newUser.email);
      }

      await syncSessionCookie(newUser);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    syncLockRef.current = true;
    setIsAuthenticating(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      const result = await signInWithPopup(auth, provider);
      await provisionSocialUser(result.user);
      // Single authoritative sync — onAuthStateChanged is locked out above.
      await syncSessionCookie(result.user);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    } finally {
      syncLockRef.current = false;
      setIsAuthenticating(false);
    }
  };

  const loginWithFacebook = async () => {
    setError(null);
    syncLockRef.current = true;
    setIsAuthenticating(true);
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');
      const result = await signInWithPopup(auth, provider);
      await provisionSocialUser(result.user);
      await syncSessionCookie(result.user);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    } finally {
      syncLockRef.current = false;
      setIsAuthenticating(false);
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

  /**
   * H-5: Call on every hard layout mount (SPA navigation).
   * onAuthStateChanged only fires on browser reload — not on Next.js client-side
   * route transitions. This method closes that window: if the cached ID token
   * has less than 5 minutes left, it force-refreshes and re-syncs the session
   * cookie before the layout renders any authenticated content.
   */
  const refreshSession = async (): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const minsLeft = await getTokenExpiryMinutes(currentUser);
      if (minsLeft !== null && minsLeft < 5) {
        await syncSessionCookie(currentUser);
      }
    } catch {
      // Non-fatal — the 50-min interval will retry
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticating,
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
        refreshSession,
      }}
    >
      {children}
      {/* H-3: Session-expired modal — shown when the token refresh interval
          encounters a fatal auth error (revoked token, disabled account, etc.) */}
      {sessionExpiredVisible && (
        <SessionExpiredModal onDismiss={() => setSessionExpiredVisible(false)} />
      )}
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
