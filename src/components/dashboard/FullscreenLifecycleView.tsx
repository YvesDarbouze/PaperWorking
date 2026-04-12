'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyDeal } from '@/types/schema';
import { useDealStore } from '@/store/dealStore';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import Phase4Outcome from '@/components/exit/Phase4Outcome';
import toast from 'react-hot-toast';

interface FullscreenLifecycleViewProps {
  dealId: string;
  onExit: () => void;
}

const PHASES = [
  { id: 1, title: 'Find & Fund', bg: 'bg-[#cccccc]' },
  { id: 2, title: 'Acquisition', bg: 'bg-[#a5a5a5]' },
  { id: 3, title: 'Renovation', bg: 'bg-[#7f7f7f]' },
  { id: 4, title: 'Outcome Strategy', bg: 'bg-[#595959]' },
];

export default function FullscreenLifecycleView({ dealId, onExit }: FullscreenLifecycleViewProps) {
  const deals = useDealStore(state => state.deals);
  const deal = deals.find(d => d.id === dealId);
  const [currentPhase, setCurrentPhase] = useState(1);

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
  const activePhaseMap = PHASES[currentPhase - 1];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-1000 ease-in-out ${activePhaseMap.bg}`}>
       
       <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40 bg-black/10 backdrop-blur-sm border-b border-black/5">
          <button onClick={onExit} className="flex items-center text-black/70 hover:text-black font-medium transition-colors bg-white/20 px-4 py-2 rounded-lg">
             <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </button>
          <div className="flex flex-col items-end">
             <h3 className="text-xl font-medium tracking-tight mix-blend-color-burn">{deal.propertyName}</h3>
             <p className="text-xs font-mono uppercase tracking-widest opacity-60 mix-blend-color-burn">Lifecycle View</p>
          </div>
       </header>

       {/* Swipe / Click Edges */}
       {currentPhase > 1 && (
         <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-white/30 hover:bg-white/50 p-3 rounded-full backdrop-blur transition-all group">
            <ChevronLeft className="w-8 h-8 text-black/50 group-hover:text-black" />
         </button>
       )}
       
       {currentPhase < 4 && (
         <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-white/30 hover:bg-white/50 p-3 rounded-full backdrop-blur transition-all group">
            <ChevronRight className="w-8 h-8 text-black/50 group-hover:text-black" />
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
                {currentPhase === 3 && <StaticPhase3 deal={deal} />}
                {currentPhase === 4 && <Phase4Outcome dealId={dealId} />}
             </motion.div>
          </AnimatePresence>
       </div>

       {/* Bottom Timeline Indicator */}
       <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4 z-40">
          {PHASES.map((p) => (
             <div key={p.id} onClick={() => setCurrentPhase(p.id)} className={`h-1.5 rounded-full cursor-pointer transition-all duration-500 ${p.id === currentPhase ? 'w-16 bg-black/80' : 'w-8 bg-black/20 hover:bg-black/40'}`} />
          ))}
       </div>
    </div>
  );
}

/* --- Placeholder Components to Fulfill Viewport Constraints --- */

function StaticPhase1({ deal }: { deal: PropertyDeal }) {
  return (
    <div className="w-full max-w-2xl bg-white/60 backdrop-blur rounded-2xl p-10 shadow-2xl text-center border border-white/20">
       <h1 className="text-4xl font-light text-gray-900 mb-4">Phase 1: Find & Fund</h1>
       <p className="text-gray-600 mb-8">Analyzing projections and fractional liquidity for {deal.address}.</p>
       <div className="bg-white/80 rounded-xl p-6 border border-gray-200 text-left">
          <p className="text-sm font-medium text-gray-500 uppercase">Purchase Matrix</p>
          <p className="text-3xl font-light mt-2">${(deal.financials.purchasePrice || 0).toLocaleString()}</p>
       </div>
    </div>
  );
}

function StaticPhase2({ deal }: { deal: PropertyDeal }) {
  return (
    <div className="w-full max-w-2xl bg-white/60 backdrop-blur rounded-2xl p-10 shadow-2xl border border-white/20">
       <h1 className="text-4xl font-light text-gray-900 mb-4 text-center">Phase 2: Acquisition</h1>
       <p className="text-gray-600 mb-8 text-center">Clearing Web3 records and legal hurdles via the Closing Room.</p>
       <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
             <span className="font-medium text-gray-700">Digital Title Search</span>
             <CheckCircle className="text-green-500 w-5 h-5" />
          </div>
          <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
             <span className="font-medium text-gray-700">Closing Disclosures</span>
             <CheckCircle className="text-green-500 w-5 h-5" />
          </div>
       </div>
    </div>
  );
}

function StaticPhase3({ deal }: { deal: PropertyDeal }) {
  const updateDealFinancials = useDealStore(state => state.updateDealFinancials);
  const [isLedgerExpanded, setIsLedgerExpanded] = useState(false);

  const addMockExpense = () => {
    toast.success('Simulated $5,000 plumbing expense added to ledger.');
    const updatedCosts = [...(deal.financials.costs || []), {
      id: Math.random().toString(),
      description: 'Plumbing Retrofit',
      amount: 5000,
      approved: true,
      addedBy: 'User',
      createdAt: new Date()
    }];
    updateDealFinancials(deal.id, { costs: updatedCosts });
  };

  const costs = deal.financials.costs || [];
  const totalRehab = costs.reduce((acc, c) => acc + c.amount, 0) || 0; 

  const plumbing = costs.filter(c => c.description.toLowerCase().includes('plumbing')).reduce((acc, c) => acc + c.amount, 0);
  const electrical = costs.filter(c => c.description.toLowerCase().includes('electrical')).reduce((acc, c) => acc + c.amount, 0);
  const general = totalRehab - plumbing - electrical;

  const plumbingPrc = totalRehab > 0 ? (plumbing / totalRehab) * 100 : 0;
  const electricalPrc = totalRehab > 0 ? (electrical / totalRehab) * 100 : 0;
  const generalPrc = totalRehab > 0 ? (general / totalRehab) * 100 : 0;

  return (
    <div className="w-full max-w-3xl bg-white/60 backdrop-blur rounded-2xl p-10 shadow-2xl border border-white/20">
       <h1 className="text-4xl font-light text-gray-900 mb-4">Phase 3: Renovation</h1>
       <p className="text-gray-600 mb-8">Execute rehab workflows and triage General Contractor draw requests.</p>
       
       <div className="bg-black/90 text-white rounded-xl p-8 border border-gray-700 shadow-xl flex flex-col items-center">
          
          {/* Top Level Summary (Always Visible) */}
          <div className="w-full flex justify-between items-center mb-6">
             <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                  Live Approved Rehab Spend
               </p>
               <p className="text-4xl font-light mt-2 flex items-baseline">
                 ${totalRehab.toLocaleString()} <span className="text-sm text-gray-400 ml-2">/ ${deal.financials.projectedRehabCost?.toLocaleString()} bgt</span>
               </p>
             </div>
             <button onClick={addMockExpense} className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded-md hover:bg-gray-200 transition shadow-sm">
                Add $5k Expense
             </button>
          </div>

          {/* Scalable Visual Indicator: Horizontal Distribution Bar */}
          <div className="w-full mb-6">
             <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-medium">
               <span>Cost Distribution</span>
             </div>
             <div className="w-full h-3 bg-gray-800 rounded-full flex overflow-hidden">
                <div style={{ width: `${plumbingPrc}%` }} className="bg-blue-500 transition-all duration-500"></div>
                <div style={{ width: `${electricalPrc}%` }} className="bg-yellow-500 transition-all duration-500"></div>
                <div style={{ width: `${generalPrc}%` }} className="bg-gray-400 transition-all duration-500"></div>
             </div>
             <div className="flex space-x-6 mt-3">
                <div className="flex items-center text-[10px] text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> Plumbing ({plumbingPrc.toFixed(0)}%)
                </div>
                <div className="flex items-center text-[10px] text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div> Electrical ({electricalPrc.toFixed(0)}%)
                </div>
                <div className="flex items-center text-[10px] text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div> General ({generalPrc.toFixed(0)}%)
                </div>
             </div>
          </div>

          {/* Progressive Disclosure Toggle */}
          <div className="w-full border-t border-gray-700/50 pt-4">
             <button 
                onClick={() => setIsLedgerExpanded(!isLedgerExpanded)}
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white uppercase tracking-widest font-bold transition-colors"
             >
                <span>{isLedgerExpanded ? 'Hide Itemized Ledger' : 'View Itemized Ledger'}</span>
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isLedgerExpanded ? 'rotate-90' : ''}`} />
             </button>

             {/* Granular Table (Disclosed on Demand) */}
             <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isLedgerExpanded ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                {costs.length > 0 ? (
                  <div className="bg-[#111] rounded-lg border border-gray-800 overflow-y-auto max-h-80">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-[#1a1a1a] text-gray-400 text-[10px] uppercase tracking-widest sticky top-0">
                         <tr>
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium">Cost</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-800">
                         {costs.map((c, i) => (
                           <tr key={i} className="hover:bg-[#151515] transition-colors">
                             <td className="px-4 py-3 text-gray-300">{c.description}</td>
                             <td className="px-4 py-3 text-white font-medium">${c.amount.toLocaleString()}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-4 text-center">No approved costs registered yet.</p>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}
