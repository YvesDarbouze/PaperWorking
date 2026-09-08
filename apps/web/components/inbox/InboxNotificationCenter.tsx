'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
import InboxItemCard from '@/components/inbox/InboxItemCard';
import InboxTabs from '@/components/inbox/InboxTabs';
import {
  INBOX_TABS,
  INBOX_THREADS,
  type InboxTabId,
  type InboxThread,
} from '@/lib/dashboard/shell-seed';

function emptyCounts(): Record<InboxTabId, number> {
  return {
    all: 0,
    opportunities: 0,
    tasks: 0,
    vendor: 0,
    team: 0,
    system: 0,
  };
}

function NotifMoreMenu({
  item,
  isUnread,
  onMarkUnreadToggle,
  onArchive,
  onDelete,
}: {
  item: InboxThread;
  isUnread: boolean;
  onMarkUnreadToggle: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="notif-more-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5"
        aria-label="Notification actions"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>
      {open ? (
        <div
          id="notif-more-menu"
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#161318] py-1 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMarkUnreadToggle();
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">
              {isUnread ? 'drafts' : 'mark_email_unread'}
            </span>
            {isUnread ? 'Mark as Read' : 'Mark as Unread'}
          </button>
          <div className="my-1 border-t border-white/5" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onArchive();
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">archive</span>
            Archive
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400/80 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Unified Inbox — port of PaperWorking `/dashboard/inbox` notification center
 * (two-pane list + reading pane, tabs, compose, mark-all-read).
 */
export default function InboxNotificationCenter() {
  const [items, setItems] = useState<InboxThread[]>(() => [...INBOX_THREADS]);
  const [activeTab, setActiveTab] = useState<InboxTabId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
  const [actionFlash, setActionFlash] = useState<string | null>(null);

  const isUnread = useCallback(
    (item: InboxThread) => {
      if (item.id in readOverrides) return !readOverrides[item.id];
      return item.unread;
    },
    [readOverrides],
  );

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (archivedIds.has(item.id)) return false;
      if (activeTab !== 'all' && item.tab !== activeTab) return false;
      if (!q) return true;
      return (
        item.subject.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.from.toLowerCase().includes(q) ||
        item.project.toLowerCase().includes(q)
      );
    });
  }, [items, archivedIds, activeTab, searchQuery]);

  const unreadCounts = useMemo(() => {
    const counts = emptyCounts();
    for (const item of items) {
      if (archivedIds.has(item.id) || !isUnread(item)) continue;
      counts.all += 1;
      counts[item.tab] += 1;
    }
    return counts;
  }, [items, archivedIds, isUnread]);

  const unreadTotal = unreadCounts.all;
  const selectedItem = visibleItems.find((i) => i.id === selectedId) ?? null;
  const selectedUnread = selectedItem ? isUnread(selectedItem) : false;

  function markRead(id: string) {
    setReadOverrides((prev) => ({ ...prev, [id]: true }));
  }

  function markUnread(id: string) {
    setReadOverrides((prev) => ({ ...prev, [id]: false }));
  }

  function markAllRead() {
    const next: Record<string, boolean> = { ...readOverrides };
    for (const item of items) {
      if (!archivedIds.has(item.id)) next[item.id] = true;
    }
    setReadOverrides(next);
  }

  function archiveItem(id: string) {
    setArchivedIds((prev) => new Set(prev).add(id));
    if (selectedId === id) setSelectedId(null);
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function selectItem(id: string) {
    setSelectedId(id);
    markRead(id);
  }

  function executeAction() {
    if (!selectedItem) return;
    setActionFlash(`Action queued for “${selectedItem.subject}” (seed preview).`);
    markRead(selectedItem.id);
    setTimeout(() => setActionFlash(null), 2500);
  }

  const showDetail = Boolean(selectedItem);

  return (
    <>
      <div
        className="-mb-24 flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#0d0a0b] text-[#9E9DA0] md:-mb-8"
        data-testid="inbox-notification-center"
      >
        {/* List pane */}
        <section
          className={`w-full shrink-0 flex-col border-r border-white/10 bg-[#161318]/50 md:flex md:w-[420px] ${
            showDetail ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#fdfffc]">Inbox</h1>
              <div className="flex items-center gap-2">
                {unreadTotal > 0 ? (
                  <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    {unreadTotal} UNREAD
                  </span>
                ) : null}
                {unreadTotal > 0 ? (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300"
                    title="Mark all as read"
                  >
                    <span className="material-symbols-outlined text-[18px]">done_all</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="cursor-pointer rounded-lg p-1.5 text-[#9E9DA0] transition-colors hover:bg-white/5 hover:text-emerald-300"
                  title="Compose email"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#9E9DA0]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full rounded-lg border border-[#3c4a46] bg-[#0d0a0b] py-2 pl-10 pr-4 text-sm text-[#9E9DA0] outline-none transition-all placeholder:text-[#9E9DA0]/40 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <InboxTabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSelectedId(null);
            }}
            unreadCounts={unreadCounts}
          />

          <div className="relative flex-1 overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="material-symbols-outlined mb-3 text-5xl opacity-20">inbox</span>
                <p className="text-sm font-medium text-white/60">No items in this view</p>
                <p className="mt-1 text-xs text-white/35">
                  {searchQuery
                    ? 'Try a different search.'
                    : 'You’re caught up — new alerts will land here.'}
                </p>
              </div>
            ) : (
              visibleItems.map((item) => (
                <InboxItemCard
                  key={item.id}
                  item={item}
                  isUnread={isUnread(item)}
                  isActive={selectedId === item.id}
                  onSelect={() => selectItem(item.id)}
                  onArchive={() => archiveItem(item.id)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Reading pane */}
        <section
          className={`relative flex flex-1 flex-col overflow-hidden bg-[#0d0a0b] ${
            showDetail ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#454955]/5 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-20 left-20 h-64 w-64 rounded-full bg-[#7A9EAA]/5 blur-[80px]" />

          {selectedItem ? (
            <div className="z-10 flex flex-1 flex-col overflow-y-auto">
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0a0b]/50 px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6">
                <div className="flex min-w-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5 md:hidden"
                    aria-label="Back"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d0a0b]/60 text-emerald-400 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)]">
                    <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-[#fdfffc] sm:text-2xl">
                      {selectedItem.subject}
                    </h2>
                    <p className="font-mono text-[10px] uppercase text-[#454955]">
                      ID: {selectedItem.id.slice(0, 8)} · STATUS:{' '}
                      {selectedUnread ? 'UNREAD' : 'READ'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => archiveItem(selectedItem.id)}
                    className="cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5"
                    title="Archive"
                  >
                    <span className="material-symbols-outlined">archive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(selectedItem.id)}
                    className="cursor-pointer rounded-lg p-2 text-[#9E9DA0] transition-colors hover:bg-white/5"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                  <NotifMoreMenu
                    item={selectedItem}
                    isUnread={selectedUnread}
                    onMarkUnreadToggle={() =>
                      selectedUnread ? markRead(selectedItem.id) : markUnread(selectedItem.id)
                    }
                    onArchive={() => archiveItem(selectedItem.id)}
                    onDelete={() => deleteItem(selectedItem.id)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                <div className="mx-auto max-w-3xl space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#454955]/20 bg-[#161318] text-lg font-bold text-[#454955]">
                      {selectedItem.from[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#fdfffc]">{selectedItem.from}</span>
                        <span className="font-mono text-[10px] uppercase text-[#9E9DA0]">
                          {new Date(selectedItem.receivedAt).toLocaleString()} UTC
                        </span>
                      </div>
                      {selectedItem.fromRole ? (
                        <p className="mb-4 text-sm text-[#454955]">{selectedItem.fromRole}</p>
                      ) : null}

                      <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-[#0d0a0b]/60 p-6 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl">
                        <p className="whitespace-pre-wrap text-base leading-relaxed text-[#c8c7c9]">
                          {selectedItem.body}
                        </p>

                        {selectedItem.type === 'DOCUMENT_SIGNED' ||
                        selectedItem.type === 'RECEIPT_APPROVAL' ? (
                          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[#454955]">
                                description
                              </span>
                              <div>
                                <p className="text-xs font-bold text-[#9E9DA0]">
                                  Attached_Document.pdf
                                </p>
                                <p className="font-mono text-[10px] text-[#9E9DA0]">
                                  SECURE // PDF-DOCUMENT
                                </p>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-[#9E9DA0]">download</span>
                          </div>
                        ) : null}

                        {selectedItem.type === 'VENDOR_BID' ? (
                          <div className="mt-6 flex flex-col gap-2 rounded-xl border border-[#3c4a46] bg-[#0d0a0b] p-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[#454955]">
                                engineering
                              </span>
                              <div>
                                <p className="text-xs font-bold text-[#9E9DA0]">
                                  Summit Roofing Bid Summary
                                </p>
                                <p className="font-mono text-[10px] text-[#9E9DA0]">
                                  PROPOSAL // ROOF INSPECTION
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 border-t border-white/5 pt-2 text-xs text-[#9E9DA0]">
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-[#9E9DA0]/60">
                                  Proposed Service Date
                                </p>
                                <p className="font-medium">Next Tuesday</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-[#9E9DA0]/60">
                                  Payment Terms
                                </p>
                                <p className="font-medium">Net 15 upon completion</p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {actionFlash ? (
                    <p className="text-center text-sm font-semibold text-emerald-400">{actionFlash}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-center gap-3 py-6">
                    {selectedItem.actionable ? (
                      <button
                        type="button"
                        onClick={executeAction}
                        className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 font-bold text-slate-950 transition-all hover:brightness-110"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit_square</span>
                        EXECUTE ACTION
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setComposeOpen(true)}
                      className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-[#0d0a0b]/60 px-8 py-3 font-bold text-[#9E9DA0] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all hover:bg-white/5"
                    >
                      <span className="material-symbols-outlined text-[18px]">reply</span>
                      REPLY
                    </button>
                    {selectedItem.deepLinkUrl ? (
                      <Link
                        href={selectedItem.deepLinkUrl}
                        className="flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white/70 no-underline hover:bg-white/5"
                      >
                        Open related
                        <span className="material-symbols-outlined text-[16px]">north_east</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-[#0d0a0b]/80 px-8 py-2 backdrop-blur">
                <div className="flex gap-4">
                  <p className="font-mono text-[10px] text-[#9E9DA0]">
                    <span className="text-[#454955]">RUNNING:</span> inbox_handler.sh
                  </p>
                  <p className="hidden font-mono text-[10px] text-[#9E9DA0] sm:block">
                    <span className="text-[#454955]">ENCRYPTION:</span> AES-256-GCM
                  </p>
                </div>
                <p className="font-mono text-[10px] text-[#9E9DA0]">LAST_SYNC: 0.2s AGO</p>
              </div>
            </div>
          ) : (
            <div className="z-10 flex flex-1 flex-col items-center justify-center text-[#9E9DA0]">
              <span className="material-symbols-outlined mb-4 text-6xl opacity-20">inbox</span>
              <p className="text-lg font-medium">Select an item to read</p>
              <p className="text-sm opacity-60">
                Your messages and notifications will appear here.
              </p>
              <p className="mt-4 text-xs text-white/35">
                {INBOX_TABS.find((t) => t.id === activeTab)?.label} · {visibleItems.length} items
              </p>
            </div>
          )}
        </section>
      </div>

      <ComposeEmailModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}
