import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { listPlaidConnections, markPlaidConnectionsSynced } from '@/lib/plaid/plaid-store';
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

/** POST /api/plaid/connections — sync connection timestamps for the caller. */
export async function POST(_request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        requiresCredentials: true,
        error:
          'Plaid banking integration is not configured. (REQUIRES CREDENTIALS: PLAID_CLIENT_ID, PLAID_SECRET)',
      },
      { status: 503 },
    );
  }

  try {
    const itemCount = await markPlaidConnectionsSynced(auth.uid);
    return NextResponse.json({
      success: true,
      message: 'Transactions synchronized successfully.',
      syncedAt: new Date().toISOString(),
      itemCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
