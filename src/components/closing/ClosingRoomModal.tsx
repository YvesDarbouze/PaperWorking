import React, { useState, useEffect } from 'react';
import { ApplicationUser } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { X, ShieldCheck, Link, UploadCloud, Users, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { pingDigitalRegistry } from '@/lib/web3RegistryHooks';
import DealProgressTracker from '@/components/shared/DealProgressTracker';
import ESignAction from '@/components/shared/ESignAction';
import { usePermissions } from '@/hooks/usePermissions';


interface ClosingRoomProps {
    projectId: string;
    onClose: () => void;
}

export default function ClosingRoomModal({ projectId, onClose }: ClosingRoomProps) {
    const projects = useProjectStore(state => state.projects);
    const updateClosingRoom = useProjectStore(state => state.updateClosingRoom);
    const deal = projects.find(d => d.id === projectId);
    const { role } = usePermissions();

    const [isPinging, setIsPinging] = useState(false);
    const [matchingLawyers, setMatchingLawyers] = useState<ApplicationUser[]>([]);
    const [isSearchingLawyers, setIsSearchingLawyers] = useState(false);
    const [isSigned, setIsSigned] = useState(false);

    useEffect(() => {
      if (!deal) return;
      const discoverLawyers = async () => {
        setIsSearchingLawyers(true);
        // Extract 2-letter state abbreviation from address (e.g. "123 Main St, Miami, FL 33101")
        const stateMatch = deal.address.match(/,\s*([A-Z]{2})(?:\s+\d{5})?/i);
        const stateCode = stateMatch ? stateMatch[1].toUpperCase() : 'NY';
        try {
          const res = await fetch(`/api/lawyers?state=${stateCode}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setMatchingLawyers(data.lawyers ?? []);
        } catch (err) {
          console.error('[ClosingRoomModal] Failed to fetch lawyers:', err);
          toast.error('Could not load attorneys. Please try again.');
        } finally {
          setIsSearchingLawyers(false);
        }
      };
      discoverLawyers();
    }, [projectId, deal]);

    if (!deal) return null;

    const closingRoom = deal.closingRoom || {
        titleInsuranceUrl: null,
        closingDisclosureUrl: null,
        wiringInstructionsUrl: null,
        assignedLawyerUid: null,
        lawyerVerified: false,
        blockchainTxHash: null,
        chainOfTitleStatus: 'pending'
    };

    const handleWeb3Ping = async () => {
        setIsPinging(true);
        toast.loading('Verifying title on chain...', { id: 'web3' });
        try {
            const res = await pingDigitalRegistry(deal.address);
            updateClosingRoom(deal.id, {
                chainOfTitleStatus: res.chainOfTitleStatus,
                blockchainTxHash: res.blockchainTxHash
            });
            toast.success(`Title Registry Verified! Hash: ${res.blockchainTxHash?.slice(0,10)}...`, { id: 'web3' });
        } catch {
            toast.error('Failed to communicate with title nodes', { id: 'web3' });
        } finally {
            setIsPinging(false);
        }
    };

    const handleFileUpload = () => {
        toast('Document upload — Firebase Storage integration pending.', { icon: '📎' });
    };

    const DocsComplete = closingRoom.titleInsuranceUrl && closingRoom.closingDisclosureUrl && closingRoom.wiringInstructionsUrl;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
            <div className="bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                
                {/* Global Tracker */}
                <DealProgressTracker currentPhase="Closing" />
                
                {/* Header */}
                <div className="border-b border-pw-border p-6 flex justify-between items-center bg-pw-glass-bg/90 backdrop-blur-md sticky top-[72px] z-10 text-pw-black">
                    <div>
                         <h2 className="text-2xl font-semibold flex items-center gap-2">
                             The Closing Room
                         </h2>
                         <p className="text-sm text-pw-muted mt-1">{deal.propertyName} • {deal.address}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-pw-glass-bg/25 rounded-full transition text-pw-black"><X className="w-5 h-5"/></button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Left Column: Checks & Lawyer */}
                    <div className="space-y-6">
                        
                        {/* Web3 Title Check */}
                        <div className="bg-pw-glass-bg border border-pw-border rounded-2xl p-5 shadow-sm">
                            <h3 className="text-md font-medium flex items-center gap-2 mb-3 text-pw-black">
                                <Link className="w-5 h-5 text-[#20B2AA]" /> Digital Chain of Title
                            </h3>
                            <div className="bg-pw-glass-bg/50 border border-pw-border/50 p-4 rounded-2xl flex flex-col gap-3">
                                {closingRoom.chainOfTitleStatus === 'verified' ? (
                                    <>
                                       <div className="flex items-center text-green-500">
                                            <ShieldCheck className="w-5 h-5 mr-2" />
                                            <span className="font-medium text-sm">Title Cleared via Smart Contract</span>
                                       </div>
                                       <p className="text-xs text-pw-muted break-all font-mono">TX: {closingRoom.blockchainTxHash}</p>
                                    </>
                                ) : (
                                    <>
                                       <p className="text-sm text-pw-muted">Pending immutable verification of property transfer chain.</p>
                                       <button 
                                          onClick={handleWeb3Ping} 
                                          disabled={isPinging}
                                          className="pw-btn pw-btn--primary pw-btn--pill w-full py-2 text-sm font-medium transition disabled:opacity-50"
                                       >
                                          {isPinging ? 'Pinging Registry Nodes...' : 'Verify Chain of Title Now'}
                                       </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Lawyer Marketplace API */}
                        <div className="bg-pw-glass-bg border border-pw-border rounded-2xl p-5 shadow-sm">
                            <h3 className="text-md font-medium flex items-center gap-2 mb-3 text-pw-black">
                                <Users className="w-5 h-5 text-blue-400" /> Real Estate Attorney
                            </h3>
                            {closingRoom.assignedLawyerUid ? (
                                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-medium text-blue-400 text-sm">Lawyer Assigned</p>
                                        <button onClick={() => updateClosingRoom(deal.id, { assignedLawyerUid: null, lawyerVerified: false })} className="text-xs text-blue-400 hover:underline">Change</button>
                                    </div>
                                    <p className="text-sm text-pw-black">{matchingLawyers.find(l => l.uid === closingRoom.assignedLawyerUid)?.displayName || 'Unknown Attorney'}</p>
                                </div>
                            ) : (
                                <div className="bg-pw-glass-bg/50 border border-pw-border p-4 rounded-2xl space-y-3">
                                    <p className="text-xs text-pw-muted flex items-center gap-1"><Search className="w-3 h-3"/> Discovered Matches Near Property:</p>
                                    {isSearchingLawyers ? (
                                        <p className="text-sm text-pw-muted">Searching for attorneys nearby...</p>
                                    ) : matchingLawyers.length === 0 ? (
                                        <p className="text-sm text-pw-muted">No attorneys found in this state. Try adjusting the property address or contact support.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {matchingLawyers.map(l => (
                                                <div key={l.uid} className="flex justify-between items-center p-2 bg-pw-glass-bg/40 rounded-xl border border-pw-border shadow-sm">
                                                    <p className="text-sm text-pw-black">{l.displayName}</p>
                                                    <button onClick={() => updateClosingRoom(deal.id, {assignedLawyerUid: l.uid})} className="pw-btn pw-btn--secondary pw-btn--sm pw-btn--pill">Assign</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Demo Lawyer Verification Action */}
                            {closingRoom.assignedLawyerUid && !closingRoom.lawyerVerified && (
                                <div className="mt-4 pt-4 border-t border-pw-border">
                                   <button 
                                      onClick={() => {
                                        toast.success('Lawyer verified the transaction.', { icon: '🧑‍⚖️' });
                                        updateClosingRoom(deal.id, { lawyerVerified: true });
                                      }}
                                      className="pw-btn pw-btn--primary pw-btn--pill w-full py-2 text-sm font-medium transition"
                                   >
                                      Verify Document (Demo)
                                   </button>
                                </div>
                            )}
                            
                            {closingRoom.lawyerVerified && (
                                 <div className="mt-3 flex items-center text-green-500 text-sm font-medium">
                                     <CheckCircle className="w-4 h-4 mr-2" />
                                     Approved by Legal
                                 </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Required Documents */}
                    <div className="space-y-4">
                        <h3 className="text-md font-medium text-pw-black">Required Document Checkpoints</h3>
                        
                        <DocumentZone 
                           title="1. Title Insurance"
                           description="Scan of the abstract and insurance policy."
                           isUploaded={!!closingRoom.titleInsuranceUrl}
                           onUpload={handleFileUpload}
                        />

                        <DocumentZone 
                           title="2. Closing Disclosure (CD)"
                           description="Standardized HUD-1 or final CD statements."
                           isUploaded={!!closingRoom.closingDisclosureUrl}
                           onUpload={handleFileUpload}
                        />

                        <DocumentZone 
                           title="3. Wiring Instructions"
                           description="Verified ABA routing and transfer accounts."
                           isUploaded={!!closingRoom.wiringInstructionsUrl}
                           onUpload={handleFileUpload}
                        />

                        {(!DocsComplete || !closingRoom.lawyerVerified) && (
                            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-start gap-3 mt-4 text-orange-400">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium mb-1">Acquisition Blocked</p>
                                    <p className="opacity-90">You cannot proceed to the Renovation phase until all documents are uploaded and verified by the assigned Real Estate Attorney.</p>
                                </div>
                            </div>
                        )}
                        
                        {(DocsComplete && closingRoom.lawyerVerified) && (
                             <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex flex-col gap-3 mt-4 text-green-400">
                                 <div className="flex items-start gap-3">
                                   <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                   <div className="text-sm">
                                       <p className="font-medium mb-1">Cleared to Close</p>
                                       <p className="opacity-90">All closing contingencies have been met. Execute final signatures to transfer into the Renovation phase.</p>
                                   </div>
                                 </div>
                                 <div className="mt-2 pt-3 border-t border-green-500/30 flex justify-end">
                                     <ESignAction 
                                        documentName="Final Closing Disclosures" 
                                        signeeRole={role}
                                        isSigned={isSigned}
                                        onSigned={() => setIsSigned(true)}
                                     />
                                 </div>
                             </div>
                        )}

                    </div>

                </div>
            </div>
        </div>
    );
}

function DocumentZone({ title, description, isUploaded, onUpload }: { title: string, description: string, isUploaded: boolean, onUpload: () => void }) {
    return (
        <div className={`p-4 border border-dashed rounded-2xl transition-colors ${isUploaded ? 'border-green-300 bg-green-500/10' : 'border-pw-border hover:border-pw-muted bg-pw-glass-bg/30'}`}>
            <div className="flex justify-between items-center">
                <div>
                   <h4 className={`text-sm font-semibold ${isUploaded ? 'text-green-400' : 'text-pw-black'}`}>{title}</h4>
                   <p className="text-xs text-pw-muted mt-1">{description}</p>
                </div>
                {isUploaded ? (
                    <div className="flex items-center text-green-500 bg-green-500/20 px-2 py-1 rounded-full text-xs font-bold">
                        <CheckCircle className="w-3 h-3 mr-1" /> PDF Attached
                    </div>
                ) : (
                    <button onClick={onUpload} className="pw-btn pw-btn--secondary pw-btn--sm pw-btn--pill flex items-center gap-1">
                        <UploadCloud className="w-3 h-3" /> Upload
                    </button>
                )}
            </div>
        </div>
    )
}
