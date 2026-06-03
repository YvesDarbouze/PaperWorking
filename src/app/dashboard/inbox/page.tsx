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

  // Make selection state explicitly available to the feed if we want to drive the right pane
  // Right now, threadId is used to find activeThread. 
  // We can also let users click notifications to view details in the right pane.
  // The existing implementation used `activeThread` for thread views. Let's merge notification and thread details if possible, or just focus on the activeThread / activeNotification.

  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  // If we have an active thread from URL, use that, otherwise use selected notification
  const selectedItem = items.find(item => item.id === selectedNotificationId) || null;

  return (
    <>
      <div className="flex w-full h-[calc(100vh-64px)] bg-[#091015] text-[#dae4ec] overflow-hidden">
        
        {/* ═══ List Pane (Left) ═══ */}
        <section className={`w-full md:w-[420px] border-r border-white/10 flex flex-col bg-[#141d23]/50 shrink-0 ${ (activeThread || selectedItem) ? 'hidden md:flex' : 'flex' }`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#dae4ec]">Inbox</h3>
              <div className="flex items-center gap-2">
                {unreadTotal > 0 && (
                  <span className="px-2 py-0.5 bg-[#57f1db]/10 text-[#57f1db] border border-[#57f1db]/20 rounded font-mono text-[10px] font-bold">
                    {unreadTotal} UNREAD
                  </span>
                )}
                {unreadTotal > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-[#bacac5] hover:text-[#57f1db] transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setComposeOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#bacac5] hover:text-[#57f1db] transition-colors"
                  title="Compose email"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bacac5] w-4 h-4" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..." 
                className="w-full bg-[#060f15] border border-[#3c4a46] rounded-lg py-2 pl-10 pr-4 text-sm focus:border-[#57f1db] focus:ring-1 focus:ring-[#57f1db] outline-none transition-all placeholder:text-[#bacac5]/40 text-[#dae4ec]"
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
        <section className={`flex-1 flex flex-col bg-[#091015] relative overflow-hidden ${ (activeThread || selectedItem) ? 'flex' : 'hidden md:flex' }`}>
          {/* Background Decorative Elements */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#57f1db]/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-[#adc6ff]/5 rounded-full blur-[80px] pointer-events-none"></div>

          {activeThread ? (
            <ThreadDetail
              thread={activeThread}
              projectName={activeProjectName}
              onSendReply={handleSendReply}
              onBack={() => router.push('/dashboard/inbox')}
            />
          ) : selectedItem ? (
            <div className="flex-1 overflow-y-auto z-10 flex flex-col">
               {/* Header Actions */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#091015]/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedNotificationId(null)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-[#bacac5] transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-12 w-12 rounded-xl bg-[#091015]/60 backdrop-blur-xl border border-white/10 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] flex items-center justify-center text-[#57f1db]">
                      <CheckCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-[#dae4ec]">{selectedItem.title}</h3>
                      <p className="text-[10px] font-mono text-[#57f1db] uppercase">
                        ID: {selectedItem.id.slice(0, 8)} • STATUS: {selectedItem.read ? 'READ' : 'UNREAD'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => archiveItem(selectedItem.id)} className="p-2 rounded-lg hover:bg-white/5 text-[#bacac5] transition-colors">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>archive</span>
                    </button>
                    <button onClick={() => deleteItem(selectedItem.id)} className="p-2 rounded-lg hover:bg-white/5 text-[#bacac5] transition-colors">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>delete</span>
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/5 text-[#bacac5] transition-colors">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>more_vert</span>
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-3xl mx-auto space-y-8">
                    <div className="flex items-start gap-4">
                      {selectedItem.actor.avatarUrl ? (
                         <img className="h-12 w-12 rounded-full border-2 border-[#57f1db]/20 object-cover" src={selectedItem.actor.avatarUrl} alt={selectedItem.actor.name} />
                      ) : (
                         <div className="h-12 w-12 rounded-full border-2 border-[#57f1db]/20 bg-[#141d23] flex items-center justify-center text-[#57f1db] font-bold">
                           {selectedItem.actor.name[0]}
                         </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#dae4ec]">{selectedItem.actor.name}</span>
                          <span className="text-[10px] font-mono text-[#bacac5] uppercase">
                            {new Date(selectedItem.createdAt).toLocaleString()} UTC
                          </span>
                        </div>
                        {selectedItem.actor.role && (
                           <p className="text-sm text-[#57f1db] mb-4">{selectedItem.actor.role}</p>
                        )}
                        
                        <div className="bg-[#091015]/60 backdrop-blur-xl border border-white/10 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] p-6 rounded-2xl space-y-4 mt-4">
                          <p className="text-base leading-relaxed text-[#bacac5] whitespace-pre-wrap">
                            {selectedItem.body}
                          </p>
                                                   {/* Render Document details if it's a specific type of notification */}
                          {['DOCUMENT_SIGNED', 'RECEIPT_APPROVAL'].includes(selectedItem.type) && (
                            <div className="p-4 bg-[#060f15] rounded-xl border border-[#3c4a46] flex items-center justify-between mt-6">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#57f1db]">description</span>
                                <div>
                                  <p className="text-xs font-bold text-[#dae4ec]">Attached_Document.pdf</p>
                                  <p className="text-[10px] font-mono text-[#bacac5]">SECURE // PDF-DOCUMENT</p>
                                </div>
                              </div>
                              <button className="material-symbols-outlined text-[#bacac5] hover:text-[#57f1db] transition-colors">download</button>
                            </div>
                          )}

                          {selectedItem.type === 'VENDOR_BID' && (
                            <div className="p-4 bg-[#060f15] rounded-xl border border-[#3c4a46] flex flex-col gap-2 mt-6">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#57f1db]">engineering</span>
                                <div>
                                  <p className="text-xs font-bold text-[#dae4ec]">ABC Inspections Bid Summary</p>
                                  <p className="text-[10px] font-mono text-[#bacac5]">PROPOSAL // ELECTRICAL & GENERAL</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-white/5 text-xs text-[#bacac5]">
                                <div>
                                  <p className="text-[10px] uppercase text-[#bacac5]/60 font-semibold">Proposed Service Date</p>
                                  <p className="font-medium text-[#dae4ec]">Oct 30, 2023</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase text-[#bacac5]/60 font-semibold">Payment Terms</p>
                                  <p className="font-medium text-[#dae4ec]">Net 15 upon completion</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-center gap-4 py-8">
                      {['VENDOR_BID', 'RECEIPT_APPROVAL', 'INVEST_INVITE'].includes(selectedItem.type) ? (
                        <button 
                          onClick={() => toast.success('Action executed.')}
                          className="px-8 py-3 bg-[#57f1db] text-[#003731] font-bold rounded-full luminous-glow flex items-center gap-2 hover:brightness-110 transition-all"
                        >
                          <span className="material-symbols-outlined">edit_square</span>
                          EXECUTE ACTION
                        </button>
                      ) : null}
                      <button 
                         onClick={() => setComposeOpen(true)}
                         className="px-8 py-3 bg-[#091015]/60 backdrop-blur-xl border border-white/10 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)] text-[#dae4ec] font-bold rounded-full hover:bg-white/5 transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">reply</span>
                        REPLY
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terminal Overlay (Footer Style) */}
                <div className="bg-[#060f15]/80 backdrop-blur px-8 py-2 border-t border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex gap-4">
                    <p className="text-[10px] font-mono text-[#bacac5]"><span className="text-[#57f1db]">RUNNING:</span> inbox_handler.sh</p>
                    <p className="text-[10px] font-mono text-[#bacac5]"><span className="text-[#57f1db]">ENCRYPTION:</span> AES-256-GCM</p>
                  </div>
                  <p className="text-[10px] font-mono text-[#bacac5]">LAST_SYNC: 0.2s AGO</p>
                </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#bacac5] z-10">
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
        <div className="flex w-full h-[calc(100vh-64px)] items-center justify-center bg-[#091015]">
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
