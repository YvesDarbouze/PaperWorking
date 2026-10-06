'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAssistant } from './AssistantProvider';
import { AVA_CONFIG } from '@/lib/assistant/config';
import { HIGH_INTENT_CHIPS, isScrolledToBottom, type PromptChip } from '@/lib/assistant/lifecycle-state-machine';
import { determineEscalationOptions, type EscalationOption } from '@/lib/assistant/escalation';
import { useOptionalAuth } from '@/context/AuthContext';
import { getClientDiagnostics, type ClientDiagnostics } from '@/lib/telemetry/client-diagnostic-buffer';

export interface PepperDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeTab?: 'chat' | 'feedback' | 'escalation';
  setActiveTab?: (tab: 'chat' | 'feedback' | 'escalation') => void;
}

export type ConversationalFlow = 'idle' | 'bug_report' | 'feature_request' | 'chat' | 'escalation';

export interface MediaAttachment {
  type: 'image' | 'video';
  name: string;
  dataUrl: string;
}

export interface StructuredBugDraft {
  title: string;
  description: string;
  module: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ticketId: string;
  diagnostics: ClientDiagnostics;
  attachment?: MediaAttachment;
}

export interface StructuredFeatureDraft {
  title: string;
  description: string;
  reilPhase: 'Acquisition' | 'Fund' | 'Hold' | 'Exit' | 'Portfolio';
  ticketId: string;
  attachment?: MediaAttachment;
}

