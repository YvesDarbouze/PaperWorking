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
  cancelled?: boolean;
  idToken: string | null;
  email: string | null;
  displayName: string | null;
  error?: string;
}

const POPUP_DISMISSED_PATTERNS = [
  'auth/popup-closed-by-user',
  'popup-closed-by-user',
  'popup_closed_by_user',
  'popup closed by user',
  'popup_closed',
  'popup-closed',
  'closed_by_user',
  'closed-by-user',
  'closed by user',
  'auth/cancelled-popup-request',
  'cancelled-popup-request',
  'cancelled_popup_request',
  'cancelled popup',
  'canceled popup',
  'auth/user-cancelled',
  'user-cancelled',
  'user_cancelled',
  'user cancelled',
  'user canceled',
  'auth/redirect-cancelled-by-user',
  'redirect-cancelled-by-user',
  'access_denied',
  'access-denied',
  'access denied',
  'user_denied',
  'user-denied',
  'user denied',
  'permissions error',
  'window closed',
  'window_closed',
];

function isExplicitNonDismissalPopupError(err: unknown): boolean {
  if (!err) return false;
  const code =
    typeof (err as { code?: unknown })?.code === 'string'
      ? ((err as { code: string }).code || '').toLowerCase().trim()
      : '';
  const message =
    typeof (err as { message?: unknown })?.message === 'string'
      ? ((err as { message: string }).message || '').toLowerCase().trim()
      : typeof err === 'string'
        ? err.toLowerCase().trim()
        : '';
  const combined = `${code} ${message}`;
  return (
    combined.includes('account-exists-with-different-credential') ||
    combined.includes('popup-blocked') ||
    combined.includes('user-disabled') ||
    combined.includes('too-many-requests')
  );
}

function isPopupWindowClosed(win: Window | null): boolean {
  if (!win) return false;
  try {
    return Boolean(win.closed);
  } catch {
    return false;
  }
}

async function waitForPopupWindowClosed(win: Window | null, maxWaitMs = 250): Promise<boolean> {
  if (!win) return false;
  if (isPopupWindowClosed(win)) return true;
  const stepMs = 25;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, stepMs);
      if (typeof (timer as { unref?: () => void })?.unref === 'function') {
        (timer as { unref: () => void }).unref();
      }
    });
    if (isPopupWindowClosed(win)) {
      return true;
    }
  }
  return isPopupWindowClosed(win);
}

/**
 * Returns true when an error thrown by Firebase Auth popup flow represents
 * the user closing or cancelling the OAuth popup window rather than a real failure.
 */
export function isPopupDismissedError(err: unknown): boolean {
  if (!err) return false;
  const code =
    typeof (err as { code?: unknown })?.code === 'string'
      ? ((err as { code: string }).code || '').toLowerCase().trim()
      : '';
  const message =
    typeof (err as { message?: unknown })?.message === 'string'
      ? ((err as { message: string }).message || '').toLowerCase().trim()
      : typeof err === 'string'
        ? err.toLowerCase().trim()
        : '';
  let customDataText = '';
  const rawCustomData = (err as { customData?: unknown })?.customData;
  if (rawCustomData !== undefined && rawCustomData !== null) {
    try {
      customDataText = JSON.stringify(rawCustomData).toLowerCase();
    } catch {
      customDataText = String(rawCustomData).toLowerCase();
    }
  }
  const fullText = `${code} ${message} ${customDataText} ${String(err).toLowerCase()}`;

  return POPUP_DISMISSED_PATTERNS.some(
    (pattern) =>
      code === pattern ||
      code.includes(pattern) ||
      message.includes(pattern) ||
      fullText.includes(pattern),
  );
}

/**
 * Maps Firebase Auth error codes to clean, user-friendly messages and strips
 * raw backend / SDK error strings (e.g. "Firebase: Error (auth/...).") so they
 * never leak onto the login screen.
 */
