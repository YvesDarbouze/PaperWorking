'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { SEED_MARKETPLACE_VENDORS } from '@/lib/marketplace/seed-data';

export interface VendorMarketplaceSuggestionsProps {
  taskTitle: string;
  requiredTrade: string; // e.g. 'Appraiser' | 'Inspector' | 'Title' | 'Lender' | 'Contractor' | 'Insurance' | 'Lawyer'
  propertyState?: string;
  onAssignVendor?: (vendor: { id: string; name: string; role: string }) => void;
  onInviteVendorToBid?: (invite: {
    email: string;
    companyName: string;
    trade: string;
    notes?: string;
  }) => void;
}

export default function VendorMarketplaceSuggestions({
  taskTitle,
  requiredTrade,
  propertyState = 'TX',
  onAssignVendor,
  onInviteVendorToBid,
}: VendorMarketplaceSuggestionsProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompany, setInviteCompany] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Filter matching vendors in property state
  const matchingVendors = useMemo(() => {
    const tradeLower = requiredTrade.toLowerCase();
    const stateUpper = propertyState.trim().toUpperCase();

    return SEED_MARKETPLACE_VENDORS.filter((v) => {
      const typeLower = v.type.toLowerCase();
      const tradeMatches =
        typeLower.includes(tradeLower) ||
        (tradeLower.includes('apprais') && typeLower.includes('apprais')) ||
        (tradeLower.includes('inspect') && typeLower.includes('inspect')) ||
        (tradeLower.includes('title') && (typeLower.includes('title') || typeLower.includes('escrow') || typeLower.includes('lawyer'))) ||
        (tradeLower.includes('insurance') && typeLower.includes('insurance')) ||
        (tradeLower.includes('lender') && typeLower.includes('lender')) ||
        (tradeLower.includes('contractor') && typeLower.includes('contractor'));

      if (!tradeMatches) return false;

      const stateMatches =
        !stateUpper ||
        v.licensingStates.some((s) => s.toUpperCase() === stateUpper) ||
        v.location.toUpperCase().includes(stateUpper);

      return stateMatches;
    });
  }, [requiredTrade, propertyState]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) return;

    if (onInviteVendorToBid) {
      onInviteVendorToBid({
        email: inviteEmail.trim(),
        companyName: inviteCompany.trim() || inviteEmail.split('@')[0],
        trade: requiredTrade,
        notes: inviteNotes.trim(),
      });
    }

    setInviteSuccessMsg(`Bid request dispatched to ${inviteEmail}.`);
    setTimeout(() => {
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteCompany('');
      setInviteNotes('');
      setInviteSuccessMsg(null);
    }, 1500);
  };

  return (
    <div
      data-testid="vendor-marketplace-suggestions"
      className="w-full rounded-none border border-neutral-800 bg-[#080808] p-4 text-xs font-sans text-neutral-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Verified Marketplace Assistance
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              Trade: <strong className="text-white">{requiredTrade}</strong> · State: <strong className="text-white">{propertyState}</strong>
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-300">
            Suggested verified professionals for task: <strong className="text-white">{taskTitle}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteOpen(!isInviteOpen)}
          className="text-[11px] text-neutral-400 hover:text-white underline min-h-[44px] flex items-center"
          data-testid="toggle-invite-vendor-btn"
        >
          {isInviteOpen ? 'Close Invite Form' : '+ Invite External Vendor to Bid'}
        </button>
      </div>

      {/* Invite External Vendor Form */}
      {isInviteOpen && (
        <form
          onSubmit={handleSendInvite}
          data-testid="invite-vendor-bid-form"
          className="my-3 rounded-none border border-neutral-700 bg-neutral-900/50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Invite Trusted {requiredTrade} to Bid on Project
            </h4>
            <span className="text-[10px] text-neutral-400">Direct Invitation</span>
          </div>

          {inviteSuccessMsg && (
            <div className="rounded-none border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-300">
              {inviteSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Company / Vendor Name</label>
              <input
                type="text"
                required
                data-testid="vendor-company-input"
                placeholder="e.g. Austin Metro Valuation Group"
                value={inviteCompany}
                onChange={(e) => setInviteCompany(e.target.value)}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Vendor Email Address</label>
              <input
                type="email"
                required
                data-testid="vendor-email-input"
                placeholder="e.g. contact@austinvaluation.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 font-semibold mb-1">Scope / Project Notes</label>
            <input
              type="text"
              data-testid="vendor-notes-input"
              placeholder={`e.g. Please provide a formal quote for ${taskTitle} for closing scheduled next month.`}
              value={inviteNotes}
              onChange={(e) => setInviteNotes(e.target.value)}
              className="w-full min-h-[44px] rounded-none border border-neutral-700 bg-neutral-950 px-3 py-2 text-white text-base sm:text-xs focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              className="rounded-none min-h-[44px] px-3 text-xs"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-none min-h-[44px] px-4 text-xs"
              data-testid="submit-vendor-invite-btn"
            >
              Send Request to Bid
            </Button>
          </div>
        </form>
      )}

      {/* Suggested Vendors List */}
      <div className="mt-3 space-y-2">
        {matchingVendors.length === 0 ? (
          <div
            data-testid="no-vendors-in-state-alert"
            className="rounded-none border border-neutral-800 bg-neutral-900/30 p-4 text-center text-neutral-400 space-y-2"
          >
            <p>
              No verified <strong>{requiredTrade}</strong> vendors are currently listed in <strong>{propertyState}</strong>.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-none min-h-[44px] px-4 text-xs inline-flex items-center"
              onClick={() => setIsInviteOpen(true)}
              data-testid="invite-known-vendor-btn"
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">person_add</span>
              Invite a Vendor You Know to Bid
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {matchingVendors.map((vendor) => (
              <div
                key={vendor.id}
                data-testid={`suggested-vendor-card-${vendor.id}`}
                className="flex items-center justify-between rounded-none border border-neutral-800 bg-neutral-900/50 p-3 hover:border-neutral-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{vendor.companyName}</span>
                    <span className="rounded-none border border-neutral-700 bg-neutral-800 px-1.5 py-0.2 text-[9px] uppercase text-neutral-300">
                      {vendor.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {`${vendor.city}, ${vendor.location} · ${vendor.feeRangeLabel} · ${vendor.avgTurnaroundDays}d avg`}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                    <span className="flex items-center gap-0.5">
                      ★ {vendor.overallRating.toFixed(1)} ({vendor.totalReviews} reviews)
                    </span>
                    {vendor.verified && (
                      <span className="text-neutral-400 font-mono">· Verified Operator</span>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-none min-h-[44px] px-3 text-xs"
                  onClick={() => {
                    if (onAssignVendor) {
                      onAssignVendor({
                        id: vendor.id,
                        name: vendor.companyName,
                        role: `${vendor.type} (Vendor)`,
                      });
                    }
                  }}
                  data-testid={`select-vendor-btn-${vendor.id}`}
                >
                  Request Quote / Assign
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
