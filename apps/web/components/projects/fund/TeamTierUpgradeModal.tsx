'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export interface TeamTierUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToVendors?: () => void;
  currentTier?: string;
  targetTaskTitle?: string;
}

export default function TeamTierUpgradeModal({
  isOpen,
  onClose,
  onSwitchToVendors,
  currentTier = 'Investor',
  targetTaskTitle,
}: TeamTierUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        data-testid="team-tier-upgrade-modal"
        className="w-full max-w-lg rounded-none border border-neutral-800 bg-[#0c0c0c] p-6 shadow-2xl text-neutral-100 font-sans"
      >
        {/* Header Badge */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <span className="rounded-none border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Subscription Plan Requirement
            </span>
            <h2 id="tier-upgrade-modal-title" className="mt-2 text-lg font-bold tracking-tight text-white">
              Team Member Assignment Requires Investment Team Tier
            </h2>
            {targetTaskTitle && (
              <p className="mt-1 text-xs text-neutral-400">
                Action: Delegate task <strong className="text-neutral-200">{targetTaskTitle}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-none border border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Narrative / Context */}
        <div className="mt-5 space-y-4 text-xs text-neutral-300">
          <p>
            Your account is currently on the <strong className="text-white">{currentTier}</strong> plan, which provides full individual terminal access for solo operators.
          </p>
          <p>
            Assigning internal tasks, adding collaborator seats, and managing multi-partner permissions across the Real Estate Investment Lifecycle (REIL) requires an active <strong className="text-white">Investment Team</strong> subscription.
          </p>

          {/* Subscribed Vendors notice */}
          <div className="rounded-none border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-neutral-200">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Subscribed Vendors Available on All Tiers</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              You can still assign and collaborate with licensed, subscribed third-party vendors (Appraisers, Title & Escrow Officers, Inspectors, and Lenders) licensed in your property&apos;s state without upgrading your plan.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-neutral-800 pt-5">
          {onSwitchToVendors && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="rounded-none min-h-[44px] px-4 text-xs"
              onClick={() => {
                onClose();
                onSwitchToVendors();
              }}
              data-testid="switch-to-vendors-btn"
            >
              Assign Subscribed Vendor Instead
            </Button>
          )}
          <Link
            href="/dashboard/settings?tab=subscription"
            className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition"
            data-testid="upgrade-to-team-btn"
          >
            Go to Settings & Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
