'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import PhaseBadge from '../ui/PhaseBadge';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Play } from 'lucide-react';
import Phase4Outcome from '@/components/exit/Phase4Outcome';
import RentalPropertyCalculator from '../project/RentalPropertyCalculator';
import toast from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { projectsService } from '@/lib/firebase/projects';
import { transitionProjectPhase } from '@/lib/services/projectStateMachine';
import { computeNOIComponents, computeCapRate, computeContingencyBudget, computeDailyBurnRate, computeRenovationROI, computeOverImprovementRisk, computeRehabStageProgress, computeYesterdayCost, computeCriticalPath } from '@/lib/metrics/reiMetrics';
import ProjectTodoList from '../project/ProjectTodoList';
import AcquisitionInterview from '@/components/acquisition/AcquisitionInterview';
import PurchaseInterview from '@/components/purchase/PurchaseInterview';
import HoldInterview from '@/components/hold/HoldInterview';
import { computePhaseProgress } from '@/lib/utils/projectProgress';

/* ── Lazy-loaded analytics panel ── */
import { lazy, Suspense } from 'react';
const NOIDeepDive = lazy(() => import('@/components/dashboard/charts/NOIDeepDive'));
const CashFlowDeepDive = lazy(() => import('@/components/dashboard/charts/CashFlowDeepDive'));
const CapRateDeepDive = lazy(() => import('@/components/dashboard/charts/CapRateDeepDive'));
const CoCReturnDeepDive = lazy(() => import('@/components/dashboard/charts/CoCReturnDeepDive'));
const GRMDeepDive = lazy(() => import('@/components/dashboard/charts/GRMDeepDive'));
const DSCRDeepDive = lazy(() => import('@/components/dashboard/charts/DSCRDeepDive'));
const IRRDeepDive = lazy(() => import('@/components/dashboard/charts/IRRDeepDive'));
const OccupancyDeepDive = lazy(() => import('@/components/dashboard/charts/OccupancyDeepDive'));
const ExpenseRatioDeepDive = lazy(() => import('@/components/dashboard/charts/ExpenseRatioDeepDive'));
const AppreciationDeepDive = lazy(() => import('@/components/dashboard/charts/AppreciationDeepDive'));
const FlipProfitabilityDashboard = lazy(() => import('@/components/dashboard/charts/FlipProfitabilityDashboard'));
const LTVDeepDive = lazy(() => import('@/components/dashboard/charts/LTVDeepDive'));
const MLSPropertyScout = lazy(() => import('@/components/acquisition/MLSPropertyScout'));

interface FullscreenLifecycleViewProps {
  projectId: string;
  onExit: () => void;
}

import { PHASE_BACKGROUNDS } from '@/lib/constants/phaseMessages';

export const PHASES = [
  { id: 1, title: 'Acquisition', bg: '#F2F2F2' },
  { id: 2, title: 'Fund', bg: '#CCCCCC' },
  { id: 3, title: 'Hold', bg: '#A5A5A5' },
  { id: 4, title: 'Exit', bg: '#595959' },
];

