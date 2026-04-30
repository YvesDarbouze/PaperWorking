import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/bridge
 *
 * Ingests Bridge Interactive RESO status-change webhooks.
 *
 * Fast-path design: validates the HMAC signature, enqueues the payload, and
 * returns 200 within milliseconds. Heavy processing (Firestore queries + deal
 * transitions) is deferred to the /api/worker/drain consumer.
 *
 * Bridge retries on non-2xx with exponential back-off, so keeping this handler
 * fast prevents duplicate delivery under load.
 *
 * Set BRIDGE_WEBHOOK_SECRET to enable HMAC verification (recommended in prod).
 */

function verifyHmacSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.BRIDGE_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (webhookSecret) {
    const sig =
      request.headers.get('x-bridge-signature') ??
      request.headers.get('x-hub-signature-256');
    if (!verifyHmacSignature(rawBody, sig, webhookSecret)) {
      console.warn('⚠️ [BRIDGE WEBHOOK] HMAC signature mismatch. Rejecting payload.');
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    const jobId = await jobQueue.enqueue('webhook_process', payload);
    console.log(`📬 [BRIDGE WEBHOOK] Payload accepted → job ${jobId}`);
    return NextResponse.json({ accepted: true, jobId });
  } catch (queueError: any) {
    // Redis unavailable — fall back to inline processing so we never silently drop events.
    console.warn('⚠️ [BRIDGE WEBHOOK] Queue unavailable — falling back to sync processing.', queueError.message);
    try {
      const { processWebhookPayload } = await import('@/lib/services/webhookProcessor');
      const result = await processWebhookPayload(payload);
      if (!result.success) {
        return NextResponse.json({ error: result.reason ?? 'processing_failed' }, { status: 422 });
      }
      return NextResponse.json({ processed: true, affectedDeals: result.count });
    } catch (syncError) {
      console.error('🔥 [BRIDGE WEBHOOK] Sync fallback failed:', syncError);
      return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
    }
  }
}
