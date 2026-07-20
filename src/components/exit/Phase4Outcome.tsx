import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { RefreshCw, DollarSign, Percent, TrendingUp, Sparkles, Layout, Lock, Plus, Trash2, Database, Key, Check, X } from 'lucide-react';
import ProfessionalListingDashboard from '@/components/listing/ProfessionalListingDashboard';
import { projectsService } from '@/lib/firebase/projects';
import ExitInterview from '@/components/exit/ExitInterview';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

const DealAutopsy = lazy(() => import('@/components/exit/DealAutopsy'));
const NOIDeepDive = lazy(() => import('@/components/dashboard/charts/NOIDeepDive'));

interface Phase4OutcomeProps {
  projectId: string;
}

export default function Phase4Outcome({ projectId }: Phase4OutcomeProps) {
  const { user } = useAuth();
  const projects = useProjectStore(state => state.projects);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  const updateProjectExit = useProjectStore(state => state.updateProjectExit);
  
  const deal = projects.find(d => d.id === projectId);
  const financials = deal?.financials;

  const strategy = deal?.dispositionType === 'LEASE'
    ? 'Lease'
    : deal?.dispositionType === 'RENT'
    ? 'Rent'
    : 'Sell';
  const [viewMode, setViewMode] = useState<'Financials' | 'Listing'>('Financials');
  const [isClosing, setIsClosing] = useState(false);

  // Manual Rent ledger inputs
  const [manualPeriod, setManualPeriod] = useState('');
  const [manualRent, setManualRent] = useState('');

  // RentCast API Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importAddress, setImportAddress] = useState(deal?.address || '');
  const [isImporting, setIsImporting] = useState(false);
  const [previewPayments, setPreviewPayments] = useState<{ period: string; modality: string; grossRevenue: number }[]>([]);
  const [importError, setImportError] = useState('');

  // Synchronize import address if deal address changes
  useEffect(() => {
    if (deal?.address) {
      setImportAddress(deal.address);
    }
  }, [deal?.address]);

  const handleAddManualPayment = async () => {
    if (!manualPeriod || !manualRent) {
      toast.error("Please select a month and enter rent amount.");
      return;
    }
    const rentAmount = Number(manualRent);
    if (isNaN(rentAmount) || rentAmount <= 0) {
      toast.error("Rent amount must be greater than 0.");
      return;
    }

    const currentLedger = deal?.exit?.stabilizedRevenue || [];
    if (currentLedger.some(entry => entry.period === manualPeriod)) {
      toast.error("A payment for this month is already recorded in the ledger.");
      return;
    }

    const newEntry = {
      period: manualPeriod,
      modality: 'long_term_rental',
      grossRevenue: rentAmount,
    };

    const newLedger = [...currentLedger, newEntry].sort((a, b) => b.period.localeCompare(a.period));

    try {
      await projectsService.updateProject(projectId, {
        exit: {
          ...deal?.exit,
          stabilizedRevenue: newLedger,
          currentModality: deal?.exit?.currentModality || 'long_term_rental',
          modalityHistory: deal?.exit?.modalityHistory || [],
          sale: deal?.exit?.sale || null
        } as any
      });
      updateProjectExit(projectId, {
        stabilizedRevenue: newLedger
      });
      toast.success("Manual payment added!");
      setManualPeriod('');
      setManualRent('');
    } catch (err) {
      console.error(err);
      toast.error("Failed to add manual payment.");
    }
  };

  const handleDeletePayment = async (periodToDelete: string) => {
    const currentLedger = deal?.exit?.stabilizedRevenue || [];
    const newLedger = currentLedger.filter(entry => entry.period !== periodToDelete);

    try {
      await projectsService.updateProject(projectId, {
        exit: {
          ...deal?.exit,
          stabilizedRevenue: newLedger,
          currentModality: deal?.exit?.currentModality || 'long_term_rental',
          modalityHistory: deal?.exit?.modalityHistory || [],
          sale: deal?.exit?.sale || null
        } as any
      });
      updateProjectExit(projectId, {
        stabilizedRevenue: newLedger
      });
      toast.success("Payment deleted from ledger.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete payment.");
    }
  };

  const handleQueryRentCast = async () => {
    if (!user) {
      toast.error("You must be logged in to fetch RentCast data.");
      return;
    }
    setIsImporting(true);
    setImportError('');
    setPreviewPayments([]);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/rent-history/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          address: importAddress
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const resData = await response.json();
      if (resData.rentPayments && resData.rentPayments.length > 0) {
        setPreviewPayments(resData.rentPayments);
      } else {
        setImportError("No rental history listings found in RentCast for this address.");
      }
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "Failed to query RentCast. Please check the address.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveImportedPayments = async () => {
    if (previewPayments.length === 0) return;

    const currentLedger = deal?.exit?.stabilizedRevenue || [];
    const mergedLedgerMap: Record<string, typeof previewPayments[0]> = {};
    
    currentLedger.forEach(entry => {
      mergedLedgerMap[entry.period] = entry;
    });

    previewPayments.forEach(entry => {
      mergedLedgerMap[entry.period] = entry;
    });

    const newLedger = Object.values(mergedLedgerMap).sort((a, b) => b.period.localeCompare(a.period));

    try {
      await projectsService.updateProject(projectId, {
        exit: {
          ...deal?.exit,
          stabilizedRevenue: newLedger,
          currentModality: deal?.exit?.currentModality || 'long_term_rental',
          modalityHistory: deal?.exit?.modalityHistory || [],
          sale: deal?.exit?.sale || null
        } as any
      });
      updateProjectExit(projectId, {
        stabilizedRevenue: newLedger
      });
      toast.success(`Successfully imported ${previewPayments.length} monthly payments from RentCast!`);
      setShowImportModal(false);
      setPreviewPayments([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save imported payments.");
    }
  };

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

  const isClosed = deal.status === 'exit';

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
         <div className="flex bg-pw-glass-bg border border-pw-border/20 p-1 rounded-lg">
            <div className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-pw-accent/25 text-pw-white border border-pw-accent/30 rounded">
               Exit Strategy: {strategy === 'Lease' ? 'Lease' : strategy === 'Rent' ? 'Rent & Hold' : 'Sell'} (Read-Only)
            </div>
         </div>
      </div>

      {!isClosed && <ExitInterview deal={deal} />}

      <div className="w-full max-w-4xl mx-auto aspect-video bg-pw-glass-bg border border-pw-border flex flex-col items-center justify-center cursor-pointer hover:bg-pw-glass-bg/85 transition-colors group mb-8">
        <div className="w-16 h-16 rounded-full bg-pw-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-pw-accent/20 backdrop-blur-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pw-accent opacity-80 group-hover:opacity-100 ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <p className="mt-4 text-[10px] font-black text-text-secondary tracking-widest uppercase">Watch Exit Explainer</p>
      </div>

      {viewMode === 'Listing' ? (
        <div className="flex-1 overflow-y-auto bg-pw-glass-bg/10 p-8 backdrop-blur-xl border border-pw-border">
           <ProfessionalListingDashboard deal={deal} />
        </div>
      ) : (
        <>
        {/* Original Financials Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Column: Form Inputs */}
        <div className="space-y-6">
          {strategy === 'Sell' ? (
             <div className="glass-card border border-pw-border p-8 space-y-6">
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
             <div className="glass-card border border-pw-border p-8 space-y-6">
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

          {strategy === 'Rent' && (
              <div className="glass-card border border-pw-border p-8 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg text-text-primary font-semibold">Tenant Rent Ledger</h3>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-3 py-1.5 bg-pw-accent/15 border border-pw-accent/30 hover:bg-pw-accent/25 text-pw-accent text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Automate with RentCast
                  </button>
                </div>

                <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                  Record actual tenant rent collections. These values are used to compute the realized Net Operating Income (NOI).
                </p>

                {/* Ledger Table */}
                <div className="border border-pw-border divide-y divide-pw-border bg-black/10 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 gap-4 px-4 py-2 bg-white/5 text-[10px] font-black uppercase tracking-wider text-text-secondary">
                    <span>Period</span>
                    <span>Modality</span>
                    <span className="text-right">Amount Collected</span>
                  </div>

                  {(!deal.exit?.stabilizedRevenue || deal.exit.stabilizedRevenue.length === 0) ? (
                    <div className="p-6 text-center text-xs text-text-secondary border-t border-pw-border/50">
                      No payments logged in the rent ledger.
                    </div>
                  ) : (
                    <div className="divide-y divide-pw-border/30 max-h-60 overflow-y-auto">
                      {deal.exit.stabilizedRevenue.map((entry) => (
                        <div key={entry.period} className="grid grid-cols-3 gap-4 px-4 py-3 text-xs items-center text-text-primary">
                          <span className="font-mono font-semibold">{entry.period}</span>
                          <span className="capitalize">{entry.modality.replace(/_/g, ' ')}</span>
                          <div className="flex justify-end items-center gap-3">
                            <span className="font-semibold tabular-nums">${entry.grossRevenue.toLocaleString()}</span>
                            <button
                              onClick={() => handleDeletePayment(entry.period)}
                              className="text-color-error hover:text-color-error/80 transition-colors p-1"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Manual Payment */}
                <div className="mt-6 pt-6 border-t border-pw-border/50 space-y-4">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Log Payment Manually</h4>
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:flex-1">
                      <label className="text-[10px] text-text-secondary block mb-1.5 uppercase font-bold tracking-wider">Month</label>
                      <input
                        type="month"
                        value={manualPeriod}
                        onChange={e => setManualPeriod(e.target.value)}
                        className="glass-input w-full py-2.5 px-3 text-sm text-text-primary"
                      />
                    </div>
                    <div className="w-full sm:flex-1">
                      <label className="text-[10px] text-text-secondary block mb-1.5 uppercase font-bold tracking-wider">Amount ($)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-semibold">$</span>
                        <input
                          type="number"
                          value={manualRent}
                          onChange={e => setManualRent(e.target.value)}
                          placeholder="0.00"
                          className="glass-input w-full py-2.5 pl-7 pr-3 text-sm text-text-primary"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddManualPayment}
                      className="w-full sm:w-auto px-4 py-2.5 bg-pw-accent text-pw-white text-xs font-bold uppercase tracking-wider hover:bg-pw-accent/90 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
           )}
        </div>

        {/* Right Column: Financial Ticker Dashboard */}
        <div className="flex flex-col space-y-6">
           <div className="glass-card border border-pw-border p-8 relative overflow-hidden h-full flex flex-col justify-center">
              
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
                className="w-full py-4 mt-6 pw-btn pw-btn--primary text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
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
              <div className="w-full py-4 mt-6 bg-pw-glass-bg border border-pw-border text-text-secondary font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2">
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
              <div className="animate-pulse bg-pw-glass-bg/10 h-64 flex items-center justify-center border border-pw-border">
                <span className="text-xs text-text-secondary uppercase tracking-widest">Loading NOI Analytics…</span>
              </div>
            }
          >
            <NOIDeepDive projects={[deal]} />
          </Suspense>
        </div>

        {/* ── Deal Autopsy: locks all KPIs once status = Sold ── */}
        <div className="mt-12">
          <Suspense fallback={<div className="h-96 bg-pw-glass-bg/10 animate-shimmer border border-pw-border" />}>
            <DealAutopsy deal={deal} />
          </Suspense>
        </div>
        </>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-card border border-pw-border max-w-lg w-full p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowImportModal(false);
                setPreviewPayments([]);
                setImportError('');
              }}
              className="absolute right-4 top-4 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Database className="w-5 h-5 text-pw-accent" />
                RentCast History Import
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Automate rent ledger data entry by pulling active/inactive rental history records from RentCast.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-text-secondary block mb-1.5 uppercase font-bold tracking-wider">Property Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importAddress}
                    onChange={e => setImportAddress(e.target.value)}
                    placeholder="Enter property address..."
                    className="glass-input flex-1 py-2.5 px-3 text-sm text-text-primary"
                  />
                  <button
                    onClick={handleQueryRentCast}
                    disabled={isImporting || !importAddress}
                    className="px-4 py-2.5 bg-pw-accent text-pw-white text-xs font-bold uppercase tracking-wider hover:bg-pw-accent/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Fetch
                  </button>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-color-error/10 border border-color-error/20 rounded text-xs text-color-error">
                  {importError}
                </div>
              )}

              {previewPayments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono">Found {previewPayments.length} Months of History</span>
                    <span className="text-xs font-semibold text-pw-accent uppercase tracking-widest text-[9px]">
                      Previewing Import
                    </span>
                  </div>
                  <div className="border border-pw-border divide-y divide-pw-border bg-black/20 rounded-lg max-h-48 overflow-y-auto">
                    {previewPayments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs">
                        <span className="font-mono text-text-primary">{payment.period}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-text-secondary capitalize">
                            {payment.modality.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-text-primary">${payment.grossRevenue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-pw-border/50">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPreviewPayments([]);
                  setImportError('');
                }}
                className="px-4 py-2 border border-pw-border hover:bg-white/5 text-text-secondary hover:text-text-primary text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImportedPayments}
                disabled={previewPayments.length === 0}
                className="px-4 py-2 bg-pw-accent text-pw-white text-xs font-bold uppercase tracking-wider hover:bg-pw-accent/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Import Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
