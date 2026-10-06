import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import {
  PlaidHttpClient,
  PlaidNotConfiguredError,
  getActivePlaidEnv,
  isPlaidConfigured,
} from '@/lib/plaid/plaid-client';
import { encryptAccessTokenEnvelope } from '@/lib/plaid/token-vault';
import { savePlaidConnection } from '@/lib/plaid/plaid-store';

export const dynamic = 'force-dynamic';

interface ExchangeBody {
  publicToken?: string;
  institution?: { id?: string; name?: string };
  accounts?: unknown[];
}

/** POST /api/plaid/exchange — exchange public token, persist encrypted item. */
export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  if (!isPlaidConfigured()) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        requiresCredentials: true,
        error:
          'Plaid banking integration is not configured. Missing required credentials: PLAID_CLIENT_ID, PLAID_SECRET (REQUIRES CREDENTIALS)',
      },
      { status: 503 },
    );
  }

  let body: ExchangeBody = {};
  try {
    body = (await request.json()) as ExchangeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const publicToken = typeof body.publicToken === 'string' ? body.publicToken.trim() : '';
  if (!publicToken) {
    return NextResponse.json({ error: 'publicToken is required' }, { status: 400 });
  }

  try {
    const client = new PlaidHttpClient();
    const exchanged = await client.exchangePublicToken(publicToken);

    const now = new Date().toISOString();
    const connectionId = `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const credentials = encryptAccessTokenEnvelope(exchanged.accessToken);

    await savePlaidConnection({
      id: connectionId,
      userId: auth.uid,
      itemId: exchanged.itemId,
      institutionId: body.institution?.id ?? null,
      institutionName: body.institution?.name?.trim() || 'Connected Bank',
      env: getActivePlaidEnv(),
      status: 'connected',
      credentials,
      accounts: Array.isArray(body.accounts) ? body.accounts : [],
      syncedAt: now,
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: connectionId,
        itemId: exchanged.itemId,
        institutionName: body.institution?.name?.trim() || 'Connected Bank',
        status: 'connected',
        env: getActivePlaidEnv(),
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    const notConfigured = error instanceof PlaidNotConfiguredError;
    const message = error instanceof Error ? error.message : 'Plaid token exchange failed';
    return NextResponse.json(
      {
        success: false,
        configured: !notConfigured,
        requiresCredentials: notConfigured,
        error: message,
      },
      { status: notConfigured ? 503 : 502 },
    );
  }
}
