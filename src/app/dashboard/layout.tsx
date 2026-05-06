'use client';

import React, { useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { usePanelContext, PanelProvider, LaneDef } from '@/components/dashboard/HorizontalPanelShell';
import { useProjectStore } from '@/store/projectStore';
import Logo from '@/components/brand/Logo';
import LaneIndicator from '@/components/dashboard/LaneIndicator';
import MinimizedDashboardView from '@/components/dashboard/MinimizedDashboardView';
import AppSidebar from '@/components/layout/AppSidebar';
import TopHeader from '@/components/layout/TopHeader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/* ═══════════════════════════════════════════════════════
   Dashboard Layout — Persistent Kanban Navigation Shell

   PanelProvider lives HERE so that:
   • Header PhaseNav can read/write activeIndex
   • Board overlay can read viewMode
   • Bottom mobile nav can read activeIndex
   ═══════════════════════════════════════════════════════ */

const LANES: LaneDef[] = [
  { id: 'findandfund', label: 'Find & Fund',          shortLabel: 'Find' },
  { id: 'pipeline',    label: 'Deal Pipeline',        shortLabel: 'Pipeline' },
  { id: 'evaluation',  label: 'Capital & Evaluation', shortLabel: 'Eval' },
  { id: 'closing',     label: 'The Closing Room',     shortLabel: 'Closing' },
  { id: 'rehab',       label: 'The Rehab Engine',     shortLabel: 'Rehab'   },
  { id: 'engine',      label: 'The Engine Room',      shortLabel: 'Engine' },
  { id: 'exit',        label: 'The Exit Hub',         shortLabel: 'Exit' },
];

function DashboardSkeleton() {
  return (
    <div className="dashboard-context flex min-h-screen font-sans" style={{ background: 'var(--bg-canvas)' }}>
      {/* Sidebar skeleton */}
      <aside
        className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0"
        style={{ width: 240, background: 'var(--bg-canvas)', borderRight: '1px solid var(--border-ui)' }}
        aria-hidden="true"
      >
        <div className="flex items-center px-5 h-16 shrink-0" style={{ borderBottom: '1px solid var(--border-ui)' }}>
          <div className="opacity-30"><Logo size="sm" /></div>
        </div>
        <div className="flex-1 px-3 py-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 animate-shimmer rounded" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </aside>

      {/* Main area skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-50 w-full backdrop-blur-md"
          style={{ height: 64, background: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)', borderBottom: '1px solid var(--border-ui)' }}
          role="banner"
        >
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-8">
              <div className="lg:hidden opacity-30"><Logo size="sm" /></div>
              <div className="hidden lg:flex items-center gap-6">
                {[24, 32, 28, 28, 20].map((w, i) => (
                  <div key={i} className="h-4 animate-shimmer rounded" style={{ width: `${w * 4}px` }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-shimmer rounded-full" />
              <div className="hidden sm:block h-4 w-20 animate-shimmer rounded" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8" style={{ background: 'var(--bg-canvas)' }}>
          <div className="mb-6 space-y-3">
            <div className="h-8 w-48 sm:w-64 animate-shimmer rounded" />
            <div className="h-4 w-full sm:w-96 animate-shimmer rounded" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 animate-shimmer rounded-lg"
                style={{ border: '1px solid var(--border-ui)', animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return <DashboardSkeleton />;

  return (
    <ErrorBoundary name="Dashboard Layout">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </Suspense>
    </ErrorBoundary>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const laneParam = searchParams.get('lane');

  const initialLane = useMemo(() => {
    if (!laneParam) return 0;
    const idx = LANES.findIndex((l) => l.id === laneParam);
    return idx >= 0 ? idx : 0;
  }, [laneParam]);

  return (
    <PanelProvider lanes={LANES} initialLane={initialLane}>
      <div
        className="dashboard-context horizontal-dashboard flex min-h-screen font-sans"
        style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
      >
        {/* ══════ Fixed Left Sidebar ══════ */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        {/* ══════ Main Content Area ══════ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Sticky Top Header ── */}
          <TopHeader />

          {/* ── Main Scrollable Content ── */}
          <main
            className="flex-1"
            style={{ background: 'var(--bg-canvas)' }}
          >
            {children}
          </main>
        </div>

        {/* ── Board Overlay (minimized mode) ── */}
        <BoardOverlay />

        {/* ── Mobile Bottom Nav ── */}
        <LaneIndicator />

        <Toaster position="bottom-left" />
      </div>
    </PanelProvider>
  );
}

/* ─── Board overlay reads viewMode from context ─── */
function BoardOverlay() {
  const { viewMode } = usePanelContext();
  const projects = useProjectStore((state) => state.projects);

  return (
    <AnimatePresence>
      {viewMode === 'minimized' && (
        <MinimizedDashboardView
          projects={projects}
          onSelectDeal={() => {}} // Deal selection handled via scrollToPanel inside the component
        />
      )}
    </AnimatePresence>
  );
}
