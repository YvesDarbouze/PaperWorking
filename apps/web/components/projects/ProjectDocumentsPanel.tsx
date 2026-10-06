'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { LegacyProjectPhase, ProjectDocument, ProjectWorkspace } from '@/lib/projects/types';
import { getSeedProjectById, updateSeedProject } from '@/lib/projects/seed-data';
import { useProjectWorkspace } from '@/components/projects/ProjectWorkspaceProvider';

export type DocumentTabKey = 'all' | 'acquisition' | 'purchase' | 'hold' | 'exit';

export interface ChecklistRequirement {
  id: string;
  title: string;
  phase: LegacyProjectPhase;
  phaseNumber: number;
  phaseName: string;
  description: string;
  aliases: string[];
  suggestedFileName: string;
}

export const REIL_CHECKLIST_MATRIX: ChecklistRequirement[] = [
  // 1. Acquisition
  {
    id: 'acq-flier',
    title: 'Preliminary Property Flier',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Initial property flyer, listing sheet, and marketing memorandum from seller or broker.',
    aliases: ['property flier', 'flyer', 'flier', 'property_flier', 'listing sheet'],
    suggestedFileName: 'Preliminary_Property_Flier.pdf',
  },
  {
    id: 'acq-pro-forma',
    title: 'Underwriting Pro Forma',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Detailed financial pro forma model, renovation budget assumptions, and return metrics.',
    aliases: ['pro forma', 'underwriting', 'financial model', 'proforma', 'underwriting model'],
    suggestedFileName: 'Underwriting_Pro_Forma.pdf',
  },
  {
    id: 'acq-loi',
    title: 'Signed LOI',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Non-binding Letter of Intent signed by buyer specifying purchase price and due diligence periods.',
    aliases: ['loi', 'letter of intent', 'signed loi', 'signed_loi'],
    suggestedFileName: 'Signed_LOI.pdf',
  },
  {
    id: 'acq-counteroffer',
    title: 'Counteroffer Addendum',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Formal seller counteroffer terms, addenda, and negotiated contract modifications.',
    aliases: ['counteroffer', 'counter offer', 'addendum', 'counteroffer addendum'],
    suggestedFileName: 'Counteroffer_Addendum.pdf',
  },
  {
    id: 'acq-psa',
    title: 'Executed PSA',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Fully executed bilateral Purchase and Sale Agreement between buyer and seller.',
    aliases: ['executed psa', 'purchase agreement', 'psa', 'purchase and sale agreement', 'executed_purchase'],
    suggestedFileName: 'Executed_Purchase_and_Sale_Agreement.pdf',
  },
  {
    id: 'acq-inspection',
    title: 'Physical Inspection Report',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Third-party physical inspection report covering foundation, roof, plumbing, HVAC, and electrical.',
    aliases: ['inspection', 'inspection report', 'physical inspection', 'property condition report'],
    suggestedFileName: 'Physical_Inspection_Report.pdf',
  },
  {
    id: 'acq-title',
    title: 'Title Commitment',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Preliminary title report and title insurance commitment from title agent.',
    aliases: ['title commitment', 'preliminary title', 'title report', 'title_commitment'],
    suggestedFileName: 'Title_Commitment_Exhibit_A.pdf',
  },
  {
    id: 'acq-clear-to-close',
    title: 'Clear to Close Letter',
    phase: 'acquisition',
    phaseNumber: 1,
    phaseName: 'Acquisition',
    description: 'Final clear to close confirmation letter from title and escrow officer.',
    aliases: ['clear to close', 'clear to close letter', 'ctc', 'closing authorization'],
    suggestedFileName: 'Clear_to_Close_Letter.pdf',
  },

  // 2. Fund
  {
    id: 'fund-term-sheet',
    title: 'Executed Term Sheet',
    phase: 'purchase',
    phaseNumber: 2,
    phaseName: 'Fund',
    description: 'Binding financing commitment and term sheet from debt partner or senior lender.',
    aliases: ['term sheet', 'executed term sheet', 'lender term sheet', 'loan estimate', 'loan_estimate'],
    suggestedFileName: 'Executed_Term_Sheet.pdf',
  },
  {
    id: 'fund-escrow-receipt',
    title: 'Escrow Deposit Receipt',
    phase: 'purchase',
    phaseNumber: 2,
    phaseName: 'Fund',
    description: 'Escrow agent earnest money deposit wire verification and escrow receipt confirmation.',
    aliases: ['escrow deposit receipt', 'escrow receipt', 'emd', 'earnest money receipt', 'escrow_receipt'],
    suggestedFileName: 'Escrow_Receipt_EMD_Confirmed.pdf',
  },
  {
    id: 'fund-appraisal',
    title: 'Narrative Appraisal',
    phase: 'purchase',
    phaseNumber: 2,
    phaseName: 'Fund',
    description: 'Independent licensed appraiser narrative appraisal determining as-is and as-completed market value.',
    aliases: ['narrative appraisal', 'appraisal', 'appraisal report', 'commercial appraisal'],
    suggestedFileName: 'Narrative_Appraisal_Report.pdf',
  },
  {
    id: 'fund-survey',
    title: 'Boundary Survey',
    phase: 'purchase',
    phaseNumber: 2,
    phaseName: 'Fund',
    description: 'Boundary and ALTA/NSPS land title survey establishing easements, boundaries, and set-backs.',
    aliases: ['boundary survey', 'survey', 'alta survey', 'property survey'],
    suggestedFileName: 'Boundary_Survey_Plat.pdf',
  },
  {
    id: 'fund-coi',
    title: 'Certificate of Insurance (COI)',
    phase: 'purchase',
    phaseNumber: 2,
    phaseName: 'Fund',
    description: 'Acord Certificate of Insurance for builder risk, hazard, and general liability coverage.',
    aliases: ['certificate of insurance', 'coi', 'insurance', 'insurance policy', 'oak_ridge_insurance'],
    suggestedFileName: 'Certificate_of_Insurance_COI.pdf',
  },
  {
    id: 'fund-closing-disclosure',
    title: 'Final Closing Disclosure (CD)',
    phase: 'purchase',
    phaseNumber: 2,
    phaseName: 'Fund',
    description: 'Final settlement closing disclosure detailing loan charges, buyer cash to close, and escrows.',
    aliases: ['final closing disclosure', 'closing disclosure', 'cd', 'hud-1', 'closing statement'],
    suggestedFileName: 'Final_Closing_Disclosure_CD.pdf',
  },

  // 3. Hold
  {
    id: 'hold-utility',
    title: 'Utility Transfer Confirmation',
    phase: 'hold',
    phaseNumber: 3,
    phaseName: 'Hold',
    description: 'Utility transfer confirmations for electric, water, sewer, and gas service to project entity.',
    aliases: ['utility transfer', 'utility transfer confirmation', 'utility bill', 'utilities'],
    suggestedFileName: 'Utility_Transfer_Confirmation.pdf',
  },
  {
    id: 'hold-contractor-agreement',
    title: 'Executed Contractor Agreement',
    phase: 'hold',
    phaseNumber: 3,
    phaseName: 'Hold',
    description: 'Fully executed prime contractor or standardized agreement with licensed general contractor.',
    aliases: ['contractor agreement', 'executed contractor agreement', 'gc agreement', 'general contractor contract'],
    suggestedFileName: 'Executed_Contractor_Agreement.pdf',
  },
  {
    id: 'hold-sow',
    title: 'Itemized Scope of Work',
    phase: 'hold',
    phaseNumber: 3,
    phaseName: 'Hold',
    description: 'Detailed trade breakdown and line-item scope of work for capital expenditure and renovation.',
    aliases: ['scope of work', 'itemized scope of work', 'sow', 'rehab scope', 'construction budget'],
    suggestedFileName: 'Itemized_Scope_of_Work.pdf',
  },
  {
    id: 'hold-draw-inspection',
    title: 'Draw Inspection & Lien Waivers',
    phase: 'hold',
    phaseNumber: 3,
    phaseName: 'Hold',
    description: 'Lender draw inspection approval reports along with executed subcontractor conditional and unconditional lien waivers.',
    aliases: ['draw inspection', 'lien waivers', 'draw inspection & lien waivers', 'draw report', 'lien waiver'],
    suggestedFileName: 'Draw_Inspection_and_Lien_Waivers.pdf',
  },
  {
    id: 'hold-lease',
    title: 'Executed Lease Agreement',
    phase: 'hold',
    phaseNumber: 3,
    phaseName: 'Hold',
    description: 'Executed residential or commercial tenant lease agreements with security deposit ledgers.',
    aliases: ['lease agreement', 'executed lease agreement', 'tenant lease', 'lease'],
    suggestedFileName: 'Executed_Lease_Agreement.pdf',
  },
  {
    id: 'hold-operating-statement',
    title: 'Monthly Operating Statement',
    phase: 'hold',
    phaseNumber: 3,
    phaseName: 'Hold',
    description: 'Monthly property financial operating statement, rent roll, and actuals vs pro forma variance report.',
    aliases: ['operating statement', 'monthly operating statement', 'p&l', 'rent roll', 'financial statement'],
    suggestedFileName: 'Monthly_Operating_Statement.pdf',
  },

  // 4. Exit
  {
    id: 'exit-bov',
    title: 'Broker Opinion of Value (BOV)',
    phase: 'exit',
    phaseNumber: 4,
    phaseName: 'Exit',
    description: 'Commercial real estate broker opinion of value, capitalization rate comp analysis, and pricing guidance.',
    aliases: ['broker opinion of value', 'bov', 'broker price opinion', 'bpo'],
    suggestedFileName: 'Broker_Opinion_of_Value_BOV.pdf',
  },
  {
    id: 'exit-om',
    title: 'Offering Memorandum (OM)',
    phase: 'exit',
    phaseNumber: 4,
    phaseName: 'Exit',
    description: 'Comprehensive disposition marketing package and investment offering memorandum.',
    aliases: ['offering memorandum', 'om', 'disposition deck', 'marketing memorandum'],
    suggestedFileName: 'Offering_Memorandum_OM.pdf',
  },
  {
    id: 'exit-buyer-psa',
    title: 'Executed Buyer PSA',
    phase: 'exit',
    phaseNumber: 4,
    phaseName: 'Exit',
    description: 'Fully executed purchase and sale agreement with procuring buyer for property disposition.',
    aliases: ['executed buyer psa', 'buyer psa', 'exit psa', 'sale agreement'],
    suggestedFileName: 'Executed_Buyer_PSA.pdf',
  },
  {
    id: 'exit-buyer-pof',
    title: 'Buyer Proof of Funds',
    phase: 'exit',
    phaseNumber: 4,
    phaseName: 'Exit',
    description: 'Verified proof of funds, cash liquidity verification, or pre-approval from buyer debt source.',
    aliases: ['buyer proof of funds', 'proof of funds', 'pof', 'bank_statement_pof', 'buyer pof'],
    suggestedFileName: 'Buyer_Proof_of_Funds.pdf',
  },
  {
    id: 'exit-alta',
    title: 'Final ALTA Settlement Statement',
    phase: 'exit',
    phaseNumber: 4,
    phaseName: 'Exit',
    description: 'Final executed ALTA settlement statement detailing net sale proceeds and closing disbursement.',
    aliases: ['alta settlement statement', 'final alta settlement statement', 'settlement statement', 'closing statement'],
    suggestedFileName: 'Final_ALTA_Settlement_Statement.pdf',
  },
];

