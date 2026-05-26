'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, Shield, ChevronRight, Check } from 'lucide-react';

interface InvestorInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName?: string;
}

export default function InvestorInviteModal({ isOpen, onClose, propertyName }: InvestorInviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'VIEWER' | 'LIMITED' | 'FULL'>('VIEWER');
  const [isSent, setIsSent] = useState(false);

  const handleSend = () => {
    // Logic would go here
    setIsSent(true);
    setTimeout(() => {
      onClose();
      setIsSent(false);
      setEmail('');
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-pw-border flex justify-between items-center bg-pw-glass-bg/90 text-pw-black">
              <div className="flex items-center gap-4">
                <UserPlus className="w-5 h-5 text-pw-primary" />
                <h2 className="text-sm font-black uppercase tracking-[0.4em]">INITIATE INVESTOR INVITE</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-pw-glass-bg/25 rounded-full transition-all text-pw-black"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-8 space-y-6">
              {isSent ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-pw-glass-bg/50 border border-pw-border text-pw-black rounded-full flex items-center justify-center mb-6">
                    <Check className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-pw-black uppercase tracking-tighter mb-2">INVITATION COMMITTED</h3>
                  <p className="text-sm text-pw-muted font-medium uppercase tracking-widest">TRANSMITTING CREDENTIALS TO INVESTOR...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-4">RECIPIENT EMAIL</label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted" />
                      <input 
                        type="email" 
                        placeholder="investor@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-16 pr-8 py-4 bg-pw-glass-bg/50 border border-pw-border rounded-full text-pw-black text-xs font-black tracking-widest focus:outline-none focus:border-pw-primary transition-all uppercase"
                      />
                    </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-4">ACCESS PERMISSIONS</label>
                     <div className="grid grid-cols-1 gap-4">
                        {[
                          { id: 'VIEWER', label: 'AUDIT ONLY', desc: 'Read-only access to financials and ledger.' },
                          { id: 'LIMITED', label: 'STRATEGIC PARTNER', desc: 'Can add comments and export statements.' },
                          { id: 'FULL', label: 'JOINT VENTURE', desc: 'Collaborative management of the entire asset.' }
                        ].map((r) => (
                          <button 
                            key={r.id}
                            onClick={() => setRole(r.id as any)}
                            className={`p-4 text-left border transition-all flex justify-between items-center rounded-2xl ${role === r.id ? 'bg-pw-black border-pw-black text-pw-white' : 'bg-pw-glass-bg/50 border-pw-border text-pw-black hover:border-pw-primary'}`}
                          >
                            <div>
                               <p className="text-xs font-black uppercase tracking-widest mb-1">{r.label}</p>
                               <p className={`text-[10px] uppercase tracking-tighter ${role === r.id ? 'text-pw-primary' : 'text-pw-muted font-medium'}`}>{r.desc}</p>
                            </div>
                            <Shield className={`w-4 h-4 ${role === r.id ? 'text-pw-primary' : 'text-pw-muted'}`} />
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex items-start gap-4">
                    <Shield className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <p className="text-[10px] text-orange-400 font-bold uppercase leading-relaxed tracking-wider">
                      SECURITY NOTICE: INVITATION GRANTS ACCESS TO SENSITIVE FINANCIAL ARTIFACTS FOR <span className="underline">{propertyName || 'ALL ACTIVE DEALS'}</span>.
                    </p>
                  </div>

                  <button 
                    onClick={handleSend}
                    disabled={!email}
                    className="pw-btn pw-btn--primary pw-btn--pill w-full py-4 text-sm font-black uppercase tracking-[0.4em] disabled:opacity-30 transition-all flex items-center justify-center gap-4 shadow-xl"
                  >
                    <span>TRANSMIT INVITE</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
