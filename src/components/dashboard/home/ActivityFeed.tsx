'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

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

function formatTimeOnly(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityFeed() {
  const { profile } = useAuth();
  const { activeTenantId } = useTenant();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = activeTenantId;

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
      <section className="space-y-3">
        <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest text-[10px] font-bold">Audit Log</h3>
        <div className="space-y-3 px-1 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-1 h-1 rounded-full bg-white/20 mt-2"></div>
              <div className="min-w-0 border-l border-white/5 pl-4 pb-2 w-full">
                <div className="h-3 w-3/4 rounded bg-white/10 mb-2"></div>
                <div className="h-2 w-1/4 rounded bg-white/5"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="space-y-3">
        <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest text-[10px] font-bold">Audit Log</h3>
        <div className="glass-card p-6 rounded-2xl text-center border border-dashed border-white/10">
          <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest">No Activity Yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest text-[10px] font-bold">Audit Log</h3>
      <div className="space-y-3 px-1">
        {events.map((event, idx) => {
          // Cycle colors based on index to mimic the design if event type mapping isn't strict
          const isPrimary = idx % 2 === 0;
          const dotColor = isPrimary ? 'bg-primary' : 'bg-secondary';
          const textColor = isPrimary ? 'text-primary' : 'text-secondary';

          return (
            <div key={event.id} className="flex items-start gap-4 group">
              <div className={`w-1 h-1 rounded-full ${dotColor} mt-2 group-hover:scale-150 transition-transform`}></div>
              <div className="min-w-0 border-l border-white/5 pl-4 pb-2 group-last:border-transparent">
                <p className="font-body-sm text-[13px] text-on-surface leading-snug">
                  <span className={`${textColor} font-bold`}>{event.actorName}</span>{' '}
                  <span className="opacity-90">{event.description}</span>{' '}
                  {event.projectName && (
                    <>
                      for <span className="underline underline-offset-2 decoration-white/10 font-medium">{event.projectName}</span>
                    </>
                  )}
                </p>
                <p className="font-label-sm text-[10px] text-on-surface-variant font-mono uppercase mt-0.5 opacity-60">
                  {formatTimeOnly(event.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
