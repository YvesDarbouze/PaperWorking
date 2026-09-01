/**
 * Same-origin fetch for migrated Next BFF routes on App Hosting.
 * Does NOT use NEXT_PUBLIC_API_URL — targets relative /api/* on apps/web.
 */
export function bffUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith('/api') ? normalized : `/api${normalized}`;
}

export type BffFetchInit = RequestInit & {
  credentials?: RequestCredentials;
};

export async function bffFetch(path: string, init: BffFetchInit = {}): Promise<Response> {
  const { credentials = 'include', headers, ...rest } = init;
  return fetch(bffUrl(path), {
    ...rest,
    credentials,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  });
}

export async function bffJson<T = unknown>(path: string, init: BffFetchInit = {}): Promise<T> {
  const res = await bffFetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`BFF ${res.status} ${path}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** True when path is a migrated same-origin BFF route (GET list/detail only). */
export function isBffApiPath(path: string): boolean {
  const normalized = bffUrl(path);
  if (normalized === '/api/projects') return true;
  if (normalized === '/api/inbox') return true;
  if (/^\/api\/inbox\/[^/]+$/.test(normalized)) return true;
  if (normalized === '/api/portfolio/metrics') return true;
  if (normalized === '/api/team/members') return true;
  if (normalized === '/api/marketplace/profile') return true;
  return /^\/api\/projects\/[^/]+$/.test(normalized);
}
