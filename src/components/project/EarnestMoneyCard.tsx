'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, CheckCircle, Clock, ShieldAlert, Paperclip, Trash2 } from 'lucide-react';
import type { Project } from '@/types/schema';
import { toast } from 'react-hot-toast';
import { uploadFile } from '@/lib/storage/uploadService';
import { IS_DEMO_MODE } from '@/lib/config/demo';

interface EarnestMoneyCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function EarnestMoneyCard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: EarnestMoneyCardProps) {
  const financials = project.financials || {};

  // Form states
  const [amountStr, setAmountStr] = useState(
    financials.emdAmount 
      ? (financials.emdAmount / 100).toString() 
      : financials.loiEarnestAmount 
      ? (financials.loiEarnestAmount / 100).toString() 
      : ''
  );
  const [escrowHolder, setEscrowHolder] = useState(financials.emdEscrowHolder || '');
  const [dueDate, setDueDate] = useState(financials.emdDueDate || '');
  const [clearedDate, setClearedDate] = useState('');
  const [refundableUntil, setRefundableUntil] = useState(financials.emdRefundableUntilDate || '');
  const [isHardDeposit, setIsHardDeposit] = useState(financials.emdIsHardDeposit || false);
  const [verified, setVerified] = useState(financials.emdVerified || false);
  const [receiptUrl, setReceiptUrl] = useState(financials.emdReceiptUrl || '');
  const [receiptName, setReceiptName] = useState(financials.emdReceiptName || '');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Helper to parse date to YYYY-MM-DD
  const parseDateStr = (d: any): string => {
    if (!d) return '';
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  };

  useEffect(() => {
    setAmountStr(
      financials.emdAmount 
        ? (financials.emdAmount / 100).toString() 
        : financials.loiEarnestAmount 
        ? (financials.loiEarnestAmount / 100).toString() 
        : ''
    );
    setEscrowHolder(financials.emdEscrowHolder || '');
    setDueDate(financials.emdDueDate || '');
    setClearedDate(parseDateStr(financials.emdClearedDate));
    setRefundableUntil(financials.emdRefundableUntilDate || '');
    setIsHardDeposit(financials.emdIsHardDeposit || false);
    setVerified(financials.emdVerified || false);
    setReceiptUrl(financials.emdReceiptUrl || '');
    setReceiptName(financials.emdReceiptName || '');
  }, [project]);

