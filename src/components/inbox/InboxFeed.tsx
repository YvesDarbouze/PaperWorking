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

/* ═══════════════════════════════════════════════════════
   InboxFeed — Infinite scroll notification feed container
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
  return (
    <div className="p-6 space-y-4 bg-[#0b141a] h-full overflow-y-auto">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-5 rounded-2xl glass-card border border-white/5 animate-pulse"
        >
          {/* Icon skeleton */}
          <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-16 h-3 rounded bg-white/10" />
              <div className="w-24 h-3 rounded bg-white/5" />
              <div className="ml-auto w-12 h-3 rounded bg-white/5" />
            </div>
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3.5 w-1/2 rounded bg-white/5" />
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clear selections when active tab changes
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

  // Setup infinite scroll sentinel observer
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

  // Handle initial loading state
  if (loading && items.length === 0) {
    return <FeedSkeleton />;
  }

  // Handle explicit error states
  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[200px] bg-[#0b141a]">
        <AlertCircle className="w-8 h-8 mb-3 text-red-500" />
        <h3 className="text-sm font-semibold mb-1 text-[#dae4ec]">
          Connection Error
        </h3>
        <p className="text-xs max-w-xs mb-3 text-[#bacac5]">
          {error}
        </p>
      </div>
    );
  }

  // Handle empty state
  if (items.length === 0) {
    return <InboxEmptyState activeTab={activeTab} />;
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col relative bg-[#0b141a]">
      {/* Select All Action Bar */}
      {items.length > 0 && (
        <div 
          className="flex items-center px-6 py-3 border-b border-white/10 bg-[#0b141a]/80 backdrop-blur-sm sticky top-0 z-10 shrink-0"
        >
          <label className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer text-[#bacac5] hover:text-[#57f1db] transition-colors">
            <Checkbox
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            {allSelected ? 'Deselect All' : 'Select All Notifications'}
          </label>
        </div>
      )}

      {/* Bento grid style stack list */}
      <div className="flex-1 p-6 space-y-4">
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

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center justify-between px-6 py-3.5 glass-card rounded-2xl border border-primary/30 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(45,212,191,0.15)] text-[#dae4ec]"
            style={{
              width: 'calc(100% - 48px)',
              maxWidth: '520px',
            }}
          >
            <span className="text-xs font-semibold text-primary">
              {selectedIds.length} notification{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleBulkMarkRead}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all active:scale-95 text-[#dae4ec]"
              >
                Mark Read
              </button>
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all luminous-glow"
              >
                Archive
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-[10px] font-bold uppercase tracking-wider text-[#bacac5] hover:text-[#dae4ec] transition-colors px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infinite Scroll Sentinel element */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center p-6 min-h-[48px]"
        >
          {loadingMore && (
            <div className="flex items-center gap-2 text-xs text-[#bacac5]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

