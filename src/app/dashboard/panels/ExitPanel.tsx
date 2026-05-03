'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useProjectStore, selectActiveProjectMetrics } from '@/store/projectStore';
import { Camera, Link as LinkIcon, DollarSign, Percent, ExternalLink, Target, Home, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import NetEngine from '@/components/exit/NetEngine';
import ProfitVarianceCard from '@/components/dashboard/ProfitVarianceCard';
import ExitStrategyFork from '@/components/exit/ExitStrategyFork';
import NetProceedsCard from '@/components/exit/NetProceedsCard';
import { PhaseExplainerVideo } from '@/components/project/PhaseExplainerVideo';

const StagingVendorManager = lazy(() => import('@/components/exit/StagingVendorManager'));
const PhotographyUploadManager = lazy(() => import('@/components/exit/PhotographyUploadManager'));
const DealAutopsy = lazy(() => import('@/components/exit/DealAutopsy'));
const SettlementLedger = lazy(() => import('@/components/exit/SettlementLedger'));
const EscrowReconciliation = lazy(() => import('@/components/exit/EscrowReconciliation'));
const TaxReportGenerator = lazy(() => import('@/components/exit/TaxReportGenerator'));
const CrowdfundingReconciliation = lazy(() => import('@/components/exit/CrowdfundingReconciliation'));

/* ═══════════════════════════════════════════════════════
   Exit Panel — Lane 4 (The Exit Hub)
   
   Final disposition protocol with Exit Strategy Fork,
   Settlement Ledger, Escrow Reconciliation, Net Proceeds,
   and Tax Report Generator.
   ═══════════════════════════════════════════════════════ */

const LazyFallback = () => (
  <div className="h-48 animate-shimmer border border-border-accent rounded-xl" />
);

export default function ExitPanel() {
  const projects = useProjectStore(state => state.projects);
  const currentProject = useProjectStore(state => state.currentProject);
  const setDeal = useProjectStore(state => state.setDeal);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  const setDeals = useProjectStore(state => state.setDeals);
  const dealMetrics = useProjectStore(selectActiveProjectMetrics);

  // Exit strategy state
  const [strategy, setStrategy] = useState<'Sell' | 'Rent'>('Sell');

  // Local UI States
  const [mlsLink, setMlsLink] = useState('');
  const [imageCount, setImageCount] = useState(0);
  const [actualSale, setActualSale] = useState('');
  const [buyerComm, setBuyerComm] = useState('3.0');
  const [sellerComm, setSellerComm] = useState('3.0');
  const [closingCosts, setClosingCosts] = useState('0');

  // Rental hold states
  const [monthlyRent, setMonthlyRent] = useState('');
  const [vacancyRate, setVacancyRate] = useState('5');
  const [maintenanceReserves, setMaintenanceReserves] = useState('');
  const [mgmtFee, setMgmtFee] = useState('');
  const [mortgagePayment, setMortgagePayment] = useState('');

  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      const exitTarget = projects.find(d => d.status === 'Listed' || d.status === 'Sold') || projects[0];
      setDeal(exitTarget);
    }
  }, [projects, currentProject, setDeal]);

  useEffect(() => {
    if (currentProject) {
      const fin = currentProject.financials;
      setStrategy(fin?.exitStrategyType || 'Sell');
      setMlsLink(currentProject.exitAssets?.mlsListingLink || '');
      setImageCount(currentProject.exitAssets?.stagingImages?.length || 0);
      setActualSale((fin?.actualSalePrice || fin?.estimatedARV || 0).toString());
      setBuyerComm(fin?.buyersAgentCommission?.toString() || '3.0');
      setSellerComm(fin?.sellersAgentCommission?.toString() || '3.0');
      setClosingCosts((fin?.finalClosingCosts || 0).toString());
      setMonthlyRent((fin?.projectedMonthlyRent || 0).toString());
      setVacancyRate((fin?.vacancyRate || 5).toString());
      setMaintenanceReserves((fin?.maintenanceReserves || 0).toString());
      setMgmtFee((fin?.propertyManagementFee || 0).toString());
      setMortgagePayment((fin?.longTermMortgagePayment || 0).toString());
    }
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-primary text-text-primary opacity-30">
        <Target className="w-12 h-12 mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-xs">Awaiting_Exit_Entity</p>
      </div>
    );
  }

  const handleUpdateListing = () => {
    const updatedDeals = projects.map(d => {
      if (d.id === currentProject.id) {
         return {
           ...d, status: 'Listed' as any,
           exitAssets: { ...d.exitAssets, mlsListingLink: mlsLink, stagingImages: [] }
         };
      }
      return d;
    });
    setDeals(updatedDeals);
    if (!currentProject.financials?.listingDate) {
      updateProjectFinancials(currentProject.id, { listingDate: new Date() });
    }
    toast.success('DEBUT: Property synchronized with MLS.', { style: { background: 'black', color: 'white', border: '1px solid #333' } });
  };

  const handleExecuteSale = () => {
    updateProjectFinancials(currentProject.id, {
       actualSalePrice: Number(actualSale), buyersAgentCommission: Number(buyerComm),
       sellersAgentCommission: Number(sellerComm), finalClosingCosts: Number(closingCosts), soldDate: new Date()
    });
    const updatedDeals = projects.map(d => d.id === currentProject.id ? { ...d, status: 'Sold' as any } : d);
    setDeals(updatedDeals);
    toast.success('PROTOCOL_COMPLETE: Asset realized.', { icon: '💎', style: { background: '#10b981', color: 'white' } });
  };

  const handleSaveRentalData = () => {
    updateProjectFinancials(currentProject.id, {
      projectedMonthlyRent: Number(monthlyRent), vacancyRate: Number(vacancyRate),
      maintenanceReserves: Number(maintenanceReserves), propertyManagementFee: Number(mgmtFee),
      longTermMortgagePayment: Number(mortgagePayment),
    });
    toast.success('Rental cash flow data saved.', { style: { background: 'black', color: 'white', border: '1px solid #333' } });
  };

  // Rental NOI calculations
  const grossRent = Number(monthlyRent) * 12;
  const effectiveGross = grossRent * (1 - Number(vacancyRate) / 100);
  const annualExpenses = (Number(maintenanceReserves) + Number(mgmtFee)) * 12;
  const noi = effectiveGross - annualExpenses;
  const annualDebt = Number(mortgagePayment) * 12;
  const cashFlow = noi - annualDebt;

  return (
    <div className="bg-bg-primary text-text-primary selection:bg-pw-accent/30 min-h-full">
       
       {/* Tactical Header */}
       <div className="border-b-2 border-pw-black bg-bg-surface px-8 py-6 flex items-center justify-between sticky top-0 z-50">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-pw-black"></div>
                <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">The_Exit_Hub</h1>
             </div>
             <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em]">Final.Disposition.Protocol_v5.2</p>
          </div>
          <select 
              className="bg-pw-black text-pw-white text-[10px] font-black uppercase tracking-widest border border-pw-black px-6 py-3 focus:outline-none hover:bg-pw-accent transition-colors"
              value={currentProject.id}
              onChange={(e) => { const t = projects.find(d => d.id === e.target.value); if (t) setDeal(t); }}
          >
             {projects.map(d => (<option key={d.id} value={d.id}>{d.propertyName} [ {d.status} ]</option>))}
          </select>
       </div>

       <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">
          
          <PhaseExplainerVideo
            phaseKey="phase-4-exit"
            title="Phase 4: The Exit Strategy"
            description="Culmination of tracking marketing costs, final metrics, and generating documents for end-of-year taxes."
            src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
            duration="2:45"
          />

          {/* Strategy Fork */}
          <ExitStrategyFork projectId={currentProject.id} strategy={strategy} onStrategyChange={setStrategy} />

          {/* Hero Intelligence */}
          {strategy === 'Sell' && (
            <div className="shadow-2xl">
              <ProfitVarianceCard 
                projectedProfit={dealMetrics.netProfit}
                actualProfit={currentProject.status === 'Sold' ? Math.round(Number(actualSale) * 100) : dealMetrics.netProfit} 
              />
            </div>
          )}

          {/* ═══ SELL PATH ═══ */}
          {strategy === 'Sell' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
               
               {/* Left Column: Tactical Control */}
               <div className="lg:col-span-5 space-y-10">
                  
                  {/* Asset Packaging */}
                  <div className="bg-bg-surface border border-border-accent p-8 relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-accent">
                        <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase flex items-center">
                          <Camera className="w-3.5 h-3.5 mr-2" /> Asset_Packaging
                        </h3>
                        <span className="text-[10px] font-bold text-text-secondary">STAGING_v4</span>
                     </div>
                     <p className="text-[10px] font-bold text-text-secondary uppercase leading-relaxed mb-8 tracking-wider">
                       Integrate high-resolution staging assets and syndicate coordinates to global market endpoints.
                     </p>
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 border border-border-accent bg-bg-primary">
                            <label className="text-[9px] font-black text-text-secondary uppercase block mb-2 tracking-widest">Inventory_Count</label>
                            <input type="number" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="bg-transparent text-xl font-mono font-black w-full focus:outline-none ag-data" />
                          </div>
                          <div className="flex items-center p-4">
                             <span className="text-[10px] font-bold text-text-secondary uppercase leading-tight tracking-widest opacity-50">.RAW / .4K_MP4 Virtual_Space</span>
                          </div>
                        </div>
                        <div className="p-4 border border-border-accent bg-bg-primary">
                          <label className="text-[9px] font-black text-text-secondary uppercase block mb-2 tracking-widest">Syndication_Link [MLS]</label>
                          <div className="relative flex items-center">
                             <LinkIcon className="w-3.5 h-3.5 text-text-secondary mr-3" />
                             <input type="url" placeholder="EX: https://zillow.com/..." value={mlsLink} onChange={(e) => setMlsLink(e.target.value)} className="bg-transparent text-xs font-mono font-bold w-full focus:outline-none" />
                          </div>
                        </div>
                        <button onClick={handleUpdateListing} className="w-full bg-pw-black text-pw-white font-black text-[10px] py-4 uppercase tracking-[0.4em] hover:bg-pw-accent transition-all active:scale-95 border border-pw-black">
                           Sync_Market_Status
                        </button>
                     </div>
                  </div>

                  <Suspense fallback={<LazyFallback />}><StagingVendorManager /></Suspense>
                  <Suspense fallback={<LazyFallback />}><PhotographyUploadManager /></Suspense>

                  {/* Settlement Protocol */}
                  <div className="bg-bg-surface border-4 border-pw-black p-8 relative">
                     <div className="flex items-center gap-2 mb-8">
                        <DollarSign className="w-4 h-4 text-pw-accent" />
                        <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">Settlement_Protocol</h3>
                     </div>
                     <div className="space-y-6">
                        <div className="p-4 border border-border-accent bg-bg-surface">
                          <label className="text-[9px] font-black text-text-secondary uppercase block mb-2 tracking-widest">Gross_Settlement_Value [$]</label>
                          <input type="number" value={actualSale} onChange={(e) => setActualSale(e.target.value)} className="bg-transparent text-3xl font-black font-mono w-full focus:outline-none tracking-tighter" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="p-4 border border-border-accent bg-bg-surface">
                            <label className="text-[9px] font-black text-text-secondary uppercase block mb-1 tracking-widest leading-none">Buyer_Comm (%)</label>
                            <div className="flex items-center">
                              <input type="number" step="0.1" value={buyerComm} onChange={(e) => setBuyerComm(e.target.value)} className="bg-transparent text-lg font-mono font-black w-full focus:outline-none" />
                              <Percent className="w-3.5 h-3.5 text-text-secondary" />
                            </div>
                          </div>
                          <div className="p-4 border border-border-accent bg-bg-surface">
                            <label className="text-[9px] font-black text-text-secondary uppercase block mb-1 tracking-widest leading-none">Seller_Comm (%)</label>
                            <div className="flex items-center">
                              <input type="number" step="0.1" value={sellerComm} onChange={(e) => setSellerComm(e.target.value)} className="bg-transparent text-lg font-mono font-black w-full focus:outline-none" />
                              <Percent className="w-3.5 h-3.5 text-text-secondary" />
                            </div>
                          </div>
                        </div>
                        <div className="p-4 border border-border-accent bg-bg-surface">
                          <label className="text-[9px] font-black text-text-secondary uppercase block mb-2 tracking-widest">Final_Concessions + Costs [$]</label>
                          <input type="number" value={closingCosts} onChange={(e) => setClosingCosts(e.target.value)} className="bg-transparent text-lg font-mono font-black w-full focus:outline-none" />
                        </div>
                        <button onClick={handleExecuteSale} className="w-full bg-pw-black text-pw-white font-black text-xs py-5 uppercase tracking-[0.5em] hover:bg-pw-accent transition-all active:scale-95 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] hover:shadow-none border-2 border-pw-black">
                           Execute_Final_Sale
                        </button>
                     </div>
                  </div>
               </div>

               {/* Right Column: Financial Intelligence */}
               <div className="lg:col-span-7 space-y-10">
                  <NetEngine deal={currentProject} />

                  <Suspense fallback={<LazyFallback />}>
                    <SettlementLedger projectId={currentProject.id} salePrice={Number(actualSale) || 0} />
                  </Suspense>

                  <Suspense fallback={<LazyFallback />}>
                    <EscrowReconciliation projectId={currentProject.id} />
                  </Suspense>

                  <NetProceedsCard deal={currentProject} />

                  <Suspense fallback={<LazyFallback />}>
                    <TaxReportGenerator deal={currentProject} />
                  </Suspense>

                  <Suspense fallback={<LazyFallback />}>
                    <CrowdfundingReconciliation deal={currentProject} />
                  </Suspense>

                  {/* Market Status */}
                  <div className="border border-pw-black bg-bg-surface overflow-hidden relative">
                     <div className="flex h-56 w-full items-center justify-center bg-bg-primary relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000"></div>
                        <div className="absolute inset-0 bg-pw-black/20"></div>
                        <div className="relative z-10 flex flex-col items-center">
                           <div className="bg-pw-black px-8 py-4 border border-pw-white/10 flex items-center space-x-4 mb-4 shadow-2xl">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${currentProject.status === 'Sold' ? 'bg-pw-accent' : 'bg-green-400'}`} />
                              <span className="font-black text-pw-white tracking-[0.4em] uppercase text-xs">Entity_Status: {currentProject.status}</span>
                           </div>
                           {currentProject.exitAssets?.mlsListingLink && (
                             <a href={currentProject.exitAssets.mlsListingLink} target="_blank" rel="noopener noreferrer" className="bg-bg-surface border border-pw-black px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-pw-black hover:text-pw-white transition-all flex items-center">
                               Audit_MLS_Listing <ExternalLink className="w-3 h-3 ml-2" />
                             </a>
                           )}
                           {(currentProject.status !== 'Listed' && currentProject.status !== 'Sold') && (
                              <p className="text-[10px] font-black text-text-primary uppercase tracking-widest opacity-60">Awaiting_Market_Injection</p>
                           )}
                        </div>
                     </div>
                  </div>

                  <Suspense fallback={<div className="h-96 animate-shimmer rounded-xl" />}>
                     <div className="border border-border-accent p-1"><DealAutopsy deal={currentProject} /></div>
                  </Suspense>
               </div>
            </div>
          )}

          {/* ═══ RENT / HOLD PATH ═══ */}
          {strategy === 'Rent' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               {/* Rental Cash Flow Inputs */}
               <div className="bg-bg-surface border-2 border-pw-black p-8 space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-border-accent">
                     <Home className="w-4 h-4 text-pw-accent" />
                     <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">Rental_Cash_Flow_Inputs</h3>
                  </div>
                  {[
                    { label: 'Monthly_Rent [$]', value: monthlyRent, set: setMonthlyRent },
                    { label: 'Vacancy_Rate [%]', value: vacancyRate, set: setVacancyRate, step: '0.5' },
                    { label: 'Maintenance_Reserves [$/mo]', value: maintenanceReserves, set: setMaintenanceReserves },
                    { label: 'Management_Fee [$/mo]', value: mgmtFee, set: setMgmtFee },
                    { label: 'Mortgage_Payment [$/mo]', value: mortgagePayment, set: setMortgagePayment },
                  ].map(f => (
                    <div key={f.label} className="p-4 border border-border-accent bg-bg-primary">
                      <label className="text-[9px] font-black text-text-secondary uppercase block mb-2 tracking-widest">{f.label}</label>
                      <input type="number" step={f.step || '1'} value={f.value} onChange={e => f.set(e.target.value)} className="bg-transparent text-lg font-mono font-black w-full focus:outline-none" />
                    </div>
                  ))}
                  <button onClick={handleSaveRentalData} className="w-full bg-pw-black text-pw-white font-black text-[10px] py-4 uppercase tracking-[0.4em] hover:bg-pw-accent transition-all active:scale-95 border border-pw-black">
                     Save_Rental_Data
                  </button>
               </div>

               {/* Rental NOI Dashboard */}
               <div className="space-y-6">
                  <div className="bg-bg-surface border-2 border-pw-black overflow-hidden">
                     <div className="px-6 py-4 bg-pw-black text-pw-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <h3 className="text-xs font-black tracking-[0.3em] uppercase">NOI_Dashboard</h3>
                     </div>
                     <div className="grid grid-cols-2 gap-px bg-pw-border">
                        {[
                          { label: 'Gross_Annual_Rent', value: grossRent },
                          { label: 'Effective_Gross', value: effectiveGross },
                          { label: 'Annual_Expenses', value: annualExpenses, negative: true },
                          { label: 'Net_Operating_Income', value: noi, highlight: true },
                          { label: 'Annual_Debt_Service', value: annualDebt, negative: true },
                          { label: 'Annual_Cash_Flow', value: cashFlow, highlight: true },
                        ].map(m => (
                          <div key={m.label} className="bg-bg-surface px-5 py-4">
                            <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">{m.label}</p>
                            <p className={`text-xl font-black font-mono tracking-tighter ${
                              m.highlight ? (m.value >= 0 ? 'text-green-700' : 'text-red-700') : m.negative ? 'text-red-600' : 'text-text-primary'
                            }`}>
                              {m.negative && m.value > 0 ? '−' : ''}${Math.abs(m.value).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </p>
                          </div>
                        ))}
                     </div>
                     {/* Cash-on-Cash */}
                     <div className="px-6 py-4 border-t-2 border-pw-black bg-bg-primary">
                        <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Cash_on_Cash_Return</p>
                        <p className="text-3xl font-black font-mono tracking-tighter text-text-primary">
                          {currentProject.financials?.purchasePrice ? ((cashFlow / currentProject.financials.purchasePrice) * 100).toFixed(2) : '0.00'}%
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          )}

       </div>
    </div>
  );
}
