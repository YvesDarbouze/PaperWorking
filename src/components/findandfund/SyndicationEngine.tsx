'use client';

import React, { useState } from 'react';
import { Users, Mail, FileSignature, Clock, CheckCircle2, XCircle, Eye, UserPlus, Award, MoreHorizontal, Send } from 'lucide-react';
import type { InvestorCommitment, LOIStatus } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   SyndicationEngine — Investor Roster Data Table

   Columns: Name | Email | Pledged | LOI Status | Actions
   Features:
   • Returning Investor badge
   • Per-row "Send LOI" action
   • "Invite Investor" CTA
   ═══════════════════════════════════════════════════════ */

interface Props {
  investors: InvestorCommitment[];
  onInviteClick: () => void;
  onSendLOI: (investorId: string) => void;
  onViewLOI?: (investorId: string) => void;
}

const STATUS_CONFIG: Record<LOIStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  Drafted:  { icon: <Clock className="w-3.5 h-3.5" />,          color: 'text-text-secondary',   bg: 'bg-bg-primary' },
  Sent:     { icon: <Send className="w-3.5 h-3.5" />,           color: 'text-blue-600',   bg: 'bg-blue-50' },
  Viewed:   { icon: <Eye className="w-3.5 h-3.5" />,            color: 'text-amber-600',  bg: 'bg-amber-50' },
  Signed:   { icon: <CheckCircle2 className="w-3.5 h-3.5" />,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  Declined: { icon: <XCircle className="w-3.5 h-3.5" />,        color: 'text-red-500',    bg: 'bg-red-50' },
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function SyndicationEngine({ investors, onInviteClick, onSendLOI, onViewLOI }: Props) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const totalPledged = investors.reduce((sum, inv) => sum + inv.pledgedAmount, 0);
  const signedCount = investors.filter(i => i.loiStatus === 'Signed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Investor Syndication</h3>
            <p className="text-xs text-text-secondary">
              {investors.length} investor{investors.length !== 1 ? 's' : ''} · {formatCurrency(totalPledged)} pledged · {signedCount} signed
            </p>
          </div>
        </div>
        <button
          onClick={onInviteClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite Investor
        </button>
      </div>

      {/* Table */}
      {investors.length > 0 ? (
        <div className="bg-bg-surface border border-border-accent rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-bg-primary border-b border-border-accent">
            <span className="col-span-3 ag-label">Investor</span>
            <span className="col-span-3 ag-label">Email</span>
            <span className="col-span-2 ag-label text-right">Pledged</span>
            <span className="col-span-2 ag-label text-center">LOI Status</span>
            <span className="col-span-2 ag-label text-right">Actions</span>
          </div>

          {/* Rows */}
          {investors.map((inv) => {
            const statusCfg = STATUS_CONFIG[inv.loiStatus];
            return (
              <div
                key={inv.id}
                className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b border-gray-50 last:border-b-0 hover:bg-bg-primary/50 transition-colors"
                onMouseEnter={() => setHoveredRow(inv.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Name + Returning Badge */}
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-teal-700">
                      {inv.investorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{inv.investorName}</p>
                    {inv.isReturning && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        <Award className="w-2.5 h-2.5" />
                        {inv.previousDealCount} deal{inv.previousDealCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="col-span-3 min-w-0">
                  <p className="text-sm text-text-secondary truncate">{inv.investorEmail}</p>
                </div>

                {/* Pledged */}
                <div className="col-span-2 text-right">
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(inv.pledgedAmount)}
                  </span>
                </div>

                {/* LOI Status */}
                <div className="col-span-2 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color} ${statusCfg.bg}`}>
                    {statusCfg.icon}
                    {inv.loiStatus}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  {inv.loiStatus === 'Drafted' && (
                    <button
                      onClick={() => onSendLOI(inv.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition"
                    >
                      <FileSignature className="w-3 h-3" />
                      Send LOI
                    </button>
                  )}
                  {(inv.loiStatus === 'Sent' || inv.loiStatus === 'Viewed' || inv.loiStatus === 'Signed') && (
                    <button
                      onClick={() => onViewLOI?.(inv.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-bg-primary text-text-secondary text-xs font-medium rounded-lg hover:bg-gray-200 transition"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  )}
                  {hoveredRow === inv.id && (
                    <button className="p-1.5 rounded-lg hover:bg-bg-primary transition">
                      <MoreHorizontal className="w-4 h-4 text-text-secondary" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 text-center bg-bg-surface border border-dashed border-border-accent rounded-2xl">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-teal-400" />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">No investors yet</p>
          <p className="text-xs text-text-secondary mb-4">Start building your investor syndicate</p>
          <button
            onClick={onInviteClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Your First Investor
          </button>
        </div>
      )}
    </div>
  );
}
