'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { InboxThread } from '@/hooks/useInboxThreads';

/* ═══════════════════════════════════════════════════════
   ThreadList — Left-pane thread list for the Command Center
   ═══════════════════════════════════════════════════════ */

interface ThreadListProps {
  threads: InboxThread[];
  activeThreadId: string | null;
  onSelect: (projectId: string) => void;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (diff < oneDay * 2) return 'Yesterday';
  if (diff < oneDay * 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ThreadList({ threads, activeThreadId, onSelect }: ThreadListProps) {
  if (!threads.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: '#F2F2F2', border: '1px solid var(--border-ui)' }}
        >
          <span style={{ fontSize: 20, color: '#7F7F7F' }}>✉️</span>
        </div>
        <p className="text-sm font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
          No messages yet
        </p>
        <p className="text-xs mt-1 text-center" style={{ color: '#CCCCCC' }}>
          Messages from your projects will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread, i) => {
        const isActive = activeThreadId === thread.projectId;
        const isUnread = thread.unreadCount > 0;
        const initial = (thread.lastMessage.senderName?.[0] || 'P').toUpperCase();

        return (
          <motion.button
            key={thread.projectId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(thread.projectId)}
            className="w-full text-left p-5 border-b flex items-start gap-4 transition-colors focus:outline-none"
            style={{
              backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
              borderColor: 'var(--border-ui)',
              borderLeft: isActive ? '3px solid #0d0d0d' : '3px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = '#FAFAFA';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}
            >
              {initial}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span
                  className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-medium'}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {thread.lastMessage.senderName}
                </span>
                <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-secondary)' }}>
                  {formatTimestamp(thread.lastMessage.createdAt)}
                </span>
              </div>

              {/* Subject */}
              {thread.lastMessage.subject && (
                <p
                  className="text-xs truncate mb-0.5"
                  style={{ color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {thread.lastMessage.subject.replace(/\s*\[ref:deal_[^\]]+\]/g, '')}
                </p>
              )}

              {/* Preview */}
              <p
                className={`text-xs truncate ${isUnread ? 'font-medium' : ''}`}
                style={{ color: isUnread ? '#595959' : '#7F7F7F' }}
              >
                {thread.lastMessage.body.slice(0, 80)}
              </p>

              {/* Unread badge */}
              {isUnread && (
                <span
                  className="inline-flex items-center justify-center mt-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                  style={{ backgroundColor: '#0d0d0d', color: '#ffffff', minWidth: 18 }}
                >
                  {thread.unreadCount}
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
