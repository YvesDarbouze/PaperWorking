'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Mail,
  UserCheck,
  Send,
  MessageSquare,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Tag,
  Users,
  ArrowRight,
} from 'lucide-react';
import {
  filterUserDealsHistory,
  formatDealThreadEvent,
  DealThreadEvent,
} from '@/lib/deals/historyUtils';
import { calculateFundingProgress, formatCurrencyAmount } from '@/lib/deals/fundingUtils';
import { DealInvitation, DealInterest } from '@/lib/deals/engagementUtils';

interface MyDealsHistoryTabProps {
  allDeals: any[];
  allInvitations?: DealInvitation[];
  allInterests?: DealInterest[];
  threadEvents?: DealThreadEvent[];
}

export default function MyDealsHistoryTab({
  allDeals,
  allInvitations = [],
  allInterests = [],
  threadEvents = [],
}: MyDealsHistoryTabProps) {
  const { profile, user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<'CREATED' | 'INVITED' | 'COMMITTED'>('CREATED');
  const [selectedThreadDealId, setSelectedThreadDealId] = useState<string | null>(null);

  const history = filterUserDealsHistory(
    allDeals,
    allInvitations,
    allInterests,
    user?.uid || 'user_123',
    profile?.email || user?.email || 'investor@paperworking.co'
  );

  return (
    <div className="space-y-8 animate-fade-in" data-testid="my-deals-history-tab">
      {/* Tab Selector Header */}
      <div className="flex items-center gap-2 border-b border-pw-border pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('CREATED')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 min-h-[44px] ${
            activeCategory === 'CREATED'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Deals I Created ({history.createdDeals.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('INVITED')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 min-h-[44px] ${
            activeCategory === 'INVITED'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Deals I Was Invited To ({history.invitedDeals.length})</span>
        </button>

        <button
          onClick={() => setActiveCategory('COMMITTED')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 min-h-[44px] ${
            activeCategory === 'COMMITTED'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Deals I Committed Intent To ({history.committedDeals.length})</span>
        </button>
      </div>

      {/* ── Category A: Deals I Created / Listed ── */}
      {activeCategory === 'CREATED' && (
        <div className="space-y-4">
          {history.createdDeals.length === 0 ? (
            <div className="glass-card rounded-2xl border border-pw-border p-10 text-center space-y-3">
              <Building2 className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No Created Deals Yet</h3>
              <p className="text-xs text-slate-400">Search any property address to create and list a new Deal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.createdDeals.map((deal) => {
                const funding = calculateFundingProgress(deal.fundingTarget || 200000, deal.committedAmount || 130000);
                return (
                  <div key={deal.id} className="glass-card rounded-2xl border border-pw-border p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/30">
                        {deal.status || 'LISTED'}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{funding.percentFunded}% Funded</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{deal.displayAddress}</h4>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-pw-border">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${funding.percentFunded}%` }} />
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs border-t border-pw-border/50">
                      <span className="text-slate-400">{funding.formattedCommitted} / {funding.formattedTarget}</span>
                      <Link
                        href={`/dashboard/deals/${deal.slug || deal.id}`}
                        className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Category B: Deals I Was Invited To ── */}
      {activeCategory === 'INVITED' && (
        <div className="space-y-4">
          {history.invitedDeals.length === 0 ? (
            <div className="glass-card rounded-2xl border border-pw-border p-10 text-center space-y-3">
              <Send className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No Invitations Yet</h3>
              <p className="text-xs text-slate-400">Invitations sent to your email by syndicators will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.invitedDeals.map(({ deal, invite }) => (
                <div key={invite.id} className="glass-card rounded-2xl border border-pw-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{deal.displayAddress}</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/5 border border-pw-border text-slate-300">
                        {invite.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Invited by: <span className="text-slate-200 font-bold">{invite.senderName}</span> ({invite.invitedEmail})</p>
                  </div>

                  <Link
                    href={`/dashboard/deals/${deal.slug || deal.id}`}
                    className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <span>View & Respond</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Category C: Deals I Committed Intent To ── */}
      {activeCategory === 'COMMITTED' && (
        <div className="space-y-4">
          {history.committedDeals.length === 0 ? (
            <div className="glass-card rounded-2xl border border-pw-border p-10 text-center space-y-3">
              <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No Intent Commitments</h3>
              <p className="text-xs text-slate-400">Deals where you registered investment intent will be tracked here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.committedDeals.map(({ deal, interest }) => (
                <div key={interest.id} className="glass-card rounded-2xl border border-pw-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{deal.displayAddress}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        interest.status === 'WAITLIST' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {interest.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Committed Intent: <span className="font-mono text-emerald-400 font-bold">
                        {interest.amountIntent ? formatCurrencyAmount(interest.amountIntent, interest.currency) : `${interest.percentIntent}% of Target`}
                      </span>
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/deals/${deal.slug || deal.id}`}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-pw-border text-slate-200 text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <span>View Deal Detail</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Communications Trail Section ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-pw-border pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Deal Communications & Inbound Email Trail</span>
          </h3>
          <Link href="/dashboard/inbox" className="text-xs font-bold text-emerald-400 hover:underline">
            Open Full Inbox
          </Link>
        </div>

        {threadEvents.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/50 text-center text-xs text-slate-400">
            No thread events recorded yet for your account.
          </div>
        ) : (
          <div className="space-y-3">
            {threadEvents.map((evt) => {
              const formatted = formatDealThreadEvent(evt);
              return (
                <div key={evt.id} className="p-4 rounded-xl bg-white/[0.03] border border-pw-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{evt.senderName}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${formatted.badgeColor}`}>
                        {formatted.badgeLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{formatted.formattedDate}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{evt.content}</p>

                  {/* Business Card Snapshot display if present */}
                  {evt.metadata?.businessCard && (
                    <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/20 text-[11px] font-mono text-slate-300 space-y-0.5">
                      <p>Shared Business Card: <span className="text-emerald-400 font-bold">{evt.metadata.businessCard.displayName}</span> ({evt.metadata.businessCard.email})</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
