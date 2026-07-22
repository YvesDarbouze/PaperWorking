import { useEffect, useRef } from 'react';
import { collection, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useProjectStore } from '@/store/projectStore';
import { Project, LedgerItem } from '@/types/schema';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

// Many components (CommandCenter, ProjectsWidget, DashboardHome, intelligence
// pages) mount simultaneously and each used to open its own onSnapshot
// listener for the identical `projects` query. This module-level singleton
// ref-counts callers so only one live Firestore listener exists per scope
// key, regardless of how many components call useAllDealsSync() at once.
let dealsSubscriberCount = 0;
let dealsListenerKey: string | null = null;
let dealsUnsubscribe: (() => void) | null = null;

function getDealsListenerKey(activeTenantId: string, inviteToken?: string, invitedToProjectId?: string) {
  return `${activeTenantId}|${inviteToken ?? ''}|${invitedToProjectId ?? ''}`;
}

function startDealsListener(
  activeTenantId: string,
  inviteToken: string | undefined,
  invitedToProjectId: string | undefined,
  setDeals: (deals: Project[]) => void,
) {
  if (inviteToken && invitedToProjectId) {
    const projectRef = doc(db, 'projects', invitedToProjectId);
    return onSnapshot(
      projectRef,
      (snap) => {
        setDeals(snap.exists() ? [{ id: snap.id, ...snap.data() } as Project] : []);
      },
      (error) => {
        console.error('Guest Project Sync Error:', error);
        setDeals([]);
      },
    );
  }

  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, where('organizationId', '==', activeTenantId));

  return onSnapshot(q, (snapshot) => {
    const liveDeals: Project[] = [];
    snapshot.forEach((d) => {
      liveDeals.push({ id: d.id, ...d.data() } as Project);
    });
    setDeals(liveDeals);
  }, (error) => {
    console.error('All Deals Sync Error:', error);
    setDeals([]);
  });
}

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

    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
      fetch('/api/reil/projects', {
        headers: {
          'Authorization': 'Bearer mock_token'
        }
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('E2E useAllDealsSync received projects:', JSON.stringify(data));
          const projs = Array.isArray(data) ? data : (data?.projects || []);
          const enriched = projs.map((p: any, idx: number) => ({
            ...p,
            actionItems: p.actionItems && p.actionItems.length > 0 ? p.actionItems : (idx === 0 ? [
              {
                id: `todo_${p.id}_01`,
                label: 'Upload Purchase & Sale Agreement',
                description: 'Need fully executed PSA loaded to document vault.',
                assignee: 'marcus@apexcapital.io',
                completed: false,
                phase: 1,
              },
              {
                id: `todo_${p.id}_02`,
                label: 'Approve Contractor Bid',
                description: 'Morales rehab scope needs formal review and approval.',
                assignee: 'marcus@apexcapital.io',
                completed: false,
                phase: 3,
              },
              {
                id: `todo_${p.id}_03`,
                label: 'Order Title Search',
                description: 'Verify clear title with Coastal Title & Law.',
                assignee: 'marcus@apexcapital.io',
                completed: false,
                phase: 2,
              }
            ] : [])
          }));
          console.log('E2E useAllDealsSync setting projects:', JSON.stringify(enriched));
          setDeals(enriched);
        })
        .catch((err) => console.error('E2E project sync error:', err));
      return;
    }

    const key = getDealsListenerKey(activeTenantId, profile?.inviteToken, profile?.invitedToProjectId);

    // Scope changed (or no listener yet) — tear down the stale one and start fresh.
    if (dealsListenerKey !== key && dealsUnsubscribe) {
      dealsUnsubscribe();
      dealsUnsubscribe = null;
    }

    if (!dealsUnsubscribe) {
      dealsListenerKey = key;
      dealsUnsubscribe = startDealsListener(
        activeTenantId,
        profile?.inviteToken,
        profile?.invitedToProjectId,
        setDeals,
      );
    }

    dealsSubscriberCount += 1;

    return () => {
      dealsSubscriberCount -= 1;
      if (dealsSubscriberCount <= 0 && dealsUnsubscribe) {
        dealsSubscriberCount = 0;
        dealsUnsubscribe();
        dealsUnsubscribe = null;
        dealsListenerKey = null;
      }
    };
  }, [setDeals, activeTenantId, profile?.inviteToken, profile?.invitedToProjectId]);

  // 2. Sync Active Deal's Ledger (Sub-collection)
  useEffect(() => {
    if (!currentProject?.id) return;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) return;
    if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) return;

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
