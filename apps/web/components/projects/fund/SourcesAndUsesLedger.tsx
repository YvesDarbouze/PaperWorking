'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type {
  ProjectFundingTerms,
  SourcesAndUsesStatement,
  SourcesAndUsesLineItem,
} from '@/lib/projects/types';
import { formatCurrency } from '@/lib/projects/phase-utils';
import { cn } from '@/lib/utils';
import {
  CurrencyDollar,
  CheckCircle,
  WarningCircle,
  Plus,
  X,
  ArrowsClockwise,
} from '@/components/icons/PhosphorIcons';

export interface SourcesAndUsesLedgerProps {
  funding: ProjectFundingTerms;
  purchasePrice: number;
  totalCostBasis: number;
  onUpdateFunding: (updated: ProjectFundingTerms) => void;
  className?: string;
}

export function SourcesAndUsesLedger({
  funding,
  purchasePrice,
  totalCostBasis,
  onUpdateFunding,
  className = '',
}: SourcesAndUsesLedgerProps) {
  // Canonical default line items if none provided
  const defaultSources: SourcesAndUsesLineItem[] = useMemo(() => {
    const loan = Number(funding.loanAmount) || Math.round(purchasePrice * 0.75);
    const pref = Number(funding.capitalStack?.preferredEquity) || 0;
    const lp = Number(funding.capitalStack?.investorEquity) || Math.round((purchasePrice - loan) * 0.6);
    const gp = Number(funding.capitalStack?.leadEquity) || Math.max(0, totalCostBasis - loan - pref - lp);

    return [
      { id: 'src-1', name: 'Senior Debt Facility', category: 'debt', amount: loan },
      { id: 'src-2', name: 'Preferred Equity', category: 'equity', amount: pref },
      { id: 'src-3', name: 'LP / Investor Equity', category: 'equity', amount: lp },
      { id: 'src-4', name: 'Lead GP Equity (Cash to Close)', category: 'equity', amount: gp },
    ];
  }, [funding.loanAmount, funding.capitalStack, purchasePrice, totalCostBasis]);

  const defaultUses: SourcesAndUsesLineItem[] = useMemo(() => {
    const closingCosts = Number(funding.closingCosts) || Math.round(purchasePrice * 0.02);
    const rehab = Math.max(0, totalCostBasis - purchasePrice - closingCosts);

    return [
      { id: 'use-1', name: 'Contract Purchase Price', category: 'acquisition', amount: purchasePrice },
      { id: 'use-2', name: 'Rehab Escrow / Capex Holdback', category: 'rehab', amount: rehab },
      { id: 'use-3', name: 'Title, Legal & Escrow Closing Fees', category: 'closing', amount: closingCosts },
      { id: 'use-4', name: 'Lender Origination & Processing Points', category: 'financing', amount: Math.round(purchasePrice * 0.01) },
      { id: 'use-5', name: 'Working Capital & Operating Reserves', category: 'reserves', amount: 5000 },
    ];
  }, [purchasePrice, totalCostBasis, funding.closingCosts]);

  // Local state initialized from funding.sourcesAndUses or calculated defaults
  const [sources, setSources] = useState<SourcesAndUsesLineItem[]>(() => {
    return funding.sourcesAndUses?.sources || defaultSources;
  });

  const [uses, setUses] = useState<SourcesAndUsesLineItem[]>(() => {
    return funding.sourcesAndUses?.uses || defaultUses;
  });

  // Calculate totals and variance
  const totalSources = useMemo(() => {
    return sources.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [sources]);

  const totalUses = useMemo(() => {
    return uses.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [uses]);

  const variance = totalSources - totalUses;
  const isBalanced = variance === 0;

  // New item modal/inline form state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceAmount, setNewSourceAmount] = useState('');
  const [newUseName, setNewUseName] = useState('');
  const [newUseAmount, setNewUseAmount] = useState('');

  // Persist statement back to parent whenever sources or uses change
  const persistStatement = (updatedSources: SourcesAndUsesLineItem[], updatedUses: SourcesAndUsesLineItem[]) => {
    const sTotal = updatedSources.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const uTotal = updatedUses.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const statement: SourcesAndUsesStatement = {
      sources: updatedSources,
      uses: updatedUses,
      totalSources: sTotal,
      totalUses: uTotal,
      variance: sTotal - uTotal,
      isBalanced: sTotal - uTotal === 0,
    };

    onUpdateFunding({
      ...funding,
      sourcesAndUses: statement,
    });
  };

  const handleSourceAmountChange = (id: string, amount: number) => {
    const updated = sources.map((s) => (s.id === id ? { ...s, amount } : s));
    setSources(updated);
    persistStatement(updated, uses);
  };

  const handleUseAmountChange = (id: string, amount: number) => {
    const updated = uses.map((u) => (u.id === id ? { ...u, amount } : u));
    setUses(updated);
    persistStatement(sources, updated);
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceAmount) return;
    const item: SourcesAndUsesLineItem = {
      id: `src-${Date.now()}`,
      name: newSourceName.trim(),
      category: 'equity',
      amount: Number(newSourceAmount) || 0,
      isCustom: true,
    };
    const updated = [...sources, item];
    setSources(updated);
    persistStatement(updated, uses);
    setNewSourceName('');
    setNewSourceAmount('');
  };

  const handleAddUse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUseName.trim() || !newUseAmount) return;
    const item: SourcesAndUsesLineItem = {
      id: `use-${Date.now()}`,
      name: newUseName.trim(),
      category: 'other',
      amount: Number(newUseAmount) || 0,
      isCustom: true,
    };
    const updated = [...uses, item];
    setUses(updated);
    persistStatement(sources, updated);
    setNewUseName('');
    setNewUseAmount('');
  };

  const handleRemoveSource = (id: string) => {
    const updated = sources.filter((s) => s.id !== id);
    setSources(updated);
    persistStatement(updated, uses);
  };

  const handleRemoveUse = (id: string) => {
    const updated = uses.filter((u) => u.id !== id);
    setUses(updated);
    persistStatement(sources, updated);
  };

  // Institutional Plug: Automatically balance Lead GP Equity to eliminate variance
  const handleAutoBalance = () => {
    const nonGpSources = sources
      .filter((s) => !s.name.toLowerCase().includes('lead gp') && !s.name.toLowerCase().includes('cash to close'))
      .reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

    const neededGpEquity = Math.max(0, totalUses - nonGpSources);

    const updatedSources = sources.map((s) => {
      if (s.name.toLowerCase().includes('lead gp') || s.name.toLowerCase().includes('cash to close')) {
        return { ...s, amount: neededGpEquity };
      }
      return s;
    });

    setSources(updatedSources);
    persistStatement(updatedSources, uses);
  };

  return (
    <div
      data-testid="sources-and-uses-ledger"
      className={cn('w-full border border-neutral-800 bg-neutral-950 p-4 sm:p-5 rounded-none space-y-4', className)}
    >
      {/* Header and Live Variance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-none bg-emerald-500/20 text-emerald-400">
              <CurrencyDollar className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Sources & Uses of Funds Ledger
            </h3>
            <span
              data-testid="sources-uses-balance-badge"
              className={cn(
                'rounded-none px-2 py-0.5 text-[10px] font-mono font-bold uppercase border',
                isBalanced
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              )}
            >
              {isBalanced ? 'Balanced ($0 Variance)' : `Variance: ${formatCurrency(variance)}`}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Balanced double-entry financial schedule required by senior lenders, equity syndicators, and title escrow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isBalanced && (
            <button
              type="button"
              onClick={handleAutoBalance}
              data-testid="auto-balance-gp-btn"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              <ArrowsClockwise className="h-3.5 w-3.5" />
              <span>Auto-Balance GP Equity</span>
            </button>
          )}
        </div>
      </div>

      {/* Two-Column Grid: Sources on Left, Uses on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: SOURCES */}
        <div className="space-y-3 border border-neutral-800 bg-neutral-900/30 p-3 sm:p-4 rounded-none">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Sources of Capital
            </span>
            <span className="text-xs font-mono font-bold text-white" data-testid="total-sources-amount">
              Total: {formatCurrency(totalSources)}
            </span>
          </div>

          <div className="space-y-2">
            {sources.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 bg-neutral-950/60 border border-neutral-800 rounded-none text-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-white font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-neutral-400 capitalize">{item.category}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-neutral-500 text-xs">$</span>
                  <input
                    type="number"
                    value={item.amount || ''}
                    aria-label={`Amount for ${item.name}`}
                    onChange={(e) => handleSourceAmountChange(item.id, Number(e.target.value) || 0)}
                    className="w-28 min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-2 py-1 text-right text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                  />
                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(item.id)}
                      className="min-h-[44px] px-1 text-neutral-400 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Add Custom Source */}
          <form onSubmit={handleAddSource} className="pt-2 border-t border-neutral-800/80 flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Add custom source..."
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="flex-1 min-w-0 min-h-[44px] rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="$ Amount"
              value={newSourceAmount}
              onChange={(e) => setNewSourceAmount(e.target.value)}
              className="w-24 min-h-[44px] rounded-none border border-neutral-800 bg-neutral-900 px-2 py-1 text-right text-xs font-mono text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newSourceName.trim() || !newSourceAmount}
              className="min-h-[44px] px-3 rounded-none bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Right Column: USES */}
        <div className="space-y-3 border border-neutral-800 bg-neutral-900/30 p-3 sm:p-4 rounded-none">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Uses of Funds
            </span>
            <span className="text-xs font-mono font-bold text-white" data-testid="total-uses-amount">
              Total: {formatCurrency(totalUses)}
            </span>
          </div>

          <div className="space-y-2">
            {uses.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 bg-neutral-950/60 border border-neutral-800 rounded-none text-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-white font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-neutral-400 capitalize">{item.category}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-neutral-500 text-xs">$</span>
                  <input
                    type="number"
                    value={item.amount || ''}
                    aria-label={`Amount for ${item.name}`}
                    onChange={(e) => handleUseAmountChange(item.id, Number(e.target.value) || 0)}
                    className="w-28 min-h-[44px] rounded-none border border-neutral-700 bg-neutral-900 px-2 py-1 text-right text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
                  />
                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUse(item.id)}
                      className="min-h-[44px] px-1 text-neutral-400 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Add Custom Use */}
          <form onSubmit={handleAddUse} className="pt-2 border-t border-neutral-800/80 flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Add custom use item..."
              value={newUseName}
              onChange={(e) => setNewUseName(e.target.value)}
              className="flex-1 min-w-0 min-h-[44px] rounded-none border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="$ Amount"
              value={newUseAmount}
              onChange={(e) => setNewUseAmount(e.target.value)}
              className="w-24 min-h-[44px] rounded-none border border-neutral-800 bg-neutral-900 px-2 py-1 text-right text-xs font-mono text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newUseName.trim() || !newUseAmount}
              className="min-h-[44px] px-3 rounded-none bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 disabled:opacity-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Variance summary banner if not balanced */}
      {!isBalanced && (
        <div
          data-testid="variance-warning-strip"
          className="flex flex-wrap items-center justify-between gap-3 border border-amber-500/30 bg-amber-500/10 p-3 rounded-none text-xs text-amber-200"
        >
          <div className="flex items-center gap-2">
            <WarningCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              {variance > 0
                ? `Sources exceed Uses by ${formatCurrency(variance)}. Allocate surplus to reserves or lower GP equity.`
                : `Capital deficit of ${formatCurrency(Math.abs(variance))}. Increase GP equity or debt proceeds to balance.`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoBalance}
            className="min-h-[44px] text-xs font-bold uppercase tracking-wider text-amber-300 underline hover:text-white"
          >
            Auto-Adjust GP Equity
          </button>
        </div>
      )}
    </div>
  );
}

export default SourcesAndUsesLedger;
