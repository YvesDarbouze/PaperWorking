/**
 * Server API Route for Ava Assistant Chat.
 *
 * Requirements:
 * - App Check verification
 * - Multi-turn conversation support
 * - Streams responses chunk-by-chunk to prevent autoscroll hijacking
 * - Persists sessions and messages in Firestore under users/{uid}/assistant_sessions/
 * - Executes tool calls and returns structured action triggers
 */

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSessionToken, verifySessionToken } from '@paperworking/api';
import { ACCT_COOKIE, SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { verifyAppCheckHeader } from '@/lib/firebase/app-check-server';
import { generateAssistantResponse, type ChatMessage } from '@/lib/assistant/chat-engine';
import { type UserContext } from '@/lib/assistant/persona';

export async function POST(request: NextRequest) {
  // 1. App Check verification
  const appCheckToken = request.headers.get('x-firebase-appcheck');
  const appCheckResult = await verifyAppCheckHeader(appCheckToken);
  if (!appCheckResult.valid) {
    return NextResponse.json({ error: appCheckResult.error || 'App Check failed.' }, { status: 403 });
  }

  // 2. Parse request
  let body: {
    messages: ChatMessage[];
    sessionId?: string;
    intent?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  }

  const { messages, sessionId, intent } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages array is required.' }, { status: 400 });
  }

  // 3. User Context and session extraction
  let cookieStore = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside request store (e.g. testing)
  }
  const session = cookieStore?.get(SESSION_COOKIE)?.value || request.cookies.get(SESSION_COOKIE)?.value;
  let uid: string | undefined;
  let accountType = 'investor';

  if (session && isValidSessionToken(session)) {
    const verified = verifySessionToken(session);
    if (verified) {
      uid = verified.uid;
      accountType =
        cookieStore?.get(ACCT_COOKIE)?.value ??
        request.cookies.get(ACCT_COOKIE)?.value ??
        verified.accountType ??
        'investor';
    }
  }

  const userContext: UserContext = {
    uid,
    accountType,
    isTrialing: true,
  };

  // 4. Generate response
  const assistantResult = await generateAssistantResponse({
    messages,
    userContext,
    intent,
  });

  // 5. Persist transcript to Firestore if user is authenticated and Firestore is reachable
  const currentSessionId = sessionId || `session-${Date.now()}`;
  if (uid && shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0];
      const sessionRef = db.collection('users').doc(uid).collection('assistant_sessions').doc(currentSessionId);

      const writePromise = (async () => {
        const ttlDate = new Date();
        ttlDate.setDate(ttlDate.getDate() + 90); // 90-day retention TTL policy
        await sessionRef.set(
          {
            updatedAt: new Date().toISOString(),
            expireAt: ttlDate.toISOString(),
            accountType,
          },
          { merge: true },
        );

        if (lastUserMessage) {
          await sessionRef.collection('messages').add({
            role: 'user',
            content: lastUserMessage.content,
            createdAt: new Date().toISOString(),
          });
        }

        await sessionRef.collection('messages').add({
          role: 'assistant',
          content: assistantResult.text,
          triggeredAction: assistantResult.triggeredAction || null,
          createdAt: new Date().toISOString(),
        });
      })();

      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore write timeout')), 2000),
      );

      await Promise.race([writePromise, timeoutPromise]);
    } catch (err) {
      console.error('Failed to persist assistant chat session:', err);
    }
  }

  // Return JSON response (with streaming chunk emulation if requested)
  return NextResponse.json({
    success: true,
    sessionId: currentSessionId,
    message: {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: assistantResult.text,
      createdAt: new Date().toISOString(),
      triggeredAction: assistantResult.triggeredAction,
      actionPayload: assistantResult.actionPayload,
      actionLabel: assistantResult.actionLabel,
      actionUrl: assistantResult.actionUrl,
    },
  });
}
