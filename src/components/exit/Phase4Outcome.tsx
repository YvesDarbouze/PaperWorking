import React, { useState, useEffect } from 'react';
import { PropertyDeal } from '@/types/schema';
import { useDealStore } from '@/store/dealStore';
import { RefreshCw, DollarSign, Percent, TrendingUp } from 'lucide-react';

interface Phase4OutcomeProps {
  dealId: string;
}

export default function Phase4Outcome({ dealId }: Phase4OutcomeProps) {
  const deals = useDealStore(state => state.deals);
  const updateDealFinancials = useDealStore(state => state.updateDealFinancials);
  
  const deal = deals.find(d => d.id === dealId);
  const financials = deal?.financials;

  const [strategy, setStrategy] = useState<'Sell'|'Rent'>(financials?.exitStrategyType || 'Sell');

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
    updateDealFinancials(dealId, {
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
    vacancyRate, maintenance, propMgmt, longTermMortgage, dealId, updateDealFinancials
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
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-300/30 pb-6 mb-8">
         <h2 className="text-3xl font-light text-white tracking-tight flex items-center">
            {strategy === 'Sell' ? 'Flip Strategy' : 'Hold Protocol'}
         </h2>
         <div className="flex bg-black/20 p-1 rounded-lg mt-4 sm:mt-0">
            <button 
               onClick={() => handleToggle('Sell')}
               className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${strategy === 'Sell' ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:text-white'}`}
            >
               Exit Strategy: Sell
            </button>
            <button 
               onClick={() => handleToggle('Rent')}
               className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${strategy === 'Rent' ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:text-white'}`}
            >
               Exit Strategy: Rent & Hold
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Column: Form Inputs */}
        <div className="space-y-6">
          {strategy === 'Sell' ? (
             <div className="bg-white/10 backdrop-blur border border-white/10 rounded-xl p-8 space-y-6">
               <h3 className="text-lg text-white font-medium mb-4">Liquidation Parameters</h3>
               <div>
                 <label className="text-sm font-medium text-gray-300 mb-2 block">Actual Sale Price ($)</label>
                 <div className="relative">
                   <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                   <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-gray-300 mb-2 block">Total Agent Comm.</label>
                   <div className="relative">
                     <input type="number" step="0.1" value={agentCommissions} onChange={e => setAgentCommissions(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-white transition-colors" />
                     <Percent className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                   </div>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-300 mb-2 block">Closing Costs ($)</label>
                   <input type="number" value={closingCosts} onChange={e => setClosingCosts(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
               </div>
             </div>
          ) : (
             <div className="bg-white/10 backdrop-blur border border-white/10 rounded-xl p-8 space-y-6">
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
                      <Percent className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                   </div>
                 </div>
               </div>
               <hr className="border-gray-500/30" />
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div>
                   <label className="text-xs font-medium text-gray-400 mb-2 block">Maint. Reserves</label>
                   <input type="number" value={maintenance} onChange={e => setMaintenance(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
                 <div>
                   <label className="text-xs font-medium text-gray-400 mb-2 block">Prop. Management</label>
                   <input type="number" value={propMgmt} onChange={e => setPropMgmt(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
                 <div>
                   <label className="text-xs font-medium text-gray-400 mb-2 block">Mortgage (PITI)</label>
                   <input type="number" value={longTermMortgage} onChange={e => setLongTermMortgage(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* Right Column: Financial Ticker Dashboard */}
        <div className="flex flex-col space-y-6">
           <div className="bg-white rounded-xl p-8 shadow-2xl relative overflow-hidden h-full flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-bl-full -z-10 mix-blend-multiply opacity-50"></div>
              
              <div className="mb-8">
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                   <TrendingUp className="w-4 h-4 mr-2" /> Live Financial Ticker
                 </p>
                 <p className="text-xs text-gray-500">Capital Deployed: ${totalCapitalDeployed.toLocaleString()}</p>
              </div>

              {strategy === 'Sell' ? (
                <div>
                   <p className="text-lg text-gray-600 font-medium mb-2">Final Net Profit</p>
                   <h1 className={`text-6xl font-light tracking-tighter ${calculateNetProfit() >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      ${calculateNetProfit().toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                   </h1>
                </div>
              ) : (
                <div className="space-y-8">
                   <div>
                     <p className="text-lg text-gray-600 font-medium mb-2">Monthly Cash Flow</p>
                     <h1 className={`text-5xl font-light tracking-tighter ${cashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ${cashFlow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xl text-gray-400 font-normal">/mo</span>
                     </h1>
                   </div>
                   <div className="pt-6 border-t border-gray-100">
                     <p className="text-sm text-gray-500 font-medium mb-1">Cash-on-Cash Return (CoC)</p>
                     <h2 className="text-3xl font-light text-gray-900">
                        {cashOnCash.toFixed(2)}%
                     </h2>
                   </div>
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}
