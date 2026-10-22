import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockPush = jest.fn();
const mockSignInWithPopup = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAuth = jest.fn(() => ({ name: 'mock-auth' }));
const mockGetFirebaseApp = jest.fn(() => ({ name: 'mock-app' }));
const mockCreateSession = jest.fn<(...args: unknown[]) => Promise<{ ok: boolean }>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signInWithPopup: mockSignInWithPopup,
  GoogleAuthProvider: class {
    addScope = jest.fn();
  },
  FacebookAuthProvider: class {
    addScope = jest.fn();
  },
}));

jest.unstable_mockModule('@/lib/firebase/client', () => ({
  getFirebaseApp: mockGetFirebaseApp,
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  createSession: mockCreateSession,
  resolveLoginRedirect: jest.fn(() => '/dashboard'),
  fetchSessionProfile: jest.fn(),
  destroySession: jest.fn(),
  createDevSession: jest.fn(),
}));

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loginWithDevSession: jest.fn(),
    sendMagicLink: jest.fn(),
    error: null,
    clearError: jest.fn(),
    authenticated: false,
    loading: false,
    firebaseReady: true,
    supabaseReady: true,
    logout: jest.fn(),
  }),
  useOptionalAuth: () => null,
}));

jest.unstable_mockModule('@/lib/data', () => ({
  useMockAuth: () => false,
}));

const {
  signInWithSocialProvider,
  isPopupDismissedError,
  formatSocialAuthError,
} = await import('../../lib/firebase/social-auth.js');
const { default: LoginPanel } = await import('../../components/auth/LoginPanel.js');
const { PRICING_PLANS } = await import('../../lib/marketing/pricing-data.js');

