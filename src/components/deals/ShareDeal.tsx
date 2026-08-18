'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';

interface ShareDealProps {
  address: string;
  slug: string;
  percentFunded?: number;
  teaser?: string;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function ShareDeal({
  address,
  slug,
  percentFunded = 65,
  teaser: _teaser = 'Value-add real estate investment opportunity on PaperWorking',
  isOpen: _isOpen = false,
  onClose,
  className = '',
}: ShareDealProps) {
  const [copied, setCopied] = useState(false);

  const dealUrl = typeof window !== 'undefined' ? `${window.location.origin}/deals/${slug}` : `https://paperworking.co/deals/${slug}`;
  const shareText = `${address} | ${percentFunded}% funded on PaperWorking`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(dealUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(dealUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInShare = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(dealUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      data-testid="share-deal-popover"
      className={`rounded-[14px] border border-white/10 p-5 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#34d399]" />
          <span>Share Investment Opportunity</span>
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 font-mono line-clamp-1">
        {shareText}
      </p>

      {/* Share Buttons Row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          data-testid="share-copy-link"
          onClick={handleCopy}
          className="py-2.5 px-3 rounded-[10px] bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer border border-white/5"
        >
          {copied ? <Check className="w-4 h-4 text-[#34d399]" /> : <Copy className="w-4 h-4 text-slate-400" />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>

        <button
          type="button"
          data-testid="share-twitter-btn"
          onClick={handleTwitterShare}
          className="py-2.5 px-3 rounded-[10px] bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer border border-white/5"
        >
          <span className="font-extrabold text-sky-400">𝕏</span>
          <span>Twitter/X</span>
        </button>

        <button
          type="button"
          data-testid="share-linkedin-btn"
          onClick={handleLinkedInShare}
          className="py-2.5 px-3 rounded-[10px] bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer border border-white/5"
        >
          <span className="font-extrabold text-blue-400">in</span>
          <span>LinkedIn</span>
        </button>
      </div>
    </div>
  );
}
