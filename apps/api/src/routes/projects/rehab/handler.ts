import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  hasCrossTenantProjectAccess,
  mergeRehabData,
  validateRehabUpdateBody,
} from '../../../lib/projects/rehab.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;
export type LoadProjectRehabContextFn = (
  projectId: string,
  uid: string,
) => Promise<{
  exists: boolean;
  organizationId?: string;
  profile?: Record<string, unknown> | null;
  currentRehab?: Record<string, unknown>;
} | null>;
export type SaveProjectRehabFn = (
  projectId: string,
  rehab: Record<string, unknown>,
) => Promise<void>;

export interface ProjectsRehabPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  loadContext?: LoadProjectRehabContextFn;
  saveRehab?: SaveProjectRehabFn;
}

/**
 * POST /api/projects/rehab
 */
export async function handleProjectsRehabPost(
  body: Record<string, unknown>,
  deps: ProjectsRehabPostDeps = {},
): Promise<RouteResult> {
  const validated = validateRehabUpdateBody(body);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  if (!deps.verifyIdToken) return jsonResponse(500, { error: 'Auth not configured' });

  try {
    const decoded = await deps.verifyIdToken(String(body.idToken));
    const context = deps.loadContext
      ? await deps.loadContext(validated.projectId, decoded.uid)
      : { exists: true, organizationId: 'org-1', profile: {}, currentRehab: {} };

    if (!context?.exists) {
      return jsonResponse(404, { error: 'Deal not found.' });
    }

    if (!hasCrossTenantProjectAccess(context.profile, context.organizationId)) {
      return jsonResponse(403, { error: 'Cross-tenant access denied.' });
    }

    const merged = mergeRehabData(context.currentRehab, validated.updates);
    if (deps.saveRehab) await deps.saveRehab(validated.projectId, merged);

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/id-token-expired') {
      return jsonResponse(401, { error: 'Session expired.' });
    }
    console.error('[Rehab Module Update] Error:', error);
    return jsonResponse(500, {
      error: 'Failed to update rehab module.',
      details: err.message || 'Unknown error',
    });
  }
}
