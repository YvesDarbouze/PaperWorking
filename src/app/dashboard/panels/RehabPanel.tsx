'use client';

import React, { Suspense } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { HardHat } from 'lucide-react';

/* Phase 3 Unified Rehab Tracker modules */
import RehabTracker from '@/components/rehab/RehabTracker';
import ROIRenovationTasks from '@/components/rehab/ROIRenovationTasks';
import PermitTrackingChecklist from '@/components/rehab/PermitTrackingChecklist';
import HoldingTimeline from '@/components/rehab/HoldingTimeline';
import HoldingCostTicker from '@/components/rehab/HoldingCostTicker';

export default function RehabPanel() {
  const currentProject = useProjectStore(state => state.currentProject);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-8 space-y-8 bg-pw-bg h-full overflow-y-auto w-full">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
          <HardHat className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">The Rehab Engine</h1>
          <p className="text-gray-500 mt-1">Phase 3: Execution, Milestones, and Cost Tracking</p>
        </div>
      </div>

      {!currentProject ? (
        <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
          <HardHat className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Target Property Selected</h3>
          <p className="mt-1">Select an active property from the Command Center to load the Rehab Tracker.</p>
        </div>
      ) : (
        <div className="space-y-8 pb-32">
          
          {/* Burn Rate & Holding Cost Calculator */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div>
               <h2 className="text-xl font-medium tracking-tight text-gray-900">Burn Rate & Capital</h2>
               <p className="text-sm text-gray-500 mt-1">Real-time holding cost clock and monthly expense monitoring.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-8">
                  <Suspense fallback={<div className="h-64 border border-pw-border bg-pw-surface animate-pulse rounded-xl" />}>
                     <HoldingTimeline />
                  </Suspense>
               </div>
               <div className="lg:col-span-4">
                  <Suspense fallback={<div className="h-64 border border-pw-border bg-pw-surface animate-pulse rounded-xl" />}>
                     <HoldingCostTicker />
                  </Suspense>
               </div>
            </div>
          </section>

          {/* High-ROI Budget Tracker */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
               <h2 className="text-xl font-medium tracking-tight text-gray-900">High-ROI Modules (The "Money Rooms")</h2>
               <p className="text-sm text-gray-500 mt-1">Focus capital deployment on kitchens, baths, and curb appeal.</p>
            </div>
            <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
              <ROIRenovationTasks />
            </Suspense>
          </section>

          {/* Permitting & Logistics Checklist */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
               <h2 className="text-xl font-medium tracking-tight text-gray-900">Permitting & Compliance</h2>
               <p className="text-sm text-gray-500 mt-1">Track regulatory approvals and inspection milestones.</p>
            </div>
            <Suspense fallback={<div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}>
              <PermitTrackingChecklist />
            </Suspense>
          </section>

          {/* Contractor Bid & Milestone Manager */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
               <h2 className="text-xl font-medium tracking-tight text-gray-900">Contractor Milestones</h2>
               <p className="text-sm text-gray-500 mt-1">Budget VS Actual, Contingency, and Subcontractor tracking.</p>
            </div>
            <Suspense fallback={<div className="h-96 bg-gray-50 rounded-xl animate-pulse" />}>
              <RehabTracker />
            </Suspense>
          </section>
          
        </div>
      )}
    </div>
  );
}
