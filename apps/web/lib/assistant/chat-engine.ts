/**
 * Server-side Chat Engine for Ava.
 *
 * Implements:
 * - Firebase AI Logic / Gemini integration with system instructions compiled from versioned knowledge modules.
 * - Multi-turn conversation handling.
 * - Tool calling for skeleton creation and tier escalation.
 * - High-fidelity deterministic fallback for offline, emulator, and automated test environments.
 * - Strict terminology invariant: The product's core nouns are Project and Deal.
 */

import {
  generatePepperResponse,
} from './firebase-ai-client';
import { type UserContext } from './persona';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  intent?: string;
  actionPayload?: Record<string, unknown>;
}

export interface GenerateChatResponseOptions {
  messages: ChatMessage[];
  userContext: UserContext;
  intent?: string;
}

export interface AssistantResponseResult {
  text: string;
  triggeredAction?: string;
  actionPayload?: Record<string, unknown>;
  actionLabel?: string;
  actionUrl?: string;
  usedLiveModel?: boolean;
}

/**
 * Generates an intelligent, grounded response from Pepper via Firebase AI Logic / Gemini.
 */
export async function generateAssistantResponse(
  options: GenerateChatResponseOptions,
): Promise<AssistantResponseResult> {
  const { messages, userContext, intent } = options;
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';

  const history = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(0, -1)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  return generatePepperResponse({
    message: lastUserMsg,
    userContext,
    history,
    intent,
  });
}

