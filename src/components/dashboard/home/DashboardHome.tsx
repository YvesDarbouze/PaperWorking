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
import { LayoutGrid, ArrowRight, Plus, Lock, Building2, TrendingUp, ChevronRight, Search, User, Users, CheckCircle2, Target, RotateCw, Clock, ArrowUpRight, ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Calendar } from 'lucide-react';
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
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const LifecycleMetricsDashboard = lazy(() => import('@/components/dashboard/charts/LifecycleMetricsDashboard'));

import DashboardKPIHeader from './DashboardKPIHeader';
import GenerativeInsights from './GenerativeInsights';
import RecentActivityTable from './RecentActivityTable';

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
    <div className="bg-[#FFFFFF] border border-[#A5A5A5] rounded-2xl animate-pulse p-6">
      <div className="h-4 bg-[#A5A5A5]/20 rounded w-1/3 mb-4" />
      <div className="h-[280px] bg-[#F2F2F2] rounded-md" />
    </div>
  );
}

// ─── State 2: Free tier upgrade banner ───────────────────────

function FreeTierBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="mb-8 flex items-center justify-between bg-[#595959] text-[#FFFFFF] rounded-2xl px-8 py-5">
      <div className="flex items-center gap-4">
        <TrendingUp className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold tracking-tight">Unlock your full Command Center</p>
          <p className="text-xs text-white/70 mt-0.5 leading-snug">
            Real-time deal tracking, live portfolio KPIs, and AI-powered analytics
          </p>
        </div>
      </div>
      <button
        onClick={onUpgrade}
        className="flex-shrink-0 flex items-center gap-2 px-6 py-2.5 bg-[#FFFFFF] text-[#595959] rounded text-xs font-bold uppercase tracking-widest hover:bg-[#F2F2F2] transition-colors"
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
    default:               return 'bg-[#F2F2F2] text-[#7F7F7F]';
  }
}

function GuestProjectCard({ project, userUid }: { project: Project; userUid: string }) {
  const memberInfo = project.members?.[userUid];
  const role = memberInfo?.role ?? 'Collaborator';
  return (
    <article className="bg-[#FFFFFF] border border-[#A5A5A5] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-md bg-[#F2F2F2] flex items-center justify-center">
          <Building2 className="w-5 h-5 text-[#7F7F7F]" aria-hidden="true" />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded ${dealStatusStyle(project.status)}`}>
          {project.status}
        </span>
      </div>
      <h3 className="text-xl font-normal text-[#595959] tracking-tight mb-1 leading-tight">
        {project.propertyName || 'Unnamed Property'}
      </h3>
      <p className="text-sm text-[#7F7F7F] mb-5 leading-snug">{project.address}</p>
      <div className="flex items-end justify-between pt-4 border-t border-[#A5A5A5]/30">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#7F7F7F] font-bold">Your Role</p>
          <p className="text-sm font-medium text-[#595959] mt-0.5">{role}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-[#7F7F7F] font-bold">Phase</p>
          <p className="text-sm font-medium text-[#595959] mt-0.5 max-w-[140px] truncate">
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
    <div className="bg-[#FFFFFF] border border-[#A5A5A5] rounded-2xl flex flex-col items-center justify-center py-16 text-center gap-5">
      <div className="w-14 h-14 rounded-md bg-[#F2F2F2] border border-[#A5A5A5]/50 flex items-center justify-center">
        <Lock className="w-6 h-6 text-[#7F7F7F]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#595959] tracking-tight">Guest Access Active</p>
        <p className="text-xs text-[#7F7F7F] max-w-[240px] leading-relaxed">
          Portfolio financials are only visible to account owners. You can view the deals you&apos;ve been invited to.
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

  // State 2 (free): enforce empty-state teaser — widgets show "—" / no data.
  // State 3 (paid): full live portfolio.
  // State 4 (guest): widgets receive empty; invited projects shown separately.
  const portfolioProjects: Project[] = isPaid ? allProjects : [];

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
      if (!profile?.organizationId || profile.organizationId === 'org_placeholder') {
        toast.error('Organization sync in progress. Please wait a moment…');
        return;
      }
      router.push('/dashboard/projects/new');
    });
  };

  return (
    <div className="dashboard-context min-h-full bg-[#F2F2F2] px-4 md:px-8 py-8 overflow-y-auto">

      {/* State 2 — Free tier upgrade prompt */}
      {isFree && <FreeTierBanner onUpgrade={() => router.push('/pricing')} />}

      {/* ── Page Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
         <div className="flex flex-col">
           <h1 className="text-2xl font-semibold text-[#595959] tracking-tight">Welcome, {profile?.firstName || 'Investor'}</h1>
           <p className="text-sm text-[#7F7F7F] mt-1">{profile?.organizationName || 'Real Estate Team'}</p>
         </div>
         <div className="flex items-center gap-4">
            <div className="relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7F7F7F]" />
               <input 
                 type="text" 
                 placeholder="Search: For Properties" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-9 pr-4 py-2 bg-[#FFFFFF] border border-[#A5A5A5] rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-[#595959] text-[#595959] placeholder:text-[#7F7F7F] w-full md:w-64" 
               />
            </div>
            <button className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-[#A5A5A5] flex flex-shrink-0 items-center justify-center hover:bg-[#F2F2F2] transition-colors">
               <User className="w-5 h-5 text-[#7F7F7F]" />
            </button>
         </div>
      </header>

      {/* ── State 4: Guest invited-project cards ── */}
      {isGuest && (
        <section className="mb-10">
          <p className="text-xs uppercase tracking-widest text-[#7F7F7F] font-bold mb-6">Your Invited Deals</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guestLoading
              ? [0, 1].map(i => (
                  <div
                    key={i}
                    className="bg-[#FFFFFF] border border-[#A5A5A5] rounded-2xl animate-pulse h-52"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))
              : guestProjects.length > 0
              ? guestProjects.map(p => (
                  <GuestProjectCard key={p.id} project={p} userUid={user?.uid ?? ''} />
                ))
              : (
                  <div className="col-span-3 bg-[#FFFFFF] border border-dashed border-[#A5A5A5] rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-bold text-[#595959] uppercase tracking-widest mb-2">No Active Collaborations</p>
                    <p className="text-xs text-[#7F7F7F] max-w-xs leading-relaxed">
                      You haven't been added to any deals yet. Check your email for an invite.
                    </p>
                  </div>
                )
            }
          </div>
        </section>
      )}

      {/* ── Dashboard Content ── */}
      <div className="flex flex-col gap-8">
        
        {/* Generative Insights (Center-Top) */}
        {!isGuest && (
          <ErrorBoundary name="Generative Insights">
            <GenerativeInsights />
          </ErrorBoundary>
        )}

        {/* KPI Header */}
        {!isGuest && (
          <ErrorBoundary name="KPI Header">
            <DashboardKPIHeader />
          </ErrorBoundary>
        )}

        {/* ── Portfolio Summary Bar ── */}
        {!isGuest && (
          <ErrorBoundary name="Portfolio Summary Bar">
            <PortfolioSummaryBar
              projects={portfolioProjects}
              isLoading={false}
              className="w-full"
            />
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

        {/* Recent Activity Table */}
        <ErrorBoundary name="Recent Activity">
          <RecentActivityTable />
        </ErrorBoundary>

      </div>
    </div>
  );
}

