'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import type { MessageType } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   useInboxThreads — Real-time Firestore Inbox
   
   Listens to all messages across the user's organization
   and groups them into virtual threads by projectId.
   ═══════════════════════════════════════════════════════ */

export interface InboxMessage {
  id: string;
  projectId: string;
  organizationId: string;
  senderEmail: string;
  senderName: string;
  senderUid?: string;
  type: MessageType;
  subject?: string;
  body: string;
  createdAt: Date;
  readByUid: string[];
  emailNotificationSent: boolean;
  providerMessageId?: string;
  recipients?: string[];
}

export interface InboxThread {
  projectId: string;
  lastMessage: InboxMessage;
  messages: InboxMessage[];
  unreadCount: number;
  participantNames: string[];
}

interface UseInboxThreadsReturn {
  threads: InboxThread[];
  loading: boolean;
  error: string | null;
  unreadTotal: number;
  markAsRead: (projectId: string) => Promise<void>;
}

export function useInboxThreads(): UseInboxThreadsReturn {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid;
  const organizationId = profile?.organizationId;

  useEffect(() => {
    if (!uid || !organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Listen to all messages for this organization across all projects
    // We query a collectionGroup to get messages from all project sub-collections
    const messagesQuery = query(
      collection(db, 'projects'),
      where('organizationId', '==', organizationId),
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      async (projectsSnap) => {
        const allMessages: InboxMessage[] = [];
        const messageListeners: (() => void)[] = [];

        // For each project, listen to its messages sub-collection
        for (const projectDoc of projectsSnap.docs) {
          const messagesRef = collection(db, 'projects', projectDoc.id, 'messages');
          const messagesSnap = await new Promise<InboxMessage[]>((resolve) => {
            const unsub = onSnapshot(
              query(messagesRef, orderBy('createdAt', 'desc')),
              (snap) => {
                const msgs = snap.docs.map((d) => {
                  const data = d.data();
                  return {
                    id: d.id,
                    projectId: projectDoc.id,
                    organizationId: data.organizationId || organizationId,
                    senderEmail: data.senderEmail || '',
                    senderName: data.senderName || 'Unknown',
                    senderUid: data.senderUid,
                    type: data.type || 'INTERNAL_COMMENT',
                    subject: data.subject,
                    body: data.body || '',
                    createdAt: data.createdAt instanceof Timestamp
                      ? data.createdAt.toDate()
                      : new Date(data.createdAt || Date.now()),
                    readByUid: data.readByUid || [],
                    emailNotificationSent: data.emailNotificationSent || false,
                    providerMessageId: data.providerMessageId,
                    recipients: data.recipients,
                  } as InboxMessage;
                });
                resolve(msgs);
              },
              (err) => {
                console.error(`[useInboxThreads] Error reading messages for ${projectDoc.id}:`, err);
                resolve([]);
              },
            );
            messageListeners.push(unsub);
          });
          allMessages.push(...messagesSnap);
        }

        // Group messages by projectId into threads
        const threadMap = new Map<string, InboxMessage[]>();
        for (const msg of allMessages) {
          const existing = threadMap.get(msg.projectId) || [];
          existing.push(msg);
          threadMap.set(msg.projectId, existing);
        }

        // Build thread objects
        const builtThreads: InboxThread[] = [];
        for (const [projectId, messages] of threadMap) {
          // Sort messages newest first
          messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          const unreadCount = messages.filter(
            (m) => !m.readByUid.includes(uid),
          ).length;

          // Collect unique participant names
          const nameSet = new Set<string>();
          messages.forEach((m) => {
            if (m.senderName && m.senderName !== 'PaperWorking') {
              nameSet.add(m.senderName);
            }
          });

          builtThreads.push({
            projectId,
            lastMessage: messages[0],
            messages,
            unreadCount,
            participantNames: Array.from(nameSet),
          });
        }

        // Sort threads by most recent message
        builtThreads.sort(
          (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
        );

        setThreads(builtThreads);
        setLoading(false);
      },
      (err) => {
        console.error('[useInboxThreads] Firestore error:', err);
        setError('Failed to load inbox. Please try again.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid, organizationId]);

  // Mark all messages in a thread as read
  const markAsRead = useCallback(
    async (projectId: string) => {
      if (!uid) return;
      const thread = threads.find((t) => t.projectId === projectId);
      if (!thread) return;

      const unreadMessages = thread.messages.filter(
        (m) => !m.readByUid.includes(uid),
      );

      const updates = unreadMessages.map((m) =>
        updateDoc(doc(db, 'projects', projectId, 'messages', m.id), {
          readByUid: arrayUnion(uid),
        }),
      );

      await Promise.allSettled(updates);
    },
    [uid, threads],
  );

  const unreadTotal = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return { threads, loading, error, unreadTotal, markAsRead };
}
