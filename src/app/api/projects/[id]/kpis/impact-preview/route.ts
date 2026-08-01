import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { KpiAutoReporter } from '@/lib/kpis/kpiAutoReporter';

/**
 * GET /api/projects/:projectId/kpis/impact-preview?transactionId=xxx
 *
 * Previews KPI changes before approving a transaction.
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get('transactionId');

  if (!transactionId) {
    return NextResponse.json({ success: false, error: 'transactionId query parameter is required' }, { status: 400 });
  }

  try {
    const preview = await KpiAutoReporter.getImpactPreview(transactionId);
    return NextResponse.json({ success: true, preview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/projects/${params.id}/kpis/impact-preview] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
