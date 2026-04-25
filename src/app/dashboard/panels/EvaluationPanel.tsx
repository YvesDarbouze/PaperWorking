'use client';

import React, { lazy, Suspense, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import CostOfCapitalCalculator from '@/components/Calculators/CostOfCapitalCalculator';
import HoldingCostClock from '@/components/Calculators/HoldingCostClock';
import RuleOf70Warning from '@/components/Calculators/RuleOf70Warning';
import WhatIfSimulator from '@/components/Calculators/WhatIfSimulator';
import LenderVault from '@/components/LenderVault/LenderVault';
import InspectionChecklist from '@/components/Inspection/InspectionChecklist';

/* Phase-specific modules */
const DealAnalyzer = lazy(() => import('@/components/evaluation/DealAnalyzer'));
const MarketAnalysis = lazy(() => import('@/components/evaluation/MarketAnalysis'));
const FundingSourceTracker = lazy(() => import('@/components/evaluation/FundingSourceTracker'));
const SeventyPercentRule = lazy(() => import('@/components/Calculators/SeventyPercentRule'));

const InvestorEquityTable = lazy(() => import('@/components/team/InvestorEquityTable'));
const CrowdfundInviteModal = lazy(() => import('@/components/team/CrowdfundInviteModal'));

/* Find & Fund sub-modules */
const HistoricalLedger = lazy(() => import('@/components/findandfund/HistoricalLedger'));
const ProspectingBoard = lazy(() => import('@/components/findandfund/ProspectingBoard'));
const PledgeTracker = lazy(() => import('@/components/findandfund/PledgeTracker'));

/* ═══════════════════════════════════════════════════════
   Evaluation Panel — Lane 1 (Find & Fund)
   
   High-fidelity technical module for market math, 
   capital structure, and investor syndication.
   ═══════════════════════════════════════════════════════ */

export default function EvaluationPanel() {
  const currentProject = useProjectStore(state => state.currentProject);
  const [showCrowdfundModal, setShowCrowdfundModal] = useState(false);

  const totalEquity = currentProject?.fractionalInvestors?.reduce((s, i) => s + i.equityPercentage, 0) || 0;
  
  const shimmer = (
    <div className="h-40 border border-border-accent bg-bg-surface animate-pulse flex items-center justify-center">
       <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em]">Module_Syncing...</span>
    </div>
  );

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-20 bg-bg-primary border-x border-border-accent">
         <div className="w-16 h-16 border border-pw-black mb-6 flex items-center justify-center opacity-20">
            <div className="w-1.5 h-1.5 bg-pw-black animate-ping"></div>
         </div>
         <h1 className="text-xl font-black text-text-primary tracking-widest uppercase mb-2">Target_Required</h1>
         <p className="text-xs text-text-secondary font-bold uppercase tracking-widest leading-relaxed max-w-xs">
           Select a property from the Pipeline to activate market intelligence and capital modeling.
         </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-10 pb-20 max-w-6xl mx-auto space-y-12 bg-bg-primary border-x border-border-accent min-h-full">
      
      {/* ═══ Tactical Header ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-pw-black pb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="w-1.5 h-1.5 bg-pw-accent"></span>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.5em]">Phase_01: Find & Fund</p>
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter uppercase leading-none">Market.Intelligence</h1>
          <p className="text-[10px] font-bold text-text-secondary uppercase mt-3 tracking-widest">
            Capital sourcing and arithmetic modeling for <span className="text-text-primary">{currentProject.propertyName}</span>
          </p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Entity_ID</p>
           <p className="text-xs font-mono font-black text-text-primary">{currentProject.id}</p>
        </div>
      </div>

      {/* ── Section 0: Deal Analyzer ── */}
      <Suspense fallback={shimmer}>
        <DealAnalyzer />
      </Suspense>

      {/* ── Section 1: Operational Ledgers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Suspense fallback={shimmer}>
          <div className="lg:col-span-1 border border-border-accent bg-bg-surface p-6">
            <HistoricalLedger />
          </div>
        </Suspense>
        <Suspense fallback={shimmer}>
          <div className="lg:col-span-1 border border-border-accent bg-bg-surface p-6">
            <ProspectingBoard />
          </div>
        </Suspense>
        <Suspense fallback={shimmer}>
          <div className="lg:col-span-1 border border-border-accent bg-bg-surface p-6">
            <PledgeTracker />
          </div>
        </Suspense>
      </div>

      {/* ── Section 2: Deep Market Logic ── */}
      <section className="space-y-6">
         <div className="flex items-center justify-between border-b border-border-accent pb-4">
            <h2 className="text-xs font-black text-text-primary uppercase tracking-[0.3em]">Institutional_Market_Analysis</h2>
            <span className="text-[10px] text-text-secondary font-bold tracking-widest">v4.2_ENGINE</span>
         </div>
         <Suspense fallback={shimmer}>
           <MarketAnalysis />
         </Suspense>
      </section>

      {/* ── Section 2: Mathematical Constraints ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-border-accent p-8 bg-bg-surface flex flex-col justify-center">
          <HoldingCostClock />
        </div>
        <div className="border border-border-accent p-8 bg-bg-surface">
           <RuleOf70Warning />
        </div>
      </div>

      {/* ── Section 3: The 70% Anchor ── */}
      <Suspense fallback={shimmer}>
        <div className="border border-pw-black bg-bg-surface p-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <span className="text-8xl font-black text-text-primary">70</span>
           </div>
           <SeventyPercentRule />
        </div>
      </Suspense>

      {/* ── Section 4: Capital Stack Architecture ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Simulation */}
        <div className="lg:col-span-5 space-y-8">
          <div className="border-l-2 border-pw-accent pl-6 py-2">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest mb-1">Scenario_Modeling</h3>
            <p className="text-[10px] text-text-secondary font-bold uppercase">Dynamic debt vs equity simulations</p>
          </div>
          <CostOfCapitalCalculator />
          <WhatIfSimulator />
        </div>

        {/* Right Column: Sourcing */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-pw-black p-8 text-pw-white border border-pw-black shadow-2xl">
            <Suspense fallback={<div className="h-60 bg-pw-black/50 animate-pulse" />}>
              <FundingSourceTracker />
            </Suspense>
          </div>
          <LenderVault />
        </div>
      </div>

      {/* ── Section 5: Technical Diligence ── */}
      <div className="pt-10 border-t-4 border-pw-black">
         <InspectionChecklist />
      </div>

      {/* ── Section 6: Capital Ledger (Fractional) ── */}
      <section className="pt-10 space-y-6">
        <div className="bg-bg-surface border border-border-accent p-10">
          <div className="flex items-center justify-between mb-10 pb-6 border-b border-border-accent">
            <div>
              <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase">Investor.Cap_Table</h2>
              <p className="text-[10px] text-text-secondary font-bold uppercase mt-1 tracking-widest">Fractional equity allocation and commitment mapping.</p>
            </div>
            <button
              onClick={() => setShowCrowdfundModal(true)}
              className="px-8 py-4 text-xs font-black text-pw-white bg-pw-black uppercase tracking-[0.3em] hover:bg-pw-accent transition-all active:scale-95 border border-pw-black"
            >
              Issue Equity Invitation
            </button>
          </div>

          <Suspense fallback={shimmer}>
            <InvestorEquityTable projectId={currentProject.id} />
          </Suspense>
        </div>
      </section>

      {/* Crowdfund Modal Overlay */}
      {showCrowdfundModal && (
        <Suspense fallback={null}>
          <CrowdfundInviteModal
            projectId={currentProject.id}
            dealName={currentProject.propertyName}
            currentEquityAllocated={totalEquity}
            onClose={() => setShowCrowdfundModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
