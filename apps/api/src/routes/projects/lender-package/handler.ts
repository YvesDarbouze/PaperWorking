import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildCustomLenderPackageItem,
  buildCustomaryChecklistNames,
  buildSeededLenderPackageItems,
  resolveActiveLoanInstruments,
  validateLenderPackageAccess,
  validateLenderPackageCreateBody,
} from '../../../lib/projects/lender-package.js';

export type VerifyLenderPackageAccessFn = (
  projectId: string,
  uid: string,
  email?: string | null,
) => Promise<{
  authorized: boolean;
  role: string;
  partyId?: string;
  project: Record<string, unknown>;
} | null>;

export type ListLenderPackageItemsFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;
export type SeedLenderPackageItemsFn = (
  projectId: string,
  items: Array<Record<string, unknown>>,
) => Promise<Array<Record<string, unknown>>>;
export type CreateLenderPackageItemFn = (
  projectId: string,
  item: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type ResolveLenderPackageSeedContextFn = (projectId: string) => Promise<{
  loanInstruments: string[];
  financingType?: string;
  checklistNames: string[];
}>;

export interface ProjectsLenderPackageGetDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyLenderPackageAccessFn;
  listItems?: ListLenderPackageItemsFn;
  seedItems?: SeedLenderPackageItemsFn;
  resolveSeedContext?: ResolveLenderPackageSeedContextFn;
}

export interface ProjectsLenderPackagePostDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyLenderPackageAccessFn;
  createItem?: CreateLenderPackageItemFn;
}

/**
 * GET /api/projects/[id]/lender-package
 */
export async function handleProjectsLenderPackageGet(
  projectId: string,
  deps: ProjectsLenderPackageGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, role: 'Lead Investor', project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    const gate = validateLenderPackageAccess({ role: access.role, partyId: access.partyId });
    if (!gate.ok) return jsonResponse(gate.status, { error: gate.error });

    const existing = deps.listItems ? await deps.listItems(projectId) : [];
    if (existing.length > 0) {
      return jsonResponse(200, { items: existing });
    }

    const seedContext = deps.resolveSeedContext
      ? await deps.resolveSeedContext(projectId)
      : {
          loanInstruments: [],
          financingType: String((access.project.financials as Record<string, unknown> | undefined)?.financingType || ''),
          checklistNames: [],
        };

    const activeInstruments = resolveActiveLoanInstruments({
      loanInstruments: seedContext.loanInstruments,
      financingType: seedContext.financingType,
    });
    if (activeInstruments.length === 0) {
      return jsonResponse(200, { items: [] });
    }

    const names =
      seedContext.checklistNames.length > 0
        ? seedContext.checklistNames
        : buildCustomaryChecklistNames(activeInstruments);
    const seeded = buildSeededLenderPackageItems({
      projectId,
      names,
      createId: () => crypto.randomUUID(),
    });
    const items = deps.seedItems ? await deps.seedItems(projectId, seeded) : seeded;
    return jsonResponse(200, { items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Lender Package GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch lender package checklist' });
  }
}

/**
 * POST /api/projects/[id]/lender-package
 */
export async function handleProjectsLenderPackagePost(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectsLenderPackagePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, role: 'Lead Investor', project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }
    if (access.role !== 'Lead Investor') {
      return jsonResponse(403, {
        error: 'Forbidden: only Lead Investors can add custom checklist items',
      });
    }

    const validated = validateLenderPackageCreateBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const item = buildCustomLenderPackageItem({
      projectId,
      id: crypto.randomUUID(),
      name: validated.name,
      reminderCadence: validated.reminderCadence,
    });
    const saved = deps.createItem ? await deps.createItem(projectId, item) : item;
    return jsonResponse(201, { item: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Lender Package POST]', message);
    return jsonResponse(500, { error: 'Failed to add checklist item' });
  }
}