export default function FullscreenLifecycleView({ projectId, onExit }: FullscreenLifecycleViewProps) {
  const { isLead, isContractor, role } = usePermissions();
  const projects = useProjectStore(state => state.projects);
  const ledgerItems = useProjectStore(state => state.ledgerItems);
  const deal = projects.find(d => d.id === projectId);
  
  // Start the fullscreen lifecycle view on the deal's current phase or phase 1
  const [currentPhase, setCurrentPhase] = useState(deal?.currentPhase || 1);

  if (!deal) {
     onExit();
     return null;
  }

  const handleNext = () => {
     if (currentPhase < 4) setCurrentPhase(prev => prev + 1);
  };

  const handlePrev = () => {
     if (currentPhase > 1) setCurrentPhase(prev => prev - 1);
  };

  // Determine physics-based framing
  const activePhaseMap = PHASES[currentPhase - 1] || PHASES[0];
  const completionPercentage = computePhaseProgress(deal, currentPhase);

  return (
    <motion.div 
      layoutId={`folder-${deal.id}`}
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-1000 ease-in-out`}
      style={{ backgroundColor: activePhaseMap.bg }}
    >
       
       <header 
         className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40 backdrop-blur-sm border-b border-black/5 transition-colors duration-1000 ease-in-out" 
         style={{ backgroundColor: activePhaseMap.bg }}
       >
          <div className="flex items-center space-x-6">
            <button onClick={onExit} className="flex items-center text-text-primary/70 hover:text-text-primary font-medium transition-colors bg-bg-surface/20 px-4 py-2 rounded-lg">
               <ArrowLeft className="w-4 h-4 mr-2" /> Close Project
            </button>
            <div className="flex flex-col">
               <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60 text-text-primary mix-blend-color-burn">Phase Completion</p>
               <div className="flex items-center space-x-2 mt-1">
                 <div className="w-32 h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-black/60 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                 </div>
                 <span className="text-xs font-bold mix-blend-color-burn">{completionPercentage}%</span>
               </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <h3 className="text-xl font-medium tracking-tight mix-blend-color-burn">{deal.propertyName}</h3>
             <p className="text-xs font-mono uppercase tracking-widest opacity-60 mix-blend-color-burn">Lifecycle View</p>
          </div>
          
          <div className="ml-8 pl-8 border-l border-white/10 flex items-center space-x-3">
             <div className="flex flex-col items-end mr-4">
                <span className="text-xs font-bold text-text-primary/40 uppercase tracking-widest">Current Status</span>
                <PhaseBadge status={deal.status} />
             </div>
             <button 
               onClick={async () => {
                  const nextMap: Record<string, string> = {
                     'Sourcing': 'Under Contract',
                     'Lead': 'Under Contract',
                     'Active': 'Under Contract',
                     'Under Contract': 'Rehab',
                     'Rehab': 'Listed',
                     'Renovating': 'Listed',
                     'Listed': 'Sold',
                     'Sold': 'Rented'
                  };
                  const nextPhase = nextMap[deal.status];
                  if (nextPhase) {
                     // Phase 1 Sourcing Gating
                     if (deal.currentPhase === 1 || deal.status === 'Lead' || deal.status === 'Active') {
                        const missing: string[] = [];
                        if (!deal.address) missing.push("Property Address");
                        if (!deal.strategyType) missing.push("Strategy Type");
                        if ((deal.financials?.ownershipPercentage ?? 0) <= 0) missing.push("Ownership Percentage");
                        const targetPrice = deal.financials?.targetPrice ?? deal.financials?.targetPurchasePrice ?? deal.financials?.purchasePrice;
                        if (!targetPrice || targetPrice <= 0) missing.push("Projected Target Purchase Price");
                        const offerStatus = deal.financials?.offerStatus;
                        if (offerStatus !== 'Accepted' && deal.status !== 'Under Contract') {
                           missing.push("Accepted Offer (Offer Status must be 'Accepted')");
                        }

                        if (missing.length > 0) {
                           toast.error(`Cannot advance to Closing. Missing: ${missing.join(', ')}`);
                           return;
                        }
                     }

                     // Phase 2 Closing Gating
                     if (deal.currentPhase === 2 || deal.status === 'Under Contract') {
                        const missingP2: string[] = [];
                        if (!deal.financials?.purchasePrice || deal.financials.purchasePrice <= 0)
                           missingP2.push("Actual Purchase Price");
                        if (deal.financials?.totalCashInvested == null && deal.financials?.financingCashInvested == null)
                           missingP2.push("Total Cash Invested");
                        if (deal.financials?.financingType === 'Financed') {
                           if (!deal.financials?.loanAmount || deal.financials.loanAmount <= 0)
                              missingP2.push("Loan Amount");
                           if (!deal.financials?.loanInterestRate || deal.financials.loanInterestRate <= 0)
                              missingP2.push("Interest Rate");
                           if (!deal.financials?.loanTermYears || deal.financials.loanTermYears <= 0)
                              missingP2.push("Loan Term");
                        }
                        if (!deal.financials?.acquisitionDate)
                           missingP2.push("Acquisition / Closing Date");
                        if (!deal.isClearToClose)
                           missingP2.push("Clear to Close (complete Closing Disclosure section)");

                        if (missingP2.length > 0) {
                           toast.error(`Cannot advance to Hold. Missing: ${missingP2.join(', ')}`);
                           return;
                        }
                     }

                     // Phase 3 Hold Gating
                     if (deal.currentPhase === 3 || (deal.status as string) === 'Rehab' || deal.status === 'Renovating') {
                        const strategy = deal.strategyType;
                        const isSell = strategy === 'Sell';
                        const isFlip = strategy === 'Fix & Flip';
                        const isRental = strategy === 'Buy & Hold' || strategy === 'Rent';
                        const isBRRRR = strategy === 'Rent';

                        const missingHold: string[] = [];

                        const hasRehabDone = deal.financials?.rehabDoneDate != null;
                        const hasCurrentValue = (deal.financials?.estimatedCurrentValue || 0) > 0;
                        const hasTenantPlaced = (deal.financials?.daysOccupied || 0) > 0 || (deal.financials?.occupiedUnits || 0) > 0;
                        const hasOpex = (deal.financials?.holdingCostTaxes || 0) > 0 ||
                                         (deal.financials?.holdingCostInsurance || 0) > 0 ||
                                         (deal.financials?.holdingCostUtilities || 0) > 0 ||
                                         (deal.financials?.propertyManagementFee || 0) > 0 ||
                                         (deal.financials?.monthlyMaintenanceReserve || 0) > 0 ||
                                         (deal.financials?.monthlyHOA || 0) > 0;

                        if (isBRRRR) {
                           if (!hasRehabDone) missingHold.push("Rehab Completion Date");
                           if (!hasCurrentValue) missingHold.push("Current Estimated Value (> $0)");
                           if (!hasTenantPlaced) missingHold.push("Tenant Placement (Days Occupied or Occupied Units > 0)");
                           if (!hasOpex) missingHold.push("Captured Monthly Operating Expenses (at least one category > $0)");
                        } else if (isFlip) {
                           if (!hasRehabDone) missingHold.push("Rehab Completion Date");
                           if (!hasCurrentValue) missingHold.push("Current Estimated Value (> $0)");
                        } else if (isSell) {
                           // Wholesale / Direct Sell — no rehab, just needs a value estimate
                           if (!hasCurrentValue) missingHold.push("Current Estimated Value (> $0)");
                        } else if (isRental) {
                           if (!hasTenantPlaced) missingHold.push("Tenant Placement (Days Occupied or Occupied Units > 0)");
                           if (!hasOpex) missingHold.push("Captured Monthly Operating Expenses (at least one category > $0)");
                        }

                        if (missingHold.length > 0) {
                           toast.error(`Cannot advance to Exit. Missing: ${missingHold.join(', ')}`);
                           return;
                        }
                     }

                     try {
                        await transitionProjectPhase(deal.id, deal.status as any, nextPhase as any, 'system');
                        toast.success(`Deal advanced to ${nextPhase}`);
                     } catch (e) {
                        toast.error('Failed to transition phase');
                     }
                  }
               }}
               className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#F2F2F2] transition-all flex items-center space-x-2"
             >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Advance Phase</span>
             </button>
          </div>
       </header>

       {/* Swipe / Click Edges */}
       {currentPhase > 1 && (
         <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-bg-surface/30 hover:bg-bg-surface/50 p-3 rounded-full backdrop-blur transition-all group">
            <ChevronLeft className="w-8 h-8 text-text-primary/50 group-hover:text-text-primary" />
         </button>
       )}
       
       {currentPhase < 4 && (
         <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-bg-surface/30 hover:bg-bg-surface/50 p-3 rounded-full backdrop-blur transition-all group">
            <ChevronRight className="w-8 h-8 text-text-primary/50 group-hover:text-text-primary" />
         </button>
       )}

       {/* Main Router Content */}
       <div className="flex-1 w-full relative overflow-hidden pt-24 pb-8">
          <AnimatePresence mode="wait">
             <motion.div
               key={currentPhase}
               initial={{ opacity: 0, x: 100 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -100 }}
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
               className="absolute inset-0 h-full w-full flex justify-center items-center overflow-y-auto px-16 lg:px-32"
             >
                {currentPhase === 1 && <StaticPhase1 deal={deal} />}
                {currentPhase === 2 && <StaticPhase2 deal={deal} />}
                {currentPhase === 3 && <StaticPhase3 deal={deal} ledgerItems={ledgerItems[deal.id] || []} canAdd={isLead || isContractor} />}
                {currentPhase === 4 && <Phase4Outcome projectId={projectId} />}
             </motion.div>
          </AnimatePresence>
       </div>

       {/* Top Kanban / Timeline Indicator */}
       <div className="absolute top-24 left-0 right-0 flex justify-center space-x-2 z-40 px-6">
          {PHASES.map((p) => (
             <div 
                key={p.id} 
                onClick={() => setCurrentPhase(p.id)} 
                className={`
                  flex-1 max-w-xs h-10 rounded-lg cursor-pointer transition-all duration-500 flex items-center justify-center px-4 font-bold text-xs uppercase tracking-widest shadow-sm
                  ${p.id === currentPhase ? 'bg-black/80 text-white shadow-md scale-[1.02]' : 'bg-black/10 hover:bg-black/20 text-black/60'}
                `}
              >
                <span>{p.title}</span>
              </div>
          ))}
       </div>
    </motion.div>
  );
}

/* --- Placeholder Components to Fulfill Viewport Constraints --- */

const RefreshCw = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);

function ExplainerVideoPlaceholder({ phaseName }: { phaseName: string }) {
  return (
    <div className="w-full aspect-video bg-black/40 border border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-black/50 transition-colors group mb-8 shadow-inner">
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg backdrop-blur-md">
        <Play className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 ml-1" />
      </div>
      <p className="mt-4 text-xs font-bold text-white/60 tracking-widest uppercase">Watch {phaseName} Explainer</p>
    </div>
  );
}

function StaticPhase1({ deal }: { deal: Project }) {
  const noiComponents = deal.financials ? computeNOIComponents(deal.financials, deal.strategyType, deal.currentPhase) : null;
  const capRate = noiComponents && deal.financials?.purchasePrice
    ? computeCapRate(noiComponents.noi, deal.financials.purchasePrice)
    : 0;
  const hasNOIData = noiComponents && noiComponents.grossRentalIncome > 0;

  return (
    <div className="w-full max-w-6xl bg-bg-surface/60 backdrop-blur rounded-2xl p-10 shadow-2xl text-center border border-white/20 mt-12 mb-12">
       <h1 className="text-4xl font-normal text-text-primary mb-4">Phase 1: Acquisition</h1>
       <p className="text-text-secondary mb-8">Review your deal numbers and financing breakdown for {deal.address || 'your property'}.</p>
       
       <AcquisitionInterview deal={deal} />
       
       <ExplainerVideoPlaceholder phaseName="Acquisition" />

       {/* ── MLS Property Scout — Live Search for Comparables ── */}
       <div className="text-left mb-4">
         <Suspense
           fallback={
             <div className="animate-pulse bg-bg-surface/40 rounded-xl h-32 flex items-center justify-center">
               <span className="text-xs text-text-secondary uppercase tracking-widest">Loading MLS Search…</span>
             </div>
           }
         >
           <MLSPropertyScout
             currentAddress={deal.address}
             currentListPrice={deal.financials?.purchasePrice || deal.financials?.listedPrice}
           />
         </Suspense>
       </div>
       
       {/* ── KPI Strip ── */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
           <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Purchase Price</p>
           <p className="text-xl font-bold tabular-nums text-text-primary mt-1">${(deal.financials.purchasePrice || 0).toLocaleString()}</p>
         </div>
         {deal.financials.estimatedARV ? (
           <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">After-Repair Value</p>
             <p className="text-xl font-bold tabular-nums text-text-primary mt-1">${deal.financials.estimatedARV.toLocaleString()}</p>
           </div>
         ) : null}
         {deal.financials.estimatedARV && deal.financials.projectedRehabCost ? (() => {
           const arv = deal.financials.estimatedARV || 0;
           const rehab = deal.financials.projectedRehabCost || 0;
           const closing = deal.financials.fixedAcquisitionCosts || 0;
           const mao = Math.round((arv * 0.70) - rehab - closing);
           const pp = deal.financials.purchasePrice || 0;
           const diff = mao - pp;
           return (
             <div className="bg-bg-surface/80 rounded-xl p-4 border text-left" style={{ borderColor: diff >= 0 ? '#1A1A1A' : '#595959' }}>
               <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">MAO (70% Rule)</p>
               <p className="text-xl font-bold tabular-nums mt-1" style={{ color: diff >= 0 ? '#1A1A1A' : '#595959' }}>${mao.toLocaleString()}</p>
               <p className="text-[9px] font-bold mt-1" style={{ color: diff >= 0 ? '#1A1A1A' : '#595959' }}>
                 {diff >= 0 ? `$${diff.toLocaleString()} under` : `$${Math.abs(diff).toLocaleString()} over`}
               </p>
             </div>
           );
         })() : null}
         {deal.financials.projectedRehabCost ? (
           <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Rehab Budget</p>
             <p className="text-xl font-bold tabular-nums text-text-primary mt-1">${deal.financials.projectedRehabCost.toLocaleString()}</p>
             {deal.financials.estimatedTimelineDays ? (
               <p className="text-[9px] text-text-secondary opacity-50 mt-1">{deal.financials.estimatedTimelineDays} days est.</p>
             ) : null}
           </div>
         ) : null}
         {hasNOIData && (
           <>
             <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
               <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Annual NOI</p>
               <p className="text-xl font-bold tabular-nums mt-1" style={{ color: noiComponents.noi >= 0 ? '#1A1A1A' : '#595959' }}>${Math.round(noiComponents.noi).toLocaleString()}</p>
             </div>
             <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
               <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Cap Rate</p>
               <p className="text-xl font-bold tabular-nums text-text-primary mt-1">{capRate.toFixed(2)}%</p>
             </div>
             <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
               <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Monthly NOI</p>
               <p className="text-xl font-bold tabular-nums text-text-primary mt-1">${Math.round(noiComponents.noi / 12).toLocaleString()}</p>
             </div>
           </>
         )}
       </div>

       {/* ── Full NOI Deep Dive — Waterfall + Donut + P&L ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading NOI Analytics…</span>
               </div>
             }
           >
             <NOIDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}
       
       {/* ── Cash Flow Deep Dive — NOI minus Debt Service ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading Cash Flow Analytics…</span>
               </div>
             }
           >
             <CashFlowDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Cap Rate Deep Dive — NOI ÷ Purchase Price ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading Cap Rate Analytics…</span>
               </div>
             }
           >
             <CapRateDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Cash-on-Cash Return — Annual CF ÷ Total Cash Invested ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading CoC Return Analytics…</span>
               </div>
             }
           >
             <CoCReturnDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Gross Rent Multiplier — Quick Screen ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading GRM Analytics…</span>
               </div>
             }
           >
             <GRMDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── DSCR — Can the property cover its mortgage? ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading DSCR Analytics…</span></div>}>
             <DSCRDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── IRR — Total Lifecycle Return ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading IRR Analytics…</span></div>}>
             <IRRDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Occupancy Rate ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Occupancy Analytics…</span></div>}>
             <OccupancyDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Expense Ratio ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Expense Ratio Analytics…</span></div>}>
             <ExpenseRatioDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Long-Term Appreciation ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Appreciation Analytics…</span></div>}>
             <AppreciationDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Flip Profitability Dashboard ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Flip Profitability…</span></div>}>
             <FlipProfitabilityDashboard projects={[deal]} />
           </Suspense>
         </div>
       )}

       <ProjectTodoList deal={deal} phase={1} />
    </div>
  );
}

function StaticPhase2({ deal }: { deal: Project }) {
  const noiComponents = deal.financials ? computeNOIComponents(deal.financials, deal.strategyType, deal.currentPhase) : null;
  const hasNOIData = noiComponents && noiComponents.grossRentalIncome > 0;

  // ── Phase 2 Budget Planning Metrics ──
  const contingency = deal.financials ? computeContingencyBudget(deal.financials) : null;
  const burnRate = deal.financials ? computeDailyBurnRate(deal.financials) : null;
  const hasBudgetData = contingency && contingency.repairCost > 0;

  // LTV
  const loanAmount = deal.financials?.loanAmount ?? 0;
  const purchasePrice = deal.financials?.purchasePrice ?? 0;
  const ltv = purchasePrice > 0 && loanAmount > 0 ? Math.round((loanAmount / purchasePrice) * 100) : 0;

  return (
    <div className="w-full max-w-6xl bg-bg-surface/60 backdrop-blur rounded-2xl p-10 shadow-2xl border border-white/20 mt-12 mb-12">
       <h1 className="text-4xl font-normal text-text-primary mb-2 text-center">Phase 2: Financing & Budget</h1>
       <p className="text-text-secondary mb-8 text-center max-w-2xl mx-auto">
         Secure capital, assign a dollar amount to every task, and create the financial roadmap for the entire project. A miscalculated budget erodes profit just as fast as overpaying for the property.
       </p>
       
       <PurchaseInterview deal={deal} />
       
       <ExplainerVideoPlaceholder phaseName="Financing" />

       {/* ── Budget Planning KPI Strip ── */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         {/* Total Project Budget */}
         <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
           <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Total Project Budget</p>
           <p className="text-xl font-bold tabular-nums text-text-primary mt-1">
             ${(contingency?.totalProjectBudget ?? 0).toLocaleString()}
           </p>
           <p className="text-[9px] text-text-secondary opacity-50 mt-1">Purchase + Repairs + Contingency + Closing</p>
         </div>

         {/* 15% Contingency */}
         {hasBudgetData ? (
           <div className="bg-bg-surface/80 rounded-xl p-4 border text-left" style={{ borderColor: '#7F7F7F' }}>
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">15% Contingency Reserve</p>
             <p className="text-xl font-bold tabular-nums mt-1" style={{ color: '#7F7F7F' }}>
               ${contingency.contingencyAmount.toLocaleString()}
             </p>
             <p className="text-[9px] mt-1" style={{ color: '#7F7F7F' }}>
               For hidden surprises — not upgrades
             </p>
           </div>
         ) : (
           <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">15% Contingency</p>
             <p className="text-sm text-text-secondary mt-1">Enter rehab budget to calculate</p>
           </div>
         )}

         {/* Daily Burn Rate */}
         {burnRate && burnRate.dailyBurnRate > 0 ? (
           <div className="bg-bg-surface/80 rounded-xl p-4 border text-left" style={{ borderColor: '#595959' }}>
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Daily Burn Rate</p>
             <p className="text-xl font-bold tabular-nums mt-1" style={{ color: '#595959' }}>
               ${burnRate.dailyBurnRate.toLocaleString()}/day
             </p>
             <p className="text-[9px] mt-1" style={{ color: '#595959' }}>
               ${burnRate.totalMonthlyBurn.toLocaleString()}/mo holding cost
             </p>
           </div>
         ) : (
           <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Daily Burn Rate</p>
             <p className="text-sm text-text-secondary mt-1">Enter holding costs to calculate</p>
           </div>
         )}

         {/* LTV */}
         <div className="bg-bg-surface/80 rounded-xl p-4 border border-border-accent text-left">
           <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Loan-to-Value</p>
           <p className="text-xl font-bold tabular-nums text-text-primary mt-1">{ltv}%</p>
           {loanAmount > 0 && (
             <p className="text-[9px] text-text-secondary opacity-50 mt-1">
               ${loanAmount.toLocaleString()} of ${purchasePrice.toLocaleString()}
             </p>
           )}
         </div>
       </div>

       {/* ── Budget Breakdown Panel ── */}
       {hasBudgetData && (
         <div className="bg-bg-surface/80 rounded-xl p-6 border border-border-accent mb-8">
           <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-4">
             Budget Breakdown — 15% Contingency Rule
           </h3>
           <div className="space-y-3">
             {/* Purchase */}
             <div className="flex justify-between items-center">
               <span className="text-sm text-text-primary">Purchase Price</span>
               <span className="text-sm font-bold tabular-nums text-text-primary">${contingency.purchasePrice.toLocaleString()}</span>
             </div>
             {/* Repairs */}
             <div className="flex justify-between items-center">
               <span className="text-sm text-text-primary">Estimated Repairs</span>
               <span className="text-sm font-bold tabular-nums text-text-primary">${contingency.repairCost.toLocaleString()}</span>
             </div>
             {/* Contingency */}
             <div className="flex justify-between items-center">
               <span className="text-sm flex items-center" style={{ color: '#7F7F7F' }}>
                 <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ background: '#7F7F7F' }} />
                 Contingency ({Math.round(contingency.contingencyRate * 100)}%)
               </span>
               <span className="text-sm font-bold tabular-nums" style={{ color: '#7F7F7F' }}>+ ${contingency.contingencyAmount.toLocaleString()}</span>
             </div>
             {/* Holding & Closing */}
             <div className="flex justify-between items-center">
               <span className="text-sm text-text-primary">Holding & Closing Costs</span>
               <span className="text-sm font-bold tabular-nums text-text-primary">${contingency.holdingAndClosingCosts.toLocaleString()}</span>
             </div>
             <div className="border-t border-border-accent my-2" />
             {/* Total */}
             <div className="flex justify-between items-center">
               <span className="text-base font-bold text-text-primary">Total Project Budget</span>
               <span className="text-base font-bold tabular-nums text-text-primary">${contingency.totalProjectBudget.toLocaleString()}</span>
             </div>
           </div>

           {/* Visual: Stacked Budget Bar */}
           {contingency.totalProjectBudget > 0 && (() => {
             const total = contingency.totalProjectBudget;
             const purchasePrc = (contingency.purchasePrice / total) * 100;
             const repairPrc = (contingency.repairCost / total) * 100;
             const contingencyPrc = (contingency.contingencyAmount / total) * 100;
             const holdingPrc = (contingency.holdingAndClosingCosts / total) * 100;
             return (
               <div className="mt-4">
                 <div className="w-full h-4 rounded-full flex overflow-hidden bg-[#F2F2F2]/30">
                   <div className="transition-all duration-500" style={{ width: `${purchasePrc}%`, background: '#595959' }} />
                   <div className="transition-all duration-500" style={{ width: `${repairPrc}%`, background: '#7F7F7F' }} />
                   <div className="transition-all duration-500" style={{ width: `${contingencyPrc}%`, background: '#A5A5A5' }} />
                   <div className="transition-all duration-500" style={{ width: `${holdingPrc}%`, background: '#CCCCCC' }} />
                 </div>
                 <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                   <span className="flex items-center text-[10px] text-text-secondary"><span className="w-2 h-2 rounded-full mr-1.5" style={{ background: '#595959' }} /> Purchase ({purchasePrc.toFixed(0)}%)</span>
                   <span className="flex items-center text-[10px] text-text-secondary"><span className="w-2 h-2 rounded-full mr-1.5" style={{ background: '#7F7F7F' }} /> Repairs ({repairPrc.toFixed(0)}%)</span>
                   <span className="flex items-center text-[10px] text-text-secondary"><span className="w-2 h-2 rounded-full mr-1.5" style={{ background: '#A5A5A5' }} /> Contingency ({contingencyPrc.toFixed(0)}%)</span>
                   <span className="flex items-center text-[10px] text-text-secondary"><span className="w-2 h-2 rounded-full mr-1.5" style={{ background: '#CCCCCC' }} /> Holding/Closing ({holdingPrc.toFixed(0)}%)</span>
                 </div>
               </div>
             );
           })()}
         </div>
       )}

       {/* ── Burn Rate Detail ── */}
       {burnRate && burnRate.dailyBurnRate > 0 && (
         <div className="bg-bg-surface/80 rounded-xl p-6 border border-border-accent mb-8">
           <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-4">
             Daily Burn Rate Breakdown — Every Day Costs Money
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
             {burnRate.monthlyLoanInterest > 0 && (
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Loan Interest</p>
                 <p className="text-lg font-bold tabular-nums text-text-primary">${burnRate.monthlyLoanInterest.toLocaleString()}</p>
                 <p className="text-[9px] text-text-secondary opacity-50">per month</p>
               </div>
             )}
             {burnRate.monthlyInsurance > 0 && (
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Insurance</p>
                 <p className="text-lg font-bold tabular-nums text-text-primary">${burnRate.monthlyInsurance.toLocaleString()}</p>
                 <p className="text-[9px] text-text-secondary opacity-50">per month</p>
               </div>
             )}
             {burnRate.monthlyTaxes > 0 && (
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Property Taxes</p>
                 <p className="text-lg font-bold tabular-nums text-text-primary">${burnRate.monthlyTaxes.toLocaleString()}</p>
                 <p className="text-[9px] text-text-secondary opacity-50">per month</p>
               </div>
             )}
             {burnRate.monthlyUtilities > 0 && (
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Utilities</p>
                 <p className="text-lg font-bold tabular-nums text-text-primary">${burnRate.monthlyUtilities.toLocaleString()}</p>
                 <p className="text-[9px] text-text-secondary opacity-50">per month</p>
               </div>
             )}
             {burnRate.monthlyOther > 0 && (
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Other (HOA, Maint.)</p>
                 <p className="text-lg font-bold tabular-nums text-text-primary">${burnRate.monthlyOther.toLocaleString()}</p>
                 <p className="text-[9px] text-text-secondary opacity-50">per month</p>
               </div>
             )}
           </div>
           {/* Urgency callout */}
           <div className="mt-4 p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: '#F06543', background: 'rgba(89, 89, 89, 0.05)' }}>
             <span className="text-lg">⏱️</span>
             <p className="text-sm text-text-primary">
               Every day past your timeline costs <strong style={{ color: '#595959' }}>${burnRate.dailyBurnRate.toLocaleString()}</strong>.
               {deal.financials?.estimatedTimelineDays ? (
                 <> Over your {deal.financials.estimatedTimelineDays}-day estimate, that&apos;s <strong style={{ color: '#595959' }}>${(burnRate.dailyBurnRate * deal.financials.estimatedTimelineDays).toLocaleString()}</strong> in holding costs alone.</>
               ) : null}
             </p>
           </div>
         </div>
       )}

       {/* ── Full NOI Deep Dive — Waterfall + Donut + P&L ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading NOI Analytics…</span>
               </div>
             }
           >
             <NOIDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}
       
       {/* ── Cash Flow Deep Dive — NOI minus Debt Service ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading Cash Flow Analytics…</span>
               </div>
             }
           >
             <CashFlowDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Cap Rate Deep Dive — NOI ÷ Purchase Price ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading Cap Rate Analytics…</span>
               </div>
             }
           >
             <CapRateDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Cash-on-Cash Return — Annual CF ÷ Total Cash Invested ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading CoC Return Analytics…</span>
               </div>
             }
           >
             <CoCReturnDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Gross Rent Multiplier — Quick Screen ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense
             fallback={
               <div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center">
                 <span className="text-xs text-text-secondary uppercase tracking-widest">Loading GRM Analytics…</span>
               </div>
             }
           >
             <GRMDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── DSCR — Can the property cover its mortgage? ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading DSCR Analytics…</span></div>}>
             <DSCRDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── IRR — Total Lifecycle Return ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading IRR Analytics…</span></div>}>
             <IRRDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Occupancy Rate ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Occupancy Analytics…</span></div>}>
             <OccupancyDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Expense Ratio ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Expense Ratio Analytics…</span></div>}>
             <ExpenseRatioDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Long-Term Appreciation ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Appreciation Analytics…</span></div>}>
             <AppreciationDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── Flip Profitability Dashboard ── */}
       {hasNOIData && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading Flip Profitability…</span></div>}>
             <FlipProfitabilityDashboard projects={[deal]} />
           </Suspense>
         </div>
       )}

       {/* ── LTV Risk Analysis ── */}
       {loanAmount > 0 && (
         <div className="text-left mb-8">
           <Suspense fallback={<div className="animate-pulse bg-bg-surface/40 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-text-secondary uppercase tracking-widest">Loading LTV Analytics…</span></div>}>
             <LTVDeepDive projects={[deal]} />
           </Suspense>
         </div>
       )}

       <ProjectTodoList deal={deal} phase={2} />
    </div>
  );
}

interface StaticPhase3Props {
  deal: Project;
  ledgerItems: any[];
  canAdd: boolean;
}

function StaticPhase3({ deal, ledgerItems, canAdd }: StaticPhase3Props) {
  const [isLedgerExpanded, setIsLedgerExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const addRealExpense = async () => {
    setIsAdding(true);
    try {
      await projectsService.addLedgerItem(deal.id, deal.organizationId || '', {
        description: 'Sub-collection Field Update',
        amount: 2500,
        status: 'Pending',
        category: 'General',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      toast.success('Real sub-collection ledger item added!');
    } catch (error) {
       toast.error('Failed to add ledger item.');
    } finally {
       setIsAdding(false);
    }
  };

  const costs = ledgerItems.length > 0 ? ledgerItems : (deal.financials.costs || []);
  const totalRehab = costs.filter(c => c.status === 'Approved' || c.approved).reduce((acc, c) => acc + c.amount, 0) || 0;

  // ── Renovation ROI Engine ──
  const renoROI = computeRenovationROI(costs, deal.financials.projectedRehabCost);
  const arv = deal.financials.estimatedARV || 0;
  const overImprovementRisk = computeOverImprovementRisk(renoROI.totalRehabCost, arv, renoROI.zones);
  const budgetRemaining = (deal.financials.projectedRehabCost || 0) - totalRehab;
  const burnRate = computeDailyBurnRate(deal.financials);

  // ── Renovation Timeline & Critical Path ──
  const rehabTasks = deal.rehabScheduleTasks || [];
  const stageProgress = computeRehabStageProgress(rehabTasks, deal.financials.acquisitionDate, deal.financials.estimatedTimelineDays);
  const criticalPath = computeCriticalPath(rehabTasks);
  const yesterdayCost = computeYesterdayCost(
    burnRate,
    costs,
    deal.financials.acquisitionDate,
    deal.financials.estimatedTimelineDays,
    deal.financials.projectedRehabCost ? deal.financials.projectedRehabCost + burnRate.totalMonthlyBurn * (deal.financials.projectedHoldTimeMonths || 3) : undefined
  );

  // Zone color map
  const ZONE_COLORS: Record<string, string> = {
    'Kitchen': '#595959',
    'Bathroom': '#7F7F7F',
    'Curb Appeal': '#A5A5A5',
    'Interior': '#CCCCCC',
    'Structural': '#F2F2F2',
  };
  const riskColors: Record<string, string> = { low: '#A5A5A5', moderate: '#7F7F7F', high: '#595959' };

  return (
    <div className="w-full max-w-6xl bg-bg-surface/60 backdrop-blur rounded-2xl p-10 shadow-2xl border border-white/20 mt-12 mb-12">
       <h1 className="text-4xl font-normal text-text-primary mb-2">Phase 3: Hold</h1>
       <p className="text-text-secondary mb-8">Every day you hold a property, it costs you money. Track rehab spending, manage renovations by ROI zone, and monitor your daily burn rate.</p>
       
       <HoldInterview deal={deal} />
       
       <ExplainerVideoPlaceholder phaseName="Hold" />

       {/* ── Yesterday Cost Thumbnail + Project Timeline ── */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

         {/* Yesterday Cost Thumbnail */}
         <div className="bg-bg-surface/80 border border-border-accent rounded-xl p-6 shadow-xl flex flex-col justify-between">
           <div>
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-1">Yesterday Cost You</p>
             <p className={`text-4xl font-bold tabular-nums`} style={{ color: yesterdayCost.yesterdayTotalCost > 0 ? '#595959' : '#1A1A1A' }}>
               ${yesterdayCost.yesterdayTotalCost.toLocaleString()}
             </p>
             <div className="flex gap-4 mt-3">
               <div>
                 <p className="text-[9px] text-text-secondary opacity-50">Holding</p>
                 <p className="text-xs text-[#CCCCCC] tabular-nums">${yesterdayCost.yesterdayHoldingCost.toLocaleString()}</p>
               </div>
               <div>
                 <p className="text-[9px] text-text-secondary opacity-50">Approved Spend</p>
                 <p className="text-xs text-[#CCCCCC] tabular-nums">${yesterdayCost.yesterdayApprovedSpend.toLocaleString()}</p>
               </div>
             </div>
           </div>
           <div className="mt-4 pt-3 border-t border-[#595959]">
             <div className="flex justify-between text-[10px] text-text-secondary opacity-50 mb-1">
               <span>Budget Used</span>
               <span className="tabular-nums">{yesterdayCost.budgetUtilization}%</span>
             </div>
             <div className="w-full h-1.5 bg-[#F2F2F2] rounded-full overflow-hidden">
               <div
                 className="h-full rounded-full transition-all duration-700"
                 style={{
                   width: `${Math.min(yesterdayCost.budgetUtilization, 100)}%`,
                   background: yesterdayCost.isOverBudget ? '#595959' : yesterdayCost.budgetUtilization > 80 ? '#7F7F7F' : '#A5A5A5',
                 }}
               />
             </div>
             <div className="flex justify-between text-[9px] text-text-secondary opacity-40 mt-1">
               <span>Day {yesterdayCost.daysElapsed}</span>
               <span>{yesterdayCost.daysRemaining} days left</span>
             </div>
           </div>
         </div>

         {/* Cumulative Cost Card */}
         <div className="bg-bg-surface/80 border border-border-accent rounded-xl p-6 shadow-xl flex flex-col justify-between">
           <div>
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-1">Total Project Cost to Date</p>
             <p className="text-3xl font-bold tabular-nums text-white">
               ${yesterdayCost.cumulativeTotalCost.toLocaleString()}
             </p>
             <div className="grid grid-cols-2 gap-3 mt-3">
               <div>
                 <p className="text-[9px] text-text-secondary opacity-50">Holding Costs</p>
                 <p className="text-xs text-text-primary tabular-nums">${yesterdayCost.cumulativeHoldingCost.toLocaleString()}</p>
               </div>
               <div>
                 <p className="text-[9px] text-text-secondary opacity-50">Rehab Spend</p>
                 <p className="text-xs text-text-primary tabular-nums">${yesterdayCost.cumulativeRehabSpend.toLocaleString()}</p>
               </div>
             </div>
           </div>
           <div className="mt-4 pt-3 border-t border-[#595959]">
             <p className="text-[9px] text-text-secondary opacity-50 mb-0.5">Projected Total at Current Burn</p>
             <p className={`text-lg font-bold tabular-nums`} style={{ color: yesterdayCost.isOverBudget ? '#595959' : 'inherit' }}>
               ${yesterdayCost.projectedTotalCost.toLocaleString()}
             </p>
           </div>
         </div>

         {/* Critical Path Summary Card */}
         <div className="bg-bg-surface/80 border border-border-accent rounded-xl p-6 shadow-xl flex flex-col justify-between">
           <div>
             <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-1">Critical Path</p>
             {rehabTasks.length > 0 ? (
               <>
                 <p className="text-3xl font-bold tabular-nums text-white">
                   {criticalPath.totalProjectDuration} <span className="text-sm font-normal text-text-secondary">days</span>
                 </p>
                 <p className="text-[10px] text-text-secondary opacity-50 mt-1">
                   {criticalPath.criticalPathIds.length} critical task{criticalPath.criticalPathIds.length !== 1 ? 's' : ''} — zero float
                 </p>
                 <div className="mt-3">
                   <p className="text-[9px] text-text-secondary opacity-50 mb-1">Schedule Status</p>
                   <p className="text-sm font-bold" style={{ color: stageProgress.isOnSchedule ? '#1A1A1A' : '#595959' }}>
                     {stageProgress.isOnSchedule ? '✅ On Schedule' : '🚨 Behind Schedule'}
                   </p>
                 </div>
               </>
             ) : (
               <>
                 <p className="text-lg text-[#CCCCCC] mt-2">No tasks scheduled</p>
                 <p className="text-[10px] text-text-secondary opacity-50 mt-1">Add rehab tasks to activate the Critical Path Method timeline</p>
               </>
             )}
           </div>
           <div className="mt-4 pt-3 border-t border-[#595959]">
             <p className="text-[9px] text-text-secondary opacity-50">Overall Progress</p>
             <div className="flex items-center gap-2 mt-1">
               <div className="flex-1 h-1.5 bg-[#F2F2F2] rounded-full overflow-hidden">
                 <div className="h-full rounded-full bg-black transition-all duration-700" style={{ width: `${stageProgress.overallPercent}%` }} />
               </div>
               <span className="text-xs text-white tabular-nums font-bold">{stageProgress.overallPercent}%</span>
             </div>
           </div>
         </div>
       </div>

       {/* ── 3-Stage Renovation Timeline ── */}
       <div className="bg-bg-surface/80 border border-border-accent rounded-xl p-6 shadow-xl mb-6">
         <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-5">Project Timeline — Critical Path Method</p>
         <div className="relative">
           {/* Timeline connector line */}
           <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-[#7F7F7F]" />
           <div
             className="absolute top-8 left-[12.5%] h-0.5 bg-black transition-all duration-700"
             style={{ width: `${Math.min(stageProgress.overallPercent, 100) * 0.75}%` }}
           />

           <div className="grid grid-cols-3 gap-4 relative z-10">
             {stageProgress.stages.map((s, i) => {
               const icons = ['📋', '⚙️', '🛋️'];
               return (
                 <div key={s.stage} className="flex flex-col items-center text-center">
                   {/* Node */}
                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 ${
                     s.isComplete ? 'bg-black/20 border-2 border-[#CCCCCC] shadow-lg shadow-emerald-500/20' :
                     s.isActive ? 'bg-[#F2F2F2]0/20 border-2 border-[#CCCCCC] animate-pulse shadow-lg shadow-blue-500/20' :
                     'bg-[#F2F2F2] border border-border-accent'
                   }`}>
                     {s.isComplete ? '✅' : icons[i]}
                   </div>
                   {/* Label */}
                   <p className={`text-sm font-bold mt-3 ${s.isActive ? 'text-text-primary' : s.isComplete ? 'text-[#1A1A1A]' : 'text-[#CCCCCC]'}`}>
                     {s.label}
                   </p>
                   <p className="text-[10px] text-text-secondary opacity-50 mt-0.5">{s.estimatedWeeks}</p>
                   {/* Progress for active/complete stages */}
                   {s.totalTasks > 0 && (
                     <div className="mt-2 w-full max-w-[120px]">
                       <div className="w-full h-1 bg-[#F2F2F2] rounded-full overflow-hidden">
                         <div
                           className={`h-full rounded-full transition-all duration-500 ${s.isComplete ? 'bg-black' : 'bg-[#F2F2F2]0'}`}
                           style={{ width: `${s.percentComplete}%` }}
                         />
                       </div>
                       <p className="text-[9px] text-text-secondary opacity-40 mt-1 tabular-nums">
                         {s.completedTasks}/{s.totalTasks} tasks
                         {s.inspectionsRequired > 0 && ` · ${s.inspectionsCleared}/${s.inspectionsRequired} inspections`}
                       </p>
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
         </div>

         {/* Timeline buffer recommendation */}
         {stageProgress.timelineBufferDays > 0 && rehabTasks.length > 0 && (
           <div className="mt-5 pt-3 border-t border-[#595959]/50 flex items-center gap-2">
             <span className="text-[10px]">💡</span>
             <p className="text-[10px] text-text-secondary opacity-50">
               Built-in {stageProgress.timelineBufferDays}-day buffer (17.5%) absorbs failed inspections, weather delays, and material shortages.
               {!stageProgress.isOnSchedule && ' ⚠️ You have exceeded your estimated timeline — every additional day erodes profit.'}
             </p>
           </div>
         )}
       </div>
       
       <div className="bg-bg-surface/80 text-white rounded-xl p-8 border border-border-accent shadow-xl flex flex-col items-center">
          
          {/* ── Renovation ROI KPI Strip ── */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* KPI 1: Budget Remaining */}
            <div className="bg-[#595959]/80 rounded-lg p-4 border border-[#595959]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Budget Remaining</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${budgetRemaining >= 0 ? 'text-[#1A1A1A]' : 'text-[#595959]'}`}>
                ${Math.abs(budgetRemaining).toLocaleString()}
              </p>
              <p className="text-[9px] text-text-secondary opacity-50 mt-0.5">
                {budgetRemaining >= 0 ? 'under budget' : 'OVER budget'}
              </p>
            </div>
            {/* KPI 2: Highest ROI Zone */}
            <div className="bg-[#595959]/80 rounded-lg p-4 border border-[#595959]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Highest ROI Zone</p>
              <p className="text-2xl font-bold mt-1" style={{ color: ZONE_COLORS[renoROI.highestROIZone] || '#fff' }}>
                {renoROI.highestROIZone}
              </p>
              <p className="text-[9px] text-text-secondary opacity-50 mt-0.5">
                {renoROI.zones.find(z => z.zone === renoROI.highestROIZone)?.roi || 0}% ROI
              </p>
            </div>
            {/* KPI 3: Money Rooms % */}
            <div className="bg-[#595959]/80 rounded-lg p-4 border border-[#595959]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Money Rooms</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${renoROI.moneyRoomsHealthy ? 'text-[#1A1A1A]' : 'text-[#595959]'}`}>
                {renoROI.moneyRoomsPercent}%
              </p>
              <p className="text-[9px] text-text-secondary opacity-50 mt-0.5">Kitchen + Bath (target: 50-60%)</p>
            </div>
            {/* KPI 4: Over-Improvement Risk */}
            <div className="bg-[#595959]/80 rounded-lg p-4 border border-[#595959]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60">Over-Improvement Risk</p>
              <p className="text-2xl font-bold mt-1 uppercase" style={{ color: riskColors[overImprovementRisk.riskLevel] }}>
                {overImprovementRisk.riskLevel}
              </p>
              <p className="text-[9px] text-text-secondary opacity-50 mt-0.5">
                {overImprovementRisk.rehabToARVPercent}% of ARV (max 30%)
              </p>
            </div>
          </div>

          {/* Top Level Summary (Always Visible) */}
          <div className="w-full flex justify-between items-center mb-6">
             <div>
               <p className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-black mr-2 animate-pulse"></span>
                  Live Approved Rehab Spend
               </p>
               <p className="text-4xl font-normal mt-2 flex items-baseline">
                 ${totalRehab.toLocaleString()} <span className="text-sm text-text-secondary ml-2">/ ${deal.financials.projectedRehabCost?.toLocaleString()} bgt</span>
               </p>
             </div>
             {canAdd && (
                <button 
                  onClick={addRealExpense} 
                  disabled={isAdding}
                  className="bg-bg-surface text-text-primary text-sm font-medium px-5 py-2.5 rounded-md hover:bg-[#F2F2F2] transition shadow-sm disabled:opacity-50"
                >
                   {isAdding ? 'Syncing...' : 'Add Field Entry ($2.5k)'}
                </button>
              )}
          </div>

          {/* ── 5-Zone Budget Distribution Bar ── */}
          <div className="w-full mb-6">
             <div className="flex justify-between text-xs text-text-secondary uppercase tracking-widest mb-2 font-medium">
               <span>Renovation Zone Distribution</span>
             </div>
             <div className="w-full h-4 bg-[#F2F2F2] rounded-full flex overflow-hidden">
                {renoROI.zones.filter(z => z.budgetPercent > 0).map(z => (
                  <div
                    key={z.zone}
                    style={{ width: `${z.budgetPercent}%`, background: ZONE_COLORS[z.zone] || '#666' }}
                    className="transition-all duration-500"
                    title={`${z.zone}: ${z.budgetPercent}%`}
                  />
                ))}
             </div>
             <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
                {renoROI.zones.map(z => (
                  <div key={z.zone} className="flex items-center text-xs text-[#CCCCCC]">
                    <div className="w-2 h-2 rounded-full mr-1.5" style={{ background: ZONE_COLORS[z.zone] || '#666' }} />
                    {z.zone} ({z.budgetPercent}%)
                  </div>
                ))}
             </div>
          </div>

          {/* ── Over-Improvement Risk Alert ── */}
          {arv > 0 && (
            <div
              className="w-full mb-6 p-4 rounded-lg border flex items-start gap-3"
              style={{
                borderColor: riskColors[overImprovementRisk.riskLevel],
                background: `${riskColors[overImprovementRisk.riskLevel]}0D`,
              }}
            >
              <span className="text-lg mt-0.5">{overImprovementRisk.riskLevel === 'high' ? '🚨' : overImprovementRisk.riskLevel === 'moderate' ? '⚠️' : '✅'}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] mb-1" style={{ color: riskColors[overImprovementRisk.riskLevel] }}>
                  Over-Improvement {overImprovementRisk.riskLevel === 'low' ? 'Clear' : 'Warning'}
                </p>
                <p className="text-sm text-[#CCCCCC]">{overImprovementRisk.explanation}</p>
              </div>
            </div>
          )}

          {/* ── Money Rooms Priority Callout ── */}
          {renoROI.totalRehabCost > 0 && (
            <div className="w-full mb-6 p-4 rounded-lg border border-border-accent/50 bg-[#595959]/40">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-2">
                🏠 Money Rooms — Kitchen + Bathroom
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full h-2 bg-[#F2F2F2] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(renoROI.moneyRoomsPercent, 100)}%`,
                        background: renoROI.moneyRoomsHealthy ? '#3f7d20' : '#F59E0B',
                      }}
                    />
                  </div>
                </div>
                <p className={`text-sm font-bold tabular-nums ${renoROI.moneyRoomsHealthy ? 'text-[#1A1A1A]' : 'text-[#595959]'}`}>
                  {renoROI.moneyRoomsPercent}%
                </p>
              </div>
              <p className="text-[10px] text-text-secondary opacity-50 mt-2">
                {renoROI.moneyRoomsHealthy
                  ? 'Your "Money Rooms" allocation is in the ideal 40-70% range. Kitchens and bathrooms sell houses.'
                  : renoROI.moneyRoomsPercent < 40
                    ? 'Below 40% — consider shifting more budget to kitchen and bathroom. These rooms deliver the highest buyer impact.'
                    : 'Above 70% — make sure you\'re not neglecting curb appeal and interior finishes.'}
              </p>
            </div>
          )}

          {/* ── Zone ROI Detail Grid ── */}
          {renoROI.zones.some(z => z.totalCost > 0) && (
            <div className="w-full mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary opacity-60 mb-3">
                Per-Zone Cost vs. Estimated Value-Add
              </p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {renoROI.zones.map(z => (
                  <div key={z.zone} className="bg-[#595959]/60 rounded-lg p-3 border border-[#595959]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: ZONE_COLORS[z.zone] || '#666' }} />
                      <p className="text-xs font-bold text-white">{z.zone}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-secondary">Cost</span>
                        <span className="text-white tabular-nums font-medium">${z.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-secondary">Value Add</span>
                        <span className="text-[#1A1A1A] tabular-nums font-medium">${z.estimatedValueAdd.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-secondary">ROI</span>
                        <span className={`tabular-nums font-bold ${z.roi >= 70 ? 'text-[#1A1A1A]' : z.roi >= 50 ? 'text-[#595959]' : 'text-[#595959]'}`}>{z.roi}%</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-text-secondary opacity-40 mt-1.5">{z.itemCount} item{z.itemCount !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Daily Burn Rate Urgency ── */}
          {burnRate && burnRate.dailyBurnRate > 0 && (
            <div className="w-full mb-6 p-4 rounded-lg border flex items-center gap-3" style={{ borderColor: '#F06543', background: 'rgba(89, 89, 89, 0.05)' }}>
              <span className="text-lg">⏱️</span>
              <p className="text-sm text-white">
                Every day past your timeline costs <strong style={{ color: '#595959' }}>${burnRate.dailyBurnRate.toLocaleString()}</strong>.
                {deal.financials?.estimatedTimelineDays ? (
                  <> Over your {deal.financials.estimatedTimelineDays}-day estimate, that&apos;s <strong style={{ color: '#595959' }}>${(burnRate.dailyBurnRate * deal.financials.estimatedTimelineDays).toLocaleString()}</strong> in holding costs alone.</>
                ) : null}
              </p>
            </div>
          )}

          {/* Progressive Disclosure Toggle */}
          <div className="w-full border-t border-border-accent/50 pt-4">
             <button 
                onClick={() => setIsLedgerExpanded(!isLedgerExpanded)}
                className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-white uppercase tracking-widest font-bold transition-colors"
             >
                <span>{isLedgerExpanded ? 'Hide Itemized Ledger' : 'View Itemized Ledger'}</span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isLedgerExpanded ? 'rotate-90' : ''}`} />
             </button>

             {/* Granular Table (Disclosed on Demand) */}
             <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isLedgerExpanded ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                {costs.length > 0 ? (
                  <div className="bg-pw-black rounded-lg border border-[#595959] overflow-y-auto max-h-80">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-pw-black text-text-secondary text-xs uppercase tracking-widest sticky top-0">
                         <tr>
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium">Zone</th>
                            <th className="px-4 py-3 font-medium">Cost</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-800">
                         {costs.slice(0, 15).map((c, i) => {
                           const zone = c.renovationZone || (c.description ? (() => {
                             const d = c.description.toLowerCase();
                             if (d.includes('kitchen') || d.includes('cabinet') || d.includes('countertop') || d.includes('appliance')) return 'Kitchen';
                             if (d.includes('bath') || d.includes('vanity') || d.includes('tile') || d.includes('shower')) return 'Bathroom';
                             if (d.includes('curb') || d.includes('landscap') || d.includes('front door') || d.includes('exterior paint') || d.includes('porch')) return 'Curb Appeal';
                             if (d.includes('foundation') || d.includes('roof') || d.includes('hvac') || d.includes('electrical') || d.includes('plumbing')) return 'Structural';
                             return 'Interior';
                           })() : 'Interior');
                           return (
                             <tr key={i} className="hover:bg-pw-black transition-colors">
                               <td className="px-4 py-3 text-[#CCCCCC]">
                                 {c.description}
                                 {c.status && <span className={`ml-2 text-xs px-1 py-0.5 rounded ${c.status === 'Approved' ? 'bg-[#595959]/40 text-[#1A1A1A]' : 'bg-[#595959]/40 text-text-primary'}`}>{c.status}</span>}
                               </td>
                               <td className="px-4 py-3">
                                 <span className="inline-flex items-center gap-1 text-xs">
                                   <span className="w-1.5 h-1.5 rounded-full" style={{ background: ZONE_COLORS[zone] || '#666' }} />
                                   <span className="text-[#CCCCCC]">{zone}</span>
                                 </span>
                               </td>
                               <td className="px-4 py-3 text-white font-medium">${c.amount.toLocaleString()}</td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm mt-4 text-center">No approved costs registered yet.</p>
                )}
             </div>
          </div>

          {/* ── Rental Property Calculator ── */}
          <div className="w-full mt-8">
            <RentalPropertyCalculator 
              phaseColor={PHASE_BACKGROUNDS.rehab || '#A5A5A5'} 
              projectId={deal.id} 
              initialFinancials={deal.financials} 
              readOnly={!canAdd}
            />
          </div>

          {/* ── NOI Deep Dive — Per-Property Analytics ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense
              fallback={
                <div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center">
                  <span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading NOI Analytics…</span>
                </div>
              }
            >
              <NOIDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Cash Flow Deep Dive — NOI minus Debt Service ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense
              fallback={
                <div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center">
                  <span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading Cash Flow Analytics…</span>
                </div>
              }
            >
              <CashFlowDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Cap Rate Deep Dive — NOI ÷ Purchase Price ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense
              fallback={
                <div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center">
                  <span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading Cap Rate Analytics…</span>
                </div>
              }
            >
              <CapRateDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Cash-on-Cash Return — Annual CF ÷ Total Cash Invested ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense
              fallback={
                <div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center">
                  <span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading CoC Return Analytics…</span>
                </div>
              }
            >
              <CoCReturnDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Gross Rent Multiplier — Quick Screen ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense
              fallback={
                <div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center">
                  <span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading GRM Analytics…</span>
                </div>
              }
            >
              <GRMDeepDive projects={[deal]} />
            </Suspense>
          </div>
          
          {/* ── DSCR — Can the property cover its mortgage? ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense fallback={<div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading DSCR Analytics…</span></div>}>
              <DSCRDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── IRR — Total Lifecycle Return ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense fallback={<div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading IRR Analytics…</span></div>}>
              <IRRDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Occupancy Rate ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense fallback={<div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading Occupancy Analytics…</span></div>}>
              <OccupancyDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Expense Ratio ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense fallback={<div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading Expense Ratio Analytics…</span></div>}>
              <ExpenseRatioDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Long-Term Appreciation ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense fallback={<div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading Appreciation Analytics…</span></div>}>
              <AppreciationDeepDive projects={[deal]} />
            </Suspense>
          </div>

          {/* ── Flip Profitability Dashboard ── */}
          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <Suspense fallback={<div className="animate-pulse bg-[#F2F2F2]/50 rounded-xl h-64 flex items-center justify-center"><span className="text-xs text-[#A5A5A5] uppercase tracking-widest">Loading Flip Profitability…</span></div>}>
              <FlipProfitabilityDashboard projects={[deal]} />
            </Suspense>
          </div>

          <div className="w-full mt-8 border-t border-border-accent/50 pt-6">
            <ProjectTodoList deal={deal} phase={3} />
          </div>
       </div>
    </div>
  );
}
