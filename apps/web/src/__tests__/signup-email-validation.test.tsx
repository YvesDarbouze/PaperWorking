/**
 * @jest-environment jsdom
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

// Tell React that we are in an act-supported environment
// @ts-expect-error global flag for React 18/19
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCreateSession = jest.fn<(...args: unknown[]) => Promise<{ ok: boolean; status: number; body: unknown }>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: jest.fn(),
  }),
  usePathname: () => '/signup',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ name: 'mock-auth' })),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: class {
    addScope = jest.fn();
  },
  FacebookAuthProvider: class {
    addScope = jest.fn();
  },
}));

jest.unstable_mockModule('@/lib/firebase/client', () => ({
  getFirebaseApp: jest.fn(() => ({ name: 'mock-app' })),
}));

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loginWithDevSession: jest.fn(),
    loginWithGoogle: async () => {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      try {
        await signInWithPopup({} as never, new GoogleAuthProvider() as never);
        return true;
      } catch {
        return false;
      }
    },
    loginWithFacebook: async () => {
      const { signInWithPopup, FacebookAuthProvider } = await import('firebase/auth');
      try {
        await signInWithPopup({} as never, new FacebookAuthProvider() as never);
        return true;
      } catch {
        return false;
      }
    },
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

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  createSession: mockCreateSession,
  resolveLoginRedirect: jest.fn(() => '/pricing'),
  fetchSessionProfile: jest.fn(),
  destroySession: jest.fn(),
  createDevSession: jest.fn(),
}));

const { default: LoginPanel } = await import('../../components/auth/LoginPanel.js');

describe('Bug_16 Regression — Sign Up Email Format Validation in LoginPanel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockCreateSession.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it.each([
    'test@gmail.com.com.com.com',
    'test@gmail.com.com..com.com',
    'qatesthub3@gmail.com.com.com.com',
    'test@gmail.com.com',
    'user@domain.com.org',
  ])(
    'LoginPanel in signup mode displays "Please enter a valid email address" and does NOT call createSession when submitted with %s',
    async (invalidEmail) => {
      await act(async () => {
        root.render(<LoginPanel defaultMode="signup" />);
      });

      const form = container.querySelector('form');
      expect(form).not.toBeNull();
      expect(form?.hasAttribute('novalidate')).toBe(true);

      const fullNameInput = container.querySelector<HTMLInputElement>('input[name="fullName"]');
      const emailInput = container.querySelector<HTMLInputElement>('input[name="email"]');
      const passwordInput = container.querySelector<HTMLInputElement>('input[name="password"]');
      const confirmPasswordInput = container.querySelector<HTMLInputElement>('input[name="confirmPassword"]');
      const acceptTermsInput = container.querySelector<HTMLInputElement>('input[name="acceptTerms"]');

      expect(fullNameInput).not.toBeNull();
      expect(emailInput).not.toBeNull();
      expect(passwordInput).not.toBeNull();
      expect(confirmPasswordInput).not.toBeNull();
      expect(acceptTermsInput).not.toBeNull();

      fullNameInput!.value = 'QA Test User';
      emailInput!.value = invalidEmail;
      passwordInput!.value = 'ValidPass123';
      confirmPasswordInput!.value = 'ValidPass123';
      acceptTermsInput!.checked = true;

      await act(async () => {
        form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Please enter a valid email address');
    },
  );

  it('Bug_19 Regression: marks all mandatory Sign Up fields (Full name, Email, Password, Confirm password, Terms of Service) with required asterisks (*) and required/aria-required attributes', async () => {
    await act(async () => {
      root.render(<LoginPanel defaultMode="signup" />);
    });

    const asterisks = container.querySelectorAll('[data-testid="required-asterisk"]');
    expect(asterisks).toHaveLength(5);
    asterisks.forEach((asterisk) => {
      expect(asterisk.textContent).toBe('*');
    });

    const fullNameLabel = container.querySelector('label[for="fullName"]');
    const emailLabel = container.querySelector('label[for="email"]');
    const passwordLabel = container.querySelector('label[for="password"]');
    const confirmPasswordLabel = container.querySelector('label[for="confirmPassword"]');
    const acceptTermsText = container.querySelector('[data-testid="accept-terms-text"]');

    expect(fullNameLabel?.textContent).toContain('*');
    expect(emailLabel?.textContent).toContain('*');
    expect(passwordLabel?.textContent).toContain('*');
    expect(confirmPasswordLabel?.textContent).toContain('*');
    expect(acceptTermsText?.textContent).toContain('*');

    const mandatoryInputs = [
      container.querySelector<HTMLInputElement>('input[name="fullName"]'),
      container.querySelector<HTMLInputElement>('input[name="email"]'),
      container.querySelector<HTMLInputElement>('input[name="password"]'),
      container.querySelector<HTMLInputElement>('input[name="confirmPassword"]'),
      container.querySelector<HTMLInputElement>('input[name="acceptTerms"]'),
    ];

    for (const input of mandatoryInputs) {
      expect(input).not.toBeNull();
      expect(input?.required).toBe(true);
      expect(input?.getAttribute('aria-required')).toBe('true');
    }
  });

  it('Bug_68 Regression: clicking Continue with Facebook on LoginPanel and cancelling the popup (auth/popup-closed-by-user) returns cleanly to login state without rendering raw Firebase error banner', async () => {
    const firebaseAuthMod = await import('firebase/auth');
    const signInWithPopupMock = firebaseAuthMod.signInWithPopup as jest.MockedFunction<
      typeof firebaseAuthMod.signInWithPopup
    >;
    const popupClosedErr = Object.assign(
      new Error('Firebase: Error (auth/popup-closed-by-user).'),
      { code: 'auth/popup-closed-by-user' },
    );
    signInWithPopupMock.mockRejectedValueOnce(popupClosedErr);

    await act(async () => {
      root.render(<LoginPanel defaultMode="signin" />);
    });

    const fbBtn = container.querySelector<HTMLButtonElement>('[data-testid="facebook-signin-button"]');
    expect(fbBtn).not.toBeNull();
    expect(fbBtn?.textContent).toContain('Continue with Facebook');

    await act(async () => {
      fbBtn!.click();
    });

    expect(signInWithPopupMock).toHaveBeenCalledTimes(1);
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).not.toContain('Firebase:');
    expect(container.textContent).not.toContain('auth/popup-closed-by-user');
    expect(fbBtn?.textContent).toContain('Continue with Facebook');
    expect(fbBtn?.disabled).toBe(false);
  });

  it('Bug_69 Regression: submitting empty Sign Up form displays all 5 validation errors and filling each required field dynamically clears its error message without re-submitting', async () => {
    await act(async () => {
      root.render(<LoginPanel defaultMode="signup" />);
    });

    const form = container.querySelector('form')!;
    const fullNameInput = container.querySelector<HTMLInputElement>('input[name="fullName"]')!;
    const emailInput = container.querySelector<HTMLInputElement>('input[name="email"]')!;
    const passwordInput = container.querySelector<HTMLInputElement>('input[name="password"]')!;
    const confirmPasswordInput = container.querySelector<HTMLInputElement>('input[name="confirmPassword"]')!;
    const acceptTermsInput = container.querySelector<HTMLInputElement>('input[name="acceptTerms"]')!;

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Name must be at least 2 characters');
    expect(container.textContent).toContain('Work email is required');
    expect(container.textContent).toContain('Password must be at least 8 characters');
    expect(container.textContent).toContain('Please confirm your password');
    expect(container.textContent).toContain('You must accept the Terms of Service and Privacy Policy');

    // 1. Fill Full Name -> clears fullName error only
    await act(async () => {
      fullNameInput.value = 'Jane Investor';
      fullNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('Name must be at least 2 characters');
    expect(container.textContent).toContain('Work email is required');

    // 2. Fill Email -> clears email error
    await act(async () => {
      emailInput.value = 'jane@paperworking.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('Work email is required');
    expect(container.textContent).not.toContain('Please enter a valid email address');
    expect(container.textContent).toContain('Password must be at least 8 characters');

    // 3. Fill Password -> clears password error
    await act(async () => {
      passwordInput.value = 'ValidPass123';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('Password must be at least 8 characters');
    expect(container.textContent).toContain('Please confirm your password');

    // 4. Fill Confirm Password -> clears confirmPassword error
    await act(async () => {
      confirmPasswordInput.value = 'ValidPass123';
      confirmPasswordInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('Please confirm your password');
    expect(container.textContent).not.toContain('Passwords do not match');
    expect(container.textContent).toContain('You must accept the Terms of Service and Privacy Policy');

    // 5. Check acceptTerms -> clears acceptTerms error so 0 validation errors remain
    await act(async () => {
      acceptTermsInput.checked = true;
      acceptTermsInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('You must accept the Terms of Service and Privacy Policy');
  });
});
