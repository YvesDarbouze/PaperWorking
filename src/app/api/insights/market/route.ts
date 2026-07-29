import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { defaultMarketProvider } from '@/lib/providers/market';

// In-memory cache for market overlay data (24-hour TTL)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

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
    console.error('[Insights Market API] Token verification failed:', error);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const metric = searchParams.get('metric') || 'cap_rate'; // 'cap_rate', 'rent', 'dom'

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  // Cache lookup
  const cacheKey = `market_${projectId}_${metric}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Fetch project from Firestore to check access and get ZIP code
    const projDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projDoc.exists) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    const project = projDoc.data();
    if (project?.organizationId !== orgId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const zipCode = project?.zip || project?.zipCode || (project?.address ? project.address.match(/\b\d{5}\b/)?.[0] : null);
    if (!zipCode) {
      return NextResponse.json({ success: false, error: 'Project does not have a valid ZIP code' }, { status: 400 });
    }

    // 2. Fetch market stats from provider
    let marketStats: any = null;
    try {
      marketStats = await defaultMarketProvider.getMarketStats(zipCode);
    } catch (err) {
      console.warn(`[Market API] Failed to fetch market stats for zip ${zipCode}:`, err);
    }

    // 3. Fetch project's monthly snapshots
    const snapshotsSnap = await adminDb.collection('propertyMetricSnapshots')
      .where('projectId', '==', projectId)
      .where('periodType', '==', 'monthly')
      .get();

    // Chronological quarterly bins (8 quarters = last 24 months)
    const quarters: string[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const year = d.getFullYear();
      const q = Math.floor(d.getMonth() / 3) + 1;
      quarters.push(`${year}-Q${q}`);
    }

    // Grouping helper
    const getQuarterKey = (monthStr: string): string => {
      // monthStr is YYYY-MM
      const parts = monthStr.split('-');
      if (parts.length < 2) return '';
      const year = parts[0];
      const mVal = parseInt(parts[1], 10);
      const q = Math.floor((mVal - 1) / 3) + 1;
      return `${year}-Q${q}`;
    };

    // Project data mapping
    const projectValues = new Map<string, number[]>();
    for (const q of quarters) {
      projectValues.set(q, []);
    }

    snapshotsSnap.docs.forEach((doc: any) => {
      const d = doc.data();
      const qKey = getQuarterKey(d.period);
      if (projectValues.has(qKey)) {
        let val: number | null = null;
        if (metric === 'cap_rate') {
          val = d.capRate;
        } else if (metric === 'rent') {
          val = d.grossRentalIncome || d.averageRentPrice || null;
        } else if (metric === 'dom') {
          val = d.daysOnMarket;
        }

        if (val !== null && val !== undefined && !isNaN(val)) {
          projectValues.get(qKey)!.push(val);
        }
      }
    });

    const projectSeries = quarters.map(q => {
      const vals = projectValues.get(q)!;
      if (vals.length === 0) return null;
      const sum = vals.reduce((s, v) => s + v, 0);
      return Math.round((sum / vals.length) * 100) / 100;
    });

    // Market data mapping
    const marketValues = new Map<string, number[]>();
    for (const q of quarters) {
      marketValues.set(q, []);
    }

    if (marketStats) {
      const rentHist = marketStats.rentalData?.history || {};
      const saleHist = marketStats.saleData?.history || {};

      // Union of month keys
      const monthsSet = new Set<string>([...Object.keys(rentHist), ...Object.keys(saleHist)]);

      monthsSet.forEach(m => {
        const qKey = getQuarterKey(m);
        if (marketValues.has(qKey)) {
          let val: number | null = null;
          
          if (metric === 'cap_rate') {
            const avgRent = rentHist[m]?.averagePrice || rentHist[m]?.medianPrice || null;
            const avgSale = saleHist[m]?.averagePrice || saleHist[m]?.medianPrice || null;
            if (avgRent && avgSale && avgSale > 0) {
              val = (avgRent * 12 / avgSale) * 100;
            }
          } else if (metric === 'rent') {
            val = rentHist[m]?.averagePrice || rentHist[m]?.medianPrice || null;
          } else if (metric === 'dom') {
            val = rentHist[m]?.averageDaysOnMarket || rentHist[m]?.medianDaysOnMarket || null;
          }

          if (val !== null && val !== undefined && !isNaN(val)) {
            marketValues.get(qKey)!.push(val);
          }
        }
      });
    }

    const marketSeries = quarters.map(q => {
      const vals = marketValues.get(q)!;
      if (vals.length === 0) return null;
      const sum = vals.reduce((s, v) => s + v, 0);
      return Math.round((sum / vals.length) * 100) / 100;
    });

    const resPayload = {
      quarters,
      projectSeries,
      marketSeries,
    };

    // Cache the result
    cache.set(cacheKey, {
      data: resPayload,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return NextResponse.json(resPayload);

  } catch (err: any) {
    console.error('[Market Overlay API] Failure:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
