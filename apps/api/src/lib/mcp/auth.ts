export function validateMcpAuthorization(
  authorizationHeader: string | null | undefined,
  apiKey: string | null | undefined,
): { ok: true } | { ok: false; status: number; error: string } {
  if (!apiKey) {
    return { ok: false, status: 503, error: 'MCP endpoint not configured' };
  }
  const authHeader = authorizationHeader ?? '';
  if (authHeader !== `Bearer ${apiKey}`) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

export const MCP_TOOL_NAMES = [
  'list_active_projects',
  'get_deal_metrics',
  'query_ledger',
  'verify_subscription',
] as const;
