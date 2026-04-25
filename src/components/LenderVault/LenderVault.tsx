'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Lock, FileUp, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LenderVault() {
  const currentProject = useProjectStore(state => state.currentProject);
  const [documents, setDocuments] = useState<{name: string, status: 'pending' | 'verified'}[]>([
    { name: 'Pre-Approval Letter.pdf', status: 'pending' }
  ]);
  
  // Note: in a true application this reads from the authenticated session context
  const [userRole, setUserRole] = useState<'Lead Investor' | 'Lender'>('Lead Investor'); 

  if (!currentProject) return null;

  const handleUpload = () => {
    toast.success('Document uploaded to Vault');
    setDocuments([...documents, { name: `Appraisal_Report_${Math.floor(Math.random()*100)}.pdf`, status: 'pending' }]);
  };

  const handleVerify = (idx: number) => {
    if (userRole !== 'Lender') {
       toast.error('Access Denied. Only authorized Lenders can verify documents.');
       return;
    }
    const newDocs = [...documents];
    newDocs[idx].status = 'verified';
    setDocuments(newDocs);
    toast.success('Document Cryptographically Verified.');
  };

  return (
    <div className="bg-bg-surface rounded-xl shadow-sm border border-border-accent p-6">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center space-x-2">
           <Lock className="w-5 h-5 text-indigo-700" />
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
           <div 
             onClick={handleUpload}
             className="border-2 border-dashed border-border-accent rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-bg-primary cursor-pointer transition"
           >
             <FileUp className="w-8 h-8 text-text-secondary mb-2" />
             <p className="text-sm font-medium text-text-primary">Upload Pre-Approval & Appraisal</p>
             <p className="text-xs text-text-secondary mt-1">PDFs are encrypted and vaulted for Lender eyes only.</p>
           </div>
         )}

         {userRole === 'Lender' && (
           <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-start space-x-3">
              <Eye className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                 <p className="text-sm font-medium text-indigo-900">Lender Access Granted</p>
                 <p className="text-xs text-indigo-700">You are in Read-Only mode. You may review and verify borrower financials.</p>
              </div>
           </div>
         )}
         
         <div className="space-y-2 mt-4">
           {documents.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-border-accent rounded-md bg-bg-primary">
                 <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                     <span className="text-xs font-bold text-text-secondary">PDF</span>
                   </div>
                   <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
                 </div>
                 
                 {userRole === 'Lender' ? (
                   <button 
                     onClick={() => handleVerify(idx)}
                     disabled={doc.status === 'verified'}
                     className={`flex items-center text-xs font-medium px-3 py-1.5 rounded-full ${doc.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                   >
                     {doc.status === 'verified' ? <><CheckCircle className="w-3 h-3 mr-1"/> Verified</> : 'Verify Document'}
                   </button>
                 ) : (
                    <span className={`text-xs px-2 py-1 rounded-full ${doc.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-text-secondary'}`}>
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