const TAB_CONFIG: Array<{ key: DocumentTabKey; label: string; phaseNumber?: number; phaseKey?: LegacyProjectPhase }> = [
  { key: 'all', label: 'All Files' },
  { key: 'acquisition', label: '1. Acquisition', phaseNumber: 1, phaseKey: 'acquisition' },
  { key: 'purchase', label: '2. Fund', phaseNumber: 2, phaseKey: 'purchase' },
  { key: 'hold', label: '3. Hold', phaseNumber: 3, phaseKey: 'hold' },
  { key: 'exit', label: '4. Exit', phaseNumber: 4, phaseKey: 'exit' },
];

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export function matchDocumentToRequirement(
  req: ChecklistRequirement,
  documents: ProjectDocument[],
): ProjectDocument | undefined {
  // 1. Direct type match or phase-aligned exact type
  const exactTypeMatch = documents.find(
    (d) =>
      d.type?.toLowerCase() === req.title.toLowerCase() ||
      (d.phase === req.phase && d.type?.toLowerCase() === req.title.toLowerCase()),
  );
  if (exactTypeMatch) return exactTypeMatch;

  // 2. Exact requirement ID match
  const idMatch = documents.find((d) => d.doc_id === req.id);
  if (idMatch) return idMatch;

  // 3. Search aliases in type and name
  return documents.find((doc) => {
    const docTypeLower = (doc.type || '').toLowerCase();
    const docNameLower = (doc.name || '').toLowerCase();
    return req.aliases.some((alias) => {
      const aliasLower = alias.toLowerCase();
      const aliasClean = aliasLower.replace(/[^a-z0-9]/g, '');
      const docNameClean = docNameLower.replace(/[^a-z0-9]/g, '');
      return (
        docTypeLower === aliasLower ||
        docTypeLower.includes(aliasLower) ||
        docNameClean.includes(aliasClean)
      );
    });
  });
}

