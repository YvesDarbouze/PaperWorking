'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { issueSlotRfp, acceptSlotBid } from '@/actions/rfpBids';
import { useMarketplaceVendors, SLOT_LABELS } from '@/hooks/useMarketplaceVendors';
import type { F4RfpBid } from '@/types/schema';
import {
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Trophy,
  ArrowDownUp,
  DollarSign,
  Timer,
  StickyNote,
  Star,
  Search,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  projectId: string;
}

// ── Slot definitions for the dropdown ─────────────────────────────────────
const ALL_SLOTS = Object.entries(SLOT_LABELS).map(([key, label]) => ({
  key,
  label,
}));

// ── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    PENDING: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <Clock className="w-2.5 h-2.5" /> },
    QUOTED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: <DollarSign className="w-2.5 h-2.5" /> },
    ACCEPTED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
    DECLINED: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', icon: <XCircle className="w-2.5 h-2.5" /> },
    CANCELLED: { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-500', icon: <X className="w-2.5 h-2.5" /> },
  };
  const c = config[status] || config.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${c.bg} ${c.text}`}>
      {c.icon} {status}
    </span>
  );
}

export function RfpBidsCard({ projectId }: Props) {
  const [bids, setBids] = useState<F4RfpBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // RFP issuance form state
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [rfpMessage, setRfpMessage] = useState('');
  const [rfpUrgency, setRfpUrgency] = useState<'standard' | 'rush' | 'asap'>('standard');

  // Filter state
  const [filterSlot, setFilterSlot] = useState<string>('');

  // Marketplace vendor search
  const { vendors: marketplaceVendors, loading: vendorsLoading } = useMarketplaceVendors(
    selectedSlot || null
  );

  // ── Real-time bids listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, 'projects', projectId, 'rfpBids'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as F4RfpBid[];
      setBids(items);
      setLoading(false);
    });
    return unsub;
  }, [projectId]);

  // ── Group bids by rfpId ──────────────────────────────────────────────────
  const groupedBids = useMemo(() => {
    const filtered = filterSlot ? bids.filter((b) => b.slotKey === filterSlot) : bids;

    const groups: Record<string, { rfpId: string; slotKey: string; slotLabel: string; bids: F4RfpBid[] }> = {};
    for (const bid of filtered) {
      if (!groups[bid.rfpId]) {
        groups[bid.rfpId] = {
          rfpId: bid.rfpId,
          slotKey: bid.slotKey,
          slotLabel: SLOT_LABELS[bid.slotKey] || bid.slotKey,
          bids: [],
        };
      }
      groups[bid.rfpId].bids.push(bid);
    }

    return Object.values(groups);
  }, [bids, filterSlot]);

  // ── Vendor toggle ───────────────────────────────────────────────────────
  const toggleVendor = useCallback((uid: string) => {
    setSelectedVendors((prev) =>
      prev.includes(uid) ? prev.filter((v) => v !== uid) : [...prev, uid]
    );
  }, []);

  // ── Issue RFP ───────────────────────────────────────────────────────────
  const handleIssueRfp = async () => {
    if (!selectedSlot) {
      toast.error('Select a team slot.');
      return;
    }
    if (selectedVendors.length === 0) {
      toast.error('Select at least one vendor.');
      return;
    }

    setIssuing(true);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication required.');

      const res = await issueSlotRfp(
        idToken,
        projectId,
        selectedSlot,
        selectedVendors,
        rfpMessage.trim() || undefined,
        rfpUrgency
      );

      if (!res.success) throw new Error(res.error || 'Failed to issue RFP.');

      toast.success(`RFP issued to ${selectedVendors.length} vendor${selectedVendors.length > 1 ? 's' : ''}`);
      setShowIssuePanel(false);
      setSelectedSlot('');
      setSelectedVendors([]);
      setRfpMessage('');
      setRfpUrgency('standard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue RFP.');
    } finally {
      setIssuing(false);
    }
  };

  // ── Accept bid ──────────────────────────────────────────────────────────
  const handleAcceptBid = async (bidId: string) => {
    setAcceptingId(bidId);
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication required.');

      const res = await acceptSlotBid(idToken, projectId, bidId);
      if (!res.success) throw new Error(res.error || 'Failed to accept bid.');

      toast.success('Vendor assigned from RFP.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept bid.');
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Find best values for highlighting ───────────────────────────────────
  const getBestValues = (rfpBids: F4RfpBid[]) => {
    const quotedBids = rfpBids.filter((b) => b.price != null && (b.status === 'QUOTED' || b.status === 'PENDING'));
    const bestPrice = quotedBids.length > 0 ? Math.min(...quotedBids.map((b) => b.price!)) : null;
    const fastestBids = rfpBids.filter((b) => b.turnaroundDays != null && b.turnaroundDays > 0);
    const bestTurnaround = fastestBids.length > 0 ? Math.min(...fastestBids.map((b) => b.turnaroundDays!)) : null;
    return { bestPrice, bestTurnaround };
  };

  if (loading) return null;

  return (
    <div className="glass-card p-6 space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start border-b border-pw-border pb-4">
        <div>
          <h3 className="text-lg font-light uppercase tracking-widest text-pw-black flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#7A9EAA]" />
            RFP & Bids
          </h3>
          <p className="text-xs text-pw-muted font-light mt-1">
            Issue requests for proposals to marketplace vendors, compare bids, and assign the winner.
          </p>
        </div>
        <button
          onClick={() => setShowIssuePanel(!showIssuePanel)}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#7A9EAA] text-white rounded hover:bg-[#688a95] transition-all shadow-sm flex items-center gap-1"
        >
          {showIssuePanel ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          Issue RFP
        </button>
      </div>

      {/* ── Issue RFP Panel ─────────────────────────────────────────────── */}
      {showIssuePanel && (
        <div className="border border-pw-border rounded-lg p-4 bg-gray-50/50 space-y-4 animate-in fade-in duration-150">
          <h4 className="text-xs font-bold text-pw-black uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-[#7A9EAA]" />
            New Request for Proposals
          </h4>

          {/* Slot selector */}
          <div>
            <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
              Team Slot *
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => {
                setSelectedSlot(e.target.value);
                setSelectedVendors([]);
              }}
              className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
            >
              <option value="">Select a team slot…</option>
              {ALL_SLOTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor multi-select */}
          {selectedSlot && (
            <div>
              <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
                Select Vendors *
              </label>
              {vendorsLoading ? (
                <div className="flex items-center gap-2 text-xs text-pw-muted p-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching marketplace…
                </div>
              ) : marketplaceVendors.length === 0 ? (
                <div className="p-3 text-xs text-pw-muted border border-dashed border-pw-border rounded flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" />
                  No verified vendors found for this service type.
                </div>
              ) : (
                <div className="border border-pw-border rounded divide-y divide-pw-border max-h-52 overflow-y-auto">
                  {marketplaceVendors.map((v) => {
                    const isSelected = selectedVendors.includes(v.uid);
                    return (
                      <button
                        key={v.uid}
                        type="button"
                        onClick={() => toggleVendor(v.uid)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-all ${
                          isSelected
                            ? 'bg-[#7A9EAA]/10 border-l-2 border-l-[#7A9EAA]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#7A9EAA] border-[#7A9EAA]'
                                : 'border-pw-border'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div>
                            <span className="font-semibold text-pw-black block">{v.companyName}</span>
                            <span className="text-pw-muted text-[10px]">
                              {v.feeRangeLabel} · {v.avgTurnaroundDays}d turnaround
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {v.verified && (
                            <span className="px-1 py-0.5 text-[8px] font-bold uppercase bg-green-50 text-green-600 rounded border border-green-200">
                              Verified
                            </span>
                          )}
                          {v.overallRating > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />
                              {v.overallRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedVendors.length > 0 && (
                <p className="text-[10px] text-[#7A9EAA] font-semibold mt-1">
                  {selectedVendors.length} vendor{selectedVendors.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
              Scope / Requirements
            </label>
            <textarea
              value={rfpMessage}
              onChange={(e) => setRfpMessage(e.target.value)}
              placeholder="Describe the scope of work, timelines, or specific requirements…"
              className="w-full px-3 py-1.5 border border-pw-border rounded text-sm bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA] resize-none h-16"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-[10px] font-bold text-pw-muted uppercase tracking-wider mb-1">
              Urgency
            </label>
            <div className="flex gap-2">
              {(['standard', 'rush', 'asap'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRfpUrgency(level)}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-all ${
                    rfpUrgency === level
                      ? level === 'asap'
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : level === 'rush'
                          ? 'bg-amber-50 border-amber-300 text-amber-600'
                          : 'bg-[#7A9EAA]/10 border-[#7A9EAA] text-[#7A9EAA]'
                      : 'border-pw-border text-pw-muted hover:border-gray-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowIssuePanel(false)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-pw-border text-pw-muted rounded hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleIssueRfp}
              disabled={issuing || !selectedSlot || selectedVendors.length === 0}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-all ${
                issuing || !selectedSlot || selectedVendors.length === 0
                  ? 'bg-gray-300 text-white cursor-not-allowed'
                  : 'bg-[#7A9EAA] text-white hover:bg-[#688a95] shadow-sm'
              }`}
            >
              {issuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Issue RFP
            </button>
          </div>
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      {bids.length > 0 && (
        <div className="flex items-center gap-2">
          <ArrowDownUp className="w-3.5 h-3.5 text-pw-muted" />
          <select
            value={filterSlot}
            onChange={(e) => setFilterSlot(e.target.value)}
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-pw-border rounded bg-pw-white text-pw-black focus:outline-none focus:ring-1 focus:ring-[#7A9EAA]"
          >
            <option value="">All Slots</option>
            {ALL_SLOTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-pw-muted">
            {groupedBids.length} RFP round{groupedBids.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Bid comparison groups ───────────────────────────────────────── */}
      {groupedBids.length > 0 ? (
        <div className="space-y-4">
          {groupedBids.map((group) => {
            const { bestPrice, bestTurnaround } = getBestValues(group.bids);
            const hasAccepted = group.bids.some((b) => b.status === 'ACCEPTED');

            return (
              <div key={group.rfpId} className="border border-pw-border rounded-lg overflow-hidden">
                {/* Group header */}
                <div className="px-4 py-2.5 bg-gray-50 border-b border-pw-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-pw-black uppercase tracking-wider">
                      {group.slotLabel}
                    </span>
                    <span className="text-[10px] text-pw-muted">
                      {group.bids.length} bid{group.bids.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {hasAccepted && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-green-50 text-green-700 rounded border border-green-200">
                      <Trophy className="w-2.5 h-2.5" /> Assigned
                    </span>
                  )}
                </div>

                {/* Comparison table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-pw-border bg-gray-50/50">
                        <th className="text-left px-4 py-2 text-[10px] font-bold text-pw-muted uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="text-right px-4 py-2 text-[10px] font-bold text-pw-muted uppercase tracking-wider">
                          <span className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3" /> Price
                          </span>
                        </th>
                        <th className="text-right px-4 py-2 text-[10px] font-bold text-pw-muted uppercase tracking-wider">
                          <span className="flex items-center justify-end gap-1">
                            <Timer className="w-3 h-3" /> Turnaround
                          </span>
                        </th>
                        <th className="text-left px-4 py-2 text-[10px] font-bold text-pw-muted uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <StickyNote className="w-3 h-3" /> Notes
                          </span>
                        </th>
                        <th className="text-center px-4 py-2 text-[10px] font-bold text-pw-muted uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-center px-4 py-2 text-[10px] font-bold text-pw-muted uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pw-border">
                      {group.bids.map((bid) => {
                        const isBestPrice = bestPrice != null && bid.price === bestPrice && bid.price != null;
                        const isFastest = bestTurnaround != null && bid.turnaroundDays === bestTurnaround && bid.turnaroundDays != null;
                        const canAccept = bid.status === 'QUOTED' || bid.status === 'PENDING';

                        return (
                          <tr
                            key={bid.id}
                            className={`transition-colors ${
                              bid.status === 'ACCEPTED'
                                ? 'bg-green-50/30'
                                : bid.status === 'CANCELLED'
                                  ? 'bg-gray-50/50 opacity-60'
                                  : 'hover:bg-gray-50/30'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div>
                                <span className="font-semibold text-pw-black block">
                                  {bid.vendorCompanyName || bid.vendorName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {bid.price != null ? (
                                <span className={`font-bold ${isBestPrice ? 'text-green-600' : 'text-pw-black'}`}>
                                  ${bid.price.toLocaleString()}
                                  {isBestPrice && group.bids.filter((b) => b.price != null).length > 1 && (
                                    <span className="block text-[9px] text-green-500 font-semibold">Best</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-pw-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {bid.turnaroundDays != null && bid.turnaroundDays > 0 ? (
                                <span className={`font-bold ${isFastest ? 'text-blue-600' : 'text-pw-black'}`}>
                                  {bid.turnaroundDays}d
                                  {isFastest && group.bids.filter((b) => b.turnaroundDays != null && b.turnaroundDays > 0).length > 1 && (
                                    <span className="block text-[9px] text-blue-500 font-semibold">Fastest</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-pw-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              {bid.notes ? (
                                <span className="text-pw-muted line-clamp-2">{bid.notes}</span>
                              ) : (
                                <span className="text-pw-muted/50 italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status={bid.status} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {canAccept && !hasAccepted && (
                                <button
                                  onClick={() => handleAcceptBid(bid.id)}
                                  disabled={acceptingId === bid.id}
                                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1 mx-auto ${
                                    acceptingId === bid.id
                                      ? 'bg-gray-300 text-white cursor-not-allowed'
                                      : 'bg-[#7A9EAA] text-white hover:bg-[#688a95] shadow-sm'
                                  }`}
                                >
                                  {acceptingId === bid.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trophy className="w-3 h-3" />
                                  )}
                                  Assign
                                </button>
                              )}
                              {bid.status === 'ACCEPTED' && (
                                <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase justify-center">
                                  <CheckCircle2 className="w-3 h-3" /> Assigned
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────────────────── */
        !showIssuePanel && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 text-pw-muted flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs text-pw-muted">
              No RFPs issued yet — issue an RFP from any team slot above.
            </p>
            <button
              onClick={() => setShowIssuePanel(true)}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-[#7A9EAA] text-white rounded hover:bg-[#688a95] transition-all shadow-sm"
            >
              Issue First RFP
            </button>
          </div>
        )
      )}
    </div>
  );
}
