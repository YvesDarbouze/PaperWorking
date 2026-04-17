'use client';

import React, { useState, lazy, Suspense } from 'react';
import { useDealStore } from '@/store/dealStore';
import { useAllDealsSync } from '@/hooks/useAllDealsSync';
import { Plus, Info, Settings, UserCircle } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { dealsService } from '@/lib/firebase/deals';

import DealListInline from '@/components/dashboard/DealListInline';
import FullscreenLifecycleView from '@/components/dashboard/FullscreenLifecycleView';
import OperationalDashboardView from '@/components/dashboard/OperationalDashboardView';
import VarianceChart from '@/components/dashboard/VarianceChart';
import DealCreationWizard from '@/components/deal/DealCreationWizard';

/* ── Command Center Modules (lazy-loaded) ── */
const VelocityOverheadKPI = lazy(() => import('@/components/dashboard/VelocityOverheadKPI'));
const GlobalTodoEngine = lazy(() => import('@/components/dashboard/GlobalTodoEngine'));
const DealGroomingAlerts = lazy(() => import('@/components/dashboard/DealGroomingAlerts'));
const OfferLetterQuickAction = lazy(() => import('@/components/dashboard/OfferLetterQuickAction'));
const YearlyPortfolioPerformance = lazy(() => import('@/components/dashboard/YearlyPortfolioPerformance'));
const AnalyticsSuite = lazy(() => import('@/components/dashboard/charts/AnalyticsSuite'));
const SettingsDrawer = lazy(() => import('./SettingsDrawer'));

/* ═══════════════════════════════════════════════════════
   Pipeline Panel — Lane 0 (Command Center)

   The Pipeline Home aggregates all account activity:
   • Global To-Do Engine — unified task rollup from all deals
   • Deal Grooming Alerts — logic-based deal health monitor
   • Offer Letter Quick Actions — one-click LOI generator
   • Metrics & Variance — portfolio-level KPIs
   • Active Pipeline — deal list with DealFolder icons
   ═══════════════════════════════════════════════════════ */

