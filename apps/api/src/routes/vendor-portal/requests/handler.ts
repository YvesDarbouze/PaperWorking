import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  enrichVendorPortalRequests,
  validateVendorPortalQuoteBody,
} from '../../../lib/vendors/portal.js';

export type ListVendorPortalRequestsFn = (vendorUid: string) => Promise<Array<Record<string, unknown>>>;
export type LoadProjectsMapFn = (projectIds: string[]) => Promise<Record<string, Record<string, unknown>>>;
export type UpdateVendorPortalRequestFn = (input: {
  vendorUid: string;
  requestId: string;
  projectId: string;
  targetStatus: 'QUOTED' | 'DECLINED';
  quotedFee?: number;
  message?: string;
  actorName?: string;
  actorEmail?: string;
}) => Promise<void>;

/**
 * GET /api/vendor-portal/requests
 */
export async function handleVendorPortalRequestsGet(
  deps: { requireAuth?: RequireAuthFn; listRequests?: ListVendorPortalRequestsFn; loadProjects?: LoadProjectsMapFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const requests = deps.listRequests ? await deps.listRequests(auth.uid) : [];
    const projectIds = Array.from(new Set(requests.map((r) => String(r.projectId)).filter(Boolean)));
    const projectsMap = deps.loadProjects ? await deps.loadProjects(projectIds) : {};
    const enriched = enrichVendorPortalRequests(requests, projectsMap);
    return jsonResponse(200, { success: true, requests: enriched });
  } catch (err: unknown) {
    console.error('Vendor requests query failed:', err);
    return jsonResponse(500, { error: 'Failed to load requests' });
  }
}

/**
 * PUT /api/vendor-portal/requests
 */
export async function handleVendorPortalRequestsPut(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    updateRequest?: UpdateVendorPortalRequestFn;
    actorName?: string;
    actorEmail?: string;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validateVendorPortalQuoteBody(body);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  try {
    if (deps.updateRequest) {
      await deps.updateRequest({
        vendorUid: auth.uid,
        requestId: validated.requestId,
        projectId: validated.projectId,
        targetStatus: validated.targetStatus,
        quotedFee: validated.quotedFee,
        message: validated.message,
        actorName: deps.actorName,
        actorEmail: deps.actorEmail ?? auth.email ?? undefined,
      });
    }
    return jsonResponse(200, { success: true });
  } catch (err: unknown) {
    console.error('Failed to update vendor request:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
