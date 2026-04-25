'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, Shield, Send, CheckCircle2, ChevronDown, Lock } from 'lucide-react';
import { Project, VendorProfile } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';

interface RequestQuoteModalProps {
  vendor: VendorProfile;
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestQuoteModal({ vendor, isOpen, onClose }: RequestQuoteModalProps) {
  const { projects } = useProjectStore();
  const [selectedDealId, setSelectedDealId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shareFolders, setShareFolders] = useState({
    acquisition: true,
    financials: false,
    permits: false
  });

  const selectedDeal = projects.find(d => d.id === selectedDealId);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-pw-black/80 backdrop-blur-sm"
      />
      
      <div className="relative w-full max-w-xl bg-bg-surface border border-border-accent shadow-2xl overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-1 hover:bg-pw-dashboard transition-colors z-10"
        >
          <X className="w-6 h-6 text-text-secondary" />
        </button>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <div className="p-16">
              <header className="mb-12">
                <p className="text-xs font-black uppercase tracking-[0.4em] text-text-secondary mb-3">Procurement Request</p>
                <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase mb-1">Transmit Briefing</h2>
                <p className="text-xs font-black text-text-secondary uppercase tracking-widest">Entity: {vendor.companyName}</p>
              </header>

              <div className="space-y-10">
                {/* Deal Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-text-secondary mb-4">Target Portfolio Asset</label>
                  <div className="relative">
                    <select 
                      className="w-full px-6 py-4 bg-pw-dashboard border border-border-accent rounded-none text-xs font-bold uppercase tracking-widest appearance-none focus:outline-none focus:border-pw-black transition-all cursor-pointer"
                      value={selectedDealId}
                      onChange={(e) => setSelectedDealId(e.target.value)}
                    >
                      <option value="">SELECT SOURCE PROPERTY...</option>
                      {projects.map(deal => (
                        <option key={deal.id} value={deal.id}>{deal.propertyName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                  </div>
                </div>

                {/* Secure Sharing Context */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Lock className="w-4 h-4 text-text-primary" />
                    <h3 className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">Restricted Document Provisioning</h3>
                  </div>
                  <div className="border border-border-accent divide-y divide-pw-border bg-pw-dashboard">
                    <FolderCheckbox 
                      label="Acquisition & Title" 
                      description="Purchase terms and preliminary title commitment."
                      checked={shareFolders.acquisition} 
                      onChange={() => setShareFolders({...shareFolders, acquisition: !shareFolders.acquisition})}
                    />
                    <FolderCheckbox 
                      label="Asset Financials" 
                      description="Operating ledger and tax projections."
                      checked={shareFolders.financials} 
                      onChange={() => setShareFolders({...shareFolders, financials: !shareFolders.financials})}
                    />
                    <FolderCheckbox 
                      label="Technical Filings" 
                      description="Environmental reports and city permits."
                      checked={shareFolders.permits} 
                      onChange={() => setShareFolders({...shareFolders, permits: !shareFolders.permits})}
                    />
                  </div>
                </div>

                <div className="p-6 bg-pw-black text-white flex items-start gap-6">
                  <Shield className="w-5 h-5 shrink-0 opacity-50" />
                  <p className="text-xs font-bold text-white/70 leading-relaxed uppercase tracking-widest">
                    Security protocol: Investor pledges and sensitive cap-table data remain isolated. Only specified folders are exposed.
                  </p>
                </div>

                <button 
                  disabled={!selectedDealId || isSubmitting}
                  onClick={handleSubmit}
                  className="w-full py-5 bg-pw-black text-white rounded-none font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-fg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Transmitting Data...' : 'Dispatch Request'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-24 text-center">
              <div className="w-20 h-20 border-4 border-pw-black flex items-center justify-center mx-auto mb-10">
                <CheckCircle2 className="w-10 h-10 text-text-primary" />
              </div>
              <h3 className="text-3xl font-black text-text-primary mb-4 uppercase tracking-tighter">Transmission Confirmed</h3>
              <p className="text-xs text-text-secondary font-bold max-w-[300px] mx-auto leading-relaxed uppercase tracking-widest mb-12">
                {vendor.companyName} has been authorized to access the requested data rooms for audit and proposal drafting.
              </p>
              <button 
                onClick={onClose}
                className="px-12 py-5 border border-pw-black text-text-primary font-black text-xs uppercase tracking-[0.3em] hover:bg-pw-black hover:text-white transition-all"
              >
                Close Connection
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FolderCheckbox({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: () => void }) {
  return (
    <button 
      onClick={onChange}
      className={`w-full text-left p-6 transition-all flex items-start gap-6 ${
        checked ? 'bg-bg-surface' : 'bg-pw-dashboard/50 hover:bg-pw-dashboard'
      }`}
    >
      <div className={`mt-0.5 w-4 h-4 border flex items-center justify-center transition-all ${
        checked ? 'bg-pw-black border-pw-black' : 'bg-bg-surface border-border-accent'
      }`}>
        {checked && <div className="w-1.5 h-1.5 bg-bg-surface" />}
      </div>
      <div>
        <p className={`text-xs font-black uppercase tracking-widest ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>{label}</p>
        <p className="text-xs font-bold text-text-secondary mt-1 uppercase tracking-tight">{description}</p>
      </div>
    </button>
  );
}
