'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
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
  onBack?: () => void;
}

function MessageBubble({ message, isMe }: { message: InboxMessage; isMe: boolean }) {
  const typeBadge = message.type === 'EMAIL_INBOUND'
    ? { label: 'Email', color: '#bacac5' }
    : message.type === 'EMAIL_OUTBOUND'
    ? { label: 'Sent', color: '#57f1db' }
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
          <span className="text-xs font-bold text-[#dae4ec]">
            {isMe ? 'You' : message.senderName}
          </span>
          {typeBadge && (
            <span
              className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                isMe ? 'text-[#57f1db] border-[#57f1db]/30 bg-[#57f1db]/10' : 'text-[#bacac5] border-white/10 bg-white/5'
              }`}
            >
              {typeBadge.label}
            </span>
          )}
          <span className="text-xs font-medium text-[#bacac5]">
            {message.createdAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap backdrop-blur-md border ${
            isMe
              ? 'rounded-2xl rounded-tr-sm bg-[#57f1db]/10 border-[#57f1db]/20 text-[#dae4ec] shadow-[inset_1px_1px_0px_rgba(87,241,219,0.1)]'
              : 'rounded-2xl rounded-tl-sm bg-[#141d23]/80 border-white/10 text-[#bacac5] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.05)]'
          }`}
        >
          {message.body}
        </div>
      </div>
    </motion.div>
  );
}

export default function ThreadDetail({ thread, projectName, onSendReply, onBack }: ThreadDetailProps) {
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
    <div className="flex-1 overflow-hidden z-10 flex flex-col bg-transparent">
      {/* Header Actions */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0b141a]/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-[#bacac5] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="h-12 w-12 rounded-xl bg-[#0b141a]/60 backdrop-blur-xl border border-[#57f1db]/30 shadow-[inset_1px_1px_0px_rgba(87,241,219,0.1),0_0_15px_rgba(87,241,219,0.15)] flex items-center justify-center text-[#57f1db] font-bold text-lg">
            {(thread.lastMessage.senderName?.[0] || 'P').toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#dae4ec]">{displaySubject}</h3>
            <p className="text-[10px] font-mono text-[#bacac5] uppercase flex items-center gap-2 mt-0.5">
              <span>{thread.participantNames.slice(0, 3).join(', ')}</span>
              {thread.participantNames.length > 3 && <span>(+{thread.participantNames.length - 3})</span>}
              <span className="text-[#57f1db]">•</span>
              <span>{thread.messages.length} message{thread.messages.length !== 1 && 's'}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg hover:bg-white/5 text-[#bacac5] transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>more_vert</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6"
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
      <footer className="p-6 border-t border-white/10 bg-[#0b141a]/50 backdrop-blur-sm shrink-0">
        <div className="relative max-w-4xl mx-auto">
          <textarea
            id="inbox-reply-input"
            placeholder="Type your reply... (⌘+Enter to send)"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="w-full h-28 p-4 pr-16 rounded-xl border border-white/10 bg-[#060f15]/80 text-sm resize-none focus:outline-none focus:border-[#57f1db]/50 transition-colors shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] text-[#dae4ec] disabled:opacity-50 placeholder:text-[#bacac5]/40"
          />
          <button
            id="inbox-send-reply"
            onClick={handleSend}
            disabled={!replyText.trim() || sending}
            className="absolute bottom-4 right-4 p-3 rounded-xl bg-[#57f1db] text-[#003731] transition-all disabled:opacity-30 disabled:hover:scale-100 hover:scale-105 active:scale-95 luminous-glow flex items-center justify-center"
            aria-label="Send reply"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
