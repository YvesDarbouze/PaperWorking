'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { VendorProfile } from '@/types/schema';
import { Checkbox } from '../ui';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import { assignVendorToProject } from '@/actions/vendorAssignment';

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
  const [urgency, setUrgency] = useState<'standard' | 'rush' | 'asap'>('standard');
  const [desiredTimeline, setDesiredTimeline] = useState('');
  const { user } = useAuth();
  const projects = useProjectStore((state) => state.projects);

  // Sync customProjectId if projectId prop changes or on mount
  useEffect(() => {
    if (projectId) {
      setCustomProjectId(projectId);
    } else if (projects.length > 0) {
      // Auto-select the first project if none is set
      setCustomProjectId(projects[0].id);
    } else {
      setCustomProjectId('');
    }
  }, [projectId, projects, isOpen]);

  if (!isOpen || !vendor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProjectId.trim()) {
      toast.error('Project selection is required to request a quote.');
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
      
      const serviceType = vendor.type || (vendor as any).category || 'Other';
      const vendorUid = vendor.uid || vendor.id;

      if (vendorUid.startsWith('demo-')) {
        toast.error('Demo vendors cannot be assigned to projects. Please search for a registered vendor.');
        setIsSubmitting(false);
        return;
      }

      const res = await assignVendorToProject(
        idToken,
        customProjectId.trim(),
        vendorUid,
        serviceType,
        message.trim(),
        urgency,
        desiredTimeline.trim() || undefined
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to request quote.');
      }

      toast.success(`Quote requested from ${vendor.companyName}`);
      setMessage('');
      setAgreeToS(false);
      setUrgency('standard');
      setDesiredTimeline('');
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-pw-glass-bg w-full max-w-lg rounded-2xl border border-pw-border backdrop-blur-[20px] shadow-xl overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-pw-border bg-pw-glass-bg/90 text-pw-black">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-pw-black">Request Quote</h2>
              <p className="text-sm font-medium text-pw-muted mt-1">
                {vendor.companyName} • {vendor.type}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-pw-black hover:bg-pw-glass-bg/25"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-pw-glass-bg/50 p-4 border border-pw-border rounded-xl">
              <div>
                <p className="text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1">Baseline Fee</p>
                <p className="text-sm font-bold text-pw-black">{vendor.feeRangeLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1">Est. Turnaround</p>
                <p className="text-sm font-bold text-pw-black">{vendor.avgTurnaroundDays} Days</p>
              </div>
            </div>

            {/* Urgency & Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-2">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />Urgency
                </label>
                <div className="flex gap-2">
                  {(['standard', 'rush', 'asap'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setUrgency(level)}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                        urgency === level
                          ? level === 'asap'
                            ? 'bg-red-500/10 border-red-500/30 text-red-600'
                            : level === 'rush'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                              : 'bg-pw-glass-bg border-pw-border text-pw-black'
                          : 'border-pw-border/50 text-pw-muted hover:border-pw-border'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-2">
                  <Clock className="w-3 h-3 inline mr-1" />Desired Timeline
                </label>
                <input
                  type="text"
                  value={desiredTimeline}
                  onChange={(e) => setDesiredTimeline(e.target.value)}
                  placeholder="e.g. Within 5 days"
                  className="glass-input w-full px-4 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-2">
                Select Project <span className="text-red-500">*</span>
              </label>
              {projectId ? (
                <input
                  type="text"
                  value={projects.find((p) => p.id === projectId)?.propertyName || customProjectId}
                  readOnly
                  className="glass-input w-full px-4 py-3 text-sm rounded-2xl focus:outline-none transition-colors"
                />
              ) : projects.length > 0 ? (
                <select
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  className="glass-input w-full px-4 py-3 text-sm rounded-2xl focus:outline-none transition-colors bg-pw-glass-bg border border-pw-border text-pw-black"
                  required
                >
                  <option value="" disabled>Select a property...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="text-pw-black bg-white">
                      {p.propertyName || p.address || 'Untitled Property'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  placeholder="Enter associated Project ID"
                  className="glass-input w-full px-4 py-3 text-sm rounded-2xl focus:outline-none transition-colors text-pw-black bg-pw-glass-bg"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-2">
                Context & Requirements
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Briefly describe the property condition, timelines, or specific deliverables needed..."
                className="glass-input w-full px-4 py-3 text-sm rounded-2xl focus:outline-none transition-colors min-h-[120px] resize-y"
              />
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                <span className="font-bold">Vendor Disclosure:</span> PaperWorking does not vet vendors. You must verify credentials and references before engaging.
              </p>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="tos-checkbox"
                checked={agreeToS}
                onChange={(e) => setAgreeToS(e.target.checked)}
              />
              <label htmlFor="tos-checkbox" className="text-xs font-medium text-pw-black leading-snug">
                I agree to the <a href="/tos" target="_blank" className="underline hover:text-pw-black">Terms of Service</a> and understand that quotes and final fees may be subject to change based on actual requirements discovered during execution.
              </label>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="pw-btn pw-btn--ghost pw-btn--pill px-6 py-3 text-xs uppercase tracking-widest transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !customProjectId.trim() || !agreeToS}
                className="pw-btn pw-btn--primary pw-btn--pill px-6 py-3 text-white text-xs uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
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
