'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useDealStore, selectActiveDealMetrics } from '@/store/dealStore';
import { Camera, Link as LinkIcon, DollarSign, Percent, CheckCircle, ExternalLink, BadgePercent } from 'lucide-react';
import toast from 'react-hot-toast';
import NetEngine from '@/components/exit/NetEngine';

const StagingVendorManager = lazy(() => import('@/components/exit/StagingVendorManager'));
const PhotographyUploadManager = lazy(() => import('@/components/exit/PhotographyUploadManager'));
const DealAutopsy = lazy(() => import('@/components/exit/DealAutopsy'));

/* ═══════════════════════════════════════════════════════
   Exit Panel — Lane 4 (The Exit Hub)

   Dark-themed panel for final sale execution.
   Extracted from /dashboard/exit-hub/page.tsx.
   Removed its own <header> since the layout header handles nav.
   ═══════════════════════════════════════════════════════ */

export default function ExitPanel() {
  const deals = useDealStore(state => state.deals);
  const currentDeal = useDealStore(state => state.currentDeal);
  const setDeal = useDealStore(state => state.setDeal);
  const updateDealFinancials = useDealStore(state => state.updateDealFinancials);
  const setDeals = useDealStore(state => state.setDeals);
  const dealMetrics = useDealStore(selectActiveDealMetrics);

  // States for Real Estate Agent actions
  const [mlsLink, setMlsLink] = useState('');
  const [imageCount, setImageCount] = useState(0);

  // States for final financial hooks
  const [actualSale, setActualSale] = useState('');
  const [buyerComm, setBuyerComm] = useState('3.0');
  const [sellerComm, setSellerComm] = useState('3.0');
  const [closingCosts, setClosingCosts] = useState('0');

  useEffect(() => {
    // Attempt default to a Listed/Sold deal
    if (deals.length > 0 && !currentDeal) {
      const exitTarget = deals.find(d => d.status === 'Listed' || d.status === 'Sold') || deals[0];
      setDeal(exitTarget);
    }
  }, [deals, currentDeal, setDeal]);

  // Load existing data if present
  useEffect(() => {
    if (currentDeal) {
      setMlsLink(currentDeal.exitAssets?.mlsListingLink || '');
      setImageCount(currentDeal.exitAssets?.stagingImages?.length || 0);
      setActualSale(currentDeal.financials?.actualSalePrice?.toString() || currentDeal.financials?.estimatedARV?.toString() || '');
      setBuyerComm(currentDeal.financials?.buyersAgentCommission?.toString() || '3.0');
      setSellerComm(currentDeal.financials?.sellersAgentCommission?.toString() || '3.0');
      setClosingCosts(currentDeal.financials?.finalClosingCosts?.toString() || '0');
    }
  }, [currentDeal]);

  if (!currentDeal) {
    return <div className="p-8 text-center text-gray-500 bg-pw-black h-full flex items-center justify-center">No properties available for The Exit Phase.</div>;
  }

  const handleUpdateListing = () => {
    const updatedDeals = deals.map(d => {
      if (d.id === currentDeal.id) {
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
    toast.success('Property pushed to ACTIVE LISTING status!', { icon: '🏡', style: { background: '#333', color: '#fff' }});
  };

  const handleExecuteSale = () => {
    updateDealFinancials(currentDeal.id, {
       actualSalePrice: Number(actualSale),
       buyersAgentCommission: Number(buyerComm),
       sellersAgentCommission: Number(sellerComm),
       finalClosingCosts: Number(closingCosts),
       soldDate: new Date()
    });
    
    // Globally move status to Sold
    const updatedDeals = deals.map(d => {
       if (d.id === currentDeal.id) {
          return { ...d, status: 'Sold' as any };
       }
       return d;
    });
    setDeals(updatedDeals);
    toast.success('SALE EXECUTED! The Net Engine has recorded the transaction.', { icon: '💰', style: { background: '#10b981', color: '#fff' }});
  };

  return (
    <div className="bg-pw-black text-white selection:bg-emerald-500/30 font-sans h-full">
       
       {/* Compact dark sub-header (inside the panel, not the layout header) */}
       <div className="border-b border-gray-800 bg-black/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div>
             <h1 className="text-2xl font-light tracking-wide text-gray-200">The Exit Hub</h1>
             <p className="text-xs text-gray-500 mt-0.5">Final disposition & capital realization engine</p>
          </div>
          
          <select 
              className="bg-transparent text-sm border border-gray-700 rounded-full px-4 py-1.5 focus:outline-none focus:border-emerald-500 font-medium text-gray-300"
              value={currentDeal.id}
              onChange={(e) => {
                 const t = deals.find(d => d.id === e.target.value);
                 if (t) setDeal(t);
              }}
          >
             {deals.map(d => (
               <option key={d.id} value={d.id} className="bg-gray-900">{d.propertyName} • {d.status}</option>
             ))}
          </select>
       </div>

       <div className="max-w-6xl mx-auto px-6 py-10">

          {/* ─── Cross-Panel Financial Summary ─── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {[
              { label: 'Purchase Price', value: dealMetrics.purchasePrice },
              { label: 'Renovation', value: dealMetrics.renovationCosts },
              { label: 'Holding Costs', value: dealMetrics.holdingCosts },
              { label: 'Closing (Buy/Sell)', value: dealMetrics.closingCostsBuy + dealMetrics.closingCostsSell },
              { label: 'Net Profit', value: dealMetrics.netProfit, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`p-3 rounded-lg border ${highlight ? 'border-emerald-700 bg-emerald-900/30' : 'border-gray-800 bg-black/40'}`}>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-light font-mono ${highlight ? (value >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
                  {value >= 0 ? '' : '-'}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
             
             {/* Left Column: Real Estate Agent Controls */}
             <div className="lg:col-span-5 space-y-8">
                
                {/* Visual Identity Block */}
                <div className="bg-pw-black border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full blur-2xl"></div>
                   <h3 className="text-xs font-mono tracking-widest text-emerald-500 uppercase mb-4 flex items-center"><Camera className="w-3 h-3 mr-2" /> Staging & Inventory</h3>
                   
                   <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                     Real Estate Agents log in here. Upload your ultra-high-resolution staging photography to dynamically inject collateral into the public MLS and external landing pages.
                   </p>

                   <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Photography Assets Uploaded</label>
                        <div className="flex items-center space-x-3">
                           <input type="number" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="bg-black border border-gray-700 rounded-lg p-2 w-20 text-center focus:border-emerald-500 focus:outline-none" />
                           <span className="text-sm text-gray-500">.JPG / .PNG / .MP4 Virtual Tours</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Live MLS Link</label>
                        <div className="relative">
                           <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                           <input type="url" placeholder="https://zillow.com/homedetails/..." value={mlsLink} onChange={(e) => setMlsLink(e.target.value)} className="bg-black border border-gray-700 rounded-lg py-2 pl-9 pr-3 w-full text-sm focus:border-emerald-500 focus:outline-none" />
                        </div>
                      </div>
                      
                      <button onClick={handleUpdateListing} className="w-full mt-4 bg-white text-black font-semibold text-sm py-2.5 rounded-lg hover:bg-gray-200 transition active:scale-95 flex justify-center items-center">
                         <span>Go Live (Market Status)</span>
                      </button>
                   </div>
                </div>

                 {/* Staging Vendor Manager */}
                 <Suspense fallback={<div className="h-48 bg-pw-black rounded-2xl animate-pulse" />}>
                   <StagingVendorManager />
                 </Suspense>

                 {/* Professional Photography Uploads */}
                 <Suspense fallback={<div className="h-48 bg-pw-black rounded-2xl animate-pulse" />}>
                   <PhotographyUploadManager />
                 </Suspense>

                 {/* Closing Fee Trigger Setup */}
                <div className="bg-pw-black border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
                   <h3 className="text-xs font-mono tracking-widest text-emerald-500 uppercase mb-4 flex items-center"><DollarSign className="w-3 h-3 mr-2" /> Final Capital Mechanics</h3>
                   
                   <div className="space-y-5">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Gross Sale Trigger ($)</label>
                        <input type="number" value={actualSale} onChange={(e) => setActualSale(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-3 w-full text-lg font-light tracking-wide focus:border-emerald-500 focus:outline-none" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Buyer&apos;s Agent Comm.</label>
                          <div className="relative">
                            <input type="number" step="0.1" value={buyerComm} onChange={(e) => setBuyerComm(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-2 w-full text-sm pr-8 focus:border-emerald-500 focus:outline-none" />
                            <Percent className="absolute right-3 top-2.5 w-3 h-3 text-gray-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Seller&apos;s Agent Comm.</label>
                          <div className="relative">
                            <input type="number" step="0.1" value={sellerComm} onChange={(e) => setSellerComm(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-2 w-full text-sm pr-8 focus:border-emerald-500 focus:outline-none" />
                            <Percent className="absolute right-3 top-2.5 w-3 h-3 text-gray-500" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Final Closing & Concessions ($)</label>
                        <input type="number" value={closingCosts} onChange={(e) => setClosingCosts(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-2 w-full text-sm focus:border-emerald-500 focus:outline-none" />
                      </div>

                      <div className="pt-2">
                        <button onClick={handleExecuteSale} className="w-full bg-emerald-600 text-white font-bold text-sm py-3 rounded-lg hover:bg-emerald-500 transition active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                           Execute Final Sale
                        </button>
                      </div>
                   </div>
                </div>

             </div>

             {/* Right Column: The Net Engine Output */}
             <div className="lg:col-span-7">
                <NetEngine deal={currentDeal} />
                
                {/* MLS / Listing Live Preview Pane */}
                {currentDeal.status === 'Listed' || currentDeal.status === 'Sold' ? (
                   <div className="mt-6 border border-gray-800  bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center h-48 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition duration-500 flex flex-col items-center justify-center">
                         <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center space-x-3 mb-2">
                            <CheckCircle className={`w-4 h-4 ${currentDeal.status === 'Sold' ? 'text-red-500' : 'text-emerald-500'}`} />
                            <span className="font-semibold text-white tracking-widest uppercase text-sm">Property is {currentDeal.status}</span>
                         </div>
                         {currentDeal.exitAssets?.mlsListingLink && (
                           <a href={currentDeal.exitAssets.mlsListingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center transition">
                             View Staging MLS <ExternalLink className="w-3 h-3 ml-1" />
                           </a>
                         )}
                      </div>
                   </div>
                ) : (
                   <div className="mt-6 border border-gray-800 border-dashed  h-48 flex items-center justify-center flex-col text-gray-600 bg-black/20">
                      <BadgePercent className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">Awaiting Listing Deployment</p>
                      <p className="text-xs mt-1">Upload Staging Images & MLS Link to syndicate.</p>
                   </div>
                )}

                {/* Project Autopsy — Individual Deal Health */}
                <Suspense fallback={<div className="mt-6 h-64 bg-pw-black rounded-2xl animate-pulse" />}>
                  <div className="mt-6">
                    <DealAutopsy deal={currentDeal} />
                  </div>
                </Suspense>
             </div>

          </div>

       </div>
    </div>
  );
}
