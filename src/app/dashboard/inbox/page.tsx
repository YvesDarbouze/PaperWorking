'use client';

import React, { Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Plus, Loader2, CheckCheck, ArrowLeft, Settings } from 'lucide-react';
import { useInboxFeed } from '@/hooks/useInboxFeed';
import { useInboxThreads } from '@/hooks/useInboxThreads';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import InboxTabs from '@/components/inbox/InboxTabs';
import InboxFeed from '@/components/inbox/InboxFeed';
import ThreadDetail from '@/components/inbox/ThreadDetail';
import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Inbox — Unified Notification Center
   
   Combines notifications, team invitations, system alerts,
   and email threads into a single tabbed feed.
   
   Layout:
   ┌──────────────────────────────────────────────┐
   │  Header:  "Inbox" + badge + actions          │
   ├──────────────────────────────────────────────┤
   │  Tabs:  All │ Messages │ Invitations │ ...   │
   ├──────────────────────────────────────────────┤
   │  Feed:  Scrollable InboxItemCard list        │
   │  — OR —                                      │
   │  ThreadDetail:  Email thread view (slide-in) │
   └──────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════ */

function InboxNotificationCenter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const deals = useProjectStore((state) => state.projects);

  // ── Unified inbox feed (notifications, invitations, system) ──
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
    markAllRead,
    archiveItem,
    deleteItem,
    bulkArchive,
    bulkMarkRead,
    fetchMore,
    hasMore,
  } = useInboxFeed();

  // ── Legacy email threads (for the ThreadDetail slide-in) ──
  const {
    threads,
    markAsRead: markThreadAsRead,
  } = useInboxThreads();

  const threadId = searchParams.get('threadId') || searchParams.get('thread') || null;
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  const activeThread = threadId
    ? threads.find((t) => t.projectId === threadId) || null
    : null;

  const activeProjectName = activeThread
    ? deals.find((d) => d.id === activeThread.projectId)?.propertyName || 'Project'
    : '';

  // Mark thread as read when entering detail view
  React.useEffect(() => {
    if (threadId && activeThread && activeThread.unreadCount > 0) {
      markThreadAsRead(threadId);
    }
  }, [threadId, activeThread?.unreadCount, markThreadAsRead]);

  /* ── Send reply in thread view ── */
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
          toast.success('Reply sent.', {
            icon: '✉️',
            style: { background: '#0d0d0d', color: '#fff' },
          });
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to send.', {
            style: { background: '#0d0d0d', color: '#fff' },
          });
        }
      } catch (err) {
        console.error('[Inbox] Reply error:', err);
        toast.error('Network error.', {
          style: { background: '#0d0d0d', color: '#fff' },
        });
      }
    },
    [user, threadId, activeThread],
  );

  /* ── Handle "Mark All Read" ── */
  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success('All marked as read.', {
      icon: '✓',
      style: { background: '#0d0d0d', color: '#fff' },
    });
  };

  // If a thread is active, show the detail view
  if (threadId && activeThread) {
    return (
      <>
        <div className="flex flex-col w-full h-[calc(100vh-64px)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {/* Back button */}
          <div
            className="flex items-center gap-2 px-6 py-3 border-b"
            style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-canvas)' }}
          >
            <button
              onClick={() => router.push('/dashboard/inbox')}
              className="flex items-center gap-2 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Inbox
            </button>
          </div>
          <ThreadDetail
            thread={activeThread}
            projectName={activeProjectName}
            onSendReply={handleSendReply}
          />
        </div>
        <ComposeEmailModal
          isOpen={composeOpen}
          onClose={() => setComposeOpen(false)}
          defaultProjectId={threadId || undefined}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full h-[calc(100vh-64px)] bg-[#0b141a] text-[#dae4ec] overflow-hidden">
        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0b141a] border-b border-white/10 shadow-[0_0_20px_-5px_rgba(87,241,219,0.15)] h-16 shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#57f1db] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              notifications
            </span>
            <h1 className="text-xl font-bold tracking-tight text-[#57f1db]">
              Notifications
            </h1>
            {unreadTotal > 0 && (
              <span className="flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#57f1db] text-[#003731] min-w-5 luminous-glow">
                {unreadTotal}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Mark All Read */}
            {unreadTotal > 0 && (
              <button
                id="inbox-mark-all-read"
                onClick={handleMarkAllRead}
                className="text-[#bacac5] hover:text-[#57f1db] font-medium text-sm transition-colors active:scale-95 duration-200"
              >
                Mark all as read
              </button>
            )}

            {/* Compose Button */}
            <button
              id="inbox-compose-btn"
              onClick={() => setComposeOpen(true)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-[#57f1db] text-[#003731] hover:brightness-110 active:scale-95 transition-all luminous-glow shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Compose
            </button>

            {/* Settings button */}
            <button
              id="inbox-settings-btn"
              onClick={() => toast.success('Settings clicked.', {
                icon: '⚙️',
                style: { background: '#0b141a', color: '#dae4ec', border: '1px solid rgba(45,212,191,0.2)' }
              })}
              className="p-2 rounded-xl transition-all hover:bg-white/10 text-[#bacac5] hover:text-white active:scale-95"
              title="Notification Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══ Tabs ═══ */}
        <InboxTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadCounts={unreadCounts}
        />

        {/* ═══ Feed ═══ */}
        <InboxFeed
          items={items}
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
        />
      </div>

      {/* Compose Modal */}
      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
      />
    </>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full h-[calc(100vh-64px)] items-center justify-center bg-[#0b141a]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#57f1db]" />
            <p className="text-sm font-medium text-[#bacac5]">
              Loading Notifications...
            </p>
          </div>
        </div>
      }
    >
      <InboxNotificationCenter />
    </Suspense>
  );
}
