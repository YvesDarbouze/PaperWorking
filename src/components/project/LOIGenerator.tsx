'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Edit3, ChevronUp, AlertTriangle, Check, Info } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

interface LOIGeneratorProps {
  project: any;
  onSave: (updates: any) => Promise<void>;
  phaseColor?: string;
}

export default function LOIGenerator({ project, onSave, phaseColor = 'var(--text-primary)' }: LOIGeneratorProps) {
  const [isDraftingOpen, setIsDraftingOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const f = project?.financials || {};

  // Form State
  const [buyerEntity, setBuyerEntity] = useState(f.loiBuyerEntity || '');
  const [offerAmount, setOfferAmount] = useState(f.offer_price ? f.offer_price / 100 : (f.purchasePrice ? f.purchasePrice / 100 : 0));
  const [earnestMoney, setEarnestMoney] = useState(f.loiEarnestAmount ? f.loiEarnestAmount / 100 : 1000);
  const [earnestRefundable, setEarnestRefundable] = useState(f.loiRefundable !== undefined ? f.loiRefundable : true);
  const [dueDiligenceDays, setDueDiligenceDays] = useState(f.loiDueDiligenceDays || 14);
  const [closingDays, setClosingDays] = useState(f.loiClosingDays || 30);
  const [targetClosingDate, setTargetClosingDate] = useState(f.loiTargetClosingDate || '');
  const [selectedContingencies, setSelectedContingencies] = useState<string[]>(f.loiContingencies || ['Inspection', 'Financing', 'Appraisal']);
  const [exclusivity, setExclusivity] = useState(f.loiExclusivity !== undefined ? f.loiExclusivity : false);
  const [exclusivityDays, setExclusivityDays] = useState(f.loiExclusivityDays || 30);
  const [expiration, setExpiration] = useState(f.loiExpiration || '');
  const [assignability, setAssignability] = useState(f.loiAssignability !== undefined ? f.loiAssignability : false);
  const [nonBinding, setNonBinding] = useState(f.loiNonBinding !== undefined ? f.loiNonBinding : true);

  const selfUpdatedFields = useRef<Record<string, any>>({});

  // Sync state if financials reload from an external update
  useEffect(() => {
    const syncField = (propVal: any, localVal: any, fieldKey: string, setter: (val: any) => void, transform?: (val: any) => any) => {
      const transformedProp = transform ? transform(propVal) : propVal;
      const lastSentVal = selfUpdatedFields.current[fieldKey];
      console.log(`[LOISyncDebug] fieldKey: ${fieldKey}, propVal: ${propVal}, localVal: ${localVal}, lastSentVal: ${lastSentVal}`);
      
      if (lastSentVal !== undefined) {
        if (propVal === lastSentVal) {
          console.log(`[LOISyncDebug] matching, clearing selfUpdated: ${fieldKey}`);
          delete selfUpdatedFields.current[fieldKey];
        } else {
          console.log(`[LOISyncDebug] mismatch, ignoring propVal ${propVal} for fieldKey ${fieldKey}`);
          return;
        }
      }
      
      if (transformedProp !== undefined && transformedProp !== localVal) {
        console.log(`[LOISyncDebug] updating local state for fieldKey: ${fieldKey} to ${transformedProp}`);
        setter(transformedProp);
      }
    };

    syncField(f.loiBuyerEntity, buyerEntity, 'loiBuyerEntity', setBuyerEntity);
    syncField(f.offer_price, offerAmount, 'offer_price', setOfferAmount, (v) => v / 100);
    syncField(f.loiEarnestAmount, earnestMoney, 'loiEarnestAmount', setEarnestMoney, (v) => v / 100);
    syncField(f.loiRefundable, earnestRefundable, 'loiRefundable', setEarnestRefundable);
    syncField(f.loiDueDiligenceDays, dueDiligenceDays, 'loiDueDiligenceDays', setDueDiligenceDays);
    syncField(f.loiClosingDays, closingDays, 'loiClosingDays', setClosingDays);
    syncField(f.loiTargetClosingDate, targetClosingDate, 'loiTargetClosingDate', setTargetClosingDate);
    syncField(f.loiContingencies, selectedContingencies, 'loiContingencies', setSelectedContingencies);
    syncField(f.loiExclusivity, exclusivity, 'loiExclusivity', setExclusivity);
    syncField(f.loiExclusivityDays, exclusivityDays, 'loiExclusivityDays', setExclusivityDays);
    syncField(f.loiExpiration, expiration, 'loiExpiration', setExpiration);
    syncField(f.loiAssignability, assignability, 'loiAssignability', setAssignability);
    syncField(f.loiNonBinding, nonBinding, 'loiNonBinding', setNonBinding);
  }, [project?.financials]);

  const toggleContingency = (name: string) => {
    setSelectedContingencies(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

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

  // Build LOI text for preview & generation
  const buildLoiText = () => {
    const listContingencies = selectedContingencies.length > 0 
      ? selectedContingencies.join(', ')
      : 'None';

    const ddText = dueDiligenceDays > 0 
      ? `Buyer shall have a due diligence and inspection period of ${dueDiligenceDays} days from the execution date of the Purchase Agreement.`
      : 'No inspection or due diligence period is requested.';

    const closingDateText = targetClosingDate 
      ? `Closing shall occur on or before ${new Date(targetClosingDate).toLocaleDateString('en-US')}.`
      : `Closing shall occur within ${closingDays} days following the expiration of the Due Diligence Period.`;

    const exclusivityText = exclusivity 
      ? `Seller agrees to grant the Buyer exclusive negotiating rights for a period of ${exclusivityDays} days following the execution of this LOI.`
      : 'No exclusivity period is requested.';

    const assignabilityText = assignability 
      ? 'This LOI and any subsequent Purchase Agreement shall be assignable by the Buyer to any affiliated entity.'
      : 'This LOI is non-assignable without the Seller\'s prior written consent.';

    const expirationText = expiration 
      ? `This offer is open for acceptance until ${new Date(expiration).toLocaleString('en-US')}.`
      : `This offer shall expire 3 business days from the date hereof.`;

    const bindingStatusText = nonBinding 
      ? 'NON-BINDING STATUS: This Letter of Intent is entirely non-binding on the parties and serves solely as a statement of interest. Neither party shall be bound to purchase or sell the Property until a formal Purchase Agreement is executed.'
      : 'BINDING STATUS WARNING: THIS LETTER OF INTENT IS BINDING UPON BOTH PARTIES. BY SIGNING BELOW, SELLER AND BUYER AGREE TO BE LEGALLY BOUND BY THE TERMS OUTLINED HEREIN.';

    return `LETTER OF INTENT TO PURCHASE REAL ESTATE

Date: ${formattedDate}

Property Address: ${project?.address || '[Property Address]'}
Proposed Buyer: ${buyerEntity || '[Buyer Entity]'}

Dear Seller,

This Letter of Intent ("LOI") sets forth the key terms and conditions under which the Buyer proposes to purchase the above-referenced Property.

1. Purchase Price: The proposed purchase price for the Property is ${formattedOffer}.
2. Earnest Money Deposit: The Buyer will submit an earnest money deposit of ${formattedEMD} within 3 business days of contract execution. This deposit shall be ${earnestRefundable ? 'Refundable' : 'Non-Refundable'} during the due diligence period.
3. Due Diligence & Inspection: ${ddText}
4. Closing: ${closingDateText}
5. Contingencies: This transaction is contingent upon: ${listContingencies}.
6. Exclusivity: ${exclusivityText}
7. Assignability: ${assignabilityText}
8. Expiration: ${expirationText}

${bindingStatusText}

Sincerely,



_________________________
Buyer: ${buyerEntity || '[Buyer Entity]'}
`;
  };

  const loiText = buildLoiText();

  // Helper to compile and save PDF
  const generatePdfBlob = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    doc.setFont('times', 'normal');
    doc.setFontSize(11);

    // Split text into lines that fit the page width (8.5 - 2 inches margins)
    const lines = doc.splitTextToSize(loiText, 6.5);
    doc.text(lines, 1, 1);
    return doc;
  };

  const handleDownloadPdf = () => {
    const doc = generatePdfBlob();
    const safeAddress = project?.address ? project.address.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'property';
    doc.save(`LOI_${safeAddress}.pdf`);
    toast.success('LOI PDF exported successfully');
  };

  const handleSendLoi = async () => {
    setSaving(true);
    try {
      const updates = {
        loiBuyerEntity: buyerEntity,
        offer_price: offerAmount * 100,
        loiEarnestAmount: earnestMoney * 100,
        loiRefundable: earnestRefundable,
        loiDueDiligenceDays: dueDiligenceDays,
        loiClosingDays: closingDays,
        loiTargetClosingDate: targetClosingDate,
        loiContingencies: selectedContingencies,
        loiExclusivity: exclusivity,
        loiExclusivityDays: exclusivityDays,
        loiExpiration: expiration,
        loiAssignability: assignability,
        loiNonBinding: nonBinding,
        loiUrl: `/mock/loi_${project?.id || 'doc'}.pdf`, // mock link
        offerStatus: 'Offer Sent'
      };

      await onSave(updates);
      toast.success('Letter of Intent saved and status changed to "Offer Sent"!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save LOI');
    } finally {
      setSaving(false);
    }
  };

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAutoSaveField = (fields: any) => {
    selfUpdatedFields.current = { ...selfUpdatedFields.current, ...fields };
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSave(fields);
      } catch (err) {
        console.error('Failed to autosave LOI fields:', err);
      }
    }, 400);
  };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px dashed var(--border-ui)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: phaseColor }} />
          <span className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-primary)' }}>
            Letter of Intent (LOI) &amp; Agreement Builder
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDraftingOpen(!isDraftingOpen)}
            id="draft-loi-toggle"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-ui)' }}
          >
            {isDraftingOpen ? (
              <ChevronUp className="w-3 h-3 text-gray-500" />
            ) : (
              <Edit3 className="w-3 h-3 text-gray-500" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-600">
              {isDraftingOpen ? 'Close Editor' : 'Draft / Edit LOI'}
            </span>
          </button>
          
          <button
            onClick={handleDownloadPdf}
            id="export-loi-pdf-btn"
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
          <div className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-gray-600 mb-2">LOI Terms &amp; Variables</h3>
            
            {/* Warning Banner */}
            {!nonBinding && (
              <div id="non-binding-warning" className="p-3 bg-red-950/40 border border-red-500/25 rounded-md flex items-start gap-2.5 animate-in fade-in duration-300">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">Binding Contract Warning</span>
                  <p className="text-[10px] text-red-200/90 leading-relaxed mt-0.5">
                    Removing the non-binding clause will turn this Letter of Intent into a legally binding purchase offer. Proceed with professional legal advice.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Buyer Entity */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                  Buyer Entity
                </label>
                <input
                  type="text"
                  id="loi-buyer-entity"
                  value={buyerEntity}
                  onChange={(e) => {
                    setBuyerEntity(e.target.value);
                    handleAutoSaveField({ loiBuyerEntity: e.target.value });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                  style={{ borderColor: 'var(--border-ui)' }}
                  placeholder="e.g. Acme Holdings LLC"
                />
              </div>

              {/* Prefilled Price & Earnest Money */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Prefilled Price ($)
                  </label>
                  <input
                    type="number"
                    id="loi-offer-price"
                    value={offerAmount || ''}
                    onChange={(e) => {
                      setOfferAmount(Number(e.target.value));
                      handleAutoSaveField({ offer_price: Number(e.target.value) * 100 });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                    style={{ borderColor: 'var(--border-ui)' }}
                    placeholder="Prefilled Price"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Earnest Money Deposit ($)
                  </label>
                  <input
                    type="number"
                    id="loi-earnest-money"
                    value={earnestMoney || ''}
                    onChange={(e) => {
                      setEarnestMoney(Number(e.target.value));
                      handleAutoSaveField({ loiEarnestAmount: Number(e.target.value) * 100 });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                    style={{ borderColor: 'var(--border-ui)' }}
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              {/* Earnest Refundability & DD Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    EMD Refundability
                  </label>
                  <select
                    id="loi-emd-refundable"
                    value={earnestRefundable ? 'true' : 'false'}
                    onChange={(e) => {
                      const val = e.target.value === 'true';
                      setEarnestRefundable(val);
                      handleAutoSaveField({ loiRefundable: val });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    <option value="true">Refundable</option>
                    <option value="false">Non-Refundable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Due Diligence (Days)
                  </label>
                  <input
                    type="number"
                    id="loi-dd-days"
                    value={dueDiligenceDays || ''}
                    onChange={(e) => {
                      setDueDiligenceDays(Number(e.target.value));
                      handleAutoSaveField({ loiDueDiligenceDays: Number(e.target.value) });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                    style={{ borderColor: 'var(--border-ui)' }}
                    placeholder="e.g. 14"
                  />
                </div>
              </div>

              {/* Closing Days & Target Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Closing Days after DD
                  </label>
                  <input
                    type="number"
                    id="loi-closing-days"
                    value={closingDays || ''}
                    onChange={(e) => {
                      setClosingDays(Number(e.target.value));
                      handleAutoSaveField({ loiClosingDays: Number(e.target.value) });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                    style={{ borderColor: 'var(--border-ui)' }}
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Target Closing Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="loi-closing-date"
                    value={targetClosingDate}
                    onChange={(e) => {
                      setTargetClosingDate(e.target.value);
                      handleAutoSaveField({ loiTargetClosingDate: e.target.value });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                    style={{ borderColor: 'var(--border-ui)' }}
                  />
                </div>
              </div>

              {/* Exclusivity Clause */}
              <div className="p-3 bg-black/10 border border-white/5 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    Request Exclusivity Clause
                  </span>
                  <input
                    type="checkbox"
                    id="loi-exclusivity"
                    checked={exclusivity}
                    onChange={(e) => {
                      setExclusivity(e.target.checked);
                      handleAutoSaveField({ loiExclusivity: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-black border-white/20 focus:ring-0 cursor-pointer"
                  />
                </div>
                {exclusivity && (
                  <div className="animate-in slide-in-from-top-1 duration-200">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                      Exclusivity Period (Days)
                    </label>
                    <input
                      type="number"
                      id="loi-exclusivity-days"
                      value={exclusivityDays}
                      onChange={(e) => {
                        setExclusivityDays(Number(e.target.value));
                        handleAutoSaveField({ loiExclusivityDays: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                      style={{ borderColor: 'var(--border-ui)' }}
                    />
                  </div>
                )}
              </div>

              {/* Offer Expiration & Assignability */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Offer Expiration Date
                  </label>
                  <input
                    type="date"
                    id="loi-expiration-date"
                    value={expiration}
                    onChange={(e) => {
                      setExpiration(e.target.value);
                      handleAutoSaveField({ loiExpiration: e.target.value });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md outline-none bg-black/20 border text-white"
                    style={{ borderColor: 'var(--border-ui)' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1">
                    Assignability
                  </label>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      id="loi-assignability"
                      checked={assignability}
                      onChange={(e) => {
                        setAssignability(e.target.checked);
                        handleAutoSaveField({ loiAssignability: e.target.checked });
                      }}
                      className="w-4 h-4 rounded text-black border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-white">Assignable Offer</span>
                  </div>
                </div>
              </div>

              {/* Non-Binding Clause */}
              <div className="flex items-center justify-between p-3 bg-black/10 border border-white/5 rounded-md">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                    Non-Binding Clause
                  </span>
                  <span className="text-[9px] text-gray-400">
                    Keep checked to state this offer is non-binding
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="loi-non-binding-checkbox"
                  checked={nonBinding}
                  onChange={(e) => {
                    console.log(`[LOISyncDebug] Checkbox changed: localChecked=${e.target.checked}`);
                    setNonBinding(e.target.checked);
                    handleAutoSaveField({ loiNonBinding: e.target.checked });
                  }}
                  className="w-4 h-4 rounded text-black border-white/20 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Contingencies Checkboxes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-2">
                  Active Contingencies
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Financing', 'Appraisal', 'Inspection', 'Title', 'Environmental', 'Survey'].map(c => {
                    const isSelected = selectedContingencies.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const updated = selectedContingencies.includes(c)
                            ? selectedContingencies.filter(item => item !== c)
                            : [...selectedContingencies, c];
                          setSelectedContingencies(updated);
                          handleAutoSaveField({ loiContingencies: updated });
                        }}
                        className="flex items-center justify-between px-3 py-2 text-xs rounded-md border text-left transition-all"
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                          borderColor: isSelected ? phaseColor : 'rgba(255,255,255,0.05)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-secondary)'
                        }}
                        id={`contingency-checkbox-${c.toLowerCase()}`}
                      >
                        <span>{c}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" style={{ color: phaseColor }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action: Send LOI */}
              <button
                type="button"
                onClick={handleSendLoi}
                disabled={saving}
                id="send-loi-btn"
                className="w-full py-3 bg-[#454955] text-black hover:opacity-90 disabled:opacity-50 font-bold uppercase tracking-wider text-xs rounded-lg transition-opacity flex items-center justify-center gap-1.5 shadow-md"
              >
                <FileText className="w-4 h-4" />
                {saving ? 'Saving...' : 'Send Letter of Intent (LOI)'}
              </button>
            </div>
          </div>

          {/* Right Pane: Document Preview styled as physical paper */}
          <div className="flex-[1.2] flex justify-center rounded-lg border overflow-hidden" style={{ background: '#f8f9fa', borderColor: 'var(--border-ui)' }}>
            <div className="w-full h-[600px] overflow-y-auto p-4 sm:p-6" style={{ scrollbarWidth: 'thin' }}>
              <div 
                className="w-full max-w-[600px] mx-auto bg-white p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  color: '#000000',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  minHeight: '750px'
                }}
              >
                {/* Visual Watermark */}
                <div className="absolute top-2 right-4 flex items-center gap-1 opacity-25 select-none pointer-events-none">
                  <Info className="w-3 h-3" />
                  <span className="text-[8px] uppercase tracking-widest font-sans font-bold">LOI Preview</span>
                </div>
                
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
