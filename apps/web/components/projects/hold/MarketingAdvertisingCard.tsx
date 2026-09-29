'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type { ListingAdRecord, ProjectWorkspace } from '@/lib/projects/types';

interface MarketingAdvertisingCardProps {
  project: ProjectWorkspace;
  listingAds: ListingAdRecord[];
  onUpdateListingAds: (ads: ListingAdRecord[]) => void;
  dispositionStrategy: 'RENT' | 'LEASE' | 'SALE';
}

export const MARKETING_CHANNELS = [
  'Zillow',
  'CoStar / Apartments.com',
  'Facebook Marketplace',
  'MLS / Realtor.com',
  'StreetEasy',
  'Yard Sign',
  'Broker Direct',
  'Other',
] as const;

export default function MarketingAdvertisingCard({
  project,
  listingAds,
  onUpdateListingAds,
  dispositionStrategy,
}: MarketingAdvertisingCardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannel, setNewChannel] = useState<ListingAdRecord['channel']>('Zillow');
  const [newSpend, setNewSpend] = useState(150);
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newNotes, setNewNotes] = useState('');

  const totalMarketingSpend = useMemo(
    () => listingAds.reduce((acc, ad) => acc + ad.spendAmount, 0),
    [listingAds]
  );
  const totalInquiries = useMemo(
    () => listingAds.reduce((acc, ad) => acc + ad.inquiriesGenerated, 0),
    [listingAds]
  );
  const totalShowings = useMemo(
    () => listingAds.reduce((acc, ad) => acc + ad.showingsScheduled, 0),
    [listingAds]
  );
  const totalApplications = useMemo(
    () => listingAds.reduce((acc, ad) => acc + ad.applicationsReceived, 0),
    [listingAds]
  );

  const costPerInquiry = totalInquiries > 0 ? Math.round(totalMarketingSpend / totalInquiries) : 0;
  const costPerShowing = totalShowings > 0 ? Math.round(totalMarketingSpend / totalShowings) : 0;

  const handleUpdateLeadMetrics = (
    id: string,
    field: 'inquiriesGenerated' | 'showingsScheduled' | 'applicationsReceived',
    delta: number
  ) => {
    const updated = listingAds.map((ad) => {
      if (ad.id === id) {
        const nextVal = Math.max(0, ad[field] + delta);
        return { ...ad, [field]: nextVal };
      }
      return ad;
    });
    onUpdateListingAds(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = listingAds.map((ad) => {
      if (ad.id === id) {
        const nextStatus: ListingAdRecord['status'] =
          ad.status === 'active' ? 'paused' : ad.status === 'paused' ? 'completed' : 'active';
        return { ...ad, status: nextStatus };
      }
      return ad;
    });
    onUpdateListingAds(updated);
  };

  const handleAddAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSpend < 0) return;
    const newRecord: ListingAdRecord = {
      id: `ad-${Date.now()}`,
      channel: newChannel,
      datePlaced: new Date().toISOString().slice(0, 10),
      spendAmount: Number(newSpend),
      isRecurring: newIsRecurring,
      status: 'active',
      inquiriesGenerated: 0,
      showingsScheduled: 0,
      applicationsReceived: 0,
      notes: newNotes.trim() || undefined,
    };
    onUpdateListingAds([...listingAds, newRecord]);
    setNewSpend(150);
    setNewNotes('');
    setNewIsRecurring(false);
    setShowAddModal(false);
  };

  const handleDeleteAd = (id: string) => {
    onUpdateListingAds(listingAds.filter((ad) => ad.id !== id));
  };

  return (
    <div className="space-y-6" data-testid="marketing-advertising-card">
      {/* Marketing Overview & Header */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Go-to-Market & Advertising
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Marketing Campaign Log ({dispositionStrategy === 'SALE' ? 'Buyer Acquisition' : 'Tenant Placement'})
            </h2>
          </div>
          <button
            type="button"
            data-testid="add-ad-campaign-btn"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] px-4 py-2 border border-neutral-700 bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 transition rounded-none flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Record New Placement</span>
          </button>
        </div>

        {/* 4 Conversion KPI Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Total Ad Spend</span>
            <span className="text-base font-bold font-mono text-white mt-1 block">
              {formatCurrency(totalMarketingSpend)}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              {listingAds.length} Placements Logged
            </span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Inquiries / Leads</span>
            <span className="text-base font-bold font-mono text-white mt-1 block">{totalInquiries}</span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              {costPerInquiry > 0 ? `${formatCurrency(costPerInquiry)}/lead` : 'Zero cost leads'}
            </span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Showings Conducted</span>
            <span className="text-base font-bold font-mono text-white mt-1 block">{totalShowings}</span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              {costPerShowing > 0 ? `${formatCurrency(costPerShowing)}/showing` : 'Zero showings'}
            </span>
          </div>
          <div className="border border-neutral-800 bg-neutral-900/60 p-3.5 rounded-none">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block">Applications / Offers</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">{totalApplications}</span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              {totalInquiries > 0 ? `${Math.round((totalApplications / totalInquiries) * 100)}% conversion` : 'Pending leads'}
            </span>
          </div>
        </div>
      </div>

      {/* Listing Ad Records Table */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono mb-4">
          Active Listing Ads & Channel Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 pr-4">Channel & Strategy</th>
                <th className="py-2.5 px-4">Date Placed</th>
                <th className="py-2.5 px-4 text-right">Spend</th>
                <th className="py-2.5 px-4 text-center">Inquiries</th>
                <th className="py-2.5 px-4 text-center">Showings</th>
                <th className="py-2.5 px-4 text-center">Applications</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-200">
              {listingAds.map((ad) => (
                <tr key={ad.id} className="hover:bg-neutral-900/40 transition">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{ad.channel}</span>
                      {ad.isRecurring && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase border border-neutral-700 bg-neutral-900 text-neutral-300 rounded-none">
                          Monthly
                        </span>
                      )}
                    </div>
                    {ad.notes && <p className="text-[11px] text-neutral-400 mt-0.5">{ad.notes}</p>}
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-400">{ad.datePlaced}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    {formatCurrency(ad.spendAmount)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <div className="inline-flex items-center gap-1 border border-neutral-800 bg-neutral-900 px-2 py-0.5 rounded-none">
                      <button
                        type="button"
                        onClick={() => handleUpdateLeadMetrics(ad.id, 'inquiriesGenerated', -1)}
                        className="text-neutral-400 hover:text-white px-1 text-xs"
                        aria-label="Decrease inquiries"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-white font-bold">{ad.inquiriesGenerated}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateLeadMetrics(ad.id, 'inquiriesGenerated', 1)}
                        className="text-neutral-400 hover:text-white px-1 text-xs"
                        aria-label="Increase inquiries"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <div className="inline-flex items-center gap-1 border border-neutral-800 bg-neutral-900 px-2 py-0.5 rounded-none">
                      <button
                        type="button"
                        onClick={() => handleUpdateLeadMetrics(ad.id, 'showingsScheduled', -1)}
                        className="text-neutral-400 hover:text-white px-1 text-xs"
                        aria-label="Decrease showings"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-white font-bold">{ad.showingsScheduled}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateLeadMetrics(ad.id, 'showingsScheduled', 1)}
                        className="text-neutral-400 hover:text-white px-1 text-xs"
                        aria-label="Increase showings"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <div className="inline-flex items-center gap-1 border border-neutral-800 bg-neutral-900 px-2 py-0.5 rounded-none">
                      <button
                        type="button"
                        onClick={() => handleUpdateLeadMetrics(ad.id, 'applicationsReceived', -1)}
                        className="text-neutral-400 hover:text-white px-1 text-xs"
                        aria-label="Decrease applications"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-emerald-400 font-bold">{ad.applicationsReceived}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateLeadMetrics(ad.id, 'applicationsReceived', 1)}
                        className="text-neutral-400 hover:text-white px-1 text-xs"
                        aria-label="Increase applications"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ad.id)}
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase border rounded-none transition ${
                        ad.status === 'active'
                          ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                          : ad.status === 'paused'
                          ? 'border-amber-600 bg-amber-950/40 text-amber-300'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {ad.status}
                    </button>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteAd(ad.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-red-400 transition"
                      title="Delete ad record"
                      aria-label={`Delete ad on ${ad.channel}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Ad Placement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleAddAd}
            className="w-full max-w-md border border-neutral-700 bg-neutral-950 p-6 space-y-4 rounded-none shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Record Marketing Ad Placement</h3>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Marketing Channel</label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value as ListingAdRecord['channel'])}
                className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
              >
                {MARKETING_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Spend Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newSpend}
                  onChange={(e) => setNewSpend(Number(e.target.value))}
                  className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono text-base sm:text-xs outline-none focus:border-white rounded-none"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={newIsRecurring}
                    onChange={(e) => setNewIsRecurring(e.target.checked)}
                    className="h-4 w-4 accent-white rounded-none"
                  />
                  <span>Monthly Recurring</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Placement Notes & URL</label>
              <input
                type="text"
                placeholder="e.g. Zillow Premium rental listing with 3D Matterport tour."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full min-h-[44px] border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base sm:text-xs outline-none focus:border-white rounded-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[44px] px-4 py-2 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:bg-neutral-900 rounded-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 bg-white text-black text-xs font-bold hover:bg-neutral-200 transition rounded-none"
              >
                Save Placement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
