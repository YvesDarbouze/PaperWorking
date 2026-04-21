'use client';

import { lazy, Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useGuestProjectsSync } from '@/hooks/useGuestProjectsSync';
import SmartInboxWidget from './SmartInboxWidget';
import GlobalTodoWidget from './GlobalTodoWidget';
import PortfolioKPIStrip from './PortfolioKPIStrip';
import MAOGaugeTracker from './MAOGaugeTracker';
import BurnRateMonitor from './BurnRateMonitor';
import { LayoutGrid, ArrowRight, Plus, Lock, Building2, TrendingUp, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { usePaywall } from '@/hooks/usePaywall';
import { useAuth } from '@/context/AuthContext';
import DealCreationWizard from '@/components/project/DealCreationWizard';
import toast from 'react-hot-toast';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   DashboardHome — Tier-Aware Landing View

   Renders differently across 4 subscription states:

   1. Unauthenticated  → blocked at middleware + layout guard (never reaches here)
   2. Free (no sub)    → full layout visible, KPIs show empty state, Create CTA
                         redirects to /pricing
   3. Paid             → full access, Create CTA opens DealCreationWizard
   4. Guest (invitee)  → scoped to invited project(s), KPI strip hidden,
                         Create CTA redirects to /pricing
   ═══════════════════════════════════════════════════════════════ */

const ROIChart = lazy(() => import('./ROIChart'));

function ChartSkeleton() {
  return (
    <div className="ag-card bg-pw-surface border border-pw-border/10 animate-pulse">
      <div className="h-4 bg-pw-bg rounded w-1/3 mb-4" />
      <div className="h-[280px] bg-pw-bg rounded-2xl" />
    </div>
  );
}

// ─── State 2: Free tier upgrade banner ───────────────────────

function FreeTierBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="mb-8 flex items-center justify-between bg-pw-black text-pw-white rounded-[var(--radius-md)] px-8 py-5">
      <div className="flex items-center gap-4">
        <TrendingUp className="w-5 h-5 text-pw-accent flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold tracking-tight">Unlock your full Command Center</p>
          <p className="text-xs text-white/50 mt-0.5 leading-snug">
            Real-time deal tracking, live portfolio KPIs, and AI-powered analytics
          </p>
        </div>
      </div>
      <button
        onClick={onUpgrade}
        className="flex-shrink-0 flex items-center gap-2 px-6 py-2.5 bg-pw-white text-pw-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-pw-border transition-colors"
      >
        View Plans
        <ChevronRight className="w-3 h-3" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── State 4: Guest invited-project card ─────────────────────

function dealStatusStyle(status: string): string {
  switch (status) {
    case 'Lead':           return 'bg-teal-50 text-teal-700';
    case 'Under Contract': return 'bg-yellow-50 text-yellow-700';
    case 'Renovating':     return 'bg-orange-50 text-orange-700';
    case 'Listed':         return 'bg-blue-50 text-blue-700';
    case 'Sold':           return 'bg-green-50 text-green-700';
    default:               return 'bg-gray-100 text-gray-600';
  }
}

function GuestProjectCard({ project, userUid }: { project: Project; userUid: string }) {
  const memberInfo = project.members?.[userUid];
  const role = memberInfo?.role ?? 'Collaborator';
  return (
    <article className="ag-card bg-pw-surface border border-pw-border/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)] hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-pw-muted" aria-hidden="true" />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${dealStatusStyle(project.status)}`}>
          {project.status}
        </span>
      </div>
      <h3 className="text-xl font-light text-pw-black tracking-tight mb-1 leading-tight">
        {project.propertyName || 'Unnamed Property'}
      </h3>
      <p className="text-sm text-pw-muted mb-5 leading-snug">{project.address}</p>
      <div className="flex items-end justify-between pt-4 border-t border-pw-border/10">
        <div>
          <p className="ag-label opacity-40">Your Role</p>
          <p className="text-sm font-medium text-pw-black mt-0.5">{role}</p>
        </div>
        <div className="text-right">
          <p className="ag-label opacity-40">Phase</p>
          <p className="text-sm font-medium text-pw-black mt-0.5 max-w-[140px] truncate">
            {project.phaseStatus ?? '—'}
          </p>
        </div>
      </div>
    </article>
  );
}

/** Shown in place of the KPI / chart column for guest-tier users. */
function GuestAccessPanel() {
  return (
    <div className="ag-card bg-pw-surface border border-pw-border/10 flex flex-col items-center justify-center py-16 text-center gap-5">
      <div className="w-14 h-14 rounded-full bg-pw-bg border border-pw-border/30 flex items-center justify-center">
        <Lock className="w-6 h-6 text-pw-muted" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-pw-black tracking-tight">Guest Access Active</p>
        <p className="text-xs text-pw-muted max-w-[240px] leading-relaxed">
          Portfolio financials are only visible to account owners. You can view the deals you&apos;ve been invited to.
        </p>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const router = useRouter();
  const allProjects = useProjectStore(s => s.projects);
  const setViewMode = useUIStore(s => s.setViewMode);
  const { user, profile } = useAuth();
  const { isPaid, isFree, isGuest, requireSubscription } = usePaywall();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Populate the store for paid/free users from the user's org.
  // No-op when profile is missing or org is placeholder.
  useAllDealsSync();

  // For guest tier: fetch the single invited project in real-time.
  const { guestProjects, loading: guestLoading } = useGuestProjectsSync();

  // State 2 (free): enforce empty-state teaser — widgets show "—" / no data.
  // State 3 (paid): full live portfolio.
  // State 4 (guest): widgets receive empty; invited projects shown separately.
  const portfolioProjects: Project[] = isPaid ? allProjects : [];

  const activeDeals = portfolioProjects.filter(p => p.status !== 'Sold' && p.status !== 'Lead');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleCreateProject = () => {
    requireSubscription(() => {
      if (!profile?.organizationId || profile.organizationId === 'org_placeholder') {
        toast.error('Organization sync in progress. Please wait a moment…');
        return;
      }
      setIsWizardOpen(true);
    });
  };

  const pipelineSubtext = isGuest
    ? guestLoading
      ? 'Loading your collaborations…'
      : guestProjects.length > 0
      ? `You're collaborating on ${guestProjects.length} deal${guestProjects.length === 1 ? '' : 's'}`
      : 'No active collaborations yet'
    : isPaid
    ? activeDeals.length > 0
      ? `${activeDeals.length} active deal${activeDeals.length === 1 ? '' : 's'} in pipeline`
      : 'Your pipeline is clear — start sourcing'
    : 'Subscribe to start tracking deals and growing your portfolio';

  return (
    <div className="min-h-full bg-pw-bg px-8 py-8 overflow-y-auto">

      {/* State 2 — Free tier upgrade prompt */}
      {isFree && <FreeTierBanner onUpgrade={() => router.push('/pricing')} />}

      {/* ── Page Header ── */}
      <div className="flex items-end justify-between mb-10 flex-wrap gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-pw-black flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-pw-white" aria-hidden="true" />
            </div>
            <p className="ag-label opacity-40">{isGuest ? 'Collaborator Dashboard' : 'Command Center'}</p>
          </div>
          <h1 className="text-5xl font-extralight text-pw-black tracking-tight leading-none">
            {greeting}
          </h1>
          <p className="text-base text-pw-muted mt-3 font-normal tracking-tight">
            {pipelineSubtext}
          </p>
        </div>

        {/* ── CTAs ─────────────────────────────────────────────────
            "New Project" is always visible across all tiers:
            • Paid  → opens DealCreationWizard
            • Free  → requireSubscription() hard-redirects to /pricing
            • Guest → requireSubscription() hard-redirects to /pricing
            The lock icon signals the paywall without hiding the button.
        ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateProject}
            aria-label={isPaid ? 'Create a new project' : 'Upgrade to create a project'}
            className={`flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
              isPaid
                ? 'bg-white border-pw-black text-pw-black hover:bg-pw-black hover:text-pw-white'
                : 'bg-white border-pw-border/40 text-pw-muted hover:border-pw-black hover:text-pw-black'
            }`}
          >
            {isPaid
              ? <Plus className="w-4 h-4" aria-hidden="true" />
              : <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            }
            New Project
          </button>

          {!isGuest && (
            <button
              onClick={() => setViewMode('COMMAND_CENTER')}
              className="flex items-center gap-3 px-8 py-4 bg-pw-black text-pw-white rounded-full hover:bg-pw-muted transition-all duration-300 group shadow-lg"
            >
              <span className="text-sm font-bold uppercase tracking-widest">Enter Pipeline</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ── State 4: Guest invited-project cards ── */}
      {isGuest && (
        <section className="mb-10">
          <p className="ag-label mb-6 opacity-60">Your Invited Deals</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guestLoading
              ? [0, 1].map(i => (
                  <div
                    key={i}
                    className="ag-card bg-pw-surface border border-pw-border/10 animate-pulse h-52"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))
              : guestProjects.length > 0
              ? guestProjects.map(p => (
                  <GuestProjectCard key={p.id} project={p} userUid={user?.uid ?? ''} />
                ))
              : (
                  <div className="col-span-3 ag-card bg-pw-surface border border-dashed border-pw-border/40 flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-bold text-pw-black uppercase tracking-widest mb-2">No Active Collaborations</p>
                    <p className="text-xs text-pw-muted opacity-60 max-w-xs leading-relaxed">
                      You haven't been added to any deals yet. Check your email for an invite.
                    </p>
                  </div>
                )
            }
          </div>
        </section>
      )}

      {/* ── 3-Column Grid ── */}
      <div className="grid grid-cols-12 gap-8">

        {/* Left: Action Center
            Paid/Free: Inbox + To-Do (portfolioProjects drives data)
            Guest: empty-state widgets (invited project data stays in GuestProjectCard) */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <SmartInboxWidget projects={portfolioProjects} />
          <GlobalTodoWidget
            projects={portfolioProjects}
            onNavigateToDeal={() => setViewMode('COMMAND_CENTER')}
          />
        </div>

        {/* Center: Portfolio Health
            Paid: full KPI strip + ROI chart + MAO gauge (live data)
            Free: same strip with empty array → all KPIs display "—" (teaser)
            Guest: GuestAccessPanel — financial KPIs intentionally hidden */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {isGuest ? (
            <GuestAccessPanel />
          ) : (
            <>
              <PortfolioKPIStrip projects={portfolioProjects} />
              <Suspense fallback={<ChartSkeleton />}>
                <ROIChart projects={portfolioProjects} />
              </Suspense>
              <MAOGaugeTracker projects={portfolioProjects} />
            </>
          )}
        </div>

        {/* Right: Burn Rate */}
        <div className="col-span-12 lg:col-span-3">
          <BurnRateMonitor projects={portfolioProjects} />
        </div>
      </div>

      {/* Deal Creation Wizard — only mounts for paid users */}
      {isWizardOpen && profile?.organizationId && (
        <DealCreationWizard
          organizationId={profile.organizationId}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => setIsWizardOpen(false)}
        />
      )}
    </div>
  );
}
