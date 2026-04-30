'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { communicationService } from '@/lib/services/communicationService';
import { CommunicationMessage } from '@/types/schema';
import { Send, Mail, User, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageBoardProps {
  projectId: string;
  organizationId: string;
  currentUserUid: string;
  currentUserEmail: string;
  currentUserName: string;
}

export function MessageBoard({
  projectId,
  organizationId,
  currentUserUid,
  currentUserEmail,
  currentUserName,
}: MessageBoardProps) {
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [newMessageBody, setNewMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Real-time listener for messages in this project
    const messagesRef = collection(db, 'projects', projectId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: CommunicationMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedMessages.push({
          id: doc.id,
          ...data,
          // Firestore timestamp to JS Date handling
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        } as CommunicationMessage);
      });
      setMessages(loadedMessages);
      scrollToBottom();
    }, (error) => {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    });

    return () => unsubscribe();
  }, [projectId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageBody.trim()) return;

    setIsSending(true);
    try {
      await communicationService.logMessage(projectId, organizationId, {
        senderUid: currentUserUid,
        senderEmail: currentUserEmail,
        senderName: currentUserName,
        type: 'INTERNAL_COMMENT',
        body: newMessageBody.trim(),
      });
      setNewMessageBody('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageIcon = (type: string) => {
    switch (type) {
      case 'EMAIL_INBOUND':
      case 'EMAIL_OUTBOUND':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'INTERNAL_COMMENT':
      default:
        return <User className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div 
      className="flex flex-col h-[600px] border rounded-lg overflow-hidden shadow-sm"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
    >
      {/* Header */}
      <div 
        className="px-6 py-4 border-b flex justify-between items-center"
        style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-default)' }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Communication Board
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Internal comments and email tracking
          </p>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <Mail className="w-12 h-12" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)' }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === currentUserUid;
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  {!isMe && renderMessageIcon(msg.type)}
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {msg.senderName || msg.senderEmail || 'System'}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                    <Clock className="w-3 h-3" />
                    {msg.createdAt instanceof Date 
                      ? msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : ''}
                  </span>
                  {isMe && renderMessageIcon(msg.type)}
                </div>
                
                <div 
                  className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                    isMe 
                      ? 'rounded-tr-sm text-white' 
                      : 'rounded-tl-sm border'
                  }`}
                  style={{
                    backgroundColor: isMe ? '#000000' : 'var(--bg-default)',
                    borderColor: isMe ? 'transparent' : 'var(--border-ui)',
                    color: isMe ? '#FFFFFF' : 'var(--text-primary)'
                  }}
                >
                  {msg.subject && (
                    <div className="font-semibold text-sm mb-1 pb-1 border-b border-opacity-20 border-current">
                      {msg.subject}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div 
        className="p-4 border-t"
        style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}
      >
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <textarea
            value={newMessageBody}
            onChange={(e) => setNewMessageBody(e.target.value)}
            placeholder="Type an internal comment..."
            className="flex-1 resize-none rounded-md border p-3 text-sm focus:outline-none focus:ring-1"
            rows={2}
            style={{ 
              borderColor: 'var(--border-ui)', 
              backgroundColor: 'var(--bg-default)',
              color: 'var(--text-primary)'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newMessageBody.trim() || isSending}
            className="px-4 py-2 rounded-md flex items-center justify-center transition-opacity"
            style={{ 
              backgroundColor: '#000000', 
              color: '#FFFFFF',
              opacity: (!newMessageBody.trim() || isSending) ? 0.5 : 1 
            }}
            aria-label="Send message"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
