import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { parseDateSafe } from '@/lib/utils/taxService';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 100;

export interface ReportTransaction {
  date: string;
  label: string;
  category: string;
  amount: number;
  projectId: string;
  project: string;
  source: 'ledger' | 'legacy';
}

export interface ReportTotals {
  totalTransactions: number;
  totalExpenses: number;
  totalRevenue: number;
  netFlow: number;
}

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

  // Membership-scoped access check: only members of the org may read its reports
  const userSnap = await adminDb.collection('users').doc(auth.uid).get();
  const profile = userSnap.exists ? userSnap.data() : null;
  let hasAccess = false;
  if (profile) {
    if (profile.personalOrganizationId === orgId) hasAccess = true;
    else if (profile.organizationId === orgId) hasAccess = true;
    else if (profile.memberships?.[orgId]) hasAccess = true;
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'monthly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'yearly':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return NextResponse.json(
        { error: 'Invalid period. Use monthly, quarterly, or yearly.' },
        { status: 400 }
      );
  }

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE))));

  try {
    // Fetch all org projects; no date filter on the project itself — ledger items
    // carry their own dates and a project created before the window can still have
    // transactions inside it.
    const projectsSnap = await adminDb
      .collection('projects')
      .where('organizationId', '==', orgId)
      .get();

    const allTransactions: ReportTransaction[] = [];

    for (const projectDoc of projectsSnap.docs) {
      const projectData = projectDoc.data();
      const projectId = projectDoc.id;
      const projectName = projectData.propertyName || projectData.address || projectId;

      // ── Source 1: ledgerItems sub-collection (Approved items in the window) ──
      const ledgerSnap = await adminDb
        .collection('projects')
        .doc(projectId)
        .collection('ledgerItems')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', now)
        .get();

      for (const doc of ledgerSnap.docs) {
        const item = doc.data();
        if (item.status !== 'Approved') continue;

        const itemDate: Date | null = item.createdAt?.toDate
          ? item.createdAt.toDate()
          : parseDateSafe(item.createdAt);
        if (!itemDate) continue;

        allTransactions.push({
          date: itemDate.toISOString(),
          label: item.description || item.name || 'Unlabeled',
          category: item.category || 'Other',
          amount: item.amount ?? 0,
          projectId,
          project: projectName,
          source: 'ledger',
        });
      }

      // ── Source 2: legacy financials.costs array (approved items in the window) ──
      const legacyCosts: any[] = projectData.financials?.costs ?? [];
      for (const cost of legacyCosts) {
        if (!cost.approved) continue;
        const costDate = parseDateSafe(cost.createdAt);
        if (!costDate || costDate < startDate || costDate > now) continue;

        allTransactions.push({
          date: costDate.toISOString(),
          label: cost.description || cost.name || 'Unlabeled',
          category: cost.category || 'Other',
          amount: cost.amount ?? 0,
          projectId,
          project: projectName,
          source: 'legacy',
        });
      }
    }

    // Most-recent first
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Compute totals from the full untruncated set
    const totalExpenses = allTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totals: ReportTotals = {
      totalTransactions: allTransactions.length,
      totalExpenses,
      totalRevenue: 0,
      netFlow: -totalExpenses,
    };

    // Paginate transaction lines only — totals always reflect the full period
    const totalCount = allTransactions.length;
    const pages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;
    const transactions = allTransactions.slice(offset, offset + limit);

    return NextResponse.json({
      period,
      periodStart: startDate.toISOString(),
      periodEnd: now.toISOString(),
      totals,
      transactions,
      count: totalCount,
      page,
      pages,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[reports] Report generation failure:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
