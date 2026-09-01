import { bffFetch } from '@/lib/api/bff-fetch';

type JsonRecord = Record<string, unknown>;

async function parseJson<T extends JsonRecord>(res: Response): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!res.ok) {
    const err =
      data && typeof data === 'object' && 'error' in data
        ? String((data as JsonRecord).error)
        : res.statusText || `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

/** GET /api/marketplace/investors via same-origin BFF (Phase B11). */
export async function listMarketplaceInvestorsFromBff(q?: string) {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const res = await bffFetch(`/api/marketplace/investors${qs}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson<{
    success: true;
    investors: JsonRecord[];
    profiles: JsonRecord[];
    following: string[];
  }>(res);
}

/** GET /api/marketplace/investors/:id via same-origin BFF (Phase B11). */
export async function getMarketplaceInvestorFromBff(id: string) {
  const res = await bffFetch(`/api/marketplace/investors/${encodeURIComponent(id)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson<JsonRecord>(res);
}

/** GET /api/marketplace/listings via same-origin BFF (Phase B11). */
export async function listMarketplaceListingsFromBff() {
  const res = await bffFetch('/api/marketplace/listings', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson<{ success: true; listings: JsonRecord[]; count: number }>(res);
}

/** GET /api/vendors via same-origin BFF (Phase B11). */
export async function listVendorsFromBff(params: URLSearchParams) {
  const qs = params.toString();
  const res = await bffFetch(`/api/vendors${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson<{ success: true; vendors: JsonRecord[] }>(res);
}

/** POST /api/marketplace/investors/follow via same-origin BFF (Phase B12). */
export async function setMarketplaceInvestorFollowFromBff(input: {
  targetUid: string;
  follow: boolean;
}) {
  const res = await bffFetch('/api/marketplace/investors/follow', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<{ success?: boolean; following?: boolean; changed?: boolean }>(res);
}
