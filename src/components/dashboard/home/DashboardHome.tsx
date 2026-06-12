'use client';

import { lazy, Suspense, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useGuestProjectsSync } from '@/hooks/useGuestProjectsSync';
const SmartInboxWidget = lazy(() => import('./SmartInboxWidget'));
const GlobalTodoWidget = lazy(() => import('./GlobalTodoWidget'));
const PortfolioKPIStrip = lazy(() => import('./PortfolioKPIStrip'));
const MAOGaugeTracker = lazy(() => import('./MAOGaugeTracker'));
const BurnRateMonitor = lazy(() => import('./BurnRateMonitor'));
import { LayoutGrid, ArrowRight, Plus, Lock, Building2, TrendingUp, ChevronRight, Search, User, Users, CheckCircle2, Target, RotateCw, Clock, ArrowUpRight, ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Calendar, Terminal, PlusCircle, Tag, UserSearch } from 'lucide-react';
import {
  PortfolioSummaryBar,
  PhaseDistributionChart,
  PortfolioROIHeatmap,
} from '@/components/metrics/portfolio';
import KPIGrid from '@/components/dashboard/KPIGrid';
import TaskActivityFeed from '@/components/dashboard/TaskActivityFeed';
import type { FeedEvent } from '@/components/dashboard/TaskActivityFeed';
import CreateProjectCTA from '@/components/dashboard/CreateProjectCTA';
import { useUIStore } from '@/store/uiStore';
import { usePaywall } from '@/hooks/usePaywall';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const LifecycleMetricsDashboard = lazy(() => import('@/components/dashboard/charts/LifecycleMetricsDashboard'));
const AgentDirectory = lazy(() => import('@/components/listing/AgentDirectory'));
const OpenHouseCalendar = lazy(() => import('@/components/listing/OpenHouseCalendar'));

import GenerativeInsights from './GenerativeInsights';
import ActivityFeed from './ActivityFeed';
import ProfileWidget from './ProfileWidget';
import ProjectsWidget from './ProjectsWidget';
import UpcomingMeetingsWidget from './UpcomingMeetingsWidget';
import AnalyticsWidget from './AnalyticsWidget';
import CommandCenterKPIStrip from './CommandCenterKPIStrip';
import type { ScopeMode, PeriodFilter } from './CommandCenterKPIStrip';
import PerformanceMetrics from './PerformanceMetrics';
import EquityGrowthChart from './EquityGrowthChart';
import AssetBentoGrid from './AssetBentoGrid';
import InvestorInviteModal from '../InvestorInviteModal';
import PostDealModal from '../PostDealModal';
import MobileBottomNav from '../MobileBottomNav';

const PerformanceChart = lazy(() => import('./PerformanceChart'));

import toast from 'react-hot-toast';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   DashboardHome — Tier-Aware Landing View

   Renders differently across 4 subscription states:

   1. Unauthenticated  → blocked at middleware + layout guard (never reaches here)
   2. Free (no sub)    → full layout visible, KPIs show empty state, Create CTA
                         redirects to /pricing
   3. Paid             → full access, Create CTA routes to /dashboard/projects/new
   4. Guest (invitee)  → scoped to invited project(s), KPI strip hidden,
                         Create CTA redirects to /pricing
   ═══════════════════════════════════════════════════════════════ */

const ROIChart = lazy(() => import('./ROIChart'));
const AssetMixChart = lazy(() => import('./AssetMixChart'));

function ChartSkeleton() {
  return (
    <div className="glass-card rounded-3xl animate-pulse p-6">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
      <div className="h-[280px] bg-white/5 rounded-2xl" />
    </div>
  );
}

// ─── State 2: Free tier upgrade banner ───────────────────────

function FreeTierBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="mb-8 flex items-center justify-between glass-card text-on-surface rounded-3xl px-8 py-5">
      <div className="flex items-center gap-4">
        <TrendingUp className="w-5 h-5 flex-shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-label-md text-label-md">Stop guessing. Start tracking every dollar.</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
            Every day without data costs you money. Upgrade for real-time deal intelligence.
          </p>
        </div>
      </div>
      <button
        onClick={onUpgrade}
        className="flex-shrink-0 flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md uppercase tracking-widest hover:brightness-110 luminous-teal transition-all"
      >
        See What You&apos;re Missing
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── State 4: Guest invited-project card ─────────────────────

function dealStatusStyle(status: string): string {
  switch (status) {
    case 'Lead':           return 'bg-surface-variant text-on-surface-variant';
    case 'Under Contract': return 'bg-secondary-container/20 text-secondary-container';
    case 'Renovating':     return 'bg-tertiary-container/20 text-tertiary-container';
    case 'Listed':         return 'bg-primary/20 text-primary';
    case 'Sold':           return 'bg-white/10 text-white';
    default:               return 'bg-surface-variant text-on-surface-variant';
  }
}

function GuestProjectCard({ project, userUid }: { project: Project; userUid: string }) {
  const memberInfo = project.members?.[userUid];
  const role = memberInfo?.role ?? 'Collaborator';
  return (
    <article className="glass-card rounded-3xl p-6 group transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${dealStatusStyle(project.status)}`}>
          {project.status}
        </span>
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-1 truncate">
        {project.propertyName || 'Unnamed Property'}
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-5 truncate">{project.address}</p>
      <div className="flex items-end justify-between pt-4 border-t border-white/5">
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60">Your Role</p>
          <p className="font-label-md text-label-md text-on-surface mt-0.5">{role}</p>
        </div>
        <div className="text-right">
          <p className="font-label-sm text-label-sm text-on-surface-variant opacity-60">Phase</p>
          <p className="font-label-md text-label-md text-on-surface mt-0.5 max-w-[140px] truncate">
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
    <div className="glass-card rounded-3xl flex flex-col items-center justify-center py-16 text-center gap-5">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
        <Lock className="w-6 h-6 text-on-surface-variant" />
      </div>
      <div className="space-y-1">
        <p className="font-headline-md text-headline-md text-on-surface tracking-tight">Viewer Access</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[240px] leading-relaxed">
          You&apos;re viewing deals shared with you. Portfolio analytics are available to account holders.
        </p>
      </div>
    </div>
  );
}

function calculatePhaseCompletion(status: string | undefined): number {
  if (!status) return 0;
  switch (status.toLowerCase()) {
    case 'lead': return 25;
    case 'under contract': return 50;
    case 'renovating': return 75;
    case 'listed': return 90;
    case 'sold': return 100;
    default: return 0;
  }
}

