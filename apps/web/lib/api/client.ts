/**
 * Central backend API client — always targets Nest (Cloud Run / local).
 * Never hardcode production hosts; use NEXT_PUBLIC_API_URL.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  // Local Nest default when FE runs on :3000 without env override
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:8080';
  throw new Error('NEXT_PUBLIC_API_URL is required in production');
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p.startsWith('/api') ? p : `/api${p}`}`;
}

export type ApiFetchInit = RequestInit & {
  /** When true (default), include cookies for Firebase session auth */
  credentials?: RequestCredentials;
};

/**
 * fetch() against Nest API with credentials for session cookies.
 */
export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { credentials = 'include', headers, ...rest } = init;
  return fetch(apiUrl(path), {
    ...rest,
    credentials,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  });
}

export async function apiJson<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}
