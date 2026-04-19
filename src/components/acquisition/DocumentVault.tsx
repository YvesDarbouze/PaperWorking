'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  Shield,
  ChevronDown,
  ChevronRight,
  Trash2,
  User,
} from 'lucide-react';
import type { RoleLinkedDocument, DocumentCategory, ProjectRole, ProjectTeamMember } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Document Vault — Phase 2 (Acquisition & Due Diligence)
   Upload zones specifically linked to the Deal Roster.
   Each document category is tied to a responsible ProjectRole.
   ═══════════════════════════════════════════════════════ */

// ── Document slots: category → responsible role ─────────
interface DocSlot {
  category: DocumentCategory;
  role: ProjectRole;
  description: string;
}

const DOCUMENT_SLOTS: DocSlot[] = [
  { category: 'Appraisal Report', role: 'Appraiser', description: 'Property appraisal for lender or investor review' },
  { category: 'Inspection Report', role: 'Closing Agent', description: 'Structural, plumbing, electrical, and environmental reports' },
  { category: 'Title Commitment', role: 'Title Company/Escrow Officer', description: 'Preliminary title report verifying ownership chain' },
  { category: 'Survey', role: 'Title Company/Escrow Officer', description: 'Boundary lines, easements, and encroachments survey' },
  { category: 'Insurance Binder', role: 'Closing Agent', description: 'Proof of property insurance before closing' },
  { category: 'Loan Estimate', role: 'Loan Officer/Broker', description: 'Lender-issued cost breakdown and loan terms' },
  { category: 'Closing Disclosure', role: 'Loan Processor', description: 'Final loan terms, fees, and settlement amounts' },
  { category: 'Environmental Report', role: 'Appraiser', description: 'Phase I or Phase II environmental site assessment' },
];

function findRosterMember(dealTeam: ProjectTeamMember[] | undefined, role: ProjectRole): ProjectTeamMember | undefined {
  return dealTeam?.find(m => m.projectRole === role && m.status === 'active');
}

function getStatusBadge(doc: RoleLinkedDocument | undefined) {
  if (!doc) return { label: 'AWAITING UPLOAD', color: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (doc.verified) return { label: 'VERIFIED', color: 'bg-green-50 text-green-700 border-green-200' };
  return { label: 'UPLOADED · PENDING REVIEW', color: 'bg-amber-50 text-amber-700 border-amber-200' };
}

export default function DocumentVault() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateRoleDocuments = useProjectStore(s => s.updateRoleDocuments);

  const [documents, setDocuments] = useState<RoleLinkedDocument[]>(
    () => currentProject?.roleLinkedDocuments ?? []
  );
  const [expanded, setExpanded] = useState(true);

  const persistDocs = useCallback(
    (next: RoleLinkedDocument[]) => {
      setDocuments(next);
      if (currentProject) updateRoleDocuments(currentProject.id, next);
    },
    [currentProject, updateRoleDocuments]
  );

  const docMap = useMemo(() => {
    const map = new Map<DocumentCategory, RoleLinkedDocument>();
    documents.forEach(d => map.set(d.category, d));
    return map;
  }, [documents]);

  // ── Simulated upload ──────────────────────────────
  const handleUpload = (slot: DocSlot) => {
    const member = findRosterMember(currentProject?.projectTeam, slot.role);
    const newDoc: RoleLinkedDocument = {
      id: `doc-${Date.now()}`,
      category: slot.category,
      fileName: `${slot.category.replace(/\s+/g, '_')}_${currentProject?.address?.split(' ')[0] ?? 'Property'}.pdf`,
      linkedRole: slot.role,
      uploadedByUid: member?.uid ?? 'self',
      uploadedByName: member?.displayName ?? 'Deal Lead',
      uploadedAt: new Date(),
      verified: false,
      notes: '',
    };
    persistDocs([...documents.filter(d => d.category !== slot.category), newDoc]);
  };

  const handleVerify = (category: DocumentCategory) => {
    persistDocs(
      documents.map(d =>
        d.category === category
          ? { ...d, verified: true, verifiedByUid: 'self', verifiedAt: new Date() }
          : d
      )
    );
  };

  const handleRemove = (category: DocumentCategory) => {
    persistDocs(documents.filter(d => d.category !== category));
  };

  // ── Metrics ──────────────────────────────────────
  const totalSlots = DOCUMENT_SLOTS.length;
  const uploadedCount = documents.length;
  const verifiedCount = documents.filter(d => d.verified).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <FileText className="w-5 h-5 text-pw-muted" />
          <div>
            <h3 className="text-lg font-medium tracking-tight text-gray-900">Document Vault</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Role-linked uploads tied to your Deal Roster
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {uploadedCount}/{totalSlots} uploaded
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-green-600">
            {verifiedCount} verified
          </span>
        </div>
      </button>

      {expanded && (
        <>
          {/* Progress bar */}
          <div className="px-6 pb-4">
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#a5a5a5] to-[#7f7f7f] rounded-full transition-all duration-500"
                style={{ width: `${totalSlots > 0 ? (verifiedCount / totalSlots) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              {Math.round(totalSlots > 0 ? (verifiedCount / totalSlots) * 100 : 0)}% complete
            </p>
          </div>

          {/* Document Slots */}
          <div className="divide-y divide-gray-100">
            {DOCUMENT_SLOTS.map(slot => {
              const doc = docMap.get(slot.category);
              const member = findRosterMember(currentProject?.projectTeam, slot.role);
              const status = getStatusBadge(doc);

              return (
                <div key={slot.category} className="px-6 py-4 flex items-center gap-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {doc?.verified ? (
                      <Shield className="w-5 h-5 text-green-500" />
                    ) : doc ? (
                      <Clock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{slot.category}</span>
                      <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{slot.description}</p>

                    {/* Roster link */}
                    <div className="flex items-center gap-1 mt-1">
                      <User className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-400">
                        Responsible: <span className="font-medium text-gray-600">{slot.role}</span>
                        {member && (
                          <span className="text-gray-400"> — {member.displayName}</span>
                        )}
                      </span>
                    </div>

                    {/* Uploaded file info */}
                    {doc && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">
                        📄 {doc.fileName}{' '}
                        {doc.uploadedAt && (
                          <span>
                            · uploaded by {doc.uploadedByName}{' '}
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!doc ? (
                      <button
                        onClick={() => handleUpload(slot)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition"
                      >
                        <Upload className="w-3 h-3" /> Upload
                      </button>
                    ) : !doc.verified ? (
                      <>
                        <button
                          onClick={() => handleVerify(slot.category)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-md hover:bg-green-100 transition border border-green-200"
                        >
                          <CheckCircle className="w-3 h-3" /> Verify
                        </button>
                        <button
                          onClick={() => handleRemove(slot.category)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRemove(slot.category)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition"
                        title="Remove and re-upload"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
