'use client';

import React, { useRef, useEffect } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';
import { Folder, X, ChartLineUp, PencilSimple, RocketLaunch } from '@/components/icons/PhosphorIcons';
import type { InvestmentStrategyType } from './StrategySelectorBar';

interface StartProjectFromCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  strategy: InvestmentStrategyType;
  purchasePrice: number;
  rehabBudget: number;
  arv: number;
  grossRentMonthly: number;
  noi: number;
  projectedIrrPct: number | null;
  capRateOnCost: number;
  cashOnCashReturnPct: number;
  loanAmount: number;
  cashRequired: number;
  persistedSnapshotId?: string | null;
  isCreatingProject: boolean;
  projectCreationError: string | null;
  onLaunchProjectWorkspace: () => void;
  onOpenProjectWizard: () => void;
}

export default function StartProjectFromCalculatorModal({
  isOpen,
  onClose,
  address,
  strategy,
  purchasePrice,
  rehabBudget,
  arv,
  grossRentMonthly,
  noi,
  projectedIrrPct,
  capRateOnCost,
  cashOnCashReturnPct,
  loanAmount,
  cashRequired,
  persistedSnapshotId,
  isCreatingProject,
  projectCreationError,
  onLaunchProjectWorkspace,
  onOpenProjectWizard,
}: StartProjectFromCalculatorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = setupFocusTrap({
      container: modalRef.current,
      isActive: isOpen,
      onClose,
    });
    return cleanup;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatPct = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `${val.toFixed(1)}%`;
  };

  const getStrategyLabel = (strat: InvestmentStrategyType) => {
    switch (strat) {
      case 'buy_and_hold_rental':
        return 'Buy & Hold Rental';
      case 'flip':
        return 'Fix & Flip';
      case 'brrrr':
        return 'BRRRR Refinance';
      case 'short_term_rental_airbnb':
        return 'Short-Term Rental (Airbnb)';
      case 'commercial_value_add':
        return 'Commercial & Multi-Family';
      case 'wholesale':
        return 'Wholesale Deal';
      default:
        return 'Investment Project';
    }
  };

  const streetAddress = address.split(',')[0].trim() || 'New Investment Deal';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-project-modal-title"
      data-testid="start-project-modal"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 p-0 md:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl rounded-none border-t md:border border-border bg-card p-5 md:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-border bg-muted/30 text-foreground">
              <Folder size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-none bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-emerald-400">
                  REIL Phase 01 · Acquisition
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {getStrategyLabel(strategy)}
                </span>
              </div>
              <h2 id="start-project-modal-title" className="text-lg font-bold text-foreground mt-1">
                Promote Deal to Overarching Project
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-none border border-border text-muted-foreground hover:text-foreground hover:bg-accent min-h-[44px] min-w-[44px]"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Promote this Deal into an overarching <strong className="text-foreground">Project Workspace</strong> in PaperWorking. The underwriting numbers will become the initial Deal component of your Project, seeding your 33 Underwriting Datapoints baseline across all four REIL phases.
          </p>

          {/* Deal & Address Identity */}
          <div className="rounded-none border border-border bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overarching Project (Street Address):</span>
              <span className="font-bold text-foreground truncate max-w-[280px]" data-testid="start-project-street-address">
                {streetAddress}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Deal Component Serial (Full Address):</span>
              <span className="font-mono text-foreground/80 truncate max-w-[280px]" data-testid="start-project-full-address">
                {address}
              </span>
            </div>
            {persistedSnapshotId && (
              <div className="flex items-center justify-between text-xs border-t border-border pt-2">
                <span className="text-muted-foreground">Underwriting Snapshot Lineage:</span>
                <span className="font-mono text-emerald-400 text-[11px]">
                  {persistedSnapshotId}
                </span>
              </div>
            )}
          </div>

          {/* Underwriting Metrics Carry-Over Summary (33 Datapoints Baseline) */}
          <div className="rounded-none border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ChartLineUp size={15} className="text-emerald-400" />
                <span>33 Datapoints Baseline Carry-Over</span>
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">Canonical Engine</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Purchase Price</span>
                <span className="block font-bold text-foreground mt-0.5">{formatCurrency(purchasePrice)}</span>
              </div>
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Rehab Budget</span>
                <span className="block font-bold text-foreground mt-0.5">{formatCurrency(rehabBudget)}</span>
              </div>
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Target ARV</span>
                <span className="block font-bold text-foreground mt-0.5">{formatCurrency(arv)}</span>
              </div>
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Monthly Rent</span>
                <span className="block font-bold text-foreground mt-0.5">{formatCurrency(grossRentMonthly)}/mo</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Projected IRR</span>
                <span className="block font-bold text-emerald-400 mt-0.5">{formatPct(projectedIrrPct)}</span>
              </div>
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Cash-on-Cash</span>
                <span className="block font-bold text-emerald-400 mt-0.5">{formatPct(cashOnCashReturnPct)}</span>
              </div>
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Cap Rate on Cost</span>
                <span className="block font-bold text-foreground mt-0.5">{formatPct(capRateOnCost)}</span>
              </div>
              <div className="rounded-none border border-border/50 bg-muted/20 p-2 text-center">
                <span className="block text-[9.5px] uppercase text-muted-foreground">Cash Required</span>
                <span className="block font-bold text-foreground mt-0.5">{formatCurrency(cashRequired)}</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {projectCreationError && (
            <div className="rounded-none border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400" role="alert">
              {projectCreationError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenProjectWizard}
            disabled={isCreatingProject}
            data-testid="confirm-open-wizard-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-none border border-border bg-muted/30 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition disabled:opacity-50 min-h-[44px]"
          >
            <PencilSimple size={16} />
            <span>Configure in Full Wizard</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreatingProject}
              className="w-full sm:w-auto rounded-none border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onLaunchProjectWorkspace}
              disabled={isCreatingProject}
              data-testid="confirm-launch-project-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-none bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 shadow-none min-h-[44px]"
            >
              <RocketLaunch size={16} />
              <span>{isCreatingProject ? 'Creating Project Workspace...' : 'Launch Project Workspace'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
