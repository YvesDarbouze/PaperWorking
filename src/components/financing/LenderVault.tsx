'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { RoleGuard } from '@/components/RoleGuard';
import { UploadCloud, FileText, CheckCircle2, Sliders, Info } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { Switch } from '../ui';

export default function LenderVault() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateProjectFinancials = useProjectStore((state) => state.updateProjectFinancials);
  const [uploading, setUploading] = useState(false);
  const [rollPoints, setRollPoints] = useState(false);
  const [sellerConcessions, setSellerConcessions] = useState(false);


  const docs = currentProject?.financials?.preApprovalDocuments || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !currentProject) return;
    
    setUploading(true);
    try {
      const file = e.target.files[0];
      const storageRef = ref(storage, `projects/${currentProject.id}/lenderVault/${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const newDocs = [...docs, downloadURL];
      
      updateProjectFinancials(currentProject.id, {
        preApprovalDocuments: newDocs
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!currentProject) return null;

  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary border-b pb-4 mb-4">Lender Pre-Approval Vault</h3>
      
      {docs.length > 0 ? (
        <ul className="space-y-3 mb-6">
          {docs.map((docUrl, idx) => (
            <li key={idx} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg border border-border-accent">
              <div className="flex items-center space-x-3 text-sm text-text-primary">
                <FileText className="w-4 h-4 text-[#454955]" />
                <span className="truncate max-w-[200px]">
                  {docUrl.split('/').pop()}
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3f7d20]/15 text-[#3f7d20]">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-secondary mb-6 italic">No pre-approval documents uploaded yet.</p>
      )}

      {/* Write Access: Investors and General Contractors */}
      <RoleGuard 
        allowedRoles={['Lead Investor', 'General Contractor']} 
        fallback={
           <p className="text-xs text-text-secondary text-center uppercase tracking-wider py-2">
             Read-Only View Enabled for Lender
           </p>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            
            <div className="border border-border-accent rounded-xl p-4 bg-bg-primary flex flex-col justify-between space-y-4">
                <div>
                   <h4 className="text-sm font-semibold flex items-center text-text-primary mb-1"><Sliders className="w-4 h-4 mr-2 text-[#454955]"/> Fee Spreading Logistics</h4>
                   <p className="text-xs text-text-secondary">Structurally modify capital stack configurations prior to closing.</p>
                </div>
                
                <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-bg-primary rounded-md transition">
                        <span className="text-sm font-medium text-text-primary flex flex-col">
                            Roll Points Into Loan
                            <span className="text-xs text-text-secondary font-normal mt-0.5">Subtracts from upfront Cash-to-Close</span>
                        </span>
                        <Switch checked={rollPoints} onChange={() => setRollPoints(!rollPoints)} />
                    </label>
                    
                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-bg-primary rounded-md transition">
                        <span className="text-sm font-medium text-text-primary flex flex-col">
                            Apply Seller Concessions
                            <span className="text-xs text-text-secondary font-normal mt-0.5">Credits closing costs heavily</span>
                        </span>
                        <Switch checked={sellerConcessions} onChange={() => setSellerConcessions(!sellerConcessions)} />
                    </label>
                </div>
                { (rollPoints || sellerConcessions) && (
                   <div className="flex items-start text-xs text-text-secondary bg-[#454955]/10 p-2 rounded border border-[#454955]/20">
                      <Info className="w-3 h-3 mr-1.5 flex-shrink-0 mt-px text-[#454955]" />
                      Math has been internally adjusted. Check the Engine Room for final Cash-to-Close figures.
                   </div>
                )}
            </div>

            <div className="border-2 border-dashed border-border-accent rounded-xl p-6 text-center hover:bg-bg-primary transition-colors flex flex-col justify-center h-full">
              <UploadCloud className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm font-medium text-text-primary mb-1">
                {uploading ? 'Uploading securely...' : 'Upload Pre-Approval PDF'}
              </p>
              <p className="text-xs text-text-secondary mb-4">Max size: 10MB</p>
              <input 
                 type="file" 
                 accept="application/pdf"
                 className="hidden" 
                 id="file-upload" 
                 onChange={handleFileUpload}
                 disabled={uploading}
              />
              <label 
                 htmlFor="file-upload"
                 className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#454955] hover:bg-[#454955]/90 cursor-pointer disabled:opacity-50"
              >
                 Browse Files
              </label>
            </div>
            
        </div>
      </RoleGuard>
    </div>
  );
}
