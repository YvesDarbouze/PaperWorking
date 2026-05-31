import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { writeMetricSnapshotsBatch } from '@/lib/firebase/snapshotWriter';

/* ═══════════════════════════════════════════════════════
   GET /api/cron/snapshots

   Nightly cron that recomputes metric snapshots for all
   active projects. Triggered by Vercel Cron at 2:00 AM UTC
   or an external scheduler.

   Security: Requires CRON_SECRET via Bearer token.
   Rate limit: Max 100 projects per invocation.
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for batch processing

const MAX_PROJECTS_PER_RUN = 100;

export async function GET(request: Request) {
  // ── Auth: Verify cron secret ──────────────────────────
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron/Snapshots] CRON_SECRET env var not set');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // ── Query active projects ─────────────────────────────
    //    Exclude archived projects to avoid wasting compute.
    //    Firestore doesn't support != queries well, so we query
    //    all and filter in-memory (projects collection is typically < 1000).
    const projectsSnap = await adminDb
      .collection('projects')
      .select() // metadata-only — we don't need field data here
      .limit(MAX_PROJECTS_PER_RUN * 2) // over-fetch to account for filtered-out projects
      .get();

    // Filter out archived projects
    const projectIds: string[] = [];
    for (const doc of projectsSnap.docs) {
      const data = doc.data();
      const status = (data?.status ?? '').toLowerCase();
      if (status !== 'archived') {
        projectIds.push(doc.id);
      }
      if (projectIds.length >= MAX_PROJECTS_PER_RUN) break;
    }

    if (projectIds.length === 0) {
      return NextResponse.json({
        projectsProcessed: 0,
        snapshotsWritten: 0,
        errors: [],
        durationMs: Date.now() - startTime,
      });
    }

    // ── Batch-process snapshots ───────────────────────────
    const result = await writeMetricSnapshotsBatch(projectIds);

    const durationMs = Date.now() - startTime;
    console.log(
      `[Cron/Snapshots] Processed ${result.projectsProcessed} projects, wrote ${result.snapshotsWritten} snapshots in ${durationMs}ms` +
        (result.errors.length > 0 ? ` (${result.errors.length} errors)` : '')
    );

    return NextResponse.json({
      ...result,
      durationMs,
    });
  } catch (error: any) {
    console.error('[Cron/Snapshots] Fatal error:', error?.message);
    return NextResponse.json(
      { error: `Cron execution failed: ${error?.message}` },
      { status: 500 }
    );
  }
}
