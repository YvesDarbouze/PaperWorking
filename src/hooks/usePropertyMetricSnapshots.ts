import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PropertyMetricSnapshot } from '@/types/schema';

/**
 * A client hook to retrieve time-series snapshots for a specific project.
 * Filters by periodType in memory and sorts chronologically to avoid composite index requirements.
 * 
 * @param projectId - The unique identifier of the project.
 * @param periodType - Optional filter for the type of period ('monthly' | 'quarterly' | 'annual').
 */
export function usePropertyMetricSnapshots(
  projectId: string | undefined,
  periodType?: 'monthly' | 'quarterly' | 'annual'
) {
  const [snapshots, setSnapshots] = useState<PropertyMetricSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) {
      setSnapshots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'propertyMetricSnapshots'),
      where('projectId', '==', projectId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            date: data.date?.toDate?.() ?? data.date ?? new Date(),
            createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
          } as PropertyMetricSnapshot;
        });

        // Filter by periodType if specified
        const filteredDocs = periodType
          ? docs.filter((doc) => doc.periodType === periodType)
          : docs;

        // Sort chronologically (ascending by date)
        const sortedDocs = filteredDocs.sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          if (timeA !== timeB) return timeA - timeB;
          // Fallback to period string comparison
          return a.period.localeCompare(b.period);
        });

        setSnapshots(sortedDocs);
        setLoading(false);
      },
      (err) => {
        console.error('[usePropertyMetricSnapshots] listener error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId, periodType]);

  return { snapshots, loading, error };
}
