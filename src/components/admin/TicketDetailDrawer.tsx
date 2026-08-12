'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Send, Lock, UserCheck, ShieldAlert, Tag, Clock, MessageSquare, Bookmark, AlertTriangle, CheckCircle } from 'lucide-react';
import { getTicketDetails, claimTicket, addInternalNote, sendCustomerReply, updateTicketStatus, updateTicketTags, snoozeTicket, getTaxonomy, getSavedReplies } from '@/actions/adminSupport';
import type { SupportTicket, TicketMessage, TicketStatus, TaxonomyTag, SavedReply, PresenceLock } from '@/lib/support/types';

interface TicketDetailDrawerProps {
  ticketId: string | null;
  onClose: () => void;
  onRefreshParent: () => void;
}

export default function TicketDetailDrawer({ ticketId, onClose, onRefreshParent }: TicketDetailDrawerProps) {
  const [data, setData] = useState<{ ticket: SupportTicket | null; messages: TicketMessage[]; presence: PresenceLock[] }>({
    ticket: null,
    messages: [],
    presence: [],
  });
  const [loading, setLoading] = useState(false);
  const [composerMode, setComposerMode] = useState<'note' | 'reply'>('note');
  const [composerText, setComposerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [taxonomy, setTaxonomy] = useState<TaxonomyTag[]>([]);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [selectedTag, setSelectedTag] = useState('');

  const fetchDetails = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const [res, tax, replies] = await Promise.all([
        getTicketDetails(ticketId),
        getTaxonomy(),
        getSavedReplies(),
      ]);
      setData(res);
      setTaxonomy(tax);
      setSavedReplies(replies);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (ticketId) fetchDetails();
  }, [ticketId, fetchDetails]);

  if (!ticketId) return null;

  const ticket = data.ticket;

  const handleClaimToggle = async () => {
    if (!ticketId) return;
    const isClaimed = !!ticket?.assigneeUid;
    const res = await claimTicket(ticketId, !isClaimed);
    if (res.success) {
      fetchDetails();
      onRefreshParent();
    } else {
      alert(`Claim action failed: ${res.error}`);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticketId) return;
    const res = await updateTicketStatus(ticketId, newStatus);
    if (res.success) {
      fetchDetails();
      onRefreshParent();
    } else {
      alert(`Status update failed: ${res.error}`);
    }
  };

  const handleAddTag = async () => {
    if (!ticketId || !selectedTag || !ticket) return;
    if (ticket.tags.includes(selectedTag)) return;
    const newTags = [...ticket.tags, selectedTag];
    const res = await updateTicketTags(ticketId, newTags);
    if (res.success) {
      fetchDetails();
      setSelectedTag('');
    } else {
      alert(`Tag update failed: ${res.error}`);
    }
  };

  const handleSnooze = async (hours: number) => {
    if (!ticketId) return;
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const res = await snoozeTicket(ticketId, until);
    if (res.success) {
      alert(`Ticket snoozed for ${hours} hours.`);
      onClose();
      onRefreshParent();
    }
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !composerText.trim()) return;
    setSubmitting(true);

    try {
      if (composerMode === 'note') {
        const res = await addInternalNote(ticketId, composerText);
        if (res.success) {
          setComposerText('');
          fetchDetails();
        } else {
          alert(`Note failed: ${res.error}`);
        }
      } else {
        const res = await sendCustomerReply(ticketId, composerText);
        if (res.success) {
          setComposerText('');
          fetchDetails();
          onRefreshParent();
        } else {
          alert(`Reply failed: ${res.error}`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 h-full flex flex-col shadow-2xl border-l border-zinc-200 dark:border-zinc-800">
        {/* Top bar */}
        <div className="p-4 border-b flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="text-xs font-mono font-bold text-gray-500">{ticket?.id || ticketId}</span>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-md">{ticket?.subject || 'Loading ticket...'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClaimToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {ticket?.assigneeUid ? 'Unclaim Ticket' : 'Claim Ticket'}
            </button>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collision detection warning */}
        {data.presence.length > 0 && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span><strong>Collision Warning:</strong> {data.presence.map((p) => p.displayName).join(', ')} is currently viewing this ticket.</span>
          </div>
        )}

        {/* Main Content scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !ticket ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading conversation thread...</div>
          ) : !ticket ? (
            <div className="text-center py-12 text-sm text-gray-500">Ticket not found.</div>
          ) : (
            <>
              {/* Ticket Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-gray-500 block uppercase font-bold text-[10px]">Status</span>
                  <div className="flex gap-1 mt-1">
                    {(['active', 'pending', 'closed'] as TicketStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ticket.status === st ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-gray-300'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold text-[10px]">Requester</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate mt-0.5">{ticket.requesterName}</span>
                  <span className="text-gray-500 block truncate">{ticket.requesterEmail}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold text-[10px]">Assignee</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mt-0.5">{ticket.assigneeName || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold text-[10px]">Snooze / Actions</span>
                  <div className="flex items-center gap-1 mt-1">
                    <button onClick={() => handleSnooze(24)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] border rounded hover:bg-gray-100 dark:hover:bg-zinc-800">
                      <Clock className="w-3 h-3" /> Snooze 24h
                    </button>
                  </div>
                </div>
              </div>

              {/* Controlled Tag Taxonomy Selector */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                {ticket.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded font-semibold text-[10px]">
                    {t}
                  </span>
                ))}
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">+ Add Tag from Taxonomy...</option>
                  {taxonomy.map((tag) => (
                    <option key={tag.slug} value={tag.slug}>{tag.name}</option>
                  ))}
                </select>
                {selectedTag && (
                  <button onClick={handleAddTag} className="px-2 py-1 text-xs font-bold bg-black text-white dark:bg-white dark:text-black rounded">
                    Add
                  </button>
                )}
              </div>

              {/* Message Thread */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs uppercase font-bold text-gray-500 tracking-wider">Conversation History</h3>
                {data.messages.map((m) => {
                  const isNote = m.authorType === 'internal_note';
                  const isCustomer = m.authorType === 'customer';
                  const isReply = m.authorType === 'internal_reply';

                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border space-y-2 ${
                        isNote
                          ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/10'
                          : isReply
                          ? 'bg-indigo-500/10 border-indigo-500/20 ml-6'
                          : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{m.authorName}</span>
                          {isNote && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-amber-500 text-black rounded">
                              INTERNAL NOTE — never sent to customer
                            </span>
                          )}
                          {isReply && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-indigo-600 text-white rounded">
                              Outbound Customer Reply (Email Sent)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Reply Composer Bottom Section */}
        {ticket && (
          <div className="p-4 border-t bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-3">
            {/* Mode Selector — DEFAULTS TO INTERNAL NOTE */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setComposerMode('note')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-colors ${
                    composerMode === 'note'
                      ? 'bg-amber-500 text-black border-amber-600'
                      : 'bg-white dark:bg-zinc-900 text-gray-500 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Internal Note (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode('reply')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-colors ${
                    composerMode === 'reply'
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-white dark:bg-zinc-900 text-gray-500 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Customer Reply
                </button>
              </div>

              {/* Saved Reply Inserter */}
              {savedReplies.length > 0 && (
                <select
                  onChange={(e) => setComposerText((prev) => (prev ? `${prev}\n${e.target.value}` : e.target.value))}
                  className="text-xs p-1 border rounded bg-white dark:bg-zinc-900"
                >
                  <option value="">Insert Saved Reply Template...</option>
                  {savedReplies.map((sr) => (
                    <option key={sr.id} value={sr.content}>{sr.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Warning banner for reply mode */}
            {composerMode === 'reply' ? (
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                ⚠️ Sending a customer reply will dispatch an official email to <strong>{ticket.requesterEmail}</strong> via Resend and move status to <strong>Pending</strong>.
              </div>
            ) : (
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                🔒 Internal notes are private team comments. They are never sent to the customer or logged to EmailLog.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitMessage} className="space-y-2">
              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder={composerMode === 'note' ? 'Type internal note for team...' : 'Type official customer response...'}
                rows={3}
                className="w-full p-3 text-xs border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !composerText.trim()}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50 ${
                    composerMode === 'note'
                      ? 'bg-amber-500 text-black hover:bg-amber-600'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : composerMode === 'note' ? 'Save Internal Note' : 'Send Customer Email'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
