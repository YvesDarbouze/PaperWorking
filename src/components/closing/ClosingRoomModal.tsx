import { useState, useEffect } from 'react';
import { ApplicationUser } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { X, ShieldCheck, Link, UploadCloud, Users, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import DealProgressTracker from '@/components/shared/DealProgressTracker';
import ESignAction from '@/components/shared/ESignAction';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/context/AuthContext';


interface ClosingRoomProps {
    projectId: string;
    onClose: () => void;
}

export default function ClosingRoomModal({ projectId, onClose }: ClosingRoomProps) {
    const projects = useProjectStore(state => state.projects);
    const updateClosingRoom = useProjectStore(state => state.updateClosingRoom);
    const deal = projects.find(d => d.id === projectId);
    const { role } = usePermissions();
    const { user } = useAuth();

    const [matchingLawyers, setMatchingLawyers] = useState<ApplicationUser[]>([]);
    const [isSearchingLawyers, setIsSearchingLawyers] = useState(false);

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

    const handleFileUpload = () => {
        toast('Document upload — Firebase Storage integration pending.', { icon: '📎' });
    };

    const DocsComplete = closingRoom.titleInsuranceUrl && closingRoom.closingDisclosureUrl && closingRoom.wiringInstructionsUrl;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-bg-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                
                {/* Global Tracker */}
                <DealProgressTracker currentPhase="Closing" />
                
                {/* Header */}
                <div className="border-b border-border-accent p-6 flex justify-between items-center bg-bg-primary sticky top-[72px] z-10">
                    <div>
                         <h2 className="text-2xl font-semibold flex items-center gap-2">
                             The Closing Room
                         </h2>
                         <p className="text-sm text-text-secondary mt-1">{deal.propertyName} • {deal.address}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5 text-text-secondary"/></button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Left Column: Checks & Lawyer */}
                    <div className="space-y-6">
                        
                        {/* Title Verification — provider decision required */}
                        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 shadow-sm">
                            <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                                <Link className="w-5 h-5 text-text-secondary" /> Title Verification
                            </h3>
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-amber-900 mb-1">Provider decision required</p>
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        On-chain title verification requires a real county registry or blockchain provider to be configured.
                                        No provider is currently connected — this feature is not yet available.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Lawyer Marketplace API */}
                        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 shadow-sm">
                            <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                                <Users className="w-5 h-5 text-blue-500" /> Real Estate Attorney
                            </h3>
                            {closingRoom.assignedLawyerUid ? (
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-medium text-blue-900 text-sm">Lawyer Assigned</p>
                                        <button onClick={() => updateClosingRoom(deal.id, { assignedLawyerUid: null, lawyerVerified: false })} className="text-xs text-blue-600 hover:underline">Change</button>
                                    </div>
                                    <p className="text-sm text-blue-700">{matchingLawyers.find(l => l.uid === closingRoom.assignedLawyerUid)?.displayName || 'Unknown Attorney'}</p>
                                </div>
                            ) : (
                                <div className="bg-bg-primary border border-border-accent p-4 rounded-lg space-y-3">
                                    <p className="text-xs text-text-secondary flex items-center gap-1"><Search className="w-3 h-3"/> Discovered Matches Near Property:</p>
                                    {isSearchingLawyers ? (
                                        <p className="text-sm text-text-secondary">Searching for attorneys nearby...</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {matchingLawyers.map(l => (
                                                <div key={l.uid} className="flex justify-between items-center p-2 bg-bg-surface rounded border border-border-accent shadow-sm">
                                                    <p className="text-sm">{l.displayName}</p>
                                                    <button onClick={() => updateClosingRoom(deal.id, {assignedLawyerUid: l.uid})} className="text-xs font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition">Assign</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Demo Lawyer Verification Action */}
                            {closingRoom.assignedLawyerUid && !closingRoom.lawyerVerified && (
                                <div className="mt-4 pt-4 border-t border-border-accent">
                                   <button 
                                      onClick={() => {
                                        toast.success('Lawyer verified the transaction.', { icon: '🧑‍⚖️' });
                                        updateClosingRoom(deal.id, { lawyerVerified: true });
                                      }}
                                      className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-800 transition"
                                   >
                                      Verify Document (Demo)
                                   </button>
                                </div>
                            )}
                            
                            {closingRoom.lawyerVerified && (
                                 <div className="mt-3 flex items-center text-green-600 text-sm font-medium">
                                     <CheckCircle className="w-4 h-4 mr-2" />
                                     Approved by Legal
                                 </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Required Documents */}
                    <div className="space-y-4">
                        <h3 className="text-md font-medium text-text-primary">Required Document Checkpoints</h3>
                        
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
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3 mt-4 text-orange-800">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium mb-1">Acquisition Blocked</p>
                                    <p className="opacity-90">You cannot proceed to the Renovation phase until all documents are uploaded and verified by the assigned Real Estate Attorney.</p>
                                </div>
                            </div>
                        )}
                        
                        {(DocsComplete && closingRoom.lawyerVerified) && (
                             <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-3 mt-4 text-green-800">
                                 <div className="flex items-start gap-3">
                                   <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                   <div className="text-sm">
                                       <p className="font-medium mb-1">Cleared to Close</p>
                                       <p className="opacity-90">All closing contingencies have been met. Execute final signatures to transfer into the Renovation phase.</p>
                                   </div>
                                 </div>
                                 <div className="mt-2 pt-3 border-t border-green-200 flex justify-end">
                                     <ESignAction
                                        projectId={projectId}
                                        documentName="Final Closing Disclosures"
                                        signeeRole={role}
                                        signeeEmail={user?.email ?? undefined}
                                        signeeName={user?.displayName ?? role}
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
        <div className={`p-4 border-2 border-dashed rounded-xl transition-colors ${isUploaded ? 'border-green-300 bg-green-50' : 'border-border-accent hover:border-gray-400 bg-bg-primary'}`}>
            <div className="flex justify-between items-center">
                <div>
                   <h4 className={`text-sm font-semibold ${isUploaded ? 'text-green-800' : 'text-text-primary'}`}>{title}</h4>
                   <p className="text-xs text-text-secondary mt-1">{description}</p>
                </div>
                {isUploaded ? (
                    <div className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-bold">
                        <CheckCircle className="w-3 h-3 mr-1" /> PDF Attached
                    </div>
                ) : (
                    <button onClick={onUpload} className="flex items-center gap-1 bg-bg-surface border border-border-accent shadow-sm px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-primary">
                        <UploadCloud className="w-3 h-3" /> Upload
                    </button>
                )}
            </div>
        </div>
    )
}
