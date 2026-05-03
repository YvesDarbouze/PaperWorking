'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Search, Send, Sparkles, Filter, ChevronRight, User } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import PhaseBadge from '../ui/PhaseBadge';
import { communicationService } from '@/lib/services/communicationService';
import { draftingAgent } from '@/lib/ai/draftingAgent';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import DraftAssistant from './DraftAssistant';

interface Message {
  id: string;
  senderEmail: string;
  senderName: string;
  body: string;
  createdAt: any;
  type: string;
}

export default function GlobalInbox() {
  const projects = useProjectStore(state => state.projects);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(projects[0]?.id || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedDeal = projects.find(d => d.id === selectedDealId);

  // Subscribe to messages for the selected deal
  useEffect(() => {
    if (!selectedDealId) return;

    const q = query(
      collection(db, 'projects', selectedDealId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedDealId]);

  const handleSend = async () => {
    if (!selectedDealId || !replyText.trim()) return;

    try {
      await communicationService.logMessage(selectedDealId, selectedDeal?.organizationId || 'primary-org', {
        senderEmail: 'you@paperworking.co',
        senderName: 'You',
        body: replyText,
        type: 'INTERNAL_COMMENT',
      });
      setReplyText('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const insertDraft = (draft: string) => {
    setReplyText(draft);
    setIsDrafting(false);
  };

  return (
    <div className="flex bg-bg-surface h-full border border-border-accent overflow-hidden">
      
      {/* Thread List - Antigravity Sidebar Pattern */}
      <div className="w-96 border-r border-border-accent flex flex-col bg-bg-primary">
        <div className="p-10 border-b border-border-accent space-y-8 bg-pw-black">
          <h2 className="text-sm font-black text-pw-white uppercase tracking-[0.4em] flex items-center">
            <Mail className="w-4 h-4 mr-4 text-pw-accent" />
            COMMUNICATION LEDGER
          </h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pw-white/30" />
            <input 
              type="text" 
              placeholder="SCAN ASSET INDEX..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-pw-border/20 border border-pw-white/10 text-pw-white text-xs font-black tracking-widest focus:outline-none focus:border-pw-accent transition-all placeholder:text-pw-white/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {projects.filter(d => d.propertyName.toLowerCase().includes(searchQuery.toLowerCase())).map((deal) => (
            <button
              key={deal.id}
              onClick={() => setSelectedDealId(deal.id)}
              className={`w-full p-10 text-left border-b border-border-accent transition-all flex items-start gap-6 hover:bg-bg-surface ${selectedDealId === deal.id ? 'bg-bg-surface border-l-4 border-l-pw-accent' : ''}`}
            >
              <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center border ${selectedDealId === deal.id ? 'bg-pw-black text-pw-white border-pw-black' : 'bg-bg-primary text-text-secondary border-border-accent'}`}>
                <span className="text-sm font-black">{deal.propertyName[0]}</span>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-black text-text-primary truncate uppercase tracking-tighter">{deal.propertyName}</span>
                  <span className="text-xs font-black text-text-secondary uppercase tracking-widest font-mono">02:14:59</span>
                </div>
                <p className="text-xs text-text-secondary font-bold truncate uppercase tracking-widest mb-4">{deal.address}</p>
                <div className="mt-2">
                   <PhaseBadge status={deal.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Communication Stream - Antigravity Workbench Window */}
      <div className="flex-1 flex flex-col bg-bg-surface">
        {selectedDeal ? (
          <>
            <header className="p-10 border-b border-border-accent flex justify-between items-center bg-bg-surface sticky top-0 z-10">
               <div className="flex items-center gap-8">
                  <div className="w-16 h-16 border border-pw-black flex items-center justify-center text-text-primary font-black text-2xl">
                    {selectedDeal.propertyName[0]}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-text-primary uppercase tracking-tighter leading-none mb-2">{selectedDeal.propertyName}</h3>
                    <p className="text-xs text-pw-accent font-black uppercase tracking-[0.4em]">{selectedDeal.address}</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button className="p-4 border border-border-accent text-text-primary hover:bg-pw-black hover:text-pw-white transition-all">
                    <Filter className="w-5 h-5" />
                  </button>
                  <button className="p-4 bg-pw-black text-pw-white border border-pw-black hover:bg-pw-accent hover:border-pw-accent transition-all">
                    <Sparkles className="w-5 h-5" />
                  </button>
               </div>
            </header>

            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-bg-primary/50">
               {messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-text-secondary grayscale opacity-40">
                    <Mail className="w-20 h-20 mb-8" />
                    <p className="text-sm font-black uppercase tracking-[0.4em]">SYSTEM STANDBY — NO OPERATIONAL LOGS</p>
                 </div>
               ) : (
                 messages.map((msg, i) => (
                   <motion.div 
                     key={msg.id}
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ delay: i * 0.05 }}
                     className={`flex ${msg.senderEmail.includes('you') ? 'justify-end' : 'justify-start'}`}
                   >
                     <div className={`max-w-[70%] flex flex-col ${msg.senderEmail.includes('you') ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-4 mb-4 px-1">
                           <span className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">{msg.senderName}</span>
                           <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em] font-mono">
                             AUDIT TIME: {new Date(msg.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           </span>
                        </div>
                        <div className={`p-10 border text-sm leading-loose font-medium uppercase tracking-tight transition-all shadow-sm ${
                          msg.senderEmail.includes('you') 
                            ? 'bg-pw-black text-pw-white border-pw-black' 
                            : 'bg-bg-surface text-text-primary border-border-accent'
                        }`}>
                          {msg.body}
                        </div>
                     </div>
                   </motion.div>
                 ))
               )}
            </div>

            <footer className="p-12 border-t border-border-accent bg-bg-surface shadow-2xl">
               <div className="relative">
                  <textarea 
                    placeholder="ENTER OPERATIONAL LOG OR RESPONSE DATA..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full h-48 p-10 border border-border-accent rounded-none text-sm font-black uppercase tracking-widest focus:outline-none focus:border-pw-accent transition-all resize-none bg-bg-primary/30 text-text-primary placeholder:text-text-secondary"
                  />
                  <div className="absolute top-0 right-0 p-6 flex gap-6">
                    <button 
                      onClick={() => setIsDrafting(true)}
                      className="flex items-center gap-4 px-8 py-4 bg-bg-surface border border-pw-black text-text-primary text-xs font-black uppercase tracking-[0.3em] hover:bg-pw-black hover:text-pw-white transition-all shadow-2xl"
                    >
                      <Sparkles className="w-4 h-4 text-pw-accent" />
                      <span>COMPILE AI DRAFT</span>
                    </button>
                    <button 
                      onClick={handleSend}
                      className="flex items-center gap-4 px-10 py-4 bg-pw-black text-pw-white text-xs font-black uppercase tracking-[0.3em] border border-pw-black hover:bg-pw-accent hover:border-pw-accent transition-all shadow-2xl"
                    >
                      <Send className="w-4 h-4 ml-1" />
                      <span>COMMIT</span>
                    </button>
                  </div>
               </div>
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary grayscale">
            <Mail className="w-24 h-24 mb-10 opacity-20" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">SELECT ASSET FOR COMMUNICATION AUDIT</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDrafting && selectedDeal && (
          <DraftAssistant 
            deal={selectedDeal} 
            onClose={() => setIsDrafting(false)} 
            onInsert={insertDraft} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
