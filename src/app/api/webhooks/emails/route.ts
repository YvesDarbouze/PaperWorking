import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering — Firebase Admin cannot initialize at build time
export const dynamic = 'force-dynamic';

/**
 * Inbound Email Webhook
 * Optimized for SendGrid / Postmark Inbound Parse payload extraction.
 *
 * Auth: INBOUND_EMAIL_WEBHOOK_SECRET bearer token (required).
 * Without this env var the endpoint returns 503 — never open by default.
 * Set the webhook URL in SendGrid/Postmark and include:
 *   Authorization: Bearer <INBOUND_EMAIL_WEBHOOK_SECRET>
 */
export async function POST(request: NextRequest) {
  const emailSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  if (!emailSecret) {
    console.error('[Inbound Email Webhook] INBOUND_EMAIL_WEBHOOK_SECRET not configured — rejecting request');
    return NextResponse.json({ error: 'Webhook endpoint not configured' }, { status: 503 });
  }
  const authHeader = request.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${emailSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Dynamic import to prevent Firebase from initializing at build time
    const { inboundEmailHandler } = await import('@/lib/services/inboundEmailHandler');
    const payload = await request.json();
    
    // Normalize format for our handler
    // If it's SendGrid, it might involve form-data parsing, but we'll stick to 
    // structured JSON as preferred by Postmark/SendGrid JSON relays.
    const result = await inboundEmailHandler.processInbound(payload);

    if (!result.success) {
       return NextResponse.json({ error: result.reason }, { status: 422 });
    }

    return NextResponse.json({ processed: true, projectId: result.projectId });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}
