'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, Shield, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';

type Role = 'OWNER' | 'PARTNER' | 'ANALYST' | 'VIEWER';

interface InvestorInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  propertyName?: string;
}

export default function InvestorInviteModal({ isOpen, onClose, projectId, propertyName }: InvestorInviteModalProps) {
  const { user } = useAuth();
  const projects = useProjectStore(state => state.projects);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? '');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveProjectId = projectId ?? selectedProjectId;

  const handleSend = async () => {
    if (!email || !effectiveProjectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/reil/projects/${effectiveProjectId}/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setIsSent(true);
      setTimeout(() => {
        onClose();
        setIsSent(false);
        setEmail('');
        setRole('VIEWER');
        setSelectedProjectId('');
        setError(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
                  {/* Project selector — only shown when no projectId was passed by caller */}
                  {!projectId && (
                    <div>
                      <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-4">SELECT PROJECT</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full px-4 py-3 bg-pw-glass-bg/50 border border-pw-border rounded-full text-pw-black text-xs font-bold tracking-widest focus:outline-none focus:border-pw-primary transition-all"
                      >
                        <option value="" disabled>Choose a project…</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.propertyName || p.address || p.id}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {propertyName && (
                    <p className="text-[10px] font-bold text-pw-muted uppercase tracking-[0.2em]">
                      INVITING TO: <span className="text-pw-black">{propertyName}</span>
                    </p>
                  )}

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
                          { id: 'VIEWER',  label: 'AUDIT ONLY',        desc: 'Read-only access to financials and ledger.' },
                          { id: 'ANALYST', label: 'STRATEGIC PARTNER', desc: 'Can add comments and export statements.' },
                          { id: 'PARTNER', label: 'JOINT VENTURE',     desc: 'Collaborative management of the entire asset.' },
                          { id: 'OWNER',   label: 'CO-OWNER',          desc: 'Full ownership-level access.' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setRole(r.id as Role)}
                            className={`p-4 text-left border transition-all flex justify-between items-center rounded-2xl ${role === r.id ? 'bg-pw-black border-pw-border text-pw-white' : 'bg-pw-glass-bg/50 border-pw-border text-pw-black hover:border-pw-primary'}`}
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
                      SECURITY NOTICE: INVITATION GRANTS ACCESS TO SENSITIVE FINANCIAL ARTIFACTS FOR <span className="underline">{propertyName || 'THIS PROJECT'}</span>.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={!email || !effectiveProjectId || isLoading}
                    className="pw-btn pw-btn--primary pw-btn--pill w-full py-4 text-sm font-black uppercase tracking-[0.4em] disabled:opacity-30 transition-all flex items-center justify-center gap-4 shadow-xl"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>TRANSMIT INVITE</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
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
