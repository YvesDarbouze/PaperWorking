import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { computeScheduleE } from '@/lib/tax/scheduleE';
import { computeProjectProfitAndLoss } from '@/lib/tax/profitAndLoss';
import { aggregatePortfolioProfitAndLoss, aggregateScheduleE } from '@/lib/tax/portfolioSummary';
import { Project, LedgerItem } from '@/types/schema';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Valid token is required' }, { status: 400 });
    }

    // 1. Fetch and verify shareToken
    const shareRef = adminDb.collection('taxShares').doc(token);
    const shareDoc = await shareRef.get();

    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share link not found or invalid' }, { status: 404 });
    }

    const shareData = shareDoc.data();
    if (!shareData) {
      return NextResponse.json({ error: 'Share link data is empty' }, { status: 404 });
    }
    if (shareData.revoked) {
      return NextResponse.json({ error: 'This share link has been revoked' }, { status: 403 });
    }

    const expiresAt = shareData.expiresAt?.toDate?.() || new Date(shareData.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 403 });
    }

    const { taxYear, projectIds } = shareData;

    // 2. Fetch projects data
    const projects: Project[] = [];
    for (const pid of projectIds) {
      const doc = await adminDb.collection('projects').doc(pid).get();
      if (doc.exists) {
        projects.push({ id: doc.id, ...doc.data() } as Project);
      }
    }

    // 3. Fetch ledger items
    const allLedgerItems: Record<string, LedgerItem[]> = {};
    for (const project of projects) {
      const ledgerSnap = await adminDb
        .collection('projects')
        .doc(project.id)
        .collection('ledgerItems')
        .get();

      allLedgerItems[project.id] = ledgerSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LedgerItem[];
    }

    // 4. Compute Schedule E & P&L
    const schedEPreviews = projects.map((p) =>
      computeScheduleE(p, allLedgerItems[p.id] || [], taxYear)
    );
    const aggregatedSchedE = aggregateScheduleE(schedEPreviews, taxYear);

    const plReports = projects.map((p) =>
      computeProjectProfitAndLoss(p, allLedgerItems[p.id] || [], taxYear)
    );
    const aggregatedPL = aggregatePortfolioProfitAndLoss(plReports, taxYear);

    return NextResponse.json({
      success: true,
      taxYear,
      previews: schedEPreviews,
      aggregatedSchedE,
      plReports,
      aggregatedPL,
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tax share GET token] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to retrieve tax share data', details: errMsg },
      { status: 500 }
    );
  }
}
