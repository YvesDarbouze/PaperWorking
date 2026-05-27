'use client';

import React, { useState, lazy, Suspense } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { Plus, Settings, UserCircle, Activity } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { usePaywall } from '@/hooks/usePaywall';
import { projectsService } from '@/lib/firebase/projects';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/skeletons';

import DealListInline from '@/components/dashboard/DealListInline';
import FullscreenLifecycleView from '@/components/dashboard/FullscreenLifecycleView';
import OperationalDashboardView from '@/components/dashboard/OperationalDashboardView';
import VarianceChart from '@/components/dashboard/VarianceChart';
import ProjectCreationWizard from '@/components/project/ProjectCreationWizard';
import InvestorInviteModal from '@/components/dashboard/InvestorInviteModal';
import { UserPlus } from 'lucide-react';

/* ── Command Center Modules (lazy-loaded) ── */
const VelocityOverheadKPI = lazy(() => import('@/components/dashboard/VelocityOverheadKPI'));
const MarketHeatMap = lazy(() => import('@/components/dashboard/MarketHeatMap'));
const GlobalTodoEngine = lazy(() => import('@/components/dashboard/GlobalTodoEngine'));
const ProjectGroomingAlerts = lazy(() => import('@/components/dashboard/ProjectGroomingAlerts'));
const OfferLetterQuickAction = lazy(() => import('@/components/dashboard/OfferLetterQuickAction'));
const YearlyPortfolioPerformance = lazy(() => import('@/components/dashboard/YearlyPortfolioPerformance'));
const AnalyticsSuite = lazy(() => import('@/components/dashboard/charts/AnalyticsSuite'));
const SettingsDrawer = lazy(() => import('./SettingsDrawer'));

/* ═══════════════════════════════════════════════════════
   Pipeline Panel — Lane 0 (Command Center)

   The Pipeline Home aggregates all account activity:
   • Global To-Do Engine — unified task rollup from all projects
   • Deal Grooming Alerts — logic-based deal health monitor
   • Offer Letter Quick Actions — one-click LOI generator
   • Metrics & Variance — portfolio-level KPIs
   • Active Pipeline — deal list with DealFolder icons
   ═══════════════════════════════════════════════════════ */

