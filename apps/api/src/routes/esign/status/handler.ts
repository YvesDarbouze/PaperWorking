import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  mapEnvelopeStatusToDocStatus,
  TERMINAL_ENVELOPE_STATUSES,
} from '../../../lib/esign/validation.js';

export type GetEnvelopeStatusFn = (envelopeId: string) => Promise<Record<string, unknown>>;

export type ReconcileEnvelopeStatusFn = (input: {
  envelopeId: string;
  status: string;
  completedAt?: string | null;
  signerName?: string | null;
}) => Promise<void>;

export interface EsignStatusGetDeps {
  requireAuth?: RequireAuthFn;
  getEnvelopeStatus?: GetEnvelopeStatusFn;
  reconcileStatus?: ReconcileEnvelopeStatusFn;
}

/**
 * GET /api/esign/status/[envelopeId]
 */
export async function handleEsignStatusGet(
  envelopeId: string,
  deps: EsignStatusGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!envelopeId?.trim()) {
    return jsonResponse(400, { success: false, error: 'envelopeId is required' });
  }

  try {
    const result = deps.getEnvelopeStatus
      ? await deps.getEnvelopeStatus(envelopeId)
      : { status: 'sent', envelopeId };

    const status = String(result.status ?? 'unknown');

    if (TERMINAL_ENVELOPE_STATUSES.has(status) && deps.reconcileStatus) {
      await deps.reconcileStatus({
        envelopeId,
        status,
        completedAt: (result.completedAt as string | null | undefined) ?? null,
        signerName: (result.signerName as string | null | undefined) ?? null,
      });
    }

    return jsonResponse(200, {
      success: true,
      ...result,
      mappedDocStatus: mapEnvelopeStatusToDocStatus(status),
    });
  } catch (error: unknown) {
    console.error('[esign/status] Error', error);
    return jsonResponse(500, { success: false, error: 'Failed to retrieve envelope status' });
  }
}
