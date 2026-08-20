import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildPhasePatchUpdate,
  filterPurchaseFinancingFields,
  PURCHASE_FINANCING_FIELDS,
} from '../../../lib/projects/phases.js';
import {
  buildExitRealizedPayload,
  mergeHoldRegistryUpdate,
  validateExitStatus,
} from '../../../lib/projects/hold-registry.js';

export type VerifyProjectWriteAccessFn = (
  projectId: string,
  uid: string,
  email?: string | null,
) => Promise<{
  authorized: boolean;
  project: Record<string, unknown>;
  role?: string;
} | null>;

export type AuthorizePhaseMutationFn = (
  access: { role?: string; partyId?: string },
  phase: string,
) => { authorized: boolean; error?: string; status?: number };

export type UpdateProjectFn = (
  projectId: string,
  update: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export interface ProjectPhasePatchDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyProjectWriteAccessFn;
  authorizeMutation?: AuthorizePhaseMutationFn;
  updateProject?: UpdateProjectFn;
}

function missingProjectId(): RouteResult {
  return jsonResponse(400, { error: 'Missing project ID' });
}

/**
 * PATCH /api/projects/[id]/acquisition
 */
export async function handleProjectsAcquisitionPatch(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectPhasePatchDeps = {},
): Promise<RouteResult> {
  if (!projectId) return missingProjectId();
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    if (deps.authorizeMutation) {
      const gate = deps.authorizeMutation(access, 'phase-1');
      if (!gate.authorized) return jsonResponse(gate.status || 403, { error: gate.error });
    }

    const { financials, ...topLevelUpdates } = body;
    const existingFinancials = (access.project.financials as Record<string, unknown> | undefined) || {};
    const updatePayload = buildPhasePatchUpdate({
      existingFinancials,
      financials: financials as Record<string, unknown> | undefined,
      topLevelUpdates: topLevelUpdates as Record<string, unknown>,
    });

    const updated = deps.updateProject
      ? await deps.updateProject(projectId, updatePayload)
      : { id: projectId, ...updatePayload };
    return jsonResponse(200, { success: true, project: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Acquisition PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update acquisition data', details: message });
  }
}

/**
 * PATCH /api/projects/[id]/purchase
 */
export async function handleProjectsPurchasePatch(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectPhasePatchDeps = {},
): Promise<RouteResult> {
  if (!projectId) return missingProjectId();
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Access denied. You do not have write access to this project.' });
    }

    const { financials, ...topLevelUpdates } = body;
    if (financials && typeof financials === 'object') {
      const invalidFields = Object.keys(financials as Record<string, unknown>).filter(
        (key) => !PURCHASE_FINANCING_FIELDS.has(key),
      );
      if (invalidFields.length > 0) {
        return jsonResponse(400, {
          error: 'Invalid fields for Phase 2 purchase update',
          invalidFields,
        });
      }
    }

    const existingFinancials = (access.project.financials as Record<string, unknown> | undefined) || {};
    const updatePayload = buildPhasePatchUpdate({
      existingFinancials,
      financials: financials
        ? filterPurchaseFinancingFields(financials as Record<string, unknown>)
        : undefined,
      topLevelUpdates: topLevelUpdates as Record<string, unknown>,
    });

    const updated = deps.updateProject
      ? await deps.updateProject(projectId, updatePayload)
      : { id: projectId, ...updatePayload };
    return jsonResponse(200, { success: true, project: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Purchase PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update purchase data', details: message });
  }
}

/**
 * PATCH /api/projects/[id]/hold
 */
export async function handleProjectsHoldPatch(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectPhasePatchDeps = {},
): Promise<RouteResult> {
  if (!projectId) return missingProjectId();
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Access denied. You do not have write access to this project.' });
    }

    const { financials, holdingCosts, rehabExpenses, rehab, ...topLevelUpdates } = body;
    const existingFinancials = (access.project.financials as Record<string, unknown> | undefined) || {};
    const existingRehab = (access.project.rehab as Record<string, unknown> | undefined) || {};
    const updatePayload = buildPhasePatchUpdate({
      existingFinancials,
      financials: financials as Record<string, unknown> | undefined,
      topLevelUpdates: topLevelUpdates as Record<string, unknown>,
      rehab: rehab as Record<string, unknown> | undefined,
      existingRehab,
      holdingCosts,
      rehabExpenses,
    });

    const updated = deps.updateProject
      ? await deps.updateProject(projectId, updatePayload)
      : { id: projectId, ...updatePayload };
    return jsonResponse(200, { success: true, project: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Hold PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update hold/operations data', details: message });
  }
}

export type ValidateHoldRegistryFn = (
  body: Record<string, unknown>,
) => { ok: true; data: Record<string, unknown> } | { ok: false; details: unknown };

/**
 * GET /api/projects/[id]/hold/registry
 */
export async function handleProjectsHoldRegistryGet(
  projectId: string,
  deps: ProjectPhasePatchDeps = {},
): Promise<RouteResult> {
  if (!projectId) return missingProjectId();
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const access = deps.verifyAccess
    ? await deps.verifyAccess(projectId, auth.uid, auth.email)
    : { authorized: true, project: {} };
  if (!access?.authorized) return jsonResponse(403, { error: 'Access denied.' });

  const holdRegistry = (access.project.holdRegistry as Record<string, unknown> | undefined) || null;
  return jsonResponse(200, { success: true, holdRegistry });
}

/**
 * PATCH /api/projects/[id]/hold/registry
 */
export async function handleProjectsHoldRegistryPatch(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectPhasePatchDeps & { validateRegistry?: ValidateHoldRegistryFn } = {},
): Promise<RouteResult> {
  if (!projectId) return missingProjectId();
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Access denied. You do not have write access to this project.' });
    }

    const validated = deps.validateRegistry
      ? deps.validateRegistry(body)
      : { ok: true as const, data: body };
    if (!validated.ok) {
      return jsonResponse(400, {
        error: 'Hold registry validation failed — canonical schema enforced',
        details: validated.details,
      });
    }

    const existingRegistry = (access.project.holdRegistry as Record<string, unknown> | undefined) || {};
    const holdRegistry = mergeHoldRegistryUpdate(existingRegistry, validated.data);
    const updated = deps.updateProject
      ? await deps.updateProject(projectId, { holdRegistry, updatedAt: new Date().toISOString() })
      : { holdRegistry };

    return jsonResponse(200, {
      success: true,
      holdRegistry: (updated as Record<string, unknown>).holdRegistry || holdRegistry,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Hold Registry PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update Hold registry', details: message });
  }
}

/**
 * PATCH /api/projects/[id]/exit
 */
export async function handleProjectsExitPatch(
  projectId: string,
  body: Record<string, unknown>,
  deps: ProjectPhasePatchDeps = {},
): Promise<RouteResult> {
  if (!projectId) return missingProjectId();
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const access = deps.verifyAccess
      ? await deps.verifyAccess(projectId, auth.uid, auth.email)
      : { authorized: true, project: {} };
    if (!access?.authorized) {
      return jsonResponse(403, { error: 'Project not found or access denied' });
    }

    if (deps.authorizeMutation) {
      const gate = deps.authorizeMutation(access, 'phase-4');
      if (!gate.authorized) return jsonResponse(gate.status || 403, { error: gate.error });
    }

    if (access.project.locked) {
      return jsonResponse(409, { error: 'Project is archived and locked. No modifications allowed.' });
    }

    const { financials, realized, ...topLevelUpdates } = body;
    if (topLevelUpdates.status && typeof topLevelUpdates.status === 'string') {
      const statusCheck = validateExitStatus(topLevelUpdates.status);
      if (!statusCheck.ok) return jsonResponse(400, { error: statusCheck.error });
    }

    const existingFinancials = (access.project.financials as Record<string, unknown> | undefined) || {};
    let updatePayload: Record<string, unknown>;

    if (realized === true) {
      updatePayload = buildExitRealizedPayload({
        existingFinancials,
        financials: financials as Record<string, unknown> | undefined,
        topLevelUpdates: topLevelUpdates as Record<string, unknown>,
      });
    } else {
      updatePayload = buildPhasePatchUpdate({
        existingFinancials,
        financials: financials as Record<string, unknown> | undefined,
        topLevelUpdates: topLevelUpdates as Record<string, unknown>,
      });
    }

    const updated = deps.updateProject
      ? await deps.updateProject(projectId, updatePayload)
      : { id: projectId, ...updatePayload };
    return jsonResponse(200, { success: true, realized: realized === true, project: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Exit PATCH]', message);
    return jsonResponse(500, { error: 'Failed to update exit data', details: message });
  }
}
