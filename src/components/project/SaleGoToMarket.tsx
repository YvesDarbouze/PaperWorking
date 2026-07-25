'use client';

import React, { useState } from 'react';
import { Sparkles, Megaphone, User, Mail, Phone, Building, Trash2, Plus, ArrowUpRight, DollarSign, Calendar, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import type { F4VendorAssignment, ListingAdLogEntry } from '@/types/schema';

interface Props {
  projectId: string;
  listPriceSale?: number; // cents
  listingAgentVendor?: F4VendorAssignment | null;
  listingAds?: ListingAdLogEntry[];
  onSaveListPrice: (price: number) => Promise<void>;
  onSaveListingAgent: (agent: F4VendorAssignment | null) => Promise<void>;
  onAddListingAd: (ad: ListingAdLogEntry) => Promise<void>;
  onUpdateAdStatus: (id: string, status: 'active' | 'paused' | 'removed') => Promise<void>;
  onDeleteListingAd: (id: string) => Promise<void>;
}

export function SaleGoToMarket({
  projectId,
  listPriceSale = 0,
  listingAgentVendor = null,
  listingAds = [],
  onSaveListPrice,
  onSaveListingAgent,
  onAddListingAd,
  onUpdateAdStatus,
  onDeleteListingAd
}: Props) {
  const [priceInput, setPriceInput] = useState(listPriceSale > 0 ? (listPriceSale / 100).toString() : '');
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentName, setAgentName] = useState(listingAgentVendor?.name || '');
  const [agentCompany, setAgentCompany] = useState(listingAgentVendor?.firm || '');
  const [agentEmail, setAgentEmail] = useState(listingAgentVendor?.email || '');
  const [agentPhone, setAgentPhone] = useState(listingAgentVendor?.phone || '');

  const [showAddAd, setShowAddAd] = useState(false);
  const [adPlatform, setAdPlatform] = useState('MLS/Syndication');
  const [adPrice, setAdPrice] = useState(listPriceSale > 0 ? (listPriceSale / 100).toString() : '');
  const [adUrl, setAdUrl] = useState('');
  const [adDate, setAdDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSavePrice = async () => {
    const val = parseFloat(priceInput.replace(/,/g, ''));
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid target list price');
      return;
    }
    await onSaveListPrice(Math.round(val * 100));
    toast.success('Target sale list price updated');
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentCompany.trim() || !agentEmail.trim()) {
      toast.error('Please fill in Name, Brokerage, and Email');
      return;
    }

    const newAgent: F4VendorAssignment = {
      name: agentName.trim(),
      firm: agentCompany.trim(),
      email: agentEmail.trim(),
      phone: agentPhone.trim() || null,
      source: 'off_platform',
      assignedAt: new Date().toISOString(),
      assignedBy: 'user'
    };

    await onSaveListingAgent(newAgent);
    setShowAgentForm(false);
    toast.success('Listing agent assigned successfully');
  };

  const handleRemoveAgent = async () => {
    if (confirm('Are you sure you want to remove the assigned listing agent?')) {
      await onSaveListingAgent(null);
      setAgentName('');
      setAgentCompany('');
      setAgentEmail('');
      setAgentPhone('');
      toast.success('Listing agent removed');
    }
  };

  const handleAddAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(adPrice.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid listing price');
      return;
    }

    const newAd: ListingAdLogEntry = {
      id: `ad-${Date.now()}`,
      platform: adPlatform,
      listingUrl: adUrl.trim() || null,
      status: 'active',
      listedDate: adDate,
      monthlyRent: Math.round(val * 100) // we reuse monthlyRent for listed price cents
    };

    await onAddListingAd(newAd);
    setAdUrl('');
    setShowAddAd(false);
    toast.success(`Property listed on ${adPlatform}`);
  };

  return (
    <div className="glass-card border border-white/5 rounded-xl p-5 space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-white/5 pb-3">
        <span className="text-[10px] text-[#7A9EAA] uppercase font-bold tracking-wider">
          Go To Market (Card H5.S)
        </span>
        <h3 className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">
          Sale Marketing &amp; Disposition
        </h3>
      </div>

      {/* Target List Price Section */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-[#7A9EAA]" />
          Target List Price
        </h4>
        <p className="text-[11px] text-[#9E9DA0]">
          Set the expected public listing price for MLS syndication.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 350,000.00"
            value={priceInput}
            onChange={e => setPriceInput(e.target.value)}
            className="bg-black/35 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none font-mono"
          />
          <button
            onClick={handleSavePrice}
            className="text-xs font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-4 py-2 rounded-lg transition shrink-0"
          >
            Save Price
          </button>
        </div>
      </div>

      {/* Listing Agent Slot Section */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#7A9EAA]" />
            Listing Agent Slot
          </h4>
          {!listingAgentVendor && !showAgentForm && (
            <button
              onClick={() => setShowAgentForm(true)}
              className="text-[10px] font-bold text-[#7A9EAA] hover:underline"
            >
              + Assign Agent
            </button>
          )}
        </div>

        {listingAgentVendor ? (
          <div className="flex justify-between items-start bg-black/20 border border-white/5 p-3 rounded-lg text-xs">
            <div className="space-y-1">
              <p className="font-bold text-white text-sm">{listingAgentVendor.name}</p>
              <div className="flex items-center gap-1.5 text-[#9E9DA0]">
                <Building className="w-3.5 h-3.5 text-[#7A9EAA]" />
                <span>{listingAgentVendor.firm}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#9E9DA0]">
                <Mail className="w-3.5 h-3.5 text-[#7A9EAA]" />
                <span>{listingAgentVendor.email}</span>
              </div>
              {listingAgentVendor.phone && (
                <div className="flex items-center gap-1.5 text-[#9E9DA0]">
                  <Phone className="w-3.5 h-3.5 text-[#7A9EAA]" />
                  <span>{listingAgentVendor.phone}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRemoveAgent}
              className="text-[#9E9DA0] hover:text-red-400 p-0.5"
              title="Remove Agent"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : showAgentForm ? (
          <form onSubmit={handleSaveAgent} className="bg-black/20 border border-white/10 p-3 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Agent Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white w-full outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Brokerage / Company</label>
                <input
                  type="text"
                  required
                  placeholder="Apex Real Estate Brokerage"
                  value={agentCompany}
                  onChange={e => setAgentCompany(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white w-full outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@brokerage.com"
                  value={agentEmail}
                  onChange={e => setAgentEmail(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white w-full outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="(555) 019-2834"
                  value={agentPhone}
                  onChange={e => setAgentPhone(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white w-full outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 text-[10px]">
              <button
                type="button"
                onClick={() => setShowAgentForm(false)}
                className="text-[#9E9DA0] hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white font-bold px-3 py-1.5 rounded"
              >
                Assign Agent
              </button>
            </div>
          </form>
        ) : (
          <div className="py-4 text-center border border-dashed border-white/5 rounded-lg">
            <p className="text-xs text-[#9E9DA0]/50">No listing agent assigned. Click "+ Assign Agent" to add brokerage details.</p>
          </div>
        )}
      </div>

      {/* Listing / Ad Log Section */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-[#7A9EAA]" />
            MLS &amp; Syndication Portals
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
                  <option value="MLS/Syndication">MLS / Syndication</option>
                  <option value="Redfin">Redfin</option>
                  <option value="Zillow">Zillow</option>
                  <option value="Realtor.com">Realtor.com</option>
                  <option value="Trulia">Trulia</option>
                  <option value="MLS Private Network">MLS Private Network</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[#9E9DA0]">Listed Price ($)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 350000"
                  value={adPrice}
                  onChange={e => setAdPrice(e.target.value)}
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
                placeholder="https://redfin.com/homes/..."
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
            <p className="text-xs text-[#9E9DA0]/50">No property listings logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {listingAds.map(ad => (
              <div key={ad.id} className="flex justify-between items-center bg-black/20 border border-white/5 p-2.5 rounded-lg text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{ad.platform}</span>
                    <span className="text-mono text-[#9E9DA0]">
                      ${(ad.monthlyRent / 100).toLocaleString()}
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
                        View Listing <ArrowUpRight className="w-2.5 h-2.5" />
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
