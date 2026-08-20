import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  isAdminAuthFailure,
  type RequireAdminFn,
} from '../../../lib/auth/admin-types.js';
import { DEFAULT_RATES, parseRatesDoc } from '../../../lib/providers/lender-rates.js';

export interface LenderRatesDocument {
  rates: Record<string, unknown>[];
  updatedAt?: { toDate?: () => Date } | string | null;
  updatedByEmail?: string | null;
}

export type GetLenderRatesDocFn = () => Promise<LenderRatesDocument | null>;

export interface AdminLenderRatesGetDeps {
  requireAdmin?: RequireAdminFn;
  getConfigDoc?: GetLenderRatesDocFn;
}

function serializeUpdatedAt(value: LenderRatesDocument['updatedAt']): string | null {
  if (!value) return null;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return null;
}

/**
 * GET /api/admin/lender-rates — migrated read path from PaperWorking.
 */
export async function handleAdminLenderRatesGet(
  deps: AdminLenderRatesGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAdmin) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const auth = await deps.requireAdmin();
    if (isAdminAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const snap = deps.getConfigDoc ? await deps.getConfigDoc() : null;
    if (!snap) {
      return jsonResponse(200, {
        rates: DEFAULT_RATES.map((r) => ({ ...r, asOf: null })),
        updatedAt: null,
        updatedByEmail: null,
      });
    }

    const rates = parseRatesDoc(snap as unknown as Record<string, unknown>).map((r) => ({
      ...r,
      asOf: r.asOf.getTime() === 0 ? null : r.asOf.toISOString(),
    }));

    return jsonResponse(200, {
      rates,
      updatedAt: serializeUpdatedAt(snap.updatedAt ?? null),
      updatedByEmail: snap.updatedByEmail ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[LenderRates GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch lender rates' });
  }
}
