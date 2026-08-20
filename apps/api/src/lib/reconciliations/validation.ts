export interface StartReconciliationInput {
  projectId: string;
  month: number;
  year: number;
  bankStatementBalance?: number;
}

export function validateStartReconciliationBody(
  body: Record<string, unknown>,
): { ok: true; value: StartReconciliationInput } | { ok: false; error: string } {
  const projectId = body.projectId;
  const month = body.month;
  const year = body.year;

  if (!projectId || month === undefined || year === undefined) {
    return {
      ok: false,
      error: 'Missing required parameters: projectId, month, year',
    };
  }

  const parsed: StartReconciliationInput = {
    projectId: String(projectId),
    month: Number(month),
    year: Number(year),
  };

  if (body.bankStatementBalance !== undefined) {
    parsed.bankStatementBalance = Number(body.bankStatementBalance);
  }

  return { ok: true, value: parsed };
}

export interface ReconciliationListQuery {
  projectId: string;
  month?: number;
  year?: number;
  status?: string;
}

export function parseReconciliationListQuery(input: {
  projectId?: string | null;
  month?: string | null;
  year?: string | null;
  status?: string | null;
}): { ok: true; value: ReconciliationListQuery } | { ok: false; error: string } {
  if (!input.projectId) {
    return { ok: false, error: 'projectId query parameter is required' };
  }

  const query: ReconciliationListQuery = { projectId: input.projectId };
  if (input.month) query.month = Number(input.month);
  if (input.year) query.year = Number(input.year);
  if (input.status) query.status = input.status;

  return { ok: true, value: query };
}
