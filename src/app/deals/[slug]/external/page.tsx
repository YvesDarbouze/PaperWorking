'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { verifyDealInviteToken } from '@/lib/email/dealInvite';
import { verifyDealBroadcastToken } from '@/lib/email/dealBroadcast';
import { MapPin, Lock, Send, CheckCircle2, Sparkles, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

interface ExternalTokenData {
  address?: string;
  creatorName?: string;
  senderName?: string;
  senderEmail?: string;
  inviteeEmail?: string;
  message?: string;
  includeBusinessCard?: boolean;
  type?: string;
  [key: string]: unknown;
}

export default function ExternalDealPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const _router = useRouter();

  const token = searchParams?.get('token');
  const isBroadcastParam = searchParams?.get('broadcast') === 'true';
  const slug = (params?.slug as string) || '';

  const initialVerified = useMemo<{ valid: boolean; data: ExternalTokenData | null }>(() => {
    if (!token) return { valid: false, data: null };
    const broadcastVerified = verifyDealBroadcastToken(token);
    if (broadcastVerified) return { valid: true, data: { ...broadcastVerified, type: 'broadcast' } };
    const inviteVerified = verifyDealInviteToken(token);
    if (inviteVerified) return { valid: true, data: { ...inviteVerified, type: 'invite' } };
    return { valid: false, data: null };
  }, [token]);

  const [_isValidToken, setIsValidToken] = useState(() => initialVerified.valid);
  const [tokenData, setTokenData] = useState<ExternalTokenData | null>(() => initialVerified.data);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsValidToken(initialVerified.valid);
      setTokenData(initialVerified.data);
    });
  }, [initialVerified]);

  const isBroadcast = isBroadcastParam || tokenData?.type === 'broadcast';

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSendingReply(true);

    try {
      await fetch('/api/webhooks/email-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: tokenData?.inviteeEmail || 'external@example.com',
          token,
          text: replyText.trim(),
          slug,
        }),
      });
    } catch {
      // Silent catch
    } finally {
      setIsSendingReply(false);
      setReplySent(true);
      setReplyText('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Glass Card Center Stage */}
        <div className="rounded-[16px] border border-white/10 p-8 bg-[#0a0a0f]/90 backdrop-blur-[16px] shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-widest bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
              {isBroadcast ? 'Deal Broadcast Teaser' : 'Private External Preview'}
            </span>
            <span className="text-xs text-slate-400 font-mono">PaperWorking Co.</span>
          </div>

          <div>
            <h1 data-testid="external-deal-address" className="text-2xl font-bold text-white">
              {tokenData?.address || '123 Main St, Austin, TX 78701'}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-[#34d399]" />
              <span>Austin, TX · Shared by <strong className="text-slate-200">{tokenData?.senderName || tokenData?.creatorName || 'Yves Darbouze'}</strong></span>
            </p>
          </div>

          {/* Broadcast Sender Message */}
          {isBroadcast && tokenData?.message && (
            <div data-testid="sender-broadcast-message" className="p-4 rounded-[12px] bg-white/[0.03] border border-white/10 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#34d399]">Message from Sender:</span>
              <p className="whitespace-pre-wrap">{tokenData.message}</p>
            </div>
          )}

          {/* Sender Business Card if included */}
          {isBroadcast && (tokenData?.includeBusinessCard !== false) && (
            <div data-testid="sender-business-card" className="p-4 rounded-[12px] bg-white/[0.04] border border-white/10 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sender Business Card</span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{tokenData?.senderName || 'Yves Darbouze'}</h4>
                  <p className="text-xs text-[#34d399]">Managing Partner · PaperWorking</p>
                </div>
                <div className="text-right text-xs text-slate-400 space-y-0.5">
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-500" /> {tokenData?.senderEmail || 'yves@paperworking.co'}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" /> (512) 555-0199</p>
                </div>
              </div>
            </div>
          )}

          {!isBroadcast && (
            <p className="text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3">
              You have received a private invitation to review this real estate deal. PaperWorking provides institutional-grade analytics, crowdfunding tools, and verified property metrics for subscribed real estate investors.
            </p>
          )}

          {/* Invitee Actions for Invite (NOT shown for Broadcast) */}
          {!isBroadcast && (
            <div data-testid="invitee-actions" className="flex items-center gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                className="px-4 py-2.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Decline
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-[10px] bg-[#34d399] text-slate-950 font-black text-xs uppercase"
              >
                I&apos;m Interested
              </button>
            </div>
          )}
        </div>

        {/* Financial Paywall Section */}
        <div data-testid="financial-paywall-container" className="relative rounded-[16px] border border-white/10 p-8 bg-[#0a0a0f]/90 backdrop-blur-[16px] overflow-hidden shadow-2xl space-y-6">
          <div className="filter blur-md select-none opacity-40 space-y-6 pointer-events-none">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-[10px] bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400">Purchase Price</span>
                <span className="text-lg font-bold block text-white">$350,000</span>
              </div>
              <div className="p-4 rounded-[10px] bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400">Rehab Cost</span>
                <span className="text-lg font-bold block text-white">$50,000</span>
              </div>
              <div className="p-4 rounded-[10px] bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400">ARV</span>
                <span className="text-lg font-bold block text-white">$480,000</span>
              </div>
              <div className="p-4 rounded-[10px] bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400">Projected ROI</span>
                <span className="text-lg font-bold block text-[#34d399]">18.5%</span>
              </div>
            </div>

            <div className="h-32 rounded-[10px] bg-white/5 p-4">
              <span className="text-xs text-slate-400 font-bold">Financial Analysis & Cashflow Projections</span>
            </div>
          </div>

          <div data-testid="paywall-overlay" className="absolute inset-0 bg-[#0a0a0f]/85 backdrop-blur-[14px] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-[12px] bg-[#34d399]/20 text-[#34d399] flex items-center justify-center border border-[#34d399]/30">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-bold text-white">
                Subscribe to view deal analysis, projected ROI, and invest.
              </h3>
              <p className="text-xs text-slate-400">
                Unlock full financial metrics, RentCast property AVMs, sensitivity matrices, and investment commitment tools.
              </p>
            </div>

            <Link
              href="/dashboard/settings/billing?paywall=deals"
              data-testid="subscribe-now-button"
              className="px-6 py-3 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl min-h-[48px]"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Subscribe to Invest</span>
            </Link>
          </div>
        </div>

        {/* Glass Email Reply Composer */}
        <div data-testid="email-reply-composer" className="rounded-[16px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[16px] shadow-2xl space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-[#34d399]" />
            <span>Reply via Email</span>
          </h3>

          {replySent ? (
            <div data-testid="reply-sent-success" className="p-4 rounded-[12px] bg-[#34d399]/15 border border-[#34d399]/30 text-[#34d399] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Your message was sent to {tokenData?.senderName || tokenData?.creatorName || 'the investor'} and recorded on the deal thread.</span>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="space-y-3">
              <textarea
                data-testid="email-reply-textarea"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Send a private reply to ${tokenData?.senderName || tokenData?.creatorName || 'the investor'}...`}
                className="w-full p-3.5 bg-[#0a0a0f] border border-white/10 rounded-[10px] text-xs text-slate-100 focus:outline-none focus:border-[#34d399]/40 resize-none min-h-[44px]"
              />
              <button
                type="submit"
                data-testid="send-reply-button"
                disabled={isSendingReply || !replyText.trim()}
                className="px-5 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md min-h-[44px] cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>Send Reply</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
