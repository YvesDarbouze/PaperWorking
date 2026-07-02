'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   /dashboard/projects/[id]/loading.tsx
   
   Skeleton loader for the project workspace routes. Matches the
   layout structure of the workspace phase pages using the global
   animate-shimmer utility and Luminous Glass tokens.
   ═══════════════════════════════════════════════════════════════ */

export default function WorkspaceLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-bg-canvas relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pw-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pw-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Header Banner Skeleton ── */}
      <header
        className="sticky top-0 z-50 glass-card bg-surface/40 backdrop-blur-xl border-b border-pw-border/30 relative"
      >
        <div className="px-6 py-3 flex items-center gap-4 relative z-10">
          <div className="h-6 w-24 bg-white/10 rounded-lg animate-shimmer" />
          <div className="flex-1" />
          <div className="h-5 w-16 bg-white/10 rounded-full animate-shimmer" />
        </div>
        <div className="px-6 py-5 flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-white/10 border border-pw-border/30 animate-shimmer" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 w-32 bg-white/10 rounded animate-shimmer" />
            <div className="h-6 w-64 bg-white/10 rounded animate-shimmer" />
            <div className="h-4 w-48 bg-white/10 rounded animate-shimmer" />
          </div>
        </div>
      </header>

      {/* ── Workspace Body Skeleton ── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="h-[400px] glass-card bg-white/5 rounded-xl border border-pw-border/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-pw-primary/5 blur-2xl rounded-full pointer-events-none" />
              <div className="p-6 space-y-4">
                <div className="h-6 w-1/3 bg-white/10 rounded animate-shimmer" />
                <div className="h-[300px] w-full bg-white/5 border border-pw-border/20 rounded-lg animate-shimmer" />
              </div>
            </div>
            <div className="h-[300px] glass-card bg-white/5 rounded-xl border border-pw-border/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-pw-primary/5 blur-2xl rounded-full pointer-events-none" />
              <div className="p-6 space-y-4">
                <div className="h-6 w-1/4 bg-white/10 rounded animate-shimmer" />
                <div className="h-4 w-full bg-white/10 rounded animate-shimmer" />
                <div className="h-4 w-5/6 bg-white/10 rounded animate-shimmer" />
                <div className="h-4 w-4/5 bg-white/10 rounded animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Right column (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="h-[300px] glass-card bg-white/5 rounded-xl border border-pw-border/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-pw-primary/5 blur-2xl rounded-full pointer-events-none" />
              <div className="p-6 space-y-4">
                <div className="h-6 w-1/2 bg-white/10 rounded animate-shimmer" />
                <div className="space-y-3">
                  <div className="h-10 w-full bg-white/10 rounded animate-shimmer" />
                  <div className="h-10 w-full bg-white/10 rounded animate-shimmer" />
                  <div className="h-10 w-full bg-white/10 rounded animate-shimmer" />
                </div>
              </div>
            </div>
            <div className="h-[200px] glass-card bg-white/5 rounded-xl border border-pw-border/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-pw-primary/5 blur-2xl rounded-full pointer-events-none" />
              <div className="p-6 space-y-4">
                <div className="h-6 w-1/3 bg-white/10 rounded animate-shimmer" />
                <div className="h-12 w-full bg-white/10 rounded animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
