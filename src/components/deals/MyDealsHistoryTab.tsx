'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Mail, DollarSign, ArrowUpRight } from 'lucide-react';
import InviteeActions from '@/components/deals/InviteeActions';

export interface MyDealHistoryItem {
  id: string;
  slug: string;
  address: string;
  status: 'draft' | 'published' | 'funding' | 'closed';
  createdAt: string;
}

export interface MyInvitationItem {
  id: string;
  dealId: string;
  slug: string;
  address: string;
  creatorName: string;
  invitedAt: string;
}

export interface MyCommitmentItem {
  id: string;
  dealId: string;
  slug: string;
  address: string;
  amount: number;
  currency: string;
  percentage: number;
  status: 'pending' | 'accepted' | 'declined';
  committedAt: string;
}

interface MyDealsHistoryTabProps {
  allDeals?: any[];
  className?: string;
}

const MOCK_CREATED_DEALS: MyDealHistoryItem[] = [
  {
    id: 'deal_1',
    slug: '123mainstaustintx78701',
    address: '123 Main St, Austin, TX 78701',
    status: 'published',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'deal_2',
    slug: '456oakavedallas54321',
    address: '456 Oak Ave, Dallas, TX 75201',
    status: 'draft',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const MOCK_INVITATIONS: MyInvitationItem[] = [
  {
    id: 'inv_1',
    dealId: 'deal_789pine',
    slug: '789pinestdallas75201',
    address: '789 Pine St, Dallas, TX 75201',
    creatorName: 'Sarah Jenkins',
    invitedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

const MOCK_COMMITMENTS: MyCommitmentItem[] = [
  {
    id: 'comm_1',
    dealId: 'deal_123main',
    slug: '123mainstaustintx78701',
    address: '123 Main St, Austin, TX 78701',
    amount: 50000,
    currency: 'USD',
    percentage: 25,
    status: 'accepted',
    committedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export default function MyDealsHistoryTab({ allDeals, className = '' }: MyDealsHistoryTabProps) {
  return (
    <div data-testid="my-activity-tab" className={`space-y-8 ${className}`}>
      {/* ── Section 1: Deals I Created ── */}
      <section data-testid="section-deals-created" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#34d399]" />
            <span>Deals I Created ({MOCK_CREATED_DEALS.length})</span>
          </h2>
          <Link
            href="/deals/new"
            className="text-xs font-bold text-[#34d399] hover:underline flex items-center gap-1"
          >
            <span>+ List New Deal</span>
          </Link>
        </div>

        <div className="space-y-3">
          {MOCK_CREATED_DEALS.map((deal) => (
            <div
              key={deal.id}
              className="p-4 rounded-[12px] bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.05] transition-all"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{deal.address}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  Created {new Date(deal.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-[6px] text-[10px] font-extrabold uppercase border ${
                  deal.status === 'published'
                    ? 'bg-[#34d399]/20 text-[#34d399] border-[#34d399]/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {deal.status}
                </span>

                <Link
                  href={`/deals/${deal.slug}/detail`}
                  className="p-2 rounded-[8px] bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Invitations ── */}
      <section data-testid="section-invitations" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-400" />
            <span>Deal Invitations ({MOCK_INVITATIONS.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Incoming Opportunity Invites</span>
        </div>

        <div className="space-y-3">
          {MOCK_INVITATIONS.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-[12px] bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{inv.address}</span>
                <span className="text-[10px] text-slate-400">
                  Invited by <strong className="text-slate-200">{inv.creatorName}</strong> on {new Date(inv.invitedAt).toLocaleDateString()}
                </span>
              </div>

              <InviteeActions dealId={inv.dealId} creatorName={inv.creatorName} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: My Commitments ── */}
      <section data-testid="section-commitments" className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#34d399]" />
            <span>My Commitments ({MOCK_COMMITMENTS.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Soft Investment Stakes</span>
        </div>

        <div className="space-y-3">
          {MOCK_COMMITMENTS.map((comm) => (
            <div
              key={comm.id}
              className="p-4 rounded-[12px] bg-white/[0.03] border border-white/5 flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{comm.address}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {comm.percentage}% of target funding
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-[#34d399] block">
                    ${comm.amount.toLocaleString()} {comm.currency}
                  </span>
                  <span className="text-[10px] text-amber-400 uppercase font-extrabold block">
                    {comm.status}
                  </span>
                </div>

                <Link
                  href={`/deals/${comm.slug}/detail`}
                  className="p-2 rounded-[8px] bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
