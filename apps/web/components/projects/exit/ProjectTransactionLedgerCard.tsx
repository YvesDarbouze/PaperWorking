'use client';

import React, { useState } from 'react';
import type {
  ProjectPlaidLedgerState,
  ProjectTransactionMatchRule,
  ProjectRentPaymentRecord,
  ProjectHoldingCostRecord,
} from '@/lib/projects/types';
import { calculateRentLateness } from './types';
import { formatCurrency } from '@/lib/projects/phase-utils';
import {
  Receipt,
  CheckCircle,
  WarningCircle,
  Clock,
  Plus,
  Funnel,
  ShieldCheck,
  Tag,
  ArrowsLeftRight,
  ArrowsClockwise,
  Sliders,
  Check,
  X,
  Trash,
} from '@/components/icons/PhosphorIcons';

export interface SimulatedPlaidTxn {
  id: string;
  date: string;
  name: string;
  merchantName?: string;
  amount: number; // Positive = credit/deposit, Negative = debit/expense in UI display
  accountMask: string;
  attributionStatus: 'unclaimed' | 'claimed_this_project' | 'claimed_other_project';
  attributedProjectName?: string;
  suggestedCategory?: 'rent' | 'tax' | 'debt_service' | 'insurance' | 'utilities';
  suggestedUnit?: string;
  suggestedTenant?: string;
  confidence: number;
}

export interface ProjectTransactionLedgerCardProps {
  projectId: string;
  projectName?: string;
  ledger: ProjectPlaidLedgerState;
  onUpdateLedger: (updated: ProjectPlaidLedgerState) => void;
  disabled?: boolean;
}

