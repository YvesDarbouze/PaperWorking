import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════════════
   propertyMetricHistory — Guest Portal metric helpers

   Reads monthly propertyMetricSnapshots for chart series and
   computes raise progress from the commitments subcollection.
   ═══════════════════════════════════════════════════════════════ */

export type MetricHistoryPoint = { date: string; value: number };

export type PropertyMetricHistory = {
  noiHistory: MetricHistoryPoint[];
  capRateHistory: MetricHistoryPoint[];
  cashFlowHistory: MetricHistoryPoint[];
};

const RAISE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function toDate(value: unknown): Date {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value) return new Date(value as string | number);
  return new Date();
}

export async function fetchPropertyMetricHistory(
  projectId: string,
): Promise<PropertyMetricHistory> {
  const empty: PropertyMetricHistory = {
    noiHistory: [],
    capRateHistory: [],
    cashFlowHistory: [],
  };

  if (!projectId) return empty;

  try {
    const snapshotsSnap = await adminDb
      .collection('propertyMetricSnapshots')
      .where('projectId', '==', projectId)
      .where('periodType', '==', 'monthly')
      .get();

    if (snapshotsSnap.empty) return empty;

    const sortedDocs = snapshotsSnap.docs
      .map((doc) => {
        const d = doc.data();
        const rawDate = d.date;
        let dateObj: Date;

        if (rawDate?.toDate) {
          dateObj = rawDate.toDate();
        } else if (rawDate) {
          dateObj = new Date(rawDate);
        } else {
          dateObj = new Date(`${d.period}-01T00:00:00Z`);
        }

        const dateStr = !Number.isNaN(dateObj.getTime())
          ? dateObj.toISOString().split('T')[0]
          : `${d.period}-01`;

        return {
          date: dateStr,
          period: d.period as string,
          noi: d.noi ?? null,
          capRate: d.capRate ?? null,
          monthlyCashFlow: d.monthlyCashFlow ?? null,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      noiHistory: sortedDocs
        .filter((row) => row.noi !== null)
        .map((row) => ({ date: row.date, value: row.noi as number })),
      capRateHistory: sortedDocs
        .filter((row) => row.capRate !== null)
        .map((row) => ({ date: row.date, value: row.capRate as number })),
      cashFlowHistory: sortedDocs
        .filter((row) => row.monthlyCashFlow !== null)
        .map((row) => ({ date: row.date, value: row.monthlyCashFlow as number })),
    };
  } catch (error) {
    console.error('[propertyMetricHistory] Failed to fetch snapshots:', error);
    return empty;
  }
}

export async function computeRaiseProgress(
  projectId: string,
  raiseTarget: number,
): Promise<{ raiseRaised: number; raisePercentage: number }> {
  const snap = await adminDb
    .collection('projects')
    .doc(projectId)
    .collection('commitments')
    .get();

  const raiseRaisedCents = snap.docs.reduce((sum, doc) => {
    const status = doc.data().status as string;
    if (status === 'pledged' || status === 'transferred' || status === 'cleared') {
      return sum + (doc.data().amountCents || 0);
    }
    return sum;
  }, 0);

  const raiseRaised = raiseRaisedCents / 100;
  const raisePercentage =
    raiseTarget > 0 ? Math.min(Math.round((raiseRaised / raiseTarget) * 100), 100) : 0;

  return { raiseRaised, raisePercentage };
}

export function computeRaiseCountdown(createdAt: unknown): {
  daysLeft: number;
  hoursLeft: number;
} {
  const created = toDate(createdAt);
  const remainingMs = Math.max(0, RAISE_WINDOW_MS - (Date.now() - created.getTime()));

  return {
    daysLeft: Math.floor(remainingMs / (24 * 60 * 60 * 1000)),
    hoursLeft: Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
  };
}
