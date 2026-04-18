'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useProjectStore, selectActiveProjectMetrics } from '@/store/projectStore';
import { Camera, Link as LinkIcon, DollarSign, Percent, ExternalLink, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import NetEngine from '@/components/exit/NetEngine';
import ProfitVarianceCard from '@/components/dashboard/ProfitVarianceCard';

const StagingVendorManager = lazy(() => import('@/components/exit/StagingVendorManager'));
const PhotographyUploadManager = lazy(() => import('@/components/exit/PhotographyUploadManager'));
const DealAutopsy = lazy(() => import('@/components/exit/DealAutopsy'));

/* ═══════════════════════════════════════════════════════
   Exit Panel — Lane 4 (The Exit Hub)
   
   Final disposition protocol. High-fidelity Dark mode 
   optimized for financial realization and asset staging.
   ═══════════════════════════════════════════════════════ */

export default function ExitPanel() {
  const projects = useProjectStore(state => state.projects);
  const currentProject = useProjectStore(state => state.currentProject);
  const setDeal = useProjectStore(state => state.setDeal);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  const setDeals = useProjectStore(state => state.setDeals);
  const dealMetrics = useProjectStore(selectActiveProjectMetrics);

  // Local UI States (Stored in DOLLARS for human editing)
  const [mlsLink, setMlsLink] = useState('');
  const [imageCount, setImageCount] = useState(0);
  const [actualSale, setActualSale] = useState('');
  const [buyerComm, setBuyerComm] = useState('3.0');
  const [sellerComm, setSellerComm] = useState('3.0');
  const [closingCosts, setClosingCosts] = useState('0');

  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      const exitTarget = projects.find(d => d.status === 'Listed' || d.status === 'Sold') || projects[0];
      setDeal(exitTarget);
    }
  }, [projects, currentProject, setDeal]);

  useEffect(() => {
    if (currentProject) {
      setMlsLink(currentProject.exitAssets?.mlsListingLink || '');
      setImageCount(currentProject.exitAssets?.stagingImages?.length || 0);
      
      // Convert CENTS from store to DOLLARS for UI
      setActualSale(((currentProject.financials?.actualSalePrice || currentProject.financials?.estimatedARV || 0) / 100).toString());
      setBuyerComm(currentProject.financials?.buyersAgentCommission?.toString() || '3.0');
      setSellerComm(currentProject.financials?.sellersAgentCommission?.toString() || '3.0');
      setClosingCosts(((currentProject.financials?.finalClosingCosts || 0) / 100).toString());
    }
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-pw-bg text-pw-black opacity-30">
        <Target className="w-12 h-12 mb-4" />
        <p className="font-black uppercase tracking-[0.3em] text-xs">Awaiting_Exit_Entity</p>
      </div>
    );
  }

  const handleUpdateListing = () => {
    const updatedDeals = projects.map(d => {
      if (d.id === currentProject.id) {
         return {
           ...d,
           status: 'Listed' as any,
           exitAssets: {
             ...d.exitAssets,
             mlsListingLink: mlsLink,
             stagingImages: Array(imageCount).fill('https://mock-image-server.dev/staging.jpg'),
           }
         };
      }
      return d;
    });
    setDeals(updatedDeals);
    toast.success('DEBUT: Property synchronized with MLS.', { 
       style: { background: 'black', color: 'white', border: '1px solid #333' }
    });
  };

  const handleExecuteSale = () => {
    // Convert DOLLARS back to CENTS for Store
    updateProjectFinancials(currentProject.id, {
       actualSalePrice: Math.round(Number(actualSale) * 100),
       buyersAgentCommission: Number(buyerComm),
       sellersAgentCommission: Number(sellerComm),
       finalClosingCosts: Math.round(Number(closingCosts) * 100),
       soldDate: new Date()
    });
    
    const updatedDeals = projects.map(d => {
       if (d.id === currentProject.id) {
          return { ...d, status: 'Sold' as any };
       }
       return d;
    });
    setDeals(updatedDeals);
    toast.success('PROTOCOL_COMPLETE: Asset realized.', { 
       icon: '💎',
       style: { background: '#10b981', color: 'white' }
    });
  };

  return (
    <div className="bg-pw-bg text-pw-black selection:bg-pw-accent/30 min-h-full">
       
       {/* High-Fidelity Tactical Header */}
       <div className="border-b-2 border-pw-black bg-pw-white px-8 py-6 flex items-center justify-between sticky top-0 z-50">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-pw-black"></div>
                <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">The_Exit_Hub</h1>
             </div>
             <p className="text-[10px] font-black text-pw-muted uppercase tracking-[0.4em]">Final.Disposition.Protocol_v5.2</p>
          </div>
          
          <select 
              className="bg-pw-black text-pw-white text-[10px] font-black uppercase tracking-widest border border-pw-black px-6 py-3 focus:outline-none hover:bg-pw-accent transition-colors"
              value={currentProject.id}
              onChange={(e) => {
                 const t = projects.find(d => d.id === e.target.value);
                 if (t) setDeal(t);
              }}
          >
             {projects.map(d => (
               <option key={d.id} value={d.id}>{d.propertyName} [ {d.status} ]</option>
             ))}
          </select>
       </div>

       <div className="max-w-7xl mx-auto px-8 py-12">

          {/* ─── Hero Intelligence: Profit Variance ─── */}
          <div className="mb-12 shadow-2xl">
            <ProfitVarianceCard 
              projectedProfit={dealMetrics.netProfit} // Current derived profit is projected until status=Sold
              actualProfit={currentProject.status === 'Sold' ? Math.round(Number(actualSale) * 100) : dealMetrics.netProfit} 
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
             
             {/* Left Column: Tactical Control */}
             <div className="lg:col-span-5 space-y-10">
                
                {/* Visual Packaging Block */}
                <div className="bg-pw-white border border-pw-border p-8 relative overflow-hidden group">
                   <div className="flex items-center justify-between mb-8 pb-4 border-b border-pw-border">
                      <h3 className="text-xs font-black tracking-[0.3em] text-pw-black uppercase flex items-center">
                        <Camera className="w-3.5 h-3.5 mr-2" /> Asset_Packaging
                      </h3>
                      <span className="text-[10px] font-bold text-pw-muted">STAGING_v4</span>
                   </div>
                   
                   <p className="text-[10px] font-bold text-pw-muted uppercase leading-relaxed mb-8 tracking-wider">
                     Integrate high-resolution staging assets and syndicate coordinates to global market endpoints.
                   </p>

                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border border-pw-border bg-pw-bg">
                          <label className="text-[9px] font-black text-pw-muted uppercase block mb-2 tracking-widest">Inventory_Count</label>
                          <input type="number" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="bg-transparent text-xl font-mono font-black w-full focus:outline-none ag-data" />
                        </div>
                        <div className="flex items-center p-4">
                           <span className="text-[10px] font-bold text-pw-muted uppercase leading-tight tracking-widest opacity-50">.RAW / .4K_MP4 Virtual_Space</span>
                        </div>
                      </div>

                      <div className="p-4 border border-pw-border bg-pw-bg">
                        <label className="text-[9px] font-black text-pw-muted uppercase block mb-2 tracking-widest">Syndication_Link [MLS]</label>
                        <div className="relative flex items-center">
                           <LinkIcon className="w-3.5 h-3.5 text-pw-muted mr-3" />
                           <input type="url" placeholder="EX: https://zillow.com/..." value={mlsLink} onChange={(e) => setMlsLink(e.target.value)} className="bg-transparent text-xs font-mono font-bold w-full focus:outline-none" />
                        </div>
                      </div>
                      
                      <button onClick={handleUpdateListing} className="w-full bg-pw-black text-pw-white font-black text-[10px] py-4 uppercase tracking-[0.4em] hover:bg-pw-accent transition-all active:scale-95 border border-pw-black">
                         Sync_Market_Status
                      </button>
                   </div>
                </div>

                 <Suspense fallback={<div className="h-48 bg-pw-surface animate-pulse border border-pw-border" />}>
                   <StagingVendorManager />
                 </Suspense>

                 <Suspense fallback={<div className="h-48 bg-pw-surface animate-pulse border border-pw-border" />}>
                   <PhotographyUploadManager />
                 </Suspense>

                 {/* Execution Protocol */}
                <div className="bg-pw-surface border-4 border-pw-black p-8 relative">
                   <div className="flex items-center gap-2 mb-8">
                      <DollarSign className="w-4 h-4 text-pw-accent" />
                      <h3 className="text-xs font-black tracking-[0.3em] text-pw-black uppercase">Settlement_Protocol</h3>
                   </div>
                   
                   <div className="space-y-6">
                      <div className="p-4 border border-pw-border bg-pw-white">
                        <label className="text-[9px] font-black text-pw-muted uppercase block mb-2 tracking-widest">Gross_Settlement_Value [$]</label>
                        <input type="number" value={actualSale} onChange={(e) => setActualSale(e.target.value)} className="bg-transparent text-3xl font-black font-mono w-full focus:outline-none tracking-tighter" />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 border border-pw-border bg-pw-white">
                          <label className="text-[9px] font-black text-pw-muted uppercase block mb-1 tracking-widest leading-none">Buyer_Comm (%)</label>
                          <div className="flex items-center">
                            <input type="number" step="0.1" value={buyerComm} onChange={(e) => setBuyerComm(e.target.value)} className="bg-transparent text-lg font-mono font-black w-full focus:outline-none" />
                            <Percent className="w-3.5 h-3.5 text-pw-muted" />
                          </div>
                        </div>
                        <div className="p-4 border border-pw-border bg-pw-white">
                          <label className="text-[9px] font-black text-pw-muted uppercase block mb-1 tracking-widest leading-none">Seller_Comm (%)</label>
                          <div className="flex items-center">
                            <input type="number" step="0.1" value={sellerComm} onChange={(e) => setSellerComm(e.target.value)} className="bg-transparent text-lg font-mono font-black w-full focus:outline-none" />
                            <Percent className="w-3.5 h-3.5 text-pw-muted" />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border border-pw-border bg-pw-white">
                        <label className="text-[9px] font-black text-pw-muted uppercase block mb-2 tracking-widest">Final_Concessions + Costs [$]</label>
                        <input type="number" value={closingCosts} onChange={(e) => setClosingCosts(e.target.value)} className="bg-transparent text-lg font-mono font-black w-full focus:outline-none" />
                      </div>

                      <button onClick={handleExecuteSale} className="w-full bg-pw-black text-pw-white font-black text-xs py-5 uppercase tracking-[0.5em] hover:bg-pw-accent transition-all active:scale-95 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] hover:shadow-none border-2 border-pw-black">
                         Execute_Final_Sale
                      </button>
                   </div>
                </div>

             </div>

             {/* Right Column: Mathematical Realization */}
             <div className="lg:col-span-7 space-y-10">
                <NetEngine deal={currentProject} />
                
                {/* Market Status Visualization */}
                <div className="border border-pw-black bg-pw-white overflow-hidden relative">
                   <div className="flex h-56 w-full items-center justify-center bg-pw-bg relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000"></div>
                      <div className="absolute inset-0 bg-pw-black/20"></div>
                      
                      <div className="relative z-10 flex flex-col items-center">
                         <div className="bg-pw-black px-8 py-4 border border-pw-white/10 flex items-center space-x-4 mb-4 shadow-2xl">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${currentProject.status === 'Sold' ? 'bg-pw-accent' : 'bg-green-400'}`} />
                            <span className="font-black text-pw-white tracking-[0.4em] uppercase text-xs">Entity_Status: {currentProject.status}</span>
                         </div>
                         
                         {currentProject.exitAssets?.mlsListingLink && (
                           <a href={currentProject.exitAssets.mlsListingLink} target="_blank" rel="noopener noreferrer" className="bg-pw-white border border-pw-black px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-pw-black hover:text-pw-white transition-all flex items-center">
                             Audit_MLS_Listing <ExternalLink className="w-3 h-3 ml-2" />
                           </a>
                         )}
                         
                         {(currentProject.status !== 'Listed' && currentProject.status !== 'Sold') && (
                            <div className="text-center">
                               <p className="text-[10px] font-black text-pw-black uppercase tracking-widest opacity-60">Awaiting_Market_Injection</p>
                            </div>
                         )}
                      </div>
                   </div>
                </div>

                {/* Final Post-Mortem Analytics */}
                <Suspense fallback={<div className="h-96 bg-pw-surface animate-pulse" />}>
                   <div className="border border-pw-border p-1">
                      <DealAutopsy deal={currentProject} />
                   </div>
                </Suspense>
             </div>

          </div>

       </div>
    </div>
  );
}
