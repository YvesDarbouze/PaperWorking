'use client';

import React, { useState } from 'react';
import { MessageSquare, Mail, Send } from 'lucide-react';

export interface ThreadMessage {
  id: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  source: 'platform' | 'email_inbound';
  createdAt: string;
}

interface UnifiedMessageThreadProps {
  dealId: string;
  initialMessages?: ThreadMessage[];
  className?: string;
}

const DEFAULT_MESSAGES: ThreadMessage[] = [
  {
    id: 'msg_1',
    senderName: 'Yves Darbouze',
    text: 'Published deal details and financial analysis for 123 Main St.',
    source: 'platform',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'msg_2',
    senderName: 'Sarah Jenkins',
    senderEmail: 'sarah.j@acme-cap.com',
    text: 'Reviewed the pro-forma numbers. Looks promising! Is the seller open to seller financing?',
    source: 'email_inbound',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export default function UnifiedMessageThread({
  dealId: _dealId,
  initialMessages = DEFAULT_MESSAGES,
  className = '',
}: UnifiedMessageThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ThreadMessage = {
      id: `msg_${Date.now()}`,
      senderName: 'You (Creator)',
      text: inputText.trim(),
      source: 'platform',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  return (
    <div
      data-testid="unified-message-thread"
      className={`rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-6 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#34d399]" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Unified Deal Thread</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {messages.length} messages
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3.5 rounded-[10px] bg-white/[0.03] space-y-1.5 transition-all ${
              m.source === 'email_inbound'
                ? 'border-l-2 border-[#94a3b8] border-t border-r border-b border-white/5'
                : 'border-l-2 border-[#34d399] border-t border-r border-b border-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100">{m.senderName}</span>
                {m.source === 'email_inbound' ? (
                  <span
                    data-testid="badge-email"
                    className="px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3 text-[#94a3b8]" />
                    <span>Email</span>
                  </span>
                ) : (
                  <span
                    data-testid="badge-platform"
                    className="px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30 flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Platform</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {m.text}
            </p>
          </div>
        ))}
      </div>

      {/* Post Platform Message Input */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-white/5">
        <input
          type="text"
          data-testid="platform-message-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write a message on the deal thread..."
          className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-slate-100 focus:outline-none focus:border-[#34d399]/40 min-h-[44px]"
        />
        <button
          type="submit"
          data-testid="send-platform-message-btn"
          disabled={!inputText.trim()}
          className="h-11 px-5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          <Send className="w-4 h-4 text-slate-950" />
          <span>Post</span>
        </button>
      </form>
    </div>
  );
}
