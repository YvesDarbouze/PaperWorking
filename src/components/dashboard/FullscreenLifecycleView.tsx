'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import PhaseBadge from '../ui/PhaseBadge';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Play } from 'lucide-react';
import Phase4Outcome from '@/components/exit/Phase4Outcome';
import toast from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { projectsService } from '@/lib/firebase/projects';
import { transitionDealPhase } from '@/lib/services/dealStateMachine';
import ProjectTodoList from '../project/ProjectTodoList';

interface FullscreenLifecycleViewProps {
  projectId: string;
  onExit: () => void;
}

import { PHASE_BACKGROUNDS } from '@/lib/constants/phaseMessages';

const PHASES = [
  { id: 1, title: 'Acquisition', bg: PHASE_BACKGROUNDS.findandfund || '#CCCCCC' },
  { id: 2, title: 'Purchase', bg: PHASE_BACKGROUNDS.evaluation || '#A6A6A6' },
  { id: 3, title: 'Hold', bg: PHASE_BACKGROUNDS.rehab || '#808080' },
  { id: 4, title: 'Exit', bg: PHASE_BACKGROUNDS.exit || '#595959' },
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

  return (
    <motion.div 
      layoutId={`folder-${deal.id}`}
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-1000 ease-in-out`}
      style={{ backgroundColor: activePhaseMap.bg }}
    >
       
       <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40 bg-black/10 backdrop-blur-sm border-b border-black/5">
          <div className="flex items-center space-x-6">
            <button onClick={onExit} className="flex items-center text-text-primary/70 hover:text-text-primary font-medium transition-colors bg-bg-surface/20 px-4 py-2 rounded-lg">
               <ArrowLeft className="w-4 h-4 mr-2" /> Close Project
            </button>
            <div className="flex flex-col">
               <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60 text-text-primary mix-blend-color-burn">Phase Completion</p>
               <div className="flex items-center space-x-2 mt-1">
                 <div className="w-32 h-1.5 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-black/60 rounded-full" style={{ width: `${currentPhase * 25}%` }}></div>
                 </div>
                 <span className="text-xs font-bold mix-blend-color-burn">{currentPhase * 25}%</span>
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
                     'Under Contract': 'Rehab',
                     'Rehab': 'Listed',
                     'Listed': 'Sold',
                     'Sold': 'Rented'
                  };
                  const nextPhase = nextMap[deal.status];
                  if (nextPhase) {
                     try {
                        await transitionDealPhase(deal.id, deal.status as any, nextPhase as any, 'system');
                        toast.success(`Deal advanced to ${nextPhase}`);
                     } catch (e) {
                        toast.error('Failed to transition phase');
                     }
                  }
               }}
               className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center space-x-2"
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
  return (
    <div className="w-full max-w-2xl bg-bg-surface/60 backdrop-blur rounded-2xl p-10 shadow-2xl text-center border border-white/20 mt-12">
       <h1 className="text-4xl font-normal text-text-primary mb-4">Phase 1: Acquisition</h1>
       <p className="text-text-secondary mb-8">Analyzing projections and fractional liquidity for {deal.address}.</p>
       
       <ExplainerVideoPlaceholder phaseName="Acquisition" />
       <div className="bg-bg-surface/80 rounded-xl p-6 border border-border-accent text-left mb-8">
          <p className="text-sm font-medium text-text-secondary uppercase">Purchase Matrix</p>
          <p className="text-3xl font-normal mt-2">${(deal.financials.purchasePrice || 0).toLocaleString()}</p>
       </div>
       
       <ProjectTodoList deal={deal} phase={1} />
    </div>
  );
}

function StaticPhase2({ deal }: { deal: Project }) {
  return (
    <div className="w-full max-w-2xl bg-bg-surface/60 backdrop-blur rounded-2xl p-10 shadow-2xl border border-white/20 mt-12">
       <h1 className="text-4xl font-normal text-text-primary mb-4 text-center">Phase 2: Purchase</h1>
       <p className="text-text-secondary mb-8 text-center">Clearing Web3 records and legal hurdles via the Closing Room.</p>
       
       <ExplainerVideoPlaceholder phaseName="Purchase" />
       <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between bg-bg-surface rounded-lg p-4 shadow-sm">
             <span className="font-medium text-text-primary">Digital Title Search</span>
             <CheckCircle className="text-green-500 w-5 h-5" />
          </div>
          <div className="flex items-center justify-between bg-bg-surface rounded-lg p-4 shadow-sm">
             <span className="font-medium text-text-primary">Closing Disclosures</span>
             <CheckCircle className="text-green-500 w-5 h-5" />
          </div>
       </div>
       
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

  const plumbing = costs.filter(c => c.description.toLowerCase().includes('plumbing')).reduce((acc, c) => acc + c.amount, 0);
  const electrical = costs.filter(c => c.description.toLowerCase().includes('electrical')).reduce((acc, c) => acc + c.amount, 0);
  const general = totalRehab - plumbing - electrical;

  const plumbingPrc = totalRehab > 0 ? (plumbing / totalRehab) * 100 : 0;
  const electricalPrc = totalRehab > 0 ? (electrical / totalRehab) * 100 : 0;
  const generalPrc = totalRehab > 0 ? (general / totalRehab) * 100 : 0;

  return (
    <div className="w-full max-w-3xl bg-bg-surface/60 backdrop-blur rounded-2xl p-10 shadow-2xl border border-white/20 mt-12 mb-12">
       <h1 className="text-4xl font-normal text-text-primary mb-4">Phase 3: Hold</h1>
       <p className="text-text-secondary mb-8">Execute rehab workflows and triage General Contractor draw requests.</p>
       
       <ExplainerVideoPlaceholder phaseName="Hold" />
       
       <div className="bg-black/90 text-white rounded-xl p-8 border border-gray-700 shadow-xl flex flex-col items-center">
          
          {/* Top Level Summary (Always Visible) */}
          <div className="w-full flex justify-between items-center mb-6">
             <div>
               <p className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
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
                  className="bg-bg-surface text-text-primary text-sm font-medium px-5 py-2.5 rounded-md hover:bg-gray-200 transition shadow-sm disabled:opacity-50"
                >
                   {isAdding ? 'Syncing...' : 'Add Field Entry ($2.5k)'}
                </button>
              )}
          </div>

          {/* Scalable Visual Indicator: Horizontal Distribution Bar */}
          <div className="w-full mb-6">
             <div className="flex justify-between text-xs text-text-secondary uppercase tracking-widest mb-2 font-medium">
               <span>Cost Distribution</span>
             </div>
             <div className="w-full h-3 bg-gray-800 rounded-full flex overflow-hidden">
                <div style={{ width: `${plumbingPrc}%` }} className="bg-blue-500 transition-all duration-500"></div>
                <div style={{ width: `${electricalPrc}%` }} className="bg-yellow-500 transition-all duration-500"></div>
                <div style={{ width: `${generalPrc}%` }} className="bg-gray-400 transition-all duration-500"></div>
             </div>
             <div className="flex space-x-6 mt-3">
                <div className="flex items-center text-xs text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> Plumbing ({plumbingPrc.toFixed(0)}%)
                </div>
                <div className="flex items-center text-xs text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div> Electrical ({electricalPrc.toFixed(0)}%)
                </div>
                <div className="flex items-center text-xs text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div> General ({generalPrc.toFixed(0)}%)
                </div>
             </div>
          </div>

          {/* Progressive Disclosure Toggle */}
          <div className="w-full border-t border-gray-700/50 pt-4">
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
                  <div className="bg-pw-black rounded-lg border border-gray-800 overflow-y-auto max-h-80">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-pw-black text-text-secondary text-xs uppercase tracking-widest sticky top-0">
                         <tr>
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium">Cost</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-800">
                         {costs.slice(0, 15).map((c, i) => (
                           <tr key={i} className="hover:bg-pw-black transition-colors">
                             <td className="px-4 py-3 text-gray-300">
                               {c.description}
                               {c.status && <span className={`ml-2 text-xs px-1 py-0.5 rounded ${c.status === 'Approved' ? 'bg-green-900/40 text-green-400' : 'bg-orange-900/40 text-orange-400'}`}>{c.status}</span>}
                             </td>
                             <td className="px-4 py-3 text-white font-medium">${c.amount.toLocaleString()}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm mt-4 text-center">No approved costs registered yet.</p>
                )}
             </div>
          </div>
          
          <div className="w-full mt-8 border-t border-gray-700/50 pt-6">
            <ProjectTodoList deal={deal} phase={3} />
          </div>
       </div>
    </div>
  );
}
