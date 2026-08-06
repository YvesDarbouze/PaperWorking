/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ClaimHistorySection from '@/components/profile/ClaimHistorySection';

/**
 * "Prior Email History" audit — Prompt 4, requirement 3.
 *
 * Verdict: this is NOT a stub. It is wired to two real, auth-guarded endpoints:
 *   POST /api/identity/claim/start   — searches dealInvitations, teamInvitations,
 *                                      investor_contacts and commitments for the
 *                                      address, stores a 15-minute code, and
 *                                      emails it via CommunicationEngine.
 *   POST /api/identity/claim/verify  — validates the code and merges history.
 *
 * These tests pin that wiring so the section cannot silently decay into a stub.
 */

const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1', getIdToken: mockGetIdToken } }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

describe('ClaimHistorySection (Prior Email History)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('renders a real email input, not placeholder copy', () => {
    render(<ClaimHistorySection />);
    expect(screen.getByText(/Claim Prior Email History/i)).toBeTruthy();
    const input = document.querySelector('input[type="email"]');
    expect(input).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/coming soon|not implemented|TODO/i);
  });

  it('posts to the real claim/start endpoint with a Bearer token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Verification code sent.' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ClaimHistorySection />);
    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'prior@example.com' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/identity/claim/start');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(init.body).claimEmail).toBe('prior@example.com');
  });

  it('advances to the verification step on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;

    render(<ClaimHistorySection />);
    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'prior@example.com' } });
    fireEvent.submit(input.closest('form')!);

    // The verify step asks for the 6-digit code.
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/code/i),
    );
  });

  it('surfaces a server rejection instead of pretending it worked', async () => {
    const toast = jest.requireMock('react-hot-toast').default;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No prior history found for this email address.' }),
    }) as unknown as typeof fetch;

    render(<ClaimHistorySection />);
    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'nobody@example.com' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error.mock.calls.flat().join(' ')).toContain('No prior history found');
  });
});
