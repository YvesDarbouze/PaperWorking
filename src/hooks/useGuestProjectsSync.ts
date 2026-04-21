'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { usePaywall } from './usePaywall';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   useGuestProjectsSync — Real-time listener for invited projects

   Only activates for 'guest' tier users (those with
   profile.invitedToProjectId set and no active subscription).

   Returns the single invited Project document in real-time via
   onSnapshot so live deal updates reach the collaborator.

   For non-guest tiers, returns an empty array immediately —
   org-scoped projects are handled by useAllDealsSync instead.
   ═══════════════════════════════════════════════════════════════ */

export function useGuestProjectsSync(): {
  guestProjects: Project[];
  loading: boolean;
} {
  const { profile } = useAuth();
  const { isGuest } = usePaywall();
  const [guestProjects, setGuestProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isGuest || !profile?.invitedToProjectId) {
      setGuestProjects([]);
      return;
    }

    setLoading(true);
    const projectRef = doc(db, 'projects', profile.invitedToProjectId);

    const unsubscribe = onSnapshot(
      projectRef,
      (snap) => {
        if (snap.exists()) {
          setGuestProjects([{ id: snap.id, ...snap.data() } as Project]);
        } else {
          setGuestProjects([]);
        }
        setLoading(false);
      },
      () => {
        setGuestProjects([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isGuest, profile?.invitedToProjectId]);

  return { guestProjects, loading };
}
