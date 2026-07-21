import React, { useState, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { LoanStatus, RoleLinkedDocument } from '@/types/schema';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { Loader2, UploadCloud, File as FileIcon, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentProject) return null;

  const handleStatusClick = (status: LoanStatus) => {
    updateLoanStatus(currentProject.id, status);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      const fileRef = ref(storage, `projects/${currentProject.id}/financing/${Date.now()}_${selectedFile.name}`);
      const snapshot = await uploadBytes(fileRef, selectedFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const newDoc: RoleLinkedDocument = {
        id: crypto.randomUUID(),
        category: 'Financing' as any,
        fileName: selectedFile.name,
        fileUrl: downloadUrl,
        linkedRole: 'Loan Officer/Broker',
        uploadedAt: new Date(),
        verified: false,
        notes: ''
      };

      const existingDocs = currentProject.roleLinkedDocuments || [];
      updateRoleDocuments(currentProject.id, [...existingDocs, newDoc]);
      
      toast.success('Document securely uploaded!');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const loanDocs = (currentProject.roleLinkedDocuments || []).filter(
    (d) => d.linkedRole === 'Loan Officer/Broker'
  );

  return (
    <div className="p-6 bg-bg-surface rounded-xl shadow-sm border border-border-accent h-full flex flex-col">
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
                  <CheckCircle className="w-4 h-4 ml-0.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-bg-primary p-5 rounded-lg border border-border-accent flex-1">
        <h3 className="text-lg font-medium text-text-primary mb-4">Lender Document Sub-Vault</h3>
        
        <form onSubmit={handleUpload} className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />
            <div className={`w-full px-4 py-2 border rounded-lg flex items-center gap-3 transition-colors ${selectedFile ? 'border-blue-500 bg-blue-50/10' : 'border-border-accent bg-bg-surface'}`}>
              <UploadCloud className={`w-5 h-5 ${selectedFile ? 'text-blue-500' : 'text-text-secondary'}`} />
              <span className={`text-sm truncate ${selectedFile ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {selectedFile ? selectedFile.name : 'Click to select W2, Bank Statements, etc.'}
              </span>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={!selectedFile || isUploading}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              !selectedFile || isUploading 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400' 
                : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm cursor-pointer'
            }`}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
          </button>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          {loanDocs.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-6 bg-bg-surface rounded border border-dashed border-border-accent">
              No lender documents uploaded yet.
            </p>
          ) : (
            loanDocs.map(doc => (
              <div key={doc.id} className="flex justify-between items-center p-3 bg-bg-surface border border-border-accent rounded-lg group hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <a 
                    href={doc.fileUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-text-primary text-sm truncate hover:text-blue-600 transition-colors"
                  >
                    {doc.fileName}
                  </a>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-text-secondary hidden sm:block">
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Just now'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${doc.verified ? 'bg-pw-success-container text-pw-success border-pw-success-border/50' : 'bg-yellow-500/15 text-yellow-400 border-pw-success-border/50'}`}>
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

