'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspaceProject } from '../layout';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { FileText, Download, Calendar, User } from 'lucide-react';

export default function ProjectDataRoomPage() {
  const { project, loading } = useWorkspaceProject();
  const [subDocList, setSubDocList] = useState<any[]>([]);

  useEffect(() => {
    if (!project?.id) return;
    const fetchSubDocs = async () => {
      try {
        const ref = collection(db, 'projects', project.id, 'documents');
        const snap = await getDocs(ref);
        const docs = snap.docs.map(d => d.data());
        setSubDocList(docs);
      } catch (err) {
        console.error('Failed to load subDocs:', err);
      }
    };
    fetchSubDocs();
  }, [project?.id]);

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

  // Build the list of documents grouped by source category/card
  const groups: { title: string; docs: any[] }[] = [];

  // Transaction Documents
  const transDocs = [];
  if (financials.psaDocumentUrl) {
    transDocs.push({
      name: financials.psaFileName || 'Executed_PSA.pdf',
      url: financials.psaDocumentUrl,
      source: 'Purchase & Sale Agreement',
      uploadedBy: 'System/User',
      uploadedAt: financials.psaUploadedAt || project.updatedAt,
    });
  }
  if (financials.emdReceiptUrl) {
    transDocs.push({
      name: 'EMD_Deposit_Receipt.pdf',
      url: financials.emdReceiptUrl,
      source: 'Earnest Money Deposit (EMD)',
      uploadedBy: 'Escrow/User',
      uploadedAt: financials.emdVerifiedAt || project.updatedAt,
    });
  }
  if (transDocs.length > 0) {
    groups.push({ title: 'Transaction & Escrow Documents', docs: transDocs });
  }

  // Title Search
  const titleDocs = [];
  if (financials.titleDocumentUrl) {
    titleDocs.push({
      name: 'Title_Commitment_Report.pdf',
      url: financials.titleDocumentUrl,
      source: 'Title Search & Escrow Tracker',
      uploadedBy: 'Title Company',
      uploadedAt: financials.titleCommitmentDate || project.updatedAt,
    });
  }
  if (titleDocs.length > 0) {
    groups.push({ title: 'Title Search Documents', docs: titleDocs });
  }

  // Due Diligence
  const ddDocs = [];
  if (financials.surveyDocumentUrl) {
    ddDocs.push({
      name: 'Survey_Plat_Map.pdf',
      url: financials.surveyDocumentUrl,
      source: 'Property Survey Card',
      uploadedBy: 'Surveyor / User',
      uploadedAt: financials.surveyCompletedDate || project.updatedAt,
    });
  }
  if (financials.phaseIDocumentUrl) {
    ddDocs.push({
      name: 'Phase_I_Environmental.pdf',
      url: financials.phaseIDocumentUrl,
      source: 'Phase I Environmental ESA Card',
      uploadedBy: 'Environmental Consultant',
      uploadedAt: financials.phaseICompletedDate || project.updatedAt,
    });
  }
  if (financials.hoaDocumentUrl) {
    ddDocs.push({
      name: 'HOA_CC_Rs.pdf',
      url: financials.hoaDocumentUrl,
      source: 'HOA Due Diligence Card',
      uploadedBy: 'HOA Audit Experts',
      uploadedAt: financials.hoaCompletedDate || project.updatedAt,
    });
  }
  if (financials.attorneyDocumentUrl) {
    ddDocs.push({
      name: 'Attorney_Review_Letter.pdf',
      url: financials.attorneyDocumentUrl,
      source: 'Attorney Representation Card',
      uploadedBy: 'Closing Attorney',
      uploadedAt: financials.attorneyCompletedDate || project.updatedAt,
    });
  }
  if (ddDocs.length > 0) {
    groups.push({ title: 'Due Diligence Checklists', docs: ddDocs });
  }

  // Compliance & Operations
  const compDocs = [];
  if (financials.zoningDocumentUrl) {
    compDocs.push({
      name: 'Zoning_CO_Compliance.pdf',
      url: financials.zoningDocumentUrl,
      source: 'Zoning & Permitting Card',
      uploadedBy: 'Zoning Consultant',
      uploadedAt: financials.zoningDate || project.updatedAt,
    });
  }
  if (financials.insuranceQuoteUrl) {
    compDocs.push({
      name: 'Insurance_Carrier_Quote.pdf',
      url: financials.insuranceQuoteUrl,
      source: 'Hazard Insurance Binder Card',
      uploadedBy: 'Insurance Carrier',
      uploadedAt: project.updatedAt,
    });
  }
  if (compDocs.length > 0) {
    groups.push({ title: 'Compliance & Operations Documents', docs: compDocs });
  }

  // Debt Documents
  const debtDocs = subDocList.filter(d => d.category === 'Debt');
  if (debtDocs.length > 0) {
    groups.push({
      title: 'Debt Documents',
      docs: debtDocs.map(d => ({
        name: d.fileName,
        url: d.fileUrl,
        source: 'Lender Checklist',
        uploadedBy: d.uploadedByName || 'User',
        uploadedAt: d.uploadedAt,
        notes: d.notes,
      })),
    });
  }

  // Dossier Snapshots
  const dossierDocs = subDocList.filter(d => d.category === 'Dossier Snapshot' || d.category === 'Other');
  if (dossierDocs.length > 0) {
    groups.push({
      title: 'Phase Gate Dossier Snapshots',
      docs: dossierDocs.map(d => ({
        name: d.fileName,
        url: d.fileUrl,
        source: 'Acquisition Phase Gate Advance',
        uploadedBy: d.uploadedByName || 'System',
        uploadedAt: d.uploadedAt,
        notes: d.notes,
      })),
    });
  }

  // General Vault / Role Linked Documents
  const vaultDocs = project.roleLinkedDocuments || [];
  if (vaultDocs.length > 0) {
    groups.push({
      title: 'General Project Documents',
      docs: vaultDocs.map(d => ({
        name: d.fileName,
        url: d.fileUrl,
        source: `Role Link: ${d.linkedRole}`,
        uploadedBy: d.uploadedByName || 'User',
        uploadedAt: d.uploadedAt,
      })),
    });
  }

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
