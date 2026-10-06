import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import {
  PlaidHttpClient,
  PlaidNotConfiguredError,
  getActivePlaidEnv,
  isPlaidConfigured,
} from '@/lib/plaid/plaid-client';
import { decryptPlaidConnectionToken, findPlaidConnection } from '@/lib/plaid/plaid-store';

export const dynamic = 'force-dynamic';

/** POST /api/plaid/create-link-token — Link token for connect or update mode. */
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

  let body: { mode?: string; connectionId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const client = new PlaidHttpClient();
  const updateMode = body.mode === 'update' || Boolean(body.connectionId);

  try {
    if (updateMode && body.connectionId) {
      const connection = await findPlaidConnection(auth.uid, body.connectionId);
      if (!connection) {
        return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
      }
      const accessToken = decryptPlaidConnectionToken(connection);
      const result = await client.createUpdateLinkToken(auth.uid, accessToken);
      return NextResponse.json({
        success: true,
        linkToken: result.linkToken,
        link_token: result.linkToken,
        mock: false,
        updateMode: true,
        env: getActivePlaidEnv(),
      });
    }

    const result = await client.createLinkToken(auth.uid);
    return NextResponse.json({
      success: true,
      linkToken: result.linkToken,
      link_token: result.linkToken,
      mock: false,
      updateMode: false,
      env: getActivePlaidEnv(),
    });
  } catch (error) {
    const notConfigured = error instanceof PlaidNotConfiguredError;
    const message = error instanceof Error ? error.message : 'Plaid link token creation failed';
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
