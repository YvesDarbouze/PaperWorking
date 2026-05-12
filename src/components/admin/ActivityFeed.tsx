'use client';

import React from 'react';
import { UserPlus, ArrowUpCircle, Ticket, UserMinus, CreditCard } from 'lucide-react';
import type { ActivityItem } from '@/lib/admin/mockData';

/* ═══════════════════════════════════════════════════════
   ActivityFeed — Recent platform activity timeline
   ═══════════════════════════════════════════════════════ */

const ICON_MAP: Record<ActivityItem['type'], React.ReactNode> = {
  signup:  <UserPlus className="w-4 h-4" style={{ color: '#22c55e' }} />,
  upgrade: <ArrowUpCircle className="w-4 h-4" style={{ color: '#3b82f6' }} />,
  ticket:  <Ticket className="w-4 h-4" style={{ color: '#f59e0b' }} />,
  churn:   <UserMinus className="w-4 h-4" style={{ color: '#ef4444' }} />,
  payment: <CreditCard className="w-4 h-4" style={{ color: '#ef4444' }} />,
};

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div
      className="p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Recent Activity
      </p>

      <div className="space-y-0">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-start gap-3 py-3"
            style={{
              borderBottom: idx < items.length - 1 ? '1px solid var(--border-ui)' : undefined,
            }}
          >
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              {ICON_MAP[item.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                {item.message}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {item.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
