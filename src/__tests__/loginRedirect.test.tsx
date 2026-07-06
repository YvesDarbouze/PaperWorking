/** @jest-environment jsdom */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';

/* ═══════════════════════════════════════════════════════════════
   Integration test for the post-auth redirect wiring on the login
   page (not just the pure helper):

     • NEW user (completes sign-up)   → /pricing  (pick a tier)
     • RETURNING user (signs in)      → /dashboard (their Portfolio)

   Firebase auth is mocked so the test is deterministic and creates
   no real users; we assert on where window.location.replace lands.
   ═══════════════════════════════════════════════════════════════ */

var mockSearchParams: Record<string, string | null> = {};
var mockLogin = jest.fn().mockResolvedValue(undefined);
var mockRegister = jest.fn().mockResolvedValue(undefined);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => ({
    get: (k: string) => (k in mockSearchParams ? mockSearchParams[k] : null),
  }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    logout: jest.fn().mockResolvedValue(undefined),
    loginWithGoogle: jest.fn().mockResolvedValue(undefined),
    loginWithFacebook: jest.fn().mockResolvedValue(undefined),
    sendMagicLink: jest.fn().mockResolvedValue(undefined),
    error: null,
    clearError: jest.fn(),
    user: null,
    loading: false,
    isAuthenticating: false,
    sessionReady: false,
  }),
}));

// Route-group path is valid as an import specifier.
import LoginPage from '../app/(auth)/login/page';

describe('LoginPage — post-auth redirect', () => {
  let replaceMock: jest.Mock;
  const origLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    window.sessionStorage.clear();
    replaceMock = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'http://localhost/login',
        origin: 'http://localhost',
        pathname: '/login',
        search: '',
        replace: replaceMock,
        assign: jest.fn(),
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: origLocation });
  });

  it('sends a NEW user (sign-up) to /pricing to pick a tier', async () => {
    mockSearchParams = { mode: 'signup' }; // start directly on the "create account" form
    const { container, getByText } = render(<LoginPage />);

    fireEvent.change(container.querySelector('#signup-name')!, { target: { value: 'John Doe' } });
    fireEvent.change(container.querySelector('#signup-email')!, { target: { value: 'new@example.com' } });
    fireEvent.change(container.querySelector('#signup-password')!, { target: { value: 'Password1' } });
    fireEvent.change(container.querySelector('#signup-confirm-password')!, { target: { value: 'Password1' } });
    fireEvent.click(container.querySelector('#signup-accept-terms')!);

    await act(async () => {
      fireEvent.click(getByText('Create Account'));
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/pricing'));
    expect(replaceMock).not.toHaveBeenCalledWith('/dashboard');
  });

  it('sends a RETURNING user (sign-in) to /dashboard (Portfolio)', async () => {
    const { container, getByText } = render(<LoginPage />); // default view = sign-in

    fireEvent.change(container.querySelector('#login-email')!, { target: { value: 'existing@example.com' } });
    fireEvent.change(container.querySelector('#login-password')!, { target: { value: 'whatever1' } });

    await act(async () => {
      fireEvent.click(getByText('Sign In'));
    });

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'));
    expect(replaceMock).not.toHaveBeenCalledWith('/pricing');
  });
});
