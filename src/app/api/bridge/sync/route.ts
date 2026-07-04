import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bridge/sync
 *
 * Enqueues a bridge_sync job and returns 202 Accepted immediately.
 * The actual sync is executed asynchronously by /api/worker/drain.
 * Requires admin Firebase custom claim — triggers a platform-wide operation.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const isAdmin = (auth.token as Record<string, unknown>)?.['admin'] === true;
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin claim required to trigger MLS sync' }, { status: 403 });
  }
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
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  try {
    const prisma = (await import('@/lib/prisma')).default;
    const state = await prisma.bridgeSyncState.findUnique({ where: { id: 'replication_watermark' } });

    // Queue depth requires Redis — degrade gracefully when Redis is unavailable
    let queueDepth: number | null = null;
    try {
      const { jobQueue } = await import('@/lib/queue/jobQueue');
      queueDepth = await jobQueue.depth('bridge_sync');
    } catch {
      // Redis offline — queue depth unavailable
    }

    return NextResponse.json({
      active: true,
      lastWatermark: state?.mostRecentModificationTimestamp ?? 'None',
      updatedAt: state?.updatedAt ?? 'None',
      queueDepth,
    });
  } catch (error: any) {
    console.error('[BRIDGE SYNC GET]', error?.message ?? error);
    return NextResponse.json({ error: 'Failed to retrieve sync status.' }, { status: 500 });
  }
}
