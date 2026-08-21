'use client';

import { useState } from 'react';

/** Floating support chat — visual parity with v0 ChatbotWidget. */
export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setMessage('');
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] sm:bottom-6 sm:right-6">
      {isOpen ? (
        <div className="absolute bottom-16 right-0 mb-4 flex h-auto w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121014] shadow-xl sm:w-[360px]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
              <h3 className="text-sm font-medium text-white">PaperWorking Assistant</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-white/50 hover:text-white"
              aria-label="Close chat window"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="h-[320px] flex-1 overflow-y-auto bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-primary)]">
                <span className="material-symbols-outlined text-[16px] text-[#0d0a0b]">chat</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-[#1a171c] px-4 py-3 text-sm text-white/90 shadow-sm">
                PaperWorking Support. Briefly describe your issue, or ask a question about our SOPs
                and platform features.
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-3">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full rounded-full border border-white/10 bg-black/30 py-2.5 pl-4 pr-12 text-sm text-white placeholder:text-white/40 focus:border-[color:var(--color-primary)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="absolute right-2 rounded-full p-1.5 text-white/40 hover:text-[color:var(--color-primary)] disabled:opacity-50"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="box-border flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: isOpen ? 'var(--color-primary)' : 'transparent',
          border: '2px solid var(--color-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={{ color: isOpen ? '#0d0a0b' : 'var(--color-primary)' }}
        >
          {isOpen ? 'close' : 'chat'}
        </span>
      </button>
    </div>
  );
}
