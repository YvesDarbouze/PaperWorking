import { createMcpHandler } from "@vercel/mcp-adapter";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  list_active_projects, 
  get_deal_metrics, 
  query_ledger 
} from "@/lib/mcp/firestore-tools";
import { verify_subscription } from "@/lib/mcp/stripe-tools";

/**
 * Catch-all MCP Route Handler
 * 
 * Supports dynamic transport selection via standard MCP protocols.
 * Integrated with PaperWorking deal pipeline and Stripe metrics.
 */

const server = new Server(
  {
    name: "paperworking-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── Register Tools ───────────────────────────────────────────────

server.tool(
  list_active_projects.name,
  list_active_projects.description,
  list_active_projects.schema,
  list_active_projects.handler
);

server.tool(
  get_deal_metrics.name,
  get_deal_metrics.description,
  get_deal_metrics.schema,
  get_deal_metrics.handler
);

server.tool(
  query_ledger.name,
  query_ledger.description,
  query_ledger.schema,
  query_ledger.handler
);

server.tool(
  verify_subscription.name,
  verify_subscription.description,
  verify_subscription.schema,
  verify_subscription.handler
);

// ─── Export Final Handler ─────────────────────────────────────────

// The [transport] catch-all route handles both GET (SSE) and POST (Messages)
export const { GET, POST } = createMcpHandler(server);

