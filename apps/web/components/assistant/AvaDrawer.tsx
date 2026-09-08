'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAssistant } from './AssistantProvider';
import { AVA_CONFIG } from '@/lib/assistant/config';
import { HIGH_INTENT_CHIPS, isScrolledToBottom, type PromptChip } from '@/lib/assistant/lifecycle-state-machine';
import { determineEscalationOptions, type EscalationOption } from '@/lib/assistant/escalation';
import { useOptionalAuth } from '@/context/AuthContext';

export default function AvaDrawer() {
  const {
    isDrawerOpen,
    closeDrawer,
    currentPhase,
    messages,
    isStreaming,
    selectIntent,
    sendMessage,
    splitViewProgress,
    bailoutToManual,
    submitFeedback,
    requestCallback,
  } = useAssistant();

  const auth = useOptionalAuth();
  const accountType = auth?.profile?.accountType || 'investor';
  const isSubscriber = auth?.profile?.subscriptionStatus === 'active' || auth?.profile?.subscriptionStatus === 'trialing';

  const [inputVal, setInputVal] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'feedback' | 'escalation'>('chat');
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [unreadCountWhileScrolledUp, setUnreadCountWhileScrolledUp] = useState(0);

  // Feedback form state
  const [feedbackKind, setFeedbackKind] = useState<'idea' | 'bug' | 'feature_request'>('idea');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [feedbackUpsellMsg, setFeedbackUpsellMsg] = useState<string | null>(null);

  // Callback form state
  const [cbName, setCbName] = useState('');
  const [cbPhone, setCbPhone] = useState('');
  const [cbEmail, setCbEmail] = useState('');
  const [cbWindow, setCbWindow] = useState('Tomorrow 9:00 AM - 12:00 PM EST');
  const [cbTopic, setCbTopic] = useState('Deal Calculator / Closing Support');
  const [cbStatus, setCbStatus] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Focus management & Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Handle scroll detection for autoscroll-hijack invariant
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const isAtBottom = isScrolledToBottom(scrollContainerRef.current, 50);
    if (isAtBottom) {
      setUserScrolledUp(false);
      setUnreadCountWhileScrolledUp(0);
    } else {
      setUserScrolledUp(true);
    }
  };

  // Autoscroll logic: Only scroll down if NOT scrolled up
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const hasNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (hasNewMessage) {
      if (userScrolledUp) {
        setUnreadCountWhileScrolledUp((c) => c + 1);
      } else {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages, userScrolledUp]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setUserScrolledUp(false);
      setUnreadCountWhileScrolledUp(0);
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const text = inputVal;
    setInputVal('');
    sendMessage(text);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackStatus('Submitting...');
    setFeedbackUpsellMsg(null);
    try {
      const res = await submitFeedback({
        kind: feedbackKind,
        title: feedbackTitle,
        description: feedbackDesc,
      });

      if (res.upsell) {
        setFeedbackUpsellMsg(res.message || 'Feature requests are reserved for active subscribers.');
        setFeedbackStatus(null);
        return;
      }

      setFeedbackStatus('Feedback sent successfully! A receipt has been emailed to you.');
      setFeedbackTitle('');
      setFeedbackDesc('');
    } catch {
      setFeedbackStatus('Unable to submit feedback. Please try again or email hi@paperworking.co.');
    }
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCbStatus('Registering callback...');
    try {
      const res = await requestCallback({
        name: cbName,
        phone: cbPhone,
        email: cbEmail,
        preferredWindow: cbWindow,
        topic: cbTopic,
      });
      setCbStatus(res.message || 'Callback registered! A confirmation has been emailed.');
      setCbName('');
      setCbPhone('');
    } catch {
      setCbStatus('Failed to register callback. Please call 1-800-555-0199 or email hi@paperworking.co.');
    }
  };

  if (!isDrawerOpen) return null;

  const escalationOptions: EscalationOption[] = determineEscalationOptions({
    accountType,
    userMessage: messages[messages.length - 1]?.content || '',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${AVA_CONFIG.agentName} Onboarding Copilot`}
      data-testid="ava-drawer-container"
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/10 bg-[#0e0c10] shadow-[-16px_0_40px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:w-[460px]"
    >
      {/* Drawer Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#141217]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/30">
            <span className="material-symbols-outlined text-xl">smart_toy</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[color:var(--color-primary)] ring-2 ring-[#0e0c10]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">{AVA_CONFIG.agentName}</h2>
              <span className="rounded bg-[color:var(--color-primary)]/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[color:var(--color-primary)]">
                Copilot
              </span>
            </div>
            <p className="text-[11px] text-white/50">Your deals kept moving while you were gone</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Invariant: Bailout always visible */}
          <button
            type="button"
            onClick={bailoutToManual}
            data-testid="bailout-manual-button"
            title="Skip AI & Explore Manually"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Skip AI
          </button>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close Assistant Panel"
            data-testid="close-drawer-button"
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </header>

      {/* Mode Navigation Tabs */}
      <nav className="flex border-b border-white/10 bg-white/[0.02] px-4">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          data-testid="tab-chat"
          className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'chat'
              ? 'border-[color:var(--color-primary)] text-[color:var(--color-primary)]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Copilot
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          data-testid="tab-feedback"
          className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'feedback'
              ? 'border-[color:var(--color-primary)] text-[color:var(--color-primary)]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Help Shape PW
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('escalation')}
          data-testid="tab-escalation"
          className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'escalation'
              ? 'border-[color:var(--color-primary)] text-[color:var(--color-primary)]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Human Support
        </button>
      </nav>

      {/* Tab 1: Copilot Chat & Intent Capture */}
      {activeTab === 'chat' && (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Scrollable messages container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            data-testid="messages-scroll-container"
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          >
            {/* Phase 3 Split-View Narration Card */}
            {splitViewProgress && (
              <div
                data-testid="split-view-narration-card"
                className="rounded-2xl border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/5 p-4 shadow-lg animate-in fade-in duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
                    Real Workspace Build (Step {splitViewProgress.step}/{splitViewProgress.totalSteps})
                  </span>
                  {splitViewProgress.completed ? (
                    <span className="material-symbols-outlined text-sm text-[color:var(--color-primary)]">
                      check_circle
                    </span>
                  ) : (
                    <span className="h-3 w-3 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
                  )}
                </div>
                <p className="text-xs text-white/90 font-medium">{splitViewProgress.message}</p>
                {splitViewProgress.project && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs space-y-1">
                    <div className="font-bold text-white">{splitViewProgress.project.name}</div>
                    <div className="text-white/60">{splitViewProgress.project.address}</div>
                    <div className="flex gap-3 pt-1 text-[11px] font-mono text-[color:var(--color-primary)]">
                      <span>Cap Rate: {splitViewProgress.project.capRate}</span>
                      <span>IRR: {splitViewProgress.project.irr}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((m) => (
              <div
                key={m.id}
                data-testid={`message-${m.role}`}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[color:var(--color-primary)] font-medium text-black'
                      : 'border border-white/10 bg-[#16141a] text-white/90 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                <span className="mt-1 text-[10px] text-white/40 px-1">
                  {m.role === 'user' ? 'You' : AVA_CONFIG.agentName}
                </span>
              </div>
            ))}

            {/* In-Flight Streaming indicator */}
            {isStreaming && (
              <div
                data-testid="streaming-indicator"
                className="flex items-center gap-2 text-xs text-white/50 italic py-1"
              >
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-primary)] animate-ping" />
                <span>{AVA_CONFIG.agentName} is thinking...</span>
              </div>
            )}

            {/* Phase 2: Intent Prompt Chips (Never open on blank input) */}
            {messages.length === 0 && (
              <div className="space-y-4 pt-2" data-testid="intent-chips-container">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <p className="text-xs font-semibold text-white/80">
                    Select an objective to launch your institutional workspace:
                  </p>
                </div>

                {(['Getting started', 'Acquisition', 'Fund', 'Hold', 'Exit/Portfolio', 'Account'] as const).map(
                  (category) => {
                    const chips = HIGH_INTENT_CHIPS.filter((c) => c.category === category);
                    if (chips.length === 0) return null;
                    return (
                      <div key={category} className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                          {category}
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {chips.map((chip) => (
                            <button
                              key={chip.id}
                              type="button"
                              onClick={() => selectIntent(chip)}
                              data-testid={`prompt-chip-${chip.intentKey}`}
                              className="group flex items-center justify-between rounded-xl border border-white/10 bg-[#151319] p-3 text-left transition-all hover:border-[color:var(--color-primary)]/50 hover:bg-[#1b1921] active:scale-[0.99]"
                            >
                              <div>
                                <div className="text-xs font-semibold text-white group-hover:text-[color:var(--color-primary)] transition-colors">
                                  {chip.label}
                                </div>
                                {chip.description && (
                                  <div className="text-[10px] text-white/40 mt-0.5">{chip.description}</div>
                                )}
                              </div>
                              <span className="material-symbols-outlined text-sm text-white/30 group-hover:text-[color:var(--color-primary)] group-hover:translate-x-0.5 transition-all">
                                arrow_forward
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* Invariant: Never autoscroll-hijack — show jump button if scrolled up */}
          {userScrolledUp && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
              <button
                type="button"
                onClick={scrollToBottom}
                data-testid="jump-to-bottom-button"
                className="flex items-center gap-1.5 rounded-full border border-[color:var(--color-primary)]/40 bg-[#16141a]/95 px-4 py-1.5 text-xs font-bold text-[color:var(--color-primary)] shadow-xl backdrop-blur-md hover:bg-[#1f1c24] transition-all animate-bounce"
              >
                <span>↓ New messages</span>
                {unreadCountWhileScrolledUp > 0 && (
                  <span className="rounded-full bg-[color:var(--color-primary)] px-1.5 py-0.2 text-[10px] text-black font-extrabold">
                    {unreadCountWhileScrolledUp}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          <form onSubmit={handleSendText} className="border-t border-white/10 bg-[#121015] p-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={`Ask ${AVA_CONFIG.agentName} anything or pick a chip...`}
                data-testid="assistant-chat-input"
                className="w-full rounded-xl border border-white/10 bg-[#1a1721] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/40 focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]"
              />
              <button
                type="submit"
                disabled={!inputVal.trim()}
                data-testid="send-message-button"
                aria-label="Send Message"
                className="absolute right-2 rounded-lg p-2 text-[color:var(--color-primary)] hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Community Feedback ("Help shape PaperWorking") */}
      {activeTab === 'feedback' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="feedback-tab-panel">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-bold text-white">Help Shape PaperWorking</h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              We treat your feedback as community participation, not ticket-filing. Every suggestion
              is reviewed weekly by the product engineering team.
            </p>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">What kind of feedback?</label>
              <div className="grid grid-cols-3 gap-2">
                {(['idea', 'bug', 'feature_request'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setFeedbackKind(k);
                      setFeedbackUpsellMsg(null);
                    }}
                    data-testid={`feedback-type-${k}`}
                    className={`rounded-lg border py-2 text-[11px] font-bold capitalize transition-colors ${
                      feedbackKind === k
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {k.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">Title</label>
              <input
                type="text"
                required
                value={feedbackTitle}
                onChange={(e) => setFeedbackTitle(e.target.value)}
                placeholder="Brief summary of your idea or finding..."
                data-testid="feedback-title-input"
                className="w-full rounded-lg border border-white/10 bg-[#16141a] px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-[color:var(--color-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">Details & Investor Impact</label>
              <textarea
                required
                rows={4}
                value={feedbackDesc}
                onChange={(e) => setFeedbackDesc(e.target.value)}
                placeholder="Describe how this improves your deal tracking, underwriting, or reporting..."
                data-testid="feedback-desc-input"
                className="w-full rounded-lg border border-white/10 bg-[#16141a] px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-[color:var(--color-primary)] focus:outline-none"
              />
            </div>

            {feedbackUpsellMsg && (
              <div
                data-testid="feedback-upsell-banner"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300"
              >
                <div className="font-bold mb-1">Subscribers Only Feature</div>
                <div>{feedbackUpsellMsg}</div>
                <Link
                  href="/pricing"
                  className="mt-2 inline-block font-bold text-amber-200 underline hover:text-white"
                >
                  View Subscription Plans →
                </Link>
              </div>
            )}

            {feedbackStatus && (
              <div data-testid="feedback-status-message" className="text-xs text-[color:var(--color-primary)] font-medium">
                {feedbackStatus}
              </div>
            )}

            <button
              type="submit"
              data-testid="submit-feedback-button"
              className="w-full rounded-xl bg-[color:var(--color-primary)] py-2.5 text-xs font-bold text-black shadow hover:opacity-90 transition-opacity"
            >
              Submit Feedback
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Tier-Aware Escalation & Callbacks */}
      {activeTab === 'escalation' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5" data-testid="escalation-tab-panel">
          <div>
            <h3 className="text-sm font-bold text-white">Tier-Aware Support Channels</h3>
            <p className="text-xs text-white/60 mt-0.5">
              Current Tier: <span className="font-bold text-white capitalize">{accountType}</span>
            </p>
          </div>

          {/* Channel Cards */}
          <div className="space-y-2.5">
            {escalationOptions.map((opt) => (
              <div
                key={opt.type}
                data-testid={`escalation-channel-${opt.type}`}
                className={`rounded-xl border p-3.5 ${
                  opt.isUrgent
                    ? 'border-red-500/40 bg-red-500/10'
                    : 'border-white/10 bg-[#16141a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {opt.isUrgent && <span className="material-symbols-outlined text-sm text-red-400">warning</span>}
                    {opt.title}
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      opt.isAvailableNow
                        ? 'bg-[color:var(--color-primary)]/20 text-[color:var(--color-primary)]'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {opt.availabilityDetails || 'Available'}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 mt-1.5 leading-relaxed">{opt.description}</p>
                {opt.actionUrl ? (
                  <a
                    href={opt.actionUrl}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--color-primary)] hover:underline"
                  >
                    {opt.actionLabel} →
                  </a>
                ) : null}
              </div>
            ))}
          </div>

          {/* Callback Request Form */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
              Request a Phone Callback
            </h4>
            <form onSubmit={handleCallbackSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={cbName}
                  onChange={(e) => setCbName(e.target.value)}
                  placeholder="Investor Name"
                  data-testid="callback-name-input"
                  className="w-full rounded-lg border border-white/10 bg-[#16141a] px-3 py-2 text-xs text-white focus:border-[color:var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/60 mb-1">Direct Phone</label>
                <input
                  type="tel"
                  required
                  value={cbPhone}
                  onChange={(e) => setCbPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  data-testid="callback-phone-input"
                  className="w-full rounded-lg border border-white/10 bg-[#16141a] px-3 py-2 text-xs text-white focus:border-[color:var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/60 mb-1">Email for Confirmation</label>
                <input
                  type="email"
                  required
                  value={cbEmail}
                  onChange={(e) => setCbEmail(e.target.value)}
                  placeholder="investor@firm.com"
                  data-testid="callback-email-input"
                  className="w-full rounded-lg border border-white/10 bg-[#16141a] px-3 py-2 text-xs text-white focus:border-[color:var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/60 mb-1">Preferred Time Window</label>
                <select
                  value={cbWindow}
                  onChange={(e) => setCbWindow(e.target.value)}
                  data-testid="callback-window-select"
                  className="w-full rounded-lg border border-white/10 bg-[#16141a] px-3 py-2 text-xs text-white focus:border-[color:var(--color-primary)] focus:outline-none"
                >
                  <option value="Immediate Priority (Closing emergency)">Immediate Priority (&lt; 15 mins)</option>
                  <option value="Today 2:00 PM - 5:00 PM EST">Today 2:00 PM – 5:00 PM EST</option>
                  <option value="Tomorrow 9:00 AM - 12:00 PM EST">Tomorrow 9:00 AM – 12:00 PM EST</option>
                  <option value="Tomorrow 1:00 PM - 4:00 PM EST">Tomorrow 1:00 PM – 4:00 PM EST</option>
                </select>
              </div>

              {cbStatus && (
                <div data-testid="callback-status-message" className="text-xs text-[color:var(--color-primary)] font-medium">
                  {cbStatus}
                </div>
              )}

              <button
                type="submit"
                data-testid="submit-callback-button"
                className="w-full rounded-xl bg-[color:var(--color-primary)] py-2.5 text-xs font-bold text-black shadow hover:opacity-90 transition-opacity"
              >
                Schedule Callback
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
