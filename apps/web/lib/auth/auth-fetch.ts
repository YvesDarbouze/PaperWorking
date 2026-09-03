/**
 * Same-origin fetch for browser auth BFF routes on App Hosting / Next.
 * Auth traffic MUST NOT use NEXT_PUBLIC_API_URL or cross-origin Nest.
 */
const AUTH_PATH_PREFIX = '/api/auth';

export function authUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.startsWith(AUTH_PATH_PREFIX)) return normalized;
  throw new Error(`authUrl expects a path under ${AUTH_PATH_PREFIX}, got: ${path}`);
}

export type AuthFetchInit = RequestInit & {
  credentials?: RequestCredentials;
};

/** Relative fetch against apps/web /api/auth/* with session cookies. */
export async function authFetch(path: string, init: AuthFetchInit = {}): Promise<Response> {
  const url = authUrl(path);
  const { credentials = 'include', headers, ...rest } = init;
  return fetch(url, {
    ...rest,
    credentials,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  });
}

/** True when path targets a browser auth BFF route (same-origin on App Hosting). */
export function isAuthApiPath(path: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized === AUTH_PATH_PREFIX || normalized.startsWith(`${AUTH_PATH_PREFIX}/`);
}
