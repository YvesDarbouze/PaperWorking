'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, X } from 'lucide-react';

interface TransitionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dealName: string;
  targetPhase: string;
}

export default function TransitionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  dealName,
  targetPhase,
}: TransitionConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <button onClick={onClose} className="text-pw-black hover:bg-pw-glass-bg/25 p-2 rounded-full transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-2xl font-normal text-pw-black mb-2 tracking-tight">
                Update Asset Status?
              </h2>
              <p className="text-sm text-pw-muted mb-8 leading-relaxed">
                You are about to transition <span className="font-bold text-pw-black">"{dealName}"</span> to the 
                <span className="inline-flex items-center mx-1 px-2 py-0.5 rounded-full bg-pw-glass-bg/50 text-pw-black border border-pw-border font-bold text-xs uppercase tracking-widest">
                  {targetPhase}
                </span> 
                phase. This may trigger automated notifications and update financial projections.
              </p>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={onConfirm}
                  className="pw-btn pw-btn--primary pw-btn--pill w-full flex items-center justify-center py-4 text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Transition
                </button>
                <button
                  onClick={onClose}
                  className="pw-btn pw-btn--secondary pw-btn--pill w-full py-4 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Visual Footer */}
            <div className="bg-pw-glass-bg/50 px-8 py-4 border-t border-pw-border flex items-center justify-center italic text-xs text-pw-muted">
              <ArrowRight className="w-3 h-3 mr-2" />
              Automated ledger entry will be recorded in the audit trail.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
