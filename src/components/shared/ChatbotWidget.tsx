'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    // For now, clear the input
    setMessage('');
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 sm:bottom-16 sm:right-0 w-[calc(100vw-2rem)] sm:w-[360px] bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-2xl shadow-xl overflow-hidden flex flex-col mb-4 origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--pw-border)] bg-[var(--pw-surface)]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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

            {/* Chat Area */}
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

            {/* Input Area */}
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
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[var(--pw-black)] hover:bg-[var(--pw-black)]/90 text-white rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--pw-black)] transition-transform hover:scale-105 active:scale-95"
        aria-label={isOpen ? "Close chat" : "Open chat"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}
