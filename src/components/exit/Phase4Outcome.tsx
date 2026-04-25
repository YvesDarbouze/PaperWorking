import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { RefreshCw, DollarSign, Percent, TrendingUp, Sparkles, Layout } from 'lucide-react';
import ProfessionalListingDashboard from '@/components/listing/ProfessionalListingDashboard';

const DealAutopsy = lazy(() => import('@/components/exit/DealAutopsy'));

interface Phase4OutcomeProps {
  projectId: string;
}

export default function Phase4Outcome({ projectId }: Phase4OutcomeProps) {
  const projects = useProjectStore(state => state.projects);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  
  const deal = projects.find(d => d.id === projectId);
  const financials = deal?.financials;

  const [strategy, setStrategy] = useState<'Sell'|'Rent'>(financials?.exitStrategyType || 'Sell');
  const [viewMode, setViewMode] = useState<'Financials' | 'Listing'>('Financials');

  // Sell States
  const [salePrice, setSalePrice] = useState(financials?.actualSalePrice?.toString() || financials?.estimatedARV?.toString() || '0');
  const [agentCommissions, setAgentCommissions] = useState(
    ((financials?.buyersAgentCommission || 3) + (financials?.sellersAgentCommission || 3)).toString()
  );
  const [closingCosts, setClosingCosts] = useState(financials?.finalClosingCosts?.toString() || '0');

  // Rent States
  const [projectedRent, setProjectedRent] = useState(financials?.projectedMonthlyRent?.toString() || '0');
  const [vacancyRate, setVacancyRate] = useState(financials?.vacancyRate?.toString() || '5');
  const [maintenance, setMaintenance] = useState(financials?.maintenanceReserves?.toString() || '0');
  const [propMgmt, setPropMgmt] = useState(financials?.propertyManagementFee?.toString() || '0');
  const [longTermMortgage, setLongTermMortgage] = useState(financials?.longTermMortgagePayment?.toString() || '0');

  useEffect(() => {
    // Auto-save on unmount or blur ideally, but for this UX prototype, let's keep it syncing
    updateProjectFinancials(projectId, {
      exitStrategyType: strategy,
      actualSalePrice: Number(salePrice),
      buyersAgentCommission: Number(agentCommissions) / 2, // split for simplicity 
      sellersAgentCommission: Number(agentCommissions) / 2,
      finalClosingCosts: Number(closingCosts),
      projectedMonthlyRent: Number(projectedRent),
      vacancyRate: Number(vacancyRate),
      maintenanceReserves: Number(maintenance),
      propertyManagementFee: Number(propMgmt),
      longTermMortgagePayment: Number(longTermMortgage)
    });
  }, [
    strategy, salePrice, agentCommissions, closingCosts, projectedRent, 
    vacancyRate, maintenance, propMgmt, longTermMortgage, projectId, updateProjectFinancials
  ]);

  if (!deal || !financials) return null;

  // Calculators
  const totalPurchase = financials.purchasePrice || 0;
  // Summing rehab costs
  const totalRehab = financials.costs?.reduce((acc, c) => acc + c.amount, 0) || 0; 
  const totalCapitalDeployed = totalPurchase + totalRehab;

  const handleToggle = (opt: 'Sell' | 'Rent') => setStrategy(opt);

  // Profit calculations
  const calculateNetProfit = () => {
     const sale = Number(salePrice);
     const commissions = sale * (Number(agentCommissions) / 100);
     const finalCosts = Number(closingCosts);
     return sale - (totalCapitalDeployed + commissions + finalCosts);
  };

  const calculateCashFlow = () => {
     const grossRent = Number(projectedRent);
     const vacLost = grossRent * (Number(vacancyRate) / 100);
     const maint = Number(maintenance);
     const mgmt = Number(propMgmt);
     const mortgage = Number(longTermMortgage);
     return grossRent - vacLost - maint - mgmt - mortgage;
  };

  const cashFlow = calculateCashFlow();
  const cashOnCash = totalCapitalDeployed > 0 ? ((cashFlow * 12) / totalCapitalDeployed) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-8">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-border-accent/30 pb-6 mb-8 gap-4">
         <div className="flex flex-col">
            <h2 className="text-3xl font-light text-white tracking-tight flex items-center">
               {strategy === 'Sell' ? 'Flip Strategy' : 'Hold Protocol'}
            </h2>
            <div className="flex items-center space-x-4 mt-2">
               <button 
                  onClick={() => setViewMode('Financials')}
                  className={`text-xs font-bold uppercase tracking-widest flex items-center space-x-1.5 transition-opacity ${viewMode === 'Financials' ? 'text-white' : 'text-white/40 hover:text-white'}`}
               >
                  <DollarSign className="w-3 h-3" />
                  <span>Financial Core</span>
               </button>
               <button 
                  onClick={() => setViewMode('Listing')}
                  className={`text-xs font-bold uppercase tracking-widest flex items-center space-x-1.5 transition-opacity ${viewMode === 'Listing' ? 'text-white' : 'text-white/40 hover:text-white'}`}
               >
                  <Sparkles className="w-3 h-3" />
                  <span>Professional Listing</span>
               </button>
            </div>
         </div>
         <div className="flex bg-black/20 p-1 rounded-lg">
            <button 
               onClick={() => handleToggle('Sell')}
               className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${strategy === 'Sell' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
            >
               Exit Strategy: Sell
            </button>
            <button 
               onClick={() => handleToggle('Rent')}
               className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${strategy === 'Rent' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
            >
               Exit Strategy: Rent & Hold
            </button>
         </div>
      </div>

      {viewMode === 'Listing' ? (
        <div className="flex-1 overflow-y-auto bg-bg-surface/10 rounded-3xl p-8 backdrop-blur-xl border border-white/5">
           <ProfessionalListingDashboard deal={deal} />
        </div>
      ) : (
        <>
        {/* Original Financials Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Column: Form Inputs */}
        <div className="space-y-6">
          {strategy === 'Sell' ? (
             <div className="bg-bg-surface/10 backdrop-blur border border-white/10 rounded-xl p-8 space-y-6">
               <h3 className="text-lg text-white font-medium mb-4">Liquidation Parameters</h3>
               <div>
                 <label className="text-sm font-medium text-gray-300 mb-2 block">Actual Sale Price ($)</label>
                 <div className="relative">
                   <DollarSign className="absolute left-3 top-3 w-5 h-5 text-text-secondary" />
                   <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-gray-300 mb-2 block">Total Agent Comm.</label>
                   <div className="relative">
                     <input type="number" step="0.1" value={agentCommissions} onChange={e => setAgentCommissions(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-white transition-colors" />
                     <Percent className="absolute right-3 top-3 w-4 h-4 text-text-secondary" />
                   </div>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-300 mb-2 block">Closing Costs ($)</label>
                   <input type="number" value={closingCosts} onChange={e => setClosingCosts(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
               </div>
             </div>
          ) : (
             <div className="bg-bg-surface/10 backdrop-blur border border-white/10 rounded-xl p-8 space-y-6">
               <h3 className="text-lg text-white font-medium mb-4">Revenue & Operations Ledger</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-gray-300 mb-2 block">Proj. Monthly Rent ($)</label>
                   <input type="number" value={projectedRent} onChange={e => setProjectedRent(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-300 mb-2 block">Vacancy Rate</label>
                   <div className="relative">
                      <input type="number" step="0.1" value={vacancyRate} onChange={e => setVacancyRate(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-white transition-colors" />
                      <Percent className="absolute right-3 top-3 w-4 h-4 text-text-secondary" />
                   </div>
                 </div>
               </div>
               <hr className="border-gray-500/30" />
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div>
                   <label className="text-xs font-medium text-text-secondary mb-2 block">Maint. Reserves</label>
                   <input type="number" value={maintenance} onChange={e => setMaintenance(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
                 <div>
                   <label className="text-xs font-medium text-text-secondary mb-2 block">Prop. Management</label>
                   <input type="number" value={propMgmt} onChange={e => setPropMgmt(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
                 <div>
                   <label className="text-xs font-medium text-text-secondary mb-2 block">Mortgage (PITI)</label>
                   <input type="number" value={longTermMortgage} onChange={e => setLongTermMortgage(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* Right Column: Financial Ticker Dashboard */}
        <div className="flex flex-col space-y-6">
           <div className="bg-bg-surface rounded-xl p-8 shadow-2xl relative overflow-hidden h-full flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-bg-primary rounded-bl-full -z-10 mix-blend-multiply opacity-50"></div>
              
              <div className="mb-8">
                 <p className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1 flex items-center">
                   <TrendingUp className="w-4 h-4 mr-2" /> Live Financial Ticker
                 </p>
                 <p className="text-xs text-text-secondary">Capital Deployed: ${totalCapitalDeployed.toLocaleString()}</p>
              </div>

              {strategy === 'Sell' ? (
                <div>
                   <p className="text-lg text-text-secondary font-medium mb-2">Final Net Profit</p>
                   <h1 className={`text-6xl font-light tracking-tighter ${calculateNetProfit() >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      ${calculateNetProfit().toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                   </h1>
                </div>
              ) : (
                <div className="space-y-8">
                   <div>
                     <p className="text-lg text-text-secondary font-medium mb-2">Monthly Cash Flow</p>
                     <h1 className={`text-5xl font-light tracking-tighter ${cashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ${cashFlow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xl text-text-secondary font-normal">/mo</span>
                     </h1>
                   </div>
                   <div className="pt-6 border-t border-border-accent">
                     <p className="text-sm text-text-secondary font-medium mb-1">Cash-on-Cash Return (CoC)</p>
                     <h2 className="text-3xl font-light text-text-primary">
                        {cashOnCash.toFixed(2)}%
                     </h2>
                   </div>
                </div>
              )}
           </div>
        </div>

        </div>

        {/* ── Deal Autopsy: locks all KPIs once status = Sold ── */}
        <div className="mt-12">
          <Suspense fallback={<div className="h-96 rounded-2xl bg-bg-surface/5 animate-pulse" />}>
            <DealAutopsy deal={deal} />
          </Suspense>
        </div>
        </>
      )}
    </div>
  );
}
