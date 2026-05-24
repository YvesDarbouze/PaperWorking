'use client';

import React, { useEffect, useState } from 'react';
import { Bell, ArrowUpRight, Inbox, Loader2 } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Notification, NotificationType } from '@/types/notification';

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
    objectReference: data.objectReference || {},
    urgencyLevel: data.urgencyLevel || 'informational',
    channels: data.channels || ['in-app'],
    read: !!data.read,
    archived: !!data.archived,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt || Date.now()),
    expiresAt: data.expiresAt instanceof Timestamp
      ? data.expiresAt.toDate()
      : data.expiresAt ? new Date(data.expiresAt) : undefined,
    deepLinkUrl: data.deepLinkUrl || '/dashboard'
  };
}

function getCategoryLabel(type: NotificationType): string {
  switch (type) {
    case 'INVEST_INVITE': return 'Investment Invitation';
    case 'TEAM_INVITE': return 'Team Invitation';
    case 'VENDOR_BID': return 'Contractor Bid';
    case 'DEADLINE_ALERT': return 'Deadline Alert';
    case 'TASK_COMPLETE': return 'Task Complete';
    case 'PHASE_TRANSITION': return 'Phase Transition';
    case 'DOCUMENT_SIGNED': return 'Document Signed';
    case 'RECEIPT_APPROVAL': return 'Receipt Approval';
    case 'OVER_IMPROVEMENT_ALERT': return 'Rehab Over-improvement';
    case 'BURN_RATE_WARNING': return 'Holding Burn Rate';
    case 'BILLING_CHARGED': return 'Billing & Subscription';
    default: return 'System Event';
  }
}

function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatEventTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export default function MessagesWidget() {
  const { user } = useAuth();
  const uid = user?.uid;
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', uid),
      where('archived', '==', false),
      orderBy('createdAt', 'desc'),
      limit(4)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => hydrateNotification(doc.id, doc.data()));
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.error('[MessagesWidget] Failed to listen to notifications:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const handleItemClick = async (item: Notification) => {
    if (!item.read) {
      try {
        await updateDoc(doc(db, 'notifications', item.id), {
          read: true,
          readAt: Timestamp.now()
        });
      } catch (err) {
        console.error('[MessagesWidget] Failed to mark read:', err);
      }
    }
    router.push(item.deepLinkUrl);
  };

  return (
    <div className="bg-[#F2F2F2] border-l border-[#A5A5A5] p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-[#1A1A1A] tracking-tight">Recent Activity</h2>
        <button 
          onClick={() => router.push('/dashboard/inbox')}
          className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#A5A5A5] flex items-center justify-center hover:bg-[#CCCCCC] transition-colors"
        >
          <Bell className="w-5 h-5 text-[#595959]" />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-[#7F7F7F] opacity-50">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading activity feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#7F7F7F] gap-3">
            <Inbox className="w-8 h-8 opacity-20" />
            <p className="text-sm opacity-50">Your activity feed is clear</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleItemClick(item)}
              className="flex items-start justify-between group cursor-pointer"
            >
              <div className="w-24 flex-shrink-0">
                <p className="text-xs font-semibold text-[#7F7F7F] mb-1">{formatEventDate(item.createdAt)}</p>
                <p className="text-sm font-bold text-[#1A1A1A]">{formatEventTime(item.createdAt)}</p>
              </div>
              
              <div className="flex-1 px-4 min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A] mb-1 line-clamp-1 flex items-center gap-1.5">
                  {item.title}
                  {!item.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] flex-shrink-0" />
                  )}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] text-[#FFFFFF]">🔔</span>
                  </div>
                  <p className="text-xs text-[#7F7F7F] font-medium truncate">
                    {getCategoryLabel(item.type)}
                  </p>
                </div>
              </div>

              <button className="w-8 h-8 rounded-lg border border-[#A5A5A5] flex items-center justify-center text-[#595959] group-hover:bg-[#1A1A1A] group-hover:text-[#FFFFFF] transition-colors flex-shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => router.push('/dashboard/inbox')}
        className="mt-8 text-sm font-medium text-[#7F7F7F] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-2"
      >
        See all notifications <ArrowUpRight className="w-4 h-4" />
      </button>
    </div>
  );
}