export function formatSocialAuthError(err: unknown): string {
  if (isPopupDismissedError(err)) {
    return '';
  }

  const code =
    typeof (err as { code?: unknown })?.code === 'string'
      ? ((err as { code: string }).code || '').toLowerCase().trim()
      : '';
  const rawMessage =
    typeof (err as { message?: unknown })?.message === 'string'
      ? ((err as { message: string }).message || '').trim()
      : typeof err === 'string'
        ? err.trim()
        : '';
  const lowerMessage = rawMessage.toLowerCase();

  if (
    code === 'auth/account-exists-with-different-credential' ||
    lowerMessage.includes('account-exists-with-different-credential')
  ) {
    return 'An account already exists with a different sign-in method. Try the other provider or use email/password.';
  }
  if (code === 'auth/popup-blocked' || lowerMessage.includes('popup-blocked')) {
    return 'Sign-in pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
  }
  if (code === 'auth/network-request-failed' || lowerMessage.includes('network-request-failed')) {
    return 'Network error while connecting to sign-in provider. Please check your connection and try again.';
  }
  if (code === 'auth/too-many-requests' || lowerMessage.includes('too-many-requests')) {
    return 'Too many sign-in attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/user-disabled' || lowerMessage.includes('user-disabled')) {
    return 'This account has been disabled. Please contact support for assistance.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    lowerMessage.includes('invalid-credential') ||
    lowerMessage.includes('wrong-password') ||
    lowerMessage.includes('user-not-found')
  ) {
    return 'Invalid email or password.';
  }
  if (code === 'auth/email-already-in-use' || lowerMessage.includes('email-already-in-use')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Never expose raw Firebase SDK / backend error strings like "Firebase: Error (auth/...)."
  if (
    !rawMessage ||
    rawMessage.startsWith('Firebase:') ||
    lowerMessage.includes('(auth/') ||
    lowerMessage.includes('auth/') ||
    lowerMessage.includes('identitytoolkit')
  ) {
    return 'Unable to complete sign-in right now. Please try again or sign in with email.';
  }

  return rawMessage;
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
    return {
      ok: false,
      idToken: null,
      email: null,
      displayName: null,
      error: 'Unable to complete sign-in right now. Please try again or sign in with email.',
    };
  }

  const auth = getAuth(app);
  const authProvider = buildProvider(provider);

  const popupState: {
    popupWindow: Window | null;
    closedByUser: boolean;
    removeWindowFocusListener: (() => void) | null;
  } = {
    popupWindow: null,
    closedByUser: false,
    removeWindowFocusListener: null,
  };
  let closeWatchInterval: ReturnType<typeof setInterval> | null = null;
  let closeGraceTimer: ReturnType<typeof setTimeout> | null = null;
  const hasWindowOpen = typeof window !== 'undefined' && typeof window.open === 'function';
  const originalWindowOpen = hasWindowOpen ? window.open : null;

  if (hasWindowOpen && originalWindowOpen) {
    window.open = function (...args: Parameters<typeof window.open>): Window | null {
      const opened = originalWindowOpen.apply(window, args);
      if (opened) {
        popupState.popupWindow = opened;
      }
      return opened;
    };
  }

  try {
    const popupPromise = signInWithPopup(auth, authProvider);
    // Prevent unhandled rejection if the user-close watcher settles first while Firebase waits on its 8s AUTH_EVENT timer
    popupPromise.catch(() => {});

    const userCloseWatcher = new Promise<never>((_, reject) => {
      const triggerCloseGraceReject = () => {
        if (popupState.closedByUser) return;
        popupState.closedByUser = true;
        if (closeWatchInterval) {
          clearInterval(closeWatchInterval);
          closeWatchInterval = null;
        }
        closeGraceTimer = setTimeout(() => {
          const dismissErr = new Error('Firebase: Error (auth/popup-closed-by-user).') as Error & {
            code?: string;
          };
          dismissErr.code = 'auth/popup-closed-by-user';
          reject(dismissErr);
        }, 200);
        if (typeof (closeGraceTimer as { unref?: () => void })?.unref === 'function') {
          (closeGraceTimer as { unref: () => void }).unref();
        }
      };

      const checkPopupClosed = () => {
        if (isPopupWindowClosed(popupState.popupWindow)) {
          triggerCloseGraceReject();
        }
      };

      closeWatchInterval = setInterval(checkPopupClosed, 100);
      if (typeof (closeWatchInterval as { unref?: () => void })?.unref === 'function') {
        (closeWatchInterval as { unref: () => void }).unref();
      }

      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        const onWindowRegainFocus = () => {
          checkPopupClosed();
        };
        window.addEventListener('focus', onWindowRegainFocus);
        popupState.removeWindowFocusListener = () => {
          if (typeof window.removeEventListener === 'function') {
            window.removeEventListener('focus', onWindowRegainFocus);
          }
        };
      }
    });

    const credential: UserCredential = await Promise.race([popupPromise, userCloseWatcher]);
    const idToken = await credential.user.getIdToken();

    return {
      ok: true,
      idToken,
      email: credential.user.email,
      displayName: credential.user.displayName,
    };
  } catch (err: unknown) {
    if (isPopupDismissedError(err) || popupState.closedByUser) {
      return { ok: false, cancelled: true, idToken: null, email: null, displayName: null };
    }

    if (popupState.popupWindow && !isExplicitNonDismissalPopupError(err)) {
      const closedAfterReject = await waitForPopupWindowClosed(popupState.popupWindow, 250);
      if (closedAfterReject) {
        return { ok: false, cancelled: true, idToken: null, email: null, displayName: null };
      }
    }

    const formattedError = formatSocialAuthError(err);
    if (!formattedError) {
      return { ok: false, cancelled: true, idToken: null, email: null, displayName: null };
    }
    return {
      ok: false,
      idToken: null,
      email: null,
      displayName: null,
      error: formattedError,
    };
  } finally {
    if (closeWatchInterval) {
      clearInterval(closeWatchInterval);
    }
    if (closeGraceTimer) {
      clearTimeout(closeGraceTimer);
    }
    if (popupState.removeWindowFocusListener) {
      popupState.removeWindowFocusListener();
    }
    if (hasWindowOpen && originalWindowOpen) {
      window.open = originalWindowOpen;
    }
  }
}