export default function DashboardHome() {
  const router = useRouter();
  const allProjects = useProjectStore(s => s.projects);
  const setViewMode = useUIStore(s => s.setViewMode);
  const { user, profile } = useAuth();
  const { activeTenantId } = useTenant();
  const { isPaid, isFree, isGuest, requireSubscription } = usePaywall();

  // ── Portfolio chart data shapes ──────────────────────────────
  // Derived inside the component so they react to store updates
  // without a separate selector or context call.


  // Populate the store for paid/free users from the user's org.
  // No-op when profile is missing or org is placeholder.
  useAllDealsSync();

  // For guest tier: fetch the single invited project in real-time.
  const { guestProjects, loading: guestLoading } = useGuestProjectsSync();

  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPostDealOpen, setIsPostDealOpen] = useState(false);
  const [scope, setScope] = useState<ScopeMode>('property');
  const [period, setPeriod] = useState<PeriodFilter>('ALL');

  // State 2 (free): enforce empty-state teaser — widgets show "—" / no data.
  // State 3 (paid): full live portfolio.
  // State 4 (guest): widgets receive empty; invited projects shown separately.
  const portfolioProjects: Project[] = useMemo(() => isPaid ? allProjects : [], [isPaid, allProjects]);

  // Derived shapes for portfolio metric charts
  const phaseDeals = useMemo(
    () =>
      portfolioProjects.map(p => ({
        address: p.address ?? p.propertyName ?? 'Unknown',
        financials: p.financials,
        currentPhase: typeof p.currentPhase === 'number' ? p.currentPhase : 1,
      })),
    [portfolioProjects]
  );

  const heatmapDeals = useMemo(
    () =>
      portfolioProjects
        .filter(p => p.financials && (p.financials.purchasePrice ?? 0) > 0)
        .map(p => ({
          address: p.address ?? p.propertyName ?? 'Unknown',
          financials: p.financials,
        })),
    [portfolioProjects]
  );

  const activeDeals = portfolioProjects.filter(p => {
    if (p.status === 'Sold' || p.status === 'Lead') return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      p.address?.toLowerCase().includes(s) ||
      p.propertyName?.toLowerCase().includes(s)
    );
  });

  const dealsClosedCount = portfolioProjects.filter(p => p.status === 'Sold').length;

  const uniqueMembers = new Set<string>();
  portfolioProjects.forEach(p => {
    if (p.members) {
      Object.keys(p.members).forEach(uid => uniqueMembers.add(uid));
    }
  });
  if (user?.uid) uniqueMembers.add(user.uid);
  const teamMembersCount = uniqueMembers.size;

  const handleCreateProject = () => {
    requireSubscription(() => {
      if (!activeTenantId || activeTenantId === 'org_placeholder') {
        toast.error('Organization sync in progress. Please wait a moment…');
        return;
      }
      router.push('/dashboard/projects/new');
    });
  };

  return (
    <div className="dashboard-context min-h-full pt-8 pb-24 px-margin-mobile lg:px-margin-desktop flex flex-col gap-gutter-mobile lg:gap-gutter-desktop max-w-container-max mx-auto w-full overflow-y-auto">

      {/* State 2 — Free tier upgrade prompt */}
      {isFree && <FreeTierBanner onUpgrade={() => router.push('/pricing')} />}

      {/* ── Page Header ── */}
      <header className="flex flex-col mb-8 gap-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-primary" />
              <span className="font-headline-md text-[20px] font-extrabold text-primary tracking-tighter">COMMAND_CENTER</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{profile?.displayName || 'Investor'}&apos;s Portfolio</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 opacity-80">Your deals at a glance · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  type="text" 
                  placeholder="Search deals, documents, team…" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
                />
             </div>
             <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-shrink-0 items-center justify-center hover:bg-white/10 transition-colors" title="Notifications">
                <Calendar className="w-4 h-4 text-on-surface-variant" />
             </button>
             <button className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden hover:opacity-90 cursor-pointer transition-opacity flex flex-shrink-0 items-center justify-center" title="Profile">
                <img 
                  alt="User Profile" 
                  className="w-full h-full object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfpWRLrfBGAP8PBiImG329fs2zBftW6rRDu3DiyDbzd6cy5qSnm5wjv5MKVxeqpVwYSByBvavyZiqZdzMKGyjXsHCO8fHPmoSoOtam05OTcWoSKIxxnZV_JhZHIhvLHlz-kMYYuDGIjS2qURVm05X1vrGBROFIc0NbGckkepOlGaufp8zHTH8hhYz37vUZRPjioH_gII-70VUr4YRoNyLndZPqR3fyl_nEWcLQVDN4ZgbqfSGdYlFSJzaqogPWzhLhne8KzI2k5qDk" 
                />
             </button>
          </div>
        </div>


      </header>

      {/* ── State 4: Guest invited-project cards ── */}
      {isGuest && (
        <section className="mb-10">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant opacity-60 mb-6">Deals Shared With You</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guestLoading
              ? [0, 1].map(i => (
                  <div
                    key={i}
                    className="glass-card rounded-3xl animate-pulse h-52"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))
              : guestProjects.length > 0
              ? guestProjects.map(p => (
                  <GuestProjectCard key={p.id} project={p} userUid={user?.uid ?? ''} />
                ))
              : (
                  <div className="col-span-3 glass-card border-dashed rounded-3xl flex flex-col items-center justify-center py-16 text-center">
                    <p className="font-label-md text-label-md text-on-surface uppercase tracking-widest mb-2">No deals yet</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs leading-relaxed">
                      When a team member shares a deal with you, it will appear here. Check your inbox for an invite link.
                    </p>
                  </div>
                )
            }
          </div>
        </section>
      )}

      {/* ── Stitch Command Center Layout ── */}
      {!isGuest && (
        <div className="flex flex-col xl:flex-row gap-6 mb-8 items-stretch w-full">
          <section className="flex-1 flex flex-col space-y-6">
            <ErrorBoundary name="Performance Metrics">
              <PerformanceMetrics />
            </ErrorBoundary>
            <ErrorBoundary name="Equity Growth Chart">
              <EquityGrowthChart />
            </ErrorBoundary>
            <ErrorBoundary name="Asset Bento Grid">
              <AssetBentoGrid />
            </ErrorBoundary>
          </section>

          <aside className="w-full xl:w-96 shrink-0">
            <ErrorBoundary name="Activity Feed">
              <ActivityFeed />
            </ErrorBoundary>
          </aside>
        </div>
      )}

      {/* Contextual FAB (Restricted to Home/Dashboard) */}
      {!isGuest && (
        <div className="fixed bottom-10 right-8 lg:right-[420px] z-[60]">
          <button
            onClick={handleCreateProject}
            className="flex items-center gap-3 px-6 py-4 bg-primary text-on-primary-container rounded-full font-bold shadow-lg luminous-glow hover:scale-105 active:scale-95 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2} />
            <span className="font-label-md hidden sm:inline">New Investment</span>
          </button>
        </div>
      )}

      {/* ── Dashboard Content ── */}
      <div className="flex flex-col gap-8">
        
        {/* Generative Insights (Center-Top) */}
        {!isGuest && (
          <ErrorBoundary name="Generative Insights">
            <GenerativeInsights />
          </ErrorBoundary>
        )}



        {/* ── Lifecycle Metrics Dashboard ── */}
        {!isGuest && (
          <ErrorBoundary name="Lifecycle Metrics Dashboard">
            <Suspense fallback={<ChartSkeleton />}>
              <LifecycleMetricsDashboard projects={portfolioProjects} />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* ── Analytics Widget — real metric history from snapshots ── */}
        {!isGuest && (
          <ErrorBoundary name="Analytics Widget">
            <AnalyticsWidget />
          </ErrorBoundary>
        )}

        {/* ── Portfolio Overview: Phase Distribution + ROI Heatmap ── */}
        {!isGuest && portfolioProjects.length >= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary name="Phase Distribution Chart">
              <PhaseDistributionChart
                deals={phaseDeals}
                isLoading={false}
              />
            </ErrorBoundary>
            {heatmapDeals.length >= 2 && (
              <ErrorBoundary name="Portfolio ROI Heatmap">
                <PortfolioROIHeatmap
                  deals={heatmapDeals}
                  isLoading={false}
                />
              </ErrorBoundary>
            )}
          </div>
        )}

        {/* ── Agent Directory + Open House Calendar ── */}
        {!isGuest && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary name="Agent Directory">
              <Suspense fallback={<ChartSkeleton />}>
                <AgentDirectory />
              </Suspense>
            </ErrorBoundary>
            <ErrorBoundary name="Open House Calendar">
              <Suspense fallback={<ChartSkeleton />}>
                <OpenHouseCalendar />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}



      </div>
      
      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      {/* ── Modals ── */}
      {isInviteModalOpen && (
        <InvestorInviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}
      <PostDealModal
        isOpen={isPostDealOpen}
        onClose={() => setIsPostDealOpen(false)}
      />
    </div>
  );
}

