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
    <div className="min-h-screen bg-bg-surface font-sans">
      <header 
        className="sticky top-0 z-50 w-full border-b border-border-accent bg-bg-surface/80 backdrop-blur"
        role="banner"
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <div className="opacity-30"><Logo size="sm" /></div>
            <div className="hidden lg:flex items-center gap-6">
              {[24, 32, 28, 28, 20].map((w, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-bg-primary" style={{ width: `${w * 4}px` }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="hidden sm:block h-4 w-20 animate-pulse rounded bg-bg-primary" />
          </div>
        </div>
      </header>
      <main className="p-4 sm:p-6 md:p-8">
        <div className="mb-6 space-y-3">
          <div className="h-8 w-48 sm:w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full sm:w-96 animate-pulse rounded bg-bg-primary" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border-accent bg-bg-surface" style={{ animationDelay: `${i * 80}ms` }} />
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
      <div className="horizontal-dashboard bg-bg-surface font-sans text-foreground">
        {/* Onboarding Wizard (Fixed at top level) */}
        {isNewUser && hasActiveSubscription && isLead && <OnboardingWizard />}

        {/* ── Fixed Header: Logo + Phase Tabs + User ── */}
        <header
          className="sticky top-0 z-50 w-full border-b border-border-accent bg-bg-surface/80 backdrop-blur-md"
          style={{ height: 64 }}
          role="banner"
        >
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex-shrink-0">
              <Logo href="/dashboard" size="sm" />
            </div>
            
            <nav role="navigation" aria-label="Main phases">
              <PhaseNav />
            </nav>

            <nav role="navigation" aria-label="Quick links" className="flex items-center gap-4 sm:gap-6 mr-4 sm:mr-8">
              <Link 
                href="/dashboard/inbox" 
                className="text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-accent rounded-md p-1"
                title="Global Inbox"
                aria-label="Global Inbox"
              >
                <Mail className="w-5 h-5" />
                <span className="hidden xl:inline text-xs font-black uppercase tracking-widest">Inbox</span>
              </Link>
              <Link 
                href="/dashboard/calendar" 
                className="text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-accent rounded-md p-1"
                title="Asset Calendar"
                aria-label="Asset Calendar"
              >
                <Calendar className="w-5 h-5" />
                <span className="hidden xl:inline text-xs font-black uppercase tracking-widest">Timeline</span>
              </Link>
            </nav>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-accent"
                role="button"
                tabIndex={0}
                aria-label={`Signed in as ${user.displayName || user.email || 'User'}`}
              >
                <span aria-hidden="true">
                  {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <span className="hidden text-sm font-medium text-text-primary lg:inline" aria-hidden="true">
                {user.displayName || user.email}
              </span>
              <Link
                href="/dashboard/settings/billing"
                className="hidden lg:inline-flex items-center text-xs font-medium text-text-secondary hover:text-text-primary transition-colors px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pw-accent rounded-md"
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
