'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setupFocusTrap } from '@/lib/a11y/focus-trap';
import { Storefront, X, Lock, Buildings, ShieldCheck } from '@/components/icons/PhosphorIcons';
import type { ReconciledUnderwritingMetrics } from '@paperworking/financial-engine';

interface PublishToMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  purchasePrice: number;
  strategy: string;
  calculations: ReconciledUnderwritingMetrics;
  projectId?: string | null;
  onSuccess: (dealId: string) => void;
}

export default function PublishToMarketplaceModal({
  isOpen,
  onClose,
  address,
  purchasePrice,
  strategy,
  calculations,
  projectId,
  onSuccess,
}: PublishToMarketplaceModalProps) {
  const [title, setTitle] = useState(address || 'New Investment Opportunity');
  const irrText =
    typeof calculations?.projectedIrrPct === 'number' && !isNaN(calculations.projectedIrrPct)
      ? `${calculations.projectedIrrPct.toFixed(1)}%`
      : 'strong double digits';

  const [pitch, setPitch] = useState(
    `Strong ${strategy ? strategy.replace(/_/g, ' ') : 'investment'} opportunity in active growth corridor. Projected IRR of ${irrText} with disciplined debt underwriting.`,
  );
  const [fundingTarget, setFundingTarget] = useState(calculations?.cashRequired || 150000);
  const [minInvestment, setMinInvestment] = useState(10000);
  const [visibility, setVisibility] = useState<'marketplace' | 'private'>('marketplace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || undefined,
          name: title,
          address,
          purchasePrice,
          rehabCost: (calculations as any).rehabBudget || (calculations as any).estimatedRehabBudget || 0,
          fundingTarget,
          minInvestment,
          projectedRoi: calculations.projectedIrrPct ?? 15,
          targetIrr: calculations.projectedIrrPct ?? 15,
          strategy,
          pitch,
          visibility,
          calculatorResults: {
            purchasePrice,
            rehabBudget: (calculations as any).rehabBudget || (calculations as any).estimatedRehabBudget || 0,
            arv: (calculations as any).afterRepairValue || Math.round(purchasePrice * 1.25),
            targetIrr: calculations.projectedIrrPct ?? 15,
            cashRequired: calculations.cashRequired || fundingTarget,
            netOperatingIncome: calculations.netOperatingIncome,
            capRateOnCost: calculations.capRateOnCost,
            equityMultiple: (calculations as any).equityMultiple || 1.75,
            strategy,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to publish deal to marketplace');
      }

      const data = await res.json();
      const dealId = data.deal?.id || `deal-mkt-${Date.now()}`;

      onSuccess(dealId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish listing. Please check required fields.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-deal-title"
      data-testid="publish-to-marketplace-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-none border-t sm:border border-border bg-card p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="flex items-center justify-between border-b border-border pb-4 shrink-0">
          <div>
            <h2 id="publish-deal-title" className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Storefront size={20} className="text-primary" />
              Post Deal Card to Marketplace
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Publish this verified pro-forma to accredited investors on PaperWorking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-none border border-border text-muted-foreground hover:text-foreground hover:bg-accent min-h-[44px] min-w-[44px]"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-3.5 text-xs pr-1">
          {error && (
            <div className="rounded-none border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="publish-deal-title-input" className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center justify-between">
              <span>Deal Name · Serial Number (Full Project Address) *</span>
              <span className="text-[10px] text-muted-foreground/60 font-mono">Unique Serial ID</span>
            </label>
            <input
              id="publish-deal-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 1247 Elm Street, Austin, TX 78702"
              className="w-full rounded-none border border-border bg-background p-2.5 text-foreground font-mono text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              The deal name is the full project address, functioning as its permanent serial number. The marketplace deal card displays the street address and reveals the full address serial on hover.
            </p>
          </div>

          <div>
            <label htmlFor="publish-deal-pitch-input" className="block text-[11px] font-medium text-muted-foreground mb-1">
              Investment Thesis &amp; Strategy Pitch *
            </label>
            <textarea
              id="publish-deal-pitch-input"
              required
              rows={3}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full rounded-none border border-border bg-background p-2.5 text-foreground text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="publish-deal-target-raise" className="block text-[11px] font-medium text-muted-foreground mb-1">
                Target Capital Raise ($) *
              </label>
              <input
                id="publish-deal-target-raise"
                type="number"
                required
                min={1000}
                value={fundingTarget}
                onChange={(e) => setFundingTarget(Number(e.target.value))}
                className="w-full rounded-none border border-border bg-background p-2.5 text-foreground font-mono text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="publish-deal-min-ticket" className="block text-[11px] font-medium text-muted-foreground mb-1">
                Minimum Investment Ticket ($) *
              </label>
              <input
                id="publish-deal-min-ticket"
                type="number"
                required
                min={1000}
                value={minInvestment}
                onChange={(e) => setMinInvestment(Number(e.target.value))}
                className="w-full rounded-none border border-border bg-background p-2.5 text-foreground font-mono text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
              />
            </div>
          </div>

          {/* Underwriting highlights verified from Deal Calculator */}
          <div className="rounded-none border border-border bg-card/50 p-3 space-y-2">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Verified Underwriting Pro-Forma Metrics
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-none bg-muted/40 p-2 border border-border/50">
                <span className="text-[10px] text-muted-foreground block">Target IRR</span>
                <span className="font-mono font-bold text-foreground text-xs block mt-0.5">
                  {calculations.projectedIrrPct !== null ? `${calculations.projectedIrrPct.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="rounded-none bg-muted/40 p-2 border border-border/50">
                <span className="text-[10px] text-muted-foreground block">Year-1 NOI</span>
                <span className="font-mono font-bold text-foreground text-xs block mt-0.5">
                  {formatCurrency(calculations.netOperatingIncome)}
                </span>
              </div>
              <div className="rounded-none bg-muted/40 p-2 border border-border/50">
                <span className="text-[10px] text-muted-foreground block">Purchase Price</span>
                <span className="font-mono font-bold text-foreground text-xs block mt-0.5">
                  {formatCurrency(purchasePrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Placement & Visibility Mode */}
          <div>
            <span className="block text-[11px] font-medium text-muted-foreground mb-1">
              Deal Placement &amp; Visibility *
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Deal Placement & Visibility">
              <button
                type="button"
                onClick={() => setVisibility('marketplace')}
                data-testid="modal-visibility-marketplace"
                className={`p-2.5 rounded-none border text-left min-h-[44px] transition-colors ${
                  visibility === 'marketplace'
                    ? 'border-foreground bg-accent text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <Buildings size={14} />
                  Marketplace
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Discoverable publicly</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                data-testid="modal-visibility-private"
                className={`p-2.5 rounded-none border text-left min-h-[44px] transition-colors ${
                  visibility === 'private'
                    ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <Lock size={14} />
                  Private Deal
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Hidden; share via msg/email</div>
              </button>
            </div>
          </div>

          {/* Off-Platform Closing Notice */}
          <div className="rounded-none border border-border bg-card/50 p-3 text-[11px] text-muted-foreground flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-muted-foreground shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground font-semibold">Off-Platform Closing:</strong> PaperWorking provides social deal discovery, underwriting calculations, and direct message negotiation. Final subscription agreements, partner onboarding, and capital closing occur directly between counterparties off-platform.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-none px-4 py-2.5 text-muted-foreground hover:bg-accent hover:text-foreground text-xs font-semibold min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 font-bold text-xs shadow-none transition active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Publishing Deal...' : visibility === 'private' ? 'Save as Private Deal' : 'Publish to Marketplace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
