import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Camera, Link as LinkIcon, DollarSign, Percent, CheckCircle, ExternalLink, BadgePercent, X } from 'lucide-react';
import toast from 'react-hot-toast';
import NetEngine from '@/components/exit/NetEngine';
import PhaseBadge from '../ui/PhaseBadge';
import { Switch } from '../ui';
import { projectsService } from '@/lib/firebase/projects';

import { useAuth } from '@/context/AuthContext';

interface ExitStrategyBoardProps {
  projectId: string;
  onClose: () => void;
}

export default function ExitStrategyBoard({ projectId, onClose }: ExitStrategyBoardProps) {
  const projects = useProjectStore(state => state.projects);
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);
  const setDeals = useProjectStore(state => state.setDeals);
  const { user } = useAuth();

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

  const handleUpdateListing = async () => {
    try {
      const updates = {
        status: 'Exit' as any,
        exitAssets: {
          ...currentProject.exitAssets,
          mlsListingLink: mlsLink,
          stagingImages: currentProject.exitAssets?.stagingImages || [],
          mlsListingStatus: 'pending_integration' as const,
        }
      };

      // 1. Persist to Firestore backend
      await projectsService.updateProject(currentProject.id, updates);

      // 2. Update client store
      const updatedDeals = projects.map(d => {
        if (d.id === currentProject.id) {
           return {
             ...d,
             ...updates
           };
        }
        return d;
      });
      setDeals(updatedDeals);
      toast.success('Listing updates saved (Awaiting MLS connection)', { icon: '🏡', style: { background: '#333', color: '#fff' }});
    } catch (err: any) {
      console.error('[ExitStrategyBoard] Failed to update listing:', err);
      toast.error('Failed to update listing: ' + (err.message || 'Unknown error'));
    }
  };

  const handleExecuteSale = async () => {
    try {
      if (!user) {
        toast.error('You must be logged in to execute a sale.');
        return;
      }

      const token = typeof user.getIdToken === 'function' ? await user.getIdToken() : '';

      const financialUpdates = {
        actualSalePrice: Number(actualSale),
        buyersAgentCommission: Number(buyerComm),
        sellersAgentCommission: Number(sellerComm),
        finalClosingCosts: Number(closingCosts),
        soldDate: new Date().toISOString()
      };

      const response = await fetch(`/api/projects/${currentProject.id}/exit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          realized: true,
          status: 'Exit',
          financials: financialUpdates
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.project) {
        throw new Error(result.error || 'Invalid response from server');
      }

      // 2. Update client store only on successful API response
      const updatedDeals = projects.map(d => {
         if (d.id === currentProject.id) {
            return result.project;
         }
         return d;
      });
      setDeals(updatedDeals);
      toast.success(isBrrrr ? 'REFINANCE EXECUTED! Assets moved to holding portfolio.' : 'SALE EXECUTED! The Net Engine has recorded the transaction.', { icon: '💰', style: { background: '#3f7d20', color: '#fff' }});
    } catch (err: any) {
      console.error('[ExitStrategyBoard] Failed to execute sale:', err);
      toast.error('Failed to execute sale: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 selection:bg-pw-accent/30 font-sans">
      <div className="bg-bg-surface/95 text-text-primary w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden relative border border-pw-border">
        
        {/* Header */}
        <div className="border-b border-pw-border bg-bg-surface/80 p-5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center">
              The Exit Strategy Board <PhaseBadge status={currentProject.status} className="ml-3" />
            </h2>
            <p className="text-xs text-text-secondary mt-1">{currentProject.propertyName} • {currentProject.address}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-surface-variant/20 transition text-text-secondary">
             <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 bg-pw-bg/30">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Real Estate Agent Controls */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Visual Identity Block */}
              <div className="glass-card border border-pw-border p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-pw-accent/5 rounded-bl-full blur-2xl"></div>
                 <h3 className="text-xs font-black tracking-widest text-pw-accent uppercase mb-4 flex items-center"><Camera className="w-3.5 h-3.5 mr-2" /> Staging & Inventory</h3>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-text-secondary block mb-1 uppercase tracking-widest">Photography Assets Uploaded</label>
                      <div className="flex items-center space-x-3">
                         <input type="number" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="glass-input p-2 w-20 text-center text-text-primary focus:outline-none" />
                         <span className="text-xs font-bold text-text-secondary">.JPG / .PNG / .MP4</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-secondary block mb-1 uppercase tracking-widest">Live MLS Link</label>
                      <div className="relative">
                         <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-text-secondary" />
                         <input type="url" placeholder="https://zillow.com/homedetails/..." value={mlsLink} onChange={(e) => setMlsLink(e.target.value)} className="glass-input py-2 pl-9 pr-3 w-full text-sm text-text-primary focus:outline-none" />
                      </div>
                    </div>
                    
                    <button onClick={handleUpdateListing} className="w-full pw-btn pw-btn--secondary font-black text-xs py-3 uppercase tracking-widest">
                       Save Listing Updates
                    </button>
                 </div>
              </div>

              {/* Closing Fee Trigger Setup */}
              <div className="glass-card border border-pw-border p-6 relative">
                 <div className="flex justify-between items-center mb-6 pb-4 border-b border-pw-border">
                    <h3 className="text-xs font-black tracking-widest text-pw-accent uppercase flex items-center"><DollarSign className="w-3.5 h-3.5 mr-2" /> Final Capital Mechanics</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">BRRRR Mode</span>
                      <Switch checked={isBrrrr} onChange={() => setIsBrrrr(!isBrrrr)} />
                    </div>
                 </div>
                 
                 <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black text-text-secondary block mb-1 uppercase tracking-widest">{isBrrrr ? 'Refinance Appraisal Value ($)' : 'Gross Sale Trigger ($)'}</label>
                      <input type="number" value={actualSale} onChange={(e) => setActualSale(e.target.value)} className="glass-input p-3 w-full text-lg font-bold tracking-tight text-text-primary focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-text-secondary block mb-1 uppercase tracking-widest">Buyer Comm.</label>
                        <div className="relative">
                          <input type="number" step="0.1" value={buyerComm} onChange={(e) => setBuyerComm(e.target.value)} className="glass-input p-2 w-full text-sm pr-8 text-text-primary focus:outline-none" />
                          <Percent className="absolute right-3 top-3 w-3 h-3 text-text-secondary" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-text-secondary block mb-1 uppercase tracking-widest">Seller Comm.</label>
                        <div className="relative">
                          <input type="number" step="0.1" value={sellerComm} onChange={(e) => setSellerComm(e.target.value)} className="glass-input p-2 w-full text-sm pr-8 text-text-primary focus:outline-none" />
                          <Percent className="absolute right-3 top-3 w-3 h-3 text-text-secondary" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-text-secondary block mb-1 uppercase tracking-widest">Final Closing & Concessions ($)</label>
                      <input type="number" value={closingCosts} onChange={(e) => setClosingCosts(e.target.value)} className="glass-input p-2 w-full text-sm text-text-primary focus:outline-none" />
                    </div>

                    <div className="pt-2">
                      <button onClick={handleExecuteSale} className="w-full pw-btn pw-btn--primary py-4 font-black uppercase tracking-widest">
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
               {((currentProject.status === 'hold' && currentProject.dispositionType === 'SALE') || currentProject.status === 'exit') ? (
                  <div className="mt-6 border border-pw-border bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center h-48 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-bg-primary/70 group-hover:bg-bg-primary/50 transition duration-500 flex flex-col items-center justify-center p-4 text-center">
                        <div className="bg-bg-surface/80 backdrop-blur-md px-6 py-3 border border-pw-border flex items-center space-x-3 mb-2">
                           <CheckCircle className={`w-4 h-4 text-pw-accent`} />
                           <span className="font-black text-text-primary tracking-widest uppercase text-xs">
                             {currentProject.exitAssets?.mlsListingStatus === 'pending_integration' ? 'Listing Saved (Awaiting MLS Connection)' : `Property is ${currentProject.status === 'exit' ? 'EXIT' : 'HOLD'}`}
                           </span>
                        </div>
                        {currentProject.exitAssets?.mlsListingStatus === 'pending_integration' ? (
                           <p className="text-[10px] text-text-secondary uppercase tracking-wider max-w-sm mt-1">
                             Your changes have been saved. Listing updates will publish automatically once the partner MLS integration is active.
                           </p>
                         ) : currentProject.exitAssets?.mlsListingLink ? (
                          <a href={currentProject.exitAssets.mlsListingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-pw-accent hover:underline flex items-center transition">
                            View Staging MLS <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : null}
                     </div>
                  </div>
               ) : (
                  <div className="mt-6 border border-pw-border border-dashed h-48 flex items-center justify-center flex-col text-text-secondary bg-pw-bg/10">
                     <BadgePercent className="w-8 h-8 mb-2 opacity-50 text-pw-accent" />
                     <p className="text-xs font-black uppercase tracking-widest text-text-primary">Awaiting Listing Deployment</p>
                     <p className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">Upload Staging Images & MLS Link to publish.</p>
                  </div>
               )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
