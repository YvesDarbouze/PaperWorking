import type { NextRequest } from 'next/server';

/**
 * Catch-all MCP Route Handler
 *
 * Supports dynamic transport selection via standard MCP protocols.
 * Integrated with PaperWorking deal pipeline and Stripe metrics.
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

export async function GET(req: NextRequest) {
  const handler = await getHandler();
  return handler(req);
}

export async function POST(req: NextRequest) {
  const handler = await getHandler();
  return handler(req);
}
