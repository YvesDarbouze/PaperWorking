'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { VendorProfile } from '@/types/schema';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface VendorRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorProfile | null;
  projectId?: string; // Optional if we want to request from global directory, but usually required
}

export function VendorRequestModal({ isOpen, onClose, vendor, projectId }: VendorRequestModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customProjectId, setCustomProjectId] = useState(projectId || '');
  const [agreeToS, setAgreeToS] = useState(false);
  const { user } = useAuth();

  if (!isOpen || !vendor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProjectId.trim()) {
      toast.error('Project ID is required to request a quote.');
      return;
    }
    
    if (!agreeToS) {
      toast.error('You must agree to the Terms of Service.');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to request a quote.');
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/vendors/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          projectId: customProjectId.trim(),
          vendorUid: vendor.uid,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request quote.');
      }

      toast.success(`Quote requested from ${vendor.companyName}`);
      setMessage('');
      setAgreeToS(false);
      onClose();
    } catch (error: any) {
      console.error('Failed to submit quote request:', error);
      toast.error(error.message || 'Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-bg-surface w-full max-w-lg rounded-sm border border-border-accent shadow-xl overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-border-accent">
            <div>
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tighter">Request Quote</h2>
              <p className="text-sm font-medium text-text-secondary mt-1">
                {vendor.companyName} • {vendor.type}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-pw-dashboard transition-colors rounded-sm text-text-secondary hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-pw-dashboard p-4 border border-border-accent">
              <div>
                <p className="text-xs uppercase tracking-widest font-black text-text-secondary mb-1">Baseline Fee</p>
                <p className="text-sm font-bold text-text-primary">{vendor.feeRangeLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-black text-text-secondary mb-1">Est. Turnaround</p>
                <p className="text-sm font-bold text-text-primary">{vendor.avgTurnaroundDays} Days</p>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-black text-text-primary mb-2">
                Project ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customProjectId}
                onChange={(e) => setCustomProjectId(e.target.value)}
                placeholder="Enter associated Project ID"
                className="w-full px-4 py-3 bg-pw-dashboard border border-border-accent text-sm font-medium focus:outline-none focus:border-pw-black transition-colors"
                required
                readOnly={!!projectId} // If passed from context, lock it
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-black text-text-primary mb-2">
                Context & Requirements
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Briefly describe the property condition, timelines, or specific deliverables needed..."
                className="w-full px-4 py-3 bg-pw-dashboard border border-border-accent text-sm font-medium focus:outline-none focus:border-pw-black transition-colors min-h-[120px] resize-y"
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="tos-checkbox"
                checked={agreeToS}
                onChange={(e) => setAgreeToS(e.target.checked)}
                className="mt-1 border-border-accent text-pw-black focus:ring-pw-black rounded-sm"
              />
              <label htmlFor="tos-checkbox" className="text-xs font-medium text-text-secondary leading-snug">
                I agree to the <a href="/tos" target="_blank" className="underline hover:text-text-primary">Terms of Service</a> and understand that quotes and final fees may be subject to change based on actual requirements discovered during execution.
              </label>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-border-accent text-xs font-black uppercase tracking-widest hover:bg-pw-dashboard transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !customProjectId.trim() || !agreeToS}
                className="px-6 py-3 bg-pw-black text-white text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
