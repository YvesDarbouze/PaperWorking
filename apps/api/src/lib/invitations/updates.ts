import { validateInvitationTokenFormat } from './guest-portal.js';

export interface RawDealUpdate {
  title?: string | null;
  body?: string;
  authorName?: string;
  createdAt?: { toDate?: () => Date } | string | null;
}

export function validateUpdatesToken(
  token: string,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!validateInvitationTokenFormat(token)) {
    return { ok: false, error: 'Invalid token format', status: 400 };
  }
  return { ok: true };
}

export function formatDealUpdateRow(id: string, data: RawDealUpdate): {
  id: string;
  title: string | null;
  body: string | undefined;
  authorName: string | undefined;
  createdAt: string | null;
} {
  let createdAt: string | null = null;
  if (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt && data.createdAt.toDate) {
    createdAt = data.createdAt.toDate().toISOString();
  } else if (typeof data.createdAt === 'string') {
    createdAt = data.createdAt;
  }

  return {
    id,
    title: data.title ?? null,
    body: data.body,
    authorName: data.authorName,
    createdAt,
  };
}
