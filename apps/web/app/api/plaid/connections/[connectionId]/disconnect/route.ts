import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { PlaidHttpClient, isPlaidConfigured } from '@/lib/plaid/plaid-client';
import {
  decryptPlaidConnectionToken,
  findPlaidConnection,
  markPlaidConnectionDisconnected,
} from '@/lib/plaid/plaid-store';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ connectionId: string }> };

/** POST /api/plaid/connections/:id/disconnect — remove item at Plaid (best effort) and mark disconnected. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { connectionId } = await context.params;

  const connection = await findPlaidConnection(auth.uid, connectionId);
  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  if (isPlaidConfigured()) {
    try {
      const accessToken = decryptPlaidConnectionToken(connection);
      await new PlaidHttpClient().removeItem(accessToken);
    } catch (error) {
      console.warn(
        '[plaid/disconnect] Failed to remove item at Plaid; marking local connection disconnected:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  const disconnected = await markPlaidConnectionDisconnected(auth.uid, connectionId);
  return NextResponse.json({ success: true, disconnected });
}
