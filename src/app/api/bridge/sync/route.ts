import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bridge/sync
 *
 * Enqueues a bridge_sync job and returns 202 Accepted immediately.
 * The actual sync is executed asynchronously by /api/worker/drain.
 *
 * This decouples the long-running MLS replication (potentially minutes)
 * from the HTTP request lifecycle, preventing gateway timeouts and freeing
 * the serverless function slot.
 */
export async function POST() {
  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    const jobId = await jobQueue.enqueue('bridge_sync', {});

    return NextResponse.json(
      { accepted: true, jobId, message: 'Sync job enqueued. Call /api/worker/drain to process.' },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('❌ [API BRIDGE SYNC] Failed to enqueue job:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue sync job.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bridge/sync
 *
 * Returns the current sync watermark and queue depth.
 */
export async function GET() {
  try {
    const prisma = (await import('@/lib/prisma')).default;
    const { jobQueue } = await import('@/lib/queue/jobQueue');

    const [state, queueDepth] = await Promise.all([
      prisma.bridgeSyncState.findUnique({ where: { id: 'replication_watermark' } }),
      jobQueue.depth('bridge_sync'),
    ]);

    return NextResponse.json({
      active: true,
      lastWatermark: state?.mostRecentModificationTimestamp ?? 'None',
      updatedAt: state?.updatedAt ?? 'None',
      queueDepth,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve sync status.' }, { status: 500 });
  }
}
