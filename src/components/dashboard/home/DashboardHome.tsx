'use client';

import { lazy, Suspense, useState } from 'react';
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
import KPIGrid from '@/components/dashboard/KPIGrid';
import TaskActivityFeed from '@/components/dashboard/TaskActivityFeed';
import type { FeedEvent } from '@/components/dashboard/TaskActivityFeed';
import CreateProjectCTA from '@/components/dashboard/CreateProjectCTA';
import { useUIStore } from '@/store/uiStore';
import { usePaywall } from '@/hooks/usePaywall';
import { useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
      <h3 className="text-xl font-light text-[#595959] tracking-tight mb-1 leading-tight">
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

      {/* ── 2-Column Main Grid (65% / 35%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (65%) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
           
           {/* Top Row: Profile + Active Deals */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Profile Card */}
              <div className="col-span-1 bg-[#FFFFFF] rounded-2xl border border-[#A5A5A5] p-6 flex flex-col items-center justify-center relative shadow-sm">
                 <button className="absolute top-4 right-4 hover:opacity-70 transition-opacity">
                    <RotateCw className="w-4 h-4 text-[#7F7F7F]" />
                 </button>
                 <div className="w-20 h-20 rounded-full border-4 border-[#A5A5A5]/20 mb-4 overflow-hidden bg-[#F2F2F2] flex items-center justify-center">
                    <User className="w-8 h-8 text-[#A5A5A5]" />
                 </div>
                 <h2 className="text-lg font-medium text-[#595959] text-center line-clamp-1">{profile?.firstName || 'Investor'} {profile?.lastName || ''}</h2>
                 <p className="text-sm text-[#7F7F7F] mb-6">Lead Investor</p>
                 
                 {/* KPI Badges (Dynamic Data) */}
                 <div className="flex gap-2 w-full justify-center flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[#F2F2F2] px-3 py-1.5 rounded-full text-xs font-medium text-[#595959] shadow-sm" title="Team Members">
                       <Users className="w-3.5 h-3.5 text-[#595959]" /> {isGuest ? '—' : teamMembersCount}
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#F2F2F2] px-3 py-1.5 rounded-full text-xs font-medium text-[#595959] shadow-sm" title="Deals Closed">
                       <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> {isGuest ? '—' : dealsClosedCount}
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#F2F2F2] px-3 py-1.5 rounded-full text-xs font-medium text-[#595959] shadow-sm" title="Active Deals">
                       <Target className="w-3.5 h-3.5 text-red-500" /> {isGuest ? '—' : activeDeals.length}
                    </div>
                 </div>
              </div>

              {/* Active Projects (Up to 2) */}
              {!isGuest && activeDeals.slice(0, 2).map((deal) => (
                <div key={deal.id} className="col-span-1 bg-[#FFFFFF] rounded-2xl border border-[#A5A5A5] p-6 flex flex-col justify-between shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center border border-[#A5A5A5]/50">
                         <Clock className="w-5 h-5 text-[#7F7F7F]" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#F2F2F2] flex items-center justify-center border border-[#A5A5A5]/50">
                         <CheckCircle2 className="w-4 h-4 text-[#7F7F7F]" />
                      </div>
                   </div>
                   <div className="mt-auto">
                      <p className="text-xs uppercase tracking-widest text-[#7F7F7F] font-bold mb-1">Project</p>
                      <h3 className="text-lg font-medium text-[#595959] leading-tight line-clamp-2 min-h-[2.5rem]">{deal.address}</h3>
                      <div className="mt-6 flex flex-col">
                         <span className="text-4xl font-light text-[#595959] tracking-tighter">{calculatePhaseCompletion(deal.status)}%</span>
                         <span className="text-xs text-[#7F7F7F] mt-1">Avg. Completed</span>
                      </div>
                   </div>
                </div>
              ))}

              {/* Empty state for active projects if less than 2 */}
              {!isGuest && activeDeals.length < 2 && (
                <div className="col-span-1 bg-[#FFFFFF]/50 rounded-2xl border border-[#A5A5A5] border-dashed p-6 flex flex-col items-center justify-center shadow-sm">
                   <p className="text-sm text-[#7F7F7F]">No additional active projects</p>
                </div>
              )}
              {!isGuest && activeDeals.length === 0 && (
                <div className="col-span-1 bg-[#FFFFFF]/50 rounded-2xl border border-[#A5A5A5] border-dashed p-6 flex flex-col items-center justify-center shadow-sm">
                   <p className="text-sm text-[#7F7F7F]">No active projects</p>
                </div>
              )}
           </div>

           {/* Middle Row: Start New Project CTA */}
           {!isGuest && (
             <button 
               onClick={handleCreateProject} 
               className="w-full bg-[#F2F2F2] border border-[#A5A5A5] rounded-2xl py-6 flex items-center justify-center gap-3 hover:bg-[#A5A5A5]/10 transition-colors shadow-sm relative group"
             >
                {isPaid ? <Plus className="w-6 h-6 text-[#595959]" /> : <Lock className="w-6 h-6 text-[#7F7F7F]" />}
                <span className="text-xl font-medium text-[#595959]">Start New Project</span>
                <MoreHorizontal className="w-5 h-5 text-[#7F7F7F] absolute right-8 hidden md:block opacity-50 group-hover:opacity-100 transition-opacity" />
             </button>
           )}

           {/* Bottom Row: Analytics */}
           <div className="bg-[#FFFFFF] rounded-2xl border border-[#A5A5A5] p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                 <div>
                    <h2 className="text-xl font-medium text-[#595959]">Analytics: Portfolio Performance</h2>
                    <p className="text-sm text-[#7F7F7F] mt-1">Productivity analytics</p>
                 </div>
                 <div className="flex items-center gap-3 self-start md:self-auto">
                    <span className="text-sm text-[#595959] font-medium hidden sm:block">Select Chart</span>
                    <select className="bg-[#FFFFFF] border border-[#A5A5A5] rounded-md px-3 py-1.5 text-sm text-[#595959] focus:outline-none focus:ring-1 focus:ring-[#595959]">
                       <option>Holding Costs</option>
                       <option>Portfolio ARV</option>
                       <option>Net Profit</option>
                    </select>
                 </div>
              </div>
              
              <div className="h-64 mb-6">
                 {isGuest ? (
                   <div className="h-full bg-[#F2F2F2] rounded-lg border border-[#A5A5A5]/30 flex items-center justify-center">
                     <p className="text-sm text-[#7F7F7F]">Analytics hidden for guest accounts</p>
                   </div>
                 ) : (
                   <ErrorBoundary name="Portfolio Analytics">
                     <Suspense fallback={<div className="h-full bg-[#F2F2F2] animate-pulse rounded-lg border border-[#A5A5A5]/30" />}>
                        <ROIChart projects={portfolioProjects} />
                     </Suspense>
                   </ErrorBoundary>
                 )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between sm:items-end border-t border-[#A5A5A5]/30 pt-6 mt-4 gap-4">
                 <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-sm bg-[#595959]" />
                       <span className="text-xs text-[#7F7F7F] font-medium uppercase tracking-wider">Cost per Lead/Deal</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-sm bg-[#A5A5A5]" />
                       <span className="text-xs text-[#7F7F7F] font-medium uppercase tracking-wider">After Repair Value (ARV)</span>
                    </div>
                 </div>
                 <div className="text-left sm:text-right">
                    <p className="text-4xl font-medium text-[#595959] tracking-tight">{isGuest ? '—' : '$441.00'}</p>
                    <p className="text-xs text-[#7F7F7F] mt-1 uppercase tracking-widest font-bold">Avg. Daily Burn Rate</p>
                 </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN (35%) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
           
           {/* My Messages Widget */}
           <ErrorBoundary name="Activity Center">
             <div className="bg-[#FFFFFF] rounded-2xl border border-[#A5A5A5] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-lg font-medium text-[#595959]">My Messages & Activity</h2>
                   <Calendar className="w-5 h-5 text-[#7F7F7F]" />
                </div>
                
                {/* Dummy activity feed for visual alignment */}
                <div className="space-y-4">
                   {[
                     { time: '08:15 am', date: 'Tue, 11 Jul', title: 'Quick Daily Meeting', sub: 'Zoom', color: 'bg-blue-500' },
                     { time: '09:30 pm', date: 'Tue, 11 Jul', title: 'John Onboarding', sub: 'Google Meet', color: 'bg-green-500' },
                     { time: '02:30 pm', date: 'Tue, 12 Jul', title: 'Call With a New Team', sub: 'Google Meet', color: 'bg-green-500' },
                     { time: '04:00 pm', date: 'Tue, 15 Jul', title: 'Lead Designers Event', sub: 'Zoom', color: 'bg-blue-500' }
                   ].map((msg, i) => (
                     <div key={i} className="flex items-center justify-between py-3 border-b border-[#A5A5A5]/20 last:border-0 group cursor-pointer">
                        <div className="flex items-start gap-4">
                           <div className="w-16 flex-shrink-0">
                              <p className="text-xs text-[#7F7F7F] mb-0.5">{msg.date}</p>
                              <p className="text-xs font-medium text-[#595959]">{msg.time}</p>
                           </div>
                           <div>
                              <p className="text-sm font-medium text-[#595959] line-clamp-1">{msg.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                 <div className={`w-2 h-2 rounded-full ${msg.color}`} />
                                 <p className="text-xs text-[#7F7F7F]">{msg.sub}</p>
                              </div>
                           </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-[#A5A5A5] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                     </div>
                   ))}
                </div>
                <button className="w-full text-center text-xs font-bold text-[#7F7F7F] uppercase tracking-widest mt-6 hover:text-[#595959] transition-colors">
                   See all activity <ChevronRight className="w-3 h-3 inline -mt-0.5" />
                </button>
             </div>
           </ErrorBoundary>

           {/* Projects Pipeline */}
           <ErrorBoundary name="Projects Pipeline">
             <div className="bg-[#FFFFFF] rounded-2xl border border-[#A5A5A5] p-6 shadow-sm flex-1">
                <div className="mb-6 flex justify-between items-end">
                   <div>
                      <h2 className="text-lg font-medium text-[#595959] leading-tight mb-1">Projects Pipeline</h2>
                      <p className="text-xs text-[#7F7F7F]">Assigned / To Me</p>
                   </div>
                   <span className="text-[10px] uppercase font-bold text-[#7F7F7F] tracking-widest">Completion %</span>
                </div>
                
                <div className="space-y-6 mt-8">
                   {!isGuest && activeDeals.map(deal => {
                     const pct = calculatePhaseCompletion(deal.status);
                     return (
                       <div key={deal.id} className="flex items-center gap-4">
                          <p className="text-sm font-medium text-[#595959] w-28 truncate" title={deal.address || 'Unnamed'}>
                             {deal.address || 'Unnamed'}
                          </p>
                          <div className="flex-1 h-1.5 bg-[#F2F2F2] rounded-full overflow-hidden">
                             <div className="h-full bg-[#595959] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-14 text-right flex items-center justify-end gap-1.5">
                             <span className="text-xs text-[#7F7F7F] font-bold">{pct}%</span>
                             {pct < 50 ? <ArrowDownCircle className="w-3.5 h-3.5 text-[#A5A5A5]" /> : <ArrowUpCircle className="w-3.5 h-3.5 text-[#595959]" />}
                          </div>
                       </div>
                     );
                   })}
                   {(!isGuest && activeDeals.length === 0) && (
                      <p className="text-sm text-[#7F7F7F] text-center py-4">No active deals assigned to you.</p>
                   )}
                   {isGuest && (
                      <p className="text-sm text-[#7F7F7F] text-center py-4">Pipeline hidden for guest accounts.</p>
                   )}
                </div>
             </div>
           </ErrorBoundary>
        </div>
      </div>

    </div>
  );
}

