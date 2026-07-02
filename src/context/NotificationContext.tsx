'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  deleteDoc,
  arrayUnion,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { NotificationType } from '@/types/notification';
import toast from 'react-hot-toast';
import { requestPushPermissionAndGetToken, onForegroundMessage } from '@/lib/firebase/messaging';

export type InboxTabType = 'all' | 'opportunities' | 'tasks' | 'vendors' | 'team' | 'system';

const SENSITIVE_NOTIFICATION_TYPES: NotificationType[] = [
  'BILLING_CHARGED',
  'RECEIPT_APPROVAL',
  'BURN_RATE_WARNING',
  'OVER_IMPROVEMENT_ALERT',
  'VENDOR_BID',
  'INVEST_INVITE'
];

export function mapNotificationTypeToTab(type: NotificationType): InboxTabType {
  switch (type) {
    case 'PHASE_TRANSITION':
    case 'DEADLINE_ALERT':
    case 'OVER_IMPROVEMENT_ALERT':
    case 'BURN_RATE_WARNING':
    case 'INVEST_INVITE':
      return 'opportunities';
    case 'TASK_COMPLETE':
    case 'TASK_ASSIGNED':
      return 'tasks';
    case 'VENDOR_BID':
    case 'VENDOR_LEAD':
      return 'vendors';
    case 'TEAM_INVITE':
    case 'TEAM_INVITE_REMINDER':
    case 'DOCUMENT_SIGNED':
      return 'team';
    case 'BILLING_CHARGED':
    case 'RECEIPT_APPROVAL':
    default:
      return 'system';
  }
}

interface NotificationContextType {
  unreadCounts: Record<InboxTabType, number>;
  unreadTotal: number;
  loading: boolean;
  markAsRead: (id: string, type: NotificationType) => Promise<void>;
  markAllRead: (items: { id: string; type: NotificationType }[]) => Promise<void>;
  archiveItem: (id: string, wasUnread: boolean, type: NotificationType) => Promise<void>;
  deleteItem: (id: string, wasUnread: boolean, type: NotificationType) => Promise<void>;
  bulkArchive: (itemsToArchive: { id: string; wasUnread: boolean; type: NotificationType }[]) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const uid = user?.uid;

  const [unreadCounts, setUnreadCounts] = useState<Record<InboxTabType, number>>({
    all: 0,
    opportunities: 0,
    tasks: 0,
    vendors: 0,
    team: 0,
    system: 0,
  });
  const [loading, setLoading] = useState(true);

  // Keep a ref of counts for rollback / reference
  const countsRef = useRef(unreadCounts);
  countsRef.current = unreadCounts;

