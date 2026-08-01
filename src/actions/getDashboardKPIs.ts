'use server';

import { cookies } from 'next/headers';
import { calculatePortfolioSummary } from '@/lib/analyticsUtils';
import type { Project } from '@/types/schema';
import { prisma } from '@/lib/prisma';


/* ═══════════════════════════════════════════════════════
   getDashboardKPIs — Server Action

   Server-side KPI prefetch so the Dashboard Home renders
   with data on first paint (no flash of empty).
   
   Flow:
     1. Read __session cookie
     2. Verify via Admin SDK → extract UID
     3. Look up user's organizationId
     4. Query all projects for that org
     5. Run calculatePortfolioSummary() server-side (Firestore)
     6. Query prisma.transaction for live Plaid bank-feed KPIs
     7. Merge and return serializable result
   ═══════════════════════════════════════════════════════ */

/** REI categories that roll up to Operating Expenses */
const OPEX_CATEGORIES = [
  'maintenance',
  'utilities',
  'property_management',
  'insurance',
  'hoa_fees',
] as const;

/** Query Plaid transaction aggregations for the current calendar month */
async function getPlaidKPIs(uid: string): Promise<{
  rentalIncomeMtd: number;
  debtServiceMtd: number;
  operatingExpensesMtd: number;
  unattributedTxCount: number;
}> {
  const empty = { rentalIncomeMtd: 0, debtServiceMtd: 0, operatingExpensesMtd: 0, unattributedTxCount: 0 };

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run aggregations in parallel
    const [rentalAgg, debtAgg, opexAgg, unattributedCount] = await Promise.all([
      // Rental income: negative amount in Plaid convention (money in)
      prisma.transaction.aggregate({
        where: { userId: uid, reiCategory: 'rental_income', date: { gte: monthStart }, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      // Debt service: positive amount (money out)
      prisma.transaction.aggregate({
        where: { userId: uid, reiCategory: 'debt_service', date: { gte: monthStart }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      // Operating expenses: positive amount (money out)
      prisma.transaction.aggregate({
        where: { userId: uid, reiCategory: { in: OPEX_CATEGORIES as unknown as string[] }, date: { gte: monthStart }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      // Unattributed transactions (not yet assigned to a project)
      prisma.transaction.count({
        where: { userId: uid, projectId: null },
      }),
    ]);

    return {
      // Amounts stored in cents; negate rental income (negative = money in → positive display)
      rentalIncomeMtd: Math.abs(Number(rentalAgg._sum.amount ?? 0)),
      debtServiceMtd: Number(debtAgg._sum.amount ?? 0),
      operatingExpensesMtd: Number(opexAgg._sum.amount ?? 0),
      unattributedTxCount: unattributedCount,
    };
  } catch (err) {
    // Prisma not available or table doesn't exist yet — fail gracefully
    console.warn('[getDashboardKPIs] Plaid KPI aggregation skipped:', (err as Error).message?.slice(0, 120));
    return empty;
  }
}

export interface DashboardKPIResult {
  avgGrossProfit: number;
  avgROI: number;
  medianResalePrice: number;
  activeCapitalDeployed: number;
  soldCount: number;
  activeCount: number;
  totalPortfolioValue: number;
  // Plaid-sourced live bank-feed KPIs (current calendar month, in cents)
  rentalIncomeMtd: number;
  debtServiceMtd: number;
  operatingExpensesMtd: number;
  unattributedTxCount: number;
}

const EMPTY_KPIS: DashboardKPIResult = {
  avgGrossProfit: 0,
  avgROI: 0,
  medianResalePrice: 0,
  activeCapitalDeployed: 0,
  soldCount: 0,
  activeCount: 0,
  totalPortfolioValue: 0,
  rentalIncomeMtd: 0,
  debtServiceMtd: 0,
  operatingExpensesMtd: 0,
  unattributedTxCount: 0,
};

function hasAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export async function getDashboardKPIs(): Promise<DashboardKPIResult> {
  if (!hasAdminCredentials()) {
    return EMPTY_KPIS;
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session');

    if (!sessionCookie?.value) {
      return EMPTY_KPIS;
    }

    const { adminAuth, adminDb } = await import('@/lib/firebase/admin');
    const decoded = await adminAuth.verifyIdToken(sessionCookie.value);

    if (!decoded.uid) {
      return EMPTY_KPIS;
    }

    // Fetch the user's organizationId
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userSnap.data();
    const orgId = userData?.organizationId;

    if (!orgId || orgId === 'org_placeholder') {
      return EMPTY_KPIS;
    }

    // Fetch all projects for this organization
    const projectsSnap = await adminDb
      .collection('projects')
      .where('organizationId', '==', orgId)
      .get();

    const projects: Project[] = projectsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];

    // Run the shared analytics engine server-side (Firestore)
    const summary = calculatePortfolioSummary(projects);

    // Fetch live bank-feed KPIs from Prisma (Plaid transactions)
    const plaidKPIs = await getPlaidKPIs(decoded.uid);

    return {
      avgGrossProfit: summary.avgGrossProfit,
      avgROI: summary.avgROI,
      medianResalePrice: summary.medianResalePrice,
      activeCapitalDeployed: summary.activeCapitalDeployed,
      soldCount: summary.soldCount,
      activeCount: summary.activeCount,
      totalPortfolioValue: summary.totalPortfolioValue,
      ...plaidKPIs,
    };
  } catch (error) {
    console.error('[getDashboardKPIs] Server action failed:', error);
    return EMPTY_KPIS;
  }
}
