'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Terminal, History, FileUp, RefreshCw, UserCheck } from 'lucide-react';
import { useTheme } from '@/lib/utils/ThemeProvider';

export interface ActivityEvent {
  id: string;
  type: 'deal_created' | 'phase_change' | 'doc_uploaded' | 'ledger_item' | 'member_joined' | 'deal_sold';
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
  const { theme } = useTheme();
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
      <div 
        className={`w-full h-full p-8 flex flex-col overflow-hidden rounded-2xl min-h-[350px] transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-[#121014]/98 border border-white/5 backdrop-blur-[24px]' 
            : 'bg-[#FDFFFC] border border-[#454955]/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
        }`}
      >
        <div className={`flex items-center gap-2 mb-6 border-b pb-3 ${
          theme === 'dark' ? 'border-white/5 text-white/90' : 'border-black/5 text-black'
        }`}>
          <Terminal className="w-4 h-4 text-primary animate-pulse" style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-[11px] font-bold">
            Terminal Audit
          </h3>
        </div>
        <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-hide space-y-2 animate-pulse">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="font-bold shrink-0 opacity-40" style={{ color: 'var(--color-primary)' }}>
                [--:--:--]
              </span>
              <span className={`h-3 rounded w-full ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`}></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div 
        className={`w-full h-full p-8 flex flex-col justify-center items-center text-center gap-6 rounded-2xl min-h-[350px] transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-[#121014]/98 border border-white/5 backdrop-blur-[24px]' 
            : 'bg-[#FDFFFC] border border-[#454955]/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
        }`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
          theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'
        }`}>
          <History className={`w-6 h-6 ${theme === 'dark' ? 'text-white/60' : 'text-[#454955]/60'}`} />
        </div>
        
        <div className="space-y-1">
          <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#0d0a0b]'}`}>
            No activity yet
          </h3>
          <p className={`text-xs max-w-[280px] leading-relaxed ${theme === 'dark' ? 'text-white/45' : 'text-[#454955]/60'}`}>
            Real-time actions in the workspace will be monitored and displayed here as they happen.
          </p>
        </div>

        {/* Hints grid */}
        <div className={`w-full max-w-[320px] rounded-xl p-4 border text-left space-y-3 ${
          theme === 'dark' 
            ? 'bg-white/[0.02] border-white/5' 
            : 'bg-black/[0.01] border-black/5'
        }`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white/40' : 'text-[#454955]/50'}`}>
            What generates activity?
          </p>
          
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <FileUp className={`w-4 h-4 mt-0.5 shrink-0 ${theme === 'dark' ? 'text-primary' : 'text-blue-600'}`} />
              <div>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-white/80' : 'text-black'}`}>Document Uploads</p>
                <p className={`text-[10px] ${theme === 'dark' ? 'text-white/45' : 'text-gray-500'}`}>Uploading receipts, bids, or disclosures</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <RefreshCw className={`w-4 h-4 mt-0.5 shrink-0 ${theme === 'dark' ? 'text-tertiary' : 'text-orange-600'}`} />
              <div>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-white/80' : 'text-black'}`}>Status & Phase Changes</p>
                <p className={`text-[10px] ${theme === 'dark' ? 'text-white/45' : 'text-gray-500'}`}>Advancing acquisitions or changing deal statuses</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <UserCheck className={`w-4 h-4 mt-0.5 shrink-0 ${theme === 'dark' ? 'text-primary' : 'text-emerald-600'}`} style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-white/80' : 'text-black'}`}>Deal Intake</p>
                <p className={`text-[10px] ${theme === 'dark' ? 'text-white/45' : 'text-gray-500'}`}>Creating new investment deals or leads</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full h-full p-8 flex flex-col overflow-hidden rounded-2xl min-h-[350px] transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-[#121014]/98 border border-white/5 backdrop-blur-[24px]' 
          : 'bg-[#FDFFFC] border border-[#454955]/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
      }`}
    >
      <div className={`flex items-center gap-2 mb-6 border-b pb-3 ${
        theme === 'dark' ? 'border-white/5 text-white/90' : 'border-black/5 text-black'
      }`}>
        <Terminal className="w-4 h-4 shrink-0 text-primary" style={{ color: 'var(--color-primary)' }} />
        <h3 className="font-label-md text-label-md uppercase tracking-widest text-[11px] font-bold">
          Terminal Audit
        </h3>
      </div>
      <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-hide space-y-2.5">
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
    </div>
  );
}
