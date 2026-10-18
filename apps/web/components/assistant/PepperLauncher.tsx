'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Headset,
  Lightbulb,
  X,
} from '@phosphor-icons/react';
import { useAssistant } from './AssistantProvider';
import { AVA_CONFIG } from '@/lib/assistant/config';

export default function PepperLauncher() {
  const {
    currentPhase,
    isDrawerOpen,
    openDrawer,
    dismissPulse,
  } = useAssistant();

  const [isBadgeDismissed, setIsBadgeDismissed] = useState(false);

  // If the drawer is already open, launcher is hidden
  if (isDrawerOpen) return null;

  const isMinimizedPill = currentPhase === 'PHASE_4_MINIMIZED';

  return (
    <div
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 sm:right-4 md:bottom-6 md:right-6 z-[65] flex flex-col items-end gap-2.5 pointer-events-auto"
      data-testid="ava-launcher-container"
    >
      {/* Stable Callout Badge */}
      {!isBadgeDismissed && !isMinimizedPill && (
        <div
          role="dialog"
          aria-label="Submit a Request or Report a Bug"
          data-testid="ava-pulse-bubble"
          className="relative flex items-center gap-2 rounded-none border border-border bg-card px-3.5 py-2.5 shadow-sm ring-1 ring-foreground/10 text-card-foreground opacity-100 translate-y-0 scale-100 min-h-[44px]"
        >
          <button
            type="button"
            onClick={openDrawer}
            data-testid="ava-launcher-bubble"
            className="flex items-center gap-2 text-left group min-h-[44px]"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground transition-colors">
              <Lightbulb weight="bold" className="h-4 w-4 text-foreground" />
              <span>Feature Request</span>
              <span className="sr-only">Report Bug or Feature Request</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">· Report Bug</span>
            </span>
            <ArrowRight weight="bold" className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
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
            className="ml-1 rounded-none p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X weight="bold" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Phase 4 Minimized Pill - shown after user dismisses the callout or completes a session */}
      {isMinimizedPill && (
        <button
          type="button"
          onClick={openDrawer}
          data-testid="ava-minimized-pill"
          aria-label={`Open ${AVA_CONFIG.agentName} Assistant`}
          className="group flex items-center gap-2.5 rounded-none border border-border bg-card px-4 py-2.5 shadow-sm ring-1 ring-foreground/10 text-card-foreground transition-all hover:bg-accent min-h-[44px]"
        >
          <div className="relative flex h-6 w-6 items-center justify-center rounded-none bg-muted text-foreground">
            <Headset weight="bold" className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            Report Bug / Feedback
          </span>
          <ArrowUpRight weight="bold" className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
        </button>
      )}
    </div>
  );
}

export { PepperLauncher as AvaLauncher };

