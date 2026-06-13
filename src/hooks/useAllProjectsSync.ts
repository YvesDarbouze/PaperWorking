import { useEffect, useRef } from 'react';
import { collection, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useProjectStore } from '@/store/projectStore';
import { Project, LedgerItem } from '@/types/schema';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

export function useAllDealsSync() {
  const setDeals = useProjectStore((state) => state.setDeals);
  const setLedgerItems = useProjectStore((state) => state.setLedgerItems);
  const currentProject = useProjectStore((state) => state.currentProject);
  const { profile } = useAuth();
  const { activeTenantId } = useTenant();

  // Track counts to trigger notifications
  const prevLedgerCounts = useRef<Record<string, number>>({});

  // 1. Sync Deals — guest-scoped to a single invited project; owners get full org portfolio
  useEffect(() => {
    if (!activeTenantId) return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) return;

    // Guest tier: user arrived via invite link — scope to their one invited project only
    if (profile?.inviteToken && profile?.invitedToProjectId) {
      const projectRef = doc(db, 'projects', profile.invitedToProjectId);
      const unsubscribe = onSnapshot(
        projectRef,
        (snap) => {
          setDeals(snap.exists() ? [{ id: snap.id, ...snap.data() } as Project] : []);
        },
        (error) => {
          console.error('Guest Project Sync Error:', error);
        },
      );
      return () => unsubscribe();
    }

    // Owner / org-team tier: full portfolio scoped to the organization
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('organizationId', '==', activeTenantId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveDeals: Project[] = [];
      snapshot.forEach((d) => {
        liveDeals.push({ id: d.id, ...d.data() } as Project);
      });

      // Filter by project scopes if the user is scoped
      let filteredDeals = liveDeals;
      const scope = profile?.membershipScopes?.[activeTenantId];
      if (scope?.isScoped && Array.isArray(scope.scopedProjectIds)) {
        filteredDeals = liveDeals.filter((d) => scope.scopedProjectIds.includes(d.id));
      }

      setDeals(filteredDeals);
    }, (error) => {
      console.error('All Deals Sync Error:', error);
      // On Firestore error (permission-denied, network, etc.), mark sync complete with
      // empty results so the UI shows the honest empty/onboarding state instead of
      // a perpetual loading skeleton. Firestore listeners are not auto-retried on error.
      setDeals([]);
    });

    return () => unsubscribe();
  }, [setDeals, activeTenantId, profile?.inviteToken, profile?.invitedToProjectId, profile?.membershipScopes]);

  // 2. Sync Active Deal's Ledger (Sub-collection)
  useEffect(() => {
    if (!currentProject?.id) return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) return;

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
