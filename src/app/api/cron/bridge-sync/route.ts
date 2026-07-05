import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/bridge-sync
 *
 * Cron-triggered endpoint that enqueues all three MLS replication jobs:
 *   1. bridge_sync  — Property listings
 *   2. member_sync  — Agents / Members
 *   3. office_sync  — Offices
 *
 * After enqueuing, immediately triggers /api/worker/drain to process the queue.
 *
 * Schedule: Every 6 hours
 *   - Firebase Scheduler: configure in firebase.json extensions
 *   - Vercel Cron: add to vercel.json crons array
 *   - External: cURL from any cron service
 *
 * Protected by CRON_SECRET or WORKER_SECRET in the Authorization header.
 *
 * Query params:
 *   ?resources=property,member,office  — comma-separated list (default: all)
 *   ?drain=true                        — auto-drain after enqueue (default: true)
 */
export async function GET(req: NextRequest) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (!cronSecret) {
    console.error('[Cron/BridgeSync] CRON_SECRET env var not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');

    // ── Parse which resources to sync ──
    const resourcesParam = req.nextUrl.searchParams.get('resources') ?? 'property,member,office';
    const requested = new Set(resourcesParam.split(',').map(s => s.trim().toLowerCase()));
    const autoDrain = req.nextUrl.searchParams.get('drain') !== 'false';

    const enqueued: Record<string, string> = {};

    if (requested.has('property') || requested.has('all')) {
      enqueued.bridge_sync = await jobQueue.enqueue('bridge_sync', {
        triggeredBy: 'cron',
        scheduledAt: new Date().toISOString(),
      });
    }

    if (requested.has('member') || requested.has('all')) {
      enqueued.member_sync = await jobQueue.enqueue('member_sync', {
        triggeredBy: 'cron',
        scheduledAt: new Date().toISOString(),
      });
    }

    if (requested.has('office') || requested.has('all')) {
      enqueued.office_sync = await jobQueue.enqueue('office_sync', {
        triggeredBy: 'cron',
        scheduledAt: new Date().toISOString(),
      });
    }

    console.log(`📅 [CRON BRIDGE-SYNC] Enqueued jobs:`, enqueued);

    // ── Auto-drain ──
    let drainResult = null;
    if (autoDrain && Object.keys(enqueued).length > 0) {
      try {
        const { drainAll } = await import('@/lib/queue/jobConsumer');
        drainResult = await drainAll(5);
        console.log(`✅ [CRON BRIDGE-SYNC] Drain complete:`, drainResult);
      } catch (drainError: any) {
        console.error('⚠️ [CRON BRIDGE-SYNC] Drain failed (jobs remain in queue):', drainError.message);
        drainResult = { error: drainError.message };
      }
    }

    // ── Watermark status ──
    const prisma = (await import('@/lib/prisma')).default;
    const watermarks = await prisma.bridgeSyncState.findMany();
    const watermarkMap: Record<string, string> = {};
    for (const w of watermarks) {
      watermarkMap[w.id] = w.mostRecentModificationTimestamp.toISOString();
    }

    return NextResponse.json({
      ok: true,
      enqueued,
      drain: drainResult,
      watermarks: watermarkMap,
      durationMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('❌ [CRON BRIDGE-SYNC] Uncaught error:', error);
    return NextResponse.json(
      { error: 'cron_failed', detail: error.message },
      { status: 500 }
    );
  }
}
