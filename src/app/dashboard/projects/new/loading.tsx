'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/new/loading.tsx
   
   Skeleton loader for the project creation wizard. Provides a 
   clean, full-screen loading state that matches the "Syncing"
   state found in the page itself.
   ═══════════════════════════════════════════════════════════════ */

export default function NewProjectLoadingSkeleton() {
  return (
    <div className="dashboard-context fixed inset-0 z-[200] flex items-center justify-center bg-bg-surface">
      <div className="flex flex-col items-center gap-4 animate-shimmer">
        <div className="w-12 h-12 border-2 border-pw-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black text-text-secondary uppercase tracking-[0.3em]">
          Loading Wizard…
        </p>
      </div>
    </div>
  );
}
