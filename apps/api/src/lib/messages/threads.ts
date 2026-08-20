export interface MessageRecord {
  id: string;
  threadId: string;
  subject?: string | null;
  read: boolean;
  createdAt: Date | string;
  [key: string]: unknown;
}

export interface MessageThreadSummary {
  threadId: string;
  subject?: string | null;
  latestMessage: MessageRecord;
  unreadCount: number;
  messages: MessageRecord[];
}

export function groupMessagesIntoThreads(messages: MessageRecord[]): MessageThreadSummary[] {
  const threadsMap = new Map<string, MessageRecord[]>();

  for (const msg of messages) {
    const tid = msg.threadId;
    if (!threadsMap.has(tid)) {
      threadsMap.set(tid, []);
    }
    threadsMap.get(tid)!.push(msg);
  }

  return Array.from(threadsMap.entries()).map(([threadId, msgs]) => {
    const latestMsg = msgs[0];
    const unreadCount = msgs.filter((m) => !m.read).length;
    return {
      threadId,
      subject: latestMsg.subject,
      latestMessage: latestMsg,
      unreadCount,
      messages: msgs,
    };
  });
}

export function validateCreateMessageBody(body: {
  senderId?: unknown;
  recipientId?: unknown;
  body?: unknown;
  content?: unknown;
}): { ok: true; senderId: string; recipientId: string; content: string } | { ok: false; error: string } {
  const senderId = body.senderId;
  const recipientId = body.recipientId;
  const content =
    (typeof body.body === 'string' ? body.body : undefined) ||
    (typeof body.content === 'string' ? body.content : undefined);

  if (
    !senderId ||
    typeof senderId !== 'string' ||
    !recipientId ||
    typeof recipientId !== 'string' ||
    !content
  ) {
    return { ok: false, error: 'Missing required fields' };
  }

  return { ok: true, senderId, recipientId, content };
}

export function generateMessageId(now: () => number = Date.now): string {
  return `msg_${now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateThreadId(now: () => number = Date.now): string {
  return `thread_${now()}`;
}
