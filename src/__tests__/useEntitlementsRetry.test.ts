/** @jest-environment jsdom */
/**
 * Regression coverage for the useEntitlements 401-retry fix.
 *
 * Before: a single fetch with a possibly-stale cached ID token. Right after
 * login/navigation the cached token can be seconds from expiry; the server
 * rejects it with 401 and the hook silently gave up, leaving `projectCount`
 * null forever (which happens to fail open in canCreateProject, but the
 * count itself never recovers without a full reload).
 *
 * After: on a 401, the hook retries once with `getIdToken(true)` (forced
 * refresh) before giving up.
 */
import { renderHook, waitFor } from '@testing-library/react';

const mockGetIdToken = jest.fn();
let mockUser: any = { uid: 'u1', getIdToken: (...args: any[]) => mockGetIdToken(...args) };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, profile: { subscriptionPlan: 'Individual', subscriptionStatus: 'active' } }),
}));

import { useEntitlements } from '@/hooks/useEntitlements';

describe('useEntitlements — project count fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'u1', getIdToken: (...args: any[]) => mockGetIdToken(...args) };
    global.fetch = jest.fn();
  });

  it('retries once with a forced token refresh when the first attempt 401s, and recovers the count', async () => {
    mockGetIdToken
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('fresh-token');

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ count: 3 }) });

    const { result } = renderHook(() => useEntitlements());

    await waitFor(() => expect(result.current.projectCount).toBe(3));

    expect(mockGetIdToken).toHaveBeenNthCalledWith(1, false);
    expect(mockGetIdToken).toHaveBeenNthCalledWith(2, true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the first attempt already succeeds', async () => {
    mockGetIdToken.mockResolvedValueOnce('good-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ count: 7 }) });

    const { result } = renderHook(() => useEntitlements());

    await waitFor(() => expect(result.current.projectCount).toBe(7));
    expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up gracefully (no crash) if the retry also 401s', async () => {
    mockGetIdToken.mockResolvedValue('still-bad');
    (global.fetch as jest.Mock).mockResolvedValue({ status: 401, ok: false });

    const { result } = renderHook(() => useEntitlements());

    await waitFor(() => expect(result.current.projectCountLoading).toBe(false));
    expect(result.current.projectCount).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
