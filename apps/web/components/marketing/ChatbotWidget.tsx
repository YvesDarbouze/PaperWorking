'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { generateAssistantResponse, type ChatMessage } from '@/lib/assistant/chat-engine';
import { AVA_CONFIG } from '@/lib/assistant/config';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  actionLabel?: string;
  actionUrl?: string;
}

const STARTER_CHIPS = [
  { label: '⚡ Evaluate a deal with Deal Calculator', intent: 'analyze_deal' },
  { label: '📊 Pricing & 14-day free trial', intent: 'pricing' },
  { label: '📑 Switching from spreadsheets mid-deal', intent: 'switch_spreadsheets' },
  { label: '📈 What are the 33 institutional KPIs?', intent: 'kpi' },
  { label: '🔨 How do contractor draws work?', intent: 'rehab' },
  { label: '💼 CPA tax exports & Schedule E', intent: 'cpa' },
];

const STORAGE_KEY = 'pw_chatbot_messages_v1';

/** Fully functional floating support & sales copilot Chatbot widget. */
export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversation from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore parse or storage errors
    }
  }, []);

  // Save conversation to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [messages]);

  // Scroll to bottom when messages update or thinking starts
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isThinking, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleClearChat = () => {
    setMessages([]);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (textToSend: string, intent?: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isThinking) return;

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputVal('');
    setIsThinking(true);

    // Convert display messages to ChatMessage format for engine/API
    const apiMessages: ChatMessage[] = newHistory.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));

    try {
      // Attempt to call the server API endpoint
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          intent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          const assistantMsg: DisplayMessage = {
            id: data.message.id || `asst-${Date.now()}`,
            role: 'assistant',
            content: data.message.content,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionLabel: data.message.actionLabel,
            actionUrl: data.message.actionUrl,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsThinking(false);
          return;
        }
      }
      throw new Error('API route returned invalid payload');
    } catch {
      // High-fidelity client fallback ensures chat is ALWAYS fully functional
      try {
        const fallback = await generateAssistantResponse({
          messages: apiMessages,
          userContext: {
            accountType: 'investor',
            isTrialing: true,
          },
          intent,
        });

        const fallbackMsg: DisplayMessage = {
          id: `asst-fallback-${Date.now()}`,
          role: 'assistant',
          content: fallback.text,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionLabel: fallback.actionLabel,
          actionUrl: fallback.actionUrl,
        };
        startTransition(() => {
          setMessages((prev) => [...prev, fallbackMsg]);
          setIsThinking(false);
        });
      } catch {
        const errorMsg: DisplayMessage = {
          id: `asst-err-${Date.now()}`,
          role: 'assistant',
          content:
            "I'm here to help with your deal analysis, pricing, and SOP questions. How can I assist your investment process?",
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsThinking(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputVal);
  };

  return (
    <div
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 md:bottom-5 md:right-5 z-[100] flex flex-col items-end pointer-events-auto select-none"
      data-testid="chatbot-widget-container"
    >
      {/* Expanded Chatbot Modal / Full-screen Sheet on Mobile */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="PaperWorking Support Chatbot"
          className="fixed inset-0 z-[100] sm:relative sm:inset-auto sm:mb-3 flex flex-col h-full sm:h-[540px] sm:max-h-[85vh] w-full sm:w-[380px] overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-white/15 bg-[#121014] shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#17141b] px-4 py-3 sm:py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3.5">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--color-primary,#7A9EAA)]/20 text-[color:var(--color-primary,#7A9EAA)] border border-[color:var(--color-primary,#7A9EAA)]/30">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#121014]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-tight">
                    {AVA_CONFIG.agentName} Assistant
                  </h3>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-300">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-white/50">Deal Operating System Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  aria-label="Clear chat"
                  className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors touch-press"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[16px]">restart_alt</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat window"
                aria-label="Close chat window"
                className="flex h-10 w-10 sm:h-7 sm:w-7 items-center justify-center rounded-xl sm:rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors touch-press"
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages & Conversation Scroll Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-[#121014] to-[#0d0b0f]"
          >
            {/* Initial Welcome Bubble */}
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-primary,#7A9EAA)]/20 text-[color:var(--color-primary,#7A9EAA)] text-xs font-bold">
                <span className="material-symbols-outlined text-[15px]">smart_toy</span>
              </div>
              <div className="space-y-2 max-w-[85%]">
                <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-[#1a1720] p-3.5 text-xs text-white/90 leading-relaxed shadow-sm">
                  Hi! I&apos;m your PaperWorking assistant. I can help you evaluate deals with the
                  Deal Calculator, track closing deadlines, manage rehab budgets &amp; contractor
                  draws, or explain our 33 institutional KPIs.
                </div>
                <span className="text-[10px] text-white/40 px-1">Just now</span>
              </div>
            </div>

            {/* Quick Starter Chips when no conversation yet */}
            {messages.length === 0 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-white/50 px-1">Suggested inquiries:</p>
                <div className="flex flex-col gap-1.5">
                  {STARTER_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleSendMessage(chip.label, chip.intent)}
                      className="group flex items-center justify-between rounded-xl border border-white/10 bg-[#16141d] px-3 py-2 text-left text-xs text-white/80 transition-all hover:border-[color:var(--color-primary,#7A9EAA)]/60 hover:bg-[#1f1b29] hover:text-white"
                    >
                      <span className="truncate pr-2">{chip.label}</span>
                      <span className="material-symbols-outlined text-[14px] text-white/30 group-hover:text-[color:var(--color-primary,#7A9EAA)] group-hover:translate-x-0.5 transition-all">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Messages */}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[color:var(--color-primary,#7A9EAA)] font-medium text-slate-950 shadow-md'
                      : 'border border-white/10 bg-[#191621] text-white/90 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>

                  {/* Direct Action Link Card */}
                  {m.actionLabel && m.actionUrl && (
                    <div className="mt-2.5 pt-2 border-t border-white/10">
                      {m.actionUrl.startsWith('/') ? (
                        <Link
                          href={m.actionUrl}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[color:var(--color-primary,#7A9EAA)] hover:underline"
                        >
                          <span>{m.actionLabel}</span>
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </Link>
                      ) : (
                        <a
                          href={m.actionUrl}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[color:var(--color-primary,#7A9EAA)] hover:underline"
                        >
                          <span>{m.actionLabel}</span>
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[10px] text-white/40 px-1">{m.createdAt}</span>
              </div>
            ))}

            {/* Thinking / In-Flight Indicator */}
            {isThinking && (
              <div className="flex items-center gap-2 py-1 text-xs text-white/50">
                <span className="flex h-2 w-2 rounded-full bg-[color:var(--color-primary,#7A9EAA)] animate-pulse" />
                <span className="italic">Assistant is generating response...</span>
              </div>
            )}
          </div>

          {/* Footer Input Bar */}
          <div className="border-t border-white/10 bg-[#15121a] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <form onSubmit={handleFormSubmit} className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Type a message or ask a question..."
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-3.5 pr-11 text-xs text-white placeholder:text-white/40 focus:border-[color:var(--color-primary,#7A9EAA)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary,#7A9EAA)] transition-colors min-h-[44px]"
                disabled={isThinking}
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isThinking}
                aria-label="Send message"
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-primary,#7A9EAA)] text-slate-950 transition-all hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none touch-press"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] text-white/40">
              <span>PaperWorking AI Operating System</span>
              <Link href="/support" className="hover:text-white transition-colors">
                Support Hub
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Bubble Button (hidden on mobile when modal is open full-screen) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${isOpen ? 'hidden sm:flex' : 'flex'} group relative h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#141217] text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-200 hover:scale-105 hover:border-[color:var(--color-primary,#7A9EAA)] hover:shadow-[0_10px_35px_rgba(122,158,170,0.25)] active:scale-95 focus:outline-none touch-press`}
        style={{
          borderColor: isOpen ? 'var(--color-primary, #7A9EAA)' : undefined,
        }}
        aria-label={isOpen ? 'Close chat' : 'Open PaperWorking Assistant chat'}
        aria-expanded={isOpen}
      >
        <span
          className="material-symbols-outlined text-[24px] transition-transform duration-200 group-hover:scale-110"
          style={{
            color: isOpen ? 'var(--color-primary, #7A9EAA)' : '#fdfffc',
          }}
        >
          {isOpen ? 'close' : 'chat'}
        </span>

        {/* Pulsing online badge indicator when closed */}
        {!isOpen && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#141217]" />
          </span>
        )}
      </button>
    </div>
  );
}
