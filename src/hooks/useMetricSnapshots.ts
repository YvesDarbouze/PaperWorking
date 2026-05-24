import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { MetricSnapshot } from '@/types/schema';

export function useMetricSnapshots(daysLimit: number = 15) {
  const { profile } = useAuth();
  const { activeTenantId } = useTenant();
  const [snapshots, setSnapshots] = useState<MetricSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const orgId = activeTenantId;

    if (!orgId || orgId === 'org_placeholder') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const snapshotsQ = query(
      collection(db, 'organizations', orgId, 'metricSnapshots'),
      orderBy('date', 'desc'),
      limit(daysLimit)
    );

    const unsubscribe = onSnapshot(
      snapshotsQ,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            date: data.date?.toDate?.() ?? data.date ?? new Date(),
            createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
          } as MetricSnapshot;
        });
        
        // Reverse so that oldest is first, which is standard for charts (left-to-right timeline)
        setSnapshots(docs.reverse());
        setLoading(false);
      },
      (err) => {
        console.error('[useMetricSnapshots] listener error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTenantId, daysLimit]);

  return { snapshots, loading, error };
}
