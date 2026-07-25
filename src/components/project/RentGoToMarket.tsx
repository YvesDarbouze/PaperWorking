'use client';

import React, { useState } from 'react';
import { Sparkles, Megaphone, CheckSquare, Plus, Trash2, ArrowUpRight, DollarSign, Calendar, Globe, Square, CheckSquare as CheckedIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ListingAdLogEntry, ScreeningChecklistState, ScreeningChecklistItem } from '@/types/schema';

interface Props {
  projectId: string;
  targetRent?: number; // cents
  listingAds?: ListingAdLogEntry[];
  screeningChecklist?: ScreeningChecklistState;
  onSaveTargetRent: (rent: number) => Promise<void>;
  onAddListingAd: (ad: ListingAdLogEntry) => Promise<void>;
  onUpdateAdStatus: (id: string, status: 'active' | 'paused' | 'removed') => Promise<void>;
  onDeleteListingAd: (id: string) => Promise<void>;
  onSaveScreeningChecklist: (state: ScreeningChecklistState) => Promise<void>;
}

export function RentGoToMarket({
  projectId,
  targetRent = 0,
  listingAds = [],
  screeningChecklist = {
    creditScoreCheck: false,
    backgroundCheck: false,
    incomeVerification: false,
    priorEvictionsCheck: false,
    landlordReferences: false,
    customItems: []
  },
  onSaveTargetRent,
  onAddListingAd,
  onUpdateAdStatus,
  onDeleteListingAd,
  onSaveScreeningChecklist
}: Props) {
  const [rentInput, setRentInput] = useState(targetRent > 0 ? (targetRent / 100).toString() : '');
  const [showAddAd, setShowAddAd] = useState(false);
  const [adPlatform, setAdPlatform] = useState('Zillow');
  const [adRent, setAdRent] = useState(targetRent > 0 ? (targetRent / 100).toString() : '');
  const [adUrl, setAdUrl] = useState('');
  const [adDate, setAdDate] = useState(new Date().toISOString().slice(0, 10));
  const [newCustomLabel, setNewCustomLabel] = useState('');

  const handleSaveRent = async () => {
    const val = parseFloat(rentInput.replace(/,/g, ''));
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid monthly rent');
      return;
    }
    await onSaveTargetRent(Math.round(val * 100));
    toast.success('Target rent updated');
  };

  const handleAddAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(adRent.replace(/,/g, ''));
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
    toast.success(`Listing on ${adPlatform} recorded`);
  };

  const toggleCheck = async (key: keyof Omit<ScreeningChecklistState, 'customItems'>) => {
    const updated: ScreeningChecklistState = {
      ...screeningChecklist,
      [key]: !screeningChecklist[key]
    };
    await onSaveScreeningChecklist(updated);
    toast.success('Checklist updated');
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomLabel.trim()) return;

    const newItem: ScreeningChecklistItem = {
      id: `item-${Date.now()}`,
      label: newCustomLabel.trim(),
      checked: false
    };

    const updated: ScreeningChecklistState = {
      ...screeningChecklist,
      customItems: [...(screeningChecklist.customItems || []), newItem]
    };

    await onSaveScreeningChecklist(updated);
    setNewCustomLabel('');
    toast.success('Custom requirement added');
  };

  const toggleCustomItem = async (id: string) => {
    const updatedItems = (screeningChecklist.customItems || []).map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );

    const updated: ScreeningChecklistState = {
      ...screeningChecklist,
      customItems: updatedItems
    };

    await onSaveScreeningChecklist(updated);
  };

  const deleteCustomItem = async (id: string) => {
    const updatedItems = (screeningChecklist.customItems || []).filter(item => item.id !== id);

    const updated: ScreeningChecklistState = {
      ...screeningChecklist,
      customItems: updatedItems
    };

    await onSaveScreeningChecklist(updated);
    toast.success('Requirement removed');
  };

  return (
    <div className="glass-card border border-white/5 rounded-xl p-5 space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-white/5 pb-3">
        <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-wider">
          Go To Market (Card H5.R)
        </span>
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">
          Rent Marketing &amp; Tenant Placement
        </h3>
      </div>

      {/* Target Rent Section */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-[#7A9EAA]" />
          Target Monthly Rent
        </h4>
        <p className="text-[11px] text-[#9E9DA0]">
          Set the expected lease price for syndication and marketing projections.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 1,800.00"
            value={rentInput}
            onChange={e => setRentInput(e.target.value)}
            className="bg-black/35 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none font-mono"
          />
          <button
            onClick={handleSaveRent}
            className="text-xs font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-4 py-2 rounded-lg transition shrink-0"
          >
            Save Target
          </button>
        </div>
      </div>

      {/* Listing / Ad Log Section */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-[#7A9EAA]" />
            Active Advertising Logs
          </h4>
          <button
            onClick={() => setShowAddAd(!showAddAd)}
            className="text-[10px] font-bold text-[#7A9EAA] hover:underline"
          >
            {showAddAd ? 'Cancel' : '+ Add Listing Ad'}
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
                  <option value="Zillow">Zillow</option>
                  <option value="Craigslist">Craigslist</option>
                  <option value="Facebook Marketplace">Facebook Marketplace</option>
                  <option value="Apartments.com">Apartments.com</option>
                  <option value="MLS/Syndication">MLS / Syndication</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Listed Rent ($)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1850"
                  value={adRent}
                  onChange={e => setAdRent(e.target.value)}
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
                placeholder="https://zillow.com/homedetails/..."
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
                Log Ad
              </button>
            </div>
          </form>
        )}

        {listingAds.length === 0 ? (
          <div className="py-4 text-center border border-dashed border-white/5 rounded-lg">
            <p className="text-xs text-[#9E9DA0]/50">No rental ads logged yet.</p>
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
                        View Ad <ArrowUpRight className="w-2.5 h-2.5" />
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

      {/* Screening Checklist Section */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-[#7A9EAA]" />
          Tenant Screening Criteria
        </h4>
        <p className="text-[11px] text-[#9E9DA0]">
          Standardize checks that applicants must clear before lease approval.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { key: 'creditScoreCheck', label: 'Credit Score verification' },
            { key: 'backgroundCheck', label: 'Criminal background check' },
            { key: 'incomeVerification', label: 'Income & employment proof' },
            { key: 'priorEvictionsCheck', label: 'Prior eviction search' },
            { key: 'landlordReferences', label: 'Previous landlord references' }
          ].map(chk => {
            const isChecked = !!(screeningChecklist as any)[chk.key];
            return (
              <div
                key={chk.key}
                onClick={() => toggleCheck(chk.key as any)}
                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition ${
                  isChecked
                    ? 'bg-[#7A9EAA]/10 border-[#7A9EAA]/30 text-white'
                    : 'bg-black/10 border-white/5 text-[#9E9DA0] hover:bg-black/20'
                }`}
              >
                {isChecked ? (
                  <CheckedIcon className="w-4 h-4 text-[#7A9EAA] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-white/30 shrink-0" />
                )}
                <span>{chk.label}</span>
              </div>
            );
          })}
        </div>

        {/* Custom Screening Requirements */}
        <div className="border-t border-white/5 pt-3 space-y-3">
          <p className="text-[10px] text-[#9E9DA0] uppercase font-bold tracking-wider">
            Custom Screening Checks
          </p>

          <form onSubmit={handleAddCustomItem} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Pet policy agreement signed, Co-signer required"
              value={newCustomLabel}
              onChange={e => setNewCustomLabel(e.target.value)}
              className="bg-black/35 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-full outline-none"
            />
            <button
              type="submit"
              className="bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white font-bold px-3 py-1.5 rounded-lg text-xs shrink-0"
            >
              + Add
            </button>
          </form>

          {screeningChecklist.customItems && screeningChecklist.customItems.length > 0 && (
            <div className="space-y-1.5 text-xs">
              {screeningChecklist.customItems.map(item => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-black/20 border border-white/5 p-2 rounded-lg"
                >
                  <div
                    onClick={() => toggleCustomItem(item.id)}
                    className="flex items-center gap-2.5 cursor-pointer select-none flex-grow text-left"
                  >
                    {item.checked ? (
                      <CheckedIcon className="w-4 h-4 text-[#7A9EAA] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-white/30 shrink-0" />
                    )}
                    <span className={item.checked ? 'line-through text-[#9E9DA0]' : 'text-white'}>
                      {item.label}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteCustomItem(item.id)}
                    className="text-[#9E9DA0] hover:text-red-400 p-0.5 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
