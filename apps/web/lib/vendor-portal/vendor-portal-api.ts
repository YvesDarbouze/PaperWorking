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

/** GET /api/vendor-portal/profile via same-origin BFF (Phase B11). */
export async function getVendorPortalProfileFromBff() {
  const res = await bffFetch('/api/vendor-portal/profile', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson<{ profile?: JsonRecord }>(res);
}

/** GET /api/vendor-portal/requests via same-origin BFF (Phase B11). */
export async function listVendorPortalRequestsFromBff() {
  const res = await bffFetch('/api/vendor-portal/requests', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson<{ success?: boolean; requests?: JsonRecord[] }>(res);
}

/** PUT /api/vendor-portal/profile via same-origin BFF (Phase B12). */
export async function updateVendorPortalProfileFromBff(body: JsonRecord) {
  const res = await bffFetch('/api/vendor-portal/profile', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson<{ success?: boolean; profile?: JsonRecord; error?: string }>(res);
}

/** PUT /api/vendor-portal/requests via same-origin BFF (Phase B12). */
export async function updateVendorPortalRequestFromBff(body: JsonRecord) {
  const res = await bffFetch('/api/vendor-portal/requests', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson<{ success?: boolean; request?: JsonRecord; error?: string }>(res);
}
