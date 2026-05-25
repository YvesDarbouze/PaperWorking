'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Terminal } from 'lucide-react';

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
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getLogColor(type: string, description: string): string {
  const desc = description.toLowerCase();
  
  if (
    type === 'error' ||
    desc.includes('error') ||
    desc.includes('fail') ||
    desc.includes('critical') ||
    desc.includes('unauthorized') ||
    desc.includes('denied')
  ) {
    return 'var(--color-error)';
  }
  
  if (
    type === 'ledger_item' ||
    type === 'warning' ||
    desc.includes('warning') ||
    desc.includes('warn') ||
    desc.includes('threshold') ||
    desc.includes('ledger')
  ) {
    return 'var(--color-tertiary)';
  }
  
  return 'var(--color-primary)';
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
      <section className="p-6 flex flex-col h-full min-h-[350px]">
        <div className="flex items-center gap-2 mb-4 text-on-surface border-b border-white/5 pb-2">
          <Terminal className="w-4 h-4 text-primary" style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest text-[11px] font-bold">
            Terminal Audit
          </h3>
        </div>
        <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-hide text-on-surface-variant/80 space-y-2 animate-pulse">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="font-bold shrink-0 opacity-40" style={{ color: 'var(--color-primary)' }}>
                [--:--:--]
              </span>
              <span className="h-3 bg-white/10 rounded w-full"></span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="p-6 flex flex-col h-full min-h-[350px]">
        <div className="flex items-center gap-2 mb-4 text-on-surface border-b border-white/5 pb-2">
          <Terminal className="w-4 h-4 text-primary" style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest text-[11px] font-bold">
            Terminal Audit
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center font-mono text-[11px] leading-relaxed text-on-surface-variant/60">
          <span className="text-[var(--color-tertiary)] mb-2 font-bold" style={{ color: 'var(--color-tertiary)' }}>
            [WARN] NO DATA DETECTED
          </span>
          <span className="opacity-80" style={{ color: 'var(--color-primary)' }}>
            SYS: Monitoring active... <span className="animate-pulse">|</span>
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 flex flex-col h-full min-h-[350px]">
      <div className="flex items-center gap-2 mb-4 text-on-surface border-b border-white/5 pb-2">
        <Terminal className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-widest text-[11px] font-bold">
          Terminal Audit
        </h3>
      </div>
      <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-hide text-on-surface-variant/80 space-y-2">
        {events.map((event) => {
          const logColor = getLogColor(event.type, event.description);
          const actorLabel = (event.actorName || 'System').toUpperCase();
          return (
            <div key={event.id} className="flex gap-3 items-start hover:bg-white/5 p-1 rounded transition-colors">
              <span className="font-bold shrink-0 opacity-60" style={{ color: 'var(--color-primary)' }}>
                [{formatTimeOnly(event.createdAt)}]
              </span>
              <span style={{ color: logColor }}>
                <span className="font-bold">{actorLabel}:</span>{' '}
                {event.description}
                {event.projectName && (
                  <>
                    {' '}
                    for <span className="underline underline-offset-2 decoration-white/10">{event.projectName}</span>
                  </>
                )}
              </span>
            </div>
          );
        })}
        {/* Active tracking prompt line */}
        <div className="flex gap-3 items-start opacity-60">
          <span className="font-bold shrink-0" style={{ color: 'var(--color-primary)' }}>
            [ONLINE]
          </span>
          <span style={{ color: 'var(--color-primary)' }}>
            SYS: Monitoring active... <span className="animate-pulse">|</span>
          </span>
        </div>
      </div>
    </section>
  );
}
