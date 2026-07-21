'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspaceProject } from '../layout';
import { useAuth } from '@/context/AuthContext';
import { FileText, Download, Calendar, User } from 'lucide-react';

export default function ProjectDataRoomPage() {
  const { project, loading } = useWorkspaceProject();
  const { user } = useAuth();
  const [subDocList, setSubDocList] = useState<any[]>([]);

  useEffect(() => {
    if (!project?.id) return;
    const fetchSubDocs = async () => {
      try {
        const token = await user?.getIdToken();
        const res = await fetch(`/api/projects/${project.id}/documents`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        setSubDocList(data.documents || []);
      } catch (err) {
        console.error('Failed to load subDocs:', err);
      }
    };
    fetchSubDocs();
  }, [project?.id, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#454955] border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center text-[#9E9DA0]">Project not found</div>;
  }

  const financials = (project.financials as any) || {};

  function getFolderForDocument(doc: any): 'Capital Plan' | 'Equity' | 'Debt' | 'Title & Insurance' | 'Closing' {
    if (doc.folderName) {
      const name = String(doc.folderName).trim();
      if (['Capital Plan', 'Equity', 'Debt', 'Title & Insurance', 'Closing'].includes(name)) {
        return name as any;
      }
    }

    const ocrType = (doc.ocrDocumentType || doc.documentType || '').toLowerCase();
    const category = (doc.category || '').toLowerCase();
    const name = (doc.name || doc.fileName || '').toLowerCase();
    const notes = (doc.notes || '').toLowerCase();

    // Debt (lender package, estimates, appraisal, commitment)
    if (
      ocrType === 'appraisal' ||
      category === 'appraisal' ||
      name.includes('appraisal') ||
      name.includes('lender') ||
      name.includes('loan_estimate') ||
      name.includes('loan estimate') ||
      name.includes('debt') ||
      name.includes('commitment') ||
      category === 'debt'
    ) {
      return 'Debt';
    }

    // Title & Insurance
    if (
      ocrType === 'title_report' ||
      category === 'title report' ||
      category === 'inspection report' ||
      ocrType === 'inspection' ||
      category === 'permit' ||
      ocrType === 'permit' ||
      name.includes('title') ||
      name.includes('survey') ||
      name.includes('environmental') ||
      name.includes('phase_i') ||
      name.includes('insurance') ||
      name.includes('zoning') ||
      name.includes('hoa') ||
      category === 'title & insurance' ||
      category === 'title search' ||
      category === 'compliance & operations'
    ) {
      return 'Title & Insurance';
    }

    // Equity (agreements, subscriptions)
    if (
      category === 'equity' ||
      category === 'subscription' ||
      doc.id?.startsWith('sub_agreement_') ||
      name.includes('subscription') ||
      name.includes('partnership')
    ) {
      return 'Equity';
    }

    // Capital Plan (proof of funds)
    if (
      category === 'capital plan' ||
      category === 'proof of funds' ||
      notes.includes('capital stack') ||
      name.includes('capital-stack') ||
      name.includes('proof-of-funds') ||
      name.includes('capital_stack') ||
      category === 'proof_of_funds'
    ) {
      return 'Capital Plan';
    }

    // Closing (CD, executed set, recording)
    if (
      ocrType === 'closing_disclosure' ||
      category === 'hud-1 settlement statement' ||
      name.includes('closing') ||
      name.includes('deed') ||
      name.includes('executed') ||
      name.includes('recording') ||
      name.includes('disbursement') ||
      notes.includes('dossier snapshot') ||
      category === 'dossier snapshot' ||
      doc.id?.startsWith('closing_') ||
      name.includes('psa') ||
      name.includes('purchase_and_sale') ||
      name.includes('emd') ||
      category === 'transaction & escrow'
    ) {
      return 'Closing';
    }

    return 'Closing'; // Fallback
  }

  // Build the list of documents grouped by Fund taxonomy
  const groups: { title: string; docs: any[] }[] = [];
  const folderNames = ['Capital Plan', 'Equity', 'Debt', 'Title & Insurance', 'Closing'] as const;

  folderNames.forEach((folderName) => {
    const docsInFolder: any[] = [];

    // Map hardcoded project financials URLs
    if (folderName === 'Closing') {
      if (financials.psaDocumentUrl) {
        docsInFolder.push({
          name: financials.psaFileName || 'Executed_PSA.pdf',
          url: financials.psaDocumentUrl,
          source: 'Purchase & Sale Agreement',
          uploadedBy: 'System/User',
          uploadedAt: financials.psaUploadedAt || project.updatedAt,
        });
      }
      if (financials.emdReceiptUrl) {
        docsInFolder.push({
          name: 'EMD_Deposit_Receipt.pdf',
          url: financials.emdReceiptUrl,
          source: 'Earnest Money Deposit (EMD)',
          uploadedBy: 'Escrow/User',
          uploadedAt: financials.emdVerifiedAt || project.updatedAt,
        });
      }
    }

    if (folderName === 'Title & Insurance') {
      if (financials.titleDocumentUrl) {
        docsInFolder.push({
          name: 'Title_Commitment_Report.pdf',
          url: financials.titleDocumentUrl,
          source: 'Title Search & Escrow Tracker',
          uploadedBy: 'Title Company',
          uploadedAt: financials.titleCommitmentDate || project.updatedAt,
        });
      }
      if (financials.surveyDocumentUrl) {
        docsInFolder.push({
          name: 'Survey_Plat_Map.pdf',
          url: financials.surveyDocumentUrl,
          source: 'Property Survey Card',
          uploadedBy: 'Surveyor / User',
          uploadedAt: financials.surveyCompletedDate || project.updatedAt,
        });
      }
      if (financials.phaseIDocumentUrl) {
        docsInFolder.push({
          name: 'Phase_I_Environmental.pdf',
          url: financials.phaseIDocumentUrl,
          source: 'Phase I Environmental ESA Card',
          uploadedBy: 'Environmental Consultant',
          uploadedAt: financials.phaseICompletedDate || project.updatedAt,
        });
      }
      if (financials.hoaDocumentUrl) {
        docsInFolder.push({
          name: 'HOA_CC_Rs.pdf',
          url: financials.hoaDocumentUrl,
          source: 'HOA Due Diligence Card',
          uploadedBy: 'HOA Audit Experts',
          uploadedAt: financials.hoaCompletedDate || project.updatedAt,
        });
      }
      if (financials.zoningDocumentUrl) {
        docsInFolder.push({
          name: 'Zoning_CO_Compliance.pdf',
          url: financials.zoningDocumentUrl,
          source: 'Zoning & Permitting Card',
          uploadedBy: 'Zoning Consultant',
          uploadedAt: financials.zoningDate || project.updatedAt,
        });
      }
      if (financials.insuranceQuoteUrl) {
        docsInFolder.push({
          name: 'Insurance_Carrier_Quote.pdf',
          url: financials.insuranceQuoteUrl,
          source: 'Hazard Insurance Binder Card',
          uploadedBy: 'Insurance Carrier',
          uploadedAt: project.updatedAt,
        });
      }
    }

    // Map subcollection documents
    subDocList.forEach((d) => {
      if (getFolderForDocument(d) === folderName) {
        docsInFolder.push({
          name: d.name || d.fileName || 'Unnamed document',
          url: d.storageUrl || d.fileUrl || '',
          source: d.category || d.ocrDocumentType || 'Document',
          uploadedBy: d.uploadedByName || 'System',
          uploadedAt: d.uploadedAt || project.updatedAt,
          notes: d.notes,
        });
      }
    });

    // Map role linked documents
    const vaultDocs = project.roleLinkedDocuments || [];
    vaultDocs.forEach((d: any) => {
      if (getFolderForDocument({ ...d, category: d.linkedRole }) === folderName) {
        docsInFolder.push({
          name: d.fileName,
          url: d.fileUrl,
          source: `Role Link: ${d.linkedRole}`,
          uploadedBy: d.uploadedByName || 'User',
          uploadedAt: d.uploadedAt,
        });
      }
    });

    if (docsInFolder.length > 0) {
      groups.push({ title: folderName, docs: docsInFolder });
    }
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Project Data Room</h1>
        <p className="text-xs text-[#9E9DA0] mt-1">
          Secure, un-gated document vault containing the pro-forma of record, transactional agreements, and compliance audits.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/5 p-12 text-center text-[#9E9DA0]">
          <FileText className="w-12 h-12 mx-auto text-[#9E9DA0]/40 mb-4 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Documents Found</h3>
          <p className="text-[11px] text-[#9E9DA0]/60 mt-1">
            Data Room files will appear as you upload agreements or lock phase gates.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g, idx) => (
            <div key={idx} className="glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="bg-white/5 px-5 py-3 border-b border-white/5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{g.title}</h4>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {g.docs.map((doc, dIdx) => (
                  <div key={dIdx} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs font-semibold text-white">{doc.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#9E9DA0]">
                        <span className="bg-[#454955]/10 border border-[#454955]/20 text-[#9E9DA0] px-1.5 py-0.5 rounded uppercase font-bold text-[8px]">
                          {doc.source}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {doc.uploadedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {doc.notes && (
                        <p className="text-[10px] text-amber-200/80 italic font-medium leading-relaxed max-w-2xl mt-1">
                          Note: {doc.notes}
                        </p>
                      )}
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all self-start md:self-auto"
                    >
                      <Download size={10} /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
