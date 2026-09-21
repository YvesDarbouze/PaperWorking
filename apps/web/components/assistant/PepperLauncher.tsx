'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAssistant } from './AssistantProvider';
import { AVA_CONFIG } from '@/lib/assistant/config';

export default function PepperLauncher() {
  const {
    currentPhase,
    isDrawerOpen,
    isPulseVisible,
    openDrawer,
    dismissPulse,
  } = useAssistant();

  // Flashing callout badge state: 'feature' -> fade -> 'bug' -> fade -> repeat
  const [activeChip, setActiveChip] = useState<'feature' | 'bug'>('feature');
  const [isVisible, setIsVisible] = useState(true);
  const [isBadgeDismissed, setIsBadgeDismissed] = useState(false);

  useEffect(() => {
    if (isBadgeDismissed) return;

    // Cycle every 3.2 seconds:
    // visible for 2.6s, then fade out for 0.6s, then switch text and fade in
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setActiveChip((prev) => (prev === 'feature' ? 'bug' : 'feature'));
        setIsVisible(true);
      }, 500);
    }, 3200);

    return () => clearInterval(interval);
  }, [isBadgeDismissed]);

  // If the drawer is already open, launcher is hidden
  if (isDrawerOpen) return null;

  const isMinimizedPill = currentPhase === 'PHASE_4_MINIMIZED';

  return (
    <div
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 sm:right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2.5 pointer-events-auto"
      data-testid="ava-launcher-container"
    >
      {/* Alternating Blinking Flashing Callout Badge */}
      {!isBadgeDismissed && !isMinimizedPill && (
        <div
          role="dialog"
          aria-label="Submit a Request or Report a Bug"
          data-testid="ava-pulse-bubble"
          className={`relative flex items-center gap-2 rounded-2xl border border-[color:var(--color-primary)]/40 bg-[#121014]/95 px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95 pointer-events-none'
          }`}
        >
          {/* Subtle pulse ring around bubble */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-[color:var(--color-primary)]/30 motion-safe:animate-pulse"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={openDrawer}
            data-testid="open-from-pulse-button"
            className="flex items-center gap-2 text-left group"
          >
            {activeChip === 'feature' ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-base text-amber-400">lightbulb</span>
                <span>Feature Request</span>
                <span className="text-[10px] text-white/50 font-normal hidden sm:inline">— we&apos;ll buy dinner!</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-300 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-base text-rose-400">bug_report</span>
                <span>Report A Bug</span>
                <span className="text-[10px] text-white/50 font-normal hidden sm:inline">— instant triage</span>
              </span>
            )}
            <span className="material-symbols-outlined text-xs text-white/40 group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </button>

          {/* User can X out the callout at any time */}
          <button
            type="button"
            onClick={() => {
              setIsBadgeDismissed(true);
              dismissPulse();
            }}
            aria-label="Dismiss callout"
            data-testid="dismiss-pulse-button"
            className="ml-1 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Floating Action Trigger Button / Phase 4 Pill */}
      {isMinimizedPill ? (
        <button
          type="button"
          onClick={openDrawer}
          data-testid="ava-minimized-pill"
          aria-label={`Open ${AVA_CONFIG.agentName} Assistant`}
          className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-[#141217]/90 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:border-[color:var(--color-primary)]/50 hover:bg-[#1b1820]"
        >
          <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]">
            <span className="material-symbols-outlined text-base">support_agent</span>
            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)] ring-1 ring-black" />
          </div>
          <span className="text-xs font-semibold text-white/80 group-hover:text-white">
            Report Bug / Feedback
          </span>
          <span className="material-symbols-outlined text-xs text-white/40 group-hover:text-white transition-transform group-hover:translate-y-[-1px]">
            north_east
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={openDrawer}
          data-testid="ava-launcher-bubble"
          aria-label="Report Bug or Submit Request"
          className="group relative flex h-14 items-center gap-2.5 rounded-full border border-[color:var(--color-primary)]/40 bg-[#141217] px-4 text-white shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all hover:scale-105 hover:border-[color:var(--color-primary)] active:scale-95"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]">
            <span className="material-symbols-outlined text-xl">smart_toy</span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-primary)]" />
            </span>
          </div>
          <div className="flex flex-col text-left pr-1">
            <span className="text-xs font-bold text-white group-hover:text-[color:var(--color-primary)] transition-colors">
              Report Bug
            </span>
            <span className="text-[10px] text-white/50">or Feature Request</span>
          </div>
        </button>
      )}
    </div>
  );
}

export { PepperLauncher as AvaLauncher };
