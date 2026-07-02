import { NextResponse } from 'next/server';
import { scanAllProjectsForLifecycleAlerts } from '@/lib/notifications/lifecycleAlertEngine';

/* ═══════════════════════════════════════════════════════
   GET /api/cron/lifecycle-alerts

   Daily cron that scans all active projects for lifecycle
   deadline alerts (lease renewal, property tax, insurance,
   valuation review).

   Triggered by Vercel Cron daily at 8:00 AM UTC or an
   external scheduler.

   Security: Requires CRON_SECRET via Bearer token.
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for batch scanning

export async function GET(request: Request) {
  // ── Auth: Verify cron secret ──────────────────────────
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron/LifecycleAlerts] CRON_SECRET env var not set');
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
    // ── Scan all active projects ─────────────────────────
    const result = await scanAllProjectsForLifecycleAlerts();

    const durationMs = Date.now() - startTime;
    console.log(
      `[Cron/LifecycleAlerts] Scanned ${result.projectsScanned} projects, ` +
        `fired ${result.totalAlertsFired} alerts, ` +
        `debounced ${result.totalAlertsDebounced} in ${durationMs}ms` +
        (result.errors.length > 0 ? ` (${result.errors.length} errors)` : '')
    );

    return NextResponse.json({
      projectsScanned: result.projectsScanned,
      alertsFired: result.totalAlertsFired,
      alertsDebounced: result.totalAlertsDebounced,
      errors: result.errors,
      durationMs,
    });
  } catch (error: any) {
    console.error('[Cron/LifecycleAlerts] Fatal error:', error?.message);
    return NextResponse.json(
      { error: `Cron execution failed: ${error?.message}` },
      { status: 500 }
    );
  }
}
