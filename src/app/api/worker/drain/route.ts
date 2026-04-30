import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/worker/drain
 *
 * Triggered by an external scheduler (Vercel Cron, Firebase Scheduler, curl).
 * Processes up to `batchSize` jobs per queue type per invocation.
 *
 * Protected by a shared secret in the Authorization header:
 *   Authorization: Bearer <WORKER_SECRET>
 *
 * Returns a summary of what was processed / failed so the scheduler can
 * alert on repeated failures.
 */
export async function POST(req: NextRequest) {
  const workerSecret = process.env.WORKER_SECRET;

  if (workerSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${workerSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { drainAll } = await import('@/lib/queue/jobConsumer');
    const { jobQueue } = await import('@/lib/queue/jobQueue');

    const batchSize = Number(req.nextUrl.searchParams.get('batch') ?? '5');
    const results = await drainAll(Math.min(batchSize, 20));

    const depths = {
      bridge_sync: await jobQueue.depth('bridge_sync'),
      webhook_process: await jobQueue.depth('webhook_process'),
    };

    return NextResponse.json({ ok: true, results, remaining: depths });
  } catch (error: any) {
    console.error('❌ [WORKER DRAIN] Uncaught error:', error);
    return NextResponse.json({ error: 'drain_failed', detail: error.message }, { status: 500 });
  }
}

/**
 * GET /api/worker/drain
 * Returns current queue depths without processing anything — useful for monitoring.
 */
export async function GET(req: NextRequest) {
  const workerSecret = process.env.WORKER_SECRET;

  if (workerSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${workerSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { jobQueue } = await import('@/lib/queue/jobQueue');
    const dlq = await jobQueue.peekDlq(5);

    return NextResponse.json({
      depths: {
        bridge_sync: await jobQueue.depth('bridge_sync'),
        webhook_process: await jobQueue.depth('webhook_process'),
      },
      dlq: { count: dlq.length, sample: dlq },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'status_failed', detail: error.message }, { status: 500 });
  }
}
