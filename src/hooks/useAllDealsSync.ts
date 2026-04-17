import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useDealStore } from '@/store/dealStore';
import { PropertyDeal, LedgerItem } from '@/types/schema';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export function useAllDealsSync() {
  const setDeals = useDealStore((state) => state.setDeals);
  const setLedgerItems = useDealStore((state) => state.setLedgerItems);
  const currentDeal = useDealStore((state) => state.currentDeal);
  const { profile } = useAuth();

  // Track counts to trigger notifications
  const prevLedgerCounts = useRef<Record<string, number>>({});

  // 1. Sync All Deals (Filtered by Org for security rules)
  useEffect(() => {
    if (!profile?.organizationId || profile.organizationId === 'org_placeholder') return;

    const dealsRef = collection(db, 'deals');
    const q = query(dealsRef, where('organizationId', '==', profile.organizationId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveDeals: PropertyDeal[] = [];
      snapshot.forEach((doc) => {
        liveDeals.push({ id: doc.id, ...doc.data() } as PropertyDeal);
      });
      setDeals(liveDeals);
    }, (error) => {
      console.error("All Deals Sync Error: ", error);
    });

    return () => unsubscribe();
  }, [setDeals, profile?.organizationId]);

  // 2. Sync Active Deal's Ledger (Sub-collection)
  useEffect(() => {
    if (!currentDeal?.id) return;

    const ledgerRef = collection(db, 'deals', currentDeal.id, 'ledgerItems');
    const q = query(ledgerRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Convert Firestore timestamp to JS Date for the store
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as LedgerItem));
      
      const newCount = items.length;
      const prevCount = prevLedgerCounts.current[currentDeal.id] || 0;

      // Notification Logic: New Receipt Uploaded
      if (newCount > prevCount && prevCount > 0) {
         toast.success('New ledger item recorded!', {
           icon: '📝',
           style: { background: '#111', color: '#fff', border: '1px solid #333' }
         });
      }
      
      prevLedgerCounts.current[currentDeal.id] = newCount;
      setLedgerItems(currentDeal.id, items);
    }, (error) => {
      console.error("Ledger Sync Error: ", error);
    });

    return () => unsubscribe();
  }, [currentDeal?.id, setLedgerItems]);
}
