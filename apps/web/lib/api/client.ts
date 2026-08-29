/**
 * Central backend API client — always targets Nest (Cloud Run / local).
 * Never hardcode production hosts; use NEXT_PUBLIC_API_URL.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  // Local Nest: match the browser host so LAN dev (e.g. 192.168.x.x:3000) hits :8080 on same host.
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    return `http://${window.location.hostname}:8080`;
  }
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:8080';
  throw new Error('NEXT_PUBLIC_API_URL is required in production');
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p.startsWith('/api') ? p : `/api${p}`}`;
}

export type ApiFetchInit = RequestInit & {
  /** When true (default), include cookies for Nest httpOnly session auth */
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
