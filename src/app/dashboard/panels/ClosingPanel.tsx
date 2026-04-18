'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { CheckCircle, UploadCloud, Search, ShieldCheck, Link as LinkIcon, Scale, FileSignature } from 'lucide-react';
import { pingBlockchainTitleRegistry } from '@/lib/web3/titleVerify';
import toast from 'react-hot-toast';
import { Project, ClosingDocument } from '@/types/schema';

const DealRoster = lazy(() => import('@/components/team/DealRoster'));
const InspectionUploadModule = lazy(() => import('@/components/closing/InspectionUploadModule'));
const TitleSearchClearance = lazy(() => import('@/components/closing/TitleSearchClearance'));

/* Acquisition & Due Diligence sub-modules */
const CostBasisLedger = lazy(() => import('@/components/acquisition/CostBasisLedger'));
const DocumentVault = lazy(() => import('@/components/acquisition/DocumentVault'));

/* Closing Settlement sub-modules */
const ClosingChecklist = lazy(() => import('@/components/closing/ClosingChecklist'));
const ExitCostLedger = lazy(() => import('@/components/closing/ExitCostLedger'));
const SeventyPercentRuleAudit = lazy(() => import('@/components/closing/SeventyPercentRuleAudit'));

/* ═══════════════════════════════════════════════════════
   Closing Panel — Lane 2 (The Closing Room)
   ═══════════════════════════════════════════════════════ */

