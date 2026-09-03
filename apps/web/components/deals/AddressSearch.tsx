'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CollisionModal, { type CollisionDeal } from '@/components/deals/CollisionModal';
import { checkDealExistsFromBff } from '@/lib/deals/deal-api';

export interface AddressSearchProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSearchChange?: (value: string) => void;
  onSelectAddress?: (address: string) => void;
  collisionVariant?: 'deal-collision' | 'project-link';
  onExistingDealFound?: (deal: CollisionDeal) => void;
  onNoDealFound?: (address: string, slug: string) => void;
  onLinkDeal?: (deal: CollisionDeal) => void;
  onCreateNewDeal?: (deal: CollisionDeal) => void;
}

export default function AddressSearch({
  placeholder = 'Search any street address or deal name…',
  className = '',
  autoFocus = false,
  onSearchChange,
  onSelectAddress,
  collisionVariant = 'deal-collision',
  onExistingDealFound,
  onNoDealFound,
  onLinkDeal,
  onCreateNewDeal,
}: AddressSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [collisionDeal, setCollisionDeal] = useState<CollisionDeal | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const val = event.target.value;
    setQuery(val);
    if (onSearchChange) onSearchChange(val);
  }

  async function handleAddressSubmit(addressToSearch?: string) {
    const targetAddress = (addressToSearch ?? query).trim();
    if (!targetAddress) return;

    if (onSelectAddress) onSelectAddress(targetAddress);

    const slug = targetAddress.replace(/\s+/g, '').toLowerCase();

    // Start loading spinner after 200ms delay to prevent visual flicker
    setLoading(true);
    timerRef.current = setTimeout(() => {
      setShowSpinner(true);
    }, 200);

    try {
      const body = await checkDealExistsFromBff(slug);

      if (body.exists && body.deal) {
        const collision = body.deal as unknown as CollisionDeal;
        setCollisionDeal(collision);
        if (onExistingDealFound) onExistingDealFound(collision);
      } else {
        // No collision found
        if (onNoDealFound) {
          onNoDealFound(targetAddress, slug);
        } else {
          // Default deal marketplace behavior: navigate to /deals/[slug]
          if (typeof window !== 'undefined') {
            window.location.href = `/deals/${slug}`;
          } else {
            router.push(`/deals/${slug}`);
          }
        }
      }
    } catch (error) {
      console.error('[AddressSearch] Existence check error (failing open):', error);
      if (onNoDealFound) {
        onNoDealFound(targetAddress, slug);
      } else {
        if (typeof window !== 'undefined') {
          window.location.href = `/deals/${slug}`;
        } else {
          router.push(`/deals/${slug}`);
        }
      }
    } finally {
      if (timerRef.current) clearTimeout(timerRef.current);
      setLoading(false);
      setShowSpinner(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddressSubmit(event.currentTarget.value);
    }
  }

  return (
    <>
      <div className={`relative flex items-center ${className}`}>
        <span className="material-symbols-outlined pointer-events-none absolute left-3 text-[18px] text-white/40">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#00DD94]"
        />

        {/* 16px Spinner (delayed 200ms) or submit icon */}
        <div className="absolute right-3 flex items-center">
          {showSpinner && loading ? (
            <span
              data-testid="address-search-spinner"
              className="material-symbols-outlined animate-spin text-[16px] text-[#00DD94]"
            >
              progress_activity
            </span>
          ) : query ? (
            <button
              type="button"
              onClick={() => handleAddressSubmit(query)}
              aria-label="Submit address search"
              className="text-white/40 hover:text-white transition"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : null}
        </div>
      </div>

      {collisionDeal ? (
        <CollisionModal
          deal={collisionDeal}
          variant={collisionVariant}
          onClose={() => setCollisionDeal(null)}
          onLinkDeal={(d) => {
            setCollisionDeal(null);
            if (onLinkDeal) onLinkDeal(d);
          }}
          onCreateNewDeal={(d) => {
            setCollisionDeal(null);
            if (onCreateNewDeal) onCreateNewDeal(d);
          }}
        />
      ) : null}
    </>
  );
}