  const handleSaveField = (fieldName: string, value: any) => {
    onSaveFinancials({ [fieldName]: value });
  };

  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      handleSaveField('emdAmount', Math.round(num * 100));
    } else if (val === '') {
      handleSaveField('emdAmount', 0);
    }
  };

  const handleClearedDateChange = (val: string) => {
    setClearedDate(val);
    const dObj = val ? new Date(val) : null;
    handleSaveField('emdClearedDate', dObj);
  };

  const handleVerifiedToggle = (checked: boolean) => {
    if (readOnly) return;
    
    // ENFORCEMENT: Deposited requires receipt attachment
    if (checked && !receiptUrl) {
      toast.error('Deposit Receipt PDF must be uploaded before confirming deposit clearance.');
      return;
    }

    setVerified(checked);
    let updates: any = { emdVerified: checked };
    if (checked && !clearedDate) {
      const today = new Date().toISOString().split('T')[0];
      setClearedDate(today);
      updates.emdClearedDate = new Date();
    } else if (!checked) {
      setClearedDate('');
      updates.emdClearedDate = null;
    }
    onSaveFinancials(updates);
  };

  const uploadReceipt = async () => {
    if (readOnly) return;
    
    if (IS_DEMO_MODE) {
      setUploadingReceipt(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockUrl = '/mock/documents/Earnest_Money_Receipt_Signed.pdf';
      const mockName = 'Earnest_Money_Receipt_Signed.pdf';
      setReceiptUrl(mockUrl);
      setReceiptName(mockName);
      onSaveFinancials({
        emdReceiptUrl: mockUrl,
        emdReceiptName: mockName
      });
      toast.success('Earnest Money Receipt uploaded successfully! (Demo)');
      setUploadingReceipt(false);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingReceipt(true);
      const toastId = toast.loading(`Uploading ${file.name}...`);
      try {
        const res = await uploadFile({
          file,
          path: 'escrow_receipts',
          projectId: project.id,
        });
        setReceiptUrl(res.downloadUrl);
        setReceiptName(file.name);
        await onSaveFinancials({
          emdReceiptUrl: res.downloadUrl,
          emdReceiptName: file.name
        });
        toast.success('Document uploaded successfully!', { id: toastId });
      } catch (err: any) {
        console.error('Upload failed:', err);
        toast.error(`Upload failed: ${err.message || 'Unknown error'}`, { id: toastId });
      } finally {
        setUploadingReceipt(false);
      }
    };
    input.click();
  };

  const removeReceipt = () => {
    if (readOnly) return;
    setReceiptUrl('');
    setReceiptName('');
    setVerified(false);
    onSaveFinancials({
      emdReceiptUrl: '',
      emdReceiptName: '',
      emdVerified: false,
      emdClearedDate: null
    });
    setClearedDate('');
    toast.success('Receipt removed. Deposit cleared status reset.');
  };

  return (
    <div className="rounded-lg overflow-hidden border border-white/5 bg-white/5 space-y-6">
      {/* Header Banner */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: phaseColor }}>
        <div className="flex items-center gap-3">
          <DollarSign className="w-4 h-4 text-white" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Earnest Money Deposit (EMD)
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10">
          {verified ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-green-400 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-green-400">Deposited &amp; Cleared</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Pending Clear</span>
            </>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Core parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">EMD Amount ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-[#454955] font-medium">$</span>
              <input
                type="number"
                id="emd-amount"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={readOnly}
                placeholder="0"
                className="pl-8 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Escrow Holder</label>
            <input
              type="text"
              id="emd-escrow-holder"
              value={escrowHolder}
              onChange={(e) => {
                setEscrowHolder(e.target.value);
                handleSaveField('emdEscrowHolder', e.target.value);
              }}
              disabled={readOnly}
              placeholder="e.g. Title Company, Escrow Agent"
              className="px-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
            />
          </div>
        </div>

        {/* Date parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-white/5 pb-6">
          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Deposit Due Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#454955]" />
              <input
                type="date"
                id="emd-due-date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleSaveField('emdDueDate', e.target.value);
                }}
                disabled={readOnly}
                className="pl-10 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Refundable Until</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#454955]" />
              <input
                type="date"
                id="emd-refundable-date"
                value={refundableUntil}
                onChange={(e) => {
                  setRefundableUntil(e.target.value);
                  handleSaveField('emdRefundableUntilDate', e.target.value);
                }}
                disabled={readOnly}
                className="pl-10 pr-4 py-2 w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#454955] disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <span className="block text-xs font-bold text-[#9E9DA0] uppercase tracking-wider mb-2">Hard Deposit Status</span>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="emd-hard-deposit-toggle"
                checked={isHardDeposit}
                onChange={(e) => {
                  setIsHardDeposit(e.target.checked);
                  handleSaveField('emdIsHardDeposit', e.target.checked);
                }}
                disabled={readOnly}
                className="w-4 h-4 rounded bg-white/5 border-white/10 text-[#454955] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-white">This EMD is Non-Refundable (Hard)</span>
            </label>
          </div>
        </div>

        {/* Receipt Upload Vault Section */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">Earnest Money Deposit Receipt</h4>
            <p className="text-[10px] text-[#9E9DA0]/60 mt-1">A signed escrow deposit receipt is required to mark the EMD as Deposited &amp; Cleared.</p>
          </div>

          {receiptUrl ? (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Paperclip className="w-5 h-5 text-[#454955]" />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5" id="emd-receipt-filename">
                    {receiptName}
                    {IS_DEMO_MODE && <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans">Demo</span>}
                  </p>
                  <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#454955] hover:underline block mt-0.5">Download File</a>
                </div>
              </div>
              <button
                onClick={removeReceipt}
                id="remove-emd-receipt-btn"
                disabled={readOnly}
                className="text-xs text-[#F06543] hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-dashed border-white/10 rounded-xl">
              <Paperclip className="w-8 h-8 text-[#9E9DA0]/40 mb-2" />
              <p className="text-xs text-[#9E9DA0] mb-4">No receipt uploaded yet</p>
              <button
                onClick={uploadReceipt}
                id="upload-emd-receipt-btn"
                disabled={readOnly || uploadingReceipt}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {uploadingReceipt ? 'Uploading...' : `Select & Upload Receipt PDF ${IS_DEMO_MODE ? '(Demo)' : ''}`}
              </button>
            </div>
          )}
        </div>

        {/* deposited check */}
        <div className="pt-4 border-t border-white/5">
          <div className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
            verified ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-white/5'
          }`}>
            <input
              type="checkbox"
              id="emd-verified-checkbox"
              checked={verified}
              onChange={(e) => handleVerifiedToggle(e.target.checked)}
              disabled={readOnly}
              className="mt-1 w-4 h-4 rounded bg-white/5 border-white/10 text-[#454955] focus:ring-0 cursor-pointer"
            />
            <div className="flex-1">
              <label htmlFor="emd-verified-checkbox" className="text-xs font-bold text-white block cursor-pointer select-none">
                Confirm EMD Cleared Escrow
              </label>
              <p className="text-[10px] text-[#9E9DA0] mt-1">
                By checking this, I verify that the earnest money deposit has been wired, cleared by the escrow holder, and receipt document is attached.
              </p>

              {verified && (
                <div className="mt-4 flex flex-col md:flex-row md:items-center gap-4 justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#9E9DA0] block">Funds Cleared Date</span>
                    <span className="text-xs text-white mt-1 block">
                      {clearedDate ? new Date(clearedDate).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#454955]" />
                    <input
                      type="date"
                      id="emd-cleared-date-input"
                      value={clearedDate}
                      onChange={(e) => handleClearedDateChange(e.target.value)}
                      disabled={readOnly}
                      className="pl-8 pr-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955] w-32"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
