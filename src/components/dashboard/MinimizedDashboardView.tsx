import React, { useState } from 'react';
import { PropertyDeal } from '@/types/schema';
import { Building2, Search, FileSignature, HardHat, LogOut, ArrowRight, Info } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

interface MinimizedDashboardViewProps {
  deals: PropertyDeal[];
  onSelectDeal: (dealId: string) => void;
}

const getPhaseIcon = (status: string) => {
  switch (status) {
    case 'Lead': return <Search className="w-4 h-4" />;
    case 'Under Contract': return <FileSignature className="w-4 h-4" />;
    case 'Renovating': return <HardHat className="w-4 h-4" />;
    case 'Listed': return <LogOut className="w-4 h-4" />;
    case 'Sold': return <LogOut className="w-4 h-4 text-green-600" />;
    default: return <Building2 className="w-4 h-4" />;
  }
};

const getStatusBadge = (status: string) => {
  const base = "px-2.5 py-1 rounded-sm text-[11px] font-mono uppercase tracking-widest border";
  switch (status) {
    case 'Lead': return `${base} bg-gray-50 border-gray-200 text-gray-600`;
    case 'Under Contract': return `${base} bg-gray-50 border-gray-200 text-gray-600`;
    case 'Renovating': return `${base} bg-gray-50 border-gray-200 text-gray-600`;
    case 'Listed': return `${base} bg-gray-50 border-gray-200 text-gray-600`;
    case 'Sold': return `${base} bg-gray-100 border-gray-200 text-gray-800`;
    default: return `${base} bg-gray-50 border-gray-200 text-gray-600`;
  }
};

export default function MinimizedDashboardView({ deals, onSelectDeal }: MinimizedDashboardViewProps) {
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const { onboardingStep, completeOnboarding } = useUserStore();

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDealId(prev => prev === id ? null : id);
    
    if (onboardingStep === 4) {
       completeOnboarding();
    }
  };

  return (
    <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-6 px-2">
        <div>
           <h2 className="text-2xl font-light tracking-tight text-gray-900">Active Pipeline</h2>
           <p className="text-sm text-gray-500 mt-1">Select a property to enter the Lifecycle Framework.</p>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        {deals.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No active deals found. Add a target property.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {deals.map((deal, index) => {
              const isRent = deal.financials?.exitStrategyType === 'Rent';
              // Simple heuristic to display health
              const purchase = deal.financials?.purchasePrice || 0;
              const hasHealthMap = purchase > 0;
              
              return (
                <div 
                  key={deal.id}
                  className={`group flex flex-col border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors relative ${onboardingStep === 4 && index === 0 ? 'ring-4 ring-indigo-500/50 bg-indigo-50/50 z-10' : ''}`}
                >
                  {onboardingStep === 4 && index === 0 && (
                     <div className="absolute -top-12 left-10 bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg shadow-lg flex items-center animate-bounce whitespace-nowrap z-50">
                        <Info className="w-4 h-4 mr-2" /> Click the property row to horizontally expand the financial snapshot!
                        <div className="absolute -bottom-1.5 left-10 w-3 h-3 bg-indigo-600 rotate-45"></div>
                     </div>
                  )}
                  {/* Main Row Header */}
                  <div 
                     onClick={(e) => toggleExpand(deal.id, e)}
                     className="flex flex-col md:flex-row md:items-center justify-between p-6 cursor-pointer"
                  >
                      <div className="flex items-center space-x-4 mb-4 md:mb-0 w-full md:w-1/3">
                        <div className="w-10 h-10 rounded-full bg-[#f2f2f2] border border-gray-200 flex items-center justify-center text-gray-600 group-hover:bg-white group-hover:border-gray-300 transition-colors">
                          {getPhaseIcon(deal.status)}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 leading-none">{deal.propertyName}</h3>
                          <p className="text-sm text-gray-500 mt-1 truncate max-w-[250px]">{deal.address}</p>
                        </div>
                      </div>

                      <div className="flex-1 flex justify-start md:justify-center mb-4 md:mb-0">
                        <span className={getStatusBadge(deal.status)}>{deal.status}</span>
                      </div>

                      <div className="w-full md:w-1/3 flex items-center justify-between md:justify-end space-x-8">
                        {hasHealthMap && (
                          <div className="text-left md:text-right">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                              {isRent ? 'Est. Monthly Flow' : 'Est. Total Value'}
                            </p>
                            <p className="text-lg font-light text-gray-900">
                              {isRent && deal.financials.projectedMonthlyRent 
                                ? `$${deal.financials.projectedMonthlyRent.toLocaleString()}/mo` 
                                : `$${(deal.financials?.estimatedARV || deal.financials?.purchasePrice || 0).toLocaleString()}`}
                            </p>
                          </div>
                        )}
                        <div className={`p-1 rounded-full transition-transform duration-300 ${expandedDealId === deal.id ? 'rotate-90 bg-gray-200' : 'rotate-0 bg-transparent'}`}>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                        </div>
                      </div>
                  </div>

                  {/* Inline Expanded Quick Context Panel */}
                  {expandedDealId === deal.id && (
                      <div className="w-full bg-white border-t border-gray-100 p-6 flex flex-col md:flex-row gap-8 animate-in slide-in-from-top-2 fade-in duration-300">
                         {/* Financials Tab Snapshot */}
                         <div className="flex-1">
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3">Snapshot: Financials</h4>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="bg-[#f9f9f9] rounded-lg p-3">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Purchase Limit</p>
                                  <p className="text-sm font-semibold text-gray-900">${(deal.financials.maxOffer || 0).toLocaleString()}</p>
                               </div>
                               <div className="bg-[#f9f9f9] rounded-lg p-3">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Projected Dev Costs</p>
                                  <p className="text-sm font-semibold text-gray-900">${(deal.financials.projectedRehabCost || 0).toLocaleString()}</p>
                               </div>
                            </div>
                         </div>

                         {/* Action Center */}
                         <div className="w-full md:w-1/3 flex flex-col justify-end">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onSelectDeal(deal.id); }}
                              className="w-full flex items-center justify-center p-4 bg-black text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition shadow-md group"
                            >
                               Enter Engine Room <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-[10px] text-gray-400 text-center mt-2">Dives into granular ledger & lifecycle phases.</p>
                         </div>
                      </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
