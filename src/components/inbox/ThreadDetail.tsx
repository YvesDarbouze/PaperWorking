'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import type { InboxThread, InboxMessage } from '@/hooks/useInboxThreads';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { inboxTokens } from './inboxTheme';

/* ═══════════════════════════════════════════════════════
   ThreadDetail — Right-pane message view with inline reply
   ═══════════════════════════════════════════════════════ */

interface MoreMenuProps {
  onMarkUnread?: () => void;
}

function ThreadMoreMenu({ onMarkUnread }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        id="thread-more-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        className="p-2 transition-colors"
        style={{ color: t.muted, borderRadius: 2 }}
        aria-label="Thread actions"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>more_vert</span>
      </button>

      {open && (
        <div
          id="thread-more-menu"
          role="menu"
          className="absolute right-0 top-full mt-1 w-48 z-50 py-1 overflow-hidden"
          style={{
            background: t.menuBg,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            boxShadow: t.elevShadow,
          }}
        >
          {onMarkUnread ? (
            <button
              id="thread-menu-mark-unread"
              role="menuitem"
              onClick={() => { onMarkUnread(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
              style={{ color: t.body }}
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>mark_email_unread</span>
              Mark as Unread
            </button>
          ) : (
            <p className="px-4 py-2.5 text-xs select-none" style={{ color: t.muted }}>No actions available</p>
          )}
        </div>
      )}
    </div>
  );
}

interface ThreadDetailProps {
  thread: InboxThread;
  projectName?: string;
  onSendReply: (body: string) => Promise<void>;
  onBack?: () => void;
  onMarkThreadUnread?: () => void;
}

function MessageBubble({ message, isMe }: { message: InboxMessage; isMe: boolean }) {
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');
  const typeBadge = message.type === 'EMAIL_INBOUND'
    ? 'Email'
    : message.type === 'EMAIL_OUTBOUND'
    ? 'Sent'
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1 px-0.5">
          <span className="text-xs font-semibold" style={{ color: t.heading }}>
            {isMe ? 'You' : message.senderName}
          </span>
          {typeBadge && (
            <span
              className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5"
              style={{
                borderRadius: 2,
                color: t.muted,
                background: t.hover,
                border: `1px solid ${t.border}`,
              }}
            >
              {typeBadge}
            </span>
          )}
          <span className="text-[11px] tabular-nums" style={{ color: t.muted }}>
            {message.createdAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div
          className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            borderRadius: 2,
            background: isMe ? t.accentMuted : t.surface,
            border: `1px solid ${isMe ? t.accentMuted : t.border}`,
            color: t.body,
          }}
        >
          {message.body}
        </div>
      </div>
    </motion.div>
  );
}

export default function ThreadDetail({ thread, projectName, onSendReply, onBack, onMarkThreadUnread }: ThreadDetailProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const t = inboxTokens(theme === 'dark');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.messages.length]);

  const handleSend = async () => {
    const body = replyText.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      await onSendReply(body);
      setReplyText('');
    } catch (err) {
      console.error('[ThreadDetail] Send failed:', err);
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

  const sortedMessages = [...thread.messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const displaySubject = thread.lastMessage.subject
    ?.replace(/\s*\[ref:deal_[^\]]+\]/g, '')
    || projectName
    || 'Conversation';

  return (
    <div className="flex-1 overflow-hidden z-10 flex flex-col min-h-0">
      <div
        className="px-5 sm:px-8 py-4 flex items-center justify-between shrink-0 gap-3"
        style={{ borderBottom: `1px solid ${t.border}`, background: t.listBg }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -ml-2 transition-colors"
              style={{ color: t.muted, borderRadius: 2 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div
            className="h-10 w-10 flex items-center justify-center text-sm font-semibold shrink-0"
            style={{
              background: t.accentMuted,
              color: t.accent,
              border: `1px solid ${t.border}`,
              borderRadius: 2,
            }}
          >
            {(thread.lastMessage.senderName?.[0] || 'P').toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate" style={{ color: t.heading }}>{displaySubject}</h3>
            <p className="text-[11px] flex items-center gap-1.5 mt-0.5 truncate" style={{ color: t.muted }}>
              <span className="truncate">{thread.participantNames.slice(0, 3).join(', ')}</span>
              {thread.participantNames.length > 3 && <span>(+{thread.participantNames.length - 3})</span>}
              <span aria-hidden>·</span>
              <span className="shrink-0">{thread.messages.length} message{thread.messages.length !== 1 && 's'}</span>
            </p>
          </div>
        </div>
        <ThreadMoreMenu onMarkUnread={onMarkThreadUnread} />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5"
      >
        <AnimatePresence>
          {sortedMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMe={msg.senderUid === user?.uid}
            />
          ))}
        </AnimatePresence>
      </div>

      <footer
        className="p-4 sm:p-5 shrink-0"
        style={{ borderTop: `1px solid ${t.border}`, background: t.listBg }}
      >
        <div className="relative max-w-3xl mx-auto">
          <textarea
            id="inbox-reply-input"
            placeholder="Write a reply… (⌘+Enter to send)"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="w-full h-24 p-3 pr-14 text-sm resize-none outline-none transition-colors disabled:opacity-50"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.border}`,
              borderRadius: 2,
              color: t.heading,
            }}
          />
          <button
            id="inbox-send-reply"
            onClick={handleSend}
            disabled={!replyText.trim() || sending}
            className="absolute bottom-3 right-3 p-2.5 transition-opacity hover:opacity-90 disabled:opacity-30"
            style={{ background: t.ctaBg, color: t.ctaFg, borderRadius: 2 }}
            aria-label="Send reply"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
