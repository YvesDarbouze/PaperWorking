'use client';

import React, { useState } from 'react';
import { Project } from '@/types/schema';
import {
  Mail, MessageSquare, ChevronRight,
  Building2, X, Loader2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInboxThreads } from '@/hooks/useInboxThreads';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════════════
   SmartInboxWidget — Real-time Inbox Grouped by Project
   
   Collapsed: Shows unread counts grouped by project
   Expanded:  Full slide-out overlay with message threads
   ═══════════════════════════════════════════════════════════════ */

interface SmartInboxWidgetProps {
  projects: Project[];
}

export default function SmartInboxWidget({ projects }: SmartInboxWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const { threads, loading, error, unreadTotal, markAsRead } = useInboxThreads();
  const uid = user?.uid;

  const activeThreads = threads.filter(t => t.messages.length > 0);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* ── Collapsed Card ── */}
      <div className="ag-card bg-bg-surface border border-border-accent/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)] relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-bg-primary flex items-center justify-center">
              <Mail className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <p className="ag-label opacity-60">Inbox</p>
              <h3 className="text-2xl font-normal text-text-primary tracking-tighter">Messages</h3>
            </div>
          </div>
          {unreadTotal > 0 && (
            <div className="flex items-center gap-2 bg-pw-black text-pw-white px-4 py-1.5 rounded">
              <span className="text-xs font-bold">{unreadTotal}</span>
              <span className="text-[9px] uppercase tracking-widest opacity-60">unread</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-text-secondary opacity-50 relative z-10">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading inbox...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center relative z-10">
            <p className="text-sm text-red-500 opacity-80">{error}</p>
          </div>
        ) : activeThreads.length === 0 ? (
          <div className="py-8 text-center relative z-10">
            <MessageSquare className="w-8 h-8 mx-auto text-text-secondary opacity-20 mb-3" />
            <p className="text-sm text-text-secondary opacity-40">Inbox clear</p>
          </div>
        ) : (
          <div className="space-y-2 relative z-10">
            {activeThreads.map(thread => {
              const project = projects.find(p => p.id === thread.projectId);
              const address = project?.address || project?.propertyName || 'Unknown Project';
              return (
                <div
                  key={thread.projectId}
                  className="flex items-center justify-between px-4 py-3 rounded-md bg-bg-primary/50 border border-border-accent/10 hover:bg-bg-primary transition-all cursor-pointer"
                  onClick={() => setIsExpanded(true)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-text-secondary flex-shrink-0"><Building2 className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary tracking-tight truncate max-w-[200px]">
                        {address}
                      </p>
                      <p className="text-[10px] text-text-secondary truncate mt-0.5">
                        {thread.lastMessage.subject || thread.lastMessage.body}
                      </p>
                    </div>
                  </div>
                  {thread.unreadCount > 0 && (
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className="text-[10px] font-bold text-pw-white bg-pw-black px-2 py-0.5 rounded">
                        {thread.unreadCount} new
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeThreads.length > 0 && !loading && (
          <button
            onClick={() => setIsExpanded(true)}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-bg-primary text-text-primary text-xs font-bold uppercase tracking-widest hover:bg-pw-black hover:text-pw-white transition-all border border-border-accent/20 relative z-10"
          >
            Expand Inbox
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Expanded Overlay ── */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70]"
              onClick={() => setIsExpanded(false)}
            />
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-bg-surface z-[80] shadow-2xl overflow-y-auto"
            >
              <div className="sticky top-0 bg-bg-surface/95 backdrop-blur-md px-6 py-5 border-b border-border-accent/20 flex items-center justify-between z-10">
                <div>
                  <p className="ag-label opacity-60 mb-1">Inbox</p>
                  <h3 className="text-xl font-normal text-text-primary tracking-tighter">All Messages</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-10 h-10 rounded-md bg-bg-primary flex items-center justify-center hover:bg-pw-black hover:text-pw-white transition-all text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {activeThreads.length === 0 ? (
                  <div className="py-12 text-center text-text-secondary opacity-50">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No messages found</p>
                  </div>
                ) : (
                  activeThreads.map(thread => {
                    const project = projects.find(p => p.id === thread.projectId);
                    const address = project?.address || project?.propertyName || 'Unknown Project';
                    const hasUnread = thread.unreadCount > 0;

                    return (
                      <div key={thread.projectId} className="border border-border-accent/10 rounded-lg p-4 bg-bg-primary/20">
                        <div className="flex items-center justify-between mb-4 border-b border-border-accent/10 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="text-text-secondary bg-bg-primary p-1.5 rounded"><Building2 className="w-4 h-4" /></div>
                            <h4 className="font-medium text-sm text-text-primary truncate max-w-[180px]">{address}</h4>
                            {hasUnread && (
                              <span className="text-[10px] bg-pw-black text-pw-white px-2 py-0.5 rounded font-bold ml-2">
                                {thread.unreadCount} unread
                              </span>
                            )}
                          </div>
                          {hasUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(thread.projectId);
                              }}
                              className="text-[10px] text-text-secondary hover:text-pw-black uppercase font-bold tracking-wider"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {thread.messages.map(msg => {
                            const isMsgUnread = uid ? !msg.readByUid.includes(uid) : false;
                            return (
                              <div
                                key={msg.id}
                                className={`flex items-start gap-3 p-3 rounded-md transition-all ${
                                  isMsgUnread 
                                    ? 'bg-bg-primary/60 border-l-2 border-l-pw-black' 
                                    : 'bg-bg-primary/20'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-border-accent/20 text-text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                  {msg.senderName?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-text-primary tracking-tight truncate pr-2">
                                      {msg.senderName || msg.senderEmail || 'System'}
                                    </span>
                                    <span className="text-[10px] text-text-secondary opacity-60 flex-shrink-0">
                                      {formatTime(msg.createdAt)}
                                    </span>
                                  </div>
                                  {msg.subject && (
                                    <p className="text-xs font-medium text-text-primary mb-0.5 truncate">{msg.subject}</p>
                                  )}
                                  <p className="text-xs text-text-secondary line-clamp-2">
                                    {msg.body}
                                  </p>
                                </div>
                                {isMsgUnread && (
                                  <div className="w-2 h-2 rounded-full bg-pw-black flex-shrink-0 mt-2" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
