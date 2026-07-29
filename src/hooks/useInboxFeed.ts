'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import {
  Notification,
  NotificationType,
  NotificationUrgency,
  NotificationChannel
} from '@/types/notification';
import { useNotification, InboxTabType, mapNotificationTypeToTab } from '@/context/NotificationContext';

export type { InboxTabType };
export { mapNotificationTypeToTab };

function hydrateNotification(docId: string, data: Record<string, any>): Notification {
  return {
    id: docId,
    recipientId: data.recipientId || '',
    type: data.type as NotificationType,
    title: data.title || '',
    body: data.body || '',
    actor: {
      uid: data.actor?.uid || '',
      name: data.actor?.name || 'System',
      role: data.actor?.role,
      avatarUrl: data.actor?.avatarUrl
    },
    objectReference: {
      ...(data.objectReference || {}),
      metadata: data.metadata || data.objectReference?.metadata || {},
    },
    urgencyLevel: (data.urgencyLevel as NotificationUrgency) || 'informational',
    channels: (data.channels as NotificationChannel[]) || ['in-app'],
    read: !!data.read,
    archived: !!data.archived,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt || Date.now()),
    expiresAt: data.expiresAt instanceof Timestamp
      ? data.expiresAt.toDate()
      : data.expiresAt
        ? new Date(data.expiresAt)
        : undefined,
    deepLinkUrl: data.deepLinkUrl || '/dashboard'
  };
}

const INITIAL_PAGE_SIZE = 20;
const PAGE_INCREMENT = 20;

export interface UseInboxFeedReturn {
  items: Notification[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  unreadCounts: Record<InboxTabType, number>;
  unreadTotal: number;
  activeTab: InboxTabType;
  setActiveTab: (tab: InboxTabType) => void;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  bulkArchive: (itemsToArchive: { id: string; wasUnread: boolean; type: NotificationType }[]) => Promise<void>;
  bulkMarkRead: (itemsToMark: { id: string; type: NotificationType }[]) => Promise<void>;
  fetchMore: () => void;
  hasMore: boolean;
}

export function useInboxFeed(): UseInboxFeedReturn {
  const { user } = useAuth();
  const uid = user?.uid;
  const {
    unreadCounts,
    unreadTotal,
    markAsRead: contextMarkAsRead,
    markAllRead: contextMarkAllRead,
    archiveItem: contextArchiveItem,
    deleteItem: contextDeleteItem,
    bulkArchive: contextBulkArchive
  } = useNotification();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InboxTabType>('all');
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);

  // Keep a reference to the latest notifications list for optimistic updates
  const notificationsRef = useRef<Notification[]>([]);
  notificationsRef.current = notifications;

