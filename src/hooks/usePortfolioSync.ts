import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { usePropertyStore } from '@/store/propertyStore';
import { PropertyAsset, FinancialTransaction } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   usePortfolioSync — Real-time Firestore Synchronization Hook

   Opens two parallel onSnapshot listeners, both scoped by
   organizationId, and pipes their data into the Zustand
   propertyStore. A user can never receive another tenant's data.

   Usage: call once at the top of any page that renders portfolio
   data. The underlying Firestore subscriptions are automatically
   cleaned up when the component unmounts.
   ═══════════════════════════════════════════════════════════════ */

export function usePortfolioSync() {
  const { profile } = useAuth();
  const setProperties = usePropertyStore((s) => s.setProperties);
  const setTransactions = usePropertyStore((s) => s.setTransactions);
  const setIsLoading = usePropertyStore((s) => s.setIsLoading);
  const setError = usePropertyStore((s) => s.setError);

  useEffect(() => {
    const orgId = profile?.organizationId;

    // Guard: hold in loading state until the auth profile resolves with
    // a real org ID. 'org_placeholder' is the transient value written
    // during the onboarding window — never query Firestore against it.
    if (!orgId || orgId === 'org_placeholder') {
      return;
    }

    setIsLoading(true);
    setError(null);

    let propertiesLoaded = false;
    let transactionsLoaded = false;

    // Helper: mark loading complete only after both listeners have
    // delivered their first snapshot.
    const checkBothLoaded = () => {
      if (propertiesLoaded && transactionsLoaded) {
        setIsLoading(false);
      }
    };

    // ── Listener 1: properties ──────────────────────────────────
    // SECURITY: where clause enforces strict tenant isolation.
    const propertiesQ = query(
      collection(db, 'properties'),
      where('organizationId', '==', orgId),
    );

    const unsubProperties = onSnapshot(
      propertiesQ,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            // Coerce Firestore Timestamps → JS Date
            purchaseDate: data.purchaseDate?.toDate?.() ?? data.purchaseDate ?? new Date(),
            createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? new Date(),
          } as PropertyAsset;
        });
        setProperties(docs);
        propertiesLoaded = true;
        checkBothLoaded();
      },
      (err) => {
        console.error('[usePortfolioSync] properties listener error:', err);
        setError(
          'Unable to load your portfolio properties. Please check your connection and try again.',
        );
        setIsLoading(false);
      },
    );

    // ── Listener 2: transactions ────────────────────────────────
    // SECURITY: same organizationId scope as above.
    const transactionsQ = query(
      collection(db, 'transactions'),
      where('organizationId', '==', orgId),
    );

    const unsubTransactions = onSnapshot(
      transactionsQ,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            // Coerce Firestore Timestamp → JS Date
            date: data.date?.toDate?.() ?? data.date ?? new Date(),
          } as FinancialTransaction;
        });
        setTransactions(docs);
        transactionsLoaded = true;
        checkBothLoaded();
      },
      (err) => {
        console.error('[usePortfolioSync] transactions listener error:', err);
        setError(
          'Unable to load your financial transactions. Please check your connection and try again.',
        );
        setIsLoading(false);
      },
    );

    // Cleanup: unsubscribe both listeners on unmount or orgId change
    return () => {
      unsubProperties();
      unsubTransactions();
    };
  }, [
    profile?.organizationId,
    setProperties,
    setTransactions,
    setIsLoading,
    setError,
  ]);
}
