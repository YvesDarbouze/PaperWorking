import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { validateMcpAuthorization } from '../../../lib/mcp/auth.js';

export type McpTransportHandlerFn = (input: {
  transport: string;
  method: 'GET' | 'POST';
  headers: Record<string, string | undefined>;
  body?: unknown;
}) => Promise<{ status: number; body: unknown; headers?: Record<string, string> }>;

export interface McpTransportHandlerDeps {
  getApiKey?: () => string | null | undefined;
  handleTransport?: McpTransportHandlerFn;
}

/**
 * GET /api/mcp/[transport]
 */
export async function handleMcpTransportGet(
  transport: string,
  headers: Record<string, string | undefined>,
  deps: McpTransportHandlerDeps = {},
): Promise<RouteResult> {
  const auth = validateMcpAuthorization(headers.authorization ?? headers.Authorization, deps.getApiKey?.());
  if (!auth.ok) return jsonResponse(auth.status, { error: auth.error });

  if (!deps.handleTransport) {
    return jsonResponse(503, { error: 'MCP handler not configured' });
  }

  const result = await deps.handleTransport({ transport, method: 'GET', headers });
  return {
    status: result.status,
    body: result.body,
    headers: result.headers,
  };
}

/**
 * POST /api/mcp/[transport]
 */
export async function handleMcpTransportPost(
  transport: string,
  body: unknown,
  headers: Record<string, string | undefined>,
  deps: McpTransportHandlerDeps = {},
): Promise<RouteResult> {
  const auth = validateMcpAuthorization(headers.authorization ?? headers.Authorization, deps.getApiKey?.());
  if (!auth.ok) return jsonResponse(auth.status, { error: auth.error });

  if (!deps.handleTransport) {
    return jsonResponse(503, { error: 'MCP handler not configured' });
  }

  const result = await deps.handleTransport({ transport, method: 'POST', headers, body });
  return {
    status: result.status,
    body: result.body,
    headers: result.headers,
  };
}
