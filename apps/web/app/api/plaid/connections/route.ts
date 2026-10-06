import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { listPlaidConnections } from '@/lib/plaid/plaid-store';
import { computePlaidStaleness } from '@/lib/plaid/staleness';
import { assertPlaidTokenNotLeaked } from '@/lib/plaid/token-vault';

export const dynamic = 'force-dynamic';

/** GET /api/plaid/connections — masked connections for the caller (no tokens). */
export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const items = await listPlaidConnections(auth.uid);

    const connections = items.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      userId: item.userId,
      institutionName: item.institutionName ?? 'Connected Bank',
      status: item.status,
      syncedAt: item.syncedAt ?? null,
      lastSyncAt: item.lastSyncAt ?? null,
      staleness: computePlaidStaleness(item.syncedAt ?? null, item.status),
      env: item.env,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const payload = { connections };
    assertPlaidTokenNotLeaked(payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Plaid connections';
    return NextResponse.json(
      { success: false, requiresCredentials: false, error: `Plaid storage unavailable: ${message}` },
      { status: 503 },
    );
  }
}
