'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mockProvider, useDemoChatbot } from '@/lib/data';

/**
 * Floating support chat — port of PaperWorking feature/update-all-UI ChatbotWidget.
 * Keeps v1 brand green (#00DD94) instead of brass/gold accents.
 * Icons: Material Symbols (v1 convention), not Lucide.
 * Shown in non-production dev (useDemoChatbot); always hidden on App Hosting prod.
 */

const STORAGE_KEY = 'pw-assistant-demo-chat';

/** Dark marketing / app shell tokens — green primary (not gold #C4A574). */
const t = {
  heading: '#F3F1EC',
  body: 'rgba(243,241,236,0.78)',
  muted: '#9C9890',
  divider: 'rgba(243,241,236,0.08)',
  border: 'rgba(243,241,236,0.09)',
  panelBg: '#171920',
  panelShadow: 'none',
  hover: 'rgba(255,255,255,0.03)',
  accent: '#00DD94',
  accentMuted: 'rgba(0,221,148,0.14)',
  success: '#00DD94',
  ctaBg: '#00DD94',
  ctaFg: '#0A0B0E',
  listBg: '#12141A',
  inputBg: '#0A0B0E',
} as const;

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

function formatChatTime(at: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(at));
  } catch {
    const d = new Date(at);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
      {name}
    </span>
  );
}

export default function ChatbotWidget() {
  if (!useDemoChatbot()) return null;

  return <ChatbotWidgetInner />;
}

function ChatbotWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [welcomeAt, setWelcomeAt] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadMessages());
    setWelcomeAt(Date.now());
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
    setMessages((prev) => [...prev, { id: makeId(), role, text, at: Date.now() }]);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage('');
    append('user', text);
    window.setTimeout(() => {
      append('assistant', mockProvider.chatbotReply(text));
    }, 350);
  };

  const canSend = Boolean(message.trim());

  return (
    <div className="fixed bottom-4 right-4 z-[100] sm:bottom-6 sm:right-6">
      <div
        className={`absolute bottom-14 right-0 mb-3 flex w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden transition-all duration-200 sm:w-[360px] ${
          isOpen
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-[0.98] opacity-0'
        }`}
        aria-hidden={!isOpen}
        style={{
          display: isOpen ? 'flex' : 'none',
          height: 'min(520px, 70vh)',
          maxHeight: '70vh',
          background: t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: 2,
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-3.5 py-2.5"
          style={{ borderBottom: `1px solid ${t.divider}` }}
        >
          <div className="flex min-w-0 items-center gap-2">
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
                className="truncate text-[13px] font-semibold leading-tight"
                style={{ color: t.heading, letterSpacing: '-0.01em' }}
              >
                PaperWorking Assistant
              </h3>
              <p
                className="mt-0.5 text-[10px] font-medium uppercase"
                style={{ color: t.muted, letterSpacing: '0.08em' }}
              >
                Demo · local only
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex shrink-0 items-center justify-center transition-colors"
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
            <Icon name="close" size={14} />
          </button>
        </div>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto p-3.5"
          style={{ background: t.listBg }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 2,
                  background: t.accentMuted,
                  border: `1px solid ${t.border}`,
                  color: t.accent,
                }}
              >
                <Icon name="chat" size={14} />
              </div>
              <div className="min-w-0 max-w-[85%]">
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
                  {mockProvider.chatbotWelcome()}
                </div>
                {welcomeAt ? (
                  <p className="mt-1 text-[10px]" style={{ color: t.muted }}>
                    {formatChatTime(welcomeAt)}
                  </p>
                ) : null}
              </div>
            </div>

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] text-right">
                    <div
                      className="px-3 py-2.5 text-left text-[13px] leading-relaxed"
                      style={{
                        background: t.ctaBg,
                        color: t.ctaFg,
                        borderRadius: 2,
                      }}
                    >
                      {m.text}
                    </div>
                    <p className="mt-1 text-[10px]" style={{ color: t.muted }}>
                      {formatChatTime(m.at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5">
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 2,
                      background: t.accentMuted,
                      border: `1px solid ${t.border}`,
                      color: t.accent,
                    }}
                  >
                    <Icon name="chat" size={14} />
                  </div>
                  <div className="min-w-0 max-w-[85%]">
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
                      {m.text}
                    </div>
                    <p className="mt-1 text-[10px]" style={{ color: t.muted }}>
                      {formatChatTime(m.at)}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div
          className="shrink-0 p-3"
          style={{ borderTop: `1px solid ${t.divider}`, background: t.panelBg }}
        >
          <form onSubmit={handleSend} className="flex items-stretch gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-w-0 flex-1 px-3 py-2 text-[13px] focus:outline-none"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.border}`,
                borderRadius: 2,
                color: t.heading,
              }}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="flex shrink-0 items-center justify-center transition-opacity disabled:opacity-40"
              aria-label="Send message"
              style={{
                width: 38,
                borderRadius: 2,
                background: canSend ? t.ctaBg : t.hover,
                color: canSend ? t.ctaFg : t.muted,
                border: `1px solid ${t.border}`,
              }}
            >
              <Icon name="send" size={16} />
            </button>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center transition-colors focus:outline-none"
        style={{
          width: 48,
          height: 48,
          borderRadius: 2,
          background: isOpen ? t.panelBg : t.ctaBg,
          color: isOpen ? t.heading : t.ctaFg,
          border: `1px solid ${t.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        <Icon name={isOpen ? 'close' : 'chat'} size={20} />
      </button>
    </div>
  );
}
