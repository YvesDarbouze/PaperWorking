import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import prisma from '@/lib/prisma';

// In-memory cache for trends (1-hour TTL)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let userId: string;
  let orgId: string;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    userId = decoded.uid;
    orgId = decoded.organizationId || 'org_paperworking_seed';
  } catch (error) {
    console.error('[Insights Trends API] Token verification failed:', error);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const metric = searchParams.get('metric') || 'noi';
  const projectId = searchParams.get('projectId') || null;

  // Cache lookup
  const cacheKey = `trends_${orgId}_${projectId || 'portfolio'}_${metric}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Fetch user's project list to ensure proper tenant/org isolation
    let projectIds: string[] = [];
    if (projectId) {
      const projSnap = await adminDb.collection('projects').doc(projectId).get();
      if (!projSnap.exists) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      }
      const projData = projSnap.data();
      if (projData?.organizationId !== orgId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      projectIds = [projectId];
    } else {
      const projectsSnap = await adminDb.collection('projects')
        .where('organizationId', '==', orgId)
        .get();
      projectIds = projectsSnap.docs.map(doc => doc.id);
    }

    // Generate chronological monthly keys for the last 24 months (e.g. 2024-06 to 2026-05)
    const months: string[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${mStr}`);
    }

    let finalData: { date: string; value: number }[] = [];

    if (metric === 'occupancy') {
      // Query propertyMetricSnapshots from Firestore
      let queryRef: any = adminDb.collection('propertyMetricSnapshots')
        .where('periodType', '==', 'monthly');

      if (projectId) {
        queryRef = queryRef.where('projectId', '==', projectId);
      } else {
        queryRef = queryRef.where('organizationId', '==', orgId);
      }

      const snap = await queryRef.get();
      const grouped = new Map<string, { totalWeight: number; weightedSum: number; counts: number; sum: number }>();
      
      // Initialize groups for all 24 months
      for (const m of months) {
        grouped.set(m, { totalWeight: 0, weightedSum: 0, counts: 0, sum: 0 });
      }

      snap.docs.forEach((doc: any) => {
        const d = doc.data();
        const m = d.period; // YYYY-MM
        if (grouped.has(m) && d.occupancyRate !== undefined && d.occupancyRate !== null) {
          const occ = Number(d.occupancyRate);
          const weight = Number(d.propertyValue || d.totalCashInvested || 1);
          const grp = grouped.get(m)!;
          grp.weightedSum += occ * weight;
          grp.totalWeight += weight;
          grp.sum += occ;
          grp.counts += 1;
        }
      });

      finalData = months.map(m => {
        const grp = grouped.get(m)!;
        let value = 100.0; // Default to 100% if no data is found for the month
        if (projectId) {
          if (grp.counts > 0) {
            value = grp.sum / grp.counts;
          }
        } else {
          if (grp.totalWeight > 0) {
            value = grp.weightedSum / grp.totalWeight;
          } else if (grp.counts > 0) {
            value = grp.sum / grp.counts;
          }
        }
        return { date: m, value: Math.round(value * 10) / 10 };
      });

    } else {
      // Transaction-based metrics: noi, cash_flow, revenue, expenses
      if (projectIds.length === 0) {
        finalData = months.map(m => ({ date: m, value: 0 }));
      } else {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 24);

        const txs = await prisma.transaction.findMany({
          where: {
            projectId: { in: projectIds },
            date: { gte: startDate },
          },
          orderBy: { date: 'asc' },
        });

        // Initialize maps
        const rentMap = new Map<string, number>();
        const opexMap = new Map<string, number>();
        const allExpensesMap = new Map<string, number>();

        for (const m of months) {
          rentMap.set(m, 0);
          opexMap.set(m, 0);
          allExpensesMap.set(m, 0);
        }

        const opexCategories = ['hoa_fees', 'insurance', 'property_tax', 'maintenance', 'utilities', 'property_management'];
        const allExpenseCategories = [...opexCategories, 'debt_service', 'rehab_staging', 'closing_costs', 'unknown'];

        txs.forEach(t => {
          const dateObj = new Date(t.date);
          const year = dateObj.getFullYear();
          const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
          const m = `${year}-${mStr}`;

          if (rentMap.has(m)) {
            const amountVal = Math.abs(Number(t.amount)) / 100;
            const category = t.reiCategory || 'unknown';

            if (category === 'rental_income') {
              rentMap.set(m, rentMap.get(m)! + amountVal);
            } else if (opexCategories.includes(category)) {
              opexMap.set(m, opexMap.get(m)! + amountVal);
              allExpensesMap.set(m, allExpensesMap.get(m)! + amountVal);
            } else if (allExpenseCategories.includes(category)) {
              allExpensesMap.set(m, allExpensesMap.get(m)! + amountVal);
            }
          }
        });

        finalData = months.map(m => {
          const rents = rentMap.get(m)!;
          const opex = opexMap.get(m)!;
          const expenses = allExpensesMap.get(m)!;

          let val = 0;
          if (metric === 'noi') {
            val = rents - opex;
          } else if (metric === 'cash_flow') {
            val = rents - expenses;
          } else if (metric === 'revenue') {
            val = rents;
          } else if (metric === 'expenses') {
            val = opex;
          }

          return { date: m, value: Math.round(val) };
        });
      }
    }

    const resPayload = finalData;

    // Cache the result
    cache.set(cacheKey, {
      data: resPayload,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return NextResponse.json(resPayload);

  } catch (err: any) {
    console.error('[Trends API] Failure:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
