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
    toast.loading(`Sending signature request to ${signeeRole}...`, { id: 'esign' });
    
    // Simulate external API call
    setTimeout(() => {
      toast.success(`${documentName} signed successfully!`, { id: 'esign' });
      setIsSigning(false);
      onSigned();
    }, 2000);
  };

  if (isSigned) {
     return (
        <div className="flex items-center text-[#3f7d20] bg-[#3f7d20]/10 border border-[#3f7d20]/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
           <CheckCircle className="w-4 h-4 mr-1.5" /> Signed ({signeeRole})
        </div>
     );
  }

  return (
    <button 
      onClick={handleSigning}
      disabled={isSigning}
      className="flex items-center gap-1.5 bg-[#454955]/10 border border-[#454955]/30 text-[#454955] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#454955]/20 transition disabled:opacity-50"
    >
      {isSigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenTool className="w-3.5 h-3.5" />}
      Request E-Signature
    </button>
  );
}
