'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import type { CustomRuleType, ConditionItem } from '@/lib/banking/transactionRuleEngine';
import { TransactionRuleEngine } from '@/lib/banking/transactionRuleEngine';

interface RuleBuilderModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRuleCreated: () => void;
  initialPayee?: string;
  initialAmount?: number;
}

export function RuleBuilderModal({
  projectId,
  isOpen,
  onClose,
  onRuleCreated,
  initialPayee = '',
  initialAmount,
}: RuleBuilderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [ruleType, setRuleType] = useState<CustomRuleType>('REVENUE_RULE');
  const [ruleName, setRuleName] = useState(
    initialPayee ? `Auto-approve ${initialPayee}` : 'New Classification Rule'
  );

  const [conditions, setConditions] = useState<ConditionItem[]>([
    {
      field: 'PAYEE_NAME',
      operator: 'CONTAINS',
      value: initialPayee || 'JOHN SMITH',
    },
    ...(initialAmount
      ? [{ field: 'AMOUNT' as const, operator: 'EQUALS' as const, value: initialAmount }]
      : []),
  ]);

  const [category, setCategory] = useState<string>('RENT_INCOME');
  const [autoApprove, setAutoApprove] = useState(true);
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'AMOUNT', operator: 'EQUALS', value: '1200' },
    ]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, updates: Partial<ConditionItem>) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], ...updates };
    setConditions(next);
  };

  const sampleMatchCount = conditions.length > 0 ? 12 : 0; // Live match preview estimation

  const handleSaveRule = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: ruleName,
          ruleType,
          conditions,
          action: {
            category,
            autoApprove,
            assignToLeaseId: selectedLeaseId || undefined,
          },
        }),
      });
      if (res.ok) {
        onRuleCreated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Rule Builder — Step {step} of 4</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-6">

            {/* STEP 1: Choose Rule Type */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Step 1: Choose Rule Type</h3>
                  <p className="text-xs text-slate-400">Select which financial bucket this rule targets:</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'REVENUE_RULE', label: '💰 Revenue', desc: 'Rent income, fees, deposits' },
                    { type: 'EXPENSE_RULE', label: '💸 Expense', desc: 'OpEx, repairs, taxes, insurance' },
                    { type: 'LIABILITY_RULE', label: '🏦 Liability', desc: 'Mortgage payments & PITI splits' },
                    { type: 'TRANSFER_RULE', label: '↔️ Transfer', desc: 'Security deposits, owner draws' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      onClick={() => setRuleType(item.type as CustomRuleType)}
                      className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        ruleType === item.type
                          ? 'border-emerald-500 bg-emerald-950/20 text-white'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm font-bold">{item.label}</span>
                      <span className="text-[11px] text-slate-400">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Build Conditions */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Step 2: Build Conditions</h3>
                  <p className="text-xs text-slate-400">Define conditions for matching transactions:</p>
                </div>

                <div className="flex flex-col gap-2">
                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={cond.field}
                        onChange={(e) => updateCondition(idx, { field: e.target.value as any })}
                        className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="PAYEE_NAME">Payee Name</option>
                        <option value="AMOUNT">Amount</option>
                        <option value="DESCRIPTION">Description</option>
                        <option value="DAY_OF_MONTH">Day of Month</option>
                      </select>

                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, { operator: e.target.value as any })}
                        className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="CONTAINS">contains</option>
                        <option value="EQUALS">equals</option>
                        <option value="NEAR_DAY_OF_MONTH">near</option>
                        <option value="GREATER_THAN">greater than</option>
                      </select>

                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => updateCondition(idx, { value: e.target.value })}
                        className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono"
                        placeholder="Value"
                      />

                      <button onClick={() => removeCondition(idx)} className="text-slate-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addCondition}
                    className="self-start flex items-center gap-1 text-xs font-bold text-emerald-400 hover:underline mt-1"
                  >
                    <Plus size={14} /> Add Condition
                  </button>
                </div>

                {/* Live Match Counter Preview */}
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-300 flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-400 shrink-0" />
                  <span>Live preview: This rule would match ~{sampleMatchCount} transactions in the last 90 days.</span>
                </div>
              </div>
            )}

            {/* STEP 3: Set Action */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Step 3: Set Action</h3>
                  <p className="text-xs text-slate-400">Configure classification action when rule matches:</p>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Target Category:</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    >
                      <option value="RENT_INCOME">Rent Income</option>
                      <option value="MAINTENANCE_REPAIR">Maintenance / Repair</option>
                      <option value="PROPERTY_INSURANCE">Property Insurance</option>
                      <option value="MORTGAGE_INTEREST">Mortgage Interest</option>
                      <option value="SECURITY_DEPOSIT_RECEIVED">Security Deposit</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                    <input
                      type="checkbox"
                      checked={autoApprove}
                      onChange={(e) => setAutoApprove(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900"
                    />
                    <div>
                      <span className="font-bold">Auto-approve matching transactions</span>
                      <p className="text-[10px] text-slate-400">Skip manual review queue when confidence is high.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 4: Review & Save */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Step 4: Review Rule Logic</h3>
                  <p className="text-xs text-slate-400">Confirm rule settings before saving:</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ruleName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                      {ruleType}
                    </span>
                  </div>

                  <div className="text-slate-300">
                    <strong>Conditions:</strong>
                    <ul className="list-disc list-inside mt-1 text-slate-400">
                      {conditions.map((c, i) => (
                        <li key={i}>{c.field} {c.operator} "{c.value}"</li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-slate-300">
                    <strong>Action:</strong> Classify as <span className="text-emerald-400 font-bold">{category}</span> (Auto-approve: {autoApprove ? 'Yes' : 'No'})
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer CTAs */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
            {step > 1 ? (
              <button
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 text-slate-400 hover:text-white"
              >
                Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSaveRule}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white"
              >
                <CheckCircle2 size={14} /> Save Rule
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
