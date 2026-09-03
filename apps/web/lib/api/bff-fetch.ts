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
      ...(rest.body && !(rest.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
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

/** True when path is a migrated same-origin BFF route (reads + core writes). */
export function isBffApiPath(path: string): boolean {
  const normalized = bffUrl(path).split('?')[0] ?? bffUrl(path);
  if (normalized === '/api/projects') return true;
  if (normalized === '/api/inbox') return true;
  if (/^\/api\/inbox\/[^/]+$/.test(normalized)) return true;
  if (normalized === '/api/portfolio/metrics') return true;
  if (normalized === '/api/team/members') return true;
  if (normalized === '/api/team/invites') return true;
  if (normalized === '/api/team/invite') return true;
  if (/^\/api\/team\/members\/[^/]+$/.test(normalized)) return true;
  if (/^\/api\/projects\/[^/]+\/kpis\/current$/.test(normalized)) return true;
  if (normalized === '/api/marketplace/profile') return true;
  if (normalized === '/api/marketplace/investors') return true;
  if (normalized === '/api/marketplace/investors/follow') return true;
  if (normalized === '/api/marketplace/listings') return true;
  if (/^\/api\/marketplace\/investors\/(?!follow$)[^/]+$/.test(normalized)) return true;
  if (normalized === '/api/vendors') return true;
  if (normalized === '/api/vendor-portal/profile') return true;
  if (normalized === '/api/vendor-portal/requests') return true;
  if (normalized === '/api/deals') return true;
  if (normalized === '/api/deals/exists') return true;
  if (normalized === '/api/deals/broadcast') return true;
  if (normalized === '/api/deals/reply') return true;
  if (/^\/api\/projects\/[^/]+\/documents(\/[^/]+)?$/.test(normalized)) return true;
  if (normalized === '/api/billing') return true;
  if (normalized === '/api/billing/cancel') return true;
  if (normalized === '/api/stripe/checkout') return true;
  if (normalized === '/api/stripe/portal') return true;
  if (normalized === '/api/stripe/session-status') return true;
  if (normalized === '/api/reports/portfolio') return true;
  if (normalized === '/api/reports/generate') return true;
  if (/^\/api\/reports\/(?!portfolio$|generate$)[^/]+$/.test(normalized)) return true;
  if (normalized === '/api/settings/profile') return true;
  if (normalized === '/api/insights') return true;
  if (normalized === '/api/admin/ops') return true;
  if (normalized === '/api/admin/rentcast-usage') return true;
  if (normalized === '/api/admin/lender-rates') return true;
  if (normalized === '/api/admin/lender-checklists') return true;
  if (normalized === '/api/admin/agent-crew') return true;
  if (/^\/api\/admin\/agent-crew\/[^/]+$/.test(normalized)) return true;
  if (/^\/api\/admin\/agent-crew\/[^/]+\/impersonate$/.test(normalized)) return true;
  return /^\/api\/projects\/[^/]+$/.test(normalized);
}
