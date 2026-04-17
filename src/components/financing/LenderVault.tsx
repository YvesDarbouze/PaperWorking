'use client';

import React, { useState } from 'react';
import { useDealStore } from '@/store/dealStore';
import { RoleGuard } from '@/components/RoleGuard';
import { UploadCloud, FileText, CheckCircle2, Sliders, Info } from 'lucide-react';

export default function LenderVault() {
  const currentDeal = useDealStore((state) => state.currentDeal);
  const updateDealFinancials = useDealStore((state) => state.updateDealFinancials);
  const [uploading, setUploading] = useState(false);
  const [rollPoints, setRollPoints] = useState(false);
  const [sellerConcessions, setSellerConcessions] = useState(false);

  // MOCK: Should pull from AuthContext
  const userRole = 'Lead Investor'; 

  const docs = currentDeal?.financials?.preApprovalDocuments || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !currentDeal) return;
    
    setUploading(true);
    // Simulate a network upload to Firebase Storage
    setTimeout(() => {
      const fileName = e.target.files![0].name;
      // In reality, this would be a real URL returned from Storage
      const newDocs = [...docs, `https://mock-storage.com/${fileName}`];
      
      updateDealFinancials(currentDeal.id, {
        preApprovalDocuments: newDocs
      });
      setUploading(false);
    }, 1500);
  };

  if (!currentDeal) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 border-b pb-4 mb-4">Lender Pre-Approval Vault</h3>
      
      {docs.length > 0 ? (
        <ul className="space-y-3 mb-6">
          {docs.map((docUrl, idx) => (
            <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="truncate max-w-[200px]">
                  {docUrl.split('/').pop()}
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 mb-6 italic">No pre-approval documents uploaded yet.</p>
      )}

      {/* Write Access: Investors and General Contractors */}
      <RoleGuard 
        allowedRoles={['Lead Investor', 'General Contractor']} 
        currentRole={userRole as any}
        fallback={
           <p className="text-xs text-gray-400 text-center uppercase tracking-wider py-2">
             Read-Only View Enabled for Lender
           </p>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col justify-between space-y-4">
                <div>
                   <h4 className="text-sm font-semibold flex items-center text-gray-800 mb-1"><Sliders className="w-4 h-4 mr-2 text-indigo-500"/> Fee Spreading Logistics</h4>
                   <p className="text-xs text-gray-500">Structurally modify capital stack configurations prior to closing.</p>
                </div>
                
                <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 rounded-md transition">
                        <span className="text-sm font-medium text-gray-700 flex flex-col">
                            Roll Points Into Loan
                            <span className="text-xs text-gray-500 font-normal mt-0.5">Subtracts from upfront Cash-to-Close</span>
                        </span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={rollPoints} onChange={() => setRollPoints(!rollPoints)} />
                            <div className={`block w-8 h-4 rounded-full transition-colors ${rollPoints ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${rollPoints ? 'translate-x-4' : ''}`}></div>
                        </div>
                    </label>
                    
                    <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 rounded-md transition">
                        <span className="text-sm font-medium text-gray-700 flex flex-col">
                            Utilize Seller Concessions
                            <span className="text-xs text-gray-500 font-normal mt-0.5">Credits closing costs heavily</span>
                        </span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={sellerConcessions} onChange={() => setSellerConcessions(!sellerConcessions)} />
                            <div className={`block w-8 h-4 rounded-full transition-colors ${sellerConcessions ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${sellerConcessions ? 'translate-x-4' : ''}`}></div>
                        </div>
                    </label>
                </div>
                { (rollPoints || sellerConcessions) && (
                   <div className="flex items-start text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                      <Info className="w-3 h-3 mr-1.5 flex-shrink-0 mt-px" />
                      Math has been internally adjusted. Check the Engine Room for final Cash-to-Close figures.
                   </div>
                )}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors flex flex-col justify-center h-full">
              <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                {uploading ? 'Uploading securely...' : 'Upload Pre-Approval PDF'}
              </p>
              <p className="text-xs text-gray-500 mb-4">Max size: 10MB</p>
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
                 className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
              >
                 Browse Files
              </label>
            </div>
            
        </div>
      </RoleGuard>
    </div>
  );
}