export default function PipelinePanel() {
  useAllDealsSync();
  const { user, profile } = useAuth();
  const { isLead, role } = usePermissions();

  const metrics = useDealStore(state => state.metrics);
  const deals = useDealStore(state => state.deals);

  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const { isNewUser, hasActiveSubscription, onboardingStep, setNextStep } = useUserStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleAddDeal = () => {
    if (!user) return;
    
    if (!profile?.organizationId || profile.organizationId === 'org_placeholder') {
      toast.error('Organization sync in progress. Please wait a moment...');
      return;
    }

    setIsWizardOpen(true);
  };

  const handleWizardSuccess = (dealId: string) => {
    setIsWizardOpen(false);
    if (onboardingStep === 3) {
      setNextStep();
    }
  };

  if (!isLead) {
    return <OperationalDashboardView />;
  }

  return (
    <div className="flex flex-col bg-pw-white font-sans px-4 sm:px-6 lg:px-8 pt-6 pb-8">
      
      {/* Deal Creation Protocol (Wizard) */}
      {isWizardOpen && profile?.organizationId && (
        <DealCreationWizard 
          organizationId={profile.organizationId}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={handleWizardSuccess}
        />
      )}

      {/* Settings Drawer */}
      <Suspense fallback={null}>
        <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>

      {activeDealId && (
        <FullscreenLifecycleView 
          dealId={activeDealId} 
          onExit={() => setActiveDealId(null)} 
        />
      )}

      <div className={`w-full max-w-7xl mx-auto space-y-8 ${onboardingStep <= 2 && isNewUser && hasActiveSubscription ? 'blur-sm select-none pointer-events-none' : ''}`}>
         
         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">

            {/* ═══ Command Center Header ═══ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
               <div>
                  <div className="flex items-center space-x-3 mb-4">
                     <div className="bg-pw-black p-2.5 border border-pw-black">
                        <UserCircle className="w-6 h-6 text-pw-accent" />
                     </div>
                     <div>
                        <p className="text-xs font-black text-pw-muted uppercase tracking-[0.5em] mb-1">Active Perspective</p>
                        <p className="text-xl font-black text-pw-black tracking-tight">{user?.displayName || 'Active User'} <span className="text-pw-muted font-normal"> / {role} Access</span></p>
                     </div>
                  </div>
                  <h1 className="text-4xl font-black text-pw-black tracking-tighter uppercase">Command Center</h1>
                  <p className="text-pw-muted text-xs font-bold uppercase tracking-widest mt-1">Real-time pipeline intelligence across all active deals.</p>
               </div>
               
               <div className="flex items-center gap-3">
                  <Suspense fallback={null}>
                    <OfferLetterQuickAction deals={deals} />
                  </Suspense>

                  <div className="relative">
                     {onboardingStep === 3 && (
                        <div className="absolute -top-12 -left-4 bg-pw-black text-pw-white text-xs px-4 py-2 font-black uppercase tracking-widest flex items-center animate-bounce whitespace-nowrap z-50 border border-pw-black shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                           <Info className="w-4 h-4 mr-2 text-pw-accent" /> Start the Tour! Create a Dummy Deal here.
                           <div className="absolute -bottom-1 left-10 w-2 h-2 bg-pw-black rotate-45 border-r border-b border-pw-black"></div>
                        </div>
                     )}
                     <button 
                        onClick={handleAddDeal} 
                        className={`relative flex items-center justify-center space-x-4 px-8 py-4 font-black transition-all border uppercase tracking-[0.3em] text-sm ${
                           onboardingStep === 3 
                           ? 'bg-pw-black border-pw-black text-pw-white shadow-[0_0_30px_rgba(0,0,0,0.15)] hover:bg-pw-accent' 
                           : 'bg-pw-black border-pw-black text-pw-white hover:bg-pw-accent'
                        }`}
                     >
                        <Plus className="w-4 h-4 text-pw-accent"/>
                        <span>Add Target Property</span>
                     </button>
                  </div>
               </div>
            </div>

            <Suspense fallback={
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border border-pw-border bg-pw-white p-4 animate-pulse min-h-[120px]">
                    <div className="h-3 bg-pw-bg rounded-none w-2/3 mb-3" />
                    <div className="h-6 bg-pw-bg rounded-none w-1/2 mb-2" />
                    <div className="h-2 bg-pw-bg rounded-none w-full" />
                  </div>
                ))}
              </div>
            }>
              <VelocityOverheadKPI deals={deals} />
            </Suspense>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Suspense fallback={
                <div className="border border-pw-border bg-pw-white p-8 animate-pulse">
                  <div className="h-4 bg-pw-bg rounded-none w-1/3 mb-4" />
                  <div className="space-y-3">
                    <div className="h-3 bg-pw-bg rounded-none w-3/4" />
                    <div className="h-3 bg-pw-bg rounded-none w-1/2" />
                    <div className="h-3 bg-pw-bg rounded-none w-2/3" />
                  </div>
                </div>
              }>
                <GlobalTodoEngine deals={deals} onNavigateToDeal={setActiveDealId} />
              </Suspense>

              <Suspense fallback={
                <div className="border border-pw-border bg-pw-white p-8 animate-pulse">
                  <div className="h-4 bg-pw-bg rounded-none w-1/3 mb-4" />
                  <div className="space-y-3">
                    <div className="h-3 bg-pw-bg rounded-none w-3/4" />
                    <div className="h-3 bg-pw-bg rounded-none w-1/2" />
                    <div className="h-3 bg-pw-bg rounded-none w-2/3" />
                  </div>
                </div>
              }>
                <DealGroomingAlerts deals={deals} onNavigateToDeal={setActiveDealId} />
              </Suspense>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 flex flex-col gap-6">
                 <div className="border border-pw-black bg-pw-white p-8 shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                   <div className="absolute top-0 right-0 right-[-10%] top-[-10%] bg-pw-accent w-32 h-32 opacity-10 blur-3xl group-hover:opacity-20 transition-opacity"></div>
                   <div className="flex justify-between items-start mb-4">
                      <p className="text-xs font-black text-pw-black uppercase tracking-[0.3em] flex items-center">
                        <span className="w-2 h-2 bg-pw-accent mr-2 animate-pulse"></span>
                        Live Portfolio ROI
                      </p>
                      <span className="text-xs text-pw-muted font-bold uppercase tracking-widest">LIVE_SYNC</span>
                   </div>
                   <h2 className="mt-1 text-5xl font-black text-pw-black flex items-center tracking-tighter font-mono">
                     {metrics.projectedROI > 0 ? metrics.projectedROI.toFixed(1) : '0.0'}%
                   </h2>
                   <p className="text-xs text-pw-subtle mt-6 font-bold uppercase tracking-wider leading-relaxed">
                     Blended projection across <strong className="text-pw-black">{metrics.activeProjects} active pipelines</strong>. <br/>Precision threshold: ±0.4%.
                   </p>
                 </div>
              </div>

              <div className="lg:col-span-2 border border-pw-border bg-pw-white p-8 shadow-sm hover:border-pw-black transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-6">
                   <p className="text-xs font-black text-pw-muted uppercase tracking-[0.3em]">Budget Variance Report</p>
                   <span className="text-xs text-pw-muted font-bold uppercase tracking-widest flex items-center">
                      <span className="w-1.5 h-1.5 bg-pw-accent mr-1.5"></span> Operational_State
                   </span>
                </div>
                <div className="flex-1 relative">
                    <VarianceChart />
                </div>
              </div>
            </section>

            <Suspense fallback={
              <div className="border border-pw-border bg-pw-white p-8 animate-pulse">
                <div className="h-4 bg-pw-bg rounded-none w-1/3 mb-4" />
                <div className="grid grid-cols-6 gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 bg-pw-bg rounded-none" />
                  ))}
                </div>
              </div>
            }>
              <YearlyPortfolioPerformance deals={deals} />
            </Suspense>

            <Suspense fallback={
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[320px] border border-pw-border bg-pw-white animate-pulse">
                    <div className="px-5 pt-4 pb-3 border-b border-pw-border">
                      <div className="h-3 bg-pw-bg rounded-none w-1/3" />
                    </div>
                    <div className="p-5">
                      <div className="h-[230px] bg-pw-bg rounded-none" />
                    </div>
                  </div>
                ))}
              </div>
            }>
              <AnalyticsSuite deals={deals} />
            </Suspense>

            <section className="pt-4">
               <DealListInline deals={deals} onSelectDeal={setActiveDealId} />
            </section>
         </div>
      </div>
    </div>
  );
}
