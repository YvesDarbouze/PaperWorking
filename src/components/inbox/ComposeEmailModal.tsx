'use client';

import React, { useState, useCallback } from 'react';
import { X, Send, Sparkles, Loader2, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   ComposeEmailModal — Full-screen email compose overlay

   Features:
   • Multi-recipient entry (team members + free-text)
   • Project selector for [ref:deal_*] tracking
   • AI Draft button via draftingAgent
   • Sends via /api/emails/send
   ═══════════════════════════════════════════════════════ */

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  onSent?: () => void;
}

export default function ComposeEmailModal({
  isOpen,
  onClose,
  defaultProjectId,
  onSent,
}: ComposeEmailModalProps) {
  const { user, profile } = useAuth();
  const deals = useProjectStore((state) => state.projects);

  const [to, setTo] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Active projects for the project dropdown
  const activeProjects = deals.filter((d) => d.status !== 'closed_won' && d.status !== 'closed_lost');

  const resetForm = useCallback(() => {
    setTo('');
    setProjectId(defaultProjectId || '');
    setSubject('');
    setBody('');
  }, [defaultProjectId]);

  /* ── AI Draft ── */
  const handleAIDraft = async () => {
    if (!projectId) {
      toast.error('Select a project first for AI context.', {
        style: { background: '#0d0d0d', color: '#fff', border: '1px solid #333' },
      });
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          audience: 'investors',
          idToken: await user?.getIdToken(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBody(data.draft || '');
        toast.success('AI draft generated.', {
          icon: '✨',
          style: { background: '#0d0d0d', color: '#fff' },
        });
      } else {
        toast.error('AI draft unavailable. Write manually.', {
          style: { background: '#0d0d0d', color: '#fff' },
        });
      }
    } catch {
      toast.error('AI service error.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Send ── */
  const handleSend = async () => {
    const recipients = to
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));

    if (!recipients.length) {
      toast.error('Add at least one recipient email.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject is required.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
      return;
    }
    if (!body.trim()) {
      toast.error('Message body is required.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
      return;
    }

    setSending(true);
    try {
      const idToken = await user?.getIdToken();
      const effectiveProjectId = projectId || 'general';

      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          projectId: effectiveProjectId,
          to: recipients,
          subject: subject.trim(),
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#333;white-space:pre-wrap;">${body.trim()}</div>`,
          text: body.trim(),
        }),
      });

      if (res.ok) {
        toast.success('Email sent.', {
          icon: '✉️',
          style: { background: '#0d0d0d', color: '#fff' },
        });
        resetForm();
        onSent?.();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send.', {
          style: { background: '#0d0d0d', color: '#fff' },
        });
      }
    } catch (err) {
      console.error('[Compose] Send error:', err);
      toast.error('Network error. Try again.', {
        style: { background: '#0d0d0d', color: '#fff' },
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl mx-4 flex flex-col overflow-hidden shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-ui)',
              maxHeight: 'calc(100vh - 80px)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              <h2
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Compose
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F2F2F2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                aria-label="Close compose"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* To */}
              <div>
                <label
                  htmlFor="compose-to"
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  To
                </label>
                <input
                  id="compose-to"
                  type="text"
                  placeholder="email@example.com, team@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0d0d0d';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-ui)';
                  }}
                />
              </div>

              {/* Project */}
              <div>
                <label
                  htmlFor="compose-project"
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Project (optional)
                </label>
                <select
                  id="compose-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border outline-none transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">— Select project —</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyName || p.address || p.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="compose-subject"
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Subject
                </label>
                <input
                  id="compose-subject"
                  type="text"
                  placeholder="Enter subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0d0d0d';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-ui)';
                  }}
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="compose-body"
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Message
                  </label>
                  <button
                    onClick={handleAIDraft}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: '#F2F2F2',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-ui)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5E5E5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F2F2F2';
                    }}
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    AI Draft
                  </button>
                </div>
                <textarea
                  id="compose-body"
                  placeholder="Write your message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={10}
                  className="w-full px-4 py-3 text-sm border outline-none transition-colors resize-none"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.7,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0d0d0d';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-ui)';
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-6 py-4 border-t"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              <p className="text-xs" style={{ color: '#CCCCCC' }}>
                ⌘+Enter to send
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  Discard
                </button>
                <button
                  id="compose-send-btn"
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}
                  onMouseEnter={(e) => {
                    if (!sending) e.currentTarget.style.backgroundColor = '#333333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0d0d0d';
                  }}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
