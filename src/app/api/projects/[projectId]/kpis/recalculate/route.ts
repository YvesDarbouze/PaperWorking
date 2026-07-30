import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { KpiAutoReporter } from '@/lib/kpis/kpiAutoReporter';

/**
 * POST /api/projects/:projectId/kpis/recalculate
 *
 * Triggers a complete recalculation of all 33 investment KPIs for a project.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { projectId } = params;
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  try {
    const kpis = await KpiAutoReporter.recalculateAllProjectKpis(projectId);
    return NextResponse.json({ success: true, projectId, kpis });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/projects/${projectId}/kpis/recalculate] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
