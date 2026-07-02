'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/new/loading.tsx
   
   Skeleton loader for the project creation wizard. Provides a 
   clean, full-screen loading state that matches the "Syncing"
   state found in the page itself and aligns with Luminous Glass style.
   ═══════════════════════════════════════════════════════════════ */

export default function NewProjectLoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg-canvas/80 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-pw-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-pw-primary/20 blur-xl rounded-full animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: 'var(--color-primary)' }} />
        </div>
        <p className="text-xs font-black text-pw-muted uppercase tracking-[0.3em] mt-2">
          Loading Wizard…
        </p>
      </div>
    </div>
  );
}
