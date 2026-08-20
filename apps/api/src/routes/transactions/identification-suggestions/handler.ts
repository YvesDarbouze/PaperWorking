import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type LoadIdentificationSuggestionsFn = (
  projectId: string,
) => Promise<Array<Record<string, unknown>>>;

export interface TransactionIdentificationSuggestionsGetDeps {
  requireAuth?: RequireAuthFn;
  loadSuggestions?: LoadIdentificationSuggestionsFn;
}

/**
 * GET /api/transactions/project/[projectId]/identification-suggestions
 */
export async function handleTransactionIdentificationSuggestionsGet(
  projectId: string,
  deps: TransactionIdentificationSuggestionsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId?.trim()) {
    return jsonResponse(400, { success: false, error: 'projectId is required' });
  }

  try {
    const suggestions = deps.loadSuggestions ? await deps.loadSuggestions(projectId) : [];

    return jsonResponse(200, {
      success: true,
      projectId,
      count: suggestions.length,
      suggestions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GET /api/transactions/${projectId}/identification-suggestions] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