export default function PipelinePanel() {
  useAllDealsSync();
  const { user, profile } = useAuth();
  const { activeTenantId } = useTenant();
  const { isLead, role } = usePermissions();
  const { requireSubscription } = usePaywall();

  const metrics = useProjectStore(state => state.metrics);
  const projects = useProjectStore(state => state.projects);

  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const { hasActiveSubscription } = useUserStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const handleAddDeal = () => {
    if (!user) return;
    requireSubscription(() => {
      if (!activeTenantId || activeTenantId === 'org_placeholder') {
        toast.error('Organization sync in progress. Please wait a moment...');
        return;
      }
      setIsWizardOpen(true);
    });
  };

  const handleWizardSuccess = (projectId: string) => {
    setIsWizardOpen(false);
    setActiveDealId(projectId);
  };

  if (!isLead) {
    return <OperationalDashboardView />;
  }

  return (
    <div className="flex flex-col bg-bg-primary font-sans px-8 sm:px-12 lg:px-16 pt-12 pb-20">
      
      {/* Deal Creation Protocol (Wizard) */}
      {isWizardOpen && activeTenantId && (
        <ProjectCreationWizard
          organizationId={activeTenantId}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={handleWizardSuccess}
        />
      )}

      {/* Investor Invite Modal */}
      <InvestorInviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />

      {/* Settings Drawer */}
      <Suspense fallback={null}>
        <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>

      {activeDealId && (
        <FullscreenLifecycleView 
          projectId={activeDealId} 
          onExit={() => setActiveDealId(null)} 
        />
      )}

      <div className="w-full max-w-[1600px] 2xl:max-w-[1920px] mx-auto space-y-12 reveal-up">
         
         <div className="space-y-12 delay-1">

            {/* ═══ Command Center Header ═══ */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4 border-b border-pw-border">
               <div className="space-y-4">
                  <div className="flex items-center space-x-4 glass-card w-fit px-6 py-3 border border-pw-border">
                     <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-pw-border">
                        <UserCircle className="w-6 h-6 text-text-secondary" />
                     </div>
                     <div>
                        <p className="ag-label text-[9px] mb-0.5 opacity-80">Perspective Node</p>
                        <p className="text-base font-medium text-text-primary tracking-tight">{user?.displayName || 'Operator'} <span className="text-text-secondary opacity-40">/</span> <span className="text-text-secondary">{role}</span></p>
                     </div>
                  </div>
                  <h1 className="text-6xl font-normal text-text-primary tracking-tighter leading-none">Command Center</h1>
                  <p className="text-text-secondary text-lg font-normal tracking-tight max-w-xl">Real-time pipeline intelligence across all active organizational vectors.</p>
               </div>
               
               <div className="flex items-center gap-4">
                  <Suspense fallback={null}>
                     <OfferLetterQuickAction projects={projects} />
                  </Suspense>
 
                  <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="pw-interactive pw-btn pw-btn--secondary"
                      >
                        <UserPlus className="w-5 h-5 mr-2 inline" />
                        <span>Invite Investor</span>
                      </button>
 
                      <button 
                        onClick={handleAddDeal} 
                        aria-label="Add A Project"
                        className="pw-interactive pw-btn pw-btn--primary"
                      >
                        <Plus className="w-5 h-5 mr-3 inline transition-transform group-hover:rotate-90"/>
                        Add A Project
                      </button>
                   </div>
               </div>
            </div>

            <ErrorBoundary name="Velocity Overhead KPI">
              <Suspense fallback={
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <CardSkeleton key={i} className="opacity-70" />
                  ))}
                </div>
              }>
                <VelocityOverheadKPI projects={projects} />
              </Suspense>
            </ErrorBoundary>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 delay-2">
              <ErrorBoundary name="Global Todo Engine">
                <Suspense fallback={<CardSkeleton className="h-[400px] opacity-70" />}>
                  <GlobalTodoEngine projects={projects} onNavigateToDeal={setActiveDealId} />
                </Suspense>
              </ErrorBoundary>

              <ErrorBoundary name="Deal Grooming Alerts">
                <Suspense fallback={<CardSkeleton className="h-[400px] opacity-70" />}>
                  <ProjectGroomingAlerts projects={projects} onNavigateToDeal={setActiveDealId} />
                </Suspense>
              </ErrorBoundary>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 delay-3">
              <div className="lg:col-span-8 2xl:col-span-9">
                 <div className="glass-card border border-pw-border flex flex-col h-full min-h-[500px]">
                   <div className="flex justify-between items-start mb-12">
                      <div>
                        <p className="ag-label mb-2">Budget Variance Report</p>
                        <h2 className="text-3xl font-normal text-text-primary tracking-tighter">Fiscal_Drift_Analysis</h2>
                      </div>
                      <span className="bg-white/5 border border-pw-border text-text-primary text-[10px] font-bold px-4 py-1.5 uppercase tracking-[0.2em] flex items-center">
                         <Activity className="w-3 h-3 mr-2 animate-pulse" aria-hidden="true" /> LIVE TELEMETRY
                      </span>
                   </div>
                   <div className="flex-1 relative pb-4">
                       <VarianceChart />
                   </div>
                 </div>
              </div>

              <div className="lg:col-span-4 2xl:col-span-3">
                 <ErrorBoundary name="Market Heat Map">
                   <Suspense fallback={<CardSkeleton className="h-full opacity-70" />}>
                     <MarketHeatMap />
                    </Suspense>
                 </ErrorBoundary>
              </div>
            </section>

            <ErrorBoundary name="Yearly Portfolio Performance">
              <Suspense fallback={<ChartSkeleton className="opacity-70" height="h-[250px]" />}>
                <YearlyPortfolioPerformance projects={projects} />
              </Suspense>
            </ErrorBoundary>

            <ErrorBoundary name="Analytics Suite">
              <Suspense fallback={
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ChartSkeleton key={i} className="opacity-70" height="h-[250px]" />
                  ))}
                </div>
              }>
                <AnalyticsSuite projects={projects} />
              </Suspense>
            </ErrorBoundary>

            <section className="pt-8 mb-20">
               <DealListInline projects={projects} onSelectDeal={setActiveDealId} />
            </section>
         </div>
      </div>
    </div>
  );
}
