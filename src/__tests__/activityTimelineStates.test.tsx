/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ActivityTimeline } from '@/components/project/ActivityTimeline';

/**
 * Timeline reliability — Prompt 4, requirement 2.
 *
 * Covered here rather than in Playwright because `/dashboard/settings/profile`
 * cannot mount in the e2e mock harness: the mocked user is not a real Firebase
 * `User`, so `MultiFactorUserImpl._fromUser` throws
 * `TypeError: user._onReload is not a function` and the whole page falls into
 * the dashboard error boundary. That is a pre-existing limitation of
 * `e2e/mocks.ts`, unrelated to this change.
 */

const mockGetIdToken = jest.fn().mockResolvedValue('test-token');
let mockUser: unknown = { uid: 'u1', getIdToken: mockGetIdToken };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe('ActivityTimeline states', () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockUser = { uid: 'u1', getIdToken: mockGetIdToken };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('sends the Bearer token the timeline endpoints require', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ timeline: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ActivityTimeline isCrossDeal />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/investor/timeline');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('shows a skeleton while loading, not a raw spinner', async () => {
    let resolve!: (v: unknown) => void;
    global.fetch = jest.fn().mockReturnValue(
      new Promise((r) => { resolve = r; }),
    ) as unknown as typeof fetch;

    render(<ActivityTimeline isCrossDeal />);
    expect(screen.getByTestId('timeline-skeleton')).toBeTruthy();

    resolve({ ok: true, json: async () => ({ timeline: [] }) });
    await waitFor(() =>
      expect(screen.queryByTestId('timeline-skeleton')).toBeNull(),
    );
  });

  it('renders a friendly error with Retry, never the raw error text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }) as unknown as typeof fetch;

    render(<ActivityTimeline isCrossDeal />);

    const panel = await screen.findByTestId('timeline-error');
    expect(panel.textContent).toContain('Unable to load activity timeline.');
    // The old UI printed the raw message; it must not leak now.
    expect(panel.textContent).not.toContain('Timeline Load Error');
    expect(panel.textContent).not.toContain('500');
    expect(panel.textContent).not.toContain('Internal Server Error');
    expect(screen.getByTestId('timeline-retry')).toBeTruthy();
  });

  it('logs the real error to the console for debugging', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    }) as unknown as typeof fetch;

    render(<ActivityTimeline isCrossDeal />);
    await screen.findByTestId('timeline-error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logged = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(logged).toContain('[ActivityTimeline]');
    expect(logged).toContain('503');
  });

  it('Retry re-fetches and clears the error on success', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'boom' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ timeline: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ActivityTimeline isCrossDeal />);
    await screen.findByTestId('timeline-error');

    fireEvent.click(screen.getByTestId('timeline-retry'));

    await waitFor(() =>
      expect(screen.queryByTestId('timeline-error')).toBeNull(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces the retry panel when there is no authenticated user', async () => {
    mockUser = null;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ActivityTimeline isCrossDeal />);

    await screen.findByTestId('timeline-error');
    // No unauthenticated request should ever be made.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
