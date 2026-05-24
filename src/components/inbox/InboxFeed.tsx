'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
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
}

function FeedSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3.5 px-6 py-4"
          style={{ borderBottom: '1px solid var(--bg-canvas)' }}
        >
          {/* Icon skeleton */}
          <div className="w-9 h-9 rounded-full bg-neutral-200 animate-pulse flex-shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-neutral-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-neutral-200 animate-pulse" />
              <div className="ml-auto h-3 w-12 rounded bg-neutral-200 animate-pulse" />
            </div>
            <div className="h-3.5 w-3/4 rounded bg-neutral-200 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-neutral-200 animate-pulse" />
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
}: InboxFeedProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clear selections when active tab changes
  useEffect(() => {
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
      <div className="flex flex-col items-center justify-center p-12 text-center h-[200px]">
        <AlertCircle className="w-8 h-8 mb-3 text-red-500" />
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Connection Error
        </h3>
        <p className="text-xs max-w-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
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
    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col relative">
      {/* Select All Action Bar */}
      {items.length > 0 && (
        <div 
          className="flex items-center px-6 py-2.5 border-b"
          style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-canvas)' }}
        >
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 accent-[#0d0d0d] cursor-pointer"
            />
            {allSelected ? 'Deselect All' : 'Select All'}
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
            className="fixed bottom-6 left-1/2 z-50 flex items-center justify-between px-6 py-3 shadow-2xl border"
            style={{
              backgroundColor: '#0d0d0d',
              borderColor: '#333333',
              color: '#ffffff',
              width: 'calc(100% - 48px)',
              maxWidth: '500px',
            }}
          >
            <span className="text-xs font-semibold">
              {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkMarkRead}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600 transition-colors"
              >
                Mark Read
              </button>
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white text-black hover:bg-neutral-200 transition-colors"
              >
                Archive
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
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
          className="flex items-center justify-center p-4 min-h-[48px]"
          style={{ borderTop: '1px solid var(--bg-canvas)' }}
        >
          {loadingMore && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
