import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Camera, Link as LinkIcon, DollarSign, Percent, CheckCircle, ExternalLink, BadgePercent, X } from 'lucide-react';
import toast from 'react-hot-toast';
import NetEngine from '@/components/exit/NetEngine';
import PhaseBadge from '../ui/PhaseBadge';

interface ExitStrategyBoardProps {
  projectId: string;
  onClose: () => void;
}

export default function ExitStrategyBoard({ projectId, onClose }: ExitStrategyBoardProps) {
  const projects = useProjectStore(state => state.projects);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  const setDeals = useProjectStore(state => state.setDeals);

  const currentProject = projects.find(d => d.id === projectId);

  // States for Real Estate Agent actions
  const [mlsLink, setMlsLink] = useState('');
  const [imageCount, setImageCount] = useState(0);

  // States for final financial hooks
  const [actualSale, setActualSale] = useState('');
  const [buyerComm, setBuyerComm] = useState('3.0');
  const [sellerComm, setSellerComm] = useState('3.0');
  const [closingCosts, setClosingCosts] = useState('0');
  const [isBrrrr, setIsBrrrr] = useState(false);

  // Load existing data if present
  useEffect(() => {
    if (currentProject) {
      setMlsLink(currentProject.exitAssets?.mlsListingLink || '');
      setImageCount(currentProject.exitAssets?.stagingImages?.length || 0);
      setActualSale(currentProject.financials?.actualSalePrice?.toString() || currentProject.financials?.estimatedARV?.toString() || '');
      setBuyerComm(currentProject.financials?.buyersAgentCommission?.toString() || '3.0');
      setSellerComm(currentProject.financials?.sellersAgentCommission?.toString() || '3.0');
      setClosingCosts(currentProject.financials?.finalClosingCosts?.toString() || '0');
    }
  }, [currentProject]);

  if (!currentProject) return null;

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
    toast.success('Property pushed to ACTIVE LISTING status!', { icon: '🏡', style: { background: '#333', color: '#fff' }});
  };

  const handleExecuteSale = () => {
    updateProjectFinancials(currentProject.id, {
       actualSalePrice: Number(actualSale),
       buyersAgentCommission: Number(buyerComm),
       sellersAgentCommission: Number(sellerComm),
       finalClosingCosts: Number(closingCosts),
       soldDate: new Date()
    });
    
    // Globally move status to Sold (or 'Refinanced' logically, mapped to Sold locally)
    const updatedDeals = projects.map(d => {
       if (d.id === currentProject.id) {
          return { ...d, status: 'Sold' as any };
       }
       return d;
    });
    setDeals(updatedDeals);
    toast.success(isBrrrr ? 'REFINANCE EXECUTED! Assets moved to holding portfolio.' : 'SALE EXECUTED! The Net Engine has recorded the transaction.', { icon: '💰', style: { background: '#10b981', color: '#fff' }});
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 selection:bg-emerald-500/30 font-sans">
      <div className="bg-pw-black text-white w-full max-w-6xl h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-gray-800">
        
        {/* Header */}
        <div className="border-b border-gray-800 bg-black/80 p-5 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-light tracking-wide text-gray-200 flex items-center">
              The Exit Strategy Board <PhaseBadge status={currentProject.status} className="ml-3" />
            </h2>
            <p className="text-xs text-text-secondary mt-1">{currentProject.propertyName} • {currentProject.address}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-surface/10 rounded-full transition text-text-secondary">
             <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Real Estate Agent Controls */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Visual Identity Block */}
              <div className="bg-pw-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full blur-2xl"></div>
                 <h3 className="text-xs font-mono tracking-widest text-emerald-500 uppercase mb-4 flex items-center"><Camera className="w-3 h-3 mr-2" /> Staging & Inventory</h3>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="text-xs text-text-secondary block mb-1">Photography Assets Uploaded</label>
                      <div className="flex items-center space-x-3">
                         <input type="number" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="bg-black border border-gray-700 rounded-lg p-2 w-20 text-center focus:border-emerald-500 focus:outline-none" />
                         <span className="text-sm text-text-secondary">.JPG / .PNG / .MP4</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-text-secondary block mb-1">Live MLS Link</label>
                      <div className="relative">
                         <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
                         <input type="url" placeholder="https://zillow.com/homedetails/..." value={mlsLink} onChange={(e) => setMlsLink(e.target.value)} className="bg-black border border-gray-700 rounded-lg py-2 pl-9 pr-3 w-full text-sm focus:border-emerald-500 focus:outline-none" />
                      </div>
                    </div>
                    
                    <button onClick={handleUpdateListing} className="w-full mt-4 bg-bg-surface text-text-primary font-semibold text-sm py-2.5 rounded-lg hover:bg-gray-200 transition active:scale-95 flex justify-center items-center">
                       <span>Push Updates to MLS</span>
                    </button>
                 </div>
              </div>

              {/* Closing Fee Trigger Setup */}
              <div className="bg-pw-black border border-gray-800 rounded-2xl p-6 relative">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xs font-mono tracking-widest text-emerald-500 uppercase flex items-center"><DollarSign className="w-3 h-3 mr-2" /> Final Capital Mechanics</h3>
                   <label className="flex items-center space-x-2 cursor-pointer">
                     <span className="text-xs text-text-secondary font-medium">BRRRR Mode</span>
                     <div className="relative">
                       <input type="checkbox" className="sr-only" checked={isBrrrr} onChange={() => setIsBrrrr(!isBrrrr)} />
                       <div className={`block w-10 h-6 rounded-full transition-colors ${isBrrrr ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                       <div className={`dot absolute left-1 top-1 bg-bg-surface w-4 h-4 rounded-full transition-transform ${isBrrrr ? 'translate-x-4' : ''}`}></div>
                     </div>
                   </label>
                 </div>
                 
                 <div className="space-y-5">
                    <div>
                      <label className="text-xs text-text-secondary block mb-1">{isBrrrr ? 'Refinance Appraisal Value ($)' : 'Gross Sale Trigger ($)'}</label>
                      <input type="number" value={actualSale} onChange={(e) => setActualSale(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-3 w-full text-lg font-light tracking-wide focus:border-emerald-500 focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase tracking-wider text-text-secondary block mb-1">Buyer Comm.</label>
                        <div className="relative">
                          <input type="number" step="0.1" value={buyerComm} onChange={(e) => setBuyerComm(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-2 w-full text-sm pr-8 focus:border-emerald-500 focus:outline-none" />
                          <Percent className="absolute right-3 top-2.5 w-3 h-3 text-text-secondary" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-text-secondary block mb-1">Seller Comm.</label>
                        <div className="relative">
                          <input type="number" step="0.1" value={sellerComm} onChange={(e) => setSellerComm(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-2 w-full text-sm pr-8 focus:border-emerald-500 focus:outline-none" />
                          <Percent className="absolute right-3 top-2.5 w-3 h-3 text-text-secondary" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-text-secondary block mb-1">Final Closing & Concessions ($)</label>
                      <input type="number" value={closingCosts} onChange={(e) => setClosingCosts(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-2 w-full text-sm focus:border-emerald-500 focus:outline-none" />
                    </div>

                    <div className="pt-2">
                      <button onClick={handleExecuteSale} className="w-full bg-emerald-600 text-white font-bold text-sm py-3 rounded-lg hover:bg-emerald-500 transition active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                         {isBrrrr ? 'Execute Refinance' : 'Execute Final Sale'}
                      </button>
                    </div>
                 </div>
              </div>

            </div>

            {/* Right Column: The Net Engine Output */}
            <div className="lg:col-span-7">
               <NetEngine deal={currentProject} isBrrrr={isBrrrr} />
               
               {/* MLS / Listing Live Preview Pane */}
               {currentProject.status === 'Listed' || currentProject.status === 'Sold' ? (
                  <div className="mt-6 border border-gray-800  bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center h-48 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition duration-500 flex flex-col items-center justify-center">
                        <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center space-x-3 mb-2">
                           <CheckCircle className={`w-4 h-4 ${currentProject.status === 'Sold' ? 'text-red-500' : 'text-emerald-500'}`} />
                           <span className="font-semibold text-white tracking-widest uppercase text-sm">Property is {currentProject.status}</span>
                        </div>
                        {currentProject.exitAssets?.mlsListingLink && (
                          <a href={currentProject.exitAssets.mlsListingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center transition">
                            View Staging MLS <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                     </div>
                  </div>
               ) : (
                  <div className="mt-6 border border-gray-800 border-dashed  h-48 flex items-center justify-center flex-col text-text-secondary bg-black/20">
                     <BadgePercent className="w-8 h-8 mb-2 opacity-50" />
                     <p className="text-sm font-medium">Awaiting Listing Deployment</p>
                     <p className="text-xs mt-1">Upload Staging Images & MLS Link to syndicate.</p>
                  </div>
               )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
