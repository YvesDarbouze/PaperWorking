import { NextResponse } from 'next/server';
import { deriveAllProjectMetrics } from '@/lib/metrics';
import { canonicalSeedDeal } from '@/lib/metrics/fixtures/canonical-seed-deal';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    // Mock project list (in production queries Firestore / Prisma)
    const projects = [
      { id: 'proj_demo_1', name: 'Golden Oak Apartments' },
      { id: 'proj_demo_2', name: 'Sunset Ridge Heights' },
    ];

    const projectMetrics = await Promise.all(
      projects.map(p => deriveAllProjectMetrics(p.id, { mockData: canonicalSeedDeal }))
    );

    // Rollup portfolio-level aggregation
    const totalActiveProjects = projects.length;
    const totalPortfolioValue = projectMetrics.reduce((sum, p) => sum + 279000, 0);
    const totalCashInvested = projectMetrics.reduce((sum, p) => sum + 55800, 0);
    const portfolioNoi = projectMetrics.reduce((sum, p) => sum + (p.scorecard.noi.value || 0), 0);
    const portfolioCashFlow = projectMetrics.reduce((sum, p) => sum + (p.scorecard.cashFlow.value || 0), 0);
    const weightedCapRate = totalPortfolioValue > 0 ? (portfolioNoi / totalPortfolioValue) * 100 : 0;

    return NextResponse.json({
      success: true,
      period,
      portfolio: {
        totalActiveProjects,
        totalPortfolioValue,
        totalCashInvested,
        portfolioNoi,
        portfolioCashFlow,
        portfolioCapRate: Number(weightedCapRate.toFixed(2)),
      },
      projectMetrics,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
