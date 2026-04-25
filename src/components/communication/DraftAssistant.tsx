'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, RefreshCw, Users, ShieldCheck } from 'lucide-react';
import { Project } from '@/types/schema';
import { draftingAgent } from '@/lib/ai/draftingAgent';

interface DraftAssistantProps {
  deal: Project;
  onClose: () => void;
  onInsert: (draft: string) => void;
}

export default function DraftAssistant({ deal, onClose, onInsert }: DraftAssistantProps) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [audience, setAudience] = useState<'investors' | 'contractors'>('investors');

  const generateDraft = async () => {
    setLoading(true);
    try {
      const result = await draftingAgent.draftDealUpdate(deal, audience);
      setDraft(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: 450 }}
      animate={{ x: 0 }}
      exit={{ x: 450 }}
      transition={{ ease: "circOut", duration: 0.4 }}
      className="absolute top-0 right-0 h-full w-[450px] bg-bg-surface z-50 border-l border-border-accent flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.05)]"
    >
      <header className="p-10 border-b border-border-accent flex justify-between items-center bg-pw-black">
        <div className="flex items-center gap-5 text-pw-white">
           <Sparkles className="w-4 h-4 text-pw-accent" />
           <h3 className="text-sm font-black uppercase tracking-[0.4em]">COMMUNICATIONS ENGINE</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-pw-border/20 transition-all text-pw-white/50 hover:text-pw-white">
          <X className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-12 space-y-16">
        
        {/* Audience Selector - Institutional Grid */}
        <section className="space-y-6">
           <p className="text-xs font-black text-text-secondary uppercase tracking-[0.4em]">SYSTEM TARGET DEFINITION</p>
           <div className="grid grid-cols-1 border-t border-l border-border-accent">
              <button 
                onClick={() => setAudience('investors')}
                className={`p-8 border-r border-b border-border-accent transition-all text-left flex flex-col gap-3 ${audience === 'investors' ? 'bg-pw-black' : 'bg-bg-primary hover:bg-bg-surface'}`}
              >
                 <div className="flex items-center gap-4">
                   <Users className={`w-4 h-4 ${audience === 'investors' ? 'text-pw-accent' : 'text-text-secondary'}`} />
                   <span className={`text-xs font-black uppercase tracking-[0.2em] ${audience === 'investors' ? 'text-pw-white' : 'text-text-primary'}`}>Equity Stakeholders</span>
                 </div>
                 <p className={`text-xs leading-relaxed uppercase tracking-tight font-bold ${audience === 'investors' ? 'text-pw-white/50' : 'text-text-secondary'}`}>
                   Yield optimization, ROI settlement, Exit latency protocols.
                 </p>
              </button>
              <button 
                onClick={() => setAudience('contractors')}
                className={`p-8 border-r border-b border-border-accent transition-all text-left flex flex-col gap-3 ${audience === 'contractors' ? 'bg-pw-black' : 'bg-bg-primary hover:bg-bg-surface'}`}
              >
                 <div className="flex items-center gap-4">
                   <ShieldCheck className={`w-4 h-4 ${audience === 'contractors' ? 'text-pw-accent' : 'text-text-secondary'}`} />
                   <span className={`text-xs font-black uppercase tracking-[0.2em] ${audience === 'contractors' ? 'text-pw-white' : 'text-text-primary'}`}>Operational Labor</span>
                 </div>
                 <p className={`text-xs leading-relaxed uppercase tracking-tight font-bold ${audience === 'contractors' ? 'text-pw-white/50' : 'text-text-secondary'}`}>
                   Permit clearance, Draw compliance, Logistical precision logs.
                 </p>
              </button>
           </div>
        </section>

        {/* Generate Trigger - Utilitarian Action */}
        <button 
          onClick={generateDraft}
          disabled={loading}
          className="w-full flex items-center justify-center gap-5 py-6 bg-pw-black text-pw-white text-sm font-black uppercase tracking-[0.4em] transition-all hover:bg-pw-accent disabled:opacity-20 border border-pw-black shadow-xl"
        >
          {loading ? (
             <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
             <>
               <Sparkles className="w-5 h-5" />
               <span>COMPILE DISCLOSURE DRAFT</span>
             </>
          )}
        </button>

        {/* Draft Result - Ledger Preview */}
        <AnimatePresence>
          {draft && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 pt-12 border-t border-border-accent"
            >
               <div className="flex justify-between items-center">
                 <p className="text-xs font-black text-text-secondary uppercase tracking-[0.5em]">PREVIEW: 01-B_STABLE</p>
                 <button className="text-xs font-black text-pw-accent uppercase tracking-widest hover:underline" onClick={() => setDraft('')}>PURGE INDEX</button>
               </div>
               <div className="p-10 bg-bg-primary border border-border-accent text-sm text-text-primary leading-loose font-medium uppercase tracking-tight relative shadow-inner">
                  {draft}
                  <div className="absolute top-0 right-0 bg-pw-accent px-2 py-1 text-pw-white text-xs font-black animate-pulse">
                    AI_ACTIVE
                  </div>
               </div>
               <button 
                  onClick={() => onInsert(draft)}
                  className="w-full flex items-center justify-center gap-4 py-6 bg-bg-surface border border-pw-black text-text-primary text-sm font-black uppercase tracking-[0.3em] hover:bg-pw-black hover:text-pw-white transition-all shadow-xl"
               >
                  <Check className="w-5 h-5" />
                  <span>COMMIT TO COMMUNICATION LEDGER</span>
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="p-10 bg-bg-primary border-t border-border-accent text-center">
         <p className="text-xs text-text-secondary font-black uppercase tracking-[0.3em] leading-relaxed">
           SYSTEM ALERT: ALL AI-GENERATED DISCLOSURES REQUIRE HUMAN AUDIT. <br/>
           VERIFY FINANCIAL COUPLING PRIOR TO FINAL COMMITMENT.
         </p>
      </footer>
    </motion.div>
  );
}
