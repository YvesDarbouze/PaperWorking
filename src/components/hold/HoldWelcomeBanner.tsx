'use client';

import React, { useState, useEffect } from 'react';

interface HoldWelcomeBannerProps {
  userId?: string;
  onSelectCard?: (cardId: string) => void;
}

export function HoldWelcomeBanner({ userId = 'guest', onSelectCard }: HoldWelcomeBannerProps) {
  const storageKey = `pw_banner_dismissed_hold_${userId}`;
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="w-full h-[80px] bg-[rgba(18,16,20,0.98)] border border-[rgba(253,255,252,0.07)] rounded-xl px-6 flex items-center justify-between shadow-lg backdrop-blur-md mb-6 transition-all duration-200">
      <div className="flex items-center space-x-6">
        <div className="w-10 h-10 rounded-lg bg-[rgba(234,88,12,0.12)] border border-[rgba(234,88,12,0.30)] flex items-center justify-center text-[#EA580C]">
          <span className="material-symbols-outlined text-[20px]">roofing</span>
        </div>

        <div>
          <h3 className="text-[#FDFFFC] text-[15px] font-semibold leading-tight">
            Welcome to the Hold workspace.
          </h3>
          <p className="text-[rgba(253,255,252,0.60)] text-[13px] leading-tight mt-1 flex items-center space-x-2">
            <span>Fill in these first to light up your:</span>
            <button
              onClick={() => onSelectCard?.('H5.R')}
              className="text-[#EA580C] hover:underline font-medium focus:outline-none"
            >
              NOI (Empty → Add Target Rent)
            </button>
            <span>•</span>
            <button
              onClick={() => onSelectCard?.('H3.1')}
              className="text-[#EA580C] hover:underline font-medium focus:outline-none"
            >
              Cash Flow & Expense Ratio (Empty → Add Holding Costs)
            </button>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => onSelectCard?.('H1.1')}
          className="text-[#FDFFFC] bg-[rgba(253,255,252,0.08)] hover:bg-[rgba(253,255,252,0.14)] text-[13px] font-medium px-3.5 py-1.5 rounded-lg border border-[rgba(253,255,252,0.12)] transition-colors flex items-center space-x-1"
        >
          <span>Show me around</span>
          <span className="text-[14px]">→</span>
        </button>

        <button
          onClick={handleDismiss}
          className="text-[rgba(253,255,252,0.40)] hover:text-[#FDFFFC] p-1.5 rounded-md hover:bg-[rgba(253,255,252,0.06)] transition-colors"
          title="Dismiss welcome banner"
          aria-label="Dismiss welcome banner"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
