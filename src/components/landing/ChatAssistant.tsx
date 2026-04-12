'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

/**
 * ChatAssistant
 *
 * Floating action button (bottom-right) that opens a PaperWorking Assistant
 * chat window. Pre-seeded with a greeting prompt. Strict PaperWorking palette.
 */

interface Message {
  id: number;
  role: 'assistant' | 'user';
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Have a document you need to automate? Ask me how.',
  },
];

const DEMO_RESPONSES: Record<string, string> = {
  closing: 'Great question! PaperWorking can auto-route closing disclosures, title insurance forms, and wiring instructions to the right team member the moment they\'re uploaded. Want to see a live demo?',
  document: 'Upload any PDF, DOCX, or image — our AI extracts key fields like purchase price, property address, and party names in under 12 seconds. No manual data entry required.',
  price: 'We offer three tiers: Starter ($79/mo), Professional ($149/mo), and Enterprise (custom). All plans include a 14-day free trial with no credit card required.',
  team: 'You can invite unlimited team members. Each person gets role-based access — contractors see the Triage Queue, lawyers see the Closing Room, and lead investors see everything.',
  security: 'Every action is logged to an immutable audit trail. Role-based access ensures each team member sees only what they need. All data is encrypted at rest and in transit.',
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return 'That\'s a great question! Our team can walk you through that use case. Click "Get Started" to book a personalized demo, or ask me about document automation, pricing, team access, or security.';
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(2);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: idCounter.current++, role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const botMsg: Message = { id: idCounter.current++, role: 'assistant', text: getResponse(trimmed) };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  }, [input]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer ${
          isOpen
            ? 'bg-phase-3 rotate-0'
            : 'bg-black hover:bg-phase-4'
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
            <p className="text-[10px] text-phase-2">Always online</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-dashboard">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-6 h-6 shrink-0 flex items-center justify-center mt-0.5 ${
                  msg.role === 'assistant' ? 'bg-black' : 'bg-phase-2'
                }`}>
                  {msg.role === 'assistant' ? (
                    <Bot className="w-3 h-3 text-white" />
                  ) : (
                    <User className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className={`px-3 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-phase-1 text-phase-4'
                    : 'bg-black text-white'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about document automation..."
              className="flex-1 text-xs bg-dashboard border border-phase-1 px-3 py-2.5 text-phase-4 placeholder:text-phase-2 focus:outline-none focus:border-phase-3 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
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
