import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { authFetch, authUrl, isAuthApiPath } from '../../lib/auth/auth-fetch.js';
import {
  destroySession,
  fetchSessionProfile,
} from '../../lib/auth/session-client.js';
import { syncNestSession as syncFirebaseSession } from '../../lib/firebase/auth-client.js';

describe('same-origin auth transport — authUrl / authFetch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () => new Response('{}', { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('authUrl keeps /api/auth paths relative', () => {
    expect(authUrl('/api/auth/session')).toBe('/api/auth/session');
    expect(authUrl('/api/auth/me')).toBe('/api/auth/me');
    expect(authUrl('/api/auth/sessions')).toBe('/api/auth/sessions');
  });

  it('isAuthApiPath recognizes auth BFF routes', () => {
    expect(isAuthApiPath('/api/auth/me')).toBe(true);
    expect(isAuthApiPath('/api/projects')).toBe(false);
  });

  it('authFetch does not read NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await authFetch('/api/auth/me', { credentials: 'include' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    );
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain('run.app');
    expect(calledUrl).not.toContain('NEXT_PUBLIC');
  });
});

describe('same-origin auth transport — session client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/auth/me')) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            accountType: 'investor',
            subscriptionPlan: 'Individual',
            subscriptionStatus: 'active',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/api/auth/session') && init?.method === 'DELETE') {
        return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('fetchSessionProfile calls same-origin GET /api/auth/me', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    const profile = await fetchSessionProfile();
    expect(profile.authenticated).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('destroySession calls same-origin DELETE /api/auth/session', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    const ok = await destroySession();
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
  });
});

describe('same-origin auth transport — Firebase session sync', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ status: 'success', uid: 'firebase-uid-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('Firebase syncNestSession POSTs to same-origin /api/auth/session', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await syncFirebaseSession('firebase-id-token', 'investor');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { idToken?: string };
    expect(body.idToken).toBe('firebase-id-token');
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain('run.app');
  });

  it('Firebase logout DELETEs same-origin /api/auth/session', async () => {
    await syncFirebaseSession(null);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('same-origin auth transport — Next session contract', () => {
  it('accepts Next POST /api/auth/session success body shape', async () => {
    const body = { status: 'success', uid: 'uid-1' };
    expect(body.status).toBe('success');
    expect(body.uid).toBeTruthy();
  });
});
