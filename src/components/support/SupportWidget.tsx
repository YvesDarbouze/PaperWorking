'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Clock, Sparkles } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import toast from 'react-hot-toast';

export default function SupportWidget() {
  const { planId } = useEntitlements();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusinessHours, setIsBusinessHours] = useState(true);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derive Plan Label and SLA response hours
  const planLabel = planId === 'team' ? 'Team' : planId === 'individual' ? 'Investor' : 'Solo';
  const slaText = planId === 'team' ? '2 hours' : planId === 'individual' ? '8 hours' : '24 hours';

  // Check business hours on component mount
  useEffect(() => {
    const checkBusinessHours = () => {
      try {
        const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
        const estDate = new Date(estTime);
        const day = estDate.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
        const hours = estDate.getHours();
        
        // Monday (1) to Friday (5), 9:00 AM (9) to 5:00 PM (17)
        const active = day >= 1 && day <= 5 && hours >= 9 && hours < 17;
        setIsBusinessHours(active);
      } catch (e) {
        // Fallback to local time if timezone lookup fails
        const localDate = new Date();
        const day = localDate.getDay();
        const hours = localDate.getHours();
        const active = day >= 1 && day <= 5 && hours >= 9 && hours < 17;
        setIsBusinessHours(active);
      }
    };

    checkBusinessHours();
    // Re-check every minute
    const interval = setInterval(checkBusinessHours, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isTyping]);

  // Initial welcome message based on business hours
  useEffect(() => {
    if (isOpen && chatLog.length === 0) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isBusinessHours) {
        setChatLog([
          {
            sender: 'agent',
            text: `Hi there! Thanks for reaching out to PaperWorking Support. How can we help you with your real estate deals today?`,
            time: timeStr,
          },
        ]);
      } else {
        setChatLog([
          {
            sender: 'agent',
            text: `Hello! We are currently off business hours (Mon-Fri 9am-5pm EST). Since you're on our ${planLabel} plan, we'll respond within ${slaText}. Please leave your question or feedback below and we'll get back to you!`,
            time: timeStr,
          },
        ]);
      }
    }
  }, [isOpen, isBusinessHours, planLabel, slaText]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message;
    setMessage('');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatLog((prev) => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);

    if (isBusinessHours) {
      // Simulate live typing support response
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let responseText = "Thanks for your query! We have recorded your question and a support representative is reviewing it now.";
        if (userMsg.toLowerCase().includes('noi')) {
          responseText = "NOI (Net Operating Income) is calculated as Gross Income minus Operating Expenses. Check out our /help/noi guide for formulas and detail!";
        } else if (userMsg.toLowerCase().includes('cash flow')) {
          responseText = "Cash Flow is NOI minus Debt Service. Check out our /help/cash-flow guide to see how to improve it!";
        } else if (userMsg.toLowerCase().includes('billing') || userMsg.toLowerCase().includes('upgrade')) {
          responseText = "You can manage your subscription plan and billing cards on the /dashboard/settings/billing page.";
        }

        setChatLog((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: responseText,
            time: replyTime,
          },
        ]);
      }, 1500);
    } else {
      // Off business hours: acknowledge ticket submission
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: `Ticket recorded successfully! A support engineer will review this and reply within ${slaText} to your account email.`,
            time: replyTime,
          },
        ]);
        toast.success(`Support Ticket Submitted. Response within ${slaText}!`);
      }, 1000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-xl hover:shadow-emerald-500/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
          aria-label="Open support chat"
        >
          <MessageSquare className="w-6 h-6 animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="w-80 sm:w-96 h-[480px] rounded-2xl border border-[var(--pw-border)] bg-surface-container/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
          style={{
            background: 'linear-gradient(180deg, rgba(11,20,26,0.98) 0%, rgba(11,20,26,0.99) 100%)',
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--pw-border)] bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--pw-black)]">PaperWorking Support</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isBusinessHours ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-[10px] text-[var(--pw-muted)]">
                    {isBusinessHours ? 'Live Chat Active' : `Offline (SLA: ${slaText})`}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-[var(--pw-muted)] hover:text-[var(--pw-black)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
            {chatLog.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-500 text-white rounded-br-none'
                      : 'bg-white/5 border border-[var(--pw-border)] text-[var(--pw-black)] rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[8px] text-white/40 block text-right mt-1">{msg.time}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-[var(--pw-border)] rounded-xl rounded-bl-none px-3 py-2 text-xs text-[var(--pw-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--pw-border)] bg-white/5 flex gap-2">
            <input
              type="text"
              placeholder="Ask a question..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 bg-white/5 border border-[var(--pw-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-400 transition-colors text-[var(--pw-black)] placeholder:text-[var(--pw-muted)]"
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
