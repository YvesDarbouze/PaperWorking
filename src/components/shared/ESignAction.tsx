import React from 'react';
import { PenTool, CheckCircle } from 'lucide-react';

interface ESignActionProps {
  documentName: string;
  signeeRole: string;
  onSigned: () => void;
  isSigned?: boolean;
}

export default function ESignAction({ documentName, signeeRole, onSigned, isSigned = false }: ESignActionProps) {
  if (isSigned) {
     return (
        <div className="flex items-center text-[#3f7d20] bg-[#3f7d20]/10 border border-[#3f7d20]/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
           <CheckCircle className="w-4 h-4 mr-1.5" /> Signed ({signeeRole})
        </div>
     );
  }

  return (
    <button 
      disabled={true}
      title="E-Signature integration (DocuSign/HelloSign) coming soon"
      className="flex items-center gap-1.5 bg-[#454955]/10 border border-[#454955]/20 text-[#454955]/60 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-not-allowed opacity-50"
    >
      <PenTool className="w-3.5 h-3.5" />
      E-Sign Coming Soon
    </button>
  );
}
