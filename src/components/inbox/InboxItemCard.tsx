'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, Trash2, ExternalLink, Check, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Notification, NotificationType } from '@/types/notification';
import {
  Bell,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText,
  CreditCard,
  PlusCircle,
  AlertTriangle,
  Flame,
  Wrench,
  LucideIcon
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   InboxItemCard — Individual notification card renderer
   ═══════════════════════════════════════════════════════ */

interface InboxItemCardProps {
  item: Notification;
  onMarkRead: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
}

const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  {
    label: string;
    Icon: LucideIcon;
    color: string;
    bgColor: string;
  }
> = {
  VENDOR_BID: { label: 'Vendor Bid', Icon: Wrench, color: '#595959', bgColor: '#F2F2F2' },
  INVEST_INVITE: { label: 'Co-Invest Invite', Icon: TrendingUp, color: '#0d0d0d', bgColor: '#F2F2F2' },
  TASK_COMPLETE: { label: 'Task Complete', Icon: CheckCircle, color: '#16a34a', bgColor: '#f0fdf4' },
  PHASE_TRANSITION: { label: 'Phase Change', Icon: Bell, color: '#7F7F7F', bgColor: '#F2F2F2' },
  DEADLINE_ALERT: { label: 'Deadline', Icon: Clock, color: '#dc2626', bgColor: '#fef2f2' },
  BILLING_CHARGED: { label: 'Billing Renewed', Icon: CreditCard, color: '#595959', bgColor: '#F2F2F2' },
  DOCUMENT_SIGNED: { label: 'Doc Signed', Icon: FileText, color: '#16a34a', bgColor: '#f0fdf4' },
  RECEIPT_APPROVAL: { label: 'Receipt Uploaded', Icon: FileText, color: '#1a73e8', bgColor: '#e8f0fe' },
  TEAM_INVITE: { label: 'Team Invite', Icon: PlusCircle, color: '#1a73e8', bgColor: '#e8f0fe' },
  OVER_IMPROVEMENT_ALERT: { label: 'Over-Improvement', Icon: AlertTriangle, color: '#dc2626', bgColor: '#fef2f2' },
  BURN_RATE_WARNING: { label: 'Burn Rate Alert', Icon: Flame, color: '#dc2626', bgColor: '#fef2f2' },
  VENDOR_LEAD: { label: 'New Lead', Icon: Bell, color: '#1a73e8', bgColor: '#e8f0fe' },
  TEAM_INVITE_REMINDER: { label: 'Invite Reminder', Icon: Bell, color: '#1a73e8', bgColor: '#e8f0fe' }
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function InboxItemCard({
  item,
  onMarkRead,
  onArchive,
  onDelete,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false
}: InboxItemCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const meta = NOTIFICATION_TYPE_META[item.type] || {
    label: 'Notification',
    Icon: Bell,
    color: '#7F7F7F',
    bgColor: '#F2F2F2'
  };

  const IconComponent = meta.Icon;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent double routing if clicked on action buttons
    if ((e.target as HTMLElement).closest('button')) return;

    if (!item.read) {
      onMarkRead(item.id);
    }
    router.push(item.deepLinkUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      id={`inbox-item-${item.id}`}
      onClick={handleClick}
      className="group relative flex gap-3.5 px-6 py-4 transition-colors border-b"
      style={{
        cursor: 'pointer',
        backgroundColor: item.read ? 'transparent' : 'rgba(26, 115, 232, 0.03)',
        borderColor: 'var(--border-ui)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-canvas)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = item.read
          ? 'transparent'
          : 'rgba(26, 115, 232, 0.03)';
      }}
    >
      {/* Checkbox for selection */}
      <div 
        className={`flex-shrink-0 flex items-center justify-center transition-all ${
          showCheckbox ? 'w-5 opacity-100 mr-2' : 'w-0 opacity-0 overflow-hidden'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect?.(item.id);
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // click event is intercepted by parent div click handler
          className="w-3.5 h-3.5 accent-[#0d0d0d] cursor-pointer"
        />
      </div>

      {/* Unread indicator dot */}
      {!item.read && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#1a73e8' }}
        />
      )}

      {/* Category icon badge */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 border"
        style={{
          backgroundColor: meta.bgColor,
          borderColor: 'var(--border-ui)',
        }}
      >
        <IconComponent
          className="w-4 h-4"
          style={{ color: meta.color }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row: actor + time */}
        <div className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Actor avatar lazy loaded */}
            {item.actor.avatarUrl && !imageError ? (
              <img
                src={item.actor.avatarUrl}
                alt={item.actor.name}
                loading="lazy"
                onError={() => setImageError(true)}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: '#0d0d0d',
                  color: '#ffffff',
                }}
              >
                {item.actor.name[0]?.toUpperCase() || 'P'}
              </span>
            )}
            <span
              className="text-xs font-semibold truncate"
              style={{ color: item.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}
            >
              {item.actor.name}
            </span>
            {item.objectReference.dealAddress && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[150px]"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  color: 'var(--text-secondary)',
                }}
              >
                {item.objectReference.dealAddress}
              </span>
            )}
          </div>
          <span
            className="flex-shrink-0 text-[10px] tabular-nums"
            style={{ color: 'var(--text-secondary)' }}
          >
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        {/* Title */}
        <p
          className="text-[13px] leading-snug mb-0.5 truncate"
          style={{
            fontWeight: item.read ? 400 : 600,
            color: 'var(--text-primary)',
          }}
        >
          {item.title}
        </p>

        {/* Body preview */}
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {item.body}
        </p>

        {/* Dynamic Category Tag */}
        <span
          className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: meta.bgColor,
            color: meta.color,
            border: `1px solid var(--border-ui)`
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        {/* Deep link button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!item.read) onMarkRead(item.id);
            router.push(item.deepLinkUrl);
          }}
          className="p-1.5 rounded-md transition-colors hover:bg-neutral-200"
          style={{ color: 'var(--text-secondary)' }}
          title="Open Project"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {/* Mark Read/Unread toggler */}
        {!item.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(item.id);
            }}
            className="p-1.5 rounded-md transition-colors hover:bg-neutral-200"
            style={{ color: 'var(--text-secondary)' }}
            title="Mark as Read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Archive Action */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive(item.id);
          }}
          className="p-1.5 rounded-md transition-colors hover:bg-neutral-200"
          style={{ color: 'var(--text-secondary)' }}
          title="Archive"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>

        {/* Delete Action */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="p-1.5 rounded-md transition-colors hover:bg-neutral-200 hover:text-red-500"
          style={{ color: 'var(--text-secondary)' }}
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
