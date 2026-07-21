'use client';

import React, { useState, useEffect } from 'react';
import { usersService } from '@/lib/firebase/users';

interface HoldWelcomeBannerProps {
  userId?: string;
  onSelectCard?: (cardId: string) => void;
}

export function HoldWelcomeBanner({ userId = 'user_1', onSelectCard }: HoldWelcomeBannerProps) {
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    usersService.getPhaseBannerDismissed(userId, 'hold').then((dismissed) => {
      if (mounted) {
        setIsDismissed(dismissed);
      }
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleDismiss = async () => {
    setIsDismissed(true);
    await usersService.setPhaseBannerDismissed(userId, 'hold');
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className="w-full h-[80px] rounded-xl px-6 flex items-center justify-between shadow-lg backdrop-blur-md mb-6 transition-all duration-200 border"
      style={{
        background: 'var(--color-surface-dim)',
        borderColor: 'var(--color-outline-variant)',
        color: 'var(--color-on-surface)',
      }}
    >
      <div className="flex items-center space-x-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center border"
          style={{
            background: 'var(--color-primary-container)',
            borderColor: 'var(--color-primary-container)',
            color: 'var(--color-primary)',
          }}
        >
          <span className="material-symbols-outlined text-[20px]">roofing</span>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold leading-tight">
            Welcome to the Hold workspace.
          </h3>
          <p
            className="text-[13px] leading-tight mt-1 flex items-center space-x-2"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            <span>Fill in these first to light up your:</span>
            <button
              onClick={() => onSelectCard?.('H5.R')}
              className="hover:underline font-medium focus:outline-none"
              style={{ color: 'var(--color-primary)' }}
            >
              NOI (Empty → Add Target Rent)
            </button>
            <span>•</span>
            <button
              onClick={() => onSelectCard?.('H3.1')}
              className="hover:underline font-medium focus:outline-none"
              style={{ color: 'var(--color-primary)' }}
            >
              Cash Flow & Expense Ratio (Empty → Add Holding Costs)
            </button>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => onSelectCard?.('H1.1')}
          className="text-[13px] font-medium px-3.5 py-1.5 rounded-lg border transition-colors flex items-center space-x-1"
          style={{
            background: 'var(--color-surface-container)',
            borderColor: 'var(--color-outline-variant)',
            color: 'var(--color-on-surface)',
          }}
        >
          <span>Show me around</span>
          <span className="text-[14px]">→</span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'var(--color-on-surface-variant)' }}
          title="Dismiss welcome banner"
          aria-label="Dismiss welcome banner"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
