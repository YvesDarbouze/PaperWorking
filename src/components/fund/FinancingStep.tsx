'use client';

import React, { useState } from 'react';
import { Landmark, Mail, Calendar, Upload, AlertCircle, FileText, Send, Loader2 } from 'lucide-react';
import { useMarketplaceVendors } from '@/hooks/useMarketplaceVendors';
import type { CapitalSource } from '@/types/schema';
import toast from 'react-hot-toast';

interface FinancingStepProps {
  projectId: string;
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function FinancingStep({
  projectId,
  initialData,
  onSave,
}: FinancingStepProps) {
  const f = initialData?.financials || {};
  const [sources, setSources] = useState<CapitalSource[]>(f.capitalStack || []);

  const [requestingQuoteId, setRequestingQuoteId] = useState<string | null>(null);

  // Suggest lenders from target ZIP using marketplace vendors hook
  const { vendors: marketplaceLenders } = useMarketplaceVendors('f4HardMoneyLenderVendor');

  // Handle single source details mutation
  const handleUpdateDetail = (id: string, updates: Partial<CapitalSource> | any) => {
    setSources(
      sources.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleSendInvite = async (sourceId: string, partnerEmail: string) => {
    if (!partnerEmail || !partnerEmail.includes('@')) {
      toast.error('Specify a valid partner email address.');
      return;
    }
    
    toast.loading('Sending invitation email...');
    try {
      // Simulate invite API payload
      await new Promise((r) => setTimeout(r, 600));
      toast.dismiss();
      toast.success(`Invitation successfully dispatched to ${partnerEmail}!`);
      handleUpdateDetail(sourceId, { status: 'Applied' });
    } catch (err) {
      toast.dismiss();
      toast.error('Invitation failed.');
    }
  };

  const handleRequestQuote = async (lenderId: string) => {
    setRequestingQuoteId(lenderId);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Financing proposal quote request sent to lender!');
    } catch (err) {
      toast.error('Failed to request quote.');
    } finally {
      setRequestingQuoteId(null);
    }
  };

  const handleContinue = async () => {
    const payload = {
      financials: {
        ...f,
        capitalStack: sources,
      },
    };
    await onSave(payload);
  };

  const debtSources = sources.filter((s) =>
    ['conventional_loan', 'hard_money', 'bridge', 'sba_504_bank', 'sba_504_cdc'].includes(s.type || '')
  );

  const equitySources = sources.filter((s) =>
    ['solo_cash', 'syndication_equity', 'co_buyer_equity'].includes(s.type || '')
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 2: Financing Details</h3>
        <p className="text-xs text-slate-400">Track lender application milestones and verify partner equity commitments.</p>
      </div>

      {/* Debt details cards */}
      {debtSources.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Debt Financing Tracks</h4>
          <div className="space-y-4">
            {debtSources.map((s) => (
              <div key={s.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-sky-400" /> {s.category} (${s.amount.toLocaleString()})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Rate: {s.interestRate}%</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Lender Name */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-slate-500">Lender Name</label>
                    <input
                      type="text"
                      value={s.lenderName || ''}
                      onChange={(e) => handleUpdateDetail(s.id, { lenderName: e.target.value })}
                      placeholder="e.g. Apex Bank"
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-slate-500">Application Status</label>
                    <select
                      value={s.status || 'Exploring'}
                      onChange={(e) => handleUpdateDetail(s.id, { status: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold"
                    >
                      <option value="Exploring" className="bg-[#181315]">Exploring</option>
                      <option value="Applied" className="bg-[#181315]">Applied</option>
                      <option value="Approved" className="bg-[#181315]">Approved</option>
                      <option value="Funded" className="bg-[#181315]">Cleared to Close</option>
                    </select>
                  </div>

                  {/* Lock Expiration */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-slate-500">Rate Lock Expiration</label>
                    <input
                      type="date"
                      value={s.notes?.split('|')[0] || ''}
                      onChange={(e) => handleUpdateDetail(s.id, { notes: `${e.target.value}|${s.notes?.split('|')[1] || ''}` })}
                      className="w-full px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
                    />
                  </div>

                  {/* Appraisal dates */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-slate-500">Appraisal Target Date</label>
                    <input
                      type="date"
                      value={s.notes?.split('|')[1] || ''}
                      onChange={(e) => handleUpdateDetail(s.id, { notes: `${s.notes?.split('|')[0] || ''}|${e.target.value}` })}
                      className="w-full px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs h-8"
                    />
                  </div>

                  {/* Upload Document */}
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleUpdateDetail(s.id, { notes: 'uploaded_commitment_letter.pdf' })}
                      className="w-full h-8 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {s.notes === 'uploaded_commitment_letter.pdf' ? 'Commitment Letter Uploaded ✓' : 'Upload Loan Commitment Letter'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equity details cards */}
      {equitySources.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Equity Partner Allocations</h4>
          <div className="space-y-4">
            {equitySources.map((s) => (
              <div key={s.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" /> {s.category} (${s.amount.toLocaleString()})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Status: {s.status || 'Exploring'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-slate-500">Partner / Contact Name</label>
                    <input
                      type="text"
                      value={s.lenderName || ''}
                      onChange={(e) => handleUpdateDetail(s.id, { lenderName: e.target.value })}
                      placeholder="e.g. Jane Capital"
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase text-slate-500">Contact Email</label>
                    <input
                      type="email"
                      value={s.notes || ''}
                      onChange={(e) => handleUpdateDetail(s.id, { notes: e.target.value })}
                      placeholder="investor@funds.com"
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
                    />
                  </div>

                  {/* Action invite */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleSendInvite(s.id, s.notes || '')}
                      className="w-full h-8 bg-emerald-500 hover:opacity-90 text-black rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" /> Invite / Verify Equity
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Marketplace Lenders Panel */}
      {marketplaceLenders.length > 0 && (
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Suggested Lenders matching target ZIP</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {marketplaceLenders.slice(0, 4).map((l) => (
              <div key={l.uid} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{l.companyName}</p>
                  <p className="text-[9px] text-slate-500">Avg Turnaround: {l.avgTurnaroundDays} Days • Rating: {l.overallRating}★</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRequestQuote(l.uid)}
                  disabled={requestingQuoteId === l.uid}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white flex items-center gap-1 transition-all"
                >
                  {requestingQuoteId === l.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Request Quote'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-[#7A9EAA] text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
