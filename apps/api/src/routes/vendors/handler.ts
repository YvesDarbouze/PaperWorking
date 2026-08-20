import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  filterVendorsBySearch,
  type VendorRecord,
} from '../../lib/vendors/filter.js';

export type GetVendorByIdFn = (id: string) => Promise<VendorRecord | null>;
export type ListVendorsFn = (filters: {
  stateCode: string | null;
  type: string | null;
}) => Promise<VendorRecord[]>;

export interface VendorsGetQuery {
  state?: string | null;
  type?: string | null;
  search?: string | null;
  query?: string | null;
  location?: string | null;
  city?: string | null;
  zip?: string | null;
  id?: string | null;
}

export interface VendorsGetDeps {
  requireAuth?: RequireAuthFn;
  getVendorById?: GetVendorByIdFn;
  listVendors?: ListVendorsFn;
}

function resolveSearchQuery(query: VendorsGetQuery): string {
  return (
    query.search ||
    query.query ||
    query.location ||
    query.city ||
    query.zip ||
    ''
  ).trim();
}

/**
 * GET /api/vendors — authenticated vendor directory search.
 */
export async function handleVendorsGet(
  query: VendorsGetQuery,
  deps: VendorsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const id = query.id;
  if (id) {
    try {
      const vendor = deps.getVendorById ? await deps.getVendorById(id) : null;
      return jsonResponse(200, {
        success: true,
        vendors: vendor ? [vendor] : [],
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Vendor query failed:', message);
      return jsonResponse(500, { error: 'Failed to query vendors' });
    }
  }

  try {
    const stateCode = query.state ?? null;
    const type = query.type ?? null;
    let vendors = deps.listVendors
      ? await deps.listVendors({ stateCode, type })
      : [];

    const rawSearch = resolveSearchQuery(query);
    if (rawSearch) {
      vendors = filterVendorsBySearch(vendors, rawSearch);
    }

    return jsonResponse(200, { success: true, vendors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Vendor query failed:', message);
    return jsonResponse(500, { error: 'Failed to query vendors' });
  }
}
