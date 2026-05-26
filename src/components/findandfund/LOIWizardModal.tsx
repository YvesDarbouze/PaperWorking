'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, FileText, Eye, Send, DollarSign, Calendar, Building2, CheckCircle2 } from 'lucide-react';
import type { LOIStatus } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   LOIWizardModal — 3-Step Letter of Intent Generator

   Step 1: Variables (fill-in-the-blank inputs)
   Step 2: Preview (letterhead-style formatted LOI)
   Step 3: Dispatch (send for digital signature)
   ═══════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  investorName: string;
  investorEmail: string;
  dealName: string;
  propertyAddress: string;
  onDispatch: (data: {
    legalEntityName: string;
    investmentAmount: number;
    termLengthMonths: number;
    equitySplitPercent: number;
    interestRatePercent: number;
  }) => void;
}

type WizardStep = 1 | 2 | 3;

export default function LOIWizardModal({
  isOpen,
  onClose,
  investorName,
  investorEmail,
  dealName,
  propertyAddress,
  onDispatch,
}: Props) {
  const [step, setStep] = useState<WizardStep>(1);
  const [legalEntity, setLegalEntity] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [termLength, setTermLength] = useState('12');
  const [equitySplit, setEquitySplit] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [dispatched, setDispatched] = useState(false);

  if (!isOpen) return null;

  const canProceedStep1 = legalEntity.trim() && investmentAmount && equitySplit;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDispatch = () => {
    onDispatch({
      legalEntityName: legalEntity.trim(),
      investmentAmount: parseFloat(investmentAmount) || 0,
      termLengthMonths: parseInt(termLength) || 12,
      equitySplitPercent: parseFloat(equitySplit) || 0,
      interestRatePercent: parseFloat(interestRate) || 0,
    });
    setDispatched(true);
  };

  const handleClose = () => {
    setStep(1);
    setDispatched(false);
    onClose();
  };

  const stepLabels = ['Variables', 'Preview', 'Dispatch'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-md">
      <div className="bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-pw-border flex items-center justify-between shrink-0 text-pw-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/30 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Letter of Intent</h2>
              <p className="text-xs text-pw-muted">
                {investorName} · {dealName}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-pw-glass-bg/25 rounded-full transition text-pw-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-pw-glass-bg/50 border-b border-pw-border shrink-0">
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => {
              const stepNum = (i + 1) as WizardStep;
              const isActive = step === stepNum;
              const isComplete = step > stepNum || dispatched;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <div className={`flex-1 h-px ${isComplete ? 'bg-teal-500/50' : 'bg-pw-border'}`} />}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isComplete
                          ? 'bg-teal-600 text-white'
                          : isActive
                            ? 'bg-teal-500/10 text-teal-500 ring-1 ring-teal-500/30'
                            : 'bg-pw-glass-bg/50 text-pw-muted'
                      }`}
                    >
                      {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-pw-black' : 'text-pw-muted'}`}>
                      {label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Variables */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Legal Entity Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted" />
                  <input
                    type="text"
                    value={legalEntity}
                    onChange={(e) => setLegalEntity(e.target.value)}
                    placeholder="e.g. Sunrise Capital Holdings LLC"
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Investment Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted" />
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      placeholder="100,000"
                      className="glass-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm focus:outline-none transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Term Length (Months)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pw-muted" />
                    <input
                      type="number"
                      value={termLength}
                      onChange={(e) => setTermLength(e.target.value)}
                      placeholder="12"
                      className="glass-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Equity Split (%)</label>
                  <input
                    type="number"
                    value={equitySplit}
                    onChange={(e) => setEquitySplit(e.target.value)}
                    placeholder="25"
                    min="0"
                    max="100"
                    className="glass-input w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1.5">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="8"
                    step="0.5"
                    className="glass-input w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="bg-pw-glass-bg/50 border border-pw-border rounded-2xl p-8 shadow-sm text-pw-black">
              {/* Letterhead */}
              <div className="border-b border-pw-border pb-4 mb-6">
                <h3 className="text-lg font-bold tracking-tight">LETTER OF INTENT</h3>
                <p className="text-xs text-pw-muted mt-1">{formattedDate}</p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  <strong>To:</strong> {investorName} ({investorEmail})
                </p>
                <p>
                  <strong>Re:</strong> Investment Opportunity — {dealName}
                </p>
                <p>
                  <strong>Property:</strong> {propertyAddress}
                </p>

                <div className="h-px bg-pw-border my-4" />

                <p>Dear {investorName},</p>

                <p>
                  This Letter of Intent (&ldquo;LOI&rdquo;) outlines the proposed terms for your participation
                  in the investment of the above-referenced property through <strong>{legalEntity || '[Legal Entity]'}</strong>.
                </p>

                <div className="bg-pw-glass-bg/30 border border-pw-border/50 rounded-2xl p-4 space-y-2 my-4">
                  <div className="flex justify-between">
                    <span className="text-pw-muted">Investment Amount:</span>
                    <span className="font-semibold">${parseFloat(investmentAmount || '0').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pw-muted">Term Length:</span>
                    <span className="font-semibold">{termLength} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pw-muted">Equity Split:</span>
                    <span className="font-semibold">{equitySplit || '—'}%</span>
                  </div>
                  {interestRate && (
                    <div className="flex justify-between">
                      <span className="text-pw-muted">Annual Interest Rate:</span>
                      <span className="font-semibold">{interestRate}%</span>
                    </div>
                  )}
                </div>

                <p>
                  This LOI is non-binding and is subject to the execution of a definitive agreement.
                  Upon your acceptance, a formal subscription agreement will be prepared for execution.
                </p>

                <p className="text-pw-muted text-xs mt-6">
                  Generated via PaperWorking · {formattedDate}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Dispatch */}
          {step === 3 && !dispatched && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-teal-500" />
              </div>
              <h3 className="text-lg font-semibold text-pw-black mb-2">Ready to Send</h3>
              <p className="text-sm text-pw-muted mb-6 max-w-sm mx-auto">
                This LOI will be sent to <strong>{investorEmail}</strong> for digital review and signature via the Guest Portal.
              </p>

              <div className="bg-pw-glass-bg/50 border border-pw-border rounded-2xl p-4 text-left space-y-2 mb-6 max-w-sm mx-auto text-pw-black">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>LOI document generated</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Guest portal link will be created</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Email notification will be sent</span>
                </div>
              </div>

              <button
                onClick={handleDispatch}
                className="pw-btn pw-btn--primary pw-btn--pill inline-flex items-center gap-2 px-8 py-3.5 text-sm font-medium transition shadow-lg shadow-teal-600/20"
              >
                <Send className="w-4 h-4" />
                Send for Digital Signature
              </button>
            </div>
          )}

          {/* Step 3: Dispatched Confirmation */}
          {step === 3 && dispatched && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-pw-black mb-2">LOI Dispatched!</h3>
              <p className="text-sm text-pw-muted mb-6 max-w-sm mx-auto">
                {investorName} will receive an email with a secure link to review the terms and digitally sign.
              </p>
              <button
                onClick={handleClose}
                className="pw-btn pw-btn--primary pw-btn--pill px-6 py-2.5 text-sm font-medium transition"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!dispatched && (
          <div className="px-6 py-4 border-t border-pw-border flex items-center justify-between shrink-0">
            <button
              onClick={() => step > 1 && setStep((step - 1) as WizardStep)}
              disabled={step === 1}
              className="pw-btn pw-btn--ghost pw-btn--pill inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            {step < 3 && (
              <button
                onClick={() => setStep((step + 1) as WizardStep)}
                disabled={step === 1 && !canProceedStep1}
                className="pw-btn pw-btn--primary pw-btn--pill inline-flex items-center gap-1.5 px-5 py-2.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition text-pw-white"
              >
                {step === 1 ? 'Preview LOI' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
