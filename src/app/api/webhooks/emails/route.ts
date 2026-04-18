import { NextResponse } from 'next/server';
import { inboundEmailHandler } from '@/lib/services/inboundEmailHandler';

/**
 * Inbound Email Webhook
 * Optimized for SendGrid / Postmark Inbound Parse payload extraction.
 */
export async function POST(request: Request) {
  try {
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
