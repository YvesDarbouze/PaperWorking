import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useDealStore } from '@/store/dealStore';
import { PropertyDeal } from '@/types/schema';

/**
 * Hook to maintain real-time bidirectional synchronization
 * between Firestore and the local Zustand Engine Room store.
 */
export function useDealSync(dealId: string) {
  const setDeal = useDealStore((state) => state.setDeal);
  const currentDeal = useDealStore((state) => state.currentDeal);
  const clearDeal = useDealStore((state) => state.clearDeal);

  useEffect(() => {
    if (!dealId) return;

    const docRef = doc(db, 'deals', dealId);

    // This creates the seamless Contractor-to-Investor Sync
    // using Firestore's WebSocket-backed onSnapshot.
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const dealData = snapshot.data() as PropertyDeal;
        
        // Optional: Alert the user if there is a new update
        // We compare existing tasks vs incoming tasks to determine if Contractor marked "Done".
        // Example logic:
        if (currentDeal && currentDeal.financials.costs.length < dealData.financials.costs.length) {
           console.log(`Notification: GC Added a new receipt/cost!`);
           // Here you could fire a toast notification UI depending on your library (e.g. react-hot-toast)
        }

        setDeal(dealData);
      } else {
        clearDeal();
      }
    }, (error) => {
      console.error("Deal Sync Error: ", error);
    });

    return () => unsubscribe();
  }, [dealId, setDeal, clearDeal]); // Excluded currentDeal to prevent infinite listener re-attachment
}
