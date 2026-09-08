'use client';

import React from 'react';
import { useAssistant } from './AssistantProvider';
import { AVA_CONFIG } from '@/lib/assistant/config';

export default function AvaLauncher() {
  const {
    currentPhase,
    isDrawerOpen,
    isPulseVisible,
    openDrawer,
    dismissPulse,
  } = useAssistant();

  // If the drawer is already open, launcher is hidden
  if (isDrawerOpen) return null;

  const isMinimizedPill = currentPhase === 'PHASE_4_MINIMIZED';

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto"
      data-testid="ava-launcher-container"
    >
      {/* Phase 1: Proactive Pulse Callout Bubble */}
      {isPulseVisible && !isMinimizedPill && (
        <div
          role="dialog"
          aria-label={`${AVA_CONFIG.agentName} suggestion`}
          data-testid="ava-pulse-bubble"
          className="relative max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-[color:var(--color-primary)]/30 bg-[#121014]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md"
        >
          {/* Subtle pulse ring around bubble respecting prefers-reduced-motion */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-[color:var(--color-primary)]/30 motion-safe:animate-pulse"
            aria-hidden="true"
          />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[color:var(--color-primary)]" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[color:var(--color-primary)]">
                {AVA_CONFIG.agentName}
              </span>
            </div>
            <button
              type="button"
              onClick={dismissPulse}
              aria-label="Dismiss proactive callout"
              data-testid="dismiss-pulse-button"
              className="text-white/40 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <p className="mt-2 text-sm text-white/90 leading-relaxed font-medium">
            &ldquo;What are we building today? Let me set up your workspace.&rdquo;
          </p>

          <button
            type="button"
            onClick={openDrawer}
            data-testid="open-from-pulse-button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--color-primary)] py-2 text-xs font-bold text-black shadow transition-transform active:scale-95"
          >
            <span>Set up workspace</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
            <span className="material-symbols-outlined text-base">smart_toy</span>
            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)] ring-1 ring-black" />
          </div>
          <span className="text-xs font-semibold text-white/80 group-hover:text-white">
            {AVA_CONFIG.agentName}
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
          aria-label={`Open ${AVA_CONFIG.agentName} Onboarding Copilot`}
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--color-primary)]/40 bg-[#141217] text-[color:var(--color-primary)] shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all hover:scale-105 hover:border-[color:var(--color-primary)] active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">smart_toy</span>
          {/* Subtle online status dot */}
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[color:var(--color-primary)]" />
          </span>
        </button>
      )}
    </div>
  );
}
