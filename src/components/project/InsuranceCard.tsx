'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle, Clock, Trash2, Info, Landmark, ShieldAlert, Plus, DollarSign } from 'lucide-react';
import type { Project, InsuranceQuote } from '@/types/schema';
import toast from 'react-hot-toast';

interface InsuranceCardProps {
  project: Project;
  onSaveFinancials: (updates: any) => Promise<void>;
  phaseColor?: string;
  readOnly?: boolean;
}

export function InsuranceCard({
  project,
  onSaveFinancials,
  phaseColor = '#595959',
  readOnly = false,
}: InsuranceCardProps) {
  const financials = project.financials || {};
  const quotes: InsuranceQuote[] = financials.insuranceQuotes || [];

  // Form states for adding new quote
  const [carrier, setCarrier] = useState('');
  const [policyType, setPolicyType] = useState('HO-3 Homeowners');
  const [monthlyPremium, setMonthlyPremium] = useState('');
  const [coverageLimit, setCoverageLimit] = useState('');
  const [liabilityLimit, setLiabilityLimit] = useState('');
  const [lossOfRentLimit, setLossOfRentLimit] = useState('');
  const [hasFloodWindRider, setHasFloodWindRider] = useState(false);

  // Sync state helpers
  const handleSaveField = async (fieldName: string, value: any) => {
    try {
      await onSaveFinancials({ [fieldName]: value });
    } catch (err) {
      console.error(`Failed to save ${fieldName}:`, err);
      toast.error('Failed to save changes');
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!carrier.trim() || !monthlyPremium) {
      toast.error('Carrier and premium are required');
      return;
    }

    const premiumVal = parseFloat(monthlyPremium) || 0;
    const newQuote: InsuranceQuote = {
      id: crypto.randomUUID(),
      carrier: carrier.trim(),
      policyType,
      monthlyPremium: premiumVal,
      premium: premiumVal * 12, // Annual
      coverageLimit: parseFloat(coverageLimit) || 0,
      liabilityLimit: parseFloat(liabilityLimit) || 0,
      lossOfRentLimit: parseFloat(lossOfRentLimit) || 0,
      hasFloodWindRider,
      isAccepted: false,
    };

    const updatedQuotes = [...quotes, newQuote];
    try {
      await onSaveFinancials({ insuranceQuotes: updatedQuotes });
      toast.success('Insurance quote added!');
      // Reset form
      setCarrier('');
      setMonthlyPremium('');
      setCoverageLimit('');
      setLiabilityLimit('');
      setLossOfRentLimit('');
      setHasFloodWindRider(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add quote');
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (readOnly) return;
    const updatedQuotes = quotes.filter(q => q.id !== id);
    try {
      await onSaveFinancials({ insuranceQuotes: updatedQuotes });
      toast.success('Quote deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete quote');
    }
  };

  const handleAcceptQuote = async (quote: InsuranceQuote) => {
    if (readOnly) return;
    const updatedQuotes = quotes.map(q => ({
      ...q,
      isAccepted: q.id === quote.id,
    }));

    try {
      // Overwrite the estimate in financials.insurance with the accepted quote's monthly premium
      await onSaveFinancials({
        insuranceQuotes: updatedQuotes,
        insuranceCarrier: quote.carrier,
        insurancePolicyType: quote.policyType,
        insurance: quote.monthlyPremium, // updates the AQ-10 insurance estimate
      });
      toast.success(`Accepted ${quote.carrier} quote! Monthly premium updated to $${quote.monthlyPremium}.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept quote');
    }
  };

  const handleQuoteUploadDoc = async (quoteId: string) => {
    if (readOnly) return;
    const updatedQuotes = quotes.map(q => {
      if (q.id === quoteId) {
        return {
          ...q,
          documentUrl: `/mock/documents/Insurance_Quote_${q.carrier.replace(/\s+/g, '_')}.pdf`,
          documentName: `Insurance_Quote_${q.carrier.replace(/\s+/g, '_')}.pdf`,
        };
      }
      return q;
    });

    try {
      await onSaveFinancials({ insuranceQuotes: updatedQuotes });
      toast.success('Quote document uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 animate-pulse" style={{ color: phaseColor }} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Insurance Quotes Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider">Hazard &amp; Liability Coverage</span>
      </div>

      {/* Quote input form */}
      {!readOnly && (
        <form onSubmit={handleAddQuote} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <h4 className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Premium Quote
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Carrier */}
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">Carrier (Vendor)</label>
              <input
                type="text"
                id="quote-carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. State Farm, Liberty Mutual"
                className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
              />
            </div>
            {/* Policy Type */}
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">Policy Type</label>
              <select
                id="quote-policy-type"
                value={policyType}
                onChange={(e) => setPolicyType(e.target.value)}
                className="px-3 py-1.5 w-full bg-[#121014] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955]"
              >
                <option value="HO-3 Homeowners">HO-3 Homeowners</option>
                <option value="DP-3 Dwelling Fire">DP-3 Dwelling Fire</option>
                <option value="Commercial General Liability">Commercial General Liability</option>
                <option value="Builders Risk / Vacant">Builders Risk / Vacant</option>
              </select>
            </div>
            {/* Monthly Premium */}
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">Monthly Premium ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#9E9DA0]" />
                <input
                  type="number"
                  id="quote-monthly-premium"
                  value={monthlyPremium}
                  onChange={(e) => setMonthlyPremium(e.target.value)}
                  placeholder="e.g. 120"
                  className="pl-8 pr-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955] font-mono"
                />
              </div>
            </div>
            {/* Coverage Limit */}
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">Coverage Limit ($)</label>
              <input
                type="number"
                id="quote-coverage"
                value={coverageLimit}
                onChange={(e) => setCoverageLimit(e.target.value)}
                placeholder="e.g. 350000"
                className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955] font-mono"
              />
            </div>
            {/* Liability Limit */}
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">Liability Limit ($)</label>
              <input
                type="number"
                id="quote-liability"
                value={liabilityLimit}
                onChange={(e) => setLiabilityLimit(e.target.value)}
                placeholder="e.g. 1000000"
                className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955] font-mono"
              />
            </div>
            {/* Loss of Rent */}
            <div>
              <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider mb-1">Loss of Rent ($)</label>
              <input
                type="number"
                id="quote-loss-of-rent"
                value={lossOfRentLimit}
                onChange={(e) => setLossOfRentLimit(e.target.value)}
                placeholder="e.g. 24000"
                className="px-3 py-1.5 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#454955] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Flood/Wind Rider */}
            <div
              id="quote-flood-wind-toggle"
              onClick={() => setHasFloodWindRider(!hasFloodWindRider)}
              className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#9E9DA0] hover:text-white"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                hasFloodWindRider ? 'bg-[#454955] border-[#454955]' : 'border-white/20'
              }`}>
                {hasFloodWindRider && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              <span>Includes Flood/Wind Rider</span>
            </div>

            <button
              type="submit"
              id="add-quote-submit-btn"
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            >
              Add Quote
            </button>
          </div>
        </form>
      )}

      {/* List of Quotes */}
      <div className="space-y-4">
        {quotes.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#9E9DA0]/60 border border-dashed border-white/5 rounded-xl">
            No premium quotes added yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                id={`quote-card-${quote.id}`}
                className={`p-4 rounded-xl border transition-all space-y-3 relative ${
                  quote.isAccepted
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                }`}
              >
                {/* Accept badge or accept button */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {quote.isAccepted ? (
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400" /> Accepted
                    </span>
                  ) : (
                    !readOnly && (
                      <button
                        type="button"
                        id={`accept-quote-btn-${quote.id}`}
                        onClick={() => handleAcceptQuote(quote)}
                        className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-all"
                      >
                        Accept Quote
                      </button>
                    )
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="p-1 text-[#F06543] hover:bg-[#F06543]/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Carrier & Policy details */}
                <div className="pr-24">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{quote.carrier}</h4>
                  <span className="text-[10px] text-[#9E9DA0]">{quote.policyType}</span>
                </div>

                {/* Limits & Premium details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">Monthly Premium</span>
                    <span className="font-mono text-white font-medium">${quote.monthlyPremium}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">Coverage Limit</span>
                    <span className="font-mono text-white font-medium">${quote.coverageLimit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">Liability Limit</span>
                    <span className="font-mono text-white font-medium">${quote.liabilityLimit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">Rider Included</span>
                    <span className="font-mono text-white font-medium">{quote.hasFloodWindRider ? 'Yes (Flood/Wind)' : 'No'}</span>
                  </div>
                </div>

                {/* Doc attachment */}
                <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#9E9DA0]">Quote PDF Attachment</span>
                  {quote.documentUrl ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <FileText className="w-3.5 h-3.5 text-green-500" />
                      <span className="font-bold">{quote.documentName}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id={`upload-quote-doc-${quote.id}`}
                      onClick={() => handleQuoteUploadDoc(quote.id)}
                      disabled={readOnly}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#454955] hover:text-white transition-colors"
                    >
                      Upload Quote PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
