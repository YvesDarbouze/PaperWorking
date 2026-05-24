'use client';

import React, { Suspense, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { HardHat } from 'lucide-react';
import { deriveDualScopeMetrics } from '@/lib/metrics/reiMetrics';

/* Phase 3 Unified Rehab Tracker modules */
import RehabTracker from '@/components/rehab/RehabTracker';
import ROIRenovationTasks from '@/components/rehab/ROIRenovationTasks';
import PermitTrackingChecklist from '@/components/rehab/PermitTrackingChecklist';
import HoldingTimeline from '@/components/rehab/HoldingTimeline';
import HoldingCostTicker from '@/components/rehab/HoldingCostTicker';

/* Phase 3 Metric Visualization Components */
import {
  NOIBreakdownChart,
  CashFlowMeter,
  OERIndicator,
  OccupancyCard,
} from '@/components/metrics/phase3';

/* Phase 3 Cost Intelligence & Scheduling */
import YesterdayCostCard from '@/components/metrics/phase3/YesterdayCostCard';
import RehabPhaseBar from '@/components/metrics/phase3/RehabPhaseBar';
import CriticalPathGantt from '@/components/metrics/phase3/CriticalPathGantt';

export default function HoldPanel() {
  const currentProject = useProjectStore(state => state.currentProject);

  // Derive NOI computation inputs from current project financials
  const financials = currentProject?.financials;

  const metrics = useMemo(() => {
    if (!financials) return null;
    const { asset } = deriveDualScopeMetrics(
      financials,
      undefined,
      currentProject?.strategyType,
      currentProject?.currentPhase
    );
    return asset;
  }, [financials, currentProject?.strategyType, currentProject?.currentPhase]);

  const computedNOI = metrics?.noi ?? 0;
  const annualDebtService = metrics?.annualDebtService ?? 0;
  const oerOperatingExpenses = metrics?.noiComponents.totalOperatingExpenses ?? 0;
  const oerGrossRentalIncome = metrics?.noiComponents.grossRentalIncome ?? 0;

  // OccupancyCard — only shown for multi-unit properties
  const hasUnits = (financials?.numberOfUnits ?? 0) > 0;
  const rentPerUnit = useMemo(() => {
    const units = financials?.numberOfUnits ?? 1;
    const monthlyRent = financials?.monthlyGrossRent ?? 0;
    return units > 0 ? monthlyRent / units : monthlyRent;
  }, [financials]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-8 space-y-8 bg-bg-primary h-full overflow-y-auto w-full">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
          <HardHat className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-text-primary">Hold</h1>
          <p className="text-text-secondary mt-1">Phase 3: Execution, Milestones, and Cost Tracking</p>
        </div>
      </div>

      {!currentProject ? (
        <div className="p-12 text-center text-text-secondary border-2 border-dashed border-border-accent rounded-xl bg-bg-surface">
          <HardHat className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-text-primary">No Target Property Selected</h3>
          <p className="mt-1">Select an active property from the Command Center to load the Rehab Tracker.</p>
        </div>
      ) : (
        <div className="space-y-8 pb-32">

          {/* ── Yesterday's Cost Thumbnail + Burn Rate ─────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <Suspense fallback={<div className="h-40 border border-border-accent animate-shimmer" />}>
                <YesterdayCostCard />
              </Suspense>
            </div>
            <div className="lg:col-span-8 bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6 space-y-6">
              <div>
                 <h2 className="text-xl font-medium tracking-tight text-text-primary">Burn Rate & Capital</h2>
                 <p className="text-sm text-text-secondary mt-1">Real-time holding cost clock and monthly expense monitoring.</p>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                 <div className="xl:col-span-8">
                    <Suspense fallback={<div className="h-64 border border-border-accent animate-shimmer rounded-xl" />}>
                       <HoldingTimeline />
                    </Suspense>
                 </div>
                 <div className="xl:col-span-4">
                    <Suspense fallback={<div className="h-64 border border-border-accent animate-shimmer rounded-xl" />}>
                       <HoldingCostTicker />
                    </Suspense>
                 </div>
              </div>
            </div>
          </section>

          {/* ── Renovation Lifecycle & Critical Path ─────────── */}
          <section className="space-y-4">
            <Suspense fallback={<div className="h-20 border border-border-accent animate-shimmer" />}>
              <RehabPhaseBar />
            </Suspense>
            <Suspense fallback={<div className="h-64 border border-border-accent animate-shimmer" />}>
              <CriticalPathGantt />
            </Suspense>
          </section>

          {/* High-ROI Budget Tracker */}
          <section className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
            <div className="mb-6">
               <h2 className="text-xl font-medium tracking-tight text-text-primary">High-ROI Modules (The &quot;Money Rooms&quot;)</h2>
               <p className="text-sm text-text-secondary mt-1">Focus capital deployment on kitchens, baths, and curb appeal.</p>
            </div>
            <Suspense fallback={<div className="h-48 animate-shimmer rounded-xl" />}>
              <ROIRenovationTasks />
            </Suspense>
          </section>

          {/* Permitting & Logistics Checklist */}
          <section className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
            <div className="mb-6">
               <h2 className="text-xl font-medium tracking-tight text-text-primary">Permitting & Compliance</h2>
               <p className="text-sm text-text-secondary mt-1">Track regulatory approvals and inspection milestones.</p>
            </div>
            <Suspense fallback={<div className="h-40 animate-shimmer rounded-xl" />}>
              <PermitTrackingChecklist />
            </Suspense>
          </section>

          {/* Contractor Bid & Milestone Manager */}
          <section className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
            <div className="mb-6">
               <h2 className="text-xl font-medium tracking-tight text-text-primary">Contractor Milestones</h2>
               <p className="text-sm text-text-secondary mt-1">Budget VS Actual, Contingency, and Subcontractor tracking.</p>
            </div>
            <Suspense fallback={<div className="h-96 animate-shimmer rounded-xl" />}>
              <RehabTracker />
            </Suspense>
          </section>

          {/* ── Property Performance Metrics ─────────────────────── */}
          {financials && (
            <section className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6 space-y-6">
              <div>
                <h2 className="text-xl font-medium tracking-tight text-text-primary">Property Performance</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Live rental income analysis: NOI, cash flow, and operating efficiency.
                </p>
              </div>

              {/* NOI Breakdown — headline chart, full width */}
              <NOIBreakdownChart financials={financials} />

              {/* Cash Flow + OER side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CashFlowMeter
                  noi={computedNOI}
                  annualDebtService={annualDebtService}
                />
                <OERIndicator
                  operatingExpenses={oerOperatingExpenses}
                  grossRentalIncome={oerGrossRentalIncome}
                />
              </div>

              {/* Occupancy — multi-unit properties only */}
              {hasUnits && (
                <OccupancyCard
                  occupiedUnits={financials.occupiedUnits ?? 0}
                  totalUnits={financials.numberOfUnits ?? 1}
                  monthlyRentPerUnit={rentPerUnit}
                />
              )}
            </section>
          )}

        </div>
      )}
    </div>
  );
}
