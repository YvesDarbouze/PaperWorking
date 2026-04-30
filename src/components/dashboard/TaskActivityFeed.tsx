'use client';

import React from 'react';
import {
  Clock,
  FileText,
  ArrowRight,
  DollarSign,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   TaskActivityFeed — Chronological Event List

   A reusable, props-driven activity feed for the dashboard
   "Task/Workflow Overview" area. Accepts an array of event
   objects and renders them as a vertical timeline.

   Palette:
     bg     → --bg-surface (card wrapper)
     border → --border-ui
     text   → --text-primary / --text-secondary
   ═══════════════════════════════════════════════════════════════ */

/* ── Public event interface ── */
export interface FeedEvent {
  /** Unique identifier */
  id: string;
  /** ISO string or Date */
  timestamp: string | Date;
  /** Controls the leading icon */
  eventType:
    | 'deal_created'
    | 'phase_change'
    | 'ledger_item'
    | 'member_joined'
    | 'deal_sold'
    | 'task_completed'
    | 'warning'
    | 'comment'
    | 'general';
  /** Human-readable description */
  description: string;
}

/* ── Icon map ── */
const EVENT_ICON_MAP: Record<FeedEvent['eventType'], LucideIcon> = {
  deal_created:   FileText,
  phase_change:   ArrowRight,
  ledger_item:    DollarSign,
  member_joined:  Users,
  deal_sold:      Activity,
  task_completed: CheckCircle2,
  warning:        AlertTriangle,
  comment:        MessageSquare,
  general:        Activity,
};

/* ── Relative time formatter ── */
function formatRelativeTime(raw: string | Date): string {
  const date = raw instanceof Date ? raw : new Date(raw);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Single event row ── */
function EventRow({ event, isLast }: { event: FeedEvent; isLast: boolean }) {
  const Icon = EVENT_ICON_MAP[event.eventType] ?? Activity;

  return (
    <div className="flex gap-3 group">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:shadow-sm"
          style={{
            background: 'var(--bg-canvas)',
            color: 'var(--text-secondary)',
          }}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        {/* Connector line */}
        {!isLast && (
          <div
            className="w-px flex-1 my-1"
            style={{ background: 'var(--border-ui)', opacity: 0.4 }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-5">
        <p
          className="text-sm leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {event.description}
        </p>
        <p
          className="text-[10px] font-medium mt-1 uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
        >
          {formatRelativeTime(event.timestamp)}
        </p>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <Clock
          className="w-5 h-5"
          style={{ color: 'var(--text-secondary)' }}
          aria-hidden="true"
        />
      </div>
      <p
        className="text-xs font-bold uppercase tracking-[0.18em] mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        No Recent Activity
      </p>
      <p
        className="text-[11px] max-w-[240px] leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        No recent project activity.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════
   TaskActivityFeed (default export)
   ══════════════════════════════════════════ */

export interface TaskActivityFeedProps {
  /** Array of events to display — most recent first */
  events: FeedEvent[];
  /** Optional max items to render (default: 10) */
  maxItems?: number;
}

export default function TaskActivityFeed({
  events,
  maxItems = 10,
}: TaskActivityFeedProps) {
  const visible = events.slice(0, maxItems);

  return (
    <article
      className="rounded-lg p-6"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Recent Activity
        </h2>
        {visible.length > 0 && (
          <span
            className="text-[10px] font-medium tabular-nums"
            style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
          >
            {visible.length} event{visible.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Feed body */}
      {visible.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div>
          {visible.map((event, idx) => (
            <EventRow
              key={event.id}
              event={event}
              isLast={idx === visible.length - 1}
            />
          ))}
        </div>
      )}
    </article>
  );
}
