'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '../ui';
import { Notification } from '@/types/notification';
import { InboxTabType } from '@/hooks/useInboxFeed';
import InboxItemCard from './InboxItemCard';
import InboxEmptyState from './InboxEmptyState';
import { NotificationType } from '@/types/notification';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { inboxTokens } from './inboxTheme';

/* ═══════════════════════════════════════════════════════
   InboxFeed — Infinite scroll notification feed
   ═══════════════════════════════════════════════════════ */

interface InboxFeedProps {
  items: Notification[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  activeTab: InboxTabType;
  onMarkRead: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkArchive: (itemsToArchive: { id: string; wasUnread: boolean; type: NotificationType }[]) => Promise<void>;
  onBulkMarkRead: (itemsToMark: { id: string; type: NotificationType }[]) => Promise<void>;
  fetchMore: () => void;
  hasMore: boolean;
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
}

function FeedSkeleton() {
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');

  return (
    <div className="py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 px-4 py-3.5 animate-pulse"
          style={{ borderBottom: `1px solid ${t.divider}` }}
        >
          <div className="w-8 h-8 rounded shrink-0" style={{ background: t.hover }} />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="flex gap-2">
              <div className="w-14 h-2.5 rounded" style={{ background: t.hover }} />
              <div className="ml-auto w-10 h-2.5 rounded" style={{ background: t.hover }} />
            </div>
            <div className="h-3 w-3/4 rounded" style={{ background: t.hover }} />
            <div className="h-2.5 w-1/2 rounded" style={{ background: t.hover }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InboxFeed({
  items,
  loading,
  loadingMore,
  error,
  activeTab,
  onMarkRead,
  onArchive,
  onDelete,
  onBulkArchive,
  onBulkMarkRead,
  fetchMore,
  hasMore,
  selectedItemId,
  onSelectItem,
}: InboxFeedProps) {
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds([]);
  }, [activeTab]);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleBulkMarkRead = async () => {
    const unreadSelected = items
      .filter((item) => selectedIds.includes(item.id) && !item.read)
      .map((item) => ({ id: item.id, type: item.type }));

    if (unreadSelected.length > 0) {
      await onBulkMarkRead(unreadSelected);
    }
    setSelectedIds([]);
  };

  const handleBulkArchive = async () => {
    const selectedItems = items
      .filter((item) => selectedIds.includes(item.id))
      .map((item) => ({ id: item.id, wasUnread: !item.read, type: item.type }));

    if (selectedItems.length > 0) {
      await onBulkArchive(selectedItems);
    }
    setSelectedIds([]);
  };

  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, hasMore, fetchMore]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  if (loading && items.length === 0) {
    return <FeedSkeleton />;
  }

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <AlertCircle className="w-7 h-7 mb-3" style={{ color: t.danger }} />
        <h3 className="text-sm font-semibold mb-1" style={{ color: t.heading }}>
          Couldn’t load inbox
        </h3>
        <p className="text-xs max-w-xs" style={{ color: t.muted }}>
          {error}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return <InboxEmptyState activeTab={activeTab} />;
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col relative min-h-0">
      {items.length > 0 && (
        <div
          className="flex items-center px-4 py-2 sticky top-0 z-10 shrink-0"
          style={{
            background: t.listBg,
            borderBottom: `1px solid ${t.divider}`,
          }}
        >
          <label
            className="flex items-center gap-2 text-[11px] font-medium cursor-pointer transition-colors"
            style={{ color: t.muted }}
          >
            <Checkbox
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            {allSelected ? 'Deselect all' : 'Select'}
          </label>
        </div>
      )}

      <div className="flex-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <InboxItemCard
              key={item.id}
              item={item}
              onMarkRead={onMarkRead}
              onArchive={onArchive}
              onDelete={onDelete}
              isSelected={selectedIds.includes(item.id)}
              onToggleSelect={handleToggleSelect}
              showCheckbox={selectedIds.length > 0}
              isActive={selectedItemId === item.id}
              onSelect={() => onSelectItem?.(item.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="sticky bottom-3 mx-3 z-50 flex items-center justify-between px-4 py-2.5"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 2,
              boxShadow: t.elevShadow,
              color: t.body,
            }}
          >
            <span className="text-xs font-medium" style={{ color: t.heading }}>
              {selectedIds.length} selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkMarkRead}
                className="px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                style={{
                  border: `1px solid ${t.border}`,
                  borderRadius: 2,
                  color: t.heading,
                  background: 'transparent',
                }}
              >
                Mark read
              </button>
              <button
                onClick={handleBulkArchive}
                className="px-2.5 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: t.ctaBg,
                  color: t.ctaFg,
                  borderRadius: 2,
                }}
              >
                Archive
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-[11px] font-medium px-2 py-1 transition-colors"
                style={{ color: t.muted }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center p-4 min-h-[40px]"
        >
          {loadingMore && (
            <div className="flex items-center gap-2 text-xs" style={{ color: t.muted }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: t.accent }} />
              Loading more…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
