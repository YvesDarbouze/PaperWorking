import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useProjectStore } from '@/store/projectStore';
import { Project, LedgerItem } from '@/types/schema';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export function useAllDealsSync() {
  const setDeals = useProjectStore((state) => state.setDeals);
  const setLedgerItems = useProjectStore((state) => state.setLedgerItems);
  const currentProject = useProjectStore((state) => state.currentProject);
  const { profile } = useAuth();

  // Track counts to trigger notifications
  const prevLedgerCounts = useRef<Record<string, number>>({});

  // 1. Sync All Deals (Filtered by Org for security rules)
  useEffect(() => {
    if (!profile?.organizationId || profile.organizationId === 'org_placeholder') return;

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('organizationId', '==', profile.organizationId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveDeals: Project[] = [];
      snapshot.forEach((doc) => {
        liveDeals.push({ id: doc.id, ...doc.data() } as Project);
      });
      setDeals(liveDeals);
    }, (error) => {
      console.error("All Deals Sync Error: ", error);
    });

    return () => unsubscribe();
  }, [setDeals, profile?.organizationId]);

  // 2. Sync Active Deal's Ledger (Sub-collection)
  useEffect(() => {
    if (!currentProject?.id) return;

    const ledgerRef = collection(db, 'projects', currentProject.id, 'ledgerItems');
    const q = query(ledgerRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Convert Firestore timestamp to JS Date for the store
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as LedgerItem));
      
      const newCount = items.length;
      const prevCount = prevLedgerCounts.current[currentProject.id] || 0;

      // Notification Logic: New Receipt Uploaded
      if (newCount > prevCount && prevCount > 0) {
         toast.success('New ledger item recorded!', {
           icon: '📝',
           style: { background: '#111', color: '#fff', border: '1px solid #333' }
         });
      }
      
      prevLedgerCounts.current[currentProject.id] = newCount;
      setLedgerItems(currentProject.id, items);
    }, (error) => {
      console.error("Ledger Sync Error: ", error);
    });

    return () => unsubscribe();
  }, [currentProject?.id, setLedgerItems]);
}
