'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Trash2, ExternalLink, Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '../ui';
import { Notification, NotificationType } from '@/types/notification';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { executeInboxAction } from '@/lib/services/inboxActionExecutor';

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
  isActive?: boolean;
  onSelect?: () => void;
}

function getCategoryInfo(type: NotificationType) {
  switch (type) {
    case 'PHASE_TRANSITION':
      return {
        label: 'Phase Change',
        icon: 'swap_horiz',
        theme: 'deals',
        iconClass: 'bg-primary/10 border-primary/20 text-primary',
      };
    case 'DEADLINE_ALERT':
      return {
        label: 'Deadline',
        icon: 'alarm',
        theme: 'deals',
        iconClass: 'bg-primary/10 border-primary/20 text-primary',
      };
    case 'OVER_IMPROVEMENT_ALERT':
      return {
        label: 'Over-Improvement',
        icon: 'warning',
        theme: 'deals',
        iconClass: 'bg-primary/10 border-primary/20 text-primary',
      };
    case 'BURN_RATE_WARNING':
      return {
        label: 'Burn Rate Alert',
        icon: 'local_fire_department',
        theme: 'deals',
        iconClass: 'bg-primary/10 border-primary/20 text-primary',
      };
    case 'BILLING_CHARGED':
      return {
        label: 'Billing Charged',
        icon: 'credit_card',
        theme: 'finance',
        iconClass: 'bg-[#7A9EAA]/10 border-[#7A9EAA]/20 text-[#7A9EAA]',
      };
    case 'RECEIPT_APPROVAL':
      return {
        label: 'Receipt Approval',
        icon: 'receipt_long',
        theme: 'finance',
        iconClass: 'bg-[#7A9EAA]/10 border-[#7A9EAA]/20 text-[#7A9EAA]',
      };
    case 'INVEST_INVITE':
      return {
        label: 'Investment Invite',
        icon: 'account_balance',
        theme: 'finance',
        iconClass: 'bg-[#7A9EAA]/10 border-[#7A9EAA]/20 text-[#7A9EAA]',
      };
    case 'VENDOR_BID':
      return {
        label: 'Vendor Bid',
        icon: 'engineering',
        theme: 'vendors',
        iconClass: 'bg-[#ebbf85]/10 border-[#ebbf85]/20 text-[#ebbf85]',
      };
    case 'VENDOR_LEAD':
      return {
        label: 'Vendor Lead',
        icon: 'storefront',
        theme: 'vendors',
        iconClass: 'bg-[#ebbf85]/10 border-[#ebbf85]/20 text-[#ebbf85]',
      };
    case 'TEAM_INVITE':
      return {
        label: 'Team Invite',
        icon: 'group_add',
        theme: 'team',
        iconClass: 'bg-white/5 border border-white/10 text-[#9E9DA0]',
      };
    case 'TEAM_INVITE_REMINDER':
      return {
        label: 'Invite Reminder',
        icon: 'notifications_active',
        theme: 'team',
        iconClass: 'bg-white/5 border border-white/10 text-[#9E9DA0]',
      };
    case 'TASK_COMPLETE':
      return {
        label: 'Task Complete',
        icon: 'check_circle',
        theme: 'team',
        iconClass: 'bg-white/5 border border-white/10 text-[#9E9DA0]',
      };
    case 'TASK_ASSIGNED':
      return {
        label: 'Task Assigned',
        icon: 'assignment_ind',
        theme: 'team',
        iconClass: 'bg-white/5 border border-white/10 text-[#9E9DA0]',
      };
    case 'DOCUMENT_SIGNED':
      return {
        label: 'Document Signed',
        icon: 'description',
        theme: 'team',
        iconClass: 'bg-white/5 border border-white/10 text-[#9E9DA0]',
      };
    default:
      return {
        label: 'System Notification',
        icon: 'notifications',
        theme: 'team',
        iconClass: 'bg-white/5 border border-white/10 text-[#9E9DA0]',
      };
  }
}

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
  showCheckbox = false,
  isActive = false,
  onSelect
}: InboxItemCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const cat = getCategoryInfo(item.type);

  const isActionable = [
    'VENDOR_BID',
    'RECEIPT_APPROVAL',
    'INVEST_INVITE',
    'TEAM_INVITE',
    'TEAM_INVITE_REMINDER',
    'VENDOR_LEAD'
  ].includes(item.type);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent double routing if clicked on action buttons
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;

    if (!item.read) {
      onMarkRead(item.id);
    }

    if (onSelect) {
      onSelect();
    } else {
      if (isActionable) {
        setIsExpanded(!isExpanded);
      } else {
        router.push(item.deepLinkUrl);
      }
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      id={`inbox-item-${item.id}`}
      onClick={handleClick}
      className={`group relative flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-300 ${
        isActive
          ? 'bg-[#0d0a0b]/80 border-[#454955]/50 shadow-[0_0_15px_-5px_rgba(69,73,85,0.3)]'
          : item.read
          ? 'glass-card border-white/5 bg-[#0d0a0b]/20 hover:bg-white/5'
          : 'glass-card border-[#454955]/20 bg-[#0d0a0b]/40 ring-1 ring-[#454955]/10 shadow-[0_0_15px_-5px_rgba(69, 73, 85,0.15)] hover:border-[#454955]/30'
      }`}
      style={{ cursor: 'pointer' }}
    >
      {/* Top Main Block */}
      <div className="flex items-start gap-3.5">
        {/* Checkbox for selection */}
        <div 
          className={`flex-shrink-0 flex items-center justify-center transition-all mt-1 ${
            showCheckbox ? 'w-5 opacity-100 mr-1.5' : 'w-0 opacity-0 overflow-hidden'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(item.id);
          }}
        >
          <Checkbox
            checked={isSelected}
            onChange={() => {}} // click event is intercepted by parent div click handler
          />
        </div>

        {/* Unread indicator dot */}
        {!item.read && (
          <span
            className="absolute left-2 top-7 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(69, 73, 85,0.8)]"
          />
        )}

        {/* Category icon badge */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${cat.iconClass}`}
        >
          <span className="material-symbols-outlined text-xl">{cat.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row: actor + time */}
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              {/* Actor avatar lazy loaded */}
              {item.actor.avatarUrl && !imageError ? (
                <img
                  src={item.actor.avatarUrl}
                  alt={item.actor.name}
                  loading="lazy"
                  onError={() => setImageError(true)}
                  className="w-5 h-5 rounded-full object-cover border border-white/10"
                />
              ) : (
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/20 text-primary border border-primary/30"
                >
                  {item.actor.name[0]?.toUpperCase() || 'P'}
                </span>
              )}
              <span
                className={`text-xs font-semibold truncate ${item.read ? 'text-[#9E9DA0]' : 'text-white'}`}
              >
                {item.actor.name}
              </span>
              {item.objectReference.dealAddress && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg truncate max-w-[160px] bg-white/5 text-[#9E9DA0] border border-white/5"
                >
                  {item.objectReference.dealAddress}
                </span>
              )}
            </div>
            <span
              className="flex-shrink-0 text-[10px] text-[#9E9DA0] tabular-nums"
            >
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>

          {/* Title */}
          <p
            className={`text-sm leading-snug mb-1 truncate ${
              item.read ? 'text-[#9E9DA0] font-medium' : 'text-white font-bold'
            }`}
          >
            {item.title}
          </p>

          {/* Body preview */}
          <p
            className="text-xs leading-relaxed text-[#9E9DA0] line-clamp-2"
          >
            {item.body}
          </p>

          {/* Dynamic Category Tag */}
          <span
            className={`inline-block mt-2 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${cat.iconClass}`}
          >
            {cat.label}
          </span>
        </div>

        {/* Action buttons (visible on hover) */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2">
          {/* Chevron expand for actionable items */}
          {isActionable && (
            <button
              onClick={toggleExpand}
              className="p-1.5 rounded-xl transition-all hover:bg-white/10 text-[#9E9DA0] hover:text-white active:scale-95"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Deep link button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!item.read) onMarkRead(item.id);
              router.push(item.deepLinkUrl);
            }}
            className="p-1.5 rounded-xl transition-all hover:bg-white/10 text-[#9E9DA0] hover:text-white active:scale-95"
            title="Open Details"
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
              className="p-1.5 rounded-xl transition-all hover:bg-white/10 text-[#9E9DA0] hover:text-white active:scale-95"
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
            className="p-1.5 rounded-xl transition-all hover:bg-white/10 text-[#9E9DA0] hover:text-white active:scale-95"
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
            className="p-1.5 rounded-xl transition-all hover:bg-white/10 hover:text-red-400 text-[#9E9DA0] active:scale-95"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline detail expansion drawer */}
      <AnimatePresence>
        {isActionable && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/5 pt-4 flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking details
          >
            <div className="text-xs text-[#9E9DA0] bg-white/5 rounded-xl p-3.5 space-y-2 border border-white/5">
              {item.type === 'VENDOR_BID' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Bid Details</span>
                  <p>Vendor: <strong className="text-white">{item.objectReference.vendor || item.actor.name}</strong></p>
                  <p>Amount: <strong className="text-white">{item.objectReference.amount || 'N/A'}</strong></p>
                  <p>Project: <strong className="text-white">{item.objectReference.dealAddress || 'N/A'}</strong></p>
                </div>
              )}
              {item.type === 'RECEIPT_APPROVAL' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Receipt Verification</span>
                  <p>Uploader: <strong className="text-white">{item.actor.name}</strong></p>
                  <p>Amount: <strong className="text-white">{item.objectReference.amount || 'N/A'}</strong></p>
                  <p>Project: <strong className="text-white">{item.objectReference.dealAddress || 'N/A'}</strong></p>
                </div>
              )}
              {item.type === 'INVEST_INVITE' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Syndication Opportunity</span>
                  <p>Deal: <strong className="text-white">{item.objectReference.dealAddress || 'N/A'}</strong></p>
                  <p>Sponsor: <strong className="text-white">{item.actor.name}</strong></p>
                </div>
              )}
              {['TEAM_INVITE', 'TEAM_INVITE_REMINDER'].includes(item.type) && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Team Membership</span>
                  <p>Organization: <strong className="text-white">{item.objectReference.organizationName || 'N/A'}</strong></p>
                  <p>Inviter: <strong className="text-white">{item.actor.name}</strong></p>
                </div>
              )}
              {item.type === 'VENDOR_LEAD' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Lead Inquiry</span>
                  <p>Investor: <strong className="text-white">{item.actor.name}</strong></p>
                  <p>Project: <strong className="text-white">{item.objectReference.dealAddress || 'N/A'}</strong></p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                disabled={isExecuting}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!user) {
                    toast.error('Not authenticated');
                    return;
                  }
                  setIsExecuting(true);
                  const actionPromise = (async () => {
                    const idToken = await user.getIdToken();
                    const res = await executeInboxAction(item, idToken, user.email || '');
                    if (res.success) {
                      if (!item.read) await onMarkRead(item.id);
                    }
                    return res.message;
                  })();

                  toast.promise(actionPromise, {
                    loading: 'Executing action...',
                    success: (msg) => msg,
                    error: (err) => err.message || 'Failed to execute action.',
                  });

                  try {
                    await actionPromise;
                    setIsExpanded(false);
                  } catch (err) {
                    console.error('[InboxItemCard] Action error:', err);
                  } finally {
                    setIsExecuting(false);
                  }
                }}
                className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-primary text-on-primary hover:brightness-110 active:scale-97 transition-all luminous-glow disabled:opacity-50"
              >
                {item.type === 'VENDOR_BID' ? 'Approve Bid' : item.type === 'RECEIPT_APPROVAL' ? 'Approve Receipt' : 'Accept'}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(item.deepLinkUrl);
                }}
                className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[#9E9DA0] transition-all active:scale-97"
              >
                View Details
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

