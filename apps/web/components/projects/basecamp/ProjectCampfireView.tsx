'use client';

import { useState, useEffect } from 'react';
import { Flame, PaperPlaneRight } from '@phosphor-icons/react';
import type { ProjectCampfireMessage } from '@/lib/projects/types';

export default function ProjectCampfireView({
  projectId,
  messages,
  onRefresh,
}: {
  projectId: string;
  messages: ProjectCampfireMessage[];
  onRefresh: () => void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 5s gentle polling while user is actively chatting in Campfire
  useEffect(() => {
    const timer = setInterval(() => {
      onRefresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/campfire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setText('');
        onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-none border border-border bg-card p-4 sm:p-5 flex flex-col h-[520px]">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-none border border-border bg-muted/60 text-foreground">
            <Flame size={18} weight="fill" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Project Campfire</h3>
            <p className="text-[11px] text-muted-foreground">Informal group chat for quick team coordination.</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          {messages.length} messages
        </span>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
            <Flame size={28} className="text-muted-foreground/60 mb-1" />
            <p>The campfire is quiet.</p>
            <p className="text-[11px] text-muted-foreground/80">Send a quick note or status ping to the team.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-none border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1 transition hover:bg-muted/40"
            >
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{msg.senderName}</span>
                  <span className="text-muted-foreground font-mono">({msg.senderRole})</span>
                </div>
                <span className="font-mono text-[10px]">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="pt-3 border-t border-border flex items-center gap-2 mt-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something to the project crew..."
          className="flex-1 rounded-none border border-input bg-background px-3 py-2 text-base sm:text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="inline-flex items-center gap-1 rounded-none bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition min-h-[44px] disabled:opacity-40"
        >
          <PaperPlaneRight size={14} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
