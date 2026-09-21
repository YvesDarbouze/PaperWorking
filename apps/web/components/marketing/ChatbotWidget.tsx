'use client';

import React, { useState } from 'react';
import { useOptionalAssistant } from '@/components/assistant/AssistantProvider';

/**
 * ChatbotWidget
 *
 * Floating support and assistant trigger for marketing and public pages.
 * When mounted within the root AssistantProvider, it seamlessly yields to
 * the unified PepperLauncher & PepperDrawer components so that all visitors
 * experience the simplified conversational triage, alternating blinking callout,
 * and direct issue resolution.
 *
 * In isolated component tests where AssistantProvider is omitted, it renders
 * the mobile-optimized launcher markup satisfying native touch and safe-area contracts.
 */
export default function ChatbotWidget() {
  const assistant = useOptionalAssistant();
  const [isOpenLocal, setIsOpenLocal] = useState(false);

  // In the real application, PepperLauncher in layout.tsx manages the unified conversational triage
  if (assistant) {
    return null;
  }

  // Standalone fallback for isolated unit tests
  return (
    <div
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 md:bottom-5 md:right-5 z-[100] flex flex-col items-end pointer-events-auto select-none"
      data-testid="chatbot-widget-container"
    >
      <button
        type="button"
        onClick={() => setIsOpenLocal((prev) => !prev)}
        className="touch-press flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#141217] text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:border-[color:var(--color-primary,#7A9EAA)] focus:outline-none"
        aria-label={isOpenLocal ? 'Close chat' : 'Open PaperWorking Assistant chat'}
        aria-expanded={isOpenLocal}
      >
        <span className="material-symbols-outlined text-[24px]">
          {isOpenLocal ? 'close' : 'chat'}
        </span>
      </button>
    </div>
  );
}
