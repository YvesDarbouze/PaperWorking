'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
      aria-modal="true"
      aria-labelledby="collision-title"
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative z-50 mx-auto mt-[10vh] w-full max-w-[520px] rounded-[16px] border border-white/10 bg-[#0a0a0f]/95 p-6 md:p-8 backdrop-blur-[20px] shadow-[0_24px_48px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="#fbbf24"
              className="h-6 w-6 shrink-0 text-[#fbbf24]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <h2 id="collision-title" className="text-lg font-medium text-white">
              A deal already exists at this address
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="mt-6 space-y-3">
          <DealCard deal={dealCardData} compact={true} />
          <p className="text-sm text-white/60">
            Listed by <span className="font-medium text-white">{deal.creatorName || 'Lead Investor'}</span>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={handlePrimaryClick}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-[10px] bg-[#00DD94] px-5 py-2.5 text-sm font-medium text-[#0a0a0f] transition hover:brightness-110"
          >
            {isProjectLink ? 'Link to this deal' : 'View deal'}
          </button>

          <button
            type="button"
            onClick={handleSecondaryClick}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-[10px] border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            {isProjectLink ? 'Create new deal for this project' : 'Create new deal anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