export function ProjectTransactionLedgerCard({
  projectId,
  projectName = 'Current Property',
  ledger,
  onUpdateLedger,
  disabled = false,
}: ProjectTransactionLedgerCardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'rules'>('feed');
  const [filterMode, setFilterMode] = useState<'all' | 'unclaimed' | 'claimed'>('all');
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);

  // Active Plaid Transactions Feed
  const [transactions, setTransactions] = useState<SimulatedPlaidTxn[]>([
    {
      id: 'tx-live-01',
      date: '2026-10-01',
      name: 'ZELLE TRANSFER FROM SARAH JENKINS',
      amount: 2400,
      accountMask: '8492',
      attributionStatus: 'claimed_this_project',
      suggestedCategory: 'rent',
      suggestedUnit: 'Unit A (Upper)',
      suggestedTenant: 'Sarah Jenkins',
      confidence: 0.99,
    },
    {
      id: 'tx-live-02',
      date: '2026-10-02',
      name: 'ACH DEPOSIT - 142 ELM UNIT 3 RENT',
      amount: 1850,
      accountMask: '8492',
      attributionStatus: 'claimed_other_project',
      attributedProjectName: '142 Elm St Fourplex',
      suggestedCategory: 'rent',
      confidence: 0.97,
    },
    {
      id: 'tx-live-03',
      date: '2026-10-03',
      name: 'CHECK #1042 DEPOSIT - UNKNOWN TENANT',
      amount: 2100,
      accountMask: '8492',
      attributionStatus: 'unclaimed',
      suggestedCategory: 'rent',
      confidence: 0.75,
    },
  ]);

  // Form State for Creating New Rule
  const [ruleName, setRuleName] = useState<string>('Auto-Match Deposit');
  const [ruleTarget, setRuleTarget] = useState<ProjectTransactionMatchRule['targetCategory']>('rent_payment');
  const [rulePayerMatch, setRulePayerMatch] = useState<string>('');
  const [ruleAmountMin, setRuleAmountMin] = useState<number>(2000);
  const [ruleAmountMax, setRuleAmountMax] = useState<number>(2500);
  const [ruleAutoApprove, setRuleAutoApprove] = useState<boolean>(true);

  const filteredTxns = transactions.filter((tx) => {
    if (filterMode === 'unclaimed') return tx.attributionStatus === 'unclaimed';
    if (filterMode === 'claimed') return tx.attributionStatus === 'claimed_this_project';
    return true;
  });

  const handleClaimRent = (txn: SimulatedPlaidTxn) => {
    const matchedRoll =
      ledger.rentRoll.find((r) => r.tenantName === txn.suggestedTenant) || ledger.rentRoll[0];
    if (!matchedRoll) return;

    const lateness = calculateRentLateness(
      txn.date,
      `${txn.date.slice(0, 8)}${String(matchedRoll.dueDay).padStart(2, '0')}`,
      matchedRoll.gracePeriodDays,
      matchedRoll.lateFeeAmount,
      txn.amount,
      matchedRoll.monthlyRent
    );

    const newPayment: ProjectRentPaymentRecord = {
      id: `pay-${Date.now()}`,
      rentRollId: matchedRoll.id,
      unitNumber: matchedRoll.unitNumber,
      tenantName: matchedRoll.tenantName,
      amount: txn.amount,
      expectedAmount: matchedRoll.monthlyRent,
      paymentDate: txn.date,
      dueDate: `${txn.date.slice(0, 8)}${String(matchedRoll.dueDay).padStart(2, '0')}`,
      daysLate: lateness.daysLate,
      paymentStatus: lateness.paymentStatus,
      lateFeeAssessed: lateness.lateFeeAssessed,
      lateFeePaid: lateness.lateFeeAssessed > 0,
      plaidTransactionId: txn.id,
      bankAccountMask: txn.accountMask,
      rawPayerName: txn.name,
      matchConfidence: txn.confidence,
      isVerified: true,
      notes: `Claimed from Plaid transaction: ${txn.name}`,
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === txn.id ? { ...t, attributionStatus: 'claimed_this_project' } : t))
    );

    onUpdateLedger({
      ...ledger,
      paymentHistory: [newPayment, ...ledger.paymentHistory],
    });
  };

  const handleClaimHoldingCost = (txn: SimulatedPlaidTxn) => {
    const costCat: ProjectHoldingCostRecord['costCategory'] =
      txn.suggestedCategory === 'debt_service'
        ? 'debt_service'
        : txn.suggestedCategory === 'tax'
        ? 'property_tax'
        : txn.suggestedCategory === 'insurance'
        ? 'insurance'
        : 'utilities';

    const newCost: ProjectHoldingCostRecord = {
      id: `hold-${Date.now()}`,
      costCategory: costCat,
      title: txn.name,
      amount: Math.abs(txn.amount),
      paymentDate: txn.date,
      payeeName: txn.merchantName || txn.name,
      isAnnual: costCat === 'property_tax' || costCat === 'insurance',
      plaidTransactionId: txn.id,
      isVerified: true,
      notes: `Claimed from Plaid debit: ${txn.name}`,
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === txn.id ? { ...t, attributionStatus: 'claimed_this_project' } : t))
    );

    onUpdateLedger({
      ...ledger,
      holdingCostLedger: [newCost, ...ledger.holdingCostLedger],
    });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newRule: ProjectTransactionMatchRule = {
      id: `rule-${Date.now()}`,
      ruleName: ruleName.trim(),
      targetCategory: ruleTarget,
      matchPayerContains: rulePayerMatch.trim() || undefined,
      matchAmountMin: ruleAmountMin,
      matchAmountMax: ruleAmountMax,
      autoApprove: ruleAutoApprove,
      timesMatched: 0,
    };

    onUpdateLedger({
      ...ledger,
      matchingRules: [...ledger.matchingRules, newRule],
    });

    setShowRuleModal(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    onUpdateLedger({
      ...ledger,
      matchingRules: ledger.matchingRules.filter((r) => r.id !== ruleId),
    });
  };

  return (
    <div className="w-full bg-card border border-border rounded-none p-5 sm:p-6 space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-muted border border-border rounded-none text-foreground">
              <Receipt size={20} weight="bold" />
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              Plaid Transaction Feed & Attribution Isolation Guard
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Isolates and attributes incoming bank transactions to this project even when sharing an account with other portfolio properties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex border border-border bg-muted/40 p-0.5 rounded-none">
            <button
              type="button"
              onClick={() => setActiveSubTab('feed')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-none transition-colors ${
                activeSubTab === 'feed'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Transaction Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('rules')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-none transition-colors ${
                activeSubTab === 'rules'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Auto-Match Rules ({ledger.matchingRules.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRuleModal(true)}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none shadow-sm"
          >
            <Plus size={14} weight="bold" />
            New Rule
          </button>
        </div>
      </div>

      {activeSubTab === 'feed' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 text-xs font-medium border rounded-none ${
                  filterMode === 'all'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                All Transactions ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unclaimed')}
                className={`px-2.5 py-1 text-xs font-medium border rounded-none ${
                  filterMode === 'unclaimed'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Unclaimed Inbox ({transactions.filter((t) => t.attributionStatus === 'unclaimed').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('claimed')}
                className={`px-2.5 py-1 text-xs font-medium border rounded-none ${
                  filterMode === 'claimed'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Claimed by This Project ({transactions.filter((t) => t.attributionStatus === 'claimed_this_project').length})
              </button>
            </div>

            <span className="text-xs text-muted-foreground">
              Shared Chase Account ••••8492 (Multi-Project Guard Active)
            </span>
          </div>

          {/* Transaction Feed Items */}
          {filteredTxns.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-none text-center space-y-2">
              <Receipt size={28} className="mx-auto text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No transactions available</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Connect your Plaid bank account above to automatically ingest and reconcile property transactions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTxns.map((tx) => (
              <div
                key={tx.id}
                className={`p-4 border rounded-none transition-colors ${
                  tx.attributionStatus === 'claimed_this_project'
                    ? 'bg-muted/30 border-border'
                    : tx.attributionStatus === 'claimed_other_project'
                    ? 'bg-muted/10 border-border/60 opacity-75'
                    : 'bg-card border-border hover:border-foreground/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {tx.date}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        (Acct ••••{tx.accountMask})
                      </span>

                      {/* Status Badges */}
                      {tx.attributionStatus === 'claimed_this_project' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-muted border border-border text-foreground rounded-none">
                          <CheckCircle size={10} weight="bold" />
                          Claimed by {projectName}
                        </span>
                      )}

                      {tx.attributionStatus === 'claimed_other_project' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-muted/60 border border-border text-muted-foreground rounded-none">
                          <ShieldCheck size={10} />
                          Attributed to {tx.attributedProjectName}
                        </span>
                      )}

                      {tx.attributionStatus === 'unclaimed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-background border border-border text-foreground rounded-none">
                          <Clock size={10} />
                          Unclaimed Transaction
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-foreground">{tx.name}</div>

                    {tx.suggestedCategory && (
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>
                          Suggested Match: <strong className="text-foreground capitalize">{tx.suggestedCategory}</strong>
                          {tx.suggestedUnit ? ` (${tx.suggestedUnit})` : ''}
                        </span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.2 border border-border font-mono">
                          {(tx.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col sm:items-end justify-between items-center gap-2">
                    <div
                      className={`text-base sm:text-lg font-bold font-mono ${
                        tx.amount > 0 ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {tx.amount > 0 ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(Math.abs(tx.amount))}`}
                    </div>

                    {/* Actions */}
                    {tx.attributionStatus === 'unclaimed' && !disabled && (
                      <div className="flex items-center gap-2">
                        {tx.amount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleClaimRent(tx)}
                            className="px-3 py-1 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none hover:bg-primary/90"
                          >
                            Claim as Rent
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleClaimHoldingCost(tx)}
                            className="px-3 py-1 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none hover:bg-primary/90"
                          >
                            Claim Holding Cost
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Configured Smart Matching Rules ({ledger.matchingRules.length})
            </h4>
            <span className="text-xs text-muted-foreground">
              Applied automatically during daily Plaid /transactions/sync
            </span>
          </div>

          <div className="space-y-2.5">
            {ledger.matchingRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 border border-border bg-muted/20 rounded-none flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{rule.ruleName}</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-muted border border-border uppercase font-mono text-muted-foreground">
                      {rule.targetCategory.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Match filter: {rule.matchPayerContains ? `Payer contains "${rule.matchPayerContains}"` : ''}
                    {rule.matchMerchantContains ? `Merchant contains "${rule.matchMerchantContains}"` : ''}
                    {rule.matchAmountMin ? ` · Amount between ${formatCurrency(rule.matchAmountMin)} - ${formatCurrency(rule.matchAmountMax || 0)}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono">
                    {rule.timesMatched} matches
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={disabled}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors min-h-[44px] flex items-center justify-center"
                    aria-label="Delete rule"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Matching Rule */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRule}
            className="w-full max-w-md bg-card border border-border rounded-none p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-base font-semibold text-foreground">
                Create Plaid Auto-Match Rule
              </h4>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Rule Name</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  required
                  placeholder="e.g. Match Unit A Tenant Rent"
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Target Category</label>
                <select
                  value={ruleTarget}
                  onChange={(e) => setRuleTarget(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none text-foreground"
                >
                  <option value="rent_payment">Tenant Rent / Lease Payment</option>
                  <option value="property_tax">Annual Property Tax</option>
                  <option value="debt_service">Mortgage Debt Service (ACH)</option>
                  <option value="insurance">Insurance Premium</option>
                  <option value="utilities">Municipal Utilities</option>
                  <option value="maintenance">Repairs & Maintenance</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Payer / Memo Keyword</label>
                <input
                  type="text"
                  value={rulePayerMatch}
                  onChange={(e) => setRulePayerMatch(e.target.value)}
                  placeholder="e.g. Jenkins or CoreVest"
                  className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Min Amount ($)</label>
                  <input
                    type="number"
                    value={ruleAmountMin}
                    onChange={(e) => setRuleAmountMin(Number(e.target.value))}
                    required
                    className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Max Amount ($)</label>
                  <input
                    type="number"
                    value={ruleAmountMax}
                    onChange={(e) => setRuleAmountMax(Number(e.target.value))}
                    required
                    className="w-full min-h-[44px] px-3 text-sm bg-background border border-border rounded-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground text-xs font-medium rounded-none border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 min-h-[44px] bg-primary text-primary-foreground text-xs font-medium rounded-none"
              >
                Save Matching Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
