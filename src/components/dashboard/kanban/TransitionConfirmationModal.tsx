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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-bg-surface rounded-3xl shadow-2xl overflow-hidden border border-border-accent"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-amber-100 p-3 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <button onClick={onClose} className="text-text-secondary hover:text-text-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-2xl font-light text-text-primary mb-2 tracking-tight">
                Update Asset Status?
              </h2>
              <p className="text-sm text-text-secondary mb-8 leading-relaxed">
                You are about to transition <span className="font-bold text-text-primary">"{dealName}"</span> to the 
                <span className="inline-flex items-center mx-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-widest border border-indigo-100">
                  {targetPhase}
                </span> 
                phase. This may trigger automated notifications and update financial projections.
              </p>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={onConfirm}
                  className="w-full flex items-center justify-center py-4 bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-black/10 active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Transition
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-bg-primary text-text-secondary rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-bg-primary transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Visual Footer */}
            <div className="bg-bg-primary px-8 py-4 border-t border-border-accent flex items-center justify-center italic text-xs text-text-secondary">
              <ArrowRight className="w-3 h-3 mr-2" />
              Automated ledger entry will be recorded in the audit trail.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
