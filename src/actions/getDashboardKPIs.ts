'use server';

import { cookies } from 'next/headers';
import { calculatePortfolioSummary } from '@/lib/analyticsUtils';
import type { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   getDashboardKPIs — Server Action

   Server-side KPI prefetch so the Dashboard Home renders
   with data on first paint (no flash of empty).
   
   Flow:
     1. Read __session cookie
     2. Verify via Admin SDK → extract UID
     3. Look up user's organizationId
     4. Query all projects for that org
     5. Run calculatePortfolioSummary() server-side
     6. Return serializable result
   ═══════════════════════════════════════════════════════ */

export interface DashboardKPIResult {
  avgGrossProfit: number;
  avgROI: number;
  medianResalePrice: number;
  activeCapitalDeployed: number;
  soldCount: number;
  activeCount: number;
  totalPortfolioValue: number;
}

const EMPTY_KPIS: DashboardKPIResult = {
  avgGrossProfit: 0,
  avgROI: 0,
  medianResalePrice: 0,
  activeCapitalDeployed: 0,
  soldCount: 0,
  activeCount: 0,
  totalPortfolioValue: 0,
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

    // Run the shared analytics engine server-side
    const summary = calculatePortfolioSummary(projects);

    return {
      avgGrossProfit: summary.avgGrossProfit,
      avgROI: summary.avgROI,
      medianResalePrice: summary.medianResalePrice,
      activeCapitalDeployed: summary.activeCapitalDeployed,
      soldCount: summary.soldCount,
      activeCount: summary.activeCount,
      totalPortfolioValue: summary.totalPortfolioValue,
    };
  } catch (error) {
    console.error('[getDashboardKPIs] Server action failed:', error);
    return EMPTY_KPIS;
  }
}
