import { NextRequest, NextResponse } from 'next/server';

/**
 * Catch-all MCP Route Handler
 *
 * Gated by MCP_API_KEY bearer token — every caller (AI agent, Claude Code, etc.)
 * must supply `Authorization: Bearer <MCP_API_KEY>` to reach any tool.
 *
 * Tools exposed: list_active_projects, get_deal_metrics, query_ledger,
 *                verify_subscription
 *
 * Uses lazy initialization to avoid build-time crashes.
 */

let _handler: ((req: NextRequest) => Promise<Response>) | null = null;

async function getHandler() {
  if (!_handler) {
    const { createMcpHandler } = await import("@vercel/mcp-adapter");
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const {
      list_active_projects,
      get_deal_metrics,
      query_ledger,
    } = await import("@/lib/mcp/firestore-tools");
    const { verify_subscription } = await import("@/lib/mcp/stripe-tools");

    const tools = [list_active_projects, get_deal_metrics, query_ledger, verify_subscription];

    _handler = createMcpHandler((server: InstanceType<typeof McpServer>) => {
      for (const tool of tools) {
        server.tool(tool.name, tool.description, tool.schema.shape, tool.handler as any);
      }
    });
  }
  return _handler;
}

function checkAuth(req: NextRequest): NextResponse | null {
  const mcpApiKey = process.env.MCP_API_KEY;
  if (!mcpApiKey) {
    // Key not configured — block all access rather than allow by default.
    return NextResponse.json({ error: 'MCP endpoint not configured' }, { status: 503 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${mcpApiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // auth passed
}

export async function GET(req: NextRequest) {
  const deny = checkAuth(req);
  if (deny) return deny;
  const handler = await getHandler();
  return handler(req);
}

export async function POST(req: NextRequest) {
  const deny = checkAuth(req);
  if (deny) return deny;
  const handler = await getHandler();
  return handler(req);
}
