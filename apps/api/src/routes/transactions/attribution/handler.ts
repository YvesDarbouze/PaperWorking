import { jsonResponse, type RouteResult } from '../../../http/response.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;

export type GetOwnedTransactionFn = (
  transactionId: string,
) => Promise<{ userId: string; projectId: string | null } | null>;

export type UpdateTransactionAttributionFn = (input: {
  transactionId: string;
  projectId: string | null;
  ignore: boolean;
}) => Promise<Record<string, unknown>>;

export type SearchTransactionAttributionFn = (
  transactionId: string,
  userId: string,
) => Promise<{
  projectId: string | null;
  projectName: string | null;
  matchType: string | null;
  confidence: number | null;
}>;

export interface TransactionAttributionPatchDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getTransaction?: GetOwnedTransactionFn;
  updateAttribution?: UpdateTransactionAttributionFn;
  recalculateProjectKpis?: (projectId: string) => Promise<void>;
}

export interface TransactionAttributionSearchPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getTransaction?: GetOwnedTransactionFn;
  searchAttribution?: SearchTransactionAttributionFn;
}

/**
 * PATCH /api/transactions/[id]/attribution
 */
export async function handleTransactionAttributionPatch(
  transactionId: string,
  body: { projectId?: unknown; ignore?: unknown },
  idToken: string | null | undefined,
  deps: TransactionAttributionPatchDeps = {},
): Promise<RouteResult> {
  if (!idToken) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  try {
    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo' };

    const tx = deps.getTransaction
      ? await deps.getTransaction(transactionId)
      : { userId: decoded.uid, projectId: null };

    if (!tx) {
      return jsonResponse(404, { success: false, error: 'Transaction not found' });
    }
    if (tx.userId !== decoded.uid) {
      return jsonResponse(403, { success: false, error: 'Forbidden' });
    }

    const ignore = body.ignore === true;
    const projectId = typeof body.projectId === 'string' ? body.projectId : null;
    const oldProjectId = tx.projectId;

    const updated = deps.updateAttribution
      ? await deps.updateAttribution({
          transactionId,
          projectId: ignore ? null : projectId,
          ignore,
        })
      : { id: transactionId, projectId: ignore ? null : projectId };

    const affected = new Set<string>();
    if (oldProjectId) affected.add(oldProjectId);
    if (projectId && !ignore) affected.add(projectId);

    if (deps.recalculateProjectKpis) {
      for (const projId of affected) {
        await deps.recalculateProjectKpis(projId);
      }
    }

    return jsonResponse(200, { success: true, transaction: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Attribution API] PATCH Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}

/**
 * POST /api/transactions/[id]/attribution/search
 */
export async function handleTransactionAttributionSearchPost(
  transactionId: string,
  idToken: string | null | undefined,
  deps: TransactionAttributionSearchPostDeps = {},
): Promise<RouteResult> {
  if (!idToken) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  try {
    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo' };

    const tx = deps.getTransaction
      ? await deps.getTransaction(transactionId)
      : { userId: decoded.uid, projectId: null };

    if (!tx) {
      return jsonResponse(404, { success: false, error: 'Transaction not found' });
    }
    if (tx.userId !== decoded.uid) {
      return jsonResponse(403, { success: false, error: 'Forbidden' });
    }

    const match = deps.searchAttribution
      ? await deps.searchAttribution(transactionId, decoded.uid)
      : { projectId: null, projectName: null, matchType: null, confidence: null };

    return jsonResponse(200, { success: true, ...match });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Attribution API] POST Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
