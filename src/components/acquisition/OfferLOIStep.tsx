'use client';

import React, { useState } from 'react';
import { FileText, Download, Mail, CheckCircle, Calendar, DollarSign, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface OfferLOIStepProps {
  projectId: string;
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function OfferLOIStep({
  projectId,
  initialData,
  onSave,
}: OfferLOIStepProps) {
  const { user } = useAuth();
  const f = initialData?.financials || {};

  // Form inputs
  const [offerAmount, setOfferAmount] = useState<number>(f.offer_price ? f.offer_price / 100 : (f.purchasePrice ? f.purchasePrice / 100 : 250000));
  const [earnestMoney, setEarnestMoney] = useState<number>(f.loiEarnestAmount ? f.loiEarnestAmount / 100 : Math.round(offerAmount * 0.01));
  const [closingDate, setClosingDate] = useState<string>(f.loiTargetClosingDate || '');
  const [financingContingency, setFinancingContingency] = useState<boolean>(true);
  const [inspectionContingency, setInspectionContingency] = useState<boolean>(true);
  const [buyerEntity, setBuyerEntity] = useState<string>(f.loiBuyerEntity || '');
  
  // Email recipient
  const [recipientEmail, setRecipientEmail] = useState<string>(f.sellerContact || 'agent@apexrealestate.com');

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Generate and download PDF LOI
  const handleGenerateLOI = async () => {
    setGenerating(true);
    try {
      const idToken = await user?.getIdToken();
      const contingencies: string[] = [];
      if (financingContingency) contingencies.push('Financing');
      if (inspectionContingency) contingencies.push('Inspection');

      const res = await fetch('/api/loi/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId,
          offerAmount,
          earnestMoney,
          closingDate,
          contingencies,
          buyerEntity,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate Letter of Intent PDF.');
      }

      // Download file stream
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Letter_of_Intent_${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Letter of Intent generated and downloaded!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error generating LOI PDF.');
    } finally {
      setGenerating(false);
    }
  };

  // Send LOI email via server API
  const handleSendLOIEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please specify a valid recipient email address.');
      return;
    }

    setSending(true);
    try {
      const idToken = await user?.getIdToken();
      const propAddress = initialData?.propertyName || initialData?.addressLine || 'Target Property';
      
      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-top: 0;">Letter of Intent (LOI)</h2>
          <p>Dear Agent / Seller,</p>
          <p>Please find below the initial offer terms proposed by the buyer: <strong>${buyerEntity || user?.displayName || 'Valued Investor'}</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Property Address</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${propAddress}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Purchase Price</td>
              <td style="padding: 10px; border: 1px solid #ddd;">$${offerAmount.toLocaleString()}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Earnest Money (EMD)</td>
              <td style="padding: 10px; border: 1px solid #ddd;">$${earnestMoney.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Contingencies</td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                ${financingContingency ? '• Financing Contingency<br/>' : ''}
                ${inspectionContingency ? '• Inspection Contingency<br/>' : ''}
                ${!financingContingency && !inspectionContingency ? 'None' : ''}
              </td>
            </tr>
          </table>

          <p>A formal Letter of Intent PDF has been attached to this transaction record in PaperWorking. Please contact us to coordinate drafting the formal Purchase and Sale Agreement (PSA).</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
          <p style="font-size: 11px; color: #999;">Sent securely via PaperWorking.co Real Estate Investment Platform.</p>
        </div>
      `;

      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          projectId,
          to: [recipientEmail],
          subject: `Letter of Intent (LOI) - ${propAddress}`,
          html: emailHtml,
          text: `Letter of Intent for ${propAddress}. Offer amount: $${offerAmount.toLocaleString()}, Earnest money: $${earnestMoney.toLocaleString()}`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send email.');
      }

      toast.success(`LOI email successfully sent to ${recipientEmail}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error sending LOI email.');
    } finally {
      setSending(false);
    }
  };

  const handleContinue = async () => {
    const contingencies: any[] = [];
    if (financingContingency) {
      contingencies.push({ id: 'c_financing', name: 'Financing', isSatisfied: false, isWaived: false });
    }
    if (inspectionContingency) {
      contingencies.push({ id: 'c_inspection', name: 'Inspection', isSatisfied: false, isWaived: false });
    }

    const payload = {
      contingencies,
      financials: {
        ...f,
        offer_price: offerAmount * 100,
        loiBuyerEntity: buyerEntity,
        loiEarnestAmount: earnestMoney * 100,
        loiTargetClosingDate: closingDate,
        loiContingencies: [
          ...(financingContingency ? ['Financing'] : []),
          ...(inspectionContingency ? ['Inspection'] : []),
        ],
        // Set Offer Status accepted so the Phase Gate completes
        offerStatus: 'Accepted',
        emdAmount: earnestMoney * 100,
        finalAgreedPrice: offerAmount * 100,
        purchasePrice: offerAmount * 100,
      },
    };

    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 5: Offer & Letter of Intent</h3>
        <p className="text-xs text-slate-400">Establish offer pricing and contingencies, generate the physical LOI letter, and notify the listing agent.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buyer entity */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Buyer Entity Name</label>
          <input
            type="text"
            value={buyerEntity}
            onChange={(e) => setBuyerEntity(e.target.value)}
            placeholder="e.g. Apex Holdings LLC, or Your Full Name"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-medium"
          />
        </div>

        {/* Offer Price */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Offer Amount ($)</label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="number"
              value={offerAmount || ''}
              onChange={(e) => {
                setOfferAmount(Number(e.target.value));
                setEarnestMoney(Math.round(Number(e.target.value) * 0.01));
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* Earnest Money */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Earnest Money (EMD) ($)</label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="number"
              value={earnestMoney || ''}
              onChange={(e) => setEarnestMoney(Number(e.target.value))}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* Closing Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Closing Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* Recipient Agent Email */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Listing Agent / Seller Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* Contingency switches */}
        <div className="md:col-span-2 p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Acquisition Contingency Clauses</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={financingContingency}
                onChange={(e) => setFinancingContingency(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              Financing Contingency
            </label>
            <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inspectionContingency}
                onChange={(e) => setInspectionContingency(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              Inspection Contingency
            </label>
          </div>
        </div>
      </div>

      {/* LOI Documents Generator triggers */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Offer & Documentation Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGenerateLOI}
            disabled={generating}
            className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Letter of Intent (LOI)
          </button>
          <button
            type="button"
            onClick={handleSendLOIEmail}
            disabled={sending}
            className="py-3 px-4 bg-emerald-500 hover:opacity-90 text-[#0d0a0b] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Email LOI Offer terms
          </button>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-emerald-500 text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity flex items-center gap-1"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
