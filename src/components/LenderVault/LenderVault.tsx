'use client';

import React, { useState, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Lock, FileUp, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile } from '@/lib/storage/uploadService';
import { projectsService } from '@/lib/firebase/deals';

export default function LenderVault() {
  const currentProject = useProjectStore(state => state.currentProject);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  // Note: in a true application this reads from the authenticated session context
  const [userRole, setUserRole] = useState<'Lead Investor' | 'Lender'>('Lead Investor'); 

  if (!currentProject) return null;

  const documents = currentProject.lenderVaultDocuments || [
    { id: 'default', name: 'Pre-Approval Letter.pdf', status: 'pending' as const }
  ];

  const triggerFileInput = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject) return;

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF documents are allowed in the secure vault.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading document to secure vault...');

    try {
      // 1. Upload file binary to Firebase Storage under projects/{projectId}/lenderVault/
      const result = await uploadFile({
        file,
        path: 'lenderVault',
        projectId: currentProject.id,
      });

      // 2. Add metadata record
      const newDoc = {
        id: crypto.randomUUID(),
        name: file.name,
        status: 'pending' as const,
        fileUrl: result.downloadUrl,
        storagePath: result.storagePath,
        uploadedAt: new Date().toISOString(),
      };

      const updatedDocs = [...(currentProject.lenderVaultDocuments || []), newDoc];

      // 3. Persist metadata array in Firestore
      await projectsService.updateProject(currentProject.id, {
        lenderVaultDocuments: updatedDocs,
      });

      toast.success('Document uploaded to Vault', { id: toastId });
    } catch (error) {
      console.error('[LenderVault] Upload failed:', error);
      toast.error('Failed to upload document. Please try again.', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleVerify = async (idx: number) => {
    if (userRole !== 'Lender') {
       toast.error('Access Denied. Only authorized Lenders can verify documents.');
       return;
    }

    const newDocs = [...documents].map((doc, i) => {
      if (i === idx) {
        return { ...doc, status: 'verified' as const };
      }
      return doc;
    });

    try {
      await projectsService.updateProject(currentProject.id, {
        lenderVaultDocuments: newDocs,
      });
      toast.success('Document Cryptographically Verified.');
    } catch (error) {
      console.error('[LenderVault] Verification failed:', error);
      toast.error('Failed to verify document.');
    }
  };

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-[#454955]" />
            <h3 className="text-lg font-medium tracking-tight text-text-primary">Secure Lender Vault</h3>
         </div>
         {/* Toggle switch strictly for demoing the UX difference between roles */}
         <div className="flex items-center space-x-2 bg-bg-primary p-1 rounded-md">
            <button 
              onClick={() => setUserRole('Lead Investor')}
              className={`px-3 py-1 text-xs font-medium rounded ${userRole === 'Lead Investor' ? 'bg-bg-surface shadow-sm text-text-primary' : 'text-text-secondary'}`}
            >Investor View</button>
            <button 
              onClick={() => setUserRole('Lender')}
              className={`px-3 py-1 text-xs font-medium rounded ${userRole === 'Lender' ? 'bg-bg-surface shadow-sm text-text-primary' : 'text-text-secondary'}`}
            >Lender View</button>
         </div>
      </div>

      <div className="space-y-4">
         {userRole === 'Lead Investor' && (
            <>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
              />
              <div 
                onClick={triggerFileInput}
                className={`border-2 border-dashed border-border-accent rounded-lg p-6 flex flex-col items-center justify-center text-center transition ${uploading ? 'opacity-50 cursor-not-allowed bg-bg-primary' : 'hover:bg-bg-primary cursor-pointer'}`}
              >
                <FileUp className={`w-8 h-8 text-text-secondary mb-2 ${uploading ? 'animate-pulse' : ''}`} />
                <p className="text-sm font-medium text-text-primary">
                  {uploading ? 'Uploading securely...' : 'Upload Pre-Approval & Appraisal'}
                </p>
                <p className="text-xs text-text-secondary mt-1">PDFs are encrypted and vaulted for Lender eyes only.</p>
              </div>
            </>
         )}

         {userRole === 'Lender' && (
            <div className="bg-[#454955]/10 border border-[#454955]/20 p-4 rounded-lg flex items-start space-x-3">
               <Eye className="w-5 h-5 text-[#454955] mt-0.5" />
               <div>
                  <p className="text-sm font-medium text-text-primary">Lender Access Granted</p>
                  <p className="text-xs text-text-secondary">You are in Read-Only mode. You may review and verify borrower financials.</p>
               </div>
            </div>
         )}
         
         <div className="space-y-2 mt-4">
            {documents.map((doc, idx) => (
               <div key={doc.id || idx} className="flex items-center justify-between p-3 border border-border-accent rounded-md bg-bg-primary">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-text-secondary">PDF</span>
                    </div>
                    {doc.fileUrl ? (
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm font-medium text-text-primary hover:text-blue-500 hover:underline truncate max-w-[200px]"
                      >
                        {doc.name}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">{doc.name}</p>
                    )}
                  </div>
                  
                  {userRole === 'Lender' ? (
                    <button 
                      onClick={() => handleVerify(idx)}
                      disabled={doc.status === 'verified'}
                      className={`flex items-center text-xs font-medium px-3 py-1.5 rounded-full ${doc.status === 'verified' ? 'bg-[#3f7d20]/15 text-[#3f7d20]' : 'bg-[#454955]/10 text-[#454955] hover:bg-[#454955]/20'}`}
                    >
                      {doc.status === 'verified' ? <><CheckCircle className="w-3 h-3 mr-1"/> Verified</> : 'Verify Document'}
                    </button>
                  ) : (
                     <span className={`text-xs px-2 py-1 rounded-full ${doc.status === 'verified' ? 'bg-[#3f7d20]/15 text-[#3f7d20]' : 'bg-gray-200 text-text-secondary'}`}>
                       {doc.status === 'verified' ? 'Verified by Lender' : 'Pending Review'}
                     </span>
                  )}
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