  // Real-time paginated feed listener
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const feedQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid),
      where('archived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1) // Fetch one extra to determine if hasMore is true
    );

    const unsubscribe = onSnapshot(
      feedQuery,
      (snapshot) => {
        // Deduplicate and map
        const docs = snapshot.docs;
        const fetchedItems = docs.map((d) => hydrateNotification(d.id, d.data()));

        if (fetchedItems.length > pageSize) {
          setHasMore(true);
          setNotifications(fetchedItems.slice(0, pageSize));
        } else {
          setHasMore(false);
          setNotifications(fetchedItems);
        }

        setLoading(false);
        setLoadingMore(false);
      },
      (err) => {
        console.error('[useInboxFeed] Feed onSnapshot error:', err);
        setError('Failed to load notifications. Please check your connection.');
        setLoading(false);
        setLoadingMore(false);
      }
    );

    return () => unsubscribe();
  }, [uid, pageSize]);

  // Filter items locally based on active tab
  const items = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((item) => mapNotificationTypeToTab(item.type) === activeTab);
  }, [notifications, activeTab]);

  // fetchMore function
  const fetchMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    setPageSize((prev) => prev + PAGE_INCREMENT);
  }, [hasMore, loadingMore, loading]);

  // Optimistic Mark Single Item as Read
  const markAsRead = useCallback(
    async (id: string) => {
      if (!uid) return;

      const targetItem = notificationsRef.current.find((item) => item.id === id);
      if (!targetItem) return;

      // Optimistically update UI
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );

      try {
        await contextMarkAsRead(id, targetItem.type);
      } catch (err) {
        console.error('[useInboxFeed] markAsRead error:', err);
        // Rollback state on error
        setNotifications(notificationsRef.current);
      }
    },
    [uid, contextMarkAsRead]
  );

  // Optimistic Mark Single Item as Unread (re-badges the notification)
  const markAsUnread = useCallback(
    async (id: string) => {
      if (!uid) return;

      const targetItem = notificationsRef.current.find((item) => item.id === id);
      if (!targetItem) return;

      // Optimistically update UI
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: false } : item))
      );

      try {
        // Persist read:false directly — NotificationContext doesn't expose markAsUnread
        await updateDoc(doc(db, 'notifications', id), { read: false });
      } catch (err) {
        console.error('[useInboxFeed] markAsUnread error:', err);
        setNotifications(notificationsRef.current);
      }
    },
    [uid]
  );

  // Optimistic Mark All as Read
  const markAllRead = useCallback(async () => {
    if (!uid) return;

    const unreadItems = notifications.filter((item) => !item.read);
    if (unreadItems.length === 0) return;

    // Optimistically update UI
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      await contextMarkAllRead(unreadItems.map((item) => ({ id: item.id, type: item.type })));
    } catch (err) {
      console.error('[useInboxFeed] markAllRead error:', err);
      // Rollback state on error
      setNotifications(notificationsRef.current);
    }
  }, [uid, notifications, contextMarkAllRead]);

  // Optimistic Bulk Mark Read
  const bulkMarkRead = useCallback(
    async (itemsToMark: { id: string; type: NotificationType }[]) => {
      if (!uid || itemsToMark.length === 0) return;

      const idsToMark = itemsToMark.map((item) => item.id);

      // Optimistically update UI
      setNotifications((prev) =>
        prev.map((item) => (idsToMark.includes(item.id) ? { ...item, read: true } : item))
      );

      try {
        await contextMarkAllRead(itemsToMark);
      } catch (err) {
        console.error('[useInboxFeed] bulkMarkRead error:', err);
        // Rollback state on error
        setNotifications(notificationsRef.current);
      }
    },
    [uid, contextMarkAllRead]
  );

  // Optimistic Archive Item
  const archiveItem = useCallback(
    async (id: string) => {
      if (!uid) return;

      const targetItem = notificationsRef.current.find((item) => item.id === id);
      if (!targetItem) return;

      // Optimistically remove from UI
      setNotifications((prev) => prev.filter((item) => item.id !== id));

      try {
        await contextArchiveItem(id, !targetItem.read, targetItem.type);
      } catch (err) {
        console.error('[useInboxFeed] archiveItem error:', err);
        // Rollback state on error
        setNotifications(notificationsRef.current);
      }
    },
    [uid, contextArchiveItem]
  );

  // Optimistic Bulk Archive Items
  const bulkArchive = useCallback(
    async (itemsToArchive: { id: string; wasUnread: boolean; type: NotificationType }[]) => {
      if (!uid || itemsToArchive.length === 0) return;

      const idsToArchive = itemsToArchive.map((item) => item.id);

      // Optimistically remove from UI
      setNotifications((prev) => prev.filter((item) => !idsToArchive.includes(item.id)));

      try {
        await contextBulkArchive(itemsToArchive);
      } catch (err) {
        console.error('[useInboxFeed] bulkArchive error:', err);
        // Rollback state on error
        setNotifications(notificationsRef.current);
      }
    },
    [uid, contextBulkArchive]
  );

  // Optimistic Delete Item
  const deleteItem = useCallback(
    async (id: string) => {
      if (!uid) return;

      const targetItem = notificationsRef.current.find((item) => item.id === id);
      if (!targetItem) return;

      // Optimistically remove from UI
      setNotifications((prev) => prev.filter((item) => item.id !== id));

      try {
        await contextDeleteItem(id, !targetItem.read, targetItem.type);
      } catch (err) {
        console.error('[useInboxFeed] deleteItem error:', err);
        // Rollback state on error
        setNotifications(notificationsRef.current);
      }
    },
    [uid, contextDeleteItem]
  );

  return {
    items,
    loading,
    loadingMore,
    error,
    unreadCounts,
    unreadTotal,
    activeTab,
    setActiveTab,
    markAsRead,
    markAsUnread,
    markAllRead,
    archiveItem,
    deleteItem,
    bulkArchive,
    bulkMarkRead,
    fetchMore,
    hasMore
  };
}
