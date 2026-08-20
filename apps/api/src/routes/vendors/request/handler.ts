import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { validateVendorRequestBody } from '../../../lib/vendors/portal.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;
export type LoadVendorRequestContextFn = (input: {
  uid: string;
  projectId: string;
  vendorUid: string;
}) => Promise<{ hasSubscription: boolean; hasProjectAccess: boolean; vendorExists: boolean } | null>;
export type CreateVendorRequestFn = (input: {
  uid: string;
  projectId: string;
  vendorUid: string;
  message: string;
  actorName: string;
  dealAddress: string;
}) => Promise<string>;

/**
 * POST /api/vendors/request
 */
export async function handleVendorsRequestPost(
  body: Record<string, unknown>,
  deps: {
    verifyIdToken?: VerifyIdTokenFn;
    loadContext?: LoadVendorRequestContextFn;
    createRequest?: CreateVendorRequestFn;
  } = {},
): Promise<RouteResult> {
  try {
    const validated = validateVendorRequestBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    if (!deps.verifyIdToken) return jsonResponse(500, { error: 'Auth not configured' });
    const decoded = await deps.verifyIdToken(String(body.idToken));

    const context = deps.loadContext
      ? await deps.loadContext({
          uid: decoded.uid,
          projectId: validated.projectId,
          vendorUid: validated.vendorUid,
        })
      : { hasSubscription: true, hasProjectAccess: true, vendorExists: true };
    if (!context) return jsonResponse(404, { error: 'User profile not found.' });
    if (!context.hasSubscription) {
      return jsonResponse(403, { error: 'An active subscription is required to request vendor quotes.' });
    }
    if (!context.hasProjectAccess) {
      return jsonResponse(403, { error: 'Access denied for this project.' });
    }
    if (!context.vendorExists) return jsonResponse(404, { error: 'Vendor not found.' });

    const requestId = deps.createRequest
      ? await deps.createRequest({
          uid: decoded.uid,
          projectId: validated.projectId,
          vendorUid: validated.vendorUid,
          message: validated.message,
          actorName: 'User',
          dealAddress: 'the project',
        })
      : 'req-1';

    return jsonResponse(200, { success: true, requestId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if ((err as { code?: string }).code === 'auth/id-token-expired') {
      return jsonResponse(401, { error: 'Session expired.' });
    }
    console.error('[Vendor Request]', message);
    return jsonResponse(500, { error: 'Failed to submit vendor request.', details: message });
  }
}
