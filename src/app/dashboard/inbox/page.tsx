'use client';

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Plus, Loader2, CheckCheck, ArrowLeft } from 'lucide-react';
import { useInboxFeed } from '@/hooks/useInboxFeed';
import { useInboxThreads } from '@/hooks/useInboxThreads';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import { useTheme } from '@/lib/utils/ThemeProvider';
import InboxTabs from '@/components/inbox/InboxTabs';
import InboxFeed from '@/components/inbox/InboxFeed';
import ThreadDetail from '@/components/inbox/ThreadDetail';
import NegotiationThreadDetail from '@/components/inbox/NegotiationThreadDetail';
import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
import { inboxTokens } from '@/components/inbox/inboxTheme';
import toast from 'react-hot-toast';
import { executeInboxAction } from '@/lib/services/inboxActionExecutor';

/* ═══════════════════════════════════════════════════════
   Inbox — Unified Notification Center
   Daily triage for ops decisions. UI only redesign.
   ═══════════════════════════════════════════════════════ */

interface NotifMoreMenuProps {
  item: import('@/types/notification').Notification;
  onMarkUnread: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isDark: boolean;
}

function NotifMoreMenu({ item, onMarkUnread, onArchive, onDelete, isDark }: NotifMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = inboxTokens(isDark);

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
        id="notif-more-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded transition-colors"
        style={{ color: t.muted }}
        onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        aria-label="Notification actions"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>more_vert</span>
      </button>

      {open && (
        <div
          id="notif-more-menu"
          role="menu"
          className="absolute right-0 top-full mt-1 w-52 z-50 py-1 overflow-hidden"
          style={{
            background: t.menuBg,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            boxShadow: t.elevShadow,
          }}
        >
          <button
            id="notif-menu-mark-unread"
            role="menuitem"
            onClick={() => { onMarkUnread(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
            style={{ color: t.body }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>
              {item.read ? 'mark_email_unread' : 'drafts'}
            </span>
            {item.read ? 'Mark as Unread' : 'Mark as Read'}
          </button>
          <div className="my-1" style={{ borderTop: `1px solid ${t.divider}` }} />
          <button
            id="notif-menu-archive"
            role="menuitem"
            onClick={() => { onArchive(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
            style={{ color: t.body }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>archive</span>
            Archive
          </button>
          <button
            id="notif-menu-delete"
            role="menuitem"
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
            style={{ color: t.danger }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>delete</span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function actionLabel(type: string): string {
  switch (type) {
    case 'VENDOR_BID': return 'Review bid';
    case 'RECEIPT_APPROVAL': return 'Approve receipt';
    case 'INVEST_INVITE': return 'View invitation';
    case 'TEAM_INVITE':
    case 'TEAM_INVITE_REMINDER': return 'Respond to invite';
    default: return 'Take action';
  }
}

function InboxNotificationCenter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = inboxTokens(isDark);
  const deals = useProjectStore((state) => state.projects);

  const {
    items,
    loading,
    loadingMore,
    error,
    unreadCounts,
    unreadTotal,
    activeTab,
    setActiveTab,
    markAsRead,
    markAsUnread,
    markAllRead,
    archiveItem,
    deleteItem,
    bulkArchive,
    bulkMarkRead,
    fetchMore,
    hasMore,
  } = useInboxFeed();

  const {
    threads,
    markAsRead: markThreadAsRead,
    markAsUnread: markThreadAsUnread,
  } = useInboxThreads();

  const threadId = searchParams.get('threadId') || searchParams.get('thread') || null;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const activeThread = threadId
    ? threads.find((th) => th.projectId === threadId) || null
    : null;

  const activeProjectName = activeThread
    ? deals.find((d) => d.id === activeThread.projectId)?.propertyName || 'Project'
    : '';

  React.useEffect(() => {
    if (threadId && activeThread && activeThread.unreadCount > 0) {
      markThreadAsRead(threadId);
    }
  }, [threadId, activeThread?.unreadCount, markThreadAsRead]);

  const handleSendReply = useCallback(
    async (body: string) => {
      if (!user || !threadId) return;

      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/emails/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            projectId: threadId,
            to: activeThread?.messages
              .filter((m) => m.senderEmail && m.senderUid !== user.uid)
              .map((m) => m.senderEmail)
              .filter((v, i, a) => a.indexOf(v) === i)
              .slice(0, 10) || [],
            subject: activeThread?.lastMessage.subject || 'Re: Conversation',
            html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#333;white-space:pre-wrap;">${body}</div>`,
            text: body,
          }),
        });

        if (res.ok) {
          toast.success('Reply sent.');
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to send.');
        }
      } catch (err) {
        console.error('[Inbox] Reply error:', err);
        toast.error('Network error.');
      }
    },
    [user, threadId, activeThread],
  );

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success('All marked as read.');
  };

  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  useEffect(() => {
    if (selectedNotificationId) {
      const item = items.find((n) => n.id === selectedNotificationId);
      if (item && !item.read) {
        markAsRead(selectedNotificationId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNotificationId]);

  const selectedItem = items.find(item => item.id === selectedNotificationId) || null;

  const negotiationParamId = searchParams.get('negotiationId') || searchParams.get('negotiation') || null;
  const activeNegotiationId = negotiationParamId ||
    (selectedItem?.type === 'NEGOTIATION_UPDATE' ? (selectedItem.objectReference.metadata?.negotiationId as string) : null);

  const handleExecuteAction = async () => {
    if (!user || !selectedItem) return;
    setIsExecutingAction(true);
    const actionPromise = (async () => {
      const idToken = await user.getIdToken();
      const res = await executeInboxAction(selectedItem, idToken, user.email || '');
      if (res.success) {
        if (!selectedItem.read) {
          await markAsRead(selectedItem.id);
        }
      }
      return res.message;
    })();

    toast.promise(actionPromise, {
      loading: 'Executing action...',
      success: (msg) => msg,
      error: (err) => err.message || 'Action execution failed.',
    });

    try {
      await actionPromise;
    } catch (err) {
      console.error('[Inbox] Action execution error:', err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const showDetail = !!(activeThread || activeNegotiationId || selectedItem);
  const iconBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
    color: t.muted,
    borderRadius: 2,
    ...extra,
  });

  return (
    <>
      <div
        className="flex w-full h-[calc(100vh-64px)] overflow-hidden"
        style={{ background: t.pageBg, color: t.body }}
      >
        {/* List pane */}
        <section
          className={`w-full md:w-[520px] lg:w-[560px] flex flex-col shrink-0 ${showDetail ? 'hidden md:flex' : 'flex'}`}
          style={{ background: t.listBg, borderRight: `1px solid ${t.border}` }}
        >
          <header className="px-5 pt-5 pb-4 shrink-0">
            {searchOpen ? (
              <div className="flex items-center gap-3 min-h-[44px]">
                <div
                  className="relative flex-1 flex items-center"
                  style={{
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.85)' : 'rgba(20,22,28,0.55)'}`,
                    borderRadius: 999,
                    background: 'transparent',
                  }}
                >
                  <Search
                    className="absolute left-3.5 w-4 h-4 pointer-events-none"
                    style={{ color: isDark ? '#FFFFFF' : t.heading }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') closeSearch();
                    }}
                    placeholder="Search all messages"
                    className="w-full py-2.5 pl-10 pr-4 text-sm outline-none bg-transparent"
                    style={{
                      color: t.heading,
                      borderRadius: 999,
                    }}
                    aria-label="Search all messages"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeSearch}
                  className="shrink-0 text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ color: isDark ? '#FFFFFF' : t.heading }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1"
                    style={{ color: t.accent }}
                  >
                    Operations
                  </p>
                  <h1
                    className="text-[1.5rem] font-semibold leading-tight tracking-tight"
                    style={{ color: t.heading }}
                  >
                    Inbox
                  </h1>
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-1">
                  {unreadTotal > 0 && (
                    <span
                      className="px-2 py-0.5 text-[10px] font-semibold tabular-nums mr-1"
                      style={{
                        color: t.accent,
                        background: t.accentMuted,
                        borderRadius: 2,
                      }}
                    >
                      {unreadTotal} unread
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="p-2 transition-colors"
                    style={iconBtn()}
                    onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.heading; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.muted; }}
                    title="Search"
                    aria-label="Search messages"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  {unreadTotal > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="p-2 transition-colors"
                      style={iconBtn()}
                      onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.heading; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.muted; }}
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setComposeOpen(true)}
                    className="p-2 transition-colors"
                    style={iconBtn()}
                    onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.heading; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.muted; }}
                    title="Compose email"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </header>

          <InboxTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCounts={unreadCounts}
          />

          <div className="flex-1 overflow-y-auto no-scrollbar relative min-h-0">
            <InboxFeed
              items={items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.body.toLowerCase().includes(searchQuery.toLowerCase()))}
              loading={loading}
              loadingMore={loadingMore}
              error={error}
              activeTab={activeTab}
              onMarkRead={markAsRead}
              onArchive={archiveItem}
              onDelete={deleteItem}
              onBulkArchive={bulkArchive}
              onBulkMarkRead={bulkMarkRead}
              fetchMore={fetchMore}
              hasMore={hasMore}
              selectedItemId={selectedNotificationId}
              onSelectItem={setSelectedNotificationId}
            />
          </div>
        </section>

        {/* Reading pane */}
        <section
          className={`flex-1 flex flex-col relative overflow-hidden min-w-0 ${showDetail ? 'flex' : 'hidden md:flex'}`}
          style={{ background: t.paneBg }}
        >
          {activeThread ? (
            <ThreadDetail
              thread={activeThread}
              projectName={activeProjectName}
              onSendReply={handleSendReply}
              onBack={() => router.push('/dashboard/inbox')}
              onMarkThreadUnread={() => markThreadAsUnread(activeThread.projectId)}
            />
          ) : activeNegotiationId ? (
            <NegotiationThreadDetail
              negotiationId={activeNegotiationId}
              onBack={() => {
                setSelectedNotificationId(null);
                router.push('/dashboard/inbox');
              }}
            />
          ) : selectedItem ? (
            <div className="flex-1 overflow-hidden z-10 flex flex-col min-h-0">
              <div
                className="px-5 sm:px-8 py-4 flex items-center justify-between shrink-0 gap-3"
                style={{ borderBottom: `1px solid ${t.border}`, background: t.listBg }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedNotificationId(null)}
                    className="md:hidden p-2 -ml-2 transition-colors"
                    style={iconBtn()}
                    aria-label="Back to list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <h2
                      className="text-lg sm:text-xl font-semibold leading-snug truncate"
                      style={{ color: t.heading }}
                    >
                      {selectedItem.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
                        style={{
                          borderRadius: 2,
                          color: selectedItem.read ? t.muted : t.accent,
                          background: selectedItem.read ? t.hover : t.accentMuted,
                        }}
                      >
                        {selectedItem.read ? 'Read' : 'Unread'}
                      </span>
                      <span className="text-[11px] tabular-nums" style={{ color: t.muted }}>
                        {new Date(selectedItem.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button
                    onClick={() => archiveItem(selectedItem.id)}
                    className="p-2 transition-colors"
                    style={iconBtn()}
                    onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.heading; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.muted; }}
                    title="Archive"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>archive</span>
                  </button>
                  <button
                    onClick={() => deleteItem(selectedItem.id)}
                    className="p-2 transition-colors"
                    style={iconBtn()}
                    onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.danger; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.muted; }}
                    title="Delete"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>delete</span>
                  </button>
                  <NotifMoreMenu
                    isDark={isDark}
                    item={selectedItem}
                    onMarkUnread={() => {
                      selectedItem.read ? markAsUnread(selectedItem.id) : markAsRead(selectedItem.id);
                    }}
                    onArchive={() => {
                      archiveItem(selectedItem.id);
                      setSelectedNotificationId(null);
                    }}
                    onDelete={() => {
                      deleteItem(selectedItem.id);
                      setSelectedNotificationId(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-start gap-3">
                    {selectedItem.actor.avatarUrl ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                        style={{ border: `1px solid ${t.border}` }}
                        src={selectedItem.actor.avatarUrl}
                        alt={selectedItem.actor.name}
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.border}` }}
                      >
                        {selectedItem.actor.name[0]}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 mb-0.5">
                        <span className="font-semibold text-sm" style={{ color: t.heading }}>
                          {selectedItem.actor.name}
                        </span>
                      </div>
                      {selectedItem.actor.role && (
                        <p className="text-xs mb-3" style={{ color: t.muted }}>{selectedItem.actor.role}</p>
                      )}

                      <div
                        className="mt-3 p-5 space-y-4"
                        style={{
                          background: t.surface,
                          border: `1px solid ${t.border}`,
                          borderRadius: 2,
                          boxShadow: t.shadow,
                        }}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: t.body }}>
                          {selectedItem.body}
                        </p>

                        {['DOCUMENT_SIGNED', 'RECEIPT_APPROVAL'].includes(selectedItem.type) && (
                          <div
                            className="p-3 flex items-center justify-between"
                            style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 2 }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined" style={{ color: t.accent }}>description</span>
                              <div>
                                <p className="text-xs font-semibold" style={{ color: t.heading }}>Attached document</p>
                                <p className="text-[11px]" style={{ color: t.muted }}>PDF</p>
                              </div>
                            </div>
                            <button className="material-symbols-outlined transition-colors" style={{ color: t.muted }} aria-label="Download">download</button>
                          </div>
                        )}

                        {selectedItem.type === 'VENDOR_BID' && (
                          <div
                            className="p-3 flex flex-col gap-2"
                            style={{ background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 2 }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined" style={{ color: t.vendor }}>engineering</span>
                              <div>
                                <p className="text-xs font-semibold" style={{ color: t.heading }}>Bid summary</p>
                                <p className="text-[11px]" style={{ color: t.muted }}>Vendor proposal</p>
                              </div>
                            </div>
                            <div
                              className="grid grid-cols-2 gap-4 mt-1 pt-2 text-xs"
                              style={{ borderTop: `1px solid ${t.divider}`, color: t.body }}
                            >
                              <div>
                                <p className="text-[10px] uppercase font-semibold mb-0.5" style={{ color: t.muted }}>Service date</p>
                                <p className="font-medium" style={{ color: t.heading }}>Oct 30, 2023</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-semibold mb-0.5" style={{ color: t.muted }}>Payment terms</p>
                                <p className="font-medium" style={{ color: t.heading }}>Net 15 upon completion</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {['VENDOR_BID', 'RECEIPT_APPROVAL', 'INVEST_INVITE', 'TEAM_INVITE', 'TEAM_INVITE_REMINDER'].includes(selectedItem.type) ? (
                      <button
                        disabled={isExecutingAction}
                        onClick={handleExecuteAction}
                        className="px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: t.ctaBg, color: t.ctaFg, borderRadius: 2 }}
                      >
                        <span className="material-symbols-outlined text-[18px]">edit_square</span>
                        {actionLabel(selectedItem.type)}
                      </button>
                    ) : null}
                    <button
                      onClick={() => setComposeOpen(true)}
                      className="px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors"
                      style={{
                        background: 'transparent',
                        color: t.heading,
                        border: `1px solid ${t.border}`,
                        borderRadius: 2,
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">reply</span>
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <span
                className="material-symbols-outlined text-5xl mb-3"
                style={{ color: t.muted, opacity: 0.35, fontVariationSettings: "'FILL' 0, 'wght' 200" }}
              >
                inbox
              </span>
              <p className="text-base font-medium mb-1" style={{ color: t.heading }}>
                Select an item to review
              </p>
              <p className="text-sm max-w-xs" style={{ color: t.muted }}>
                Notifications that need a decision appear in the list. Open one to act.
              </p>
            </div>
          )}
        </section>
      </div>

      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        defaultProjectId={threadId || undefined}
      />
    </>
  );
}

export default function InboxPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = inboxTokens(isDark);

  return (
    <Suspense
      fallback={
        <div
          className="flex w-full h-[calc(100vh-64px)] items-center justify-center"
          style={{ background: t.pageBg }}
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: t.accent }} />
            <p className="text-sm font-medium" style={{ color: t.muted }}>
              Loading inbox…
            </p>
          </div>
        </div>
      }
    >
      <InboxNotificationCenter />
    </Suspense>
  );
}
