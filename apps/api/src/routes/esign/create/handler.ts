import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { validateCreateEnvelopeBody, type CreateEnvelopeBody } from '../../../lib/esign/validation.js';

export type CreateEsignEnvelopeFn = (input: {
  uid: string;
  envelope: Record<string, string>;
}) => Promise<{
  envelopeId: string;
  status: string;
  signingUrl?: string | null;
  provider: string;
}>;

export interface EsignCreatePostDeps {
  requireAuth?: RequireAuthFn;
  verifyProjectMembership?: (input: { projectId: string; uid: string }) => Promise<boolean>;
  createEnvelope?: CreateEsignEnvelopeFn;
}

/**
 * POST /api/esign/create
 */
export async function handleEsignCreatePost(
  body: CreateEnvelopeBody,
  deps: EsignCreatePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateCreateEnvelopeBody(body);
  if (!validated.ok) {
    return jsonResponse(400, { success: false, error: validated.error });
  }

  try {
    const allowed = deps.verifyProjectMembership
      ? await deps.verifyProjectMembership({
          projectId: validated.value.projectId,
          uid: auth.uid,
        })
      : true;

    if (!allowed) {
      return jsonResponse(403, { success: false, error: 'Forbidden' });
    }

    const result = deps.createEnvelope
      ? await deps.createEnvelope({ uid: auth.uid, envelope: validated.value })
      : {
          envelopeId: `env_${Date.now()}`,
          status: 'sent',
          signingUrl: null,
          provider: 'mock',
        };

    return jsonResponse(200, {
      success: true,
      envelopeId: result.envelopeId,
      status: result.status,
      signingUrl: result.signingUrl ?? null,
      provider: result.provider,
    });
  } catch (error: unknown) {
    console.error('[esign/create] Unexpected error', error);
    return jsonResponse(500, { success: false, error: 'Failed to create envelope' });
  }
}
