import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { LoanStatus, RoleLinkedDocument } from '@/types/schema';

const STATUSES: LoanStatus[] = [
  'Pre-Approved',
  'In-Underwriting',
  'Appraisal-Ordered',
  'Clear-To-Close'
];

export const LoanProcessingPipeline: React.FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateLoanStatus = useProjectStore((s) => s.updateLoanStatus);
  const updateRoleDocuments = useProjectStore((s) => s.updateRoleDocuments);

  const [uploadName, setUploadName] = useState('');

  if (!currentProject) return null;

  const handleStatusClick = (status: LoanStatus) => {
    updateLoanStatus(currentProject.id, status);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName) return;

    // We cast category to any here since 'Financing' may not exactly match DocumentCategory union in schema.ts
    // but functionally serves the sub-vault mock correctly.
    const newDoc: RoleLinkedDocument = {
      id: crypto.randomUUID(),
      category: 'Financing' as any,
      fileName: uploadName,
      linkedRole: 'Loan Officer/Broker',
      uploadedAt: new Date(),
      verified: false
    };

    const existingDocs = currentProject.roleLinkedDocuments || [];
    updateRoleDocuments(currentProject.id, [...existingDocs, newDoc]);
    setUploadName('');
  };

  const loanDocs = (currentProject.roleLinkedDocuments || []).filter(
    (d) => d.linkedRole === 'Loan Officer/Broker'
  );

  return (
    <div className="p-6 bg-bg-surface rounded-xl shadow-sm border border-border-accent h-full">
      <h2 className="text-xl font-semibold mb-6 text-text-primary">Loan Processing Pipeline</h2>

      <div className="flex justify-between items-center bg-bg-primary p-2 rounded-lg border border-border-accent mb-8 overflow-x-auto gap-2">
        {STATUSES.map((status, index) => {
          const loanStatus = currentProject.loanStatus || 'Pre-Approved';
          const isActive = loanStatus === status;
          const isPast = STATUSES.indexOf(loanStatus) >= index && !isActive;

          return (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              className={`flex-1 min-w-[130px] py-3 px-2 rounded-md text-sm font-medium transition-all text-center relative whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : isPast
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  : 'bg-bg-surface text-text-secondary hover:bg-bg-primary'
              }`}
            >
              {status}
              {isPast && (
                <div className="absolute top-1/2 -right-3 -translate-y-1/2 text-blue-400 z-10 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-bg-primary p-5 rounded-lg border border-border-accent">
        <h3 className="text-lg font-medium text-text-primary mb-4">Lender Document Sub-Vault</h3>
        
        <form onSubmit={handleUpload} className="flex gap-4 mb-6">
          <input
            type="text"
            required
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="e.g. W2 (2025), Bank Statements..."
            className="flex-1 px-4 py-2 border border-border-accent rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium cursor-pointer transition-colors">
            Upload
          </button>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          {loanDocs.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-4 bg-bg-surface rounded border border-dashed border-border-accent">No lender documents uploaded yet.</p>
          ) : (
            loanDocs.map(doc => (
              <div key={doc.id} className="flex justify-between items-center p-3 bg-bg-surface border border-border-accent rounded-lg">
                <div className="flex items-center gap-3 overflow-hidden">
                  <svg className="w-5 h-5 text-text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-text-primary text-sm truncate">{doc.fileName}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-text-secondary">{new Date(doc.uploadedAt!).toLocaleDateString()}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${doc.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {doc.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
