'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Inbox, UserCheck, Tag, LifeBuoy, Plus } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant, getPriorityVariant } from '@/components/admin/StatusBadge';
import TicketDetailDrawer from '@/components/admin/TicketDetailDrawer';
import { getSupportTickets, getTaxonomy, getSavedReplies, createSavedReply } from '@/actions/adminSupport';
import type { SupportTicket, TaxonomyTag, SavedReply } from '@/lib/support/types';

/* ═══════════════════════════════════════════════════════
   Admin Tickets — Support Ticket Inbox & Drivers Surface
   (Prompt 3 Part A — Real Firestore support_tickets)
   ═══════════════════════════════════════════════════════ */

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-12 animate-shimmer rounded"
          style={{ border: '1px solid var(--border-ui)', animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export default function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState<'mine' | 'unassigned' | 'all' | 'drivers' | 'taxonomy'>('unassigned');
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomyTag[]>([]);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [_error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New saved reply state
  const [newReplyTitle, setNewReplyTitle] = useState('');
  const [newReplyContent, setNewReplyContent] = useState('');

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [list, tax, replies] = await Promise.all([
        getSupportTickets({ queue: activeTab === 'mine' ? 'mine' : activeTab === 'unassigned' ? 'unassigned' : 'all' }),
        getTaxonomy(),
        getSavedReplies(),
      ]);
      setTickets(list);
      setTaxonomy(tax);
      setSavedReplies(replies);
    } catch {
      setError(true);
    }
  }, [activeTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateSavedReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyTitle.trim() || !newReplyContent.trim()) return;
    const res = await createSavedReply({ title: newReplyTitle, content: newReplyContent });
    if (res.success) {
      setNewReplyTitle('');
      setNewReplyContent('');
      fetchData();
    } else {
      alert(`Failed to create saved reply: ${res.error}`);
    }
  };

  const columns: Column<SupportTicket>[] = [
    {
      key: 'id',
      label: 'Ticket ID',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
          {row.id}
        </span>
      ),
    },
    {
      key: 'subject',
      label: 'Subject & Customer',
      sortable: true,
      render: (row) => (
        <div style={{ maxWidth: 280 }}>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {row.subject}
          </p>
          <p className="text-xs mt-0.5 text-gray-500">
            {row.requesterName} ({row.requesterEmail})
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (row) => (
        <StatusBadge label={row.priority} variant={getPriorityVariant(row.priority)} />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <StatusBadge label={row.status.replace('_', ' ')} variant={getStatusVariant(row.status)} />
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.tags.map((t) => (
            <span key={t} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded">
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'assigneeName',
      label: 'Assignee',
      sortable: true,
      render: (row) => (
        <span
          className="text-xs font-semibold"
          style={{ color: !row.assigneeName ? '#F06543' : 'var(--text-primary)' }}
        >
          {row.assigneeName || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Activity',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500 font-mono">
          {formatTimestamp(row.updatedAt)}
        </span>
      ),
    },
  ];

  const list = tickets || [];
  const _activeCount = list.filter((t) => t.status === 'active').length;
  const _pendingCount = list.filter((t) => t.status === 'pending').length;
  const _closedCount = list.filter((t) => t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Support Inbox & Contact Drivers
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage customer inquiries, internal notes, tag taxonomy, and saved replies
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors border rounded"
          style={{
            borderColor: 'var(--border-ui)',
            color: 'var(--text-primary)',
            opacity: refreshing ? 0.5 : 1,
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-xs font-semibold" style={{ borderColor: 'var(--border-ui)' }}>
        <button
          onClick={() => setActiveTab('unassigned')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'unassigned' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Inbox className="w-4 h-4 text-amber-500" />
          Unassigned Queue
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'mine' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-500" />
          My Assigned Tickets
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'all' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          All Tickets ({list.length})
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'drivers' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Tag className="w-4 h-4 text-emerald-500" />
          Top Contact Drivers
        </button>
        <button
          onClick={() => setActiveTab('taxonomy')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'taxonomy' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Taxonomy & Templates
        </button>
      </div>

      {/* Ticket List View (Mine, Unassigned, All) */}
      {['mine', 'unassigned', 'all'].includes(activeTab) && (
        <div className="space-y-6">
          {!tickets ? (
            <TableSkeleton />
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
              <LifeBuoy className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No Tickets in this Queue</h3>
              <p className="text-xs text-gray-500 mt-1">Inquiries submitted via the public contact form will automatically populate here in real-time.</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tickets}
              searchKeys={['id', 'subject', 'requesterName', 'requesterEmail', 'assigneeName']}
              searchPlaceholder="Search tickets by ID, subject, requester, or assignee…"
              actions={(row) => (
                <button
                  onClick={() => setSelectedTicketId(row.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded border hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  Open Conversation
                </button>
              )}
            />
          )}
        </div>
      )}

      {/* Contact Drivers View */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="p-5 border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Top Contact Drivers by Tag Taxonomy</h3>
            {taxonomy.length === 0 ? (
              <p className="text-xs text-gray-500">No taxonomy tags configured.</p>
            ) : (
              <div className="space-y-3">
                {taxonomy.map((tag) => {
                  const count = list.filter((t) => t.tags.includes(tag.slug)).length;
                  const pct = list.length > 0 ? Math.round((count / list.length) * 100) : 0;
                  return (
                    <div key={tag.slug} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{tag.name} ({tag.slug})</span>
                        <span className="font-mono text-gray-500">{count} tickets ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded">
                        <div className="h-full bg-black dark:bg-white rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Taxonomy & Saved Reply Templates View */}
      {activeTab === 'taxonomy' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tag Taxonomy */}
          <div className="p-5 border rounded-lg space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Controlled Tag Taxonomy</h3>
            <div className="space-y-2">
              {taxonomy.map((t) => (
                <div key={t.slug} className="p-3 border rounded text-xs flex justify-between items-start">
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{t.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-gray-500">({t.slug})</span>
                    <p className="text-gray-500 text-[11px] mt-0.5">{t.description}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded text-[10px]">Active</span>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Reply Templates */}
          <div className="p-5 border rounded-lg space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Saved Reply Templates</h3>
            {savedReplies.length === 0 ? (
              <p className="text-xs text-gray-500">No saved reply templates created yet. Create one below to speed up customer replies.</p>
            ) : (
              <div className="space-y-2">
                {savedReplies.map((sr) => (
                  <div key={sr.id} className="p-3 border rounded text-xs">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{sr.title}</p>
                    <p className="text-gray-500 text-[11px] mt-1 whitespace-pre-wrap">{sr.content}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleCreateSavedReply} className="space-y-3 pt-3 border-t">
              <h4 className="text-xs font-bold uppercase text-gray-500">Create New Template</h4>
              <input
                type="text"
                value={newReplyTitle}
                onChange={(e) => setNewReplyTitle(e.target.value)}
                placeholder="Template Title (e.g. Plaid Re-Auth Instructions)"
                className="w-full p-2 text-xs border rounded bg-white dark:bg-zinc-900"
              />
              <textarea
                value={newReplyContent}
                onChange={(e) => setNewReplyContent(e.target.value)}
                placeholder="Template Message Content..."
                rows={3}
                className="w-full p-2 text-xs border rounded bg-white dark:bg-zinc-900"
              />
              <button type="submit" className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded">
                <Plus className="w-3.5 h-3.5" /> Save Template
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Drawer */}
      <TicketDetailDrawer
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        onRefreshParent={fetchData}
      />
    </div>
  );
}
