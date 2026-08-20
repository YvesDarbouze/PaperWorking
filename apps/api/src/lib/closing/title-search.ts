export interface TitleCheckItem {
  status?: string;
  [key: string]: unknown;
}

export function deriveChainOfTitleStatus(
  checks: TitleCheckItem[],
): 'pending' | 'verified' | 'failed' {
  if (checks.some((c) => c.status === 'Issue Found')) return 'failed';
  if (checks.length > 0 && checks.every((c) => c.status === 'Cleared')) return 'verified';
  return 'pending';
}

export interface TitleSearchBody {
  projectId?: unknown;
  organizationId?: unknown;
  projectName?: unknown;
  checks?: unknown;
}

export function validateTitleSearchBody(
  body: TitleSearchBody,
): { ok: true; projectId: string; organizationId?: string; projectName?: string; checks: TitleCheckItem[] } | { ok: false; error: string; status: number; providerDecisionRequired?: boolean } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!projectId) {
    return { ok: false, error: 'projectId is required', status: 400 };
  }

  if (body.checks === undefined) {
    return {
      ok: false,
      error: 'Title search provider not configured. A real provider (county records API, First American, Stewart Title, etc.) must be integrated before live title data is available.',
      status: 503,
      providerDecisionRequired: true,
    };
  }

  if (!Array.isArray(body.checks)) {
    return { ok: false, error: 'checks must be an array', status: 400 };
  }

  return {
    ok: true,
    projectId,
    organizationId: typeof body.organizationId === 'string' ? body.organizationId : undefined,
    projectName: typeof body.projectName === 'string' ? body.projectName : undefined,
    checks: body.checks as TitleCheckItem[],
  };
}
