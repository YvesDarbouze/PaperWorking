import React, { useState } from 'react';
import { PenTool, CheckCircle, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ESignActionProps {
  documentName: string;
  signeeRole: string;
  onSigned: () => void;
  isSigned?: boolean;
}

export default function ESignAction({ documentName, signeeRole, onSigned, isSigned = false }: ESignActionProps) {
  const [isSigning, setIsSigning] = useState(false);

  const handleSigning = async () => {
    setIsSigning(true);
    toast.loading(`Initializing DocuSign API for ${signeeRole}...`, { id: 'esign' });
    
    // Simulate external API call
    setTimeout(() => {
      toast.success(`${documentName} legally executed via DocuSign!`, { id: 'esign' });
      setIsSigning(false);
      onSigned();
    }, 2000);
  };

  if (isSigned) {
     return (
        <div className="flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
           <CheckCircle className="w-4 h-4 mr-1.5" /> Executed ({signeeRole})
        </div>
     );
  }

  return (
    <button 
      onClick={handleSigning}
      disabled={isSigning}
      className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
    >
      {isSigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenTool className="w-3.5 h-3.5" />}
      Request E-Signature
    </button>
  );
}
