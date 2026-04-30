'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import type { InboxThread, InboxMessage } from '@/hooks/useInboxThreads';

/* ═══════════════════════════════════════════════════════
   ThreadDetail — Right-pane message view with inline reply
   ═══════════════════════════════════════════════════════ */

interface ThreadDetailProps {
  thread: InboxThread;
  projectName?: string;
  onSendReply: (body: string) => Promise<void>;
}

function MessageBubble({ message, isMe }: { message: InboxMessage; isMe: boolean }) {
  const typeBadge = message.type === 'EMAIL_INBOUND'
    ? { label: 'Email', color: '#7F7F7F' }
    : message.type === 'EMAIL_OUTBOUND'
    ? { label: 'Sent', color: '#0d0d0d' }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Sender + Time */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            {isMe ? 'You' : message.senderName}
          </span>
          {typeBadge && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
              style={{ color: typeBadge.color, backgroundColor: '#F2F2F2' }}
            >
              {typeBadge.label}
            </span>
          )}
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {message.createdAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`px-5 py-3.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
            isMe
              ? 'rounded-2xl rounded-tr-sm'
              : 'rounded-2xl rounded-tl-sm border'
          }`}
          style={
            isMe
              ? { backgroundColor: '#0d0d0d', color: '#ffffff' }
              : { backgroundColor: '#ffffff', color: '#595959', borderColor: 'var(--border-ui)' }
          }
        >
          {message.body}
        </div>
      </div>
    </motion.div>
  );
}

export default function ThreadDetail({ thread, projectName, onSendReply }: ThreadDetailProps) {
  const { user } = useAuth();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
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

  // Sort messages oldest first for display
  const sortedMessages = [...thread.messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // Clean subject line (remove tracking token)
  const displaySubject = thread.lastMessage.subject
    ?.replace(/\s*\[ref:deal_[^\]]+\]/g, '')
    || projectName
    || 'Conversation';

  return (
    <>
      {/* Header */}
      <header
        className="px-8 py-5 border-b flex items-center justify-between z-10"
        style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm"
            style={{ backgroundColor: '#0d0d0d' }}
          >
            {(thread.lastMessage.senderName?.[0] || 'P').toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {displaySubject}
            </h2>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {thread.participantNames.slice(0, 3).join(', ')}
              {thread.participantNames.length > 3 && ` +${thread.participantNames.length - 3}`}
              {' · '}
              {thread.messages.length} message{thread.messages.length !== 1 && 's'}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6"
        style={{ backgroundColor: 'var(--bg-surface)' }}
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

      {/* Reply Area */}
      <footer
        className="p-6 border-t"
        style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="relative max-w-4xl mx-auto">
          <textarea
            id="inbox-reply-input"
            placeholder="Type your reply... (⌘+Enter to send)"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="w-full h-28 p-4 pr-16 rounded-xl border text-sm resize-none focus:outline-none transition-colors shadow-sm disabled:opacity-50"
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
          <button
            id="inbox-send-reply"
            onClick={handleSend}
            disabled={!replyText.trim() || sending}
            className="absolute bottom-4 right-4 p-3 rounded-full transition-colors shadow-md disabled:opacity-30"
            style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}
            onMouseEnter={(e) => {
              if (!sending) e.currentTarget.style.backgroundColor = '#333333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0d0d0d';
            }}
            aria-label="Send reply"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
}
