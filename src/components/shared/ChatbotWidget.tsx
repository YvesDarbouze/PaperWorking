'use client';

import { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessage('');
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100]">
      <div
        className={`absolute bottom-16 right-0 sm:bottom-16 sm:right-0 w-[calc(100vw-2rem)] sm:w-[360px] bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-2xl shadow-xl overflow-hidden flex flex-col mb-4 origin-bottom-right transition-all duration-200 ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-5 scale-95 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
        style={{ display: isOpen ? 'flex' : 'none' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--pw-border)] bg-[var(--pw-surface)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pw-success animate-pulse" />
            <h3 className="text-sm font-medium text-[var(--pw-black)]">PaperWorking Assistant</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[var(--pw-muted)] hover:text-[var(--pw-black)] transition-colors p-1"
            aria-label="Close chat window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto h-[320px] bg-[var(--pw-canvas)]/50">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--pw-primary)] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[var(--pw-black)] shadow-sm">
                PaperWorking Support. Briefly describe your issue, or ask a question about our SOPs and platform features.
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-[var(--pw-border)] bg-[var(--pw-surface)]">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full pl-4 pr-12 py-2.5 bg-[var(--pw-canvas)] border border-[var(--pw-border)] rounded-full text-sm text-[var(--pw-black)] placeholder-[var(--pw-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pw-primary)] focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="absolute right-2 p-1.5 text-[var(--pw-muted)] hover:text-[var(--pw-primary)] disabled:opacity-50 disabled:hover:text-[var(--pw-muted)] transition-colors rounded-full"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        /* `pw-interactive-custom` is load-bearing, not decorative: the global
           rule at globals.css:1275 targets
           `button:not(.pw-tab):not(.pw-menu-item):not([role="tab"]):not(.pw-interactive-custom)`
           and applies `padding: 12px 28px`. On a 56px button that is 56px of
           horizontal padding, so min-content forces the width to 60px and the
           circle renders as a 56x60 ellipse. Do not remove this class. */
        className="pw-interactive-custom w-14 h-14 shrink-0 box-border rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:ring-offset-2"
        style={{
          backgroundColor: isOpen ? 'var(--color-primary)' : 'transparent',
          border: '2px solid var(--color-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X
            className="w-5 h-5"
            style={{ color: 'var(--color-surface)', strokeWidth: 2.5 }}
          />
        ) : (
          <MessageSquare
            className="w-6 h-6"
            style={{ color: 'var(--color-primary)', strokeWidth: 2 }}
          />
        )}
      </button>
    </div>
  );
}
