'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';

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
  profile: any | null;
  loading: boolean;
  error: string | null;
  fbStatus: 'pending' | 'connected' | 'not_authorized' | 'unknown';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
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
 */
async function provisionSocialUser(user: User) {
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'User',
      role: 'Lead Investor',
      organizationId: `org_${user.uid.slice(0, 8)}`,
      subscriptionPlan: 'None',
      subscriptionStatus: 'inactive',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fbStatus, setFbStatus] = useState<'pending' | 'connected' | 'not_authorized' | 'unknown'>('pending');

  // 1. Check for Redirect Result on Mount
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          await provisionSocialUser(result.user);
          await syncSessionCookie(result.user);
        }
      })
      .catch((err) => {
        console.error('OAuth Redirect Error:', err);
        setError(getAuthErrorMessage(err.code));
      });
  }, []);

  // 1b. Listen for FB SDK login status (connected / not_authorized / unknown)
  useEffect(() => {
    function handleFBStatus(e: Event) {
      const { status, authResponse } = (e as CustomEvent).detail;
      setFbStatus(status);

      if (status === 'connected' && authResponse?.accessToken && !user) {
        // User is logged into Facebook AND has authorized our app → auto sign-in
        const credential = FacebookAuthProvider.credential(authResponse.accessToken);
        signInWithCredential(auth, credential)
          .then(async (result) => {
            await provisionSocialUser(result.user);
            await syncSessionCookie(result.user);
            console.log('[AuthContext] Auto-signed in via FB SDK session');
          })
          .catch((err) => {
            console.warn('[AuthContext] FB auto-login failed:', err.code);
          });
      }
      // 'not_authorized' → user is on Facebook but hasn't authorized our app
      //   → components can check fbStatus and show FB.login() prompt
      // 'unknown' → user isn't logged into Facebook at all
      //   → components can show the standard Login Button
    }

    window.addEventListener('fb-status', handleFBStatus);
    return () => window.removeEventListener('fb-status', handleFBStatus);
  }, [user]);

  // 2. Listen to auth state changes + sync session cookie
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        profileUnsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) setProfile(snap.data());
        });
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
      case 'auth/weak-password': return 'Password must be at least 8 characters.';
      case 'auth/too-many-requests': return 'Account temporarily locked. Try resetting your password.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      case 'auth/popup-closed-by-user': return 'Sign-in was cancelled. Please try again.';
      case 'auth/redirect-cancelled-by-user': return 'Sign-in redirect was cancelled.';
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

  const register = async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        displayName,
        role: 'Lead Investor', 
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
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const loginWithFacebook = async () => {
    setError(null);
    try {
      const provider = new FacebookAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
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
        fbStatus,
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
