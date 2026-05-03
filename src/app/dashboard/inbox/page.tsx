'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Plus, Loader2 } from 'lucide-react';
import { useInboxThreads } from '@/hooks/useInboxThreads';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import ThreadList from '@/components/inbox/ThreadList';
import ThreadDetail from '@/components/inbox/ThreadDetail';
import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Command Center — Live Inbox
   
   Firestore-backed split-pane inbox replacing mock data.
   Left pane: Thread list with real-time unread badges
   Right pane: Message thread with inline reply
   ═══════════════════════════════════════════════════════ */

function InboxSplitPane() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const deals = useProjectStore((state) => state.projects);
  const { threads, loading, error, unreadTotal, markAsRead } = useInboxThreads();

  const threadId = searchParams.get('threadId') || searchParams.get('thread') || null;
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  const activeThread = threads.find((t) => t.projectId === threadId) || null;

  // Get project name for the active thread
  const activeProjectName = activeThread
    ? deals.find((d) => d.id === activeThread.projectId)?.propertyName || 'Project'
    : '';

  // Mark thread as read when selected
  useEffect(() => {
    if (threadId && activeThread && activeThread.unreadCount > 0) {
      markAsRead(threadId);
    }
  }, [threadId, activeThread?.unreadCount, markAsRead]);

  const handleSelectThread = useCallback(
    (projectId: string) => {
      router.push(`/dashboard/inbox?threadId=${projectId}`);
    },
    [router],
  );

  /* ── Send Reply ── */
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

  // Filter threads by search
  const filteredThreads = searchQuery.trim()
    ? threads.filter((t) => {
        const q = searchQuery.toLowerCase();
        return (
          t.lastMessage.senderName.toLowerCase().includes(q) ||
          t.lastMessage.body.toLowerCase().includes(q) ||
          (t.lastMessage.subject || '').toLowerCase().includes(q)
        );
      })
    : threads;

  return (
    <>
      <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden">
        {/* ═══ Left Pane: Thread List (30%) ═══ */}
        <div
          className="w-[30%] flex flex-col border-r overflow-hidden"
          style={{ borderColor: '#A5A5A5', backgroundColor: 'var(--bg-canvas)' }}
        >
          {/* Header */}
          <div
            className="p-6 border-b"
            style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-canvas)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1
                  className="text-xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Inbox
                </h1>
                {unreadTotal > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {unreadTotal} unread
                  </p>
                )}
              </div>
              <button
                id="inbox-compose-btn"
                onClick={() => setComposeOpen(true)}
                className="ag-button !py-2 !px-4 !text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Compose
              </button>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40"
                style={{ color: 'var(--text-primary)' }}
              />
              <input
                id="inbox-search"
                type="text"
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border-none outline-none transition-colors rounded-md"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Thread List */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2
                className="w-5 h-5 animate-spin opacity-20"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-xs text-center font-medium" style={{ color: 'var(--text-secondary)' }}>
                {error}
              </p>
            </div>
          ) : (
            <ThreadList
              threads={filteredThreads}
              activeThreadId={threadId}
              onSelect={handleSelectThread}
            />
          )}
        </div>

        {/* ═══ Right Pane: Active Thread (70%) ═══ */}
        <div
          className="w-[70%] flex flex-col overflow-hidden relative"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {activeThread ? (
            <ThreadDetail
              thread={activeThread}
              projectName={activeProjectName}
              onSendReply={handleSendReply}
            />
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-ui)',
                }}
              >
                <Search className="w-6 h-6 opacity-10" style={{ color: 'var(--text-primary)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No conversation selected
              </p>
              <p className="text-xs mt-1" style={{ color: '#CCCCCC' }}>
                Select a thread from the list to view the history
              </p>
            </div>
          )}
        </div>
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
  return (
    <Suspense
      fallback={
        <div
          className="flex w-full h-[calc(100vh-64px)] items-center justify-center"
          style={{ backgroundColor: 'var(--bg-canvas)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--text-secondary)' }}
            />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Loading Command Center...
            </p>
          </div>
        </div>
      }
    >
      <InboxSplitPane />
    </Suspense>
  );
}
