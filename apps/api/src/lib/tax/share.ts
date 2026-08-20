export const TAX_SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function validateTaxShareCreateBody(body: {
  taxYear?: unknown;
  projectIds?: unknown;
}): { ok: true; taxYear: number; projectIds: string[] } | { ok: false; error: string; status: number } {
  const taxYear = body.taxYear;
  if (typeof taxYear !== 'number' || Number.isNaN(taxYear)) {
    return { ok: false, error: 'Valid taxYear is required', status: 400 };
  }
  if (!Array.isArray(body.projectIds) || body.projectIds.length === 0) {
    return { ok: false, error: 'At least one projectId is required', status: 400 };
  }
  const projectIds = body.projectIds.filter((id): id is string => typeof id === 'string');
  if (projectIds.length === 0) {
    return { ok: false, error: 'At least one projectId is required', status: 400 };
  }
  return { ok: true, taxYear, projectIds };
}

export function buildTaxShareRecord(input: {
  token: string;
  userId: string;
  organizationId: string;
  taxYear: number;
  projectIds: string[];
}): Record<string, unknown> {
  const expiresAt = new Date(Date.now() + TAX_SHARE_TTL_MS);
  return {
    id: input.token,
    userId: input.userId,
    organizationId: input.organizationId,
    taxYear: input.taxYear,
    projectIds: input.projectIds,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    revoked: false,
  };
}

export function validateTaxShareAccess(share: {
  revoked?: boolean;
  expiresAt?: string | Date;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (share.revoked) {
    return { ok: false, error: 'This share link has been revoked', status: 403 };
  }
  const expiresAt = share.expiresAt instanceof Date ? share.expiresAt : new Date(String(share.expiresAt));
  if (new Date() > expiresAt) {
    return { ok: false, error: 'This share link has expired', status: 403 };
  }
  return { ok: true };
}

export function serializeTaxShareListItem(data: Record<string, unknown>): Record<string, unknown> {
  const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : new Date(String(data.expiresAt));
  return {
    ...data,
    isExpired: new Date() > expiresAt,
  };
}
