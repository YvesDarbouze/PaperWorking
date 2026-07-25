import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { METRICS_REGISTRY, MetricRegistryEntry, computeSingleMetricNullReason } from '@/lib/metrics/metricRegistry';
import prisma from '@/lib/prisma';

// Simple in-memory cache
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

function getBenchmarkColor(entry: MetricRegistryEntry, value: number | null): 'good' | 'warning' | 'bad' | 'none' {
  if (value === null || isNaN(value)) return 'none';
  const { good, warning, bad } = entry.benchmark;

  if (good === null && warning === null && bad === null) return 'none';

  const lowerIsBetter = [
    'grm',
    'ltv',
    'oer',
    'tenant_turnover',
    'days_on_market',
    'maintenance_per_unit',
    'risk_score'
  ].includes(entry.id);

  if (lowerIsBetter) {
    if (good !== null && value <= good) return 'good';
    if (warning !== null && value <= warning) return 'warning';
    return 'bad';
  } else {
    if (good !== null && value >= good) return 'good';
    if (warning !== null && value >= warning) return 'warning';
    return 'bad';
  }
}

async function getTrendForMetric(
  metricId: string,
  currentValue: number | null,
  projectId: string | null,
  orgId: string
): Promise<'up' | 'down' | 'flat' | null> {
  if (currentValue === null || isNaN(currentValue)) return null;

  try {
    const metricField = metricId.toLowerCase();
    const fieldMap: Record<string, string> = {
      cash_on_cash: 'cashOnCashReturn',
      occupancy_rate: 'occupancyRate',
    };
    const dbField = fieldMap[metricId] || metricField;

    if (projectId) {
      const snap = await adminDb.collection('propertyMetricSnapshots')
        .where('projectId', '==', projectId)
        .where('periodType', '==', 'monthly')
        .orderBy('period', 'desc')
        .limit(2)
        .get();

      if (snap.size < 2) return null;

      // Second snapshot is the previous period
      const prevSnapData = snap.docs[1].data();
      const prevValue = prevSnapData[dbField];
      if (prevValue === undefined || prevValue === null || isNaN(prevValue)) return null;

      const diff = currentValue - prevValue;
      if (Math.abs(diff) < 0.001) return 'flat';
      return diff > 0 ? 'up' : 'down';
    } else {
      // Portfolio-wide trend aggregation
      const latestPeriodSnap = await adminDb.collection('propertyMetricSnapshots')
        .where('organizationId', '==', orgId)
        .where('periodType', '==', 'monthly')
        .orderBy('period', 'desc')
        .limit(1)
        .get();

      if (latestPeriodSnap.empty) return null;
      const latestPeriod = latestPeriodSnap.docs[0].data().period;

      const prevPeriodSnap = await adminDb.collection('propertyMetricSnapshots')
        .where('organizationId', '==', orgId)
        .where('periodType', '==', 'monthly')
        .where('period', '<', latestPeriod)
        .orderBy('period', 'desc')
        .limit(1)
        .get();

      if (prevPeriodSnap.empty) return null;
      const prevPeriod = prevPeriodSnap.docs[0].data().period;

      const prevSnaps = await adminDb.collection('propertyMetricSnapshots')
        .where('organizationId', '==', orgId)
        .where('periodType', '==', 'monthly')
        .where('period', '==', prevPeriod)
        .get();

      if (prevSnaps.empty) return null;

      const validValues = prevSnaps.docs.map(doc => {
        const data = doc.data();
        const val = data[dbField];
        const weight = data.propertyValue ?? data.totalCashInvested ?? 1;
        return { val, weight };
      }).filter(item => item.val !== null && !isNaN(item.val));

      if (validValues.length === 0) return null;

      const entry = METRICS_REGISTRY.find(m => m.id === metricId);
      const isPercentOrRatio = entry?.unit === 'percent' || entry?.unit === 'ratio';
      
      let prevValue = 0;
      if (isPercentOrRatio) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const item of validValues) {
          weightedSum += item.val * item.weight;
          totalWeight += item.weight;
        }
        prevValue = totalWeight > 0 ? weightedSum / totalWeight : 0;
      } else {
        prevValue = validValues.reduce((sum, item) => sum + item.val, 0);
      }

      const diff = currentValue - prevValue;
      if (Math.abs(diff) < 0.001) return 'flat';
      return diff > 0 ? 'up' : 'down';
    }
  } catch (err) {
    console.error(`[Trend Calculation] Error for ${metricId}:`, err);
    return null;
  }
}

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
    console.error('[Insights Metrics API] Token verification failed:', error);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const projectId = searchParams.get('projectId');
  const portfolio = searchParams.get('portfolio') === 'true';
  const breakdown = searchParams.get('breakdown') === 'true';

  if (!category) {
    return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
  }

  const cacheKey = `${orgId}_${projectId || 'portfolio'}_${category}_${breakdown}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Query bank connection status
    const activeConnection = await prisma.bankConnection.findFirst({
      where: {
        userId,
        status: 'active',
      },
    });
    const hasLinkedBank = !!activeConnection;

    // 2. Fetch projects
    let projectsList: any[] = [];

    if (projectId) {
      const projSnap = await adminDb.collection('projects').doc(projectId).get();
      if (!projSnap.exists) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      }
      const projData = projSnap.data();
      if (projData?.organizationId !== orgId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      projectsList = [projData];
    } else if (portfolio) {
      const projectsSnap = await adminDb.collection('projects')
        .where('organizationId', '==', orgId)
        .get();
      projectsList = projectsSnap.docs.map(doc => doc.data());
    } else {
      return NextResponse.json({ success: false, error: 'Must specify projectId or portfolio=true' }, { status: 400 });
    }

    const filteredMetrics = METRICS_REGISTRY.filter(m => m.category === category);

    const results = await Promise.all(
      filteredMetrics.map(async entry => {
        let val: number | null = null;
        if (portfolio) {
          val = entry.compute(null, projectsList);
        } else if (projectsList.length > 0) {
          val = entry.compute(projectsList[0]);
        }

        let missingData: string | null = null;
        if (val === null) {
          let reason: string | null = null;
          if (portfolio) {
            for (const p of projectsList) {
              const r = computeSingleMetricNullReason(p, entry.id);
              if (r) {
                reason = r;
                break;
              }
            }
          } else if (projectsList.length > 0) {
            reason = computeSingleMetricNullReason(projectsList[0], entry.id);
          }

          const reasonMap: Record<string, string> = {
            REQUIRES_INCOME_LEDGER: 'rental income records',
            REQUIRES_EXPENSE_LEDGER: 'capital opex/rehab records',
            REQUIRES_TENANT_REGISTRY: 'tenant occupancy details',
            REQUIRES_SALE_RECORD: 'property sale record',
            REQUIRES_LISTING_LOG: 'property showing log',
            REQUIRES_PORTFOLIO_HISTORY: 'historical property valuation',
            REQUIRES_COMPLIANCE_CHECKLIST: 'compliance checklist items',
            MARKET_DATA_DEFERRED: 'market data',
            INCOMPLETE: 'financial parameters',
          };
          missingData = (reason && reasonMap[reason]) || 'required inputs';
        }

        const trend = await getTrendForMetric(entry.id, val, projectId, orgId);
        const benchmark = getBenchmarkColor(entry, val);

        return {
          id: entry.id,
          name: entry.name,
          category: entry.category,
          formula: entry.formula,
          unit: entry.unit,
          value: val,
          benchmark,
          trend,
          missingData,
        };
      })
    );

    let projectBreakdowns: any[] = [];
    if (breakdown) {
      projectBreakdowns = projectsList.map(proj => {
        const metricsMap: Record<string, number | null> = {};
        filteredMetrics.forEach(entry => {
          metricsMap[entry.id] = entry.compute(proj);
        });
        return {
          projectId: proj.id,
          projectName: proj.propertyName || proj.name || 'Unnamed Project',
          metrics: metricsMap
        };
      });
    }

    const payload = {
      hasLinkedBank,
      metrics: results,
      projectBreakdowns: breakdown ? projectBreakdowns : undefined,
    };

    // Save to cache
    cache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[Insights Metrics API] Error processing metrics request:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

