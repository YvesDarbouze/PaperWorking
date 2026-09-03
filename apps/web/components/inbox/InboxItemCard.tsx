'use client';

import type { InboxItemType, InboxThread } from '@/lib/inbox/types';

function categoryInfo(type: InboxItemType): { label: string; icon: string; color: string } {
  switch (type) {
    case 'PHASE_TRANSITION':
      return { label: 'Phase Change', icon: 'swap_horiz', color: 'text-emerald-400' };
    case 'DEADLINE_ALERT':
      return { label: 'Deadline', icon: 'alarm', color: 'text-amber-400' };
    case 'VENDOR_BID':
      return { label: 'Vendor Bid', icon: 'engineering', color: 'text-[#ebbf85]' };
    case 'RECEIPT_APPROVAL':
      return { label: 'Receipt Approval', icon: 'receipt_long', color: 'text-[#7A9EAA]' };
    case 'TEAM_INVITE':
      return { label: 'Team', icon: 'group_add', color: 'text-[#9E9DA0]' };
    case 'TASK_COMPLETE':
      return { label: 'Task', icon: 'check_circle', color: 'text-emerald-400' };
    case 'INVEST_INVITE':
      return { label: 'Investment', icon: 'account_balance', color: 'text-[#7A9EAA]' };
    case 'DOCUMENT_SIGNED':
      return { label: 'Document', icon: 'description', color: 'text-[#7A9EAA]' };
    default:
      return { label: 'System', icon: 'notifications', color: 'text-[#9E9DA0]' };
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

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`inbox-item-${item.id}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group cursor-pointer border-b border-white/5 px-4 py-3.5 transition-colors ${
        isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d0a0b]/60 ${cat.color}`}
        >
          <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            {isUnread ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-transparent" />
            )}
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {cat.label} · {item.project}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10px] text-white/35">
              {relativeTime(item.receivedAt)}
            </span>
          </div>

          <p
            className={`truncate text-sm ${
              isUnread ? 'font-semibold text-white' : 'font-medium text-white/75'
            }`}
          >
            {item.subject}
          </p>
          <p className="mt-0.5 truncate text-xs text-white/45">{item.preview}</p>
        </div>

        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            title="Archive"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]">archive</span>
          </button>
          <button
            type="button"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] hover:bg-white/10 hover:text-red-400"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
