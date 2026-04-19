'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function usePaperworkingChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Have a document you need to automate? Ask me about your projects or subscription.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: trimmed };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      const assistantId = `a_${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok || !res.body) throw new Error('Stream failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
            );
          }
        }
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages],
  );

  return { messages, input, handleInputChange, handleSubmit, isLoading };
}

/**
 * ChatAssistant
 *
 * Floating action button (bottom-right) that opens a PaperWorking Assistant
 * chat window. Powered by Gemini + MCP Tools via /api/chat.
 */
export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = usePaperworkingChat();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer ${
          isOpen ? 'bg-phase-3 rotate-0' : 'bg-black hover:bg-phase-4'
        }`}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <MessageSquare className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-white border border-phase-1 shadow-xl flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{ height: '480px' }}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-black flex items-center space-x-3 shrink-0">
          <div className="w-8 h-8 bg-phase-4 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">PaperWorking Assistant</p>
            <p className="text-xs text-phase-2">Connected to Project Data</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-dashboard">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`flex items-start space-x-2 max-w-[85%] ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 shrink-0 flex items-center justify-center mt-0.5 ${
                    msg.role === 'assistant' ? 'bg-black' : 'bg-phase-2'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Bot className="w-3 h-3 text-white" />
                  ) : (
                    <User className="w-3 h-3 text-white" />
                  )}
                </div>
                <div
                  className={`px-3 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-white border border-phase-1 text-phase-4'
                      : 'bg-black text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 shrink-0 flex items-center justify-center mt-0.5 bg-black">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white border border-phase-1 px-3 py-2.5 text-xs text-phase-3">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-phase-2 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-phase-2 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-phase-2 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-phase-1 bg-white shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Query projects or status..."
              className="flex-1 text-xs bg-dashboard border border-phase-1 px-3 py-2.5 text-phase-4 placeholder:text-phase-2 focus:outline-none focus:border-phase-3 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 bg-black flex items-center justify-center text-white hover:bg-phase-4 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
