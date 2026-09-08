/**
 * Centralized client-side API fetch wrapper.
 * Provides credentials: 'include' by default and intercepts HTTP 401 responses
 * from DATA endpoints to clear stale auth and redirect to login with ?next=.
 */

let isRedirectingToLogin = false;

export function resetApiAuthRedirectState(): void {
  isRedirectingToLogin = false;
}

export function isRedirecting(): boolean {
  return isRedirectingToLogin;
}

export interface ApiFetchOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

/**
 * Executes a fetch request with credentials included and handles 401 responses.
 *
 * Rules:
 *  1. Always includes credentials: 'include'.
 *  2. On 401 from a DATA endpoint:
 *     - Clears stale client auth state.
 *     - Issues a single, debounced redirect to /login?next=<current path>.
 *     - Suppresses subsequent in-flight / queued cascade errors.
 *  3. Carve-outs:
 *     - Never intercepts or redirects on /api/auth/* calls (session check / login flow).
 *     - Never redirects if already on /login (avoids interfering with login form errors).
 *     - Honors init.skipAuthRedirect = true.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: ApiFetchOptions,
): Promise<Response> {
  const urlString =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  // Carve-out 1: /api/auth/* endpoints are used for session checks and credentials;
  // do not redirect on their 401 responses.
  const isAuthEndpoint = urlString.includes('/api/auth/');
  const skipAuthRedirect = init?.skipAuthRedirect || isAuthEndpoint;

  // If a 401 redirect is already in progress, suppress additional requests and avoid noise.
  if (!skipAuthRedirect && isRedirectingToLogin) {
    return new Response(JSON.stringify({ error: 'Unauthorized — redirecting to login' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let response: Response;
  try {
    response = await fetch(input, {
      credentials: 'include',
      ...init,
    });
  } catch (err: unknown) {
    // If the network error happened while redirecting, swallow cleanly
    if (!skipAuthRedirect && isRedirectingToLogin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw err;
  }

  if (response.status === 401 && !skipAuthRedirect && typeof window !== 'undefined') {
    const currentPathname = window.location.pathname;
    // Carve-out 2: Do not redirect if already on /login
    if (!currentPathname.startsWith('/login')) {
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true;
        try {
          // Clear any client-side cached tokens/markers
          window.sessionStorage?.removeItem('pw_auth_redirect');
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        } catch {
          // Non-fatal
        }
        const currentPath = window.location.pathname + window.location.search;
        const next = encodeURIComponent(currentPath);
        window.location.href = `/login?next=${next}`;
      }
    }
  }

  return response;
}
