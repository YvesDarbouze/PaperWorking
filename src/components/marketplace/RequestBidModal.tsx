'use client';

import React, { useState } from 'react';
import { ServiceType } from '@/lib/marketplace/bidding';
import { Send, X, Building, DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface RequestBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  serviceType: ServiceType;
  onRequestSuccess?: () => void;
}

export default function RequestBidModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  serviceType,
  onRequestSuccess,
}: RequestBidModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState('proj_demo_1');
  const [description, setDescription] = useState('');
  const [budgetMax, setBudgetMax] = useState<number | ''>(2500);
  const [deadline, setDeadline] = useState('2026-09-15');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId: selectedProjectId,
          projectName: '742 Evergreen Terrace',
          vendorId,
          vendorName,
          serviceType,
          description,
          budgetMax: Number(budgetMax) || undefined,
          deadline,
        }),
      });

      if (res.ok) {
        setStatusMessage(`Bid request sent successfully to ${vendorName}!`);
        if (onRequestSuccess) onRequestSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error('Failed to send bid request');
      }
    } catch {
      setStatusMessage('Error submitting bid request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="request-bid-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm text-white"
    >
      <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white">Request Bid from Vendor</h3>
            <p className="text-xs text-emerald-400 font-semibold">{vendorName} • {serviceType}</p>
          </div>
          <button
            onClick={onClose}
            data-testid="close-request-bid-modal-btn"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Dropdown */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-400" /> Target Project
            </label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
            >
              <option value="proj_demo_1">742 Evergreen Terrace (Acquisition Phase)</option>
              <option value="proj_demo_2">100 Ocean Drive (Purchase Phase)</option>
              <option value="proj_demo_3">Pine Crest Duplex (Hold Phase)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" /> Scope of Work / Service Description
            </label>
            <textarea
              required
              rows={3}
              data-testid="bid-description-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the scope, deliverables, and timeline needed..."
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>

          {/* Budget & Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Max Budget ($)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={e => setBudgetMax(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2500"
                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" /> Completion Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {statusMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="send-bid-request-btn"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Send Bid Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
