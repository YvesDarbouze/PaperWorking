import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { aggregateFinancials } from '@/lib/calculations/financials';
import { Project } from '@/types/schema';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { period } = await params;
  const searchParams = request.nextUrl.searchParams;
  const orgId = searchParams.get('organizationId');

  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
  }

  // Ensure the authenticated user belongs to the requested organization
  const userSnap = await adminDb.collection('users').doc(auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.organizationId !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Define date range based on period
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'yearly':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  // 1.5 Handle external Bridge API performance data if requested
  const source = searchParams.get('source');
  if (source === 'bridge' && period === 'quarterly') {
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString());
    const q = parseInt(searchParams.get('q') || Math.ceil((now.getMonth() + 1) / 3).toString()) as 1 | 2 | 3 | 4;

    try {
      const { getQuarterlyPerformance } = await import('@/lib/services/mlsService');
      const bridgeMetrics = await getQuarterlyPerformance(year, q);

      return NextResponse.json({
        period: 'quarterly',
        source: 'bridge',
        description: `Market performance for ${year} Q${q}`,
        data: bridgeMetrics,
        timestamp: now.toISOString()
      });
    } catch (err) {
      console.error('⚠️ [REPORTS] Bridge reporting failed, falling back to internal metrics:', err);
    }
  }

  try {
    // 1. Fetch projects for the organization created within the start date
    // Note: We use .where('organizationId', '==', orgId) for multi-tenant isolation
    const snapshot = await adminDb
      .collection('projects')
      .where('organizationId', '==', orgId)
      .where('createdAt', '>=', startDate)
      .get();

    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as unknown as (Project & { createdAt: any })[];

    // 2. Extract financials from each deal for aggregation
    const financialsList = projects.map(deal => ({
      purchasePrice: deal.financials?.purchasePrice || 0,
      salePrice: (deal.status === 'Sold' ? deal.financials?.actualSalePrice : 0) || 0,
      closingCosts: deal.financials?.finalClosingCosts || 0,
      renovationCosts: (deal.financials?.costs || []).reduce((sum, c) => sum + (c.amount || 0), 0),
      holdingCosts: 0, // Logic for holding costs aggregation can be expanded here
    }));

    const summary = aggregateFinancials(financialsList);

    return NextResponse.json({
      period,
      count: projects.length,
      summary,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Report generation failure:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
