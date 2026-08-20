import { jsonResponse, type RouteResult } from '../../../http/response.js';

export interface UnsubscribePostBody {
  email?: unknown;
  projectId?: unknown;
}

export type RevokeGlobalUnsubscribeFn = (email: string) => Promise<void>;
export type RevokeProjectEmailConsentFn = (email: string, projectId: string) => Promise<void>;

export interface UnsubscribePostDeps {
  revokeGlobal?: RevokeGlobalUnsubscribeFn;
  revokeProjectConsent?: RevokeProjectEmailConsentFn;
  log?: (message: string, meta: Record<string, unknown>) => void;
}

/**
 * POST /api/unsubscribe — global + optional per-project email consent revoke.
 */
export async function handleUnsubscribePost(
  body: UnsubscribePostBody,
  deps: UnsubscribePostDeps = {},
): Promise<RouteResult> {
  try {
    const email = body.email;
    if (!email || typeof email !== 'string') {
      return jsonResponse(400, {
        success: false,
        error: 'Missing required field: email',
      });
    }

    const emailLower = email.trim().toLowerCase();
    const projectId =
      body.projectId && typeof body.projectId === 'string' ? body.projectId : undefined;

    if (deps.revokeGlobal) {
      await deps.revokeGlobal(emailLower);
    }

    if (projectId && deps.revokeProjectConsent) {
      await deps.revokeProjectConsent(emailLower, projectId);
    }

    deps.log?.('[Unsubscribe] Revoked email consent globally', {
      email: emailLower,
      projectId: projectId ?? null,
    });

    return jsonResponse(200, {
      success: true,
      message: `Unsubscribed ${emailLower} from project communications.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    deps.log?.('[Unsubscribe] General Error:', { error: message });
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}
