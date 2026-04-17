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
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';

/* ═══════════════════════════════════════════════════════
   PaperWorking — AuthContext (Phase 2)
   
   Single source of truth for Firebase Authentication.
   Provides:
     • user / loading / error state
     • login / register / logout / resetPassword actions
     • Google SSO via signInWithPopup
     • Automatic server-side session cookie sync
       (HttpOnly cookie set via /api/auth/session)
   ═══════════════════════════════════════════════════════ */

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    // User logged out — clear the server cookie
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

  // Listen to auth state changes + sync session cookie
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      let profileUnsubscribe: (() => void) | null = null;

      if (firebaseUser) {
        // Fetch Firestore profile to get Role and Organization info in real-time
        const docRef = doc(db, 'users', firebaseUser.uid);
        profileUnsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          }
        });
      } else {
        setProfile(null);
      }
      
      setLoading(false);
      // Sync server-side session cookie for middleware protection
      await syncSessionCookie(firebaseUser);

      return () => {
        if (profileUnsubscribe) profileUnsubscribe();
      };
    });
    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  /**
   * Translates Firebase error codes into user-friendly messages.
   */
  function getAuthErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact support.';
      // Directive 29: Unify login errors to prevent email enumeration
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password must be at least 8 characters.';
      // Directive 30: Account lockout message
      case 'auth/too-many-requests':
        return 'Account temporarily locked due to multiple failed attempts. Try resetting your password.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { user: loggedInUser } = await signInWithEmailAndPassword(auth, email, password);
      // Explicitly sync the session cookie BEFORE returning
      // so the caller can safely navigate to /dashboard
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

      // Directive 22: Post-registration — write user doc with default role
      // and placeholder organizationId
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        displayName,
        role: 'Lead Investor', // Default RBAC role
        organizationId: `org_${newUser.uid.slice(0, 8)}`, // Placeholder — replaced during onboarding
        subscriptionPlan: 'None',
        subscriptionStatus: 'inactive',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const { user: googleUser } = await signInWithPopup(auth, provider);

      // Directive 40: SSO Database Sync
      // Check if user document exists — only create for first-time sign-ins
      // so we never overwrite a returning user's role or org assignment
      const userDocRef = doc(db, 'users', googleUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // First-time Google sign-in — provision user document
        await setDoc(userDocRef, {
          uid: googleUser.uid,
          email: googleUser.email,
          displayName: googleUser.displayName || 'User',
          role: 'Lead Investor', // Default RBAC role
          organizationId: `org_${googleUser.uid.slice(0, 8)}`,
          subscriptionPlan: 'None',
          subscriptionStatus: 'inactive',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      // Explicitly sync the session cookie BEFORE returning
      await syncSessionCookie(googleUser);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      // Cookie is cleared by syncSessionCookie via onAuthStateChanged
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
