'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { Activity, Clock, FileText, DollarSign, Users, ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   ActivityFeed — Recent Team Events (Option A)

   Real-time listener on organizations/{orgId}/activity.
   Displays the 10 most recent events as a timeline.
   ═══════════════════════════════════════════════════════ */

export interface ActivityEvent {
  id: string;
  type: 'deal_created' | 'phase_change' | 'ledger_item' | 'member_joined' | 'deal_sold';
  actorName: string;
  actorUid: string;
  description: string;
  projectName?: string;
  projectId?: string;
  createdAt: Date;
}

const EVENT_ICONS: Record<ActivityEvent['type'], React.ReactNode> = {
  deal_created: <FileText className="w-3.5 h-3.5" />,
  phase_change: <ArrowRight className="w-3.5 h-3.5" />,
  ledger_item: <DollarSign className="w-3.5 h-3.5" />,
  member_joined: <Users className="w-3.5 h-3.5" />,
  deal_sold: <Activity className="w-3.5 h-3.5" />,
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityFeed() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = profile?.organizationId;

  useEffect(() => {
    if (!orgId || orgId === 'org_placeholder') {
      setLoading(false);
      return;
    }

    const activityRef = collection(db, 'organizations', orgId, 'activity');
    const q = query(activityRef, orderBy('createdAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ActivityEvent[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'deal_created',
          actorName: data.actorName || 'System',
          actorUid: data.actorUid || '',
          description: data.description || '',
          projectName: data.projectName,
          projectId: data.projectId,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt || Date.now()),
        };
      });
      setEvents(items);
      setLoading(false);
    }, (error) => {
      console.error('[ActivityFeed] Listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="w-7 h-7 rounded-full bg-[#F2F2F2] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[#F2F2F2]" />
              <div className="h-2 w-1/3 rounded bg-[#F2F2F2]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center mb-3">
          <Clock className="w-4 h-4 text-[#A5A5A5]" />
        </div>
        <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest mb-1">
          No Activity Yet
        </p>
        <p className="text-[10px] text-[#7F7F7F] max-w-[200px] leading-relaxed">
          Team events will appear here as your portfolio grows.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, idx) => (
        <div
          key={event.id}
          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F2F2F2]/50 transition-colors group"
        >
          {/* Avatar / Icon */}
          <div className="w-7 h-7 rounded-full bg-[#F2F2F2] flex items-center justify-center flex-shrink-0 text-[#A5A5A5] group-hover:bg-[#1A1A1A] group-hover:text-[#FFFFFF] transition-colors">
            {EVENT_ICONS[event.type] || <Activity className="w-3.5 h-3.5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#1A1A1A] leading-snug">
              <span className="font-bold">{event.actorName}</span>{' '}
              <span className="text-[#7F7F7F]">{event.description}</span>
            </p>
            {event.projectName && (
              <p className="text-[10px] text-[#7F7F7F]/60 mt-0.5 truncate">
                {event.projectName}
              </p>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-[9px] text-[#A5A5A5] font-medium flex-shrink-0 mt-0.5">
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
