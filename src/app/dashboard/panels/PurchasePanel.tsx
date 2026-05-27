'use client';

import React, { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { CheckCircle, UploadCloud, Search, ShieldCheck, Link as LinkIcon, Scale, FileSignature } from 'lucide-react';
import { pingBlockchainTitleRegistry } from '@/lib/web3/titleVerify';
import toast from 'react-hot-toast';
import { Project, ClosingDocument } from '@/types/schema';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DSCRGauge } from '@/components/metrics/phase2';

const ProjectRoster = lazy(() => import('@/components/team/ProjectRoster'));
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

export default function PurchasePanel() {
  const projects = useProjectStore(state => state.projects);
  const currentProject = useProjectStore(state => state.currentProject);
  const setDeal = useProjectStore(state => state.setDeal);
  const setDeals = useProjectStore(state => state.setDeals);

  const [isMining, setIsMining] = useState(false);
  const [searchingLawyers, setSearchingLawyers] = useState(false);
  const [availableLawyers, setAvailableLawyers] = useState<{ uid: string; displayName: string; state: string }[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadType = useRef<'Title Insurance' | 'Closing Disclosure' | 'Wiring Instructions' | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      setDeal(projects[0]);
    }
  }, [projects, currentProject, setDeal]);

  // ── DSCR underwriting data — must be above early return (hooks ordering) ──
  const dscrData = useMemo(() => {
    const fin = currentProject?.financials;
    if (!fin) return null;

    const loanAmount = fin.loanAmount ?? 0;
    const annualRate = (fin.loanInterestRate ?? 0) / 100;
    const debtService = fin.financingDebtService
      ? fin.financingDebtService * 12
      : loanAmount * annualRate;

    const grossRent = (fin.projectedMonthlyRent ?? fin.monthlyGrossRent ?? 0);
    const otherIncome = fin.otherMonthlyIncome ?? 0;
    const vacancyPct = (fin.vacancyRatePercent ?? fin.vacancyRate ?? 7) / 100;
    const effectiveGrossIncome = (grossRent + otherIncome) * 12 * (1 - vacancyPct);
    const operatingExpenses = effectiveGrossIncome * 0.35;
    const noi = effectiveGrossIncome - operatingExpenses;

    if (debtService <= 0) return null;
    return { noi, annualDebtService: debtService };
  }, [currentProject]);

  if (!currentProject) {
    return <div className="p-12 text-center text-text-secondary">No active projects found. Head to the Pipeline lane and add a property first.</div>;
  }

  const portal = currentProject.closingPortal || {
    documents: [],
    blockchainTitleVerified: false,
  };

  const hasDoc = (type: string) => portal.documents.some(d => d.type === type);
  const isDocVerified = (type: string) => portal.documents.some(d => d.type === type && d.verifiedByLawyer);

  const handleDocumentUpload = (type: 'Title Insurance' | 'Closing Disclosure' | 'Wiring Instructions') => {
    pendingUploadType.current = type;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = pendingUploadType.current;
    if (!file || !type || !currentProject) return;

    // Reset input so the same file can be selected again if needed
    e.target.value = '';

    setUploading(type);
    try {
      const storagePath = `closing/${currentProject.id}/${type.replace(/\s+/g, '_')}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

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
                  id: crypto.randomUUID(),
                  type,
                  fileName: file.name,
                  fileUrl: downloadURL,
                  verifiedByLawyer: false,
                  uploadedAt: new Date(),
                },
              ],
            },
          };
        }
        return d;
      }));
      toast.success(`${type} uploaded securely.`);
    } catch {
      toast.error(`Upload failed. Please try again.`);
    } finally {
      setUploading(null);
    }
  };

  const handleLawyerVerify = (type: 'Title Insurance' | 'Closing Disclosure' | 'Wiring Instructions') => {
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
      {/* Hidden file input for document uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div>
        <h1 className="text-3xl font-normal tracking-tight text-text-primary">Purchase</h1>
        <p className="text-text-secondary mt-1">Legally binding checkpoint protecting Acquisition boundaries.</p>
      </div>

      {/* ── 70% Rule Audit — Top-level margin warning ── */}
      <Suspense fallback={<div className="h-40 animate-shimmer rounded-xl" />}>
        <SeventyPercentRuleAudit />
      </Suspense>

      {/* ── Closing Checklist — Must-complete validation ── */}
      <Suspense fallback={<div className="h-48 animate-shimmer rounded-xl" />}>
        <ClosingChecklist />
      </Suspense>

      {/* ── Cost Basis Ledger (3-part capitalization tracker) ── */}
      <Suspense fallback={<div className="h-60 animate-shimmer rounded-xl" />}>
        <CostBasisLedger />
      </Suspense>

      {/* ── Document Vault (Role-linked uploads) ── */}
      <Suspense fallback={<div className="h-48 animate-shimmer rounded-xl" />}>
        <DocumentVault />
      </Suspense>

      {/* ── Exit Cost Ledger (Broker Fees, Staging, Marketing) ── */}
      <Suspense fallback={<div className="h-48 animate-shimmer rounded-xl" />}>
        <ExitCostLedger />
      </Suspense>

      {/* ── DSCR Gauge — Underwriting check at purchase gate ── */}
      {dscrData && (
        <div className="space-y-3">
          <div className="border-b border-pw-border pb-2">
            <h3 className="text-sm font-medium text-text-primary tracking-tight">Underwriting Check</h3>
            <p className="text-xs text-text-secondary mt-0.5">Debt service coverage at purchase gate</p>
          </div>
          <DSCRGauge
            noi={dscrData.noi}
            annualDebtService={dscrData.annualDebtService}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Document Collection Grid */}
        <div className="lg:col-span-8 space-y-6">
           <div className="glass-card border border-pw-border p-6">
              <h3 className="text-lg font-medium tracking-tight border-b border-pw-border pb-4 mb-4">Required Legal Artifacts</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {(['Title Insurance', 'Closing Disclosure', 'Wiring Instructions'] as const).map(type => (
                   <div key={type} className={`border p-5 flex flex-col items-center justify-center text-center transition ${hasDoc(type) ? 'border-pw-border bg-white/5' : 'border-dashed border-pw-border hover:bg-white/5 cursor-pointer'}`} onClick={() => !hasDoc(type) && uploading !== type && handleDocumentUpload(type)}>
                      {uploading === type ? (
                         <div className="w-8 h-8 mb-2 animate-spin rounded-full border-b-2 border-indigo-500" />
                      ) : hasDoc(type) ? (
                         isDocVerified(type) ? <CheckCircle className="w-8 h-8 text-green-500 mb-2" /> : <FileSignature className="w-8 h-8 text-indigo-500 mb-2" />
                      ) : (
                         <UploadCloud className="w-8 h-8 text-text-secondary mb-2" />
                      )}
                      
                      <p className="text-sm font-medium text-text-primary">{type}</p>
                      <p className="text-xs uppercase tracking-wider text-text-secondary mt-1">
                        {hasDoc(type) ? (isDocVerified(type) ? 'VERIFIED' : 'PENDING REVIEW') : 'REQUIRED'}
                      </p>

                      {hasDoc(type) && !isDocVerified(type) && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleLawyerVerify(type); }}
                           className="mt-3 pw-interactive pw-btn pw-btn--secondary text-xs px-3 py-1"
                         >
                            Verify Document (Demo)
                         </button>
                      )}
                   </div>
                 ))}
              </div>
           </div>

            {/* Inspection Upload Module — Structural/Plumbing/Electrical */}
            <Suspense fallback={<div className="h-48 animate-shimmer rounded-xl" />}>
              <InspectionUploadModule />
            </Suspense>

            {/* Title Search Clearance Tracker */}
            <Suspense fallback={<div className="h-40 animate-shimmer rounded-xl" />}>
              <TitleSearchClearance />
            </Suspense>

           {/* Web3 Ping Interface */}
           <div className="bg-gradient-to-br from-[#0c1f2b] to-[#122837] border border-pw-border p-8 text-white relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex items-center space-x-2 mb-2">
                 <LinkIcon className="w-5 h-5 text-indigo-300" />
                 <h3 className="text-lg font-medium tracking-tight">Smart Contract Title Integrity</h3>
               </div>
               <p className="text-indigo-200 text-sm mb-6 max-w-lg">
                  Before releasing capital to wire, we check digital title hashes against the immutable ledger to confirm clean title before wiring funds.
               </p>
 
               {portal.blockchainTitleVerified ? (
                 <div className="p-4 bg-black/30 border border-indigo-500/30 flex items-center space-x-4">
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
                   className={`pw-interactive pw-btn pw-btn--primary text-sm ${isMining ? 'opacity-70' : ''} flex items-center`}
                 >
                   {isMining ? 'Verifying...' : 'Verify Title on Chain'}
                 </button>
               )}
             </div>
           </div>
        </div>

        {/* Lawyer Portal Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           <div className="glass-card border border-pw-border p-6">
              <div className="flex items-center space-x-2 border-b border-pw-border pb-4 mb-4">
                <Scale className="w-5 h-5 text-text-primary" />
                <h3 className="text-lg font-medium tracking-tight">Attorney Network</h3>
              </div>
              
              {!portal.assignedLawyerUid ? (
                 <>
                   <p className="text-sm text-text-secondary mb-6">Find licensed Title Attorneys in your state through PaperWorking's professional network.</p>
                   {availableLawyers.length === 0 ? (
                      <button 
                         onClick={searchLawyersData}
                         disabled={searchingLawyers}
                         className="pw-interactive pw-btn pw-btn--primary w-full py-2.5 text-sm"
                      >
                         {searchingLawyers ? 'Searching...' : <><Search className="w-4 h-4 mr-2 inline"/> Find Attorneys</>}
                      </button>
                   ) : (
                      <div className="space-y-3">
                        {availableLawyers.map(lw => (
                          <div key={lw.uid} className="p-3 border border-pw-border flex justify-between items-center bg-white/5">
                            <div>
                              <p className="text-sm font-medium">{lw.displayName}</p>
                              <p className="text-xs text-text-secondary">{lw.state} Licensed Attorney</p>
                            </div>
                            <button onClick={() => assignLawyer(lw.uid)} className="pw-interactive pw-btn pw-btn--secondary px-3 py-1 text-xs">
                               Assign
                            </button>
                          </div>
                        ))}
                      </div>
                   )}
                 </>
              ) : (
                 <div className="p-4 bg-white/5 border border-pw-border">
                    <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                    <p className="text-sm font-medium text-green-900">Attorney Assigned</p>
                    <p className="text-xs text-green-700 mt-1">Your assigned attorney is reviewing your closing docs and flagging anything that needs attention.</p>
                 </div>
              )}
            </div>

            {/* Deal Roster — External Stakeholder Directory */}
            <Suspense fallback={<div className="h-32 animate-shimmer rounded-xl" />}>
              <ProjectRoster projectId={currentProject.id} />
            </Suspense>
         </div>

      </div>
    </div>
  );
}