export default function ClosingPanel() {
  const projects = useProjectStore(state => state.projects);
  const currentProject = useProjectStore(state => state.currentProject);
  const setDeal = useProjectStore(state => state.setDeal);
  const setDeals = useProjectStore(state => state.setDeals);

  const [isMining, setIsMining] = useState(false);
  const [searchingLawyers, setSearchingLawyers] = useState(false);
  const [availableLawyers, setAvailableLawyers] = useState<any[]>([]);

  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      setDeal(projects[0]);
    }
  }, [projects, currentProject, setDeal]);

  if (!currentProject) {
    return <div className="p-12 text-center text-gray-500">No active projects found. Head to the Pipeline lane and add a property first.</div>;
  }

  const portal = currentProject.closingPortal || {
    documents: [],
    blockchainTitleVerified: false,
  };

  const hasDoc = (type: string) => portal.documents.some(d => d.type === type);
  const isDocVerified = (type: string) => portal.documents.some(d => d.type === type && d.verifiedByLawyer);

  const handleUploadMock = (type: 'Title Insurance' | 'Closing Disclosure' | 'Wiring Instructions') => {
    setDeals(projects.map(d => {
      if (d.id === currentProject.id) {
        const docs = d.closingPortal?.documents || [];
        if (docs.some(doc => doc.type === type)) return d;
        return {
          ...d,
          closingPortal: {
            ...(d.closingPortal || { blockchainTitleVerified: false }),
            documents: [
              ...docs,
              {
                id: Math.random().toString(),
                type,
                fileName: `Mock_${type.replace(' ', '')}_Encrypted.pdf`,
                verifiedByLawyer: false,
                uploadedAt: new Date()
              }
            ]
          }
        };
      }
      return d;
    }));
    toast.success(`${type} uploaded securely.`);
  };

  const handleLawyerVerifyMock = (type: 'Title Insurance' | 'Closing Disclosure' | 'Wiring Instructions') => {
    if (!portal.assignedLawyerUid) {
      toast.error('You must secure an Attorney before documents can be cryptographically verified.');
      return;
    }
    setDeals(projects.map(d => {
      if (d.id === currentProject.id) {
        return {
          ...d,
          closingPortal: {
            ...d.closingPortal!,
            documents: d.closingPortal!.documents.map(doc => doc.type === type ? { ...doc, verifiedByLawyer: true } : doc)
          }
        };
      }
      return d;
    }));
    toast.success(`Attorney verified ${type}.`);
  };

  const triggerBlockchainVerification = async () => {
    if (!isDocVerified('Title Insurance')) {
      toast.error('Title Insurance must be verified by Attorney before Web3 Ping.');
      return;
    }
    setIsMining(true);
    const result = await pingBlockchainTitleRegistry(currentProject.address);
    setIsMining(false);
    
    setDeals(projects.map(d => {
       if (d.id === currentProject.id) {
         return {
           ...d,
           closingPortal: {
             ...d.closingPortal!,
             blockchainTitleVerified: true,
             blockchainTxHash: result.txHash
           }
         }
       }
       return d;
    }));
    toast.success('Smart Contract synchronized successfully!');
  };

  const searchLawyersData = async () => {
    setSearchingLawyers(true);
    const state = currentProject.stateCode || 'FL';
    try {
      const res = await fetch(`/api/lawyers?state=${state}`);
      const data = await res.json();
      if (data.success) {
        setAvailableLawyers(data.lawyers);
      }
    } catch {
      toast.error('API matching failed');
    }
    setSearchingLawyers(false);
  };

  const assignLawyer = (uid: string) => {
    setDeals(projects.map(d => {
       if (d.id === currentProject.id) {
         return {
           ...d,
           closingPortal: {
             ...d.closingPortal!,
             assignedLawyerUid: uid
           }
         }
       }
       return d;
    }));
    toast.success('Attorney secured & retained for this deal!');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-gray-900">The Closing Room</h1>
        <p className="text-gray-500 mt-1">Legally binding checkpoint protecting Acquisition boundaries.</p>
      </div>

      {/* ── 70% Rule Audit — Top-level margin warning ── */}
      <Suspense fallback={<div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}>
        <SeventyPercentRuleAudit />
      </Suspense>

      {/* ── Closing Checklist — Must-complete validation ── */}
      <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
        <ClosingChecklist />
      </Suspense>

      {/* ── Cost Basis Ledger (3-part capitalization tracker) ── */}
      <Suspense fallback={<div className="h-60 bg-gray-50 rounded-xl animate-pulse" />}>
        <CostBasisLedger />
      </Suspense>

      {/* ── Document Vault (Role-linked uploads) ── */}
      <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
        <DocumentVault />
      </Suspense>

      {/* ── Exit Cost Ledger (Broker Fees, Staging, Marketing) ── */}
      <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
        <ExitCostLedger />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Document Collection Grid */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium tracking-tight border-b pb-4 mb-4">Required Legal Artifacts</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {(['Title Insurance', 'Closing Disclosure', 'Wiring Instructions'] as const).map(type => (
                   <div key={type} className={`border rounded-lg p-5 flex flex-col items-center justify-center text-center transition ${hasDoc(type) ? 'border-gray-300 bg-gray-50' : 'border-dashed border-gray-300 hover:bg-gray-50 cursor-pointer'}`} onClick={() => !hasDoc(type) && handleUploadMock(type)}>
                      {hasDoc(type) ? (
                         isDocVerified(type) ? <CheckCircle className="w-8 h-8 text-green-500 mb-2" /> : <FileSignature className="w-8 h-8 text-indigo-500 mb-2" />
                      ) : (
                         <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                      )}
                      
                      <p className="text-sm font-medium text-gray-900">{type}</p>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">
                        {hasDoc(type) ? (isDocVerified(type) ? 'VERIFIED' : 'PENDING REVIEW') : 'REQUIRED'}
                      </p>

                      {hasDoc(type) && !isDocVerified(type) && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleLawyerVerifyMock(type); }}
                           className="mt-3 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded hover:bg-indigo-100"
                         >
                            Simulate Lawyer Verification
                         </button>
                      )}
                   </div>
                 ))}
              </div>
           </div>

            {/* Inspection Upload Module — Structural/Plumbing/Electrical */}
            <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
              <InspectionUploadModule />
            </Suspense>

            {/* Title Search Clearance Tracker */}
            <Suspense fallback={<div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}>
              <TitleSearchClearance />
            </Suspense>

           {/* Web3 Ping Interface */}
           <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-lg border border-indigo-800 p-8 text-white relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex items-center space-x-2 mb-2">
                 <LinkIcon className="w-5 h-5 text-indigo-300" />
                 <h3 className="text-lg font-medium tracking-tight">Smart Contract Title Integrity</h3>
               </div>
               <p className="text-indigo-200 text-sm mb-6 max-w-lg">
                 Before releasing Capital to wire, we verify digital title hashes against immutable ledger parity to ensure unburdened structural ownership.
               </p>

               {portal.blockchainTitleVerified ? (
                 <div className="p-4 bg-black/30 border border-indigo-500/30 rounded-lg flex items-center space-x-4">
                    <ShieldCheck className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Title Verified on Ledger</p>
                      <p className="text-xs font-mono text-indigo-300 mt-1 break-all tracking-tighter">TxHash: {portal.blockchainTxHash}</p>
                    </div>
                 </div>
               ) : (
                 <button 
                   onClick={triggerBlockchainVerification}
                   disabled={isMining}
                   className={`px-6 py-3 bg-white text-indigo-900 font-medium rounded-lg text-sm shadow-md transition ${isMining ? 'opacity-70' : 'hover:scale-105'} flex items-center`}
                 >
                   {isMining ? 'Interrogating Network...' : 'Ping Blockchain Registry'}
                 </button>
               )}
             </div>
           </div>
        </div>

        {/* Lawyer Portal Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 border-b pb-4 mb-4">
                <Scale className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-medium tracking-tight">Attorney Network</h3>
              </div>
              
              {!portal.assignedLawyerUid ? (
                 <>
                   <p className="text-sm text-gray-500 mb-6">Scan your physical state domain (Simulated: FL) for certified Title Attorneys deployed through the PaperWorking subscription platform.</p>
                   {availableLawyers.length === 0 ? (
                      <button 
                         onClick={searchLawyersData}
                         disabled={searchingLawyers}
                         className="w-full flex justify-center items-center py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition"
                      >
                         {searchingLawyers ? 'Deploying Array...' : <><Search className="w-4 h-4 mr-2"/> Scan Network</>}
                      </button>
                   ) : (
                      <div className="space-y-3">
                        {availableLawyers.map(lw => (
                          <div key={lw.uid} className="p-3 border rounded-lg border-gray-200 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">{lw.displayName}</p>
                              <p className="text-xs text-gray-500">{lw.state} Certified Target</p>
                            </div>
                            <button onClick={() => assignLawyer(lw.uid)} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded hover:bg-blue-100">
                               Recruit
                            </button>
                          </div>
                        ))}
                      </div>
                   )}
                 </>
              ) : (
                 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                    <p className="text-sm font-medium text-green-900">Attorney Requisitioned</p>
                    <p className="text-xs text-green-700 mt-1">Our certified legal entity is actively monitoring your Dropzones and acting as a compliance buffer.</p>
                 </div>
              )}
            </div>

            {/* Deal Roster — External Stakeholder Directory */}
            <Suspense fallback={<div className="h-32 bg-gray-50 rounded-xl animate-pulse" />}>
              <DealRoster projectId={currentProject.id} />
            </Suspense>
         </div>

      </div>
    </div>
  );
}
