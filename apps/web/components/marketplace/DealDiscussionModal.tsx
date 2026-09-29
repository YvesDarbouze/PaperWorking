'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';
import { formatPercent, formatCurrencyCompact } from '@/lib/format';

export interface DealComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorCompany?: string;
  content: string;
  createdAt: string;
}

interface DealDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle: string;
  dealAddress: string;
  targetIrr?: number;
  fundingTarget?: number;
  initialCommentsCount?: number;
  onCommentsCountChange?: (count: number) => void;
}

export default function DealDiscussionModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  dealAddress,
  targetIrr,
  fundingTarget,
  initialCommentsCount = 0,
  onCommentsCountChange,
}: DealDiscussionModalProps) {
  const [comments, setComments] = useState<DealComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('David Miller');
  const [authorRole, setAuthorRole] = useState('Managing Partner');
  const [authorCompany, setAuthorCompany] = useState('Apex Commercial Partners');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });
    return cleanup;
  }, [isOpen, onClose]);

  // Load comments
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function fetchDiscussion() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/deals/${dealId}/social`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.comments) {
            setComments(data.comments);
            onCommentsCountChange?.(data.comments.length);
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load discussion thread.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDiscussion();
    return () => {
      cancelled = true;
    };
  }, [isOpen, dealId, onCommentsCountChange]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          content: newComment.trim(),
          authorName,
          authorRole,
          authorCompany,
        }),
      });

      if (!res.ok) {
        throw new Error('Unable to post comment. Please try again.');
      }

      const data = await res.json();
      if (data.comment) {
        const nextList = [data.comment, ...comments];
        setComments(nextList);
        onCommentsCountChange?.(nextList.length);
        setNewComment('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-discussion-title"
      data-testid="deal-discussion-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/15 bg-[#0f0e13] p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-white">
                forum
              </span>
              <h2 id="deal-discussion-title" className="text-base sm:text-lg font-bold text-white">
                Professional Discussion &amp; Underwriting Q&amp;A
              </h2>
            </div>
            <p className="text-xs text-white/60 mt-1">
              <strong className="text-white">{dealTitle}</strong> · {dealAddress}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-white/50">
              {targetIrr ? (
                <span>
                  Target IRR: <strong className="text-white">{formatPercent(targetIrr)}</strong>
                </span>
              ) : null}
              {fundingTarget ? (
                <span>
                  Target Raise: <strong className="text-white">{formatCurrencyCompact(fundingTarget)}</strong>
                </span>
              ) : null}
              <span>{comments.length} Comments</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px]"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Off-Platform Closing Reminder */}
        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-white/50 flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-[16px] text-white/40 shrink-0">gavel</span>
          <span>
            Discussions on deal cards foster professional due diligence. Final subscription terms and agreements close off-platform.
          </span>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-white/40 text-xs">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
              Loading discussion...
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-white/40 text-xs space-y-1">
              <span className="material-symbols-outlined text-3xl opacity-40">chat</span>
              <p className="font-semibold text-white/70">No comments on this deal post yet.</p>
              <p>Be the first accredited investor or partner to start the discussion.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2 hover:border-white/20 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                      {comment.authorName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-white">{comment.authorName}</span>
                      {comment.authorCompany ? (
                        <span className="text-white/40 text-[11px] ml-1.5 font-medium">
                          · {comment.authorCompany}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-white/80 leading-relaxed pl-9">
                  {comment.content}
                </p>

                {comment.authorRole && (
                  <div className="pl-9">
                    <span className="inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9.5px] font-semibold text-white/60">
                      {comment.authorRole}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Post Comment Input */}
        <form onSubmit={handleSubmit} className="border-t border-white/10 pt-3 shrink-0 space-y-3">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          <div>
            <textarea
              required
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask the operator about underwriting assumptions, debt terms, or market comps..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white placeholder:text-white/30 text-xs sm:text-sm focus:outline-none focus:border-white min-h-[52px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your Name"
                className="w-1/2 sm:w-36 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none"
              />
              <input
                type="text"
                value={authorCompany}
                onChange={(e) => setAuthorCompany(e.target.value)}
                placeholder="Company / Fund"
                className="w-1/2 sm:w-40 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="rounded-xl bg-white text-black hover:bg-white/90 px-4 py-2 font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
