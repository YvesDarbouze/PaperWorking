'use client';

import React, { useEffect } from 'react';
import { useAssistant } from './AssistantProvider';
import { AVA_CONFIG } from '@/lib/assistant/config';

export default function AvaGhostCopilot() {
  const { ghostSuggestion, acceptGhostSuggestion, dismissGhostSuggestion } = useAssistant();

  useEffect(() => {
    if (!ghostSuggestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Invariant (§7 Phase 4): Ghost text never intercepts typing.
      // One key (Tab) accepts, anything else dismisses.
      if (e.key === 'Tab') {
        e.preventDefault();
        const activeEl = document.activeElement;
        if (
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement
        ) {
          acceptGhostSuggestion(activeEl);
        } else {
          acceptGhostSuggestion();
        }
      } else {
        // Any other key typing dismisses ghost copilot silently
        dismissGhostSuggestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ghostSuggestion, acceptGhostSuggestion, dismissGhostSuggestion]);

  if (!ghostSuggestion) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="ava-ghost-copilot"
      className="fixed bottom-24 right-6 z-40 max-w-sm rounded-xl border border-[color:var(--color-primary)]/40 bg-[#121016]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]">
            <span className="material-symbols-outlined text-xs">smart_toy</span>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
            {AVA_CONFIG.agentName} Copilot
          </span>
        </div>
        <button
          type="button"
          onClick={dismissGhostSuggestion}
          aria-label="Dismiss suggestion"
          data-testid="dismiss-ghost-button"
          className="text-white/40 hover:text-white"
        >
          <span className="material-symbols-outlined text-xs">close</span>
        </button>
      </div>

      <p className="mt-1.5 text-xs text-white/90 leading-relaxed font-medium">
        {ghostSuggestion.text}
      </p>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-white/50">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/80">
            Tab
          </kbd>
          <span>to accept</span>
        </span>
        <button
          type="button"
          onClick={() => acceptGhostSuggestion()}
          data-testid="accept-ghost-button"
          className="font-bold text-[color:var(--color-primary)] hover:underline"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