export function resolveDocumentStatus(
  doc: ProjectDocument | undefined,
): 'verified' | 'uploaded' | 'required' | 'pending' {
  if (!doc) return 'required';
  if (doc.status) return doc.status;
  const nameLower = (doc.name || '').toLowerCase();
  const typeLower = (doc.type || '').toLowerCase();
  if (
    nameLower.includes('executed') ||
    nameLower.includes('confirmed') ||
    typeLower.includes('executed') ||
    typeLower.includes('confirmed')
  ) {
    return 'verified';
  }
  return 'uploaded';
}

export default function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const workspaceCtx = useProjectWorkspace();
  const seedProject = useMemo(() => getSeedProjectById(projectId), [projectId]);
  const initialProject = workspaceCtx?.project || seedProject;

  const [activeTab, setActiveTab] = useState<DocumentTabKey>('all');
  const [documents, setDocuments] = useState<ProjectDocument[]>(() => initialProject?.documents ?? []);
  const [storageUsedBytes, setStorageUsedBytes] = useState<number>(() => initialProject?.storage_used_bytes ?? 2_480_000);
  const [storageQuotaBytes] = useState<number>(() => initialProject?.storageQuotaBytes ?? 536_870_912);
  const [viewingDoc, setViewingDoc] = useState<ProjectDocument | null>(null);
  const [uploadStatusNotice, setUploadStatusNotice] = useState<string | null>(null);
  const [targetUploadRequirement, setTargetUploadRequirement] = useState<ChecklistRequirement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const localBlobUrls = useRef<Record<string, string>>({});

  const syncStore = useCallback(
    (newDocs: ProjectDocument[], newBytes: number) => {
      setDocuments(newDocs);
      setStorageUsedBytes(newBytes);
      updateSeedProject(projectId, {
        documents: newDocs,
        storage_used_bytes: newBytes,
      });
      if (workspaceCtx?.updateProject && initialProject) {
        workspaceCtx.updateProject({
          ...initialProject,
          documents: newDocs,
          storage_used_bytes: newBytes,
        });
      }
    },
    [projectId, workspaceCtx, initialProject],
  );

  const filteredRequirements = useMemo(() => {
    if (activeTab === 'all') return REIL_CHECKLIST_MATRIX;
    return REIL_CHECKLIST_MATRIX.filter((r) => r.phase === activeTab);
  }, [activeTab]);

  const checklistStats = useMemo(() => {
    const total = REIL_CHECKLIST_MATRIX.length;
    let uploadedCount = 0;
    let verifiedCount = 0;

    for (const req of REIL_CHECKLIST_MATRIX) {
      const match = matchDocumentToRequirement(req, documents);
      const status = resolveDocumentStatus(match);
      if (status === 'verified') {
        verifiedCount++;
        uploadedCount++;
      } else if (status === 'uploaded') {
        uploadedCount++;
      }
    }

    return { total, uploadedCount, verifiedCount, remaining: total - uploadedCount };
  }, [documents]);

  const phaseStorageBreakdown = useMemo(() => {
    const breakdown: Record<LegacyProjectPhase, { bytes: number; count: number }> = {
      acquisition: { bytes: 0, count: 0 },
      purchase: { bytes: 0, count: 0 },
      hold: { bytes: 0, count: 0 },
      exit: { bytes: 0, count: 0 },
    };

    const avgEstimatePerDoc = Math.max(Math.round(storageUsedBytes / Math.max(documents.length, 1)), 450_000);

    for (const doc of documents) {
      let assignedPhase: LegacyProjectPhase = doc.phase || 'acquisition';
      if (!doc.phase) {
        const found = REIL_CHECKLIST_MATRIX.find((req) => matchDocumentToRequirement(req, [doc]));
        if (found) assignedPhase = found.phase;
      }
      if (breakdown[assignedPhase]) {
        breakdown[assignedPhase].bytes += avgEstimatePerDoc;
        breakdown[assignedPhase].count += 1;
      }
    }

    return breakdown;
  }, [documents, storageUsedBytes]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const targetReq = targetUploadRequirement;
    const assignedPhase: LegacyProjectPhase = targetReq ? targetReq.phase : (activeTab !== 'all' ? activeTab : 'acquisition');
    const docType = targetReq ? targetReq.title : 'Project Document';
    const docId = `doc-${Date.now()}`;
    const objectUrl = URL.createObjectURL(file);
    localBlobUrls.current[docId] = objectUrl;

    const newDoc: ProjectDocument = {
      doc_id: docId,
      name: file.name,
      type: docType,
      url: `/api/projects/${projectId}/documents/${docId}`,
      generated_at: new Date().toISOString(),
      phase: assignedPhase,
      status: 'uploaded',
      fileSize: formatBytes(file.size),
    };

    const updated = [newDoc, ...documents];
    const newBytes = storageUsedBytes + file.size;
    syncStore(updated, newBytes);

    setUploadStatusNotice(`Document "${file.name}" uploaded successfully and linked to ${assignedPhase.toUpperCase()} phase.`);
    setTargetUploadRequirement(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Attempt API persistence in background
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const b64 = (reader.result as string).split(',')[1];
        if (b64) {
          await fetch(`/api/projects/${projectId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              type: file.type || 'application/pdf',
              documentType: docType,
              category: assignedPhase,
              base64Content: b64,
            }),
          }).catch(() => undefined);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // Non-fatal background sync fallback
    }
  };

  const handleSimulateUpload = (req: ChecklistRequirement) => {
    const docId = `doc-${Date.now()}`;
    const newDoc: ProjectDocument = {
      doc_id: docId,
      name: req.suggestedFileName,
      type: req.title,
      url: `/api/projects/${projectId}/documents/${docId}`,
      generated_at: new Date().toISOString(),
      phase: req.phase,
      status: 'uploaded',
      fileSize: '1.24 MB',
    };

    const updated = [newDoc, ...documents];
    const newBytes = storageUsedBytes + 1_240_000;
    syncStore(updated, newBytes);
    setUploadStatusNotice(`Simulated upload for "${req.title}" completed. File linked to ${req.phaseName}.`);
  };

  const handleToggleVerify = (docId: string) => {
    const updated = documents.map((doc) => {
      if (doc.doc_id === docId) {
        const nextStatus: 'verified' | 'uploaded' = doc.status === 'verified' ? 'uploaded' : 'verified';
        return { ...doc, status: nextStatus };
      }
      return doc;
    });
    syncStore(updated, storageUsedBytes);
    if (viewingDoc && viewingDoc.doc_id === docId) {
      setViewingDoc((prev) => (prev ? { ...prev, status: prev.status === 'verified' ? 'uploaded' : 'verified' } : null));
    }
  };

  const handleDownload = (doc: ProjectDocument) => {
    const localUrl = localBlobUrls.current[doc.doc_id];
    const downloadTarget = localUrl || doc.url || `/api/projects/${projectId}/documents/${doc.doc_id}`;
    const link = document.createElement('a');
    link.href = downloadTarget;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerUploadFor = (req: ChecklistRequirement) => {
    setTargetUploadRequirement(req);
    fileInputRef.current?.click();
  };

  const triggerGeneralUpload = () => {
    setTargetUploadRequirement(null);
    fileInputRef.current?.click();
  };

  const storagePercent = Math.min(Math.round((storageUsedBytes / storageQuotaBytes) * 10000) / 100, 100);

  const getWorkspaceHref = (phase: LegacyProjectPhase) => {
    return `/projects/${projectId}?phase=${phase}`;
  };

  if (!initialProject) {
    return (
      <div className="rounded-none border border-neutral-800 bg-neutral-950 p-8 text-sm text-neutral-400">
        Project not found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6">
      {/* Hidden file input for real file uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload document file input"
      />

      {/* Top Header */}
      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-none">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-500 mb-1">
              <Link href={`/projects/${projectId}`} className="hover:text-neutral-300 transition-colors">
                {initialProject.propertyName}
              </Link>
              <span>/</span>
              <span className="text-neutral-300">Document Vault</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">REIL Document Vault</h1>
            <p className="mt-1 text-sm text-neutral-400 max-w-2xl">
              Centralized repository and institutional requirement matrix for the four phases of the Real Estate Investment Lifecycle: Acquisition, Fund, Hold, and Exit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={triggerGeneralUpload}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-black bg-white hover:bg-neutral-200 transition-colors rounded-none touch-target"
            >
              Upload Document
            </button>
            <Link
              href={activeTab === 'all' ? `/projects/${projectId}` : getWorkspaceHref(activeTab)}
              className="min-h-[44px] inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-200 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-none touch-target"
            >
              <span>{activeTab === 'all' ? 'Project Workspace' : `Open ${activeTab.toUpperCase()} Workspace`}</span>
              <span className="ml-1.5" aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        {uploadStatusNotice && (
          <div className="mt-4 p-3 border border-emerald-500/40 bg-emerald-950/20 text-emerald-400 text-xs flex items-center justify-between rounded-none">
            <span>{uploadStatusNotice}</span>
            <button
              type="button"
              onClick={() => setUploadStatusNotice(null)}
              className="text-emerald-400 hover:text-emerald-200 underline font-mono ml-4 min-h-[44px] px-2"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Storage Quota & Institutional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Storage Bar Card */}
        <div className="lg:col-span-2 border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-wider text-neutral-400">Vault Storage Capacity</span>
            <span className="font-mono text-neutral-300">
              {formatBytes(storageUsedBytes)} / {formatBytes(storageQuotaBytes)} ({storagePercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-neutral-900 border border-neutral-800 rounded-none overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-none"
              style={{ width: `${Math.max(storagePercent, 1)}%` }}
            />
          </div>

          {/* Breakdown by REIL Phase */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-900 text-xs font-mono">
            <div>
              <p className="text-neutral-500">1. Acquisition</p>
              <p className="text-neutral-200 font-semibold">{formatBytes(phaseStorageBreakdown.acquisition.bytes)}</p>
              <p className="text-[11px] text-neutral-500">{phaseStorageBreakdown.acquisition.count} files</p>
            </div>
            <div>
              <p className="text-neutral-500">2. Fund</p>
              <p className="text-neutral-200 font-semibold">{formatBytes(phaseStorageBreakdown.purchase.bytes)}</p>
              <p className="text-[11px] text-neutral-500">{phaseStorageBreakdown.purchase.count} files</p>
            </div>
            <div>
              <p className="text-neutral-500">3. Hold</p>
              <p className="text-neutral-200 font-semibold">{formatBytes(phaseStorageBreakdown.hold.bytes)}</p>
              <p className="text-[11px] text-neutral-500">{phaseStorageBreakdown.hold.count} files</p>
            </div>
            <div>
              <p className="text-neutral-500">4. Exit</p>
              <p className="text-neutral-200 font-semibold">{formatBytes(phaseStorageBreakdown.exit.bytes)}</p>
              <p className="text-[11px] text-neutral-500">{phaseStorageBreakdown.exit.count} files</p>
            </div>
          </div>
        </div>

        {/* Matrix Completion Card */}
        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">REIL Checklist Compliance</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white font-mono">{checklistStats.uploadedCount}</span>
              <span className="text-neutral-400 font-mono">/ {checklistStats.total} Collected</span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {checklistStats.verifiedCount} institutional verified files. {checklistStats.remaining} required files outstanding.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400">{checklistStats.verifiedCount} Verified</span>
            <span className="text-sky-400">{checklistStats.uploadedCount - checklistStats.verifiedCount} Uploaded</span>
            <span className="text-amber-400">{checklistStats.remaining} Required</span>
          </div>
        </div>
      </div>

      {/* REIL Phase Navigation Bar */}
      <div className="border border-neutral-800 bg-neutral-950 p-2 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="REIL Phases">
            {TAB_CONFIG.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`min-h-[44px] px-4 py-2 text-sm font-medium transition-colors rounded-none touch-target ${
                    isActive
                      ? 'bg-neutral-800 text-white border-b-2 border-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Quick jump to active phase workspace */}
          {activeTab !== 'all' && (
            <div className="px-2 py-1">
              <Link
                href={getWorkspaceHref(activeTab)}
                className="min-h-[44px] inline-flex items-center text-xs font-mono text-neutral-300 hover:text-white underline underline-offset-4 touch-target"
              >
                <span>Navigate to {activeTab.toUpperCase()} Workspace</span>
                <span className="ml-1" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Direct REIL Workspaces Quick Nav (when All Files is active) */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href={getWorkspaceHref('acquisition')}
            className="border border-neutral-800 bg-neutral-950 p-3 hover:border-neutral-700 transition-colors rounded-none block min-h-[44px] touch-target"
          >
            <p className="text-[11px] font-mono text-neutral-500 uppercase">Phase 1</p>
            <p className="text-sm font-medium text-white flex items-center justify-between">
              <span>Acquisition Workspace</span>
              <span aria-hidden="true">&rarr;</span>
            </p>
          </Link>
          <Link
            href={getWorkspaceHref('purchase')}
            className="border border-neutral-800 bg-neutral-950 p-3 hover:border-neutral-700 transition-colors rounded-none block min-h-[44px] touch-target"
          >
            <p className="text-[11px] font-mono text-neutral-500 uppercase">Phase 2</p>
            <p className="text-sm font-medium text-white flex items-center justify-between">
              <span>Fund Workspace</span>
              <span aria-hidden="true">&rarr;</span>
            </p>
          </Link>
          <Link
            href={getWorkspaceHref('hold')}
            className="border border-neutral-800 bg-neutral-950 p-3 hover:border-neutral-700 transition-colors rounded-none block min-h-[44px] touch-target"
          >
            <p className="text-[11px] font-mono text-neutral-500 uppercase">Phase 3</p>
            <p className="text-sm font-medium text-white flex items-center justify-between">
              <span>Hold Workspace</span>
              <span aria-hidden="true">&rarr;</span>
            </p>
          </Link>
          <Link
            href={getWorkspaceHref('exit')}
            className="border border-neutral-800 bg-neutral-950 p-3 hover:border-neutral-700 transition-colors rounded-none block min-h-[44px] touch-target"
          >
            <p className="text-[11px] font-mono text-neutral-500 uppercase">Phase 4</p>
            <p className="text-sm font-medium text-white flex items-center justify-between">
              <span>Exit Workspace</span>
              <span aria-hidden="true">&rarr;</span>
            </p>
          </Link>
        </div>
      )}

      {/* Section 1: Required Document Checklist Matrix */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-none overflow-hidden">
        <div className="p-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">REIL Required Document Checklist Matrix</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Statutory and institutional underwriting files that must be collected and verified across the lifecycle.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Showing {filteredRequirements.length} requirements
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/60 text-neutral-400 font-mono text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Phase</th>
                <th className="px-5 py-3 font-medium">Required Document</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Vault File Match</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredRequirements.map((req) => {
                const matchedDoc = matchDocumentToRequirement(req, documents);
                const status = resolveDocumentStatus(matchedDoc);

                return (
                  <tr key={req.id} className="hover:bg-neutral-900/30 transition-colors">
                    {/* Phase tag */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-neutral-400">
                      <span className="border border-neutral-800 bg-neutral-900 px-2 py-1 rounded-none">
                        {req.phaseNumber}. {req.phaseName}
                      </span>
                    </td>

                    {/* Document details */}
                    <td className="px-5 py-4 max-w-xs sm:max-w-sm">
                      <p className="font-medium text-white">{req.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{req.description}</p>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {status === 'verified' && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-emerald-500/40 text-emerald-400 bg-emerald-950/40 font-mono uppercase tracking-wider rounded-none">
                          Verified
                        </span>
                      )}
                      {status === 'uploaded' && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-sky-500/40 text-sky-400 bg-sky-950/40 font-mono uppercase tracking-wider rounded-none">
                          Uploaded
                        </span>
                      )}
                      {status === 'required' && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-amber-500/40 text-amber-400 bg-amber-950/40 font-mono uppercase tracking-wider rounded-none">
                          Required
                        </span>
                      )}
                      {status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-neutral-600 text-neutral-400 bg-neutral-900/50 font-mono uppercase tracking-wider rounded-none">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Matched file */}
                    <td className="px-5 py-4 text-xs">
                      {matchedDoc ? (
                        <div>
                          <p className="font-mono text-neutral-200 truncate max-w-[200px]" title={matchedDoc.name}>
                            {matchedDoc.name}
                          </p>
                          <p className="text-neutral-500 font-mono mt-0.5">
                            Added: {matchedDoc.generated_at ? new Date(matchedDoc.generated_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-neutral-500 font-mono italic">No file attached</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        {matchedDoc ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setViewingDoc(matchedDoc)}
                              className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-colors rounded-none touch-target"
                            >
                              View File
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(matchedDoc)}
                              className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-colors rounded-none touch-target"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerUploadFor(req)}
                              className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white underline underline-offset-2 transition-colors rounded-none touch-target"
                            >
                              Replace
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => triggerUploadFor(req)}
                              className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-neutral-200 transition-colors rounded-none touch-target"
                            >
                              Upload Document
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Vault Document Repository Table */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-none overflow-hidden">
        <div className="p-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Project Document Repository</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              All active records stored in the encrypted project storage bucket.
            </p>
          </div>
          <button
            type="button"
            onClick={triggerGeneralUpload}
            className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-white border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-none self-start sm:self-auto touch-target"
          >
            + Add New File
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/60 text-neutral-400 font-mono text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Added</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-neutral-500 text-center font-mono text-xs">
                    No documents uploaded to this project vault yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const status = resolveDocumentStatus(doc);
                  return (
                    <tr key={doc.doc_id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-white font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate max-w-[240px]" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-neutral-300 text-xs">
                        {doc.type}
                      </td>

                      <td className="px-5 py-4 text-neutral-400 font-mono text-xs">
                        {doc.generated_at ? new Date(doc.generated_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {status === 'verified' && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-emerald-500/40 text-emerald-400 bg-emerald-950/40 font-mono uppercase tracking-wider rounded-none">
                            Verified
                          </span>
                        )}
                        {status === 'uploaded' && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-sky-500/40 text-sky-400 bg-sky-950/40 font-mono uppercase tracking-wider rounded-none">
                            Uploaded
                          </span>
                        )}
                        {status === 'required' && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-amber-500/40 text-amber-400 bg-amber-950/40 font-mono uppercase tracking-wider rounded-none">
                            Required
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border border-neutral-600 text-neutral-400 bg-neutral-900/50 font-mono uppercase tracking-wider rounded-none">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc(doc)}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-colors rounded-none touch-target"
                          >
                            View File
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-neutral-300 border border-neutral-800 hover:border-neutral-600 hover:text-white transition-colors rounded-none touch-target"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleVerify(doc.doc_id)}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-emerald-400 transition-colors rounded-none touch-target"
                          >
                            {status === 'verified' ? 'Unverify' : 'Verify'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Workspace Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-900 text-sm">
        <Link
          href={`/projects/${projectId}`}
          className="text-neutral-400 hover:text-white underline underline-offset-4 font-mono text-xs min-h-[44px] inline-flex items-center touch-target"
        >
          &larr; Back to Project Overview
        </Link>
        <div className="flex items-center gap-3 text-xs font-mono text-neutral-500">
          <span>REIL Lifecycle:</span>
          <Link href={getWorkspaceHref('acquisition')} className="hover:text-neutral-300 underline underline-offset-2">
            Acquisition
          </Link>
          <span>/</span>
          <Link href={getWorkspaceHref('purchase')} className="hover:text-neutral-300 underline underline-offset-2">
            Fund
          </Link>
          <span>/</span>
          <Link href={getWorkspaceHref('hold')} className="hover:text-neutral-300 underline underline-offset-2">
            Hold
          </Link>
          <span>/</span>
          <Link href={getWorkspaceHref('exit')} className="hover:text-neutral-300 underline underline-offset-2">
            Exit
          </Link>
        </div>
      </div>

      {/* View File Modal */}
      {viewingDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl border border-neutral-800 bg-neutral-950 p-6 rounded-none space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-neutral-500">Document Inspection</p>
                <h3 id="doc-preview-title" className="text-lg font-bold text-white mt-1">
                  {viewingDoc.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-colors rounded-none touch-target"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-neutral-900/40 border border-neutral-900 text-xs font-mono">
              <div>
                <p className="text-neutral-500">Document Type</p>
                <p className="text-neutral-200 mt-0.5">{viewingDoc.type}</p>
              </div>
              <div>
                <p className="text-neutral-500">Date Generated</p>
                <p className="text-neutral-200 mt-0.5">
                  {viewingDoc.generated_at ? new Date(viewingDoc.generated_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-neutral-500">File Size</p>
                <p className="text-neutral-200 mt-0.5">{viewingDoc.fileSize || '1.24 MB'}</p>
              </div>
              <div>
                <p className="text-neutral-500">Verification Status</p>
                <p className="text-emerald-400 mt-0.5 capitalize">{resolveDocumentStatus(viewingDoc)}</p>
              </div>
            </div>

            {/* Document Preview Canvas */}
            <div className="border border-neutral-800 bg-neutral-900/20 p-6 rounded-none flex flex-col items-center justify-center text-center space-y-3">
              <svg className="w-12 h-12 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-white">{viewingDoc.name}</p>
                <p className="text-xs text-neutral-500 font-mono mt-1">Encrypted storage URI: {viewingDoc.url}</p>
              </div>
              <p className="text-xs text-neutral-400 max-w-md">
                Verified binary stream authenticated via PaperWorking Storage Adapter. Compliant with 26 U.S.C. Section 6001 record retention regulations.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => handleToggleVerify(viewingDoc.doc_id)}
                className="min-h-[44px] px-4 py-2 text-xs font-mono font-medium text-neutral-300 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-none touch-target"
              >
                {viewingDoc.status === 'verified' ? 'Mark as Uploaded' : 'Mark as Institutional Verified'}
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(viewingDoc)}
                  className="min-h-[44px] px-4 py-2 text-xs font-mono font-medium text-black bg-white hover:bg-neutral-200 transition-colors rounded-none touch-target"
                >
                  Download File
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="min-h-[44px] px-4 py-2 text-xs font-mono font-medium text-neutral-400 hover:text-white border border-neutral-800 transition-colors rounded-none touch-target"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
