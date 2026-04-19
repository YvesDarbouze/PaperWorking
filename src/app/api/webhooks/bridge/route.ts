import { NextResponse } from 'next/server';

// Force dynamic rendering — Firebase Auth cannot initialize at build time
export const dynamic = 'force-dynamic';

/**
 * 🌉 Zillow Bridge Webhook Ingestion Endpoint
 * 
 * Optimized for 'Webhooks / Streaming' payloads from Bridge Interactive.
 * Anticipates the 'ResourceRecord' wrapper used in RESO-compliant OData streams.
 */
export async function POST(request: Request) {
  try {
    // Dynamic import to prevent Firebase from initializing at build time
    const { processStatusChange } = await import('@/lib/services/mlsService');
    const payload = await request.json();
    
    // Log incoming for debugging (optional in high-volume prod, but helpful for setup)
    console.log('📬 [BRIDGE WEBHOOK] Received new status notification.');

    // Pass to the StatusChange logic
    const result = await processStatusChange(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: result.reason || 'processing_failed' }, 
        { status: 422 }
      );
    }

    return NextResponse.json({ 
      processed: true, 
      affectedDeals: result.count 
    });
  } catch (error) {
    console.error('🔥 [WEBHOOK CRITICAL ERROR]', error);
    return NextResponse.json(
      { error: 'internal_server_error' }, 
      { status: 500 }
    );
  }
}
