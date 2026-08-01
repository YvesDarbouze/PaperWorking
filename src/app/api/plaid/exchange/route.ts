import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getBankingProvider } from '@/lib/banking';
import { encryptToken } from '@/lib/encryption/tokenVault';
import { adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/plaid/exchange
 *
 * Exchanges a Plaid public_token for an access_token + item_id, then:
 *   1. Encrypts the access_token (AES-256-GCM via tokenVault)
 *   2. Fetches institution metadata from Plaid
 *   3. Writes/upserts a BankConnection row in Prisma with all new columns
 *   4. Mirrors minimal metadata to Firestore (for backward-compat with collectionGroup queries)
 *
 * Request body:
 *   public_token    string   — from Plaid Link onSuccess
 *   project_id?     string   — optional: scope this connection to a project
 *   connection_type? string  — 'rent_deposits' | 'operating_expenses' (default: 'rent_deposits')
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 * Security: access_token never logged; encrypted before any persistence.
 */

export const dynamic = 'force-dynamic';

type ConnectionType = 'rent_deposits' | 'operating_expenses';

const VALID_CONNECTION_TYPES: ConnectionType[] = ['rent_deposits', 'operating_expenses'];

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { uid } = auth;

  let body: {
    public_token?: string;
    project_id?: string;
    connection_type?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { public_token: publicToken, project_id: projectId, connection_type: rawConnectionType } = body;

  if (!publicToken) {
    return NextResponse.json({ success: false, error: 'public_token is required' }, { status: 400 });
  }

  // Validate and normalise connection_type
  const connectionType: ConnectionType =
    VALID_CONNECTION_TYPES.includes(rawConnectionType as ConnectionType)
      ? (rawConnectionType as ConnectionType)
      : 'rent_deposits';

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/webhooks/plaid`;

  try {
    const bankingProvider = getBankingProvider();

    // 1. Exchange public_token → access_token + item_id
    const { accessToken, itemId } = await bankingProvider.exchangePublicToken(uid, publicToken);

    // 2. Encrypt access_token before any persistence
    const encryptedAccessToken = encryptToken(accessToken);

    // 3. Fetch institution metadata (best-effort — don't fail the exchange if this errors)
    let institutionName: string | null = null;
    let institutionId: string | null = null;
    let accountId: string | null = null;
    let accountName: string | null = null;
    let accountMask: string | null = null;

    try {
      // PlaidProvider exposes getInstitution; MockProvider returns stub data
      if (typeof (bankingProvider as any).getItemMetadata === 'function') {
        const meta = await (bankingProvider as any).getItemMetadata(accessToken);
        institutionName = meta?.institutionName ?? null;
        institutionId = meta?.institutionId ?? null;
        // First account details (denormalized for quick display)
        accountId = meta?.accounts?.[0]?.accountId ?? null;
        accountName = meta?.accounts?.[0]?.name ?? null;
        accountMask = meta?.accounts?.[0]?.mask ?? null;
      } else if (process.env.BANKING_PROVIDER === 'mock') {
        // Mock stub for dev/test
        institutionName = 'Mock Bank';
        institutionId = 'ins_mock';
        accountId = 'mock-plaid-account-id';
        accountName = 'Business Checking';
        accountMask = '0000';
      }
    } catch (metaErr) {
      console.warn('[Plaid Exchange] Institution metadata fetch failed (non-fatal):', metaErr);
    }

    // 4. Upsert BankConnection in Prisma — keyed on itemId for idempotency
    const prismaConnection = await prisma.bankConnection.upsert({
      where: { itemId },
      update: {
        // On re-link: update token + status, preserve user's project/type choice
        accessToken: encryptedAccessToken,
        status: 'active',
        institutionName,
        institutionId,
        accountId,
        accountName,
        accountMask,
        webhookUrl,
        lastSyncAt: null,
        lastSyncCursor: null,
      },
      create: {
        userId: uid,
        projectId: projectId ?? null,
        accessToken: encryptedAccessToken,
        itemId,
        status: 'active',
        connectionType,
        institutionName,
        institutionId,
        accountId,
        accountName,
        accountMask,
        webhookUrl,
      },
    });

    // 5. Mirror to Firestore for backward-compat with collectionGroup('bankConnections') queries
    const connectionRef = adminDb
      .collection('users')
      .doc(uid)
      .collection('bankConnections')
      .doc(itemId);

    await connectionRef.set({
      itemId,
      prismaConnectionId: prismaConnection.id,
      projectId: projectId ?? null,
      connectionType,
      institutionName,
      status: 'active',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    // 6. PostHog telemetry (fire-and-forget)
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey) {
      fetch('https://app.posthog.com/capture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: posthogKey,
          event: 'plaid_connection_created',
          distinct_id: uid,
          properties: {
            connectionId: prismaConnection.id,
            connectionType,
            institutionName,
            hasProject: !!projectId,
          },
        }),
      }).catch(() => {/* ignore */});
    }

    return NextResponse.json({
      success: true,
      itemId,
      connectionId: prismaConnection.id,
      connectionType,
      institutionName,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to exchange Plaid token';
    console.error('[Plaid Exchange] Failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
