'use client';

import React, { useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { usePanelContext, PanelProvider, LaneDef } from '@/components/dashboard/HorizontalPanelShell';
import { useProjectStore } from '@/store/projectStore';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Logo from '@/components/brand/Logo';
import Link from 'next/link';
import { Mail, Calendar } from 'lucide-react';
import PhaseNav from '@/components/dashboard/PhaseNav';
import LaneIndicator from '@/components/dashboard/LaneIndicator';
import MinimizedDashboardView from '@/components/dashboard/MinimizedDashboardView';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { useUserStore } from '@/store/userStore';
import { usePermissions } from '@/hooks/usePermissions';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/* ═══════════════════════════════════════════════════════
   Dashboard Layout — Persistent Kanban Navigation Shell

   PanelProvider lives HERE so that:
   • Header PhaseNav can read/write activeIndex
   • Board overlay can read viewMode
   • Bottom mobile nav can read activeIndex
   ═══════════════════════════════════════════════════════ */

const LANES: LaneDef[] = [
  { id: 'pipeline',   label: 'Deal Pipeline',        shortLabel: 'Pipeline' },
  { id: 'evaluation', label: 'Capital & Evaluation',  shortLabel: 'Eval' },
  { id: 'closing',    label: 'The Closing Room',      shortLabel: 'Closing' },
  { id: 'engine',     label: 'The Engine Room',       shortLabel: 'Engine' },
  { id: 'exit',       label: 'The Exit Hub',          shortLabel: 'Exit' },
];

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-pw-white font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="opacity-30"><Logo size="sm" /></div>
            <div className="hidden items-center gap-6 md:flex">
              {[24, 32, 28, 28, 20].map((w, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-gray-100" style={{ width: `${w * 4}px` }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </header>
      <main className="p-6">
        <div className="mb-6 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-gray-200 bg-white" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </main>
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
        <DashboardLayoutInner user={user}>{children}</DashboardLayoutInner>
      </Suspense>
    </ErrorBoundary>
  );
}

function DashboardLayoutInner({ children, user }: { children: React.ReactNode; user: any }) {
  const searchParams = useSearchParams();
  const laneParam = searchParams.get('lane');

  const initialLane = useMemo(() => {
    if (!laneParam) return 0;
    const idx = LANES.findIndex((l) => l.id === laneParam);
    return idx >= 0 ? idx : 0;
  }, [laneParam]);

  const { isNewUser, hasActiveSubscription } = useUserStore();
  const { isLead } = usePermissions();

  return (
    <PanelProvider lanes={LANES} initialLane={initialLane}>
      <div className="horizontal-dashboard bg-pw-white font-sans text-foreground">
        {/* Onboarding Wizard (Fixed at top level) */}
        {isNewUser && hasActiveSubscription && isLead && <OnboardingWizard />}

        {/* ── Fixed Header: Logo + Phase Tabs + User ── */}
        <header
          className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md"
          style={{ height: 64 }}
        >
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex-shrink-0">
              <Logo href="/dashboard" size="sm" />
            </div>
            <PhaseNav />
            <div className="flex items-center gap-6 mr-8">
              <Link 
                href="/dashboard/inbox" 
                className="text-gray-500 hover:text-pw-black transition-all flex items-center gap-2"
                title="Global Inbox"
              >
                <Mail className="w-5 h-5" />
                <span className="hidden xl:inline text-xs font-black uppercase tracking-widest">Inbox</span>
              </Link>
              <Link 
                href="/dashboard/calendar" 
                className="text-gray-500 hover:text-pw-black transition-all flex items-center gap-2"
                title="Asset Calendar"
              >
                <Calendar className="w-5 h-5" />
                <span className="hidden xl:inline text-xs font-black uppercase tracking-widest">Timeline</span>
              </Link>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white"
                role="img"
                aria-label={`Signed in as ${user.displayName || user.email || 'User'}`}
              >
                <span aria-hidden="true">
                  {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <span className="hidden text-sm font-medium text-gray-700 lg:inline" aria-hidden="true">
                {user.displayName || user.email}
              </span>
              <Link
                href="/dashboard/settings/billing"
                className="hidden lg:inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1"
                title="Billing & Subscription"
              >
                Billing
              </Link>
              <LogoutButton compact />
            </div>
          </div>
        </header>

        {/* ── Lane Panels (rendered by page.tsx) ── */}
        {children}

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
