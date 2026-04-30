'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Edit3, ChevronUp } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface LOIGeneratorProps {
  propertyAddress: string;
  maoCents: number;
  phaseColor: string;
}

export default function LOIGenerator({ propertyAddress, maoCents, phaseColor }: LOIGeneratorProps) {
  const [isDraftingOpen, setIsDraftingOpen] = useState(false);

  // Form State
  const [offerAmount, setOfferAmount] = useState(maoCents > 0 ? maoCents / 100 : 0);
  const [earnestMoney, setEarnestMoney] = useState(1000);
  const [dueDiligenceDays, setDueDiligenceDays] = useState(14);
  const [closingDays, setClosingDays] = useState(30);

  // Sync offer amount if maoCents changes
  useEffect(() => {
    if (maoCents > 0 && offerAmount === 0) {
      setOfferAmount(maoCents / 100);
    }
  }, [maoCents, offerAmount]);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedOffer = offerAmount > 0 
    ? `$${offerAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : 'TBD';

  const formattedEMD = earnestMoney > 0 
    ? `$${earnestMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : 'TBD';

  const loiText = `LETTER OF INTENT TO PURCHASE REAL ESTATE

Date: ${formattedDate}

Property Address: ${propertyAddress || '[Property Address]'}

Dear Seller,

This Letter of Intent ("LOI") sets forth the basic terms and conditions upon which the undersigned Buyer is willing to purchase the above-referenced Property.

1. Purchase Price: The proposed purchase price for the Property is ${formattedOffer}.
2. Earnest Money Deposit: ${formattedEMD} to be deposited upon execution of a formal Purchase Agreement.
3. Due Diligence Period: Buyer shall have ${dueDiligenceDays} days following the execution of the Purchase Agreement to conduct inspections and due diligence.
4. Closing Date: The transaction shall close within ${closingDays} days following the expiration of the Due Diligence Period.

This LOI is non-binding and serves solely as an expression of interest and a basis for drafting a formal Purchase Agreement. It does not create any legally binding obligations on either party.

Sincerely,



_________________________
Buyer Signature
`;

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    // Split text into lines that fit the page width (8.5 - 2 inches margins)
    const lines = doc.splitTextToSize(loiText, 6.5);
    doc.text(lines, 1, 1);

    const safeAddress = propertyAddress ? propertyAddress.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'property';
    doc.save(`LOI_${safeAddress}.pdf`);
  };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px dashed var(--border-ui)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: phaseColor }} />
          <span className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-primary)' }}>
            Letter of Intent (LOI)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDraftingOpen(!isDraftingOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-ui)' }}
          >
            {isDraftingOpen ? (
              <ChevronUp className="w-3 h-3 text-gray-500" />
            ) : (
              <Edit3 className="w-3 h-3 text-gray-500" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-600">
              {isDraftingOpen ? 'Close Editor' : 'Draft Offer'}
            </span>
          </button>
          
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-opacity hover:opacity-90 shadow-sm"
            style={{ background: phaseColor, color: '#FFFFFF' }}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
              Export PDF
            </span>
          </button>
        </div>
      </div>

      {isDraftingOpen && (
        <div className="mt-6 flex flex-col xl:flex-row gap-6">
          {/* Left Pane: Form Inputs */}
          <div className="flex-1 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-gray-600 mb-4">Offer Variables</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                  Offer Amount ($)
                </label>
                <input
                  type="number"
                  value={offerAmount || ''}
                  onChange={(e) => setOfferAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md outline-none focus:ring-2 focus:ring-opacity-50 transition-shadow"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-ui)',
                    color: 'var(--text-primary)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}
                  placeholder="e.g., 150000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                  Earnest Money ($)
                </label>
                <input
                  type="number"
                  value={earnestMoney || ''}
                  onChange={(e) => setEarnestMoney(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md outline-none focus:ring-2 focus:ring-opacity-50 transition-shadow"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-ui)',
                    color: 'var(--text-primary)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}
                  placeholder="e.g., 1000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Due Diligence (Days)
                  </label>
                  <input
                    type="number"
                    value={dueDiligenceDays || ''}
                    onChange={(e) => setDueDiligenceDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none focus:ring-2 focus:ring-opacity-50 transition-shadow"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-ui)',
                      color: 'var(--text-primary)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}
                    placeholder="e.g., 14"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Closing (Days)
                  </label>
                  <input
                    type="number"
                    value={closingDays || ''}
                    onChange={(e) => setClosingDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none focus:ring-2 focus:ring-opacity-50 transition-shadow"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-ui)',
                      color: 'var(--text-primary)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}
                    placeholder="e.g., 30"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--border-ui)' }}>
              <p className="text-xs text-gray-500 leading-relaxed">
                Update the values above to see changes reflected in real-time in the document preview. 
                When ready, export the document as a PDF.
              </p>
            </div>
          </div>

          {/* Right Pane: Document Preview styled as physical paper */}
          <div className="flex-[1.5] flex justify-center rounded-lg border overflow-hidden" style={{ background: '#f8f9fa', borderColor: 'var(--border-ui)' }}>
            <div className="w-full h-[500px] overflow-y-auto p-4 sm:p-8" style={{ scrollbarWidth: 'thin' }}>
              <div 
                className="w-full max-w-[600px] mx-auto bg-white p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  color: '#000000',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  minHeight: '800px'
                }}
              >
                <div className="whitespace-pre-wrap">
                  {loiText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