export default function PepperDrawer({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab,
}: PepperDrawerProps = {}) {
  const pathname = usePathname() || '/';
  const assistant = useAssistant();
  const isDrawerOpen = controlledIsOpen !== undefined ? controlledIsOpen : assistant.isDrawerOpen;
  const closeDrawer = controlledOnClose || assistant.closeDrawer;
  const {
    currentPhase,
    messages,
    isStreaming,
    selectIntent,
    sendMessage,
    splitViewProgress,
    bailoutToManual,
    submitFeedback,
    requestCallback,
  } = assistant;

  const auth = useOptionalAuth();
  const accountType = auth?.profile?.accountType || 'investor';
  const userEmail = accountType !== 'guest' ? 'investor@firm.com' : 'community@paperworking.co';
  const userName = accountType !== 'guest' ? 'PaperWorking Investor' : 'Community Member';

  const [inputVal, setInputVal] = useState('');
  const [internalActiveTab, setInternalActiveTab] = useState<'chat' | 'feedback' | 'escalation'>('chat');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const setActiveTab = controlledSetActiveTab !== undefined ? controlledSetActiveTab : setInternalActiveTab;
  
  // Conversational Triage Mode & Step State
  const [conversationalFlow, setConversationalFlow] = useState<ConversationalFlow>('idle');
  const [bugStep, setBugStep] = useState<1 | 2 | 3 | 4>(1);
  const [featureStep, setFeatureStep] = useState<1 | 2 | 3 | 4>(1);

  // Bug Flow Inputs
  const [selectedModule, setSelectedModule] = useState<string>('Deal Calculator');
  const [bugCategory, setBugCategory] = useState<string>('Display issue');
  const [bugWhatHappened, setBugWhatHappened] = useState<string>('');
  const [bugWhatExpected, setBugWhatExpected] = useState<string>('');
  const [bugSawErrorMessage, setBugSawErrorMessage] = useState<'yes' | 'no' | null>(null);
  const [bugErrorMessageText, setBugErrorMessageText] = useState<string>('');
  const [bugDraft, setBugDraft] = useState<StructuredBugDraft | null>(null);

  // Feature Flow Inputs
  const [featureGoal, setFeatureGoal] = useState<string>('');
  const [featureImportance, setFeatureImportance] = useState<'Nice-to-have' | 'Important' | 'Critical'>('Important');
  const [featureDraft, setFeatureDraft] = useState<StructuredFeatureDraft | null>(null);

  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    type: string;
    title: string;
    reviewWindow: string;
    trackingUrl: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedbackMsg, setSubmissionFeedbackMsg] = useState<string | null>(null);

  // Multimodal Media Attachment
  const [attachedMedia, setAttachedMedia] = useState<MediaAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(15);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deflection suggestion
  const [deflectionTip, setDeflectionTip] = useState<{ title: string; body: string; link?: string } | null>(null);

  // Legacy feedback form state (kept for exact test compatibility)
  const [feedbackKind, setFeedbackKind] = useState<'idea' | 'bug' | 'feature_request'>('idea');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [feedbackUpsellMsg, setFeedbackUpsellMsg] = useState<string | null>(null);
  const [consentDiagnostics, setConsentDiagnostics] = useState(true);

  // Callback form state
  const [cbName, setCbName] = useState(userName || '');
  const [cbPhone, setCbPhone] = useState('');
  const [cbEmail, setCbEmail] = useState(userEmail || '');
  const [cbWindow, setCbWindow] = useState('Tomorrow 9:00 AM - 12:00 PM EST');
  const [cbTopic, setCbTopic] = useState('Deal Calculator / Closing Support');
  const [cbStatus, setCbStatus] = useState<string | null>(null);

  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [unreadCountWhileScrolledUp, setUnreadCountWhileScrolledUp] = useState(0);
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

  // Autoscroll logic
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

  // Automated Triage: detects module & severity from description
  const triageBugInput = (text: string, currentModule: string) => {
    const lower = text.toLowerCase();
    let mod = currentModule;
    if (lower.includes('calc') || lower.includes('cap rate') || lower.includes('arv') || lower.includes('underwrit')) {
      mod = 'Deal Calculator';
    } else if (lower.includes('vault') || lower.includes('pdf') || lower.includes('doc') || lower.includes('contract')) {
      mod = 'Document Vault';
    } else if (lower.includes('ledger') || lower.includes('expense') || lower.includes('draw') || lower.includes('clock')) {
      mod = 'Holding Ledger';
    } else if (lower.includes('marketplace') || lower.includes('deal') || lower.includes('partner')) {
      mod = 'Marketplace';
    } else if (lower.includes('login') || lower.includes('billing') || lower.includes('account') || lower.includes('card')) {
      mod = 'Billing / Account';
    }

    let sev: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (lower.includes('wire') || lower.includes('closing today') || lower.includes('critical') || lower.includes('blocked')) {
      sev = 'critical';
    } else if (lower.includes('crash') || lower.includes('wrong number') || lower.includes('error') || lower.includes('fail')) {
      sev = 'high';
    } else if (lower.includes('typo') || lower.includes('label') || lower.includes('color') || lower.includes('align')) {
      sev = 'low';
    }

    // Incident / KB Deflection check
    if (lower.includes('cap rate')) {
      setDeflectionTip({
        title: 'How PaperWorking Computes Cap Rate',
        body: 'Cap Rate on Cost is Net Operating Income (NOI) divided by Total Project Cost (Purchase + Rehab). Check your income & expense ledger to ensure all line items are categorized.',
        link: '/support#cap-rate-faq',
      });
    } else if (lower.includes('dashboard') || lower.includes('slow')) {
      setDeflectionTip({
        title: 'System Status: All Systems Operational',
        body: 'PaperWorking core services are running normally. We captured your browser & network logs automatically to inspect any local latency.',
        link: '/support#status',
      });
    } else {
      setDeflectionTip(null);
    }

    const diag = getClientDiagnostics();
    const ticketId = `PW-BUG-${Math.floor(10000 + Math.random() * 90000)}`;

    setBugDraft({
      title: text.length > 60 ? `${text.slice(0, 57)}...` : text,
      description: text,
      module: mod,
      severity: sev,
      ticketId,
      diagnostics: diag,
      attachment: attachedMedia || undefined,
    });
  };

  // Automated Triage for Feature Request
  const triageFeatureInput = (text: string) => {
    const lower = text.toLowerCase();
    let phase: StructuredFeatureDraft['reilPhase'] = 'Acquisition';
    if (lower.includes('fund') || lower.includes('closing') || lower.includes('escrow') || lower.includes('vault')) {
      phase = 'Fund';
    } else if (lower.includes('rehab') || lower.includes('hold') || lower.includes('contractor') || lower.includes('draw')) {
      phase = 'Hold';
    } else if (lower.includes('exit') || lower.includes('sale') || lower.includes('tax') || lower.includes('1031')) {
      phase = 'Exit';
    } else if (lower.includes('portfolio') || lower.includes('kpi') || lower.includes('insight')) {
      phase = 'Portfolio';
    }

    const ticketId = `PW-FEAT-${Math.floor(10000 + Math.random() * 90000)}`;
    setFeatureDraft({
      title: text.length > 60 ? `${text.slice(0, 57)}...` : text,
      description: text,
      reilPhase: phase,
      ticketId,
      attachment: attachedMedia || undefined,
    });
  };

  // Screen recording trigger
  const handleRecordScreen = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      fileInputRef.current?.click();
      return;
    }
    try {
      setIsRecording(true);
      setRecordingSeconds(15);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachedMedia({
            type: 'video',
            name: `screen-recording-${Date.now()}.webm`,
            dataUrl: reader.result as string,
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.start();

      let timeLeft = 15;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setRecordingSeconds(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }
      }, 1000);
    } catch (err) {
      setIsRecording(false);
      fileInputRef.current?.click();
    }
  };

  // Clipboard paste listener for screenshot pasting
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setAttachedMedia({
              type: 'image',
              name: `screenshot-${Date.now()}.png`,
              dataUrl: reader.result as string,
            });
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // File upload input change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedMedia({
        type: isVideo ? 'video' : 'image',
        name: file.name,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // Chat message submission
  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const text = inputVal;
    setInputVal('');

    if (conversationalFlow === 'bug_report') {
      triageBugInput(text, selectedModule);
      return;
    }

    if (conversationalFlow === 'feature_request') {
      triageFeatureInput(text);
      return;
    }

    // Default conversational chat
    sendMessage(text);
  };

  // Final confirmation of structured bug report
  const handleConfirmBugSubmit = async () => {
    if (!bugDraft) return;
    setIsSubmitting(true);
    setSubmissionFeedbackMsg(null);
    try {
      const res = await submitFeedback({
        kind: 'bug',
        ticketId: bugDraft.ticketId,
        title: bugDraft.title,
        description: bugDraft.description,
        module: bugDraft.module,
        severity: bugDraft.severity,
        route: pathname,
        diagnostics: bugDraft.diagnostics as unknown as Record<string, unknown>,
        hasAttachment: !!attachedMedia,
        attachmentName: attachedMedia?.name,
        errorContext: `UserAgent: ${bugDraft.diagnostics.userAgent} | Logs: ${bugDraft.diagnostics.recentErrors.length} errors captured`,
      });

      setSubmittedTicket({
        id: res.ticketId || bugDraft.ticketId,
        type: 'Bug Report',
        title: bugDraft.title,
        reviewWindow: 'Our team usually reviews bugs within 24 hours.',
        trackingUrl: '/support#status',
      });
      setBugDraft(null);
      setAttachedMedia(null);
      setSubmissionFeedbackMsg(res.message || 'Bug report submitted and emailed to our product engineering team.');
    } catch {
      setSubmissionFeedbackMsg('Failed to submit bug report. Please try again or reach out to support directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final confirmation of structured feature request
  const handleConfirmFeatureSubmit = async () => {
    if (!featureDraft) return;
    setIsSubmitting(true);
    setSubmissionFeedbackMsg(null);
    try {
      const res = await submitFeedback({
        kind: 'feature_request',
        ticketId: featureDraft.ticketId,
        title: featureDraft.title,
        description: featureDraft.description,
        reilPhase: featureDraft.reilPhase,
        route: pathname,
        hasAttachment: !!attachedMedia,
        attachmentName: attachedMedia?.name,
      });

      if (res.upsell) {
        setSubmissionFeedbackMsg(res.message || 'Feature requests are prioritized for active subscribers.');
        return;
      }

      setSubmittedTicket({
        id: res.ticketId || featureDraft.ticketId,
        type: 'Feature Request',
        title: featureDraft.title,
        reviewWindow: 'We review feature requests at the end of every month with our product council.',
        trackingUrl: '/support#roadmap',
      });
      setFeatureDraft(null);
      setAttachedMedia(null);
      setSubmissionFeedbackMsg(res.message || 'Feature request submitted! If we develop this feature, dinner is on us! 🍽️');
    } catch {
      setSubmissionFeedbackMsg('Unable to submit feature request. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Legacy feedback form submit handler (preserved for compatibility)
  const handleLegacyFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackStatus('Submitting...');
    setFeedbackUpsellMsg(null);
    try {
      const shouldAttach = feedbackKind === 'bug' && consentDiagnostics;
      const diag = getClientDiagnostics();
      const res = await submitFeedback({
        kind: feedbackKind,
        title: feedbackTitle,
        description: feedbackDesc,
        route: shouldAttach ? pathname : undefined,
        diagnostics: shouldAttach ? (diag as unknown as Record<string, unknown>) : undefined,
        errorContext: shouldAttach
          ? `UserAgent: ${diag.userAgent}; Screen: ${diag.viewport.width}x${diag.viewport.height}`
          : undefined,
      });

      if (res.upsell) {
        setFeedbackUpsellMsg(res.message || 'Feature requests are reserved for active subscribers.');
        setFeedbackStatus(null);
        return;
      }

      setFeedbackStatus(res.message || 'Feedback sent successfully! A confirmation has been emailed to you.');
      setFeedbackTitle('');
      setFeedbackDesc('');
    } catch {
      setFeedbackStatus('Unable to submit feedback. Please try again or use the support form at /support.');
    }
  };

  // Callback form submit handler
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
      setCbPhone('');
    } catch {
      setCbStatus('Failed to register callback. Please call 1-800-555-0199 or request support at /support.');
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
      aria-label="PaperWorking Support and Assistant"
      data-testid="ava-drawer-container"
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/10 bg-[#0e0c10] shadow-[-16px_0_40px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:w-[460px] animate-in slide-in-from-right duration-200"
    >
      {/* Hidden file input for attachment picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Drawer Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#141217]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/30">
            <span className="material-symbols-outlined text-xl">support_agent</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[color:var(--color-primary)] ring-2 ring-[#0e0c10]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">PaperWorking Triage</h2>
              <span className="rounded bg-[color:var(--color-primary)]/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[color:var(--color-primary)]">
                Live
              </span>
            </div>
            <p className="text-[11px] text-white/50">Customer service & investor support</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Human Switch */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('escalation');
              setConversationalFlow('escalation');
            }}
            title="Request human support or phone callback"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Human Desk
          </button>
          {/* Bailout to manual */}
          <button
            type="button"
            onClick={bailoutToManual}
            data-testid="bailout-manual-button"
            title="Skip AI & Explore Manually"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Skip AI
          </button>
          {/* Close X button */}
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close Assistant Panel"
            data-testid="close-drawer-button"
            className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white transition-colors touch-press min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </header>

      {/* Statutory Assistant Notice Banner */}
      <div
        data-testid="assistant-cage-disclaimer-banner"
        className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-2 text-[11px] text-amber-200"
      >
        <span className="material-symbols-outlined text-[14px] text-amber-300 shrink-0">info</span>
        <span>automated assistant — answers may be inaccurate — not advice</span>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="flex border-b border-white/10 bg-white/[0.02] px-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('chat');
            setConversationalFlow('idle');
          }}
          data-testid="tab-chat"
          className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'chat'
              ? 'border-[color:var(--color-primary)] text-[color:var(--color-primary)]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Conversational Triage
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('feedback');
            setConversationalFlow('idle');
          }}
          data-testid="tab-feedback"
          className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'feedback'
              ? 'border-[color:var(--color-primary)] text-[color:var(--color-primary)]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Submit Form
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('escalation');
            setConversationalFlow('escalation');
          }}
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

      {/* TAB 1: Conversational Triage & Assistant */}
      {activeTab === 'chat' && (
        <div className="relative flex flex-1 flex-col overflow-hidden" onPaste={handlePaste}>
          {/* Scrollable messages and card triage container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            data-testid="messages-scroll-container"
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          >
            {/* Welcoming Mission Banner - Clean, Crisp, No-Slop */}
            <div className="rounded-2xl border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/[0.03] p-4 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
                  Submit Request
                </span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="text-white/60">PaperWorking Service Desk</span>
              </div>
              <p className="text-white/80 font-medium">
                Report a bug or even make a feature request. Our goal is to have the very best customer service.
                PaperWorking is not just Prop-Tech, it is a group of people who have sought to service the Real
                Estate Investment community and give them powerful tools. Report any bug you find or missing feature.
                PaperWorking was designed to reduce risk. If we develop your feature request, we will buy you dinner.
              </p>
            </div>

            {/* The Closure & Expectations (The Last Message) */}
            {submittedTicket && (
              <div className="rounded-2xl border border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 p-4 space-y-3 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-primary)]">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {submittedTicket.type} Confirmed
                  </span>
                  <span className="font-mono text-[11px] font-bold text-white bg-black/60 px-2.5 py-1 rounded-md border border-white/10">
                    {submittedTicket.id}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-white/90">
                  <p className="font-medium text-white">{submittedTicket.title}</p>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Your request didn&apos;t vanish into a black hole—it is routed directly into engineering review.
                  </p>
                </div>

                {/* Timeframe Expectations */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-[11px] flex items-center gap-2 text-white/80">
                  <span className="material-symbols-outlined text-sm text-[color:var(--color-primary)] shrink-0">
                    schedule
                  </span>
                  <span>{submittedTicket.reviewWindow}</span>
                </div>

                {/* Tracking Link */}
                <div className="pt-1 flex items-center justify-between">
                  <Link
                    href={submittedTicket.trackingUrl}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--color-primary)] hover:underline"
                  >
                    <span>Track Status & Public Roadmap</span>
                    <span className="material-symbols-outlined text-xs">north_east</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedTicket(null);
                      setConversationalFlow('idle');
                      setBugStep(1);
                      setFeatureStep(1);
                    }}
                    className="text-xs text-white/50 hover:text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* The Core Routing (The First Message) - Binary Choice Quick Replies */}
            {conversationalFlow === 'idle' && !submittedTicket && (
              <div className="space-y-3 pt-1" data-testid="intent-chips-container">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/90">
                  <p className="font-semibold text-white">How can we help your investment workflow today?</p>
                  <p className="text-[11px] text-white/50 mt-0.5">Select an option below to get started immediately.</p>
                </div>

                {/* Primary Binary Quick-Reply Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConversationalFlow('bug_report');
                      setBugStep(1);
                      setDeflectionTip(null);
                    }}
                    className="flex flex-col items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-left transition-all hover:border-rose-500 hover:bg-rose-500/20 active:scale-[0.98] group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/25 text-rose-300 text-lg">
                      🐛
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-rose-200">
                        Bug Report 🐛
                      </div>
                      <span className="sr-only">Report a Bug</span>
                      <div className="text-[11px] text-rose-300/80 mt-0.5">Something went wrong</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConversationalFlow('feature_request');
                      setFeatureStep(1);
                      setDeflectionTip(null);
                    }}
                    className="flex flex-col items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-left transition-all hover:border-amber-500 hover:bg-amber-500/20 active:scale-[0.98] group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/25 text-amber-300 text-lg">
                      💡
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-amber-200">
                        Feature Request 💡
                      </div>
                      <span className="sr-only">Feature Request</span>
                      <div className="text-[11px] text-amber-300/80 mt-0.5">Dinner on us! 🍽️</div>
                    </div>
                  </button>
                </div>

                {/* Secondary Discreet Options */}
                <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setConversationalFlow('chat')}
                    className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                    <span>Ask a Question</span>
                  </button>
                  <span className="text-white/20">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('escalation');
                      setConversationalFlow('escalation');
                    }}
                    className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-sm">phone_in_talk</span>
                    <span>Talk to Support</span>
                  </button>
                </div>
              </div>
            )}

            {/* FLOW 1: BUG REPORT FLOW 🐛 (4-Step Structured Flow) */}
            {conversationalFlow === 'bug_report' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Flow Header with Progress */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🐛</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      Bug Report (Step {bugStep} of 4)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (bugStep > 1) {
                        setBugStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
                      } else {
                        setConversationalFlow('idle');
                        setBugDraft(null);
                        setDeflectionTip(null);
                      }
                    }}
                    className="text-[11px] text-white/40 hover:text-white"
                  >
                    {bugStep > 1 ? '← Back Step' : '← Cancel'}
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        bugStep >= step ? 'bg-rose-500' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                {/* STEP 1: Capture Goal ("What went wrong?") with category buttons */}
                {bugStep === 1 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="rounded-xl border border-white/10 bg-[#16141a] p-3.5 text-xs text-white/90">
                      <p className="font-semibold text-white text-sm mb-1">What went wrong?</p>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        Choose the category that best matches where you encountered the issue.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Login', icon: 'login', mod: 'Billing / Account' },
                        { label: 'Payment', icon: 'credit_card', mod: 'Billing / Account' },
                        { label: 'Display issue', icon: 'desktop_windows', mod: 'Deal Calculator' },
                        { label: 'Deal Calculator', icon: 'calculate', mod: 'Deal Calculator' },
                        { label: 'Document Vault', icon: 'folder', mod: 'Document Vault' },
                        { label: 'Other', icon: 'help_center', mod: 'General' },
                      ].map((cat) => (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => {
                            setBugCategory(cat.label);
                            setSelectedModule(cat.mod);
                            setBugStep(2);
                          }}
                          className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                            bugCategory === cat.label
                              ? 'border-rose-500 bg-rose-500/20 text-white font-bold'
                              : 'border-white/10 bg-[#16141a] text-white/80 hover:border-white/20 hover:bg-[#1f1c24]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-rose-400 text-lg">{cat.icon}</span>
                          <span className="text-xs">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2: Progressive Disclosure Description */}
                {bugStep === 2 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="rounded-xl border border-white/10 bg-[#16141a] p-3.5 text-xs text-white/90">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white text-sm">Could you describe what happened?</span>
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          {bugCategory}
                        </span>
                      </div>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        Keep it brief—our team will review the context and logs attached.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-white/70 mb-1">
                          What went wrong?
                        </label>
                        <textarea
                          rows={3}
                          value={bugWhatHappened}
                          onChange={(e) => setBugWhatHappened(e.target.value)}
                          placeholder="Example: The checkout button turns gray and stays unclickable..."
                          className="w-full min-h-[72px] max-h-[180px] rounded-xl border border-white/10 bg-[#16141a] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-rose-500 focus:outline-none resize-y"
                        />
                      </div>

                      {/* Progressive Disclosure Question: Did you see an error message? */}
                      {bugWhatHappened.trim().length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2 animate-in fade-in duration-200">
                          <span className="block text-[11px] font-semibold text-white">
                            Did you see any error message?
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setBugSawErrorMessage('yes')}
                              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
                                bugSawErrorMessage === 'yes'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBugSawErrorMessage('no');
                                setBugErrorMessageText('');
                              }}
                              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
                                bugSawErrorMessage === 'no'
                                  ? 'bg-white/20 text-white font-bold'
                                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              No
                            </button>
                          </div>

                          {bugSawErrorMessage === 'yes' && (
                            <div className="pt-1 animate-in fade-in">
                              <label className="block text-[10px] text-white/60 mb-1">
                                What did the message say? (Optional)
                              </label>
                              <input
                                type="text"
                                value={bugErrorMessageText}
                                onChange={(e) => setBugErrorMessageText(e.target.value)}
                                placeholder="e.g. 500 Internal Server Error or Failed to fetch"
                                className="w-full rounded-lg border border-white/10 bg-[#16141a] px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-rose-500 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={!bugWhatHappened.trim()}
                        onClick={() => {
                          const combined = `Category: ${bugCategory}\nWhat happened: ${bugWhatHappened}\nError message: ${
                            bugSawErrorMessage === 'yes' ? bugErrorMessageText || 'Yes (unspecified)' : 'None'
                          }`;
                          triageBugInput(combined, selectedModule);
                          setBugStep(3);
                        }}
                        className="w-full rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-600 transition-colors disabled:opacity-40"
                      >
                        Continue to Auto-Detected Context →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Technical Context (Auto-detected behind the scenes) */}
                {bugStep === 3 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="rounded-xl border border-white/10 bg-[#16141a] p-3.5 text-xs text-white/90">
                      <div className="flex items-center gap-1.5 font-semibold text-white text-sm mb-1">
                        <span className="material-symbols-outlined text-emerald-400 text-base">auto_fix_high</span>
                        <span>Auto-Detected Behind the Scenes</span>
                      </div>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        The best UX is what you don&apos;t have to type. We attached your account tier, screen route, device, and recent console logs automatically.
                      </p>
                    </div>

                    {(() => {
                      const diag = bugDraft?.diagnostics || getClientDiagnostics();
                      return (
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-white/50 text-[11px]">Account & Tier</span>
                            <span className="font-mono text-white text-[11px] capitalize">
                              {userName} ({accountType})
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-white/50 text-[11px]">Current Screen / URL</span>
                            <span className="font-mono text-[color:var(--color-primary)] text-[11px] truncate max-w-[200px]">
                              {pathname}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-white/50 text-[11px]">Browser & OS</span>
                            <span className="font-mono text-white text-[11px] truncate max-w-[200px]">
                              {diag.platform} • {diag.appVersion}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-white/50 text-[11px]">Viewport Size</span>
                            <span className="font-mono text-white text-[11px]">
                              {diag.viewport.width} × {diag.viewport.height}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-white/50 text-[11px]">Recent Console Logs</span>
                            <span className="font-mono text-emerald-400 text-[11px] flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              {diag.recentErrors?.length || 0} error logs captured
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Severity Selection */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                        Urgency Level:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              if (bugDraft) setBugDraft({ ...bugDraft, severity: s });
                            }}
                            className={`rounded-lg py-1.5 text-[10px] font-bold uppercase transition-colors ${
                              (bugDraft?.severity || 'medium') === s
                                ? s === 'critical'
                                  ? 'bg-rose-600 text-white'
                                  : s === 'high'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-[color:var(--color-primary)] text-black'
                                : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBugStep(4)}
                      className="w-full rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-600 transition-colors"
                    >
                      Continue to Evidence & Submission →
                    </button>
                  </div>
                )}

                {/* STEP 4: Evidence (Crucial: Drag & drop, screenshot upload, or 15s recording) */}
                {bugStep === 4 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="rounded-xl border border-white/10 bg-[#16141a] p-3.5 text-xs text-white/90">
                      <p className="font-semibold text-white text-sm mb-1">Attach Evidence</p>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        Screenshots or a 15-second screen recording help us fix bugs 3x faster.
                      </p>
                    </div>

                    {/* Drag-and-drop / upload target */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                        attachedMedia
                          ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10'
                          : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]'
                      }`}
                    >
                      {attachedMedia ? (
                        <div className="space-y-1">
                          <span className="material-symbols-outlined text-2xl text-[color:var(--color-primary)]">
                            {attachedMedia.type === 'video' ? 'videocam' : 'image'}
                          </span>
                          <div className="text-xs font-bold text-white truncate max-w-[260px] mx-auto">
                            {attachedMedia.name}
                          </div>
                          <div className="text-[10px] text-white/50">Click or paste another to replace</div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="material-symbols-outlined text-2xl text-white/40">
                            cloud_upload
                          </span>
                          <div className="text-xs font-semibold text-white">
                            Click to upload or drag & drop screenshot
                          </div>
                          <div className="text-[10px] text-white/40">
                            PNG, JPG, or WebM (or paste directly with Cmd+V)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Screen Recording Option */}
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#16141a] p-3">
                      <div className="text-xs">
                        <div className="font-semibold text-white">Record Screen (15s)</div>
                        <div className="text-[10px] text-white/50">Capture bug reproduction live</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRecordScreen}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 ${
                          isRecording
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isRecording ? 'stop_circle' : 'videocam'}
                        </span>
                        <span>{isRecording ? `${recordingSeconds}s` : 'Record'}</span>
                      </button>
                    </div>

                    {/* Final Submission Button */}
                    <button
                      type="button"
                      onClick={handleConfirmBugSubmit}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-xs font-bold text-white shadow-lg hover:bg-rose-600 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Submitting Ticket...</span>
                      ) : (
                        <>
                          <span>Submit Bug Report Ticket</span>
                          <span className="material-symbols-outlined text-sm">send</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FLOW 2: FEATURE REQUEST FLOW 💡 (4-Step Low Friction Flow) */}
            {conversationalFlow === 'feature_request' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Flow Header with Progress */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Feature Request (Step {featureStep} of 4)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (featureStep > 1) {
                        setFeatureStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
                      } else {
                        setConversationalFlow('idle');
                        setFeatureDraft(null);
                      }
                    }}
                    className="text-[11px] text-white/40 hover:text-white"
                  >
                    {featureStep > 1 ? '← Back Step' : '← Cancel'}
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        featureStep >= step ? 'bg-amber-400' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                {/* STEP 1: Capture Goal ("What would you like to see added or improved?") */}
                {featureStep === 1 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-white/90 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
                        <span>🍽️ The PaperWorking Dinner Guarantee</span>
                      </div>
                      <p className="text-white/80 leading-relaxed text-[11px]">
                        What would you like to see added or improved? If we develop your feature request, we will buy you dinner!
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-white/70 mb-1">
                        Feature Summary / Title
                      </label>
                      <input
                        type="text"
                        value={featureGoal}
                        onChange={(e) => setFeatureGoal(e.target.value)}
                        placeholder="e.g. HUD-1 settlement statement auto-import, automated IRR watermarks..."
                        className="w-full rounded-xl border border-white/10 bg-[#16141a] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* Quick REIL Phase Selector */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                        REIL Lifecycle Phase:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Acquisition', 'Fund', 'Hold', 'Exit', 'Portfolio'] as const).map((phase) => (
                          <button
                            key={phase}
                            type="button"
                            onClick={() => {
                              if (featureDraft) {
                                setFeatureDraft({ ...featureDraft, reilPhase: phase });
                              }
                            }}
                            className={`rounded-lg py-1.5 text-[10px] font-bold transition-colors ${
                              (featureDraft?.reilPhase || 'Acquisition') === phase
                                ? 'bg-amber-400 text-black font-extrabold'
                                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                            }`}
                          >
                            {phase}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!featureGoal.trim()}
                      onClick={() => {
                        triageFeatureInput(featureGoal);
                        setFeatureStep(2);
                      }}
                      className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-black shadow hover:bg-amber-300 transition-colors disabled:opacity-40"
                    >
                      Continue to Description →
                    </button>
                  </div>
                )}

                {/* STEP 2: Description (Open text field for idea & problem it solves) */}
                {featureStep === 2 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="rounded-xl border border-white/10 bg-[#16141a] p-3.5 text-xs text-white/90">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white text-sm">Idea & Problem Solved</span>
                        <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {featureDraft?.reilPhase || 'Acquisition'}
                        </span>
                      </div>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        Describe how this tool or improvement would solve a specific problem in your deals.
                      </p>
                    </div>

                    <div>
                      <textarea
                        rows={4}
                        value={featureDraft?.description || ''}
                        onChange={(e) => {
                          const desc = e.target.value;
                          if (featureDraft) {
                            setFeatureDraft({ ...featureDraft, description: desc });
                          } else {
                            triageFeatureInput(desc);
                          }
                        }}
                        placeholder="Example: I wish I could export this data as a CSV and auto-populate lender settlement statements..."
                        className="w-full min-h-[96px] max-h-[220px] rounded-xl border border-white/10 bg-[#16141a] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none resize-y"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!featureDraft?.description?.trim()}
                      onClick={() => setFeatureStep(3)}
                      className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-black shadow hover:bg-amber-300 transition-colors disabled:opacity-40"
                    >
                      Continue to Workflow Priority →
                    </button>
                  </div>
                )}

                {/* STEP 3: Technical Context (How important is this feature to your workflow?) */}
                {featureStep === 3 && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="rounded-xl border border-white/10 bg-[#16141a] p-3.5 text-xs text-white/90">
                      <p className="font-semibold text-white text-sm mb-1">
                        How important is this feature to your workflow?
                      </p>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        This guides our roadmap prioritization and engineering schedule.
                      </p>
                    </div>

                    {/* Scale Buttons: Nice-to-have / Important / Critical */}
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { key: 'Nice-to-have', desc: 'Convenient polish' },
                          { key: 'Important', desc: 'Regular time saver' },
                          { key: 'Critical', desc: 'Deal / Workflow blocker' },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setFeatureImportance(item.key)}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                            featureImportance === item.key
                              ? 'border-amber-400 bg-amber-400/20 text-white font-bold ring-1 ring-amber-400/50'
                              : 'border-white/10 bg-[#16141a] text-white/70 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold">{item.key}</span>
                          <span className="text-[10px] text-white/40">{item.desc}</span>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200 leading-relaxed">
                      ★ All feature proposals are logged directly into our sprint review queue with your account priority.
                    </div>

                    <button
                      type="button"
                      onClick={() => setFeatureStep(4)}
                      className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-black shadow hover:bg-amber-300 transition-colors"
                    >
                      Continue to Optional Sketch / Examples →
                    </button>
                  </div>
                )}

                {/* STEP 4: Evidence (Optional image upload for sketches or examples) */}
                {featureStep === 4 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="rounded-xl border border-white/10 bg-[#16141a] p-3.5 text-xs text-white/90">
                      <p className="font-semibold text-white text-sm mb-1">Sketches or Examples (Optional)</p>
                      <p className="text-white/60 leading-relaxed text-[11px]">
                        Have a mockup, wireframe, or screenshot from another tool? Attach it here to show us your vision.
                      </p>
                    </div>

                    {/* Upload Target */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                        attachedMedia
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]'
                      }`}
                    >
                      {attachedMedia ? (
                        <div className="space-y-1">
                          <span className="material-symbols-outlined text-2xl text-amber-400">
                            image
                          </span>
                          <div className="text-xs font-bold text-white truncate max-w-[260px] mx-auto">
                            {attachedMedia.name}
                          </div>
                          <div className="text-[10px] text-white/50">Click to change attachment</div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="material-symbols-outlined text-2xl text-white/40">
                            add_photo_alternate
                          </span>
                          <div className="text-xs font-semibold text-white">
                            Upload sketch, mockup, or spreadsheet example
                          </div>
                          <div className="text-[10px] text-white/40">PNG, JPG, or PDF snapshot (optional)</div>
                        </div>
                      )}
                    </div>

                    {/* Final Submission Button */}
                    <button
                      type="button"
                      onClick={handleConfirmFeatureSubmit}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-bold text-black shadow-lg hover:bg-amber-300 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Submitting Feature Request...</span>
                      ) : (
                        <>
                          <span>Submit Proposal & Claim Dinner Pledge 🍽️</span>
                          <span className="material-symbols-outlined text-sm">restaurant</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Split View Progress (Phase 3) */}
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
                      <span>Cap Rate on Cost: {splitViewProgress.project.capRate}</span>
                      <span>IRR: {splitViewProgress.project.irr}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Chat Messages */}
            {conversationalFlow === 'chat' && messages.map((m) => (
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

            {/* Submission feedback message */}
            {submissionFeedbackMsg && (
              <div className="text-xs text-[color:var(--color-primary)] font-medium p-2 bg-[color:var(--color-primary)]/10 rounded-lg">
                {submissionFeedbackMsg}
              </div>
            )}
          </div>

          {/* Jump to bottom button */}
          {userScrolledUp && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
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

          {/* Multimodal Media Attachment Preview Toolbar */}
          {attachedMedia && (
            <div className="border-t border-white/10 bg-[#141217] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/90">
                <span className="material-symbols-outlined text-base text-[color:var(--color-primary)]">
                  {attachedMedia.type === 'video' ? 'videocam' : 'image'}
                </span>
                <span className="font-mono text-[11px] truncate max-w-[200px]">{attachedMedia.name}</span>
                <span className="text-[10px] text-white/40">({attachedMedia.type})</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedMedia(null)}
                className="text-white/40 hover:text-white transition-colors"
                title="Remove attachment"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* Screen Recording In-Progress Banner */}
          {isRecording && (
            <div className="border-t border-rose-500/40 bg-rose-500/15 px-4 py-2 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 text-xs text-rose-200 font-semibold">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Recording screen... ({recordingSeconds}s remaining)</span>
              </div>
              <span className="text-[10px] text-rose-300">Click &apos;Stop sharing&apos; or wait</span>
            </div>
          )}

          {/* Clean Input Toolbar with Multimodal Controls */}
          <form
            onSubmit={handleSendText}
            className="border-t border-white/10 bg-[#121015] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="relative flex items-center gap-1.5">
              {/* Attachment Picker Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach screenshot or video"
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
              </button>

              {/* Record Screen Button */}
              <button
                type="button"
                onClick={handleRecordScreen}
                title="One-click 15-second screen recording"
                className={`rounded-xl border p-2.5 transition-colors flex items-center justify-center shrink-0 ${
                  isRecording
                    ? 'border-rose-500 bg-rose-500/20 text-rose-400 animate-pulse'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">screen_record</span>
              </button>

              {/* Smart Expandable Text Input */}
              <textarea
                rows={1}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputVal.trim()) {
                      handleSendText(e);
                    }
                  }
                }}
                placeholder={
                  conversationalFlow === 'bug_report'
                    ? 'Example: The checkout button turns gray and stays unclickable...'
                    : conversationalFlow === 'feature_request'
                    ? 'Example: I wish I could export this data as a CSV...'
                    : 'Ask anything or describe your request (Shift+Enter for new line)...'
                }
                data-testid="assistant-chat-input"
                className="w-full min-h-[40px] max-h-[140px] rounded-xl border border-white/10 bg-[#1a1721] px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)] resize-y leading-normal"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputVal.trim()}
                data-testid="send-message-button"
                aria-label="Send Message"
                className="rounded-xl bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/30 p-2.5 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/25 disabled:opacity-30 transition-all shrink-0 flex items-center justify-center self-end mb-0.5"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Standard Community Feedback Form */}
      {activeTab === 'feedback' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="feedback-tab-panel">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-bold text-white">Help Shape PaperWorking</h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              We treat your feedback as community participation, not ticket-filing. Every suggestion
              is reviewed weekly by the product engineering team. If we develop your feature request, dinner is on us!
            </p>
          </div>

          <form onSubmit={handleLegacyFeedbackSubmit} className="space-y-4">
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

            {feedbackKind === 'bug' && (
              <div className="rounded-lg border border-white/10 bg-[#16141a] p-3 text-xs" data-testid="consent-diagnostics-container">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentDiagnostics}
                    onChange={(e) => setConsentDiagnostics(e.target.checked)}
                    data-testid="consent-diagnostics-checkbox"
                    className="mt-0.5 rounded border-white/20 bg-white/10 text-[color:var(--color-primary)] focus:ring-0"
                  />
                  <div className="text-white/80">
                    <span className="font-semibold text-white">Include current page URL and system diagnostics</span>
                    <p className="text-[11px] text-white/50 mt-0.5 leading-normal">
                      With your consent, attaches route ({pathname}) and client environment to help engineers reproduce.
                    </p>
                  </div>
                </label>
              </div>
            )}

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

      {/* TAB 3: Tier-Aware Escalation & Callbacks */}
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

              {/* Transactional Telephone Response Disclosure */}
              <div
                data-testid="callback-transactional-disclosure"
                className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-white/55"
              >
                By submitting your phone number, you consent to receive a one-time telephone call-back from
                PaperWorking support regarding your specific inquiry. We will not use your phone number for
                marketing, nor will we send SMS or automated text messages.
              </div>

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

export { PepperDrawer as AvaDrawer };
