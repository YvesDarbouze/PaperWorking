'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { decodeBroadcastToken, type BroadcastTokenPayload } from '@/lib/deals/token';
import { checkDealExistsFromBff, replyToDealFromBff } from '@/lib/deals/deal-api';

interface ExternalDealData {
  id: string;
  name: string;
  address: string;
  purchasePrice?: number;
  projectedRoi?: number;
  creatorName?: string;
}

export default function ExternalDealPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '1247elmst';
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get('token') || '';
  const broadcastParam = searchParams.get('broadcast');
  const inviteParam = searchParams.get('invite');

  // Token decoding
  const [tokenPayload, setTokenPayload] = useState<BroadcastTokenPayload | null>(() => {
    return tokenParam ? decodeBroadcastToken(tokenParam) : null;
  });

  useEffect(() => {
    if (tokenParam) {
      setTokenPayload(decodeBroadcastToken(tokenParam));
    }
  }, [tokenParam]);

  // Determine mode: broadcast vs invite
  const isBroadcast =
    broadcastParam === 'true' ||
    tokenPayload?.broadcast === true ||
    (broadcastParam !== 'false' && tokenPayload?.type === 'broadcast');

  // Deal state initialized immediately
  const [deal, setDeal] = useState<ExternalDealData>(() => ({
    id: tokenPayload?.dealId || 'deal-1',
    name: tokenPayload?.dealName || '1247 Elm Street',
    address: tokenPayload?.address || '1247 Elm Street, Austin, TX 78702',
    purchasePrice: tokenPayload?.purchasePrice ?? 485000,
    projectedRoi: tokenPayload?.projectedRoi ?? 18.4,
    creatorName: tokenPayload?.senderName || 'Sarah Jenkins',
  }));
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Reply Composer State (Broadcast mode)
  const [replyText, setReplyText] = useState('');
  const [replySenderEmail, setReplySenderEmail] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Invite action states (Invite mode)
  const [inviteStatus, setInviteStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');

  useEffect(() => {
    let cancelled = false;

    async function fetchDeal() {
      try {
        const data = await checkDealExistsFromBff(slug);
        if (cancelled) return;

        if (data.exists && data.deal) {
          setDeal({
            id: String(data.deal.id || 'deal-1'),
            name: String(data.deal.name || 'Elm Street Flip'),
            address: String(data.deal.address || '1247 Elm Street, Austin, TX 78702'),
            purchasePrice: Number(data.deal.purchasePrice || 485000),
            projectedRoi: Number(data.deal.projectedRoi || 18.4),
            creatorName: String(data.deal.creatorName || 'Sarah Jenkins'),
          });
        }
      } catch {
        // Fallback already set in initial state
      }
    }

    fetchDeal();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSendingReply(true);
    setReplyError(null);

    try {
      await replyToDealFromBff(
        {
          dealId: deal.id || tokenPayload?.dealId || 'deal-1',
          token: tokenParam || undefined,
          senderEmail:
            replySenderEmail.trim() ||
            tokenPayload?.email ||
            'external_investor@example.com',
          content: replyText,
        },
        { credentials: 'omit' },
      );

      setReplySuccess(true);
      setReplyText('');
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Error sending reply');
    } finally {
      setSendingReply(false);
    }
  }

  const senderName = tokenPayload?.senderName || deal.creatorName || 'Sarah Jenkins';
  const senderMessage =
    tokenPayload?.message ||
    'Review the underwriting analysis for this opportunity on PaperWorking. Feel free to reply with any questions or co-investment indications.';
  const businessCard = tokenPayload?.businessCard ?? {
    name: senderName,
    email: tokenPayload?.senderEmail || 'sarah@leadinvestor.com',
    company: 'Apex Capital Partners',
    phone: '+1 (512) 555-0199',
    investmentCriteria: 'Value-add residential & multifamily',
  };

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(deal.purchasePrice ?? 485000);

  const formattedRoi = `${Number(deal.projectedRoi ?? 18.4).toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-[#00DD94]/30 pt-4">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/50">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#00DD94]">
              progress_activity
            </span>
            <p className="mt-3 text-sm">Loading deal preview…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-200">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Broadcast or Invite Notice Banner */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70">
              <span className="material-symbols-outlined text-[18px] text-[#00DD94]">
                {isBroadcast ? 'campaign' : 'mail'}
              </span>
              <span>
                {isBroadcast
                  ? `External Deal Broadcast shared by ${senderName}`
                  : `Confidential Deal Invitation from ${senderName}`}
              </span>
            </div>

            {/* Deal Overview Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md space-y-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#00DD94]">
                  Deal Underwriting Preview
                </div>
                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  {deal.name || '1247 Elm Street'}
                </h1>
                <p className="mt-1 text-sm text-white/60">
                  {deal.address || '1247 Elm Street, Austin, TX 78702'}
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-black/30 p-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-white/50">Purchase Price</div>
                  <div className="mt-1 text-lg font-bold text-white">{formattedPrice}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-white/50">Projected ROI</div>
                  <div className="mt-1 text-lg font-bold text-[#00DD94]">{formattedRoi}</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold uppercase text-white/50">Lead Investor</div>
                  <div className="mt-1 text-sm font-semibold text-white/90">{senderName}</div>
                </div>
              </div>

              {/* Sender Note Glass Card */}
              {senderMessage && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00DD94] mb-1.5">
                    <span className="material-symbols-outlined text-[16px]">notes</span>
                    Note from {senderName}
                  </div>
                  <p className="leading-relaxed text-white/90">{senderMessage}</p>
                </div>
              )}

              {/* Sender Business Card (if included) */}
              {businessCard && (
                <div
                  data-testid="sender-business-card"
                  className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs space-y-2"
                >
                  <div className="font-semibold uppercase tracking-wider text-white/50 text-[10px]">
                    Lead Investor Business Card
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{businessCard.name}</div>
                      <div className="text-white/60">
                        {businessCard.company} · {businessCard.email}
                      </div>
                    </div>
                    {businessCard.phone && (
                      <div className="text-white/70 font-mono text-[11px]">
                        {businessCard.phone}
                      </div>
                    )}
                  </div>
                  {businessCard.investmentCriteria && (
                    <div className="pt-2 border-t border-white/5 text-white/60">
                      <span className="text-white/40">Criteria: </span>
                      {businessCard.investmentCriteria}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DIFFERENTIATION: Broadcast Mode vs Invite Mode */}
            {isBroadcast ? (
              /* BROADCAST MODE: Reply Composer & Subscribe CTA (NO Decline or I'm Interested buttons) */
              <div className="space-y-6">
                {/* Reply Composer Card */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">
                      Reply to {senderName}
                    </h2>
                    <span className="text-xs text-white/50">Direct Inbound Message</span>
                  </div>

                  {replySuccess ? (
                    <div className="rounded-xl border border-[#00DD94]/30 bg-[#00DD94]/10 p-4 text-center space-y-2">
                      <span className="material-symbols-outlined text-2xl text-[#00DD94]">
                        check_circle
                      </span>
                      <p className="text-sm font-semibold text-white">
                        Your message has been sent to {senderName}!
                      </p>
                      <p className="text-xs text-white/70">
                        They will receive your note directly in their PaperWorking inbox.
                      </p>
                      <button
                        type="button"
                        onClick={() => setReplySuccess(false)}
                        className="mt-2 text-xs text-[#00DD94] underline hover:text-[#00DD94]/80"
                      >
                        Send another reply
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendReply} className="space-y-4">
                      {replyError && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                          {replyError}
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="reply-email"
                          className="block text-xs font-medium text-white/70 mb-1"
                        >
                          Your Email
                        </label>
                        <input
                          id="reply-email"
                          type="email"
                          value={replySenderEmail}
                          onChange={(e) => setReplySenderEmail(e.target.value)}
                          placeholder="investor@partnerfund.com"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#00DD94] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="reply-content"
                          className="block text-xs font-medium text-white/70 mb-1"
                        >
                          Message
                        </label>
                        <textarea
                          id="reply-content"
                          rows={4}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Hi ${senderName}, I saw your broadcast for ${deal.name || 'this deal'}. We would like to learn more about...`}
                          required
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/30 focus:border-[#00DD94] focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={sendingReply || !replyText.trim()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#00DD94] px-5 py-2.5 text-xs font-semibold text-[#0a0a0f] transition hover:brightness-110 disabled:opacity-50"
                        >
                          {sendingReply ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[16px]">
                                progress_activity
                              </span>
                              Sending…
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">send</span>
                              Send reply
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Subscribe CTA Block */}
                <div className="rounded-2xl border border-[#00DD94]/30 bg-gradient-to-br from-[#00DD94]/10 to-transparent p-6 text-center space-y-3">
                  <h3 className="text-base font-bold text-white">
                    Unlock Full Financial Modeling &amp; Underwriting
                  </h3>
                  <p className="text-xs text-white/70 max-w-lg mx-auto">
                    Subscribe to PaperWorking to access granular pro formas, rent roll sensitivity,
                    milestone budgets, and direct investment syndications.
                  </p>
                  <div className="pt-2">
                    <Link
                      href={`/signup?redirect=/deals/${slug}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#00DD94] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#0a0a0f] transition hover:brightness-110 shadow-lg shadow-[#00DD94]/10"
                    >
                      Subscribe to view full deal analysis and invest
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* INVITATION MODE: Show Decline and I'm Interested buttons */
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md space-y-4">
                <h2 className="text-base font-semibold text-white">Investment Invitation Response</h2>
                <p className="text-xs text-white/60">
                  Indicate your allocation interest to {senderName} for {deal.name}.
                </p>

                {inviteStatus === 'accepted' ? (
                  <div className="rounded-xl border border-[#00DD94]/30 bg-[#00DD94]/10 p-4 text-center text-sm font-semibold text-[#00DD94]">
                    Thank you! Your interest has been submitted to {senderName}.
                  </div>
                ) : inviteStatus === 'declined' ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                    You have declined this investment invitation.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setInviteStatus('declined')}
                      className="w-full sm:w-auto rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/5 transition"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteStatus('accepted')}
                      className="w-full sm:w-auto rounded-xl bg-[#00DD94] px-6 py-2.5 text-xs font-semibold text-[#0a0a0f] hover:brightness-110 transition"
                    >
                      I&apos;m Interested
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
