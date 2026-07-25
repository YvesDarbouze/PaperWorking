'use client';

import React, { useState } from 'react';
import { Sparkles, Megaphone, FileText, Plus, Trash2, ArrowUpRight, DollarSign, Calendar, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TargetLeaseTerms, ListingAdLogEntry } from '@/types/schema';

interface Props {
  projectId: string;
  leaseTerms?: TargetLeaseTerms;
  listingAds?: ListingAdLogEntry[];
  onSaveLeaseTerms: (terms: TargetLeaseTerms) => Promise<void>;
  onAddListingAd: (ad: ListingAdLogEntry) => Promise<void>;
  onUpdateAdStatus: (id: string, status: 'active' | 'paused' | 'removed') => Promise<void>;
  onDeleteListingAd: (id: string) => Promise<void>;
}

export function LeaseGoToMarket({
  projectId,
  leaseTerms = { rateCents: 0, termMonths: 12, type: 'NNN', sqft: null },
  listingAds = [],
  onSaveLeaseTerms,
  onAddListingAd,
  onUpdateAdStatus,
  onDeleteListingAd
}: Props) {
  const [rateInput, setRateInput] = useState(leaseTerms.rateCents > 0 ? (leaseTerms.rateCents / 100).toString() : '');
  const [termInput, setTermInput] = useState(leaseTerms.termMonths.toString());
  const [leaseType, setLeaseType] = useState<'NNN' | 'Modified_Gross' | 'Gross'>(leaseTerms.type || 'NNN');
  const [sqftInput, setSqftInput] = useState(leaseTerms.sqft ? leaseTerms.sqft.toString() : '');

  const [showAddAd, setShowAddAd] = useState(false);
  const [adPlatform, setAdPlatform] = useState('LoopNet');
  const [adRate, setAdRate] = useState(leaseTerms.rateCents > 0 ? (leaseTerms.rateCents / 100).toString() : '');
  const [adUrl, setAdUrl] = useState('');
  const [adDate, setAdDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSaveTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateVal = parseFloat(rateInput.replace(/,/g, ''));
    const termVal = parseInt(termInput);
    const sqftVal = sqftInput ? parseFloat(sqftInput.replace(/,/g, '')) : null;

    if (isNaN(rateVal) || rateVal < 0) {
      toast.error('Please enter a valid lease rate');
      return;
    }
    if (isNaN(termVal) || termVal <= 0) {
      toast.error('Please enter a valid lease term (months)');
      return;
    }

    const updated: TargetLeaseTerms = {
      rateCents: Math.round(rateVal * 100),
      termMonths: termVal,
      type: leaseType,
      sqft: sqftVal && !isNaN(sqftVal) ? sqftVal : null
    };

    await onSaveLeaseTerms(updated);
    toast.success('Target lease terms saved');
  };

  const handleAddAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(adRate.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid listing rent');
      return;
    }

    const newAd: ListingAdLogEntry = {
      id: `ad-${Date.now()}`,
      platform: adPlatform,
      listingUrl: adUrl.trim() || null,
      status: 'active',
      listedDate: adDate,
      monthlyRent: Math.round(val * 100)
    };

    await onAddListingAd(newAd);
    setAdUrl('');
    setShowAddAd(false);
    toast.success(`Lease listing on ${adPlatform} recorded`);
  };

  const getLeaseTypeExplanation = (type: string) => {
    switch (type) {
      case 'NNN': return 'Triple Net: Tenant pays base rent plus taxes, insurance, and maintenance costs.';
      case 'Modified_Gross': return 'Modified Gross: Tenant pays base rent plus some utilities/operating expenses.';
      case 'Gross': return 'Full Gross: landlord pays all property taxes, insurance, and operating expenses.';
      default: return '';
    }
  };

  return (
    <div className="glass-card border border-white/5 rounded-xl p-5 space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-white/5 pb-3">
        <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-wider">
          Go To Market (Card H5.L)
        </span>
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">
          Commercial Lease &amp; Marketing
        </h3>
      </div>

      {/* Lease Terms Form */}
      <form onSubmit={handleSaveTerms} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-[#7A9EAA]" />
          Target Lease Terms
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Monthly Base Rate ($)</label>
            <input
              type="text"
              required
              placeholder="e.g. 4,500.00"
              value={rateInput}
              onChange={e => setRateInput(e.target.value)}
              className="bg-black/35 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Lease Term (Months)</label>
            <input
              type="number"
              required
              placeholder="e.g. 36"
              value={termInput}
              onChange={e => setTermInput(e.target.value)}
              className="bg-black/35 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Lease Type (Structure)</label>
            <select
              value={leaseType}
              onChange={e => setLeaseType(e.target.value as any)}
              className="bg-[#121014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none"
            >
              <option value="NNN">NNN (Triple Net)</option>
              <option value="Modified_Gross">Modified Gross</option>
              <option value="Gross">Gross Lease</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Building Sqft (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 2,500"
              value={sqftInput}
              onChange={e => setSqftInput(e.target.value)}
              className="bg-black/35 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none font-mono"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#7A9EAA]/5 border border-[#7A9EAA]/15 text-[10px] text-[#9E9DA0]">
          <ShieldAlert className="w-4 h-4 text-[#7A9EAA] shrink-0 mt-0.5" />
          <p>{getLeaseTypeExplanation(leaseType)}</p>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="text-xs font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-4 py-2 rounded-lg transition"
          >
            Save Target Terms
          </button>
        </div>
      </form>

      {/* Listing / Ad Log Section */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-[#7A9EAA]" />
            Lease Listing Log
          </h4>
          <button
            onClick={() => setShowAddAd(!showAddAd)}
            className="text-[10px] font-bold text-[#7A9EAA] hover:underline"
          >
            {showAddAd ? 'Cancel' : '+ Log Listing'}
          </button>
        </div>

        {showAddAd && (
          <form onSubmit={handleAddAdSubmit} className="bg-black/20 border border-white/10 p-3 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Platform</label>
                <select
                  value={adPlatform}
                  onChange={e => setAdPlatform(e.target.value)}
                  className="bg-[#121014] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-full outline-none"
                >
                  <option value="LoopNet">LoopNet</option>
                  <option value="Crexi">Crexi</option>
                  <option value="CoStar">CoStar</option>
                  <option value="MLS/Syndication">MLS / Syndication</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Listed Rent ($)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4500"
                  value={adRate}
                  onChange={e => setAdRate(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-full outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Listed Date</label>
                <input
                  type="date"
                  required
                  value={adDate}
                  onChange={e => setAdDate(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-full outline-none filter invert"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Listing URL (Optional)</label>
              <input
                type="url"
                placeholder="https://loopnet.com/Listing/..."
                value={adUrl}
                onChange={e => setAdUrl(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white w-full outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1 text-[10px]">
              <button
                type="button"
                onClick={() => setShowAddAd(false)}
                className="text-[#9E9DA0] hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white font-bold px-3 py-1.5 rounded"
              >
                Log Listing
              </button>
            </div>
          </form>
        )}

        {listingAds.length === 0 ? (
          <div className="py-4 text-center border border-dashed border-white/5 rounded-lg">
            <p className="text-xs text-[#9E9DA0]/50">No lease listings logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {listingAds.map(ad => (
              <div key={ad.id} className="flex justify-between items-center bg-black/20 border border-white/5 p-2.5 rounded-lg text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{ad.platform}</span>
                    <span className="text-mono text-[#9E9DA0]">
                      ${(ad.monthlyRent / 100).toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-[#9E9DA0]">
                      Listed: {new Date(ad.listedDate).toLocaleDateString()}
                    </span>
                    {ad.listingUrl && (
                      <a
                        href={ad.listingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] text-[#7A9EAA] hover:underline flex items-center gap-0.5"
                      >
                        View ad <ArrowUpRight className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={ad.status}
                    onChange={e => onUpdateAdStatus(ad.id, e.target.value as any)}
                    className="bg-[#121014] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="removed">Removed</option>
                  </select>
                  <button
                    onClick={() => onDeleteListingAd(ad.id)}
                    className="text-[#9E9DA0] hover:text-red-400 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
