import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { RefreshCw, DollarSign, Percent, TrendingUp, Sparkles, Layout, Lock } from 'lucide-react';
import ProfessionalListingDashboard from '@/components/listing/ProfessionalListingDashboard';
import { projectsService } from '@/lib/firebase/projects';
import ExitInterview from '@/components/exit/ExitInterview';

const DealAutopsy = lazy(() => import('@/components/exit/DealAutopsy'));
const NOIDeepDive = lazy(() => import('@/components/dashboard/charts/NOIDeepDive'));

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
  const [isClosing, setIsClosing] = useState(false);

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

  const handleCloseProject = async () => {
    if (!deal?.organizationId) return;
    setIsClosing(true);
    try {
      await projectsService.closeProjectAndArchive(projectId, deal.organizationId, strategy);
    } catch (error) {
      console.error('Failed to close project:', error);
    } finally {
      setIsClosing(false);
    }
  };

  const isClosed = deal.status === 'closed_won' || deal.status === 'closed_lost' || deal.status === 'Sold' || deal.status === 'Rented';

  return (
    <div className="w-full h-full flex flex-col p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-8">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-pw-border pb-6 mb-8 gap-4">
         <div className="flex flex-col">
            <h2 className="text-3xl font-light text-text-primary tracking-tight flex items-center">
               {strategy === 'Sell' ? 'Flip Strategy' : 'Hold Protocol'}
            </h2>
            <div className="flex items-center space-x-4 mt-4">
               <button 
                  onClick={() => setViewMode('Financials')}
                  className={`text-xs font-black uppercase tracking-widest flex items-center space-x-1.5 transition-all pb-1 border-b-2 ${viewMode === 'Financials' ? 'border-pw-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
               >
                  <DollarSign className="w-3 h-3 text-pw-accent" />
                  <span>Financial Core</span>
               </button>
               <button 
                  onClick={() => setViewMode('Listing')}
                  className={`text-xs font-black uppercase tracking-widest flex items-center space-x-1.5 transition-all pb-1 border-b-2 ${viewMode === 'Listing' ? 'border-pw-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
               >
                  <Sparkles className="w-3 h-3 text-pw-accent" />
                  <span>Professional Listing</span>
               </button>
            </div>
         </div>
         <div className="flex bg-pw-glass-bg border border-pw-border p-1 rounded-none">
            <button 
               onClick={() => handleToggle('Sell')}
               className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all ${strategy === 'Sell' ? 'bg-pw-accent text-pw-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
               Exit Strategy: Sell
            </button>
            <button 
               onClick={() => handleToggle('Rent')}
               className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all ${strategy === 'Rent' ? 'bg-pw-accent text-pw-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
               Exit Strategy: Rent & Hold
            </button>
         </div>
      </div>

      {!isClosed && <ExitInterview deal={deal} />}

      <div className="w-full max-w-4xl mx-auto aspect-video bg-pw-glass-bg border border-pw-border rounded-none flex flex-col items-center justify-center cursor-pointer hover:bg-pw-glass-bg/85 transition-colors group mb-8 shadow-none">
        <div className="w-16 h-16 rounded-full bg-pw-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-none border border-pw-accent/20 backdrop-blur-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pw-accent opacity-80 group-hover:opacity-100 ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <p className="mt-4 text-[10px] font-black text-text-secondary tracking-widest uppercase">Watch Exit Explainer</p>
      </div>

      {viewMode === 'Listing' ? (
        <div className="flex-1 overflow-y-auto bg-pw-glass-bg/10 rounded-none p-8 backdrop-blur-xl border border-pw-border">
           <ProfessionalListingDashboard deal={deal} />
        </div>
      ) : (
        <>
        {/* Original Financials Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Column: Form Inputs */}
        <div className="space-y-6">
          {strategy === 'Sell' ? (
             <div className="glass-card border border-pw-border rounded-none p-8 space-y-6">
               <h3 className="text-lg text-text-primary font-semibold mb-4">Liquidation Parameters</h3>
               <div>
                 <label className="text-xs font-bold text-text-secondary mb-2 block">Actual Sale Price ($)</label>
                 <div className="relative">
                   <DollarSign className="absolute left-3 top-3 w-5 h-5 text-text-secondary" />
                   <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="glass-input w-full py-3 pl-10 pr-4 text-text-primary" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-text-secondary mb-2 block">Total Agent Comm.</label>
                   <div className="relative">
                     <input type="number" step="0.1" value={agentCommissions} onChange={e => setAgentCommissions(e.target.value)} className="glass-input w-full py-3 px-4 text-text-primary" />
                     <Percent className="absolute right-3 top-3 w-4 h-4 text-text-secondary" />
                   </div>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-text-secondary mb-2 block">Closing Costs ($)</label>
                   <input type="number" value={closingCosts} onChange={e => setClosingCosts(e.target.value)} className="glass-input w-full py-3 px-4 text-text-primary" />
                 </div>
               </div>
             </div>
          ) : (
             <div className="glass-card border border-pw-border rounded-none p-8 space-y-6">
               <h3 className="text-lg text-text-primary font-semibold mb-4">Revenue & Operations Ledger</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-text-secondary mb-2 block">Proj. Monthly Rent ($)</label>
                   <input type="number" value={projectedRent} onChange={e => setProjectedRent(e.target.value)} className="glass-input w-full py-3 px-4 text-text-primary" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-text-secondary mb-2 block">Vacancy Rate</label>
                   <div className="relative">
                      <input type="number" step="0.1" value={vacancyRate} onChange={e => setVacancyRate(e.target.value)} className="glass-input w-full py-3 px-4 text-text-primary" />
                      <Percent className="absolute right-3 top-3 w-4 h-4 text-text-secondary" />
                   </div>
                 </div>
               </div>
               <hr className="border-pw-border/50" />
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div>
                   <label className="text-xs font-bold text-text-secondary mb-2 block">Maint. Reserves</label>
                   <input type="number" value={maintenance} onChange={e => setMaintenance(e.target.value)} className="glass-input w-full py-2 px-3 text-sm text-text-primary" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-text-secondary mb-2 block">Prop. Management</label>
                   <input type="number" value={propMgmt} onChange={e => setPropMgmt(e.target.value)} className="glass-input w-full py-2 px-3 text-sm text-text-primary" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-text-secondary mb-2 block">Mortgage (PITI)</label>
                   <input type="number" value={longTermMortgage} onChange={e => setLongTermMortgage(e.target.value)} className="glass-input w-full py-2 px-3 text-sm text-text-primary" />
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* Right Column: Financial Ticker Dashboard */}
        <div className="flex flex-col space-y-6">
           <div className="glass-card border border-pw-border rounded-none p-8 shadow-none relative overflow-hidden h-full flex flex-col justify-center">
              
              <div className="mb-8">
                 <p className="text-xs font-black text-text-secondary uppercase tracking-[0.3em] mb-1 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-pw-accent" /> Live Financial Ticker
                 </p>
                 <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Capital Deployed: ${totalCapitalDeployed.toLocaleString()}</p>
              </div>

              {strategy === 'Sell' ? (
                <div>
                   <p className="text-lg text-text-secondary font-semibold mb-2">Final Net Profit</p>
                   <h1 className={`text-6xl font-light tracking-tighter ${calculateNetProfit() >= 0 ? 'text-pw-accent' : 'text-color-error'}`}>
                      ${calculateNetProfit().toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                   </h1>
                </div>
              ) : (
                <div className="space-y-8">
                   <div>
                     <p className="text-lg text-text-secondary font-semibold mb-2">Monthly Cash Flow</p>
                     <h1 className={`text-5xl font-light tracking-tighter ${cashFlow >= 0 ? 'text-pw-accent' : 'text-color-error'}`}>
                        ${cashFlow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xl text-text-secondary font-normal">/mo</span>
                     </h1>
                   </div>
                   <div className="pt-6 border-t border-pw-border">
                     <p className="text-xs font-bold text-text-secondary mb-1">Cash-on-Cash Return (CoC)</p>
                     <h2 className="text-3xl font-light text-text-primary">
                        {cashOnCash.toFixed(2)}%
                     </h2>
                   </div>
                </div>
              )}
           </div>

            {/* Action Buttons */}
            {!isClosed && (
              <button
                onClick={handleCloseProject}
                disabled={isClosing}
                className="w-full py-4 mt-6 pw-btn pw-btn--primary rounded-none text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                {isClosing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                <span>{isClosing ? 'Finalizing Autopsy...' : 'Close Project & Generate Autopsy'}</span>
              </button>
            )}
            {isClosed && (
              <div className="w-full py-4 mt-6 bg-pw-glass-bg border border-pw-border text-text-secondary rounded-none font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Project Permanently Closed</span>
              </div>
            )}
        </div>

        </div>

        {/* ── NOI Deep Dive — Exit-stage property analysis ── */}
        <div className="mt-12">
          <Suspense
            fallback={
              <div className="animate-pulse bg-pw-glass-bg/10 rounded-none h-64 flex items-center justify-center border border-pw-border">
                <span className="text-xs text-text-secondary uppercase tracking-widest">Loading NOI Analytics…</span>
              </div>
            }
          >
            <NOIDeepDive projects={[deal]} />
          </Suspense>
        </div>

        {/* ── Deal Autopsy: locks all KPIs once status = Sold ── */}
        <div className="mt-12">
          <Suspense fallback={<div className="h-96 rounded-none bg-pw-glass-bg/10 animate-shimmer border border-pw-border" />}>
            <DealAutopsy deal={deal} />
          </Suspense>
        </div>
        </>
      )}
    </div>
  );
}
