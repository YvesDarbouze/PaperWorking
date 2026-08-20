import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  isAdminAuthFailure,
  type RequireAdminFn,
} from '../../../lib/auth/admin-types.js';
import {
  DEFAULT_CHECKLIST_DEFINITIONS,
  parseChecklistsDoc,
} from '../../../lib/providers/lender-checklists.js';

export interface LenderChecklistsDocument {
  Conventional?: string[];
  'SBA 504'?: string[];
  'Hard Money'?: string[];
  Bridge?: string[];
  updatedAt?: { toDate?: () => Date } | string | null;
  updatedByEmail?: string | null;
  [key: string]: unknown;
}

export type GetLenderChecklistsDocFn = () => Promise<LenderChecklistsDocument | null>;

export interface AdminLenderChecklistsGetDeps {
  requireAdmin?: RequireAdminFn;
  getConfigDoc?: GetLenderChecklistsDocFn;
}

function serializeUpdatedAt(value: LenderChecklistsDocument['updatedAt']): string | null {
  if (!value) return null;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return null;
}

/**
 * GET /api/admin/lender-checklists — migrated read path from PaperWorking.
 */
export async function handleAdminLenderChecklistsGet(
  deps: AdminLenderChecklistsGetDeps = {},
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
        checklists: DEFAULT_CHECKLIST_DEFINITIONS,
        updatedAt: null,
        updatedByEmail: null,
      });
    }

    return jsonResponse(200, {
      checklists: parseChecklistsDoc(snap),
      updatedAt: serializeUpdatedAt(snap.updatedAt ?? null),
      updatedByEmail: snap.updatedByEmail ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[LenderChecklists GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch lender checklists' });
  }
}
