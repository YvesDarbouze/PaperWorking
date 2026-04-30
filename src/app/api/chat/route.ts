import { NextRequest } from 'next/server';
import { streamText, convertToModelMessages } from 'ai';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { google } = await import('@ai-sdk/google');
  const { aiTools } = await import('@/lib/mcp/ai-tools');

  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-pro-latest'),
    system: `
      You are the PaperWorking Assistant, a helpful AI expert in real estate deal management.
      You have access to the following project data via tools:
      - list_active_projects: List properties being flipped/managed.
      - get_deal_metrics: View ROI, profit, and costs for a deal.
      - query_ledger: Check specific expenses (plumbing, HVAC, etc).
      - verify_subscription: Check if the user is on a paid tier ($59/$99).

      Guidelines:
      1. Always check 'list_active_projects' if the user asks about properties generally.
      2. If a user asks for financial status, use 'get_deal_metrics'.
      3. Be professional and concise. Use a helpful but business-oriented tone.
      4. If you lack information, ask for the specific deal ID or organization ID.
    `,
    messages: convertToModelMessages(messages),
    tools: aiTools,
  });

  return result.toTextStreamResponse();
}
