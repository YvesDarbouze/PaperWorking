'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowBendUpLeft,
  ArrowLeft,
  ArrowUpRight,
  Checks,
  DotsThreeVertical,
  DownloadSimple,
  EnvelopeOpen,
  EnvelopeSimple,
  EnvelopeSimpleOpen,
  FileText,
  Gavel,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Storefront,
  Trash,
  Tray,
  Wrench,
} from '@phosphor-icons/react';
import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
import InboxItemCard from '@/components/inbox/InboxItemCard';
import InboxTabs from '@/components/inbox/InboxTabs';
import {
  INBOX_TABS,
  INBOX_THREADS,
  getInboxThreads,
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
        className="cursor-pointer rounded-none border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Notification actions"
        aria-expanded={open}
      >
        <DotsThreeVertical weight="bold" className="h-4 w-4" />
      </button>
      {open ? (
        <div
          id="notif-more-menu"
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-none border border-border bg-popover py-1 text-popover-foreground shadow-sm ring-1 ring-foreground/10"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMarkUnreadToggle();
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {isUnread ? (
              <EnvelopeSimpleOpen weight="regular" className="h-4 w-4 shrink-0" />
            ) : (
              <EnvelopeSimple weight="regular" className="h-4 w-4 shrink-0" />
            )}
            {isUnread ? 'Mark as Read' : 'Mark as Unread'}
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onArchive();
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Archive weight="regular" className="h-4 w-4 shrink-0" />
            Archive
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash weight="regular" className="h-4 w-4 shrink-0" />
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
  const [items, setItems] = useState<InboxThread[]>(() => [...getInboxThreads()]);
  const [activeTab, setActiveTab] = useState<InboxTabId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set());
  const [actionFlash, setActionFlash] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.threads)) {
          setItems(data.threads);
        }
      }
    } catch {
      // Non-fatal, keep existing state
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 20000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

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
    fetch(`/api/inbox/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unread: false }),
    }).catch(() => undefined);
  }

  function markUnread(id: string) {
    setReadOverrides((prev) => ({ ...prev, [id]: false }));
    fetch(`/api/inbox/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unread: true }),
    }).catch(() => undefined);
  }

  function markAllRead() {
    const next: Record<string, boolean> = { ...readOverrides };
    for (const item of items) {
      if (!archivedIds.has(item.id)) next[item.id] = true;
    }
    setReadOverrides(next);
    fetch('/api/inbox/mark-all-read', {
      method: 'POST',
    }).catch(() => undefined);
  }

  function archiveItem(id: string) {
    setArchivedIds((prev) => new Set(prev).add(id));
    if (selectedId === id) setSelectedId(null);
    fetch(`/api/inbox/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    }).catch(() => undefined);
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
    fetch(`/api/inbox/${id}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }

  function selectItem(id: string) {
    setSelectedId(id);
    markRead(id);
  }

  function executeAction() {
    if (!selectedItem) return;
    setActionFlash(`Action confirmed for “${selectedItem.subject}”.`);
    markRead(selectedItem.id);
    setTimeout(() => setActionFlash(null), 2500);
    if (selectedItem.deepLinkUrl) {
      window.location.href = selectedItem.deepLinkUrl;
    }
  }

  const showDetail = Boolean(selectedItem);

  return (
    <>
      <div
        className="-mb-24 flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background text-foreground md:-mb-8"
        data-testid="inbox-notification-center"
      >
        {/* List pane */}
        <section
          className={`w-full shrink-0 flex-col border-r border-border bg-card md:flex md:w-[420px] ${
            showDetail ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
              <div className="flex items-center gap-2">
                {unreadTotal > 0 ? (
                  <span className="rounded-none border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">
                    {unreadTotal} UNREAD
                  </span>
                ) : null}
                {unreadTotal > 0 ? (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="cursor-pointer rounded-none border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Mark all as read"
                  >
                    <Checks weight="bold" className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="cursor-pointer rounded-none border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Compose email"
                >
                  <Plus weight="bold" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full rounded-none border border-input bg-background py-2 pl-10 pr-4 text-base md:text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring min-h-[44px]"
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
                <Tray weight="thin" className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No items in this view</p>
                <p className="mt-1 text-xs text-muted-foreground">
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
          className={`relative flex flex-1 flex-col overflow-hidden bg-background ${
            showDetail ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedItem ? (
            <div className="z-10 flex flex-1 flex-col overflow-y-auto">
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/50 px-6 py-5 backdrop-blur-sm sm:px-8 sm:py-6">
                <div className="flex min-w-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="cursor-pointer rounded-none border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Back"
                  >
                    <ArrowLeft weight="bold" className="h-5 w-5" />
                  </button>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground">
                    <EnvelopeOpen weight="bold" className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-foreground sm:text-2xl">
                      {selectedItem.subject}
                    </h2>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      ID: {selectedItem.id.slice(0, 8)} · STATUS:{' '}
                      {selectedUnread ? 'UNREAD' : 'READ'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => archiveItem(selectedItem.id)}
                    className="cursor-pointer rounded-none border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Archive"
                  >
                    <Archive weight="regular" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(selectedItem.id)}
                    className="cursor-pointer rounded-none border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash weight="regular" className="h-4 w-4" />
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-lg font-bold text-foreground">
                      {selectedItem.from[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-foreground">{selectedItem.from}</span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {new Date(selectedItem.receivedAt).toLocaleString()} UTC
                        </span>
                      </div>
                      {selectedItem.fromRole ? (
                        <p className="mb-4 text-sm text-muted-foreground">{selectedItem.fromRole}</p>
                      ) : null}

                      <div className="mt-4 space-y-4 rounded-none border border-border bg-card p-6 shadow-sm ring-1 ring-foreground/10">
                        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                          {selectedItem.body}
                        </p>

                        {(selectedItem.subject.toLowerCase().includes('deal') ||
                          selectedItem.subject.toLowerCase().includes('negotiation') ||
                          selectedItem.type === 'INVEST_INVITE') && (
                          <div className="mt-6 rounded-none border border-border bg-muted/40 p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Storefront weight="bold" className="h-4 w-4 text-foreground" />
                                <span className="text-xs font-bold text-foreground">Deal Negotiation Provenance</span>
                              </div>
                              {selectedItem.deepLinkUrl && (
                                <Link
                                  href={selectedItem.deepLinkUrl}
                                  className="text-xs font-semibold text-foreground underline hover:text-foreground/80 flex items-center gap-1 min-h-[44px]"
                                >
                                  <span>View Deal Card</span>
                                  <ArrowUpRight weight="bold" className="h-3.5 w-3.5" />
                                </Link>
                              )}
                            </div>
                            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                              <Gavel weight="bold" className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <p>
                                <strong className="text-foreground font-medium">Off-Platform Closing:</strong> PaperWorking provides encrypted messaging for negotiation. All final legal subscription agreements, partnership docs, accredited KYC/AML verification, and capital funding occur directly between counterparties outside of PaperWorking.
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedItem.type === 'DOCUMENT_SIGNED' ||
                        selectedItem.type === 'RECEIPT_APPROVAL' ? (
                          <div className="mt-6 flex items-center justify-between rounded-none border border-border bg-muted/30 p-4">
                            <div className="flex items-center gap-3">
                              <FileText weight="regular" className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  Attached_Document.pdf
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  SECURE // PDF-DOCUMENT
                                </p>
                              </div>
                            </div>
                            <DownloadSimple weight="bold" className="h-4 w-4 text-foreground" />
                          </div>
                        ) : null}

                        {selectedItem.type === 'VENDOR_BID' ? (
                          <div className="mt-6 flex flex-col gap-2 rounded-none border border-border bg-muted/30 p-4">
                            <div className="flex items-center gap-3">
                              <Wrench weight="regular" className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  Summit Roofing Bid Summary
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  PROPOSAL // ROOF INSPECTION
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 border-t border-border pt-2 text-xs text-muted-foreground">
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground/80">
                                  Proposed Service Date
                                </p>
                                <p className="font-medium text-foreground">Next Tuesday</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground/80">
                                  Payment Terms
                                </p>
                                <p className="font-medium text-foreground">Net 15 upon completion</p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {actionFlash ? (
                    <p className="text-center text-sm font-semibold text-foreground">{actionFlash}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-center gap-3 py-6">
                    {selectedItem.actionable ? (
                      <button
                        type="button"
                        onClick={executeAction}
                        className="flex cursor-pointer items-center gap-2 rounded-none bg-primary px-8 py-3 font-mono text-xs font-bold text-primary-foreground min-h-[44px] transition-all hover:bg-primary/90"
                      >
                        <PencilSimple weight="bold" className="h-4 w-4" />
                        EXECUTE ACTION
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setComposeOpen(true)}
                      className="flex cursor-pointer items-center gap-2 rounded-none border border-border bg-card px-8 py-3 font-mono text-xs font-bold text-foreground min-h-[44px] shadow-sm ring-1 ring-foreground/10 transition-all hover:bg-accent"
                    >
                      <ArrowBendUpLeft weight="bold" className="h-4 w-4" />
                      REPLY
                    </button>
                    {selectedItem.deepLinkUrl ? (
                      <Link
                        href={selectedItem.deepLinkUrl}
                        className="flex items-center gap-2 rounded-none border border-border px-6 py-3 text-sm font-semibold text-foreground no-underline min-h-[44px] hover:bg-accent"
                      >
                        Open related
                        <ArrowUpRight weight="bold" className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/40 px-8 py-2">
                <div className="flex gap-4">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    <span className="text-foreground">RUNNING:</span> inbox_handler.sh
                  </p>
                  <p className="hidden font-mono text-[10px] text-muted-foreground sm:block">
                    <span className="text-foreground">ENCRYPTION:</span> AES-256-GCM
                  </p>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">LAST_SYNC: 0.2s AGO</p>
              </div>
            </div>
          ) : (
            <div className="z-10 flex flex-1 flex-col items-center justify-center text-muted-foreground">
              <Tray weight="thin" className="mb-4 h-16 w-16 opacity-30" />
              <p className="text-lg font-medium text-foreground">Select an item to read</p>
              <p className="text-sm text-muted-foreground">
                Your messages and notifications will appear here.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {INBOX_TABS.find((t) => t.id === activeTab)?.label} · {visibleItems.length} items
              </p>
            </div>
          )}
        </section>
      </div>

      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={fetchThreads}
      />
    </>
  );
}
