'use client';

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Plus, Loader2, CheckCheck, ArrowLeft, Settings } from 'lucide-react';
import { useInboxFeed } from '@/hooks/useInboxFeed';
import { useInboxThreads } from '@/hooks/useInboxThreads';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import InboxTabs from '@/components/inbox/InboxTabs';
import InboxFeed from '@/components/inbox/InboxFeed';
import ThreadDetail from '@/components/inbox/ThreadDetail';
import NegotiationThreadDetail from '@/components/inbox/NegotiationThreadDetail';
import ComposeEmailModal from '@/components/inbox/ComposeEmailModal';
import toast from 'react-hot-toast';
import { executeInboxAction } from '@/lib/services/inboxActionExecutor';

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

/* ── Notification detail MoreMenu ───────────────────────
   Renders a ⋮ button in the reading pane header with three
   real, persisted actions. No action is rendered without
   an onClick handler.
   ─────────────────────────────────────────────────────── */
interface NotifMoreMenuProps {
  item: import('@/types/notification').Notification;
  onMarkUnread: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function NotifMoreMenu({ item, onMarkUnread, onArchive, onDelete }: NotifMoreMenuProps) {
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
        id="notif-more-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg hover:bg-white/5 text-[#9E9DA0] transition-colors"
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
          className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-white/10 bg-[#161318] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)] z-50 py-1 overflow-hidden"
        >
          <button
            id="notif-menu-mark-unread"
            role="menuitem"
            onClick={() => { onMarkUnread(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#9E9DA0] hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>
              {item.read ? 'mark_email_unread' : 'drafts'}
            </span>
            {item.read ? 'Mark as Unread' : 'Mark as Read'}
          </button>
          <div className="my-1 border-t border-white/5" />
          <button
            id="notif-menu-archive"
            role="menuitem"
            onClick={() => { onArchive(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#9E9DA0] hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>archive</span>
            Archive
          </button>
          <button
            id="notif-menu-delete"
            role="menuitem"
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 text-red-400/80 hover:text-red-400 transition-colors text-left"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>delete</span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function InboxNotificationCenter() {
  useEffect(() => {
    document.title = "PaperWorking — Inbox";
  }, []);
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
    markAsUnread,
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
    markAsUnread: markThreadAsUnread,
  } = useInboxThreads();

  const threadId = searchParams?.get('threadId') || searchParams?.get('thread') || null;
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

  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  /* ── Auto-mark-as-read when a notification is selected ── */
  // Mirrors the thread-view pattern above (markThreadAsRead on unreadCount change).
  useEffect(() => {
    if (selectedNotificationId) {
      const item = items.find((n) => n.id === selectedNotificationId);
      if (item && !item.read) {
        markAsRead(selectedNotificationId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNotificationId]);

  // If we have an active thread from URL, use that, otherwise use selected notification
  const selectedItem = items.find(item => item.id === selectedNotificationId) || null;

  const negotiationParamId = searchParams?.get('negotiationId') || searchParams?.get('negotiation') || null;
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

  return (
    <>
      <div className="flex w-full h-[calc(100vh-64px)] bg-[#0d0a0b] text-[#9E9DA0] overflow-hidden">
        
        {/* ═══ List Pane (Left) ═══ */}
        <section className={`w-full md:w-[420px] border-r border-white/10 flex flex-col bg-[#161318]/50 shrink-0 ${ (activeThread || activeNegotiationId || selectedItem) ? 'hidden md:flex' : 'flex' }`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#9E9DA0]">Inbox</h3>
              <div className="flex items-center gap-2">
                {unreadTotal > 0 && (
                  <span className="px-2 py-0.5 bg-[#454955]/10 text-[#454955] border border-[#454955]/20 rounded font-mono text-[10px] font-bold">
                    {unreadTotal} UNREAD
                  </span>
                )}
                {unreadTotal > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-[#9E9DA0] hover:text-[#454955] transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setComposeOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#9E9DA0] hover:text-[#454955] transition-colors"
                  title="Compose email"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9DA0] w-4 h-4" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..." 
                className="w-full bg-[#0d0a0b] border border-[#3c4a46] rounded-lg py-2 pl-10 pr-4 text-sm focus:border-[#454955] focus:ring-1 focus:ring-[#454955] outline-none transition-all placeholder:text-[#9E9DA0]/40 text-[#9E9DA0]"
              />
            </div>
          </div>

          {/* Tab filter bar */}
          <InboxTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCounts={unreadCounts}
          />

          <div className="flex-1 overflow-y-auto no-scrollbar relative">
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

        {/* ═══ Reading/Action Pane (Right) ═══ */}
        <section className={`flex-1 flex flex-col bg-[#0d0a0b] relative overflow-hidden ${ (activeThread || activeNegotiationId || selectedItem) ? 'flex' : 'hidden md:flex' }`}>
          {/* Background Decorative Elements */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#454955]/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-[#7A9EAA]/5 rounded-full blur-[80px] pointer-events-none"></div>

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
            <div className="flex-1 overflow-y-auto z-10 flex flex-col">
               {/* Header Actions */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0d0a0b]/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedNotificationId(null)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-[#9E9DA0] transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-12 w-12 rounded-xl bg-[#0d0a0b]/60 backdrop-blur-xl border border-white/10 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] flex items-center justify-center text-[#454955]">
                      <CheckCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-[#9E9DA0]">{selectedItem.title}</h3>
                      <p className="text-[10px] font-mono text-[#454955] uppercase">
                        ID: {selectedItem.id.slice(0, 8)} • STATUS: {selectedItem.read ? 'READ' : 'UNREAD'}
                      </p>
                    </div>
                  </div>
                   <div className="flex gap-2">
                     <button onClick={() => archiveItem(selectedItem.id)} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9DA0] transition-colors" title="Archive">
                       <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>archive</span>
                     </button>
                     <button onClick={() => deleteItem(selectedItem.id)} className="p-2 rounded-lg hover:bg-white/5 text-[#9E9DA0] transition-colors" title="Delete">
                       <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>delete</span>
                     </button>
                     <NotifMoreMenu
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

                {/* Message Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-3xl mx-auto space-y-8">
                    <div className="flex items-start gap-4">
                      {selectedItem.actor.avatarUrl ? (
                         <img className="h-12 w-12 rounded-full border-2 border-[#454955]/20 object-cover" src={selectedItem.actor.avatarUrl} alt={selectedItem.actor.name} />
                      ) : (
                         <div className="h-12 w-12 rounded-full border-2 border-[#454955]/20 bg-[#161318] flex items-center justify-center text-[#454955] font-bold">
                           {selectedItem.actor.name[0]}
                         </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#9E9DA0]">{selectedItem.actor.name}</span>
                          <span className="text-[10px] font-mono text-[#9E9DA0] uppercase">
                            {new Date(selectedItem.createdAt).toLocaleString()} UTC
                          </span>
                        </div>
                        {selectedItem.actor.role && (
                           <p className="text-sm text-[#454955] mb-4">{selectedItem.actor.role}</p>
                        )}
                        
                        <div className="bg-[#0d0a0b]/60 backdrop-blur-xl border border-white/10 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] p-6 rounded-2xl space-y-4 mt-4">
                          <p className="text-base leading-relaxed text-[#9E9DA0] whitespace-pre-wrap">
                            {selectedItem.body}
                          </p>
                                                   {/* Render Document details if it's a specific type of notification */}
                          {['DOCUMENT_SIGNED', 'RECEIPT_APPROVAL'].includes(selectedItem.type) && (
                            <div className="p-4 bg-[#0d0a0b] rounded-xl border border-[#3c4a46] flex items-center justify-between mt-6">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#454955]">description</span>
                                <div>
                                  <p className="text-xs font-bold text-[#9E9DA0]">Attached_Document.pdf</p>
                                  <p className="text-[10px] font-mono text-[#9E9DA0]">SECURE // PDF-DOCUMENT</p>
                                </div>
                              </div>
                              <button className="material-symbols-outlined text-[#9E9DA0] hover:text-[#454955] transition-colors">download</button>
                            </div>
                          )}

                          {selectedItem.type === 'VENDOR_BID' && (
                            <div className="p-4 bg-[#0d0a0b] rounded-xl border border-[#3c4a46] flex flex-col gap-2 mt-6">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#454955]">engineering</span>
                                <div>
                                  <p className="text-xs font-bold text-[#9E9DA0]">ABC Inspections Bid Summary</p>
                                  <p className="text-[10px] font-mono text-[#9E9DA0]">PROPOSAL // ELECTRICAL & GENERAL</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-white/5 text-xs text-[#9E9DA0]">
                                <div>
                                  <p className="text-[10px] uppercase text-[#9E9DA0]/60 font-semibold">Proposed Service Date</p>
                                  <p className="font-medium text-[#9E9DA0]">Oct 30, 2023</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase text-[#9E9DA0]/60 font-semibold">Payment Terms</p>
                                  <p className="font-medium text-[#9E9DA0]">Net 15 upon completion</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-center gap-4 py-8">
                      {['VENDOR_BID', 'RECEIPT_APPROVAL', 'INVEST_INVITE', 'TEAM_INVITE', 'TEAM_INVITE_REMINDER'].includes(selectedItem.type) ? (
                        <button 
                          disabled={isExecutingAction}
                          onClick={handleExecuteAction}
                          className="px-8 py-3 bg-[#454955] text-[#0d0a0b] font-bold rounded-full luminous-glow flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined">edit_square</span>
                          EXECUTE ACTION
                        </button>
                      ) : null}
                      <button 
                         onClick={() => setComposeOpen(true)}
                         className="px-8 py-3 bg-[#0d0a0b]/60 backdrop-blur-xl border border-white/10 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] text-[#9E9DA0] font-bold rounded-full hover:bg-white/5 transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">reply</span>
                        REPLY
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terminal Overlay (Footer Style) */}
                <div className="bg-[#0d0a0b]/80 backdrop-blur px-8 py-2 border-t border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex gap-4">
                    <p className="text-[10px] font-mono text-[#9E9DA0]"><span className="text-[#454955]">RUNNING:</span> inbox_handler.sh</p>
                    <p className="text-[10px] font-mono text-[#9E9DA0]"><span className="text-[#454955]">ENCRYPTION:</span> AES-256-GCM</p>
                  </div>
                  <p className="text-[10px] font-mono text-[#9E9DA0]">LAST_SYNC: 0.2s AGO</p>
                </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#9E9DA0] z-10">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>inbox</span>
              <p className="text-lg font-medium">Select an item to read</p>
              <p className="text-sm opacity-60">Your messages and notifications will appear here.</p>
            </div>
          )}
        </section>
      </div>

      {/* Compose Modal */}
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
        <div className="flex w-full h-[calc(100vh-64px)] items-center justify-center bg-[#0d0a0b]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#454955]" />
            <p className="text-sm font-medium text-[#9E9DA0]">
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
