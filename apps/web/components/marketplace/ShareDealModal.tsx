'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';
import { formatCurrency, formatPercent } from '@/lib/format';
import { extractStreetAddress } from '@/lib/marketplace/address-utils';

export interface ShareDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle: string;
  dealAddress: string;
  dealSlug?: string;
  currentVisibility?: 'marketplace' | 'private' | 'invitation_only' | string;
  initialChannel?: 'message' | 'email' | 'copy_link' | 'social';
  targetIrr?: number;
  purchasePrice?: number;
  calculatorResults?: any;
  onVisibilityChange?: (newVisibility: 'marketplace' | 'private') => void;
}

export default function ShareDealModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  dealAddress,
  dealSlug,
  currentVisibility = 'marketplace',
  initialChannel = 'message',
  targetIrr = 18.4,
  purchasePrice = 485000,
  calculatorResults,
  onVisibilityChange,
}: ShareDealModalProps) {
  const [visibility, setVisibility] = useState<'marketplace' | 'private'>(
    currentVisibility === 'private' ? 'private' : 'marketplace'
  );
  const [channel, setChannel] = useState<'message' | 'email' | 'copy_link' | 'social'>(initialChannel);
  const [recipientsText, setRecipientsText] = useState('investor@paperworking.test');
  const [note, setNote] = useState(
    `Sharing underwriting analysis for ${extractStreetAddress(dealAddress || dealTitle)}. Check the Deal Calculator outputs.`
  );
  const [loading, setLoading] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    shareUrl?: string;
    shareToken?: string;
    channel?: string;
    recipients?: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [socialCopied, setSocialCopied] = useState(false);

  const streetAddress = extractStreetAddress(dealAddress || dealTitle);
  const socialShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/marketplace/${dealSlug || dealId}`
    : `https://paperworking.com/marketplace/${dealSlug || dealId}`;

  const defaultSocialText = [
    `Underwriting Opportunity: ${streetAddress}`,
    `Purchase: ${formatCurrency(purchasePrice)}`,
    calculatorResults?.rehabBudget ? `Rehab: ${formatCurrency(calculatorResults.rehabBudget)}` : null,
    `Target IRR: ${Number(targetIrr).toFixed(1)}%`,
    calculatorResults?.cashRequired ? `Cash Req: ${formatCurrency(calculatorResults.cashRequired)}` : null,
    calculatorResults?.netOperatingIncome ? `NOI: ${formatCurrency(calculatorResults.netOperatingIncome)}` : null,
    `Strategy: ${calculatorResults?.strategy || 'Fix & Flip'}`,
    `Deal Calculator Results: ${socialShareUrl}`,
  ].filter(Boolean).join(' | ');

  const [socialText, setSocialText] = useState(defaultSocialText);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSocialText(defaultSocialText);
  }, [dealAddress, dealTitle, purchasePrice, targetIrr, calculatorResults]);

  useEffect(() => {
    setVisibility(currentVisibility === 'private' ? 'private' : 'marketplace');
  }, [currentVisibility]);

  useEffect(() => {
    if (!isOpen) {
      setSuccessResult(null);
      setError(null);
      setCopied(false);
      return;
    }
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });
    return cleanup;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleVisibilityToggle = async (newVis: 'marketplace' | 'private') => {
    setVisibility(newVis);
    setSavingVisibility(true);
    setError(null);
    try {
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          slug: dealSlug,
          visibility: newVis,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to update deal visibility');
      }
      onVisibilityChange?.(newVis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating deal visibility');
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(socialText);
    const url = encodeURIComponent(socialShareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(socialShareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(socialShareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopySocialPost = () => {
    const fullText = `${socialText} ${socialShareUrl}`;
    navigator.clipboard.writeText(fullText);
    setSocialCopied(true);
    setTimeout(() => setSocialCopied(false), 2500);
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (channel === 'social') {
      handleCopySocialPost();
      return;
    }

    setLoading(true);
    setError(null);

    const recipients = recipientsText
      .split(/[,;\n]/)
      .map((r) => r.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      setError('Please provide at least one recipient email or user handle.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/deals/${dealId || dealSlug}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          recipients,
          message: note,
          includeBusinessCard: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to share deal');
      }

      setSuccessResult({
        shareUrl: data.shareUrl,
        shareToken: data.shareToken,
        channel: data.channel,
        recipients: data.recipients,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sharing deal');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successResult?.shareUrl) {
      const fullUrl = window.location.origin + successResult.shareUrl;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-deal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        data-testid="share-deal-modal"
        className="relative w-full max-w-[620px] max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-2xl p-6 sm:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4 mb-6">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-widest text-neutral-400">
              Deal Sharing & Privacy
            </div>
            <h2 id="share-deal-title" className="text-xl font-bold text-white tracking-tight">
              Share & Distribute: {streetAddress}
            </h2>
            <p className="text-xs text-neutral-400">
              Control placement on the Deals Marketplace or share privately via messages and email.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-neutral-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}

        {/* Success confirmation */}
        {successResult ? (
          <div className="space-y-6" data-testid="share-success-view">
            <div className="p-4 border border-emerald-800 bg-emerald-950/30 text-emerald-200 text-sm space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                Deal Successfully Shared
              </div>
              <p className="text-xs text-neutral-300">
                {successResult.channel === 'message'
                  ? `Delivered to PaperWorking messages for ${successResult.recipients?.join(', ')}. Unsubscribed users will only receive the calculated results.`
                  : `Email broadcast dispatched with complete Deal Calculator Results.`}
              </p>
            </div>

            {successResult.shareUrl && (
              <div className="space-y-2 border border-neutral-800 p-4 bg-neutral-950">
                <label className="text-xs font-mono uppercase text-neutral-400">
                  Private Access Link (Delivers Calculator Results)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.origin + successResult.shareUrl}
                    className="flex-1 bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-neutral-200 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 min-h-[44px] text-xs font-medium bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 min-h-[44px] text-sm font-medium bg-white text-neutral-950 hover:bg-neutral-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleShareSubmit} className="space-y-6">
            {/* Visibility Mode Selector */}
            <div className="space-y-2 border border-neutral-800 p-4 bg-neutral-950">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span>Placement & Visibility</span>
                {savingVisibility && (
                  <span className="text-[10px] text-neutral-500 animate-pulse">Saving...</span>
                )}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleVisibilityToggle('marketplace')}
                  className={`p-3 text-left border min-h-[44px] transition-colors flex flex-col justify-between ${
                    visibility === 'marketplace'
                      ? 'border-white bg-neutral-800/80 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                  }`}
                  data-testid="visibility-marketplace-btn"
                >
                  <div className="font-semibold text-sm flex items-center gap-1.5 text-white">
                    <span className="material-symbols-outlined text-[16px]">public</span>
                    Deals Marketplace
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    Listed publicly on marketplace feed for discovery.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVisibilityToggle('private')}
                  className={`p-3 text-left border min-h-[44px] transition-colors flex flex-col justify-between ${
                    visibility === 'private'
                      ? 'border-amber-400 bg-neutral-800/80 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                  }`}
                  data-testid="visibility-private-btn"
                >
                  <div className="font-semibold text-sm flex items-center gap-1.5 text-amber-300">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Private Deal
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    Hidden from feed. Shared only with selected investors.
                  </div>
                </button>
              </div>
            </div>

            {/* Distribution Channel */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Share Channel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('message')}
                  className={`p-2.5 text-center border min-h-[44px] text-xs font-medium transition-colors ${
                    channel === 'message'
                      ? 'border-white bg-neutral-800 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                  data-testid="channel-message-btn"
                >
                  Messages
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`p-2.5 text-center border min-h-[44px] text-xs font-medium transition-colors ${
                    channel === 'email'
                      ? 'border-white bg-neutral-800 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                  data-testid="channel-email-btn"
                >
                  Outside Email
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('copy_link')}
                  className={`p-2.5 text-center border min-h-[44px] text-xs font-medium transition-colors ${
                    channel === 'copy_link'
                      ? 'border-white bg-neutral-800 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                  data-testid="channel-copy-link-btn"
                >
                  Private Link
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('social')}
                  className={`p-2.5 text-center border min-h-[44px] text-xs font-medium transition-colors ${
                    channel === 'social'
                      ? 'border-white bg-neutral-800 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                  data-testid="channel-social-btn"
                >
                  Social Media
                </button>
              </div>
            </div>

            {channel === 'social' ? (
              <div className="space-y-4" data-testid="social-share-panel">
                <div className="space-y-2">
                  <label htmlFor="social-post-input" className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                    <span>Social Media Post Copy (Includes Deal Calculator Results)</span>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">Calculator Results Attached</span>
                  </label>
                  <textarea
                    id="social-post-input"
                    data-testid="social-post-input"
                    rows={3}
                    value={socialText}
                    onChange={(e) => setSocialText(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400 font-mono"
                  />
                  <p className="text-[10px] text-neutral-500">
                    This post includes verified Deal Calculator results. Unsubscribed viewers can view the summary; subscribers unlock the full deal room.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                    One-Click Social Channels
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={handleShareTwitter}
                      data-testid="share-twitter-btn"
                      className="flex items-center justify-center gap-1.5 p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-neutral-800 text-xs font-semibold text-white transition-colors min-h-[44px]"
                    >
                      <span className="font-bold">X (Twitter)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareLinkedIn}
                      data-testid="share-linkedin-btn"
                      className="flex items-center justify-center gap-1.5 p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-neutral-800 text-xs font-semibold text-white transition-colors min-h-[44px]"
                    >
                      <span className="font-bold">LinkedIn</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareFacebook}
                      data-testid="share-facebook-btn"
                      className="flex items-center justify-center gap-1.5 p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-neutral-800 text-xs font-semibold text-white transition-colors min-h-[44px]"
                    >
                      <span className="font-bold">Facebook</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySocialPost}
                      data-testid="copy-social-post-btn"
                      className="flex items-center justify-center gap-1.5 p-2.5 border border-neutral-700 bg-neutral-950 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 transition-colors min-h-[44px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>{socialCopied ? 'Copied!' : 'Copy Post'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Recipients */}
                <div className="space-y-2">
                  <label htmlFor="share-recipients-input" className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                    {channel === 'email'
                      ? 'Investor / Partner Email List (comma-delineated: e.g. partner1@fund.com, investor2@syndicate.io, angel3@capital.com) *'
                      : 'Recipients (Comma-separated emails or handles) *'}
                  </label>
                  <input
                    id="share-recipients-input"
                    type="text"
                    data-testid="share-recipients-input"
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    placeholder={channel === 'email' ? 'partner1@fund.com, investor2@syndicate.io, angel3@capital.com' : 'investor@apexcap.com, dev-investor'}
                    className="w-full bg-neutral-950 border border-neutral-700 px-3 py-2.5 text-base sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400 min-h-[44px]"
                    required
                  />
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <label htmlFor="share-note-input" className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                    Personal Note / Context
                  </label>
                  <textarea
                    id="share-note-input"
                    data-testid="share-note-input"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 px-3 py-2 text-base sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                  />
                </div>
              </>
            )}

            {/* Calculator Results Teaser */}
            <div className="border border-neutral-800 p-3 bg-neutral-950/80 space-y-2">
              <div className="text-[11px] font-mono uppercase text-neutral-400 flex items-center justify-between">
                <span>Included Deal Calculator Results</span>
                <span className="text-emerald-400 font-semibold">{`${Number(targetIrr).toFixed(1)}% Target IRR`}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-neutral-300">
                <div>
                  <span className="text-neutral-500 text-[10px] block">Purchase:</span>
                  {formatCurrency(purchasePrice)}
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block">Cash Req:</span>
                  {formatCurrency(calculatorResults?.cashRequired ?? Math.round(purchasePrice * 0.25))}
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block">Hold Period:</span>
                  {calculatorResults?.holdPeriod || '3–5 Years'}
                </div>
              </div>
              <div className="text-[10px] text-neutral-500 pt-1">
                Note: Unsubscribed recipients can view these calculator outputs only. Subscribed recipients unlock the full deal room.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 min-h-[44px] text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                data-testid="share-submit-btn"
                className="px-6 py-2.5 min-h-[44px] text-sm font-medium bg-white text-neutral-950 hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sharing Deal...' : 'Share Deal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
