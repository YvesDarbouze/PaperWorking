'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Clock, Sparkles } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { defaultSupportProvider, SupportMessage } from '@/lib/providers/support';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

export default function SupportWidget() {
  const { planId } = useEntitlements();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusinessHours, setIsBusinessHours] = useState(true);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<SupportMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
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

  // Load open ticket or initialize welcome message
  useEffect(() => {
    if (isOpen && user && !ticketId) {
      const loadOpenTicket = async () => {
        try {
          const ticket = await defaultSupportProvider.getOpenTicket(user.uid);
          if (ticket && ticket.id) {
            setTicketId(ticket.id);
            setChatLog(ticket.messages);
          } else {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const welcomeText = isBusinessHours
              ? `Hi there! Thanks for reaching out to PaperWorking Support. How can we help you with your real estate deals today?`
              : `Hello! We are currently off business hours (Mon-Fri 9am-5pm EST). Since you're on our ${planLabel} plan, we'll respond within ${slaText}. Please leave your question or feedback below and we'll get back to you!`;
            
            setChatLog([
              {
                sender: 'agent',
                text: welcomeText,
                time: timeStr,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        } catch (e) {
          console.error('[SupportWidget] Error loading ticket:', e);
        }
      };
      loadOpenTicket();
    }
  }, [isOpen, user, isBusinessHours, planLabel, slaText, ticketId]);

  // Subscribe to real-time updates for active ticket
  useEffect(() => {
    if (!ticketId || !user) return;

    const providerType = (
      process.env.NEXT_PUBLIC_SUPPORT_PROVIDER ||
      process.env.SUPPORT_PROVIDER ||
      'mock'
    ).toLowerCase();

    if (providerType === 'firestore') {
      const unsubscribe = onSnapshot(
        doc(db, 'supportTickets', ticketId),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && data.messages) {
              setChatLog(data.messages);
            }
          }
        },
        (err) => {
          console.error('[SupportWidget] onSnapshot error:', err);
        }
      );
      return () => unsubscribe();
    }
  }, [ticketId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    const userMsgText = message;
    setMessage('');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: SupportMessage = {
      sender: 'user',
      text: userMsgText,
      time: timeStr,
      timestamp: new Date().toISOString(),
    };

    // Optimistically update UI
    setChatLog((prev) => [...prev, userMsg]);

    try {
      let activeTicketId = ticketId;
      if (!activeTicketId) {
        // Create new ticket including all existing messages
        const initialMessages = [...chatLog, userMsg];
        const newId = await defaultSupportProvider.createTicket(
          user.uid,
          user.email || '',
          planLabel,
          initialMessages
        );
        setTicketId(newId);
        activeTicketId = newId;
      } else {
        // Append user message to existing ticket
        await defaultSupportProvider.addMessage(activeTicketId, userMsg);
      }

      // Simulate live typing or automated support responses
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let responseText = "Thanks for your query! We have recorded your question and a support representative is reviewing it now.";
        if (userMsgText.toLowerCase().includes('noi')) {
          responseText = "NOI (Net Operating Income) is calculated as Gross Income minus Operating Expenses. Check out our /help/noi guide for formulas and detail!";
        } else if (userMsgText.toLowerCase().includes('cash flow')) {
          responseText = "Cash Flow is NOI minus Debt Service. Check out our /help/cash-flow guide to see how to improve it!";
        } else if (userMsgText.toLowerCase().includes('billing') || userMsgText.toLowerCase().includes('upgrade')) {
          responseText = "You can manage your subscription plan and billing cards on the /dashboard/settings/billing page.";
        } else if (!isBusinessHours) {
          responseText = `Ticket recorded successfully! A support engineer will review this and reply within ${slaText} to your account email.`;
        }

        const agentMsg: SupportMessage = {
          sender: 'agent',
          text: responseText,
          time: replyTime,
          timestamp: new Date().toISOString(),
        };

        if (activeTicketId) {
          await defaultSupportProvider.addMessage(activeTicketId, agentMsg);
        }

        // For mock/local fallback, optimistically append agent message
        const providerType = (
          process.env.NEXT_PUBLIC_SUPPORT_PROVIDER ||
          process.env.SUPPORT_PROVIDER ||
          'mock'
        ).toLowerCase();
        if (providerType !== 'firestore') {
          setChatLog((prev) => [...prev, agentMsg]);
        }

        if (!isBusinessHours) {
          toast.success(`Support Ticket Submitted. Response within ${slaText}!`);
        }
      }, 1200);

    } catch (err: any) {
      console.error('[SupportWidget] Error sending message:', err);
      toast.error('Failed to send support message. Please try again.');
    }
  };


  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-pw-success hover:bg-pw-success/90 active:scale-95 shadow-xl hover:shadow-pw-success/20 text-[#0d0a0b] flex items-center justify-center transition-all cursor-pointer border border-white/10"
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
            background: 'linear-gradient(180deg, rgba(13,10,11,0.98) 0%, rgba(13,10,11,0.99) 100%)',
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--pw-border)] bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pw-success-container flex items-center justify-center border border-pw-success-border/30">
                <Sparkles className="w-4 h-4 text-pw-success" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--pw-black)]">PaperWorking Support</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isBusinessHours ? 'bg-pw-success' : 'bg-amber-500'}`} />
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
                      ? 'bg-pw-success text-[#0d0a0b] rounded-br-none'
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
                  <span className="w-1.5 h-1.5 rounded-full bg-pw-success animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-pw-success animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-pw-success animate-bounce [animation-delay:0.4s]" />
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
              className="flex-1 bg-white/5 border border-[var(--pw-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pw-success transition-colors text-[var(--pw-black)] placeholder:text-[var(--pw-muted)]"
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-pw-success hover:bg-pw-success/90 text-[#0d0a0b] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
