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
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
      />
      
      <div className="relative w-full max-w-xl bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-8 h-8 flex items-center justify-center rounded-full transition-colors text-pw-black hover:bg-pw-glass-bg/25 z-10"
        >
          <X className="w-6 h-6 text-pw-black" />
        </button>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <div className="p-12">
              <header className="mb-8">
                <p className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-3">Procurement Request</p>
                <h2 className="text-3xl font-bold tracking-tight text-pw-black mb-1 uppercase">Transmit Briefing</h2>
                <p className="text-[10px] font-black text-pw-muted uppercase tracking-[0.3em]">Entity: {vendor.companyName}</p>
              </header>

              <div className="space-y-8">
                {/* Deal Selection */}
                <div>
                  <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-3">Target Portfolio Asset</label>
                  <div className="relative">
                    <select 
                      className="glass-input w-full px-6 py-4 text-xs font-bold rounded-2xl focus:outline-none transition-colors appearance-none cursor-pointer text-pw-black"
                      value={selectedDealId}
                      onChange={(e) => setSelectedDealId(e.target.value)}
                    >
                      <option value="">SELECT SOURCE PROPERTY...</option>
                      {projects.map(deal => (
                        <option key={deal.id} value={deal.id}>{deal.propertyName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted pointer-events-none" />
                  </div>
                </div>

                {/* Secure Sharing Context */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="w-4 h-4 text-pw-black" />
                    <h3 className="text-[10px] font-black text-pw-black uppercase tracking-[0.2em]">Restricted Document Provisioning</h3>
                  </div>
                  <div className="border border-pw-border divide-y divide-pw-border bg-pw-glass-bg/50 rounded-2xl overflow-hidden">
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

                <div className="p-6 bg-pw-black text-pw-white flex items-start gap-6 rounded-2xl shadow-inner border border-white/10">
                  <Shield className="w-5 h-5 shrink-0 opacity-50" />
                  <p className="text-[10px] font-bold text-pw-white/70 leading-relaxed uppercase tracking-[0.2em]">
                    Security protocol: Investor pledges and sensitive cap-table data remain isolated. Only specified folders are exposed.
                  </p>
                </div>

                <button 
                  disabled={!selectedDealId || isSubmitting}
                  onClick={handleSubmit}
                  className="pw-btn pw-btn--primary pw-btn--pill w-full py-4 text-pw-white font-black text-xs uppercase tracking-[0.3em] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Transmitting Data...' : 'Dispatch Request'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="w-20 h-20 rounded-full border-4 border-pw-border flex items-center justify-center mx-auto mb-10 bg-pw-glass-bg">
                <CheckCircle2 className="w-10 h-10 text-pw-black" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight text-pw-black mb-4 uppercase">Transmission Confirmed</h3>
              <p className="text-xs text-pw-muted font-bold max-w-[300px] mx-auto leading-relaxed uppercase tracking-widest mb-12">
                {vendor.companyName} has been authorized to access the requested data rooms for audit and proposal drafting.
              </p>
              <button 
                onClick={onClose}
                className="pw-btn pw-btn--primary pw-btn--pill px-12 py-4 text-pw-white font-black text-xs uppercase tracking-[0.3em] transition-colors"
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
        checked ? 'bg-pw-glass-bg/90' : 'bg-pw-glass-bg/30 hover:bg-pw-glass-bg/60'
      }`}
    >
      <div className={`mt-0.5 w-4 h-4 border rounded flex items-center justify-center transition-all ${
        checked ? 'bg-pw-black border-pw-border' : 'bg-pw-glass-bg/50 border-pw-border'
      }`}>
        {checked && <div className="w-1.5 h-1.5 bg-pw-white" />}
      </div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest ${checked ? 'text-pw-black' : 'text-pw-muted'}`}>{label}</p>
        <p className="text-xs font-medium text-pw-muted mt-1 tracking-tight">{description}</p>
      </div>
    </button>
  );
}
