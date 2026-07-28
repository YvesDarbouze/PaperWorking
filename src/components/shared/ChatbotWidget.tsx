'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { ccTokens } from '@/components/dashboard/command-center/ccTheme';

const STORAGE_KEY = 'pw-assistant-demo-chat';

const WELCOME_TEXT =
  'PaperWorking Support. Briefly describe your issue, or ask a question about our SOPs and platform features.';

type ChatRole = 'assistant' | 'user';

interface DemoMessage {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadMessages(): DemoMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DemoMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) => m && typeof m.text === 'string' && (m.role === 'assistant' || m.role === 'user'),
    );
  } catch {
    return [];
  }
}

function saveMessages(messages: DemoMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* quota / private mode */
  }
}

function demoReply(userText: string): string {
  const q = userText.trim().toLowerCase();
  if (/^(hi|hello|hey|xin chào|chào)\b/.test(q)) {
    return 'Hi — this is a local demo chat. Messages stay on this device only (localStorage). How can we help with PaperWorking?';
  }
  if (/sop|feature|how|help|hướng dẫn|tính năng/.test(q)) {
    return 'Demo reply: ask about Portfolio, Projects, Inbox, or Settings. Nothing here is sent to a server.';
  }
  return 'Got it (demo). Your message is saved locally on this browser only — not synced to support tickets.';
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = ccTokens(isDark);

  useEffect(() => {
    setMessages(loadMessages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveMessages(messages);
  }, [messages, hydrated]);

  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isOpen]);

  const append = useCallback((role: ChatRole, text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role, text, at: Date.now() },
    ]);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage('');
    append('user', text);
    window.setTimeout(() => {
      append('assistant', demoReply(text));
    }, 350);
  };

  const canSend = Boolean(message.trim());

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100]">
      {/* Support panel */}
      <div
        className={`absolute bottom-14 right-0 w-[calc(100vw-2rem)] sm:w-[360px] overflow-hidden flex flex-col mb-3 origin-bottom-right transition-all duration-200 ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-3 scale-[0.98] pointer-events-none'
        }`}
        aria-hidden={!isOpen}
        style={{
          display: isOpen ? 'flex' : 'none',
          height: 'min(520px, 70vh)',
          maxHeight: '70vh',
          background: t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: 2,
          boxShadow: isDark
            ? '0 12px 32px rgba(0,0,0,0.45)'
            : '0 8px 24px rgba(20,22,28,0.10)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-3.5 py-2.5 flex-shrink-0"
          style={{ borderBottom: `1px solid ${t.divider}` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 1,
                background: t.success,
                flexShrink: 0,
              }}
            />
            <div className="min-w-0">
              <h3
                className="text-[13px] font-semibold truncate leading-tight"
                style={{ color: t.heading, letterSpacing: '-0.01em' }}
              >
                PaperWorking Assistant
              </h3>
              <p
                className="text-[10px] font-medium uppercase mt-0.5"
                style={{ color: t.muted, letterSpacing: '0.08em' }}
              >
                Demo · local only
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="pw-interactive-custom flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label="Close chat window"
            style={{
              width: 28,
              height: 28,
              borderRadius: 2,
              color: t.muted,
              background: 'transparent',
              border: `1px solid ${t.border}`,
            }}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Messages — scrolls inside fixed panel */}
        <div
          ref={listRef}
          className="flex-1 min-h-0 p-3.5 overflow-y-auto"
          style={{ background: isDark ? '#12141A' : '#F7F8F9' }}
        >
          <div className="flex flex-col gap-3">
            {/* Always-visible welcome */}
            <div className="flex items-start gap-2.5">
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 2,
                  background: t.accentMuted,
                  border: `1px solid ${t.border}`,
                  color: t.accent,
                }}
              >
                <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <div
                className="px-3 py-2.5 text-[13px] leading-relaxed"
                style={{
                  background: t.panelBg,
                  border: `1px solid ${t.border}`,
                  borderRadius: 2,
                  color: t.body,
                  boxShadow: t.panelShadow,
                }}
              >
                {WELCOME_TEXT}
              </div>
            </div>

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div
                    className="max-w-[85%] px-3 py-2.5 text-[13px] leading-relaxed"
                    style={{
                      background: t.ctaBg,
                      color: t.ctaFg,
                      borderRadius: 2,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5">
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 2,
                      background: t.accentMuted,
                      border: `1px solid ${t.border}`,
                      color: t.accent,
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <div
                    className="px-3 py-2.5 text-[13px] leading-relaxed max-w-[85%]"
                    style={{
                      background: t.panelBg,
                      border: `1px solid ${t.border}`,
                      borderRadius: 2,
                      color: t.body,
                      boxShadow: t.panelShadow,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Composer */}
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.divider}`, background: t.panelBg }}
        >
          <form onSubmit={handleSend} className="flex items-stretch gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 min-w-0 text-[13px] px-3 py-2 focus:outline-none"
              style={{
                background: isDark ? '#0A0B0E' : '#F7F8F9',
                border: `1px solid ${t.border}`,
                borderRadius: 2,
                color: t.heading,
              }}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="pw-interactive-custom flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
              aria-label="Send message"
              style={{
                width: 38,
                borderRadius: 2,
                background: canSend ? t.ctaBg : t.hover,
                color: canSend ? t.ctaFg : t.muted,
                border: `1px solid ${t.border}`,
              }}
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="pw-interactive-custom relative flex items-center justify-center transition-colors focus:outline-none"
        style={{
          width: 48,
          height: 48,
          borderRadius: 2,
          background: isOpen ? t.panelBg : t.ctaBg,
          color: isOpen ? t.heading : t.ctaFg,
          border: `1px solid ${t.border}`,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(20,22,28,0.10)',
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-5 h-5" strokeWidth={2.25} />
        ) : (
          <MessageSquare className="w-5 h-5" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
