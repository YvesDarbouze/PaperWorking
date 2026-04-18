import React, { useState, useEffect } from 'react';
import { Project, ApplicationUser } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { X, ShieldCheck, Link, UploadCloud, Users, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { pingDigitalRegistry } from '@/lib/web3RegistryHooks';
import { fetchStateMatchedLawyers } from '@/lib/lawyerMatchingApi';
import DealProgressTracker from '@/components/shared/DealProgressTracker';
import ESignAction from '@/components/shared/ESignAction';

// Mock generic file upload simulation
const mockFileUpload = () => {
    return `https://mockstorage.com/doc_${Math.random().toString(36).substring(7)}.pdf`;
};

interface ClosingRoomProps {
    projectId: string;
    onClose: () => void;
}

export default function ClosingRoomModal({ projectId, onClose }: ClosingRoomProps) {
    const projects = useProjectStore(state => state.projects);
    const updateClosingRoom = useProjectStore(state => state.updateClosingRoom);
    const deal = projects.find(d => d.id === projectId);

    const [isPinging, setIsPinging] = useState(false);
    const [matchingLawyers, setMatchingLawyers] = useState<ApplicationUser[]>([]);
    const [isSearchingLawyers, setIsSearchingLawyers] = useState(false);
    const [isSigned, setIsSigned] = useState(false);

    useEffect(() => {
       if (!deal) return;
       // Mock a search based on address extracting State
       const discoverLawyers = async () => {
         setIsSearchingLawyers(true);
         // Simulate state based on property address length or just default "NY"
         const lawyers = await fetchStateMatchedLawyers('NY');
         setMatchingLawyers(lawyers);
         setIsSearchingLawyers(false);
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
        toast.loading('Pinging inter-state web3 title nodes...', { id: 'web3' });
        try {
            const res = await pingDigitalRegistry(deal.address);
            updateClosingRoom(deal.id, {
                chainOfTitleStatus: res.chainOfTitleStatus,
                blockchainTxHash: res.blockchainTxHash
            });
            toast.success(`Title Registry Verified! Hash: ${res.blockchainTxHash?.slice(0,10)}...`, { id: 'web3' });
        } catch (error) {
            toast.error('Failed to communicate with title nodes', { id: 'web3' });
        } finally {
            setIsPinging(false);
        }
    };

    const handleFileUpload = (type: 'titleInsuranceUrl' | 'closingDisclosureUrl' | 'wiringInstructionsUrl') => {
        toast.promise(
            new Promise((resolve) => setTimeout(() => resolve(mockFileUpload()), 1000)),
            {
               loading: `Uploading Document...`,
               success: (url) => {
                   updateClosingRoom(deal.id, { [type]: url });
                   return 'Document Secured';
               },
               error: 'Upload Failed'
            }
        );
    };

    const DocsComplete = closingRoom.titleInsuranceUrl && closingRoom.closingDisclosureUrl && closingRoom.wiringInstructionsUrl;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                
                {/* Global Tracker */}
                <DealProgressTracker currentPhase="Closing" />
                
                {/* Header */}
                <div className="border-b border-gray-100 p-6 flex justify-between items-center bg-slate-50 sticky top-[72px] z-10">
                    <div>
                         <h2 className="text-2xl font-semibold flex items-center gap-2">
                             The Closing Room
                         </h2>
                         <p className="text-sm text-gray-500 mt-1">{deal.propertyName} • {deal.address}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5 text-gray-500"/></button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Left Column: Checks & Lawyer */}
                    <div className="space-y-6">
                        
                        {/* Web3 Title Check */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                                <Link className="w-5 h-5 text-indigo-500" /> Digital Chain of Title
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg flex flex-col gap-3">
                                {closingRoom.chainOfTitleStatus === 'verified' ? (
                                    <>
                                       <div className="flex items-center text-green-700">
                                            <ShieldCheck className="w-5 h-5 mr-2" />
                                            <span className="font-medium text-sm">Title Cleared via Smart Contract</span>
                                       </div>
                                       <p className="text-xs text-gray-400 break-all font-mono">TX: {closingRoom.blockchainTxHash}</p>
                                    </>
                                ) : (
                                    <>
                                       <p className="text-sm text-gray-600">Pending immutable verification of property transfer chain.</p>
                                       <button 
                                          onClick={handleWeb3Ping} 
                                          disabled={isPinging}
                                          className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                                       >
                                          {isPinging ? 'Pinging Registry Nodes...' : 'Verify Chain of Title Now'}
                                       </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Lawyer Marketplace API */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
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
                                <div className="bg-slate-50 border border-gray-100 p-4 rounded-lg space-y-3">
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><Search className="w-3 h-3"/> Discovered Matches in NY:</p>
                                    {isSearchingLawyers ? (
                                        <p className="text-sm text-gray-400">Scanning local subscriber registry...</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {matchingLawyers.map(l => (
                                                <div key={l.uid} className="flex justify-between items-center p-2 bg-white rounded border border-gray-100 shadow-sm">
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
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                   <button 
                                      onClick={() => {
                                        toast.success('Lawyer verified the transaction.', { icon: '🧑‍⚖️' });
                                        updateClosingRoom(deal.id, { lawyerVerified: true });
                                      }}
                                      className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-800 transition"
                                   >
                                      Simulate Lawyer Verification
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
                        <h3 className="text-md font-medium text-gray-800">Required Document Checkpoints</h3>
                        
                        <DocumentZone 
                           title="1. Title Insurance"
                           description="Scan of the abstract and insurance policy."
                           isUploaded={!!closingRoom.titleInsuranceUrl}
                           onUpload={() => handleFileUpload('titleInsuranceUrl')}
                        />

                        <DocumentZone 
                           title="2. Closing Disclosure (CD)"
                           description="Standardized HUD-1 or final CD statements."
                           isUploaded={!!closingRoom.closingDisclosureUrl}
                           onUpload={() => handleFileUpload('closingDisclosureUrl')}
                        />

                        <DocumentZone 
                           title="3. Wiring Instructions"
                           description="Verified ABA routing and transfer accounts."
                           isUploaded={!!closingRoom.wiringInstructionsUrl}
                           onUpload={() => handleFileUpload('wiringInstructionsUrl')}
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
                                        documentName="Final Closing Disclosures" 
                                        signeeRole="Lead Investor"
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
        <div className={`p-4 border-2 border-dashed rounded-xl transition-colors ${isUploaded ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}>
            <div className="flex justify-between items-center">
                <div>
                   <h4 className={`text-sm font-semibold ${isUploaded ? 'text-green-800' : 'text-gray-800'}`}>{title}</h4>
                   <p className="text-xs text-gray-500 mt-1">{description}</p>
                </div>
                {isUploaded ? (
                    <div className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-bold">
                        <CheckCircle className="w-3 h-3 mr-1" /> PDF Attached
                    </div>
                ) : (
                    <button onClick={onUpload} className="flex items-center gap-1 bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">
                        <UploadCloud className="w-3 h-3" /> Upload
                    </button>
                )}
            </div>
        </div>
    )
}
