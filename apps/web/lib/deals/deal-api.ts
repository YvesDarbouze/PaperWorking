import { bffFetch } from '@/lib/api/bff-fetch';

export type DealApiRecord = {
  id: string;
  slug: string;
  address: string;
  purchasePrice?: unknown;
  rehabCost?: unknown;
  arv?: unknown;
  holdingCosts?: unknown;
  projectedRoi?: unknown;
  status?: string;
  visibility?: string;
  creatorId?: string;
  [key: string]: unknown;
};

export type CreateDealPayload = {
  address: string;
  slug?: string;
  purchasePrice?: number;
  rehabCost?: number;
  arv?: number;
  holdingCosts?: number;
  projectedRoi?: number;
  projectedMonthlyRent?: number;
  status?: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  projectId?: string;
  id?: string;
};

type JsonRecord = Record<string, unknown>;

/** Undo encodeURIComponent so comma-containing slugs survive Next params + fetch. */
export function decodeDealSlugParam(slug: string): string {
  let current = slug.trim();
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

/** Match server slugifyDealSlug — letters and digits only. */
export function slugifyDealSlug(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
  return base || `deal${Date.now().toString(36)}`;
}

async function parseDealMutationResponse<T extends JsonRecord>(res: Response): Promise<T> {
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
    if (res.status === 401) throw new Error('Unauthorized — sign in again.');
    if (res.status === 403) throw new Error(err || 'Forbidden — insufficient permissions.');
    throw new Error(err);
  }

  return data as T;
}

/** GET /api/deals via same-origin BFF (Phase B10). */
export async function listDealsFromBff(input: {
  tab?: string;
  q?: string;
} = {}): Promise<{ success: true; total: number; deals: DealApiRecord[] }> {
  const params = new URLSearchParams();
  if (input.tab) params.set('tab', input.tab);
  if (input.q) params.set('q', input.q);
  const qs = params.toString();
  const res = await bffFetch(`/api/deals${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseDealMutationResponse(res);
}

/** GET /api/deals/exists via same-origin BFF (Phase B10). */
export async function checkDealExistsFromBff(slug: string): Promise<{
  exists: boolean;
  deal: DealApiRecord | null;
}> {
  const res = await bffFetch(`/api/deals/exists?slug=${encodeURIComponent(decodeDealSlugParam(slug))}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseDealMutationResponse(res);
}

/** POST /api/deals via same-origin BFF (Phase B10). */
export async function createDealFromBff(payload: CreateDealPayload): Promise<DealApiRecord> {
  const res = await bffFetch('/api/deals', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseDealMutationResponse<{ success: true; deal: DealApiRecord }>(res);
  return data.deal;
}

export type DealBroadcastPayload = {
  dealId: string;
  recipientEmails: string[];
  subject?: string;
  message?: string;
  includeBusinessCard?: boolean;
};

/** POST /api/deals/broadcast via same-origin BFF (Phase B13). */
export async function broadcastDealFromBff(payload: DealBroadcastPayload) {
  const res = await bffFetch('/api/deals/broadcast', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseDealMutationResponse<{
    success: true;
    dispatchedCount: number;
    invitationCount?: number;
    deliveryStatus?: 'not_configured' | 'sent' | 'partial';
    recipientLinks?: Array<{ email: string; token: string; externalUrl: string; invitationId: string }>;
    broadcast?: JsonRecord;
  }>(res);
}

export type DealReplyPayload = {
  dealId: string;
  content: string;
  senderEmail: string;
  token?: string;
};

/** POST /api/deals/reply via same-origin BFF (Phase B13). */
export async function replyToDealFromBff(payload: DealReplyPayload, init: RequestInit = {}) {
  const res = await bffFetch('/api/deals/reply', {
    method: 'POST',
    credentials: init.credentials ?? 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: JSON.stringify(payload),
  });
  return parseDealMutationResponse<{ success: true; message?: JsonRecord }>(res);
}

export type UpdateDealPayload = {
  purchasePrice?: number;
  rehabCost?: number;
  arv?: number;
  holdingCosts?: number;
  projectedRoi?: number;
  projectedMonthlyRent?: number;
  status?: CreateDealPayload['status'];
  visibility?: CreateDealPayload['visibility'];
  projectId?: string;
};

/** GET /api/deals/:slug via same-origin BFF. */
export async function getDealBySlugFromBff(slug: string): Promise<DealApiRecord> {
  const decoded = decodeDealSlugParam(slug);
  // Prefer canonical stored form; server also accepts hyphenated client slugs.
  const lookup = slugifyDealSlug(decoded) || decoded;
  const res = await bffFetch(`/api/deals/${encodeURIComponent(lookup)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await parseDealMutationResponse<{ success: true; deal: DealApiRecord }>(res);
  return data.deal;
}

/** PATCH /api/deals/:slug via same-origin BFF. */
export async function updateDealFromBff(
  slug: string,
  payload: UpdateDealPayload,
): Promise<DealApiRecord> {
  const decoded = decodeDealSlugParam(slug);
  const lookup = slugifyDealSlug(decoded) || decoded;
  const res = await bffFetch(`/api/deals/${encodeURIComponent(lookup)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseDealMutationResponse<{ success: true; deal: DealApiRecord }>(res);
  return data.deal;
}
