export interface ProjectTransactionsQuery {
  reviewed?: string | null;
  limit?: string | null;
  cursor?: string | null;
}

export interface ParsedProjectTransactionsQuery {
  reviewedFalseOnly: boolean;
  limit: number;
  cursor: string | null;
}

export function parseProjectTransactionsQuery(
  query: ProjectTransactionsQuery,
): ParsedProjectTransactionsQuery {
  const limitParam = parseInt(query.limit ?? '100', 10);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1), 200);

  return {
    reviewedFalseOnly: query.reviewed === 'false',
    limit,
    cursor: query.cursor ?? null,
  };
}

export function computeTransactionsNextCursor(
  dates: string[],
  limit: number,
): string | null {
  if (dates.length !== limit || dates.length === 0) return null;
  return dates[dates.length - 1];
}
