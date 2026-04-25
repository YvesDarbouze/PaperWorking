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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface max-w-2xl w-full mx-4 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border-accent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Letter of Intent</h2>
              <p className="text-xs text-text-secondary">
                {investorName} · {dealName}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-bg-primary transition">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-bg-primary border-b border-border-accent shrink-0">
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => {
              const stepNum = (i + 1) as WizardStep;
              const isActive = step === stepNum;
              const isComplete = step > stepNum || dispatched;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <div className={`flex-1 h-px ${isComplete ? 'bg-teal-400' : 'bg-gray-200'}`} />}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isComplete
                          ? 'bg-teal-600 text-white'
                          : isActive
                            ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-400'
                            : 'bg-bg-primary text-text-secondary'
                      }`}
                    >
                      {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
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
                <label className="ag-label mb-1.5 block">Legal Entity Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    value={legalEntity}
                    onChange={(e) => setLegalEntity(e.target.value)}
                    placeholder="e.g. Sunrise Capital Holdings LLC"
                    className="w-full pl-10 pr-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="ag-label mb-1.5 block">Investment Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      placeholder="100,000"
                      className="w-full pl-10 pr-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="ag-label mb-1.5 block">Term Length (Months)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="number"
                      value={termLength}
                      onChange={(e) => setTermLength(e.target.value)}
                      placeholder="12"
                      className="w-full pl-10 pr-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="ag-label mb-1.5 block">Equity Split (%)</label>
                  <input
                    type="number"
                    value={equitySplit}
                    onChange={(e) => setEquitySplit(e.target.value)}
                    placeholder="25"
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>
                <div>
                  <label className="ag-label mb-1.5 block">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="8"
                    step="0.5"
                    className="w-full px-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="bg-bg-surface border border-border-accent rounded-xl p-8 shadow-sm">
              {/* Letterhead */}
              <div className="border-b-2 border-gray-900 pb-4 mb-6">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">LETTER OF INTENT</h3>
                <p className="text-xs text-text-secondary mt-1">{formattedDate}</p>
              </div>

              <div className="space-y-4 text-sm text-text-primary leading-relaxed">
                <p>
                  <strong>To:</strong> {investorName} ({investorEmail})
                </p>
                <p>
                  <strong>Re:</strong> Investment Opportunity — {dealName}
                </p>
                <p>
                  <strong>Property:</strong> {propertyAddress}
                </p>

                <div className="h-px bg-bg-primary my-4" />

                <p>Dear {investorName},</p>

                <p>
                  This Letter of Intent (&ldquo;LOI&rdquo;) outlines the proposed terms for your participation
                  in the investment of the above-referenced property through <strong>{legalEntity || '[Legal Entity]'}</strong>.
                </p>

                <div className="bg-bg-primary rounded-xl p-4 space-y-2 my-4">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Investment Amount:</span>
                    <span className="font-semibold">${parseFloat(investmentAmount || '0').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Term Length:</span>
                    <span className="font-semibold">{termLength} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Equity Split:</span>
                    <span className="font-semibold">{equitySplit || '—'}%</span>
                  </div>
                  {interestRate && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Annual Interest Rate:</span>
                      <span className="font-semibold">{interestRate}%</span>
                    </div>
                  )}
                </div>

                <p>
                  This LOI is non-binding and is subject to the execution of a definitive agreement.
                  Upon your acceptance, a formal subscription agreement will be prepared for execution.
                </p>

                <p className="text-text-secondary text-xs mt-6">
                  Generated via PaperWorking · {formattedDate}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Dispatch */}
          {step === 3 && !dispatched && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Ready to Send</h3>
              <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                This LOI will be sent to <strong>{investorEmail}</strong> for digital review and signature via the Guest Portal.
              </p>

              <div className="bg-bg-primary rounded-xl p-4 text-left space-y-2 mb-6 max-w-sm mx-auto">
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
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition shadow-lg shadow-teal-600/20"
              >
                <Send className="w-4 h-4" />
                Send for Digital Signature
              </button>
            </div>
          )}

          {/* Step 3: Dispatched Confirmation */}
          {step === 3 && dispatched && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">LOI Dispatched!</h3>
              <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                {investorName} will receive an email with a secure link to review the terms and digitally sign.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!dispatched && (
          <div className="px-6 py-4 border-t border-border-accent flex items-center justify-between shrink-0">
            <button
              onClick={() => step > 1 && setStep((step - 1) as WizardStep)}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            {step < 3 && (
              <button
                onClick={() => setStep((step + 1) as WizardStep)}
                disabled={step === 1 && !canProceedStep1}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-text-secondary disabled:cursor-not-allowed transition"
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
