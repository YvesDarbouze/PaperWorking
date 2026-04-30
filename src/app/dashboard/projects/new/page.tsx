'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePaywall } from '@/hooks/usePaywall';
import DealCreationWizard from '@/components/project/DealCreationWizard';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/new — Dedicated Project Initialization Route

   This page renders the full-screen DealCreationWizard inside the
   FocusedWorkflowLayout (ConversationalFormWrapper). 

   Access control:
   • Authenticated + paid  → renders the wizard
   • Authenticated + free  → hard-redirects to /pricing
   • Unauthenticated       → caught by middleware, never reaches here
   ═══════════════════════════════════════════════════════════════ */

export default function NewProjectPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isPaid } = usePaywall();

  /* ── Paywall guard: free/guest users bounce to pricing ── */
  React.useEffect(() => {
    if (!isPaid) {
      router.replace('/pricing');
    }
  }, [isPaid, router]);

  /* ── Org-readiness guard: wait for org hydration ── */
  const orgId = profile?.organizationId;
  const orgReady = orgId && orgId !== 'org_placeholder';

  if (!isPaid) return null;

  if (!orgReady) {
    return (
      <div className="dashboard-context fixed inset-0 z-[200] flex items-center justify-center bg-bg-surface">
        <div className="flex flex-col items-center gap-4 animate-shimmer">
          <div className="w-12 h-12 border-2 border-pw-black border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-text-secondary uppercase tracking-[0.3em]">
            Syncing Organization…
          </p>
        </div>
      </div>
    );
  }

  return (
    <DealCreationWizard
      organizationId={orgId}
      onClose={() => router.push('/dashboard')}
      onSuccess={(projectId) => {
        router.push(`/dashboard/projects/${projectId}/phase-1`);
      }}
    />
  );
}