describe('Bug_09 Regression — Google Social Sign-In Popup Close Handling', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSignInWithPopup.mockReset();
    mockCreateSession.mockReset();
    mockGetFirebaseApp.mockReturnValue({ name: 'mock-app' });
  });

  describe('isPopupDismissedError & signInWithSocialProvider', () => {
    it.each([
      [{ code: 'auth/popup-closed-by-user', message: 'Firebase: Error (auth/popup-closed-by-user).' }],
      [{ code: 'auth/cancelled-popup-request', message: 'Firebase: Error (auth/cancelled-popup-request).' }],
      [{ code: 'auth/user-cancelled', message: 'Firebase: Error (auth/user-cancelled).' }],
      [{ code: 'auth/redirect-cancelled-by-user', message: 'Firebase: Error (auth/redirect-cancelled-by-user).' }],
      [{ code: 'popup-closed-by-user' }],
      [new Error('Firebase: Error (auth/popup-closed-by-user).')],
      [new Error('User denied access_denied in popup window')],
    ])('treats popup dismissal %p as cancelled without returning a backend error', async (errObj) => {
      expect(isPopupDismissedError(errObj)).toBe(true);

      mockSignInWithPopup.mockRejectedValueOnce(errObj);
      const result = await signInWithSocialProvider('google');

      expect(result).toEqual({
        ok: false,
        cancelled: true,
        idToken: null,
        email: null,
        displayName: null,
      });
      expect(result.error).toBeUndefined();
    });

    it('treats a popup window closed by the user (X button) before SDK cleanup as cancelled even if Firebase rejects with auth/internal-error', async () => {
      const originalWindow = (globalThis as { window?: unknown }).window;
      const fakeWindow = {
        open: jest.fn(() => ({
          closed: false,
          close: jest.fn(),
          focus: jest.fn(),
        })),
      };
      (globalThis as { window?: unknown }).window = fakeWindow;

      mockSignInWithPopup.mockImplementationOnce(async () => {
        const winObj = (globalThis as unknown as { window: { open: (...args: unknown[]) => { closed: boolean; close: () => void } } }).window;
        const fakePopup = winObj.open('https://accounts.google.com', 'oauth');
        // Simulate user clicking the X button on the popup window
        fakePopup.closed = true;
        // Simulate Firebase SDK cleanup calling popup.close() and rejecting with internal-error
        fakePopup.close();
        const err = new Error('Firebase: Error (auth/internal-error).') as Error & { code?: string };
        err.code = 'auth/internal-error';
        throw err;
      });

      try {
        const result = await signInWithSocialProvider('google');
        expect(result).toEqual({
          ok: false,
          cancelled: true,
          idToken: null,
          email: null,
          displayName: null,
        });
        expect(result.error).toBeUndefined();
      } finally {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    });

    it.each([
      [{ code: 'auth/popup-closed-by-user', message: 'Firebase: Error (auth/popup-closed-by-user).' }],
      [{ code: 'auth/cancelled-popup-request', message: 'Firebase: Error (auth/cancelled-popup-request).' }],
      [{ code: 'auth/user-cancelled', message: 'Firebase: Error (auth/user-cancelled).' }],
      [new Error('Firebase: Error (auth/popup-closed-by-user).')],
      [
        Object.assign(new Error('Firebase: Error (auth/internal-error).'), {
          code: 'auth/internal-error',
          customData: { _tokenResponse: { errorMessage: 'USER_DENIED: Permissions error' } },
        }),
      ],
    ])(
      'Bug_68 Regression: signInWithSocialProvider("facebook") treats Facebook popup dismissal %p as cancelled without returning raw Firebase error',
      async (errObj) => {
        expect(isPopupDismissedError(errObj)).toBe(true);

        mockSignInWithPopup.mockRejectedValueOnce(errObj);
        const result = await signInWithSocialProvider('facebook');

        expect(result).toEqual({
          ok: false,
          cancelled: true,
          idToken: null,
          email: null,
          displayName: null,
        });
        expect(result.error).toBeUndefined();
      },
    );
  });

    it('Bug_09 Win11 Chrome Race 1: treats popup close as cancelled when Firebase PopupOperation.reject() calls popup.close() synchronously before popup.closed flips to true', async () => {
          const originalWindow = (globalThis as { window?: unknown }).window;
          const fakePopup = {
            closed: false,
            close: jest.fn(() => {
              // In Chrome on Windows 11, calling popup.close() during PopupOperation.cleanUp()
              // happens while popup.closed is still false at entry, and popup.closed becomes true right after
              setTimeout(() => {
                fakePopup.closed = true;
              }, 20);
            }),
            focus: jest.fn(),
          };
          const fakeWindow = {
            open: jest.fn((..._args: unknown[]) => fakePopup),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          };
          (globalThis as { window?: unknown }).window = fakeWindow;
    
          mockSignInWithPopup.mockImplementationOnce(async () => {
            const winObj = (globalThis as unknown as { window: typeof fakeWindow }).window;
            const opened = winObj.open('https://accounts.google.com', 'oauth');
            // Simulate Firebase PopupOperation.reject(err) -> unregisterAndCleanUp() -> cleanUp() -> authWindow.close()
            // running synchronously in the same turn BEFORE popup.closed is true and BEFORE microtask catch(err) runs
            opened.close();
            const err = new Error('Firebase: Error (auth/internal-error).') as Error & { code?: string };
            err.code = 'auth/internal-error';
            throw err;
          });
    
          try {
            const result = await signInWithSocialProvider('google');
            expect(result).toEqual({
              ok: false,
              cancelled: true,
              idToken: null,
              email: null,
              displayName: null,
            });
            expect(result.error).toBeUndefined();
          } finally {
            (globalThis as { window?: unknown }).window = originalWindow;
          }
        });

    it('Bug_09 Win11 Chrome Race 2: treats popup close as cancelled when clicking X aborts the OAuth request 80ms before OS window close animation flips popup.closed to true', async () => {
          const originalWindow = (globalThis as { window?: unknown }).window;
          const fakePopup = {
            closed: false,
            close: jest.fn(),
            focus: jest.fn(),
          };
          const fakeWindow = {
            open: jest.fn((..._args: unknown[]) => fakePopup),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          };
          (globalThis as { window?: unknown }).window = fakeWindow;
    
          mockSignInWithPopup.mockImplementationOnce(async () => {
            const winObj = (globalThis as unknown as { window: typeof fakeWindow }).window;
            winObj.open('https://accounts.google.com', 'oauth');
            // User clicks "X": browser aborts in-flight OAuth navigation immediately,
            // while Windows 11 DWM close animation marks popup.closed = true 80ms later.
            setTimeout(() => {
              fakePopup.closed = true;
            }, 80);
            const err = new Error('Firebase: Error (auth/network-request-failed).') as Error & { code?: string };
            err.code = 'auth/network-request-failed';
            throw err;
          });
    
          try {
            const result = await signInWithSocialProvider('google');
            expect(result).toEqual({
              ok: false,
              cancelled: true,
              idToken: null,
              email: null,
              displayName: null,
            });
            expect(result.error).toBeUndefined();
          } finally {
            (globalThis as { window?: unknown }).window = originalWindow;
          }
        });

    it('Bug_09 Win11 Chrome Race 3: resolves as cancelled via userCloseWatcher when user clicks X and signInWithPopup hangs waiting on AUTH_EVENT timeout', async () => {
          const originalWindow = (globalThis as { window?: unknown }).window;
          const fakePopup = {
            closed: false,
            close: jest.fn(),
            focus: jest.fn(),
          };
          const fakeWindow = {
            open: jest.fn((..._args: unknown[]) => fakePopup),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          };
          (globalThis as { window?: unknown }).window = fakeWindow;
    
          mockSignInWithPopup.mockImplementationOnce(
            () =>
              new Promise((_resolve) => {
                const winObj = (globalThis as unknown as { window: typeof fakeWindow }).window;
                winObj.open('https://accounts.google.com', 'oauth');
                // User clicks "X" 50ms after popup opens; Firebase's internal watcher is blocked or waiting 8s
                setTimeout(() => {
                  fakePopup.closed = true;
                }, 50);
              }),
          );
    
          try {
            const result = await signInWithSocialProvider('google');
            expect(result).toEqual({
              ok: false,
              cancelled: true,
              idToken: null,
              email: null,
              displayName: null,
            });
            expect(result.error).toBeUndefined();
          } finally {
            (globalThis as { window?: unknown }).window = originalWindow;
          }
        });

    it('Bug_09 Win11 Chrome Race 4: detects popup close via parent window focus event when user clicks X and returns focus to login page', async () => {
          const originalWindow = (globalThis as { window?: unknown }).window;
          const focusListeners: Array<() => void> = [];
          const fakePopup = {
            closed: false,
            close: jest.fn(),
            focus: jest.fn(),
          };
          const fakeWindow = {
            open: jest.fn((..._args: unknown[]) => fakePopup),
            addEventListener: jest.fn((event: string, cb: () => void) => {
              if (event === 'focus') focusListeners.push(cb);
            }),
            removeEventListener: jest.fn(),
          };
          (globalThis as { window?: unknown }).window = fakeWindow;
    
          mockSignInWithPopup.mockImplementationOnce(
            () =>
              new Promise((_resolve) => {
                const winObj = (globalThis as unknown as { window: typeof fakeWindow }).window;
                winObj.open('https://accounts.google.com', 'oauth');
                setTimeout(() => {
                  fakePopup.closed = true;
                  for (const fn of focusListeners) fn();
                }, 10);
              }),
          );
    
          try {
            const result = await signInWithSocialProvider('google');
            expect(result).toEqual({
              ok: false,
              cancelled: true,
              idToken: null,
              email: null,
              displayName: null,
            });
            expect(result.error).toBeUndefined();
            expect(fakeWindow.removeEventListener).toHaveBeenCalled();
          } finally {
            (globalThis as { window?: unknown }).window = originalWindow;
          }
        });

  describe('formatSocialAuthError sanitization', () => {
    it('returns an empty string for popup-dismissed errors (auth/popup-closed-by-user) so no banner can ever be rendered', () => {
      expect(
        formatSocialAuthError({
          code: 'auth/popup-closed-by-user',
          message: 'Firebase: Error (auth/popup-closed-by-user).',
        }),
      ).toBe('');
      expect(formatSocialAuthError('Firebase: Error (auth/popup-closed-by-user).')).toBe('');
    });

    it('never leaks raw Firebase SDK or backend error strings to the screen', () => {
      const rawFirebaseErr = Object.assign(new Error('Firebase: Error (auth/internal-error).'), {
        code: 'auth/internal-error',
      });
      const formatted = formatSocialAuthError(rawFirebaseErr);
      expect(formatted).not.toContain('Firebase:');
      expect(formatted).not.toContain('auth/internal-error');
      expect(formatted).toBe(
        'Unable to complete sign-in right now. Please try again or sign in with email.',
      );
    });

    it('maps known Firebase Auth error codes to helpful user-facing messages', () => {
      expect(
        formatSocialAuthError({ code: 'auth/account-exists-with-different-credential' }),
      ).toContain('An account already exists with a different sign-in method');
      expect(formatSocialAuthError({ code: 'auth/popup-blocked' })).toContain(
        'Sign-in pop-up was blocked by your browser',
      );
    });
  });

  describe('LoginPanel UI rendering (v0 panel)', () => {
  it('renders Google and Facebook sign-in buttons with no initial error notice', () => {
    const html = renderToString(<LoginPanel />);
    expect(html).toContain('Google');
    expect(html).toContain('Facebook');
    expect(html).not.toContain('Firebase:');
    expect(html).not.toContain('auth/popup-closed-by-user');
  });

  it('renders sign-in submit and password visibility toggle without leaking raw Firebase errors', () => {
    const html = renderToString(<LoginPanel />);
    expect(html).toContain('Sign In');
    expect(html).toContain('svg');
    expect(html).not.toContain('Firebase: Error');
  });
});
});

describe('Bug_10 Regression — Signup CTA links', () => {
  it('Bug_10 Regression: PRICING_PLANS ctaHref links point directly to /signup rather than /login?mode=signup', () => {
        for (const plan of PRICING_PLANS) {
          expect(plan.ctaHref.startsWith('/signup')).toBe(true);
          expect(plan.ctaHref).not.toContain('/login');
        }
      });
});
