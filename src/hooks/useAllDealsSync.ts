import { useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useDealStore } from '@/store/dealStore';
import { PropertyDeal } from '@/types/schema';
import toast from 'react-hot-toast';

export function useAllDealsSync() {
  const setDeals = useDealStore((state) => state.setDeals);
  const deals = useDealStore((state) => state.deals);
  
  // We use a ref to track the previous costs count to know when to ping.
  // We stringify the deals to easily detect deep changes in costs across all deals.
  const prevCostsMapping = useRef<Record<string, number>>({});

  useEffect(() => {
    const dealsRef = collection(db, 'deals');

    const unsubscribe = onSnapshot(dealsRef, (snapshot) => {
      const liveDeals: PropertyDeal[] = [];

      snapshot.forEach((doc) => {
        liveDeals.push({ id: doc.id, ...doc.data() } as PropertyDeal);
      });

      // Notification Logic: Pinging the Lead Investor!
      liveDeals.forEach((d) => {
        const currentCostCount = d.financials?.costs?.length || 0;
        const prevCostCount = prevCostsMapping.current[d.id] || 0;

        if (currentCostCount > prevCostCount && Object.keys(prevCostsMapping.current).length > 0) {
           toast.success(`Contractor uploaded a new receipt for ${d.propertyName}!`, {
             style: {
               border: '1px solid #10B981',
               padding: '16px',
               color: '#065F46',
             },
             iconTheme: {
               primary: '#10B981',
               secondary: '#FFFAEE',
             },
           });
        }
        
        prevCostsMapping.current[d.id] = currentCostCount;
      });

      setDeals(liveDeals);
    }, (error) => {
      console.error("All Deals Sync Error: ", error);
    });

    return () => unsubscribe();
  }, [setDeals]);
}
