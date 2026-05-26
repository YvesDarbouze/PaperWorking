'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Tag, Building2, DollarSign, Users, MapPin, CheckCircle2, ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';

/* ═══════════════════════════════════════════════════════════════
   PostDealModal — Quick-action modal for posting a deal to the
   Marketplace. Allows selecting a project, setting ask price,
   choosing partnership type, and navigating to the marketplace
   to complete the listing.
   ═══════════════════════════════════════════════════════════════ */

interface PostDealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PartnerType = 'equity' | 'debt' | 'jv' | 'wholesale';

const PARTNER_OPTIONS: { id: PartnerType; label: string; desc: string }[] = [
  { id: 'equity',    label: 'Equity Partner',      desc: 'Share ownership and profits' },
  { id: 'debt',      label: 'Debt Financing',       desc: 'Private lender or hard money' },
  { id: 'jv',        label: 'Joint Venture',         desc: 'Co-manage the deal' },
  { id: 'wholesale', label: 'Wholesale / Assign',   desc: 'Assign the contract to a buyer' },
];

export default function PostDealModal({ isOpen, onClose }: PostDealModalProps) {
  const router   = useRouter();
  const projects = useProjectStore((s) => s.projects);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [askPrice,          setAskPrice]           = useState('');
  const [partnerType,       setPartnerType]         = useState<PartnerType>('equity');
  const [description,       setDescription]         = useState('');
  const [step,              setStep]                = useState<1 | 2>(1);

  if (!isOpen) return null;

  const activeProjects = projects.filter((p) =>
    p.phase === 'acquisition' || p.phase === 'hold' || p.phase === 'rehab'
  );
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleNext = () => {
    if (!selectedProjectId) return;
    setStep(2);
  };

  const handlePost = () => {
    router.push('/dashboard/marketplace?action=post&project=' + selectedProjectId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'rgba(18,26,33,0.97)', backdropFilter: 'blur(24px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
              <Tag className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Post a Deal</h2>
              <p className="text-[10px] text-slate-500">Step {step} of 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {step === 1 ? (
            <>
              {/* Select project */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Select Property</p>
                {activeProjects.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selectedProjectId === p.id
                            ? 'border-teal-500/50 bg-teal-500/5'
                            : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{p.name ?? 'Unnamed Property'}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {p.address ?? 'Address not set'}
                          </p>
                        </div>
                        {selectedProjectId === p.id && (
                          <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                    <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" strokeWidth={1} />
                    <p className="text-xs text-slate-500">No active deals available to post.</p>
                    <button
                      onClick={() => { onClose(); router.push('/dashboard/projects/new'); }}
                      className="mt-3 text-xs font-semibold text-teal-400 hover:underline"
                    >
                      Create a deal first →
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected project summary */}
              {selectedProject && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20">
                  <Building2 className="w-4 h-4 text-teal-400 flex-shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{selectedProject.name}</p>
                    <p className="text-[10px] text-slate-500">{selectedProject.address}</p>
                  </div>
                </div>
              )}

              {/* Ask price */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">
                  Asking Price / Investment Target
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. 75,000"
                    value={askPrice}
                    onChange={(e) => setAskPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Partnership type */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">
                  Partnership Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PARTNER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPartnerType(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        partnerType === opt.id
                          ? 'border-teal-500/50 bg-teal-500/5'
                          : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]'
                      }`}
                    >
                      <p className={`text-xs font-bold mb-0.5 ${partnerType === opt.id ? 'text-teal-400' : 'text-slate-300'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">
                  Deal Summary <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the opportunity, strategy, and expected returns…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedProjectId && activeProjects.length > 0}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-teal-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePost}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-teal-400 transition-colors"
            >
              <Users className="w-4 h-4" />
              Post to Marketplace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