  // Register push notifications when user logs in (respecting opt-out settings)
  useEffect(() => {
    if (!uid || profile?.preferences?.pushEnabled === false) return;

    let unsubscribeForeground: (() => void) | null = null;

    const registerPush = async () => {
      try {
        const token = await requestPushPermissionAndGetToken();
        if (token) {
          await updateDoc(doc(db, 'users', uid), {
            fcmTokens: arrayUnion(token)
          });

          // Listen to foreground notifications
          unsubscribeForeground = onForegroundMessage((payload) => {
            const title = payload.notification?.title || payload.data?.title || 'Critical Alert';
            const body = payload.notification?.body || payload.data?.body || '';
            toast.success(`${title}: ${body}`, {
              icon: '🔔',
              duration: 6000
            });
          });
        }
      } catch (err) {
        console.warn('[NotificationContext] Push registration failed (non-fatal):', err);
      }
    };

    registerPush();

    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [uid, profile?.preferences?.pushEnabled]);

  // Throttled client activity tracker updating lastActiveAt in Firestore
  useEffect(() => {
    if (!uid) return;
 
    let lastSyncTime = 0;
    const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes
 
    const syncActivity = async () => {
      const now = Date.now();
      if (now - lastSyncTime < SYNC_INTERVAL) return;
 
      try {
        lastSyncTime = now;
        await updateDoc(doc(db, 'users', uid), {
          lastActiveAt: Timestamp.now()
        });
        console.log('[NotificationContext] Synced client activity (lastActiveAt).');
      } catch (err) {
        console.error('[NotificationContext] Failed to sync activity:', err);
      }
    };
 
    const handleActivity = () => {
      syncActivity();
    };
 
    // Sync immediately upon mount / login
    syncActivity();
 
    window.addEventListener('focus', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('mousemove', handleActivity);
 
    return () => {
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setUnreadCounts({
        all: 0,
        opportunities: 0,
        tasks: 0,
        vendors: 0,
        team: 0,
        system: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    const unreadQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid),
      where('archived', '==', false),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        const counts: Record<InboxTabType, number> = {
          all: 0,
          opportunities: 0,
          tasks: 0,
          vendors: 0,
          team: 0,
          system: 0,
        };

        snapshot.docs.forEach((doc) => {
          const type = doc.data().type as NotificationType;
          const tab = mapNotificationTypeToTab(type);
          counts.all++;
          counts[tab]++;
        });

        setUnreadCounts(counts);
        setLoading(false);
      },
      (err) => {
        console.error('[NotificationContext] Unread count listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const markAsRead = useCallback(async (id: string, type: NotificationType) => {
    // Optimistic decrement
    const tab = mapNotificationTypeToTab(type);
    setUnreadCounts((prev) => ({
      ...prev,
      all: Math.max(0, prev.all - 1),
      [tab]: Math.max(0, prev[tab] - 1),
    }));

    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true,
        readAt: Timestamp.now(),
      });

      if (SENSITIVE_NOTIFICATION_TYPES.includes(type)) {
        await addDoc(collection(db, 'auditLog'), {
          type: 'sensitive_notification_access',
          userId: uid,
          notificationId: id,
          notificationType: type,
          action: 'read',
          at: Timestamp.now()
        });
      }
    } catch (err) {
      console.error('[NotificationContext] markAsRead error:', err);
      // Rollback
      setUnreadCounts(countsRef.current);
      throw err;
    }
  }, [uid]);

  const markAllRead = useCallback(async (unreadItems: { id: string; type: NotificationType }[]) => {
    if (unreadItems.length === 0) return;

    // Optimistic decrement
    setUnreadCounts((prev) => {
      const next = { ...prev };
      unreadItems.forEach((item) => {
        const tab = mapNotificationTypeToTab(item.type);
        next.all = Math.max(0, next.all - 1);
        next[tab] = Math.max(0, next[tab] - 1);
      });
      return next;
    });

    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();
      unreadItems.forEach((item) => {
        batch.update(doc(db, 'notifications', item.id), {
          read: true,
          readAt: now,
        });
      });
      await batch.commit();

      for (const item of unreadItems) {
        if (SENSITIVE_NOTIFICATION_TYPES.includes(item.type)) {
          await addDoc(collection(db, 'auditLog'), {
            type: 'sensitive_notification_access',
            userId: uid,
            notificationId: item.id,
            notificationType: item.type,
            action: 'read_bulk',
            at: now
          });
        }
      }
    } catch (err) {
      console.error('[NotificationContext] markAllRead error:', err);
      setUnreadCounts(countsRef.current);
      throw err;
    }
  }, [uid]);

  const archiveItem = useCallback(async (id: string, wasUnread: boolean, type: NotificationType) => {
    if (wasUnread) {
      const tab = mapNotificationTypeToTab(type);
      setUnreadCounts((prev) => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        [tab]: Math.max(0, prev[tab] - 1),
      }));
    }

    try {
      await updateDoc(doc(db, 'notifications', id), {
        archived: true,
      });

      if (SENSITIVE_NOTIFICATION_TYPES.includes(type)) {
        await addDoc(collection(db, 'auditLog'), {
          type: 'sensitive_notification_access',
          userId: uid,
          notificationId: id,
          notificationType: type,
          action: 'archive',
          at: Timestamp.now()
        });
      }
    } catch (err) {
      console.error('[NotificationContext] archiveItem error:', err);
      if (wasUnread) setUnreadCounts(countsRef.current);
      throw err;
    }
  }, [uid]);

  const deleteItem = useCallback(async (id: string, wasUnread: boolean, type: NotificationType) => {
    if (wasUnread) {
      const tab = mapNotificationTypeToTab(type);
      setUnreadCounts((prev) => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        [tab]: Math.max(0, prev[tab] - 1),
      }));
    }

    try {
      await deleteDoc(doc(db, 'notifications', id));

      if (SENSITIVE_NOTIFICATION_TYPES.includes(type)) {
        await addDoc(collection(db, 'auditLog'), {
          type: 'sensitive_notification_access',
          userId: uid,
          notificationId: id,
          notificationType: type,
          action: 'delete',
          at: Timestamp.now()
        });
      }
    } catch (err) {
      console.error('[NotificationContext] deleteItem error:', err);
      if (wasUnread) setUnreadCounts(countsRef.current);
      throw err;
    }
  }, [uid]);

  const bulkArchive = useCallback(async (items: { id: string; wasUnread: boolean; type: NotificationType }[]) => {
    if (items.length === 0) return;

    // Optimistic decrement
    setUnreadCounts((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (item.wasUnread) {
          const tab = mapNotificationTypeToTab(item.type);
          next.all = Math.max(0, next.all - 1);
          next[tab] = Math.max(0, next[tab] - 1);
        }
      });
      return next;
    });

    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();
      items.forEach((item) => {
        batch.update(doc(db, 'notifications', item.id), {
          archived: true,
        });
      });
      await batch.commit();

      for (const item of items) {
        if (SENSITIVE_NOTIFICATION_TYPES.includes(item.type)) {
          await addDoc(collection(db, 'auditLog'), {
            type: 'sensitive_notification_access',
            userId: uid,
            notificationId: item.id,
            notificationType: item.type,
            action: 'archive_bulk',
            at: now
          });
        }
      }
    } catch (err) {
      console.error('[NotificationContext] bulkArchive error:', err);
      setUnreadCounts(countsRef.current);
      throw err;
    }
  }, [uid]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCounts,
        unreadTotal: unreadCounts.all,
        loading,
        markAsRead,
        markAllRead,
        archiveItem,
        deleteItem,
        bulkArchive,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
