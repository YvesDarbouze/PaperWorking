import { tool } from 'ai';
import {
  list_active_projects,
  get_deal_metrics,
  query_ledger,
} from './firestore-tools';
import { verify_subscription } from './stripe-tools';

/**
 * AI SDK v5 Tool Definitions
 *
 * Maps the MCP handlers to the format expected by the Vercel AI SDK v5 streamText.
 * v5 uses `inputSchema` (renamed from `parameters`).
 */

export const aiTools = {
  [list_active_projects.name]: tool({
    description: list_active_projects.description,
    inputSchema: list_active_projects.schema,
    execute: async (args: any) => {
      const result = await list_active_projects.handler(args);
      return result.content[0].text;
    },
  }),

  [get_deal_metrics.name]: tool({
    description: get_deal_metrics.description,
    inputSchema: get_deal_metrics.schema,
    execute: async (args: any) => {
      const result = await get_deal_metrics.handler(args);
      return result.content[0].text;
    },
  }),

  [query_ledger.name]: tool({
    description: query_ledger.description,
    inputSchema: query_ledger.schema,
    execute: async (args: any) => {
      const result = await query_ledger.handler(args);
      return result.content[0].text;
    },
  }),

  [verify_subscription.name]: tool({
    description: verify_subscription.description,
    inputSchema: verify_subscription.schema,
    execute: async (args: any) => {
      const result = await verify_subscription.handler(args);
      return result.content[0].text;
    },
  }),
};
