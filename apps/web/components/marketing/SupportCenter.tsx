'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { fetchSessionProfile } from '@/lib/auth/session-client';
import type { FaqEntry, GlossaryTerm } from '@/lib/support/types';
import { groupGlossaryByLetter } from '@/lib/support/alphabetical-grouping';
import {
  Robot,
  MagnifyingGlass,
  PaperPlaneRight,
  CaretDown,
  Lock,
  PhoneCall,
  CheckCircle,
} from '@/components/icons/PhosphorIcons';
import { CANONICAL_FAQ_SEED, CANONICAL_GLOSSARY_SEED } from '@/lib/support/seed-data';
import TurnstileWidget from '@/components/ui/TurnstileWidget';

interface PepperMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface SupportCenterProps {
  initialSubscriber?: boolean;
  initialFaqs?: FaqEntry[];
  initialGlossary?: GlossaryTerm[];
}

function formatPhoneNumber(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function SupportCenter({
  initialSubscriber = false,
  initialFaqs = CANONICAL_FAQ_SEED,
  initialGlossary = CANONICAL_GLOSSARY_SEED,
}: SupportCenterProps) {
  // Session & Auth State
  const [authenticated, setAuthenticated] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(initialSubscriber);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // 1. Pepper Search and Chat State
  const [pepperInput, setPepperInput] = useState('');
  const [pepperLoading, setPepperLoading] = useState(false);
  const [pepperError, setPepperError] = useState<string | null>(null);
  const [pepperMessages, setPepperMessages] = useState<PepperMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 2. FAQ State & Search
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>(initialFaqs[0]?.id || 'faq-projects');

  // 3. PaperWorking Glossary State
  const [glossaryFilter, setGlossaryFilter] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // 4. Feature Request / Suggestions State
  const [submissionType, setSubmissionType] = useState<'Feature Request' | 'Suggestions'>('Feature Request');
  const [submissionName, setSubmissionName] = useState('');
  const [submissionSubject, setSubmissionSubject] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submissionErrorMsg, setSubmissionErrorMsg] = useState<string | null>(null);
  const [feedbackHoneypot, setFeedbackHoneypot] = useState('');

  // 5. Request a Call Back State
  const [cbName, setCbName] = useState('');
  const [cbEmail, setCbEmail] = useState('');
  const [cbPhone, setCbPhone] = useState('');
  const [cbPreferredTime, setCbPreferredTime] = useState('');
  const [cbTopic, setCbTopic] = useState('');
  const [cbStatus, setCbStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cbErrorMsg, setCbErrorMsg] = useState<string | null>(null);
  const [cbHoneypot, setCbHoneypot] = useState('');

  // 6. Bot Verification / Cloudflare Turnstile State
  const [turnstileConfigured, setTurnstileConfigured] = useState(true);
  const [feedbackTurnstileToken, setFeedbackTurnstileToken] = useState('');
  const [cbTurnstileToken, setCbTurnstileToken] = useState('');

  // Load Session & Profile
  useEffect(() => {
    let cancelled = false;
    fetchSessionProfile().then((profile) => {
      if (cancelled) return;
      setAuthenticated(Boolean(profile.authenticated));
      const status = (profile.subscriptionStatus || '').toLowerCase();
      const plan = (profile.subscriptionPlan || '').toLowerCase();
      const subscriber =
        Boolean(profile.authenticated) &&
        status === 'active' &&
        plan.length > 0 &&
        !plan.includes('trial') &&
        !plan.includes('free') &&
        !plan.includes('none');

      setIsSubscriber(subscriber || initialSubscriber);
      const prof = profile as Record<string, unknown>;
      if (typeof prof.displayName === 'string' && prof.displayName) {
        setUserName(prof.displayName);
        setSubmissionName(prof.displayName);
        setCbName(prof.displayName);
      }
      if (typeof prof.email === 'string' && prof.email) {
        setUserEmail(prof.email);
        setCbEmail(prof.email);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialSubscriber]);

  // Filtered FAQs based on search
  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    if (!q) return initialFaqs;
    return initialFaqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    );
  }, [faqSearch, initialFaqs]);

  // Filtered & Grouped Glossary terms
  const filteredGlossary = useMemo(() => {
    const q = glossaryFilter.trim().toLowerCase();
    let terms = initialGlossary;

    if (q) {
      terms = terms.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }

    if (selectedLetter) {
      terms = terms.filter((t) => t.term[0]?.toUpperCase() === selectedLetter);
    }

    return terms;
  }, [glossaryFilter, selectedLetter, initialGlossary]);

  const glossaryGroups = useMemo(() => {
    return groupGlossaryByLetter(filteredGlossary);
  }, [filteredGlossary]);

  const allAvailableLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const item of initialGlossary) {
      const l = item.term[0]?.toUpperCase();
      if (l) letters.add(l);
    }
    return Array.from(letters).sort();
  }, [initialGlossary]);

  // Pepper ask question handler with real-time streaming
  async function handleAskPepper(questionText?: string) {
    const textToAsk = (questionText ?? pepperInput).trim();
    if (!textToAsk || pepperLoading) return;

    setPepperError(null);
    setPepperLoading(true);

    const userMsg: PepperMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToAsk,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: PepperMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
    };

    setPepperMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    if (!questionText) {
      setPepperInput('');
    }

    try {
      const res = await fetch('/api/support/pepper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToAsk,
          hp_website: '',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error?.message || (typeof errorData.error === 'string' ? errorData.error : null);
        throw new Error(errMsg || "Pepper couldn't answer that. Please try again.");
      }

      if (!res.body) {
        throw new Error('No stream available.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setPepperMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, text: accumulatedText } : msg,
          ),
        );
      }
    } catch {
      setPepperInput(textToAsk);
      setPepperError("Pepper couldn't answer that. Please try again.");
      // Remove empty assistant message on failure
      setPepperMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setPepperLoading(false);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Feature Request / Suggestions Submit
  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileConfigured) {
      setSubmissionErrorMsg('Bot verification is not configured in this environment (REQUIRES CREDENTIALS). Submissions are disabled.');
      return;
    }

    if (!submissionMessage.trim()) {
      setSubmissionErrorMsg('This field is required.');
      return;
    }

    setSubmissionStatus('loading');
    setSubmissionErrorMsg(null);

    try {
      const res = await fetch('/api/support/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: submissionName || userName || 'Subscriber',
          category: submissionType,
          subject: submissionSubject.trim() || `${submissionType} from User`,
          message: submissionMessage.trim(),
          hp_website: feedbackHoneypot,
          turnstileToken: feedbackTurnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmissionStatus('error');
        const errMsg = data.error?.message || (typeof data.error === 'string' ? data.error : null);
        setSubmissionErrorMsg(errMsg || 'Something went wrong. Please try again.');
        return;
      }

      setSubmissionStatus('success');
      setSubmissionMessage('');
      setSubmissionSubject('');
    } catch {
      setSubmissionStatus('error');
      setSubmissionErrorMsg('Something went wrong. Please try again.');
    }
  }

  // Request a Call Back Submit
  async function handleRequestCallback(e: React.FormEvent) {
    e.preventDefault();

    if (!turnstileConfigured) {
      setCbErrorMsg('Bot verification is not configured in this environment (REQUIRES CREDENTIALS). Submissions are disabled.');
      return;
    }

    if (!cbName.trim()) {
      setCbErrorMsg('This field is required.');
      return;
    }

    if (!cbEmail.trim()) {
      setCbErrorMsg('This field is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cbEmail.trim())) {
      setCbErrorMsg('Enter a valid email address.');
      return;
    }

    if (!cbPhone.trim()) {
      setCbErrorMsg('This field is required.');
      return;
    }

    const digits = cbPhone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setCbErrorMsg('Enter a valid phone number.');
      return;
    }

    setCbStatus('loading');
    setCbErrorMsg(null);

    try {
      const res = await fetch('/api/support/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cbName.trim(),
          email: cbEmail.trim(),
          phone: cbPhone.trim(),
          preferredTime: cbPreferredTime || undefined,
          topic: cbTopic || undefined,
          hp_website: cbHoneypot,
          turnstileToken: cbTurnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCbStatus('error');
        const errMsg = data.error?.message || (typeof data.error === 'string' ? data.error : null);
        setCbErrorMsg(errMsg || 'Something went wrong. Please try again.');
        return;
      }

      setCbStatus('success');
      setCbName('');
      setCbEmail('');
      setCbPhone('');
      setCbPreferredTime('');
      setCbTopic('');
    } catch {
      setCbStatus('error');
      setCbErrorMsg('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-border pt-2 pb-10 sm:pt-2.5 sm:pb-12 md:pt-3 md:pb-14">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 text-center">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
            PAPERWORKING KNOWLEDGE &amp; ASSISTANCE
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Support Center
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Find answers, explore platform definitions, consult Pepper AI, and connect directly with the PaperWorking team.
          </p>

          {/* Jump-Nav Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Pepper', href: '#pepper' },
              { label: 'FAQ', href: '#faq' },
              { label: 'Glossary', href: '#glossary' },
              { label: 'Feature Request / Suggestions', href: '#feature-request' },
              { label: 'Request a call back', href: '#request-a-call-back' },
            ].map((jump) => (
              <a
                key={jump.href}
                href={jump.href}
                className="rounded-none border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground hover:border-foreground hover:text-foreground transition min-h-[44px] sm:min-h-0 inline-flex items-center"
              >
                {jump.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 space-y-20 pt-12 md:pt-16">
        {/* 1. Pepper (Search and Chat) */}
        <section id="pepper" className="scroll-mt-24 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                <Robot className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Pepper
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pepper will answer any question in Search and Chat style.
            </p>
          </div>

          <div className="rounded-none border border-border bg-card p-5 md:p-6 shadow-sm ring-1 ring-foreground/10">
            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAskPepper();
              }}
              className="flex gap-2"
            >
              {/* Anti-abuse honeypot */}
              <input
                type="text"
                name="hp_website"
                value={feedbackHoneypot}
                onChange={(e) => setFeedbackHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={pepperInput}
                  onChange={(e) => setPepperInput(e.target.value)}
                  placeholder="Ask Pepper anything…"
                  className="w-full rounded-none border border-input bg-background py-3 pl-11 pr-4 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none min-h-[44px]"
                />
              </div>
              <button
                type="submit"
                disabled={pepperLoading || !pepperInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-none bg-primary text-primary-foreground px-5 py-3 text-xs font-bold transition hover:opacity-90 disabled:opacity-50 touch-target min-h-[44px]"
              >
                {pepperLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    <span>Ask</span>
                    <PaperPlaneRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {pepperError && (
              <p className="mt-3 rounded-none border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {pepperError}
              </p>
            )}

            {/* Starter Questions (Empty State) */}
            {pepperMessages.length === 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Suggested Questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'How do I set up my workspace?',
                    'What are the 33 metrics?',
                    'How does the free trial work?',
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void handleAskPepper(q)}
                      className="rounded-none border border-border bg-card px-3.5 py-2 text-xs text-foreground/80 transition hover:border-foreground hover:bg-muted hover:text-foreground text-left min-h-[44px] sm:min-h-0"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Thread */}
            {pepperMessages.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-border pt-5 max-h-[420px] overflow-y-auto pr-1">
                {pepperMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                      <span>{msg.role === 'user' ? 'You' : 'Pepper'}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-none px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-primary/10 text-foreground border border-primary/30'
                          : 'bg-muted text-foreground border border-border'
                      }`}
                    >
                      {msg.text || (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-2 w-2 animate-pulse rounded-none bg-primary" />
                          <span>Thinking…</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {pepperLoading && pepperMessages[pepperMessages.length - 1]?.role === 'user' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Pepper is streaming response…</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>
        </section>

        {/* 2. FAQ */}
        <section id="faq" className="scroll-mt-24 space-y-6">
          <div className="border-b border-border pb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                FAQ
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Frequently asked questions about PaperWorking trials, subscriptions, metrics, and workflows.
              </p>
            </div>

            {/* Real-Time FAQ Search */}
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQs…"
                className="w-full rounded-none border border-input bg-background py-2 pl-9 pr-3 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="rounded-none border border-border bg-card p-8 text-center">
              <MagnifyingGlass className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-foreground/80 font-medium">No matching FAQs found for &ldquo;{faqSearch}&rdquo;</p>
              <p className="mt-1 text-xs text-muted-foreground">Try searching another term, or ask Pepper in the chat above.</p>
              <button
                type="button"
                onClick={() => setFaqSearch('')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-none border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted min-h-[44px] sm:min-h-0"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-none border border-border bg-card transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${faq.id}-content`}
                      className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-foreground transition hover:text-foreground/80 touch-target min-h-[44px]"
                    >
                      <span className="pr-4">{faq.question}</span>
                      <CaretDown
                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-foreground' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={`${faq.id}-content`}
                        className="border-t border-border px-5 pb-5 pt-3 text-sm leading-relaxed text-muted-foreground"
                      >
                        <p>{faq.answer}</p>
                        <span className="mt-3 inline-block rounded-none border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                          {faq.category}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. PaperWorking Glossary */}
        <section id="glossary" className="scroll-mt-24 space-y-6">
          <div className="border-b border-border pb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                PaperWorking Glossary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                definitions for functionality in the PaperWorking App.
              </p>
            </div>

            {/* Quick Glossary Search */}
            <div className="relative w-full sm:w-64">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={glossaryFilter}
                onChange={(e) => setGlossaryFilter(e.target.value)}
                placeholder="Filter terms…"
                className="w-full rounded-none border border-input bg-background py-2 pl-9 pr-3 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>

          {/* Alphabetical Jump Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => setSelectedLetter(null)}
              className={`rounded-none px-2.5 py-1 min-h-[44px] sm:min-h-0 text-[11px] font-semibold uppercase tracking-wider transition ${
                selectedLetter === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              All
            </button>
            {allAvailableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                className={`rounded-none px-2 py-1 min-h-[44px] sm:min-h-0 text-[11px] font-bold uppercase transition ${
                  selectedLetter === letter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>

          {glossaryGroups.length === 0 ? (
            <div className="rounded-none border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground font-medium">No glossary terms matched &ldquo;{glossaryFilter}&rdquo;</p>
              <button
                type="button"
                onClick={() => {
                  setGlossaryFilter('');
                  setSelectedLetter(null);
                }}
                className="mt-3 inline-flex items-center gap-1 rounded-none border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted min-h-[44px] sm:min-h-0"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {glossaryGroups.map((group) => (
                <div key={group.letter} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-none border border-border bg-muted text-xs font-bold text-foreground">
                      {group.letter}
                    </span>
                    <div className="h-[1px] flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {group.terms.map((item) => (
                      <div
                        key={item.term}
                        className="rounded-none border border-border bg-card p-5 space-y-2 hover:border-foreground/30 transition shadow-sm ring-1 ring-foreground/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-foreground tracking-wide">
                            {item.term}
                          </h3>
                          <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {item.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Feature Request / Suggestions (Subscriber-Gated) */}
        <section id="feature-request" className="scroll-mt-24 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Feature Request / Suggestions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share recommendations, requested platform integrations, and workflow suggestions directly with engineering.
            </p>
          </div>

          {!isSubscriber ? (
            /* Locked State Card for Unauthenticated / Non-Subscribers */
            <div className="rounded-none border border-border bg-card p-6 sm:p-8 shadow-sm ring-1 ring-foreground/10">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                  <Lock className="h-5 w-5" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">
                    Subscriber Access Required
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    You must be a subscriber to make a &apos;Feature Request&apos; or &apos;Suggestions.&apos;
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Log in with an active subscription to continue.
                  </p>

                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href="/login?next=/support#feature-request"
                      className="inline-flex items-center justify-center rounded-none bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold transition hover:opacity-90 touch-target min-h-[44px]"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center justify-center rounded-none border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted touch-target min-h-[44px]"
                    >
                      View Pricing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Unlocked Form for Active Subscribers */
            <form
              onSubmit={handleSubmitFeedback}
              className="rounded-none border border-border bg-card p-6 space-y-4 shadow-sm ring-1 ring-foreground/10"
            >
              {/* Anti-abuse honeypot */}
              <input
                type="text"
                name="hp_website"
                value={feedbackHoneypot}
                onChange={(e) => setFeedbackHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="feedback-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Name
                  </label>
                  <input
                    id="feedback-name"
                    type="text"
                    value={submissionName}
                    onChange={(e) => setSubmissionName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-none border border-input bg-background p-3 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSubmissionType('Feature Request')}
                      className={`flex-1 rounded-none py-2.5 px-3 text-xs font-semibold transition touch-target min-h-[44px] ${
                        submissionType === 'Feature Request'
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      Feature Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmissionType('Suggestions')}
                      className={`flex-1 rounded-none py-2.5 px-3 text-xs font-semibold transition touch-target min-h-[44px] ${
                        submissionType === 'Suggestions'
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      Suggestions
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="feedback-subject" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Subject
                </label>
                <input
                  id="feedback-subject"
                  type="text"
                  value={submissionSubject}
                  onChange={(e) => setSubmissionSubject(e.target.value)}
                  placeholder={`Brief summary of your ${submissionType.toLowerCase()}…`}
                  className="w-full rounded-none border border-input bg-background p-3 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="feedback-message" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Your message
                </label>
                <textarea
                  id="feedback-message"
                  rows={4}
                  value={submissionMessage}
                  onChange={(e) => setSubmissionMessage(e.target.value)}
                  placeholder={`Detail your ${submissionType.toLowerCase()}…`}
                  className="w-full rounded-none border border-input bg-background p-3.5 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                />
              </div>

              {submissionErrorMsg && (
                <p className="rounded-none border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {submissionErrorMsg}
                </p>
              )}

              {submissionStatus === 'success' && (
                <p className="rounded-none border border-border bg-muted p-3 text-xs text-foreground">
                  {submissionType === 'Feature Request'
                    ? 'Your feature request has been sent.'
                    : 'Your suggestion has been sent.'}
                </p>
              )}

              {/* Bot Verification / Cloudflare Turnstile */}
              <TurnstileWidget
                onVerify={(token) => setFeedbackTurnstileToken(token)}
                onExpire={() => setFeedbackTurnstileToken('')}
                onError={(err) => setSubmissionErrorMsg(err || 'Bot verification challenge failed')}
                onConfigStatus={(cfg) => setTurnstileConfigured(cfg)}
              />

              <button
                type="submit"
                disabled={
                  submissionStatus === 'loading' ||
                  !turnstileConfigured ||
                  (!feedbackTurnstileToken && turnstileConfigured)
                }
                className="inline-flex items-center justify-center gap-2 rounded-none bg-primary text-primary-foreground px-6 py-3 text-xs font-bold transition hover:opacity-90 disabled:opacity-50 touch-target min-h-[44px]"
              >
                {submissionStatus === 'loading' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  'Submit'
                )}
              </button>
            </form>
          )}
        </section>

        {/* 5. Request a call back */}
        <section id="request-a-call-back" className="scroll-mt-24 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Request a call back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Leave your phone number and an investment specialist will call you directly.
            </p>
          </div>

          <form
            onSubmit={handleRequestCallback}
            className="rounded-none border border-border bg-card p-6 space-y-4 shadow-sm ring-1 ring-foreground/10"
          >
            {/* Anti-abuse honeypot */}
            <input
              type="text"
              name="hp_website"
              value={cbHoneypot}
              onChange={(e) => setCbHoneypot(e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cb-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Name
                </label>
                <input
                  id="cb-name"
                  type="text"
                  autoComplete="name"
                  value={cbName}
                  onChange={(e) => setCbName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="cb-email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Email
                </label>
                <input
                  id="cb-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={cbEmail}
                  onChange={(e) => setCbEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="cb-phone" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Phone number
                </label>
                <input
                  id="cb-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={cbPhone}
                  onChange={(e) => setCbPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(555) 000-0000"
                  className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="cb-preferred-time" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Preferred Time (Optional)
                </label>
                <select
                  id="cb-preferred-time"
                  value={cbPreferredTime}
                  onChange={(e) => setCbPreferredTime(e.target.value)}
                  className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-sm text-foreground focus:outline-none focus:border-ring min-h-[44px]"
                >
                  <option value="">Anytime</option>
                  <option value="Morning (9am - 12pm EST)">Morning (9am - 12pm EST)</option>
                  <option value="Afternoon (12pm - 5pm EST)">Afternoon (12pm - 5pm EST)</option>
                  <option value="Evening (5pm - 8pm EST)">Evening (5pm - 8pm EST)</option>
                </select>
              </div>

              <div>
                <label htmlFor="cb-topic" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Topic (Optional)
                </label>
                <select
                  id="cb-topic"
                  value={cbTopic}
                  onChange={(e) => setCbTopic(e.target.value)}
                  className="w-full rounded-none border border-input bg-background px-3.5 py-2.5 text-base md:text-sm text-foreground focus:outline-none focus:border-ring min-h-[44px]"
                >
                  <option value="">General Inquiries</option>
                  <option value="Platform Demo & Onboarding">Platform Demo &amp; Onboarding</option>
                  <option value="Deal Calculator & Underwriting">Deal Calculator &amp; Underwriting</option>
                  <option value="Investment Team & Enterprise Plans">Investment Team &amp; Enterprise Plans</option>
                  <option value="Billing & Subscription Support">Billing &amp; Subscription Support</option>
                </select>
              </div>
            </div>

            {cbErrorMsg && (
              <p className="rounded-none border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {cbErrorMsg}
              </p>
            )}

            {cbStatus === 'success' && (
              <p className="rounded-none border border-border bg-muted p-3 text-xs text-foreground">
                Your call back request has been sent. An investment specialist will call you directly.
              </p>
            )}

            {/* Bot Verification / Cloudflare Turnstile */}
            <TurnstileWidget
              onVerify={(token) => setCbTurnstileToken(token)}
              onExpire={() => setCbTurnstileToken('')}
              onError={(err) => setCbErrorMsg(err || 'Bot verification challenge failed')}
              onConfigStatus={(cfg) => setTurnstileConfigured(cfg)}
            />

            <button
              type="submit"
              disabled={
                cbStatus === 'loading' ||
                !turnstileConfigured ||
                (!cbTurnstileToken && turnstileConfigured)
              }
              className="inline-flex items-center justify-center gap-2 rounded-none bg-primary text-primary-foreground px-6 py-3 text-xs font-bold transition hover:opacity-90 disabled:opacity-50 touch-target min-h-[44px]"
            >
              {cbStatus === 'loading' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                'Request a call back'
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
