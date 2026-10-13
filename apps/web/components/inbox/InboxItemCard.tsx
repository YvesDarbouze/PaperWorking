'use client';

import React from 'react';
import type { InboxItemType, InboxThread } from '@/lib/dashboard/shell-seed';
import {
  ArrowsLeftRight,
  Clock,
  Hammer,
  Receipt,
  UserPlus,
  CheckCircle,
  Bank,
  FileText,
  Bell,
  Archive,
  Trash,
} from '@phosphor-icons/react';

function categoryInfo(type: InboxItemType): {
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
} {
  switch (type) {
    case 'PHASE_TRANSITION':
      return { label: 'Phase Change', Icon: ArrowsLeftRight, color: 'text-primary' };
    case 'DEADLINE_ALERT':
      return { label: 'Deadline', Icon: Clock, color: 'text-amber-400' };
    case 'VENDOR_BID':
      return { label: 'Vendor Bid', Icon: Hammer, color: 'text-foreground' };
    case 'RECEIPT_APPROVAL':
      return { label: 'Receipt Approval', Icon: Receipt, color: 'text-foreground' };
    case 'TEAM_INVITE':
      return { label: 'Team', Icon: UserPlus, color: 'text-muted-foreground' };
    case 'TASK_COMPLETE':
      return { label: 'Task', Icon: CheckCircle, color: 'text-primary' };
    case 'INVEST_INVITE':
      return { label: 'Investment', Icon: Bank, color: 'text-foreground' };
    case 'DOCUMENT_SIGNED':
      return { label: 'Document', Icon: FileText, color: 'text-foreground' };
    default:
      return { label: 'System', Icon: Bell, color: 'text-muted-foreground' };
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function InboxItemCard({
  item,
  isUnread,
  isActive,
  onSelect,
  onArchive,
  onDelete,
}: {
  item: InboxThread;
  isUnread: boolean;
  isActive: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const cat = categoryInfo(item.type);
  const Icon = cat.Icon;

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`inbox-thread-${item.id}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group cursor-pointer border-b border-border px-4 py-3.5 transition-colors ${
        isActive ? 'bg-muted/60' : 'hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-border bg-muted ${cat.color}`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            {isUnread ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-none bg-primary" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-none bg-transparent" />
            )}
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cat.label} · {item.project}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
              {relativeTime(item.receivedAt)}
            </span>
          </div>

          <p
            className={`truncate text-sm ${
              isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
            }`}
          >
            {item.subject}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.preview}</p>
        </div>

        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            title="Archive"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="cursor-pointer rounded-none p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <Archive size={16} />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="cursor-pointer rounded-none p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
