'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  type UXPhase,
  type PromptChip,
  hasPulseBeenDismissed,
  markPulseDismissed,
} from '@/lib/assistant/lifecycle-state-machine';
import { AVA_CONFIG } from '@/lib/assistant/config';
import { fetchAppCheckToken } from '@/lib/firebase/app-check';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  triggeredAction?: string;
  actionPayload?: Record<string, unknown>;
}

export interface SplitViewProgress {
  step: number;
  totalSteps: number;
  message: string;
  completed: boolean;
  project?: {
    id: string;
    name: string;
    address: string;
    capRate: string;
    irr: string;
  };
}

export interface GhostSuggestion {
  text: string;
  fieldId?: string;
}

interface AssistantContextType {
  currentPhase: UXPhase;
  isDrawerOpen: boolean;
  isPulseVisible: boolean;
  messages: AssistantMessage[];
  isStreaming: boolean;
  splitViewProgress: SplitViewProgress | null;
  ghostSuggestion: GhostSuggestion | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  minimizeToPill: () => void;
  dismissPulse: () => void;
  selectIntent: (chip: PromptChip) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  bailoutToManual: () => void;
  acceptGhostSuggestion: (targetInput?: HTMLInputElement | HTMLTextAreaElement) => void;
  dismissGhostSuggestion: () => void;
  triggerStall: (hint: string, fieldId?: string) => void;
  submitFeedback: (payload: {
    kind: 'idea' | 'bug' | 'feature_request';
    title: string;
    description: string;
    route?: string;
    errorContext?: string;
  }) => Promise<{ success: boolean; message?: string; upsell?: boolean }>;
  requestCallback: (payload: {
    name: string;
    phone: string;
    email: string;
    preferredWindow: string;
    topic: string;
  }) => Promise<{ success: boolean; message?: string; isPriority?: boolean }>;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [currentPhase, setCurrentPhase] = useState<UXPhase>('PHASE_1_LAUNCHER');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPulseVisible, setIsPulseVisible] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [splitViewProgress, setSplitViewProgress] = useState<SplitViewProgress | null>(null);
  const [ghostSuggestion, setGhostSuggestion] = useState<GhostSuggestion | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);

  // Phase 1: Proactive Pulse after inactivity (fires at most once per session per surface)
  useEffect(() => {
    const surfaceId = pathname.replace(/[^a-zA-Z0-9]/g, '_') || 'home';
    if (hasPulseBeenDismissed(surfaceId)) {
      setIsPulseVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!hasPulseBeenBeenDismissedInMemory(surfaceId)) {
        setIsPulseVisible(true);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Phase 4: Simulated stall listener for tests or complex form idle detection
  useEffect(() => {
    const handleStallEvent = (e: Event) => {
      const custom = e as CustomEvent<{ hint: string; fieldId?: string }>;
      if (custom.detail?.hint) {
        setGhostSuggestion({ text: custom.detail.hint, fieldId: custom.detail.fieldId });
      }
    };
    window.addEventListener('pw:assistant:stall', handleStallEvent);
    if (typeof window !== 'undefined') {
      (window as unknown as { __pw_triggerStall?: (hint: string, fieldId?: string) => void }).__pw_triggerStall = (
        hint: string,
        fieldId?: string,
      ) => {
        setGhostSuggestion({ text: hint, fieldId });
      };
    }

    return () => {
      window.removeEventListener('pw:assistant:stall', handleStallEvent);
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __pw_triggerStall?: (hint: string, fieldId?: string) => void }).__pw_triggerStall;
      }
    };
  }, []);

  const dismissedSurfacesRef = useRef<Set<string>>(new Set());
  function hasPulseBeenBeenDismissedInMemory(surfaceId: string): boolean {
    return dismissedSurfacesRef.current.has(surfaceId) || hasPulseBeenDismissed(surfaceId);
  }

  const dismissPulse = useCallback(() => {
    const surfaceId = pathname.replace(/[^a-zA-Z0-9]/g, '_') || 'home';
    dismissedSurfacesRef.current.add(surfaceId);
    markPulseDismissed(surfaceId);
    setIsPulseVisible(false);
  }, [pathname]);

  const openDrawer = useCallback(() => {
    dismissPulse();
    setIsDrawerOpen(true);
    setCurrentPhase((prev) => (prev === 'PHASE_1_LAUNCHER' ? 'PHASE_2_INTENT' : prev));
  }, [dismissPulse]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const minimizeToPill = useCallback(() => {
    setIsDrawerOpen(false);
    setCurrentPhase('PHASE_4_MINIMIZED');
  }, []);

  const bailoutToManual = useCallback(() => {
    setIsDrawerOpen(false);
    setIsPulseVisible(false);
    setSplitViewProgress(null);
    setGhostSuggestion(null);
    setCurrentPhase('PHASE_4_MINIMIZED');
  }, []);

  // Post chat message to backend
  const postChatMessage = async (
    outgoingMessages: AssistantMessage[],
    intent?: string,
  ): Promise<AssistantMessage> => {
    setIsStreaming(true);
    try {
      const appCheckToken = await fetchAppCheckToken();
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
        },
        body: JSON.stringify({
          messages: outgoingMessages,
          sessionId: sessionIdRef.current,
          intent,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.message) {
        throw new Error(data.error || 'Failed to receive assistant response');
      }
      return data.message;
    } finally {
      setIsStreaming(false);
    }
  };

  // Phase 3 Split-View Execution: Execute skeleton build
  const executeSkeletonBuild = async () => {
    setCurrentPhase('PHASE_3_SPLIT_VIEW');
    setSplitViewProgress({
      step: 1,
      totalSteps: 4,
      message: 'Analyzing market baseline and property records...',
      completed: false,
    });

    await new Promise((r) => setTimeout(r, 600));

    setSplitViewProgress({
      step: 2,
      totalSteps: 4,
      message: 'Populating Deal Calculator with live tax and rent comps...',
      completed: false,
    });

    // Call server action endpoint
    try {
      const appCheckToken = await fetchAppCheckToken();
      const res = await fetch('/api/assistant/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
        },
        body: JSON.stringify({
          action: 'buildSkeletonDeal',
          propertyName: '1247 Elm Street Duplex',
          address: '1247 Elm Street, Austin, TX 78702',
          purchasePrice: 485000,
          rehabBudget: 68000,
          expectedRent: 4200,
        }),
      });

      const data = await res.json();

      setSplitViewProgress({
        step: 3,
        totalSteps: 4,
        message: 'Calculating institutional Cap Rate, projected IRR, and Cash-on-Cash...',
        completed: false,
      });

      await new Promise((r) => setTimeout(r, 600));

      setSplitViewProgress({
        step: 4,
        totalSteps: 4,
        message: 'Workspace skeleton established. Value milestone achieved!',
        completed: true,
        project: data.project,
      });

      // After value lands, auto-minimize to non-intrusive pill (Phase 4)
      setTimeout(() => {
        minimizeToPill();
      }, 2500);
    } catch (err) {
      console.error('Error executing skeleton deal:', err);
    }
  };

  // User selects a prompt chip
  const selectIntent = useCallback(
    async (chip: PromptChip) => {
      openDrawer();
      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: chip.label,
        createdAt: new Date().toISOString(),
      };

      const updated = [...messages, userMsg];
      setMessages(updated);

      try {
        const assistantMsg = await postChatMessage(updated, chip.intentKey);
        setMessages((prev) => [...prev, assistantMsg]);

        if (assistantMsg.triggeredAction === 'buildSkeletonDeal') {
          await executeSkeletonBuild();
        }
      } catch (err) {
        console.error('Failed to send intent message:', err);
      }
    },
    [messages, openDrawer],
  );

  // User sends text
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      openDrawer();
      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      const updated = [...messages, userMsg];
      setMessages(updated);

      try {
        const assistantMsg = await postChatMessage(updated);
        setMessages((prev) => [...prev, assistantMsg]);

        if (assistantMsg.triggeredAction === 'buildSkeletonDeal') {
          await executeSkeletonBuild();
        }
      } catch (err) {
        console.error('Failed to send text message:', err);
      }
    },
    [messages, openDrawer],
  );

  // Phase 4: Ghost Copilot
  const triggerStall = useCallback((hint: string, fieldId?: string) => {
    setGhostSuggestion({ text: hint, fieldId });
  }, []);

  const dismissGhostSuggestion = useCallback(() => {
    setGhostSuggestion(null);
  }, []);

  const acceptGhostSuggestion = useCallback(
    (targetInput?: HTMLInputElement | HTMLTextAreaElement) => {
      if (ghostSuggestion && targetInput) {
        targetInput.value = ghostSuggestion.text;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setGhostSuggestion(null);
    },
    [ghostSuggestion],
  );

  // Community feedback submission
  const submitFeedback = useCallback(
    async (payload: {
      kind: 'idea' | 'bug' | 'feature_request';
      title: string;
      description: string;
      route?: string;
      errorContext?: string;
    }) => {
      const appCheckToken = await fetchAppCheckToken();
      const res = await fetch('/api/assistant/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
        },
        body: JSON.stringify({
          ...payload,
          route: payload.route,
          errorContext: payload.errorContext,
        }),
      });
      return await res.json();
    },
    [pathname],
  );

  // Callback request
  const requestCallback = useCallback(
    async (payload: {
      name: string;
      phone: string;
      email: string;
      preferredWindow: string;
      topic: string;
    }) => {
      const appCheckToken = await fetchAppCheckToken();
      const transcriptText = messages
        .map((m) => `${m.role === 'user' ? 'User' : AVA_CONFIG.agentName}: ${m.content}`)
        .join('\n');

      const res = await fetch('/api/assistant/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
        },
        body: JSON.stringify({
          ...payload,
          transcript: transcriptText,
        }),
      });
      return await res.json();
    },
    [messages],
  );

  return (
    <AssistantContext.Provider
      value={{
        currentPhase,
        isDrawerOpen,
        isPulseVisible,
        messages,
        isStreaming,
        splitViewProgress,
        ghostSuggestion,
        openDrawer,
        closeDrawer,
        minimizeToPill,
        dismissPulse,
        selectIntent,
        sendMessage,
        bailoutToManual,
        acceptGhostSuggestion,
        dismissGhostSuggestion,
        triggerStall,
        submitFeedback,
        requestCallback,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return context;
}
