'use client';

import React, { useState } from 'react';
import { UserCheck, Check, X, ShieldCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { BusinessCard, BusinessCardShare } from '@/types/deals';

interface InviteeActionsProps {
  dealId: string;
  creatorName?: string;
  inviteeCard?: Partial<BusinessCard>;
  onDecline?: () => void;
  onExpressInterest?: (shareRecord: BusinessCardShare) => void;
  className?: string;
}

const DEFAULT_INVITEE_CARD: BusinessCard = {
  id: 'card_invitee_default',
  userId: 'user_invitee_current',
  name: 'Sarah Jenkins',
  email: 'sarah.j@acme-cap.com',
  phone: '(512) 555-0199',
  company: 'Acme Capital Group',
  title: 'Managing Partner',
  accreditedInvestorStatus: true,
  preferredMarkets: ['Austin, TX', 'Dallas, TX', 'Phoenix, AZ'],
  minInvestment: 25000,
  maxInvestment: 250000,
  isPublic: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function InviteeActions({
  dealId,
  creatorName = 'The Deal Creator',
  inviteeCard = DEFAULT_INVITEE_CARD,
  onDecline,
  onExpressInterest,
  className = '',
}: InviteeActionsProps) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const cardData: BusinessCard = { ...DEFAULT_INVITEE_CARD, ...inviteeCard };

  const handleDecline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('declined');
    if (onDecline) onDecline();
  };

  const handleConfirmInterest = () => {
    const shareRecord: BusinessCardShare = {
      id: `share_${Date.now()}`,
      dealId,
      senderUserId: cardData.userId,
      recipientUserId: 'user_creator_id',
      businessCardData: { ...cardData },
      createdAt: new Date().toISOString(),
    };

    setStatus('accepted');
    setIsConfirmModalOpen(false);
    if (onExpressInterest) onExpressInterest(shareRecord);
  };

  if (status === 'declined') {
    return null;
  }

  if (status === 'accepted') {
    return (
      <div data-testid="invite-accepted-badge" className="p-2 rounded-[8px] bg-[#34d399]/15 border border-[#34d399]/30 text-[#34d399] text-xs font-bold flex items-center gap-1.5">
        <Check className="w-4 h-4 text-[#34d399]" />
        <span>Interested • Business Card Shared</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Translucent ghost button: Decline */}
      <button
        type="button"
        data-testid="invite-decline-button"
        onClick={handleDecline}
        className="px-3.5 py-1.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] text-xs font-bold transition-all min-h-[36px] cursor-pointer flex items-center gap-1"
      >
        <X className="w-3.5 h-3.5" />
        <span>Decline</span>
      </button>

      {/* Primary button: I'm interested (teal #34d399, dark text) */}
      <button
        type="button"
        data-testid="invite-interested-button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsConfirmModalOpen(true);
        }}
        className="px-3.5 py-1.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all min-h-[36px] cursor-pointer flex items-center gap-1 shadow-md"
      >
        <UserCheck className="w-3.5 h-3.5 text-slate-950" />
        <span>I'm interested</span>
      </button>

      {/* Glass Business Card Confirmation Modal */}
      {isConfirmModalOpen && (
        <div
          data-testid="interest-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[20px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-[16px] border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-[20px] p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[12px] bg-[#34d399]/20 text-[#34d399] flex items-center justify-center border border-[#34d399]/30 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Share your investor profile with {creatorName}?
                </h3>
                <p className="text-xs text-slate-400">
                  A snapshot of your investor business card will be delivered to the deal creator.
                </p>
              </div>
            </div>

            {/* Invitee Business Card Preview (Read-Only) */}
            <div data-testid="business-card-preview-snapshot" className="p-4 rounded-[14px] bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                  <span className="text-sm font-bold text-white block">{cardData.name}</span>
                  <span className="text-xs text-slate-400">{cardData.title} · <strong className="text-slate-200">{cardData.company}</strong></span>
                </div>
                {cardData.accreditedInvestorStatus && (
                  <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
                    Accredited
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Contact Email</span>
                  <span>{cardData.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Phone</span>
                  <span>{cardData.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">Preferred Markets</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(cardData.preferredMarkets || []).map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded-[4px] text-[10px] bg-white/5 text-slate-300 border border-white/5">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Target Investment Range</span>
                <span className="text-[#34d399] font-bold">
                  ${(cardData.minInvestment ?? 0).toLocaleString()} – ${(cardData.maxInvestment ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Link to Edit Profile */}
            <div className="text-right">
              <Link
                href="/dashboard/settings/profile"
                className="text-xs font-bold text-[#34d399] hover:underline inline-flex items-center gap-1"
              >
                <span>Update my business card before sharing</span>
                <ExternalLink className="w-3 h-3 text-[#34d399]" />
              </Link>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] text-xs font-bold uppercase transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-share-card-button"
                onClick={handleConfirmInterest}
                className="px-5 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all min-h-[44px] cursor-pointer shadow-lg"
              >
                Share and Express Interest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
