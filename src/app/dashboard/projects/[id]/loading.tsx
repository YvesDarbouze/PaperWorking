'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/loading.tsx
   
   Skeleton loader for the project workspace routes. Matches the
   layout structure of the workspace phase pages using the global
   animate-shimmer utility.
   ═══════════════════════════════════════════════════════════════ */

export default function WorkspaceLoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      {/* ── Header Banner Skeleton ── */}
      <header
        className="sticky top-0 z-50 animate-shimmer border-b border-white/10"
      >
        <div className="px-6 py-3 flex items-center gap-4">
          <div className="h-6 w-24 bg-white/20 rounded-lg" />
          <div className="flex-1" />
          <div className="h-5 w-16 bg-white/20 rounded-full" />
        </div>
        <div className="px-6 py-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-white/20 shadow-md" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 w-32 bg-white/20 rounded" />
            <div className="h-6 w-64 bg-white/20 rounded" />
            <div className="h-4 w-48 bg-white/20 rounded" />
          </div>
        </div>
      </header>

      {/* ── Workspace Body Skeleton ── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="h-[400px] animate-shimmer rounded-lg border border-border-ui" />
            <div className="h-[300px] animate-shimmer rounded-lg border border-border-ui" />
          </div>

          {/* Right column (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="h-[300px] animate-shimmer rounded-lg border border-border-ui" />
            <div className="h-[200px] animate-shimmer rounded-lg border border-border-ui" />
          </div>
        </div>
      </main>
    </div>
  );
}
