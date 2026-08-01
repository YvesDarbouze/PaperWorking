import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/encryption/tokenVault';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

/**
 * POST /api/plaid/connections/[connectionId]/disconnect
 *
 * Disconnects a PlaidConnection (v2 model):
 *   1. Auth + ownership check
 *   2. Decrypt access_token → call Plaid /item/remove (best-effort)
 *   3. Set status = DISCONNECTED in Prisma (soft delete — preserves audit trail)
 *   4. Emit PostHog telemetry
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;
  const { connectionId } = params;

  if (!connectionId) {
    return NextResponse.json({ success: false, error: 'connectionId is required' }, { status: 400 });
  }

  // 1. Load and ownership-verify the PlaidConnection
  const conn = await prisma.plaidConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, userId: true, accessToken: true, status: true, itemId: true, institutionName: true },
  });

  if (!conn) {
    return NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 });
  }

  if (conn.userId !== uid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (conn.status === 'DISCONNECTED') {
    return NextResponse.json({ success: true, already: true });
  }

  // 2. Revoke the Plaid item (best-effort — don't fail the disconnect if Plaid is down)
  if (process.env.BANKING_PROVIDER === 'plaid') {
    try {
      const decrypted = decryptToken(conn.accessToken);
      const clientId = process.env.PLAID_CLIENT_ID;
      const secret   = process.env.PLAID_SECRET;
      const env      = process.env.PLAID_ENV ?? 'sandbox';

      if (clientId && secret) {
        const client = new PlaidApi(
          new Configuration({
            basePath: PlaidEnvironments[env],
            baseOptions: { headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret } },
          })
        );
        await client.itemRemove({ access_token: decrypted });
      }
    } catch (err) {
      // Non-fatal — proceed with soft disconnect
      console.warn('[disconnect] Plaid /item/remove failed (non-fatal):', err);
    }
  }

  // 3. Soft-delete: set status = DISCONNECTED
  try {
    await prisma.plaidConnection.update({
      where: { id: connectionId },
      data: {
        status: 'DISCONNECTED',
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[disconnect] Failed to update PlaidConnection status:', err);
    return NextResponse.json({ success: false, error: 'Failed to disconnect' }, { status: 500 });
  }

  // 4. PostHog telemetry (fire-and-forget)
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (posthogKey) {
    fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event: 'plaid_connection_v2_disconnected',
        distinct_id: uid,
        properties: { connectionId, institutionName: conn.institutionName },
      }),
    }).catch(() => {/* ignore */});
  }

  return NextResponse.json({ success: true });
}
