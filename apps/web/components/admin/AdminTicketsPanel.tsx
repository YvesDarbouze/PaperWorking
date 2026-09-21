'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  StatusPill,
} from '@/components/admin/admin-ui';
import type {
  AdminTicketRecord,
  TicketEngagementMessage,
  TicketKind,
  TicketPriority,
  TicketQueue,
  TicketStatus,
} from '@/lib/tickets/ticket-store';

export default function AdminTicketsPanel({
  initialTickets = [],
}: {
  initialTickets?: AdminTicketRecord[];
} = {}) {
  const [tickets, setTickets] = useState<AdminTicketRecord[]>(initialTickets);
  const [loading, setLoading] = useState(initialTickets.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [queue, setQueue] = useState<TicketQueue | 'all'>('all');
  const [kindFilter, setKindFilter] = useState<TicketKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket Drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketRecord | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Composer State
  const [composerMode, setComposerMode] = useState<'reply' | 'internal'>('reply');
  const [messageContent, setMessageContent] = useState('');
  const [autoStatus, setAutoStatus] = useState<TicketStatus | ''>('waiting_on_user');
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const [composerFeedback, setComposerFeedback] = useState<string | null>(null);

  // Updating Ticket Status/Priority in Drawer
  const [updatingField, setUpdatingField] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tickets', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load tickets');
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Fetch ticket details when opening drawer
  const openTicket = useCallback(async (ticketId: string) => {
    setSelectedId(ticketId);
    setFetchingDetail(true);
    setComposerFeedback(null);
    setMessageContent('');
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setSelectedTicket(data.ticket);
      }
    } catch {
      // Fall back to ticket from list if available
      const fallback = tickets.find((t) => t.id === ticketId);
      if (fallback) setSelectedTicket(fallback);
    } finally {
      setFetchingDetail(false);
    }
  }, [tickets]);

  const closeDrawer = () => {
    setSelectedId(null);
    setSelectedTicket(null);
    setComposerFeedback(null);
    setMessageContent('');
  };

  // Filter tickets locally
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (queue !== 'all' && t.queue !== queue) return false;
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.requesterEmail.toLowerCase().includes(q) ||
          t.requesterName.toLowerCase().includes(q) ||
          (t.module && t.module.toLowerCase().includes(q)) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [tickets, queue, kindFilter, statusFilter, priorityFilter, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'open').length,
      inProgress: tickets.filter((t) => t.status === 'in_progress').length,
      waitingOnUser: tickets.filter((t) => t.status === 'waiting_on_user').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
      critical: tickets.filter((t) => t.priority === 'critical' || t.priority === 'high').length,
      dinnerPledges: tickets.filter((t) => t.dinnerPledge).length,
    };
  }, [tickets]);

  // Handle Status / Priority Update
  const handleUpdateTicket = async (updates: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    queue?: TicketQueue;
  }) => {
    if (!selectedTicket) return;
    setUpdatingField(Object.keys(updates)[0] || 'field');
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setSelectedTicket(data.ticket);
        setTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
    } finally {
      setUpdatingField(null);
    }
  };

  // Handle Post Message (Reply or Internal Note)
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !messageContent.trim() || submittingMessage) return;

    setSubmittingMessage(true);
    setComposerFeedback(null);

    const isInternal = composerMode === 'internal';

    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: messageContent.trim(),
          isInternalNote: isInternal,
          newStatus: autoStatus || undefined,
          adminName: 'Admin Operations',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post message');

      if (data.ticket) {
        setSelectedTicket(data.ticket);
        setTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
      }

      setMessageContent('');
      setComposerFeedback(
        isInternal
          ? 'Internal note recorded.'
          : `Reply sent to ${selectedTicket.requesterEmail} via no_reply@paperworking.co.`,
      );
    } catch (err) {
      setComposerFeedback(err instanceof Error ? err.message : 'Error sending message.');
    } finally {
      setSubmittingMessage(false);
    }
  };

  const getKindBadge = (kind: TicketKind) => {
    switch (kind) {
      case 'bug':
        return <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">🐛 Bug</span>;
      case 'feature_request':
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">💡 Feature</span>;
      case 'callback':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">📞 Callback</span>;
      case 'support':
        return <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">✉️ Support</span>;
      case 'question':
        return <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">❓ Question</span>;
      default:
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">{kind}</span>;
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <AdminPageShell title="Tickets & Customer Engagement" subtitle="Support queues, bug triage, and feature requests.">
        <AdminStateBlock loading={true} error={null} onRetry={fetchTickets} />
      </AdminPageShell>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <AdminPageShell title="Tickets & Customer Engagement" subtitle="Support queues, bug triage, and feature requests.">
        <AdminStateBlock loading={false} error={error} onRetry={fetchTickets} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Tickets & Customer Engagement"
      subtitle="Live platform support queues, bug triage, feature requests with dinner pledges, and telephone callbacks."
      actions={
        <button
          type="button"
          onClick={fetchTickets}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-black/10 bg-white p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50">Total Tickets</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[#111]">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Open Tickets</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{stats.open}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">In Progress</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-blue-700">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Waiting on User</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700">{stats.waitingOnUser}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">High / Critical</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-rose-700">{stats.critical}</p>
        </div>
        <div className="rounded-xl border border-emerald-300 bg-emerald-500/10 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">🍽️ Dinner Pledges</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-800">{stats.dinnerPledges}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Queue Selector */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'unassigned', 'mine'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setQueue(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                  queue === id
                    ? 'bg-black text-white'
                    : 'border border-black/10 bg-white text-black/70 hover:bg-black/5'
                }`}
              >
                {id === 'mine' ? 'Assigned to Me' : id === 'unassigned' ? 'Unassigned' : 'All Queues'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search ID, subject, email, tags…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs text-[#111] placeholder:text-black/40 focus:border-black focus:outline-hidden"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/5 text-xs">
          <span className="font-semibold text-black/50">Filters:</span>

          {/* Kind Filter */}
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as any)}
            className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs text-[#111]"
          >
            <option value="all">All Types</option>
            <option value="bug">🐛 Bugs</option>
            <option value="feature_request">💡 Feature Requests</option>
            <option value="callback">📞 Callbacks</option>
            <option value="support">✉️ Support</option>
            <option value="question">❓ Questions</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs text-[#111]"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_user">Waiting on User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs text-[#111]"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(kindFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setKindFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-black/55 underline underline-offset-2 hover:text-black"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-black/50">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </span>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-xs">
        <table className="min-w-full text-left text-sm" data-testid="admin-tickets-table">
          <thead className="border-b border-black/10 bg-[#faf8f5] text-[11px] font-semibold uppercase tracking-wider text-black/50">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-black/50">
                  No tickets match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="transition hover:bg-black/[0.015] cursor-pointer"
                  onClick={() => openTicket(ticket.id)}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#111]">{ticket.id}</span>
                      {getKindBadge(ticket.kind)}
                      {ticket.dinnerPledge && (
                        <span className="inline-flex items-center rounded-full border border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          🍽️ Dinner Pledge
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-black/80 line-clamp-1">{ticket.subject}</p>
                    {ticket.module && (
                      <span className="text-[11px] text-black/50">Module: {ticket.module}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-semibold text-[#111]">{ticket.requesterName}</p>
                    <p className="text-[11px] text-black/55">{ticket.requesterEmail}</p>
                    <span className="mt-0.5 inline-block rounded bg-black/5 px-1.5 py-0.2 text-[10px] uppercase font-medium text-black/60">
                      {ticket.requesterTier}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={ticket.priority} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={ticket.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5 text-xs text-black/60">
                      <span className="inline-flex items-center gap-1">
                        💬 {ticket.engagementHistory?.length || 1} msg
                      </span>
                      {ticket.hasAttachment && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                          📎 {ticket.attachmentName || 'Attachment'}
                        </span>
                      )}
                      <span className="text-[10px] text-black/40">
                        {new Date(ticket.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openTicket(ticket.id)}
                      className="rounded-lg border border-black/15 bg-white px-3 py-1 text-xs font-semibold text-black transition hover:bg-black hover:text-white"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Engagement Inspector Drawer */}
      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={closeDrawer}
        >
          <aside
            className="flex h-full w-full max-w-2xl flex-col bg-[#fcfbf9] shadow-2xl overflow-hidden border-l border-black/15"
            onClick={(e) => e.stopPropagation()}
            data-testid="admin-ticket-inspector"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-black/10 bg-white p-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#111]">{selectedTicket?.id || selectedId}</span>
                  {selectedTicket && getKindBadge(selectedTicket.kind)}
                  {selectedTicket?.dinnerPledge && (
                    <span className="inline-flex items-center rounded-full border border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      🍽️ Dinner Pledge
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-[#111]">{selectedTicket?.subject || 'Ticket Details'}</h3>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-1.5 text-black/50 transition hover:bg-black/5 hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* Quick Status / Priority Bar */}
            {selectedTicket && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#faf8f5] px-5 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black/60">Status:</span>
                  <select
                    value={selectedTicket.status}
                    disabled={updatingField === 'status'}
                    onChange={(e) => handleUpdateTicket({ status: e.target.value as any })}
                    className="rounded-md border border-black/15 bg-white px-2 py-1 font-semibold text-[#111]"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_user">Waiting on User</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black/60">Priority:</span>
                  <select
                    value={selectedTicket.priority}
                    disabled={updatingField === 'priority'}
                    onChange={(e) => handleUpdateTicket({ priority: e.target.value as any })}
                    className="rounded-md border border-black/15 bg-white px-2 py-1 font-semibold text-[#111]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black/60">Assignee:</span>
                  <button
                    type="button"
                    disabled={updatingField === 'assignedTo'}
                    onClick={() => {
                      const newAssignee = selectedTicket.assignedTo ? undefined : 'admin@paperworking.co';
                      handleUpdateTicket({
                        assignedTo: newAssignee,
                        queue: newAssignee ? 'mine' : 'unassigned',
                      });
                    }}
                    className={`rounded-md border px-2 py-1 font-semibold transition ${
                      selectedTicket.assignedTo
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-black/15 bg-white text-black/70 hover:bg-black/5'
                    }`}
                  >
                    {selectedTicket.assignedTo ? 'Assigned to Me' : 'Claim Ticket'}
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Body: Metadata + History */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {fetchingDetail && !selectedTicket ? (
                <p className="text-sm text-black/50">Loading engagement history…</p>
              ) : selectedTicket ? (
                <>
                  {/* Context Info Card */}
                  <div className="rounded-xl border border-black/10 bg-white p-4 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="font-semibold text-black/45 uppercase text-[10px]">Requester</p>
                        <p className="font-semibold text-[#111]">{selectedTicket.requesterName}</p>
                        <a
                          href={`mailto:${selectedTicket.requesterEmail}`}
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          {selectedTicket.requesterEmail}
                        </a>
                      </div>
                      <div>
                        <p className="font-semibold text-black/45 uppercase text-[10px]">Account Tier</p>
                        <span className="inline-block mt-0.5 rounded bg-black/5 px-2 py-0.5 font-semibold capitalize text-[#111]">
                          {selectedTicket.requesterTier}
                        </span>
                      </div>
                      {selectedTicket.phone && (
                        <div>
                          <p className="font-semibold text-black/45 uppercase text-[10px]">Callback Phone</p>
                          <a href={`tel:${selectedTicket.phone}`} className="font-bold text-emerald-700 underline">
                            {selectedTicket.phone}
                          </a>
                          {selectedTicket.preferredWindow && (
                            <p className="text-[11px] text-black/55">{selectedTicket.preferredWindow}</p>
                          )}
                        </div>
                      )}
                      {selectedTicket.module && (
                        <div>
                          <p className="font-semibold text-black/45 uppercase text-[10px]">Module</p>
                          <p className="font-medium text-[#111]">{selectedTicket.module}</p>
                        </div>
                      )}
                      {selectedTicket.reilPhase && (
                        <div>
                          <p className="font-semibold text-black/45 uppercase text-[10px]">REIL Phase</p>
                          <p className="font-medium text-[#111] capitalize">{selectedTicket.reilPhase}</p>
                        </div>
                      )}
                    </div>

                    {/* Dinner Guarantee Banner */}
                    {selectedTicket.dinnerPledge && (
                      <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-900">
                        <span className="font-bold">🍽️ Investor Dinner Guarantee:</span> If engineering implements
                        this feature request, customer is promised dinner on PaperWorking!
                      </div>
                    )}

                    {/* Diagnostics Details */}
                    {selectedTicket.diagnostics && (
                      <details className="mt-2 rounded-lg bg-black/[0.03] p-2 text-xs">
                        <summary className="cursor-pointer font-semibold text-black/70">
                          Automated Client Telemetry & Diagnostics
                        </summary>
                        <div className="mt-2 space-y-1 font-mono text-[11px] text-black/70">
                          {Object.entries(selectedTicket.diagnostics).map(([k, v]) => (
                            <div key={k}>
                              <span className="font-bold">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Attachment Preview */}
                    {selectedTicket.hasAttachment && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-white p-2">
                        <span className="text-base">📎</span>
                        <div className="flex-1">
                          <p className="font-semibold text-xs text-[#111]">
                            {selectedTicket.attachmentName || 'attachment.png'}
                          </p>
                          <p className="text-[10px] text-black/50">Attached by user with client diagnostic context</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Engagement History Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-black/50">
                      Engagement Timeline & Messages ({selectedTicket.engagementHistory?.length || 0})
                    </h4>

                    <div className="space-y-3">
                      {selectedTicket.engagementHistory?.map((msg) => {
                        const isUser = msg.author === 'user';
                        const isSystem = msg.author === 'system';
                        const isInternal = msg.isInternalNote;

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="text-center text-[11px] text-black/45 py-1">
                              • {msg.content} ({new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`rounded-xl p-4 text-xs space-y-1.5 border shadow-2xs ${
                              isUser
                                ? 'border-black/10 bg-white'
                                : isInternal
                                ? 'border-amber-200 bg-amber-50/60'
                                : 'border-emerald-200 bg-emerald-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#111]">{msg.authorName}</span>
                                {isUser ? (
                                  <span className="rounded bg-black/5 px-1.5 py-0.2 text-[10px] text-black/60 font-medium">
                                    Customer
                                  </span>
                                ) : isInternal ? (
                                  <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                                    🔒 Internal Note
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-200 px-1.5 py-0.2 text-[10px] font-bold text-emerald-900">
                                    ✉️ Outbound Email
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-black/40">
                                {new Date(msg.timestamp).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <p className="text-black/85 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-black/50">Ticket not found.</p>
              )}
            </div>

            {/* Composer Box */}
            {selectedTicket && (
              <form onSubmit={handlePostMessage} className="border-t border-black/10 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {/* Mode Selector */}
                  <div className="flex rounded-lg border border-black/15 p-0.5 bg-[#f6f4ef]">
                    <button
                      type="button"
                      onClick={() => setComposerMode('reply')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                        composerMode === 'reply' ? 'bg-white text-black shadow-xs' : 'text-black/60 hover:text-black'
                      }`}
                    >
                      ✉️ Reply to Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerMode('internal')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                        composerMode === 'internal' ? 'bg-white text-amber-900 shadow-xs' : 'text-black/60 hover:text-black'
                      }`}
                    >
                      🔒 Internal Note
                    </button>
                  </div>

                  {/* Auto-status */}
                  {composerMode === 'reply' && (
                    <label className="flex items-center gap-1.5 text-xs text-black/65 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoStatus === 'waiting_on_user'}
                        onChange={(e) => setAutoStatus(e.target.checked ? 'waiting_on_user' : '')}
                        className="rounded border-black/20"
                      />
                      <span>Set Waiting on User</span>
                    </label>
                  )}
                </div>

                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={
                    composerMode === 'reply'
                      ? `Type official reply to ${selectedTicket.requesterName} (sent from no_reply@paperworking.co)…`
                      : 'Type internal staff note (visible to operations team only)…'
                  }
                  className="min-h-24 w-full rounded-xl border border-black/15 bg-white p-3 text-xs text-[#111] placeholder:text-black/40 focus:border-black focus:outline-hidden"
                />

                <div className="flex items-center justify-between">
                  {composerFeedback ? (
                    <p className="text-xs font-medium text-emerald-800">{composerFeedback}</p>
                  ) : (
                    <p className="text-[11px] text-black/45">
                      {composerMode === 'reply'
                        ? '✉️ Dispatches SendGrid notification to customer'
                        : '🔒 Saved securely to ticket ledger'}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!messageContent.trim() || submittingMessage}
                    className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80 disabled:opacity-40"
                  >
                    {submittingMessage
                      ? 'Sending…'
                      : composerMode === 'reply'
                      ? 'Send Reply to Customer'
                      : 'Save Internal Note'}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
    </AdminPageShell>
  );
}
