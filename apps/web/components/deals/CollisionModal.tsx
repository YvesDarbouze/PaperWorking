'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Warning, X } from '@phosphor-icons/react';
import DealCard, { type DealCardData } from '@/components/deals/DealCard';

export interface CollisionDeal extends Partial<DealCardData> {
  id: string;
  slug: string;
  name?: string;
  propertyName?: string;
  address: string;
  price?: number;
  purchasePrice?: number;
  roi?: number;
  projectedRoi?: number;
  status: string;
  visibility?: string;
  creatorName: string;
  creatorId?: string;
  target?: number;
  fundingTarget?: number;
  committed?: number;
  committedAmount?: number;
  projectId?: string | null;
  projectName?: string | null;
}

export interface CollisionModalProps {
  deal: CollisionDeal | null;
  onClose: () => void;
  variant?: 'deal-collision' | 'project-link';
  onLinkDeal?: (deal: CollisionDeal) => void;
  onCreateNewDeal?: (deal: CollisionDeal) => void;
}

export default function CollisionModal({
  deal,
  onClose,
  variant = 'deal-collision',
  onLinkDeal,
  onCreateNewDeal,
}: CollisionModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key & trap focus
  useEffect(() => {
    if (!deal) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusableElements.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on primary CTA
    const timer = setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [deal, onClose]);

  if (!deal) return null;

  function handlePrimaryClick() {
    onClose();
    if (variant === 'project-link' && onLinkDeal) {
      onLinkDeal(deal!);
    } else {
      router.push(`/deals/${deal?.slug}/detail`);
    }
  }

  function handleSecondaryClick() {
    onClose();
    if (variant === 'project-link' && onCreateNewDeal) {
      onCreateNewDeal(deal!);
    } else {
      const creatorParam = encodeURIComponent(deal?.creatorName || 'Lead Investor');
      router.push(`/deals/${deal?.slug}?collisionWarning=true&creatorName=${creatorParam}`);
    }
  }

  const dealCardData: DealCardData = {
    id: deal.id,
    slug: deal.slug,
    propertyName: deal.propertyName || deal.name || deal.address,
    address: deal.address,
    status: deal.status,
    visibility: deal.visibility,
    fundingTarget: deal.fundingTarget ?? deal.target ?? deal.purchasePrice ?? deal.price ?? 0,
    purchasePrice: deal.purchasePrice ?? deal.price ?? 0,
    price: deal.price ?? deal.purchasePrice ?? 0,
    committedAmount: deal.committedAmount ?? deal.committed ?? 0,
    projectedRoi: deal.projectedRoi ?? deal.roi ?? 0,
    investorCount: deal.investorCount ?? 0,
    assetClass: deal.assetClass,
    subStrategy: deal.subStrategy,
  };

  const isProjectLink = variant === 'project-link';

  return (
    <div
      role="dialog"
      data-testid="collision-modal"
      aria-modal="true"
      aria-labelledby="collision-title"
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/70 p-0 md:p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative z-50 w-full max-w-[520px] rounded-none border-t md:border border-neutral-800 bg-neutral-900 p-5 md:p-8 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8 animate-in slide-in-from-bottom-6 duration-200 md:fade-in-once text-white"
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center pt-1 pb-3 md:hidden">
          <div className="h-1 w-12 rounded-none bg-neutral-700" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Warning className="h-6 w-6 shrink-0 text-amber-400" />
            <h2 id="collision-title" className="text-base sm:text-lg font-medium text-white">
              A deal already exists at this address
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-neutral-800 border border-neutral-700 text-neutral-400 transition hover:bg-neutral-700 hover:text-white touch-press"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-3">
          <DealCard deal={dealCardData} compact={true} />
          <p className="text-xs sm:text-sm text-neutral-400">
            Listed by <span className="font-medium text-white">{deal.creatorName || 'Lead Investor'}</span>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={handlePrimaryClick}
            className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-none bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 touch-press"
          >
            {isProjectLink ? 'Link to this deal' : 'View deal'}
          </button>

          <button
            type="button"
            onClick={handleSecondaryClick}
            className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-none border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white touch-press"
          >
            {isProjectLink ? 'Create new deal for this project' : 'Create new deal anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
