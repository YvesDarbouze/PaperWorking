'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Share2,
  Send,
  Mail,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  DollarSign,
  Percent,
} from 'lucide-react';
import {
  generateInvitationToken,
  validateInvestmentIntent,
  validateInvitationToken,
  revokeInvitation,
  DealInvitation,
  DealInterest,
  BusinessCardSnapshot,
} from '@/lib/deals/engagementUtils';
import { formatCurrencyAmount } from '@/lib/deals/fundingUtils';
import toast from 'react-hot-toast';

interface DealEngagementModuleProps {
  dealId: string;
  dealSlug: string;
  displayAddress: string;
  fundingTarget: number;
  committedAmount: number;
  currency?: string;
  onInterestAdded?: (interest: DealInterest) => void;
  onInvitationCreated?: (invitation: DealInvitation) => void;
}

export default function DealEngagementModule({
  dealId,
  dealSlug,
  displayAddress,
  fundingTarget,
  committedAmount,
  currency = 'USD',
  onInterestAdded,
  onInvitationCreated,
}: DealEngagementModuleProps) {
  const { profile, user } = useAuth();

  // Mode: 'INTENT_FORM' | 'COMMITTED' | 'DECLINED' | 'WAITLIST' | 'WITHDRAWN'
  const [responseMode, setResponseMode] = useState<'INTENT_FORM' | 'COMMITTED' | 'DECLINED' | 'WAITLIST' | 'WITHDRAWN'>('INTENT_FORM');
  const [intentInputType, setIntentInputType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [amountValue, setAmountValue] = useState<string>('25000');
  const [percentValue, setPercentValue] = useState<string>('10');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [activeInvitations, setActiveInvitations] = useState<DealInvitation[]>([]);

  // Share Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Invitee Business Card Snapshot sourced from Profile
  const businessCard: BusinessCardSnapshot = {
    displayName: profile?.displayName || user?.displayName || 'Registered Investor',
    email: profile?.email || user?.email || 'investor@paperworking.co',
    phone: profile?.phoneNumber || '+1 (512) 555-0199',
    company: profile?.company || 'PaperWorking Investor Network',
    title: profile?.role || 'Lead Investor',
  };

  // Flow 1: Handle "I'm Interested" Submission
  const handleExpressInterest = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const percent = intentInputType === 'PERCENT' ? Number(percentValue) : undefined;
    const amount = intentInputType === 'AMOUNT' ? Number(amountValue) : undefined;

    const validation = validateInvestmentIntent(fundingTarget, committedAmount, currency, percent, amount);

    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid intent inputs.');
      toast.error(validation.error || 'Invalid intent inputs.', { id: 'intent-err' });
      return;
    }

    const newInterest: DealInterest = {
      id: `int_${Math.random().toString(36).substring(2, 9)}`,
      dealId,
      userId: user?.uid || 'user_123',
      percentIntent: percent,
      amountIntent: amount,
      currency,
      businessCardSnapshot: businessCard,
      status: validation.status,
      createdAt: new Date().toISOString(),
    };

    setResponseMode(validation.status);
    if (onInterestAdded) onInterestAdded(newInterest);

    if (validation.status === 'WAITLIST') {
      toast.success(`Funding target reached! You have been placed on the Waitlist for ${formatCurrencyAmount(validation.calculatedAmount, currency)}.`, {
        id: 'waitlist-toast',
      });
    } else {
      toast.success(`Successfully registered interest for ${formatCurrencyAmount(validation.calculatedAmount, currency)}!`, {
        id: 'interest-toast',
      });
    }
  };

  // Flow 1: Handle One-Button "Decline"
  const handleDecline = () => {
    setResponseMode('DECLINED');
    toast('You have declined this deal invitation.', {
      icon: '🚫',
      id: 'decline-toast',
    });
  };

  // Flow 2: Invite Others (External & Existing Users)
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailInput || !inviteEmailInput.includes('@')) {
      toast.error('Please enter a valid email address to send invitation.');
      return;
    }

    const newInvite = generateInvitationToken(
      dealId,
      inviteEmailInput,
      user?.uid || 'sender_123',
      profile?.displayName || 'Deal Owner'
    );

    setActiveInvitations((prev) => [newInvite, ...prev]);
    if (onInvitationCreated) onInvitationCreated(newInvite);

    setInviteEmailInput('');
    toast.success(`Invitation sent to ${newInvite.invitedEmail}! (30-day token generated)`, { id: 'invite-toast' });
  };

  // Revoke Invitation
  const handleRevokeInvite = (invite: DealInvitation) => {
    const revoked = revokeInvitation(invite);
    setActiveInvitations((prev) => prev.map((inv) => (inv.id === invite.id ? revoked : inv)));
    toast.success(`Invitation link for ${invite.invitedEmail} revoked.`, { id: 'revoke-toast' });
  };

  // Flow 4: Social Share Intents
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/deals/${dealSlug}` : `https://paperworking.co/deals/${dealSlug}`;
  const shareText = `Check out this real estate investment opportunity on PaperWorking: ${displayAddress}`;

  const handleCopyShareLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Public-safe deal share link copied!', { id: 'copy-toast' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Flow 1: In-Platform Invitation Response Card ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-5 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-pw-border pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-slate-300" />
              <span>Investment Intent & Invitation Action</span>
            </h3>
            <p className="text-xs text-slate-400">Respond directly or express interest to the Deal Owner</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center gap-1.5 min-h-[36px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Invite Investors</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-pw-border bg-white/5 text-slate-300 font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-1.5 min-h-[36px]"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-300" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* State A: Declined State */}
        {responseMode === 'DECLINED' && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-300">You have declined this Deal Invitation</p>
                <p className="text-xs text-slate-400">No further prompts will be shown. Owner sees declined status.</p>
              </div>
            </div>
            <button
              onClick={() => setResponseMode('INTENT_FORM')}
              className="text-xs text-slate-300 font-bold hover:underline"
            >
              Reconsider
            </button>
          </div>
        )}

        {/* State B: Committed State */}
        {responseMode === 'COMMITTED' && (
          <div className="p-5 rounded-xl bg-slate-800/10 border border-slate-700/30 space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold text-emerald-400">Interest & Business Card Registered!</h4>
                <p className="text-xs text-slate-300">
                  Your business card snapshot has been shared with the Deal Owner.
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-slate-700/20 text-xs font-mono text-slate-300 space-y-1">
              <p>Name: <span className="text-slate-100 font-bold">{businessCard.displayName}</span></p>
              <p>Email: <span className="text-slate-100 font-bold">{businessCard.email}</span></p>
              <p>Company: <span className="text-slate-100 font-bold">{businessCard.company}</span></p>
            </div>
          </div>
        )}

        {/* State C: Waitlist State */}
        {responseMode === 'WAITLIST' && (
          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold text-amber-400">Placed on Over-Commitment Waitlist</h4>
                <p className="text-xs text-slate-300">
                  The primary target is fully committed. Your interest is logged in the waitlist order.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State D: Intent Form ("I'm Interested" or "Decline") */}
        {responseMode === 'INTENT_FORM' && (
          <form onSubmit={handleExpressInterest} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase text-slate-300">Specify Investment Intent:</span>
              <div className="flex items-center p-1 rounded-xl bg-white/5 border border-pw-border">
                <button
                  type="button"
                  onClick={() => setIntentInputType('AMOUNT')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    intentInputType === 'AMOUNT' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                  Currency Amount ($)
                </button>
                <button
                  type="button"
                  onClick={() => setIntentInputType('PERCENT')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    intentInputType === 'PERCENT' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5 inline mr-1" />
                  Target Percentage (%)
                </button>
              </div>
            </div>

            {intentInputType === 'AMOUNT' ? (
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Amount in Deal Currency ({currency})</label>
                <input
                  type="number"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  placeholder="25000"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-pw-border text-slate-100 text-sm font-mono focus:border-slate-700 focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Percentage of Target Funding (1% – 100%)</label>
                <input
                  type="number"
                  value={percentValue}
                  onChange={(e) => setPercentValue(e.target.value)}
                  placeholder="10"
                  min="1"
                  max="100"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-pw-border text-slate-100 text-sm font-mono focus:border-slate-700 focus:outline-none"
                />
              </div>
            )}

            {validationError && (
              <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>{validationError}</span>
              </p>
            )}

            {/* Action Buttons: Interested (Green) vs Decline (Slate) */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I'm Interested (Share Business Card)</span>
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="px-5 h-11 rounded-xl border border-pw-border bg-white/5 text-slate-300 font-bold text-xs uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <XCircle className="w-4 h-4 text-slate-400" />
                <span>Decline</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Flow 2: Invite Modal / Drawer ── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-pw-border max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-pw-border pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Send className="w-5 h-5 text-slate-300" />
                <span>Invite Investors to this Deal</span>
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3">
              <label className="text-xs font-bold text-slate-300">Invitee Email Address</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  placeholder="investor@partnerfirm.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-pw-border text-slate-100 text-sm focus:border-slate-700 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase hover:bg-emerald-400 transition-all shadow-md min-h-[44px]"
                >
                  Send Invite
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                External emails receive a secure 30-day token link land on a public read-only teaser.
              </p>
            </form>

            {/* Active Tokenized Invitations List */}
            {activeInvitations.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-pw-border">
                <h4 className="text-xs font-bold uppercase text-slate-400">Active Token Invitations</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-pw-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-200">{inv.invitedEmail}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Status: {inv.status} (30-day token)</p>
                      </div>
                      {inv.status === 'PENDING' && (
                        <button
                          onClick={() => handleRevokeInvite(inv)}
                          className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold hover:bg-rose-500 hover:text-white"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Flow 4: Social / Crowdfund Share Modal ── */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-pw-border max-w-md w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-pw-border pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-slate-300" />
                <span>Public-Safe Share Card</span>
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Public-Safe Preview Card (No private investor data) */}
            <div className="p-4 rounded-xl bg-slate-900 border border-pw-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-300">PaperWorking Teaser</span>
                <span className="text-[10px] text-slate-400 font-mono">Public Safe</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{displayAddress}</p>
              <p className="text-xs text-slate-400">Headline metrics & funding progress bar included.</p>
            </div>

            {/* Copy Link */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Public Teaser Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-pw-border text-slate-300 text-xs font-mono select-all"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs transition-all min-h-[38px] flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2 pt-2 border-t border-pw-border">
              <label className="text-xs font-bold uppercase text-slate-400">Share to Social Networks</label>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-pw-border bg-white/5 text-slate-200 text-xs font-bold hover:bg-white/10 text-center flex items-center justify-center gap-1.5"
                >
                  <span>X / Twitter</span>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-pw-border bg-white/5 text-slate-200 text-xs font-bold hover:bg-white/10 text-center flex items-center justify-center gap-1.5"
                >
                  <span>LinkedIn</span>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-pw-border bg-white/5 text-slate-200 text-xs font-bold hover:bg-white/10 text-center flex items-center justify-center gap-1.5"
                >
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
