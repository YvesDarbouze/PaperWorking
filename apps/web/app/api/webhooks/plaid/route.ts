import { NextResponse } from 'next/server';
import { isPlaidConfigured, getActivePlaidEnv } from '@/lib/plaid/plaid-client';
import {
  fetchPlaidWebhookVerificationKey,
  verifyPlaidWebhookSignature,
} from '@/lib/plaid/webhook-verifier';
import { markPlaidStatusByItemId } from '@/lib/plaid/plaid-store';

export const dynamic = 'force-dynamic';

interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
}

/** POST /api/webhooks/plaid — verified webhook receiver (login repair, expiration). */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const verificationHeader = request.headers.get('plaid-verification');

  if (!verificationHeader) {
    return NextResponse.json({ error: 'Missing Plaid-Verification header' }, { status: 400 });
  }

  if (!isPlaidConfigured()) {
    return NextResponse.json(
      {
        received: false,
        configured: false,
        requiresCredentials: true,
        error: 'Plaid webhook verification requires PLAID_CLIENT_ID, PLAID_SECRET (REQUIRES CREDENTIALS)',
      },
      { status: 503 },
    );
  }

  const verification = await verifyPlaidWebhookSignature(verificationHeader, rawBody, {
    keyFetcher: (kid) =>
      fetchPlaidWebhookVerificationKey(kid, {
        clientId: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        env: getActivePlaidEnv(),
      }),
    onSecurityAlert: (reason, details) => {
      console.warn('[SECURITY ALERT] [Plaid Webhook]', reason, details);
    },
  });

  if (!verification.isValid) {
    return NextResponse.json(
      { error: `Plaid webhook verification failed: ${verification.error ?? 'invalid signature'}` },
      { status: 401 },
    );
  }

  let body: PlaidWebhookBody = {};
  try {
    body = JSON.parse(rawBody) as PlaidWebhookBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (body.item_id) {
      if (body.webhook_code === 'ITEM_LOGIN_REQUIRED' || body.webhook_code === 'ITEM_ERROR') {
        await markPlaidStatusByItemId(body.item_id, 'login_repair_required');
      } else if (
        body.webhook_code === 'PENDING_EXPIRATION' ||
        body.webhook_code === 'PENDING_DISCONNECT'
      ) {
        await markPlaidStatusByItemId(body.item_id, 'stale_reconnect_required');
      }
    }
  } catch (error) {
    console.warn(
      '[plaid/webhook] Failed to update connection status:',
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({ received: true });
}
