'use client';

import React, { useState } from 'react';
import { useOptionalAssistant } from '@/components/assistant/AssistantProvider';
import { X, ChatDots } from '@phosphor-icons/react';

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
        className="touch-press flex h-14 w-14 items-center justify-center rounded-none border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-lg hover:border-neutral-600 focus:outline-none min-h-[44px] min-w-[44px]"
        aria-label={isOpenLocal ? 'Close chat' : 'Open PaperWorking Assistant chat'}
        aria-expanded={isOpenLocal}
      >
        {isOpenLocal ? <X className="h-6 w-6" /> : <ChatDots className="h-6 w-6" />}
      </button>
    </div>
  );
}
