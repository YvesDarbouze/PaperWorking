'use client';

import React, { useState } from 'react';
import { useDealStore } from '@/store/dealStore';
import { useAllDealsSync } from '@/hooks/useAllDealsSync';
import { Plus, Shield, Users, TrendingDown, Info } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import toast from 'react-hot-toast';
import { createPropertyDriveFolder } from '@/app/actions/drive';

import MinimizedDashboardView from '@/components/dashboard/MinimizedDashboardView';
import FullscreenLifecycleView from '@/components/dashboard/FullscreenLifecycleView';
import OperationalDashboardView from '@/components/dashboard/OperationalDashboardView';
import VarianceChart from '@/components/dashboard/VarianceChart';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

type RBACRole = 'Lead Investor' | 'Contractor';

export default function DashboardPage() {
  // Mount the real-time sync wrapper combining Firebase Data directly into Zustand
  useAllDealsSync();

  const metrics = useDealStore(state => state.metrics);
  const deals = useDealStore(state => state.deals);

  // Engine State
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  
  // Onboarding State
  const { isNewUser, hasActiveSubscription, onboardingStep, setNextStep } = useUserStore();
  
  // Mock RBAC State
  const [userRole, setUserRole] = useState<RBACRole>('Lead Investor');

  const handleAddDeal = async () => {
    const mockId = `deal_${Math.floor(Math.random() * 1000)}`;
    const mockAddr = `Property ${mockId}`;
    
    // Create Dummy Deal in Local State to demonstrate horizontal pipeline flow
    const setDeals = useDealStore.getState().setDeals;
    const newDeal = {
       id: mockId,
       organizationId: 'demo_org',
       propertyName: mockAddr,
       address: "123 Guided Tour St",
       status: "Lead" as const,
       members: {},
       financials: { purchasePrice: 0, estimatedARV: 0, costs: [] },
       createdAt: new Date(),
       updatedAt: new Date(),
       ownerUid: "test_user_1"
    };
    setDeals([newDeal, ...deals]);
    
    // If onboarding, advance to step 4!
    if (onboardingStep === 3) {
       setNextStep();
    }
    
    toast.loading('Provisioning Universal Hub on Google Drive...', { id: mockId });
    
    // Trigger Server Action
    const result = await createPropertyDriveFolder(mockId, mockAddr, 'lead.investor@example.com');
    
    if (result.success) {
      toast.success('Successfully linked to Google Drive!', { id: mockId });
    } else {
      toast.error('Drive API failed, check configuration.', { id: mockId });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f2] font-sans pb-24">
      
      {/* RBAC SIMULATOR TOGGLE (Mock Auth Header) */}
      <div className="bg-black text-white px-6 py-3 flex justify-between items-center z-50 sticky top-0">
         <div className="flex items-center space-x-4">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Auth Simulator</span>
            <div className="bg-white/10 p-1 rounded-lg flex space-x-1">
               <button 
                  onClick={() => setUserRole('Lead Investor')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${userRole === 'Lead Investor' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
               >
                  <Shield className="w-3 h-3 mr-1.5" /> Lead Investor
               </button>
               <button 
                  onClick={() => setUserRole('Contractor')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${userRole === 'Contractor' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
               >
                  <Users className="w-3 h-3 mr-1.5" /> Contractor / SME
               </button>
            </div>
         </div>
         <span className="text-xs text-gray-400">Viewing as: <strong className="text-white">{userRole}</strong></span>
      </div>

      {/* 
         If a deal is selected (only applicable in Lead Investor view), 
         we mount the Fullscreen Lifecycle View 
      */}
      {activeDealId && userRole === 'Lead Investor' && (
        <FullscreenLifecycleView 
           dealId={activeDealId} 
           onExit={() => setActiveDealId(null)} 
        />
      )}

      {/* Main Container */}
      <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 ${onboardingStep <= 2 && isNewUser && hasActiveSubscription ? 'blur-sm select-none pointer-events-none' : ''}`}>
         
         {isNewUser && hasActiveSubscription && <OnboardingWizard />}
         
         {/* CONDITIONAL RENDERING BASED ON ROLE */}
         {userRole === 'Lead Investor' ? (

            /* --- LEAD INVESTOR VIEW (Analytical & Strategic) --- */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                     <h1 className="text-4xl font-light text-gray-900 tracking-tight">Macro View</h1>
                     <p className="text-gray-500 text-sm mt-1">High-trust, institutional ledger of all active assets.</p>
                  </div>
                  
                  <div className="relative">
                     {onboardingStep === 3 && (
                        <div className="absolute -top-12 -left-4 bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg shadow-lg flex items-center animate-bounce whitespace-nowrap z-50">
                           <Info className="w-4 h-4 mr-2" /> Start the Tour! Create a Dummy Deal here.
                           <div className="absolute -bottom-1.5 left-10 w-3 h-3 bg-indigo-600 rotate-45"></div>
                        </div>
                     )}
                     <button 
                        onClick={handleAddDeal} 
                        className={`relative flex items-center justify-center space-x-2 px-5 py-3 rounded-md font-medium transition shadow-sm ${
                           onboardingStep === 3 
                           ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-500/50' 
                           : 'bg-black hover:bg-gray-800 text-white'
                        }`}
                     >
                        <Plus className="w-4 h-4"/>
                        <span>Add Target Property</span>
                     </button>
                  </div>
               </div>

               {/* Z-Pattern Layout: Top-Left (High Priority Config), Top-Right (Wide Charting) */}
               <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 
                 {/* Top Left Quadrant: Immediate Financial Health (The 5-Second Scan) */}
                 <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="rounded-2xl border-2 border-indigo-600 bg-white p-6 shadow-md hover:shadow-lg transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 right-0 right-[-10%] top-[-10%] bg-indigo-50 w-32 h-32 rounded-full opacity-50 blur-2xl"></div>
                      
                      <div className="flex justify-between items-start mb-2">
                         <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                           <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-2 animate-pulse"></span>
                           Live Portfolio ROI
                         </p>
                         <span className="text-[10px] text-gray-400 font-medium flex items-center">Live Sync</span>
                      </div>
                      
                      <h2 className="mt-1 text-5xl font-light text-gray-900 flex items-center">
                        {metrics.projectedROI > 0 ? metrics.projectedROI.toFixed(1) : '0.0'}%
                      </h2>
                      <p className="text-xs text-gray-500 mt-3 font-medium leading-relaxed">
                        Blended projection across <strong>{metrics.activeProjects} active deal pipelines</strong>. Focus on accelerating the Escrow phase to realize yields.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Holding Cost Clock</p>
                         <span className="text-[10px] text-gray-400 font-medium">Updated 2m ago</span>
                      </div>
                      
                      <h2 className="mt-1 text-4xl font-light text-red-600 flex items-center">
                        <TrendingDown className="w-8 h-8 mr-3 mb-1" />
                        ${Math.round(metrics.totalApprovedCosts * 0.0002).toLocaleString()}
                        <span className="ml-2 text-xs text-gray-400">/ day</span>
                      </h2>
                      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                        Simulated daily burn calculated against a 10% cost of capital. Every day of project delay actively reduces your final margin.
                      </p>
                    </div>
                 </div>

                 {/* Top Right Quadrant: Time-Series / Variance Chart */}
                 <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-300 transition-colors flex flex-col">
                   <div className="flex justify-between items-start mb-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Variance Report</p>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span> Live DB Sync
                      </span>
                   </div>
                   <div className="flex-1 relative">
                       <VarianceChart />
                   </div>
                 </div>
               </section>

               {/* Second Row: Capitalization Aggregation */}
               <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                 <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-300 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Capital Deployed</p>
                      <span className="text-[10px] text-gray-400 font-medium">Updated 5m ago</span>
                   </div>
                   <h2 className="mt-2 text-3xl font-light text-gray-900">
                     ${metrics.totalApprovedCosts.toLocaleString()} 
                   </h2>
                   <p className="text-[11px] text-gray-500 mt-2">Sum of all finalized acquisition and rehab draws currently isolated in escrow.</p>
                 </div>
                 
                 <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-300 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Projects</p>
                      <span className="text-[10px] text-gray-400 font-medium">Live Sync</span>
                   </div>
                   <h2 className="mt-2 text-3xl font-light text-gray-900">{metrics.activeProjects}</h2>
                   <p className="text-[11px] text-gray-500 mt-2">Properties currently moving through your 4-Phase Operational Matrix.</p>
                 </div>
               </section>

               {/* The Data-Dense Rows */}
               <section className="pt-4">
                  <MinimizedDashboardView deals={deals} onSelectDeal={setActiveDealId} />
               </section>
            </div>

         ) : (

            /* --- OPERATIONAL SME VIEW (Action-Oriented) --- */
            <OperationalDashboardView />

         )}

      </div>
    </div>
  );
}
