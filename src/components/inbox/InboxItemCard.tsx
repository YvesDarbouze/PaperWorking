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
import UnattributedTransactionCard from './UnattributedTransactionCard';
import MissedRentAlertCard from './MissedRentAlertCard';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { inboxTokens, type InboxTokens } from './inboxTheme';

/* ═══════════════════════════════════════════════════════
   InboxItemCard — Dense list row for triage scanning
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

type CatTone = 'alert' | 'finance' | 'vendor' | 'neutral' | 'accent';

function getCategoryInfo(type: NotificationType): {
  label: string;
  icon: string;
  tone: CatTone;
} {
  switch (type) {
    case 'PHASE_TRANSITION':
      return { label: 'Phase change', icon: 'swap_horiz', tone: 'accent' };
    case 'DEADLINE_ALERT':
      return { label: 'Deadline', icon: 'alarm', tone: 'alert' };
    case 'OVER_IMPROVEMENT_ALERT':
      return { label: 'Over-improvement', icon: 'warning', tone: 'alert' };
    case 'BURN_RATE_WARNING':
      return { label: 'Burn rate', icon: 'local_fire_department', tone: 'alert' };
    case 'BILLING_CHARGED':
      return { label: 'Billing', icon: 'credit_card', tone: 'finance' };
    case 'RECEIPT_APPROVAL':
      return { label: 'Receipt', icon: 'receipt_long', tone: 'finance' };
    case 'INVEST_INVITE':
      return { label: 'Investment', icon: 'account_balance', tone: 'finance' };
    case 'VENDOR_BID':
      return { label: 'Vendor bid', icon: 'engineering', tone: 'vendor' };
    case 'VENDOR_LEAD':
      return { label: 'Vendor lead', icon: 'storefront', tone: 'vendor' };
    case 'TEAM_INVITE':
      return { label: 'Team invite', icon: 'group_add', tone: 'neutral' };
    case 'TEAM_INVITE_REMINDER':
      return { label: 'Invite reminder', icon: 'notifications_active', tone: 'neutral' };
    case 'LENDER_CHECKLIST_REMINDER':
      return { label: 'Lender vault', icon: 'folder_shared', tone: 'finance' };
    case 'TASK_COMPLETE':
      return { label: 'Task complete', icon: 'check_circle', tone: 'neutral' };
    case 'TASK_ASSIGNED':
      return { label: 'Task assigned', icon: 'assignment_ind', tone: 'neutral' };
    case 'DOCUMENT_SIGNED':
      return { label: 'Document', icon: 'description', tone: 'neutral' };
    case 'unattributed_transaction':
      return { label: 'Needs attribution', icon: 'account_balance_wallet', tone: 'finance' };
    case 'missed_rent':
      return { label: 'Rent overdue', icon: 'warning', tone: 'alert' };
    default:
      return { label: 'Notification', icon: 'notifications', tone: 'neutral' };
  }
}

function toneColors(tone: CatTone, t: InboxTokens) {
  switch (tone) {
    case 'alert':
      return { fg: t.alert, bg: t.alertMuted };
    case 'finance':
      return { fg: t.finance, bg: t.financeMuted };
    case 'vendor':
      return { fg: t.vendor, bg: t.vendorMuted };
    case 'accent':
      return { fg: t.accent, bg: t.accentMuted };
    default:
      return { fg: t.muted, bg: t.hover };
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
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
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const cat = getCategoryInfo(item.type);
  const tone = toneColors(cat.tone, t);

  const isActionable = [
    'VENDOR_BID',
    'RECEIPT_APPROVAL',
    'INVEST_INVITE',
    'TEAM_INVITE',
    'TEAM_INVITE_REMINDER',
    'unattributed_transaction',
    'missed_rent'
  ].includes(item.type);

  const handleClick = (e: React.MouseEvent) => {
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

  const rowBg = isActive
    ? t.activeBg
    : !item.read
    ? t.unreadBg
    : 'transparent';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      id={`inbox-item-${item.id}`}
      onClick={handleClick}
      className="group relative flex flex-col cursor-pointer transition-colors"
      style={{
        background: rowBg,
        borderBottom: `1px solid ${t.divider}`,
        borderLeft: isActive ? `3px solid ${t.activeBorder}` : '3px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = t.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = rowBg;
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div
          className={`flex-shrink-0 flex items-center justify-center transition-all mt-1 ${
            showCheckbox ? 'w-5 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(item.id);
          }}
        >
          <Checkbox
            checked={isSelected}
            onChange={() => {}}
          />
        </div>

        {!item.read && (
          <span
            className="absolute left-1.5 top-[22px] w-1.5 h-1.5 rounded-full"
            style={{ background: t.accent }}
            aria-hidden
          />
        )}

        <div
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
          style={{ background: tone.bg, color: tone.fg, borderRadius: 2 }}
        >
          <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide truncate"
                style={{ color: tone.fg }}
              >
                {cat.label}
              </span>
              {item.objectReference.dealAddress && (
                <span
                  className="text-[11px] truncate max-w-[140px]"
                  style={{ color: t.muted }}
                >
                  {item.objectReference.dealAddress}
                </span>
              )}
            </div>
            <span
              className="flex-shrink-0 text-[11px] tabular-nums"
              style={{ color: t.muted }}
            >
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>

          <p
            className="text-[13px] leading-snug truncate mb-0.5"
            style={{
              color: t.heading,
              fontWeight: item.read ? 500 : 600,
            }}
          >
            {item.title}
          </p>

          <p
            className="text-[12px] leading-relaxed line-clamp-1"
            style={{ color: t.muted }}
          >
            {item.body}
          </p>

          <div className="flex items-center gap-2 mt-1.5">
            {item.actor.avatarUrl && !imageError ? (
              <img
                src={item.actor.avatarUrl}
                alt=""
                loading="lazy"
                onError={() => setImageError(true)}
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : null}
            <span className="text-[11px] truncate" style={{ color: t.muted }}>
              {item.actor.name}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {isActionable && (
            <button
              onClick={toggleExpand}
              className="p-1.5 transition-colors"
              style={{ color: t.muted, borderRadius: 2 }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!item.read) onMarkRead(item.id);
              router.push(item.deepLinkUrl);
            }}
            className="p-1.5 transition-colors"
            style={{ color: t.muted, borderRadius: 2 }}
            title="Open details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          {!item.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(item.id);
              }}
              className="p-1.5 transition-colors"
              style={{ color: t.muted, borderRadius: 2 }}
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(item.id);
            }}
            className="p-1.5 transition-colors"
            style={{ color: t.muted, borderRadius: 2 }}
            title="Archive"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 transition-colors"
            style={{ color: t.muted, borderRadius: 2 }}
            title="Delete"
            onMouseEnter={(e) => { e.currentTarget.style.color = t.danger; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.muted; }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isActionable && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden px-4 pb-3"
            style={{ borderTop: `1px solid ${t.divider}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-3 flex flex-col gap-3">
              {item.type === 'unattributed_transaction' ? (
                <UnattributedTransactionCard
                  item={item}
                  onAssignComplete={async () => {
                    await onArchive(item.id);
                  }}
                />
              ) : item.type === 'missed_rent' ? (
                <MissedRentAlertCard
                  item={item}
                  onActionComplete={async () => {
                    await onArchive(item.id);
                  }}
                />
              ) : (
                <>
                  <div
                    className="text-xs space-y-2 p-3"
                    style={{
                      background: t.inputBg,
                      border: `1px solid ${t.border}`,
                      borderRadius: 2,
                      color: t.body,
                    }}
                  >
                    {item.type === 'VENDOR_BID' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: t.accent }}>Bid details</span>
                        <p>Vendor: <strong style={{ color: t.heading }}>{item.objectReference.vendor || item.actor.name}</strong></p>
                        <p>Amount: <strong style={{ color: t.heading }}>{item.objectReference.amount || 'N/A'}</strong></p>
                        <p>Project: <strong style={{ color: t.heading }}>{item.objectReference.dealAddress || 'N/A'}</strong></p>
                      </div>
                    )}
                    {item.type === 'RECEIPT_APPROVAL' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: t.accent }}>Receipt</span>
                        <p>Uploader: <strong style={{ color: t.heading }}>{item.actor.name}</strong></p>
                        <p>Amount: <strong style={{ color: t.heading }}>{item.objectReference.amount || 'N/A'}</strong></p>
                        <p>Project: <strong style={{ color: t.heading }}>{item.objectReference.dealAddress || 'N/A'}</strong></p>
                      </div>
                    )}
                    {item.type === 'INVEST_INVITE' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: t.accent }}>Co-investment</span>
                        <p>Deal: <strong style={{ color: t.heading }}>{item.objectReference.dealAddress || 'N/A'}</strong></p>
                        <p>Sponsor: <strong style={{ color: t.heading }}>{item.actor.name}</strong></p>
                      </div>
                    )}
                    {['TEAM_INVITE', 'TEAM_INVITE_REMINDER'].includes(item.type) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: t.accent }}>Team</span>
                        <p>Organization: <strong style={{ color: t.heading }}>{item.objectReference.organizationName || 'N/A'}</strong></p>
                        <p>Inviter: <strong style={{ color: t.heading }}>{item.actor.name}</strong></p>
                      </div>
                    )}
                    {item.type === 'VENDOR_LEAD' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: t.accent }}>Lead</span>
                        <p>Investor: <strong style={{ color: t.heading }}>{item.actor.name}</strong></p>
                        <p>Project: <strong style={{ color: t.heading }}>{item.objectReference.dealAddress || 'N/A'}</strong></p>
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
                      className="px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: t.ctaBg, color: t.ctaFg, borderRadius: 2 }}
                    >
                      {item.type === 'VENDOR_BID' ? 'Approve bid' : item.type === 'RECEIPT_APPROVAL' ? 'Approve receipt' : 'Accept'}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(item.deepLinkUrl);
                      }}
                      className="px-3 py-1.5 text-[11px] font-semibold transition-colors"
                      style={{
                        border: `1px solid ${t.border}`,
                        borderRadius: 2,
                        color: t.heading,
                        background: 'transparent',
                      }}
                    >
                      View details
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
